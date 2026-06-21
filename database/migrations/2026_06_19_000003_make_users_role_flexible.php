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
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role VARCHAR(255) NOT NULL DEFAULT 'user'");
        }
    }

    public function down(): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'))");
            return;
        }

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'user') NOT NULL DEFAULT 'user'");
        }
    }
};
