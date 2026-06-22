<?php

use Illuminate\Support\Facades\Route;

// Route home
Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::get('/developer-docs', [\App\Http\Controllers\DocumentationController::class, 'developer'])
    ->name('developer-docs');

Route::get('/verify/signature/{token}', [\App\Http\Controllers\SignatureVerificationController::class, 'show'])
    ->name('signature.verify');

Route::get('/csrf-token', fn () => response()->json(['token' => csrf_token()]))
    ->middleware('web')
    ->name('csrf-token');

Route::get('/media/settings/{filename}', function (string $filename) {
    abort_if(\Illuminate\Support\Str::contains($filename, ['..', '/', '\\']), 404);

    $path = 'settings/' . $filename;
    abort_unless(\Illuminate\Support\Facades\Storage::disk('public')->exists($path), 404);

    return response()->file(\Illuminate\Support\Facades\Storage::disk('public')->path($path), [
        'Cache-Control' => 'public, max-age=31536000, immutable',
    ]);
})->where('filename', '[^/]+')->name('media.settings');

// route login satu pintu
Route::get('/login', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'index'])
    ->name('login')
    ->middleware('guest');

Route::post('/login', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'store'])
    ->name('login.store')
    ->middleware('guest');

Route::post('/logout', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'logout'])
    ->name('logout');

// ==============================================
// ROUTES UNTUK ADMIN
// ==============================================

// route login admin
Route::get('/admin/login', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'index'])
    ->name('admin.login.index')
    ->middleware('guest');

// route login store admin
Route::post('/admin/login', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'store'])
    ->name('admin.login.store')
    ->middleware('guest');

// route logout admin
Route::post('/admin/logout', [\App\Http\Controllers\Admin\Auth\LoginController::class, 'logout'])
    ->name('admin.logout');

