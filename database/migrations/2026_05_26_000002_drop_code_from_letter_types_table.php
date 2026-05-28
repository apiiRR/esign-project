<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('letter_types') && Schema::hasColumn('letter_types', 'code')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->dropColumn('code');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('letter_types') && ! Schema::hasColumn('letter_types', 'code')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->string('code')->nullable()->after('name');
            });
        }
    }
};
