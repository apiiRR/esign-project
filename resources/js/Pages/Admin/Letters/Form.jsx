import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import FormErrorSummary from "@/Shared/FormErrorSummary";
import PdfSignaturePlacement from "@/Components/PdfSignaturePlacement";
import { Archive, Plus, Send, Trash2, Upload } from "lucide-react";

export default function LetterForm() {
    const pageProps = usePage().props;
    const {
        type,
        letterTypes = [],
        targetOptions = {},
        auth,
        isArchive = false,
        errors: serverErrors = {},
    } = pageProps;
    const isIncomingExternal = type === "incoming_external" && !isArchive;
    const isInternal = type === "internal";
    const isOutgoing = type === "outgoing";
    const supportsDraftSend = isInternal || isOutgoing;
    const originOptions = internalOriginOptions(auth?.user);
    const defaultOrigin = originOptions[0] || { type: "", id: "", name: "" };
    const [recipientDraft, setRecipientDraft] = useState({ target_type: "department", target_id: "" });
    const [ccDraft, setCcDraft] = useState({ target_type: "department", target_id: "" });
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [clientErrors, setClientErrors] = useState([]);
    const [signaturePlacementActive, setSignaturePlacementActive] = useState(false);

    const { data, setData, errors } = useForm({
        type,
        is_archive: isArchive,
        submit_action: "send",
        letter_type_id: "",
        letter_number: "",
        subject: "",
        scan_file: null,
        targets: [],
        cc_targets: [],
        signature_requests: [],
        payload: {
            origin_name: "",
            internal_origin_type: defaultOrigin.type,
            internal_origin_id: defaultOrigin.rawId,
            internal_origin_name: defaultOrigin.name,
            external_recipient: "",
            notes: "",
        },
    });
    const formErrors = { ...serverErrors, ...errors };

    useEffect(() => () => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    }, [pdfPreviewUrl]);

    function updatePayload(key, value) {
        setData("payload", { ...data.payload, [key]: value });
    }

    function handleFile(file) {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        setClientErrors([]);

        if (!file) {
            setData("scan_file", null);
            setPdfPreviewUrl("");
            return;
        }

        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            const message = "File Scan harus berupa PDF.";
            setData("scan_file", null);
            setPdfPreviewUrl("");
            setClientErrors([message]);
            window.alert(message);
            return;
        }

        setData("scan_file", file);
        setPdfPreviewUrl(URL.createObjectURL(file));
    }

    function normalizeSignatureRequests(requests) {
        const grouped = [
            ...requests.filter((request) => request.approval_type === "paraf"),
            ...requests.filter((request) => (request.approval_type || "signature") === "signature"),
        ];
        let signatureNumber = 0;

        return grouped.map((request, index) => {
            const isSignatureRequest = (request.approval_type || "signature") === "signature";
            if (isSignatureRequest) signatureNumber += 1;

            return {
                ...request,
                approval_type: request.approval_type || "signature",
                signing_order: index + 1,
                signature_number: isSignatureRequest ? signatureNumber : null,
            };
        });
    }

    function addParafRequest() {
        if (!isInternal) return;
        const signer = (targetOptions.users || [])[0];

        setData("signature_requests", normalizeSignatureRequests([
            ...data.signature_requests,
            {
                local_id: `${Date.now()}-${data.signature_requests.length}`,
                approval_type: "paraf",
                signer_user_id: signer?.id || "",
                signing_order: data.signature_requests.length + 1,
            },
        ]));
    }

    function addSignatureRequest(placement) {
        if (!isInternal || !pdfPreviewUrl || !signaturePlacementActive) return;
        const signer = (targetOptions.users || [])[0];

        setData("signature_requests", normalizeSignatureRequests([
            ...data.signature_requests,
            {
                local_id: `${Date.now()}-${data.signature_requests.length}`,
                approval_type: "signature",
                signer_user_id: signer?.id || "",
                signing_order: data.signature_requests.length + 1,
                page_number: placement.page_number,
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height,
            },
        ]));
        setSignaturePlacementActive(false);
    }

    function updateSignatureRequest(localId, values) {
        setData("signature_requests", data.signature_requests.map((request) => (
            request.local_id === localId ? { ...request, ...values } : request
        )));
    }

    function removeSignatureRequest(localId) {
        setData("signature_requests", normalizeSignatureRequests(data.signature_requests.filter((request) => request.local_id !== localId)));
    }

    function moveSignatureRequest(localId, nextOrder) {
        const currentIndex = data.signature_requests.findIndex((request) => request.local_id === localId);
        if (currentIndex < 0) return;

        const reordered = [...data.signature_requests];
        const [item] = reordered.splice(currentIndex, 1);
        reordered.splice(Math.max(0, Number(nextOrder) - 1), 0, item);
        setData("signature_requests", normalizeSignatureRequests(reordered));
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
        setClientErrors([]);
        if (isInternal) {
            const invalidSignature = data.signature_requests.find((request) => !request.signer_user_id);
            if (invalidSignature) {
                const message = "Pilih user untuk semua paraf dan tanda tangan.";
                setClientErrors([message]);
                window.alert(message);
                return;
            }
        }
        setSubmitting(true);
        router.post("/admin/surat", { ...data, submit_action: action }, {
            forceFormData: true,
            preserveScroll: true,
            onError: (validationErrors) => {
                const messages = Object.values(validationErrors || {}).flat().filter(Boolean);
                const message = messages[0] || "Form gagal disimpan. Periksa kembali input yang wajib diisi.";
                window.alert(message);
            },
            onFinish: () => setSubmitting(false),
        });
    }

    const title = isArchive ? "Upload Arsip Surat" : isIncomingExternal ? "Buat Surat Masuk Eksternal" : isOutgoing ? "Buat Surat Keluar" : "Buat Surat Internal";
    const description = isArchive
        ? "Upload scan surat untuk disimpan sebagai arsip sistem."
        : isIncomingExternal
          ? "Input metadata surat dari pihak luar dan upload scan PDF."
          : "Input metadata surat dan upload scan PDF.";
    const backUrl = isArchive ? "/admin/surat/arsip" : isIncomingExternal ? "/admin/surat/masuk-eksternal" : isOutgoing ? "/admin/surat/keluar" : "/admin/surat/internal";

    return (
        <>
            <Head title={`${title} - Admin`} />
            <LayoutAdmin>
                <form onSubmit={(event) => submit(event, "send")} className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
                        <p className="mt-2 text-sm text-gray-600">{description}</p>
                    </div>

                    <FormErrorSummary errors={formErrors} extraErrors={clientErrors} />

                    <div className="grid gap-6 xl:grid-cols-12">
                        <div className="min-w-0 space-y-5 xl:col-span-6">
                            <Card className="space-y-4">
                                <Select label="Jenis Surat" value={data.letter_type_id} onChange={(value) => setData("letter_type_id", value)} options={letterTypes.map((letterType) => ({ id: letterType.id, name: letterType.name }))} error={formErrors.letter_type_id} />
                                <Field label="Nomor Surat" value={data.letter_number} onChange={(value) => setData("letter_number", value)} error={formErrors.letter_number} placeholder={isIncomingExternal ? "Masukkan nomor surat dari dokumen eksternal" : "Opsional"} />
                                <Field label="Perihal" value={data.subject} onChange={(value) => setData("subject", value)} error={formErrors.subject} placeholder="Perihal surat" />
                                {isInternal || isOutgoing ? <Select label="Asal Surat" value={`${data.payload.internal_origin_type}:${data.payload.internal_origin_id}`} onChange={(value) => {
                                    const selected = originOptions.find((option) => option.id === value);
                                    if (!selected) return;
                                    setData("payload", { ...data.payload, internal_origin_type: selected.type, internal_origin_id: selected.rawId, internal_origin_name: selected.name });
                                }} options={originOptions} error={formErrors["payload.internal_origin_type"] || formErrors["payload.internal_origin_id"]} noPlaceholder /> : null}
                                {isOutgoing ? <Field label="Tujuan Eksternal" value={data.payload.external_recipient} onChange={(value) => updatePayload("external_recipient", value)} error={formErrors["payload.external_recipient"]} placeholder="Nama perusahaan/instansi penerima" /> : null}
                                {isIncomingExternal ? <Field label="Asal Surat" value={data.payload.origin_name} onChange={(value) => updatePayload("origin_name", value)} error={formErrors["payload.origin_name"]} placeholder="Nama instansi/perusahaan pengirim" /> : null}
                                {isIncomingExternal || isArchive ? <Textarea label="Catatan" value={data.payload.notes} onChange={(value) => updatePayload("notes", value)} rows={4} error={formErrors["payload.notes"]} placeholder="Catatan tambahan" /> : null}
                            </Card>

                            {isInternal || isOutgoing ? (
                                <>
                                    {isInternal ? <TargetPicker title="Tujuan" draft={recipientDraft} setDraft={setRecipientDraft} targets={data.targets} field="targets" targetOptions={targetOptions} onAdd={() => addTarget("recipient")} onRemove={removeTarget} error={formErrors.targets} /> : null}
                                    <TargetPicker title="Tembusan" draft={ccDraft} setDraft={setCcDraft} targets={data.cc_targets} field="cc_targets" targetOptions={targetOptions} onAdd={() => addTarget("cc")} onRemove={removeTarget} />
                                </>
                            ) : null}

                            <Card>
                                <label className="block text-sm font-semibold text-gray-900">File Scan PDF</label>
                                <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                                    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                                        <Upload className="h-5 w-5 shrink-0 text-gray-500" />
                                        <div className="min-w-0 flex-1">
                                            <input type="file" accept="application/pdf,.pdf" onChange={(event) => handleFile(event.target.files?.[0] || null)} className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white" />
                                            <div className="mt-2 text-xs text-gray-500">Hanya file PDF. Aplikasi tidak membatasi ukuran file.</div>
                                        </div>
                                    </div>
                                </div>
                                {formErrors.scan_file ? <p className="mt-2 text-xs text-red-600">{formErrors.scan_file}</p> : null}
                            </Card>

                            {isInternal ? (
                                <SignatureRequestPanel
                                    requests={data.signature_requests}
                                    signerOptions={targetOptions.users || []}
                                    onAddParaf={addParafRequest}
                                    onUpdate={updateSignatureRequest}
                                    onRemove={removeSignatureRequest}
                                    onMove={moveSignatureRequest}
                                    placementActive={signaturePlacementActive}
                                    setPlacementActive={setSignaturePlacementActive}
                                    pdfReady={Boolean(pdfPreviewUrl)}
                                    errors={formErrors}
                                />
                            ) : null}

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
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">PDF</span>
                                </div>
                                {isInternal ? (
                                    <PdfSignaturePlacement
                                        fileUrl={pdfPreviewUrl}
                                        requests={data.signature_requests}
                                        placementActive={signaturePlacementActive}
                                        onAdd={addSignatureRequest}
                                        onUpdate={updateSignatureRequest}
                                        onPlacementComplete={() => setSignaturePlacementActive(false)}
                                    />
                                ) : pdfPreviewUrl ? (
                                    <iframe title="Preview PDF" src={pdfPreviewUrl} className="h-[520px] md:h-[720px] w-full bg-gray-100" />
                                ) : (
                                    <div className="flex h-[520px] md:h-[720px] items-center justify-center bg-gray-50 px-5 text-center text-sm text-gray-500">Pilih file PDF untuk melihat preview.</div>
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

function TargetPicker({ title, draft, setDraft, targets, field, targetOptions, onAdd, onRemove, error }) {
    const options = optionsByType(draft.target_type, targetOptions);
    return (
        <Card className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950">{title}</div>
                    <div className="mt-1 text-xs text-gray-500">Pilih unit atau assignment jabatan organisasi.</div>
                </div>
                {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
            </div>
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_120px]">
                <select value={draft.target_type} onChange={(event) => setDraft({ target_type: event.target.value, target_id: "" })} className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600">
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

function SignatureRequestPanel({ requests, signerOptions, onAddParaf, onUpdate, onRemove, onMove, placementActive, setPlacementActive, pdfReady, errors }) {
    return (
        <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-950">Paraf dan Tanda Tangan</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Paraf diproses lebih dulu tanpa QR. Tanda tangan QR ditempatkan di PDF setelah semua paraf selesai.
                    </p>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={onAddParaf}
                    className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah paraf
                </button>
                <button
                    type="button"
                    disabled={!pdfReady}
                    onClick={() => setPlacementActive(!placementActive)}
                    className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                        placementActive
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                    }`}
                >
                    {placementActive ? "Batal tambah titik TTD" : "Tambah tanda tangan QR"}
                </button>
            </div>
            {!pdfReady ? (
                <div className="mt-2 text-xs text-gray-500">Upload PDF dulu untuk mengaktifkan penempatan tanda tangan QR.</div>
            ) : placementActive ? (
                <div className="mt-2 text-xs text-amber-700">Mode tambah TTD aktif. Klik satu posisi di preview PDF. Setelah titik dibuat, mode akan mati agar PDF bisa discroll lagi.</div>
            ) : (
                <div className="mt-2 text-xs text-gray-500">PDF bisa discroll normal. Paraf tidak membutuhkan posisi PDF.</div>
            )}

            {errors.signature_requests ? <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errors.signature_requests}</div> : null}

            <div className="mt-4 space-y-3">
                {requests.length ? requests.map((request, index) => (
                    <div key={request.local_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[110px_90px_1fr_110px_auto] md:items-end">
                            <div className="text-xs font-semibold text-gray-600">
                                Jenis
                                <div className={`mt-1 rounded-lg border px-3 py-2 text-sm font-medium ${request.approval_type === "paraf" ? "border-blue-100 bg-blue-50 text-blue-700" : "border-emerald-100 bg-emerald-50 text-emerald-700"}`}>
                                    {request.approval_type === "paraf" ? "Paraf" : "Tanda Tangan"}
                                </div>
                            </div>
                            <label className="text-xs font-semibold text-gray-600">
                                Urutan
                                <select value={request.signing_order} onChange={(event) => onMove(request.local_id, event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                                    {requests.map((_, orderIndex) => <option key={orderIndex + 1} value={orderIndex + 1}>{orderIndex + 1}</option>)}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-gray-600">
                                User Approval
                                <select value={request.signer_user_id || ""} onChange={(event) => onUpdate(request.local_id, { signer_user_id: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm">
                                    <option value="">Pilih user</option>
                                    {signerOptions.map((user) => <option key={user.id} value={user.id}>{user.name}{user.position ? ` - ${user.position}` : ""}</option>)}
                                </select>
                            </label>
                            <div className="text-xs font-semibold text-gray-600">
                                Halaman
                                <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800">
                                    {request.approval_type === "paraf" ? "-" : request.page_number}
                                </div>
                            </div>
                            <button type="button" onClick={() => onRemove(request.local_id)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Hapus</button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            {request.approval_type === "paraf"
                                ? "Paraf hanya approval sistem dan tidak ditempel ke PDF."
                                : `Posisi: ${(request.x * 100).toFixed(1)}%, ${(request.y * 100).toFixed(1)}% · Ukuran: ${(request.width * 100).toFixed(1)}% x ${(request.height * 100).toFixed(1)}%`}
                        </div>
                        {errors[`signature_requests.${index}.signer_user_id`] ? <div className="mt-2 text-xs text-red-600">{errors[`signature_requests.${index}.signer_user_id`]}</div> : null}
                    </div>
                )) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        Belum ada paraf atau tanda tangan. Tambahkan paraf, atau upload PDF lalu klik area preview untuk menambah tanda tangan QR.
                    </div>
                )}
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
