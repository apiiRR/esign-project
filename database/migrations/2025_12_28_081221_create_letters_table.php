<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
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

        Schema::create('letters', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['incoming_external', 'outgoing', 'internal'])->index();
            $table->enum('creation_method', ['scan', 'template'])->default('scan');
            $table->foreignId('letter_type_id')->nullable()->constrained('letter_types')->nullOnDelete();
            $table->foreignId('letter_template_id')->nullable()->constrained('letter_templates')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('origin_directorate_id')->nullable()->constrained('directorates')->nullOnDelete();
            $table->foreignId('origin_division_id')->nullable()->constrained('divisions')->nullOnDelete();
            $table->foreignId('origin_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->string('title');
            $table->string('subject');
            $table->string('letter_number')->unique()->nullable();
            $table->string('reference')->unique();
            $table->unsignedSmallInteger('page_count')->default(1);
            $table->enum('status', [
                'draft',
                'sent',
                'received',
                'disposed',
                'archived',
                'rejected',
            ])->default('draft')->index();
            $table->longText('body_rendered')->nullable();
            $table->json('payload')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('letter_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->enum('kind', ['recipient', 'cc'])->default('recipient');
            $table->enum('target_type', ['user', 'division', 'department', 'directorate', 'division_gm', 'department_manager']);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->timestamps();
        });

        Schema::create('letter_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();
        });

        Schema::create('dispositions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('dispositions')->cascadeOnDelete();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->foreignId('from_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('from_directorate_id')->nullable()->constrained('directorates')->nullOnDelete();
            $table->foreignId('from_division_id')->nullable()->constrained('divisions')->nullOnDelete();
            $table->foreignId('from_department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->enum('target_type', ['user', 'division', 'department', 'directorate', 'division_gm', 'department_manager']);
            $table->unsignedBigInteger('target_id')->nullable();
            $table->text('note')->nullable();
            $table->enum('status', ['open', 'done'])->default('open');
            $table->timestamp('read_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('letter_read_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            $table->unique(['letter_id', 'user_id']);
        });

        Schema::create('notification_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('letter_id')->nullable()->constrained('letters')->cascadeOnDelete();
            $table->string('channel')->default('web');
            $table->string('title');
            $table->text('body')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_logs');
        Schema::dropIfExists('letter_read_receipts');
        Schema::dropIfExists('dispositions');
        Schema::dropIfExists('letter_attachments');
        Schema::dropIfExists('letter_targets');
        Schema::dropIfExists('letters');
        Schema::dropIfExists('letter_types');
    }
};
