import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import Search from "@/Shared/Search";
import { Eye, Plus } from "lucide-react";

export default function LettersIndex() {
    const { letters, type, typeLabel, filterOptions = {} } = usePage().props;
    const isArchive = type === "archive";
    const isIncomingExternal = type === "incoming_external";
    const searchUrl = isArchive ? "/admin/surat/arsip" : type === "incoming_external" ? "/admin/surat/masuk-eksternal" : type === "outgoing" ? "/admin/surat/keluar" : "/admin/surat/internal";

    return (
        <>
            <Head title={`${typeLabel} - Admin`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-gray-950">{typeLabel}</h1>
                            <p className="mt-2 text-sm text-gray-600">{isArchive ? "Surat hasil scan yang hanya disimpan sebagai arsip di sistem." : "Daftar surat berbasis data nyata."}</p>
                        </div>
                        {isArchive ? (
                            <Link href="/admin/surat/create/arsip" className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"><Plus className="mr-2 h-4 w-4" />Upload Scan</Link>
                        ) : isIncomingExternal ? (
                            <Link href="/admin/surat/create/masuk-eksternal" className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"><Plus className="mr-2 h-4 w-4" />Input Surat Eksternal</Link>
                        ) : (
                            <Link href={`/admin/surat/create/${type === "outgoing" ? "keluar" : "internal"}`} className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"><Plus className="mr-2 h-4 w-4" />Buat Surat</Link>
                        )}
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL={searchUrl} filters={[
                            { key: "letter_type_ids", label: "Jenis Surat", options: filterOptions.letterTypes || [] },
                            { key: "methods", label: "Metode", options: filterOptions.methods || [] },
                            { key: "statuses", label: "Status", options: filterOptions.statuses || [] },
                            { key: "creator_ids", label: "Pembuat", options: filterOptions.creators || [] },
                        ]} />
                        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                            <table className="min-w-[820px] divide-y divide-gray-200">
                                <thead className="bg-gray-50"><tr>{["Surat", "Metode", "Halaman", "Status", "Pembuat", "Aksi"].map((h) => <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">{h}</th>)}</tr></thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(letters.data || []).map((letter) => (
                                        <tr key={letter.id}>
                                            <td className="px-5 py-4"><div className="font-semibold text-gray-950 break-words">{letter.subject}</div><div className="text-xs text-gray-500 break-words">{isIncomingExternal ? (letter.letter_number || "-") : `${letter.reference} · ${letter.letter_number || "-"}`}</div></td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letter.creation_method}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letter.page_count || 1}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letter.status}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{letter.creator?.name || "-"}</td>
                                            <td className="px-5 py-4"><Link href={`/admin/surat/${letter.id}`} className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-700"><Eye className="h-4 w-4" /></Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-4"><Pagination links={letters.links} /></div>
                    </div>
                </div>
            </LayoutAdmin>
        </>
    );
}
