<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('settings') && ! Schema::hasColumn('settings', 'letter_field_requirements')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->json('letter_field_requirements')->nullable()->after('enable_letter_template_method');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'letter_field_requirements')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('letter_field_requirements');
            });
        }
    }
};
