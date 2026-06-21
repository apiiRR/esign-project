import { Head, Link, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Save, Shield, UserRound } from "lucide-react";
import { appName } from "@/Utils/appIdentity";

export default function UsersCreate() {
    const { roleOptions = [], settings } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        username: "",
        name: "",
        email: "",
        password: "",
        role: "user",
        can_create_documents: false,
        position: "",
        status: "active",
    });

    const setRole = (role) => {
        setData((current) => ({
            ...current,
            role,
            can_create_documents: role === "user" ? current.can_create_documents : false,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post("/admin/users", {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Tambah User - ${appName(settings)}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Tambah User</h1>
                        <p className="mt-2 text-sm text-gray-600">Buat akun perusahaan, role akses, posisi, dan status akun.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <Section icon={UserRound} title="Identitas Akun">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Nama Lengkap" value={data.name} onChange={(value) => setData("name", value)} error={errors.name} placeholder="Nama user" />
                                    <Field label="Email" type="email" value={data.email} onChange={(value) => setData("email", value)} error={errors.email} placeholder="nama@berdikari.co.id" />
                                    <Field label="Username" value={data.username} onChange={(value) => setData("username", value)} error={errors.username} placeholder="nama.belakang" />
                                    <Field label="Password" type="password" value={data.password} onChange={(value) => setData("password", value)} error={errors.password} placeholder="Minimal 8 karakter" />
                                    <Field label="Posisi" value={data.position} onChange={(value) => setData("position", value)} error={errors.position} placeholder="Contoh: Staff Administrasi" />
                                    <Select label="Status Akun" value={data.status} options={[{ id: "active", name: "Aktif" }, { id: "inactive", name: "Nonaktif" }]} onChange={(value) => setData("status", value)} />
                                </div>
                            </Section>
                        </div>

                        <div className="space-y-6">
                            <Section icon={Shield} title="Role Akses">
                                <div className="space-y-3">
                                    {roleOptions.map((role) => (
                                        <label key={role.id} className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                            <input type="radio" name="role" checked={data.role === role.id} onChange={() => setRole(role.id)} className="mr-3 border-gray-300 text-emerald-700 focus:ring-emerald-600" />
                                            <span className="font-medium">{role.name}</span>
                                        </label>
                                    ))}
                                </div>
                                {data.role === "user" ? (
                                    <label className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(data.can_create_documents)}
                                            onChange={(event) => setData("can_create_documents", event.target.checked)}
                                            className="mt-1 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                                        />
                                        <span>
                                            <span className="font-medium text-gray-900">Boleh membuat dokumen</span>
                                            <span className="block text-xs text-gray-500">Aktifkan jika user boleh melihat tombol dan form Buat Dokumen.</span>
                                        </span>
                                    </label>
                                ) : null}
                                {errors.role ? <p className="mt-2 text-sm text-red-600">{errors.role}</p> : null}
                                {errors.can_create_documents ? <p className="mt-2 text-sm text-red-600">{errors.can_create_documents}</p> : null}
                            </Section>

                            <div className="flex gap-3">
                                <Link href="/admin/users" className="min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</Link>
                                <button type="submit" disabled={processing} className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
                                    <Save className="mr-2 h-4 w-4" />
                                    {processing ? "Menyimpan..." : "Simpan"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </LayoutAdmin>
        </>
    );
}

function Section({ icon: Icon, title, description, children }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                    <Icon className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="font-semibold text-gray-950">{title}</h2>
                    {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
                </div>
            </div>
            {children}
        </div>
    );
}

function Field({ label, value, onChange, placeholder, type = "text", error, hint }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-600 ${error ? "border-red-500" : "border-gray-300"}`} />
            {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
            {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
        </div>
    );
}

function Select({ label, value, options, onChange, nullable = false }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600">
                {nullable ? <option value="">-</option> : null}
                {(options || []).map((option) => {
                    const item = typeof option === "string" ? { id: option, name: option } : option;
                    return <option key={item.id} value={item.id}>{item.name}</option>;
                })}
            </select>
        </div>
    );
}
