<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Disposition;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterReadReceipt;
use App\Models\LetterSignatureRequest;
use App\Models\LetterTarget;
use App\Models\LetterType;
use App\Models\User;
use App\Services\DispositionService;
use App\Services\AuditTrailService;
use App\Services\DocumentDownloadOtpService;
use App\Services\DocumentWatermarkService;
use App\Services\LetterFieldRequirementService;
use App\Services\LetterSignatureService;
use App\Services\SignatureOtpService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class PortalController extends Controller
{
    public function workspace(Request $request, string $section, ?string $mode = null)
    {
        $user = $request->user();
        $props = $this->baseProps($user) + [
            'section' => $section,
            'mode' => $mode,
        ];

        if ($section === 'dashboard') {
            return inertia('User/Portal/Workspace', $props + [
                'letters' => $this->dashboardLetters($user),
            ]);
        }

        if ($section === 'documents') {
            return inertia('User/Portal/Workspace', $props + [
                'approvalRequests' => $this->signatureRequestsFor($user)
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'create') {
            abort_unless($this->canCreateDocuments($user), 403);
        }

        if ($section === 'inbox' && $mode === 'tebusan') {
            return inertia('User/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'cc'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox' && $mode === 'disposisi') {
            return inertia('User/Portal/Workspace', $props + [
                'dispositions' => $this->applyDispositionFilters($this->accessibleDispositions($user), $request)
                    ->with(['letter:id,reference,letter_number,subject,title,type', 'fromUser'])
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox') {
            return inertia('User/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'recipient'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'archive') {
            return inertia('User/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->archiveLetters($user), $request)
                    ->latest()
                    ->paginate(10)
                    ->through(fn (Letter $letter) => $this->annotateArchiveLetter($letter, $user))
                    ->withQueryString(),
            ]);
        }

        return inertia('User/Portal/Workspace', $props);
    }

    public function detail(Request $request, Letter $letter, DispositionService $dispositionService, AuditTrailService $auditTrail)
    {
        $user = $request->user();

        abort_unless($this->canAccessLetter($user, $letter), 403);
        $auditTrail->log($request, $user, 'dokumen', 'viewed', 'Membuka detail dokumen.', $letter);

        if ((int) $letter->created_by !== (int) $user->id) {
            LetterReadReceipt::query()->updateOrCreate(
                ['letter_id' => $letter->id, 'user_id' => $user->id],
                ['read_at' => now()]
            );
        }

        $letter->dispositions()
            ->whereNull('read_at')
            ->where(function (Builder $query) use ($user) {
                $this->targetMatches($query, $user);
            })
            ->update(['read_at' => now()]);

        $letter->load([
            'creator',
            'letterType',
            'targets',
            'attachments',
            'dispositions.fromUser',
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
            'readReceipts.user',
        ]);

        $this->annotateDispositionActions($letter, $user);
        $this->attachTargetReadStatuses($letter);
        $activeSignatureRequest = $letter->signatureRequests
            ->when($letter->current_version_id, fn ($requests) => $requests->where('letter_document_version_id', $letter->current_version_id))
            ->where('signer_user_id', $user->id)
            ->sortBy(fn (LetterSignatureRequest $signatureRequest) => ($signatureRequest->status === 'ready' ? 0 : 10000) + $signatureRequest->signing_order)
            ->first();

        return inertia('User/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'detail',
            'mode' => (string) $letter->id,
            'letter' => $letter,
            'previewUrl' => $this->previewUrl($letter),
            'hasPreview' => (bool) $this->previewPdfPath($letter),
            'downloadOtpRequired' => app(DocumentDownloadOtpService::class)->requiredFor($user),
            'activeSignatureRequest' => $activeSignatureRequest,
            'dispositionTargetOptions' => $dispositionService->optionsFor($user, false, $letter),
        ]);
    }

    public function preview(Request $request, Letter $letter)
    {
        abort_unless($this->canAccessLetter($request->user(), $letter), 403);

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
        abort_unless($this->canAccessLetter($request->user(), $letter), 403);

        $letter->loadMissing(['currentVersion', 'attachments']);
        abort_unless($this->previewPdfPath($letter), 404);

        if (! $otpService->requiredFor($request->user())) {
            return response()->json(['message' => 'OTP tidak diperlukan untuk download dokumen.']);
        }

        $otpService->send($letter, $request->user());
        $auditTrail->log($request, $request->user(), 'dokumen', 'download_otp_sent', 'Mengirim OTP download dokumen.', $letter);

        return response()->json(['message' => 'Kode OTP download dokumen berhasil dikirim ke email Anda.']);
    }

    public function download(Request $request, Letter $letter, DocumentDownloadOtpService $otpService, DocumentWatermarkService $watermarkService, AuditTrailService $auditTrail)
    {
        abort_unless($this->canAccessLetter($request->user(), $letter), 403);

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

    public function approvalIndex(Request $request)
    {
        $user = $request->user();

        return inertia('User/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'documents',
            'mode' => 'index',
            'approvalRequests' => $this->signatureRequestsFor($user)
                ->paginate(10)
                ->withQueryString(),
        ]);
    }

    public function approvalShow(Request $request, LetterSignatureRequest $signatureRequest, LetterSignatureService $signatureService)
    {
        $user = $request->user();
        abort_unless((int) $signatureRequest->signer_user_id === (int) $user->id, 403);

        $signatureRequest->load([
            'letter.creator',
            'letter.letterType',
            'letter.attachments',
            'letter.currentVersion',
            'letter.signatureRequests.signer:id,name,username,position',
            'signer:id,name,username,position',
            'requester:id,name,username',
            'documentVersion',
        ]);

        $letter = $signatureRequest->letter;
        return inertia('User/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'approval_detail',
            'mode' => (string) $signatureRequest->id,
            'signatureRequest' => $signatureRequest,
            'letter' => $letter,
            'hasReadLetter' => $signatureService->hasReadLetter($signatureRequest, $user),
            'previewUrl' => $this->previewUrl($letter),
            'downloadOtpRequired' => app(DocumentDownloadOtpService::class)->requiredFor($user),
        ]);
    }

    public function markApprovalRead(Request $request, LetterSignatureRequest $signatureRequest)
    {
        $user = $request->user();
        abort_unless((int) $signatureRequest->signer_user_id === (int) $user->id, 403);

        LetterReadReceipt::query()->updateOrCreate(
            ['letter_id' => $signatureRequest->letter_id, 'user_id' => $user->id],
            ['read_at' => now()]
        );

        return back()->with('success', 'Dokumen ditandai sudah dibaca.');
    }

    public function sendSignatureOtp(Request $request, LetterSignatureRequest $signatureRequest, SignatureOtpService $otpService, LetterSignatureService $signatureService, AuditTrailService $auditTrail)
    {
        $user = $request->user();
        abort_unless((int) $signatureRequest->signer_user_id === (int) $user->id, 403);

        $signatureRequest->load('letter');
        if (! $signatureService->hasReadLetter($signatureRequest, $user)) {
            throw ValidationException::withMessages(['otp' => 'Tandai dokumen sudah dibaca sebelum meminta OTP.']);
        }

        $otpService->send($signatureRequest, $user);
        $auditTrail->log($request, $user, 'tanda_tangan', 'signature_otp_sent', 'Mengirim OTP tanda tangan dokumen.', $signatureRequest->letter, [
            'signature_request_id' => $signatureRequest->id,
        ]);

        return back()->with('success', 'Kode OTP berhasil dikirim ke email Anda.');
    }

    public function approveSignature(Request $request, LetterSignatureRequest $signatureRequest, LetterSignatureService $signatureService, SignatureOtpService $otpService, AuditTrailService $auditTrail)
    {
        $validated = $request->validate([
            'otp_code' => 'nullable|string|max:20',
            'signature_visual_type' => 'nullable|in:qr,saved_signature,uploaded_signature',
            'signature_image' => 'nullable|image|mimes:png,jpg,jpeg|max:2048',
            'save_signature_specimen' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $visualType = $validated['signature_visual_type'] ?? 'qr';
        $imagePath = null;

        if ($visualType === 'saved_signature') {
            if (! $user->signature_specimen_path) {
                throw ValidationException::withMessages(['signature_visual_type' => 'Spesimen tanda tangan belum tersedia.']);
            }

            $imagePath = $user->signature_specimen_path;
        }

        if ($visualType === 'uploaded_signature') {
            if (! $request->hasFile('signature_image')) {
                throw ValidationException::withMessages(['signature_image' => 'Upload gambar tanda tangan terlebih dahulu.']);
            }

            $imagePath = $request->file('signature_image')->store("signatures/specimens/{$user->id}", 'public');

            if ($request->boolean('save_signature_specimen')) {
                if ($user->signature_specimen_path) {
                    Storage::disk('public')->delete($user->signature_specimen_path);
                }

                $user->update(['signature_specimen_path' => $imagePath]);
            }
        }

        $signatureSnapshot = $auditTrail->signatureSnapshot($request);
        $otpService->validateAndConsume($signatureRequest, $request->user(), $validated['otp_code'] ?? null);
        $approvedRequest = $signatureService->approve($signatureRequest, $user, $visualType, $imagePath);
        $approvedRequest->update($signatureSnapshot);
        $signatureRequest->load('letter');
        $auditTrail->log($request, $user, 'tanda_tangan', 'signed', 'Menandatangani dokumen.', $signatureRequest->letter, [
            'signature_request_id' => $signatureRequest->id,
            'signature_visual_type' => $visualType,
            'signature_snapshot' => $signatureSnapshot,
        ]);

        return back()->with('success', 'Dokumen berhasil ditandatangani.');
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
            $this->logUploadValidationFailure($request, $exception, 'internal_revision');
            throw $exception;
        }

        $version = DB::transaction(function () use ($request, $letter, $signatureService, $validated, $flow) {
            $file = $request->file('scan_file');
            $path = $file->store('surat/letter-' . $letter->id . '/revisi', 'public');

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

    public function storeInternal(Request $request)
    {
        $letter = $this->storeLetter($request, 'internal');
        app(AuditTrailService::class)->log($request, $request->user(), 'dokumen', 'created', 'Membuat dokumen dari portal user.', $letter, [
            'status' => $letter->status,
            'signature_flow' => data_get($letter->meta, 'signature_flow'),
        ]);

        return redirect()
            ->route('user.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft dokumen berhasil disimpan.' : 'Dokumen berhasil dikirim.');
    }

    public function storeOutgoing(Request $request)
    {
        $letter = $this->storeLetter($request, 'outgoing');

        return redirect()
            ->route('user.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft surat keluar berhasil disimpan.' : 'Surat keluar berhasil dikirim.');
    }

    public function storeIncomingExternal(Request $request)
    {
        $letter = $this->storeLetter($request, 'incoming_external');

        return redirect()
            ->route('user.surat.detail', $letter)
            ->with('success', 'Surat masuk eksternal berhasil disimpan.');
    }

    public function storeArchive(Request $request)
    {
        $letter = $this->storeLetter($request, 'archive');

        return redirect()
            ->route('user.surat.detail', $letter)
            ->with('success', 'Arsip surat berhasil disimpan.');
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

        return redirect()
            ->route('user.dashboard')
            ->with('success', 'Draft surat berhasil dihapus.');
    }

    public function publishIncomingExternal(Request $request, Letter $letter)
    {
        $user = $request->user();

        abort_unless($this->canPublishLetter($letter), 404);
        abort_unless((int) $letter->created_by === (int) $user->id, 403);

        $validated = $request->validate([
            'targets' => 'required|array|min:1',
            'targets.*.target_type' => 'required|in:directorate,division,department',
            'targets.*.target_id' => 'required|integer',
        ]);

        $this->assertPublishTargetsExist(collect($validated['targets']));

        $createdTargets = collect();

        DB::transaction(function () use ($letter, $validated, $createdTargets) {
            foreach ($validated['targets'] as $target) {
                $created = LetterTarget::query()->firstOrCreate([
                    'letter_id' => $letter->id,
                    'kind' => 'recipient',
                    'target_type' => $target['target_type'],
                    'target_id' => (int) $target['target_id'],
                ]);

                if ($created->wasRecentlyCreated) {
                    $createdTargets->push($created);
                }
            }
        });

        $notificationUserIds = $this->resolveTargetUsers($createdTargets
            ->map(fn (LetterTarget $target) => [
                'target_type' => $target->target_type,
                'target_id' => $target->target_id,
            ]))
            ->reject(fn ($id) => (int) $id === (int) $user->id)
            ->unique()
            ->values();

        foreach ($notificationUserIds as $userId) {
            app(NotificationDeliveryService::class)->publish($userId, $letter, 'Surat dipublish', $letter->subject);
        }

        return back()->with('success', 'Surat masuk eksternal berhasil dipublish.');
    }

    public function revokeIncomingExternalPublication(Request $request, Letter $letter, LetterTarget $target)
    {
        abort_unless($this->canPublishLetter($letter), 404);
        abort_unless((int) $letter->created_by === (int) $request->user()->id, 403);
        abort_unless((int) $target->letter_id === (int) $letter->id, 404);

        $target->delete();

        return back()->with('success', 'Publish surat berhasil dicabut.');
    }

    private function canPublishLetter(Letter $letter): bool
    {
        return in_array($this->businessLetterType($letter), ['incoming_external', 'outgoing', 'archive'], true);
    }

    private function businessLetterType(Letter $letter): string
    {
        return ($letter->meta['mode'] ?? null) === 'archive' ? 'archive' : $letter->type;
    }

    public function storeDisposition(Request $request, Letter $letter, DispositionService $dispositionService)
    {
        $user = $request->user();

        abort_unless($this->canAccessLetter($user, $letter), 403);

        $validated = $request->validate([
            'parent_id' => 'nullable|exists:dispositions,id',
            'target_type' => 'required|in:division,department,directorate,division_gm,department_manager',
            'target_id' => 'required|integer',
            'note' => 'nullable|string',
        ]);

        $parent = null;
        if (! empty($validated['parent_id'])) {
            $parent = Disposition::query()->where('letter_id', $letter->id)->findOrFail($validated['parent_id']);
            abort_unless($this->dispositionTargetsUser($parent, $user), 403);
        } elseif ($this->businessLetterType($letter) === 'incoming_external') {
            abort_unless((int) $letter->created_by === (int) $user->id, 403);
        }

        $dispositionService->assertAllowed($user, $validated['target_type'], (int) $validated['target_id'], false, $letter);

        $disposition = Disposition::query()->create([
            'parent_id' => $parent?->id,
            'letter_id' => $letter->id,
            'from_user_id' => $user->id,
            ...$this->unitSnapshot($user),
            'target_type' => $validated['target_type'],
            'target_id' => (int) $validated['target_id'],
            'note' => $validated['note'] ?? null,
            'status' => 'open',
        ]);

        $dispositionService->notifyUsers($letter, $user, $disposition->target_type, (int) $disposition->target_id, $disposition->note);

        if ($letter->status === 'received') {
            $letter->update(['status' => 'disposed']);
        }

        return back()->with('success', 'Disposisi berhasil dibuat.');
    }

    public function replyDisposition(Request $request, Disposition $disposition, DispositionService $dispositionService)
    {
        $user = $request->user();
        $disposition->load('letter', 'fromUser');

        abort_unless($this->canAccessLetter($user, $disposition->letter), 403);
        abort_unless($this->dispositionTargetsUser($disposition, $user), 403);

        $validated = $request->validate([
            'note' => 'required|string|max:5000',
        ]);

        [$targetType, $targetId] = $this->replyTarget($disposition);

        abort_unless($targetId, 422, 'Unit pengirim disposisi sebelumnya tidak ditemukan.');

        $reply = Disposition::query()->create([
            'parent_id' => $disposition->id,
            'letter_id' => $disposition->letter_id,
            'from_user_id' => $user->id,
            ...$this->unitSnapshot($user),
            'target_type' => $targetType,
            'target_id' => $targetId,
            'note' => $validated['note'],
            'status' => 'open',
        ]);

        $dispositionService->notifyUsers($disposition->letter, $user, $reply->target_type, (int) $reply->target_id, $reply->note);

        return back()->with('success', 'Balasan disposisi berhasil dikirim.');
    }

    private function unitSnapshot(User $user): array
    {
        return [
            'from_directorate_id' => $user->directorate_id,
            'from_division_id' => $user->division_id,
            'from_department_id' => $user->department_id,
        ];
    }

    private function replyTarget(Disposition $disposition): array
    {
        if ($disposition->from_department_id) {
            return ['department', (int) $disposition->from_department_id];
        }

        if ($disposition->from_division_id) {
            return ['division', (int) $disposition->from_division_id];
        }

        if ($disposition->from_directorate_id) {
            return ['directorate', (int) $disposition->from_directorate_id];
        }

        if ($disposition->fromUser?->department_id) {
            return ['department', (int) $disposition->fromUser->department_id];
        }

        if ($disposition->fromUser?->division_id) {
            return ['division', (int) $disposition->fromUser->division_id];
        }

        return ['directorate', (int) $disposition->fromUser?->directorate_id];
    }

    private function annotateDispositionActions(Letter $letter, User $user): void
    {
        $letter->setRelation('dispositions', $letter->dispositions
            ->map(function (Disposition $disposition) use ($user) {
                $targetsUser = $this->dispositionTargetsUser($disposition, $user);

                $disposition->setAttribute('can_reply', $targetsUser);
                $disposition->setAttribute('can_forward', $targetsUser);

                return $disposition;
            })
            ->values());
    }

    private function assertPublishTargetsExist(Collection $targets): void
    {
        $existsByType = [
            'directorate' => Directorate::query()
                ->whereIn('id', $targets->where('target_type', 'directorate')->pluck('target_id'))
                ->pluck('id')
                ->map(fn ($id) => (int) $id),
            'division' => Division::query()
                ->whereIn('id', $targets->where('target_type', 'division')->pluck('target_id'))
                ->pluck('id')
                ->map(fn ($id) => (int) $id),
            'department' => Department::query()
                ->whereIn('id', $targets->where('target_type', 'department')->pluck('target_id'))
                ->pluck('id')
                ->map(fn ($id) => (int) $id),
        ];

        foreach ($targets as $index => $target) {
            if (! $existsByType[$target['target_type']]->contains((int) $target['target_id'])) {
                throw ValidationException::withMessages([
                    "targets.{$index}.target_id" => 'Target publish tidak valid.',
                ]);
            }
        }
    }

    private function attachTargetReadStatuses(Letter $letter): void
    {
        $targetUsers = $this->resolveTargetUsers($letter->targets
            ->whereIn('kind', $letter->type === 'outgoing' ? ['cc'] : ['recipient'])
            ->map(fn (LetterTarget $target) => [
                'target_type' => $target->target_type,
                'target_id' => $target->target_id,
            ]))
            ->reject(fn ($id) => (int) $id === (int) $letter->created_by)
            ->unique()
            ->values();

        if ($targetUsers->isEmpty()) {
            $letter->setAttribute('target_read_statuses', collect());
            return;
        }

        $receipts = $letter->readReceipts->keyBy('user_id');

        $letter->setAttribute('target_read_statuses', User::query()
            ->whereIn('id', $targetUsers)
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name', 'position'])
            ->map(fn (User $targetUser) => [
                'user' => $targetUser,
                'read_at' => $receipts->get($targetUser->id)?->read_at,
            ])
            ->values());
    }

    private function dispositionTargetsUser(Disposition $disposition, User $user): bool
    {
        $query = Disposition::query()->whereKey($disposition->id);
        $this->targetMatches($query, $user);

        return $query->exists();
    }

    private function baseProps(User $user): array
    {
        return [
            'userBadges' => [
                'approval' => app(LetterSignatureService::class)->readyCountFor($user),
            ],
            'canCreateDocuments' => $this->canCreateDocuments($user),
            'letterTypes' => LetterType::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name']),
            'targetOptions' => $this->targetOptions(),
            'filterOptions' => [
                'letterTypes' => LetterType::query()->where('status', 'active')->orderBy('name')->get(['id', 'name']),
                'readStatuses' => collect([
                    ['id' => 'read', 'name' => 'Dibaca'],
                    ['id' => 'unread', 'name' => 'Belum dibaca'],
                ]),
                'letterCategories' => collect([
                    ['id' => 'internal', 'name' => 'Dokumen'],
                ]),
                'users' => User::query()->orderBy('name')->get(['id', 'name']),
            ],
        ];
    }

    private function dashboardLetters(User $user)
    {
        return Letter::query()
            ->with(['creator:id,name,username', 'readReceipts' => fn ($query) => $query->where('user_id', $user->id)])
            ->where('type', 'internal')
            ->where(function (Builder $query) use ($user) {
                $query->where('created_by', $user->id)
                    ->orWhereHas('signatureRequests', fn (Builder $signature) => $signature
                        ->where('signer_user_id', $user->id)
                        ->whereColumn('letter_signature_requests.letter_document_version_id', 'letters.current_version_id'));
            })
            ->latest()
            ->paginate(10)
            ->through(fn (Letter $letter) => $this->dashboardLetterItem($letter, $user))
            ->withQueryString();
    }

    private function dashboardLetterItem(Letter $letter, User $user): array
    {
        $signatureRequest = null;
        $dashboardBadge = 'created';
        $actionUrl = route('user.surat.detail', $letter, false);

        if ((int) $letter->created_by !== (int) $user->id) {
            $signatureRequest = $this->dashboardSignatureRequest($letter, $user);
            $dashboardBadge = 'signature';
            $actionUrl = $signatureRequest
                ? route('user.approval.show', $signatureRequest, false)
                : route('user.surat.detail', $letter, false);
        }

        return [
            'id' => $dashboardBadge . '-' . $letter->id,
            'source' => $dashboardBadge,
            'dashboard_badge' => $dashboardBadge,
            'letter_id' => $letter->id,
            'created_by' => $letter->created_by,
            'letter_number' => $letter->letter_number,
            'subject' => $letter->subject ?: $letter->title,
            'title' => $letter->title,
            'type' => $letter->type,
            'sender' => $letter->creator?->name,
            'creator' => $letter->creator,
            'created_at' => $letter->created_at,
            'status' => $letter->status,
            'signature_status' => $letter->signature_status,
            'signature_request_status' => $signatureRequest?->status,
            'read_receipts' => $letter->readReceipts,
            'action_url' => $actionUrl,
            'page_count' => $letter->page_count,
            'is_dashboard_item' => true,
        ];
    }

    private function dashboardSignatureRequest(Letter $letter, User $user): ?LetterSignatureRequest
    {
        return LetterSignatureRequest::query()
            ->where('letter_id', $letter->id)
            ->where('signer_user_id', $user->id)
            ->when($letter->current_version_id, fn (Builder $query) => $query->where('letter_document_version_id', $letter->current_version_id))
            ->orderByRaw("case when status = 'ready' then 0 when status = 'pending' then 1 when status = 'signed' then 2 else 3 end")
            ->orderBy('signing_order')
            ->first();
    }

    private function signatureRequestsFor(User $user): Builder
    {
        return LetterSignatureRequest::query()
            ->with(['letter.creator:id,name,username', 'letter.attachments', 'signer:id,name,username,position'])
            ->whereHas('letter', fn (Builder $letter) => $letter->whereColumn('letters.current_version_id', 'letter_signature_requests.letter_document_version_id'))
            ->where('signer_user_id', $user->id)
            ->orderByRaw("case when status = 'ready' then 0 when status = 'pending' then 1 when status = 'signed' then 2 else 3 end")
            ->latest();
    }

    private function canCreateDocuments(User $user): bool
    {
        $createPermissions = ['user.letters.create'];

        if ($user->hasAnyPermission($createPermissions)) {
            return true;
        }

        if (! $user->role) {
            return false;
        }

        return Role::query()
            ->where('name', $user->role)
            ->whereHas('permissions', fn (Builder $query) => $query->whereIn('name', $createPermissions))
            ->exists();
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

    private function storeLetter(Request $request, string $mode): Letter
    {
        $user = $request->user();
        $mode = 'internal';
        $requirements = app(LetterFieldRequirementService::class);
        $isSending = $request->input('submit_action') === 'send';

        abort_unless($this->canCreateDocuments($user), 403);

        try {
            $validated = $request->validate([
                'submit_action' => 'required|in:draft,send',
                'signature_flow' => 'nullable|in:sequential,parallel',
                'letter_type_id' => 'nullable|exists:letter_types,id',
                'letter_number' => ($requirements->required($mode, 'letter_number') ? 'required' : 'nullable') . '|string|max:255|unique:letters,letter_number',
                'subject' => ($requirements->required($mode, 'subject') ? 'required' : 'nullable') . '|string|max:255',
                'title' => 'nullable|string|max:255',
                'scan_file' => 'bail|' . (($requirements->required($mode, 'scan_file') ? 'required' : 'nullable') . '|file|mimes:pdf'),
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
            $this->logUploadValidationFailure($request, $exception, $mode);
            throw $exception;
        }

        return DB::transaction(function () use ($request, $validated, $user, $mode) {
            $letterNumber = $validated['letter_number'] ?? null;
            $signatureFlow = $validated['signature_flow'] ?? 'sequential';

            $letter = Letter::query()->create([
                'type' => 'internal',
                'letter_type_id' => $validated['letter_type_id'] ?? null,
                'created_by' => $user->id,
                'origin_directorate_id' => $user->directorate_id,
                'origin_division_id' => $user->division_id,
                'origin_department_id' => $user->department_id,
                'title' => $validated['subject'],
                'subject' => $validated['subject'],
                'letter_number' => $letterNumber,
                'reference' => $this->makeReference($mode),
                'page_count' => 1,
                'status' => $validated['submit_action'] === 'draft' ? 'draft' : 'sent',
                'payload' => $validated['payload'] ?? [],
                'meta' => [
                    'source' => 'user_portal',
                    'mode' => $mode,
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
                $path = $file->store('surat/letter-' . $letter->id, 'public');

                $attachment = LetterAttachment::query()->create([
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
    }

    private function makeReference(string $mode): string
    {
        return (string) Str::uuid();
    }

    private function normalizeInternalOriginPayload(Request $request): void
    {
        $payload = $request->input('payload', []);
        $originId = $payload['internal_origin_id'] ?? null;

        if (is_string($originId) && str_contains($originId, ':')) {
            [$type, $id] = explode(':', $originId, 2);
            $payload['internal_origin_type'] = $payload['internal_origin_type'] ?: $type;
            $payload['internal_origin_id'] = $id;
            $request->merge(['payload' => $payload]);
        }
    }

    private function originSnapshot(User $user, array $validated, string $mode): array
    {
        if (in_array($mode, ['internal', 'outgoing'], true) && filled($validated['payload']['internal_origin_type'] ?? null)) {
            return match ($validated['payload']['internal_origin_type']) {
                'directorate' => [
                    'origin_directorate_id' => (int) $validated['payload']['internal_origin_id'],
                    'origin_division_id' => null,
                    'origin_department_id' => null,
                ],
                'division' => [
                    'origin_directorate_id' => null,
                    'origin_division_id' => (int) $validated['payload']['internal_origin_id'],
                    'origin_department_id' => null,
                ],
                'department' => [
                    'origin_directorate_id' => null,
                    'origin_division_id' => null,
                    'origin_department_id' => (int) $validated['payload']['internal_origin_id'],
                ],
                default => [
                    'origin_directorate_id' => null,
                    'origin_division_id' => null,
                    'origin_department_id' => null,
                ],
            };
        }

        return [
            'origin_directorate_id' => $user->directorate_id,
            'origin_division_id' => $user->division_id,
            'origin_department_id' => $user->department_id,
        ];
    }

    private function accessibleLetters(User $user, ?string $kind = null, bool $includeCreated = false): Builder
    {
        return Letter::query()
            ->with([
                'creator',
                'letterType',
                'attachments',
                'targets',
                'readReceipts' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->where('type', 'internal')
            ->where(function (Builder $query) use ($user, $kind, $includeCreated) {
                if ($includeCreated) {
                    $query->where('created_by', $user->id)
                        ->orWhere(function (Builder $targeted) use ($user, $kind) {
                            $targeted
                                ->where(function (Builder $signature) {
                                    $this->signatureDeliveryIsOpen($signature);
                                })
                                ->whereHas('targets', function (Builder $target) use ($user, $kind) {
                                    $this->targetMatches($target, $user, $kind);
                                });
                        });
                    return;
                }

                $query
                    ->where(function (Builder $signature) {
                        $this->signatureDeliveryIsOpen($signature);
                    })
                    ->whereHas('targets', function (Builder $target) use ($user, $kind) {
                        $this->targetMatches($target, $user, $kind);
                    });
            });
    }

    private function archiveLetters(User $user): Builder
    {
        $divisionDepartmentIds = $user->division_id
            ? Department::query()->where('division_id', $user->division_id)->pluck('id')
            : collect();

        return Letter::query()
            ->with([
                'creator',
                'letterType',
                'attachments',
                'targets',
                'readReceipts' => fn ($query) => $query->where('user_id', $user->id),
            ])
            ->where(function (Builder $query) use ($user, $divisionDepartmentIds) {
                $query->where('created_by', $user->id)
                    ->orWhere(function (Builder $publishedAccess) use ($user, $divisionDepartmentIds) {
                    $publishedAccess->where('status', '!=', 'draft')
                            ->where(function (Builder $signature) {
                                $this->signatureDeliveryIsOpen($signature);
                            })
                            ->where(function (Builder $access) use ($user, $divisionDepartmentIds) {
                                $access
                                    ->when($user->division_id, fn (Builder $query) => $query
                                        ->where(function (Builder $internalDivision) use ($user, $divisionDepartmentIds) {
                                            $internalDivision->where('type', 'internal')
                                                ->where(function (Builder $origin) use ($user, $divisionDepartmentIds) {
                                                    $origin->where('origin_division_id', $user->division_id)
                                                        ->orWhereIn('origin_department_id', $divisionDepartmentIds);
                                                });
                                        }))
                                    ->orWhereHas('dispositions', function (Builder $disposition) use ($user) {
                                        $this->targetMatches($disposition, $user);
                                    })
                                    ->orWhereHas('targets', function (Builder $target) use ($user) {
                                        $this->targetMatches($target, $user);
                                    });
                            });
                    });
            });
    }

    private function applyLetterFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->q, fn (Builder $letter, $search) => $letter->where(fn (Builder $q) => $q
                ->where('subject', 'like', "%{$search}%")
                ->orWhere('title', 'like', "%{$search}%")
                ->orWhere('letter_number', 'like', "%{$search}%")
                ->orWhere('reference', 'like', "%{$search}%")
            ))
            ->when($request->filled('letter_type_ids'), fn (Builder $letter) => $letter->whereIn('letter_type_id', (array) $request->letter_type_ids))
            ->when($request->filled('category'), fn (Builder $letter) => $this->applyCategoryFilter($letter, (string) $request->category))
            ->when($request->filled('statuses'), fn (Builder $letter) => $letter->whereIn('status', (array) $request->statuses))
            ->when($request->filled('creator_ids'), fn (Builder $letter) => $letter->whereIn('created_by', (array) $request->creator_ids))
            ->when($request->filled('read_statuses'), function (Builder $letter) use ($request) {
                $statuses = (array) $request->read_statuses;
                $letter->where(function (Builder $q) use ($statuses) {
                    if (in_array('read', $statuses, true)) {
                        $q->orWhereHas('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', auth()->id()));
                    }
                    if (in_array('unread', $statuses, true)) {
                        $q->orWhereDoesntHave('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', auth()->id()));
                    }
                });
            });
    }

    private function annotateArchiveLetter(Letter $letter, User $user): Letter
    {
        $fullAccess = $this->hasFullLetterAccess($user, $letter);
        $letter->setAttribute('full_access', $fullAccess);
        $letter->setAttribute('summary_only', ! $fullAccess);

        if (! $fullAccess) {
            $letter->subject = null;
            $letter->title = null;
            $letter->setRelation('creator', null);
            $letter->setRelation('attachments', collect());
            $letter->setRelation('readReceipts', collect());
        }

        return $letter;
    }

    private function applyCategoryFilter(Builder $letter, string $category): void
    {
        match ($category) {
            'archive' => $letter->where(fn (Builder $query) => $query
                ->where('type', 'archive')
                ->orWhere('meta->mode', 'archive')),
            'incoming_external' => $letter->where('type', 'incoming_external')->where(fn (Builder $query) => $query
                ->whereNull('meta->mode')
                ->orWhere('meta->mode', '!=', 'archive')),
            'internal' => $letter->where('type', 'internal'),
            'outgoing' => $letter->where('type', 'outgoing'),
            default => null,
        };
    }

    private function applyDispositionFilters(Builder $query, Request $request): Builder
    {
        return $query
            ->when($request->q, fn (Builder $disposition, $search) => $disposition->where(fn (Builder $q) => $q
                ->where('note', 'like', "%{$search}%")
                ->orWhereHas('letter', fn (Builder $letter) => $letter
                    ->where('subject', 'like', "%{$search}%")
                    ->orWhere('letter_number', 'like', "%{$search}%")
                    ->orWhere('reference', 'like', "%{$search}%"))
            ))
            ->when($request->filled('from_user_ids'), fn (Builder $disposition) => $disposition->whereIn('from_user_id', (array) $request->from_user_ids));
    }

    private function unreadLetters(User $user, string $kind): Builder
    {
        return $this->accessibleLetters($user, $kind)
            ->whereDoesntHave('readReceipts', fn (Builder $receipt) => $receipt->where('user_id', $user->id));
    }

    private function accessibleDispositions(User $user): Builder
    {
        return Disposition::query()
            ->whereHas('letter', fn (Builder $letter) => $letter->where('created_by', '!=', $user->id))
            ->where(function (Builder $query) use ($user) {
                $this->targetMatches($query, $user);
            });
    }

    private function canAccessLetter(User $user, Letter $letter): bool
    {
        if ((int) $letter->created_by === (int) $user->id) {
            return true;
        }

        if ($letter->status === 'draft') {
            return false;
        }

        if ($letter->signatureRequests()
            ->where('signer_user_id', $user->id)
            ->exists()) {
            return true;
        }

        if ($this->letterSignatureIsLocked($letter)) {
            return false;
        }

        return $this->hasFullLetterAccess($user, $letter);
    }

    private function hasFullLetterAccess(User $user, Letter $letter): bool
    {
        if ((int) $letter->created_by === (int) $user->id) {
            return true;
        }

        if ($letter->status === 'draft') {
            return false;
        }

        if ($letter->signatureRequests()
            ->where('signer_user_id', $user->id)
            ->exists()) {
            return true;
        }

        if ($this->letterSignatureIsLocked($letter)) {
            return false;
        }

        return $letter->targets()
            ->where(function (Builder $query) use ($user) {
                $this->targetMatches($query, $user);
            })
            ->exists()
            || $letter->dispositions()
                ->where(function (Builder $query) use ($user) {
                    $this->targetMatches($query, $user);
                })
                ->exists();
    }

    private function targetMatches(Builder $query, User $user, ?string $kind = null): void
    {
        if ($kind) {
            $query->where('kind', $kind);
        }

        $directorateIds = Directorate::query()
            ->where('director_user_id', $user->id)
            ->pluck('id');
        $gmDivisionIds = Division::query()
            ->where('gm_user_id', $user->id)
            ->pluck('id');
        $managerDepartmentIds = Department::query()
            ->where('manager_user_id', $user->id)
            ->pluck('id');

        $query->where(function (Builder $target) use ($user, $directorateIds, $gmDivisionIds, $managerDepartmentIds) {
            $target->where(function (Builder $match) use ($user) {
                $match->where('target_type', 'user')
                    ->where('target_id', $user->id);
            });

            if ($user->division_id) {
                $target->orWhere(function (Builder $match) use ($user) {
                    $match->where('target_type', 'division')
                        ->where('target_id', $user->division_id);
                });
            }

            if ($user->department_id) {
                $target->orWhere(function (Builder $match) use ($user) {
                    $match->where('target_type', 'department')
                        ->where('target_id', $user->department_id);
                });
            }

            if ($directorateIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($directorateIds) {
                    $match->where('target_type', 'directorate')
                        ->whereIn('target_id', $directorateIds);
                });
            }

            if ($gmDivisionIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($gmDivisionIds) {
                    $match->where('target_type', 'division_gm')
                        ->whereIn('target_id', $gmDivisionIds);
                });
            }

            if ($managerDepartmentIds->isNotEmpty()) {
                $target->orWhere(function (Builder $match) use ($managerDepartmentIds) {
                    $match->where('target_type', 'department_manager')
                        ->whereIn('target_id', $managerDepartmentIds);
                });
            }
        });
    }

    private function originMatches(Builder $query, User $user): void
    {
        $query->where(function (Builder $origin) use ($user) {
            if (! $user->department_id && ! $user->division_id && ! $user->directorate_id) {
                $origin->whereRaw('0 = 1');
                return;
            }
            if ($user->department_id) {
                $origin->orWhere('origin_department_id', $user->department_id);
            }
            if ($user->division_id) {
                $origin->orWhere('origin_division_id', $user->division_id);
            }
            if ($user->directorate_id) {
                $origin->orWhere('origin_directorate_id', $user->directorate_id);
            }
        });
    }

    private function letterOriginMatches(Letter $letter, User $user): bool
    {
        return (bool) (
            ($user->department_id && (int) $letter->origin_department_id === (int) $user->department_id)
            || ($user->division_id && (int) $letter->origin_division_id === (int) $user->division_id)
            || ($user->directorate_id && (int) $letter->origin_directorate_id === (int) $user->directorate_id)
        );
    }

    private function letterSignatureIsLocked(Letter $letter): bool
    {
        return $letter->type === 'internal'
            && $letter->signatureRequests()->exists()
            && $letter->signature_status !== 'signed';
    }

    private function signatureDeliveryIsOpen(Builder $query): void
    {
        $query->where(function (Builder $signature) {
            $signature
                ->where('type', '!=', 'internal')
                ->orWhere('signature_status', 'signed')
                ->orWhereDoesntHave('signatureRequests');
        });
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

    private function logUploadValidationFailure(Request $request, ValidationException $exception, string $mode): void
    {
        if (! array_key_exists('scan_file', $exception->errors())) {
            return;
        }

        $file = $request->file('scan_file');

        Log::warning('Scan PDF upload validation failed in user letter form', [
            'user_id' => $request->user()?->id,
            'mode' => $mode,
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
        $path = $letter->currentVersion?->signed_pdf_path
            ?: $letter->signed_pdf_path
            ?: $letter->currentVersion?->source_pdf_path;

        if ($path) {
            return $path;
        }

        $pdfAttachment = $letter->attachments
            ->first(fn (LetterAttachment $attachment) => str_contains(strtolower((string) $attachment->mime_type), 'pdf'));

        return $pdfAttachment?->file_path ?: $letter->attachments->first()?->file_path;
    }

    private function previewUrl(Letter $letter): string
    {
        $version = $letter->updated_at?->timestamp ?: time();

        if ($letter->currentVersion?->updated_at && $letter->currentVersion->updated_at->timestamp > $version) {
            $version = $letter->currentVersion->updated_at->timestamp;
        }

        return route('user.surat.preview', $letter, false) . '?v=' . $version;
    }

    private function downloadFileName(Letter $letter): string
    {
        $name = Str::slug($letter->letter_number ?: $letter->subject ?: 'dokumen');

        return ($name ?: 'dokumen') . '.pdf';
    }
}
