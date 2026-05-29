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
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->string('app_name')->default('Surat dan Arsip Digital Berdikari');
            $table->string('company_name');
            $table->string('company_code')->default('BDRK');
            $table->string('company_logo')->nullable();
            $table->boolean('enable_letter_template_method')->default(false);
            $table->json('letter_field_requirements')->nullable();
            $table->timestamps();
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
