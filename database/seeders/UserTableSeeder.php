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

        $pegawai = User::create([
            'username' => 'pegawai',
            'name' => 'Arif Setiawan',
            'email' => 'arif.setiawan@berdikari.co.id',
            'password' => bcrypt('password'),
            'role' => 'pegawai',
            'directorate_id' => $directorate?->id,
            'division_id' => $division?->id,
            'department_id' => $department?->id,
            'position' => 'Pegawai',
            'status' => 'active',
        ]);

        $adminRole = Role::where('name', 'admin')->first();
        $pegawaiRole = Role::where('name', 'pegawai')->first();

        $adminRole->syncPermissions(Permission::all());
        $pegawaiRole->syncPermissions(Permission::whereIn('name', [
            'pegawai.dashboard',
            'pegawai.inbox',
            'pegawai.letters.create',
            'pegawai.archive',
            'inbox.internal',
            'inbox.tebusan',
            'inbox.disposisi',
        ])->get());

        $admin->assignRole($adminRole);
        $pegawai->assignRole($pegawaiRole);

        if ($directorate) {
            $directorate->update(['director_user_id' => $admin->id]);
        }

        if ($division) {
            $division->update(['gm_user_id' => $admin->id]);
        }

        if ($department) {
            $department->update(['manager_user_id' => $pegawai->id]);
        }
    }
}
