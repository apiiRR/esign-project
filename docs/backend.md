# Backend Laravel

## Controller Umum

### `DocumentationController`

Controller sederhana untuk halaman dokumentasi:

- `admin()`: render dokumentasi admin.
- `user()`: render dokumentasi user.
- `developer()`: render dokumentasi developer publik.

### `Admin\Auth\LoginController`

Mengelola login satu pintu:

- `index()`: menampilkan halaman login.
- `store(Request)`: validasi credential, login user, update `last_login_at`, redirect berdasarkan role.
- `logout(Request)`: logout, invalidate session, regenerate token.

## Controller Admin

### `Admin\DashboardController`

- `index()`: mengambil statistik admin seperti jumlah surat, user, disposisi aktif, dan data dashboard.

### `Admin\LetterController`

Controller utama surat sisi admin.

Fungsi publik:

- `index(Request, string $type)`: daftar surat berdasarkan tipe route admin.
- `create(string $mode)`: form pembuatan surat.
- `store(Request)`: validasi, buat surat, simpan target/tembusan, lampiran, dan notifikasi.
- `show(Letter, DispositionService)`: detail surat admin.
- `update(Request, Letter)`: update nomor/status surat.
- `destroyDraft(Request, Letter)`: hapus draft dan lampirannya.

Fungsi privat:

- `mapType(string)`: mapping label route ke `letters.type`.
- `typeLabel(string)`: label UI.
- `resolveTargetUsers(Collection)`: resolve target unit/jabatan ke user penerima.
- `targetOptions()`: options organisasi untuk picker.
- `uploadValidationMessages()`: pesan validasi upload PDF.
- `logUploadValidationFailure()`: logging error upload.

Catatan:

- Admin dapat melihat seluruh thread disposisi.
- Admin memakai `DispositionService` untuk membuat disposisi.

### `Admin\DispositionController`

Mengelola disposisi dari sisi admin.

- `index(DispositionService)`: daftar disposisi dan options target.
- `store(Request, DispositionService)`: buat disposisi baru dari admin.
- `update(Request, Disposition)`: update status/catatan disposisi.

### `Admin\OrganizationController`

CRUD master organisasi.

- `index(Request, string $type)`: daftar direktorat/divisi/department.
- `store(Request, string $type)`: tambah data organisasi.
- `update(Request, string $type, int $id)`: update data organisasi.
- `destroy(string $type, int $id)`: hapus data organisasi.
- `validatePayload(Request, string $type)`: validasi sesuai tipe organisasi.
- `uniqueCode(string $model, string $name)`: membuat kode unik.

### `Admin\UserController`

CRUD user admin/user.

- `index()`: daftar user dengan filter.
- `create()`: form user.
- `store(Request)`: buat user dan sinkronkan pejabat organisasi jika diperlukan.
- `edit(User)`: form edit.
- `update(Request, User)`: update user.
- `destroy(User)`: hapus user.
- `formOptions()`: options direktorat/divisi/department.
- `validateOfficerUnit(Request)`: validasi konsistensi jabatan pejabat unit.
- `syncOrganizationOfficer(User)`: update `director_user_id`, `gm_user_id`, atau `manager_user_id`.

### `Admin\SettingController`

- `index()`: tampilkan setting aplikasi.
- `update(Request)`: update nama app, company, logo, dan requirement field surat.
- `setting()`: ambil atau buat row setting.

### `Admin\LetterTypeController`

CRUD jenis surat:

- `index()`
- `store(Request)`
- `update(Request, LetterType)`
- `destroy(LetterType)`

### `Admin\NotificationController`

- `index()`: daftar log notifikasi dengan filter read/unread.

### `Admin\PermissionController` dan `Admin\RoleController`

CRUD permission dan role berbasis package Spatie Permission.

## Controller User: `PortalController`

`PortalController` adalah controller terbesar untuk portal user.

### Rendering halaman

- `workspace(Request, string $section, ?string $mode)`
  Mengembalikan halaman `User/Portal/Workspace` dengan props sesuai section:
  dashboard, inbox, disposisi, archive, notifications, create, detail.

- `detail(Request, Letter, DispositionService)`
  Validasi akses surat, buat read receipt, update `read_at` disposisi yang ditargetkan ke user, load relasi detail, anotasi action disposisi, dan attach status baca target.

### Pembuatan surat

- `storeInternal(Request)`
  Membuat surat internal lewat `storeLetter($request, 'internal')`.

- `storeOutgoing(Request)`
  Membuat surat keluar lewat `storeLetter($request, 'outgoing')`.

- `storeIncomingExternal(Request)`
  Membuat surat masuk eksternal.

- `storeArchive(Request)`
  Membuat arsip scan.

