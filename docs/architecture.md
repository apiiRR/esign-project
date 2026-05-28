# Arsitektur Aplikasi

## Ringkasan

Aplikasi ini adalah sistem persuratan dan arsip digital berbasis:

- Laravel sebagai backend, routing, validasi, database access, auth, dan controller.
- Inertia.js sebagai jembatan Laravel ke React tanpa API REST terpisah.
- React untuk halaman admin, pegawai, dan dokumentasi.
- Tailwind CSS untuk styling.
- PostgreSQL untuk database production.
- PWA/Vite untuk build asset frontend.

Secara umum, request browser masuk ke route Laravel, controller mengambil data dari model/service, lalu mengembalikan halaman Inertia dengan props. React menerima props tersebut dan merender UI.

## Entry Point

- `routes/web.php`
  Mendefinisikan semua route web, termasuk login, admin, pegawai, dan developer docs.
- `resources/js/app.jsx`
  Entry point React/Inertia.
- `resources/views/app.blade.php`
  Blade root yang memuat asset React hasil Vite.
- `app/Http/Middleware/HandleInertiaRequests.php`
  Membagikan shared props ke semua halaman Inertia, seperti user login dan setting aplikasi.

## Route Utama

### Public dan Auth

- `/` redirect ke login.
- `/login` login satu pintu untuk admin dan pegawai.
- `/logout` logout.
- `/developer-docs` halaman dokumentasi developer publik.

### Admin

Prefix route: `/admin`, name prefix: `admin.`, middleware: `auth` dan `role:admin`.

Admin mengelola:

- Dashboard.
- Surat masuk eksternal, surat keluar, surat internal, arsip.
- Master organisasi: direktorat, divisi, department.
- Disposisi.
- Notifikasi.
- Setting aplikasi.
- Permission, role, user.
- Jenis surat.

### Pegawai

Prefix route: `/pegawai`, name prefix: `pegawai.`, middleware: `auth`.

Pegawai memakai satu controller utama: `App\Http\Controllers\Pegawai\PortalController`.

Halaman pegawai meliputi:

- Dashboard.
- Inbox internal.
- Inbox tebusan.
- Disposisi.
- Notifikasi.
- Buat surat.
- Arsip saya.
- Detail surat.

## Pola Inertia

Controller mengembalikan:

```php
return inertia('Pegawai/Portal/Workspace', $props);
```

React menerima props melalui:

```jsx
const props = usePage().props;
```

Karena Inertia dipakai langsung, validasi backend Laravel akan otomatis mengirim error ke React props `errors`.

## Pembagian Area Kode

### Backend

- `app/Http/Controllers/Admin`
  Controller admin untuk dashboard, surat, master data, user, role, permission, setting.
- `app/Http/Controllers/Pegawai/PortalController.php`
  Controller utama pegawai untuk dashboard, surat, arsip, disposisi, publish, notifikasi.
- `app/Models`
  Model Eloquent untuk user, organisasi, surat, target, disposisi, notifikasi, setting.
- `app/Services`
  Logic domain yang dipakai berulang, seperti disposisi dan konfigurasi wajib field.

### Frontend

- `resources/js/Layouts`
  Layout admin, pegawai, dan auth.
- `resources/js/Pages/Admin`
  Halaman admin.
- `resources/js/Pages/Pegawai/Portal/Workspace.jsx`
  Halaman utama portal pegawai, berisi banyak view internal sesuai prop `section` dan `mode`.
- `resources/js/Shared`
  Komponen reusable seperti Search, Pagination, PageHeader, FormErrorSummary.

## Konsep Data Besar

### Surat

Surat utama disimpan di tabel `letters`. Field penting:

- `type`: jenis teknis surat.
- `letter_number`: nomor publik/dokumen yang ditampilkan user.
- `reference`: ID internal aplikasi, seperti `BDK-OUT-...`.
- `created_by`: user aktor pembuat.
- `origin_directorate_id`, `origin_division_id`, `origin_department_id`: unit asal surat.
- `status`: status internal seperti draft/sent/received/archived.
- `payload`: metadata tambahan sesuai jenis surat.
- `meta`: metadata teknis, misalnya mode form.

### Target

Target surat disimpan di `letter_targets`.

- `kind = recipient`: tujuan utama.
- `kind = cc`: tembusan.
- `target_type`: tipe target, seperti department, division, directorate, division_gm, department_manager.
- `target_id`: ID unit/jabatan target.

### Disposisi

Disposisi disimpan di `dispositions`. Disposisi mendukung thread lewat `parent_id`, target unit/jabatan, dan snapshot unit pengirim.

### Status Baca

Status baca surat disimpan di `letter_read_receipts`, satu record per surat per user.

### Notifikasi

Notifikasi web disimpan di `notification_logs`.

## Prinsip Akses

Akses surat tidak hanya berdasarkan orang pembuat. Sistem memakai kombinasi:

- Pembuat surat.
- Target surat/tembusan berdasarkan unit/jabatan terbaru.
- Target disposisi.
- Asal surat internal berdasarkan unit asal.
- Publish surat ke department/division/directorate.

Untuk kebutuhan perusahaan yang dinamis, target bisnis diarahkan ke unit/jabatan, sedangkan user tetap dicatat sebagai aktor audit operasional seperti pembuat, pembaca, atau penerima notifikasi.
