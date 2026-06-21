<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterDownloadOtp extends Model
{
    protected $fillable = [
        'letter_id',
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

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
