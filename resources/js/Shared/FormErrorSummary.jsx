import { AlertCircle } from "lucide-react";

const friendlyMessages = {
    "The scan file failed to upload.":
        "File gagal diunggah. Pastikan file PDF valid dan batas upload server mengizinkan ukuran file tersebut.",
};

function normalizeMessage(key, value) {
    const message = Array.isArray(value) ? value.join(" ") : String(value || "");

    if (key === "scan_file") {
        return friendlyMessages[message] || message;
    }

    return friendlyMessages[message] || message;
}

export default function FormErrorSummary({ errors = {}, extraErrors = [] }) {
    const messages = [
        ...Object.entries(errors || {})
            .map(([key, value]) => normalizeMessage(key, value))
            .filter(Boolean),
        ...extraErrors.filter(Boolean),
    ];

    const uniqueMessages = [...new Set(messages)];

    if (!uniqueMessages.length) {
        return null;
    }

    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                    <div className="font-semibold">Form belum bisa disimpan.</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {uniqueMessages.map((message) => (
                            <li key={message} className="break-words">
                                {message}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
