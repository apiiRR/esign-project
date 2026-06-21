// import Link
import { Link } from "@inertiajs/react";

// import usePage dari inertiajs
import { usePage } from "@inertiajs/react";

import { Files } from "lucide-react";
import { appName, companyName, loginLogoUrl } from "@/Utils/appIdentity";

export default function LayoutAuth({ children }) {
    // get page props "settings"
    const { settings } = usePage().props;
    const logoUrl = loginLogoUrl(settings);

    return (
        <div className="relative p-6 bg-white z-1 sm:p-0">
            <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0">
                {children}
                <div className="items-center hidden w-full h-full lg:w-1/2 lg:grid relative overflow-hidden bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
                    <div className="relative flex items-center justify-center z-1">
                        <div className="absolute inset-0 -z-1 bg-[linear-gradient(rgba(16,200,232,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(236,24,200,0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
                        <div className="flex flex-col items-center max-w-md">
                            <Link
                                href="/"
                                className="mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white p-4 shadow-2xl shadow-fuchsia-950/30"
                            >
                                {logoUrl ? (
                                    <img src={logoUrl} alt={`Logo ${appName(settings)}`} className="h-full w-full object-contain" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white">
                                        <Files className="h-12 w-12" />
                                    </div>
                                )}
                            </Link>
                            <p className="text-center text-gray-400">
                                Sistem {appName(settings)}{" "}
                                <strong>{companyName(settings)}</strong> - Hak
                                Cipta {new Date().getFullYear()} &copy;
                                Dilindungi Undang-Undang.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
