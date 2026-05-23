<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LetterType;
use App\Services\LetterNumberGenerator;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class LetterTypeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:letter-types.index'], only: ['index']),
            new Middleware(['permission:letter-types.create'], only: ['store']),
            new Middleware(['permission:letter-types.edit'], only: ['update']),
            new Middleware(['permission:letter-types.delete'], only: ['destroy']),
        ];
    }

    public function index()
    {
        return inertia('Admin/LetterTypes/Index', [
            'letterTypes' => LetterType::query()
                ->when(request()->q, fn ($query, $search) => $query->where(fn ($letterType) => $letterType
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                ))
                ->when(request()->filled('statuses'), fn ($query) => $query->whereIn('status', (array) request()->statuses))
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'filterOptions' => [
                'statuses' => collect([
                    ['id' => 'active', 'name' => 'Aktif'],
                    ['id' => 'inactive', 'name' => 'Nonaktif'],
                ]),
                'contexts' => $this->numberingContextOptions(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:letter_types,name',
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'numbering_enabled' => 'nullable|boolean',
            'numbering_contexts' => 'nullable|array',
            'numbering_contexts.*' => 'in:incoming_external,internal,outgoing,archive',
            'numbering_format' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        LetterType::query()->create($this->normalizeNumberingPayload($validated));

        return back()->with('success', 'Jenis surat berhasil dibuat.');
    }

    public function update(Request $request, LetterType $letter_type)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:letter_types,name,' . $letter_type->id,
            'code' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'numbering_enabled' => 'nullable|boolean',
            'numbering_contexts' => 'nullable|array',
            'numbering_contexts.*' => 'in:incoming_external,internal,outgoing,archive',
            'numbering_format' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $letter_type->update($this->normalizeNumberingPayload($validated));

        return back()->with('success', 'Jenis surat berhasil diperbarui.');
    }

    public function destroy(LetterType $letter_type)
    {
        $letter_type->delete();

        return back()->with('success', 'Jenis surat berhasil dihapus.');
    }

    private function normalizeNumberingPayload(array $validated): array
    {
        $validated['numbering_enabled'] = (bool) ($validated['numbering_enabled'] ?? false);
        $validated['numbering_contexts'] = array_values($validated['numbering_contexts'] ?? []);
        $validated['numbering_format'] = ($validated['numbering_format'] ?? null) ?: LetterNumberGenerator::DEFAULT_FORMAT;

        return $validated;
    }

    private function numberingContextOptions(): array
    {
        return [
            ['id' => 'incoming_external', 'name' => 'Surat Masuk Eksternal'],
            ['id' => 'internal', 'name' => 'Surat Internal'],
            ['id' => 'outgoing', 'name' => 'Surat Keluar'],
            ['id' => 'archive', 'name' => 'Arsip Scan'],
        ];
    }
}
