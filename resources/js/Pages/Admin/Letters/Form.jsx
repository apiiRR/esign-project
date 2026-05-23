import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import NotaDinasPreview from "@/Pages/Admin/LetterTemplates/Components/NotaDinasPreview";
import { Archive, Plus, Send, Trash2, Upload } from "lucide-react";

export default function LetterForm() {
    const {
        type,
        templates = [],
        letterTypes = [],
        targetOptions = {},
        auth,
        isArchive = false,
        templateEnabled = false,
    } = usePage().props;
    const isIncomingExternal = type === "incoming_external" && !isArchive;
    const isInternal = type === "internal";
    const isOutgoing = type === "outgoing";
    const supportsDraftSend = isInternal || isOutgoing;
    const context = isArchive ? "archive" : type;
    const today = new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    const originOptions = internalOriginOptions(auth?.user);
    const defaultOrigin = originOptions[0] || { type: "", id: "", name: "" };
    const [recipientDraft, setRecipientDraft] = useState({ target_type: "user", target_id: "" });
    const [ccDraft, setCcDraft] = useState({ target_type: "user", target_id: "" });
    const [letterNumberTouched, setLetterNumberTouched] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const { data, setData, errors } = useForm({
        type,
        is_archive: isArchive,
        submit_action: "send",
        creation_method: "scan",
        letter_type_id: "",
        letter_template_id: templates[0]?.id || "",
        letter_number: "",
        subject: "",
        body_rendered: "",
        page_count: 1,
        scan_file: null,
        targets: [],
        cc_targets: [],
        payload: {
            recipients: "",
            cc: "",
            sender: auth?.user?.position || auth?.user?.name || "",
            letter_date: today,
            origin_name: "",
            internal_origin_type: defaultOrigin.type,
            internal_origin_id: defaultOrigin.rawId,
            internal_origin_name: defaultOrigin.name,
            external_recipient: "",
            notes: "",
        },
    });

    const compatibleTemplates = templates.filter((template) =>
        isOutgoing ? ["outgoing", "both"].includes(template.category) : ["internal", "both"].includes(template.category),
    );
    const selectedTemplate = compatibleTemplates.find((template) => String(template.id) === String(data.letter_template_id)) || compatibleTemplates[0];
    const selectedLetterType = letterTypes.find((letterType) => String(letterType.id) === String(data.letter_type_id));
    const numberingActive = Boolean(selectedLetterType?.numbering_enabled && (selectedLetterType.numbering_contexts || []).includes(context));

    useEffect(() => {
        if (compatibleTemplates.length && !compatibleTemplates.some((template) => String(template.id) === String(data.letter_template_id))) {
            setData("letter_template_id", compatibleTemplates[0].id);
            return;
        }

        if ((!(isInternal || isOutgoing) || !templateEnabled) && data.creation_method !== "scan") {
            setData("creation_method", "scan");
            return;
        }

        if (selectedTemplate && data.creation_method === "template" && !data.body_rendered) {
            setData("body_rendered", selectedTemplate.content_template || "");
        }
    }, [selectedTemplate?.id, data.creation_method, isInternal, isOutgoing, templateEnabled]);

    useEffect(() => () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    }, [pdfPreviewUrl]);

    useEffect(() => {
        if (!numberingActive || !data.letter_type_id || letterNumberTouched) return;

        const params = new URLSearchParams();
        params.set("letter_type_id", data.letter_type_id);
        params.set("context", context);
        Object.entries(data.payload || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") params.set(`payload[${key}]`, value);
        });

        fetch(`/admin/nomor-surat/preview?${params.toString()}`, { headers: { Accept: "application/json" } })
            .then((response) => response.json())
            .then((result) => {
                if (result.letter_number) setData("letter_number", result.letter_number);
            })
            .catch(() => {});
    }, [numberingActive, data.letter_type_id, data.payload?.internal_origin_type, data.payload?.internal_origin_id, context, letterNumberTouched]);

    function updatePayload(key, value) {
        setData("payload", { ...data.payload, [key]: value });
    }

    function updateMethod(method) {
        if ((!(isInternal || isOutgoing) || !templateEnabled) && method !== "scan") return;
        setData({ ...data, creation_method: method, scan_file: method === "template" ? null : data.scan_file, page_count: method === "template" ? data.page_count : 1 });
        if (method === "template" && pdfPreviewUrl) {
            URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl("");
        }
    }

    function handleFile(file) {
        setData("scan_file", file || null);
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(file ? URL.createObjectURL(file) : "");
    }

    function addTarget(kind) {
        const draft = kind === "recipient" ? recipientDraft : ccDraft;
        if (!draft.target_id) return;
        const field = kind === "recipient" ? "targets" : "cc_targets";
        const exists = data[field].some((target) => target.target_type === draft.target_type && String(target.target_id) === String(draft.target_id));
        if (exists) return;
        setData(field, [...data[field], { target_type: draft.target_type, target_id: Number(draft.target_id) }]);
        kind === "recipient" ? setRecipientDraft({ ...draft, target_id: "" }) : setCcDraft({ ...draft, target_id: "" });
    }

    function removeTarget(field, index) {
        setData(field, data[field].filter((_, itemIndex) => itemIndex !== index));
    }

    function submit(event, action = "send") {
        event.preventDefault();
        setSubmitting(true);
        router.post("/admin/surat", { ...data, submit_action: action }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setSubmitting(false),
        });
    }

    const title = isArchive ? "Upload Arsip Surat" : isIncomingExternal ? "Buat Surat Masuk Eksternal" : isOutgoing ? "Buat Surat Keluar" : "Buat Surat Internal";
    const description = isArchive
        ? "Upload scan surat untuk disimpan sebagai arsip sistem."
        : isIncomingExternal
          ? "Input metadata surat dari pihak luar dan upload scan PDF."
          : "Pilih metode scan surat atau buat Nota Dinas dari template.";
    const backUrl = isArchive ? "/admin/surat/arsip" : isIncomingExternal ? "/admin/surat/masuk-eksternal" : isOutgoing ? "/admin/surat/keluar" : "/admin/surat/internal";
    const metadata = {
        letter_number: data.letter_number,
        recipients: data.payload.recipients || targetLabels(data.targets, targetOptions).join("\n"),
        cc: data.payload.cc || targetLabels(data.cc_targets, targetOptions).join("\n"),
        sender: data.payload.sender,
        subject: data.subject,
        letter_date: data.payload.letter_date,
        page_count: data.page_count,
    };

    return (
        <>
            <Head title={`${title} - Admin`} />
            <LayoutAdmin>
                <form onSubmit={(event) => submit(event, "send")} className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
                        <p className="mt-2 text-sm text-gray-600">{description}</p>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-12">
                        <div className="min-w-0 space-y-5 xl:col-span-6">
                            <Card>
                                <div className={`grid gap-3 ${(isInternal || isOutgoing) && templateEnabled ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
                                    <MethodButton active={data.creation_method === "scan"} title="Scan Surat" description="Upload surat final dalam format PDF." onClick={() => updateMethod("scan")} />
                                    {(isInternal || isOutgoing) && templateEnabled ? (
                                        <MethodButton active={data.creation_method === "template"} title="Buat dari Template" description="Gunakan format Nota Dinas dan hitung jumlah halaman." onClick={() => updateMethod("template")} />
                                    ) : null}
                                </div>
                                {(isInternal || isOutgoing) && !templateEnabled ? <p className="mt-3 text-xs font-medium text-gray-500">Metode buat dari template sedang dinonaktifkan oleh admin.</p> : null}
                            </Card>

                            <Card className="space-y-4">
                                <Select label="Jenis Surat" value={data.letter_type_id} onChange={(value) => { setLetterNumberTouched(false); setData("letter_type_id", value); }} options={letterTypes.map((letterType) => ({ id: letterType.id, name: `${letterType.name}${letterType.code ? ` (${letterType.code})` : ""}` }))} error={errors.letter_type_id} />
                                <Field label="Nomor Surat" value={data.letter_number} onChange={(value) => { setLetterNumberTouched(true); setData("letter_number", value); }} error={errors.letter_number} placeholder={numberingActive ? "Nomor otomatis akan diisi setelah jenis dan asal surat dipilih" : "Opsional"} />
                                {numberingActive ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">Nomor otomatis aktif dan akan dibooking saat draft/send.</div> : null}
                                <Field label="Perihal" value={data.subject} onChange={(value) => setData("subject", value)} error={errors.subject} placeholder="Perihal surat" />
                                {isInternal || isOutgoing ? <Select label="Asal Surat" value={`${data.payload.internal_origin_type}:${data.payload.internal_origin_id}`} onChange={(value) => {
                                    const selected = originOptions.find((option) => option.id === value);
                                    if (!selected) return;
                                    setData("payload", { ...data.payload, internal_origin_type: selected.type, internal_origin_id: selected.rawId, internal_origin_name: selected.name });
                                    setLetterNumberTouched(false);
                                }} options={originOptions} error={errors["payload.internal_origin_type"] || errors["payload.internal_origin_id"]} noPlaceholder /> : null}
                                {isOutgoing ? <Field label="Tujuan Eksternal" value={data.payload.external_recipient} onChange={(value) => updatePayload("external_recipient", value)} error={errors["payload.external_recipient"]} placeholder="Nama perusahaan/instansi penerima" /> : null}
                                {isIncomingExternal ? <Field label="Asal Surat" value={data.payload.origin_name} onChange={(value) => updatePayload("origin_name", value)} error={errors["payload.origin_name"]} placeholder="Nama instansi/perusahaan pengirim" /> : null}
                                {isIncomingExternal || isArchive ? <Textarea label="Catatan" value={data.payload.notes} onChange={(value) => updatePayload("notes", value)} rows={4} error={errors["payload.notes"]} placeholder="Catatan tambahan" /> : null}
                            </Card>

                            {isInternal ? (
                                <>
                                    <TargetPicker title="Tujuan" draft={recipientDraft} setDraft={setRecipientDraft} targets={data.targets} field="targets" targetOptions={targetOptions} onAdd={() => addTarget("recipient")} onRemove={removeTarget} error={errors.targets} />
                                    <TargetPicker title="Tembusan" draft={ccDraft} setDraft={setCcDraft} targets={data.cc_targets} field="cc_targets" targetOptions={targetOptions} onAdd={() => addTarget("cc")} onRemove={removeTarget} />
                                </>
                            ) : null}

                            {data.creation_method === "scan" ? (
                                <Card>
                                    <label className="block text-sm font-semibold text-gray-900">File Scan PDF</label>
                                    <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                                        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                                            <Upload className="h-5 w-5 shrink-0 text-gray-500" />
                                            <div className="min-w-0 flex-1">
                                                <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
                                                <div className="mt-2 text-xs text-gray-500">Hanya file PDF, maksimal 10MB.</div>
                                            </div>
                                        </div>
                                    </div>
                                    {errors.scan_file ? <p className="mt-2 text-xs text-red-600">{errors.scan_file}</p> : null}
                                </Card>
                            ) : (
                                <Card className="space-y-4">
                                    <Select label="Template" value={data.letter_template_id || compatibleTemplates[0]?.id || ""} onChange={(value) => setData("letter_template_id", value)} options={compatibleTemplates.map((template) => ({ id: template.id, name: template.name }))} error={errors.letter_template_id} noPlaceholder />
                                    <Textarea label="Kepada Yth" value={data.payload.recipients} onChange={(value) => updatePayload("recipients", value)} placeholder="Kosongkan untuk memakai daftar tujuan" />
                                    <Textarea label="Tembusan" value={data.payload.cc} onChange={(value) => updatePayload("cc", value)} placeholder="Kosongkan untuk memakai daftar tembusan" />
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <Field label="Dari" value={data.payload.sender} onChange={(value) => updatePayload("sender", value)} />
                                        <Field label="Tanggal" value={data.payload.letter_date} onChange={(value) => updatePayload("letter_date", value)} />
                                    </div>
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Jumlah halaman: {data.page_count || 1}</div>
                                    <Textarea label="Isi Nota Dinas" value={data.body_rendered} onChange={(value) => setData("body_rendered", value)} rows={8} error={errors.body_rendered} />
                                </Card>
                            )}

                            <div className="flex flex-wrap justify-end gap-3">
                                {supportsDraftSend ? <button type="button" disabled={submitting} onClick={(event) => submit(event, "draft")} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"><Archive className="mr-2 h-4 w-4" />{submitting ? "Menyimpan..." : "Simpan Draft"}</button> : null}
                                <Link href={backUrl} className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Batal</Link>
                                <button type="submit" disabled={submitting} className="inline-flex items-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"><Send className="mr-2 h-4 w-4" />{submitting ? "Menyimpan..." : supportsDraftSend ? "Send" : isArchive ? "Simpan Arsip" : "Simpan Surat"}</button>
                            </div>
                        </div>

                        <div className="min-w-0 xl:col-span-6">
                            <div className="sticky top-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                                    <div className="text-sm font-semibold text-gray-950">Preview</div>
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">{data.creation_method === "template" ? `${data.page_count || 1} halaman` : "PDF"}</span>
                                </div>
                                {data.creation_method === "scan" ? (
                                    pdfPreviewUrl ? <iframe title="Preview PDF" src={pdfPreviewUrl} className="h-[720px] w-full bg-gray-100" /> : <div className="flex h-[720px] items-center justify-center bg-gray-50 px-5 text-center text-sm text-gray-500">Pilih file PDF untuk melihat preview.</div>
                                ) : (
                                    <NotaDinasPreview html={data.body_rendered} metadata={metadata} onPageCountChange={(count) => data.page_count !== count && setData("page_count", count)} className="h-[720px]" />
                                )}
                            </div>
                        </div>
                    </div>
                </form>
            </LayoutAdmin>
        </>
    );
}

function Card({ children, className = "" }) {
    return <div className={`min-w-0 rounded-lg border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

function MethodButton({ active, title, description, onClick }) {
    return <button type="button" onClick={onClick} className={`min-w-0 rounded-lg border px-4 py-3 text-left ${active ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}><div className="font-semibold">{title}</div><div className="mt-1 text-xs text-gray-500">{description}</div></button>;
}

function TargetPicker({ title, draft, setDraft, targets, field, targetOptions, onAdd, onRemove, error }) {
    const options = optionsByType(draft.target_type, targetOptions);
    return (
        <Card className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950">{title}</div>
                    <div className="mt-1 text-xs text-gray-500">Pilih user, unit, atau assignment jabatan organisasi.</div>
                </div>
                {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
            </div>
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_120px]">
                <select value={draft.target_type} onChange={(event) => setDraft({ target_type: event.target.value, target_id: "" })} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600">
                    <option value="user">User</option>
                    <option value="directorate">Direktur Direktorat</option>
                    <option value="division">Semua Divisi</option>
                    <option value="division_gm">GM Divisi</option>
                    <option value="department">Semua Department</option>
                    <option value="department_manager">Manager Department</option>
                </select>
                <select value={draft.target_id} onChange={(event) => setDraft({ ...draft, target_id: event.target.value })} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600">
                    <option value="">Pilih target</option>
                    {options.map((option) => <option key={`${draft.target_type}-${option.id}`} value={option.id}>{option.label}</option>)}
                </select>
                <button type="button" onClick={onAdd} className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"><Plus className="mr-2 h-4 w-4" />Tambah</button>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
                {targets.length ? targets.map((target, index) => (
                    <span key={`${target.target_type}-${target.target_id}`} className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700">
                        <span className="min-w-0 break-words">{targetLabel(target, targetOptions)}</span>
                        <button type="button" onClick={() => onRemove(field, index)} className="shrink-0 text-gray-400 hover:text-red-600" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                )) : <span className="text-xs text-gray-500">Belum ada target.</span>}
            </div>
        </Card>
    );
}

function Field({ label, value, onChange, error, placeholder }) {
    return <label className="block min-w-0"><span className="text-sm font-semibold text-gray-900">{label}</span><input value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-600 ${error ? "border-red-500" : "border-gray-300"}`} />{error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}</label>;
}

function Textarea({ label, value, onChange, error, rows = 4, placeholder }) {
    return <label className="block min-w-0"><span className="text-sm font-semibold text-gray-900">{label}</span><textarea rows={rows} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full min-w-0 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-emerald-600 ${error ? "border-red-500" : "border-gray-300"}`} />{error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}</label>;
}

function Select({ label, value, options, onChange, error, noPlaceholder = false }) {
    return <label className="block min-w-0"><span className="text-sm font-semibold text-gray-900">{label}</span><select value={value || ""} onChange={(e) => onChange(e.target.value)} className={`mt-2 w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 ${error ? "border-red-500" : "border-gray-300"}`}>{noPlaceholder ? null : <option value="">Pilih</option>}{(options || []).map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>{error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}</label>;
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

function targetLabels(targets, options) {
    return (targets || []).map((target) => targetLabel(target, options));
}

function internalOriginOptions(user) {
    return [
        user?.directorate ? { type: "directorate", rawId: user.directorate.id, id: `directorate:${user.directorate.id}`, name: `Direktur ${cleanUnitName(user.directorate.name, "Direktorat")}` } : null,
        user?.division ? { type: "division", rawId: user.division.id, id: `division:${user.division.id}`, name: `General Manager ${cleanUnitName(user.division.name, "Divisi")}` } : null,
        user?.department ? { type: "department", rawId: user.department.id, id: `department:${user.department.id}`, name: `Manager ${cleanUnitName(user.department.name, "Department")}` } : null,
    ].filter(Boolean);
}

function cleanUnitName(name, prefix) {
    return String(name || "").replace(new RegExp(`^${prefix}\\s+`, "i"), "").trim();
}
