import { Link, usePage } from "@inertiajs/react";
import { useState } from "react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import UserPageProtection from "@/Components/UserPageProtection";
import { appName, companyName } from "@/Utils/appIdentity";
import {
    LogOut,
    UserRound,
} from "lucide-react";

export default function LayoutUser({ children }) {
    const { props } = usePage();
    const user = props.auth?.user;
    const settings = props.settings || {};
    const [profileOpen, setProfileOpen] = useState(false);
    const userName = user?.name || "User";
    const userPosition = user?.position || "-";

    return (
        <div className="min-h-screen bg-gray-100">
            <UserPageProtection />
            <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
                    <Link href="/user/dashboard" className="flex min-w-0 items-center gap-3">
                        <div className="relative flex-none">
                            <div className="rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-50 to-fuchsia-100" />
                                    <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                                        <ApplicationLogo className="h-10 w-10" iconClassName="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-md font-bold uppercase text-gray-900">{companyName(settings)}</div>
                            <div className="mt-0.5 max-w-[170px] break-words text-[11px] font-medium leading-tight text-gray-500">
                                {appName(settings)}
                            </div>
                        </div>
                    </Link>

                    <div className="flex items-center gap-3">
                        <div className="hidden text-right sm:block">
                            <div className="text-sm font-semibold text-gray-950">{userName}</div>
                            <div className="text-xs text-gray-500">{userPosition}</div>
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
                                        <div className="truncate text-sm font-semibold text-gray-950">{userName}</div>
                                        <div className="truncate text-xs text-gray-500">{userPosition}</div>
                                    </div>
                                    <Link href="/logout" method="post" as="button" className="flex w-full items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700">
                                        <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                                        Logout
                                    </Link>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
                {children}
            </main>
        </div>
    );
}
