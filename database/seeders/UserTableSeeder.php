<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;

class UserTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $directorate = Directorate::first();
        $division = Division::first();
        $department = Department::first();

        $admin = User::create([
            'username' => 'admin',
            'name' => 'Administrator',
            'email' => 'admin@berdikari.co.id',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'directorate_id' => $directorate?->id,
            'division_id' => $division?->id,
            'department_id' => $department?->id,
            'position' => 'Admin Persuratan',
            'status' => 'active',
        ]);

        $user = User::create([
            'username' => 'user',
            'name' => 'Arif Setiawan',
            'email' => 'arif.setiawan@berdikari.co.id',
            'password' => bcrypt('password'),
            'role' => 'user',
            'directorate_id' => $directorate?->id,
            'division_id' => $division?->id,
            'department_id' => $department?->id,
            'position' => 'User',
            'status' => 'active',
        ]);

        $adminRole = Role::where('name', 'admin')->first();
        $userRole = Role::where('name', 'user')->first();

        $adminRole->syncPermissions([]);
        $userRole->syncPermissions([]);
        $createDocumentPermission = Permission::firstOrCreate([
            'name' => 'user.letters.create',
            'guard_name' => 'web',
        ]);

        $admin->assignRole($adminRole);
        $user->assignRole($userRole);
        $user->givePermissionTo($createDocumentPermission);

        if ($directorate) {
            $directorate->update(['director_user_id' => $admin->id]);
        }

        if ($division) {
            $division->update(['gm_user_id' => $admin->id]);
        }

        if ($department) {
            $department->update(['manager_user_id' => $user->id]);
        }
    }
}
