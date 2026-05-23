import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import { Edit, Save, Trash2, X } from "lucide-react";
import Search from "@/Shared/Search";

const labels = {
    directorates: "Direktorat",
    divisions: "Divisi",
    departments: "Department",
};

export default function OrganizationIndex() {
    const { type, directorates, divisions, departments, users, filterOptions = {} } = usePage().props;
    const rows = type === "directorates" ? directorates : type === "divisions" ? divisions : departments;
    const [editing, setEditing] = useState(null);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: "",
        directorate_id: directorates?.[0]?.id || "",
        division_id: divisions?.[0]?.id || "",
        director_user_id: "",
        gm_user_id: "",
        manager_user_id: "",
        status: "active",
    });

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            put(`/admin/organisasi/${type}/${editing.id}`, {
                preserveScroll: true,
                onSuccess: () => clearEdit(),
            });
            return;
        }

        post(`/admin/organisasi/${type}`, { preserveScroll: true, onSuccess: () => reset("name") });
    };

    const startEdit = (row) => {
        setEditing(row);
        setData({
            name: row.name || "",
            directorate_id: row.directorate_id || directorates?.[0]?.id || "",
            division_id: row.division_id || divisions?.[0]?.id || "",
            director_user_id: row.director_user_id || "",
            gm_user_id: row.gm_user_id || "",
            manager_user_id: row.manager_user_id || "",
            status: row.status || "active",
        });
    };

    const clearEdit = () => {
        setEditing(null);
        reset("name", "director_user_id", "gm_user_id", "manager_user_id");
        setData("status", "active");
    };

    return (
        <>
            <Head title={`${labels[type]} - Admin`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">{labels[type]}</h1>
                        <p className="mt-2 text-sm text-gray-600">Kelola master organisasi dan pejabat unit. Field pejabat unit dapat terisi otomatis dari form User saat jabatan organisasi disimpan.</p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL={`/admin/organisasi/${type}`} filters={[
                            { key: "statuses", label: "Status", options: filterOptions.statuses || [] },
                            ...(type === "divisions" ? [{ key: "directorate_ids", label: "Direktorat", options: filterOptions.directorates || [] }] : []),
                            ...(type === "departments" ? [{ key: "division_ids", label: "Divisi", options: filterOptions.divisions || [] }] : []),
                        ]} />
                    </div>

                    <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                            Pejabat Unit dapat diisi otomatis dari menu User, tetapi tetap bisa dikoreksi manual di sini jika diperlukan.
                        </div>
                        <div className="grid gap-4 md:grid-cols-4">
                            {type === "divisions" ? <Select label="Direktorat" value={data.directorate_id} options={directorates} onChange={(value) => setData("directorate_id", value)} /> : null}
                            {type === "departments" ? <Select label="Divisi" value={data.division_id} options={divisions} onChange={(value) => setData("division_id", value)} /> : null}
                            <Field label={`Nama ${labels[type]}`} value={data.name} onChange={(value) => setData("name", value)} error={errors.name} />
                            {type === "directorates" ? <Select label="Direktur" value={data.director_user_id} options={users} onChange={(value) => setData("director_user_id", value)} nullable /> : null}
                            {type === "divisions" ? <Select label="General Manager" value={data.gm_user_id} options={users} onChange={(value) => setData("gm_user_id", value)} nullable /> : null}
                            {type === "departments" ? <Select label="Manager" value={data.manager_user_id} options={users} onChange={(value) => setData("manager_user_id", value)} nullable /> : null}
                            <Select label="Status" value={data.status} options={[{ id: "active", name: "Aktif" }, { id: "inactive", name: "Nonaktif" }]} onChange={(value) => setData("status", value)} />
                        </div>
                        <button disabled={processing} className="mt-5 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            <Save className="mr-2 h-4 w-4" />
                            {processing ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
                        </button>
                        {editing ? (
                            <button type="button" onClick={clearEdit} className="ml-3 mt-5 inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">
                                <X className="mr-2 h-4 w-4" />
                                Batal Edit
                            </button>
                        ) : null}
                    </form>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {tableHeaders(type).map((header) => (
                                        <th key={header} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(rows || []).map((row) => (
                                    <tr key={row.id}>
                                        <td className="px-5 py-4 text-sm font-semibold text-gray-950">{row.name}</td>
                                        {type === "divisions" ? <td className="px-5 py-4 text-sm text-gray-600">{row.directorate?.name || "-"}</td> : null}
                                        {type === "departments" ? <td className="px-5 py-4 text-sm text-gray-600">{row.division?.name || "-"}</td> : null}
                                        <td className="px-5 py-4 text-sm text-gray-600">{assignmentName(row, type, users)}</td>
                                        <td className="px-5 py-4 text-sm text-gray-600">{row.status === "active" ? "Aktif" : "Nonaktif"}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => startEdit(row)} className="rounded-lg bg-blue-50 p-2 text-blue-700">
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => router.delete(`/admin/organisasi/${type}/${row.id}`, { preserveScroll: true })} className="rounded-lg bg-red-50 p-2 text-red-700">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function tableHeaders(type) {
    if (type === "directorates") return ["Nama", "Direktur", "Status", "Aksi"];
    if (type === "divisions") return ["Nama", "Direktorat", "General Manager", "Status", "Aksi"];
    return ["Nama", "Divisi", "Manager", "Status", "Aksi"];
}

function assignmentName(row, type, users) {
    const userId = type === "directorates" ? row.director_user_id : type === "divisions" ? row.gm_user_id : row.manager_user_id;
    return (users || []).find((user) => user.id === userId)?.name || "-";
}

function Field({ label, value, onChange, error }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <input value={value} onChange={(e) => onChange(e.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-gray-300"}`} />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function Select({ label, value, options, onChange, nullable = false }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
                {nullable ? <option value="">-</option> : null}
                {(options || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
        </div>
    );
}
