<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Division extends Model
{
    protected $fillable = [
        'directorate_id',
        'name',
        'code',
        'gm_user_id',
        'status',
    ];

    public function directorate()
    {
        return $this->belongsTo(Directorate::class);
    }

    public function departments()
    {
        return $this->hasMany(Department::class);
    }

    public function generalManager()
    {
        return $this->belongsTo(User::class, 'gm_user_id');
    }
}
