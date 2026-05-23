import { useEffect, useMemo, useRef } from "react";
import { usePage } from "@inertiajs/react";

const A4_HEIGHT = 1123;

function normalizeLines(value, fallback = "-") {
    if (!value) return [fallback];
    if (Array.isArray(value)) return value.filter(Boolean).length ? value.filter(Boolean) : [fallback];
    return String(value)
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .length
        ? String(value).split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
        : [fallback];
}

function replaceVariables(html, variables) {
    return Object.entries(variables).reduce((content, [key, value]) => {
        const text = Array.isArray(value) ? value.join("<br>") : value ?? "";
        return content.replaceAll(`{{${key}}}`, text);
    }, html || "");
}

export default function NotaDinasPreview({
    html = "",
    metadata = {},
    onPageCountChange,
    className = "",
}) {
    const { settings, auth } = usePage().props;
    const documentRef = useRef(null);

    const computed = useMemo(() => {
        const pageCount = Math.max(1, Number(metadata.page_count || metadata.pageCount || 1));
        const fallbackSender = auth?.user?.position || auth?.user?.name || "General Manager";

        return {
            letter_number: metadata.letter_number || "05-01/01/BDK/GM-1.3/II/2026",
            recipients: metadata.recipients || "Direktur Utama\nDirektur Keuangan\nDirektur Operasional",
            cc: metadata.cc || "General Manager Corporate Secretary & Social Responsibility\nGeneral Manager Internal Audit\nGeneral Manager Poultry Business",
            sender: metadata.sender || fallbackSender,
            subject: metadata.subject || "Persetujuan Kegiatan",
            letter_date: metadata.letter_date || new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
            attachment_page_count: `${pageCount} Halaman`,
            page_count: pageCount,
            company_name: settings?.company_name || "PT Berdikari",
            company_code: settings?.company_code || "BDK",
            app_name: settings?.app_name || "Surat & Arsip Digital",
            employee_name: auth?.user?.name || "",
            employee_username: auth?.user?.username || "",
            employee_email: auth?.user?.email || "",
            employee_position: auth?.user?.position || "",
            employee_directorate: auth?.user?.directorate?.name || "",
            employee_division: auth?.user?.division?.name || "",
            employee_department: auth?.user?.department?.name || "",
        };
    }, [metadata, settings, auth]);

    const renderedHtml = useMemo(() => replaceVariables(html, computed), [html, computed]);
    const recipients = normalizeLines(computed.recipients);
    const cc = normalizeLines(computed.cc, "-");

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            if (!documentRef.current) return;
            const height = documentRef.current.scrollHeight;
            const nextCount = Math.max(1, Math.ceil(height / A4_HEIGHT));
            onPageCountChange?.(nextCount);
        });

        return () => cancelAnimationFrame(frame);
    }, [renderedHtml, computed.letter_number, computed.recipients, computed.cc, computed.sender, computed.subject, computed.letter_date, onPageCountChange]);

    return (
        <div className={`overflow-auto bg-gray-300 p-5 ${className}`}>
            <div
                ref={documentRef}
                className="mx-auto bg-white px-[72px] py-[54px] text-black shadow print:shadow-none"
                style={{ width: 794, minHeight: A4_HEIGHT, fontFamily: '"Times New Roman", Times, serif' }}
            >
                <div className="relative min-h-[122px]">
                    <div className="absolute left-0 top-0 flex h-[92px] w-[150px] items-start justify-start">
                        {settings?.company_logo ? (
                            <img src={`/storage/settings/${settings.company_logo}`} alt={`Logo ${computed.company_name}`} className="max-h-full max-w-full object-contain" />
                        ) : (
                            <div className="text-left">
                                <div className="text-3xl font-bold italic text-sky-700">berdikari</div>
                                <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">{computed.company_name}</div>
                            </div>
                        )}
                    </div>

                    <div className="pt-[74px] text-center">
                        <div className="text-[22px] font-bold underline">Nota Dinas</div>
                        <div className="mt-1 text-[21px]">No.: {computed.letter_number}</div>
                    </div>
                </div>

                <div className="mt-12 space-y-3 text-[20px] leading-snug">
                    <MetaRows label="Kepada Yth" value={recipients} />
                    <MetaRows label="Tembusan" value={cc} numbered italic />
                    <MetaRows label="Dari" value={[computed.sender]} italic />
                    <MetaRows label="Perihal" value={[computed.subject]} />
                    <MetaRows label="Tanggal" value={[computed.letter_date]} />
                    <MetaRows label="Lampiran" value={[computed.attachment_page_count]} />
                </div>

                <div
                    className="prose prose-sm mt-10 max-w-none text-[18px] leading-relaxed prose-p:my-3 prose-ol:my-3 prose-ul:my-3"
                    dangerouslySetInnerHTML={{ __html: renderedHtml || "<p>Isi Nota Dinas...</p>" }}
                />
            </div>
        </div>
    );
}

function MetaRows({ label, value, numbered = false, italic = false }) {
    return (
        <div className="grid grid-cols-[170px_24px_1fr] gap-x-3">
            <div className="font-semibold">{label}</div>
            <div>:</div>
            <div className={italic ? "italic" : ""}>
                {value.map((line, index) => (
                    <div key={`${label}-${index}`} className="grid grid-cols-[38px_1fr]">
                        <span>{numbered ? `${index + 1}.` : ""}</span>
                        <span>{line}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
