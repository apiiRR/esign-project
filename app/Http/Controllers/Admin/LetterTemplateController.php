<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use App\Models\LetterTemplate;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;

class LetterTemplateController extends Controller implements HasMiddleware
{
    /**
     * Middleware permission
     */
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:letter-templates.index'], only: ['index']),
            new Middleware(['permission:letter-templates.create'], only: ['create', 'store']),
            new Middleware(['permission:letter-templates.edit'], only: ['edit', 'update']),
            new Middleware(['permission:letter-templates.delete'], only: ['destroy']),
        ];
    }

    /**
     * List template surat
     */
    public function index(): Response
    {
        $templates = LetterTemplate::query()
            ->when(request()->q, fn ($q) =>
                $q->where('name', 'like', '%' . request()->q . '%')
            )
            ->when(request()->filled('categories'), fn ($query) => $query->whereIn('category', (array) request()->categories))
            ->when(request()->filled('statuses'), fn ($query) => $query->whereIn('status', (array) request()->statuses))
            ->latest()
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('Admin/LetterTemplates/Index', [
            'templates' => $templates,
            'filterOptions' => [
                'categories' => collect([
                    ['id' => 'internal', 'name' => 'Internal'],
                    ['id' => 'outgoing', 'name' => 'Keluar'],
                    ['id' => 'both', 'name' => 'Internal & Keluar'],
                ]),
                'statuses' => collect([
                    ['id' => 'active', 'name' => 'Aktif'],
                    ['id' => 'inactive', 'name' => 'Nonaktif'],
                ]),
            ],
        ]);
    }

    /**
     * Form create template
     */
    public function create(): Response
    {
        return Inertia::render('Admin/LetterTemplates/Create', [
            'template' => [
                'id'                => null,
                'image'             => null,
                'name'              => '',
                'description'       => '',
                'category'          => 'both',
                'status'            => 'active',
                'content_template'  => '',
                'extra_fields'       => [],
            ],
        ]);
    }

    /**
     * Simpan template baru
     */
    public function store(Request $request): RedirectResponse
    {
        // validate data
        $request->validate([
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'category'          => 'required|in:internal,outgoing,both',
            'status'            => 'required|in:active,inactive',
            'content_template'  => 'required|string',

            // extra fields (input tambahan)
            'extra_fields'              => 'nullable|array',
            'extra_fields.*.key'        => 'required|string',
            'extra_fields.*.label'      => 'required|string',
            'extra_fields.*.type'       => 'required|in:text,textarea,date,number',
            'extra_fields.*.required'   => 'boolean',
        ]);

        // insert  data ke database
        LetterTemplate::create([
            'name'              => $request->name,
            'slug'              => Str::slug($request->name),
            'description'       => $request->description ?? null,
            'category'          => $request->category,
            'status'            => $request->status,
            'content_template'  => $request->content_template,
            'extra_fields'       => $request->extra_fields ?? [],
        ]);

        // redirect
        return redirect()
            ->route('admin.letter-templates.index')
            ->with('success', 'Template surat berhasil dibuat');
    }

    /**
     * Form edit template
     */
    public function edit(LetterTemplate $letter_template): Response
    {
        return Inertia::render('Admin/LetterTemplates/Edit', [
            'template' => $letter_template,
        ]);
    }

    /**
     * Update template
     */
    public function update(Request $request, LetterTemplate $letter_template): RedirectResponse
    {
        $validated = $request->validate([
            'name'              => 'required|string|max:255',
            'description'       => 'nullable|string',
            'category'          => 'required|in:internal,outgoing,both',
            'status'            => 'required|in:active,inactive',
            'content_template'  => 'required|string',

            'extra_fields'              => 'nullable|array',
            'extra_fields.*.key'        => 'required|string',
            'extra_fields.*.label'      => 'required|string',
            'extra_fields.*.type'       => 'required|in:text,textarea,date,number',
            'extra_fields.*.required'   => 'boolean',
        ]);

        // update data ke database
        $letter_template->update([
            'name'                  => $request->name,
            'slug'                  => Str::slug($request->name),
            'description'           => $request->description ?? null,
            'category'              => $request->category,
            'status'                => $request->status,
            'content_template'      => $request->content_template,
            'extra_fields'           => $request->extra_fields ?? [],
        ]);

        // redirect
        return redirect()
            ->route('admin.letter-templates.index')
            ->with('success', 'Template surat berhasil diperbarui');
    }

    /**
     * Hapus template
     */
    public function destroy(LetterTemplate $letter_template): RedirectResponse
    {
        // hapus data
        $letter_template->delete();

        return redirect()
            ->route('admin.letter-templates.index')
            ->with('success', 'Template surat berhasil dihapus');
    }
}
