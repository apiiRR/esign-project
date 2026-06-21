<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letter_signature_requests')) {
            return;
        }

        Schema::table('letter_signature_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_signature_requests', 'signed_ip_address')) {
                $table->string('signed_ip_address', 45)->nullable()->after('signed_at');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_user_agent')) {
                $table->text('signed_user_agent')->nullable()->after('signed_ip_address');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_device')) {
                $table->string('signed_device')->nullable()->after('signed_user_agent');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_location_source')) {
                $table->string('signed_location_source')->nullable()->after('signed_device');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_latitude')) {
                $table->decimal('signed_latitude', 10, 7)->nullable()->after('signed_location_source');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_longitude')) {
                $table->decimal('signed_longitude', 10, 7)->nullable()->after('signed_latitude');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_city')) {
                $table->string('signed_city')->nullable()->after('signed_longitude');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_region')) {
                $table->string('signed_region')->nullable()->after('signed_city');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signed_country')) {
                $table->string('signed_country')->nullable()->after('signed_region');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('letter_signature_requests')) {
            return;
        }

        Schema::table('letter_signature_requests', function (Blueprint $table) {
            foreach ([
                'signed_country',
                'signed_region',
                'signed_city',
                'signed_longitude',
                'signed_latitude',
                'signed_location_source',
                'signed_device',
                'signed_user_agent',
                'signed_ip_address',
            ] as $column) {
                if (Schema::hasColumn('letter_signature_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
