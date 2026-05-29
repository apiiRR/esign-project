import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Activity, Archive, Bell, Building2, FileInput, Mail, Users } from "lucide-react";

export default function Dashboard() {
    const { stats, recentLetters, recentNotifications } = usePage().props;
    const cards = [
        ["Surat Masuk Eksternal", stats.incoming_external, FileInput, "/admin/surat/masuk-eksternal"],
        ["Surat Internal", stats.internal, Mail, "/admin/surat/internal"],
        ["Disposisi Aktif", stats.active_dispositions, Activity, "/admin/disposisi"],
        ["User", stats.users, Users, "/admin/users"],
        ["Arsip Scan", stats.archived_scans, Archive, "/admin/surat/arsip"],
        ["Unit Organisasi", stats.organization_units, Building2, "/admin/organisasi/directorates"],
    ];

    return (
        <>
            <Head title={`Dashboard - ${(import.meta.env.VITE_APP_NAME || "SADIKA")}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Dashboard Admin</h1>
                        <p className="mt-2 text-sm text-gray-600">Ringkasan data nyata surat, arsip scan, user, disposisi, dan notifikasi.</p>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                        {cards.map(([label, value, Icon, href]) => (
                            <Link key={label} href={href} className="col-span-12 rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300 sm:col-span-6 lg:col-span-4 xl:col-span-2">
                                <Icon className="h-5 w-5 text-emerald-700" />
                                <div className="mt-4 text-2xl font-bold text-gray-950">{value}</div>
                                <div className="text-sm text-gray-600">{label}</div>
                            </Link>
                        ))}
                    </div>
                    <div className="grid gap-6 xl:grid-cols-3">
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm xl:col-span-2">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 className="font-semibold text-gray-950">Surat Terbaru</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {(recentLetters || []).map((letter) => (
                                    <Link key={letter.id} href={`/admin/surat/${letter.id}`} className="grid min-w-0 gap-3 px-5 py-4 text-sm hover:bg-gray-50 md:grid-cols-12 md:items-center">
                                        <div className="min-w-0 md:col-span-6">
                                            <div className="font-semibold text-gray-950 break-words">{letter.subject}</div>
                                            <div className="text-xs text-gray-500 break-words">{letter.reference}</div>
                                        </div>
                                        <div className="text-gray-600 md:col-span-2">{letter.type}</div>
                                        <div className="text-gray-600 md:col-span-2">{letter.status}</div>
                                        <div className="text-gray-500 md:col-span-2 md:text-right">{letter.creator?.name || "-"}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 className="font-semibold text-gray-950">Notifikasi Terbaru</h2>
                            </div>
                            <div className="space-y-4 p-5">
                                {(recentNotifications || []).map((notification) => (
                                    <div key={notification.id} className="flex gap-3 text-sm">
                                        <Bell className="mt-0.5 h-4 w-4 text-emerald-700" />
                                        <div className="min-w-0">
                                            <div className="font-medium text-gray-950 break-words">{notification.title}</div>
                                            <div className="text-xs text-gray-500 break-words">{notification.user?.name || "-"} · {notification.letter?.reference || "-"} · {notification.created_at}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}
