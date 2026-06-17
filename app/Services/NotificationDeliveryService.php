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
        return $this->deliver($user, $letter, $title, $body, 'letter', 'surat_tujuan');
    }

    public function letterCc(int|User $user, ?Letter $letter, string $title, ?string $body = null): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'letter', 'surat_tebusan');
    }

    public function publish(int|User $user, ?Letter $letter, string $title, ?string $body = null): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'letter', 'surat_publish');
    }

    public function disposition(int|User $user, ?Letter $letter, string $title, ?string $body = null, array $context = []): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'letter', 'disposisi', $context);
    }

    public function signature(int|User $user, ?Letter $letter, string $title, ?string $body = null): NotificationLog
    {
        return $this->deliver($user, $letter, $title, $body, 'signature', 'approval_tte');
    }

    private function deliver(int|User $user, ?Letter $letter, string $title, ?string $body, string $type, string $templateType, array $context = []): NotificationLog
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
            [$subject, $emailBody] = $this->renderEmail($targetUser, $letter, $title, $body, $templateType, $context);
            $this->mailSettings->sendRaw($targetUser, $subject, $emailBody);
        }

        return $notification;
    }

    private function renderEmail(User $recipient, ?Letter $letter, string $title, ?string $body, string $templateType, array $context): array
    {
        /** @var Setting $setting */
        $setting = $this->mailSettings->setting();
        $templates = $setting->mailTemplatesWithDefaults();
        $template = $templates[$templateType] ?? [];
        $number = $letter ? ($letter->letter_number ?: $letter->reference) : '-';
        $letterType = $letter ? match (($letter->meta['mode'] ?? null) === 'archive' ? 'archive' : $letter->type) {
            'incoming_external' => 'Surat Masuk Eksternal',
            'internal' => 'Surat Internal',
            'outgoing' => 'Surat Keluar',
            'archive' => 'Arsip',
            default => 'Surat',
        } : '-';

        $replacements = [
            '{app_name}' => $setting->app_name,
            '{recipient_name}' => $recipient->name,
            '{sender_name}' => $context['sender_name'] ?? '-',
            '{letter_number}' => $number,
            '{letter_subject}' => $letter?->subject ?: ($letter?->title ?: '-'),
            '{letter_type}' => $letterType,
            '{disposition_note}' => $context['disposition_note'] ?? ($body ?: '-'),
            '{action_url}' => $letter ? url('/pegawai/surat/' . $letter->id) : url('/pegawai'),
        ];

        $subject = trim((string) ($template['subject'] ?? '')) ?: $title;
        $emailBody = trim((string) ($template['body'] ?? '')) ?: implode("\n", [$title, '', $body ?: '-', '', 'Nomor surat: ' . $number]);

        return [
            strtr($subject, $replacements),
            strtr($emailBody, $replacements),
        ];
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
