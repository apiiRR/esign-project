<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\NotificationLog;
use App\Models\User;

class NotificationController extends Controller
{
    public function index()
    {
        return inertia('Admin/Notifications/Index', [
            'notifications' => NotificationLog::with(['user:id,name,username', 'letter:id,reference,letter_number,subject'])
                ->when(request()->q, fn ($query, $search) => $query->where(fn ($q) => $q
                    ->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                ))
                ->when(request()->filled('channels'), fn ($query) => $query->whereIn('channel', (array) request()->channels))
                ->when(request()->filled('user_ids'), fn ($query) => $query->whereIn('user_id', (array) request()->user_ids))
                ->when(request()->filled('read_statuses'), function ($query) {
                    $statuses = (array) request()->read_statuses;
                    $query->where(function ($q) use ($statuses) {
                        if (in_array('read', $statuses, true)) {
                            $q->orWhereNotNull('read_at');
                        }
                        if (in_array('unread', $statuses, true)) {
                            $q->orWhereNull('read_at');
                        }
                    });
                })
                ->latest()
                ->paginate(15)
                ->withQueryString(),
            'filterOptions' => [
                'channels' => NotificationLog::query()->select('channel')->distinct()->orderBy('channel')->get()->map(fn ($row) => ['id' => $row->channel, 'name' => $row->channel]),
                'readStatuses' => collect([
                    ['id' => 'read', 'name' => 'Dibaca'],
                    ['id' => 'unread', 'name' => 'Belum dibaca'],
                ]),
                'users' => User::query()->orderBy('name')->get(['id', 'name']),
            ],
        ]);
    }
}
