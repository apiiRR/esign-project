<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'app_name',
        'company_name',
        'company_code',
        'company_logo',
        'enable_letter_template_method',
        'letter_field_requirements',
    ];

    protected $casts = [
        'enable_letter_template_method' => 'boolean',
        'letter_field_requirements' => 'array',
    ];
}
