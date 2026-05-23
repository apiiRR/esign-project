import { Head, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Building2, Save, Upload } from "lucide-react";

export default function SettingsIndex() {
    const { setting, fieldRequirementDefinitions = {}, letterFieldRequirements = {} } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        app_name: setting?.app_name || "",
        company_name: setting?.company_name || "",
        company_code: setting?.company_code || "",
        company_logo: null,
        enable_letter_template_method: Boolean(setting?.enable_letter_template_method),
        letter_field_requirements: letterFieldRequirements || {},
        _method: "PUT",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/admin/settings", { forceFormData: true, preserveScroll: true });
    };

    const contextLabels = {
        incoming_external: "Surat Masuk Eksternal",
        internal: "Surat Internal",
        outgoing: "Surat Keluar",
        archive: "Arsip Scan",
    };

    function toggleRequirement(context, field) {
        setData("letter_field_requirements", {
            ...data.letter_field_requirements,
            [context]: {
                ...(data.letter_field_requirements?.[context] || {}),
                [field]: !Boolean(data.letter_field_requirements?.[context]?.[field]),
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
                        <p className="mt-2 text-sm text-gray-600">Pengaturan inti untuk identitas aplikasi dan logo pada Nota Dinas.</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-5 flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-950">Identitas Utama</h2>
                                <p className="text-xs text-gray-500">Field ini dipakai untuk login shell, header aplikasi, dan preview template surat.</p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <Field label="Nama Aplikasi" value={data.app_name} onChange={(v) => setData("app_name", v)} error={errors.app_name} />
                            <Field label="Nama Perusahaan" value={data.company_name} onChange={(v) => setData("company_name", v)} error={errors.company_name} />
                            <Field label="Kode Perusahaan" value={data.company_code} onChange={(v) => setData("company_code", v)} error={errors.company_code} />
                        </div>

                        <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <label className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={data.enable_letter_template_method}
                                    onChange={(e) => setData("enable_letter_template_method", e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                />
                                <span>
                                    <span className="block text-sm font-semibold text-gray-900">Aktifkan metode Buat dari Template</span>
                                    <span className="mt-1 block text-xs text-gray-500">Jika nonaktif, pegawai dan admin hanya bisa memilih Scan Surat untuk surat internal.</span>
                                </span>
                            </label>
                            {errors.enable_letter_template_method ? <p className="mt-2 text-xs text-red-600">{errors.enable_letter_template_method}</p> : null}
                        </div>

                        <div className="mt-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                            <label className="flex cursor-pointer items-center gap-3">
                                <Upload className="h-5 w-5 text-gray-500" />
                                <span className="text-sm text-gray-700">{data.company_logo?.name || "Upload logo perusahaan untuk Nota Dinas"}</span>
                                <input type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={(e) => setData("company_logo", e.target.files[0])} />
                            </label>
                            {setting?.company_logo ? (
                                <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-3">
                                    <img src={`/storage/settings/${setting.company_logo}`} alt="Logo perusahaan" className="h-12 w-24 object-contain" />
                                    <span className="text-xs text-gray-500">Logo saat ini</span>
                                </div>
                            ) : null}
                            {errors.company_logo ? <p className="mt-2 text-xs text-red-600">{errors.company_logo}</p> : null}
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
                                            <label key={field} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                                                <span>{label}</span>
                                                <span className="flex items-center gap-2 text-xs font-semibold text-gray-500">
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
