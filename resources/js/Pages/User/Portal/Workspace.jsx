import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import LayoutUser from "@/Layouts/LayoutUser";
import Search from "@/Shared/Search";
import FormErrorSummary from "@/Shared/FormErrorSummary";
import PdfSignaturePlacement from "@/Components/PdfSignaturePlacement";
import PdfDocumentViewer from "@/Components/PdfDocumentViewer";
import DocumentDownloadButton from "@/Components/DocumentDownloadButton";
import {
    Archive,
    CheckCheck,
    Clock,
    Eye,
    FilePlus2,
    Inbox,
    Mail,
    Plus,
    Send,
    Trash2,
    Upload,
} from "lucide-react";

function Header({ title, description, actionHref, actionText }) {
    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="break-words text-xl font-bold text-gray-950 sm:text-2xl">{title}</h1>
                <p className="mt-2 break-words text-sm text-gray-600">{description}</p>
            </div>
            {actionHref ? (
                <Link
                    href={actionHref}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 sm:w-auto"
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

function locationHeaders() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({});
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => resolve({
                "X-Client-Latitude": String(position.coords.latitude),
                "X-Client-Longitude": String(position.coords.longitude),
            }),
            () => resolve({}),
            { enableHighAccuracy: false, maximumAge: 300000, timeout: 2500 },
        );
    });
}

function currentCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
}

function updateCsrfToken(token) {
    let meta = document.querySelector('meta[name="csrf-token"]');

    if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "csrf-token");
        document.head.appendChild(meta);
    }

    meta.setAttribute("content", token);

    if (window.axios?.defaults?.headers?.common) {
        window.axios.defaults.headers.common["X-CSRF-TOKEN"] = token;
    }
}

async function freshCsrfToken() {
    const response = await fetch("/csrf-token", {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "X-Requested-With": "XMLHttpRequest",
            Accept: "application/json",
        },
    });
    const payload = await response.json().catch(() => ({}));
    const token = payload.token || currentCsrfToken();

    if (!response.ok || !token) {
        throw new Error("Token keamanan tidak tersedia. Muat ulang halaman lalu coba lagi.");
    }

    updateCsrfToken(token);

    return token;
}

function letterDisplayNumber(letter) {
    if (!letter) return "-";
    if (letter.type === "incoming_external") return letter.letter_number || "-";
    return letter.letter_number || "-";
}

function letterTypeMeta(letterOrType) {
    const type =
        typeof letterOrType === "string"
            ? letterOrType
            : letterOrType?.meta?.mode === "archive"
              ? "archive"
              : letterOrType?.type;
    const types = {
        internal: { label: "Dokumen", tone: "blue" },
    };

    return types[type] || { label: "Surat", tone: "gray" };
}

function signatureStatusMeta(status) {
    const statuses = {
        ready: { label: "Siap diproses", tone: "amber" },
        pending: { label: "Menunggu giliran", tone: "gray" },
        in_progress: { label: "Proses approval", tone: "amber" },
        signed: { label: "Disetujui", tone: "green" },
    };

    return statuses[status] || { label: status || "-", tone: "gray" };
}

function approvalTypeMeta(request) {
    return { label: "Tanda Tangan", action: "Setujui dan Tempel QR", ready: "TTD", doneTitle: "Sudah Ditandatangani", doneMessage: "Tanda tangan QR sudah disetujui dan ditempel ke PDF signed.", waiting: "Menunggu giliran tanda tangan." };
}

function signatureActionLabel(status) {
    return {
        ready: "Tanda tangani",
        pending: "Lihat status",
        signed: "Lihat dokumen",
    }[status] || "Lihat";
}

function approvalActionLabel(request) {
    return signatureActionLabel(request?.status);
}

function businessLetterType(letter) {
    return letter?.meta?.mode === "archive" ? "archive" : letter?.type;
}

function Dashboard() {
    const { letters = [], canCreateDocuments } = usePage().props;

    return (
        <>
            <Header
                title="Dashboard User"
                description="Surat terbaru dari database aplikasi."
                actionHref={canCreateDocuments ? "/user/surat/create" : null}
                actionText="Buat Dokumen"
            />
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-950">
                        Surat Terbaru
                    </h2>
                </div>
                <LetterList
                    letters={letters}
                    emptyText="Belum ada surat internal yang dapat ditampilkan."
                    context="dashboard"
                />
            </div>
        </>
    );
}

