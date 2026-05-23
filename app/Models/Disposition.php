<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Disposition extends Model
{
    protected $fillable = [
        'letter_id',
        'from_user_id',
        'target_type',
        'target_id',
        'note',
        'status',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function fromUser()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }
}
