// import Link
import { Link } from "@inertiajs/react";

export default function MenuDropdown({ item, filteredDropdown, closeDropdown }) {
    return (
        <div className="absolute left-0 z-20 w-72 py-2 mt-5 origin-top-left bg-white rounded-xl shadow-xl border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center">
                    <item.icon className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-900">
                        {item.name}
                    </span>
                </div>
            </div>
            <div className="py-1 space-y-1">
                {filteredDropdown.map((subItem) => (
                    <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={closeDropdown}
                        className="flex items-center justify-between px-3 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg group mx-2"
                    >
                        <div className="flex items-center flex-1">
                            <div className="relative mr-3">
                                <div className="w-9 h-9 flex items-center justify-center bg-gray-50 rounded-lg group-hover:bg-blue-100 transition-all duration-200">
                                    <subItem.icon className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-200" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="font-medium group-hover:text-blue-700 transition-colors duration-200">
                                    {subItem.name}
                                </div>
                                {subItem.description && (
                                    <div className="text-xs text-gray-500 mt-0.5 group-hover:text-blue-600/80 transition-colors duration-200">
                                        {subItem.description}
                                    </div>
                                )}
                            </div>
                        </div>
                        {subItem.badge ? (
                            <span className="ml-3 min-w-6 rounded-full bg-red-600 px-2 py-0.5 text-center text-xs font-semibold text-white">
                                {subItem.badge}
                            </span>
                        ) : null}
                    </Link>
                ))}
            </div>
        </div>
    );
}
