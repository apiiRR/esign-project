import { Head, Link, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Building2, Save, Shield, UserRound } from "lucide-react";

const positions = ["Direktur", "General Manager", "Manager", "Pegawai"];

export default function UsersEdit() {
    const { user, roles, userRoles, directorates, divisions, departments } = usePage().props;
    const { data, setData, put, processing, errors } = useForm({
        username: user.username || "",
        name: user.name || "",
        email: user.email || "",
        password: "",
        roles: userRoles || [],
        directorate_id: user.directorate_id || "",
        division_id: user.division_id || "",
        department_id: user.department_id || "",
        position: user.position || "",
        status: user.status || "active",
    });

    const toggleRole = (id) => {
        setData("roles", [id]);
    };
    const officerPreview = organizationOfficerPreview(data, directorates, divisions, departments);

    const handleSubmit = (e) => {
        e.preventDefault();
        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Edit User - ${import.meta.env.VITE_APP_NAME}`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Edit User</h1>
                        <p className="mt-2 text-sm text-gray-600">Perbarui akun perusahaan, role akses, unit kerja, jabatan organisasi, dan status akun.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-3">
                        <div className="space-y-6 xl:col-span-2">
                            <Section icon={UserRound} title="Identitas Akun">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Field label="Nama Lengkap" value={data.name} onChange={(value) => setData("name", value)} error={errors.name} />
                                    <Field label="Email Kantor" type="email" value={data.email} onChange={(value) => setData("email", value)} error={errors.email} />
                                    <Field label="Username" value={data.username} onChange={(value) => setData("username", value)} error={errors.username} />
                                    <Field label="Password" type="password" value={data.password} onChange={(value) => setData("password", value)} error={errors.password} placeholder="Kosongkan jika tidak diubah" />
                                </div>
                            </Section>

                            <Section
                                icon={Building2}
                                title="Unit Kerja & Jabatan Organisasi"
                                description="Unit kerja menentukan user berada di direktorat/divisi/department mana. Jabatan organisasi akan otomatis mengisi pejabat unit terkait."
                            >
                                <div className="grid gap-4 md:grid-cols-2">
                                    <Select label="Direktorat" value={data.directorate_id} options={directorates} onChange={(value) => setData("directorate_id", value)} nullable />
                                    <Select label="Divisi" value={data.division_id} options={divisions} onChange={(value) => setData("division_id", value)} nullable />
                                    <Select label="Department" value={data.department_id} options={departments} onChange={(value) => setData("department_id", value)} nullable />
                                    <Select label="Jabatan Organisasi" value={data.position} options={positions} onChange={(value) => setData("position", value)} nullable />
                                    <Select label="Status Akun" value={data.status} options={[{ id: "active", name: "Aktif" }, { id: "inactive", name: "Nonaktif" }]} onChange={(value) => setData("status", value)} />
                                </div>
                                <OfficerPreview message={officerPreview} />
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
                                <Link href="/admin/users" className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</Link>
                                <button type="submit" disabled={processing} className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
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

function OfficerPreview({ message }) {
    return (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {message || "Jika jabatan Direktur, General Manager, atau Manager dipilih, master organisasi akan terisi otomatis sesuai unit kerja."}
        </div>
    );
}

function organizationOfficerPreview(data, directorates, divisions, departments) {
    if (data.position === "Direktur") {
        const unit = (directorates || []).find((item) => String(item.id) === String(data.directorate_id));
        return unit ? `Akan menjadi Direktur pada ${unit.name}.` : "Pilih direktorat agar sistem bisa mengisi pejabat unit.";
    }

    if (data.position === "General Manager") {
        const unit = (divisions || []).find((item) => String(item.id) === String(data.division_id));
        return unit ? `Akan menjadi General Manager pada ${unit.name}.` : "Pilih divisi agar sistem bisa mengisi pejabat unit.";
    }

    if (data.position === "Manager") {
        const unit = (departments || []).find((item) => String(item.id) === String(data.department_id));
        return unit ? `Akan menjadi Manager pada ${unit.name}.` : "Pilih department agar sistem bisa mengisi pejabat unit.";
    }

    return "";
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
