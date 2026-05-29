// import Head dan Link dari Inertia
import { Head, Link, usePage } from "@inertiajs/react";

// import LayoutAdmin
import LayoutAdmin from "@/Layouts/LayoutAdmin";

// import hasAnyPermission
import hasAnyPermission from "@/Utils/Permission";

// import icons
import { Edit } from "lucide-react";

// import component PageHeader
import PageHeader from "@/Shared/PageHeader";

// import component TableEmpty
import TableEmpty from "@/Shared/TableEmpty";

// import component Search
import Search from "@/Shared/Search";

// import component Pagination
import Pagination from "@/Shared/Pagination";

// import component Delete
import Delete from "@/Shared/Delete";

export default function PermissionsIndex() {

    // destruct props "permissions" dari usePage
    const { permissions } = usePage().props;

    return (
        <>
            <Head title={`Permissions - ${(import.meta.env.VITE_APP_NAME || "SADIKA")}`} />
            <LayoutAdmin>

                {/* Header */}
                <div className="mb-8">
                    <PageHeader
                        showButton
                        title="Permissions"
                        description="Kelola permission untuk hak akses pengguna"
                        action="/admin/permissions/create"
                        actionText="Tambah Permission"
                        permission="permissions.create"
                    />
                </div>

                {/* Card */}
                <div className="p-6 bg-white rounded-xl shadow-sm">

                    <Search URL={'/admin/permissions'} />

                    {/* Table */}
                    <div className="overflow-x-auto border border-gray-200 rounded-lg mt-5">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                        No.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                        Nama Permission
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-7">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {permissions && permissions.data.length > 0 ? (
                                    permissions.data.map((permission, index) => (
                                        <tr key={permission.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {++index + (permissions.current_page - 1) * permissions.per_page}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {permission.name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {
                                                        hasAnyPermission(['permissions.edit']) &&
                                                        <Link
                                                            href={`/admin/permissions/${permission.id}/edit`}
                                                            className="inline-flex items-center p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    }
                                                    {
                                                        hasAnyPermission(['permissions.delete']) &&
                                                            <Delete URL={'/admin/permissions'} id={permission.id} />
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <TableEmpty
                                        title="Tidak ada Permission"
                                        description="Silahkan tambahkan permission baru"
                                        colSpan={3}
                                    />
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="my-3">
                        <Pagination links={permissions.links} />
                    </div>

                </div>

            </LayoutAdmin>
        </>
    );
}
