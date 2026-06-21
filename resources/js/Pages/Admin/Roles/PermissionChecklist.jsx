const permissionDescriptions = {
    "dashboard.index": "Mengakses dashboard admin.",
    "user.dashboard": "Mengakses dashboard portal user.",
    "user.letters.create": "Menampilkan tombol dan form buat dokumen di portal user.",
    "users.index": "Melihat daftar user.",
    "users.create": "Menambahkan user baru.",
    "users.edit": "Mengubah data user, status akun, posisi, dan role.",
    "users.delete": "Menghapus user.",
    "roles.index": "Melihat daftar role.",
    "roles.create": "Membuat role baru.",
    "roles.edit": "Mengubah nama role dan hak aksesnya.",
    "roles.delete": "Menghapus role yang tidak sedang dipakai user.",
    "permissions.index": "Melihat daftar permission aktif.",
    "permissions.create": "Menambahkan permission baru bila fitur ini dibuka.",
    "permissions.edit": "Mengubah data permission bila fitur ini dibuka.",
    "permissions.delete": "Menghapus permission bila fitur ini dibuka.",
    "letters.index": "Melihat daftar dokumen admin.",
    "letters.create": "Membuat dokumen dari area admin.",
    "letters.show": "Melihat detail dokumen.",
    "letters.edit": "Mengubah status atau nomor dokumen.",
    "letters.delete": "Menghapus draft dokumen.",
    "settings.index": "Melihat halaman settings aplikasi.",
    "settings.update": "Menyimpan perubahan settings aplikasi.",
    "audit-trails.index": "Melihat audit trail aktivitas user.",
};

const groupLabels = {
    Dashboard: "Dashboard",
    User: "Portal User",
    Users: "Users",
    Roles: "Roles",
    Permissions: "Permissions",
    Letters: "Dokumen",
    Settings: "Settings",
    "Audit-trails": "Audit Trail",
};

export function groupPermissions(permissions) {
    return permissions.reduce((groups, permission) => {
        const [group] = permission.name.split(".");
        const groupName = group.charAt(0).toUpperCase() + group.slice(1);

        if (!groups[groupName]) {
            groups[groupName] = [];
        }

        groups[groupName].push(permission);
        return groups;
    }, {});
}

export default function PermissionChecklist({ groupedPermissions, selectedPermissions, onToggle }) {
    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {Object.keys(groupedPermissions).map((group) => (
                <div key={group} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-3 text-sm font-semibold text-gray-800">
                        {groupLabels[group] || group}
                    </h4>

                    <div className="grid gap-2">
                        {groupedPermissions[group].map((permission) => (
                            <label
                                key={permission.id}
                                className="flex min-w-0 items-start gap-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(permission.id)}
                                    onChange={() => onToggle(permission.id)}
                                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="min-w-0">
                                    <span className="font-semibold text-gray-900">{permission.name}</span>
                                    <span className="ml-2 text-xs leading-5 text-gray-500">
                                        {permissionDescriptions[permission.name] || "Hak akses untuk fitur terkait."}
                                    </span>
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
