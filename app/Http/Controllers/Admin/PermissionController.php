<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\AuditTrailService;
use Illuminate\Http\RedirectResponse;
use Spatie\Permission\Models\Permission;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;

class PermissionController extends Controller implements HasMiddleware
{
    /**
     * middleware
     *
     * @return array
     */
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:permissions.index'], only: ['index']),
            new Middleware(['permission:permissions.create'], only: ['create', 'store']),
            new Middleware(['permission:permissions.edit'], only: ['edit', 'update']),
            new Middleware(['permission:permissions.delete'], only: ['destroy']),
        ];
    }

    /**
     * index
     *
     * @return Response
     */
    public function index(): Response
    {
        $permissions = Permission::query()
            ->when(request()->q, function ($permissions) {
                $permissions->where('name', 'like', '%' . request()->q . '%');
            })
            ->latest()
            ->paginate(5);

        $permissions->appends(['q' => request()->q]);

        return Inertia::render('Admin/Permissions/Index', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * create
     *
     * @return Response
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Permissions/Create');
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
            'name' => 'required|unique:permissions,name',
        ]);

        $permission = Permission::create([
            'name' => $request->name,
        ]);
        app(AuditTrailService::class)->log($request, $request->user(), 'permission', 'created', 'Membuat permission.', $permission, [
            'permission' => $permission->name,
        ]);

        return redirect()
            ->route('admin.permissions.index')
            ->with('success', 'Permission created successfully.');
    }

    /**
     * edit
     *
     * @param  Permission $permission
     * @return Response
     */
    public function edit(Permission $permission): Response
    {
        return Inertia::render('Admin/Permissions/Edit', [
            'permission' => $permission,
        ]);
    }

    /**
     * update
     *
     * @param  Request $request
     * @param  Permission $permission
     * @return RedirectResponse
     */
    public function update(Request $request, Permission $permission): RedirectResponse
    {
        $request->validate([
            'name' => 'required|unique:permissions,name,' . $permission->id,
        ]);

        $permission->update([
            'name' => $request->name,
        ]);
        app(AuditTrailService::class)->log($request, $request->user(), 'permission', 'updated', 'Mengubah permission.', $permission, [
            'permission' => $permission->name,
        ]);

        return redirect()
            ->route('admin.permissions.index')
            ->with('success', 'Permission updated successfully.');
    }

    /**
     * destroy
     *
     * @param  Permission $permission
     * @return RedirectResponse
     */
    public function destroy(Permission $permission): RedirectResponse
    {
        app(AuditTrailService::class)->log(request(), request()->user(), 'permission', 'deleted', 'Menghapus permission.', $permission, [
            'permission' => $permission->name,
        ]);
        $permission->delete();

        return redirect()
            ->route('admin.permissions.index')
            ->with('success', 'Permission deleted successfully.');
    }
}
