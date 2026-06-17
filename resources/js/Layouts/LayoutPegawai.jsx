import { Link, usePage } from "@inertiajs/react";
import { useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import { appName, companyName } from "@/Utils/appIdentity";
import {
    Archive,
    Bell,
    BookOpen,
    CheckCheck,
    ChevronDown,
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
    const settings = props.settings || {};
    const badges = props.pegawaiBadges || {};
    const [profileOpen, setProfileOpen] = useState(false);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [mobileInboxOpen, setMobileInboxOpen] = useState(false);
    const inboxBadge = Number(badges.internal || 0) + Number(badges.tebusan || 0) + Number(badges.disposisi || 0);
    const inboxItems = [
        { name: "Internal", href: "/pegawai/inbox/internal", icon: Mail, badge: badges.internal },
        { name: "Tebusan", href: "/pegawai/inbox/tebusan", icon: Send, badge: badges.tebusan },
        { name: "Disposisi", href: "/pegawai/disposisi", icon: Inbox, badge: badges.disposisi },
    ];
    const menu = [
        { name: "Dashboard", href: "/pegawai/dashboard", icon: LayoutDashboard },
        { name: "Approval", href: "/pegawai/approval", icon: CheckCheck, badge: badges.approval },
        { name: "Buat Surat", href: "/pegawai/surat", icon: FilePlus2 },
        { name: "Arsip Saya", href: "/pegawai/arsip", icon: Archive },
    ];
    const inboxActive = url.startsWith("/pegawai/inbox") || url.startsWith("/pegawai/disposisi");
    const createRoutes = [
        "/pegawai/surat",
        "/pegawai/surat/internal",
        "/pegawai/surat/keluar",
        "/pegawai/surat/masuk-eksternal",
        "/pegawai/surat/arsip",
    ];
    const currentPath = url.split("?")[0];
    const isLetterDetail = /^\/pegawai\/surat\/\d+$/.test(currentPath);
    const isMenuActive = (item) => {
        if (item.href === "/pegawai/surat") {
            return createRoutes.includes(currentPath);
        }

        if (item.href === "/pegawai/arsip" && isLetterDetail) {
            return true;
        }

        return url.startsWith(item.href);
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    <Link href="/pegawai/dashboard" className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                            <ApplicationLogo className="h-10 w-10" iconClassName="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-sm font-bold uppercase text-gray-950">{companyName(settings)}</div>
                            <div className="max-w-[180px] break-words text-[11px] leading-tight text-gray-500">
                                {appName(settings)}
                            </div>
                        </div>
                    </Link>

                    <div className="hidden items-center gap-2 lg:flex">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setInboxOpen((open) => !open)}
                                className={`relative inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                                    inboxActive ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                                <Inbox className="mr-2 h-4 w-4" />
                                Inbox
                                {inboxBadge ? (
                                    <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                                        {inboxBadge}
                                    </span>
                                ) : null}
                                <ChevronDown className="ml-2 h-4 w-4" />
                            </button>
                            {inboxOpen ? (
                                <div className="absolute left-0 z-50 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                                    {inboxItems.map((item) => {
                                        const active = url.startsWith(item.href);
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                onClick={() => setInboxOpen(false)}
                                                className={`flex items-center justify-between px-4 py-3 text-sm font-medium ${
                                                    active ? "bg-emerald-50 text-emerald-800" : "text-gray-700 hover:bg-gray-50"
                                                }`}
                                            >
                                                <span className="inline-flex items-center">
                                                    <item.icon className="mr-3 h-4 w-4 text-gray-400" />
                                                    {item.name}
                                                </span>
                                                {item.badge ? (
                                                    <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                                                        {item.badge}
                                                    </span>
                                                ) : null}
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                        {menu.map((item) => {
                            const active = isMenuActive(item);
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
                            <div className="text-xs text-gray-500">{user?.department?.name || user?.position || companyName(settings)}</div>
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
                                        <div className="truncate text-xs text-gray-500">{user?.email || user?.username || companyName(settings)}</div>
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
                    <div className="shrink-0">
                        <button
                            type="button"
                            onClick={() => setMobileInboxOpen((open) => !open)}
                            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                                inboxActive ? "bg-emerald-50 text-emerald-800" : "bg-gray-50 text-gray-700"
                            }`}
                        >
                            <Inbox className="mr-2 h-4 w-4" />
                            Inbox
                            {inboxBadge ? <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{inboxBadge}</span> : null}
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </button>
                    </div>
                    {menu.map((item) => (
                        <Link key={item.name} href={item.href} className="inline-flex shrink-0 items-center rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700">
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.name}
                            {item.badge ? <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{item.badge}</span> : null}
                        </Link>
                    ))}
                </div>
                {mobileInboxOpen ? (
                    <div className="grid gap-2 border-t border-gray-100 bg-white px-4 py-3 lg:hidden">
                        {inboxItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setMobileInboxOpen(false)}
                                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700"
                            >
                                <span className="inline-flex items-center">
                                    <item.icon className="mr-2 h-4 w-4" />
                                    {item.name}
                                </span>
                                {item.badge ? <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">{item.badge}</span> : null}
                            </Link>
                        ))}
                    </div>
                ) : null}
            </header>

            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
