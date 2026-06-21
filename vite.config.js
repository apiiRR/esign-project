import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'icons/pwa-icon.svg', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png', 'offline.html'],
            manifest: {
                name: 'Surat dan Arsip Digital Berdikari',
                short_name: 'SADIKA',
                description: 'Aplikasi persuratan dan arsip digital PT XYZ.',
                lang: 'id',
                start_url: '/login',
                scope: '/',
                display: 'standalone',
                background_color: '#f3f4f6',
                theme_color: '#047857',
                icons: [
                    {
                        src: '/icons/pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any',
                    },
                    {
                        src: '/icons/pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                navigateFallback: '/offline.html',
                navigateFallbackDenylist: [/^\/storage\//, /^\/log-viewer/],
                additionalManifestEntries: [
                    { url: '/offline.html', revision: null },
                ],
                runtimeCaching: [
                    {
                        urlPattern: ({ request }) => ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'surat-bdk-static',
                            expiration: {
                                maxEntries: 80,
                                maxAgeSeconds: 60 * 60 * 24 * 30,
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
