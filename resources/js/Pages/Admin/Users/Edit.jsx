import { Head, Link, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Save, Shield, UserRound } from "lucide-react";
import { appName } from "@/Utils/appIdentity";

export default function UsersEdit() {
    const { user, roles, userRoles, settings } = usePage().props;
    const { data, setData, put, processing, errors } = useForm({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        password: "",
        roles: userRoles || [],
        position: user.position || "",
        status: user.status || "active",
    });

    const toggleRole = (id) => {
        setData("roles", [id]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Edit User - ${appName(settings)}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Edit User</h1>
                        <p className="mt-2 text-sm text-gray-600">Perbarui akun perusahaan, role akses, posisi, dan status akun.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <Section icon={UserRound} title="Identitas Akun">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Nama Lengkap" value={data.name} onChange={(value) => setData("name", value)} error={errors.name} />
                                    <Field label="Email" type="email" value={data.email} onChange={(value) => setData("email", value)} error={errors.email} />
                                    <Field label="Username" value={data.username} onChange={(value) => setData("username", value)} error={errors.username} />
                                    <Field label="Password" type="password" value={data.password} onChange={(value) => setData("password", value)} error={errors.password} placeholder="Kosongkan jika tidak diubah" />
                                    <Field label="Posisi" value={data.position} onChange={(value) => setData("position", value)} error={errors.position} placeholder="Contoh: Staff Administrasi" />
                                    <Select label="Status Akun" value={data.status} options={[{ id: "active", name: "Aktif" }, { id: "inactive", name: "Nonaktif" }]} onChange={(value) => setData("status", value)} />
                                </div>
                            </Section>
                        </div>

                        <div className="space-y-6">
                            <Section icon={Shield} title="Role Akses">
                                <div className="space-y-3">
                                    {roles.map((role) => (
                                        <label key={role.id} className="flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                            <input type="radio" name="role" checked={data.roles.includes(role.id)} onChange={() => toggleRole(role.id)} className="mr-3 border-gray-300 text-emerald-700 focus:ring-emerald-600" />
                                            <span className="font-medium">{role.name}</span>
                                        </label>
                                    ))}
                                </div>
                                {errors.roles ? <p className="mt-2 text-sm text-red-600">{errors.roles}</p> : null}
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
