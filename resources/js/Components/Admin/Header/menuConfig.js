import {
    FileText,
    History,
    LayoutDashboard,
    Shield,
    Users,
} from "lucide-react";

export const menuItems = [
    {
        name: "Dashboard",
        icon: LayoutDashboard,
        href: "/admin/dashboard",
    },
    {
        name: "Dokumen",
        icon: FileText,
        href: "/admin/surat/internal",
    },
    {
        name: "Administrasi",
        icon: Shield,
        dropdown: [
            {
                name: "Users",
                href: "/admin/users",
                icon: Users,
                description: "User perusahaan",
            },
            {
                name: "Audit Trail",
                href: "/admin/audit-trails",
                icon: History,
                description: "Riwayat aktivitas user",
            },
        ],
    },
];

export const getFilteredMenuItems = () => menuItems;

export const getFilteredDropdown = (dropdownItems) => dropdownItems || [];
