<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterSignatureRequest extends Model
{
    protected $fillable = [
        'letter_id',
        'requested_by',
        'signer_user_id',
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

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function signer()
    {
        return $this->belongsTo(User::class, 'signer_user_id');
    }
}
