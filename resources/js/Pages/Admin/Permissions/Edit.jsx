// import Head dan Link dari Inertia
import { Head, Link, useForm, usePage } from "@inertiajs/react";

// import LayoutAdmin
import LayoutAdmin from "@/Layouts/LayoutAdmin";

// import icons
import { Save } from "lucide-react";

// import component PageHeader
import PageHeader from "@/Shared/PageHeader";
import { appName } from "@/Utils/appIdentity";

export default function PermissionsEdit() {

    // destruct permission dari props
    const { permission, settings } = usePage().props;

    // useForm untuk mengelola form data
    const { data, setData, put, processing, errors } = useForm({
        name: permission.name || "",
    });

    // fungsi handleSubmit
    const handleSubmit = (e) => {
        e.preventDefault();

        // kirim data ke server
        put(`/admin/permissions/${permission.id}`);
    };

    return (
        <>
            <Head title={`Edit Permission - ${appName(settings)}`} />
            <LayoutAdmin>

                {/* Header */}
                <div className="mb-8">
                    <PageHeader
                        title="Edit Permission"
                        description="Perbarui data permission untuk hak akses pengguna"
                    />
                </div>

                {/* Card */}
                <div className="p-6 bg-white rounded-xl shadow-sm">

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">

                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Permission
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className={`w-full px-4 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Contoh: permissions.edit"
                                />
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex justify-start space-x-3 pt-6">
                            <Link
                                href="/admin/permissions"
                                className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Batal
                            </Link>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {processing ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>

                    </form>

                </div>

            </LayoutAdmin>
        </>
    );
}
