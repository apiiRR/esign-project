from __future__ import annotations

import html
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


SOURCE = Path("/Users/mobiledeveloperptberdikari/Downloads/Dokumen Kantor/UAT dan BAST PERSURATAN.docx")
OUTPUT = Path("generated-docs/UAT dan BAST PERSURATAN - SADIKA Lengkap.docx")


UAT_ROWS = [
    ("Login", "Login menggunakan username dan password valid", "User berhasil masuk ke dashboard sesuai role"),
    ("Login", "Login menggunakan username/password salah", "Sistem menolak login dan menampilkan pesan error"),
    ("Login", "Logout dari aplikasi", "Session berakhir dan user kembali ke halaman login"),
    ("Role & Akses", "Login sebagai super_admin", "Super Admin dapat melihat seluruh menu sesuai permission"),
    ("Role & Akses", "Login sebagai admin", "Admin hanya melihat menu dan fitur sesuai permission admin"),
    ("Role & Akses", "Login sebagai pegawai", "Pegawai hanya melihat menu portal kerja pegawai"),
    ("Role & Akses", "Akses route admin memakai akun pegawai", "Sistem menolak akses dan tidak menampilkan data admin"),
    ("Dashboard Admin", "Buka dashboard admin", "Ringkasan data surat, user, unit, notifikasi, dan aktivitas tampil"),
    ("Dashboard Pegawai", "Buka dashboard pegawai", "Statistik, inbox terbaru, badge, dan ringkasan sesuai akses user tampil"),
    ("Navbar Pegawai", "Buka dropdown Inbox", "Menu Internal, Tebusan, dan Disposisi tampil dalam satu dropdown"),
    ("Notifikasi Web", "Klik icon lonceng notifikasi", "Daftar notifikasi user login tampil"),
    ("Notifikasi Web", "Buka salah satu notifikasi", "Notifikasi berubah menjadi dibaca dan diarahkan ke detail terkait"),
    ("Master User", "Tambah user baru", "User berhasil dibuat, profil organisasi dan role tersimpan"),
    ("Master User", "Edit data user", "Perubahan nama, email, NIP, unit organisasi, jabatan, dan role tersimpan"),
    ("Master User", "Reset password user", "Password user berhasil diubah dan dapat digunakan login"),
    ("Master User", "Nonaktifkan user", "User tidak dapat digunakan sesuai aturan sistem"),
    ("Master User", "Export user ke Excel/CSV", "File export berisi data user sesuai filter"),
    ("Master User", "Download template import user", "Template import user berhasil diunduh"),
    ("Master User", "Import user valid", "Data user dibuat atau diperbarui tanpa duplikasi username"),
    ("Master User", "Import user dengan data tidak valid", "Sistem menolak seluruh import dan menampilkan error per baris"),
    ("Master Direktorat", "Tambah direktorat dan assign direktur", "Data direktorat tersimpan dengan direktur aktif"),
    ("Master Direktorat", "Export/import direktorat", "Export dan import direktorat berjalan sesuai template"),
    ("Master Divisi", "Tambah divisi dan assign General Manager", "Data divisi tersimpan dan terhubung ke direktorat"),
    ("Master Divisi", "Export/import divisi", "Export dan import divisi berjalan sesuai relasi direktorat"),
    ("Master Department", "Tambah department dan assign Manager", "Data department tersimpan dan terhubung ke divisi"),
    ("Master Department", "Export/import department", "Export dan import department berjalan sesuai relasi divisi"),
    ("Master Jenis Surat", "Tambah jenis surat", "Jenis surat aktif dan muncul di form surat"),
    ("Master Jenis Surat", "Nonaktifkan jenis surat", "Jenis surat tidak tersedia untuk input baru"),
    ("Settings Aplikasi", "Ubah nama aplikasi dan nama perusahaan", "Nama aplikasi dan perusahaan berubah di login, admin, pegawai, dan metadata"),
    ("Settings Aplikasi", "Upload logo aplikasi/perusahaan", "Logo global aplikasi berubah di layout login, admin, dan pegawai"),
    ("Settings Email", "Isi konfigurasi SMTP dan kirim test email", "Email test terkirim atau error SMTP tampil jelas"),
    ("Settings Email", "Ubah template email notifikasi", "Subject/body email memakai template yang disimpan admin"),
    ("Settings Email", "Kosongkan template email tertentu", "Sistem memakai default template email"),
    ("Settings OTP", "Aktifkan OTP tanda tangan/paraf", "Approve/reject approval mewajibkan OTP email"),
    ("Buat Surat Masuk Eksternal", "Input surat masuk eksternal dengan PDF dan nomor manual", "Surat tersimpan memakai letter_number input user"),
    ("Buat Surat Masuk Eksternal", "Input tanpa field wajib", "Sistem menolak simpan dan menampilkan validasi"),
    ("Surat Masuk Eksternal", "Buka detail surat masuk eksternal", "Nomor publik tampil dari letter_number, bukan reference internal"),
    ("Surat Masuk Eksternal", "Detail surat masuk eksternal", "Target, tembusan, status surat, dan card notifikasi tidak tampil"),
    ("Surat Masuk Eksternal", "Pembuat membuat disposisi awal", "Form Input Disposisi tampil hanya untuk pembuat surat"),
    ("Surat Masuk Eksternal", "Disposisi awal ke Direktur/GM/Manager", "Disposisi tersimpan dan penerima mendapat notifikasi"),
    ("Publish Surat", "Publish surat masuk eksternal ke department/divisi/direktorat", "User unit terpilih mendapat akses surat"),
    ("Publish Surat", "Cabut publish surat", "Akses publish untuk unit tersebut hilang"),
    ("Buat Surat Internal", "Buat surat internal dengan upload PDF dan field wajib lengkap", "Surat internal tersimpan sebagai draft atau terkirim sesuai aksi"),
    ("Buat Surat Internal", "Tambahkan tujuan berbasis unit/jabatan", "Target tujuan tersimpan sesuai pilihan"),
    ("Buat Surat Internal", "Tambahkan tembusan berbasis unit/jabatan", "Tembusan tersimpan dan penerima mendapat akses setelah surat dikirim"),
    ("Surat Internal", "Surat internal tanpa approval paraf/TTD dikirim", "Tujuan dan tembusan langsung menerima surat dan notifikasi"),
    ("Surat Internal", "Surat internal dengan paraf/TTD dibuat", "Surat belum dikirim ke tujuan/tembusan sampai semua approval selesai"),
    ("Paraf Dokumen", "Tambahkan satu atau lebih user paraf", "Daftar paraf tersimpan berurutan sebelum tanda tangan"),
    ("Paraf Dokumen", "Approve paraf berurutan", "Paraf berikutnya menjadi ready setelah paraf sebelumnya approve"),
    ("Paraf Dokumen", "Reject paraf dengan catatan", "Workflow berhenti dan pembuat surat mendapat notifikasi penolakan"),
    ("Tanda Tangan QR", "Upload PDF internal lalu tambah titik tanda tangan QR", "Titik tanda tangan tampil pada preview PDF"),
    ("Tanda Tangan QR", "Tambahkan lebih dari satu signer berurutan", "Semua signer tersimpan sesuai urutan tanda tangan"),
    ("Tanda Tangan QR", "Klik titik tanda tangan di halaman PDF berbeda", "Sistem otomatis menyimpan nomor halaman yang benar"),
    ("Preview PDF", "Preview PDF surat internal di production", "PDF.js worker termuat dan preview PDF tampil tanpa error MIME"),
    ("Approval", "Login sebagai approver yang mendapat tugas ready", "Request paraf/TTD tampil di menu Approval"),
    ("Approval", "Klik Sudah Baca Dokumen", "Sistem mencatat dokumen sudah dibaca tanpa pindah ke detail surat"),
    ("Approval OTP", "Approve/reject tanpa OTP saat OTP aktif", "Sistem menolak dan meminta kode OTP"),
    ("Approval OTP", "Kirim OTP approval", "OTP terkirim ke email approver"),
    ("Approval OTP", "Approve menggunakan OTP valid", "Approval berhasil diproses"),
    ("Approval OTP", "OTP salah/kedaluwarsa", "Sistem menolak dan menampilkan pesan validasi OTP"),
    ("Approval TTE", "Approve tanda tangan QR", "QR tertempel ke PDF signed dan signer berikutnya menjadi ready"),
    ("Approval TTE", "Reject tanda tangan tanpa catatan", "Sistem menolak dan meminta catatan penolakan"),
    ("Approval TTE", "Reject tanda tangan dengan OTP valid dan catatan", "Workflow berhenti dan pembuat surat mendapat notifikasi"),
    ("Approval TTE", "Semua signer approve", "Surat terkirim ke tujuan/tembusan dan status tanda tangan menjadi signed"),
    ("Verifikasi QR", "Buka URL QR dari PDF signed", "Halaman verifikasi TTE menampilkan data surat dan signer"),
    ("Verifikasi QR", "Buka token QR tidak valid", "Sistem menampilkan halaman verifikasi tidak ditemukan/aman"),
    ("Version Control PDF", "Approval paraf/TTD ditolak", "Versi PDF aktif menjadi rejected dan histori approval tetap tersimpan"),
    ("Version Control PDF", "Pembuat upload PDF revisi memakai alur lama", "Versi baru dibuat dan approval lama disalin dengan status reset"),
    ("Version Control PDF", "Pembuat upload PDF revisi dan atur ulang approval", "Versi baru dibuat dengan alur paraf/TTD baru"),
    ("Version Control PDF", "Request approval versi lama diproses ulang", "Sistem menolak karena bukan versi aktif"),
    ("Buat Surat Keluar", "Buat surat keluar dengan upload PDF dan tembusan", "Surat keluar tersimpan dan tembusan mendapat akses"),
    ("Surat Keluar", "Buka detail surat keluar", "Nomor surat manual tampil, status metadata tidak tampil, tembusan tampil"),
    ("Surat Keluar", "Publish surat keluar ke unit", "User unit publish mendapat akses surat"),
    ("Buat Arsip Scan", "Input arsip scan PDF", "Arsip tersimpan dan tampil di Arsip Saya pembuat"),
    ("Arsip Scan", "Publish arsip ke department/divisi/direktorat", "User unit publish mendapat akses arsip"),
    ("Arsip Saya", "Buka menu Arsip Saya", "User melihat surat sesuai akses unit, publish, tembusan, disposisi, dan surat miliknya"),
    ("Arsip Saya", "Gunakan tab kategori", "Data terfilter berdasarkan Semua, Surat Masuk Eksternal, Internal, Keluar, dan Arsip"),
    ("Arsip Saya", "Cek nomor surat masuk eksternal/surat keluar", "Nomor yang tampil adalah letter_number, bukan reference internal"),
    ("Arsip Saya", "Pembuat melihat surat miliknya", "Status baca Dibaca/Belum Dibaca tidak ditampilkan untuk pembuat"),
    ("Arsip Saya", "User satu divisi melihat surat internal yang tidak dibagikan", "Hanya nomor surat dan tag jenis surat tampil tanpa link detail"),
    ("Inbox Internal", "Buka Inbox > Internal", "User hanya melihat surat internal yang ditujukan ke unit/jabatannya"),
    ("Inbox Tebusan", "Buka Inbox > Tebusan", "User hanya melihat surat yang masuk sebagai tembusan"),
    ("Disposisi", "Buka Inbox > Disposisi", "User melihat daftar disposisi yang relevan dan bukan surat buatannya sendiri"),
    ("Disposisi", "Balas disposisi yang ditujukan ke user login", "Balasan disposisi tersimpan sebagai thread child"),
    ("Disposisi", "Coba balas disposisi yang bukan target user login", "Tombol/form balas tidak tersedia atau aksi ditolak"),
    ("Disposisi", "Teruskan disposisi ke unit di bawah kewenangan", "Disposisi child terbentuk dan tampil bertingkat"),
    ("Disposisi", "Pembuat surat menerima balasan disposisi", "Balasan tidak masuk inbox disposisi pembuat tetapi tampil di detail surat"),
    ("Detail Surat", "Buka detail semua jenis surat", "Tampil user input, tanggal input, jam input, lampiran, dan metadata sesuai jenis surat"),
    ("Detail Surat", "Buka detail surat internal/surat keluar", "Card notifikasi dan card disposisi tidak tampil"),
    ("Status Baca", "User membuka surat yang diterima", "Status baca user tercatat"),
    ("Status Baca", "Pembuat surat membuka suratnya sendiri", "Pembuat tidak masuk daftar status baca penerima"),
    ("Email Notifikasi", "Kirim surat ke tujuan/tembusan", "NotificationLog dibuat dan email terkirim jika setting aktif"),
    ("Email Notifikasi", "Buat/teruskan disposisi", "Email disposisi terkirim memakai template admin"),
    ("Email Notifikasi", "Approval paraf/TTD menjadi ready", "Approver menerima notifikasi web dan email"),
    ("Email Notifikasi", "Email gagal dikirim", "Kegagalan tercatat di log dan proses utama tetap berjalan"),
    ("Lampiran", "Buka lampiran PDF surat", "File PDF dapat dibuka atau diunduh"),
    ("Validasi File", "Upload file non-PDF saat buat surat", "Sistem menolak upload dan menampilkan validasi"),
    ("Validasi Form", "Submit ulang setelah validasi field diperbaiki", "Error lama tidak memblokir submit ulang dan request terkirim"),
    ("PWA", "Install atau buka aplikasi sebagai PWA", "Aplikasi dapat dibuka dan metadata PWA sesuai nama aplikasi"),
    ("Production", "Akses aplikasi melalui HTTPS Cloudflare Tunnel", "Tidak muncul mixed content dan semua request memakai HTTPS"),
]


