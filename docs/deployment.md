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

Di Ubuntu, install Docker Engine dan Docker Compose Plugin mengikuti dokumentasi resmi Docker. Setelah selesai, pastikan command ini berjalan:

```bash
docker --version
docker compose version
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

Generate `APP_KEY` bisa dilakukan dari mesin lokal atau container sementara. Yang penting nilai `APP_KEY` production harus disimpan dan tidak berubah, karena dipakai untuk enkripsi data seperti password SMTP.

Email SMTP bisa diatur dari halaman Admin Settings. `.env.production` tetap perlu `APP_URL` yang benar agar link verifikasi QR dan link aplikasi valid.

Panduan lengkap pengisian SMTP, termasuk contoh Gmail `smtp.gmail.com`, ada di `docs/operations.md` bagian `Mengaktifkan SMTP Email Notifikasi`.

### 3. Build dan Start Container

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Jalankan migration:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
```

Jika perlu seed awal:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan db:seed --force
```

Buka aplikasi:

```text
http://IP-VM:8080
```

Jika memakai domain dan reverse proxy, arahkan reverse proxy ke port `APP_HTTP_PORT`.

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

## Update Aplikasi

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.prod.yml exec app php artisan queue:restart
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
