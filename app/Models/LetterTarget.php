<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterTarget extends Model
{
    protected $fillable = [
        'letter_id',
        'kind',
        'target_type',
        'target_id',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }
}