// prefix "admin" untuk admin
Route::prefix('admin')->name('admin.')->group(function() {
    
    // middleware "auth" untuk admin
    Route::group(['middleware' => ['auth', 'role:admin']], function () {
        
        // route dashboard admin
        Route::get('/dashboard', [App\Http\Controllers\Admin\DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dokumentasi', [App\Http\Controllers\DocumentationController::class, 'admin'])->name('documentation');

        Route::get('/surat/masuk-eksternal', fn () => redirect('/admin/surat/internal'));
        Route::get('/surat/keluar', fn () => redirect('/admin/surat/internal'));
        Route::get('/surat/arsip', fn () => redirect('/admin/surat/internal'));
        Route::get('/surat/internal', [App\Http\Controllers\Admin\LetterController::class, 'index'])
            ->defaults('type', 'internal')
            ->name('surat.internal');
        Route::get('/surat/create/masuk-eksternal', fn () => redirect('/admin/surat/create/internal'));
        Route::get('/surat/create/keluar', fn () => redirect('/admin/surat/create/internal'));
        Route::get('/surat/create/arsip', fn () => redirect('/admin/surat/create/internal'));
        Route::get('/surat/create/{mode}', [App\Http\Controllers\Admin\LetterController::class, 'create'])
            ->name('surat.create');
        Route::post('/surat', [App\Http\Controllers\Admin\LetterController::class, 'store'])
            ->name('surat.store');
        Route::delete('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'destroy'])
            ->name('surat.destroy');
        Route::post('/surat/{letter}/revisi-pdf', [App\Http\Controllers\Admin\LetterController::class, 'reviseInternalPdf'])
            ->name('surat.revisi-pdf');
        Route::get('/surat/{letter}/preview', [App\Http\Controllers\Admin\LetterController::class, 'preview'])
            ->name('surat.preview');
        Route::post('/surat/{letter}/download-otp', [App\Http\Controllers\Admin\LetterController::class, 'sendDownloadOtp'])
            ->name('surat.download-otp');
        Route::post('/surat/{letter}/download', [App\Http\Controllers\Admin\LetterController::class, 'download'])
            ->name('surat.download');
        Route::get('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'show'])
            ->name('surat.show');
        Route::put('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'update'])
            ->name('surat.update');

        Route::get('/organisasi/{type}', [App\Http\Controllers\Admin\OrganizationController::class, 'index'])
            ->whereIn('type', ['directorates', 'divisions', 'departments'])
            ->name('organization.index');
        Route::get('/master-data/{type}/export', [App\Http\Controllers\Admin\MasterDataImportExportController::class, 'export'])
            ->whereIn('type', ['directorates', 'divisions', 'departments', 'users'])
            ->name('master-data.export');
        Route::get('/master-data/{type}/template', [App\Http\Controllers\Admin\MasterDataImportExportController::class, 'template'])
            ->whereIn('type', ['directorates', 'divisions', 'departments', 'users'])
            ->name('master-data.template');
        Route::post('/master-data/{type}/import', [App\Http\Controllers\Admin\MasterDataImportExportController::class, 'import'])
            ->whereIn('type', ['directorates', 'divisions', 'departments', 'users'])
            ->name('master-data.import');
        Route::post('/organisasi/{type}', [App\Http\Controllers\Admin\OrganizationController::class, 'store'])
            ->whereIn('type', ['directorates', 'divisions', 'departments'])
            ->name('organization.store');
        Route::put('/organisasi/{type}/{id}', [App\Http\Controllers\Admin\OrganizationController::class, 'update'])
            ->whereIn('type', ['directorates', 'divisions', 'departments'])
            ->name('organization.update');
        Route::delete('/organisasi/{type}/{id}', [App\Http\Controllers\Admin\OrganizationController::class, 'destroy'])
            ->whereIn('type', ['directorates', 'divisions', 'departments'])
            ->name('organization.destroy');

        Route::get('/disposisi', [App\Http\Controllers\Admin\DispositionController::class, 'index'])->name('dispositions.index');
        Route::post('/disposisi', [App\Http\Controllers\Admin\DispositionController::class, 'store'])->name('dispositions.store');
        Route::put('/disposisi/{disposition}', [App\Http\Controllers\Admin\DispositionController::class, 'update'])->name('dispositions.update');

        // route settings
        Route::get('/settings', [App\Http\Controllers\Admin\SettingController::class, 'index'])
            ->name('settings.index');

        // route settings update
        Route::put('/settings', [App\Http\Controllers\Admin\SettingController::class, 'update'])
            ->name('settings.update');
        Route::post('/settings/test-email', [App\Http\Controllers\Admin\SettingController::class, 'testEmail'])
            ->name('settings.test-email');
        Route::get('/settings/watermark-sample', [App\Http\Controllers\Admin\SettingController::class, 'watermarkSample'])
            ->name('settings.watermark-sample');

        Route::get('/audit-trails', [App\Http\Controllers\Admin\AuditTrailController::class, 'index'])
            ->name('audit-trails.index');

        // route resource untuk permission
        Route::resource('/permissions', App\Http\Controllers\Admin\PermissionController::class)->except(['show']);

        Route::any('/roles/{any?}', fn () => redirect()->route('admin.users.index'))
            ->where('any', '.*')
            ->name('roles.redirect');

        // route resource untuk user
        Route::resource('/users', App\Http\Controllers\Admin\UserController::class)->except(['show']);

    });

});


// ==============================================
// ROUTES USER PT XYZ
// ==============================================

Route::prefix('user')->name('user.')->middleware('auth')->group(function() {
    Route::get('/dashboard', [App\Http\Controllers\User\PortalController::class, 'workspace'])
        ->defaults('section', 'dashboard')
        ->defaults('mode', 'index')
        ->name('dashboard');

    Route::get('/inbox/internal', fn () => redirect('/user/surat'))->name('inbox.internal');
    Route::get('/inbox/tebusan', fn () => redirect('/user/surat'))->name('inbox.tebusan');
    Route::get('/disposisi', fn () => redirect('/user/surat'))->name('disposisi');

    Route::get('/approval', fn () => redirect('/user/surat'))->name('approval.index');

    Route::get('/approval/{signatureRequest}', [App\Http\Controllers\User\PortalController::class, 'approvalShow'])
        ->name('approval.show');

    Route::post('/approval/{signatureRequest}/read', [App\Http\Controllers\User\PortalController::class, 'markApprovalRead'])
        ->name('approval.read');

    Route::post('/approval/{signatureRequest}/otp', [App\Http\Controllers\User\PortalController::class, 'sendSignatureOtp'])
        ->name('approval.otp');

    Route::post('/approval/{signatureRequest}/approve', [App\Http\Controllers\User\PortalController::class, 'approveSignature'])
        ->name('approval.approve');

    Route::get('/surat', fn () => redirect('/user/dashboard'))->name('surat.index');

    Route::get('/surat/create', [App\Http\Controllers\User\PortalController::class, 'workspace'])
        ->defaults('section', 'create')
        ->defaults('mode', 'internal')
        ->name('surat.create');

    Route::get('/surat/internal', fn () => redirect('/user/surat/create'))->name('surat.internal');

    Route::get('/surat/keluar', fn () => redirect('/user/surat'));
    Route::get('/surat/masuk-eksternal', fn () => redirect('/user/surat'));
    Route::get('/surat/arsip', fn () => redirect('/user/surat'));

    Route::post('/surat/internal', [App\Http\Controllers\User\PortalController::class, 'storeInternal'])
        ->name('surat.internal.store');

    Route::get('/arsip', [App\Http\Controllers\User\PortalController::class, 'workspace'])
        ->defaults('section', 'archive')
        ->defaults('mode', 'index')
        ->name('archive');

    Route::delete('/surat/{letter}', [App\Http\Controllers\User\PortalController::class, 'destroyDraft'])
        ->name('surat.destroy-draft');

    Route::post('/surat/{letter}/disposisi', [App\Http\Controllers\User\PortalController::class, 'storeDisposition'])
        ->name('surat.dispositions.store');

    Route::post('/surat/{letter}/revisi-pdf', [App\Http\Controllers\User\PortalController::class, 'reviseInternalPdf'])
        ->name('surat.revisi-pdf');

    Route::get('/surat/{letter}/preview', [App\Http\Controllers\User\PortalController::class, 'preview'])
        ->name('surat.preview');

    Route::post('/surat/{letter}/download-otp', [App\Http\Controllers\User\PortalController::class, 'sendDownloadOtp'])
        ->name('surat.download-otp');

    Route::post('/surat/{letter}/download', [App\Http\Controllers\User\PortalController::class, 'download'])
        ->name('surat.download');

    Route::post('/disposisi/{disposition}/balas', [App\Http\Controllers\User\PortalController::class, 'replyDisposition'])
        ->name('dispositions.reply');

    Route::get('/surat/{letter}', [App\Http\Controllers\User\PortalController::class, 'detail'])
        ->name('surat.detail');
});
