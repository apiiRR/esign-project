<?php

use App\Models\Letter;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letter_document_versions')) {
            Schema::create('letter_document_versions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('letter_id')->constrained('letters')->cascadeOnDelete();
                $table->unsignedInteger('version_number');
                $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('attachment_id')->nullable()->constrained('letter_attachments')->nullOnDelete();
                $table->string('source_pdf_path');
                $table->string('signed_pdf_path')->nullable();
                $table->string('status')->default('active');
                $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('rejected_at')->nullable();
                $table->text('rejection_note')->nullable();
                $table->timestamps();

                $table->unique(['letter_id', 'version_number']);
                $table->index(['letter_id', 'status']);
            });
        }

        if (Schema::hasTable('letters') && ! Schema::hasColumn('letters', 'current_version_id')) {
            Schema::table('letters', function (Blueprint $table) {
                $table->foreignId('current_version_id')->nullable()->after('signature_status')->constrained('letter_document_versions')->nullOnDelete();
            });
        }

        if (Schema::hasTable('letter_signature_requests') && ! Schema::hasColumn('letter_signature_requests', 'letter_document_version_id')) {
            Schema::table('letter_signature_requests', function (Blueprint $table) {
                $table->foreignId('letter_document_version_id')->nullable()->after('letter_id')->constrained('letter_document_versions')->cascadeOnDelete();
            });
        }

        if (Schema::hasTable('letter_signature_requests')) {
            Schema::table('letter_signature_requests', function (Blueprint $table) {
                try {
                    $table->dropUnique('letter_signature_requests_letter_id_signing_order_unique');
                } catch (Throwable) {
                    // Older databases may already be missing this unique index.
                }
            });
        }

        $this->backfillInitialVersions();
    }

    public function down(): void
    {
        if (Schema::hasTable('letter_signature_requests') && Schema::hasColumn('letter_signature_requests', 'letter_document_version_id')) {
            Schema::table('letter_signature_requests', function (Blueprint $table) {
                $table->dropConstrainedForeignId('letter_document_version_id');
            });
        }

        if (Schema::hasTable('letters') && Schema::hasColumn('letters', 'current_version_id')) {
            Schema::table('letters', function (Blueprint $table) {
                $table->dropConstrainedForeignId('current_version_id');
            });
        }

        Schema::dropIfExists('letter_document_versions');
    }

    private function backfillInitialVersions(): void
    {
        if (! Schema::hasTable('letters') || ! Schema::hasTable('letter_attachments')) {
            return;
        }

        Letter::query()
            ->where('type', 'internal')
            ->whereHas('signatureRequests')
            ->with(['attachments', 'signatureRequests'])
            ->chunkById(100, function ($letters) {
                foreach ($letters as $letter) {
                    if ($letter->current_version_id) {
                        continue;
                    }

                    $attachment = $letter->attachments->first(fn ($item) => str_contains((string) $item->mime_type, 'pdf'))
                        ?: $letter->attachments->first();

                    if (! $attachment) {
                        continue;
                    }

                    $versionId = DB::table('letter_document_versions')->insertGetId([
                        'letter_id' => $letter->id,
                        'version_number' => 1,
                        'uploaded_by' => $letter->created_by,
                        'attachment_id' => $attachment->id,
                        'source_pdf_path' => $attachment->file_path,
                        'signed_pdf_path' => $letter->signed_pdf_path,
                        'status' => $letter->signature_status === 'signed' ? 'signed' : ($letter->signature_status === 'rejected' ? 'rejected' : 'active'),
                        'created_at' => $attachment->created_at ?? now(),
                        'updated_at' => now(),
                    ]);

                    DB::table('letters')->where('id', $letter->id)->update([
                        'current_version_id' => $versionId,
                    ]);

                    DB::table('letter_signature_requests')
                        ->where('letter_id', $letter->id)
                        ->whereNull('letter_document_version_id')
                        ->update(['letter_document_version_id' => $versionId]);
                }
            });
    }
};
