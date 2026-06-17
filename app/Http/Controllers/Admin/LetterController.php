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
use App\Services\LetterFieldRequirementService;
use App\Services\LetterSignatureService;
use App\Services\NotificationDeliveryService;
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
        $isArchive = $type === 'arsip' || $type === 'archive';
        $mappedType = $this->mapType($type);

        $letters = Letter::query()
            ->with(['creator:id,name,username', 'letterType:id,name'])
            ->when($isArchive, fn ($query) => $query->where(function ($archive) {
                $archive->where('status', 'archived')
                    ->orWhere('type', 'archive')
                    ->orWhere('meta->mode', 'archive');
            }))
            ->when(! $isArchive, fn ($query) => $query->where('type', $mappedType))
            ->when($request->q, fn ($query, $search) => $query->where(fn ($q) => $q
                ->where('title', 'like', "%{$search}%")
                ->orWhere('subject', 'like', "%{$search}%")
                ->orWhere('letter_number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
            ))
            ->when($request->filled('letter_type_ids'), fn ($query) => $query->whereIn('letter_type_id', (array) $request->letter_type_ids))
            ->when($request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $request->statuses))
            ->when($request->filled('creator_ids'), fn ($query) => $query->whereIn('created_by', (array) $request->creator_ids))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return inertia('Admin/Letters/Index', [
            'letters' => $letters,
            'type' => $isArchive ? 'archive' : $mappedType,
            'typeLabel' => $isArchive ? 'Arsip Surat' : $this->typeLabel($mappedType),
            'filterOptions' => [
                'letterTypes' => LetterType::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
                'creators' => User::query()->whereNotNull('id')->orderBy('name')->get(['id', 'name']),
                'statuses' => collect(['draft', 'sent', 'received', 'disposed', 'archived', 'rejected'])
                    ->map(fn ($status) => ['id' => $status, 'name' => ucfirst($status)])
                    ->values(),
            ],
        ]);
    }

    public function create(string $mode)
    {
        $isArchive = $mode === 'arsip' || $mode === 'archive';
        $type = $this->mapType($mode);

        return inertia('Admin/Letters/Form', [
            'type' => $type,
            'isArchive' => $isArchive,
            'letterTypes' => LetterType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'targetOptions' => $this->targetOptions(),
        ]);
    }

    public function store(Request $request)
    {
        $type = $request->input('type');
        $isArchive = $request->boolean('is_archive');
        $isInternal = $type === 'internal';
        $isOutgoing = $type === 'outgoing';
        $context = $isArchive ? 'archive' : $type;
        $requirements = app(LetterFieldRequirementService::class);

        $targetRules = 'required|in:directorate,division,department,division_gm,department_manager';

        try {
            $validated = $request->validate([
                'type' => 'required|in:incoming_external,outgoing,internal',
                'is_archive' => 'nullable|boolean',
                'submit_action' => $isInternal || $isOutgoing ? 'required|in:draft,send' : 'nullable',
                'letter_type_id' => 'required|exists:letter_types,id',
                'letter_number' => ($type === 'incoming_external' && ! $isArchive ? 'required' : ($requirements->required($context, 'letter_number') ? 'required' : 'nullable')) . '|string|max:255|unique:letters,letter_number',
                'subject' => 'required|string|max:255',
                'title' => 'nullable|string|max:255',
                'scan_file' => 'bail|' . (($requirements->required($context, 'scan_file') ? 'required' : 'nullable') . '|file|mimes:pdf'),
                'targets' => $isInternal ? 'required|array|min:1' : 'nullable|array',
                'targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
                'targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
                'cc_targets' => $isInternal || $isOutgoing ? 'nullable|array' : 'nullable|array',
                'cc_targets.*.target_type' => $isInternal || $isOutgoing ? $targetRules : 'nullable',
                'cc_targets.*.target_id' => $isInternal || $isOutgoing ? 'required|integer' : 'nullable',
                'payload' => 'nullable|array',
                'payload.origin_name' => $type === 'incoming_external' && ! $isArchive ? 'required|string|max:255' : 'nullable|string|max:255',
                'payload.internal_origin_type' => $isInternal || $isOutgoing ? 'required|in:directorate,division,department' : 'nullable',
                'payload.internal_origin_id' => $isInternal || $isOutgoing ? 'required|integer' : 'nullable',
                'payload.external_recipient' => $isOutgoing ? 'required|string|max:255' : 'nullable|string|max:255',
                'payload.notes' => in_array($type, ['incoming_external'], true) ? 'nullable|string' : 'nullable',
                'signature_requests' => $isInternal ? 'nullable|array' : 'prohibited',
                'signature_requests.*.approval_type' => $isInternal ? 'required|in:paraf,signature' : 'prohibited',
                'signature_requests.*.signer_user_id' => $isInternal ? 'required|exists:users,id,status,active,role,pegawai' : 'prohibited',
                'signature_requests.*.signing_order' => $isInternal ? 'required|integer|min:1|distinct' : 'prohibited',
                'signature_requests.*.page_number' => $isInternal ? 'required_if:signature_requests.*.approval_type,signature|nullable|integer|min:1' : 'prohibited',
                'signature_requests.*.x' => $isInternal ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'prohibited',
                'signature_requests.*.y' => $isInternal ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'prohibited',
                'signature_requests.*.width' => $isInternal ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'prohibited',
                'signature_requests.*.height' => $isInternal ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'prohibited',
            ], $this->uploadValidationMessages());
            $this->validateApprovalSequence($validated['signature_requests'] ?? []);
        } catch (ValidationException $exception) {
            $this->logUploadValidationFailure($request, $exception);
            throw $exception;
        }

        $letter = DB::transaction(function () use ($request, $validated, $isInternal, $isOutgoing) {
            $user = $request->user();
            $letterNumber = $validated['letter_number'] ?? null;

            $letter = Letter::create([
                'type' => $validated['type'],
                'letter_type_id' => $validated['letter_type_id'],
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
                    $isInternal || $isOutgoing => ($validated['submit_action'] === 'draft' ? 'draft' : 'sent'),
                    default => ($validated['is_archive'] ?? false) ? 'archived' : 'received',
                },
                'payload' => $validated['payload'] ?? [],
                'meta' => ['source' => 'admin'],
            ]);

            if ($isInternal) {
                foreach ($validated['targets'] as $target) {
                    $letter->targets()->create($target + ['kind' => 'recipient']);
                }

            }

            if ($isInternal || $isOutgoing) {
                foreach ($validated['cc_targets'] ?? [] as $target) {
                    $letter->targets()->create($target + ['kind' => 'cc']);
                }
            }

            if ($isInternal) {
                foreach ($validated['signature_requests'] ?? [] as $signatureRequest) {
                    $letter->signatureRequests()->create([
                        'requested_by' => $user->id,
                        'signer_user_id' => (int) $signatureRequest['signer_user_id'],
                        'approval_type' => $signatureRequest['approval_type'] ?? 'signature',
                        'signing_order' => (int) $signatureRequest['signing_order'],
                        'page_number' => (int) ($signatureRequest['page_number'] ?? 1),
                        'x' => (float) ($signatureRequest['x'] ?? 0),
                        'y' => (float) ($signatureRequest['y'] ?? 0),
                        'width' => (float) ($signatureRequest['width'] ?? 0.18),
                        'height' => (float) ($signatureRequest['height'] ?? 0.08),
                        'status' => 'pending',
                    ]);
                }
            }

            $attachment = null;
            if ($request->hasFile('scan_file')) {
                $file = $request->file('scan_file');
                $path = $file->store("letters/{$letter->reference}", 'public');
                $attachment = LetterAttachment::create([
                    'letter_id' => $letter->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ]);
            }

            if ($isInternal && $letter->signatureRequests()->exists()) {
                $signatureService = app(LetterSignatureService::class);
                if ($attachment) {
                    $signatureService->createInitialVersion($letter, $attachment, $user);
                }
                $signatureService->initializeRequests($letter->fresh(['attachments', 'currentVersion']));
            }

            if (($isInternal || $isOutgoing) && $letter->status === 'sent' && ! ($isInternal && $letter->signatureRequests()->exists())) {
                $recipientUserIds = $this->resolveTargetUsers(collect($validated['targets'] ?? []))
                    ->reject(fn ($id) => (int) $id === (int) $user->id)
                    ->unique()
                    ->values();

                foreach ($recipientUserIds as $userId) {
                    app(NotificationDeliveryService::class)->letter($userId, $letter, 'Surat internal baru', $letter->subject);
                }

                $ccUserIds = $this->resolveTargetUsers(collect($validated['cc_targets'] ?? []))
                    ->reject(fn ($id) => (int) $id === (int) $user->id)
                    ->unique()
                    ->values();

                foreach ($ccUserIds as $userId) {
                    app(NotificationDeliveryService::class)->letterCc($userId, $letter, 'Tembusan surat baru', $letter->subject);
                }
            }

            return $letter;
        });

        return redirect()->route('admin.surat.show', $letter)->with('success', 'Surat berhasil dibuat.');
    }

    public function show(Letter $letter, DispositionService $dispositionService)
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

        return inertia('Admin/Letters/Show', [
            'letter' => $letter,
            'targetOptions' => $this->targetOptions(),
            'dispositionTargetOptions' => $dispositionService->optionsFor(auth()->user(), true, $letter),
        ]);
    }

    public function update(Request $request, Letter $letter)
    {
        $validated = $request->validate([
            'status' => 'required|in:draft,sent,received,disposed,archived,rejected',
            'letter_number' => 'nullable|string|max:255|unique:letters,letter_number,' . $letter->id,
        ]);

        $letter->update($validated);

        return back()->with('success', 'Status surat berhasil diperbarui.');
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
                'signature_requests.*.approval_type' => $reset ? 'required|in:paraf,signature' : 'nullable',
                'signature_requests.*.signer_user_id' => $reset ? 'required|exists:users,id,status,active,role,pegawai' : 'nullable',
                'signature_requests.*.signing_order' => $reset ? 'required|integer|min:1|distinct' : 'nullable',
                'signature_requests.*.page_number' => $reset ? 'required_if:signature_requests.*.approval_type,signature|nullable|integer|min:1' : 'nullable',
                'signature_requests.*.x' => $reset ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'nullable',
                'signature_requests.*.y' => $reset ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'nullable',
                'signature_requests.*.width' => $reset ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'nullable',
                'signature_requests.*.height' => $reset ? 'required_if:signature_requests.*.approval_type,signature|nullable|numeric|between:0,1' : 'nullable',
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
            $path = $file->store("letters/{$letter->reference}/revisi", 'public');

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

    public function destroyDraft(Request $request, Letter $letter)
    {
        abort_unless((int) $letter->created_by === (int) $request->user()->id, 403);
        abort_unless($letter->status === 'draft', 403);

        DB::transaction(function () use ($letter) {
            $letter->load('attachments');
            foreach ($letter->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
            }
            $letter->delete();
        });

        return redirect()->route('admin.surat.internal')->with('success', 'Draft surat berhasil dihapus.');
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
            'incoming_external' => 'Surat Masuk Eksternal',
            'outgoing' => 'Surat Keluar',
            default => 'Surat Internal',
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

    private function validateApprovalSequence(array $requests): void
    {
        $sorted = collect($requests)->sortBy('signing_order')->values();
        $signatureStarted = false;

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

                $signatureStarted = true;
                continue;
            }

            if ($signatureStarted && $type === 'paraf') {
                throw ValidationException::withMessages([
                    'signature_requests' => 'Urutan paraf harus berada sebelum tanda tangan.',
                ]);
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
}
