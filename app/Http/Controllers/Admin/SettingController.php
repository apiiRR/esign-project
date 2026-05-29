<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Setting;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;
use App\Services\LetterFieldRequirementService;
use App\Services\MailSettingsService;

class SettingController extends Controller implements HasMiddleware
{
    /**
     * middleware
     *
     * @return array
     */
    public static function middleware(): array
    {
        return [
            new Middleware(['permission:settings.index'], only: ['index']),
            new Middleware(['permission:settings.update'], only: ['update', 'testEmail']),
        ];
    }

    /**
     * index
     *
     * @return Response
     */
    public function index(): Response
    {
        $setting = $this->setting();

        return Inertia::render('Admin/Settings/Index', [
            'setting' => $setting->toArray() + [
                'mail_password_set' => filled($setting->mail_password),
            ],
            'fieldRequirementDefinitions' => LetterFieldRequirementService::DEFINITIONS,
            'letterFieldRequirements' => app(LetterFieldRequirementService::class)->get($setting),
        ]);
    }

    /**
     * update
     *
     * @param  Request $request
     * @return RedirectResponse
     */
    public function update(Request $request): RedirectResponse
    {
        // setting hanya 1 data
        $setting = $this->setting();

        // set validation
        $request->validate([
            'app_name' => 'required|string|max:255',
            'company_name' => 'required|string|max:255',
            'company_code' => 'required|string|max:50',
            'company_logo' => 'nullable|image|mimes:png,jpg,jpeg|max:2048',
            'letter_field_requirements' => 'nullable|array',
            'mail_notifications_enabled' => 'nullable|boolean',
            'mail_letter_notifications_enabled' => 'nullable|boolean',
            'mail_signature_approval_notifications_enabled' => 'nullable|boolean',
            'signature_otp_enabled' => 'nullable|boolean',
            'mail_mailer' => 'nullable|string|max:50',
            'mail_host' => 'nullable|string|max:255',
            'mail_port' => 'nullable|integer|min:1|max:65535',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_encryption' => 'nullable|in:tls,ssl,none',
            'mail_from_address' => 'nullable|email|max:255',
            'mail_from_name' => 'nullable|string|max:255',
        ]);

        $data = $request->only([
            'app_name',
            'company_name',
            'company_code',
            'mail_mailer',
            'mail_host',
            'mail_port',
            'mail_username',
            'mail_encryption',
            'mail_from_address',
            'mail_from_name',
        ]);
        $data['mail_notifications_enabled'] = $request->boolean('mail_notifications_enabled');
        $data['mail_letter_notifications_enabled'] = $request->boolean('mail_letter_notifications_enabled');
        $data['mail_signature_approval_notifications_enabled'] = $request->boolean('mail_signature_approval_notifications_enabled');
        $data['signature_otp_enabled'] = $request->boolean('signature_otp_enabled');
        $data['letter_field_requirements'] = app(LetterFieldRequirementService::class)
            ->normalize($request->input('letter_field_requirements', []));

        if (filled($request->input('mail_password'))) {
            $data['mail_password'] = $request->input('mail_password');
        }

        if ($request->hasFile('company_logo')) {

            if ($setting->company_logo) {
                Storage::disk('public')->delete('settings/' . $setting->company_logo);
            }
            
            $logo = $request->file('company_logo');
            $logo->storeAs('settings', $logo->hashName(), 'public');

            $data['company_logo'] = $logo->hashName();
        }

        // update setting
        $setting->update($data);

        // kembali ke halaman setting
        return redirect()
            ->route('admin.settings.index')
            ->with('success', 'Setting updated successfully.');
    }

    public function testEmail(Request $request, MailSettingsService $mailSettings): RedirectResponse
    {
        $validated = $request->validate([
            'test_email' => 'required|email|max:255',
        ]);

        $setting = $this->setting();
        $mailSettings->sendRaw(
            $validated['test_email'],
            'Test email ' . $setting->app_name,
            "Ini adalah test email dari {$setting->app_name}.\n\nJika email ini diterima, konfigurasi SMTP sudah dapat digunakan.",
            true
        );

        return redirect()
            ->route('admin.settings.index')
            ->with('success', 'Test email berhasil dikirim.');
    }

    private function setting(): Setting
    {
        return Setting::firstOrCreate([], [
            'app_name' => 'SADIKA — Surat dan Arsip Digital Berdikari',
            'company_name' => 'PT Berdikari',
            'company_code' => 'BDRK',
            'letter_field_requirements' => app(LetterFieldRequirementService::class)->defaults(),
        ]);
    }
}
