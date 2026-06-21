import { useEffect } from "react";

export default function UserPageProtection() {
    useEffect(() => {
        const preventContextMenu = (event) => event.preventDefault();
        const preventShortcuts = (event) => {
            const key = event.key?.toLowerCase();
            const blocked =
                key === "f12" ||
                (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
                (event.metaKey && event.altKey && ["i", "j", "c"].includes(key)) ||
                ((event.ctrlKey || event.metaKey) && ["u", "s", "p"].includes(key));

            if (blocked) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        document.addEventListener("contextmenu", preventContextMenu);
        document.addEventListener("keydown", preventShortcuts, true);
        document.body.classList.add("select-none");

        return () => {
            document.removeEventListener("contextmenu", preventContextMenu);
            document.removeEventListener("keydown", preventShortcuts, true);
            document.body.classList.remove("select-none");
        };
    }, []);

    return null;
}
