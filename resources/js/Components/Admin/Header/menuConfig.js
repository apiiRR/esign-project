import {
    Bell,
    Archive,
    FileText,
    KeyRound,
    LayoutDashboard,
    Mail,
    Network,
    Send,
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
        name: "Surat",
        icon: FileText,
        dropdown: [
            {
                name: "Masuk Eksternal",
                href: "/admin/surat/masuk-eksternal",
                icon: Send,
                description: "Surat dari pihak luar",
            },
            {
                name: "Internal",
                href: "/admin/surat/internal",
                icon: Mail,
                description: "Surat antar unit kerja",
            },
            {
                name: "Keluar",
                href: "/admin/surat/keluar",
                icon: Send,
                description: "Surat untuk pihak luar",
            },
            {
                name: "Arsip Surat",
                href: "/admin/surat/arsip",
                icon: Archive,
                description: "Scan surat yang disimpan di sistem",
            },
        ],
    },
    {
        name: "Master Data",
        icon: FileText,
        dropdown: [
            {
                name: "Direktorat",
                href: "/admin/organisasi/directorates",
                icon: Network,
                description: "Master direktorat dan Direktur",
            },
            {
                name: "Divisi",
                href: "/admin/organisasi/divisions",
                icon: Network,
                description: "Master divisi dan General Manager",
            },
            {
                name: "Department",
                href: "/admin/organisasi/departments",
                icon: Network,
                description: "Master department dan Manager",
            },
            {
                name: "Jenis Surat",
                href: "/admin/letter-types",
                icon: FileText,
                description: "Kategori jenis surat",
            },
        ],
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
                name: "Role & Hak Akses",
                href: "/admin/roles",
                icon: KeyRound,
                description: "Role admin dan pegawai",
            },
            {
                name: "Notifikasi",
                href: "/admin/notifikasi",
                icon: Bell,
                description: "Web push dan inbox alert",
            },
        ],
    },
];

export const getFilteredMenuItems = () => menuItems;

export const getFilteredDropdown = (dropdownItems) => dropdownItems || [];
