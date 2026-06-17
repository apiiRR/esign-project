<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LetterDocumentVersion extends Model
{
    protected $fillable = [
        'letter_id',
        'version_number',
        'uploaded_by',
        'attachment_id',
        'source_pdf_path',
        'signed_pdf_path',
        'status',
        'rejected_by',
        'rejected_at',
        'rejection_note',
    ];

    protected $casts = [
        'rejected_at' => 'datetime',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function rejector()
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function attachment()
    {
        return $this->belongsTo(LetterAttachment::class);
    }

    public function signatureRequests()
    {
        return $this->hasMany(LetterSignatureRequest::class)->orderBy('signing_order');
    }
}