- `storeLetter(Request, string $mode)`
  Fungsi inti pembuatan semua jenis surat:
  validasi field berdasarkan mode, normalisasi asal surat, simpan row `letters`, simpan target/tembusan, simpan lampiran scan PDF, dan buat notifikasi.

### Nomor surat

- `makeReference(string $mode)`
  Membuat ID teknis internal berbasis UUID.

### Draft dan lampiran

- `destroyDraft(Request, Letter)`
  Hanya pembuat draft yang boleh hapus. File lampiran di storage ikut dihapus.

### Publish surat

- `publishIncomingExternal(Request, Letter)`
  Walaupun nama fungsi masih menyebut incoming external, fungsinya dipakai untuk publish surat yang boleh dipublish: surat masuk eksternal, surat keluar, dan arsip.
  Target publish disimpan sebagai `letter_targets.kind = recipient`.

- `revokeIncomingExternalPublication(Request, Letter, LetterTarget)`
  Cabut publish dengan menghapus `letter_targets`.

- `canPublishLetter(Letter)`
  Menentukan apakah surat boleh dipublish.

- `businessLetterType(Letter)`
  Menentukan jenis bisnis surat, mempertimbangkan `meta.mode = archive`.

- `assertPublishTargetsExist(Collection)`
  Validasi target publish benar-benar ada di tabel organisasi.

### Disposisi

- `storeDisposition(Request, Letter, DispositionService)`
  Membuat disposisi root atau child. Jika `parent_id` ada, parent harus menargetkan user login.

- `replyDisposition(Request, Disposition, DispositionService)`
  Membalas disposisi sebagai child dari disposisi yang diterima. Target balasan otomatis kembali ke unit pengirim sebelumnya.

- `unitSnapshot(User)`
  Snapshot unit pengirim saat disposisi dibuat.

- `replyTarget(Disposition)`
  Menentukan target balasan berdasarkan snapshot unit pengirim disposisi sebelumnya.

- `annotateDispositionActions(Letter, User)`
  Menambahkan atribut runtime `can_reply` dan `can_forward` untuk setiap disposisi.

- `dispositionTargetsUser(Disposition, User)`
  Mengecek apakah disposisi menargetkan user login berdasarkan unit/jabatan aktif.

### Notifikasi

- `openNotification(Request, NotificationLog)`
  Menandai notifikasi sebagai dibaca lalu redirect ke detail surat.

### Akses dan query

- `baseProps(User)`
  Props global portal user: badge, letter types, target options, filter options.

- `dashboardStats(User)`
  Statistik dashboard user.

- `accessibleLetters(User, ?string $kind, bool $includeCreated)`
  Query surat internal yang bisa diakses berdasarkan target recipient/cc.

- `archiveLetters(User)`
  Query arsip personal: surat dibuat user, target publish/tembusan, target disposisi, atau akses internal asal unit.

- `applyLetterFilters(Builder, Request)`
  Filter daftar surat.

- `applyDispositionFilters(Builder, Request)`
  Filter daftar disposisi.

- `unreadLetters(User, string $kind)`
  Query surat internal/tebusan yang belum dibaca user.

- `accessibleDispositions(User)`
  Query disposisi yang menargetkan user.

- `canAccessLetter(User, Letter)`
  Gate utama akses detail surat.

- `targetMatches(Builder, User, ?string $kind)`
  Helper query target unit/jabatan terhadap user aktif.

- `originMatches(Builder, User)`
  Helper akses berdasarkan unit asal.

- `letterOriginMatches(Letter, User)`
  Versi object dari origin match.

- `resolveTargetUsers(Collection)`
  Resolve list target surat ke user aktif.

- `targetOptions()`
  Options organisasi untuk picker target di frontend.

### Validasi dan upload

- `normalizeInternalOriginPayload(Request)`
  Mengubah format lama seperti `division:1` menjadi ID numeric sebelum validasi.

- `originSnapshot(User, array, string)`
  Menyimpan asal surat sesuai pilihan user.

- `uploadValidationMessages()`
  Pesan upload PDF yang lebih jelas.

- `logUploadValidationFailure()`
  Logging error validasi upload.

## Services

### `LetterFieldRequirementService`

Tanggung jawab:

- Menyimpan default field wajib per tipe surat.
- Menormalisasi konfigurasi field wajib dari Settings.
- Menentukan apakah field tertentu wajib diisi pada form surat.

### `DispositionService`

Tanggung jawab:

- Menyediakan options target disposisi.
- Memvalidasi kewenangan disposisi.
- Resolve target disposisi ke user.
- Membuat notifikasi disposisi.

Konsep scope:

- Direktur dapat target divisi/GM/manager/department di bawah direktoratnya.
- GM dapat target divisi/manager/department di bawah divisinya.
- Manager dapat target department miliknya.

Konteks:

- `incoming_external`
- `internal`
- `outgoing`
- `archive`
