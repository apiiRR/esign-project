<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OrganizationController extends Controller
{
    public function index(Request $request, string $type)
    {
        $directorates = Directorate::with('divisions.departments')
            ->when($request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $request->statuses))
            ->orderBy('name')
            ->get();
        $divisions = Division::with('directorate')
            ->when($request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $request->statuses))
            ->when($request->filled('directorate_ids'), fn ($query) => $query->whereIn('directorate_id', (array) $request->directorate_ids))
            ->orderBy('name')
            ->get();
        $departments = Department::with('division.directorate')
            ->when($request->q, fn ($query, $search) => $query->where('name', 'like', "%{$search}%"))
            ->when($request->filled('statuses'), fn ($query) => $query->whereIn('status', (array) $request->statuses))
            ->when($request->filled('division_ids'), fn ($query) => $query->whereIn('division_id', (array) $request->division_ids))
            ->orderBy('name')
            ->get();

        return inertia('Admin/Organization/Index', [
            'type' => $type,
            'directorates' => $type === 'directorates' ? $directorates : Directorate::with('divisions.departments')->orderBy('name')->get(),
            'divisions' => $type === 'divisions' ? $divisions : Division::with('directorate')->orderBy('name')->get(),
            'departments' => $type === 'departments' ? $departments : Department::with('division.directorate')->orderBy('name')->get(),
            'users' => User::select('id', 'name', 'username', 'position')->orderBy('name')->get(),
            'filterOptions' => [
                'statuses' => collect([
                    ['id' => 'active', 'name' => 'Aktif'],
                    ['id' => 'inactive', 'name' => 'Nonaktif'],
                ]),
                'directorates' => Directorate::select('id', 'name')->orderBy('name')->get(),
                'divisions' => Division::select('id', 'name')->orderBy('name')->get(),
            ],
        ]);
    }

    public function store(Request $request, string $type)
    {
        $validated = $this->validatePayload($request, $type);

        match ($type) {
            'directorates' => Directorate::create([
                'name' => $validated['name'],
                'code' => $this->uniqueCode(Directorate::class, $validated['name']),
                'director_user_id' => $validated['director_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            'divisions' => Division::create([
                'directorate_id' => $validated['directorate_id'],
                'name' => $validated['name'],
                'code' => $this->uniqueCode(Division::class, $validated['name']),
                'gm_user_id' => $validated['gm_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            'departments' => Department::create([
                'division_id' => $validated['division_id'],
                'name' => $validated['name'],
                'code' => $this->uniqueCode(Department::class, $validated['name']),
                'manager_user_id' => $validated['manager_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            default => abort(404),
        };

        return back()->with('success', 'Data organisasi berhasil disimpan.');
    }

    public function update(Request $request, string $type, int $id)
    {
        $validated = $this->validatePayload($request, $type);

        match ($type) {
            'directorates' => Directorate::findOrFail($id)->update([
                'name' => $validated['name'],
                'director_user_id' => $validated['director_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            'divisions' => Division::findOrFail($id)->update([
                'directorate_id' => $validated['directorate_id'],
                'name' => $validated['name'],
                'gm_user_id' => $validated['gm_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            'departments' => Department::findOrFail($id)->update([
                'division_id' => $validated['division_id'],
                'name' => $validated['name'],
                'manager_user_id' => $validated['manager_user_id'] ?? null,
                'status' => $validated['status'],
            ]),
            default => abort(404),
        };

        return back()->with('success', 'Data organisasi berhasil diperbarui.');
    }

    public function destroy(string $type, int $id)
    {
        match ($type) {
            'directorates' => Directorate::findOrFail($id)->delete(),
            'divisions' => Division::findOrFail($id)->delete(),
            'departments' => Department::findOrFail($id)->delete(),
            default => abort(404),
        };

        return back()->with('success', 'Data organisasi berhasil dihapus.');
    }

    private function validatePayload(Request $request, string $type): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'status' => ['required', 'in:active,inactive'],
        ];

        if ($type === 'directorates') {
            $rules['director_user_id'] = ['nullable', 'exists:users,id'];
        } elseif ($type === 'divisions') {
            $rules['directorate_id'] = ['required', 'exists:directorates,id'];
            $rules['gm_user_id'] = ['nullable', 'exists:users,id'];
        } elseif ($type === 'departments') {
            $rules['division_id'] = ['required', 'exists:divisions,id'];
            $rules['manager_user_id'] = ['nullable', 'exists:users,id'];
        } else {
            abort(404);
        }

        return $request->validate($rules);
    }

    private function uniqueCode(string $model, string $name): string
    {
        $base = Str::upper(Str::slug($name, '-')) ?: 'UNIT';
        $code = $base;
        $counter = 2;

        while ($model::where('code', $code)->exists()) {
            $code = "{$base}-{$counter}";
            $counter++;
        }

        return $code;
    }
}
