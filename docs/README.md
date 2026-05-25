# Dokumentasi Teknis Project

Dokumentasi ini menjelaskan struktur teknis aplikasi Surat & Arsip Digital PT Berdikari tanpa menambah komentar berlebihan di source code.

## Daftar Dokumen

- [Arsitektur Aplikasi](./architecture.md)
  Menjelaskan stack, pola Laravel + Inertia React, route besar, middleware, dan lifecycle request.
- [Context Aplikasi](./APP_CONTEXT.md)
  Ringkasan konteks bisnis dan teknis aplikasi untuk onboarding cepat.
- [Backend Laravel](./backend.md)
  Menjelaskan controller, service, fungsi penting, validasi, dan tanggung jawab tiap modul backend.
- [Model dan Database](./data-model.md)
  Menjelaskan tabel, model Eloquent, relasi, enum penting, dan konsep ownership/unit.
- [Alur Bisnis Surat](./workflows.md)
  Menjelaskan alur surat masuk eksternal, internal, keluar, arsip, publish, disposisi, notifikasi, dan status baca.
- [Frontend React](./frontend.md)
  Menjelaskan layout, halaman, komponen shared, helper UI, dan cara data Inertia dipakai.
- [Operasional dan Troubleshooting](./operations.md)
  Menjelaskan instalasi, build, testing, migrasi, storage, PWA, dan error umum.

## Cara Membaca

Untuk programmer baru, urutan yang disarankan:

1. Baca `architecture.md` untuk gambaran sistem.
2. Baca `APP_CONTEXT.md` untuk konteks bisnis dan teknis secara ringkas.
3. Baca `data-model.md` agar paham struktur data.
4. Baca `workflows.md` untuk alur fitur utama.
5. Baca `backend.md` saat ingin mengubah controller/service.
6. Baca `frontend.md` saat ingin mengubah UI React.
7. Baca `operations.md` saat setup lokal, deploy, atau debugging.

## Catatan Penting

- Dokumentasi ini menjelaskan kondisi teknis project saat ini.
- Jika ada perubahan besar pada controller, model, migration, atau alur surat, update dokumen terkait di folder ini.
- Source of truth tetap source code dan migration. Dokumentasi ini adalah peta teknis agar codebase lebih mudah dipahami.
