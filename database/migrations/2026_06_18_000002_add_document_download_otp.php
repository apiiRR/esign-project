<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('settings') && ! Schema::hasColumn('settings', 'document_download_otp_scope')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->string('document_download_otp_scope')->default('both')->after('signature_otp_enabled');
            });
        }

        if (! Schema::hasTable('letter_download_otps')) {
            Schema::create('letter_download_otps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->timestamp('consumed_at')->nullable();
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamps();

                $table->index(['letter_id', 'user_id', 'consumed_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_download_otps');

        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'document_download_otp_scope')) {
            Schema::table('settings', function (Blueprint $table) {
                $table->dropColumn('document_download_otp_scope');
            });
        }
    }
};
