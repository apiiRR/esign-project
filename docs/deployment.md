# Deployment dan Operasional

Dokumen ini menjelaskan cara menjalankan aplikasi Surat dan Arsip Digital Berdikari di local development dan production Docker.

## Local Development

Local development tetap memakai PHP dan Vite langsung di mesin developer.

1. Siapkan dependency:

```bash
composer install
npm install
cp .env.local.example .env
php artisan key:generate
php artisan migrate
```

2. Jalankan backend dan frontend di terminal berbeda:

```bash
php artisan serve
npm run dev
```

3. Jika ingin memproses queue lokal:

```bash
php artisan queue:work
```

Alternatifnya, jalankan script bawaan project:

```bash
composer dev
```

## Production Docker di VM Ubuntu

Production memakai Docker Compose dengan service:

- `nginx`: web server HTTP.
- `app`: PHP-FPM Laravel.
- `queue`: worker untuk email, OTP, dan job background.
- `scheduler`: scheduler Laravel.
- `postgres`: PostgreSQL dengan named volume.

### 1. Install Docker

Di Ubuntu, install Docker Engine dan Docker Compose Plugin:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git openssl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Logout/login ulang agar group `docker` aktif. Jika belum logout, command Docker masih bisa dijalankan dengan `sudo`.

Pastikan command ini berjalan:

```bash
docker --version
docker compose version
```

Clone project ke VM:

```bash
git clone <repo-project> ~/esign-project
cd ~/esign-project
```

### 2. Siapkan Environment Production

Copy env production:

```bash
cp .env.production.example .env.production
```

Edit nilai penting:

```env
APP_NAME="Surat dan Arsip Digital Berdikari"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://domain-anda.com
ASSET_URL=https://domain-anda.com
APP_HTTP_PORT=8080

APP_KEY=base64:isi-dengan-key-production

DB_DATABASE=surat_digital
DB_USERNAME=surat_user
DB_PASSWORD=password-kuat
```

Generate `APP_KEY` paling aman di VM tanpa perlu `vendor/` atau `composer install`:

```bash
openssl rand -base64 32
```

Masukkan hasilnya ke `.env.production` dengan prefix `base64:`:

```env
APP_KEY=base64:HASIL_OPENSSL_DI_SINI
```

Simpan nilai `APP_KEY` production dan jangan diganti setelah aplikasi berjalan. Key ini dipakai untuk enkripsi data, termasuk password SMTP di Settings.

Jangan menjalankan command ini sebelum dependency/container siap:

```bash
php artisan key:generate --show
```

Command tersebut membutuhkan `vendor/autoload.php`. Di production Docker, semua command Laravel sebaiknya dijalankan dari service `app` setelah image selesai dibuild.

Email SMTP bisa diatur dari halaman Admin Settings. `.env.production` tetap perlu `APP_URL` yang benar agar link verifikasi QR dan link aplikasi valid.

Panduan lengkap pengisian SMTP, termasuk contoh Gmail `smtp.gmail.com`, ada di `docs/operations.md` bagian `Mengaktifkan SMTP Email Notifikasi`.

### 3. Build dan Start Container

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Jalankan migration dari container `app`:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
```

Jika perlu seed awal:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan db:seed --force
```

Optimasi cache Laravel:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:cache
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan route:cache
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan view:cache
```

Buka aplikasi:

```text
http://IP-VM:8080
```

Jika memakai domain dan reverse proxy, arahkan reverse proxy ke port `APP_HTTP_PORT`.

## Catatan Composer dan APP_KEY di VM

Untuk project ini, hindari menjalankan `composer:2 install` hanya untuk generate `APP_KEY`. Image `composer:2` standar belum tentu punya ekstensi PHP yang dibutuhkan project, misalnya `ext-gd`. Error yang mungkin muncul:

```text
phpoffice/phpspreadsheet requires ext-gd
setasign/fpdf requires ext-gd
```

Itu normal jika memakai image Composer generik. Cara yang direkomendasikan:

1. Generate `APP_KEY` dengan `openssl rand -base64 32`.
2. Build image production project dengan Docker Compose.
3. Jalankan `php artisan` hanya dari container `app`.

Jika muncul error berikut:

```text
vendor/autoload.php: No such file or directory
```

Artinya dependency belum tersedia di environment tempat command dijalankan. Jangan jalankan `php artisan` dari host atau image `php:8.3-cli` mentah. Jalankan dari container app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan about
```