function LetterList({ letters, emptyText = "Tidak ada data surat.", context = "default" }) {
    const rows = collection(letters);
    const { auth } = usePage().props;
    const isArchive = context === "archive";
    const isDashboard = context === "dashboard";

    return (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="hidden grid-cols-12 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-600 md:grid">
                <div className="col-span-7">Surat</div>
                <div className="col-span-3">Pengirim</div>
                <div className="col-span-2 text-right">Aksi</div>
            </div>
            <div className="divide-y divide-gray-100">
                {rows.length ? (
                    rows.map((letter) => {
                        const summaryOnly = Boolean(letter.summary_only);
                        const isCreator = String(letter.created_by) === String(auth?.user?.id);
                        const actionUrl = letter.action_url || `/user/surat/${letter.letter_id || letter.id}`;
                        const sourceMeta = {
                            created: { label: "Buat Surat", tone: "blue" },
                            signature: { label: "Surat Masuk", tone: "amber" },
                            internal: { label: "Inbox Internal", tone: "blue" },
                            tebusan: { label: "Tebusan", tone: "green" },
                            disposisi: { label: "Disposisi", tone: "amber" },
                        }[letter.dashboard_badge || letter.source] || null;
                        const signatureMeta = {
                            ready: { label: "Butuh Tanda Tangan", tone: "amber" },
                            pending: { label: "Menunggu Giliran", tone: "gray" },
                            signed: { label: "Sudah Ditandatangani", tone: "green" },
                        }[letter.signature_request_status] || null;
                        return (
                            <div
                                key={letter.id}
                                className="grid gap-3 px-4 py-4 text-sm sm:px-5 md:grid-cols-12 md:items-center"
                            >
                                <div className="min-w-0 md:col-span-7">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                        {summaryOnly ? (
                                            <span className="min-w-0 break-words font-semibold text-gray-950">
                                                {letterDisplayNumber(letter)}
                                            </span>
                                        ) : (
                                            <Link
                                                href={actionUrl}
                                                className="min-w-0 break-words font-semibold text-gray-950 hover:text-emerald-700"
                                            >
                                                {letter.subject || letter.title || letterDisplayNumber(letter)}
                                            </Link>
                                        )}
                                        <Pill tone={letterTypeMeta(letter).tone}>
                                            {letterTypeMeta(letter).label}
                                        </Pill>
                                        {letter.status === "draft" ? <Pill tone="amber">Draft</Pill> : null}
                                        {isDashboard && letter.dashboard_badge === "signature" && signatureMeta ? (
                                            <Pill tone={signatureMeta.tone}>{signatureMeta.label}</Pill>
                                        ) : isDashboard && sourceMeta ? (
                                            <Pill tone={sourceMeta.tone}>{sourceMeta.label}</Pill>
                                        ) : null}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {letterDisplayNumber(letter)} ·{" "}
                                        {summaryOnly
                                            ? "Akses ringkasan"
                                            : isDashboard
                                              ? formatDate(letter.created_at)
                                              : `${formatDate(letter.created_at)} · ${letter.page_count || 1} halaman`}
                                    </div>
                                </div>
                                <div className="text-gray-700 md:col-span-3">
                                    {summaryOnly ? "-" : (letter.sender || letter.creator?.name || "-")}
                                </div>
                                <div className="md:col-span-2 md:text-right">
                                    {summaryOnly ? (
                                        <span className="text-xs text-gray-400">Tidak tersedia</span>
                                    ) : (
                                        <Link
                                            href={actionUrl}
                                            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-gray-50 px-4 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-emerald-700 md:w-auto md:p-2"
                                            title="Lihat detail"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span className="ml-2 text-sm font-semibold md:hidden">Detail</span>
                                        </Link>
                                    )}
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
                                    href={`/user/surat/${disposition.letter_id}`}
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
                            <div className="md:col-span-4 text-gray-600">
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
    const { approvalRequests, canCreateDocuments } = usePage().props;
    const rows = collection(approvalRequests);

    return (
        <>
            <Header
                title="Dokumen"
                description="Dokumen yang perlu, menunggu giliran, sudah ditandatangani, atau ditolak."
                actionHref={canCreateDocuments ? "/user/surat/create" : null}
                actionText="Buat Dokumen"
            />
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="hidden grid-cols-12 border-b border-gray-200 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase text-gray-600 md:grid">
                    <div className="col-span-7">Surat</div>
                    <div className="col-span-2">Pembuat</div>
                    <div className="col-span-2">Urutan</div>
                    <div className="col-span-1 text-right">Aksi</div>
                </div>
                <div className="divide-y divide-gray-100">
                    {rows.length ? (
                        rows.map((request) => {
                            const status = signatureStatusMeta(request.status);
                            return (
                                <div key={request.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-12 md:items-center">
                                    <div className="min-w-0 md:col-span-7">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Link href={`/user/approval/${request.id}`} className="font-semibold text-gray-950 hover:text-emerald-700">
                                                {request.letter?.subject || request.letter?.title || "Surat"}
                                            </Link>
                                            <Pill tone={status.tone}>{status.label}</Pill>
                                            {request.letter?.status === "draft" ? <Pill tone="amber">Draft</Pill> : null}
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            {letterDisplayNumber(request.letter)} · {formatDate(request.created_at)}
                                        </div>
                                    </div>
                                    <div className="text-gray-700 md:col-span-2">
                                        {request.letter?.creator?.name || "-"}
                                    </div>
                                    <div className="text-gray-700 md:col-span-2">
                                        Tanda tangan {request.signing_order}
                                    </div>
                                    <div className="md:col-span-1 md:text-right">
                                        <Link href={`/user/approval/${request.id}`} className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-emerald-700" title={approvalActionLabel(request)}>
                                            <Eye className="mr-1.5 h-4 w-4" />
                                            {approvalActionLabel(request)}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <EmptyState message="Tidak ada dokumen tanda tangan." />
                    )}
                </div>
                <Pagination meta={approvalRequests} />
            </div>
        </>
    );
}

function ApprovalDetailPage() {
    const { signatureRequest, letter, hasReadLetter, previewUrl, downloadOtpRequired = true, settings = {} } = usePage().props;
    const readForm = useForm({});
    const otpForm = useForm({});
    const approveForm = useForm({
        otp_code: "",
        signature_visual_type: "qr",
        signature_image: null,
        save_signature_specimen: false,
    });

    if (!signatureRequest || !letter) {
        return <EmptyState message="Permintaan approval tidak ditemukan." />;
    }

    const type = approvalTypeMeta(signatureRequest);
    const canAct = signatureRequest.status === "ready" && hasReadLetter;
    const otpRequired = Boolean(settings?.signature_otp_enabled);
    const approveOtpReady = !otpRequired || approveForm.data.otp_code.trim();

    const approve = async () => {
        if (!canAct || approveForm.processing || !approveOtpReady) return;
        approveForm.post(`/user/approval/${signatureRequest.id}/approve`, {
            preserveScroll: true,
            forceFormData: true,
            headers: await locationHeaders(),
        });
    };

    const markRead = () => {
        if (hasReadLetter || readForm.processing) return;
        readForm.post(`/user/approval/${signatureRequest.id}/read`, { preserveScroll: true });
    };

    const sendOtp = () => {
        if (!canAct || otpForm.processing) return;
        otpForm.post(`/user/approval/${signatureRequest.id}/otp`, { preserveScroll: true });
    };

    return (
        <>
            <Header
                title="Detail Approval"
                description={`${letterDisplayNumber(letter)} · ${type.label} ${signatureRequest.signing_order}`}
            />
            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-5 xl:col-span-7">
                    <Panel title="Preview Surat">
                        {previewUrl ? (
                            <PdfDocumentViewer fileUrl={previewUrl} className="h-[620px]" />
                        ) : (
                            <div className="text-sm text-gray-500">Preview PDF tidak tersedia.</div>
                        )}
                    </Panel>
                    {previewUrl ? (
                        <div className="flex justify-end">
                            <DocumentDownloadButton
                                otpUrl={`/user/surat/${letter.id}/download-otp`}
                                downloadUrl={`/user/surat/${letter.id}/download`}
                                otpRequired={downloadOtpRequired}
                                fileName={`${letter.letter_number || "dokumen"}.pdf`}
                            />
                        </div>
                    ) : null}
                </div>
                <div className="space-y-5 xl:col-span-5">
                    <Panel title="Informasi Approval">
                        <InfoGrid
                            rows={[
                                ["Nomor Surat", letterDisplayNumber(letter)],
                                ["Perihal", letter.subject || letter.title || "-"],
                                ["Pembuat", letter.creator?.name || "-"],
                                ["User Approval", signatureRequest.signer?.name || "-"],
                                ["Jenis", type.label],
                                ["Urutan", signatureRequest.signing_order],
                                ...(signatureRequest.approval_type === "paraf" ? [] : [["Halaman", signatureRequest.page_number]]),
                                ["Tanggal request", formatDate(signatureRequest.created_at)],
                                ...(signatureRequest.signed_at ? [["Disetujui", formatDate(signatureRequest.signed_at)]] : []),
                            ]}
                        />
                        {!hasReadLetter ? (
                            <button
                                type="button"
                                onClick={markRead}
                                disabled={readForm.processing}
                                className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500"
                            >
                                <Eye className="mr-2 h-4 w-4" />
                                Sudah Baca Dokumen
                            </button>
                        ) : null}
                        {!hasReadLetter && signatureRequest.status === "ready" ? (
                            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Baca dokumen dari preview PDF, lalu klik tombol Sudah Baca Dokumen sebelum tanda tangan.
                            </div>
                        ) : null}
                    </Panel>

                    {signatureRequest.status === "signed" ? (
                        <Panel title={type.doneTitle}>
                            <InfoGrid
                                rows={[
                                    ["Tanggal persetujuan", formatDate(signatureRequest.signed_at)],
                                    ...(signatureRequest.approval_type === "paraf" ? [] : [["Verifikasi", signatureRequest.verification_token ? "QR verifikasi tersedia" : "QR verifikasi belum tersedia"]]),
                                ]}
                            />
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                {type.doneMessage}
                            </div>
                        </Panel>
                    ) : null}

                    {signatureRequest.status === "pending" ? (
                        <Panel title="Menunggu Giliran">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                                Request ini belum bisa diproses karena masih menunggu approval sebelumnya menyetujui.
                            </div>
                        </Panel>
                    ) : null}

                    {signatureRequest.status === "ready" ? <Panel title="Keputusan">
                        {approveForm.errors.signature ? (
                            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {approveForm.errors.signature}
                            </div>
                        ) : null}
                        <SignatureVisualFields form={approveForm} />
                        {otpRequired ? (
                            <div className="mb-4 rounded-lg border border-sky-100 bg-sky-50 p-3">
                                <div className="text-sm font-semibold text-sky-900">OTP diperlukan untuk tanda tangan dokumen.</div>
                                <p className="mt-1 text-xs text-sky-800">Klik kirim OTP setelah dokumen ditandai sudah dibaca. Kode akan dikirim ke email Anda.</p>
                                <button
                                    type="button"
                                    onClick={sendOtp}
                                    disabled={!canAct || otpForm.processing}
                                    className="mt-3 inline-flex items-center rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Mail className="mr-2 h-4 w-4" />
                                    {otpForm.processing ? "Mengirim OTP..." : "Kirim OTP"}
                                </button>
                                {otpForm.errors.otp || otpForm.errors.email ? (
                                    <div className="mt-2 text-xs text-red-600">{otpForm.errors.otp || otpForm.errors.email}</div>
                                ) : null}
                            </div>
                        ) : null}
                        {otpRequired ? (
                            <div className="mb-4">
                                <label className="text-sm font-semibold text-gray-800">Kode OTP untuk persetujuan</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={approveForm.data.otp_code}
                                    onChange={(event) => approveForm.setData("otp_code", event.target.value)}
                                    className="mt-2 h-12 w-full rounded-lg border border-gray-300 px-4 py-3 text-base leading-none text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                    placeholder="Masukkan 6 digit OTP"
                                />
                                {approveForm.errors.otp_code ? <div className="mt-1 text-xs text-red-600">{approveForm.errors.otp_code}</div> : null}
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={approve}
                            disabled={!canAct || approveForm.processing || !approveOtpReady}
                            className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            <CheckCheck className="mr-2 h-4 w-4" />
                            {type.action}
                        </button>
                    </Panel> : null}
                </div>
            </div>
        </>
    );
}

function SignatureApprovalPanel({ request }) {
    const { settings = {} } = usePage().props;
    const otpForm = useForm({});
    const approveForm = useForm({
        otp_code: "",
        signature_visual_type: "qr",
        signature_image: null,
        save_signature_specimen: false,
    });
    const type = approvalTypeMeta(request);
    const canAct = request?.status === "ready";
    const otpRequired = Boolean(settings?.signature_otp_enabled);
    const approveOtpReady = !otpRequired || approveForm.data.otp_code.trim();

    if (!request) return null;

    const approve = async () => {
        if (!canAct || approveForm.processing || !approveOtpReady) return;
        approveForm.post(`/user/approval/${request.id}/approve`, {
            preserveScroll: true,
            forceFormData: true,
            headers: await locationHeaders(),
        });
    };

    const sendOtp = () => {
        if (!canAct || otpForm.processing) return;
        otpForm.post(`/user/approval/${request.id}/otp`, { preserveScroll: true });
    };

    return (
        <Panel title="Approval Dokumen">
            <InfoGrid
                rows={[
                    ["User Approval", request.signer?.name || "-"],
                    ["Jenis", type.label],
                    ["Urutan", request.signing_order],
                    ...(request.approval_type === "paraf" ? [] : [["Halaman", request.page_number]]),
                    ...(request.signed_at ? [["Disetujui", formatDate(request.signed_at)]] : []),
                ]}
            />
            {request.status === "pending" ? (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {type.waiting} Request ini akan aktif setelah approval sebelumnya menyetujui.
                </div>
            ) : null}
            {request.status === "signed" ? (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {type.doneMessage}
                </div>
            ) : null}
            {approveForm.errors.signature ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {approveForm.errors.signature}
                </div>
            ) : null}
            {request.status === "ready" ? (
                <div className="mt-4 space-y-4">
                    <SignatureVisualFields form={approveForm} />
                    {otpRequired ? (
                        <div className="rounded-lg border border-sky-100 bg-sky-50 p-3">
                            <div className="text-sm font-semibold text-sky-900">OTP diperlukan untuk tanda tangan dokumen.</div>
                            <p className="mt-1 text-xs text-sky-800">Kode OTP dikirim ke email Anda dan berlaku 10 menit.</p>
                            <button
                                type="button"
                                onClick={sendOtp}
                                disabled={!canAct || otpForm.processing}
                                className="mt-3 inline-flex items-center rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Mail className="mr-2 h-4 w-4" />
                                {otpForm.processing ? "Mengirim OTP..." : "Kirim OTP"}
                            </button>
                            {otpForm.errors.otp || otpForm.errors.email ? (
                                <div className="mt-2 text-xs text-red-600">{otpForm.errors.otp || otpForm.errors.email}</div>
                            ) : null}
                        </div>
                    ) : null}
                    {otpRequired ? (
                        <div>
                            <label className="text-sm font-semibold text-gray-800">Kode OTP untuk persetujuan</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={approveForm.data.otp_code}
                                onChange={(event) => approveForm.setData("otp_code", event.target.value)}
                                className="mt-2 h-12 w-full rounded-lg border border-gray-300 px-4 py-3 text-base leading-none text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-emerald-500"
                                placeholder="Masukkan 6 digit OTP"
                            />
                            {approveForm.errors.otp_code ? <div className="mt-1 text-xs text-red-600">{approveForm.errors.otp_code}</div> : null}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={approve}
                        disabled={approveForm.processing || !approveOtpReady}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                        <CheckCheck className="mr-2 h-4 w-4" />
                        {type.action}
                    </button>
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
                    URL={mode === "tebusan" ? "/user/inbox/tebusan" : mode === "disposisi" ? "/user/disposisi" : "/user/inbox/internal"}
                    filters={mode === "disposisi" ? [
                        { key: "from_user_ids", label: "Pengirim", options: filterOptions.users || [] },
                    ] : [
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

function SignatureVisualFields({ form }) {
    const { auth } = usePage().props;
    const hasSavedSpecimen = Boolean(auth?.user?.signature_specimen_path);
    const visualType = form.data.signature_visual_type || "qr";

    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-sm font-semibold text-gray-900">Visual Tanda Tangan</div>
            <div className="mt-3 grid gap-2">
                {[
                    ["qr", "QR Code Sistem", "Sistem menempel QR verifikasi di dokumen."],
                    ["saved_signature", "Spesimen Tersimpan", hasSavedSpecimen ? "Gunakan gambar tanda tangan yang sudah tersimpan." : "Belum ada spesimen tersimpan."],
                    ["uploaded_signature", "Upload Gambar", "Upload gambar tanda tangan untuk dokumen ini."],
                ].map(([value, label, description]) => (
                    <label key={value} className={`flex items-start gap-3 rounded-lg border bg-white px-3 py-2 text-sm ${visualType === value ? "border-emerald-300" : "border-gray-200"} ${value === "saved_signature" && !hasSavedSpecimen ? "opacity-60" : ""}`}>
                        <input
                            type="radio"
                            name="signature_visual_type"
                            value={value}
                            checked={visualType === value}
                            disabled={value === "saved_signature" && !hasSavedSpecimen}
                            onChange={() => form.setData("signature_visual_type", value)}
                            className="mt-1 border-gray-300 text-emerald-700 focus:ring-emerald-600"
                        />
                        <span>
                            <span className="font-semibold text-gray-900">{label}</span>
                            <span className="block text-xs text-gray-500">{description}</span>
                        </span>
                    </label>
                ))}
            </div>

            {visualType === "uploaded_signature" ? (
                <div className="mt-3 space-y-3">
                    <label className="block text-sm font-semibold text-gray-800">
                        Gambar Tanda Tangan
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={(event) => form.setData("signature_image", event.target.files?.[0] || null)}
                            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={Boolean(form.data.save_signature_specimen)}
                            onChange={(event) => form.setData("save_signature_specimen", event.target.checked)}
                            className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
                        />
                        Simpan sebagai spesimen saya
                    </label>
                </div>
            ) : null}

            {form.errors.signature_visual_type ? <div className="mt-2 text-xs text-red-600">{form.errors.signature_visual_type}</div> : null}
            {form.errors.signature_image ? <div className="mt-2 text-xs text-red-600">{form.errors.signature_image}</div> : null}
        </div>
    );
}

function CreatePage() {
    const pageProps = usePage().props;
    const {
        targetOptions = {},
        errors: serverErrors = {},
    } = pageProps;
    const isInternal = true;
    const supportsDraftSend = true;
    const pageConfig = {
        internal: {
            title: "Buat Dokumen",
            description:
                "Kirim dokumen internal berbasis scan PDF.",
            submitUrl: "/user/surat/internal",
            submitText: "Kirim Dokumen",
        },
    }.internal || {
        title: "Buat Dokumen",
        description:
            "Kirim dokumen internal berbasis scan PDF.",
        submitUrl: "/user/surat/internal",
        submitText: "Kirim Dokumen",
    };
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [clientErrors, setClientErrors] = useState([]);
    const [signaturePlacementActive, setSignaturePlacementActive] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        submit_action: "send",
        signature_flow: "sequential",
        letter_type_id: "",
        letter_number: "",
        subject: "",
        scan_file: null,
        targets: [],
        cc_targets: [],
        signature_requests: [],
        payload: { notes: "" },
    });
    const formErrors = { ...serverErrors, ...errors };

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

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
        return requests.map((request, index) => ({
            ...request,
            approval_type: "signature",
            signing_order: index + 1,
            signature_number: index + 1,
        }));
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

    async function submit(e, action = "send") {
        e.preventDefault();
        setClientErrors([]);
        if (isInternal && action === "send") {
            if (!data.signature_requests.length) {
                const message = "Tambahkan minimal satu penanda tangan.";
                setClientErrors([message]);
                window.alert(message);
                return;
            }

            const invalidSignature = data.signature_requests.find((request) => !request.signer_user_id || !request.page_number || request.x === undefined || request.y === undefined || !request.width || !request.height);
            if (invalidSignature) {
                const message = "Pilih user dan posisi QR untuk semua penanda tangan.";
                setClientErrors([message]);
                window.alert(message);
                return;
            }
        }
        setSubmitting(true);
        let csrfToken = "";

        try {
            csrfToken = await freshCsrfToken();
        } catch (error) {
            const message = error?.message || "Token keamanan tidak tersedia. Muat ulang halaman lalu coba lagi.";
            setClientErrors([message]);
            window.alert(message);
            setSubmitting(false);
            return;
        }

        router.post(pageConfig.submitUrl, { ...data, submit_action: action }, {
            forceFormData: true,
            preserveScroll: true,
            headers: {
                "X-CSRF-TOKEN": csrfToken,
            },
            onError: (validationErrors) => {
                const messages = Object.values(validationErrors || {}).flat().filter(Boolean);
                const message = messages[0] || "Form gagal disimpan. Periksa kembali input yang wajib diisi.";
                setClientErrors([message]);
                window.alert(message);
            },
            onSuccess: (page) => {
                const nextUrl = page?.url || "";
                const isDetailPage = /^\/user\/surat\/\d+/.test(nextUrl);

                if (isDetailPage) {
                    reset();
                    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl("");
                }
            },
            onCancel: () => {
                setClientErrors(["Pengiriman dokumen dibatalkan."]);
            },
            onException: (event) => {
                const status = event?.detail?.response?.status;
                const message = status === 419
                    ? "Sesi atau token keamanan kedaluwarsa. Muat ulang halaman lalu coba lagi."
                    : status === 403
                      ? "Akses membuat dokumen ditolak. Pastikan akun Anda diberi izin membuat dokumen."
                      : "Terjadi gangguan server saat menyimpan dokumen. Data belum disimpan.";

                setClientErrors([message]);
                window.alert(message);
                event?.preventDefault?.();
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
                        <Field
                            label="Nomor Dokumen"
                            value={data.letter_number}
                            onChange={(value) => setData("letter_number", value)}
                            error={formErrors.letter_number}
                            placeholder="Opsional, jika sudah ada nomor"
                        />
                        <Field
                            label="Perihal"
                            value={data.subject}
                            onChange={(value) => setData("subject", value)}
                            error={formErrors.subject}
                            placeholder="Perihal surat"
                        />
                        <SelectField
                            label="Alur Tanda Tangan"
                            value={data.signature_flow}
                            onChange={(value) => setData("signature_flow", value)}
                            options={[
                                { id: "sequential", name: "Berurutan" },
                                { id: "parallel", name: "Tidak Berurutan" },
                            ]}
                            error={formErrors.signature_flow}
                            noPlaceholder
                        />
                    </div>

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
                                        Hanya file PDF. Aplikasi tidak membatasi ukuran file.
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
                            href="/user/surat"
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
                            {submitting ? "Menyimpan..." : pageConfig.submitText}
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
                    <h2 className="text-sm font-semibold text-gray-950">Tanda Tangan</h2>
                    <p className="mt-1 text-xs leading-5 text-gray-500">
                        Pilih penanda tangan dan tempatkan QR pada PDF.
                    </p>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
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
                    {placementActive ? "Batal tambah titik TTD" : "Tambah penanda tangan"}
                </button>
            </div>
            {!pdfReady ? (
                <div className="mt-2 text-xs text-gray-500">Upload PDF dulu untuk mengaktifkan penempatan tanda tangan QR.</div>
            ) : placementActive ? (
                <div className="mt-2 text-xs text-amber-700">Mode tambah TTD aktif. Klik satu posisi di preview PDF. Setelah titik dibuat, mode akan mati agar PDF bisa discroll lagi.</div>
            ) : (
                <div className="mt-2 text-xs text-gray-500">PDF bisa discroll normal.</div>
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
                                User Approval
                                <select
                                    value={request.signer_user_id || ""}
                                    onChange={(event) => onUpdate(request.local_id, { signer_user_id: event.target.value })}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                >
                                    <option value="">Pilih user</option>
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
                            {`Posisi: ${(request.x * 100).toFixed(1)}%, ${(request.y * 100).toFixed(1)}% · Ukuran: ${(request.width * 100).toFixed(1)}% x ${(request.height * 100).toFixed(1)}%`}
                        </div>
                        {errors[`signature_requests.${index}.signer_user_id`] ? (
                            <div className="mt-2 text-xs text-red-600">{errors[`signature_requests.${index}.signer_user_id`]}</div>
                        ) : null}
                    </div>
                )) : (
                    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                        Belum ada penanda tangan. Upload PDF lalu klik area preview untuk menambah tanda tangan QR.
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailPage() {
    const {
        letter,
        targetOptions = {},
        activeSignatureRequest,
        auth,
        previewUrl,
        hasPreview,
        downloadOtpRequired = true,
    } = usePage().props;

    if (!letter) {
        return (
            <EmptyState message="Dokumen tidak ditemukan atau Anda tidak memiliki akses." />
        );
    }

    const businessType = businessLetterType(letter);
    const canDeleteDraft =
        letter.status === "draft" &&
        String(letter.created_by) === String(auth?.user?.id);
    const canUploadRevision = false;

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
                            if (confirm("Hapus draft dokumen ini?")) {
                                router.delete(`/user/surat/${letter.id}`);
                            }
                        }}
                        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 sm:w-auto"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hapus Draft
                    </button>
                </div>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-12">
                <div className="space-y-5 xl:col-span-8">
                    <Panel title="Preview Surat">
                        {hasPreview ? (
                            <PdfDocumentViewer fileUrl={previewUrl || `/user/surat/${letter.id}/preview`} className="h-[520px] md:h-[680px]" />
                        ) : (
                            <div className="text-sm text-gray-500">
                                Preview tidak tersedia.
                            </div>
                        )}
                    </Panel>
                    {hasPreview ? (
                        <DocumentDownloadButton
                            otpUrl={`/user/surat/${letter.id}/download-otp`}
                            downloadUrl={`/user/surat/${letter.id}/download`}
                            otpRequired={downloadOtpRequired}
                            fileName={`${letter.letter_number || "dokumen"}.pdf`}
                            className="w-full justify-center"
                        />
                    ) : null}
                </div>

                <div className="space-y-5 xl:col-span-4">
                    <Panel title="Metadata Dokumen">
                        {letter.status === "draft" ? (
                            <div className="mb-4 flex flex-wrap gap-2">
                                <Pill tone="amber">Draft</Pill>
                            </div>
                        ) : null}
                        <InfoGrid
                            rows={[
                                ["Nomor", letter.letter_number || "-"],
                                ["Diinput oleh", letter.creator?.name || "-"],
                                ["Tanggal input", formatInputDate(letter.created_at)],
                                ["Jam input", formatInputTime(letter.created_at)],
                                ...(letter.payload?.notes
                                    ? [["Catatan", letter.payload.notes]]
                                    : []),
                            ]}
                        />
                    </Panel>

                    {businessType === "internal" ? (
                        <ApprovalHistoryPanel letter={letter} />
                    ) : null}

                    {activeSignatureRequest ? (
                        <SignatureApprovalPanel request={activeSignatureRequest} />
                    ) : null}
                </div>
            </div>
        </>
    );
}

function ApprovalHistoryPanel({ letter }) {
    const requests = letter.signature_requests || [];

    if (!requests.length) {
        return (
            <Panel title="Approval Dokumen">
                <div className="text-sm text-gray-500">Belum ada approval dokumen.</div>
            </Panel>
        );
    }

    return (
        <Panel title="Approval Dokumen">
            <div className="space-y-3">
                {requests.map((request) => {
                    const type = approvalTypeMeta(request);

                    return (
                        <div key={request.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <div className="font-semibold text-gray-950">
                                        {type.label} {request.signing_order}: {request.signer?.name || "-"}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Halaman {request.page_number} · Posisi {(Number(request.x) * 100).toFixed(1)}%, {(Number(request.y) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                {request.signed_at ? `Ditandatangani ${formatDate(request.signed_at)}` : `Dibuat ${formatDate(request.created_at)}`}
                            </div>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}

function normalizeRevisionRequests(requests) {
    return requests.map((request, index) => ({
        ...request,
        approval_type: "signature",
        signing_order: index + 1,
        signature_number: index + 1,
    }));
}

function RevisionUploadPanel({ letter, targetOptions }) {
    const form = useForm({
        revision_flow: "reuse",
        scan_file: null,
        signature_requests: [],
    });
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
    const [signaturePlacementActive, setSignaturePlacementActive] = useState(false);

    useEffect(() => {
        return () => {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        };
    }, [pdfPreviewUrl]);

    const handleFile = (file) => {
        if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
        if (!file) {
            form.setData("scan_file", null);
            setPdfPreviewUrl("");
            return;
        }
        form.setData("scan_file", file);
        setPdfPreviewUrl(URL.createObjectURL(file));
    };

    const addSignature = (placement) => {
        if (!signaturePlacementActive) return;
        const signer = (targetOptions.users || [])[0];
        form.setData("signature_requests", normalizeRevisionRequests([
            ...form.data.signature_requests,
            {
                local_id: `${Date.now()}-${form.data.signature_requests.length}`,
                approval_type: "signature",
                signer_user_id: signer?.id || "",
                page_number: placement.page_number,
                x: placement.x,
                y: placement.y,
                width: placement.width,
                height: placement.height,
            },
        ]));
        setSignaturePlacementActive(false);
    };

    const updateRequest = (localId, values) => {
        form.setData("signature_requests", form.data.signature_requests.map((request) => (
            request.local_id === localId ? { ...request, ...values } : request
        )));
    };

    const removeRequest = (localId) => {
        form.setData("signature_requests", normalizeRevisionRequests(form.data.signature_requests.filter((request) => request.local_id !== localId)));
    };

    const moveRequest = (localId, nextOrder) => {
        const currentIndex = form.data.signature_requests.findIndex((request) => request.local_id === localId);
        if (currentIndex < 0) return;

        const reordered = [...form.data.signature_requests];
        const [item] = reordered.splice(currentIndex, 1);
        reordered.splice(Math.max(0, Number(nextOrder) - 1), 0, item);
        form.setData("signature_requests", normalizeRevisionRequests(reordered));
    };

    const submit = (event) => {
        event.preventDefault();
        form.post(`/user/surat/${letter.id}/revisi-pdf`, { preserveScroll: true });
    };

    return (
        <Panel title="Upload PDF Revisi">
            <form onSubmit={submit} className="space-y-4">
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                    Tanda tangan dokumen ditolak. Upload PDF terbaru untuk menjalankan ulang alur tanda tangan.
                </div>
                <label className="block text-sm font-semibold text-gray-900">
                    PDF revisi
                    <input
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(event) => handleFile(event.target.files?.[0])}
                        className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                    {form.errors.scan_file ? <span className="mt-1 block text-xs text-red-600">{form.errors.scan_file}</span> : null}
                </label>
                <label className="block text-sm font-semibold text-gray-900">
                    Alur tanda tangan
                    <select
                        value={form.data.revision_flow}
                        onChange={(event) => form.setData({ ...form.data, revision_flow: event.target.value, signature_requests: [] })}
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                        <option value="reuse">Gunakan alur tanda tangan sebelumnya</option>
                        <option value="reset">Atur ulang tanda tangan</option>
                    </select>
                </label>

                {form.data.revision_flow === "reset" ? (
                    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
                        <SignatureRequestPanel
                            requests={form.data.signature_requests}
                            signerOptions={targetOptions.users || []}
                            errors={form.errors}
                            onUpdate={updateRequest}
                            onRemove={removeRequest}
                            onMove={moveRequest}
                            placementActive={signaturePlacementActive}
                            setPlacementActive={setSignaturePlacementActive}
                            pdfReady={Boolean(pdfPreviewUrl)}
                        />
                        {pdfPreviewUrl ? (
                            <PdfSignaturePlacement
                                fileUrl={pdfPreviewUrl}
                                requests={form.data.signature_requests}
                                placementActive={signaturePlacementActive}
                                onAdd={addSignature}
                                onUpdate={updateRequest}
                                onPlacementComplete={() => setSignaturePlacementActive(false)}
                            />
                        ) : (
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                                Upload PDF revisi terlebih dahulu untuk menempatkan TTD QR.
                            </div>
                        )}
                    </div>
                ) : null}

                {form.errors.signature_requests ? <div className="text-xs text-red-600">{form.errors.signature_requests}</div> : null}
                <button disabled={form.processing || !form.data.scan_file} className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Revisi
                </button>
            </form>
        </Panel>
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
        form.post(`/user/surat/${letter.id}/publish`, {
            preserveScroll: true,
            onSuccess: () => form.reset("targets"),
        });
    };

    const revokeTarget = (target) => {
        if (!confirm("Cabut publish ke target ini?")) return;

        router.delete(`/user/surat/${letter.id}/publish/${target.id}`, {
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
        replyForm.post(`/user/disposisi/${disposition.id}/balas`, {
            preserveScroll: true,
            onSuccess: () => replyForm.reset("note"),
        });
    };
    const submitForward = (event) => {
        event.preventDefault();
        forwardForm.post(`/user/surat/${letterId}/disposisi`, {
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

function RootDispositionForm({ form, targetOptions, targetTypes, onSubmit }) {
    const options = optionsByType(form.data.target_type, targetOptions);

    return (
        <Panel title="Input Disposisi">
            <form onSubmit={onSubmit} className="space-y-3">
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
                        <option value="">Pilih tujuan disposisi</option>
                        {options.map((option) => (
                            <option key={`${form.data.target_type}-${option.id}`} value={option.id}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <textarea
                    rows={3}
                    value={form.data.note}
                    onChange={(event) => form.setData("note", event.target.value)}
                    placeholder="Catatan disposisi"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                {form.errors.target_id || form.errors.target_type || form.errors.note ? (
                    <div className="text-xs text-red-600">
                        {form.errors.target_id || form.errors.target_type || form.errors.note}
                    </div>
                ) : null}
                <button
                    disabled={form.processing || !form.data.target_id}
                    className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                    <Send className="mr-2 h-4 w-4" />
                    Kirim Disposisi
                </button>
            </form>
        </Panel>
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
    const currentCategory = new URLSearchParams(window.location.search).get("category") || "";
    const categoryTabs = [
        { id: "", name: "Semua" },
        ...(filterOptions.letterCategories || []),
    ];

    function categoryHref(category) {
        const params = new URLSearchParams(window.location.search);
        if (category) {
            params.set("category", category);
        } else {
            params.delete("category");
        }

        return `/user/arsip${params.toString() ? `?${params.toString()}` : ""}`;
    }

    return (
        <>
            <Header
                title="Arsip Saya"
                description="Surat yang Anda buat, terima, baca, atau menjadi target disposisi."
            />
            <div className="mb-4 flex flex-wrap gap-2">
                {categoryTabs.map((tab) => {
                    const active = currentCategory === tab.id;
                    return (
                        <Link
                            key={tab.id || "all"}
                            href={categoryHref(tab.id)}
                            preserveScroll
                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                active
                                    ? "bg-emerald-700 text-white"
                                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            }`}
                        >
                            {tab.name}
                        </Link>
                    );
                })}
            </div>
            <div className="mb-5 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <Search
                    URL={`/user/arsip${currentCategory ? `?category=${currentCategory}` : ""}`}
                    filters={[
                        { key: "creator_ids", label: "Pembuat", options: filterOptions.users || [] },
                    ]}
                />
            </div>
            <LetterList
                letters={letters}
                emptyText="Arsip pribadi masih kosong."
                context="archive"
            />
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
            <div className="border-b border-gray-200 px-4 py-3 text-sm font-semibold text-gray-950 sm:px-5 sm:py-4">
                {title}
            </div>
            <div className="p-4 sm:p-5">{children}</div>
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
    const title = section === "detail" ? "Detail Dokumen" : "Portal User";

    return (
        <LayoutUser>
            <Head title={title} />
            {section === "dashboard" ? <Dashboard /> : null}
            {section === "inbox" ? <InboxPage mode={mode} /> : null}
            {section === "documents" ? <ApprovalPage /> : null}
            {section === "create" ? <CreatePage /> : null}
            {section === "archive" ? <ArchivePage /> : null}
            {section === "approval" ? <ApprovalPage /> : null}
            {section === "approval_detail" ? <ApprovalDetailPage /> : null}
            {section === "detail" ? <DetailPage /> : null}
        </LayoutUser>
    );
}
