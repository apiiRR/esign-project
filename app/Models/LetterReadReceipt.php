<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterReadReceipt extends Model
{
    protected $fillable = [
        'letter_id',
        'user_id',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
