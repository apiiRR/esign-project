<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('dispositions')) {
            return;
        }

        Schema::table('dispositions', function (Blueprint $table) {
            if (! Schema::hasColumn('dispositions', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('id')->constrained('dispositions')->cascadeOnDelete();
            }
            if (! Schema::hasColumn('dispositions', 'from_directorate_id')) {
                $table->foreignId('from_directorate_id')->nullable()->after('from_user_id')->constrained('directorates')->nullOnDelete();
            }
            if (! Schema::hasColumn('dispositions', 'from_division_id')) {
                $table->foreignId('from_division_id')->nullable()->after('from_directorate_id')->constrained('divisions')->nullOnDelete();
            }
            if (! Schema::hasColumn('dispositions', 'from_department_id')) {
                $table->foreignId('from_department_id')->nullable()->after('from_division_id')->constrained('departments')->nullOnDelete();
            }
            if (! Schema::hasColumn('dispositions', 'read_at')) {
                $table->timestamp('read_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('dispositions', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('read_at');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('dispositions')) {
            return;
        }

        Schema::table('dispositions', function (Blueprint $table) {
            foreach (['parent_id', 'from_directorate_id', 'from_division_id', 'from_department_id'] as $column) {
                if (Schema::hasColumn('dispositions', $column)) {
                    $table->dropConstrainedForeignId($column);
                }
            }
            foreach (['read_at', 'completed_at'] as $column) {
                if (Schema::hasColumn('dispositions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
