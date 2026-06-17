<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterAttachment;
use App\Models\LetterDocumentVersion;
use App\Models\LetterReadReceipt;
use App\Models\LetterSignatureRequest;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\User;
use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\Writer\PngWriter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use setasign\Fpdi\Fpdi;

class LetterSignatureService
{
    public function __construct(private readonly NotificationDeliveryService $notifications)
    {
    }

    public function readyCountFor(User $user): int
    {
        return LetterSignatureRequest::query()
            ->whereHas('letter', fn ($letter) => $letter->whereColumn('letters.current_version_id', 'letter_signature_requests.letter_document_version_id'))
            ->where('signer_user_id', $user->id)
            ->where('status', 'ready')
            ->count();
    }

    public function hasReadLetter(LetterSignatureRequest $signatureRequest, User $user): bool
    {
        $letter = $signatureRequest->letter;

        return (int) $letter->created_by === (int) $user->id
            || LetterReadReceipt::query()
                ->where('letter_id', $letter->id)
                ->where('user_id', $user->id)
                ->exists();
    }

    public function approve(LetterSignatureRequest $signatureRequest, User $user, ?string $note = null): LetterSignatureRequest
    {
        return DB::transaction(function () use ($signatureRequest, $user, $note) {
            $signatureRequest = LetterSignatureRequest::query()
                ->with(['letter.attachments', 'letter.targets', 'letter.currentVersion', 'documentVersion', 'signer'])
                ->lockForUpdate()
                ->findOrFail($signatureRequest->id);

            $this->assertCanAct($signatureRequest, $user);

            $updates = [
                'status' => 'signed',
                'signed_at' => now(),
                'note' => $note,
            ];
            $signedPdfPath = null;

            if ($signatureRequest->isSignature()) {
                $token = $this->makeVerificationToken();
                $verifyUrl = route('signature.verify', $token);
                $qrPath = $this->generateQr($verifyUrl, $signatureRequest);
                $signedPdfPath = $this->stampQrToPdf($signatureRequest, $qrPath, $user);

                $updates += [
                    'verification_token' => $token,
                    'qr_file_path' => $qrPath,
                    'qr_payload' => [
                        'url' => $verifyUrl,
                        'letter_id' => $signatureRequest->letter_id,
                        'signature_request_id' => $signatureRequest->id,
                        'signer_user_id' => $user->id,
                        'signed_at' => now()->toIso8601String(),
                    ],
                ];
            }

            $signatureRequest->update($updates);

            $letter = $signatureRequest->letter;
            $letterUpdates = ['signature_status' => 'in_progress'];
            if ($signedPdfPath) {
                $letterUpdates['signed_pdf_path'] = $signedPdfPath;
                $signatureRequest->documentVersion?->update(['signed_pdf_path' => $signedPdfPath]);
            }
            $letter->update($letterUpdates);

            $nextRequest = LetterSignatureRequest::query()
                ->where('letter_id', $letter->id)
                ->where('letter_document_version_id', $signatureRequest->letter_document_version_id)
                ->where('status', 'pending')
                ->orderBy('signing_order')
                ->first();

            if ($nextRequest) {
                $nextRequest->update(['status' => 'ready']);
                $this->notifySigner($nextRequest, $letter);
            } else {
                $letter->update(['signature_status' => 'signed']);
                $signatureRequest->documentVersion?->update([
                    'status' => 'signed',
                    'signed_pdf_path' => $letter->signed_pdf_path,
                ]);
                $this->notifyLetterRecipients($letter);
            }

            return $signatureRequest->fresh(['letter', 'signer']);
        });
    }