def esc(value: str) -> str:
    return html.escape(value or "", quote=True)


def p(text: str = "", *, bold: bool = False, size: int = 22, align: str | None = None, color: str | None = None) -> str:
    jc = f'<w:jc w:val="{align}"/>' if align else ""
    props = f"<w:pPr>{jc}<w:spacing w:after=\"120\"/></w:pPr>"
    rpr = "<w:rPr>"
    if bold:
        rpr += "<w:b/>"
    if size:
        rpr += f'<w:sz w:val="{size}"/>'
    if color:
        rpr += f'<w:color w:val="{color}"/>'
    rpr += "</w:rPr>"
    return f"<w:p>{props}<w:r>{rpr}<w:t>{esc(text)}</w:t></w:r></w:p>"


def title(text: str) -> str:
    return p(text, bold=True, size=32, align="center", color="1F4D78")


def heading(text: str) -> str:
    return p(text, bold=True, size=26, color="2E74B5")


def page_break() -> str:
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def cell(text: str, width: int, *, bold: bool = False, fill: str | None = None, align: str = "left") -> str:
    shade = f'<w:shd w:fill="{fill}"/>' if fill else ""
    jc = f'<w:jc w:val="{align}"/>'
    rpr = "<w:rPr>"
    if bold:
        rpr += "<w:b/>"
    rpr += '<w:sz w:val="18"/></w:rPr>'
    return (
        "<w:tc>"
        f"<w:tcPr><w:tcW w:w=\"{width}\" w:type=\"dxa\"/>{shade}"
        '<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
        '<w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar>'
        "</w:tcPr>"
        f"<w:p><w:pPr>{jc}<w:spacing w:after=\"0\"/></w:pPr><w:r>{rpr}<w:t>{esc(text)}</w:t></w:r></w:p>"
        "</w:tc>"
    )


