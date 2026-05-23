<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Division;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;

class UserController extends Controller implements HasMiddleware
{
    /**
     * middleware
     *
     * @return array
     */
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:users.index'], only: ['index']),
            new Middleware(['permission:users.create'], only: ['create', 'store']),
            new Middleware(['permission:users.edit'], only: ['edit', 'update']),
            new Middleware(['permission:users.delete'], only: ['destroy']),
        ];
    }

    /**
     * index
     *
     * @return Response
     */
    public function index(): Response
    {
        $users = User::query()
            ->with(['roles:id,name', 'directorate:id,name', 'division:id,name', 'department:id,name'])
            ->when(request()->q, function ($users) {
                $users->where(function ($q) {
                    $q->where('name', 'like', '%' . request()->q . '%')
                      ->orWhere('username', 'like', '%' . request()->q . '%')
                      ->orWhere('email', 'like', '%' . request()->q . '%');
                });
            })
            ->when(request()->filled('roles'), fn ($query) => $query->whereIn('role', (array) request()->roles))
            ->when(request()->filled('statuses'), fn ($query) => $query->whereIn('status', (array) request()->statuses))
            ->when(request()->filled('directorate_ids'), fn ($query) => $query->whereIn('directorate_id', (array) request()->directorate_ids))
            ->when(request()->filled('division_ids'), fn ($query) => $query->whereIn('division_id', (array) request()->division_ids))
            ->when(request()->filled('department_ids'), fn ($query) => $query->whereIn('department_id', (array) request()->department_ids))
            ->latest()
            ->paginate(5);

        $users->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filterOptions' => [
                'roles' => collect(['admin', 'pegawai'])->map(fn ($role) => ['id' => $role, 'name' => $role])->values(),
                'statuses' => collect([['id' => 'active', 'name' => 'Aktif'], ['id' => 'inactive', 'name' => 'Nonaktif']]),
                'directorates' => Directorate::select('id', 'name')->orderBy('name')->get(),
                'divisions' => Division::select('id', 'name')->orderBy('name')->get(),
                'departments' => Department::select('id', 'name')->orderBy('name')->get(),
            ],
        ]);
    }

    /**
     * create
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Users/Create', [
            ...$this->formOptions(),
        ]);
    }

    /**
     * store
     *
     * @param  Request $request
     * @return RedirectResponse
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'username' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,username'],
            'name'     => 'required|string|max:255',
            'email'    => 'nullable|email|unique:users,email',
            'password' => 'required|min:8',
            'roles'    => 'required|array',
            'roles.*'  => 'exists:roles,id',
            'directorate_id' => 'nullable|exists:directorates,id',
            'division_id' => 'nullable|exists:divisions,id',
            'department_id' => 'nullable|exists:departments,id',
            'position' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);
        $this->validateOfficerUnit($request);

        $roleName = Role::whereIn('id', $request->roles)->pluck('name')->first() ?: 'pegawai';

        $user = User::create([
            'username' => $request->username,
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role' => $roleName === 'admin' ? 'admin' : 'pegawai',
            'directorate_id' => $request->directorate_id,
            'division_id' => $request->division_id,
            'department_id' => $request->department_id,
            'position' => $request->position,
            'status' => $request->status,
        ]);

        // assign role
        $user->syncRoles($request->roles);
        $this->syncOrganizationOfficer($user);

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User created successfully.');
    }

    /**
     * edit
     *
     * @param  User $user
     * @return Response
     */
    public function edit(User $user): Response
    {
        $user->load('roles');

        return Inertia::render('Admin/Users/Edit', [
            'user' => $user,
            ...$this->formOptions(),
            'userRoles' => $user->roles->pluck('id'),
        ]);
    }

    /**
     * update
     *
     * @param  Request $request
     * @param  User $user
     * @return RedirectResponse
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'username' => ['required', 'string', 'max:100', 'regex:/^[A-Za-z0-9._-]+$/', 'unique:users,username,' . $user->id],
            'name'     => 'required|string|max:255',
            'email'    => 'nullable|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:8',
            'roles'    => 'required|array',
            'roles.*'  => 'exists:roles,id',
            'directorate_id' => 'nullable|exists:directorates,id',
            'division_id' => 'nullable|exists:divisions,id',
            'department_id' => 'nullable|exists:departments,id',
            'position' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);
        $this->validateOfficerUnit($request);

        $roleName = Role::whereIn('id', $request->roles)->pluck('name')->first() ?: 'pegawai';

        $user->update([
            'username' => $request->username,
            'name'  => $request->name,
            'email' => $request->email,
            'role' => $roleName === 'admin' ? 'admin' : 'pegawai',
            'directorate_id' => $request->directorate_id,
            'division_id' => $request->division_id,
            'department_id' => $request->department_id,
            'position' => $request->position,
            'status' => $request->status,
        ]);

        // update password jika diisi
        if ($request->password) {
            $user->update([
                'password' => Hash::make($request->password),
            ]);
        }

        // sync role
        $user->syncRoles($request->roles);
        $this->syncOrganizationOfficer($user);

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User updated successfully.');
    }

    /**
     * destroy
     *
     * @param  User $user
     * @return RedirectResponse
     */
    public function destroy(User $user): RedirectResponse
    {
        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    private function formOptions(): array
    {
        return [
            'roles' => Role::select('id','name')->whereIn('name', ['admin', 'pegawai'])->orderBy('name')->get(),
            'directorates' => Directorate::select('id', 'name')->orderBy('name')->get(),
            'divisions' => Division::select('id', 'name', 'directorate_id')->orderBy('name')->get(),
            'departments' => Department::select('id', 'name', 'division_id')->orderBy('name')->get(),
        ];
    }

    private function validateOfficerUnit(Request $request): void
    {
        if ($request->position === 'Direktur' && ! $request->directorate_id) {
            abort(422, 'Direktur wajib memiliki direktorat.');
        }

        if ($request->position === 'General Manager' && ! $request->division_id) {
            abort(422, 'General Manager wajib memiliki divisi.');
        }

        if ($request->position === 'Manager' && ! $request->department_id) {
            abort(422, 'Manager wajib memiliki department.');
        }
    }

    private function syncOrganizationOfficer(User $user): void
    {
        Directorate::where('director_user_id', $user->id)->update(['director_user_id' => null]);
        Division::where('gm_user_id', $user->id)->update(['gm_user_id' => null]);
        Department::where('manager_user_id', $user->id)->update(['manager_user_id' => null]);

        match ($user->position) {
            'Direktur' => $user->directorate_id
                ? Directorate::whereKey($user->directorate_id)->update(['director_user_id' => $user->id])
                : null,
            'General Manager' => $user->division_id
                ? Division::whereKey($user->division_id)->update(['gm_user_id' => $user->id])
                : null,
            'Manager' => $user->department_id
                ? Department::whereKey($user->department_id)->update(['manager_user_id' => $user->id])
                : null,
            default => null,
        };
    }
}
