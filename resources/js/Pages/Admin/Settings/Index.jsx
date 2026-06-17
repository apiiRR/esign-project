import { Head, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Building2, Mail, Save, Send, ShieldCheck, Upload } from "lucide-react";

export default function SettingsIndex() {
    const { setting, fieldRequirementDefinitions = {}, letterFieldRequirements = {} } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        app_name: setting?.app_name || "",
        company_name: setting?.company_name || "",
        company_code: setting?.company_code || "",
        company_logo: null,
        letter_field_requirements: letterFieldRequirements || {},
        mail_notifications_enabled: Boolean(setting?.mail_notifications_enabled),
        mail_letter_notifications_enabled: Boolean(setting?.mail_letter_notifications_enabled),
        mail_signature_approval_notifications_enabled: Boolean(setting?.mail_signature_approval_notifications_enabled),
        signature_otp_enabled: Boolean(setting?.signature_otp_enabled),
        mail_mailer: setting?.mail_mailer || "smtp",
        mail_host: setting?.mail_host || "",
        mail_port: setting?.mail_port || "",
        mail_username: setting?.mail_username || "",
        mail_password: "",
        mail_encryption: setting?.mail_encryption || "tls",
        mail_from_address: setting?.mail_from_address || "",
        mail_from_name: setting?.mail_from_name || setting?.app_name || "",
        mail_templates: setting?.mail_templates || {},
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

    const contextLabels = {
        incoming_external: "Surat Masuk Eksternal",
        internal: "Surat Internal",
        outgoing: "Surat Keluar",
        archive: "Arsip Scan",
    };
    const mailTemplateDefinitions = {
        surat_tujuan: "Surat Tujuan",
        surat_tebusan: "Surat Tembusan",
        disposisi: "Disposisi",
        approval_tte: "Approval TTE",
        surat_publish: "Surat Publish",
    };
    const placeholderGuide = "{app_name}, {recipient_name}, {sender_name}, {letter_number}, {letter_subject}, {letter_type}, {disposition_note}, {action_url}";

    function toggleRequirement(context, field) {
        setData("letter_field_requirements", {
            ...data.letter_field_requirements,
            [context]: {
                ...(data.letter_field_requirements?.[context] || {}),
                [field]: !Boolean(data.letter_field_requirements?.[context]?.[field]),
            },
        });
    }

    function updateMailTemplate(type, field, value) {
        setData("mail_templates", {
            ...(data.mail_templates || {}),
            [type]: {
                ...(data.mail_templates?.[type] || {}),
                [field]: value,
            },
        });
    }

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
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Identitas Utama</h2>
                                <p className="text-xs text-gray-500">Field ini dipakai untuk login shell dan header aplikasi.</p>
                            </div>
                        </div>

                        <div className="grid min-w-0 gap-4 md:grid-cols-3">
                            <Field label="Nama Aplikasi" value={data.app_name} onChange={(v) => setData("app_name", v)} error={errors.app_name} />
                            <Field label="Nama Perusahaan" value={data.company_name} onChange={(v) => setData("company_name", v)} error={errors.company_name} />
                            <Field label="Kode Perusahaan" value={data.company_code} onChange={(v) => setData("company_code", v)} error={errors.company_code} />
                        </div>

                        <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                            <label className="flex cursor-pointer items-center gap-3">
                                <Upload className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-700">{data.company_logo?.name || "Upload logo aplikasi/perusahaan"}</span>
                                <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={(e) => setData("company_logo", e.target.files[0])} />
                            </label>
                            {setting?.company_logo ? (
                                <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3">
                                    <img src={`/storage/settings/${setting.company_logo}`} alt="Logo aplikasi" className="h-12 w-24 object-contain" />
                                    <span className="text-xs text-gray-500">Logo saat ini</span>
                                </div>
                            ) : null}
                            {errors.company_logo ? <p className="mt-2 text-xs text-red-600">{errors.company_logo}</p> : null}
                        </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-start gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Email Notifikasi dan OTP</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Email dipakai sebagai kanal tambahan notifikasi surat dan pengiriman OTP tanda tangan elektronik.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <Toggle label="Aktifkan email" checked={data.mail_notifications_enabled} onChange={(v) => setData("mail_notifications_enabled", v)} />
                            <Toggle label="Email surat masuk" checked={data.mail_letter_notifications_enabled} onChange={(v) => setData("mail_letter_notifications_enabled", v)} />
                            <Toggle label="Email approval TTE" checked={data.mail_signature_approval_notifications_enabled} onChange={(v) => setData("mail_signature_approval_notifications_enabled", v)} />
                            <Toggle label="Wajib OTP approve/reject" checked={data.signature_otp_enabled} onChange={(v) => setData("signature_otp_enabled", v)} />
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

                        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="text-sm font-semibold text-gray-950">Template Email Notifikasi</div>
                            <p className="mt-1 text-xs text-gray-500">
                                Template default sudah tersedia dan bisa diedit sesuai kebutuhan. Placeholder yang tersedia: {placeholderGuide}
                            </p>
                            <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                {Object.entries(mailTemplateDefinitions).map(([type, label]) => (
                                    <div key={type} className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="mb-3 text-sm font-semibold text-gray-950">{label}</div>
                                        <Field
                                            label="Subject"
                                            value={data.mail_templates?.[type]?.subject || ""}
                                            onChange={(value) => updateMailTemplate(type, "subject", value)}
                                            error={errors[`mail_templates.${type}.subject`]}
                                        />
                                        <TextareaField
                                            label="Body"
                                            value={data.mail_templates?.[type]?.body || ""}
                                            onChange={(value) => updateMailTemplate(type, "body", value)}
                                            error={errors[`mail_templates.${type}.body`]}
                                        />
                                    </div>
                                ))}
                            </div>
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

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5">
                            <h2 className="font-semibold text-gray-950">Required Field Buat Surat</h2>
                            <p className="mt-1 text-xs text-gray-500">
                                Tentukan input mana yang wajib diisi dan mana yang opsional untuk seluruh form buat surat admin dan pegawai.
                            </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            {Object.entries(fieldRequirementDefinitions).map(([context, fields]) => (
                                <div key={context} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <div className="mb-3 text-sm font-semibold text-gray-950">
                                        {contextLabels[context] || context}
                                    </div>
                                    <div className="grid gap-2">
                                        {Object.entries(fields).map(([field, label]) => (
                                            <label key={field} className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                                                <span className="min-w-0 break-words">{label}</span>
                                                <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-gray-500">
                                                    {data.letter_field_requirements?.[context]?.[field] ? "Required" : "Opsional"}
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(data.letter_field_requirements?.[context]?.[field])}
                                                        onChange={() => toggleRequirement(context, field)}
                                                        className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                                    />
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {errors.letter_field_requirements ? <p className="mt-2 text-xs text-red-600">{errors.letter_field_requirements}</p> : null}
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

function TextareaField({ label, value, onChange, error }) {
    return (
        <div className="mt-3">
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <textarea
                rows={5}
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
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
