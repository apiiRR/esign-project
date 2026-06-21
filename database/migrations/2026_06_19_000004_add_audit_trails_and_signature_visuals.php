<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('audit_trails')) {
            Schema::create('audit_trails', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('category')->index();
                $table->string('action')->index();
                $table->text('description')->nullable();
                $table->nullableMorphs('auditable');
                $table->json('metadata')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->string('device')->nullable();
                $table->string('location_source')->nullable();
                $table->decimal('latitude', 10, 7)->nullable();
                $table->decimal('longitude', 10, 7)->nullable();
                $table->string('city')->nullable();
                $table->string('region')->nullable();
                $table->string('country')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'signature_specimen_path')) {
                $table->string('signature_specimen_path')->nullable()->after('position');
            }
        });

        Schema::table('letter_signature_requests', function (Blueprint $table) {
            if (! Schema::hasColumn('letter_signature_requests', 'signature_visual_type')) {
                $table->string('signature_visual_type')->default('qr')->after('qr_payload');
            }

            if (! Schema::hasColumn('letter_signature_requests', 'signature_image_path')) {
                $table->string('signature_image_path')->nullable()->after('signature_visual_type');
            }
        });

        if (Schema::hasTable('permissions')) {
            $permissionId = DB::table('permissions')->where('name', 'audit-trails.index')->value('id');
            if (! $permissionId) {
                $permissionId = DB::table('permissions')->insertGetId([
                    'name' => 'audit-trails.index',
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $adminRoleId = Schema::hasTable('roles') ? DB::table('roles')->where('name', 'admin')->value('id') : null;
            if ($adminRoleId && Schema::hasTable('role_has_permissions')) {
                $exists = DB::table('role_has_permissions')
                    ->where('role_id', $adminRoleId)
                    ->where('permission_id', $permissionId)
                    ->exists();

                if (! $exists) {
                    DB::table('role_has_permissions')->insert([
                        'permission_id' => $permissionId,
                        'role_id' => $adminRoleId,
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('letter_signature_requests', function (Blueprint $table) {
            foreach (['signature_image_path', 'signature_visual_type'] as $column) {
                if (Schema::hasColumn('letter_signature_requests', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'signature_specimen_path')) {
                $table->dropColumn('signature_specimen_path');
            }
        });

        Schema::dropIfExists('audit_trails');
    }
};
