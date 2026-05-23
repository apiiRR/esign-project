<?php

namespace App\Http\Controllers\Admin\Auth;

use Illuminate\Http\Request;
use App\Models\User;
use App\Http\Controllers\Controller;
use App\Services\AuditLogger;

class LoginController extends Controller
{    
    /**
     * index
     *
     * @return void
     */
    public function index()
    {
        // return inertia
        return inertia('Admin/Auth/Login');
    }
    
    /**
     * store
     *
     * @param  mixed $request
     * @return void
     */
    public function store(Request $request)
    {
        // set validation
        $request->validate([
            'username'  => 'required|string',
            'password'  => 'required',
        ]);

        $user = User::query()
            ->where('username', $request->username)
            ->first();

        if ($user && $user->status !== 'active') {
            app(AuditLogger::class)->log('auth.login_blocked_inactive', $request, [
                'username' => $request->username,
            ], $user->id);

            return back()->withErrors([
                'username' => 'Akun tidak aktif.',
            ]);
        }

        if ($user && auth()->attempt([
            'username' => $request->username,
            'password' => $request->password,
        ])) {

            $request->session()->regenerate();
            $user->update(['last_login_at' => now()]);

            app(AuditLogger::class)->log('auth.login', $request, [
                'username' => $user->username,
                'role' => $user->role,
                'logged_in_at' => now()->toDateTimeString(),
            ], $user->id);

            return $user->role === 'admin'
                ? redirect()->route('admin.dashboard')
                : redirect()->route('pegawai.dashboard');
        }

        app(AuditLogger::class)->log('auth.login_failed', $request, [
            'username' => $request->username,
            'reason' => $user ? 'invalid_password' : 'user_not_found',
        ], $user?->id);

        // if login fails
        return back()->withErrors([
            'username' => 'Username atau password tidak sesuai.',
        ]);
    }

    /**
     * logout
     *
     * @return void
     */
    public function logout(Request $request)
    {
        $user = auth()->user();

        if ($user) {
            app(AuditLogger::class)->log('auth.logout', $request, [
                'username' => $user->username,
                'role' => $user->role,
                'logged_out_at' => now()->toDateTimeString(),
            ], $user->id);
        }

        // logout user
        auth()->logout();

        // invalidate session
        $request->session()->invalidate();

        // regenerate token
        $request->session()->regenerateToken();

        return redirect()->to('/login');
    }
}
