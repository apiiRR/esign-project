// import useState, useRef dan useEffect dari react
import { useState, useRef, useEffect } from "react";

// import usePage dari Inertia
import { usePage } from "@inertiajs/react";

// import components Logo
import Logo from "@/Components/Admin/Header/Logo";

// import components DesktopMenu
import DesktopMenu from "@/Components/Admin/Header/DesktopMenu";

// import components MobileMenu
import MobileMenu from "@/Components/Admin/Header/MobileMenu";

// import components UserDropdown
import UserDropdown from "@/Components/Admin/Header/UserDropdown";

// import icons dari lucide react
import { Menu, X } from "lucide-react";

// import Sweet Alert
import Swal from 'sweetalert2';

export default function LayoutAdmin({ children }) {

    // destruct auth dan flash dari props
    const { auth, flash } = usePage().props;

    // state mobile menu open
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // state active dropdown
    const [activeDropdown, setActiveDropdown] = useState(null);

    // state untuk pathname
    const [currentPath, setCurrentPath] = useState("");

    // ref untuk dropdown container
    const dropdownRef = useRef(null);

    // ref untuk user dropdown container
    const userDropdownRef = useRef(null);

    // Fungsi untuk menutup semua dropdown
    const closeAllDropdowns = () => {
        setActiveDropdown(null);
    };

    // Fungsi untuk toggle dropdown
    const toggleDropdown = (dropdownName) => {
        if (activeDropdown === dropdownName) {
            setActiveDropdown(null);
        } else {
            setActiveDropdown(dropdownName);
        }
    };

    // Fungsi untuk handle klik dropdown item (untuk mobile)
    const handleDropdownItemClick = () => {
        setActiveDropdown(null);
        setIsMobileMenuOpen(false);
    };

    // useEffect untuk mendapatkan current path saat komponen mount dan update
    useEffect(() => {
        setCurrentPath(window.location.pathname);
    }, []);

    // useEffect untuk handle klik di luar dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                    closeAllDropdowns();
                }
            }
        };

        // tambah event listener
        document.addEventListener("mousedown", handleClickOutside);
        
        // cleanup
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // useEffect untuk handle escape key
    useEffect(() => {
        const handleEscapeKey = (event) => {
            if (event.key === "Escape") {
                closeAllDropdowns();
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener("keydown", handleEscapeKey);
        
        return () => {
            document.removeEventListener("keydown", handleEscapeKey);
        };
    }, []);

    // useEffect untuk menampilkan Sweet Alert jika ada flash message
    useEffect(() => {
        if (flash?.success) {
            Swal.fire({
                icon: 'success',
                title: 'SUCCESS!',
                text: flash.success,
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });
        }
    }, [flash]);

    return (
        <div className="min-h-screen bg-gray-200">
            {/* Top Navigation */}
            <nav className="sticky top-0 z-50 bg-white shadow-sm">
                <div className="px-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        {/* Left Section: Logo & Desktop Menu */}
                        <div className="flex min-w-0 items-center">
                            <Logo />
                            
                            <div ref={dropdownRef} className="hidden ml-10 sm:flex sm:space-x-1">
                                <DesktopMenu
                                    activeDropdown={activeDropdown}
                                    toggleDropdown={toggleDropdown}
                                    closeAllDropdowns={closeAllDropdowns}
                                />
                            </div>
                        </div>

                        {/* Right Section: Notifications & User */}
                        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                            
                            <div ref={userDropdownRef}>
                                <UserDropdown
                                    auth={auth}
                                    activeDropdown={activeDropdown}
                                    toggleDropdown={toggleDropdown}
                                />
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(!isMobileMenuOpen);
                                    setActiveDropdown(null);
                                }}
                                className="inline-flex items-center justify-center p-2 text-gray-600 rounded-lg sm:hidden hover:text-gray-900 hover:bg-gray-100 transition-colors duration-200"
                            >
                                {isMobileMenuOpen ? (
                                    <X className="w-6 h-6" />
                                ) : (
                                    <Menu className="w-6 h-6" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <MobileMenu
                        auth={auth}
                        activeDropdown={activeDropdown}
                        toggleDropdown={toggleDropdown}
                        handleDropdownItemClick={handleDropdownItemClick}
                        setIsMobileMenuOpen={setIsMobileMenuOpen}
                    />
                )}
            </nav>

            {/* Main Content */}
            <main className="py-4 sm:py-8">
                 <div className="px-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
