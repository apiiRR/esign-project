# Alur Bisnis Surat

## Jenis Surat

### Surat Masuk Eksternal

Tujuan:

- Mencatat surat dari pihak eksternal.
- Nomor surat publik berasal dari input user, bukan generator internal.

Alur:

1. User/admin input surat masuk eksternal.
2. `letter_number` wajib/manual sesuai dokumen.
3. `reference` internal tetap dibuat sebagai ID teknis berbasis UUID.
4. Surat tersimpan sebagai `type = incoming_external`.
5. Pembuat dapat publish ke department/division/directorate.
6. User target publish dapat melihat surat di arsip dan status baca dicatat saat membuka detail.
7. Surat dapat didisposisikan ke unit/jabatan.

Detail UI:

- Tidak menampilkan target/tembusan/status surat sebagai metadata utama.
- Nomor utama memakai `letter_number`.
- `reference` tidak dipakai sebagai label utama.

### Surat Internal

Tujuan:

- Mengirim surat antar unit internal.

Alur:

1. User pilih asal surat: direktorat, divisi, atau department.
2. User memilih tujuan dan tembusan.
3. Surat bisa `Simpan Draft` atau `Send`.
4. Jika `Send`, target dan tembusan mendapat notifikasi.
5. User target/tembusan melihat surat di inbox.
6. Saat user membuka detail, `LetterReadReceipt` dibuat/diupdate.

Akses tambahan:

- Jika asal surat dipilih dari divisi, user dalam divisi itu dapat melihat surat.
- Jika asal surat dipilih dari department, user dalam department itu dapat melihat surat.
- Draft tetap hanya terlihat oleh pembuat.

### Surat Keluar

Tujuan:

- Membuat surat untuk pihak eksternal.

Alur:

1. User pilih asal surat.
2. User isi tujuan eksternal.
3. User dapat menambah tembusan internal.
4. Surat bisa draft atau sent.
5. Tembusan disimpan sebagai `letter_targets.kind = cc`.
6. User tembusan dapat melihat surat dan status baca dicatat.
7. Surat keluar juga dapat dipublish ke department/division/directorate.

Detail UI:

- Nomor utama memakai `letter_number`.
- `reference` internal tidak ditampilkan sebagai nomor utama.
- Metadata detail tidak menampilkan status.
- Panel target hanya menampilkan Tembusan, tidak Tujuan.

### Arsip Scan

Tujuan:

- Menyimpan dokumen scan sebagai arsip.

Alur:

1. User upload arsip scan.
2. Surat tersimpan sebagai arsip.
3. Pembuat dapat publish arsip ke department/division/directorate.
4. Target publish dapat melihat di arsip dan status baca dicatat.

## Publish Surat

Publish adalah mekanisme membagikan surat ke unit organisasi tanpa mengubah pembuat surat.

Berlaku untuk:

- Surat masuk eksternal.
- Surat keluar.
- Arsip.

Target publish:

- `department`
- `division`
- `directorate`

Teknis:

- Publish disimpan di `letter_targets` dengan `kind = recipient`.
- Cabut publish menghapus row `letter_targets`.
- Akses target publish mengikuti user aktif di unit saat ini.
- Jika user pindah unit, aksesnya berubah mengikuti mapping unit terbaru.

## Disposisi

Disposisi adalah instruksi atau catatan lanjutan terhadap surat.

Target disposisi:

- `directorate`
- `division`
- `department`
- `division_gm`
- `department_manager`

Thread:

- `parent_id = null`: disposisi root.
- `parent_id != null`: balasan/terusan sebagai child.

Balasan:

- Hanya user yang menjadi target disposisi dapat membalas.
- Balasan otomatis diarahkan kembali ke unit pengirim disposisi sebelumnya.

Teruskan:

- User yang menjadi target disposisi dapat meneruskan ke target sesuai kewenangannya.
- Terusan disimpan sebagai child dari disposisi yang diterima.

Status proses:

- Kolom `status` masih ada untuk kompatibilitas.
- UI user tidak lagi memakai label Diproses/Selesai.
- Yang tetap dipakai adalah status baca disposisi lewat `read_at`.

Status baca disposisi:

- Disimpan di `dispositions.read_at`.
- Terisi saat target disposisi membuka detail surat.
- Tidak mengubah status proses.

## Notifikasi

Notifikasi saat ini memakai tabel `notification_logs`.

Dibuat saat:

- Surat internal/surat keluar dikirim ke target/tembusan.
- Surat dipublish.
- Disposisi dibuat.

Dibaca saat:

- User membuka notifikasi dari bell/menu notifikasi.

Catatan:

- Notifikasi bersifat web/in-app.
- PWA sudah tersedia, tetapi push notification real-time masih rencana pengembangan lanjutan.
