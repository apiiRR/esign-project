<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('settings') || Schema::hasColumn('settings', 'document_download_watermark_settings')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->json('document_download_watermark_settings')->nullable()->after('document_download_otp_scope');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('settings') || ! Schema::hasColumn('settings', 'document_download_watermark_settings')) {
            return;
        }

        Schema::table('settings', function (Blueprint $table) {
            $table->dropColumn('document_download_watermark_settings');
        });
    }
};
