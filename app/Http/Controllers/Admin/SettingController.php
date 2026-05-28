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
            new Middleware(['permission:settings.update'], only: ['update']),
        ];
    }

    /**
     * index
     *
     * @return Response
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Settings/Index', [
            'setting' => $this->setting(),
            'fieldRequirementDefinitions' => LetterFieldRequirementService::DEFINITIONS,
            'letterFieldRequirements' => app(LetterFieldRequirementService::class)->get($this->setting()),
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
        ]);

        $data = $request->only([
            'app_name',
            'company_name',
            'company_code',
        ]);
        $data['letter_field_requirements'] = app(LetterFieldRequirementService::class)
            ->normalize($request->input('letter_field_requirements', []));

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

    private function setting(): Setting
    {
        return Setting::firstOrCreate([], [
            'app_name' => 'Surat & Arsip Digital',
            'company_name' => 'PT Berdikari',
            'company_code' => 'BDRK',
            'letter_field_requirements' => app(LetterFieldRequirementService::class)->defaults(),
        ]);
    }
}
