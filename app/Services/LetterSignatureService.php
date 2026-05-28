<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterAttachment;
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
                ->with(['letter.attachments', 'letter.targets', 'signer'])
                ->lockForUpdate()
                ->findOrFail($signatureRequest->id);

            $this->assertCanAct($signatureRequest, $user);

            $token = $this->makeVerificationToken();
            $verifyUrl = route('signature.verify', $token);
            $qrPath = $this->generateQr($verifyUrl, $signatureRequest);
            $signedPdfPath = $this->stampQrToPdf($signatureRequest, $qrPath, $user);

            $signatureRequest->update([
                'status' => 'signed',
                'signed_at' => now(),
                'note' => $note,
                'verification_token' => $token,
                'qr_file_path' => $qrPath,
                'qr_payload' => [
                    'url' => $verifyUrl,
                    'letter_id' => $signatureRequest->letter_id,
                    'signature_request_id' => $signatureRequest->id,
                    'signer_user_id' => $user->id,
                    'signed_at' => now()->toIso8601String(),
                ],
            ]);

            $letter = $signatureRequest->letter;
            $letter->update([
                'signed_pdf_path' => $signedPdfPath,
                'signature_status' => 'in_progress',
            ]);

            $nextRequest = LetterSignatureRequest::query()
                ->where('letter_id', $letter->id)
                ->where('status', 'pending')
                ->orderBy('signing_order')
                ->first();

            if ($nextRequest) {
                $nextRequest->update(['status' => 'ready']);
                $this->notifySigner($nextRequest, $letter);
            } else {
                $letter->update(['signature_status' => 'signed']);
                $this->notifyLetterRecipients($letter);
            }

            return $signatureRequest->fresh(['letter', 'signer']);
        });
    }

    public function reject(LetterSignatureRequest $signatureRequest, User $user, string $note): LetterSignatureRequest
    {
        return DB::transaction(function () use ($signatureRequest, $user, $note) {
            $signatureRequest = LetterSignatureRequest::query()
                ->with(['letter', 'signer'])
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

            $this->notifications->signature(
                $letter->created_by,
                $letter,
                'Tanda tangan QR ditolak',
                trim($user->name . ' menolak tanda tangan. ' . $note)
            );

            return $signatureRequest->fresh(['letter', 'signer']);
        });
    }

    public function initializeRequests(Letter $letter): void
    {
        $requests = $letter->signatureRequests()->orderBy('signing_order')->get();

        if ($requests->isEmpty()) {
            return;
        }

        $letter->update(['signature_status' => 'pending']);

        foreach ($requests as $index => $request) {
            $request->update(['status' => $index === 0 ? 'ready' : 'pending']);
        }

        $this->notifySigner($requests->first(), $letter);
    }

    private function assertCanAct(LetterSignatureRequest $signatureRequest, User $user): void
    {
        if ((int) $signatureRequest->signer_user_id !== (int) $user->id) {
            abort(403);
        }

        if ($signatureRequest->status !== 'ready') {
            throw ValidationException::withMessages([
                'signature' => 'Permintaan tanda tangan ini belum aktif atau sudah diproses.',
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
        $sourcePath = $letter->signed_pdf_path ?: $letter->attachments->first(fn (LetterAttachment $attachment) => str_contains((string) $attachment->mime_type, 'pdf'))?->file_path;

        if (! $sourcePath) {
            throw ValidationException::withMessages(['signature' => 'File PDF sumber surat tidak ditemukan.']);
        }

        $sourceAbsolute = Storage::disk('public')->path($sourcePath);
        $qrAbsolute = Storage::disk('public')->path($qrPath);

        if (! is_file($sourceAbsolute) || ! is_file($qrAbsolute)) {
            throw ValidationException::withMessages(['signature' => 'File PDF atau QR tidak tersedia di storage.']);
        }

        $destinationPath = 'signatures/signed/' . $letter->reference . '/signed-' . $signatureRequest->id . '.pdf';
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

    private function notifySigner(LetterSignatureRequest $signatureRequest, Letter $letter): void
    {
        $this->notifications->signature(
            $signatureRequest->signer_user_id,
            $letter,
            'Approval tanda tangan QR',
            'Permintaan tanda tangan untuk ' . ($letter->letter_number ?: $letter->reference)
        );
    }

    private function notifyLetterRecipients(Letter $letter): void
    {
        $targetUsers = $this->resolveTargetUsers($letter->targets)
            ->reject(fn ($id) => (int) $id === (int) $letter->created_by)
            ->unique()
            ->values();

        foreach ($targetUsers as $userId) {
            $this->notifications->letter($userId, $letter, 'Surat internal baru', $letter->subject);
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
