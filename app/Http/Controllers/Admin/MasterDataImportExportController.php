<?php

namespace App\Http\Controllers\Admin;

use App\Exports\MasterDataExport;
use App\Http\Controllers\Controller;
use App\Imports\MasterDataImport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Excel as ExcelWriter;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MasterDataImportExportController extends Controller
{
    private const TYPES = ['directorates', 'divisions', 'departments', 'users'];

    public function export(Request $request, string $type): BinaryFileResponse
    {
        $this->assertType($type);
        $format = $request->query('format', 'xlsx') === 'csv' ? 'csv' : 'xlsx';
        $writer = $format === 'csv' ? ExcelWriter::CSV : ExcelWriter::XLSX;

        return Excel::download(
            new MasterDataExport($type, $request),
            "master-{$type}." . $format,
            $writer
        );
    }

    public function template(Request $request, string $type): BinaryFileResponse
    {
        $this->assertType($type);

        return Excel::download(
            new MasterDataExport($type, $request, true),
            "template-import-{$type}.xlsx",
            ExcelWriter::XLSX
        );
    }

    public function import(Request $request, string $type): RedirectResponse
    {
        $this->assertType($type);

        $validated = $request->validate([
            'import_file' => ['required', 'file', 'mimes:xlsx,xls,csv,txt', 'max:5120'],
        ]);

        $import = new MasterDataImport($type);

        DB::transaction(function () use ($import, $validated) {
            Excel::import($import, $validated['import_file']);
        });

        return back()->with('success', "Import berhasil. Dibuat: {$import->created}, diperbarui: {$import->updated}.");
    }

    private function assertType(string $type): void
    {
        abort_unless(in_array($type, self::TYPES, true), 404);
    }
}
