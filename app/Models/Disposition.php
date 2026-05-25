<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Disposition extends Model
{
    protected $fillable = [
        'parent_id',
        'letter_id',
        'from_user_id',
        'from_directorate_id',
        'from_division_id',
        'from_department_id',
        'target_type',
        'target_id',
        'note',
        'status',
        'read_at',
        'completed_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function letter()
    {
        return $this->belongsTo(Letter::class);
    }

    public function fromUser()
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    public function parent()
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function fromDirectorate()
    {
        return $this->belongsTo(Directorate::class, 'from_directorate_id');
    }

    public function fromDivision()
    {
        return $this->belongsTo(Division::class, 'from_division_id');
    }

    public function fromDepartment()
    {
        return $this->belongsTo(Department::class, 'from_department_id');
    }
}
