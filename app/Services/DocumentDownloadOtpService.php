<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterDownloadOtp;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class DocumentDownloadOtpService
{
    private const EXPIRES_MINUTES = 10;
    private const RESEND_COOLDOWN_SECONDS = 60;
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly MailSettingsService $mailSettings)
    {
    }

    public function requiredFor(User $user): bool
    {
        $scope = $this->scope();
        $isAdmin = $user->role === 'admin' || $user->hasRole('admin');

        return $scope === 'both'
            || ($scope === 'admin' && $isAdmin)
            || ($scope === 'user' && ! $isAdmin);
    }

    public function send(Letter $letter, User $user): void
    {
        $latest = LetterDownloadOtp::query()
            ->where('letter_id', $letter->id)
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->latest()
            ->first();

        if ($latest?->last_sent_at && $latest->last_sent_at->gt(now()->subSeconds(self::RESEND_COOLDOWN_SECONDS))) {
            throw ValidationException::withMessages(['otp' => 'Tunggu 60 detik sebelum mengirim ulang OTP.']);
        }

        $code = (string) random_int(100000, 999999);

        LetterDownloadOtp::query()
            ->where('letter_id', $letter->id)
            ->where('user_id', $user->id)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        LetterDownloadOtp::query()->create([
            'letter_id' => $letter->id,
            'user_id' => $user->id,
            'otp_hash' => Hash::make($code),
            'expires_at' => now()->addMinutes(self::EXPIRES_MINUTES),
            'last_sent_at' => now(),
        ]);

        $number = $letter->letter_number ?: 'dokumen';

        $this->mailSettings->sendRaw(
            $user,
            'Kode OTP download dokumen',
            "Kode OTP Anda: {$code}\n\nKode ini berlaku " . self::EXPIRES_MINUTES . " menit untuk download dokumen {$number}.",
            true
        );
    }

    public function validateAndConsume(Letter $letter, User $user, ?string $code): void
    {
        if (! $this->requiredFor($user)) {
            return;
        }

        if (! filled($code)) {
            throw ValidationException::withMessages(['otp_code' => 'Kode OTP wajib diisi.']);
        }

        $otp = LetterDownloadOtp::query()
            ->where('letter_id', $letter->id)
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

    private function scope(): string
    {
        $scope = $this->mailSettings->setting()->document_download_otp_scope ?? 'both';

        return in_array($scope, ['user', 'admin', 'both'], true) ? $scope : 'both';
    }
}
