<?php

namespace App\Services;

use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class MailSettingsService
{
    public function setting(): Setting
    {
        return Setting::query()->firstOrCreate([], [
            'app_name' => 'Surat dan Arsip Digital Berdikari',
            'company_name' => 'PT Berdikari',
            'company_code' => 'BDRK',
            'letter_field_requirements' => app(LetterFieldRequirementService::class)->defaults(),
        ]);
    }

    public function canSendMail(?Setting $setting = null): bool
    {
        $setting ??= $this->setting();

        return (bool) $setting->mail_notifications_enabled
            && filled($setting->mail_host)
            && filled($setting->mail_port)
            && filled($setting->mail_from_address);
    }

    public function sendRaw(User|string $recipient, string $subject, string $body, bool $throw = false): bool
    {
        $email = $recipient instanceof User ? $recipient->email : $recipient;

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            if ($throw) {
                throw ValidationException::withMessages(['email' => 'Alamat email penerima tidak valid atau belum diisi.']);
            }

            return false;
        }

        $setting = $this->setting();

        if (! $this->canSendMail($setting)) {
            if ($throw) {
                throw ValidationException::withMessages(['email' => 'Konfigurasi SMTP belum lengkap atau email notifikasi belum aktif.']);
            }

            return false;
        }

        $this->applyConfig($setting);

        try {
            Mail::raw($body, function ($message) use ($email, $subject) {
                $message->to($email)->subject($subject);
            });

            return true;
        } catch (Throwable $exception) {
            Log::warning('Gagal mengirim email aplikasi.', [
                'recipient' => $email,
                'subject' => $subject,
                'error' => $exception->getMessage(),
            ]);

            if ($throw) {
                throw ValidationException::withMessages(['email' => 'Email gagal dikirim: ' . $exception->getMessage()]);
            }

            return false;
        }
    }

    public function applyConfig(Setting $setting): void
    {
        $mailer = $setting->mail_mailer ?: 'smtp';
        $scheme = $setting->mail_encryption ?: null;

        config([
            'mail.default' => $mailer,
            'mail.mailers.smtp.host' => $setting->mail_host,
            'mail.mailers.smtp.port' => $setting->mail_port,
            'mail.mailers.smtp.username' => $setting->mail_username,
            'mail.mailers.smtp.password' => $setting->mail_password,
            'mail.mailers.smtp.scheme' => $scheme === 'none' ? null : $scheme,
            'mail.from.address' => $setting->mail_from_address,
            'mail.from.name' => $setting->mail_from_name ?: $setting->app_name,
        ]);

        Mail::purge($mailer);
    }
}
