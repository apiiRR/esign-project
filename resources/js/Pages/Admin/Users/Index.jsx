import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import hasAnyPermission from "@/Utils/Permission";
import Search from "@/Shared/Search";
import Pagination from "@/Shared/Pagination";
import Delete from "@/Shared/Delete";
import {
    Building2,
    Edit,
    Mail,
    Shield,
    UserCheck,
    Users,
} from "lucide-react";

function roleLabel(user) {
    return user.role || (user.roles?.length ? user.roles.map((role) => role.name).join(", ") : "pegawai");
}

export default function UsersIndex() {
    const { users, filterOptions = {} } = usePage().props;
    const rows = users?.data || [];

    return (
        <>
            <Head title={`Users - ${(import.meta.env.VITE_APP_NAME || "SADIKA")}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-950">Users Perusahaan</h1>
                            <p className="mt-2 text-sm text-gray-600">
                                Kelola akun, role akses, assignment organisasi, dan status pengguna PT Berdikari.
                            </p>
                        </div>
                        {hasAnyPermission(["users.create"]) ? (
                            <Link href="/admin/users/create" className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                                <Users className="mr-2 h-4 w-4" />
                                Tambah User
                            </Link>
                        ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                        {[
                            ["Total User", users?.total || rows.length, Users],
                            ["Role Admin", rows.filter((user) => roleLabel(user).includes("admin")).length, Shield],
                            ["Pegawai Aktif", rows.filter((user) => user.role === "pegawai" && user.status === "active").length, UserCheck],
                            ["Unit Organisasi", new Set(rows.map((user) => user.department_id).filter(Boolean)).size, Building2],
                        ].map(([label, value, Icon]) => (
                            <div key={label} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <Icon className="h-5 w-5 text-emerald-700" />
                                <div className="mt-4 text-2xl font-bold text-gray-950">{value}</div>
                                <div className="text-sm text-gray-600">{label}</div>
                            </div>
                        ))}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL="/admin/users" filters={[
                            { key: "roles", label: "Role", options: filterOptions.roles || [] },
                            { key: "statuses", label: "Status", options: filterOptions.statuses || [] },
                            { key: "directorate_ids", label: "Direktorat", options: filterOptions.directorates || [] },
                            { key: "division_ids", label: "Divisi", options: filterOptions.divisions || [] },
                            { key: "department_ids", label: "Department", options: filterOptions.departments || [] },
                        ]} />

                        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {["User", "Role Akses", "Organisasi", "Jabatan", "Status", "Last Login", "Aksi"].map((column) => (
                                            <th key={column} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {rows.length ? rows.map((user) => {
                                        return (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
                                                            {(user.name || "U").slice(0, 1)}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-950">{user.name}</div>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <Mail className="h-3 w-3" />
                                                                {user.email || "-"}
                                                            </div>
                                                            <div className="mt-1 text-xs text-gray-500">username: {user.username}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                        {roleLabel(user)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-700">
                                                    <div className="font-medium text-gray-900">{user.directorate?.name || "-"}</div>
                                                    <div className="text-xs text-gray-500">{user.division?.name || "-"} · {user.department?.name || "-"}</div>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-700">{user.position || "-"}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                                                        {user.status === "active" ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-600">{user.last_login_at || "-"}</td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        {hasAnyPermission(["users.edit"]) ? (
                                                            <Link href={`/admin/users/${user.id}/edit`} className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-600 hover:bg-blue-100" title="Edit">
                                                                <Edit className="h-4 w-4" />
                                                            </Link>
                                                        ) : null}
                                                        {hasAnyPermission(["users.delete"]) ? <Delete URL="/admin/users" id={user.id} /> : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="7" className="px-5 py-12 text-center">
                                                <div className="font-semibold text-gray-900">Belum ada user</div>
                                                <div className="mt-1 text-sm text-gray-500">Tambahkan user perusahaan untuk mulai mengatur akses.</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {users?.links ? (
                            <div className="mt-4">
                                <Pagination links={users.links} />
                            </div>
                        ) : null}
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}
