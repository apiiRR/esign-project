// import Link dari Inertia
import { Link } from "@inertiajs/react";

// import icons dari lucide react
import { User, Settings, LogOut, ChevronDown } from "lucide-react";

// import menuConfig
import { getFilteredMenuItems, getFilteredDropdown } from "./menuConfig";

export default function MobileMenu({ 
    auth, 
    activeDropdown, 
    toggleDropdown, 
    handleDropdownItemClick, 
    setIsMobileMenuOpen 
}) {
    const userPosition = auth.user.position || "-";

    // Filter menu items
    const filteredMenuItems = getFilteredMenuItems();
    
    // User navigation
    const userNavigation = [
        { 
            name: "Settings", 
            href: "/admin/settings",
            icon: Settings
        },
        { 
            name: "Sign out", 
            href: "/logout", 
            method: "post",
            icon: LogOut
        },
    ];

    return (
        <div className="border-t border-gray-200 sm:hidden bg-white/95 backdrop-blur-lg">
            {/* Mobile Menu Items */}
            <div className="px-2 py-3 space-y-1">
                {filteredMenuItems.map((item) => {
                    const filteredDropdown = getFilteredDropdown(item.dropdown);
                    
                    if (item.dropdown && filteredDropdown.length === 0) {
                        return null;
                    }

                    return (
                        <div key={item.name}>
                            {item.dropdown ? (
                                <div className="space-y-1">
                                    <button
                                        onClick={() => toggleDropdown(item.name)}
                                        className={`flex items-center w-full px-4 py-3 text-base font-medium rounded-lg ${
                                            activeDropdown === item.name
                                                ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700"
                                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        <item.icon className="w-5 h-5 mr-3" />
                                        {item.name}
                                        <ChevronDown
                                            className={`w-4 h-4 ml-auto transition-transform duration-200 ${
                                                activeDropdown === item.name
                                                    ? "rotate-180"
                                                    : ""
                                            }`}
                                        />
                                    </button>

                                    {activeDropdown === item.name && filteredDropdown.length > 0 && (
                                        <div className="ml-4 mr-2 space-y-1 bg-gray-50 rounded-lg p-2">
                                            {filteredDropdown.map((subItem) => (
                                                <Link
                                                    key={subItem.name}
                                                    href={subItem.href}
                                                    onClick={handleDropdownItemClick}
                                                    className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-600 rounded-md hover:bg-white hover:text-gray-900 transition-colors duration-150 group"
                                                >
                                                    <subItem.icon className="w-4 h-4 mr-3 text-gray-400 group-hover:text-blue-600" />
                                                    <div>
                                                        <div className="flex items-center gap-2 font-medium">
                                                            <span>{subItem.name}</span>
                                                            {subItem.badge ? (
                                                                <span className="min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                                                                    {subItem.badge}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                        {subItem.description && (
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {subItem.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href={item.href}
                                    onClick={handleDropdownItemClick}
                                    className={`flex items-center px-4 py-3 text-base font-medium rounded-lg ${
                                        item.current
                                            ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                    }`}
                                >
                                    <item.icon className="w-5 h-5 mr-3" />
                                    {item.name}
                                </Link>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Mobile User Info */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <div className="flex items-center">
                    <div className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                        <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-900">
                            {auth.user.name}
                        </p>
                        <p className="text-xs text-gray-500">
                            {userPosition}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                    {userNavigation.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            method={item.method || "get"}
                            as="button"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                        >
                            <item.icon className="w-4 h-4 mr-2" />
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
