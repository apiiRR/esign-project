import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import LayoutPegawai from "@/Layouts/LayoutPegawai";
import Search from "@/Shared/Search";
import FormErrorSummary from "@/Shared/FormErrorSummary";
import PdfSignaturePlacement from "@/Components/PdfSignaturePlacement";
import {
    Archive,
    Bell,
    CheckCheck,
    Clock,
    Download,
    Eye,
    FilePlus2,
    Inbox,
    Mail,
    Paperclip,
    Plus,
    Send,
    Trash2,
    Upload,
} from "lucide-react";

const MAX_PDF_SIZE = 10 * 1024 * 1024;

function Header({ title, description, actionHref, actionText }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-950">{title}</h1>
                <p className="mt-2 text-sm text-gray-600">{description}</p>
            </div>
            {actionHref ? (
                <Link
                    href={actionHref}
                    className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    {actionText}
                </Link>
            ) : null}
        </div>
    );
}

function Pill({ children, tone = "gray" }) {
    const tones = {
        gray: "bg-gray-100 text-gray-700",
        red: "bg-red-50 text-red-700",
        green: "bg-emerald-50 text-emerald-700",
        blue: "bg-blue-50 text-blue-700",
        amber: "bg-amber-50 text-amber-700",
    };

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
        >
            {children}
        </span>
    );
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

function collection(value) {
    return Array.isArray(value?.data)
        ? value.data
        : Array.isArray(value)
          ? value
          : [];
}

function letterDisplayNumber(letter) {
    if (!letter) return "-";
    if (letter.type === "incoming_external") return letter.letter_number || "-";
    return letter.letter_number || letter.reference || "-";
}

function letterTypeMeta(letterOrType) {
    const type =
        typeof letterOrType === "string"
            ? letterOrType
            : letterOrType?.meta?.mode === "archive"
              ? "archive"
              : letterOrType?.type;
    const types = {
        incoming_external: { label: "Surat Masuk Eksternal", tone: "amber" },
        internal: { label: "Surat Internal", tone: "blue" },
        outgoing: { label: "Surat Keluar", tone: "green" },
        archive: { label: "Arsip", tone: "gray" },
    };

    return types[type] || { label: "Surat", tone: "gray" };
}

function signatureStatusMeta(status) {
    const statuses = {
        ready: { label: "Siap ditandatangani", tone: "amber" },
        pending: { label: "Menunggu giliran", tone: "gray" },
        in_progress: { label: "Proses tanda tangan", tone: "amber" },
        signed: { label: "Disetujui", tone: "green" },
        rejected: { label: "Ditolak", tone: "red" },
    };

    return statuses[status] || { label: status || "-", tone: "gray" };
}

function signatureActionLabel(status) {
    return {
        ready: "Tanda tangani",
        pending: "Lihat status",
        signed: "Lihat dokumen",
        rejected: "Lihat catatan",
    }[status] || "Lihat";
}

function businessLetterType(letter) {
    return letter?.meta?.mode === "archive" ? "archive" : letter?.type;
}

function Dashboard() {
    const { stats = {}, letters = [] } = usePage().props;
    const cards = [
        {
            label: "Inbox Internal",
            value: stats.internal_unread || 0,
            icon: Mail,
            href: "/pegawai/inbox/internal",
            tone: "red",
        },
        {
            label: "Inbox Tebusan",
            value: stats.cc_unread || 0,
            icon: Send,
            href: "/pegawai/inbox/tebusan",
            tone: "blue",
        },
        {
            label: "Disposisi Belum Dibaca",
            value: stats.unread_dispositions || 0,
            icon: Inbox,
            href: "/pegawai/disposisi",
            tone: "amber",
        },
        {
            label: "Arsip Saya",
            value: stats.archive_total || 0,
            icon: Archive,
            href: "/pegawai/arsip",
            tone: "green",
        },
    ];

    return (
        <>
            <Header
                title="Dashboard Pegawai"
                description="Ringkasan surat internal, tebusan, disposisi, dan arsip pribadi dari database aplikasi."
            />
            <div className="grid gap-4 md:grid-cols-4">
                {cards.map(({ label, value, icon: Icon, href, tone }) => (
                    <Link
                        key={label}
                        href={href}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300"
                    >
                        <div className="flex items-center justify-between">
                            <Icon className="h-5 w-5 text-emerald-700" />
                            <Pill tone={tone}>{value}</Pill>
                        </div>
                        <div className="mt-4 text-sm font-semibold text-gray-950">
                            {label}
                        </div>
                    </Link>
                ))}
            </div>
            <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-950">
                        Surat Terbaru
                    </h2>
                    <Link
                        href="/pegawai/inbox/internal"
                        className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                        Lihat inbox
                    </Link>
                </div>
                <LetterList
                    letters={letters}
                    emptyText="Belum ada surat internal yang dapat ditampilkan."
                />
            </div>
        </>
    );
}

