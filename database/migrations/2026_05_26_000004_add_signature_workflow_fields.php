<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('letter_signature_requests')) {
            Schema::table('letter_signature_requests', function (Blueprint $table) {
                if (! Schema::hasColumn('letter_signature_requests', 'rejected_at')) {
                    $table->timestamp('rejected_at')->nullable()->after('signed_at');
                }

                if (! Schema::hasColumn('letter_signature_requests', 'note')) {
                    $table->text('note')->nullable()->after('rejected_at');
                }

                if (! Schema::hasColumn('letter_signature_requests', 'verification_token')) {
                    $table->string('verification_token')->nullable()->unique()->after('note');
                }

                if (! Schema::hasColumn('letter_signature_requests', 'qr_file_path')) {
                    $table->string('qr_file_path')->nullable()->after('verification_token');
                }
            });
        }

        if (Schema::hasTable('letters')) {
            Schema::table('letters', function (Blueprint $table) {
                if (! Schema::hasColumn('letters', 'signed_pdf_path')) {
                    $table->string('signed_pdf_path')->nullable()->after('page_count');
                }

                if (! Schema::hasColumn('letters', 'signature_status')) {
                    $table->string('signature_status')->nullable()->after('signed_pdf_path');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('letter_signature_requests')) {
            Schema::table('letter_signature_requests', function (Blueprint $table) {
                foreach (['qr_file_path', 'verification_token', 'note', 'rejected_at'] as $column) {
                    if (Schema::hasColumn('letter_signature_requests', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        if (Schema::hasTable('letters')) {
            Schema::table('letters', function (Blueprint $table) {
                foreach (['signature_status', 'signed_pdf_path'] as $column) {
                    if (Schema::hasColumn('letters', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
