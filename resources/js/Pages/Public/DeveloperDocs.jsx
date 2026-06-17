import { Head, Link, usePage } from "@inertiajs/react";
import { appName, companyName } from "@/Utils/appIdentity";
import { BookOpen, Code2, Database, GitBranch, Route, Server } from "lucide-react";

const cards = [
    {
        title: "Stack",
        icon: Server,
        items: ["Laravel", "Inertia React", "Tailwind CSS", "PostgreSQL", "Node LTS 24"],
    },
    {
        title: "Role",
        icon: GitBranch,
        items: ["admin: akses penuh admin", "pegawai: portal pegawai", "Jabatan organisasi bukan role akses"],
    },
    {
        title: "Entity Utama",
        icon: Database,
        items: ["users, directorates, divisions, departments", "letter_types, letters", "letter_targets, attachments, dispositions", "read receipts, notification logs", "Laravel file log melalui Log Viewer"],
    },
    {
        title: "Route Utama",
        icon: Route,
        items: ["/login", "/admin/dashboard", "/admin/dokumentasi", "/pegawai/dashboard", "/pegawai/surat", "/pegawai/dokumentasi"],
    },
];

const setup = [
    "composer install",
    "npm install",
    "cp .env.example .env",
    "php artisan key:generate",
    "php artisan migrate --seed",
    "php artisan storage:link",
    "npm run build",
    "php artisan serve",
];

export default function DeveloperDocs() {
    const { settings } = usePage().props;

    return (
        <>
            <Head title={`Developer Docs - ${appName(settings)}`} />
            <div className="min-h-screen bg-gray-100">
                <header className="border-b border-gray-200 bg-white">
                    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold uppercase text-gray-950">Developer Docs</div>
                                <div className="text-xs text-gray-500">{appName(settings)}</div>
                            </div>
                        </div>
                        <Link href="/login" className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                            Login
                        </Link>
                    </div>
                </header>

                <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
                    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <Code2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-950">Dokumentasi Developer</h1>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                                    Ringkasan teknis aplikasi persuratan dan arsip digital berbasis web/PWA untuk {companyName(settings)}. Halaman ini public agar developer dapat membaca setup dan arsitektur dasar tanpa login.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-5 md:grid-cols-2">
                        {cards.map(({ title, icon: Icon, items }) => (
                            <section key={title} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h2 className="text-base font-semibold text-gray-950">{title}</h2>
                                </div>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    {items.map((item) => (
                                        <li key={item} className="rounded-lg bg-gray-50 px-3 py-2">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ))}
                    </div>

                    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-semibold text-gray-950">Nomor Surat Manual</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Nomor publik surat disimpan pada <code>letter_number</code> dari input user. <code>reference</code> tetap menjadi ID teknis internal dan tidak dipakai sebagai nomor utama di UI.
                        </p>
                    </section>

                    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-semibold text-gray-950">Rencana Notifikasi Web Push dan Email</h2>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                            Fase berikutnya disarankan memakai tabel subscription per perangkat, VAPID key, queue job, dan Laravel Notification/Mail. Push hanya berisi metadata ringkas dan link detail, sedangkan email menjadi dokumentasi pengiriman. Semua percobaan pengiriman dicatat ke notification_logs.
                        </p>
                    </section>

                    <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-semibold text-gray-950">Setup Lokal</h2>
                        <div className="mt-4 grid gap-2">
                            {setup.map((command) => (
                                <code key={command} className="rounded-lg bg-gray-950 px-3 py-2 text-sm text-white">
                                    {command}
                                </code>
                            ))}
                        </div>
                        <p className="mt-4 text-sm text-gray-600">
                            Akun seed default: <strong>admin/password</strong> untuk admin dan <strong>pegawai/password</strong> untuk pegawai.
                        </p>
                    </section>
                </main>
            </div>
        </>
    );
}