def table(rows: list[list[str]], widths: list[int], header: bool = True) -> str:
    grid = "".join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    xml = [
        "<w:tbl>",
        '<w:tblPr><w:tblW w:w="14400" w:type="dxa"/>'
        '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="A6A6A6"/>'
        '<w:left w:val="single" w:sz="4" w:color="A6A6A6"/>'
        '<w:bottom w:val="single" w:sz="4" w:color="A6A6A6"/>'
        '<w:right w:val="single" w:sz="4" w:color="A6A6A6"/>'
        '<w:insideH w:val="single" w:sz="4" w:color="D9D9D9"/>'
        '<w:insideV w:val="single" w:sz="4" w:color="D9D9D9"/></w:tblBorders>'
        '<w:tblLayout w:type="fixed"/></w:tblPr>',
        f"<w:tblGrid>{grid}</w:tblGrid>",
    ]
    for idx, row in enumerate(rows):
        is_header = header and idx == 0
        xml.append("<w:tr>")
        for value, width in zip(row, widths):
            xml.append(cell(value, width, bold=is_header, fill="E8EEF5" if is_header else None, align="center" if is_header else "left"))
        xml.append("</w:tr>")
    xml.append("</w:tbl>")
    return "".join(xml)


def signature_table() -> str:
    rows = [
        ["Nama", "Departemen", "Tanda Tangan"],
        ["", "", ""],
        ["", "", ""],
        ["", "", ""],
    ]
    return table(rows, [3600, 4200, 4200], header=True)


