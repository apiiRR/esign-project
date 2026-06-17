// import Head dan Link dari Inertia
import { Head, Link, useForm, usePage } from "@inertiajs/react";

// import LayoutAdmin
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { appName } from "@/Utils/appIdentity";

// import icons
import { Save } from "lucide-react";

// import component PageHeader
import PageHeader from "@/Shared/PageHeader";

export default function RolesEdit() {

    // props dari controller
    const { role, permissions, rolePermissions, settings } = usePage().props;

    // useForm untuk mengelola form data
    const { data, setData, put, processing, errors } = useForm({
        name: role.name || "",
        permissions: rolePermissions || [],
    });

    // group permission berdasarkan prefix (roles.*, users.*, dll)
    const groupedPermissions = permissions.reduce((groups, permission) => {
        const [group] = permission.name.split('.');
        const groupName = group.charAt(0).toUpperCase() + group.slice(1);

        if (!groups[groupName]) {
            groups[groupName] = [];
        }

        groups[groupName].push(permission);
        return groups;
    }, {});

    // fungsi togglePermission
    const togglePermission = (id) => {
        setData(
            'permissions',
            data.permissions.includes(id)
                ? data.permissions.filter(item => item !== id)
                : [...data.permissions, id]
        );
    };

    // fungsi handleSubmit
    const handleSubmit = (e) => {
        e.preventDefault();

        // kirim data ke server
        put(`/admin/roles/${role.id}`);
    };

    return (
        <>
            <Head title={`Edit Role - ${appName(settings)}`} />
            <LayoutAdmin>

                {/* Header */}
                <div className="mb-8">
                    <PageHeader
                        title="Edit Role"
                        description="Perbarui role dan hak akses yang dimiliki"
                    />
                </div>

                {/* Card */}
                <div className="p-6 bg-white rounded-xl shadow-sm">

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6">

                            {/* Role Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Role
                                </label>
                                <input
                                    type="text"
                                    value={data.name}
                                    readOnly
                                    className={`w-full px-4 py-2 border rounded-lg bg-gray-50 text-gray-600 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Nama role tidak dapat diubah; jabatan kerja diatur pada data user.
                                </p>
                                {errors.name && (
                                    <p className="mt-1 text-sm text-red-600">
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Permissions */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Permissions
                                </label>

                                {/* GRID GROUP */}
                                <div className="grid grid-cols-2 gap-4">
                                    {Object.keys(groupedPermissions).map(group => (
                                        <div
                                            key={group}
                                            className="border border-gray-200 rounded-xl p-4 bg-gray-50"
                                        >
                                            <h4 className="text-sm font-semibold text-gray-800 mb-3">
                                                {group}
                                            </h4>

                                            {/* CHECKBOX GRID */}
                                            <div className="grid grid-cols-1 gap-2">
                                                {groupedPermissions[group].map(permission => (
                                                    <label
                                                        key={permission.id}
                                                        className="flex items-center space-x-2 text-sm text-gray-700"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={data.permissions.includes(permission.id)}
                                                            onChange={() => togglePermission(permission.id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span>{permission.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {errors.permissions && (
                                    <p className="mt-2 text-sm text-red-600">
                                        {errors.permissions}
                                    </p>
                                )}
                            </div>

                        </div>

                        {/* Tombol Aksi */}
                        <div className="flex justify-start space-x-3 pt-6">
                            <Link
                                href="/admin/roles"
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
