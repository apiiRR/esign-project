<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'role' => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Illuminate\Http\Exceptions\PostTooLargeException $exception, \Illuminate\Http\Request $request) {
            $message = 'File gagal diunggah. Ukuran request melebihi batas upload server. Pastikan file PDF maksimal 10MB dan post_max_size lebih besar dari upload_max_filesize.';

            \Illuminate\Support\Facades\Log::warning('Upload rejected because request payload is too large', [
                'user_id' => $request->user()?->id,
                'route' => $request->route()?->getName(),
                'path' => $request->path(),
                'method' => $request->method(),
                'content_length' => $request->server('CONTENT_LENGTH'),
                'php_upload_max_filesize' => ini_get('upload_max_filesize'),
                'php_post_max_size' => ini_get('post_max_size'),
            ]);

            if ($request->expectsJson()) {
                return response()->json([
                    'message' => $message,
                    'errors' => ['scan_file' => [$message]],
                ], 413);
            }

            return back()->withErrors(['scan_file' => $message])->withInput();
        });

        $exceptions->report(function (\Throwable $exception) {
            \Illuminate\Support\Facades\Log::error('Application error captured', [
                'user_id' => request()?->user()?->id,
                'exception' => get_class($exception),
                'message' => \Illuminate\Support\Str::limit($exception->getMessage(), 500),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'route' => request()?->route()?->getName(),
                'path' => request()?->path(),
                'method' => request()?->method(),
                'ip_address' => request()?->ip(),
            ]);
        });
    })->create();
