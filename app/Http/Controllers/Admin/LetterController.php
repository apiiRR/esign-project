<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Disposition;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterReadReceipt;
use App\Models\LetterTarget;
use App\Models\LetterType;
use App\Models\User;
use App\Services\DispositionService;
use App\Services\AuditTrailService;
use App\Services\DocumentDownloadOtpService;
use App\Services\DocumentWatermarkService;
use App\Services\LetterFieldRequirementService;
use App\Services\LetterSignatureService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LetterController extends Controller
{
    public function index(Request $request, string $type = 'internal')
    {
        $mappedType = 'internal';

        $letters = Letter::query()
            ->with(['creator:id,name,username', 'letterType:id,name'])
            ->where('type', $mappedType)
            ->when($request->q, fn ($query, $search) => $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhere('letter_number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
            ))
            ->when($request->filled('creator_ids'), fn ($query) => $query->whereIn('created_by', (array) $request->creator_ids))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return inertia('Admin/Letters/Index', [
            'letters' => $letters,
            'type' => $mappedType,
            'typeLabel' => $this->typeLabel($mappedType),
            'filterOptions' => [
                'letterTypes' => LetterType::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
                'creators' => User::query()->whereNotNull('id')->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }

    public function create(string $mode)
    {
        $type = 'internal';

        return inertia('Admin/Letters/Form', [
            'type' => $type,
            'isArchive' => false,
            'letterTypes' => LetterType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'targetOptions' => $this->targetOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $context = 'internal';
        $requirements = app(LetterFieldRequirementService::class);
        $isSending = $request->input('submit_action') === 'send';

        try {
            $validated = $request->validate([
                'type' => 'required|in:internal',
                'is_archive' => 'nullable|boolean',
                'submit_action' => 'required|in:draft,send',
                'signature_flow' => 'nullable|in:sequential,parallel',
                'letter_type_id' => 'nullable|exists:letter_types,id',
                'letter_number' => ($requirements->required($context, 'letter_number') ? 'required' : 'nullable') . '|string|max:255|unique:letters,letter_number',
                'subject' => 'required|string|max:255',
                'title' => 'nullable|string|max:255',
                'scan_file' => 'bail|' . (($requirements->required($context, 'scan_file') ? 'required' : 'nullable') . '|file|mimes:pdf'),
                'payload' => 'nullable|array',
                'payload.notes' => 'nullable',
                'signature_requests' => $isSending ? 'required|array|min:1' : 'nullable|array',
                'signature_requests.*.signer_user_id' => $isSending ? 'required|exists:users,id,status,active' : 'nullable|exists:users,id,status,active',
                'signature_requests.*.signing_order' => $isSending ? 'required|integer|min:1|distinct' : 'nullable|integer|min:1|distinct',
                'signature_requests.*.page_number' => $isSending ? 'required|integer|min:1' : 'nullable|integer|min:1',
                'signature_requests.*.x' => $isSending ? 'required|numeric|between:0,1' : 'nullable|numeric|between:0,1',
                'signature_requests.*.y' => $isSending ? 'required|numeric|between:0,1' : 'nullable|numeric|between:0,1',
                'signature_requests.*.width' => $isSending ? 'required|numeric|between:0,1' : 'nullable|numeric|between:0,1',
                'signature_requests.*.height' => $isSending ? 'required|numeric|between:0,1' : 'nullable|numeric|between:0,1',
            ], $this->uploadValidationMessages());
            if ($isSending) {
                $this->validateApprovalSequence($validated['signature_requests'] ?? []);
            }
        } catch (ValidationException $exception) {
            $this->logUploadValidationFailure($request, $exception);
            throw $exception;
        }

        $letter = DB::transaction(function () use ($request, $validated) {
            $user = $request->user();
            $letterNumber = $validated['letter_number'] ?? null;
            $signatureFlow = $validated['signature_flow'] ?? 'sequential';

            $letter = Letter::create([
                'type' => $validated['type'],
                'letter_type_id' => $validated['letter_type_id'] ?? null,
                'created_by' => $user->id,
                'origin_directorate_id' => $user->directorate_id,
                'origin_division_id' => $user->division_id,
                'origin_department_id' => $user->department_id,
                'title' => $validated['subject'],
                'subject' => $validated['subject'],
                'letter_number' => $letterNumber,
                'reference' => Str::uuid()->toString(),
                'page_count' => 1,
                'status' => match (true) {
                    default => ($validated['submit_action'] === 'draft' ? 'draft' : 'sent'),
                },
                'payload' => $validated['payload'] ?? [],
                'meta' => [
                    'source' => 'admin',
                    'signature_flow' => $signatureFlow,
                ],
            ]);

            foreach ($validated['signature_requests'] ?? [] as $signatureRequest) {
                if (! $this->isCompleteSignatureRequest($signatureRequest)) {
                    continue;
                }

                $letter->signatureRequests()->create([
                    'requested_by' => $user->id,
                    'signer_user_id' => (int) $signatureRequest['signer_user_id'],
                    'approval_type' => 'signature',
                    'signing_order' => (int) $signatureRequest['signing_order'],
                    'page_number' => (int) ($signatureRequest['page_number'] ?? 1),
                    'x' => (float) ($signatureRequest['x'] ?? 0),
                    'y' => (float) ($signatureRequest['y'] ?? 0),
                    'width' => (float) ($signatureRequest['width'] ?? 0.18),
                    'height' => (float) ($signatureRequest['height'] ?? 0.08),
                    'status' => 'pending',
                ]);
            }

            $attachment = null;
            if ($request->hasFile('scan_file')) {
                $file = $request->file('scan_file');
                $path = $file->store("letters/letter-{$letter->id}", 'public');
                $attachment = LetterAttachment::create([
                    'letter_id' => $letter->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            if ($letter->status === 'sent' && $letter->signatureRequests()->exists()) {
                $signatureService = app(LetterSignatureService::class);
                if ($attachment) {
                    $signatureService->createInitialVersion($letter, $attachment, $user);
                }
                $signatureService->initializeRequests($letter->fresh(['attachments', 'currentVersion']));
            }

            return $letter;
        });

        app(AuditTrailService::class)->log($request, $request->user(), 'dokumen', 'created', 'Membuat dokumen.', $letter, [
            'status' => $letter->status,
            'signature_flow' => data_get($letter->meta, 'signature_flow'),
        ]);

        return redirect()->route('admin.surat.show', $letter)->with('success', 'Dokumen berhasil dibuat.');
    }

    public function show(Request $request, Letter $letter, DispositionService $dispositionService, AuditTrailService $auditTrail)
    {
        $letter->load([
            'creator:id,name,username',
            'letterType:id,name',
            'targets',
            'attachments',
            'dispositions.fromUser:id,name,username',
            'dispositions.fromDirectorate',
            'dispositions.fromDivision',
            'dispositions.fromDepartment',
            'signatureRequests.signer:id,name,username,position',
            'signatureRequests.requester:id,name,username',
            'signatureRequests.documentVersion:id,version_number,status',
            'documentVersions.uploader:id,name,username',
            'documentVersions.rejector:id,name,username',
            'documentVersions.signatureRequests.signer:id,name,username,position',
            'currentVersion',
            'readReceipts' => fn ($query) => $query->where('user_id', '!=', $letter->created_by),
            'readReceipts.user:id,name,username,position',
        ]);
        $auditTrail->log($request, $request->user(), 'dokumen', 'viewed', 'Membuka detail dokumen.', $letter);
        $previewPath = $this->previewPdfPath($letter);

        return inertia('Admin/Letters/Show', [
            'letter' => $letter,
            'hasPreview' => (bool) $previewPath,
            'previewUrl' => $previewPath ? $this->previewUrl($letter) : null,
            'downloadOtpRequired' => app(DocumentDownloadOtpService::class)->requiredFor(auth()->user()),
            'targetOptions' => $this->targetOptions(),
            'dispositionTargetOptions' => $dispositionService->optionsFor(auth()->user(), true, $letter),
        ]);
    }

    public function update(Request $request, Letter $letter)
    {
        $validated = $request->validate([
            'letter_number' => 'nullable|string|max:255|unique:letters,letter_number,' . $letter->id,
        ]);

        $letter->update($validated);
        app(AuditTrailService::class)->log($request, $request->user(), 'dokumen', 'updated', 'Mengubah data dokumen.', $letter, [
            'letter_number' => $letter->letter_number,
        ]);

        return back()->with('success', 'Nomor dokumen berhasil diperbarui.');
    }

    public function preview(Letter $letter)
    {
        $letter->loadMissing(['currentVersion', 'attachments']);
        $path = $this->previewPdfPath($letter);

        abort_unless($path && Storage::disk('public')->exists($path), 404);

        return response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="' . ($letter->letter_number ?: 'dokumen') . '.pdf"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    public function sendDownloadOtp(Request $request, Letter $letter, DocumentDownloadOtpService $otpService, AuditTrailService $auditTrail)
    {
        $letter->loadMissing(['currentVersion', 'attachments']);
        abort_unless($this->previewPdfPath($letter), 404);

        if (! $otpService->requiredFor(auth()->user())) {
            return response()->json(['message' => 'OTP tidak diperlukan untuk download dokumen.']);
        }

        $otpService->send($letter, auth()->user());
        $auditTrail->log($request, $request->user(), 'dokumen', 'download_otp_sent', 'Mengirim OTP download dokumen.', $letter);

        return response()->json(['message' => 'Kode OTP download dokumen berhasil dikirim ke email Anda.']);
    }

    public function download(Request $request, Letter $letter, DocumentDownloadOtpService $otpService, DocumentWatermarkService $watermarkService, AuditTrailService $auditTrail)
    {
        $letter->loadMissing(['currentVersion', 'attachments']);
        $path = $this->previewPdfPath($letter);

        abort_unless($path && Storage::disk('public')->exists($path), 404);

        $otpService->validateAndConsume($letter, $request->user(), $request->input('otp_code'));
        $watermarkedPath = $watermarkService->make(Storage::disk('public')->path($path), $letter, $request->user());
        $auditTrail->log($request, $request->user(), 'dokumen', 'downloaded', 'Download dokumen dengan watermark.', $letter, [
            'document_id' => $letter->id,
            'document_number' => $letter->letter_number ?: '-',
            'watermarked' => true,
        ]);

        return response()->download(
            $watermarkedPath,
            $this->downloadFileName($letter)
        )->deleteFileAfterSend(true);
    }

    public function reviseInternalPdf(Request $request, Letter $letter, LetterSignatureService $signatureService)
    {
        $flow = $request->input('revision_flow', 'reuse');
        $reset = $flow === 'reset';

        try {
            $validated = $request->validate([
                'revision_flow' => 'required|in:reuse,reset',
                'scan_file' => 'bail|required|file|mimes:pdf',
                'signature_requests' => $reset ? 'required|array|min:1' : 'nullable|array',
                'signature_requests.*.signer_user_id' => $reset ? 'required|exists:users,id,status,active' : 'nullable',
                'signature_requests.*.signing_order' => $reset ? 'required|integer|min:1|distinct' : 'nullable',
                'signature_requests.*.page_number' => $reset ? 'required|integer|min:1' : 'nullable',
                'signature_requests.*.x' => $reset ? 'required|numeric|between:0,1' : 'nullable',
                'signature_requests.*.y' => $reset ? 'required|numeric|between:0,1' : 'nullable',
                'signature_requests.*.width' => $reset ? 'required|numeric|between:0,1' : 'nullable',
                'signature_requests.*.height' => $reset ? 'required|numeric|between:0,1' : 'nullable',
            ], $this->uploadValidationMessages());

            if ($reset) {
                $this->validateApprovalSequence($validated['signature_requests'] ?? []);
            }
        } catch (ValidationException $exception) {
            $this->logUploadValidationFailure($request, $exception);
            throw $exception;
        }

        $version = DB::transaction(function () use ($request, $letter, $signatureService, $validated, $flow) {
            $file = $request->file('scan_file');
            $path = $file->store("letters/letter-{$letter->id}/revisi", 'public');

            $attachment = LetterAttachment::query()->create([
                'letter_id' => $letter->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            return $signatureService->createRevision(
                $letter,
                $attachment,
                $request->user(),
                $flow,
                $validated['signature_requests'] ?? []
            );
        });

        return back()->with('success', 'PDF revisi versi ' . $version->version_number . ' berhasil diunggah dan workflow approval dimulai ulang.');
    }

    public function destroy(Request $request, Letter $letter)
    {
        $letter->loadMissing([
            'creator:id,name,email,username',
            'attachments:id,letter_id,file_path',
            'documentVersions:id,letter_id,source_pdf_path,signed_pdf_path',
            'signatureRequests:id,letter_id,qr_file_path,signature_image_path',
        ]);

        $filePaths = $this->documentFilePaths($letter);

        DB::transaction(function () use ($request, $letter, $filePaths) {
            app(AuditTrailService::class)->log($request, $request->user(), 'dokumen', 'deleted', 'Menghapus dokumen.', $letter, [
                'document_id' => $letter->id,
                'document_number' => $letter->letter_number ?: '-',
                'subject' => $letter->subject,
                'creator' => [
                    'id' => $letter->creator?->id,
                    'name' => $letter->creator?->name,
                    'email' => $letter->creator?->email,
                    'username' => $letter->creator?->username,
                ],
                'last_status' => $letter->status,
                'signature_status' => $letter->signature_status,
                'signer_count' => $letter->signatureRequests->count(),
                'file_paths' => $filePaths->values()->all(),
            ]);

            if ($letter->current_version_id) {
                $letter->forceFill(['current_version_id' => null])->saveQuietly();
            }

            $letter->delete();
        });

        $this->deleteDocumentFiles($filePaths, $letter->id);

        return redirect()->route('admin.surat.internal')->with('success', 'Dokumen berhasil dihapus.');
    }

    private function documentFilePaths(Letter $letter): Collection
    {
        return collect()
            ->merge($letter->attachments->pluck('file_path'))
            ->merge($letter->documentVersions->pluck('source_pdf_path'))
            ->merge($letter->documentVersions->pluck('signed_pdf_path'))
            ->push($letter->signed_pdf_path)
            ->merge($letter->signatureRequests->pluck('qr_file_path'))
            ->merge($letter->signatureRequests->pluck('signature_image_path')->reject(
                fn ($path) => is_string($path) && Str::startsWith($path, 'signatures/specimens/')
            ))
            ->filter(fn ($path) => is_string($path) && trim($path) !== '')
            ->map(fn (string $path) => trim($path))
            ->unique()
            ->values();
    }

    private function deleteDocumentFiles(Collection $filePaths, int $letterId): void
    {
        $filePaths->each(function (string $path) use ($letterId) {
            try {
                if (! Storage::disk('public')->exists($path)) {
                    return;
                }

                if (! Storage::disk('public')->delete($path)) {
                    Log::warning('File dokumen gagal dihapus saat delete dokumen admin.', [
                        'letter_id' => $letterId,
                        'path' => $path,
                    ]);
                }
            } catch (\Throwable $exception) {
                Log::warning('Exception saat menghapus file dokumen admin.', [
                    'letter_id' => $letterId,
                    'path' => $path,
                    'exception' => $exception->getMessage(),
                ]);
            }
        });
    }

    private function mapType(string $type): string
    {
        return match ($type) {
            'masuk-eksternal', 'incoming', 'incoming_external' => 'incoming_external',
            'keluar', 'outgoing' => 'outgoing',
            'arsip', 'archive' => 'incoming_external',
            default => 'internal',
        };
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            default => 'Dokumen',
        };
    }

    private function resolveTargetUsers(Collection $targets): Collection
    {
        return $targets->flatMap(function (array $target) {
            $targetId = $target['target_id'];

            return match ($target['target_type']) {
                'user' => collect([$targetId]),
                'division' => User::query()->where('division_id', $targetId)->pluck('id'),
                'department' => User::query()->where('department_id', $targetId)->pluck('id'),
                'directorate' => Directorate::query()->whereKey($targetId)->pluck('director_user_id'),
                'division_gm' => Division::query()->whereKey($targetId)->pluck('gm_user_id'),
                'department_manager' => Department::query()->whereKey($targetId)->pluck('manager_user_id'),
                default => collect(),
            };
        })->filter();
    }

    private function targetOptions(): array
    {
        return [
            'users' => User::query()
                ->where('status', 'active')
                ->select('id', 'name', 'position', 'department_id', 'division_id', 'directorate_id')
                ->orderBy('name')
                ->get(),
            'directorates' => Directorate::query()
                ->with('director:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'director_user_id')
                ->orderBy('name')
                ->get(),
            'divisions' => Division::query()
                ->with('generalManager:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'directorate_id', 'gm_user_id')
                ->orderBy('name')
                ->get(),
            'departments' => Department::query()
                ->with('manager:id,name')
                ->where('status', 'active')
                ->select('id', 'name', 'division_id', 'manager_user_id')
                ->orderBy('name')
                ->get(),
        ];
    }

    private function uploadValidationMessages(): array
    {
        return [
            'scan_file.uploaded' => 'File gagal diunggah. Pastikan file PDF valid dan batas upload server mengizinkan ukuran file tersebut.',
            'scan_file.required_if' => 'File Scan PDF wajib diunggah.',
            'scan_file.file' => 'File Scan PDF tidak valid.',
            'scan_file.mimes' => 'File Scan harus berupa PDF.',
        ];
    }

    private function isCompleteSignatureRequest(array $request): bool
    {
        foreach (['signer_user_id', 'signing_order', 'page_number', 'x', 'y', 'width', 'height'] as $field) {
            if (! array_key_exists($field, $request) || $request[$field] === null || $request[$field] === '') {
                return false;
            }
        }

        return true;
    }

    private function validateApprovalSequence(array $requests): void
    {
        $sorted = collect($requests)->sortBy('signing_order')->values();
        foreach ($sorted as $request) {
            $type = $request['approval_type'] ?? 'signature';

            if ($type === 'signature') {
                foreach (['page_number', 'x', 'y', 'width', 'height'] as $field) {
                    if (! array_key_exists($field, $request) || $request[$field] === null || $request[$field] === '') {
                        throw ValidationException::withMessages([
                            'signature_requests' => 'Tanda tangan wajib memiliki posisi di PDF.',
                        ]);
                    }
                }
            }
        }
    }

    private function logUploadValidationFailure(Request $request, ValidationException $exception): void
    {
        if (! array_key_exists('scan_file', $exception->errors())) {
            return;
        }

        $file = $request->file('scan_file');

        Log::warning('Scan PDF upload validation failed in admin letter form', [
            'user_id' => $request->user()?->id,
            'route' => $request->route()?->getName(),
            'path' => $request->path(),
            'content_length' => $request->server('CONTENT_LENGTH'),
            'php_upload_max_filesize' => ini_get('upload_max_filesize'),
            'php_post_max_size' => ini_get('post_max_size'),
            'file_name' => $file?->getClientOriginalName(),
            'file_size' => $file?->getSize(),
            'file_error' => $file && method_exists($file, 'getError') ? $file->getError() : null,
            'errors' => $exception->errors()['scan_file'],
        ]);
    }

    private function previewPdfPath(Letter $letter): ?string
    {
        $candidates = collect([
            $letter->currentVersion?->signed_pdf_path,
            $letter->signed_pdf_path,
            $letter->currentVersion?->source_pdf_path,
        ])->filter();

        foreach ($candidates as $path) {
            if (Storage::disk('public')->exists($path)) {
                return $path;
            }
        }

        $pdfAttachment = $letter->attachments
            ->first(function (LetterAttachment $attachment) {
                $mimeType = strtolower((string) $attachment->mime_type);
                $path = strtolower((string) $attachment->file_path);

                return (str_contains($mimeType, 'pdf') || str_ends_with($path, '.pdf'))
                    && Storage::disk('public')->exists($attachment->file_path);
            });

        return $pdfAttachment?->file_path;
    }

    private function previewUrl(Letter $letter): ?string
    {
        $version = $letter->updated_at?->timestamp ?: time();

        if ($letter->currentVersion?->updated_at && $letter->currentVersion->updated_at->timestamp > $version) {
            $version = $letter->currentVersion->updated_at->timestamp;
        }

        return route('admin.surat.preview', $letter, false) . '?v=' . $version;
    }

    private function downloadFileName(Letter $letter): string
    {
        $name = Str::slug($letter->letter_number ?: $letter->subject ?: 'dokumen');

        return ($name ?: 'dokumen') . '.pdf';
    }
}
