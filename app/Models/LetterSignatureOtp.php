<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterSignatureOtp extends Model
{
    protected $fillable = [
        'letter_signature_request_id',
        'user_id',
        'otp_hash',
        'expires_at',
        'consumed_at',
        'attempts',
        'last_sent_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'consumed_at' => 'datetime',
        'last_sent_at' => 'datetime',
    ];

    public function signatureRequest()
    {
        return $this->belongsTo(LetterSignatureRequest::class, 'letter_signature_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
