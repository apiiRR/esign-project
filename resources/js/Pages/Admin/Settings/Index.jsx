import { Head, useForm, usePage } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Building2, Mail, Save, Send, ShieldCheck, Stamp, Upload } from "lucide-react";
import { settingsMediaUrl } from "@/Utils/appIdentity";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const defaultWatermarkTextTemplate = "Downloaded by {user_name} | {user_email} | {downloaded_at} WIB | {document_number}";
const watermarkVariables = [
    "{user_name}",
    "{user_email}",
    "{downloaded_at}",
    "{document_number}",
    "{document_subject}",
    "{app_name}",
    "{company_name}",
];
const defaultWatermarkSettings = {
    x_percent: 50,
    y_percent: 50,
    angle: 45,
    font_size: 14,
    opacity: 35,
    color: "gray",
    text_template: defaultWatermarkTextTemplate,
};

function sampleWatermarkText(template) {
    const value = String(template || defaultWatermarkTextTemplate).trim() || defaultWatermarkTextTemplate;

    return value.replaceAll("{user_name}", "Nama User")
        .replaceAll("{user_email}", "email@domain.com")
        .replaceAll("{downloaded_at}", "19/06/2026 10:00:00")
        .replaceAll("{document_number}", "NOMOR-DOKUMEN")
        .replaceAll("{document_subject}", "Perihal Dokumen")
        .replaceAll("{app_name}", "Electronic Vidici Sign")
        .replaceAll("{company_name}", "Nama Perusahaan");
}

