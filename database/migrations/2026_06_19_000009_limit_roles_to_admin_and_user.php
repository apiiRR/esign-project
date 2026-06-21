<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('roles') || ! Schema::hasTable('model_has_roles')) {
            return;
        }

        $userModel = User::class;
        $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');
        $userRoleId = DB::table('roles')->where('name', 'user')->value('id');

        if (! $userRoleId) {
            $userRoleId = DB::table('roles')->insertGetId([
                'name' => 'user',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        if (! $adminRoleId) {
            DB::table('roles')->insert([
                'name' => 'admin',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $adminRoleId = DB::table('roles')->where('name', 'admin')->value('id');
        }

        $createPermissionId = DB::table('permissions')->where('name', 'user.letters.create')->value('id');
        if (! $createPermissionId && Schema::hasTable('permissions')) {
            $createPermissionId = DB::table('permissions')->insertGetId([
                'name' => 'user.letters.create',
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $legacyRoleIds = DB::table('roles')
            ->whereNotIn('name', ['admin', 'user'])
            ->pluck('id');

        if ($legacyRoleIds->isNotEmpty()) {
            $legacyRoleIdsWithCreatePermission = Schema::hasTable('role_has_permissions') && $createPermissionId
                ? DB::table('role_has_permissions')
                    ->where('permission_id', $createPermissionId)
                    ->whereIn('role_id', $legacyRoleIds)
                    ->pluck('role_id')
                : collect();

            $legacyRows = DB::table('model_has_roles')
                ->where('model_type', $userModel)
                ->whereIn('role_id', $legacyRoleIds)
                ->get();

            foreach ($legacyRows as $row) {
                if ($createPermissionId && $legacyRoleIdsWithCreatePermission->contains($row->role_id)) {
                    DB::table('model_has_permissions')->insertOrIgnore([
                        'permission_id' => $createPermissionId,
                        'model_type' => $userModel,
                        'model_id' => $row->model_id,
                    ]);
                }

                DB::table('model_has_roles')->insertOrIgnore([
                    'role_id' => $userRoleId,
                    'model_type' => $userModel,
                    'model_id' => $row->model_id,
                ]);
            }

            DB::table('model_has_roles')->whereIn('role_id', $legacyRoleIds)->delete();
            DB::table('role_has_permissions')->whereIn('role_id', $legacyRoleIds)->delete();
            DB::table('roles')->whereIn('id', $legacyRoleIds)->delete();
        }

        DB::table('users')
            ->whereNotIn('role', ['admin', 'user'])
            ->update(['role' => 'user']);

        DB::table('model_has_roles')
            ->where('model_type', $userModel)
            ->whereNotIn('role_id', [$adminRoleId, $userRoleId])
            ->delete();

        DB::table('users')
            ->select(['id', 'role'])
            ->orderBy('id')
            ->chunkById(100, function ($users) use ($adminRoleId, $userRoleId, $userModel) {
                foreach ($users as $user) {
                    $roleId = $user->role === 'admin' ? $adminRoleId : $userRoleId;

                    DB::table('model_has_roles')->insertOrIgnore([
                        'role_id' => $roleId,
                        'model_type' => $userModel,
                        'model_id' => $user->id,
                    ]);
                }
            });

        app('cache')
            ->store(config('permission.cache.store') !== 'default' ? config('permission.cache.store') : null)
            ->forget(config('permission.cache.key'));
    }

    public function down(): void
    {
        // Role lama tidak dapat dipulihkan karena migration ini memang membersihkan data role custom.
    }
};
