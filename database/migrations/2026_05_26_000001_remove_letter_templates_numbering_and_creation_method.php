<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('letters')) {
            if (Schema::hasColumn('letters', 'letter_template_id')) {
                try {
                    Schema::table('letters', function (Blueprint $table) {
                        $table->dropForeign(['letter_template_id']);
                    });
                } catch (Throwable) {
                    // The column may exist without a foreign key in older/local databases.
                }
            }

            Schema::table('letters', function (Blueprint $table) {
                foreach ([
                    'letter_template_id',
                    'creation_method',
                    'body_rendered',
                    'template_payload',
                    'generated_docx_path',
                    'generated_pdf_path',
                    'approval_status',
                ] as $column) {
                    if (Schema::hasColumn('letters', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        Schema::dropIfExists('letter_approvals');
        Schema::dropIfExists('letter_template_fields');
        Schema::dropIfExists('letter_templates');

        if (Schema::hasTable('letter_types')) {
            Schema::table('letter_types', function (Blueprint $table) {
                foreach (['numbering_format', 'numbering_contexts', 'numbering_enabled'] as $column) {
                    if (Schema::hasColumn('letter_types', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'enable_letter_template_method')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('enable_letter_template_method');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('letter_types')) {
            Schema::table('letter_types', function (Blueprint $table) {
                if (! Schema::hasColumn('letter_types', 'numbering_enabled')) {
                    $table->boolean('numbering_enabled')->default(false)->after('description');
                }
                if (! Schema::hasColumn('letter_types', 'numbering_contexts')) {
                    $table->json('numbering_contexts')->nullable()->after('numbering_enabled');
                }
                if (! Schema::hasColumn('letter_types', 'numbering_format')) {
                    $table->string('numbering_format')->nullable()->after('numbering_contexts');
                }
            });
        }

        if (Schema::hasTable('settings') && ! Schema::hasColumn('settings', 'enable_letter_template_method')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->boolean('enable_letter_template_method')->default(false)->after('company_logo');
            });
        }

        if (Schema::hasTable('letters')) {
            Schema::table('letters', function (Blueprint $table) {
                if (! Schema::hasColumn('letters', 'creation_method')) {
                    $table->string('creation_method')->default('scan')->after('type');
                }
                if (! Schema::hasColumn('letters', 'body_rendered')) {
                    $table->longText('body_rendered')->nullable()->after('status');
                }
            });
        }
    }
};