    public function reject(LetterSignatureRequest $signatureRequest, User $user, string $note): LetterSignatureRequest
    {
        return DB::transaction(function () use ($signatureRequest, $user, $note) {
            $signatureRequest = LetterSignatureRequest::query()
                ->with(['letter.currentVersion', 'documentVersion', 'signer'])
                ->lockForUpdate()
                ->findOrFail($signatureRequest->id);

            $this->assertCanAct($signatureRequest, $user);

            $signatureRequest->update([
                'status' => 'rejected',
                'rejected_at' => now(),
                'note' => $note,
            ]);

            $letter = $signatureRequest->letter;
            $letter->update(['signature_status' => 'rejected']);
            $signatureRequest->documentVersion?->update([
                'status' => 'rejected',
                'rejected_by' => $user->id,
                'rejected_at' => now(),
                'rejection_note' => $note,
                'signed_pdf_path' => $letter->signed_pdf_path,
            ]);

            $isParaf = $signatureRequest->isParaf();
            $this->notifications->signature(
                $letter->created_by,
                $letter,
                $isParaf ? 'Paraf dokumen ditolak' : 'Tanda tangan QR ditolak',
                trim($user->name . ($isParaf ? ' menolak paraf. ' : ' menolak tanda tangan. ') . $note)
            );

            return $signatureRequest->fresh(['letter', 'signer']);
        });
    }

    public function initializeRequests(Letter $letter): void
    {
        $this->ensureCurrentVersion($letter);

        $requests = $letter->signatureRequests()
            ->when($letter->current_version_id, fn ($query) => $query->where('letter_document_version_id', $letter->current_version_id))
            ->orderBy('signing_order')
            ->get();

        if ($requests->isEmpty()) {
            return;
        }

        $letter->update(['signature_status' => 'pending']);

        foreach ($requests as $index => $request) {
            $request->update(['status' => $index === 0 ? 'ready' : 'pending']);
        }

        $this->notifySigner($requests->first(), $letter);
    }

    public function createInitialVersion(Letter $letter, LetterAttachment $attachment, ?User $uploader = null): LetterDocumentVersion
    {
        $existing = $letter->currentVersion()->first();
        if ($existing) {
            return $existing;
        }

        $version = $letter->documentVersions()->create([
            'version_number' => 1,
            'uploaded_by' => $uploader?->id,
            'attachment_id' => $attachment->id,
            'source_pdf_path' => $attachment->file_path,
            'signed_pdf_path' => $letter->signed_pdf_path,
            'status' => 'active',
        ]);

        $letter->update(['current_version_id' => $version->id]);
        $letter->signatureRequests()->whereNull('letter_document_version_id')->update([
            'letter_document_version_id' => $version->id,
        ]);

        return $version;
    }

    public function createRevision(Letter $letter, LetterAttachment $attachment, User $uploader, string $flow, array $replacementRequests = []): LetterDocumentVersion
    {
        return DB::transaction(function () use ($letter, $attachment, $uploader, $flow, $replacementRequests) {
            $letter = Letter::query()
                ->with(['currentVersion', 'signatureRequests'])
                ->lockForUpdate()
                ->findOrFail($letter->id);

            if ($letter->type !== 'internal' || (int) $letter->created_by !== (int) $uploader->id) {
                abort(403);
            }

            if ($letter->signature_status !== 'rejected' || ! $letter->signatureRequests()->exists()) {
                throw ValidationException::withMessages([
                    'scan_file' => 'Revisi PDF hanya tersedia untuk surat internal yang approval-nya ditolak.',
                ]);
            }

            $currentVersion = $this->ensureCurrentVersion($letter);
            if ($currentVersion && $currentVersion->status !== 'rejected') {
                $currentVersion->update(['status' => 'superseded']);
            }

            $versionNumber = ((int) $letter->documentVersions()->max('version_number')) + 1;
            $version = $letter->documentVersions()->create([
                'version_number' => $versionNumber,
                'uploaded_by' => $uploader->id,
                'attachment_id' => $attachment->id,
                'source_pdf_path' => $attachment->file_path,
                'status' => 'active',
            ]);

            $letter->update([
                'current_version_id' => $version->id,
                'signed_pdf_path' => null,
                'signature_status' => 'pending',
            ]);

            $sourceRequests = $flow === 'reset'
                ? collect($replacementRequests)
                : $letter->signatureRequests()
                    ->when($currentVersion?->id, fn ($query) => $query->where('letter_document_version_id', $currentVersion->id))
                    ->orderBy('signing_order')
                    ->get()
                    ->map(fn (LetterSignatureRequest $request) => [
                        'signer_user_id' => $request->signer_user_id,
                        'approval_type' => $request->approval_type ?: 'signature',
                        'signing_order' => $request->signing_order,
                        'page_number' => $request->page_number,
                        'x' => $request->x,
                        'y' => $request->y,
                        'width' => $request->width,
                        'height' => $request->height,
                    ]);

            foreach ($sourceRequests as $request) {
                $letter->signatureRequests()->create([
                    'letter_document_version_id' => $version->id,
                    'requested_by' => $uploader->id,
                    'signer_user_id' => (int) $request['signer_user_id'],
                    'approval_type' => $request['approval_type'] ?? 'signature',
                    'signing_order' => (int) $request['signing_order'],
                    'page_number' => (int) ($request['page_number'] ?? 1),
                    'x' => (float) ($request['x'] ?? 0),
                    'y' => (float) ($request['y'] ?? 0),
                    'width' => (float) ($request['width'] ?? 0.18),
                    'height' => (float) ($request['height'] ?? 0.08),
                    'status' => 'pending',
                ]);
            }

            $this->initializeRequests($letter->fresh(['currentVersion', 'signatureRequests']));

            return $version;
        });
    }

