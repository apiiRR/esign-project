<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Letter extends Model
{
    /**
     * fillable
     *
     * @var array
     */
    protected $fillable = [
        'type',
        'creation_method',
        'letter_type_id',
        'letter_template_id',
        'created_by',
        'origin_directorate_id',
        'origin_division_id',
        'origin_department_id',
        'title',
        'subject',
        'letter_number',
        'reference',
        'page_count',
        'status',
        'body_rendered',
        'payload',
        'meta',
    ];

    /**
     * casts
     *
     * @var array
     */
    protected $casts = [
        'payload' => 'array',
        'meta' => 'array',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function template()
    {
        return $this->belongsTo(LetterTemplate::class, 'letter_template_id');
    }

    public function letterType()
    {
        return $this->belongsTo(LetterType::class);
    }

    public function targets()
    {
        return $this->hasMany(LetterTarget::class);
    }

    public function attachments()
    {
        return $this->hasMany(LetterAttachment::class);
    }

    public function dispositions()
    {
        return $this->hasMany(Disposition::class);
    }

    public function readReceipts()
    {
        return $this->hasMany(LetterReadReceipt::class);
    }
}
