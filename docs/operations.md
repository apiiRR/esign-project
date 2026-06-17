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

## Mengaktifkan SMTP Email Notifikasi

Email notifikasi dan OTP tanda tangan diatur dari halaman:

```text
Admin > Settings > Email Notifikasi dan OTP
```

Field SMTP yang perlu diisi:

- `Aktifkan email`: switch utama untuk mengaktifkan semua pengiriman email.
- `Email surat masuk`: mengirim email untuk surat tujuan, tembusan, publish, dan disposisi.
- `Email approval TTE`: mengirim email untuk tugas paraf/tanda tangan.
- `Wajib OTP approve/reject`: signer wajib memasukkan OTP dari email saat approve atau reject.
- `Mailer`: biasanya `smtp`.
- `SMTP Host`: alamat server SMTP.
- `SMTP Port`: port SMTP.
- `Username SMTP`: username akun email.
- `Password SMTP`: password SMTP atau app password.
- `Encryption`: `TLS`, `SSL`, atau `None`.
- `From Address`: alamat pengirim email aplikasi.
- `From Name`: nama pengirim yang tampil di email.

Urutan aktivasi SMTP:

1. Pastikan setiap user penerima email punya alamat email yang valid.
2. Isi konfigurasi SMTP di Admin Settings.
3. Aktifkan switch `Aktifkan email`.
4. Aktifkan jenis email yang diperlukan, misalnya `Email surat masuk` dan `Email approval TTE`.
5. Jika OTP diperlukan untuk paraf/tanda tangan, aktifkan `Wajib OTP approve/reject`.
6. Klik `Kirim Test Email` ke alamat email Anda sendiri.
7. Jika test email berhasil, simpan setting.
8. Coba trigger notifikasi asli, misalnya disposisi atau approval TTE.

### Contoh SMTP Gmail

Untuk Gmail, gunakan App Password, bukan password login Gmail biasa.

Konfigurasi:

```text
Mailer: smtp
SMTP Host: smtp.gmail.com
SMTP Port: 587
Username SMTP: namaakun@gmail.com
Password SMTP: app password 16 karakter dari Google
Encryption: tls
From Address: namaakun@gmail.com
From Name: SADIKA
```

Pada backend Laravel/Symfony Mailer, pilihan UI `TLS` diterjemahkan menjadi scheme `smtp`. Ini benar untuk Gmail port `587` karena koneksi memakai STARTTLS.

Alternatif port SSL:

```text
SMTP Port: 465
Encryption: ssl
```

Pada backend, pilihan UI `SSL` diterjemahkan menjadi scheme `smtps`. Jangan mengisi scheme backend dengan `tls`, karena Symfony Mailer hanya menerima `smtp` atau `smtps` untuk mailer SMTP.

Urutan membuat Gmail App Password:

1. Login ke akun Google yang akan dipakai sebagai pengirim.
2. Buka `Google Account > Security`.
3. Aktifkan `2-Step Verification` jika belum aktif.
4. Buka `App passwords`.
5. Buat app password baru untuk aplikasi email/SADIKA.
6. Copy app password 16 karakter yang diberikan Google.
7. Masukkan app password tersebut ke field `Password SMTP`.
8. Jalankan `Kirim Test Email` dari Admin Settings.

Catatan Gmail:

- App Password hanya muncul sekali saat dibuat. Simpan di password manager.
- Jika memakai Google Workspace perusahaan, admin Google Workspace bisa membatasi App Password.
- Jika test email gagal, cek ulang 2-Step Verification, App Password, port, encryption, dan alamat `From Address`.

### Troubleshooting SMTP

Jika email tidak terkirim:

1. Pastikan `Aktifkan email` menyala.
2. Pastikan toggle jenis email terkait menyala.
3. Pastikan `From Address` sesuai akun SMTP.
4. Pastikan password SMTP benar.
5. Cek log Laravel:

```bash
tail -f storage/logs/laravel.log
```

Jika production memakai Docker, cek log queue:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f queue
```

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
