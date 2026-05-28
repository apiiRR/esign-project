<?php

use Illuminate\Support\Facades\Route;

// Route home
Route::get('/', fn () => redirect()->route('login'))->name('home');

Route::get('/developer-docs', [\App\Http\Controllers\DocumentationController::class, 'developer'])
    ->name('developer-docs');

Route::get('/verify/signature/{token}', [\App\Http\Controllers\SignatureVerificationController::class, 'show'])
    ->name('signature.verify');

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

        Route::get('/surat/masuk-eksternal', [App\Http\Controllers\Admin\LetterController::class, 'index'])
            ->defaults('type', 'masuk-eksternal')
            ->name('surat.incoming');
        Route::get('/surat/keluar', [App\Http\Controllers\Admin\LetterController::class, 'index'])
            ->defaults('type', 'keluar')
            ->name('surat.outgoing');
        Route::get('/surat/internal', [App\Http\Controllers\Admin\LetterController::class, 'index'])
            ->defaults('type', 'internal')
            ->name('surat.internal');
        Route::get('/surat/arsip', [App\Http\Controllers\Admin\LetterController::class, 'index'])
            ->defaults('type', 'arsip')
            ->name('surat.archive');
        Route::get('/surat/create/{mode}', [App\Http\Controllers\Admin\LetterController::class, 'create'])
            ->name('surat.create');
        Route::post('/surat', [App\Http\Controllers\Admin\LetterController::class, 'store'])
            ->name('surat.store');
        Route::delete('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'destroyDraft'])
            ->name('surat.destroy-draft');
        Route::get('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'show'])
            ->name('surat.show');
        Route::put('/surat/{letter}', [App\Http\Controllers\Admin\LetterController::class, 'update'])
            ->name('surat.update');

        Route::get('/organisasi/{type}', [App\Http\Controllers\Admin\OrganizationController::class, 'index'])
            ->whereIn('type', ['directorates', 'divisions', 'departments'])
            ->name('organization.index');
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
        Route::get('/notifikasi', [App\Http\Controllers\Admin\NotificationController::class, 'index'])->name('notifications.index');

        // route settings
        Route::get('/settings', [App\Http\Controllers\Admin\SettingController::class, 'index'])
            ->name('settings.index');

        // route settings update
        Route::put('/settings', [App\Http\Controllers\Admin\SettingController::class, 'update'])
            ->name('settings.update');
        Route::post('/settings/test-email', [App\Http\Controllers\Admin\SettingController::class, 'testEmail'])
            ->name('settings.test-email');

        // route resource untuk permission
        Route::resource('/permissions', App\Http\Controllers\Admin\PermissionController::class)->except(['show']);

        // route resource untuk role
        Route::resource('/roles', App\Http\Controllers\Admin\RoleController::class)->except(['show']);

        // route resource untuk user
        Route::resource('/users', App\Http\Controllers\Admin\UserController::class)->except(['show']);

        // route resource untuk jenis surat
        Route::resource('/letter-types', App\Http\Controllers\Admin\LetterTypeController::class)->except(['create', 'edit', 'show']);

    });

});


// ==============================================
// ROUTES PEGAWAI PT BERDIKARI
// ==============================================

Route::prefix('pegawai')->name('pegawai.')->middleware('auth')->group(function() {
    Route::get('/dashboard', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'dashboard')
        ->defaults('mode', 'index')
        ->name('dashboard');

    Route::get('/dokumentasi', [App\Http\Controllers\DocumentationController::class, 'pegawai'])
        ->name('documentation');

    Route::get('/inbox/internal', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'inbox')
        ->defaults('mode', 'internal')
        ->name('inbox.internal');

    Route::get('/inbox/tebusan', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'inbox')
        ->defaults('mode', 'tebusan')
        ->name('inbox.tebusan');

    Route::get('/disposisi', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'inbox')
        ->defaults('mode', 'disposisi')
        ->name('disposisi');

    Route::get('/approval', [App\Http\Controllers\Pegawai\PortalController::class, 'approvalIndex'])
        ->name('approval.index');

    Route::get('/approval/{signatureRequest}', [App\Http\Controllers\Pegawai\PortalController::class, 'approvalShow'])
        ->name('approval.show');

    Route::post('/approval/{signatureRequest}/read', [App\Http\Controllers\Pegawai\PortalController::class, 'markApprovalRead'])
        ->name('approval.read');

    Route::post('/approval/{signatureRequest}/otp', [App\Http\Controllers\Pegawai\PortalController::class, 'sendSignatureOtp'])
        ->name('approval.otp');

    Route::post('/approval/{signatureRequest}/approve', [App\Http\Controllers\Pegawai\PortalController::class, 'approveSignature'])
        ->name('approval.approve');

    Route::post('/approval/{signatureRequest}/reject', [App\Http\Controllers\Pegawai\PortalController::class, 'rejectSignature'])
        ->name('approval.reject');

    Route::get('/notifikasi', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'notifications')
        ->defaults('mode', 'index')
        ->name('notifications');

    Route::get('/surat', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'create_menu')
        ->defaults('mode', 'index')
        ->name('surat.index');

    Route::get('/surat/internal', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'create')
        ->defaults('mode', 'internal')
        ->name('surat.internal');

    Route::get('/surat/keluar', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'create')
        ->defaults('mode', 'outgoing')
        ->name('surat.outgoing');

    Route::get('/surat/masuk-eksternal', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'create')
        ->defaults('mode', 'incoming_external')
        ->name('surat.incoming');

    Route::get('/surat/arsip', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'create')
        ->defaults('mode', 'archive')
        ->name('surat.archive.create');

    Route::post('/surat/internal', [App\Http\Controllers\Pegawai\PortalController::class, 'storeInternal'])
        ->name('surat.internal.store');

    Route::post('/surat/keluar', [App\Http\Controllers\Pegawai\PortalController::class, 'storeOutgoing'])
        ->name('surat.outgoing.store');

    Route::post('/surat/masuk-eksternal', [App\Http\Controllers\Pegawai\PortalController::class, 'storeIncomingExternal'])
        ->name('surat.incoming.store');

    Route::post('/surat/arsip', [App\Http\Controllers\Pegawai\PortalController::class, 'storeArchive'])
        ->name('surat.archive.store');

    Route::get('/arsip', [App\Http\Controllers\Pegawai\PortalController::class, 'workspace'])
        ->defaults('section', 'archive')
        ->defaults('mode', 'index')
        ->name('archive');

    Route::delete('/surat/{letter}', [App\Http\Controllers\Pegawai\PortalController::class, 'destroyDraft'])
        ->name('surat.destroy-draft');

    Route::post('/surat/{letter}/publish', [App\Http\Controllers\Pegawai\PortalController::class, 'publishIncomingExternal'])
        ->name('surat.publish');

    Route::delete('/surat/{letter}/publish/{target}', [App\Http\Controllers\Pegawai\PortalController::class, 'revokeIncomingExternalPublication'])
        ->name('surat.publish.revoke');

    Route::post('/surat/{letter}/disposisi', [App\Http\Controllers\Pegawai\PortalController::class, 'storeDisposition'])
        ->name('surat.dispositions.store');

    Route::post('/disposisi/{disposition}/balas', [App\Http\Controllers\Pegawai\PortalController::class, 'replyDisposition'])
        ->name('dispositions.reply');

    Route::get('/notifikasi/{notification}', [App\Http\Controllers\Pegawai\PortalController::class, 'openNotification'])
        ->name('notifications.open');

    Route::get('/surat/{letter}', [App\Http\Controllers\Pegawai\PortalController::class, 'detail'])
        ->name('surat.detail');
});
