<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('letter_signature_requests')) {
            return;
        }

        Schema::create('letter_signature_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('signer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedInteger('signing_order');
            $table->unsignedInteger('page_number')->default(1);
            $table->decimal('x', 8, 6);
            $table->decimal('y', 8, 6);
            $table->decimal('width', 8, 6);
            $table->decimal('height', 8, 6);
            $table->string('status')->default('pending');
            $table->timestamp('signed_at')->nullable();
            $table->json('qr_payload')->nullable();
            $table->timestamps();

            $table->unique(['letter_id', 'signing_order']);
            $table->index(['signer_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('letter_signature_requests');
    }
};
