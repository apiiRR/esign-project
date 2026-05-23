<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    protected $fillable = [
        'division_id',
        'name',
        'code',
        'manager_user_id',
        'status',
    ];

    public function division()
    {
        return $this->belongsTo(Division::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_user_id');
    }
}
