import { Link, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    Archive,
    Bell,
    BookOpen,
    CheckCircle2,
    FilePlus2,
    Inbox,
    LayoutDashboard,
    LogOut,
    Mail,
    Send,
    UserRound,
} from "lucide-react";

export default function LayoutPegawai({ children }) {
    const { url, props } = usePage();
    const user = props.auth?.user;
    const badges = props.pegawaiBadges || {};
    const [profileOpen, setProfileOpen] = useState(false);
    const menu = [
        { name: "Dashboard", href: "/pegawai/dashboard", icon: LayoutDashboard },
        { name: "Internal", href: "/pegawai/inbox/internal", icon: Mail, badge: badges.internal },
        { name: "Tebusan", href: "/pegawai/inbox/tebusan", icon: Send, badge: badges.tebusan },
        { name: "Disposisi", href: "/pegawai/disposisi", icon: Inbox, badge: badges.disposisi },
        { name: "Buat Surat", href: "/pegawai/surat", icon: FilePlus2 },
        { name: "Arsip Saya", href: "/pegawai/arsip", icon: Archive },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/pegawai/dashboard" className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="text-sm font-bold uppercase text-gray-950">PT Berdikari</div>
                            <div className="text-xs text-gray-500">Surat & Arsip Digital</div>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-2 lg:flex">
                        {menu.map((item) => {
                            const active = item.href === "/pegawai/surat" ? url.startsWith("/pegawai/surat") : url.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                                        active ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"
                                    }`}
                                >
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.name}
                                    {item.badge ? (
                                        <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/pegawai/notifikasi" className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Notifikasi">
                            <Bell className="h-5 w-5" />
                            {badges.notifications ? <span className="absolute right-1 top-1 rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">{badges.notifications}</span> : null}
                        </Link>
                        <div className="hidden text-right sm:block">
                            <div className="text-sm font-semibold text-gray-950">{user?.name || "Pegawai"}</div>
                            <div className="text-xs text-gray-500">{user?.department?.name || user?.position || "PT Berdikari"}</div>
                        </div>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setProfileOpen((open) => !open)}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white hover:bg-gray-800"
                                title="Menu user"
                            >
                                <UserRound className="h-4 w-4" />
                            </button>
                            {profileOpen ? (
                                <div className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                                    <div className="border-b border-gray-100 px-4 py-3">
                                        <div className="truncate text-sm font-semibold text-gray-950">{user?.name || "Pegawai"}</div>
                                        <div className="truncate text-xs text-gray-500">{user?.email || user?.username || "PT Berdikari"}</div>
                                    </div>
                                    <Link href="/pegawai/dokumentasi" onClick={() => setProfileOpen(false)} className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700">
                                        <BookOpen className="mr-3 h-4 w-4 text-gray-400" />
                                        Dokumentasi
                                    </Link>
                                    <Link href="/logout" method="post" as="button" className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700">
                                        <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                                        Logout
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 overflow-x-auto border-t border-gray-100 px-4 py-2 lg:hidden">
                    {menu.map((item) => (
                        <Link key={item.name} href={item.href} className="inline-flex shrink-0 items-center rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.name}
                            {item.badge ? <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{item.badge}</span> : null}
                        </Link>
                    ))}
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
