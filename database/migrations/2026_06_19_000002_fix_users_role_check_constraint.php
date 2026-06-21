<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(255)');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'");
            DB::table('users')->where('role', 'pegawai')->update(['role' => 'user']);
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(255) NOT NULL DEFAULT 'user'");
            DB::table('users')->where('role', 'pegawai')->update(['role' => 'user']);
            return;
        }

        DB::table('users')->where('role', 'pegawai')->update(['role' => 'user']);
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'pegawai'");
            DB::table('users')->where('role', 'user')->update(['role' => 'pegawai']);
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(255) NOT NULL DEFAULT 'pegawai'");
            DB::table('users')->where('role', 'user')->update(['role' => 'pegawai']);
            return;
        }

        DB::table('users')->where('role', 'user')->update(['role' => 'pegawai']);
    }
};
