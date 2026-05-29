# Context Aplikasi SADIKA — Surat dan Arsip Digital Berdikari

## Ringkasan Aplikasi

SADIKA — Surat dan Arsip Digital Berdikari adalah aplikasi web untuk mengelola surat perusahaan secara digital. Aplikasi ini mencakup surat masuk eksternal, surat internal, surat keluar, arsip scan PDF, disposisi, publish surat ke unit organisasi, status baca, dan notifikasi.

Aplikasi dibuat untuk mendukung kebutuhan organisasi yang dinamis. Karena pegawai dapat berpindah posisi, akses bisnis surat sebisa mungkin berbasis unit organisasi seperti direktorat, divisi, department, atau jabatan unit, bukan melekat permanen ke satu orang. User tetap dicatat sebagai aktor aktivitas seperti pembuat surat, pembaca surat, pengirim disposisi, dan penerima notifikasi.

## Stack Teknologi

- Backend: Laravel.
- Frontend: React dengan Inertia.js.
- Styling: Tailwind CSS.
- Database utama: PostgreSQL.
- Build frontend: Vite.
- PWA: tersedia untuk mode installable.
- Auth dan permission: login satu pintu dengan role `admin` dan `pegawai`, serta permission berbasis Spatie.

## Role Pengguna

### Admin

Admin mengelola data master dan administrasi sistem:

- Dashboard admin.
- Master direktorat, divisi, department.
- Master user, role, permission.
- Master jenis surat.
- Setting aplikasi dan field wajib.
- Daftar surat semua tipe.
- Disposisi admin.
- Notifikasi dan monitoring dasar.

### Pegawai

Pegawai menggunakan portal kerja harian:

- Dashboard pegawai.
- Inbox internal.
- Inbox tebusan.
- Daftar disposisi.
- Buat surat.
- Arsip saya.
- Notifikasi.
- Detail surat dan thread disposisi.

## Jenis Surat

### Surat Masuk Eksternal

Surat dari pihak luar perusahaan.

Karakter utama:

- Nomor surat memakai nomor yang diinput user dari dokumen eksternal.
- Nomor internal seperti `BDK-EXT-...` tetap disimpan sebagai `reference`, tetapi tidak menjadi nomor utama di UI.
- Pembuat dapat publish surat ke department, divisi, atau direktorat.
- Surat dapat didisposisikan ke unit/jabatan.
- Detail surat masuk eksternal disederhanakan agar tidak menonjolkan status surat, target, dan tembusan.

### Surat Internal

Surat antar unit internal perusahaan.

Karakter utama:

- Dibuat dengan upload scan PDF.
- Mendukung draft dan send.
- Memiliki tujuan dan tembusan internal.
- Asal surat dipilih dari direktorat, divisi, atau department user.
- Jika asal surat dipilih dari divisi, user pada divisi tersebut dapat melihat surat.
- Jika asal surat dipilih dari department, user pada department tersebut dapat melihat surat.

### Surat Keluar

Surat perusahaan untuk pihak eksternal.

Karakter utama:

- Dibuat dengan upload scan PDF.
- Memiliki tujuan eksternal berupa nama instansi/perusahaan.
- Memiliki tembusan internal.
- Nomor utama di UI memakai `letter_number`, bukan `reference` internal seperti `BDK-OUT-...`.
- Detail surat keluar tidak menampilkan status di metadata.
- Detail surat keluar hanya menampilkan panel tembusan, bukan panel tujuan internal.
- Dapat dipublish ke department, divisi, atau direktorat.

### Arsip Scan

Dokumen scan yang disimpan sebagai arsip.

Karakter utama:

- Disimpan melalui form arsip.
- Dapat dipublish ke department, divisi, atau direktorat.
- Dapat tampil di Arsip Saya sesuai akses user.

## Konsep Nomor Surat

Ada dua konsep nomor:

- `letter_number`: nomor surat publik yang dilihat user.
- `reference`: nomor internal sistem, misalnya `BDK-OUT-...`, `BDK-EXT-...`, atau `BDK-ARS-...`.

UI sebaiknya memakai `letter_number` sebagai nomor utama. `reference` dipertahankan untuk kebutuhan internal seperti relasi lama, path storage, dan identitas teknis aplikasi.

Nomor surat diisi manual oleh user. Sistem tidak lagi melakukan preview atau generator nomor otomatis.

## Konsep Organisasi

Struktur organisasi utama:

- Direktorat.
- Divisi.
- Department.

Setiap unit dapat memiliki pejabat:

- Direktur di direktorat.
- General Manager di divisi.
- Manager di department.

