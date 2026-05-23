<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    protected $fillable = [
        'user_id',
        'letter_id',
        'channel',
        'title',
        'body',
        'sent_at',
        'read_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }
}
