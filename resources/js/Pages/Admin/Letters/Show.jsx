import { Head, router, useForm, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import NotaDinasPreview from "@/Pages/Admin/LetterTemplates/Components/NotaDinasPreview";
import { Download, Paperclip, Save, Send, Trash2 } from "lucide-react";

export default function LetterShow() {
    const { letter, notifications, targetOptions = {}, dispositionTargetOptions = {}, auth } = usePage().props;
    const isIncomingExternal = letter.type === "incoming_external";
    const { data, setData, put, processing } = useForm({
        status: letter.status,
        letter_number: letter.letter_number || "",
    });
    const dispositionForm = useForm({
        letter_id: letter.id,
        target_type: "directorate",
        target_id: "",
        note: "",
        status: "open",
    });
    const submit = (e) => {
        e.preventDefault();
        put(`/admin/surat/${letter.id}`, { preserveScroll: true });
    };
    const submitDisposition = (e) => {
        e.preventDefault();
        dispositionForm.post("/admin/disposisi", {
            preserveScroll: true,
            onSuccess: () => dispositionForm.reset("target_id", "note"),
        });
    };
    const notaMetadata = {
        ...(letter.payload || {}),
        letter_number: letter.letter_number,
        recipients: letter.payload?.recipients,
        cc: letter.payload?.cc,
        sender: letter.payload?.sender,
        subject: letter.subject,
        letter_date: letter.payload?.letter_date,
        page_count: letter.page_count,
    };
    const canDeleteDraft = letter.status === "draft" && String(letter.created_by) === String(auth?.user?.id);

    return (
        <>
            <Head title={`${letter.subject} - Admin`} />
            <LayoutAdmin>
                <div className="grid gap-6 xl:grid-cols-3">
                    <div className="space-y-6 xl:col-span-2">
                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <h1 className="text-2xl font-bold text-gray-950">{letter.subject}</h1>
                            <p className="mt-2 text-sm text-gray-500">{isIncomingExternal ? (letter.letter_number || "-") : letter.reference} · {letter.letter_type?.name || "Tanpa jenis"} · {letter.type} · {letter.creation_method} · {letter.page_count || 1} halaman</p>
                        </div>
                        {canDeleteDraft ? (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirm("Hapus draft surat ini?")) router.delete(`/admin/surat/${letter.id}`);
                                    }}
                                    className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Hapus Draft
                                </button>
                            </div>
                        ) : null}
                        {letter.creation_method === "template" ? (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-300 shadow-sm">
                                <NotaDinasPreview html={letter.body_rendered} metadata={notaMetadata} />
                            </div>
                        ) : letter.attachments?.[0] ? (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                <iframe title="Preview PDF" src={`/storage/${letter.attachments[0].file_path}`} className="h-[520px] md:h-[720px] w-full bg-gray-100" />
                            </div>
                        ) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: letter.body_rendered || "<p>Belum ada isi surat.</p>" }} />
                            </div>
                        )}
                        <AttachmentPanel attachments={letter.attachments || []} />
                        <Panel title="Informasi Surat" rows={[
                            ["Nomor Surat", letter.letter_number || "-"],
                            ["Jenis Surat", letter.letter_type?.name || "-"],
                            ["Pembuat", letter.creator?.name || "-"],
                            ...(!isIncomingExternal ? [["Status", letter.status]] : []),
                            ...(letter.payload?.origin_name ? [["Asal Surat", letter.payload.origin_name]] : []),
                            ...(letter.payload?.internal_origin_name ? [["Asal Surat", letter.payload.internal_origin_name]] : []),
                            ...(letter.payload?.external_recipient ? [["Tujuan Eksternal", letter.payload.external_recipient]] : []),
                            ...(letter.payload?.notes ? [["Catatan", letter.payload.notes]] : []),
                        ]} />
                        {!isIncomingExternal ? <Panel title="Target dan Tebusan" rows={letter.targets?.map((x) => [x.kind === "cc" ? "Tembusan" : "Tujuan", targetLabel(x, targetOptions)])} /> : null}
                        <Panel title="Disposisi" rows={letter.dispositions?.map((x) => [
                            `Dari: ${x.from_user?.name || "-"}`,
                            `Tujuan: ${targetLabel(x, targetOptions)}`,
                            x.status,
                            x.note || "-",
                        ])} />
                    </div>
                    <div className="space-y-6">
                        <form onSubmit={submit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="font-semibold text-gray-950">Update Surat</h2>
                            <label className="mt-4 block text-sm font-medium text-gray-700">Nomor Surat</label>
                            <input value={data.letter_number} onChange={(e) => setData("letter_number", e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
                            {!isIncomingExternal ? (
                                <>
                                    <label className="mt-4 block text-sm font-medium text-gray-700">Status</label>
                                    <select value={data.status} onChange={(e) => setData("status", e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
                                        {["draft", "sent", "received", "disposed", "archived", "rejected"].map((s) => <option key={s}>{s}</option>)}
                                    </select>
                                </>
                            ) : null}
                            <button disabled={processing} className="mt-4 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"><Save className="mr-2 h-4 w-4" />Simpan</button>
                        </form>
                        <DispositionForm
                            form={dispositionForm}
                            onSubmit={submitDisposition}
                            targetOptions={dispositionTargetOptions}
                            processing={dispositionForm.processing}
                        />
                        <Panel title="Status Baca" rows={letter.read_receipts?.map((x) => [x.user?.name || "-", x.read_at || "belum dibaca"])} />
                        <Panel title="Informasi Halaman" rows={[[`${letter.page_count || 1} Halaman`, `Lampiran: ${letter.page_count || 1} Halaman`]]} />
                        {!isIncomingExternal ? <Panel title="Notifikasi" rows={notifications?.map((x) => [x.title, x.user?.name || "-", x.sent_at || "-"])} /> : null}
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function DispositionForm({ form, onSubmit, targetOptions, processing }) {
    const options = optionsByType(form.data.target_type, targetOptions);
    const targetTypes = availableDispositionTypes(targetOptions);

    return (
        <form onSubmit={onSubmit} className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-950">Input Disposisi</h2>
            <label className="mt-4 block text-sm font-medium text-gray-700">Tujuan</label>
            <select value={form.data.target_type} onChange={(e) => form.setData({ ...form.data, target_type: e.target.value, target_id: "" })} className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
                {targetTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
            <select value={form.data.target_id} onChange={(e) => form.setData("target_id", e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm">
                <option value="">Pilih tujuan</option>
                {options.map((option) => <option key={`${form.data.target_type}-${option.id}`} value={option.id}>{option.label}</option>)}
            </select>
            {form.errors.target_id || form.errors.target_type ? <div className="mt-2 text-xs text-red-600">{form.errors.target_id || form.errors.target_type}</div> : null}
            <label className="mt-4 block text-sm font-medium text-gray-700">Catatan</label>
            <textarea rows={4} value={form.data.note} onChange={(e) => form.setData("note", e.target.value)} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            <button disabled={processing || !form.data.target_id} className="mt-4 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Send className="mr-2 h-4 w-4" />Kirim Disposisi</button>
        </form>
    );
}

function availableDispositionTypes(options = {}) {
    const configured = options.targetTypes || ["directorate", "division_gm", "department_manager"];
    return configured.map((type) => ({
        id: type,
        name: {
            directorate: "Direktur",
            division: "Divisi",
            division_gm: "General Manager",
            department_manager: "Manager",
            department: "Department",
            user: "User",
        }[type] || type,
    }));
}

function Panel({ title, rows = [] }) {
    return <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-gray-950">{title}</h2><div className="mt-4 space-y-2">{rows.length ? rows.map((row, i) => <div key={i} className="min-w-0 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 break-words">{row.join(" · ")}</div>) : <div className="text-sm text-gray-500">Tidak ada data.</div>}</div></div>;
}

function AttachmentPanel({ attachments = [] }) {
    return (
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-gray-950">Lampiran</h2>
            <div className="mt-4 space-y-3">
                {attachments.length ? attachments.map((attachment) => (
                    <a key={attachment.id} href={`/storage/${attachment.file_path}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm hover:border-emerald-300">
                        <span className="flex min-w-0 items-center gap-2 font-medium text-gray-900">
                            <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                            <span className="break-words">{attachment.file_name}</span>
                        </span>
                        <Download className="h-4 w-4 shrink-0 text-gray-500" />
                    </a>
                )) : <div className="text-sm text-gray-500">Tidak ada lampiran.</div>}
            </div>
        </div>
    );
}

function optionsByType(type, options) {
    if (type === "user") return (options.users || []).map((user) => ({ id: user.id, label: `${user.name}${user.position ? ` - ${user.position}` : ""}` }));
    if (type === "directorate") return (options.directorates || []).map((unit) => ({ id: unit.id, label: `${unit.name}${unit.director?.name ? ` - ${unit.director.name}` : ""}` }));
    if (type === "division" || type === "division_gm") return (options.divisions || []).map((unit) => ({ id: unit.id, label: `${unit.name}${type === "division_gm" && unit.general_manager?.name ? ` - ${unit.general_manager.name}` : ""}` }));
    return (options.departments || []).map((unit) => ({ id: unit.id, label: `${unit.name}${type === "department_manager" && unit.manager?.name ? ` - ${unit.manager.name}` : ""}` }));
}

function targetLabel(target, options) {
    return optionsByType(target.target_type, options).find((option) => String(option.id) === String(target.target_id))?.label || `${target.target_type}: ${target.target_id}`;
}
