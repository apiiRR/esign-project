<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
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
        'letter_field_requirements',
        'mail_notifications_enabled',
        'mail_letter_notifications_enabled',
        'mail_signature_approval_notifications_enabled',
        'signature_otp_enabled',
        'mail_mailer',
        'mail_host',
        'mail_port',
        'mail_username',
        'mail_password',
        'mail_encryption',
        'mail_from_address',
        'mail_from_name',
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
        'mail_password' => 'encrypted',
    ];
}
