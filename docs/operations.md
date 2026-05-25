# Operasional dan Troubleshooting

## Setup Lokal

Install dependency:

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
```

Konfigurasi database di `.env`, contoh PostgreSQL:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=surat_berdikari
DB_USERNAME=postgres
DB_PASSWORD=password
```

Jalankan migration, seeder, storage link, dan build:

```bash
php artisan migrate --seed
php artisan storage:link
npm run build
php artisan serve
```

Development frontend:

```bash
npm run dev
```

## Command Harian

Lint PHP file tertentu:

```bash
php -l app/Http/Controllers/Pegawai/PortalController.php
```

Build frontend:

```bash
npm run build
```

Test Laravel:

```bash
php artisan test
```

Reset database lokal:

```bash
php artisan migrate:fresh --seed
```

## Storage File Surat

Lampiran PDF disimpan di disk public:

```text
storage/app/public/surat/{reference}
```

Agar bisa diakses browser:

```bash
php artisan storage:link
```

URL file dari frontend:

```text
/storage/{file_path}
```

## Upload PDF

Batas upload aplikasi saat ini 10 MB.

Jika upload gagal dengan pesan generic PHP:

1. Naikkan `upload_max_filesize`.
2. Naikkan `post_max_size`.
3. Pastikan `post_max_size` lebih besar dari `upload_max_filesize`.

Contoh:

```ini
upload_max_filesize = 10M
post_max_size = 12M
memory_limit = 256M
```

Restart server PHP setelah mengubah `php.ini`.

## Nomor Surat

Nomor publik disimpan di `letters.letter_number`.

Reference internal disimpan di `letters.reference`, contoh:

- `BDK-INT-...`
- `BDK-OUT-...`
- `BDK-EXT-...`
- `BDK-ARS-...`

Reference dipakai untuk kebutuhan internal seperti path file dan relasi lama. UI sebaiknya menampilkan `letter_number`, bukan `reference`, kecuali memang sedang menampilkan ID internal untuk debugging.

## PWA

Build PWA dihasilkan dari Vite.

File build berada di:

```text
public/build
```

Jika asset tidak berubah:

```bash
npm run build
```

## Testing Known Issue

Saat dokumentasi ini dibuat, `php artisan test` dapat gagal pada test feature default dengan error:

```text
SQLSTATE[HY000]: General error: 1 no such table: settings
```

Penyebab:

- Test memakai SQLite connection yang belum menjalankan migration/seed `settings`.
- Middleware Inertia membaca tabel `settings` untuk shared props.

Solusi yang disarankan:

- Tambahkan trait `RefreshDatabase` pada feature test yang mengakses route web.
- Pastikan migration `settings` berjalan di environment test.
- Seed atau factory row `settings` sebelum request test.

## Debugging Akses Surat

Jika user bisa/tidak bisa melihat surat secara tidak sesuai:

1. Cek `letters.created_by`.
2. Cek `letters.type`, `status`, dan `meta.mode`.
3. Cek `origin_directorate_id`, `origin_division_id`, `origin_department_id`.
4. Cek `letter_targets` untuk recipient/cc/publish.
5. Cek `dispositions` apakah targetnya match user.
6. Cek posisi user aktif: `directorate_id`, `division_id`, `department_id`.

Helper akses utama ada di:

- `PortalController::canAccessLetter`
- `PortalController::targetMatches`
- `PortalController::originMatches`
- `PortalController::archiveLetters`

## Debugging Disposisi

Jika tombol balas/teruskan tidak muncul:

1. Cek target disposisi di `dispositions.target_type` dan `target_id`.
2. Cek posisi user aktif.
3. Cek helper `PortalController::dispositionTargetsUser`.
4. Cek atribut runtime `can_reply` dan `can_forward` dari `annotateDispositionActions`.

## Debugging Notifikasi

Notifikasi disimpan di `notification_logs`.

Jika badge tidak sesuai:

1. Cek `notification_logs.user_id`.
2. Cek `notification_logs.read_at`.
3. Cek query `baseProps()` di `PortalController`.

## Checklist Setelah Perubahan Kode

Minimal jalankan:

```bash
php -l path/file.php
npm run build
```

Jika perubahan menyentuh database atau akses:

```bash
php artisan test
```

Jika ada migration baru:

```bash
php artisan migrate
```
