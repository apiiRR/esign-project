import { Head, Link, usePage } from "@inertiajs/react";
import LayoutAdmin from "@/Layouts/LayoutAdmin";
import Pagination from "@/Shared/Pagination";
import Search from "@/Shared/Search";
import { Eye, Plus } from "lucide-react";

export default function LettersIndex() {
    const { letters, type, typeLabel, filterOptions = {} } = usePage().props;
    const searchUrl = "/admin/surat/internal";

    return (
        <>
            <Head title={`${typeLabel} - Admin`} />
            <LayoutAdmin>
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-gray-950">{typeLabel}</h1>
                            <p className="mt-2 text-sm text-gray-600">Daftar dokumen internal berbasis data nyata.</p>
                        </div>
                        <Link href="/admin/surat/create/internal" className="inline-flex w-full items-center justify-center rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"><Plus className="mr-2 h-4 w-4" />Buat Dokumen</Link>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                        <Search URL={searchUrl} filters={[
                            { key: "creator_ids", label: "Pembuat", options: filterOptions.creators || [] },
                        ]} />
                        <div className="mt-5 grid gap-3 md:hidden">
                            {(letters.data || []).map((letter) => (
                                <div key={letter.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="break-words font-semibold text-gray-950">{letter.subject}</div>
                                        {letter.status === "draft" ? <DraftBadge /> : null}
                                    </div>
                                    <div className="mt-1 break-words text-xs text-gray-500">{letter.letter_number || "-"}</div>
                                    <div className="mt-3 grid gap-3 text-sm">
                                        <div>
                                            <div className="text-xs font-semibold uppercase text-gray-500">Pembuat</div>
                                            <div className="mt-1 break-words text-gray-700">{letter.creator?.name || "-"}</div>
                                        </div>
                                    </div>
                                    <Link href={`/admin/surat/${letter.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700">
                                        <Eye className="mr-2 h-4 w-4" />
                                        Detail
                                    </Link>
                                </div>
                            ))}
                        </div>
                        <div className="mt-5 hidden overflow-x-auto rounded-lg border border-gray-200 md:block">
                            <table className="w-full min-w-[900px] table-fixed divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="w-[52%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Dokumen</th>
                                        <th className="w-[12%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Halaman</th>
                                        <th className="w-[28%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Pembuat</th>
                                        <th className="w-[8%] px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {(letters.data || []).map((letter) => (
                                        <tr key={letter.id}>
                                            <td className="w-[52%] px-5 py-4"><div className="flex min-w-0 flex-wrap items-center gap-2"><div className="min-w-0 break-words font-semibold text-gray-950">{letter.subject}</div>{letter.status === "draft" ? <DraftBadge /> : null}</div><div className="min-w-0 break-words text-xs text-gray-500">{letter.letter_number || "-"}</div></td>
                                            <td className="w-[12%] px-5 py-4 text-sm text-gray-600">{letter.page_count || 1}</td>
                                            <td className="w-[28%] px-5 py-4 text-sm text-gray-600"><div className="min-w-0 break-words">{letter.creator?.name || "-"}</div></td>
                                            <td className="w-[8%] px-5 py-4"><Link href={`/admin/surat/${letter.id}`} className="inline-flex rounded-lg bg-blue-50 p-2 text-blue-700"><Eye className="h-4 w-4" /></Link></td>
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

function DraftBadge() {
    return <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Draft</span>;
}
