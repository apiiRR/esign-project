<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letter_signature_requests')) {
            return;
        }

        Schema::table('letter_signature_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_signature_requests', 'approval_type')) {
                $table->string('approval_type')->default('signature')->after('signer_user_id');
            }
        });

        DB::table('letter_signature_requests')
            ->whereNull('approval_type')
            ->orWhere('approval_type', '')
            ->update(['approval_type' => 'signature']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('letter_signature_requests') || ! Schema::hasColumn('letter_signature_requests', 'approval_type')) {
            return;
        }

        Schema::table('letter_signature_requests', function (Blueprint $table) {
            $table->dropColumn('approval_type');
        });
    }
};