User memiliki mapping aktif ke direktorat, divisi, dan department. Mapping ini menjadi dasar akses dinamis.

## Konsep Akses Surat

Akses surat dapat berasal dari:

- User pembuat surat.
- Target surat internal.
- Tembusan surat.
- Publish surat ke unit.
- Target disposisi.
- Asal surat internal berdasarkan unit asal.

Karena akses mengikuti unit dan jabatan, jika seorang user pindah department/divisi, akses berbasis unit akan mengikuti posisi terbaru user tersebut.

## Publish Surat

Publish adalah fitur untuk membagikan surat ke unit organisasi.

Berlaku untuk:

- Surat masuk eksternal.
- Surat keluar.
- Arsip.

Target publish:

- Department.
- Divisi.
- Direktorat.

Publish dapat dicabut kapanpun oleh pembuat surat. Jika publish dicabut, akses target tersebut ikut hilang.

## Disposisi

Disposisi adalah instruksi atau catatan lanjutan terhadap surat.

Karakter utama:

- Disposisi berbasis target unit/jabatan.
- Disposisi dapat dibuat bertingkat dengan `parent_id`.
- Balasan disposisi dibuat sebagai child dari disposisi sebelumnya.
- User hanya dapat membalas disposisi yang memang ditujukan kepadanya berdasarkan unit/jabatan aktif.
- Thread disposisi ditampilkan bertingkat.
- Status proses seperti Diproses/Selesai tidak lagi ditonjolkan di UI pegawai.
- Status baca disposisi tetap dicatat dengan `read_at`.

## Status Baca

Status baca surat dicatat di `letter_read_receipts`.

Aturan utama:

- Pembuat surat tidak dimasukkan sebagai pembaca.
- Saat user target membuka detail surat, sistem membuat atau memperbarui status baca.
- Status baca detail dapat menampilkan user yang sudah membaca maupun belum membaca, tergantung target surat/publish/tembusan.

Untuk surat keluar, status baca mengikuti user yang masuk tembusan internal.

## Notifikasi

Notifikasi disimpan di `notification_logs`.

Notifikasi dibuat saat:

- Surat internal atau surat keluar dikirim ke target/tembusan.
- Surat dipublish ke unit.
- Disposisi dibuat.

Notifikasi dibaca saat user membuka notifikasi dari menu/bell notifikasi.

## Struktur Kode Utama

Backend:

- `routes/web.php`: definisi route aplikasi.
- `app/Http/Controllers/Admin`: controller admin.
- `app/Http/Controllers/Pegawai/PortalController.php`: controller utama portal pegawai.
- `app/Models`: model Eloquent.
- `app/Services`: logic domain seperti disposisi dan field requirement.
- `database/migrations`: struktur database.
- `database/seeders`: data awal.

Frontend:

- `resources/js/app.jsx`: entry point Inertia React.
- `resources/js/Layouts`: layout admin, pegawai, auth.
- `resources/js/Pages/Admin`: halaman admin.
- `resources/js/Pages/Pegawai/Portal/Workspace.jsx`: halaman utama pegawai.
- `resources/js/Shared`: komponen reusable.

Dokumentasi teknis:

- `docs/README.md`: indeks dokumentasi teknis.
- `docs/architecture.md`: arsitektur.
- `docs/backend.md`: controller dan service.
- `docs/data-model.md`: model dan database.
- `docs/workflows.md`: alur bisnis.
- `docs/frontend.md`: frontend.
- `docs/operations.md`: operasional.
- `docs/controllers-reference.md`: referensi fungsi controller.

## Prinsip Pengembangan

Saat mengubah aplikasi ini:

- Gunakan `letter_number` sebagai nomor yang ditampilkan ke user.
- Jangan gunakan `reference` sebagai nomor publik kecuali untuk debugging teknis.
- Pertahankan akses berbasis unit/jabatan untuk kebutuhan organisasi dinamis.
- Simpan user sebagai aktor aktivitas, bukan sebagai satu-satunya pemilik bisnis surat.
- Jika menambah jenis akses baru, pastikan status baca dan notifikasi ikut dipertimbangkan.
- Jika menambah field baru, cek validasi backend, form React, migration, dan dokumentasi teknis.

## Catatan Testing

Verifikasi minimal setelah perubahan kode:

```bash
php -l path/file.php
npm run build
php artisan test
```

Jika `php artisan test` gagal dengan error tabel `settings` tidak ditemukan, penyebabnya biasanya environment test belum menjalankan migration/seed settings yang dibutuhkan middleware Inertia.
