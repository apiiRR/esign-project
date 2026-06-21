<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Letter;
use App\Models\User;

class DashboardController extends Controller
{
    public function index()
    {
        return inertia('Admin/Dashboard/Index', [
            'stats' => [
                'documents_total' => Letter::where('type', 'internal')->count(),
                'users_total' => User::count(),
            ],
            'documents' => Letter::with(['creator:id,name,username'])
                ->where('type', 'internal')
                ->latest()
                ->limit(10)
                ->get(),
            'users' => User::with('roles:id,name')
                ->latest()
                ->limit(10)
                ->get(['id', 'name', 'email', 'username', 'role', 'position', 'status', 'created_at']),
        ]);
    }
}
