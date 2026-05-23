// import Link dari Inertia
import { Link } from "@inertiajs/react";

// import icons dari lucide react
import { ChevronDown } from "lucide-react";

// import menuConfig
import { menuItems, getFilteredMenuItems, getFilteredDropdown } from "./menuConfig";

// import MenuDropdown component
import MenuDropdown from "./MenuDropdown";

export default function DesktopMenu({ activeDropdown, toggleDropdown, closeAllDropdowns }) {

    // Filter menu items
    const filteredMenuItems = getFilteredMenuItems();

    return (
        <>
            {filteredMenuItems.map((item) => {

                // Filter dropdown items
                const filteredDropdown = getFilteredDropdown(item.dropdown);

                // Hide dropdown if it has no items
                if (item.dropdown && filteredDropdown.length === 0) {
                    return null;
                }

                return (
                    <div key={item.name} className="relative">
                        {item.dropdown ? (
                            <div className="relative">
                                <button
                                    onClick={() => toggleDropdown(item.name)}
                                    className={`inline-flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200 ${activeDropdown === item.name
                                            ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                                            : "text-gray-700"
                                        }`}
                                >
                                    <item.icon className="w-5 h-5 mr-2.5" />
                                    {item.name}
                                    {item.badge ? (
                                        <span className="ml-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                                            {item.badge}
                                        </span>
                                    ) : null}
                                    <ChevronDown
                                        className={`w-5 h-5 ml-2 transition-transform duration-200 ${activeDropdown === item.name
                                                ? "rotate-180 text-blue-600"
                                                : "text-gray-400"
                                            }`}
                                    />
                                </button>

                                {activeDropdown === item.name && filteredDropdown.length > 0 && (
                                    <MenuDropdown
                                        item={item}
                                        filteredDropdown={filteredDropdown}
                                        closeDropdown={() => toggleDropdown(null)}
                                    />
                                )}
                            </div>
                        ) : (
                            <Link
                                href={item.href}
                                onClick={closeAllDropdowns}
                                className={`inline-flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-200 ${item.current
                                        ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 shadow-sm"
                                        : "text-gray-700"
                                    }`}
                            >
                                <item.icon className="w-5 h-5 mr-2.5" />
                                {item.name}
                                {item.badge ? (
                                    <span className="ml-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs font-semibold text-white">
                                        {item.badge}
                                    </span>
                                ) : null}
                            </Link>
                        )}
                    </div>
                );
            })}
        </>
    );
}
