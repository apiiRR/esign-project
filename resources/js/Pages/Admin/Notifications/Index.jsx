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
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="w-full min-w-[980px] table-fixed divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="w-[16%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Waktu</th>
                                    <th className="w-[18%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">User</th>
                                    <th className="w-[16%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Surat</th>
                                    <th className="w-[10%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Channel</th>
                                    <th className="w-[28%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Judul</th>
                                    <th className="w-[12%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(notifications.data || []).map((row) => (
                                    <tr key={row.id}>
                                        <td className="w-[16%] px-5 py-4 text-sm text-gray-700">{row.created_at}</td>
                                        <td className="w-[18%] px-5 py-4 text-sm text-gray-900">
                                            <div className="min-w-0 break-words">{row.user?.name || "-"}</div>
                                        </td>
                                        <td className="w-[16%] px-5 py-4 text-sm text-gray-700">
                                            <div className="min-w-0 break-words">{row.letter?.letter_number || row.letter?.reference || "-"}</div>
                                        </td>
                                        <td className="w-[10%] px-5 py-4 text-sm text-gray-700">{row.channel}</td>
                                        <td className="w-[28%] px-5 py-4 text-sm text-gray-900">
                                            <div className="min-w-0 break-words font-medium">{row.title}</div>
                                            {row.body ? <div className="mt-1 min-w-0 break-words text-xs text-gray-500">{row.body}</div> : null}
                                        </td>
                                        <td className="w-[12%] px-5 py-4 text-sm text-gray-700">{row.read_at ? "Dibaca" : "Belum dibaca"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={notifications.links} />
                </div>
            </LayoutAdmin>
        </>
    );
}
