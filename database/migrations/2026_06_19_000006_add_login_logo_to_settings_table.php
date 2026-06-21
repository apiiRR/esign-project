<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('settings') || Schema::hasColumn('settings', 'login_logo')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->string('login_logo')->nullable()->after('company_logo');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('settings') || ! Schema::hasColumn('settings', 'login_logo')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('login_logo');
        });
    }
};
