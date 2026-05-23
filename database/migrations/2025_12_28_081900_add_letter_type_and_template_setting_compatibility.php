<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letter_types')) {
            Schema::create('letter_types', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->nullable();
                $table->text('description')->nullable();
                $table->boolean('numbering_enabled')->default(false);
                $table->json('numbering_contexts')->nullable();
                $table->string('numbering_format')->default('{day}-{daily_sequence}/{letter_type_code}/{company_code}/{origin_code}/{roman_month}/{year}');
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
            });
        } else {
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

        if (Schema::hasTable('letters') && ! Schema::hasColumn('letters', 'letter_type_id')) {
            Schema::table('letters', function (Blueprint $table) {
                $table->foreignId('letter_type_id')
                    ->nullable()
                    ->after('creation_method')
                    ->constrained('letter_types')
                    ->nullOnDelete();
            });
        }

        if (Schema::hasTable('settings') && ! Schema::hasColumn('settings', 'enable_letter_template_method')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->boolean('enable_letter_template_method')->default(false)->after('company_logo');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'enable_letter_template_method')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('enable_letter_template_method');
            });
        }

        if (Schema::hasTable('letters') && Schema::hasColumn('letters', 'letter_type_id')) {
            Schema::table('letters', function (Blueprint $table) {
                $table->dropConstrainedForeignId('letter_type_id');
            });
        }
    }
};
