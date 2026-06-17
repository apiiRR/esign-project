// import Link
import { Link } from "@inertiajs/react";

// import usePage dari inertiajs
import { usePage } from "@inertiajs/react";

import ApplicationLogo from "@/Components/ApplicationLogo";
import { appName, companyName } from "@/Utils/appIdentity";

export default function LayoutAuth({ children }) {
    // get page props "settings"
    const { settings } = usePage().props;

    return (
        <div className="relative p-6 bg-white z-1 sm:p-0">
            <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0">
                {children}
                <div className="items-center hidden w-full h-full lg:w-1/2 lg:grid relative overflow-hidden bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950">
                    <div className="relative flex items-center justify-center z-1">
                        <div className="absolute inset-0 -z-1 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
                        <div className="flex flex-col items-center max-w-md">
                            <Link
                                href="/"
                                className="block mb-4 bg-slate-700 p-3 rounded-2xl"
                            >
                                <ApplicationLogo className="h-20 w-20" iconClassName="h-12 w-12" imageClassName="h-20 w-20 object-contain" />
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
