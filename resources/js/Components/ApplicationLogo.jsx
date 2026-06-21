import { usePage } from "@inertiajs/react";
import { Files } from "lucide-react";
import { appLogoUrl } from "@/Utils/appIdentity";

export default function ApplicationLogo({ className = "h-10 w-10", iconClassName = "h-6 w-6", imageClassName = "h-full w-full object-contain" }) {
    const { settings } = usePage().props;
    const logoUrl = appLogoUrl(settings);

    if (logoUrl) {
        return (
            <img
                src={logoUrl}
                alt={`Logo ${settings.company_name || settings.app_name || "Aplikasi"}`}
                className={imageClassName}
            />
        );
    }

    return (
        <div className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 text-white ${className}`}>
            <Files className={iconClassName} />
        </div>
    );
}
