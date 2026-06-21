export default function PermissionChecklist({ permissions, selectedPermissions, onToggle }) {
    const createDocumentPermission = permissions.find((permission) => permission.name === "user.letters.create");

    if (!createDocumentPermission) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Permission buat dokumen belum tersedia. Jalankan seeder permission terlebih dahulu.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <label className="flex min-w-0 items-start gap-3 rounded-lg bg-white px-4 py-3 text-sm text-gray-700">
                <input
                    type="checkbox"
                    checked={selectedPermissions.includes(createDocumentPermission.id)}
                    onChange={() => onToggle(createDocumentPermission.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="min-w-0">
                    <span className="font-semibold text-gray-900">Boleh membuat dokumen</span>
                    <span className="block text-xs leading-5 text-gray-500">
                        User dengan role ini dapat melihat tombol dan form Buat Dokumen di dashboard user.
                    </span>
                </span>
            </label>
        </div>
    );
}
