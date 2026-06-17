// import Link dari Inertia
import { Link, usePage } from "@inertiajs/react";

import ApplicationLogo from "@/Components/ApplicationLogo";
import { appName, companyName } from "@/Utils/appIdentity";

export default function Logo() {
    const { settings } = usePage().props;
    
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
                
                <div className="ml-3 min-w-0">
                    <h1 className="text-md uppercase font-bold text-gray-900">
                        {companyName(settings)}
                    </h1>
                    <p className="mt-0.5 max-w-[170px] break-words text-[11px] font-medium leading-tight text-gray-500">
                        {appName(settings)}
                    </p>
                </div>
            </div>
        </Link>
    );
}
