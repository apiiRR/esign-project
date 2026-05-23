import { Head, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import Search from "@/Shared/Search";

export default function NotificationsIndex() {
    const { notifications, filterOptions = {} } = usePage().props;
    return (
        <>
            <Head title="Notifikasi - Admin" />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Notifikasi</h1>
                        <p className="mt-2 text-sm text-gray-600">Log notifikasi web/inbox untuk surat dan disposisi.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL="/admin/notifikasi" filters={[
                            { key: "channels", label: "Channel", options: filterOptions.channels || [] },
                            { key: "read_statuses", label: "Status Baca", options: filterOptions.readStatuses || [] },
                            { key: "user_ids", label: "User", options: filterOptions.users || [] },
                        ]} />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50"><tr>{["Waktu", "User", "Surat", "Channel", "Judul", "Status"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {(notifications.data || []).map((row) => <tr key={row.id}><td className="px-5 py-4 text-sm">{row.created_at}</td><td className="px-5 py-4 text-sm">{row.user?.name || "-"}</td><td className="px-5 py-4 text-sm">{row.letter?.reference || "-"}</td><td className="px-5 py-4 text-sm">{row.channel}</td><td className="px-5 py-4 text-sm">{row.title}</td><td className="px-5 py-4 text-sm">{row.read_at ? "Dibaca" : "Belum dibaca"}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={notifications.links} />
                </div>
            </LayoutAdmin>
        </>
    );
}
