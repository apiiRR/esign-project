import { Head, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import { Save } from "lucide-react";

export default function DispositionsIndex() {
    const { dispositions, letters } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        letter_id: letters?.[0]?.id || "",
        target_type: "user",
        target_id: "",
        note: "",
        status: "open",
    });

    const submit = (e) => {
        e.preventDefault();
        post("/admin/disposisi", { preserveScroll: true });
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
                            <Select label="Surat" value={data.letter_id} onChange={(v) => setData("letter_id", v)} options={(letters || []).map((l) => ({ id: l.id, name: `${l.reference} - ${l.subject}` }))} />
                            <Select label="Target Type" value={data.target_type} onChange={(v) => setData("target_type", v)} options={["user", "division", "department", "directorate", "division_gm", "department_manager"].map((x) => ({ id: x, name: x }))} />
                            <Field label="Target ID" value={data.target_id} onChange={(v) => setData("target_id", v)} />
                            <Field label="Catatan" value={data.note} onChange={(v) => setData("note", v)} />
                            <Select label="Status" value={data.status} onChange={(v) => setData("status", v)} options={[{ id: "open", name: "Open" }, { id: "done", name: "Done" }]} />
                        </div>
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
    return <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr>{["Surat", "Dari", "Target", "Status", "Catatan"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{rows.map((row) => <tr key={row.id}><td className="px-5 py-4 text-sm">{row.letter?.reference}</td><td className="px-5 py-4 text-sm">{row.from_user?.name || "-"}</td><td className="px-5 py-4 text-sm">{row.target_type}:{row.target_id || "-"}</td><td className="px-5 py-4 text-sm">{row.status}</td><td className="px-5 py-4 text-sm">{row.note || "-"}</td></tr>)}</tbody></table></div>;
}
function Field({ label, value, onChange }) { return <div><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" /></div>; }
function Select({ label, value, options, onChange }) { return <div><label className="mb-2 block text-sm font-medium text-gray-700">{label}</label><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">{(options || []).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select></div>; }
