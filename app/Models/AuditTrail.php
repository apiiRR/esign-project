<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditTrail extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'category',
        'action',
        'description',
        'auditable_type',
        'auditable_id',
        'metadata',
        'ip_address',
        'user_agent',
        'device',
        'location_source',
        'latitude',
        'longitude',
        'city',
        'region',
        'country',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function auditable()
    {
        return $this->morphTo();
    }
}
