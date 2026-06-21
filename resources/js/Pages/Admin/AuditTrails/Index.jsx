import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import { appName } from "@/Utils/appIdentity";

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

export default function AuditTrailIndex() {
    const { auditTrails, filters = {}, filterOptions = {}, settings } = usePage().props;
    const [form, setForm] = useState({
        category: filters.category || "",
        user_id: filters.user_id || "",
        date_from: filters.date_from || "",
        date_to: filters.date_to || "",
    });

    const submit = (event) => {
        event.preventDefault();
        router.get("/admin/audit-trails", form, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <Head title={`Audit Trail - ${appName(settings)}`} />
            <LayoutAdmin>
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-950">Audit Trail</h1>
                    <p className="mt-1 text-sm text-gray-500">Riwayat aktivitas user, dokumen, login, tanda tangan, dan download.</p>
                </div>

                <div className="rounded-xl bg-white p-4 shadow-sm sm:p-5">
                    <form onSubmit={submit} className="grid gap-3 md:grid-cols-5">
                        <Select label="Kategori" value={form.category} onChange={(value) => setForm({ ...form, category: value })}>
                            <option value="">Semua kategori</option>
                            {(filterOptions.categories || []).map((category) => <option key={category} value={category}>{category}</option>)}
                        </Select>
                        <Select label="User" value={form.user_id} onChange={(value) => setForm({ ...form, user_id: value })}>
                            <option value="">Semua user</option>
                            {(filterOptions.users || []).map((user) => <option key={user.id} value={user.id}>{user.name || user.username}</option>)}
                        </Select>
                        <Field label="Dari" type="date" value={form.date_from} onChange={(value) => setForm({ ...form, date_from: value })} />
                        <Field label="Sampai" type="date" value={form.date_to} onChange={(value) => setForm({ ...form, date_to: value })} />
                        <div className="flex items-end">
                            <button type="submit" className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Filter</button>
                        </div>
                    </form>

                    <div className="mt-5 grid gap-3 md:hidden">
                        {(auditTrails?.data || []).length ? auditTrails.data.map((trail) => (
                            <div key={trail.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="break-words text-sm font-semibold text-gray-950">{trail.action}</div>
                                        <div className="mt-1 text-xs text-gray-500">{formatDate(trail.created_at)}</div>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{trail.category}</span>
                                </div>
                                <div className="mt-3 text-sm text-gray-700">
                                    <div className="font-semibold">{trail.user?.name || "-"}</div>
                                    <div className="break-words text-xs text-gray-500">{trail.user?.email || trail.user?.username || "-"}</div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-gray-700">
                                    <div>
                                        <div className="text-xs font-semibold uppercase text-gray-500">IP</div>
                                        <div className="mt-1 break-words">{trail.ip_address || "-"}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase text-gray-500">Device</div>
                                        <div className="mt-1 break-words">{trail.device || "-"}</div>
                                    </div>
                                </div>
                                <div className="mt-3 text-sm text-gray-700">
                                    <span className="font-semibold">Lokasi:</span> {[trail.city, trail.region, trail.country].filter(Boolean).join(", ") || "-"}
                                </div>
                                {trail.description ? <div className="mt-2 break-words text-sm text-gray-600">{trail.description}</div> : null}
                            </div>
                        )) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Belum ada audit trail.</div>
                        )}
                    </div>
                    <div className="mt-5 hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {["Waktu", "Kategori", "Aktivitas", "User", "IP & Device", "Lokasi", "Detail"].map((column) => (
                                        <th key={column} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">{column}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {(auditTrails?.data || []).length ? auditTrails.data.map((trail) => (
                                    <tr key={trail.id} className="align-top hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{formatDate(trail.created_at)}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">{trail.category}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{trail.action}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <div className="font-semibold text-gray-950">{trail.user?.name || "-"}</div>
                                            <div className="text-xs text-gray-500">{trail.user?.email || trail.user?.username || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <div>{trail.ip_address || "-"}</div>
                                            <div className="text-xs text-gray-500">{trail.device || "-"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            <div>{[trail.city, trail.region, trail.country].filter(Boolean).join(", ") || "-"}</div>
                                            <div className="text-xs text-gray-500">{trail.location_source || "-"}</div>
                                        </td>
                                        <td className="max-w-sm px-4 py-3 text-sm text-gray-700">
                                            <div>{trail.description || "-"}</div>
                                            {trail.metadata ? <pre className="mt-2 max-h-28 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-500">{JSON.stringify(trail.metadata, null, 2)}</pre> : null}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">Belum ada audit trail.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5">
                        <Pagination links={auditTrails.links || []} />
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function Field({ label, type = "text", value, onChange }) {
    return (
        <label className="block text-sm font-semibold text-gray-800">
            {label}
            <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
        </label>
    );
}

function Select({ label, value, onChange, children }) {
    return (
        <label className="block text-sm font-semibold text-gray-800">
            {label}
            <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {children}
            </select>
        </label>
    );
}
