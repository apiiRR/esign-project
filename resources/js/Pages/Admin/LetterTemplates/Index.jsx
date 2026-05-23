// import Head dan Link dari Inertia
import { Head, Link, usePage } from "@inertiajs/react";

// import LayoutAccount
import LayoutAdmin from "@/Layouts/LayoutAdmin";

// import hasAnyPermission
import hasAnyPermission from "@/Utils/Permission";

// import icons
import {
    Edit,
    CheckCircle,
    XCircle,
    Calendar,
} from "lucide-react";

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

export default function LetterTemplatesIndex() {

    //destruct props "templates"
    const { templates, filterOptions = {} } = usePage().props;

    return (
        <>
            <Head title={`Master Surat - ${import.meta.env.VITE_APP_NAME}`} />
            <LayoutAdmin>
                {/* Header dengan judul dan tombol tambah */}
                <div className="mb-8">
                    <PageHeader
                        showButton
                        title="Master Surat"
                        description="Kelola template surat internal dan surat keluar perusahaan"
                        action="/admin/letter-templates/create"
                        actionText="Tambah Surat"
                        permission="letter-templates.create"
                    />
                </div>

                {/* Card untuk tabel */}
                <div className="p-6 bg-white rounded-xl shadow-sm">

                    <Search URL={'/admin/letter-templates'} filters={[
                        { key: "categories", label: "Kategori", options: filterOptions.categories || [] },
                        { key: "statuses", label: "Status", options: filterOptions.statuses || [] },
                    ]} />

                    {/* Table */}
                    <div className="overflow-x-auto border border-gray-200 rounded-lg mt-5">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        No.
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Nama Surat
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                        Dibuat
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-7">
                                        Aksi
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {templates && templates.data.length > 0 ? (
                                    templates.data.map((template, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {++index + (templates.current_page - 1) * templates.per_page}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {template.name}
                                                    </div>
                                                    {template.description && (
                                                        <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
                                                            {template.description}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {template.status === "active" ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Aktif
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Nonaktif
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    {new Date(template.created_at).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric',
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    {
                                                        hasAnyPermission(['letter-templates.edit']) &&
                                                        <Link
                                                            href={`/admin/letter-templates/${template.id}/edit`}
                                                            className="inline-flex items-center p-2 bg-blue-50 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                                                            title="Edit"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Link>
                                                    }
                                                    {
                                                        hasAnyPermission(['letter-templates.delete']) &&
                                                            <Delete URL={'/admin/letter-templates'} id={template.id} />
                                                    }
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <TableEmpty
                                        title="Tidak ada Template"
                                        description="Silahkan tambahkan template baru"
                                        colSpan={5}
                                    />
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="my-3">
                        <Pagination links={templates.links} />
                    </div>

                </div>

            </LayoutAdmin>
        </>
    );
}
