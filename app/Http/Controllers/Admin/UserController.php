<?php

namespace App\Http\Controllers\Admin;

use App\Models\User;
use App\Services\AuditTrailService;
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
            ->with(['roles:id,name'])
            ->when(request()->q, function ($users) {
                $users->where(function ($q) {
                    $q->where('name', 'like', '%' . request()->q . '%')
                      ->orWhere('username', 'like', '%' . request()->q . '%')
                      ->orWhere('email', 'like', '%' . request()->q . '%');
                });
            })
            ->when(request()->filled('roles'), fn ($query) => $query->whereHas('roles', fn ($role) => $role->whereIn('name', (array) request()->roles)))
            ->when(request()->filled('statuses'), fn ($query) => $query->whereIn('status', (array) request()->statuses))
            ->latest()
            ->paginate(5);

        $users->withQueryString();

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filterOptions' => [
                'roles' => Role::select('name as id', 'name')->orderBy('name')->get(),
                'statuses' => collect([['id' => 'active', 'name' => 'Aktif'], ['id' => 'inactive', 'name' => 'Nonaktif']]),
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
            'position' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $roleName = Role::whereIn('id', $request->roles)->orderBy('name')->value('name') ?: 'user';

        $user = User::create([
            'username' => $request->username,
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role' => $roleName,
            'position' => $request->position,
            'status' => $request->status,
        ]);

        // assign role
        $user->syncRoles($request->roles);
        app(AuditTrailService::class)->log($request, $request->user(), 'user', 'created', 'Membuat user baru.', $user, [
            'target_user' => $user->only(['id', 'username', 'email', 'role', 'status']),
        ]);

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
            'position' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $roleName = Role::whereIn('id', $request->roles)->orderBy('name')->value('name') ?: 'user';

        $user->update([
            'username' => $request->username,
            'name'  => $request->name,
            'email' => $request->email,
            'role' => $roleName,
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
        app(AuditTrailService::class)->log($request, $request->user(), 'user', 'updated', 'Mengubah data user.', $user, [
            'target_user' => $user->only(['id', 'username', 'email', 'role', 'status']),
        ]);

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
        app(AuditTrailService::class)->log(request(), request()->user(), 'user', 'deleted', 'Menghapus user.', $user, [
            'target_user' => $user->only(['id', 'username', 'email', 'role', 'status']),
        ]);
        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'User deleted successfully.');
    }

    private function formOptions(): array
    {
        return [
            'roles' => Role::select('id','name')->orderBy('name')->get(),
        ];
    }
}
