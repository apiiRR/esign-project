<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letter_types')) {
            return;
        }

        if (! Schema::hasColumn('letter_types', 'code')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->string('code')->nullable()->after('name');
            });
        }

        if (! Schema::hasColumn('letter_types', 'numbering_enabled')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->boolean('numbering_enabled')->default(false)->after('description');
            });
        }

        if (! Schema::hasColumn('letter_types', 'numbering_contexts')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->json('numbering_contexts')->nullable()->after('numbering_enabled');
            });
        }

        if (! Schema::hasColumn('letter_types', 'numbering_format')) {
            Schema::table('letter_types', function (Blueprint $table) {
                $table->string('numbering_format')->default('{day}-{daily_sequence}/{letter_type_code}/{company_code}/{origin_code}/{roman_month}/{year}')->after('numbering_contexts');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('letter_types')) {
            return;
        }

        $columns = collect(['numbering_format', 'numbering_contexts', 'numbering_enabled', 'code'])
            ->filter(fn ($column) => Schema::hasColumn('letter_types', $column))
            ->values()
            ->all();

        if ($columns) {
            Schema::table('letter_types', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
