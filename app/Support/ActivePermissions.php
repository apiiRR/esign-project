<?php

namespace App\Support;

class ActivePermissions
{
    public static function names(): array
    {
        return [
            'dashboard.index',
            'user.dashboard',
            'user.letters.create',
            'users.index',
            'users.create',
            'users.edit',
            'users.delete',
            'roles.index',
            'roles.create',
            'roles.edit',
            'roles.delete',
            'permissions.index',
            'permissions.create',
            'permissions.edit',
            'permissions.delete',
            'letters.index',
            'letters.create',
            'letters.show',
            'letters.edit',
            'letters.delete',
            'settings.index',
            'settings.update',
            'audit-trails.index',
        ];
    }
}
