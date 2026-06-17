import { Head, usePage } from "@inertiajs/react";
import ApplicationLogo from "@/Components/ApplicationLogo";
import { companyName } from "@/Utils/appIdentity";
import { CheckCircle2 } from "lucide-react";

function formatDate(value) {
    if (!value) return "-";
    return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(value));
}

function letterDisplayNumber(letter) {
    if (!letter) return "-";
    return letter.letter_number || letter.reference || "-";
}

export default function SignatureVerification({ signature, letter }) {
    const { settings } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-100 px-4 py-10">
            <Head title="Verifikasi Tanda Tangan" />
            <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <ApplicationLogo className="h-10 w-10" iconClassName="h-5 w-5" />
                        <div>
                            <div className="text-sm font-bold uppercase text-gray-950">{companyName(settings)}</div>
                            <div className="text-xs text-gray-500">Verifikasi Tanda Tangan Elektronik</div>
                        </div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="mb-5 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                        <CheckCircle2 className="h-5 w-5" />
                        <div className="text-sm font-semibold">Tanda tangan QR valid dan tercatat di sistem.</div>
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Nomor Surat</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{letterDisplayNumber(letter)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Kode Teknis</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{letter?.reference || "-"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-xs font-semibold uppercase text-gray-500">Perihal</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{letter?.subject || letter?.title || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Signer</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{signature?.signer?.name || signature?.signer?.username || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Jabatan</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{signature?.signer?.position || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Status</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{signature?.status === "signed" ? "Disetujui" : signature?.status || "-"}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-semibold uppercase text-gray-500">Tanggal Tanda Tangan</dt>
                            <dd className="mt-1 font-semibold text-gray-950">{formatDate(signature?.signed_at)}</dd>
                        </div>
                        {signature?.note ? (
                            <div className="sm:col-span-2">
                                <dt className="text-xs font-semibold uppercase text-gray-500">Catatan Persetujuan</dt>
                                <dd className="mt-1 whitespace-pre-line font-semibold text-gray-950">{signature.note}</dd>
                            </div>
                        ) : null}
                    </dl>
                </div>
            </div>
        </div>
    );
}
