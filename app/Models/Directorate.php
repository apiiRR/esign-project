<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Directorate extends Model
{
    protected $fillable = [
        'name',
        'code',
        'director_user_id',
        'status',
    ];

    public function divisions()
    {
        return $this->hasMany(Division::class);
    }

    public function director()
    {
        return $this->belongsTo(User::class, 'director_user_id');
    }
}
