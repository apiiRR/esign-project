import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Search from "@/Shared/Search";
import Pagination from "@/Shared/Pagination";
import { Edit, Save, Trash2, X } from "lucide-react";

export default function LetterTypesIndex() {
    const { letterTypes, filterOptions = {} } = usePage().props;
    const [editing, setEditing] = useState(null);
    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: "",
        description: "",
        status: "active",
    });

    const submit = (event) => {
        event.preventDefault();

        if (editing) {
            put(`/admin/letter-types/${editing.id}`, {
                preserveScroll: true,
                onSuccess: clearEdit,
            });
            return;
        }

        post("/admin/letter-types", {
            preserveScroll: true,
            onSuccess: () => reset("name", "description"),
        });
    };

    const startEdit = (letterType) => {
        setEditing(letterType);
        setData({
            name: letterType.name || "",
            description: letterType.description || "",
            status: letterType.status || "active",
        });
    };

    const clearEdit = () => {
        setEditing(null);
        reset();
    };

    return (
        <>
            <Head title="Jenis Surat - Admin" />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Jenis Surat</h1>
                        <p className="mt-2 text-sm text-gray-600">Kelola master jenis surat yang wajib dipilih saat input surat.</p>
                    </div>

                    <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-[1fr_1.4fr_160px]">
                            <Field label="Nama Jenis Surat" value={data.name} onChange={(value) => setData("name", value)} error={errors.name} />
                            <Field label="Deskripsi" value={data.description} onChange={(value) => setData("description", value)} error={errors.description} />
                            <Select label="Status" value={data.status} onChange={(value) => setData("status", value)} options={[{ id: "active", name: "Aktif" }, { id: "inactive", name: "Nonaktif" }]} error={errors.status} />
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button disabled={processing} className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                                <Save className="mr-2 h-4 w-4" />
                                {processing ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan"}
                            </button>
                            {editing ? (
                                <button type="button" onClick={clearEdit} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700">
                                    <X className="mr-2 h-4 w-4" />
                                    Batal Edit
                                </button>
                            ) : null}
                        </div>
                    </form>

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL="/admin/letter-types" filters={[
                            { key: "statuses", label: "Status", options: filterOptions.statuses || [] },
                        ]} />
                        <div className="mt-5 overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Nama</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Deskripsi</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {letterTypes?.data?.length ? letterTypes.data.map((letterType) => (
                                        <tr key={letterType.id}>
                                            <td className="px-5 py-4 text-sm font-semibold text-gray-950">{letterType.name}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letterType.description || "-"}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letterType.status === "active" ? "Aktif" : "Nonaktif"}</td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button type="button" onClick={() => startEdit(letterType)} className="rounded-lg bg-blue-50 p-2 text-blue-700">
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => router.delete(`/admin/letter-types/${letterType.id}`, { preserveScroll: true })} className="rounded-lg bg-red-50 p-2 text-red-700">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-5 py-8 text-center text-sm text-gray-500">Belum ada jenis surat.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4">
                            <Pagination links={letterTypes.links} />
                        </div>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function Field({ label, value, onChange, error, placeholder }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <input value={value || ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-gray-300"}`} />
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}

function Select({ label, value, options, onChange, error }) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
            <select value={value || ""} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm ${error ? "border-red-500" : "border-gray-300"}`}>
                {options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
    );
}