    private function assertCanAct(LetterSignatureRequest $signatureRequest, User $user): void
    {
        if ((int) $signatureRequest->signer_user_id !== (int) $user->id) {
            abort(403);
        }

        if ($signatureRequest->status !== 'ready') {
            throw ValidationException::withMessages([
                'signature' => 'Permintaan approval ini belum aktif atau sudah diproses.',
            ]);
        }

        if ($signatureRequest->letter->current_version_id
            && (int) $signatureRequest->letter->current_version_id !== (int) $signatureRequest->letter_document_version_id) {
            throw ValidationException::withMessages([
                'signature' => 'Permintaan approval ini berasal dari versi dokumen lama dan tidak bisa diproses.',
            ]);
        }

        if (! $this->hasReadLetter($signatureRequest, $user)) {
            throw ValidationException::withMessages([
                'signature' => 'Buka dan baca detail surat terlebih dahulu sebelum approve atau reject.',
            ]);
        }
    }

    private function makeVerificationToken(): string
    {
        do {
            $token = Str::random(48);
        } while (LetterSignatureRequest::query()->where('verification_token', $token)->exists());

        return $token;
    }

    private function generateQr(string $url, LetterSignatureRequest $signatureRequest): string
    {
        $relativePath = 'signatures/qr/signature-' . $signatureRequest->id . '-' . Str::random(8) . '.png';
        $absolutePath = Storage::disk('public')->path($relativePath);

        if (! is_dir(dirname($absolutePath))) {
            mkdir(dirname($absolutePath), 0755, true);
        }

        $result = (new Builder())->build(
            writer: new PngWriter(),
            data: $url,
            errorCorrectionLevel: ErrorCorrectionLevel::High,
            size: 360,
            margin: 12,
        );

        $result->saveToFile($absolutePath);

        return $relativePath;
    }

