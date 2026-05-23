<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterAttachment extends Model
{
    protected $fillable = [
        'letter_id',
        'file_name',
        'file_path',
        'mime_type',
        'size',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }
}
