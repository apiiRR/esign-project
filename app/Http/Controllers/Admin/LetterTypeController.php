<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LetterType;
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
                ->when(request()->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
                ->when(request()->filled('statuses'), fn ($query) => $query->whereIn('status', (array) request()->statuses))
                ->latest()
                ->paginate(10)
                ->withQueryString(),
            'filterOptions' => [
                'statuses' => collect([
                    ['id' => 'active', 'name' => 'Aktif'],
                    ['id' => 'inactive', 'name' => 'Nonaktif'],
                ]),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:letter_types,name',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        LetterType::query()->create($validated);

        return back()->with('success', 'Jenis surat berhasil dibuat.');
    }

    public function update(Request $request, LetterType $letter_type)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:letter_types,name,' . $letter_type->id,
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $letter_type->update($validated);

        return back()->with('success', 'Jenis surat berhasil diperbarui.');
    }

    public function destroy(LetterType $letter_type)
    {
        $letter_type->delete();

        return back()->with('success', 'Jenis surat berhasil dihapus.');
    }

}
