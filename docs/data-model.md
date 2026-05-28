# Model dan Database

## Organisasi dan User

### `directorates`

Menyimpan direktorat.

Field penting:

- `name`: nama direktorat.
- `code`: kode unik untuk nomor surat.
- `director_user_id`: user yang menjadi direktur.
- `status`: active/inactive.

Model: `App\Models\Directorate`

Relasi:

- `divisions()`: daftar divisi di bawah direktorat.
- `director()`: user direktur.

### `divisions`

Menyimpan divisi.

Field penting:

- `directorate_id`: induk direktorat.
- `name`, `code`.
- `gm_user_id`: user General Manager.
- `status`.

Model: `App\Models\Division`

Relasi:

- `directorate()`
- `departments()`
- `generalManager()`

### `departments`

Menyimpan department.

Field penting:

- `division_id`: induk divisi.
- `name`, `code`.
- `manager_user_id`: user manager.
- `status`.

Model: `App\Models\Department`

Relasi:

- `division()`
- `manager()`

### `users`

Menyimpan akun admin dan pegawai.

Field penting:

- `username`, `name`, `email`, `password`.
- `role`: admin atau pegawai.
- `directorate_id`, `division_id`, `department_id`: posisi organisasi user saat ini.
- `position`: label jabatan.
- `status`: active/inactive.
- `last_login_at`.

Model: `App\Models\User`

Relasi:

- `directorate()`
- `division()`
- `department()`

Catatan:

- Mapping user ke unit dipakai untuk akses dinamis.
- Jika user pindah unit, akses berbasis unit mengikuti posisi terbaru.

## Surat

### `letter_types`

Menyimpan master jenis surat.

Field penting:

- `name`, `description`.
- `status`.

Model: `App\Models\LetterType`

Relasi:

- `letters()`

### `letters`

Tabel utama semua surat.

Field penting:

- `type`: incoming_external, outgoing, internal, dan secara kode baru juga dipakai untuk archive.
- `letter_type_id`.
- `created_by`: user pembuat.
- `origin_directorate_id`, `origin_division_id`, `origin_department_id`.
- `title`, `subject`.
- `letter_number`: nomor publik yang seharusnya ditampilkan ke user.
- `reference`: ID internal aplikasi, contoh `BDK-OUT-...`.
- `page_count`.
- `status`: draft, sent, received, disposed, archived, rejected.
- `payload`: metadata tambahan.
- `meta`: metadata teknis.

Model: `App\Models\Letter`

Relasi:

- `creator()`
- `letterType()`
- `targets()`
- `attachments()`
- `dispositions()`
- `readReceipts()`

Catatan nomor:

- `letter_number` adalah nomor dokumen yang ditampilkan.
- `reference` tetap disimpan sebagai ID internal agar path file dan relasi lama aman.

### `letter_targets`

Menyimpan tujuan dan tembusan surat.

Field penting:

- `letter_id`
- `kind`: recipient atau cc.
- `target_type`: user, division, department, directorate, division_gm, department_manager.
- `target_id`: ID target.

Model: `App\Models\LetterTarget`

Relasi:

- `letter()`

Catatan:

- Untuk surat internal, `recipient` adalah tujuan utama dan `cc` adalah tembusan.
- Untuk surat keluar, `cc` dipakai sebagai tembusan internal.
- Untuk publish surat masuk eksternal/surat keluar/arsip, target juga disimpan sebagai `recipient`.

### `letter_attachments`

Menyimpan file lampiran/scan.

Field penting:

- `letter_id`
- `file_name`
- `file_path`
- `mime_type`
- `size`

Model: `App\Models\LetterAttachment`

Relasi:

- `letter()`

File disimpan di disk `public`, biasanya di path `surat/{reference}`.

### `letter_read_receipts`

Menyimpan status baca surat.

Field penting:

- `letter_id`
- `user_id`
- `read_at`

Model: `App\Models\LetterReadReceipt`

Relasi:

- `user()`

Constraint:

- Unique per `letter_id` dan `user_id`.

## Disposisi

### `dispositions`

Menyimpan disposisi dan balasan disposisi.

Field penting:

- `parent_id`: parent untuk thread/balasan.
- `letter_id`.
- `from_user_id`: aktor pengirim.
- `from_directorate_id`, `from_division_id`, `from_department_id`: snapshot unit pengirim.
- `target_type`, `target_id`: target unit/jabatan.
- `note`.
- `status`: masih ada untuk kompatibilitas data, tetapi UI pegawai tidak memakai Diproses/Selesai.
- `read_at`: kapan target membuka disposisi.
- `completed_at`: kompatibilitas data lama.

Model: `App\Models\Disposition`

Relasi:

- `letter()`
- `fromUser()`
- `parent()`
- `replies()`
- `fromDirectorate()`
- `fromDivision()`
- `fromDepartment()`

## Notifikasi

### `notification_logs`

Menyimpan notifikasi web.

Field penting:

- `user_id`
- `letter_id`
- `channel`: saat ini web.
- `title`, `body`.
- `sent_at`
- `read_at`

Model: `App\Models\NotificationLog`

Relasi:

- `user()`
- `letter()`

## Settings

### `settings`

Menyimpan konfigurasi global aplikasi.

Field penting:

- `app_name`
- `company_name`
- `company_code`
- `company_logo`
- `letter_field_requirements`

Model: `App\Models\Setting`

Catatan:

- `letter_field_requirements` mengatur field apa saja yang wajib di tiap konteks surat.
- Jika test memakai SQLite memory tanpa migration settings, halaman root bisa gagal karena shared Inertia membaca tabel ini.