Jika muncul warning Git:

```text
fatal: detected dubious ownership in repository
```

Tambahkan safe directory di host:

```bash
git config --global --add safe.directory ~/esign-project
```

Jika command memakai `sudo`, gunakan:

```bash
sudo git config --global --add safe.directory /home/<user>/esign-project
```

## Command Operasional

Lihat status container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
```

Lihat log aplikasi:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f app
```

Lihat log queue:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f queue
```

Masuk ke container app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app sh
```

Restart worker queue setelah deploy:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan queue:restart
```

## Troubleshooting Cache dan Route Production

Jika log production menampilkan error berikut:

```text
SQLSTATE[42P01]: Undefined table: relation "cache" does not exist
select * from "cache" where "key" in (... queue:restart)
```

Artinya aplikasi memakai `CACHE_STORE=database`, tetapi migration tabel cache belum berhasil dijalankan pada database production yang sedang dipakai. Project ini sudah memiliki migration `create_cache_table`, jadi jangan membuat tabel manual. Jalankan:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan optimize:clear
docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler
```

Dengan `sudo`:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan optimize:clear
sudo docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler
```

Verifikasi tabel inti sudah ada:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan tinker --execute="dump(Schema::hasTable('cache'), Schema::hasTable('jobs'), Schema::hasTable('sessions'))"
```

Jika log menampilkan error berikut:

```text
require(/var/www/html/bootstrap/cache/routes-v7.php): Failed to open stream: No such file or directory
```

Artinya cache route/config di container mengarah ke file lama yang sudah tidak ada. Bersihkan cache lalu buat ulang:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan optimize:clear
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:cache
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan route:cache
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan view:cache
docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler nginx
```

Jika sedang debug error submit dokumen, jalankan sementara tanpa cache:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan optimize:clear
docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler nginx
```

Setelah error selesai, aktifkan lagi cache dengan `config:cache`, `route:cache`, dan `view:cache`.

## Update Aplikasi

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan queue:restart
```

## Reset atau Refresh Data Production

Gunakan langkah ini jika production baru dipakai untuk testing dan ingin mengembalikan database ke kondisi awal seperti fresh install.

Peringatan: command ini akan menghapus seluruh data database production. Jalankan hanya jika data test memang boleh dihapus.

### 1. Backup Sebelum Reset

Sesuaikan `DB_USERNAME` dan `DB_DATABASE` dengan nilai di `.env.production`.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U surat_user surat_digital > backup-before-reset.sql
```

Jika command memakai `sudo` di VM:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U surat_user surat_digital > backup-before-reset.sql
```

### 2. Reset Database dan Seed Ulang

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate:fresh --seed --force
```

Dengan `sudo`:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate:fresh --seed --force
```

### 3. Restart Queue

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan queue:restart
```

Dengan `sudo`:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan queue:restart
```

### 4. Opsional: Hapus File Upload Test

Database reset tidak otomatis menghapus file PDF/logo/signature yang sudah tersimpan di storage. Jika ingin membersihkan file test juga, masuk ke container app:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app sh
```

Dengan `sudo`:

```bash
sudo docker compose --env-file .env.production -f docker-compose.prod.yml exec app sh
```

Lalu jalankan di dalam container:

```bash
rm -rf storage/app/public/letters/*
rm -rf storage/app/public/surat/*
rm -rf storage/app/public/signatures/*
rm -rf storage/app/private/tmp/downloads/*
exit
```

Jangan hapus `storage/app/public/settings/*` jika ingin mempertahankan logo aplikasi dan file contoh watermark yang sudah diupload dari halaman Settings.

### 5. Refresh Cache Setelah Reset

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:clear
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:cache
docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler nginx
```

## Backup dan Restore PostgreSQL

Backup database:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec postgres pg_dump -U surat_user surat_digital > backup.sql
```

