// import useState dan useEffect
import { useState, useEffect } from "react";

// import Head, useForm dan Link dari Inertia
import { Head, useForm, Link } from "@inertiajs/react";

// import LayoutAdmin
import LayoutAdmin from "@/Layouts/LayoutAdmin";

// import icons
import { Save } from "lucide-react";

// import component Letter Editor
import LetterEditor from "./Components/LetterEditor";

// import component Letter Preview
import LetterPreview from "./Components/LetterPreview";

// import employee variable
import { employeeVariables } from './constant/employee';

// import company variable
import { companyVariables } from './constant/company';
import { documentVariables } from './constant/document';

export default function Edit({ template }) {

    // useForm untuk mengelola form data
    const { data, setData, post, processing, errors } = useForm({
        name: template.name,
        description: template.description,
        category: template.category || "both",
        content_template: template.content_template || "",
        status: template.status,
        extra_fields: template.extra_fields || [],
        _method: 'PUT',
    });

    // state untuk extra fields
    const [extraFields, setExtraFields] = useState(
        template.extra_fields || []
    );
    const [pageCount, setPageCount] = useState(1);

    // set data extra fields
    useEffect(() => {
        setData('extra_fields', extraFields);
    }, [extraFields]);

    // function "handleSubmit"
    const handleSubmit = (e) => {
        e.preventDefault();

        // kirim data ke server
        post(`/admin/letter-templates/${template.id}`);
    };

    return (
        <>
            <Head title={`Edit Template Surat - ${import.meta.env.VITE_APP_NAME}`} />
            <LayoutAdmin>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* LEFT: EDITOR */}
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <form onSubmit={handleSubmit}>
                            <div className="space-y-6">

                                {/* Nama Surat */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Surat <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`w-full px-4 py-2 border rounded-lg ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                    />
                                </div>

                                {/* Extra Fields */}
                                <section className="border border-gray-200 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-gray-800">
                                            Input Tambahan (Diisi Saat Pengajuan)
                                        </h3>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExtraFields([
                                                    ...extraFields,
                                                    {
                                                        key: '',
                                                        label: '',
                                                        type: 'text',
                                                        required: false,
                                                    },
                                                ])
                                            }
                                            className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700"
                                        >
                                            + Tambah Input
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {extraFields.length === 0 && (
                                            <p className="text-xs text-gray-500 italic">
                                                Tidak ada input tambahan
                                            </p>
                                        )}

                                        {extraFields.map((field, index) => (
                                            <div
                                                key={index}
                                                className="grid grid-cols-12 gap-4 items-start border border-gray-300 p-3 rounded-xl"
                                            >
                                                <div className="col-span-4 space-y-1">
                                                    <input
                                                        type="text"
                                                        placeholder="Label (contoh: Keperluan Surat)"
                                                        value={field.label}
                                                        onChange={(e) => {
                                                            const updated = [...extraFields];
                                                            const label = e.target.value;

                                                            updated[index].label = label;
                                                            updated[index].key = label
                                                                .toLowerCase()
                                                                .replace(/[^a-z0-9\s]/g, '')
                                                                .trim()
                                                                .replace(/\s+/g, '_');

                                                            setExtraFields(updated);
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    />

                                                    <div className="pl-1">
                                                        <p className="text-[11px] text-gray-500 mb-1">
                                                            Variable yang dihasilkan:
                                                        </p>
                                                        <input
                                                            type="text"
                                                            value={field.key}
                                                            readOnly
                                                            className="w-full px-2 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs bg-gray-50 text-gray-600 cursor-not-allowed"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) => {
                                                            const updated = [...extraFields];
                                                            updated[index].type = e.target.value;
                                                            setExtraFields(updated);
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="textarea">Textarea</option>
                                                        <option value="date">Tanggal</option>
                                                        <option value="number">Angka</option>
                                                    </select>
                                                </div>

                                                <div className="col-span-2 pt-2">
                                                    <label className="flex items-center gap-2 text-sm h-full">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.required}
                                                            onChange={(e) => {
                                                                const updated = [...extraFields];
                                                                updated[index].required = e.target.checked;
                                                                setExtraFields(updated);
                                                            }}
                                                            className="w-4 h-4"
                                                        />
                                                        <span>Wajib</span>
                                                    </label>
                                                </div>

                                                <div className="col-span-1 pt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setExtraFields(extraFields.filter((_, i) => i !== index))
                                                        }
                                                        className="text-red-600 hover:text-red-800 text-sm hover:underline"
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>

                                                <div className="col-span-12 mt-2 p-3 bg-blue-50 rounded-lg">
                                                    <p className="text-xs text-gray-600">
                                                        <span className="font-medium">Cara penggunaan:</span> Gunakan <code className="px-2 py-1 bg-white border border-gray-300 rounded text-red-600">{`{{${field.key || 'key'}}}`}</code> di template surat untuk menampilkan data ini
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <LetterEditor
                                    value={data.content_template}
                                    onChange={(value) => setData("content_template", value)}
                                    employeeVariables={employeeVariables}
                                    companyVariables={companyVariables}
                                    documentVariables={documentVariables}
                                />

                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                                    Jumlah halaman preview: {pageCount}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Dipakai Untuk
                                    </label>
                                    <select
                                        value={data.category}
                                        onChange={(e) => setData('category', e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                    >
                                        <option value="both">Surat Internal dan Surat Keluar</option>
                                        <option value="internal">Surat Internal</option>
                                        <option value="outgoing">Surat Keluar</option>
                                    </select>
                                    {errors.category && (
                                        <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Status
                                    </label>
                                    <div className="flex space-x-4">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                value="active"
                                                checked={data.status === 'active'}
                                                onChange={(e) => setData('status', e.target.value)}
                                                className="h-4 w-4 text-blue-600"
                                            />
                                            <span className="ml-2">Aktif</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                value="inactive"
                                                checked={data.status === 'inactive'}
                                                onChange={(e) => setData('status', e.target.value)}
                                                className="h-4 w-4 text-blue-600"
                                            />
                                            <span className="ml-2">Nonaktif</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Deskripsi */}
                                <textarea
                                    rows={3}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />

                                {/* Action */}
                                <div className="flex justify-start space-x-3 pt-6 border-t border-gray-200">
                                    <Link
                                        href="/admin/letter-templates"
                                        className="px-6 py-2.5 border rounded-lg"
                                    >
                                        Batal
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {processing ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                </div>

                            </div>
                        </form>
                    </div>

                    {/* RIGHT: PREVIEW */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-300">
                        <LetterPreview
                            html={data.content_template}
                            metadata={{
                                subject: data.name || "Perihal Nota Dinas",
                                page_count: pageCount,
                            }}
                            onPageCountChange={(count) => setPageCount((current) => current === count ? current : count)}
                        />
                    </div>
                </div>

            </LayoutAdmin>
        </>
    );
}
