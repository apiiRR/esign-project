<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    public const DEFAULT_MAIL_TEMPLATES = [
        'surat_tujuan' => [
            'subject' => '[{app_name}] Surat baru untuk Anda: {letter_number}',
            'body' => "Yth. {recipient_name},\n\nAnda menerima {letter_type} baru.\n\nNomor Surat: {letter_number}\nPerihal: {letter_subject}\nPengirim: {sender_name}\n\nSilakan buka surat melalui tautan berikut:\n{action_url}\n\nTerima kasih.\n{app_name}",
        ],
        'surat_tebusan' => [
            'subject' => '[{app_name}] Tembusan surat: {letter_number}',
            'body' => "Yth. {recipient_name},\n\nAnda menerima tembusan {letter_type}.\n\nNomor Surat: {letter_number}\nPerihal: {letter_subject}\nPengirim: {sender_name}\n\nSilakan buka surat melalui tautan berikut:\n{action_url}\n\nTerima kasih.\n{app_name}",
        ],
        'disposisi' => [
            'subject' => '[{app_name}] Disposisi surat: {letter_number}',
            'body' => "Yth. {recipient_name},\n\nAnda menerima disposisi untuk {letter_type}.\n\nNomor Surat: {letter_number}\nPerihal: {letter_subject}\nPengirim: {sender_name}\nCatatan Disposisi:\n{disposition_note}\n\nSilakan tindak lanjuti melalui tautan berikut:\n{action_url}\n\nTerima kasih.\n{app_name}",
        ],
        'approval_tte' => [
            'subject' => '[{app_name}] Approval dokumen menunggu Anda: {letter_number}',
            'body' => "Yth. {recipient_name},\n\nAda permintaan approval/paraf/tanda tangan elektronik untuk dokumen berikut.\n\nNomor Surat: {letter_number}\nPerihal: {letter_subject}\nJenis Surat: {letter_type}\nPengirim: {sender_name}\n\nSilakan buka dan proses approval melalui tautan berikut:\n{action_url}\n\nTerima kasih.\n{app_name}",
        ],
        'surat_publish' => [
            'subject' => '[{app_name}] Surat dipublish ke unit Anda: {letter_number}',
            'body' => "Yth. {recipient_name},\n\nSebuah {letter_type} telah dipublish ke unit Anda.\n\nNomor Surat: {letter_number}\nPerihal: {letter_subject}\nPengirim: {sender_name}\n\nSilakan buka surat melalui tautan berikut:\n{action_url}\n\nTerima kasih.\n{app_name}",
        ],
    ];

    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'app_name',
        'company_name',
        'company_code',
        'company_logo',
        'login_logo',
        'letter_field_requirements',
        'mail_notifications_enabled',
        'mail_letter_notifications_enabled',
        'mail_signature_approval_notifications_enabled',
        'signature_otp_enabled',
        'document_download_otp_scope',
        'document_download_watermark_settings',
        'document_download_watermark_sample_pdf',
        'mail_mailer',
        'mail_host',
        'mail_port',
        'mail_username',
        'mail_password',
        'mail_encryption',
        'mail_from_address',
        'mail_from_name',
        'mail_templates',
    ];

    protected $hidden = [
        'mail_password',
    ];

    protected $casts = [
        'letter_field_requirements' => 'array',
        'mail_notifications_enabled' => 'boolean',
        'mail_letter_notifications_enabled' => 'boolean',
        'mail_signature_approval_notifications_enabled' => 'boolean',
        'signature_otp_enabled' => 'boolean',
        'document_download_watermark_settings' => 'array',
        'mail_password' => 'encrypted',
        'mail_templates' => 'array',
    ];

    public const DEFAULT_DOCUMENT_DOWNLOAD_WATERMARK_SETTINGS = [
        'x_percent' => 50,
        'y_percent' => 50,
        'angle' => 45,
        'font_size' => 14,
        'opacity' => 35,
        'color' => 'gray',
        'text_template' => 'Downloaded by {user_name} | {user_email} | {downloaded_at} WIB | {document_number}',
    ];

    public static function defaultMailTemplates(): array
    {
        return self::DEFAULT_MAIL_TEMPLATES;
    }

    public static function defaultDocumentDownloadWatermarkSettings(): array
    {
        return self::DEFAULT_DOCUMENT_DOWNLOAD_WATERMARK_SETTINGS;
    }

    public function documentDownloadWatermarkSettingsWithDefaults(): array
    {
        return array_replace(
            self::defaultDocumentDownloadWatermarkSettings(),
            $this->document_download_watermark_settings ?: []
        );
    }

    public function mailTemplatesWithDefaults(): array
    {
        return self::mergeMailTemplatesWithDefaults($this->mail_templates ?: []);
    }

    public static function mergeMailTemplatesWithDefaults(array $templates): array
    {
        $defaults = self::defaultMailTemplates();

        foreach ($defaults as $type => $template) {
            $templates[$type] = [
                'subject' => filled($templates[$type]['subject'] ?? null)
                    ? $templates[$type]['subject']
                    : $template['subject'],
                'body' => filled($templates[$type]['body'] ?? null)
                    ? $templates[$type]['body']
                    : $template['body'],
            ];
        }

        return $templates;
    }
}
