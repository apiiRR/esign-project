<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('letters')) {
            return;
        }

        $letterIds = collect();

        if (Schema::hasColumn('letters', 'signature_status')) {
            $letterIds = $letterIds->merge(
                DB::table('letters')->where('signature_status', 'rejected')->pluck('id')
            );
        }

        if (Schema::hasTable('letter_signature_requests')) {
            $letterIds = $letterIds->merge(
                DB::table('letter_signature_requests')->where('status', 'rejected')->pluck('letter_id')
            );
        }

        if (Schema::hasTable('letter_document_versions')) {
            $letterIds = $letterIds->merge(
                DB::table('letter_document_versions')
                    ->where('status', 'rejected')
                    ->orWhereNotNull('rejection_note')
                    ->orWhereNotNull('rejected_at')
                    ->pluck('letter_id')
            );
        }

        $letterIds = $letterIds->filter()->unique()->values();

        if ($letterIds->isNotEmpty()) {
            $this->deleteFilesForLetters($letterIds);

            DB::table('letters')
                ->whereIn('id', $letterIds)
                ->delete();
        }

        if (Schema::hasTable('letter_signature_requests') && Schema::hasColumn('letter_signature_requests', 'note')) {
            DB::table('letter_signature_requests')->update(['note' => null]);
        }
    }

    public function down(): void
    {
        // Data cleanup is intentionally irreversible.
    }

    private function deleteFilesForLetters($letterIds): void
    {
        $paths = collect();

        $paths = $paths->merge(
            DB::table('letters')
                ->whereIn('id', $letterIds)
                ->pluck('signed_pdf_path')
        );

        if (Schema::hasTable('letter_attachments')) {
            $paths = $paths->merge(
                DB::table('letter_attachments')
                    ->whereIn('letter_id', $letterIds)
                    ->pluck('file_path')
            );
        }

        if (Schema::hasTable('letter_document_versions')) {
            $paths = $paths
                ->merge(DB::table('letter_document_versions')->whereIn('letter_id', $letterIds)->pluck('source_pdf_path'))
                ->merge(DB::table('letter_document_versions')->whereIn('letter_id', $letterIds)->pluck('signed_pdf_path'));
        }

        if (Schema::hasTable('letter_signature_requests') && Schema::hasColumn('letter_signature_requests', 'qr_file_path')) {
            $paths = $paths->merge(
                DB::table('letter_signature_requests')
                    ->whereIn('letter_id', $letterIds)
                    ->pluck('qr_file_path')
            );
        }

        $paths
            ->filter()
            ->unique()
            ->each(fn (string $path) => Storage::disk('public')->delete($path));
    }
};
