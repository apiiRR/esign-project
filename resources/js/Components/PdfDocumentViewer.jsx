import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function PdfDocumentViewer({ fileUrl, className = "h-[620px]" }) {
    const containerRef = useRef(null);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pageNumbers, setPageNumbers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [scale, setScale] = useState(() => (typeof window !== "undefined" && window.innerWidth < 640 ? 0.72 : 1.35));
    const [fullscreen, setFullscreen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let loadingTask = null;

        setPdfDocument(null);
        setPageNumbers([]);
        setError("");

        if (!fileUrl) return undefined;

        setLoading(true);
        loadingTask = pdfjs.getDocument({
            url: fileUrl,
            withCredentials: true,
        });

        loadingTask.promise
            .then((document) => {
                if (cancelled) return;
                setPdfDocument(document);
                setPageNumbers(Array.from({ length: document.numPages }, (_, index) => index + 1));
            })
            .catch(() => {
                if (!cancelled) setError("Preview dokumen gagal dimuat.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
            loadingTask?.destroy?.();
        };
    }, [fileUrl]);

    if (!fileUrl) {
        return <ViewerState className={className} message="Preview tidak tersedia." />;
    }

    if (loading) {
        return <ViewerState className={className} message="Memuat dokumen..." />;
    }

    if (error) {
        return <ViewerState className={className} message={error} tone="red" />;
    }

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
            await containerRef.current.requestFullscreen();
            setFullscreen(true);
            return;
        }

        if (document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen();
            setFullscreen(false);
            return;
        }

        setFullscreen((value) => !value);
    };

    return (
        <div ref={containerRef} className={`${fullscreen ? "fixed inset-0 z-50 bg-gray-100 p-4" : ""}`}>
            <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-end gap-2 rounded-lg bg-gray-100/95 py-2">
                <IconButton label="Zoom out" onClick={() => setScale((value) => Math.max(0.7, Number((value - 0.15).toFixed(2))))}><ZoomOut className="h-4 w-4" /></IconButton>
                <IconButton label="Reset zoom" onClick={() => setScale(typeof window !== "undefined" && window.innerWidth < 640 ? 0.72 : 1.35)}><RotateCcw className="h-4 w-4" /></IconButton>
                <IconButton label="Zoom in" onClick={() => setScale((value) => Math.min(2.4, Number((value + 0.15).toFixed(2))))}><ZoomIn className="h-4 w-4" /></IconButton>
                <IconButton label={fullscreen ? "Keluar fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
                    {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </IconButton>
            </div>
            <div className={`${fullscreen ? "h-[calc(100vh-5rem)]" : `${className} max-sm:h-[70vh]`} overflow-auto rounded-lg border border-gray-200 bg-gray-100 px-2 py-3 sm:px-3 sm:py-4`}>
                <div className="space-y-5">
                {pageNumbers.map((pageNumber) => (
                    <PdfPage key={pageNumber} pdfDocument={pdfDocument} pageNumber={pageNumber} scale={scale} />
                ))}
                </div>
            </div>
        </div>
    );
}

function IconButton({ label, onClick, children }) {
    return (
        <button type="button" onClick={onClick} title={label} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
            {children}
        </button>
    );
}

function ViewerState({ className, message, tone = "gray" }) {
    const colors = tone === "red" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-500";

    return (
        <div className={`${className} flex items-center justify-center rounded-lg border border-gray-200 px-5 text-center text-sm ${colors}`}>
            {message}
        </div>
    );
}

function PdfPage({ pdfDocument, pageNumber, scale }) {
    const canvasRef = useRef(null);
    const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

    useEffect(() => {
        let cancelled = false;
        let renderTask = null;

        async function renderPage() {
            if (!pdfDocument || !canvasRef.current) return;

            const page = await pdfDocument.getPage(pageNumber);
            if (cancelled) return;

            const viewport = page.getViewport({ scale });
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
    }, [pdfDocument, pageNumber, scale]);

    return (
        <div className="mx-auto w-fit max-w-full select-none">
            <div className="mb-2 text-center text-xs font-semibold text-gray-500">Halaman {pageNumber}</div>
            <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200" style={{ width: pageSize.width || undefined, height: pageSize.height || undefined }}>
                <canvas ref={canvasRef} className="block" />
            </div>
        </div>
    );
}
