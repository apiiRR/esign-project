# Frontend React

## Entry Point dan Layout

### `resources/js/app.jsx`

Entry point Inertia React. File ini:

- Membaca halaman dari Laravel/Inertia.
- Resolve komponen React berdasarkan nama page.
- Mount aplikasi ke DOM.

### Layout

- `LayoutAdmin.jsx`
  Layout admin dengan sidebar/menu admin.
- `LayoutUser.jsx`
  Layout user dengan menu dashboard, inbox, disposisi, buat surat, arsip, notifikasi bell, dokumentasi.
- `LayoutAuth.jsx`
  Layout halaman login.

## Halaman User

### `resources/js/Pages/User/Portal/Workspace.jsx`

Ini adalah file utama portal user. File ini merender banyak halaman berdasarkan props:

- `section = dashboard`
- `section = inbox`
- `section = create_menu`
- `section = create`
- `section = archive`
- `section = notifications`
- `section = detail`

Komponen/fungsi penting:

- `Dashboard`
  Kartu ringkasan inbox, tebusan, disposisi belum dibaca, arsip.

- `LetterList`
  List surat untuk inbox/arsip. Menampilkan subject, nomor surat publik, tag jenis surat, status baca, dan aksi detail.

- `DispositionList`
  List disposisi masuk. Nomor surat memakai `letterDisplayNumber`.

- `InboxPage`
  Halaman inbox internal, tebusan, atau disposisi.

- `CreateMenuPage`
  Pilihan jenis surat yang akan dibuat.

- `CreatePage`
  Form pembuatan surat internal, keluar, masuk eksternal, dan arsip.

- `DetailPage`
  Detail surat, metadata, target/tembusan, publish, lampiran, disposisi, preview, status baca, notifikasi.

- `PublishExternalPanel`
  Panel publish surat ke department/division/directorate. Dipakai untuk surat masuk eksternal, surat keluar, dan arsip.

- `DispositionThreadItem`
  Render thread disposisi nested. Tombol balas/teruskan hanya muncul jika backend mengirim `can_reply`/`can_forward`.

- `ForwardDispositionForm`
  Form meneruskan disposisi ke target yang diizinkan.

- `ArchivePage`
  Halaman Arsip Saya.

- `NotificationsPage`
  Daftar notifikasi user login.

Helper penting:

- `letterDisplayNumber(letter)`
  Menentukan nomor yang ditampilkan ke user. Untuk incoming external memakai `letter_number`, bukan `reference`.

- `letterTypeMeta(letterOrType)`
  Menghasilkan label dan warna tag jenis surat.

- `businessLetterType(letter)`
  Menentukan jenis bisnis surat dengan mempertimbangkan `meta.mode = archive`.

- `targetLabel(target, options)`
  Mengubah target unit/jabatan menjadi label manusia.

- `buildDispositionTree(dispositions)`
  Mengubah flat list disposisi menjadi nested tree berdasarkan `parent_id`.

- `internalOriginOptions(user)`
  Membuat pilihan asal surat berdasarkan unit user login.

## Halaman Admin

### Surat

- `Admin/Letters/Index.jsx`
  List surat admin.
- `Admin/Letters/Form.jsx`
  Form pembuatan surat admin.
- `Admin/Letters/Show.jsx`
  Detail surat admin.

### Master Data

- `Admin/Organization/Index.jsx`
  CRUD direktorat/divisi/department.
- `Admin/Users`
  CRUD user.
- `Admin/Roles`
  CRUD role.
- `Admin/Permissions`
  CRUD permission.
- `Admin/LetterTypes/Index.jsx`
  CRUD jenis surat dasar.

### Setting dan Monitoring

- `Admin/Settings/Index.jsx`
  Setting aplikasi dan field wajib surat.
- `Admin/Notifications/Index.jsx`
  Daftar notification log.
- `Admin/Dashboard/Index.jsx`
  Dashboard admin.

## Shared Components

- `Search.jsx`
  Komponen filter/search list. Menerima konfigurasi filter dari controller.
- `Pagination.jsx`
  Render pagination Laravel.
- `PageHeader.jsx`
  Header halaman reusable.
- `Delete.jsx`
  Tombol/aksi delete reusable.
- `TableEmpty.jsx`
  Empty state tabel.
- `FormErrorSummary.jsx`
  Ringkasan error validasi form.

## Pola Form

Form React memakai `useForm` dari Inertia atau `router.post`.

Validasi:

- Backend Laravel mengirim error ke props `errors`.
- UI membaca `formErrors`.
- Untuk upload PDF, frontend juga punya validasi file dasar sebelum submit.

Submit surat:

- Form dikirim sebagai `FormData` karena ada file upload.
- `forceFormData: true` dipakai saat submit.

## Preview Surat

- Form surat hanya menerima upload scan PDF.
- File PDF dipreview dengan object URL sebelum upload.
- File tersimpan di storage public setelah submit.
