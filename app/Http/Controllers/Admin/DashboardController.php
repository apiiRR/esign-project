<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Department;
use App\Models\Directorate;
use App\Models\Disposition;
use App\Models\Division;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\NotificationLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $statusCounts = Letter::query()
            ->select('status', DB::raw('count(*) as total'))
            ->groupBy('status')
            ->pluck('total', 'status');

        $typeCounts = Letter::query()
            ->select('type', DB::raw('count(*) as total'))
            ->groupBy('type')
            ->pluck('total', 'type');

        $monthly = collect(range(5, 0))->map(function ($offset) {
            $date = Carbon::now()->subMonths($offset);

            return [
                'month' => $date->format('M'),
                'incoming' => Letter::where('type', 'incoming_external')->whereBetween('created_at', [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()])->count(),
                'outgoing' => Letter::where('type', 'outgoing')->whereBetween('created_at', [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()])->count(),
                'internal' => Letter::where('type', 'internal')->whereBetween('created_at', [$date->copy()->startOfMonth(), $date->copy()->endOfMonth()])->count(),
            ];
        });

        return inertia('Admin/Dashboard/Index', [
            'stats' => [
                'incoming_external' => (int) ($typeCounts['incoming_external'] ?? 0),
                'outgoing' => (int) ($typeCounts['outgoing'] ?? 0),
                'internal' => (int) ($typeCounts['internal'] ?? 0),
                'active_dispositions' => Disposition::where('status', 'open')->count(),
                'users' => User::count(),
                'templates' => LetterTemplate::count(),
                'archived_scans' => Letter::where('creation_method', 'scan')->where('status', 'archived')->count(),
                'organization_units' => Directorate::count() + Division::count() + Department::count(),
                'unread_notifications' => NotificationLog::whereNull('read_at')->count(),
            ],
            'recentLetters' => Letter::with(['creator:id,name,username', 'template:id,name'])
                ->latest()
                ->limit(6)
                ->get(),
            'recentAudits' => AuditTrail::with('user:id,name,username')
                ->latest()
                ->limit(6)
                ->get(),
            'chartData' => [
                'status' => $statusCounts,
                'type' => $typeCounts,
                'monthly' => $monthly,
            ],
        ]);
    }
}
