<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Opcodes\LogViewer\Facades\LogViewer;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::before(function ($user) {
            return $user->role === 'admin' || $user->hasRole('admin') ? true : null;
        });

        LogViewer::auth(fn ($request) => $request->user()?->role === 'admin' || $request->user()?->hasRole('admin'));
    }
}
