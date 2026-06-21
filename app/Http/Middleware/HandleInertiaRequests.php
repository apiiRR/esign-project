<?php

namespace App\Http\Middleware;

use Inertia\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use App\Models\Setting;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {

        // admin
        $admin = auth()->guard('web')->user();

        if ($admin) {
            $admin->loadMissing(['roles:id,name', 'directorate:id,name', 'division:id,name', 'department:id,name']);
        }

        $settings = Schema::hasTable('settings')
            ? (Setting::query()->first()?->toArray() ?: [
                'app_name' => 'Surat dan Arsip Digital Berdikari',
                'company_name' => 'PT Berdikari',
                'company_logo' => null,
                'login_logo' => null,
            ])
            : [
                'app_name' => 'Surat dan Arsip Digital Berdikari',
                'company_name' => 'PT Berdikari',
                'company_logo' => null,
                'login_logo' => null,
            ];
        $settings['document_download_otp_scope'] ??= 'both';

        return [
            ...parent::share($request),
            //

            // flash
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error')
            ],

            // user authenticated
            'auth' => [
                'user'          => $admin,
                'permissions'   => $admin
                    ? $admin->getPermissionArray()
                    : [],
            ],

            // settings
            'settings' => $settings,
        ];
    }
}
