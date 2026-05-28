// import Link dari Inertia
import { Link } from "@inertiajs/react";

import ApplicationLogo from "@/Components/ApplicationLogo";

export default function Logo() {
    
    return (
        <Link href="/admin/dashboard">
            <div className="flex items-center flex-shrink-0">
                <div className="relative">
                    <div className="bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-blue-100 rounded-lg"></div>
                            <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg">
                                <ApplicationLogo className="h-10 w-10" iconClassName="h-6 w-6" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="ml-3">
                    <h1 className="text-md uppercase font-bold text-gray-900">
                        PT Berdikari
                    </h1>
                    <p className="text-xs text-gray-500 font-medium italic mt-0.5">
                        Surat & Arsip Digital
                    </p>
                </div>
            </div>
        </Link>
    );
}
