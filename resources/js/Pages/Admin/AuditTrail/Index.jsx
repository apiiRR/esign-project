import { Head, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import Search from "@/Shared/Search";

export default function AuditTrailIndex() {
    const { audits, filterOptions = {} } = usePage().props;
    return (
        <>
            <Head title="Audit Trail - Admin" />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Audit Trail</h1>
                        <p className="mt-2 text-sm text-gray-600">Jejak aktivitas penting aplikasi.</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL="/admin/audit-trail" filters={[
                            { key: "actions", label: "Aktivitas", options: filterOptions.actions || [] },
                            { key: "user_ids", label: "User", options: filterOptions.users || [] },
                        ]} />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50"><tr>{["Waktu", "User", "Aksi", "Object", "Meta"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{h}</th>)}</tr></thead>
                            <tbody className="divide-y divide-gray-100">
                                {(audits.data || []).map((audit) => <tr key={audit.id}><td className="px-5 py-4 text-sm">{audit.created_at}</td><td className="px-5 py-4 text-sm">{audit.user?.name || "System"}</td><td className="px-5 py-4 text-sm">{audit.action}</td><td className="px-5 py-4 text-sm">{audit.auditable_type || "-"} #{audit.auditable_id || "-"}</td><td className="px-5 py-4 text-xs text-gray-500">{JSON.stringify(audit.meta || {})}</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    <Pagination links={audits.links} />
                </div>
            </LayoutAdmin>
        </>
    );
}
