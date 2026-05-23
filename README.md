# Surat & Arsip Digital PT Berdikari

Aplikasi persuratan dan arsip digital berbasis Laravel, Inertia React, dan Tailwind CSS untuk PT Berdikari. Aplikasi ini mengelola surat masuk eksternal, surat internal, surat keluar, arsip scan, disposisi, status baca, template Nota Dinas, nomor surat otomatis, audit trail, dan notifikasi dasar.

## Fitur Utama

- Login satu pintu berbasis username dan password.
- Role akses sederhana: `admin` dan `pegawai`.
- Master organisasi: direktorat, divisi, department, dan pejabat unit.
- Master jenis surat dengan konfigurasi nomor surat otomatis.
- Template surat Nota Dinas untuk surat internal dan surat keluar.
- Portal pegawai untuk inbox internal, tebusan, disposisi, buat surat, dan arsip saya.
- Surat internal dan surat keluar mendukung `Simpan Draft`, `Send`, dan `Hapus Draft`.
- Upload dan preview file scan PDF.
- Read receipt, audit trail, dan notification log.
- Dokumentasi aplikasi:
  - Admin: `/admin/dokumentasi`
  - Pegawai: `/pegawai/dokumentasi`
  - Developer public: `/developer-docs`

## Prasyarat

- PHP 8.2 atau lebih baru.
- Composer.
- Node.js LTS 24.
- NPM.
- PostgreSQL.
- Extension PHP yang umum dipakai Laravel seperti `pdo_pgsql`, `mbstring`, `openssl`, `fileinfo`, dan `json`.

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
- Administrasi: Users, Role & Hak Akses, Audit Trail, Notifikasi.
- Settings.
- Dokumentasi.

Admin mengatur data master, user, template, jenis surat, format nomor surat, audit, notifikasi, dan pengaturan dasar aplikasi.

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

Jika asset React tidak berubah:

```bash
npm run build
```

Jika muncul warning `Module "mongodb" is already loaded`, periksa konfigurasi PHP lokal karena extension tersebut kemungkinan didaftarkan dua kali. Warning ini biasanya tidak menghambat Laravel, tetapi sebaiknya dibersihkan dari konfigurasi PHP.

## Catatan Developer

- Route publik dokumentasi developer: `/developer-docs`.
- Route admin dilindungi middleware `auth` dan `role:admin`.
- Route pegawai dilindungi middleware `auth`.
- File upload surat memakai disk `public`.
- Jangan menghapus kolom kode unit organisasi walaupun tidak tampil di UI, karena kode dipakai untuk `origin_code` nomor surat.
