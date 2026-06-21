// import Head dan Link dari Inertia
import { Head, Link, usePage } from "@inertiajs/react";

// import LayoutAdmin
import LayoutAdmin from "@/Layouts/LayoutAdmin";

// import hasAnyPermission
import hasAnyPermission from "@/Utils/Permission";

// import icons
import { Edit, Plus } from "lucide-react";

// import component PageHeader
import PageHeader from "@/Shared/PageHeader";

// import component TableEmpty
import TableEmpty from "@/Shared/TableEmpty";

// import component Search
import Search from "@/Shared/Search";

// import component Pagination
import Pagination from "@/Shared/Pagination";
import { appName } from "@/Utils/appIdentity";

export default function RolesIndex() {

    // destruct props "roles"
    const { roles, settings } = usePage().props;

    return (
        <>
            <Head title={`Roles - ${appName(settings)}`} />
            <LayoutAdmin>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <PageHeader
                            title="Roles"
                            description="Kelola role akses dan permission untuk setiap role."
                        />
                        {hasAnyPermission(['roles.create']) ? (
                            <Link href="/admin/roles/create" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto">
                                <Plus className="mr-2 h-4 w-4" />
                                Tambah Role
                            </Link>
                        ) : null}
                    </div>
                </div>

                {/* Card */}
                <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">

                    <Search URL={'/admin/roles'} />

                    {/* Table */}
                    <div className="mt-5 grid gap-3 md:hidden">
                        {roles && roles.data.length > 0 ? roles.data.map((role, index) => (
                            <div key={role.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="text-xs font-semibold text-gray-500">#{++index + (roles.current_page - 1) * roles.per_page}</div>
                                <div className="mt-1 break-words text-base font-semibold text-gray-950">{role.name}</div>
                                <div className="mt-2 text-sm text-gray-600">{role.permissions_count} permission</div>
                                {hasAnyPermission(['roles.edit']) ? (
                                    <Link href={`/admin/roles/${role.id}/edit`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-600">
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </Link>
                                ) : null}
                            </div>
                        )) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">Tidak ada role.</div>
                        )}
                    </div>
                    <div className="mt-5 hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                        No.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                        Nama Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                        Jumlah Permission
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase w-7">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {roles && roles.data.length > 0 ? (
                                    roles.data.map((role, index) => (
                                        <tr key={role.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {++index + (roles.current_page - 1) * roles.per_page}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {role.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                {role.permissions_count}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-2">
                                                    {
                                                        hasAnyPermission(['roles.edit']) &&
                                                            <Link
                                                                href={`/admin/roles/${role.id}/edit`}
                                                                className="inline-flex items-center p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                                                                title="Edit"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Link>
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <TableEmpty
                                        title="Tidak ada Role"
                                        description="Seeder role belum tersedia"
                                        colSpan={4}
                                    />
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="my-3">
                        <Pagination links={roles.links} />
                    </div>

                </div>

            </LayoutAdmin>
        </>
    );
}