function LetterList({ letters, emptyText = "Tidak ada data surat." }) {
    const rows = collection(letters);

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="hidden grid-cols-12 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-600 md:grid">
                <div className="col-span-6">Surat</div>
                <div className="col-span-2">Pengirim</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Aksi</div>
            </div>
            <div className="divide-y divide-gray-100">
                {rows.length ? (
                    rows.map((letter) => {
                        const unread = !letter.read_receipts?.length;
                        return (
                            <div
                                key={letter.id}
                                className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center"
                            >
                                <div className="min-w-0 md:col-span-6">
                                    <div className="flex items-center gap-2">
                                        {unread ? (
                                            <span className="h-2 w-2 rounded-full bg-red-600" />
                                        ) : (
                                            <CheckCheck className="h-4 w-4 text-emerald-600" />
                                        )}
                                        <Link
                                            href={`/pegawai/surat/${letter.id}`}
                                            className="truncate font-semibold text-gray-950 hover:text-emerald-700"
                                        >
                                            {letter.subject || letter.title}
                                        </Link>
                                        <Pill tone={letterTypeMeta(letter).tone}>
                                            {letterTypeMeta(letter).label}
                                        </Pill>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {letterDisplayNumber(letter)} ·{" "}
                                        {formatDate(letter.created_at)} ·{" "}
                                        {letter.page_count || 1} halaman
                                    </div>
                                </div>
                                <div className="text-gray-700 md:col-span-2">
                                    {letter.creator?.name || "-"}
                                </div>
                                <div className="md:col-span-2">
                                    <Pill tone={unread ? "red" : "green"}>
                                        {unread ? "Belum dibaca" : "Dibaca"}
                                    </Pill>
                                </div>
                                <div className="md:col-span-2 md:text-right">
                                    <Link
                                        href={`/pegawai/surat/${letter.id}`}
                                        className="inline-flex rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-emerald-700"
                                        title="Lihat detail"
                                    >
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <EmptyState message={emptyText} />
                )}
            </div>
            <Pagination meta={letters} />
        </div>
    );
}

function DispositionList({ dispositions }) {
    const rows = collection(dispositions);

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="divide-y divide-gray-100">
                {rows.length ? (
                    rows.map((disposition) => (
                        <div
                            key={disposition.id}
                            className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center"
                        >
                            <div className="min-w-0 md:col-span-6">
                                <Link
                                    href={`/pegawai/surat/${disposition.letter_id}`}
                                    className="font-semibold text-gray-950 hover:text-emerald-700"
                                >
                                    {disposition.letter?.subject ||
                                        disposition.letter?.title ||
                                        "Surat"}
                                </Link>
                                <div className="mt-1 text-xs text-gray-500">
                                    {letterDisplayNumber(disposition.letter)} ·{" "}
                                    {formatDate(disposition.created_at)}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                {disposition.from_user?.name || "-"}
                            </div>
                            <div className="md:col-span-2">
                                <Pill tone={disposition.read_at ? "green" : "gray"}>
                                    {disposition.read_at ? "Dibaca" : "Belum dibaca"}
                                </Pill>
                            </div>
                            <div className="md:col-span-2 text-gray-600">
                                {disposition.note || "-"}
                            </div>
                        </div>
                    ))
                ) : (
                    <EmptyState message="Tidak ada disposisi masuk." />
                )}
            </div>
            <Pagination meta={dispositions} />
        </div>
    );
}

function ApprovalPage() {
    const { approvalRequests } = usePage().props;
    const rows = collection(approvalRequests);

    return (
        <>
            <Header
                title="Approval"
                description="Permintaan tanda tangan QR yang ditujukan kepada Anda."
            />
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="hidden grid-cols-12 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-600 md:grid">
                    <div className="col-span-5">Surat</div>
                    <div className="col-span-2">Pembuat</div>
                    <div className="col-span-2">Urutan</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-1 text-right">Aksi</div>
                </div>
                <div className="divide-y divide-gray-100">
                    {rows.length ? (
                        rows.map((request) => {
                            const status = signatureStatusMeta(request.status);
                            return (
                                <div key={request.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
                                    <div className="min-w-0 md:col-span-5">
                                        <Link href={`/pegawai/approval/${request.id}`} className="font-semibold text-gray-950 hover:text-emerald-700">
                                            {request.letter?.subject || request.letter?.title || "Surat"}
                                        </Link>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {letterDisplayNumber(request.letter)} · {formatDate(request.created_at)}
                                        </div>
                                    </div>
                                    <div className="text-gray-700 md:col-span-2">
                                        {request.letter?.creator?.name || "-"}
                                    </div>
                                    <div className="text-gray-700 md:col-span-2">
                                        TTD {request.signing_order}
                                    </div>
                                    <div className="md:col-span-2">
                                        <Pill tone={status.tone}>{status.label}</Pill>
                                    </div>
                                    <div className="md:col-span-1 md:text-right">
                                        <Link href={`/pegawai/approval/${request.id}`} className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-emerald-700" title={signatureActionLabel(request.status)}>
                                            <Eye className="mr-1.5 h-4 w-4" />
                                            {signatureActionLabel(request.status)}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <EmptyState message="Tidak ada permintaan approval tanda tangan QR." />
                    )}
                </div>
                <Pagination meta={approvalRequests} />
            </div>
        </>
    );
}

function ApprovalDetailPage() {
    const { signatureRequest, letter, hasReadLetter, previewUrl } = usePage().props;
    const readForm = useForm({});
    const approveForm = useForm({ note: "" });
    const rejectForm = useForm({ note: "" });

    if (!signatureRequest || !letter) {
        return <EmptyState message="Permintaan approval tidak ditemukan." />;
    }

    const status = signatureStatusMeta(signatureRequest.status);
    const canAct = signatureRequest.status === "ready" && hasReadLetter;

    const approve = () => {
        if (!canAct || approveForm.processing) return;
        approveForm.post(`/pegawai/approval/${signatureRequest.id}/approve`, { preserveScroll: true });
    };

    const reject = () => {
        if (!canAct || rejectForm.processing || !rejectForm.data.note.trim()) return;
        rejectForm.post(`/pegawai/approval/${signatureRequest.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => rejectForm.reset("note"),
        });
    };

    const markRead = () => {
        if (hasReadLetter || readForm.processing) return;
        readForm.post(`/pegawai/approval/${signatureRequest.id}/read`, { preserveScroll: true });
    };

    return (
        <>
            <Header
                title="Detail Approval"
                description={`${letterDisplayNumber(letter)} · TTD ${signatureRequest.signing_order}`}
            />
            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-5 xl:col-span-7">
                    <Panel title="Preview Surat">
                        {previewUrl ? (
                            <iframe
                                title="Preview PDF approval"
                                src={previewUrl}
                                className="h-[620px] w-full rounded-lg border border-gray-200 bg-gray-100"
                            />
                        ) : (
                            <div className="text-sm text-gray-500">Preview PDF tidak tersedia.</div>
                        )}
                    </Panel>
                </div>
                <div className="space-y-5 xl:col-span-5">
                    <Panel title="Informasi Approval">
                        <div className="mb-4">
                            <Pill tone={status.tone}>{status.label}</Pill>
                        </div>
                        <InfoGrid
                            rows={[
                                ["Nomor Surat", letterDisplayNumber(letter)],
                                ["Perihal", letter.subject || letter.title || "-"],
                                ["Pembuat", letter.creator?.name || "-"],
                                ["Signer", signatureRequest.signer?.name || "-"],
                                ["Urutan", `TTD ${signatureRequest.signing_order}`],
                                ["Halaman", signatureRequest.page_number],
                                ["Tanggal request", formatDate(signatureRequest.created_at)],
                                ...(signatureRequest.signed_at ? [["Disetujui", formatDate(signatureRequest.signed_at)]] : []),
                                ...(signatureRequest.rejected_at ? [["Ditolak", formatDate(signatureRequest.rejected_at)]] : []),
                                ...(signatureRequest.note ? [["Catatan", signatureRequest.note]] : []),
                            ]}
                        />
                        <button
                            type="button"
                            onClick={markRead}
                            disabled={hasReadLetter || readForm.processing}
                            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {hasReadLetter ? "Dokumen Sudah Dibaca" : "Sudah Baca Dokumen"}
                        </button>
                        {!hasReadLetter && signatureRequest.status === "ready" ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Baca dokumen dari preview PDF, lalu klik tombol Sudah Baca Dokumen sebelum approve atau reject.
                            </div>
                        ) : null}
                    </Panel>

                    {signatureRequest.status === "signed" ? (
                        <Panel title="Sudah Ditandatangani">
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                Tanda tangan QR sudah disetujui dan ditempel ke PDF signed.
                            </div>
                            <InfoGrid
                                rows={[
                                    ["Tanggal tanda tangan", formatDate(signatureRequest.signed_at)],
                                    ...(signatureRequest.note ? [["Catatan persetujuan", signatureRequest.note]] : []),
                                    ["Status verifikasi", signatureRequest.verification_token ? "QR verifikasi tersedia" : "QR verifikasi belum tersedia"],
                                ]}
                            />
                        </Panel>
                    ) : null}

                    {signatureRequest.status === "pending" ? (
                        <Panel title="Menunggu Giliran">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                Request ini belum bisa ditandatangani karena masih menunggu signer sebelumnya menyetujui.
                            </div>
                        </Panel>
                    ) : null}

                    {signatureRequest.status === "rejected" ? (
                        <Panel title="Ditolak">
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                Permintaan tanda tangan ini sudah ditolak.
                            </div>
                            <InfoGrid
                                rows={[
                                    ["Tanggal penolakan", formatDate(signatureRequest.rejected_at)],
                                    ...(signatureRequest.note ? [["Catatan penolakan", signatureRequest.note]] : []),
                                ]}
                            />
                        </Panel>
                    ) : null}

                    {signatureRequest.status === "ready" ? <Panel title="Keputusan">
                        {approveForm.errors.signature || rejectForm.errors.signature ? (
                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {approveForm.errors.signature || rejectForm.errors.signature}
                            </div>
                        ) : null}
                        <div className="mb-4">
                            <label className="text-sm font-semibold text-gray-800">Catatan persetujuan</label>
                            <textarea
                                value={approveForm.data.note}
                                onChange={(event) => approveForm.setData("note", event.target.value)}
                                rows={3}
                                className="mt-2 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Opsional."
                            />
                            {approveForm.errors.note ? <div className="mt-1 text-xs text-red-600">{approveForm.errors.note}</div> : null}
                        </div>
                        <button
                            type="button"
                            onClick={approve}
                            disabled={!canAct || approveForm.processing}
                            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            Setujui dan Tempel QR
                        </button>
                        <div className="mt-4">
                            <label className="text-sm font-semibold text-gray-800">Catatan penolakan</label>
                            <textarea
                                value={rejectForm.data.note}
                                onChange={(event) => rejectForm.setData("note", event.target.value)}
                                rows={4}
                                className="mt-2 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Wajib diisi jika menolak."
                            />
                            {rejectForm.errors.note ? <div className="mt-1 text-xs text-red-600">{rejectForm.errors.note}</div> : null}
                            <button
                                type="button"
                                onClick={reject}
                                disabled={!canAct || rejectForm.processing || !rejectForm.data.note.trim()}
                                className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                            >
                                Tolak
                            </button>
                        </div>
                    </Panel> : null}
                </div>
            </div>
        </>
    );
}

function SignatureApprovalPanel({ request }) {
    const approveForm = useForm({ note: "" });
    const rejectForm = useForm({ note: "" });
    const status = signatureStatusMeta(request?.status);
    const canAct = request?.status === "ready";

    if (!request) return null;

    const approve = () => {
        if (!canAct || approveForm.processing) return;
        approveForm.post(`/pegawai/approval/${request.id}/approve`, { preserveScroll: true });
    };

    const reject = () => {
        if (!canAct || rejectForm.processing || !rejectForm.data.note.trim()) return;
        rejectForm.post(`/pegawai/approval/${request.id}/reject`, {
            preserveScroll: true,
            onSuccess: () => rejectForm.reset("note"),
        });
    };

    return (
        <Panel title="Approval Tanda Tangan QR">
            <div className="mb-4">
                <Pill tone={status.tone}>{status.label}</Pill>
            </div>
            <InfoGrid
                rows={[
                    ["Signer", request.signer?.name || "-"],
                    ["Urutan", `TTD ${request.signing_order}`],
                    ["Halaman", request.page_number],
                    ...(request.signed_at ? [["Disetujui", formatDate(request.signed_at)]] : []),
                    ...(request.rejected_at ? [["Ditolak", formatDate(request.rejected_at)]] : []),
                    ...(request.note ? [["Catatan", request.note]] : []),
                ]}
            />
            {request.status === "pending" ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    Menunggu giliran tanda tangan. Request ini akan aktif setelah signer sebelumnya menyetujui.
                </div>
            ) : null}
            {request.status === "signed" ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Tanda tangan QR sudah disetujui dan ditempel ke PDF signed.
                </div>
            ) : null}
            {request.status === "rejected" ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Permintaan tanda tangan ini sudah ditolak.
                </div>
            ) : null}
            {approveForm.errors.signature || rejectForm.errors.signature ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {approveForm.errors.signature || rejectForm.errors.signature}
                </div>
            ) : null}
            {request.status === "ready" ? (
                <div className="mt-4 space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-gray-800">Catatan persetujuan</label>
                        <textarea
                            value={approveForm.data.note}
                            onChange={(event) => approveForm.setData("note", event.target.value)}
                            rows={3}
                            className="mt-2 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            placeholder="Opsional."
                        />
                        {approveForm.errors.note ? <div className="mt-1 text-xs text-red-600">{approveForm.errors.note}</div> : null}
                    </div>
                    <button
                        type="button"
                        onClick={approve}
                        disabled={approveForm.processing}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        Setujui dan Tempel QR
                    </button>
                    <div>
                        <label className="text-sm font-semibold text-gray-800">Catatan penolakan</label>
                        <textarea
                            value={rejectForm.data.note}
                            onChange={(event) => rejectForm.setData("note", event.target.value)}
                            rows={4}
                            className="mt-2 w-full rounded-lg border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                            placeholder="Wajib diisi jika menolak."
                        />
                        {rejectForm.errors.note ? <div className="mt-1 text-xs text-red-600">{rejectForm.errors.note}</div> : null}
                        <button
                            type="button"
                            onClick={reject}
                            disabled={rejectForm.processing || !rejectForm.data.note.trim()}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            Tolak
                        </button>
                    </div>
                </div>
            ) : null}
        </Panel>
    );
}

function InboxPage({ mode }) {
    const { letters, dispositions, filterOptions = {} } = usePage().props;
    const title =
        mode === "tebusan"
            ? "Inbox Tebusan"
            : mode === "disposisi"
              ? "Disposisi Masuk"
              : "Inbox Internal";
    const description =
        mode === "disposisi"
            ? "Disposisi yang targetnya sesuai dengan user, unit, atau assignment jabatan Anda."
            : "Surat internal yang target penerima atau tebusannya sesuai dengan user dan struktur organisasi Anda.";

    return (
        <>
            <Header title={title} description={description} />
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <Search
                    URL={mode === "tebusan" ? "/pegawai/inbox/tebusan" : mode === "disposisi" ? "/pegawai/disposisi" : "/pegawai/inbox/internal"}
                    filters={mode === "disposisi" ? [
                        { key: "from_user_ids", label: "Pengirim", options: filterOptions.users || [] },
                    ] : [
                        { key: "letter_type_ids", label: "Jenis Surat", options: filterOptions.letterTypes || [] },
                        { key: "read_statuses", label: "Status Baca", options: filterOptions.readStatuses || [] },
                        { key: "creator_ids", label: "Pengirim", options: filterOptions.users || [] },
                    ]}
                />
            </div>
            {mode === "disposisi" ? (
                <DispositionList dispositions={dispositions} />
            ) : (
                <LetterList
                    letters={letters}
                    emptyText={
                        mode === "tebusan"
                            ? "Belum ada surat tebusan."
                            : "Belum ada surat internal masuk."
                    }
                />
            )}
        </>
    );
}

function CreateMenuPage() {
    const items = [
        {
            title: "Buat Surat Masuk Eksternal",
            description: "Input surat dari pihak eksternal dengan scan PDF.",
            href: "/pegawai/surat/masuk-eksternal",
            icon: Mail,
        },
        {
            title: "Buat Surat Internal",
            description:
                "Kirim surat internal ke user, unit, atau jabatan organisasi.",
            href: "/pegawai/surat/internal",
            icon: Send,
        },
        {
            title: "Buat Surat Keluar",
            description:
                "Buat surat untuk tujuan eksternal perusahaan dengan scan PDF.",
            href: "/pegawai/surat/keluar",
            icon: FilePlus2,
        },
        {
            title: "Arsip Scan",
            description:
                "Simpan scan surat sebagai arsip sistem tanpa alur pengiriman.",
            href: "/pegawai/surat/arsip",
            icon: Archive,
        },
    ];

    return (
        <>
            <Header
                title="Buat Surat"
                description="Pilih jenis surat yang akan dibuat atau disimpan."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {items.map(({ title, description, href, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:border-emerald-300"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                            <Icon className="h-5 w-5" />
                        </div>
                        <div className="mt-5 text-base font-semibold text-gray-950">
                            {title}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                            {description}
                        </div>
                    </Link>
                ))}
            </div>
        </>
    );
}

function CreatePage() {
    const pageProps = usePage().props;
    const {
        letterTypes = [],
        targetOptions = {},
        auth,
        mode = "internal",
        errors: serverErrors = {},
    } = pageProps;
    const isInternal = mode === "internal";
    const isOutgoing = mode === "outgoing";
    const supportsDraftSend = isInternal || isOutgoing;
    const pageConfig = {
        internal: {
            title: "Buat Surat Internal",
            description:
                "Kirim surat internal berbasis scan PDF.",
            submitUrl: "/pegawai/surat/internal",
            submitText: "Kirim Surat",
        },
        outgoing: {
            title: "Buat Surat Keluar",
            description:
                "Buat surat untuk tujuan eksternal perusahaan berbasis scan PDF.",
            submitUrl: "/pegawai/surat/keluar",
            submitText: "Kirim Surat Keluar",
        },
        incoming_external: {
            title: "Buat Surat Masuk Eksternal",
            description:
                "Simpan surat masuk dari pihak eksternal dengan scan PDF.",
            submitUrl: "/pegawai/surat/masuk-eksternal",
            submitText: "Simpan Surat Masuk Eksternal",
        },
        archive: {
            title: "Arsip Surat",
            description:
                "Simpan scan surat ke arsip sistem tanpa alur pengiriman atau disposisi.",
            submitUrl: "/pegawai/surat/arsip",
            submitText: "Simpan Arsip",
        },
    }[mode] || {
        title: "Buat Surat Internal",
        description:
            "Kirim surat internal berbasis scan PDF.",
        submitUrl: "/pegawai/surat/internal",
        submitText: "Kirim Surat",
    };
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [recipientDraft, setRecipientDraft] = useState({
        target_type: "department",
        target_id: "",
    });
    const [ccDraft, setCcDraft] = useState({
        target_type: "department",
        target_id: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [clientErrors, setClientErrors] = useState([]);
    const [signaturePlacementActive, setSignaturePlacementActive] = useState(false);
    const originOptions = internalOriginOptions(auth?.user);
    const defaultOrigin = originOptions[0] || { type: "", rawId: "", id: "", name: "" };

    const { data, setData, post, processing, errors, reset } = useForm({
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

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    function updatePayload(key, value) {
        setData("payload", { ...data.payload, [key]: value });
    }

    function addTarget(kind) {
        const draft = kind === "recipient" ? recipientDraft : ccDraft;
        if (!draft.target_id) return;

        const field = kind === "recipient" ? "targets" : "cc_targets";
        const exists = data[field].some(
            (target) =>
                target.target_type === draft.target_type &&
                String(target.target_id) === String(draft.target_id),
        );
        if (exists) return;

        setData(field, [
            ...data[field],
            {
                target_type: draft.target_type,
                target_id: Number(draft.target_id),
            },
        ]);
        kind === "recipient"
            ? setRecipientDraft({ ...draft, target_id: "" })
            : setCcDraft({ ...draft, target_id: "" });
    }

    function removeTarget(field, index) {
        setData(
            field,
            data[field].filter((_, itemIndex) => itemIndex !== index),
        );
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

        if (file.size > MAX_PDF_SIZE) {
            const message = "Ukuran File Scan PDF maksimal 10MB. Pilih file yang lebih kecil atau kompres PDF terlebih dahulu.";
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
        return requests
            .map((request, index) => ({
                ...request,
                signing_order: index + 1,
            }))
            .sort((first, second) => first.signing_order - second.signing_order);
    }

    function addSignatureRequest(placement) {
        if (!isInternal || !pdfPreviewUrl || !signaturePlacementActive) return;
        const signer = (targetOptions.users || [])[0];

        setData("signature_requests", normalizeSignatureRequests([
            ...data.signature_requests,
            {
                local_id: `${Date.now()}-${data.signature_requests.length}`,
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

    function submit(e, action = "send") {
        e.preventDefault();
        setClientErrors([]);
        if (isInternal) {
            const invalidSignature = data.signature_requests.find((request) => !request.signer_user_id);
            if (invalidSignature) {
                const message = "Pilih signer untuk semua titik tanda tangan.";
                setClientErrors([message]);
                window.alert(message);
                return;
            }
        }
        setSubmitting(true);
        router.post(pageConfig.submitUrl, { ...data, submit_action: action }, {
            forceFormData: true,
            preserveScroll: true,
            onError: (validationErrors) => {
                const messages = Object.values(validationErrors || {}).flat().filter(Boolean);
                const message = messages[0] || "Form gagal disimpan. Periksa kembali input yang wajib diisi.";
                window.alert(message);
            },
            onSuccess: () => {
                reset();
                if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                setPdfPreviewUrl("");
            },
            onFinish: () => setSubmitting(false),
        });
    }

    return (
        <>
            <Header
                title={pageConfig.title}
                description={pageConfig.description}
            />
            <div className="mb-5">
                <FormErrorSummary errors={formErrors} extraErrors={clientErrors} />
            </div>
            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-5 xl:col-span-6">
                    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <SelectField
                            label="Jenis Surat"
                            value={data.letter_type_id}
                            onChange={(value) => setData("letter_type_id", value)}
                            options={letterTypes.map((letterType) => ({
                                id: letterType.id,
                                name: letterType.name,
                            }))}
                            error={formErrors.letter_type_id}
                        />
                        <Field
                            label="Nomor Surat"
                            value={data.letter_number}
                            onChange={(value) => setData("letter_number", value)}
                            error={formErrors.letter_number}
                            placeholder={mode === "incoming_external" ? "Masukkan nomor surat dari dokumen eksternal" : "Opsional, jika sudah ada nomor"}
                        />
                        <Field
                            label="Perihal"
                            value={data.subject}
                            onChange={(value) => setData("subject", value)}
                            error={formErrors.subject}
                            placeholder="Perihal surat"
                        />
                        {isInternal || isOutgoing ? (
                            <SelectField
                                label="Asal Surat"
                                value={
                                    data.payload.internal_origin_type && data.payload.internal_origin_id
                                        ? `${data.payload.internal_origin_type}:${data.payload.internal_origin_id}`
                                        : ""
                                }
                                onChange={(value) => {
                                    const selected = originOptions.find(
                                        (option) => option.id === value,
                                    );
                                    if (!selected) return;
                                    setData("payload", {
                                        ...data.payload,
                                        internal_origin_type: selected.type,
                                        internal_origin_id: Number(selected.rawId),
                                        internal_origin_name: selected.name,
                                    });
                                }}
                                options={originOptions}
                                error={
                                    formErrors["payload.internal_origin_type"] ||
                                    formErrors["payload.internal_origin_id"]
                                }
                                noPlaceholder
                            />
                        ) : null}
                        {isOutgoing ? (
                            <Field
                                label="Tujuan Eksternal"
                                value={data.payload.external_recipient}
                                onChange={(value) =>
                                    updatePayload("external_recipient", value)
                                }
                                error={formErrors["payload.external_recipient"]}
                                placeholder="Nama perusahaan/instansi penerima"
                            />
                        ) : null}
                        {mode === "incoming_external" ? (
                            <Field
                                label="Asal Surat"
                                value={data.payload.origin_name}
                                onChange={(value) =>
                                    updatePayload("origin_name", value)
                                }
                                error={formErrors["payload.origin_name"]}
                                placeholder="Nama instansi/perusahaan pengirim"
                            />
                        ) : null}
                        {mode === "incoming_external" || mode === "archive" ? (
                            <TextareaField
                                label="Catatan"
                                value={data.payload.notes}
                                onChange={(value) =>
                                    updatePayload("notes", value)
                                }
                                rows={4}
                                error={formErrors["payload.notes"]}
                                placeholder="Catatan tambahan"
                            />
                        ) : null}
                    </div>

                    {isInternal || isOutgoing ? (
                        <>
                            {isInternal ? (
                                <TargetPicker
                                    title="Tujuan"
                                    draft={recipientDraft}
                                    setDraft={setRecipientDraft}
                                    targets={data.targets}
                                    field="targets"
                                    targetOptions={targetOptions}
                                    onAdd={() => addTarget("recipient")}
                                    onRemove={removeTarget}
                                    error={formErrors.targets}
                                />
                            ) : null}

                            <TargetPicker
                                title="Tembusan"
                                draft={ccDraft}
                                setDraft={setCcDraft}
                                targets={data.cc_targets}
                                field="cc_targets"
                                targetOptions={targetOptions}
                                onAdd={() => addTarget("cc")}
                                onRemove={removeTarget}
                            />
                        </>
                    ) : null}

                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <label className="block text-sm font-semibold text-gray-900">
                            File Scan PDF
                        </label>
                        <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-5">
                            <div className="flex items-center gap-3">
                                <Upload className="h-5 w-5 text-gray-500" />
                                <div className="min-w-0">
                                    <input
                                        type="file"
                                        accept="application/pdf,.pdf"
                                        onChange={(event) =>
                                            handleFile(
                                                event.target.files?.[0] ||
                                                    null,
                                            )
                                        }
                                        className="block w-full text-sm text-gray-700 file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                                    />
                                    <div className="mt-2 text-xs text-gray-500">
                                        Hanya file PDF, maksimal 10MB.
                                    </div>
                                </div>
                            </div>
                        </div>
                        {formErrors.scan_file ? (
                            <div className="mt-2 text-xs text-red-600">
                                {formErrors.scan_file}
                            </div>
                        ) : null}
                    </div>

                    {isInternal ? (
                        <SignatureRequestPanel
                            requests={data.signature_requests}
                            signerOptions={targetOptions.users || []}
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
                        {supportsDraftSend ? (
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={(event) => submit(event, "draft")}
                                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                            >
                                <Archive className="mr-2 h-4 w-4" />
                                {submitting ? "Menyimpan..." : "Simpan Draft"}
                            </button>
                        ) : null}
                        <Link
                            href="/pegawai/surat"
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        >
                            <Send className="mr-2 h-4 w-4" />
                            {submitting ? "Menyimpan..." : supportsDraftSend ? "Send" : pageConfig.submitText}
                        </button>
                    </div>
                </div>

                <div className="xl:col-span-6">
                    <div className="sticky top-24 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
                            <div className="text-sm font-semibold text-gray-950">
                                Preview
                            </div>
                            <Pill
                                tone={
                                    "blue"
                                }
                            >
                                PDF
                            </Pill>
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
                            <iframe
                                title="Preview PDF"
                                src={pdfPreviewUrl}
                                className="h-[520px] md:h-[720px] w-full bg-gray-100"
                            />
                        ) : (
                            <div className="flex h-[520px] md:h-[720px] items-center justify-center bg-gray-50 text-sm text-gray-500">
                                Pilih file PDF untuk melihat preview.
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </>
    );
}

function SignatureRequestPanel({
    requests,
    signerOptions,
    onUpdate,
    onRemove,
    onMove,
    placementActive,
    setPlacementActive,
    pdfReady,
    errors,
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-950">Tanda Tangan QR</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Klik tombol tambah, lalu klik halaman PDF di kanan. Sistem akan mendeteksi halaman tanda tangan otomatis.
                    </p>
                </div>
            </div>
            <button
                type="button"
                disabled={!pdfReady}
                onClick={() => setPlacementActive(!placementActive)}
                className={`mt-4 inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                    placementActive
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-emerald-700 text-white hover:bg-emerald-800"
                }`}
            >
                {placementActive ? "Batal tambah titik" : "Tambah titik tanda tangan"}
            </button>
            {!pdfReady ? (
                <div className="mt-2 text-xs text-gray-500">Upload PDF dulu untuk mengaktifkan penempatan tanda tangan.</div>
            ) : placementActive ? (
                <div className="mt-2 text-xs text-amber-700">Mode tambah aktif. Klik satu posisi di preview PDF. Setelah titik dibuat, mode akan mati agar PDF bisa discroll lagi.</div>
            ) : (
                <div className="mt-2 text-xs text-gray-500">PDF bisa discroll normal. Aktifkan tombol tambah titik hanya saat ingin menandai posisi tanda tangan.</div>
            )}

            {errors.signature_requests ? (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    {errors.signature_requests}
                </div>
            ) : null}

            <div className="mt-4 space-y-3">
                {requests.length ? requests.map((request, index) => (
                    <div key={request.local_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <div className="grid gap-3 md:grid-cols-[90px_1fr_110px_auto] md:items-end">
                            <label className="text-xs font-semibold text-gray-600">
                                Urutan
                                <select
                                    value={request.signing_order}
                                    onChange={(event) => onMove(request.local_id, event.target.value)}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    {requests.map((_, orderIndex) => (
                                        <option key={orderIndex + 1} value={orderIndex + 1}>
                                            {orderIndex + 1}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-xs font-semibold text-gray-600">
                                Signer
                                <select
                                    value={request.signer_user_id || ""}
                                    onChange={(event) => onUpdate(request.local_id, { signer_user_id: event.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Pilih signer</option>
                                    {signerOptions.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name}{user.position ? ` - ${user.position}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="text-xs font-semibold text-gray-600">
                                Halaman
                                <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800">
                                    {request.page_number}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(request.local_id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                            >
                                Hapus
                            </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                            Posisi: {(request.x * 100).toFixed(1)}%, {(request.y * 100).toFixed(1)}% · Ukuran: {(request.width * 100).toFixed(1)}% x {(request.height * 100).toFixed(1)}%
                        </div>
                        {errors[`signature_requests.${index}.signer_user_id`] ? (
                            <div className="mt-2 text-xs text-red-600">{errors[`signature_requests.${index}.signer_user_id`]}</div>
                        ) : null}
                    </div>
                )) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        Belum ada titik tanda tangan. Upload PDF lalu klik area preview untuk menambah titik.
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailPage() {
    const {
        letter,
        notifications = [],
        targetOptions = {},
        dispositionTargetOptions = {},
        activeSignatureRequest,
        auth,
    } = usePage().props;
    if (!letter) {
        return (
            <EmptyState message="Surat tidak ditemukan atau Anda tidak memiliki akses." />
        );
    }

    const recipientTargets = (letter.targets || []).filter(
        (target) => target.kind === "recipient",
    );
    const ccTargets = (letter.targets || []).filter(
        (target) => target.kind === "cc",
    );
    const businessType = businessLetterType(letter);
    const isIncomingExternal = businessType === "incoming_external";
    const isOutgoingLetter = businessType === "outgoing";
    const typeMeta = letterTypeMeta(letter);
    const dispositionTypes = availableDispositionTypes(dispositionTargetOptions);
    const dispositionTree = buildDispositionTree(letter.dispositions || []);
    const readStatuses = letter.target_read_statuses?.length
        ? letter.target_read_statuses
        : (letter.read_receipts || []);
    const canDeleteDraft =
        letter.status === "draft" &&
        String(letter.created_by) === String(auth?.user?.id);
    const canPublish =
        ["incoming_external", "outgoing", "archive"].includes(businessType) &&
        String(letter.created_by) === String(auth?.user?.id);

    return (
        <>
            <Header
                title={letter.subject || letter.title}
                description={`${letterDisplayNumber(letter)} · ${formatDate(letter.created_at)}`}
            />
            {canDeleteDraft ? (
                <div className="mb-5 flex justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            if (confirm("Hapus draft surat ini?")) {
                                router.delete(`/pegawai/surat/${letter.id}`);
                            }
                        }}
                        className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Draft
                    </button>
                </div>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-5 xl:col-span-7">
                    <Panel title="Metadata Surat">
                        <div className="mb-4">
                            <Pill tone={typeMeta.tone}>{typeMeta.label}</Pill>
                        </div>
                        <InfoGrid
                            rows={[
                                ["Nomor", letter.letter_number || "-"],
                                [
                                    "Jenis Surat",
                                    letter.letter_type?.name || "-",
                                ],
                                ["Diinput oleh", letter.creator?.name || "-"],
                                ["Tanggal input", formatInputDate(letter.created_at)],
                                ["Jam input", formatInputTime(letter.created_at)],
                                [
                                    "Jumlah Halaman",
                                    `${letter.page_count || 1} Halaman`,
                                ],
                                ...(letter.signature_status ? [["Status Tanda Tangan", signatureStatusMeta(letter.signature_status).label]] : []),
                                ...(!isIncomingExternal && !isOutgoingLetter ? [["Status", letter.status]] : []),
                                ...(letter.payload?.internal_origin_name
                                    ? [
                                          [
                                              "Asal Surat",
                                              letter.payload
                                                  .internal_origin_name,
                                          ],
                                      ]
                                    : []),
                                ...(letter.payload?.origin_name
                                    ? [
                                          [
                                              "Asal Surat",
                                              letter.payload.origin_name,
                                          ],
                                      ]
                                    : []),
                                ...(letter.payload?.external_recipient
                                    ? [
                                          [
                                              "Tujuan Eksternal",
                                              letter.payload.external_recipient,
                                          ],
                                      ]
                                    : []),
                                ...(letter.payload?.notes
                                    ? [["Catatan", letter.payload.notes]]
                                    : []),
                            ]}
                        />
                    </Panel>

                    {businessType === "internal" ? <Panel title="Target dan Tembusan">
                        <TargetSummary
                            title="Tujuan"
                            targets={recipientTargets}
                            targetOptions={targetOptions}
                        />
                        <div className="mt-4">
                            <TargetSummary
                                title="Tembusan"
                                targets={ccTargets}
                                targetOptions={targetOptions}
                            />
                        </div>
                    </Panel> : null}

                    {businessType === "internal" ? (
                        <Panel title="Permintaan Tanda Tangan QR">
                            {letter.signature_requests?.length ? (
                                <div className="space-y-3">
                                    {letter.signature_requests.map((request) => (
                                        <div key={request.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                                            {(() => {
                                                const status = signatureStatusMeta(request.status);
                                                return (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="font-semibold text-gray-950">
                                                        TTD {request.signing_order}: {request.signer?.name || "-"}
                                                    </div>
                                                    <div className="mt-1 text-xs text-gray-500">
                                                        Halaman {request.page_number} · Posisi {(Number(request.x) * 100).toFixed(1)}%, {(Number(request.y) * 100).toFixed(1)}%
                                                    </div>
                                                </div>
                                                <Pill tone={status.tone}>{status.label}</Pill>
                                            </div>
                                                );
                                            })()}
                                            <div className="mt-2 text-xs text-gray-500">
                                                Dibuat {formatDate(request.created_at)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-gray-500">
                                    Belum ada permintaan tanda tangan QR.
                                </div>
                            )}
                        </Panel>
                    ) : null}

                    {activeSignatureRequest ? (
                        <SignatureApprovalPanel request={activeSignatureRequest} />
                    ) : null}

                    {isOutgoingLetter ? <Panel title="Tembusan">
                        <TargetSummary
                            title="Tembusan"
                            targets={ccTargets}
                            targetOptions={targetOptions}
                        />
                    </Panel> : null}

                    {canPublish ? (
                        <PublishExternalPanel
                            letter={letter}
                            targetOptions={targetOptions}
                        />
                    ) : null}

                    <Panel title="Lampiran">
                        {letter.attachments?.length ? (
                            <div className="space-y-3">
                                {letter.attachments.map((attachment) => (
                                    <a
                                        key={attachment.id}
                                        href={`/storage/${attachment.file_path}`}
                                        target="_blank"
                                        className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm hover:border-emerald-300"
                                        rel="noreferrer"
                                    >
                                        <span className="flex items-center gap-2 font-medium text-gray-900">
                                            <Paperclip className="h-4 w-4 text-gray-500" />
                                            {attachment.file_name}
                                        </span>
                                        <Download className="h-4 w-4 text-gray-500" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">
                                Tidak ada lampiran scan.
                            </div>
                        )}
                    </Panel>

                    {!["internal", "outgoing"].includes(businessType) ? <Panel title="Disposisi">
                        {dispositionTree.length ? (
                            <div className="space-y-3">
                                {dispositionTree.map((disposition) => (
                                    <DispositionThreadItem
                                        key={disposition.id}
                                        disposition={disposition}
                                        targetOptions={targetOptions}
                                        dispositionTargetOptions={dispositionTargetOptions}
                                        targetTypes={dispositionTypes}
                                        letterId={letter.id}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">
                                Belum ada disposisi.
                            </div>
                        )}
                    </Panel> : null}
                </div>

                <div className="space-y-5 xl:col-span-5">
                    <Panel title="Preview Surat">
                        {letter.signed_pdf_path || letter.attachments?.[0] ? (
                            <iframe
                                title="Preview PDF"
                                src={`/storage/${letter.signed_pdf_path || letter.attachments[0].file_path}`}
                                className="h-[520px] md:h-[680px] w-full rounded-lg border border-gray-200 bg-gray-100"
                            />
                        ) : (
                            <div className="text-sm text-gray-500">
                                Preview tidak tersedia.
                            </div>
                        )}
                    </Panel>

                    <Panel title="Status Baca">
                        {readStatuses.length ? (
                            <div className="space-y-3">
                                {readStatuses.map((receipt) => (
                                    <div
                                        key={receipt.id || receipt.user?.id}
                                        className="flex items-center justify-between gap-3 text-sm"
                                    >
                                        <div>
                                            <div className="font-semibold text-gray-950">
                                                {receipt.user?.name || "-"}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {receipt.user?.position || "-"}
                                            </div>
                                        </div>
                                        <Pill tone="green">
                                            {formatDate(receipt.read_at)}
                                        </Pill>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500">
                                Belum ada penerima yang membaca.
                            </div>
                        )}
                    </Panel>

                </div>
            </div>
        </>
    );
}

function PublishExternalPanel({ letter, targetOptions }) {
    const publishTypes = ["department", "division", "directorate"];
    const form = useForm({ targets: [] });
    const [draft, setDraft] = useState({
        target_type: "department",
        target_id: "",
    });
    const publishedTargets = (letter.targets || []).filter(
        (target) => target.kind === "recipient",
    );

    const addTarget = () => {
        if (!draft.target_type || !draft.target_id) return;
        const exists = form.data.targets.some(
            (target) =>
                target.target_type === draft.target_type &&
                String(target.target_id) === String(draft.target_id),
        ) || publishedTargets.some(
            (target) =>
                target.target_type === draft.target_type &&
                String(target.target_id) === String(draft.target_id),
        );

        if (exists) return;

        form.setData("targets", [
            ...form.data.targets,
            {
                target_type: draft.target_type,
                target_id: draft.target_id,
            },
        ]);
        setDraft({ ...draft, target_id: "" });
    };

    const removeDraftTarget = (_field, index) => {
        form.setData(
            "targets",
            form.data.targets.filter((_, targetIndex) => targetIndex !== index),
        );
    };

    const submit = (event) => {
        event.preventDefault();
        form.post(`/pegawai/surat/${letter.id}/publish`, {
            preserveScroll: true,
            onSuccess: () => form.reset("targets"),
        });
    };

    const revokeTarget = (target) => {
        if (!confirm("Cabut publish ke target ini?")) return;

        router.delete(`/pegawai/surat/${letter.id}/publish/${target.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <Panel title="Publish Surat">
            <form onSubmit={submit} className="space-y-4">
                <TargetPicker
                    title="Tujuan Publish"
                    draft={draft}
                    setDraft={setDraft}
                    targets={form.data.targets}
                    field="targets"
                    targetOptions={targetOptions}
                    targetTypes={publishTypes}
                    onAdd={addTarget}
                    onRemove={removeDraftTarget}
                    error={form.errors.targets}
                />
                <button
                    disabled={form.processing || !form.data.targets.length}
                    className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                    <Send className="mr-2 h-4 w-4" />
                    Publish
                </button>
            </form>

            <div className="mt-5 border-t border-gray-100 pt-4">
                <div className="mb-3 text-sm font-semibold text-gray-950">
                    Sudah Dipublish
                </div>
                <div className="flex flex-wrap gap-2">
                    {publishedTargets.length ? (
                        publishedTargets.map((target) => (
                            <span
                                key={target.id}
                                className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                            >
                                <span className="min-w-0 break-words">
                                    {targetLabel(target, targetOptions)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => revokeTarget(target)}
                                    className="shrink-0 text-gray-400 hover:text-red-600"
                                    title="Cabut publish"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </span>
                        ))
                    ) : (
                        <span className="text-sm text-gray-500">
                            Belum dipublish ke unit mana pun.
                        </span>
                    )}
                </div>
            </div>
        </Panel>
    );
}

function DispositionThreadItem({ disposition, targetOptions, dispositionTargetOptions, targetTypes, letterId, depth = 0 }) {
    const replyForm = useForm({ note: "" });
    const forwardForm = useForm({
        parent_id: disposition.id,
        target_type: targetTypes[0]?.id || "department",
        target_id: "",
        note: "",
    });
    const submitReply = (event) => {
        event.preventDefault();
        replyForm.post(`/pegawai/disposisi/${disposition.id}/balas`, {
            preserveScroll: true,
            onSuccess: () => replyForm.reset("note"),
        });
    };
    const submitForward = (event) => {
        event.preventDefault();
        forwardForm.post(`/pegawai/surat/${letterId}/disposisi`, {
            preserveScroll: true,
            onSuccess: () => forwardForm.reset("target_id", "note"),
        });
    };

    return (
        <div className={`${depth ? "ml-4 border-l border-gray-200 pl-4" : ""}`}>
            <div className="rounded-lg border border-gray-200 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <div className="font-semibold text-gray-950">
                            {fromUnitLabel(disposition)}
                        </div>
                        <div className="mt-1 text-xs font-medium text-gray-500">
                            Tujuan: {targetLabel(disposition, targetOptions)}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Pill tone={disposition.read_at ? "green" : "gray"}>
                            {disposition.read_at ? "Dibaca" : "Belum dibaca"}
                        </Pill>
                    </div>
                </div>
                <div className="mt-3 text-gray-700">{disposition.note || "-"}</div>
                <div className="mt-2 text-xs text-gray-500">{formatDate(disposition.created_at)}</div>
                {disposition.can_reply ? (
                    <form onSubmit={submitReply} className="mt-4 space-y-2">
                        <textarea
                            rows={2}
                            value={replyForm.data.note}
                            onChange={(event) => replyForm.setData("note", event.target.value)}
                            placeholder="Balas disposisi"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                        />
                        {replyForm.errors.note ? <div className="text-xs text-red-600">{replyForm.errors.note}</div> : null}
                        <div className="flex flex-wrap gap-2">
                            <button disabled={replyForm.processing || !replyForm.data.note} className="inline-flex items-center rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">
                                <Send className="mr-2 h-3.5 w-3.5" />
                                Balas
                            </button>
                        </div>
                    </form>
                ) : null}
                {disposition.can_forward && targetTypes.length ? (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                        <ForwardDispositionForm
                            form={forwardForm}
                            targetOptions={dispositionTargetOptions}
                            targetTypes={targetTypes}
                            onSubmit={submitForward}
                        />
                    </div>
                ) : null}
            </div>
            {disposition.replies?.length ? (
                <div className="mt-3 space-y-3">
                    {disposition.replies.map((reply) => (
                        <DispositionThreadItem
                            key={reply.id}
                            disposition={reply}
                            targetOptions={targetOptions}
                            dispositionTargetOptions={dispositionTargetOptions}
                            targetTypes={targetTypes}
                            letterId={letterId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function ForwardDispositionForm({ form, targetOptions, targetTypes, onSubmit }) {
    const options = optionsByType(form.data.target_type, targetOptions);

    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <div className="text-xs font-semibold uppercase text-gray-500">
                Teruskan Disposisi
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <select
                    value={form.data.target_type}
                    onChange={(event) =>
                        form.setData({
                            ...form.data,
                            target_type: event.target.value,
                            target_id: "",
                        })
                    }
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                    {targetTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                            {type.name}
                        </option>
                    ))}
                </select>
                <select
                    value={form.data.target_id}
                    onChange={(event) => form.setData("target_id", event.target.value)}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                    <option value="">Pilih penerima</option>
                    {options.map((option) => (
                        <option key={`${form.data.target_type}-${option.id}`} value={option.id}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
            <textarea
                rows={2}
                value={form.data.note}
                onChange={(event) => form.setData("note", event.target.value)}
                placeholder="Catatan disposisi lanjutan"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {form.errors.target_id || form.errors.target_type ? (
                <div className="text-xs text-red-600">
                    {form.errors.target_id || form.errors.target_type}
                </div>
            ) : null}
            <button
                disabled={form.processing || !form.data.target_id}
                className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
                <Send className="mr-2 h-3.5 w-3.5" />
                Teruskan
            </button>
        </form>
    );
}

function buildDispositionTree(dispositions) {
    const byId = new Map((dispositions || []).map((item) => [item.id, { ...item, replies: [] }]));
    const roots = [];

    byId.forEach((item) => {
        if (item.parent_id && byId.has(item.parent_id)) {
            byId.get(item.parent_id).replies.push(item);
            return;
        }
        roots.push(item);
    });

    return roots;
}

function fromUnitLabel(disposition) {
    if (disposition.from_department?.name) return disposition.from_department.name;
    if (disposition.from_division?.name) return disposition.from_division.name;
    if (disposition.from_directorate?.name) return disposition.from_directorate.name;
    return disposition.from_user?.name || "-";
}

function ArchivePage() {
    const { letters, filterOptions = {} } = usePage().props;
    return (
        <>
            <Header
                title="Arsip Saya"
                description="Surat yang Anda buat, terima, baca, atau menjadi target disposisi."
            />
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <Search
                    URL="/pegawai/arsip"
                    filters={[
                        { key: "letter_type_ids", label: "Jenis Surat", options: filterOptions.letterTypes || [] },
                        { key: "statuses", label: "Status Surat", options: filterOptions.letterStatuses || [] },
                        { key: "creator_ids", label: "Pembuat", options: filterOptions.users || [] },
                    ]}
                />
            </div>
            <LetterList
                letters={letters}
                emptyText="Arsip pribadi masih kosong."
            />
        </>
    );
}

function NotificationsPage() {
    const { notifications } = usePage().props;
    const rows = collection(notifications);

    return (
        <>
            <Header
                title="Notifikasi"
                description="Notifikasi surat dan disposisi untuk akun Anda."
            />
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="divide-y divide-gray-100">
                    {rows.length ? (
                        rows.map((notification) => (
                            <Link
                                key={notification.id}
                                href={`/pegawai/notifikasi/${notification.id}`}
                                className="grid gap-3 px-5 py-4 text-sm hover:bg-gray-50 md:grid-cols-12 md:items-center"
                            >
                                <div className="min-w-0 md:col-span-7">
                                    <div className="flex items-center gap-2">
                                        {!notification.read_at ? (
                                            <span className="h-2 w-2 rounded-full bg-red-600" />
                                        ) : (
                                            <Bell className="h-4 w-4 text-gray-400" />
                                        )}
                                        <div className="font-semibold text-gray-950">
                                            {notification.title}
                                        </div>
                                    </div>
                                    <div className="mt-1 break-words text-gray-600">
                                        {notification.body || "-"}
                                    </div>
                                </div>
                                <div className="text-gray-600 md:col-span-3">
                                    {letterDisplayNumber(notification.letter)}
                                </div>
                                <div className="md:col-span-2 md:text-right">
                                    <Pill tone={notification.read_at ? "green" : "red"}>
                                        {notification.read_at ? "Dibaca" : "Belum dibaca"}
                                    </Pill>
                                    <div className="mt-2 text-xs text-gray-500">
                                        {formatDate(notification.created_at)}
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <EmptyState message="Belum ada notifikasi." />
                    )}
                </div>
                <Pagination meta={notifications} />
            </div>
        </>
    );
}

function TargetPicker({
    title,
    draft,
    setDraft,
    targets,
    field,
    targetOptions,
    targetTypes = ["directorate", "division", "division_gm", "department", "department_manager"],
    onAdd,
    onRemove,
    error,
}) {
    const options = optionsByType(draft.target_type, targetOptions);

    return (
        <div className="min-w-0 space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-950">
                        {title}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                        Pilih unit atau assignment jabatan organisasi.
                    </div>
                </div>
                {error ? (
                    <span className="text-xs font-semibold text-red-600">
                        {error}
                    </span>
                ) : null}
            </div>
            <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_120px]">
                <select
                    value={draft.target_type}
                    onChange={(event) =>
                        setDraft({
                            target_type: event.target.value,
                            target_id: "",
                        })
                    }
                    className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                    {targetTypes.includes("directorate") ? (
                        <option value="directorate">Direktorat</option>
                    ) : null}
                    {targetTypes.includes("division") ? (
                        <option value="division">Divisi</option>
                    ) : null}
                    {targetTypes.includes("division_gm") ? (
                        <option value="division_gm">GM Divisi</option>
                    ) : null}
                    {targetTypes.includes("department") ? (
                        <option value="department">Department</option>
                    ) : null}
                    {targetTypes.includes("department_manager") ? (
                        <option value="department_manager">
                            Manager Department
                        </option>
                    ) : null}
                </select>
                <select
                    value={draft.target_id}
                    onChange={(event) =>
                        setDraft({ ...draft, target_id: event.target.value })
                    }
                    className="min-w-0 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                >
                    <option value="">Pilih target</option>
                    {options.map((option) => (
                        <option
                            key={`${draft.target_type}-${option.id}`}
                            value={option.id}
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <button
                    type="button"
                    onClick={onAdd}
                    className="inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah
                </button>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
                {targets.length ? (
                    targets.map((target, index) => (
                        <span
                            key={`${target.target_type}-${target.target_id}`}
                            className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                            <span className="min-w-0 break-words">
                                {targetLabel(target, targetOptions)}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemove(field, index)}
                                className="shrink-0 text-gray-400 hover:text-red-600"
                                title="Hapus"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    ))
                ) : (
                    <span className="text-xs text-gray-500">
                        Belum ada target.
                    </span>
                )}
            </div>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    error,
    placeholder,
    readOnly = false,
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <input
                type="text"
                value={value || ""}
                readOnly={readOnly}
                placeholder={placeholder}
                onChange={(event) => onChange?.(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 disabled:bg-gray-50"
            />
            {error ? (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            ) : null}
        </label>
    );
}

function SelectField({
    label,
    value,
    onChange,
    options,
    error,
    noPlaceholder = false,
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <select
                value={value || ""}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            >
                {noPlaceholder ? null : <option value="">Pilih</option>}
                {options.map((option) => (
                    <option key={option.id} value={option.id}>
                        {option.name}
                    </option>
                ))}
            </select>
            {error ? (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            ) : null}
        </label>
    );
}

function TextareaField({
    label,
    value,
    onChange,
    error,
    placeholder,
    rows = 4,
}) {
    return (
        <label className="block">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <textarea
                rows={rows}
                value={value || ""}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
            />
            {error ? (
                <span className="mt-1 block text-xs text-red-600">{error}</span>
            ) : null}
        </label>
    );
}

function Panel({ title, children }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4 text-sm font-semibold text-gray-950">
                {title}
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

function InfoGrid({ rows }) {
    return (
        <div className="grid gap-3 text-sm md:grid-cols-2">
            {rows.map(([label, value]) => (
                <div key={label}>
                    <div className="text-xs font-semibold uppercase text-gray-500">
                        {label}
                    </div>
                    <div className="mt-1 text-gray-950">{value}</div>
                </div>
            ))}
        </div>
    );
}

function TargetSummary({ title, targets, targetOptions = {} }) {
    return (
        <div>
            <div className="mb-2 text-xs font-semibold uppercase text-gray-500">
                {title}
            </div>
            {targets.length ? (
                <div className="flex flex-wrap gap-2">
                    {targets.map((target) => (
                        <Pill key={target.id} tone="blue">
                            {targetLabel(target, targetOptions)}
                        </Pill>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-gray-500">-</div>
            )}
        </div>
    );
}

function Timeline({ items, empty = "Belum ada aktivitas." }) {
    return (
        <div className="space-y-3">
            {items.length ? (
                items.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <Clock className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="font-semibold text-gray-950">
                                {item.title}
                            </div>
                            <div className="text-gray-600">{item.subtitle}</div>
                            <div className="mt-1 text-xs text-gray-500">
                                {formatDate(item.time)}
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-sm text-gray-500">{empty}</div>
            )}
        </div>
    );
}

function Pagination({ meta }) {
    if (!Array.isArray(meta?.links) || meta.links.length <= 3) return null;

    return (
        <div className="flex flex-wrap gap-2 border-t border-gray-200 px-5 py-4">
            {meta.links.map((link, index) => (
                <Link
                    key={`${link.label}-${index}`}
                    href={link.url || "#"}
                    preserveScroll
                    className={`rounded-lg px-3 py-1.5 text-sm ${link.active ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"} ${!link.url ? "pointer-events-none opacity-50" : ""}`}
                    dangerouslySetInnerHTML={{ __html: link.label }}
                />
            ))}
        </div>
    );
}

function EmptyState({ message }) {
    return (
        <div className="flex min-h-40 flex-col items-center justify-center px-5 py-10 text-center text-sm text-gray-500">
            <Inbox className="mb-3 h-8 w-8 text-gray-400" />
            {message}
        </div>
    );
}

function optionsByType(type, options) {
    if (type === "user") {
        return (options.users || []).map((user) => ({
            id: user.id,
            label: `${user.name}${user.position ? ` - ${user.position}` : ""}`,
        }));
    }
    if (type === "directorate") {
        return (options.directorates || []).map((unit) => ({
            id: unit.id,
            label: `${unit.name}${unit.director?.name ? ` - ${unit.director.name}` : ""}`,
        }));
    }
    if (type === "division" || type === "division_gm") {
        return (options.divisions || []).map((unit) => ({
            id: unit.id,
            label: `${unit.name}${type === "division_gm" && unit.general_manager?.name ? ` - ${unit.general_manager.name}` : ""}`,
        }));
    }
    return (options.departments || []).map((unit) => ({
        id: unit.id,
        label: `${unit.name}${type === "department_manager" && unit.manager?.name ? ` - ${unit.manager.name}` : ""}`,
    }));
}

function targetLabel(target, options) {
    const match = optionsByType(target.target_type, options).find(
        (option) => String(option.id) === String(target.target_id),
    );
    return match?.label || `${target.target_type}: ${target.target_id}`;
}

function availableDispositionTypes(options = {}) {
    const configured = options.targetTypes || [];
    const allTypes = [
        (options.directorates || []).length
            ? { id: "directorate", name: "Direktur" }
            : null,
        (options.divisions || []).length
            ? { id: "division", name: "Divisi" }
            : null,
        (options.divisions || []).length
            ? { id: "division_gm", name: "General Manager" }
            : null,
        (options.departments || []).length
            ? { id: "department_manager", name: "Manager" }
            : null,
        (options.departments || []).length
            ? { id: "department", name: "Department" }
            : null,
    ].filter(Boolean);

    return configured.length
        ? allTypes.filter((type) => configured.includes(type.id))
        : allTypes;
}

function internalOriginOptions(user) {
    return [
        user?.directorate
            ? {
                  type: "directorate",
                  rawId: user.directorate.id,
                  id: `directorate:${user.directorate.id}`,
                  name: `Direktur ${cleanUnitName(user.directorate.name, "Direktorat")}`,
              }
            : null,
        user?.division
            ? {
                  type: "division",
                  rawId: user.division.id,
                  id: `division:${user.division.id}`,
                  name: `General Manager ${cleanUnitName(user.division.name, "Divisi")}`,
              }
            : null,
        user?.department
            ? {
                  type: "department",
                  rawId: user.department.id,
                  id: `department:${user.department.id}`,
                  name: `Manager ${cleanUnitName(user.department.name, "Department")}`,
              }
            : null,
    ].filter(Boolean);
}

function cleanUnitName(name, prefix) {
    return String(name || "")
        .replace(new RegExp(`^${prefix}\\s+`, "i"), "")
        .trim();
}

export default function Workspace() {
    const { section, mode } = usePage().props;
    const title = section === "detail" ? "Detail Surat" : "Portal Pegawai";

    return (
        <LayoutPegawai>
            <Head title={title} />
            {section === "dashboard" ? <Dashboard /> : null}
            {section === "inbox" ? <InboxPage mode={mode} /> : null}
            {section === "create_menu" ? <CreateMenuPage /> : null}
            {section === "create" ? <CreatePage /> : null}
            {section === "archive" ? <ArchivePage /> : null}
            {section === "approval" ? <ApprovalPage /> : null}
            {section === "approval_detail" ? <ApprovalDetailPage /> : null}
            {section === "notifications" ? <NotificationsPage /> : null}
            {section === "detail" ? <DetailPage /> : null}
        </LayoutPegawai>
    );
}
