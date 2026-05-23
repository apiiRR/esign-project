<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;

class RoleController extends Controller implements HasMiddleware
{
    /**
     * middleware
     *
     * @return array
     */
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:roles.index'], only: ['index']),
            new Middleware(['permission:roles.create'], only: ['create', 'store']),
            new Middleware(['permission:roles.edit'], only: ['edit', 'update']),
            new Middleware(['permission:roles.delete'], only: ['destroy']),
        ];
    }

    /**
     * index
     *
     * @return Response
     */
    public function index(): Response
    {
        $roles = Role::query()
            ->when(request()->q, function ($roles) {
                $roles->where('name', 'like', '%' . request()->q . '%');
            })
            ->withCount('permissions')
            ->latest()
            ->paginate(5);

        $roles->appends(['q' => request()->q]);

        return Inertia::render('Admin/Roles/Index', [
            'roles' => $roles,
        ]);
    }

    /**
     * create
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Roles/Create', [
            'permissions' => Permission::select('id', 'name')->orderBy('name')->get(),
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
            'name' => 'required|in:admin,pegawai|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        // create role
        $role = Role::create([
            'name' => $request->name,
        ]);

        // assign permissions
        if ($request->permissions) {
            $role->syncPermissions($request->permissions);
        }

        return redirect()
            ->route('admin.roles.index')
            ->with('success', 'Role created successfully.');
    }

    /**
     * edit
     *
     * @param  Role $role
     * @return Response
     */
    public function edit(Role $role): Response
    {
        $role->load('permissions');

        return Inertia::render('Admin/Roles/Edit', [
            'role' => $role,
            'permissions' => Permission::select('id', 'name')->orderBy('name')->get(),
            'rolePermissions' => $role->permissions->pluck('id'),
        ]);
    }

    /**
     * update
     *
     * @param  Request $request
     * @param  Role $role
     * @return RedirectResponse
     */
    public function update(Request $request, Role $role): RedirectResponse
    {
        $request->validate([
            'name' => 'required|in:admin,pegawai|unique:roles,name,' . $role->id,
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        // update role
        $role->update([
            'name' => $request->name,
        ]);

        // sync permissions
        $role->syncPermissions($request->permissions ?? []);

        return redirect()
            ->route('admin.roles.index')
            ->with('success', 'Role updated successfully.');
    }

    /**
     * destroy
     *
     * @param  Role $role
     * @return RedirectResponse
     */
    public function destroy(Role $role): RedirectResponse
    {
        if (in_array($role->name, ['admin', 'pegawai'], true)) {
            return back()->with('error', 'Role admin dan pegawai tidak dapat dihapus.');
        }

        $role->delete();

        return redirect()
            ->route('admin.roles.index')
            ->with('success', 'Role deleted successfully.');
    }
}
