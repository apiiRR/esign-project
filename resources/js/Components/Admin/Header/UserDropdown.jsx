// import Link dari Inertia
import { Link } from "@inertiajs/react";

// import icons dari lucide react
import { BookOpen, User, Settings, LogOut } from "lucide-react";

export default function UserDropdown({ auth, activeDropdown, toggleDropdown }) {

    // User navigation
    const userNavigation = [
        { 
            name: "Settings", 
            href: "/admin/settings",
            icon: Settings
        },
        {
            name: "Dokumentasi",
            href: "/admin/dokumentasi",
            icon: BookOpen
        },
        { 
            name: "Sign out", 
            href: "/admin/logout", 
            method: "post",
            icon: LogOut
        },
    ];

    return (
        <div className="relative">
            <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                        {auth.user.name}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                        {auth.user.roles?.[0]?.name || "pegawai"}
                    </p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => toggleDropdown("user")}
                        className="relative flex items-center max-w-xs text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform hover:scale-105 duration-200"
                    >
                        <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                            <User className="w-5 h-5 text-white" />
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                    </button>

                    {activeDropdown === "user" && (
                        <div className="absolute right-0 z-20 w-56 py-2 mt-5 origin-top-right bg-white rounded-xl shadow-xl border border-gray-200">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-sm font-semibold text-gray-900">
                                    {auth.user.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {auth.user.roles?.[0]?.name || "pegawai"} · {auth.user.email}
                                </p>
                            </div>
                            <div className="py-1">
                                {userNavigation.map((item) => (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        method={item.method || "get"}
                                        as="button"
                                        onClick={() => toggleDropdown(null)}
                                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 group"
                                    >
                                        <item.icon className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600" />
                                        <span className="font-medium">
                                            {item.name}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
