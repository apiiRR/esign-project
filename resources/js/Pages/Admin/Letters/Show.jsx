import { Head, router, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import PdfDocumentViewer from "@/Components/PdfDocumentViewer";
import DocumentDownloadButton from "@/Components/DocumentDownloadButton";
import { Trash2 } from "lucide-react";

function formatInputDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(new Date(value));
}

function formatInputTime(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function approvalTypeLabel(request) {
    return "Tanda Tangan";
}

function visualTypeLabel(value) {
    return {
        qr: "QR Code Sistem",
        saved_signature: "Spesimen Tersimpan",
        uploaded_signature: "Upload Gambar",
    }[value] || "QR Code Sistem";
}

function locationLabel(request) {
    const parts = [request.signed_city, request.signed_region, request.signed_country].filter(Boolean);
    const coordinates = request.signed_latitude && request.signed_longitude
        ? `${request.signed_latitude}, ${request.signed_longitude}`
        : null;

    if (parts.length && coordinates) {
        return `${parts.join(", ")} (${coordinates})`;
    }

    return parts.join(", ") || coordinates || "-";
}

export default function LetterShow() {
    const { letter, hasPreview = false, previewUrl, downloadOtpRequired = true } = usePage().props;
    const isInternal = letter.type === "internal";
    const downloadFileName = `${letter.letter_number || "dokumen"}.pdf`;

    return (
        <>
            <Head title={`${letter.subject} - Admin`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div className="grid gap-6 xl:grid-cols-12">
                        <div className="space-y-6 xl:col-span-8">
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="break-words text-xl font-bold text-gray-950 sm:text-2xl">{letter.subject}</h1>
                                {letter.status === "draft" ? <DraftBadge /> : null}
                            </div>
                            <p className="mt-2 text-sm text-gray-500">{letter.letter_number || "-"} · Dokumen</p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    const confirmed = confirm("Dokumen, approval, OTP, dan file PDF/QR di storage akan dihapus permanen. Aksi ini akan tercatat di audit trail. Lanjutkan?");

                                    if (confirmed) {
                                        router.delete(`/admin/surat/${letter.id}`);
                                    }
                                }}
                                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 sm:w-auto"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus Dokumen
                            </button>
                        </div>
                        {hasPreview ? (
                            <>
                                <Panel title="Preview Surat">
                                    <PdfDocumentViewer fileUrl={previewUrl || `/admin/surat/${letter.id}/preview`} className="h-[520px] md:h-[680px]" />
                                </Panel>
                                <div className="flex justify-end">
                                    <DocumentDownloadButton
                                        otpUrl={`/admin/surat/${letter.id}/download-otp`}
                                        downloadUrl={`/admin/surat/${letter.id}/download`}
                                        otpRequired={downloadOtpRequired}
                                        fileName={downloadFileName}
                                        className="w-full justify-center sm:w-auto"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="text-sm text-gray-500">Preview tidak tersedia.</div>
                            </div>
                        )}
                        </div>
                        <div className="space-y-6 xl:col-span-4">
                        <Panel title="Informasi Dokumen" rows={[
                            ["Nomor Surat", letter.letter_number || "-"],
                            ["Diinput oleh", letter.creator?.name || "-"],
                            ["Tanggal input", formatInputDate(letter.created_at)],
                            ["Jam input", formatInputTime(letter.created_at)],
                            ...(letter.payload?.notes ? [["Catatan", letter.payload.notes]] : []),
                        ]} />
                        {isInternal ? <ApprovalPanel requests={letter.signature_requests || []} /> : null}
                        </div>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}

function Panel({ title, rows = [], children }) {
    return (
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-semibold text-gray-950">{title}</h2>
            <div className="mt-4 space-y-2">
                {children || (rows.length ? rows.map((row, i) => (
                    <div key={i} className="min-w-0 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 break-words">
                        {row.join(" · ")}
                    </div>
                )) : <div className="text-sm text-gray-500">Tidak ada data.</div>)}
            </div>
        </div>
    );
}

function ApprovalPanel({ requests = [] }) {
    return (
        <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="font-semibold text-gray-950">Approval Dokumen</h2>
            <div className="mt-4 space-y-3">
                {requests.length ? requests.map((request) => (
                    <div key={request.id || `${request.signer_user_id}-${request.signing_order}`} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <div className="text-sm font-semibold text-gray-950">
                                    {approvalTypeLabel(request)} {request.signing_order || "-"}
                                </div>
                                <div className="mt-0.5 text-sm text-gray-600">{request.signer?.name || "-"}</div>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
                                Halaman {request.page_number || "-"}
                            </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                            <ApprovalField label="Posisi" value={`${(Number(request.x || 0) * 100).toFixed(1)}%, ${(Number(request.y || 0) * 100).toFixed(1)}%`} />
                            <ApprovalField label="Visual" value={visualTypeLabel(request.signature_visual_type)} />
                            <ApprovalField label="Waktu tanda tangan" value={request.signed_at ? formatDate(request.signed_at) : "-"} />
                            <ApprovalField label="IP address" value={request.signed_ip_address || "-"} />
                            <ApprovalField label="Device" value={request.signed_device || "-"} />
                            <ApprovalField label="Lokasi" value={locationLabel(request)} />
                            <ApprovalField label="Sumber lokasi" value={request.signed_location_source || "-"} />
                        </dl>
                    </div>
                )) : <div className="text-sm text-gray-500">Tidak ada data.</div>}
            </div>
        </div>
    );
}

function ApprovalField({ label, value }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
            <dd className="mt-1 break-words text-gray-700">{value || "-"}</dd>
        </div>
    );
}

function DraftBadge() {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draft</span>;
}
