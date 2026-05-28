import { usePage } from "@inertiajs/react";
import { Files } from "lucide-react";

export default function ApplicationLogo({ className = "h-10 w-10", iconClassName = "h-6 w-6", imageClassName = "h-full w-full object-contain" }) {
    const { settings } = usePage().props;

    if (settings?.company_logo) {
        return (
            <img
                src={`/storage/settings/${settings.company_logo}`}
                alt={`Logo ${settings.company_name || settings.app_name || "Aplikasi"}`}
                className={imageClassName}
            />
        );
    }

    return (
        <div className={`flex items-center justify-center rounded-lg bg-emerald-700 text-white ${className}`}>
            <Files className={iconClassName} />
        </div>
    );
}
