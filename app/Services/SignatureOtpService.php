<?php

namespace App\Services;

use App\Models\LetterSignatureOtp;
use App\Models\LetterSignatureRequest;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class SignatureOtpService
{
    private const EXPIRES_MINUTES = 10;
    private const RESEND_COOLDOWN_SECONDS = 60;
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly MailSettingsService $mailSettings)
    {
    }

    public function enabled(): bool
    {
        return (bool) $this->mailSettings->setting()->signature_otp_enabled;
    }

    public function send(LetterSignatureRequest $signatureRequest, User $user): void
    {
        $this->assertRequester($signatureRequest, $user);

        if (! $this->enabled()) {
            throw ValidationException::withMessages(['otp' => 'OTP approval dokumen sedang tidak aktif.']);
        }

        if ($signatureRequest->status !== 'ready') {
            throw ValidationException::withMessages(['otp' => 'OTP hanya bisa dikirim untuk permintaan approval yang aktif.']);
        }

        $latest = LetterSignatureOtp::query()
            ->where('letter_signature_request_id', $signatureRequest->id)
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if ($latest?->last_sent_at && $latest->last_sent_at->gt(now()->subSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            throw ValidationException::withMessages(['otp' => 'Tunggu 60 detik sebelum mengirim ulang OTP.']);
        }

        $code = (string) random_int(100000, 999999);

        LetterSignatureOtp::query()
            ->where('letter_signature_request_id', $signatureRequest->id)
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        LetterSignatureOtp::query()->create([
            'letter_signature_request_id' => $signatureRequest->id,
            'user_id' => $user->id,
            'otp_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EXPIRES_MINUTES),
            'last_sent_at' => now(),
        ]);

        $letter = $signatureRequest->letter;
        $number = $letter ? ($letter->letter_number ?: $letter->reference) : '-';

        $approvalLabel = $signatureRequest->approval_type === 'paraf' ? 'paraf dokumen' : 'tanda tangan dokumen';

        $this->mailSettings->sendRaw(
            $user,
            'Kode OTP approval dokumen',
            "Kode OTP Anda: {$code}\n\nKode ini berlaku " . self::EXPIRES_MINUTES . " menit untuk approve atau reject {$approvalLabel} {$number}.",
            true
        );
    }

    public function validateAndConsume(LetterSignatureRequest $signatureRequest, User $user, ?string $code): void
    {
        if (! $this->enabled()) {
            return;
        }

        $this->assertRequester($signatureRequest, $user);

        if (! filled($code)) {
            throw ValidationException::withMessages(['otp_code' => 'Kode OTP wajib diisi.']);
        }

        $otp = LetterSignatureOtp::query()
            ->where('letter_signature_request_id', $signatureRequest->id)
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if (! $otp) {
            throw ValidationException::withMessages(['otp_code' => 'Kirim OTP terlebih dahulu.']);
        }

        if ($otp->expires_at->isPast()) {
            $otp->update(['consumed_at' => now()]);
            throw ValidationException::withMessages(['otp_code' => 'Kode OTP sudah kedaluwarsa.']);
        }

        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            $otp->update(['consumed_at' => now()]);
            throw ValidationException::withMessages(['otp_code' => 'Percobaan OTP terlalu banyak. Kirim OTP baru.']);
        }

        if (! Hash::check($code, $otp->otp_hash)) {
            $otp->increment('attempts');
            throw ValidationException::withMessages(['otp_code' => 'Kode OTP tidak sesuai.']);
        }

        $otp->update(['consumed_at' => now()]);
    }

    private function assertRequester(LetterSignatureRequest $signatureRequest, User $user): void
    {
        if ((int) $signatureRequest->signer_user_id !== (int) $user->id) {
            abort(403);
        }
    }
}
