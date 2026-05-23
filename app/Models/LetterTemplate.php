<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterTemplate extends Model
{
    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'category',
        'status',
        'content_template',
        'meta',
        'extra_fields',
    ];

    /**
     * casts
     *
     * @var array
     */
    protected $casts = [
        'extra_fields'  => 'array',
        'meta'         => 'array',
    ];

    /**
     * letters
     *
     * @return void
     */
    public function letters()
    {
        return $this->hasMany(Letter::class);
    }
}
