<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('settings') || Schema::hasColumn('settings', 'document_download_watermark_sample_pdf')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->string('document_download_watermark_sample_pdf')->nullable()->after('document_download_watermark_settings');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('settings') || ! Schema::hasColumn('settings', 'document_download_watermark_sample_pdf')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('document_download_watermark_sample_pdf');
        });
    }
};
