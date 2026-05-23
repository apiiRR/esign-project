<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterType extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'numbering_enabled',
        'numbering_contexts',
        'numbering_format',
        'status',
    ];

    protected $casts = [
        'numbering_enabled' => 'boolean',
        'numbering_contexts' => 'array',
    ];

    public function letters()
    {
        return $this->hasMany(Letter::class);
    }
}
