# Surat dan Arsip Digital Berdikari

Aplikasi persuratan dan arsip digital berbasis Laravel, Inertia React, Tailwind CSS, dan PWA untuk PT Berdikari. Aplikasi ini mengelola surat masuk eksternal, surat internal, surat keluar, arsip scan, disposisi, status baca, template Nota Dinas, nomor surat otomatis, log teknis, dan notifikasi dasar.

## Fitur Utama

- Login satu pintu berbasis username dan password.
- Role akses sederhana: `admin` dan `pegawai`.
- Master organisasi: direktorat, divisi, department, dan pejabat unit.
- Master jenis surat dengan konfigurasi nomor surat otomatis.
- Template surat Nota Dinas untuk surat internal dan surat keluar.
- Portal pegawai untuk inbox internal, tebusan, disposisi, buat surat, dan arsip saya.
- Surat internal dan surat keluar mendukung `Simpan Draft`, `Send`, dan `Hapus Draft`.
- Upload dan preview file scan PDF.
- Read receipt, notification log, dan Laravel Log Viewer untuk error teknis.
- PWA installable minimal untuk laptop dan perangkat mobile.
- Dokumentasi aplikasi:
  - Admin: `/admin/dokumentasi`
  - Pegawai: `/pegawai/dokumentasi`
  - Developer public: `/developer-docs`
- Dokumentasi teknis source code tersedia di folder [`docs/`](docs/README.md).

## Dokumentasi Teknis Developer

Dokumentasi teknis untuk programmer tersedia di folder `docs/`:

- [`docs/README.md`](docs/README.md): indeks dokumentasi teknis.
- [`docs/architecture.md`](docs/architecture.md): arsitektur aplikasi.
- [`docs/backend.md`](docs/backend.md): controller, service, dan fungsi backend.
- [`docs/data-model.md`](docs/data-model.md): model, tabel, relasi, dan enum penting.
- [`docs/workflows.md`](docs/workflows.md): alur bisnis surat, publish, disposisi, notifikasi, dan status baca.
- [`docs/frontend.md`](docs/frontend.md): struktur React/Inertia, halaman, komponen, dan helper frontend.
- [`docs/operations.md`](docs/operations.md): setup lokal, build, testing, storage, dan troubleshooting.
- [`docs/controllers-reference.md`](docs/controllers-reference.md): indeks cepat controller dan fungsi.

## Prasyarat

- PHP 8.2 atau lebih baru.
- Composer.
- Node.js LTS 24.
- NPM.
- PostgreSQL.
- Extension PHP yang umum dipakai Laravel seperti `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, dan `json`.
- Batas upload PHP disarankan: `upload_max_filesize >= 10M`, `post_max_size > upload_max_filesize`, dan `memory_limit` cukup besar.

## Instalasi Lokal

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Sesuaikan koneksi database di `.env`, misalnya:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=surat_berdikari
DB_USERNAME=postgres
DB_PASSWORD=password
```

Jalankan migrasi, seeder, storage link, dan build asset:

```bash
php artisan migrate --seed
php artisan storage:link
npm run build
php artisan serve
```

Untuk development frontend:

```bash
npm run dev
```

## Akun Default

Seeder menyediakan akun awal:

- Admin: `admin` / `password`
- Pegawai: `pegawai` / `password`

Setelah login:

- Role `admin` diarahkan ke `/admin/dashboard`.
- Role `pegawai` diarahkan ke `/pegawai/dashboard`.

## Menu Admin

- Dashboard.
- Surat: Masuk Eksternal, Internal, Arsip Surat.
- Master Data: Direktorat, Divisi, Department, Template Surat, Jenis Surat.
- Administrasi: Users, Role & Hak Akses, Notifikasi.
- Settings.
- Dokumentasi.

Admin mengatur data master, user, template, jenis surat, format nomor surat, notifikasi, log teknis, dan pengaturan dasar aplikasi.

## Menu Pegawai

- Dashboard.
- Inbox Internal.
- Inbox Tebusan.
- Disposisi.
- Buat Surat.
- Arsip Saya.
- Dokumentasi.

Menu `Buat Surat` berisi pilihan:

- Buat Surat Masuk Eksternal.
- Buat Surat Internal.
- Buat Surat Keluar.
- Arsip Scan.

## Nomor Surat Otomatis

Nomor surat diatur dari master `Jenis Surat`. Format default:

```text
{day}-{daily_sequence}/{letter_type_code}/{company_code}/{origin_code}/{roman_month}/{year}
```

Contoh:

```text
08-01/01/BDK/GM-1.3/I/2026
```

Keterangan:

- `08`: tanggal pembuatan atau booking nomor.
- `01`: sequence harian.
- `01`: kode jenis surat.
- `BDK`: kode perusahaan.
- `GM-1.3`: kode asal surat.
- `I`: bulan dalam romawi.
- `2026`: tahun.

Nomor dibooking saat user menekan `Simpan Draft` atau `Send`. User tetap dapat menghapus atau menyesuaikan nomor sebelum submit. Jika nomor otomatis aktif dan field nomor dikosongkan, backend akan membuat nomor saat submit.

## PWA dan Rencana Notifikasi

Aplikasi dibuat installable sebagai PWA dengan strategi aman: aset aplikasi dapat dicache, tetapi data surat tetap membutuhkan koneksi agar akses dan permission selalu terbaru.

Rencana teknis untuk fase notifikasi berikutnya:

- Simpan Web Push subscription per user/perangkat di tabel khusus.
- Gunakan VAPID key dan queue job untuk mengirim push saat surat atau disposisi benar-benar `sent`.
- Kirim email melalui Laravel Notification/Mail sebagai dokumentasi resmi.
- Catat hasil pengiriman ke `notification_logs` dengan channel `web_push` atau `email`, status, error aman, dan timestamp.
- Isi push/email cukup metadata dan link detail; jangan kirim file lampiran atau isi sensitif secara langsung.
- Web Push production wajib HTTPS dan perlu uji perangkat, terutama iOS PWA.

## Troubleshooting

Jika muncul error table missing setelah update:

```bash
php artisan migrate
php artisan db:seed --class=LetterTypeTableSeeder
```

Jika file lampiran tidak bisa dibuka:

```bash
php artisan storage:link
```

Jika upload PDF di atas 2MB gagal dengan pesan `scan_file` atau `The scan file failed to upload`, naikkan limit PHP di `php.ini`. Untuk PHP Homebrew 8.3 biasanya file-nya ada di `/opt/homebrew/etc/php/8.3/php.ini`:

```ini
upload_max_filesize = 10M
post_max_size = 12M
memory_limit = 256M
```

Setelah mengubah `php.ini`, restart server PHP/Laravel yang sedang berjalan. Cek nilai aktif dengan:

```bash
php -i | grep -E "upload_max_filesize|post_max_size|memory_limit"
```

Jika asset React tidak berubah:

```bash
npm run build
```

Jika muncul warning `Module "mongodb" is already loaded`, periksa konfigurasi PHP lokal karena extension tersebut kemungkinan didaftarkan dua kali. Warning ini biasanya tidak menghambat Laravel, tetapi sebaiknya dibersihkan dari konfigurasi PHP.

## Catatan Developer

- Route publik dokumentasi developer: `/developer-docs`.
- Log Viewer admin: `/log-viewer`.
- Route admin dilindungi middleware `auth` dan `role:admin`.
- Route pegawai dilindungi middleware `auth`.
- File upload surat memakai disk `public`.
- Jangan menghapus kolom kode unit organisasi walaupun tidak tampil di UI, karena kode dipakai untuk `origin_code` nomor surat.
