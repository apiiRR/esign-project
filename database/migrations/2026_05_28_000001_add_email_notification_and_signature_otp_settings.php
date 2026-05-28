<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('settings')) {
            Schema::table('settings', function (Blueprint $table) {
                if (! Schema::hasColumn('settings', 'mail_notifications_enabled')) {
                    $table->boolean('mail_notifications_enabled')->default(false)->after('letter_field_requirements');
                }
                if (! Schema::hasColumn('settings', 'mail_letter_notifications_enabled')) {
                    $table->boolean('mail_letter_notifications_enabled')->default(false)->after('mail_notifications_enabled');
                }
                if (! Schema::hasColumn('settings', 'mail_signature_approval_notifications_enabled')) {
                    $table->boolean('mail_signature_approval_notifications_enabled')->default(false)->after('mail_letter_notifications_enabled');
                }
                if (! Schema::hasColumn('settings', 'signature_otp_enabled')) {
                    $table->boolean('signature_otp_enabled')->default(false)->after('mail_signature_approval_notifications_enabled');
                }
                if (! Schema::hasColumn('settings', 'mail_mailer')) {
                    $table->string('mail_mailer')->nullable()->after('signature_otp_enabled');
                }
                if (! Schema::hasColumn('settings', 'mail_host')) {
                    $table->string('mail_host')->nullable()->after('mail_mailer');
                }
                if (! Schema::hasColumn('settings', 'mail_port')) {
                    $table->unsignedInteger('mail_port')->nullable()->after('mail_host');
                }
                if (! Schema::hasColumn('settings', 'mail_username')) {
                    $table->string('mail_username')->nullable()->after('mail_port');
                }
                if (! Schema::hasColumn('settings', 'mail_password')) {
                    $table->text('mail_password')->nullable()->after('mail_username');
                }
                if (! Schema::hasColumn('settings', 'mail_encryption')) {
                    $table->string('mail_encryption')->nullable()->after('mail_password');
                }
                if (! Schema::hasColumn('settings', 'mail_from_address')) {
                    $table->string('mail_from_address')->nullable()->after('mail_encryption');
                }
                if (! Schema::hasColumn('settings', 'mail_from_name')) {
                    $table->string('mail_from_name')->nullable()->after('mail_from_address');
                }
            });
        }

        if (! Schema::hasTable('letter_signature_otps')) {
            Schema::create('letter_signature_otps', function (Blueprint $table) {
                $table->id();
                $table->foreignId('letter_signature_request_id')->constrained('letter_signature_requests')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('otp_hash');
                $table->timestamp('expires_at');
                $table->timestamp('consumed_at')->nullable();
                $table->unsignedTinyInteger('attempts')->default(0);
                $table->timestamp('last_sent_at')->nullable();
                $table->timestamps();

                $table->index(['letter_signature_request_id', 'user_id', 'consumed_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_signature_otps');

        if (Schema::hasTable('settings')) {
            Schema::table('settings', function (Blueprint $table) {
                foreach ([
                    'mail_from_name',
                    'mail_from_address',
                    'mail_encryption',
                    'mail_password',
                    'mail_username',
                    'mail_port',
                    'mail_host',
                    'mail_mailer',
                    'signature_otp_enabled',
                    'mail_signature_approval_notifications_enabled',
                    'mail_letter_notifications_enabled',
                    'mail_notifications_enabled',
                ] as $column) {
                    if (Schema::hasColumn('settings', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
