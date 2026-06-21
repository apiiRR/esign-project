<?php

namespace Database\Seeders;

use App\Support\ActivePermissions;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionsTableSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = ActivePermissions::names();

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        Permission::query()
            ->whereNotIn('name', $permissions)
            ->get()
            ->each
            ->delete();
    }
}