Restore database:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres psql -U surat_user surat_digital < backup.sql
```

Backup file upload:

```bash
docker run --rm -v surat-desa-react_app_storage:/data -v "$PWD":/backup alpine tar czf /backup/storage-backup.tar.gz -C /data .
```

Restore file upload:

```bash
docker run --rm -v surat-desa-react_app_storage:/data -v "$PWD":/backup alpine sh -c "cd /data && tar xzf /backup/storage-backup.tar.gz"
```

Nama volume bisa berbeda mengikuti nama folder project. Cek dengan:

```bash
docker volume ls
```

## SSL, Cloudflare Tunnel, dan Domain

Container `nginx` hanya expose HTTP internal/VM. SSL sebaiknya ditangani oleh salah satu opsi berikut:

- Cloudflare proxy.
- Cloudflare Tunnel atau `cloudflared`.
- Caddy di host VM.
- Nginx Proxy Manager.
- Nginx host dengan Certbot.

Pastikan `APP_URL` memakai domain final, misalnya:

```env
APP_URL=https://surat.perusahaan.com
ASSET_URL=https://surat.perusahaan.com
```

Jika memakai Cloudflare Tunnel, arahkan tunnel ke service HTTP container, misalnya:

```yaml
ingress:
  - hostname: sadika.ptberdikari.co.id
    service: http://127.0.0.1:8080
  - service: http_status:404
```

Laravel sudah dikonfigurasi untuk mempercayai header `X-Forwarded-*` dari proxy dan memaksa scheme HTTPS ketika `APP_ENV=production` serta `APP_URL` memakai `https://`. Setelah mengubah `.env.production`, refresh cache konfigurasi:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:clear
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan config:cache
docker compose --env-file .env.production -f docker-compose.prod.yml restart app queue scheduler nginx
```

## Preview PDF dan MIME Asset

Preview PDF tanda tangan memakai PDF.js worker dari hasil build Vite, misalnya `/build/assets/pdf.worker.min-xxxx.mjs`. Browser modern menolak module worker jika server mengirim file `.mjs` sebagai `application/octet-stream`.

Setelah deploy atau rebuild image, pastikan container `nginx` sudah memakai konfigurasi terbaru:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml build nginx
docker compose --env-file .env.production -f docker-compose.prod.yml up -d nginx
```

Verifikasi header worker PDF.js:

```bash
curl -I https://sadika.ptberdikari.co.id/build/assets/pdf.worker.min-xxxx.mjs
```

Header yang benar harus berisi:

```text
Content-Type: application/javascript
```

Jika console browser masih menampilkan asset lama seperti `app-CnDshirL.js` atau worker lama setelah deploy, lakukan purge cache Cloudflare dan hard refresh browser. Untuk PWA/service worker, tutup semua tab aplikasi lalu buka ulang, atau unregister service worker dari DevTools jika cache lama masih tertahan.

## Catatan Queue

Production menjalankan service `queue` terus-menerus. Service ini memproses job background seperti email, OTP, dan proses lain yang nantinya masuk queue. Jika email tidak terkirim, cek:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f queue
```

Jika queue gagal karena migrasi tabel queue belum ada, jalankan:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
```

## Checklist Production

- `.env.production` sudah berisi `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL`, `ASSET_URL`, `APP_KEY`, dan kredensial database.
- `APP_KEY` dibuat sekali dan disimpan aman.
- Container `nginx`, `app`, `queue`, `scheduler`, dan `postgres` statusnya `running`.
- Migration dan seeder berhasil dijalankan.
- Queue worker berjalan untuk email/OTP.
- Domain/SSL mengarah ke `APP_HTTP_PORT`.
- Preview PDF.js worker mengirim MIME `application/javascript`.
- Backup database dan storage sudah dijadwalkan.

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY` sudah terisi dan disimpan aman
- `APP_URL` sesuai domain final
- `DB_PASSWORD` kuat
- `docker compose ... ps` semua service `Up`
- migration sudah dijalankan
- upload PDF berhasil
- approval OTP berhasil
- test email dari Admin Settings berhasil
- backup database dan storage sudah dijadwalkan
