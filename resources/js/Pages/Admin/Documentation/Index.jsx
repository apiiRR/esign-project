import { Head, Link } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { BookOpen, FileText, Network, Settings, Shield, Users } from "lucide-react";

const sections = [
    {
        title: "Monitoring Surat",
        icon: FileText,
        items: [
            "Dashboard menampilkan ringkasan surat masuk eksternal, surat internal, arsip scan, user, unit organisasi, disposisi, dan notifikasi.",
            "Menu Surat memisahkan Surat Masuk Eksternal, Surat Internal, dan Arsip Surat agar proses operasional lebih mudah dipantau.",
            "Detail surat menampilkan metadata, jenis surat, nomor surat, status, lampiran, target, tembusan, disposisi, status baca, dan log notifikasi.",
        ],
    },
    {
        title: "Master Data",
        icon: Network,
        items: [
            "Direktorat, Divisi, dan Department dipakai sebagai struktur akses surat dan target disposisi.",
            "Kode unit tidak ditampilkan di UI master organisasi, tetapi tetap dipakai internal untuk format nomor surat.",
            "Pejabat unit dapat diisi dari master data atau tersinkron otomatis saat user diberi jabatan Direktur, General Manager, atau Manager.",
        ],
    },
    {
        title: "User, Role, dan Hak Akses",
        icon: Users,
        items: [
            "Role global hanya admin dan pegawai. Jabatan organisasi bukan role akses.",
            "Unit kerja user menentukan direktorat, divisi, dan department user berada.",
            "Jabatan organisasi mengisi pejabat unit terkait: Direktur pada direktorat, General Manager pada divisi, Manager pada department.",
        ],
    },
    {
        title: "Jenis Surat dan Nomor Otomatis",
        icon: Shield,
        items: [
            "Jenis Surat wajib dipilih saat membuat surat baru.",
            "Nomor otomatis dapat diaktifkan per jenis surat dan per konteks: masuk eksternal, internal, keluar, atau arsip scan.",
            "Format nomor mendukung variabel {day}, {daily_sequence}, {letter_type_code}, {company_code}, {origin_code}, {roman_month}, {month}, dan {year}.",
            "Nomor dibooking saat user menyimpan draft atau menekan Send, sehingga nomor draft tidak dipakai user lain.",
        ],
    },
    {
        title: "Template, Settings, Log, dan Notifikasi",
        icon: Settings,
        items: [
            "Template Surat mengatur format Nota Dinas untuk surat internal dan surat keluar jika metode template diaktifkan.",
            "Settings disederhanakan untuk kebutuhan aplikasi: nama aplikasi, nama perusahaan, kode perusahaan, dan logo.",
            "Log Viewer digunakan admin untuk membaca error teknis Laravel. Notifikasi disimpan sebagai log saat surat dikirim ke penerima.",
        ],
    },
];

export default function AdminDocumentation() {
    return (
        <>
            <Head title="Dokumentasi Admin" />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-950">Dokumentasi Admin</h1>
                                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                                    Panduan operasional admin untuk mengelola user, master data, template, surat, notifikasi, log teknis, dan pengaturan aplikasi Surat & Arsip Digital PT Berdikari.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {sections.map(({ title, icon: Icon, items }) => (
                            <section key={title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-950">{title}</h2>
                                </div>
                                <ul className="space-y-3 text-sm leading-6 text-gray-600">
                                    {items.map((item) => (
                                        <li key={item} className="flex gap-3">
                                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>

                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
                        Dokumentasi developer publik tersedia di{" "}
                        <Link href="/developer-docs" className="font-semibold underline">
                            /developer-docs
                        </Link>
                        .
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}
