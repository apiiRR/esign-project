<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\User;

class AuditTrailController extends Controller
{
    public function index()
    {
        return inertia('Admin/AuditTrail/Index', [
            'audits' => AuditTrail::with('user:id,name,username')
                ->when(request()->q, fn ($query, $search) => $query->where('action', 'like', "%{$search}%"))
                ->when(request()->filled('actions'), fn ($query) => $query->whereIn('action', (array) request()->actions))
                ->when(request()->filled('user_ids'), fn ($query) => $query->whereIn('user_id', (array) request()->user_ids))
                ->latest()
                ->paginate(15)
                ->withQueryString(),
            'filterOptions' => [
                'actions' => AuditTrail::query()->select('action')->distinct()->orderBy('action')->get()->map(fn ($row) => ['id' => $row->action, 'name' => $row->action]),
                'users' => User::query()->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }
}