def section_properties() -> str:
    return (
        "<w:sectPr>"
        '<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>'
        '<w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="708" w:footer="708" w:gutter="0"/>'
        '<w:cols w:space="708"/>'
        '<w:docGrid w:linePitch="360"/>'
        "</w:sectPr>"
    )


def build_document_xml() -> bytes:
    rows = [["No", "Area", "Checklist", "Expected Result", "Status", "Notes"]]
    for index, (area, checklist, expected) in enumerate(UAT_ROWS, start=1):
        rows.append([str(index), area, checklist, expected, "", ""])

    body = []
    body.append(title("User Acceptance Test"))
    body.append(p("Pada hari Rabu, 17 Juni 2026 menerangkan bahwa:", size=22))
    body.append(table([
        ["Update", "SADIKA — Surat dan Arsip Digital Berdikari"],
        ["Requested By", "PT Berdikari"],
    ], [2600, 11800], header=False))
    body.append(p("Telah dilakukan User Acceptance Test, dengan hasil sebagai berikut:", size=22))
    body.append(table(rows, [700, 2300, 4200, 5200, 1000, 1000], header=True))
    body.append(p("Berdasarkan hasil tersebut maka dengan ini menyatakan User Acceptance Test:", size=22))
    body.append(p("DITERIMA / TIDAK DITERIMA", bold=True, size=24, align="center"))
    body.append(p("*Coret yang tidak perlu", size=18))
    body.append(p("Demikian disampaikan, selanjutnya dapat digunakan sebagaimana mestinya.", size=22))
    body.append(heading("Penguji"))
    body.append(p("Penguji merupakan perwakilan dari divisi pengguna dan/atau divisi terkait yang terdampak oleh perubahan sistem.", size=20))
    body.append(signature_table())
    body.append(page_break())
    body.append(title("BERITA ACARA SERAH TERIMA"))
    body.append(p("SADIKA — Surat dan Arsip Digital Berdikari", bold=True, size=26, align="center"))
    body.append(p("Pada hari Rabu, 17 Juni 2026 menerangkan bahwa yang bertandatangan di bawah ini:", size=22))
    body.append(table([
        ["PIHAK PERTAMA", ""],
        ["Nama", "Eko Hariatmoko"],
        ["Jabatan", "Manager Information Technology & Corporate Planning"],
        ["Divisi", "Corporate Strategy and Digital Transformation"],
        ["Keterangan", "Dalam hal ini bertindak atas nama Department IT yang telah melakukan pengembangan, selanjutnya disebut PIHAK PERTAMA."],
        ["PIHAK KEDUA", ""],
        ["Nama", "Dian Andriani Nurul Inayah"],
        ["Jabatan", "Manager General Affair"],
        ["Divisi", "Human Capital & General Affair"],
        ["Keterangan", "Dalam hal ini bertindak atas nama General Affair sebagai pengguna, selanjutnya disebut PIHAK KEDUA."],
    ], [2600, 11800], header=False))
    body.append(heading("MENYATAKAN"))
    body.append(table([
        ["No", "Pernyataan"],
        ["1", "PIHAK PERTAMA telah melakukan pengembangan sesuai dengan kebutuhan yang telah disampaikan oleh PIHAK KEDUA."],
        ["2", "PIHAK KEDUA mendapatkan sosialisasi terkait penggunaan sistem oleh PIHAK PERTAMA."],
        ["3", "PIHAK KEDUA telah menerima Pengembangan Sistem dari PIHAK PERTAMA dan Sistem tersebut dapat mulai digunakan untuk menunjang proses bisnis PIHAK KEDUA."],
    ], [700, 13700], header=True))
    body.append(p("Berdasarkan 3 (tiga) poin tersebut, KEDUA PIHAK sepakat untuk melakukan serah terima hasil pengembangan SADIKA — Surat dan Arsip Digital Berdikari. Demikian disampaikan, selanjutnya dapat digunakan sebagaimana mestinya.", size=22))
    body.append(table([
        ["PIHAK KEDUA", "PIHAK PERTAMA"],
        ["Yang Menerima,", "Yang Menyerahkan,"],
        ["", ""],
        ["", ""],
        ["Dian Andriani Nurul Inayah", "Eko Hariatmoko"],
        ["Manager General Affair", "Manager IT & Corporate Planning"],
    ], [7200, 7200], header=True))
    body.append(section_properties())

    xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 wp14"><w:body>'
        + "".join(body)
        + "</w:body></w:document>"
    )
    return xml.encode("utf-8")


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document_xml = build_document_xml()
    with ZipFile(SOURCE, "r") as zin, ZipFile(OUTPUT, "w", ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = document_xml
            zout.writestr(item, data)
    print(OUTPUT)


if __name__ == "__main__":
    main()
