<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogApplicationActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldLog($request, $response)) {
            app(AuditLogger::class)->log($this->actionName($request), $request, [
                'status_code' => $response->getStatusCode(),
            ]);
        }

        return $response;
    }

    private function shouldLog(Request $request, Response $response): bool
    {
        if ($response->getStatusCode() >= 500) {
            return false;
        }

        if ($request->is('up') || $request->is('storage/*')) {
            return false;
        }

        $routeName = $request->route()?->getName();

        return ! in_array($routeName, [
            'login',
            'login.store',
            'logout',
            'admin.login.index',
            'admin.login.store',
            'admin.logout',
        ], true);
    }

    private function actionName(Request $request): string
    {
        $routeName = $request->route()?->getName() ?: str_replace('/', '.', $request->path());

        return 'request.' . strtolower($request->method()) . '.' . $routeName;
    }
}
