<?php

namespace App\Services;

use App\Models\AuditTrail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Throwable;

class AuditLogger
{
    public function log(string $action, ?Request $request = null, array $meta = [], ?int $userId = null, ?string $auditableType = null, ?int $auditableId = null): void
    {
        try {
            AuditTrail::query()->create([
                'user_id' => $userId ?? Auth::id(),
                'action' => $action,
                'auditable_type' => $auditableType,
                'auditable_id' => $auditableId,
                'meta' => array_filter([
                    ...$this->requestMeta($request),
                    ...$meta,
                ], fn ($value) => $value !== null),
            ]);
        } catch (Throwable) {
            // Audit must never break the user-facing request.
        }
    }

    public function logException(Throwable $exception, ?Request $request = null): void
    {
        $this->log('system.error', $request, [
            'exception' => class_basename($exception),
            'message' => Str::limit($exception->getMessage(), 500),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
        ]);
    }

    private function requestMeta(?Request $request): array
    {
        if (! $request) {
            return [];
        }

        return [
            'route' => $request->route()?->getName(),
            'url' => $request->fullUrl(),
            'path' => $request->path(),
            'method' => $request->method(),
            'ip_address' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255),
            'input' => $this->safeInput($request),
            'files' => $this->fileMeta($request),
        ];
    }

    private function safeInput(Request $request): array
    {
        $input = $request->except([
            'password',
            'password_confirmation',
            'current_password',
            '_token',
            '_method',
            'scan_file',
        ]);

        return collect($input)
            ->map(fn ($value) => is_string($value) ? Str::limit($value, 500) : $value)
            ->all();
    }

    private function fileMeta(Request $request): ?array
    {
        if (! $request->allFiles()) {
            return null;
        }

        return collect($request->allFiles())->map(function ($file) {
            if (is_array($file)) {
                return collect($file)->map(fn ($item) => $this->singleFileMeta($item))->values()->all();
            }

            return $this->singleFileMeta($file);
        })->all();
    }

    private function singleFileMeta($file): array
    {
        return [
            'name' => method_exists($file, 'getClientOriginalName') ? $file->getClientOriginalName() : null,
            'mime' => method_exists($file, 'getMimeType') ? $file->getMimeType() : null,
            'size' => method_exists($file, 'getSize') ? $file->getSize() : null,
        ];
    }
}
