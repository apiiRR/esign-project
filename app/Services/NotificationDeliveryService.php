<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterSignatureRequest;
use App\Models\User;

class NotificationDeliveryService
{
    public function __construct(private readonly MailSettingsService $mailSettings)
    {
    }

    public function letter(int|User $user, ?Letter $letter, string $title, ?string $body = null): null
    {
        return $this->deliver();
    }

    public function letterCc(int|User $user, ?Letter $letter, string $title, ?string $body = null): null
    {
        return $this->deliver();
    }

    public function publish(int|User $user, ?Letter $letter, string $title, ?string $body = null): null
    {
        return $this->deliver();
    }

    public function disposition(int|User $user, ?Letter $letter, string $title, ?string $body = null, array $context = []): null
    {
        return $this->deliver();
    }

    public function signature(int|User $user, ?Letter $letter, string $title, ?string $body = null): null
    {
        $recipient = $user instanceof User ? $user : User::query()->find($user);

        if (! $recipient || ! $letter) {
            return null;
        }

        $request = LetterSignatureRequest::query()
            ->where('letter_id', $letter->id)
            ->where('signer_user_id', $recipient->id)
            ->where('status', 'ready')
            ->latest('id')
            ->first();

        $number = $letter->letter_number ?: 'dokumen';
        $url = $request ? url('/user/approval/' . $request->id) : url('/user/dashboard');
        $message = $body ?: "Ada dokumen yang perlu Anda tanda tangani: {$number}.";
        $message .= "\n\nPerihal: " . ($letter->subject ?: $letter->title ?: '-');
        $message .= "\nLink: {$url}";

        $sent = $this->mailSettings->sendRaw($recipient, $title, $message);

        app(AuditTrailService::class)->log(null, $recipient, 'email', $sent ? 'signature_email_sent' : 'signature_email_failed', $sent ? 'Email tanda tangan dikirim.' : 'Email tanda tangan gagal dikirim.', $letter, [
            'signature_request_id' => $request?->id,
            'recipient_email' => $recipient->email,
        ]);

        return null;
    }

    private function deliver(): null
    {
        return null;
    }
}
