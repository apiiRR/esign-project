import { useState } from "react";
import { Download, X } from "lucide-react";

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

function updateCsrfToken(token) {
    let meta = document.querySelector('meta[name="csrf-token"]');

    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "csrf-token");
        document.head.appendChild(meta);
    }

    meta.setAttribute("content", token);

    if (window.axios?.defaults?.headers?.common) {
        window.axios.defaults.headers.common["X-CSRF-TOKEN"] = token;
    }
}

async function freshCsrfToken() {
    const response = await fetch("/csrf-token", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
        },
    });
    const payload = await response.json().catch(() => ({}));
    const token = payload.token || csrfToken();

    if (!response.ok || !token) {
        throw new Error("Token keamanan tidak tersedia. Muat ulang halaman lalu coba lagi.");
    }

    updateCsrfToken(token);

    return token;
}

function errorMessage(payload, fallback) {
    if (payload?.errors) {
        return Object.values(payload.errors).flat().filter(Boolean)[0] || fallback;
    }

    return payload?.message || fallback;
}

function locationHeaders() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({});
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                "X-Client-Latitude": String(position.coords.latitude),
                "X-Client-Longitude": String(position.coords.longitude),
            }),
            () => resolve({}),
            { enableHighAccuracy: false, maximumAge: 300000, timeout: 2500 },
        );
    });
}

export default function DocumentDownloadButton({
    otpUrl,
    downloadUrl,
    otpRequired = true,
    fileName = "dokumen.pdf",
    className = "",
}) {
    const [open, setOpen] = useState(false);
    const [otpCode, setOtpCode] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);
    const [downloading, setDownloading] = useState(false);

    async function sendOtp() {
        setSending(true);
        setError("");
        setMessage("");

        try {
            const token = await freshCsrfToken();
            const body = new FormData();
            body.append("_token", token);
            const geoHeaders = await locationHeaders();

            const response = await fetch(otpUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-TOKEN": token,
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/json",
                    ...geoHeaders,
                },
                body,
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(errorMessage(payload, "OTP gagal dikirim."));
            }

            setMessage(payload.message || "OTP berhasil dikirim.");
        } catch (exception) {
            setError(exception.message);
        } finally {
            setSending(false);
        }
    }

    async function downloadDocument() {
        setDownloading(true);
        setError("");

        try {
            const token = await freshCsrfToken();
            const body = new FormData();
            body.append("_token", token);
            const geoHeaders = await locationHeaders();

            if (otpRequired) {
                body.append("otp_code", otpCode);
            }

            const response = await fetch(downloadUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "X-CSRF-TOKEN": token,
                    "X-Requested-With": "XMLHttpRequest",
                    Accept: "application/pdf,application/json",
                    ...geoHeaders,
                },
                body,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(errorMessage(payload, "Download dokumen gagal."));
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
            setOpen(false);
            setOtpCode("");
            setMessage("");
        } catch (exception) {
            setError(exception.message);
        } finally {
            setDownloading(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={() => {
                    setOpen(true);
                    setError("");
                    setMessage("");
                }}
                className={`inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 ${className}`}
            >
                <Download className="mr-2 h-4 w-4" />
                Download Dokumen
            </button>

            {open ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/40 px-3 py-3 sm:items-center sm:px-4">
                    <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold text-gray-950">Download Dokumen</h2>
                                <p className="mt-1 text-sm text-gray-500">
                                    {otpRequired ? "Masukkan OTP yang dikirim ke email untuk mengunduh dokumen." : "Download dokumen tersedia tanpa OTP sesuai pengaturan saat ini."}
                                </p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {otpRequired ? (
                            <div className="mt-5 space-y-3">
                                <button
                                    type="button"
                                    onClick={sendOtp}
                                    disabled={sending}
                                    className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                >
                                    {sending ? "Mengirim OTP..." : "Kirim OTP"}
                                </button>
                                <label className="block text-sm font-semibold text-gray-800">
                                    Kode OTP
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={otpCode}
                                        onChange={(event) => setOtpCode(event.target.value)}
                                        className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                                        placeholder="Masukkan 6 digit OTP"
                                    />
                                </label>
                            </div>
                        ) : null}

                        {message ? <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div> : null}
                        {error ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

                        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={downloadDocument}
                                disabled={downloading || (otpRequired && !otpCode.trim())}
                                className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                            >
                                {downloading ? "Mengunduh..." : "Download"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
