import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { appName } from "@/Utils/appIdentity";
import { BookOpen, FileSignature, FileText, Settings, Shield, Users } from "lucide-react";

const sections = [
    {
        title: "Dashboard dan Dokumen",
        icon: FileText,
        items: [
            "Dashboard admin menampilkan total dokumen, total user, kumpulan dokumen, dan user terdaftar.",
            "Menu Dokumen hanya menampilkan dokumen internal.",
            "Detail dokumen menampilkan nomor dokumen, perihal, status, pembuat, lampiran PDF, versi dokumen, dan status tanda tangan.",
        ],
    },
    {
        title: "Alur Tanda Tangan QR",
        icon: FileSignature,
        items: [
            "Form dokumen memakai Nomor Dokumen, Perihal, File Scan PDF, mode tanda tangan, dan daftar penanda tangan.",
            "Mode Berurutan membuka penanda tangan pertama lebih dulu, lalu membuka penanda tangan berikutnya setelah yang sebelumnya selesai.",
            "Mode Tidak Berurutan membuka semua penanda tangan sekaligus.",
            "Setiap penanda tangan wajib memiliki posisi QR pada PDF saat dokumen dikirim.",
        ],
    },
    {
        title: "User, Role, dan Hak Akses",
        icon: Users,
        items: [
            "Admin mengelola nama, email, username, posisi, status akun, role, dan password user.",
            "Role akses fleksibel dan dapat dibuat sesuai kebutuhan operasional.",
            "Permission aktif ditampilkan dengan deskripsi fungsi agar admin memahami dampak tiap hak akses.",
        ],
    },
    {
        title: "Flow yang Disederhanakan",
        icon: Shield,
        items: [
            "Form dokumen baru berfokus pada data inti dokumen dan alur tanda tangan QR.",
            "Portal user berfokus pada Dashboard User dan menu Dokumen.",
            "Dokumentasi operasional hanya tersedia untuk admin.",
        ],
    },
    {
        title: "Settings",
        icon: Settings,
        items: [
            "Settings berisi identitas aplikasi, logo perusahaan, konfigurasi SMTP, dan OTP tanda tangan elektronik.",
            "OTP tanda tangan dapat diaktifkan untuk mewajibkan kode email saat approve atau reject tanda tangan.",
            "Log Viewer tetap tersedia dari dropdown admin untuk membaca error teknis Laravel.",
        ],
    },
];

export default function AdminDocumentation() {
    const { settings } = usePage().props;

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
                                    Panduan operasional admin untuk flow dokumen internal, tanda tangan QR, user, role, hak akses, dan pengaturan aplikasi {appName(settings)}.
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
