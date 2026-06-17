<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('settings')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            if (! Schema::hasColumn('settings', 'mail_templates')) {
                $table->json('mail_templates')->nullable()->after('mail_from_name');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('settings') || ! Schema::hasColumn('settings', 'mail_templates')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('mail_templates');
        });
    }
};