export default function SettingsIndex() {
    const { setting } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        app_name: setting?.app_name || "",
        company_name: setting?.company_name || "",
        company_code: setting?.company_code || "",
        company_logo: null,
        login_logo: null,
        document_download_watermark_sample_pdf: null,
        signature_otp_enabled: Boolean(setting?.signature_otp_enabled),
        document_download_otp_scope: setting?.document_download_otp_scope || "both",
        mail_mailer: setting?.mail_mailer || "smtp",
        mail_host: setting?.mail_host || "",
        mail_port: setting?.mail_port || "",
        mail_username: setting?.mail_username || "",
        mail_password: "",
        mail_encryption: setting?.mail_encryption || "tls",
        mail_from_address: setting?.mail_from_address || "",
        mail_from_name: setting?.mail_from_name || setting?.app_name || "",
        document_download_watermark_settings: {
            ...defaultWatermarkSettings,
            ...(setting?.document_download_watermark_settings || {}),
        },
        _method: "PUT",
    });
    const testEmailForm = useForm({ test_email: "" });

    const submit = (e) => {
        e.preventDefault();
        post("/admin/settings", { forceFormData: true, preserveScroll: true });
    };

    const sendTestEmail = (e) => {
        e.preventDefault();
        testEmailForm.post("/admin/settings/test-email", { preserveScroll: true });
    };

    return (
        <>
            <Head title="Settings - Admin" />
            <LayoutAdmin>
                <form onSubmit={submit} className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Settings Aplikasi</h1>
                        <p className="mt-2 text-sm text-gray-600">Pengaturan inti untuk identitas dan logo aplikasi.</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                                <Stamp className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Watermark Download Dokumen</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Atur posisi dan tampilan watermark pada file PDF hasil download.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <WatermarkPdfPositioner
                                currentSampleUrl={setting?.document_download_watermark_sample_pdf ? "/admin/settings/watermark-sample" : ""}
                                selectedFile={data.document_download_watermark_sample_pdf}
                                settings={data.document_download_watermark_settings}
                                onSampleChange={(file) => setData("document_download_watermark_sample_pdf", file)}
                                onPositionChange={(position) => setData("document_download_watermark_settings", { ...data.document_download_watermark_settings, ...position })}
                                error={errors.document_download_watermark_sample_pdf}
                            />
                            <div className="grid gap-4 content-start">
                                <WatermarkTemplateField
                                    value={data.document_download_watermark_settings.text_template || ""}
                                    onChange={(value) => setData("document_download_watermark_settings", { ...data.document_download_watermark_settings, text_template: value })}
                                    error={errors["document_download_watermark_settings.text_template"]}
                                />
                                <SliderField label="Kemiringan" min={-90} max={90} suffix="°" value={data.document_download_watermark_settings.angle} onChange={(v) => setData("document_download_watermark_settings", { ...data.document_download_watermark_settings, angle: v })} error={errors["document_download_watermark_settings.angle"]} />
                                <SliderField label="Ukuran Font" min={8} max={36} suffix=" pt" value={data.document_download_watermark_settings.font_size} onChange={(v) => setData("document_download_watermark_settings", { ...data.document_download_watermark_settings, font_size: v })} error={errors["document_download_watermark_settings.font_size"]} />
                                <SliderField label="Opacity" min={10} max={80} suffix="%" value={data.document_download_watermark_settings.opacity} onChange={(v) => setData("document_download_watermark_settings", { ...data.document_download_watermark_settings, opacity: v })} error={errors["document_download_watermark_settings.opacity"]} />
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                                    Posisi watermark diatur dengan drag titik tengah teks pada PDF contoh. Koordinat pusat saat ini: X {Number(data.document_download_watermark_settings.x_percent ?? 50).toFixed(1)}%, Y {Number(data.document_download_watermark_settings.y_percent ?? 50).toFixed(1)}%.
                                </div>
                            </div>
                        </div>
                        {errors["document_download_watermark_settings.x_percent"] || errors["document_download_watermark_settings.y_percent"] ? (
                            <p className="mt-3 text-xs text-red-600">{errors["document_download_watermark_settings.x_percent"] || errors["document_download_watermark_settings.y_percent"]}</p>
                        ) : null}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Identitas Utama</h2>
                                <p className="text-xs text-gray-500">Atur nama aplikasi, logo header, dan logo login secara terpisah.</p>
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-4 md:grid-cols-3">
                            <Field label="Nama Aplikasi" value={data.app_name} onChange={(v) => setData("app_name", v)} error={errors.app_name} />
                            <Field label="Nama Perusahaan" value={data.company_name} onChange={(v) => setData("company_name", v)} error={errors.company_name} />
                            <Field label="Kode Perusahaan" value={data.company_code} onChange={(v) => setData("company_code", v)} error={errors.company_code} />
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <LogoUploadCard
                                title="Logo Aplikasi/Header"
                                description="Dipakai di header admin, user, dan halaman verifikasi."
                                filename={data.company_logo?.name}
                                currentLogo={setting?.company_logo}
                                currentLabel="Logo header saat ini"
                                error={errors.company_logo}
                                onChange={(file) => setData("company_logo", file)}
                            />
                            <LogoUploadCard
                                title="Logo Login"
                                description="Dipakai khusus di halaman login. Jika kosong, fallback ke logo header."
                                filename={data.login_logo?.name}
                                currentLogo={setting?.login_logo}
                                currentLabel="Logo login saat ini"
                                fallbackLogo={setting?.company_logo}
                                fallbackLabel="Fallback dari logo header"
                                error={errors.login_logo}
                                onChange={(file) => setData("login_logo", file)}
                            />
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Email OTP</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Email dipakai untuk pengiriman OTP tanda tangan elektronik.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <Toggle label="Wajib OTP approve/reject" checked={data.signature_otp_enabled} onChange={(v) => setData("signature_otp_enabled", v)} />
                            <SelectField
                                label="OTP Download Dokumen"
                                value={data.document_download_otp_scope}
                                onChange={(v) => setData("document_download_otp_scope", v)}
                                options={[
                                    { value: "both", label: "Admin + User" },
                                    { value: "user", label: "User" },
                                    { value: "admin", label: "Admin" },
                                ]}
                                error={errors.document_download_otp_scope}
                            />
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            <Field label="Mailer" value={data.mail_mailer} onChange={(v) => setData("mail_mailer", v)} error={errors.mail_mailer} />
                            <Field label="SMTP Host" value={data.mail_host} onChange={(v) => setData("mail_host", v)} error={errors.mail_host} />
                            <Field label="SMTP Port" value={data.mail_port} onChange={(v) => setData("mail_port", v)} error={errors.mail_port} />
                            <Field label="Username SMTP" value={data.mail_username} onChange={(v) => setData("mail_username", v)} error={errors.mail_username} />
                            <Field
                                label={setting?.mail_password_set ? "Password SMTP baru" : "Password SMTP"}
                                value={data.mail_password}
                                onChange={(v) => setData("mail_password", v)}
                                type="password"
                                error={errors.mail_password}
                            />
                            <SelectField
                                label="Encryption"
                                value={data.mail_encryption}
                                onChange={(v) => setData("mail_encryption", v)}
                                options={[
                                    { value: "tls", label: "TLS" },
                                    { value: "ssl", label: "SSL" },
                                    { value: "none", label: "None" },
                                ]}
                                error={errors.mail_encryption}
                            />
                            <Field label="From Address" value={data.mail_from_address} onChange={(v) => setData("mail_from_address", v)} error={errors.mail_from_address} />
                            <Field label="From Name" value={data.mail_from_name} onChange={(v) => setData("mail_from_name", v)} error={errors.mail_from_name} />
                        </div>

                        <div className="mt-5 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
                                <div className="mb-2 flex items-center gap-2 font-semibold">
                                    <ShieldCheck className="h-4 w-4" />
                                    Panduan singkat
                                </div>
                                <p>Gunakan host, port, username, dan password dari penyedia email perusahaan. Gmail membutuhkan App Password, bukan password login biasa.</p>
                                <p className="mt-2">Port umum: 587 TLS, 465 SSL. Jika OTP diaktifkan, pastikan email user signer sudah terisi dan test email berhasil.</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                <label className="mb-2 block text-sm font-semibold text-gray-800">Kirim Test Email</label>
                                <div className="flex flex-col gap-3 sm:flex-row">
                                    <input
                                        type="email"
                                        value={testEmailForm.data.test_email}
                                        onChange={(e) => testEmailForm.setData("test_email", e.target.value)}
                                        placeholder="nama@perusahaan.com"
                                        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={sendTestEmail}
                                        disabled={testEmailForm.processing}
                                        className="inline-flex items-center justify-center rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {testEmailForm.processing ? "Mengirim..." : "Kirim"}
                                    </button>
                                </div>
                                {testEmailForm.errors.test_email || testEmailForm.errors.email ? (
                                    <p className="mt-2 text-xs text-red-600">{testEmailForm.errors.test_email || testEmailForm.errors.email}</p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <button disabled={processing} className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                        <Save className="mr-2 h-4 w-4" />
                        {processing ? "Menyimpan..." : "Simpan Settings"}
                    </button>
                </form>
            </LayoutAdmin>
        </>
    );
}

function Field({ label, value, onChange, type = "text", error }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-gray-300"}`} />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function SelectField({ label, value, onChange, options, error }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-gray-300"}`}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function LogoUploadCard({ title, description, filename, currentLogo, currentLabel, fallbackLogo, fallbackLabel, error, onChange }) {
    const logo = currentLogo || fallbackLogo;
    const label = currentLogo ? currentLabel : fallbackLabel;

    return (
        <div className="rounded-lg border border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-fuchsia-50/60 p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-950">{title}</h3>
                <p className="mt-1 text-xs text-gray-500">{description}</p>
            </div>
            <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-white/80 bg-white px-3 py-2.5 shadow-sm transition hover:border-cyan-200">
                <Upload className="h-5 w-5 flex-none text-cyan-600" />
                <span className="min-w-0 truncate text-sm text-gray-700">{filename || "Upload PNG/JPG/JPEG"}</span>
                <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={(event) => onChange(event.target.files?.[0] || null)} />
            </label>
            {logo ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3">
                    <img src={settingsMediaUrl(logo)} alt={title} className="h-14 w-28 object-contain" />
                    <span className="text-xs text-gray-500">{label}</span>
                </div>
            ) : null}
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function WatermarkTemplateField({ value, onChange, error }) {
    const currentValue = value || defaultWatermarkTextTemplate;
    const insertVariable = (variable) => {
        const separator = currentValue.trim() ? " " : "";
        onChange(`${currentValue}${separator}${variable}`);
    };

    return (
        <div>
            <label className="text-sm font-medium text-gray-700">Teks Watermark</label>
            <textarea
                rows={4}
                value={currentValue}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            <div className="mt-2 flex flex-wrap gap-2">
                {watermarkVariables.map((variable) => (
                    <button
                        key={variable}
                        type="button"
                        onClick={() => insertVariable(variable)}
                        className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                    >
                        {variable}
                    </button>
                ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
                Variable akan diganti otomatis saat dokumen didownload.
            </p>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function SliderField({ label, value, onChange, min, max, suffix, error }) {
    const numericValue = Number(value ?? min);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-gray-700">{label}</label>
                <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{numericValue}{suffix}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={numericValue}
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full accent-emerald-700"
            />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function WatermarkPdfPositioner({ currentSampleUrl, selectedFile, settings, onSampleChange, onPositionChange, error }) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const [fileUrl, setFileUrl] = useState(currentSampleUrl);
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [dragging, setDragging] = useState(false);
    const value = {
        ...defaultWatermarkSettings,
        ...(settings || {}),
    };
    const opacity = Math.max(0.1, Math.min(0.8, Number(value.opacity) / 100));
    const markerStyle = {
        left: `${Number(value.x_percent ?? 50)}%`,
        top: `${Number(value.y_percent ?? 50)}%`,
        transform: `translate(-50%, -50%) rotate(${value.angle}deg)`,
        transformOrigin: "center center",
        fontSize: `${Math.max(8, Math.min(36, Number(value.font_size))) * 0.75}px`,
        opacity,
    };

    useEffect(() => {
        if (!selectedFile) {
            setFileUrl(currentSampleUrl);
            return undefined;
        }

        const url = URL.createObjectURL(selectedFile);
        setFileUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [currentSampleUrl, selectedFile]);

    useEffect(() => {
        let cancelled = false;
        let loadingTask = null;
        let renderTask = null;

        async function renderSample() {
            setMessage("");
            setPageSize({ width: 0, height: 0 });
            if (!fileUrl || !canvasRef.current) return;

            setLoading(true);
            try {
                loadingTask = pdfjs.getDocument({ url: fileUrl, withCredentials: true });
                const pdf = await loadingTask.promise;
                if (cancelled) return;
                const page = await pdf.getPage(1);
                if (cancelled) return;
                const containerWidth = Math.min(wrapperRef.current?.clientWidth || 720, 760);
                const baseViewport = page.getViewport({ scale: 1 });
                const scale = Math.min(1.4, Math.max(0.6, containerWidth / baseViewport.width));
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext("2d");
                const pixelRatio = window.devicePixelRatio || 1;

                canvas.width = Math.floor(viewport.width * pixelRatio);
                canvas.height = Math.floor(viewport.height * pixelRatio);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
                setPageSize({ width: viewport.width, height: viewport.height });
                renderTask = page.render({ canvasContext: context, viewport });
                await renderTask.promise;
            } catch {
                if (!cancelled) setMessage("PDF contoh gagal dimuat.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        renderSample();

        return () => {
            cancelled = true;
            renderTask?.cancel?.();
            loadingTask?.destroy?.();
        };
    }, [fileUrl]);

    const updatePositionFromEvent = (event) => {
        if (!wrapperRef.current || !pageSize.width || !pageSize.height) return;
        const rect = wrapperRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
        const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));
        onPositionChange({ x_percent: Number(x.toFixed(3)), y_percent: Number(y.toFixed(3)) });
    };

    const startDrag = (event) => {
        event.preventDefault();
        setDragging(true);
        updatePositionFromEvent(event);
    };

    useEffect(() => {
        if (!dragging) return undefined;
        const move = (event) => updatePositionFromEvent(event);
        const stop = () => setDragging(false);
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);

        return () => {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
        };
    }, [dragging, pageSize.width, pageSize.height]);

    return (
        <div className="min-w-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="text-sm font-semibold text-gray-800">PDF Contoh Posisi</div>
                    <p className="mt-1 text-xs text-gray-500">Upload PDF contoh, lalu drag titik tengah teks watermark pada halaman pertama.</p>
                </div>
                <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedFile?.name || "Upload PDF"}
                    <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => onSampleChange(event.target.files?.[0] || null)} />
                </label>
            </div>
            {error ? <p className="mb-3 text-xs text-red-600">{error}</p> : null}
            <div className="overflow-auto rounded-lg border border-gray-200 bg-gray-100 p-3">
                {fileUrl ? (
                    <div ref={wrapperRef} className="relative mx-auto w-fit overflow-hidden bg-white shadow-sm ring-1 ring-gray-200" style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}>
                        <canvas ref={canvasRef} className="block" />
                        {pageSize.width && pageSize.height ? (
                            <button
                                type="button"
                                onPointerDown={startDrag}
                                className="absolute cursor-move select-none whitespace-nowrap rounded border border-amber-300 bg-amber-100/70 px-2 py-1 text-left font-bold text-gray-700 shadow"
                                style={markerStyle}
                            >
                                {sampleWatermarkText(value.text_template)}
                            </button>
                        ) : null}
                        {loading ? <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-gray-500">Memuat PDF...</div> : null}
                    </div>
                ) : (
                    <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-5 text-center text-sm text-gray-500">
                        Upload PDF contoh untuk menentukan posisi watermark langsung di dokumen.
                    </div>
                )}
            </div>
            {message ? <p className="mt-2 text-xs text-red-600">{message}</p> : null}
        </div>
    );
}

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="min-w-0 break-words font-medium">{label}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
            />
        </label>
    );
}
