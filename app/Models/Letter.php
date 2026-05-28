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
        'letter_type_id',
        'created_by',
        'origin_directorate_id',
        'origin_division_id',
        'origin_department_id',
        'title',
        'subject',
        'letter_number',
        'reference',
        'page_count',
        'signed_pdf_path',
        'signature_status',
        'status',
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

    public function signatureRequests()
    {
        return $this->hasMany(LetterSignatureRequest::class)->orderBy('signing_order');
    }
}
