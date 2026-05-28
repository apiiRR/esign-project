<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterType extends Model
{
    protected $fillable = [
        'name',
        'description',
        'status',
    ];

    public function letters()
    {
        return $this->hasMany(Letter::class);
    }
}
