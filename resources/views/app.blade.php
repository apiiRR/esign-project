<!DOCTYPE html>
@php
  $appSettings = \Illuminate\Support\Facades\Schema::hasTable('settings')
      ? \App\Models\Setting::query()->first()
      : null;
  $appName = $appSettings?->app_name ?: 'Surat dan Arsip Digital Berdikari';
  $appLogo = $appSettings?->company_logo;
  $appLogoUrl = $appLogo
      ? route('media.settings', ['filename' => $appLogo], false) . '?v=' . ($appSettings?->updated_at?->timestamp ?: time())
      : null;
@endphp
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <meta name="theme-color" content="#047857" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="{{ $appName }}" />
    @if ($appLogoUrl)
      <link rel="icon" href="{{ $appLogoUrl }}" />
      <link rel="shortcut icon" href="{{ $appLogoUrl }}" />
      <link rel="apple-touch-icon" href="{{ $appLogoUrl }}" />
    @else
      <link rel="icon" href="/icons/pwa-icon.svg" type="image/svg+xml" />
      <link rel="apple-touch-icon" href="/icons/pwa-192x192.png" />
    @endif
    <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Quicksand:400,500,600,700&display=swap">
    @viteReactRefresh 
    @vite(['resources/js/app.jsx', 'resources/css/app.css'])
    @inertiaHead
    <style>
      body {
        font-family: 'Quicksand', sans-serif;
      }
    </style>
  </head>
  <body>

      @inertia
      
  </body>
</html>
