<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Support\Str;

class AuditTrailController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:audit-trails.index'], only: ['index']),
        ];
    }

    public function index(Request $request): Response
    {
        $trails = AuditTrail::query()
            ->with('user:id,name,email,username,position')
            ->when($request->filled('category'), fn ($query) => $query->where('category', $request->category))
            ->when($request->filled('user_id'), fn ($query) => $query->where('user_id', $request->user_id))
            ->when($request->filled('date_from'), fn ($query) => $query->whereDate('created_at', '>=', $request->date_from))
            ->when($request->filled('date_to'), fn ($query) => $query->whereDate('created_at', '<=', $request->date_to))
            ->latest('created_at')
            ->paginate(15)
            ->through(fn (AuditTrail $trail) => $this->sanitizeTrail($trail))
            ->withQueryString();

        return Inertia::render('Admin/AuditTrails/Index', [
            'auditTrails' => $trails,
            'filters' => $request->only(['category', 'user_id', 'date_from', 'date_to']),
            'filterOptions' => [
                'categories' => AuditTrail::query()->select('category')->distinct()->orderBy('category')->pluck('category'),
                'users' => User::query()->orderBy('name')->get(['id', 'name', 'email', 'username']),
            ],
        ]);
    }

    private function sanitizeTrail(AuditTrail $trail): array
    {
        $data = $trail->toArray();
        $data['metadata'] = $this->sanitizeMetadata($data['metadata'] ?? null);

        return $data;
    }

    private function sanitizeMetadata(mixed $metadata): mixed
    {
        if (! is_array($metadata)) {
            return is_string($metadata) ? $this->redactBdk($metadata) : $metadata;
        }

        $sanitized = [];
        foreach ($metadata as $key => $value) {
            if (in_array($key, ['file_path', 'source_pdf_path', 'signed_pdf_path', 'qr_file_path'], true)) {
                continue;
            }

            $sanitized[$key] = $this->sanitizeMetadata($value);
        }

        return $sanitized ?: null;
    }

    private function redactBdk(string $value): string
    {
        $legacyPrefix = 'B' . 'DK';

        return Str::replaceMatches('/' . $legacyPrefix . '-[A-Z]+-[A-Z0-9-]+/i', '[redacted]', $value);
    }
}
