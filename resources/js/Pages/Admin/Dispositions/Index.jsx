import { Head, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import { Save } from "lucide-react";

export default function DispositionsIndex() {
    const { dispositions, letters, targetOptions = {} } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        letter_id: letters?.[0]?.id || "",
        target_type: "directorate",
        target_id: "",
        note: "",
        status: "open",
    });
    const targetTypes = targetOptions.targetTypes || ["directorate", "division", "division_gm", "department_manager", "department"];
    const targetOptionsForType = optionsByType(data.target_type, targetOptions);

    const submit = (e) => {
        e.preventDefault();
        post("/admin/disposisi", {
            preserveScroll: true,
            onSuccess: () => setData({ ...data, target_id: "", note: "" }),
        });
    };

    return (
        <>
            <Head title="Disposisi - Admin" />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">Disposisi</h1>
                        <p className="mt-2 text-sm text-gray-600">Kelola disposisi surat berbasis target organisasi.</p>
                    </div>
                    <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <div className="grid gap-4 md:grid-cols-5">
                            <Select label="Surat" value={data.letter_id} onChange={(v) => setData("letter_id", v)} options={(letters || []).map((l) => ({ id: l.id, name: `${letterDisplayNumber(l)} - ${l.subject}` }))} />
                            <Select label="Target Type" value={data.target_type} onChange={(v) => setData({ ...data, target_type: v, target_id: "" })} options={targetTypes.map((x) => ({ id: x, name: targetTypeLabel(x) }))} />
                            <Select label="Target" value={data.target_id} onChange={(v) => setData("target_id", v)} options={targetOptionsForType.map((x) => ({ id: x.id, name: x.label }))} />
                            <Field label="Catatan" value={data.note} onChange={(v) => setData("note", v)} />
                            <Select label="Status" value={data.status} onChange={(v) => setData("status", v)} options={[{ id: "open", name: "Open" }, { id: "done", name: "Done" }]} />
                        </div>
                        {errors.target_id || errors.target_type ? <div className="mt-2 text-xs text-red-600">{errors.target_id || errors.target_type}</div> : null}
                        <button disabled={processing} className="mt-4 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Save className="mr-2 h-4 w-4" />Simpan</button>
                    </form>
                    <Table rows={dispositions.data || []} />
                    <Pagination links={dispositions.links} />
                </div>
            </LayoutAdmin>
        </>
    );
}

function Table({ rows }) {
    return <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm"><table className="min-w-[760px] divide-y divide-gray-200"><thead className="bg-gray-50"><tr>{["Surat", "Dari", "Target", "Status", "Catatan"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 text-sm">{letterDisplayNumber(row.letter)}</td><td className="px-5 py-4 text-sm">{row.from_user?.name || "-"}</td><td className="px-5 py-4 text-sm">{row.target_type}:{row.target_id || "-"}</td><td className="px-5 py-4 text-sm">{row.status === "open" ? "Diproses" : "Selesai"}</td><td className="px-5 py-4 text-sm break-words">{row.note || "-"}</td></tr>)}</tbody></table></div>;
}
function Field({ label, value, onChange }) { return <div><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div>; }
function Select({ label, value, options, onChange }) { return <div><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"><option value="">Pilih</option>{(options || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>; }
function optionsByType(type, options) {
    if (type === "directorate") return (options.directorates || []).map((unit) => ({ id: unit.id, label: `${unit.name}${unit.director?.name ? ` - ${unit.director.name}` : ""}` }));
    if (type === "division" || type === "division_gm") return (options.divisions || []).map((unit) => ({ id: unit.id, label: `${unit.name}${type === "division_gm" && unit.general_manager?.name ? ` - ${unit.general_manager.name}` : ""}` }));
    return (options.departments || []).map((unit) => ({ id: unit.id, label: `${unit.name}${type === "department_manager" && unit.manager?.name ? ` - ${unit.manager.name}` : ""}` }));
}
function targetTypeLabel(type) {
    return {
        directorate: "Direktur",
        division: "Divisi",
        division_gm: "General Manager",
        department_manager: "Manager",
        department: "Department",
    }[type] || type;
}
function letterDisplayNumber(letter) {
    if (!letter) return "-";
    return letter.letter_number || "-";
}
