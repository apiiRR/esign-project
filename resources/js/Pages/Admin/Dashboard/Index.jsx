import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { FileText, Users } from "lucide-react";
import { appName } from "@/Utils/appIdentity";

export default function Dashboard() {
    const { stats, documents = [], users = [], settings } = usePage().props;
    const cards = [
        ["Total Dokumen", stats.documents_total, FileText, "/admin/surat/internal"],
        ["Total User", stats.users_total, Users, "/admin/users"],
    ];

    return (
        <>
            <Head title={`Dashboard - ${appName(settings)}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Dashboard Admin</h1>
                        <p className="mt-2 text-sm text-gray-600">Ringkasan dokumen internal dan semua user terdaftar.</p>
                    </div>
                    <div className="grid grid-cols-12 gap-4">
                        {cards.map(([label, value, Icon, href]) => (
                            <Link key={label} href={href} className="col-span-12 rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300 sm:col-span-6">
                                <Icon className="h-5 w-5 text-emerald-700" />
                                <div className="mt-4 text-2xl font-bold text-gray-950">{value}</div>
                                <div className="text-sm text-gray-600">{label}</div>
                            </Link>
                        ))}
                    </div>
                    <div className="grid gap-6 xl:grid-cols-2">
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 className="font-semibold text-gray-950">Kumpulan Dokumen</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {documents.map((letter) => (
                                    <Link key={letter.id} href={`/admin/surat/${letter.id}`} className="grid min-w-0 gap-3 px-5 py-4 text-sm hover:bg-gray-50 md:grid-cols-12 md:items-center">
                                        <div className="min-w-0 md:col-span-6">
                                            <div className="font-semibold text-gray-950 break-words">{letter.subject}</div>
                                            <div className="text-xs text-gray-500 break-words">{letter.letter_number || "-"}</div>
                                        </div>
                                        <div className="text-gray-600 md:col-span-3">{letter.status}</div>
                                        <div className="text-gray-500 md:col-span-3 md:text-right">{letter.creator?.name || "-"}</div>
                                    </Link>
                                ))}
                                {!documents.length ? <EmptyRow text="Belum ada dokumen." /> : null}
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 px-5 py-4">
                                <h2 className="font-semibold text-gray-950">User Terdaftar</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {users.map((user) => (
                                    <Link key={user.id} href={`/admin/users/${user.id}/edit`} className="grid min-w-0 gap-3 px-5 py-4 text-sm hover:bg-gray-50 md:grid-cols-12 md:items-center">
                                        <div className="min-w-0 md:col-span-5">
                                            <div className="font-semibold text-gray-950 break-words">{user.name}</div>
                                            <div className="text-xs text-gray-500 break-words">{user.email || "-"}</div>
                                        </div>
                                        <div className="text-gray-600 md:col-span-3">
                                            <div>{user.username}</div>
                                            <div className="text-xs text-gray-500">{roleLabel(user)}</div>
                                        </div>
                                        <div className="text-gray-600 md:col-span-2">{user.position || "-"}</div>
                                        <div className="md:col-span-2 md:text-right">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                                {user.status === "active" ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </div>
                                    </Link>
                                ))}
                                {!users.length ? <EmptyRow text="Belum ada user." /> : null}
                            </div>
                        </div>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function roleLabel(user) {
    return user.roles?.length ? user.roles.map((role) => role.name).join(", ") : (user.role || "user");
}

function EmptyRow({ text }) {
    return <div className="px-5 py-10 text-center text-sm text-gray-500">{text}</div>;
}
