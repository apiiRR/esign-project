<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\NotificationLog;
use App\Models\Setting;
use App\Models\User;

class NotificationDeliveryService
{
    public function __construct(private readonly MailSettingsService $mailSettings)
    {
    }

    public function letter(int|User $user, ?Letter $letter, string $title, ?string $body = null): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'letter');
    }

    public function signature(int|User $user, ?Letter $letter, string $title, ?string $body = null): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'signature');
    }

    private function deliver(int|User $user, ?Letter $letter, string $title, ?string $body, string $type): NotificationLog
    {
        $targetUser = $user instanceof User
            ? $user
            : User::query()->find($user);

        $notification = NotificationLog::query()->create([
            'user_id' => $targetUser?->id,
            'letter_id' => $letter?->id,
            'channel' => 'web',
            'title' => $title,
            'body' => $body,
            'sent_at' => now(),
        ]);

        if ($targetUser && $this->shouldSendEmail($type)) {
            $number = $letter ? ($letter->letter_number ?: $letter->reference) : null;
            $lines = [
                $title,
                '',
                $body ?: '-',
            ];

            if ($number) {
                $lines[] = '';
                $lines[] = 'Nomor surat: ' . $number;
            }

            $this->mailSettings->sendRaw($targetUser, $title, implode("\n", $lines));
        }

        return $notification;
    }

    private function shouldSendEmail(string $type): bool
    {
        /** @var Setting $setting */
        $setting = $this->mailSettings->setting();

        if (! $setting->mail_notifications_enabled) {
            return false;
        }

        return match ($type) {
            'signature' => (bool) $setting->mail_signature_approval_notifications_enabled,
            default => (bool) $setting->mail_letter_notifications_enabled,
        };
    }
}
