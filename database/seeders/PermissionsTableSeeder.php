<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionsTableSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'dashboard.index',
            'inbox.internal',
            'inbox.tebusan',
            'inbox.disposisi',
            'pegawai.dashboard',
            'pegawai.inbox',
            'pegawai.letters.create',
            'pegawai.archive',
            'organization.index',
            'audit-trails.index',
            'notifications.index',
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
            'letter-templates.index',
            'letter-templates.create',
            'letter-templates.edit',
            'letter-templates.delete',
            'letter-types.index',
            'letter-types.create',
            'letter-types.edit',
            'letter-types.delete',
            'letters.index',
            'letters.create',
            'letters.show',
            'letters.edit',
            'letters.delete',
            'settings.index',
            'settings.update',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }
}
