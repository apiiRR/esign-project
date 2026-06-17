<?php

namespace App\Http\Controllers\Pegawai;

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
use App\Models\NotificationLog;
use App\Models\User;
use App\Services\DispositionService;
use App\Services\LetterFieldRequirementService;
use App\Services\LetterSignatureService;
use App\Services\NotificationDeliveryService;
use App\Services\SignatureOtpService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

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
            return inertia('Pegawai/Portal/Workspace', $props + [
                'stats' => $this->dashboardStats($user),
                'letters' => $this->dashboardInboxItems($user, $request),
            ]);
        }

        if ($section === 'inbox' && $mode === 'tebusan') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'cc'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox' && $mode === 'disposisi') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'dispositions' => $this->applyDispositionFilters($this->accessibleDispositions($user), $request)
                    ->with(['letter:id,reference,letter_number,subject,title,type', 'fromUser'])
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'inbox') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->accessibleLetters($user, 'recipient'), $request)
                    ->latest()
                    ->paginate(10)
                    ->withQueryString(),
            ]);
        }

        if ($section === 'archive') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'letters' => $this->applyLetterFilters($this->archiveLetters($user), $request)
                    ->latest()
                    ->paginate(10)
                    ->through(fn (Letter $letter) => $this->annotateArchiveLetter($letter, $user))
                    ->withQueryString(),
            ]);
        }

        if ($section === 'notifications') {
            return inertia('Pegawai/Portal/Workspace', $props + [
                'notifications' => NotificationLog::query()
                    ->with('letter:id,reference,letter_number,subject,title,type')
                    ->where('user_id', $user->id)
                    ->latest()
                    ->paginate(12)
                    ->withQueryString(),
            ]);
        }

        return inertia('Pegawai/Portal/Workspace', $props);
    }

    public function detail(Request $request, Letter $letter, DispositionService $dispositionService)
    {
        $user = $request->user();

        abort_unless($this->canAccessLetter($user, $letter), 403);

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

        return inertia('Pegawai/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'detail',
            'mode' => (string) $letter->id,
            'letter' => $letter,
            'activeSignatureRequest' => $activeSignatureRequest,
            'dispositionTargetOptions' => $dispositionService->optionsFor($user, false, $letter),
        ]);
    }

    public function approvalIndex(Request $request)
    {
        $user = $request->user();

        return inertia('Pegawai/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'approval',
            'mode' => 'index',
            'approvalRequests' => LetterSignatureRequest::query()
                ->with(['letter.creator:id,name,username', 'letter.attachments', 'signer:id,name,username,position'])
                ->whereHas('letter', fn (Builder $letter) => $letter->whereColumn('letters.current_version_id', 'letter_signature_requests.letter_document_version_id'))
                ->where('signer_user_id', $user->id)
                ->orderByRaw("case when status = 'ready' then 0 when status = 'pending' then 1 when status = 'signed' then 2 else 3 end")
                ->latest()
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
        $sourcePath = $signatureRequest->documentVersion?->signed_pdf_path
            ?: $letter->currentVersion?->signed_pdf_path
            ?: $letter->signed_pdf_path
            ?: $signatureRequest->documentVersion?->source_pdf_path
            ?: $letter->currentVersion?->source_pdf_path
            ?: $letter->attachments->first()?->file_path;

        return inertia('Pegawai/Portal/Workspace', $this->baseProps($user) + [
            'section' => 'approval_detail',
            'mode' => (string) $signatureRequest->id,
            'signatureRequest' => $signatureRequest,
            'letter' => $letter,
            'hasReadLetter' => $signatureService->hasReadLetter($signatureRequest, $user),
            'previewUrl' => $sourcePath ? Storage::url($sourcePath) : null,
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

    public function sendSignatureOtp(Request $request, LetterSignatureRequest $signatureRequest, SignatureOtpService $otpService, LetterSignatureService $signatureService)
    {
        $user = $request->user();
        abort_unless((int) $signatureRequest->signer_user_id === (int) $user->id, 403);

        $signatureRequest->load('letter');
        if (! $signatureService->hasReadLetter($signatureRequest, $user)) {
            throw ValidationException::withMessages(['otp' => 'Tandai dokumen sudah dibaca sebelum meminta OTP.']);
        }

        $otpService->send($signatureRequest, $user);

        return back()->with('success', 'Kode OTP berhasil dikirim ke email Anda.');
    }

    public function approveSignature(Request $request, LetterSignatureRequest $signatureRequest, LetterSignatureService $signatureService, SignatureOtpService $otpService)
    {
        $validated = $request->validate([
            'note' => 'nullable|string|max:1000',
            'otp_code' => 'nullable|string|max:20',
        ]);

        $otpService->validateAndConsume($signatureRequest, $request->user(), $validated['otp_code'] ?? null);
        $signatureService->approve($signatureRequest, $request->user(), $validated['note'] ?? null);

        return back()->with('success', ($signatureRequest->approval_type === 'paraf' ? 'Paraf' : 'Tanda tangan QR') . ' berhasil disetujui.');
    }

    public function rejectSignature(Request $request, LetterSignatureRequest $signatureRequest, LetterSignatureService $signatureService, SignatureOtpService $otpService)
    {
        $validated = $request->validate([
            'note' => 'required|string|max:1000',
            'otp_code' => 'nullable|string|max:20',
        ]);

        $otpService->validateAndConsume($signatureRequest, $request->user(), $validated['otp_code'] ?? null);
        $signatureService->reject($signatureRequest, $request->user(), $validated['note']);

        return back()->with('success', 'Permintaan approval berhasil ditolak.');
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
            $this->logUploadValidationFailure($request, $exception, 'internal_revision');
            throw $exception;
        }

        $version = DB::transaction(function () use ($request, $letter, $signatureService, $validated, $flow) {
            $file = $request->file('scan_file');
            $path = $file->store('surat/' . $letter->reference . '/revisi', 'public');

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

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft surat internal berhasil disimpan.' : 'Surat internal berhasil dikirim.');
    }

    public function storeOutgoing(Request $request)
    {
        $letter = $this->storeLetter($request, 'outgoing');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', $letter->status === 'draft' ? 'Draft surat keluar berhasil disimpan.' : 'Surat keluar berhasil dikirim.');
    }

    public function storeIncomingExternal(Request $request)
    {
        $letter = $this->storeLetter($request, 'incoming_external');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
            ->with('success', 'Surat masuk eksternal berhasil disimpan.');
    }

    public function storeArchive(Request $request)
    {
        $letter = $this->storeLetter($request, 'archive');

        return redirect()
            ->route('pegawai.surat.detail', $letter)
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
            ->route('pegawai.archive')
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

    public function openNotification(Request $request, NotificationLog $notification)
    {
        abort_unless((int) $notification->user_id === (int) $request->user()->id, 403);

        $notification->update(['read_at' => $notification->read_at ?: now()]);

        return $notification->letter_id
            ? redirect()->route('pegawai.surat.detail', $notification->letter_id)
            : redirect()->route('pegawai.notifications');
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
            'pegawaiBadges' => [
                'internal' => $this->unreadLetters($user, 'recipient')->count(),
                'tebusan' => $this->unreadLetters($user, 'cc')->count(),
                'disposisi' => $this->accessibleDispositions($user)->whereNull('read_at')->count(),
                'approval' => app(LetterSignatureService::class)->readyCountFor($user),
                'notifications' => NotificationLog::query()->where('user_id', $user->id)->whereNull('read_at')->count(),
            ],
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
                    ['id' => 'incoming_external', 'name' => 'Surat Masuk Eksternal'],
                    ['id' => 'internal', 'name' => 'Surat Internal'],
                    ['id' => 'outgoing', 'name' => 'Surat Keluar'],
                    ['id' => 'archive', 'name' => 'Arsip'],
                ]),
                'users' => User::query()->orderBy('name')->get(['id', 'name']),
            ],
        ];
    }

    private function dashboardStats(User $user): array
    {
        return [
            'internal_unread' => $this->unreadLetters($user, 'recipient')->count(),
            'cc_unread' => $this->unreadLetters($user, 'cc')->count(),
            'unread_dispositions' => $this->accessibleDispositions($user)->whereNull('read_at')->count(),
            'archive_total' => $this->archiveLetters($user)->count(),
        ];
    }

    private function dashboardInboxItems(User $user, Request $request): Collection
    {
        $letters = collect()
            ->merge($this->applyLetterFilters($this->accessibleLetters($user, 'recipient'), $request)
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (Letter $letter) => $this->dashboardLetterItem($letter, 'internal')))
            ->merge($this->applyLetterFilters($this->accessibleLetters($user, 'cc'), $request)
                ->latest()
                ->limit(6)
                ->get()
                ->map(fn (Letter $letter) => $this->dashboardLetterItem($letter, 'tebusan')));

        $dispositions = $this->applyDispositionFilters($this->accessibleDispositions($user), $request)
            ->with(['letter.creator:id,name,username', 'letter:id,created_by,reference,letter_number,subject,title,type,created_at', 'fromUser:id,name,username'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Disposition $disposition) => [
                'id' => 'disposisi-' . $disposition->id,
                'source' => 'disposisi',
                'letter_id' => $disposition->letter_id,
                'letter_number' => $disposition->letter?->letter_number,
                'reference' => $disposition->letter?->reference,
                'subject' => $disposition->letter?->subject ?: $disposition->letter?->title,
                'type' => $disposition->letter?->type,
                'sender' => $disposition->fromUser?->name ?: $disposition->letter?->creator?->name,
                'creator' => $disposition->fromUser ?: $disposition->letter?->creator,
                'created_at' => $disposition->created_at,
                'read_at' => $disposition->read_at,
                'action_url' => route('pegawai.surat.detail', $disposition->letter_id, false),
                'is_dashboard_item' => true,
            ]);

        return $letters
            ->merge($dispositions)
            ->sortByDesc(fn ($item) => $item['created_at'])
            ->take(6)
            ->values();
    }

    private function dashboardLetterItem(Letter $letter, string $source): array
    {
        return [
            'id' => $source . '-' . $letter->id,
            'source' => $source,
            'letter_id' => $letter->id,
            'letter_number' => $letter->letter_number,
            'reference' => $letter->reference,
            'subject' => $letter->subject ?: $letter->title,
            'title' => $letter->title,
            'type' => $letter->type,
            'sender' => $letter->creator?->name,
            'creator' => $letter->creator,
            'created_at' => $letter->created_at,
            'read_receipts' => $letter->readReceipts,
            'action_url' => route('pegawai.surat.detail', $letter, false),
            'page_count' => $letter->page_count,
            'is_dashboard_item' => true,
        ];
    }

    private function storeLetter(Request $request, string $mode): Letter
    {
        $user = $request->user();
        $isInternal = $mode === 'internal';
        $isOutgoing = $mode === 'outgoing';
        $isArchive = $mode === 'archive';
        $requiresSubmitAction = $isInternal || $isOutgoing;
        $targetRules = 'required|in:directorate,division,department,division_gm,department_manager';
        $requirements = app(LetterFieldRequirementService::class);

        $this->normalizeInternalOriginPayload($request);

        try {
            $validated = $request->validate([
                'submit_action' => $requiresSubmitAction ? 'required|in:draft,send' : 'nullable',
                'letter_type_id' => ($requirements->required($mode, 'letter_type_id') ? 'required' : 'nullable') . '|exists:letter_types,id',
                'letter_number' => ($mode === 'incoming_external' ? 'required' : ($requirements->required($mode, 'letter_number') ? 'required' : 'nullable')) . '|string|max:255|unique:letters,letter_number',
                'subject' => ($requirements->required($mode, 'subject') ? 'required' : 'nullable') . '|string|max:255',
                'title' => 'nullable|string|max:255',
                'scan_file' => 'bail|' . (($requirements->required($mode, 'scan_file') ? 'required' : 'nullable') . '|file|mimes:pdf'),
                'targets' => $isInternal ? (($requirements->required($mode, 'targets') ? 'required' : 'nullable') . '|array' . ($requirements->required($mode, 'targets') ? '|min:1' : '')) : 'nullable|array',
                'targets.*.target_type' => $isInternal ? $targetRules : 'nullable',
                'targets.*.target_id' => $isInternal ? 'required|integer' : 'nullable',
                'cc_targets' => $isInternal || $isOutgoing ? (($requirements->required($mode, 'cc_targets') ? 'required' : 'nullable') . '|array' . ($requirements->required($mode, 'cc_targets') ? '|min:1' : '')) : 'nullable|array',
                'cc_targets.*.target_type' => $isInternal || $isOutgoing ? $targetRules : 'nullable',
                'cc_targets.*.target_id' => $isInternal || $isOutgoing ? 'required|integer' : 'nullable',
                'payload' => 'nullable|array',
                'payload.origin_name' => $mode === 'incoming_external' ? (($requirements->required($mode, 'origin_name') ? 'required' : 'nullable') . '|string|max:255') : 'nullable|string|max:255',
                'payload.internal_origin_type' => $isInternal || $isOutgoing ? (($requirements->required($mode, 'internal_origin') ? 'required' : 'nullable') . '|in:directorate,division,department') : 'nullable',
                'payload.internal_origin_id' => $isInternal || $isOutgoing ? (($requirements->required($mode, 'internal_origin') ? 'required' : 'nullable') . '|integer') : 'nullable',
                'payload.external_recipient' => $isOutgoing ? (($requirements->required($mode, 'external_recipient') ? 'required' : 'nullable') . '|string|max:255') : 'nullable|string|max:255',
                'payload.notes' => in_array($mode, ['incoming_external', 'archive'], true) ? (($requirements->required($mode, 'notes') ? 'required' : 'nullable') . '|string') : 'nullable',
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
            $this->logUploadValidationFailure($request, $exception, $mode);
            throw $exception;
        }

        if (($isInternal || $isOutgoing) && filled($validated['payload']['internal_origin_type'] ?? null) && filled($validated['payload']['internal_origin_id'] ?? null)) {
            $originType = $validated['payload']['internal_origin_type'] ?? null;
            $originId = (int) ($validated['payload']['internal_origin_id'] ?? 0);
            $allowedOriginIds = [
                'directorate' => $user->directorate_id,
                'division' => $user->division_id,
                'department' => $user->department_id,
            ];

            abort_if((int) ($allowedOriginIds[$originType] ?? 0) !== $originId, 422, 'Asal surat tidak sesuai dengan profil user.');
        }

        return DB::transaction(function () use ($request, $validated, $user, $mode, $isInternal, $isOutgoing, $isArchive) {
            $letterNumber = $validated['letter_number'] ?? null;
            $origin = $this->originSnapshot($user, $validated, $mode);

            $letter = Letter::query()->create([
                'type' => match (true) {
                    $isInternal => 'internal',
                    $isOutgoing => 'outgoing',
                    $isArchive => 'archive',
                    default => 'incoming_external',
                },
                'letter_type_id' => $validated['letter_type_id'],
                'created_by' => $user->id,
                'origin_directorate_id' => $origin['origin_directorate_id'],
                'origin_division_id' => $origin['origin_division_id'],
                'origin_department_id' => $origin['origin_department_id'],
                'title' => $validated['subject'],
                'subject' => $validated['subject'],
                'letter_number' => $letterNumber,
                'reference' => $this->makeReference($mode),
                'page_count' => 1,
                'status' => match (true) {
                    $isInternal || $isOutgoing => ($validated['submit_action'] === 'draft' ? 'draft' : 'sent'),
                    $isArchive => 'archived',
                    default => 'received',
                },
                'payload' => $validated['payload'] ?? [],
                'meta' => [
                    'source' => 'pegawai_portal',
                    'mode' => $mode,
                ],
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
                $path = $file->store('surat/' . $letter->reference, 'public');

                $attachment = LetterAttachment::query()->create([
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
    }

    private function makeReference(string $mode): string
    {
        $prefix = match ($mode) {
            'incoming_external' => 'BDK-EXT',
            'archive' => 'BDK-ARS',
            'outgoing' => 'BDK-OUT',
            default => 'BDK-INT',
        };

        return $prefix . '-' . now()->format('YmdHis') . '-' . Str::upper(Str::random(4));
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
                ->where('role', 'pegawai')
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

    private function logUploadValidationFailure(Request $request, ValidationException $exception, string $mode): void
    {
        if (! array_key_exists('scan_file', $exception->errors())) {
            return;
        }

        $file = $request->file('scan_file');

        Log::warning('Scan PDF upload validation failed in pegawai letter form', [
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
}
