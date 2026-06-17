import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const DEFAULT_SIGNATURE_SIZE = {
    width: 0.18,
    height: 0.08,
};

export default function PdfSignaturePlacement({
    fileUrl,
    requests = [],
    placementActive = false,
    onAdd,
    onUpdate,
    onPlacementComplete,
}) {
    const signatureRequests = requests.filter((request) => (request.approval_type || "signature") === "signature");
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pageNumbers, setPageNumbers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        let loadingTask = null;

        setPdfDocument(null);
        setPageNumbers([]);
        setError("");

        if (!fileUrl) return undefined;

        setLoading(true);
        loadingTask = pdfjs.getDocument(fileUrl);

        loadingTask.promise
            .then((document) => {
                if (cancelled) return;
                setPdfDocument(document);
                setPageNumbers(Array.from({ length: document.numPages }, (_, index) => index + 1));
            })
            .catch(() => {
                if (!cancelled) setError("PDF gagal dimuat untuk preview tanda tangan.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            loadingTask?.destroy?.();
        };
    }, [fileUrl]);

    function addAtPosition(pageNumber, event) {
        if (!placementActive) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width - DEFAULT_SIGNATURE_SIZE.width / 2, 0), 1 - DEFAULT_SIGNATURE_SIZE.width);
        const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height - DEFAULT_SIGNATURE_SIZE.height / 2, 0), 1 - DEFAULT_SIGNATURE_SIZE.height);

        onAdd?.({
            page_number: pageNumber,
            x,
            y,
            width: DEFAULT_SIGNATURE_SIZE.width,
            height: DEFAULT_SIGNATURE_SIZE.height,
        });
        onPlacementComplete?.();
    }

    if (!fileUrl) {
        return (
            <div className="flex h-[520px] items-center justify-center bg-gray-50 px-5 text-center text-sm text-gray-500 md:h-[720px]">
                Pilih file PDF untuk melihat preview.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-[520px] items-center justify-center bg-gray-50 px-5 text-center text-sm text-gray-500 md:h-[720px]">
                Memuat PDF...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-[520px] items-center justify-center bg-red-50 px-5 text-center text-sm text-red-700 md:h-[720px]">
                {error}
            </div>
        );
    }

    return (
        <div className="h-[520px] overflow-auto bg-gray-100 px-3 py-4 md:h-[720px]">
            <div className="space-y-5">
                {pageNumbers.map((pageNumber) => (
                    <PdfPage
                        key={pageNumber}
                        pdfDocument={pdfDocument}
                        pageNumber={pageNumber}
                        requests={signatureRequests.filter((request) => Number(request.page_number) === pageNumber)}
                        placementActive={placementActive}
                        onPageClick={addAtPosition}
                        onUpdate={onUpdate}
                    />
                ))}
            </div>
        </div>
    );
}

function PdfPage({ pdfDocument, pageNumber, requests, placementActive, onPageClick, onUpdate }) {
    const canvasRef = useRef(null);
    const pageRef = useRef(null);
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
    const [draggingId, setDraggingId] = useState(null);

    useEffect(() => {
        let cancelled = false;
        let renderTask = null;

        async function renderPage() {
            if (!pdfDocument || !canvasRef.current) return;
            const page = await pdfDocument.getPage(pageNumber);
            if (cancelled) return;

            const viewport = page.getViewport({ scale: 1.45 });
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");
            const pixelRatio = window.devicePixelRatio || 1;

            canvas.width = Math.floor(viewport.width * pixelRatio);
            canvas.height = Math.floor(viewport.height * pixelRatio);
            canvas.style.width = `${viewport.width}px`;
            canvas.style.height = `${viewport.height}px`;
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
            setPageSize({ width: viewport.width, height: viewport.height });

            renderTask = page.render({ canvasContext: context, viewport });
            await renderTask.promise;
        }

        renderPage();

        return () => {
            cancelled = true;
            renderTask?.cancel?.();
        };
    }, [pdfDocument, pageNumber]);

    function moveDragged(event) {
        if (!draggingId) return;
        const request = requests.find((item) => item.local_id === draggingId);
        const bounds = pageRef.current?.getBoundingClientRect();
        if (!request || !bounds) return;

        const x = Math.min(Math.max((event.clientX - bounds.left) / bounds.width - request.width / 2, 0), 1 - request.width);
        const y = Math.min(Math.max((event.clientY - bounds.top) / bounds.height - request.height / 2, 0), 1 - request.height);
        onUpdate?.(request.local_id, { x, y, page_number: pageNumber });
    }

    return (
        <div className="mx-auto w-fit">
            <div className="mb-2 text-center text-xs font-semibold text-gray-500">Halaman {pageNumber}</div>
            <div
                ref={pageRef}
                className={`relative overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 ${placementActive ? "cursor-crosshair" : ""}`}
                style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}
                onClick={(event) => onPageClick(pageNumber, event)}
                onPointerMove={moveDragged}
                onPointerUp={() => setDraggingId(null)}
                onPointerLeave={() => setDraggingId(null)}
            >
                <canvas ref={canvasRef} className="block" />
                <div className={`absolute inset-0 ${placementActive ? "pointer-events-auto" : "pointer-events-none"}`}>
                    {requests.map((request) => (
                        <button
                            key={request.local_id}
                            type="button"
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                setDraggingId(request.local_id);
                            }}
                            onClick={(event) => event.stopPropagation()}
                            className="pointer-events-auto absolute rounded-lg border-2 border-emerald-700 bg-emerald-100/80 px-2 py-1 text-left text-[11px] font-semibold text-emerald-950 shadow-sm"
                            style={{
                                left: `${request.x * 100}%`,
                                top: `${request.y * 100}%`,
                                width: `${request.width * 100}%`,
                                height: `${request.height * 100}%`,
                            }}
                        >
                            TTD {request.signature_number || request.signing_order}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
