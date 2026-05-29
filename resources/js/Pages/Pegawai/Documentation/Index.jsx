import { Head, Link } from "@inertiajs/react";
import LayoutPegawai from "@/Layouts/LayoutPegawai";
import { Archive, BookOpen, CheckCheck, FilePlus2, Inbox, Mail, Send } from "lucide-react";

const guides = [
    {
        title: "Dashboard dan Inbox",
        icon: Inbox,
        items: [
            "Dashboard menampilkan unread inbox internal, unread tebusan, disposisi open, dan total arsip pribadi.",
            "Inbox Internal berisi surat yang ditujukan kepada Anda sebagai user, unit, atau pejabat unit.",
            "Inbox Tebusan berisi surat internal yang menempatkan Anda sebagai penerima tembusan.",
            "Disposisi menampilkan instruksi atau tindak lanjut surat yang diarahkan kepada Anda.",
        ],
    },
    {
        title: "Membuat Surat",
        icon: FilePlus2,
        items: [
            "Menu Buat Surat membuka pilihan Surat Masuk Eksternal, Surat Internal, Surat Keluar, dan Arsip Scan.",
            "Surat Masuk Eksternal hanya memakai scan PDF, dilengkapi asal surat dan catatan.",
            "Surat Internal dan Surat Keluar dibuat dengan upload scan PDF.",
            "Arsip Scan dipakai untuk menyimpan dokumen PDF ke sistem tanpa alur pengiriman.",
        ],
    },
    {
        title: "Nomor Surat, Draft, dan Send",
        icon: Send,
        items: [
            "Nomor Surat diisi manual sesuai dokumen atau kebutuhan perusahaan.",
            "Simpan Draft menyimpan data dan file scan PDF tanpa mengirim notifikasi ke penerima.",
            "Send menyimpan surat dengan status terkirim dan membuat log notifikasi untuk penerima.",
            "Draft milik Anda dapat dihapus selama status surat masih draft.",
        ],
    },
    {
        title: "Detail Surat",
        icon: CheckCheck,
        items: [
            "Detail surat menampilkan metadata, jenis surat, nomor surat, asal surat, target, tembusan, lampiran, dan preview.",
            "Saat detail surat dibuka, sistem mencatat status baca untuk user login.",
            "Status baca membantu pembuat surat melihat siapa yang sudah membaca surat dan waktu bacanya.",
        ],
    },
    {
        title: "Arsip Saya",
        icon: Archive,
        items: [
            "Arsip Saya menampilkan surat yang Anda buat, terima, baca, atau menjadi target.",
            "Gunakan pencarian dan filter checklist untuk menemukan surat berdasarkan jenis, status, atau pembuat.",
        ],
    },
];

export default function PegawaiDocumentation() {
    return (
        <>
            <Head title="Dokumentasi Pegawai" />
            <LayoutPegawai>
                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-950">Dokumentasi Pegawai</h1>
                                <p className="mt-2 max-w-3xl text-sm text-gray-600">
                                    Panduan penggunaan portal pegawai untuk menerima, membaca, membuat, mengirim, dan mengarsipkan surat di aplikasi SADIKA.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {guides.map(({ title, icon: Icon, items }) => (
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

                    <div className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm">
                        Mulai membuat surat dari{" "}
                        <Link href="/pegawai/surat" className="font-semibold text-emerald-700 hover:text-emerald-800">
                            menu Buat Surat
                        </Link>
                        , atau buka{" "}
                        <Link href="/pegawai/inbox/internal" className="font-semibold text-emerald-700 hover:text-emerald-800">
                            Inbox Internal
                        </Link>
                        {" "}untuk melihat surat terbaru.
                    </div>
                </div>
            </LayoutPegawai>
        </>
    );
}