    private function stampQrToPdf(LetterSignatureRequest $signatureRequest, string $qrPath, User $user): string
    {
        $letter = $signatureRequest->letter;
        $version = $signatureRequest->documentVersion ?: $letter->currentVersion;
        $sourcePath = $version?->signed_pdf_path
            ?: $letter->signed_pdf_path
            ?: $version?->source_pdf_path
            ?: $letter->attachments->first(fn (LetterAttachment $attachment) => str_contains((string) $attachment->mime_type, 'pdf'))?->file_path;

        if (! $sourcePath) {
            throw ValidationException::withMessages(['signature' => 'File PDF sumber surat tidak ditemukan.']);
        }

        $sourceAbsolute = Storage::disk('public')->path($sourcePath);
        $qrAbsolute = Storage::disk('public')->path($qrPath);

        if (! is_file($sourceAbsolute) || ! is_file($qrAbsolute)) {
            throw ValidationException::withMessages(['signature' => 'File PDF atau QR tidak tersedia di storage.']);
        }

        $destinationPath = 'signatures/signed/' . $letter->reference . '/v' . ($version?->version_number ?: 1) . '-signed-' . $signatureRequest->id . '.pdf';
        $destinationAbsolute = Storage::disk('public')->path($destinationPath);

        if (! is_dir(dirname($destinationAbsolute))) {
            mkdir(dirname($destinationAbsolute), 0755, true);
        }

        $pdf = new Fpdi();
        $pageCount = $pdf->setSourceFile($sourceAbsolute);

        if ($signatureRequest->page_number > $pageCount) {
            throw ValidationException::withMessages(['signature' => 'Halaman tanda tangan melebihi jumlah halaman PDF.']);
        }

        for ($pageNumber = 1; $pageNumber <= $pageCount; $pageNumber++) {
            $templateId = $pdf->importPage($pageNumber);
            $size = $pdf->getTemplateSize($templateId);
            $width = (float) $size['width'];
            $height = (float) $size['height'];
            $orientation = $width > $height ? 'L' : 'P';

            $pdf->AddPage($orientation, [$width, $height]);
            $pdf->useTemplate($templateId);

            if ($pageNumber === (int) $signatureRequest->page_number) {
                $boxX = max(0, min(1, $signatureRequest->x)) * $width;
                $boxY = max(0, min(1, $signatureRequest->y)) * $height;
                $boxWidth = max(0.04, min(1, $signatureRequest->width)) * $width;
                $boxHeight = max(0.04, min(1, $signatureRequest->height)) * $height;
                $qrSize = min($boxWidth, $boxHeight * 0.7);

                $pdf->Image($qrAbsolute, $boxX, $boxY, $qrSize, $qrSize, 'PNG');
            }
        }

        $pdf->Output($destinationAbsolute, 'F');

        return $destinationPath;
    }

    private function ensureCurrentVersion(Letter $letter): ?LetterDocumentVersion
    {
        if ($letter->current_version_id) {
            return $letter->currentVersion()->first();
        }

        $attachment = $letter->attachments()
            ->where(function ($query) {
                $query->where('mime_type', 'like', '%pdf%')
                    ->orWhere('file_name', 'like', '%.pdf');
            })
            ->oldest()
            ->first();

        if (! $attachment) {
            return null;
        }

        return $this->createInitialVersion($letter, $attachment, $letter->creator ?: User::query()->find($letter->created_by));
    }

    private function notifySigner(LetterSignatureRequest $signatureRequest, Letter $letter): void
    {
        $isParaf = $signatureRequest->approval_type === 'paraf';

        $this->notifications->signature(
            $signatureRequest->signer_user_id,
            $letter,
            $isParaf ? 'Approval paraf dokumen' : 'Approval tanda tangan QR',
            ($isParaf ? 'Permintaan paraf untuk ' : 'Permintaan tanda tangan untuk ') . ($letter->letter_number ?: $letter->reference)
        );
    }

    private function notifyLetterRecipients(Letter $letter): void
    {
        $recipientUsers = $this->resolveTargetUsers($letter->targets->where('kind', 'recipient'))
            ->reject(fn ($id) => (int) $id === (int) $letter->created_by)
            ->unique()
            ->values();

        foreach ($recipientUsers as $userId) {
            $this->notifications->letter($userId, $letter, 'Surat internal baru', $letter->subject);
        }

        $ccUsers = $this->resolveTargetUsers($letter->targets->where('kind', 'cc'))
            ->reject(fn ($id) => (int) $id === (int) $letter->created_by)
            ->unique()
            ->values();

        foreach ($ccUsers as $userId) {
            $this->notifications->letterCc($userId, $letter, 'Tembusan surat baru', $letter->subject);
        }
    }

    private function resolveTargetUsers($targets)
    {
        return collect($targets)->flatMap(function ($target) {
            $targetType = is_array($target) ? $target['target_type'] : $target->target_type;
            $targetId = is_array($target) ? $target['target_id'] : $target->target_id;

            return match ($targetType) {
                'user' => collect([$targetId]),
                'division' => User::query()->where('division_id', $targetId)->where('status', 'active')->pluck('id'),
                'department' => User::query()->where('department_id', $targetId)->where('status', 'active')->pluck('id'),
                'directorate' => Directorate::query()->whereKey($targetId)->pluck('director_user_id'),
                'division_gm' => Division::query()->whereKey($targetId)->pluck('gm_user_id'),
                'department_manager' => Department::query()->whereKey($targetId)->pluck('manager_user_id'),
                default => collect(),
            };
        })->filter();
    }
}
