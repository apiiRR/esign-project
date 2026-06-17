<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterSignatureRequest extends Model
{
    protected $fillable = [
        'letter_id',
        'letter_document_version_id',
        'requested_by',
        'signer_user_id',
        'approval_type',
        'signing_order',
        'page_number',
        'x',
        'y',
        'width',
        'height',
        'status',
        'signed_at',
        'rejected_at',
        'note',
        'verification_token',
        'qr_file_path',
        'qr_payload',
    ];

    protected $casts = [
        'x' => 'float',
        'y' => 'float',
        'width' => 'float',
        'height' => 'float',
        'qr_payload' => 'array',
        'signed_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function documentVersion()
    {
        return $this->belongsTo(LetterDocumentVersion::class, 'letter_document_version_id');
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function signer()
    {
        return $this->belongsTo(User::class, 'signer_user_id');
    }

    public function isParaf(): bool
    {
        return $this->approval_type === 'paraf';
    }

    public function isSignature(): bool
    {
        return ($this->approval_type ?: 'signature') === 'signature';
    }

    public function otps()
    {
        return $this->hasMany(LetterSignatureOtp::class);
    }
}
