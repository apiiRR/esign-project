<?php

namespace App\Http\Controllers\Admin;

use Inertia\Inertia;
use Inertia\Response;
use App\Models\Setting;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Routing\Controllers\HasMiddleware;
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
            new Middleware(['permission:settings.index'], only: ['index', 'watermarkSample']),
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
        $settingData = $setting->toArray();
        $settingData['mail_templates'] = $setting->mailTemplatesWithDefaults();
        $settingData['document_download_otp_scope'] ??= 'both';
        $settingData['document_download_watermark_settings'] = $setting->documentDownloadWatermarkSettingsWithDefaults();

        return Inertia::render('Admin/Settings/Index', [
            'setting' => $settingData + [
                'mail_password_set' => filled($setting->mail_password),
            ],
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
        $rules = [
            'app_name' => 'required|string|max:255',
            'company_name' => 'required|string|max:255',
            'company_code' => 'required|string|max:50',
            'company_logo' => 'nullable|image|mimes:png,jpg,jpeg|max:2048',
            'signature_otp_enabled' => 'nullable|boolean',
            'mail_mailer' => 'nullable|string|max:50',
            'mail_host' => 'nullable|string|max:255',
            'mail_port' => 'nullable|integer|min:1|max:65535',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_encryption' => 'nullable|in:tls,ssl,none',
            'mail_from_address' => 'nullable|email|max:255',
            'mail_from_name' => 'nullable|string|max:255',
            'mail_templates' => 'nullable|array',
            'mail_templates.*.subject' => 'nullable|string|max:255',
            'mail_templates.*.body' => 'nullable|string|max:5000',
        ];

        if ($this->supportsDocumentDownloadOtpScope()) {
            $rules['document_download_otp_scope'] = 'required|in:user,admin,both';
        }

        if ($this->supportsLoginLogo()) {
            $rules['login_logo'] = 'nullable|image|mimes:png,jpg,jpeg|max:2048';
        }

        if ($this->supportsDocumentDownloadWatermarkSettings()) {
            $rules['document_download_watermark_settings'] = 'nullable|array';
            $rules['document_download_watermark_settings.x_percent'] = 'required|numeric|min:0|max:100';
            $rules['document_download_watermark_settings.y_percent'] = 'required|numeric|min:0|max:100';
            $rules['document_download_watermark_settings.angle'] = 'required|numeric|min:-90|max:90';
            $rules['document_download_watermark_settings.font_size'] = 'required|numeric|min:8|max:36';
            $rules['document_download_watermark_settings.opacity'] = 'required|numeric|min:10|max:80';
            $rules['document_download_watermark_settings.color'] = 'nullable|in:gray';
            $rules['document_download_watermark_settings.text_template'] = 'nullable|string|max:500';
        }

        if ($this->supportsDocumentDownloadWatermarkSamplePdf()) {
            $rules['document_download_watermark_sample_pdf'] = 'nullable|file|mimes:pdf|max:10240';
        }

        $request->validate($rules);

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
        $data['signature_otp_enabled'] = $request->boolean('signature_otp_enabled');

        if ($this->supportsDocumentDownloadOtpScope()) {
            $data['document_download_otp_scope'] = $request->input('document_download_otp_scope', 'both');
        }

        if ($this->supportsDocumentDownloadWatermarkSettings()) {
            $data['document_download_watermark_settings'] = array_replace(
                Setting::defaultDocumentDownloadWatermarkSettings(),
                $request->input('document_download_watermark_settings', [])
            );
        }

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

        if ($this->supportsLoginLogo() && $request->hasFile('login_logo')) {
            if ($setting->login_logo) {
                Storage::disk('public')->delete('settings/' . $setting->login_logo);
            }

            $logo = $request->file('login_logo');
            $logo->storeAs('settings', $logo->hashName(), 'public');

            $data['login_logo'] = $logo->hashName();
        }

        if ($this->supportsDocumentDownloadWatermarkSamplePdf() && $request->hasFile('document_download_watermark_sample_pdf')) {
            if ($setting->document_download_watermark_sample_pdf) {
                Storage::disk('public')->delete($setting->document_download_watermark_sample_pdf);
            }

            $data['document_download_watermark_sample_pdf'] = $request
                ->file('document_download_watermark_sample_pdf')
                ->store('settings/watermark-samples', 'public');
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

    public function watermarkSample(): BinaryFileResponse
    {
        $setting = $this->setting();
        $path = $setting->document_download_watermark_sample_pdf;

        abort_unless($path && Storage::disk('public')->exists($path), 404);

        return response()->file(Storage::disk('public')->path($path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="watermark-sample.pdf"',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma' => 'no-cache',
            'Expires' => '0',
        ]);
    }

    private function setting(): Setting
    {
        $defaults = [
            'app_name' => 'Surat dan Arsip Digital Berdikari',
            'company_name' => 'PT XYZ',
            'company_code' => 'BDRK',
            'mail_templates' => Setting::defaultMailTemplates(),
        ];

        if ($this->supportsLoginLogo()) {
            $defaults['login_logo'] = null;
        }

        if ($this->supportsDocumentDownloadOtpScope()) {
            $defaults['document_download_otp_scope'] = 'both';
        }

        if ($this->supportsDocumentDownloadWatermarkSettings()) {
            $defaults['document_download_watermark_settings'] = Setting::defaultDocumentDownloadWatermarkSettings();
        }

        if ($this->supportsDocumentDownloadWatermarkSamplePdf()) {
            $defaults['document_download_watermark_sample_pdf'] = null;
        }

        return Setting::firstOrCreate([], $defaults);
    }

    private function supportsDocumentDownloadOtpScope(): bool
    {
        return Schema::hasTable('settings') && Schema::hasColumn('settings', 'document_download_otp_scope');
    }

    private function supportsDocumentDownloadWatermarkSettings(): bool
    {
        return Schema::hasTable('settings') && Schema::hasColumn('settings', 'document_download_watermark_settings');
    }

    private function supportsLoginLogo(): bool
    {
        return Schema::hasTable('settings') && Schema::hasColumn('settings', 'login_logo');
    }

    private function supportsDocumentDownloadWatermarkSamplePdf(): bool
    {
        return Schema::hasTable('settings') && Schema::hasColumn('settings', 'document_download_watermark_sample_pdf');
    }
}
