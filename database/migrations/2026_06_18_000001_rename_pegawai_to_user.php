<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $this->renameRole('pegawai', 'user');
        $this->renamePermission('pegawai.dashboard', 'user.dashboard');
        $this->renamePermission('pegawai.letters.create', 'user.letters.create');
        $this->deletePermission('pegawai.archive');

        $this->allowTransitionRoleValues('user');
        DB::table('users')->where('role', 'pegawai')->update(['role' => 'user']);
        $this->allowUserRoleValue();
    }

    public function down(): void
    {
        $this->renameRole('user', 'pegawai');
        $this->renamePermission('user.dashboard', 'pegawai.dashboard');
        $this->renamePermission('user.letters.create', 'pegawai.letters.create');

        $this->allowTransitionRoleValues('pegawai');
        DB::table('users')->where('role', 'user')->update(['role' => 'pegawai']);
        $this->allowLegacyRoleValue();
    }

    private function renameRole(string $oldName, string $newName): void
    {
        $old = DB::table('roles')->where('name', $oldName)->first();
        if (! $old) {
            return;
        }

        $new = DB::table('roles')->where('name', $newName)->where('guard_name', $old->guard_name)->first();
        if (! $new) {
            DB::table('roles')->where('id', $old->id)->update(['name' => $newName]);
            return;
        }

        $rows = DB::table('model_has_roles')->where('role_id', $old->id)->get();
        foreach ($rows as $row) {
            DB::table('model_has_roles')->insertOrIgnore([
                'role_id' => $new->id,
                'model_type' => $row->model_type,
                'model_id' => $row->model_id,
            ]);
        }

        DB::table('model_has_roles')->where('role_id', $old->id)->delete();
        DB::table('role_has_permissions')->where('role_id', $old->id)->delete();
        DB::table('roles')->where('id', $old->id)->delete();
    }

    private function renamePermission(string $oldName, string $newName): void
    {
        $old = DB::table('permissions')->where('name', $oldName)->first();
        if (! $old) {
            return;
        }

        $new = DB::table('permissions')->where('name', $newName)->where('guard_name', $old->guard_name)->first();
        if (! $new) {
            DB::table('permissions')->where('id', $old->id)->update(['name' => $newName]);
            return;
        }

        $this->movePermissionAssignments($old->id, $new->id);
        DB::table('permissions')->where('id', $old->id)->delete();
    }

    private function deletePermission(string $name): void
    {
        $permission = DB::table('permissions')->where('name', $name)->first();
        if (! $permission) {
            return;
        }

        DB::table('model_has_permissions')->where('permission_id', $permission->id)->delete();
        DB::table('role_has_permissions')->where('permission_id', $permission->id)->delete();
        DB::table('permissions')->where('id', $permission->id)->delete();
    }

    private function movePermissionAssignments(int $oldId, int $newId): void
    {
        foreach (DB::table('role_has_permissions')->where('permission_id', $oldId)->get() as $row) {
            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $newId,
                'role_id' => $row->role_id,
            ]);
        }

        foreach (DB::table('model_has_permissions')->where('permission_id', $oldId)->get() as $row) {
            DB::table('model_has_permissions')->insertOrIgnore([
                'permission_id' => $newId,
                'model_type' => $row->model_type,
                'model_id' => $row->model_id,
            ]);
        }

        DB::table('role_has_permissions')->where('permission_id', $oldId)->delete();
        DB::table('model_has_permissions')->where('permission_id', $oldId)->delete();
    }

    private function allowUserRoleValue(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'user') NOT NULL DEFAULT 'user'");
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255)');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'");
        }
    }

    private function allowTransitionRoleValues(string $default): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'pegawai', 'user') NOT NULL DEFAULT '{$default}'");
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255)');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT '{$default}'");
        }
    }

    private function allowLegacyRoleValue(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'pegawai') NOT NULL DEFAULT 'pegawai'");
        }

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255)');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pegawai'");
        }
    }
};
