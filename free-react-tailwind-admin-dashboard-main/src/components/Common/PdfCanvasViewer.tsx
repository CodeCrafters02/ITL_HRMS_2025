import { useEffect, useRef, useState } from 'react';

/** Renders a PDF blob to canvases with pdf.js (iframe/blob PDF viewers are blocked inside Microsoft Teams). */
const PdfCanvasViewer = ({ blob }: { blob: Blob }) => {
    const hostRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        (async () => {
            try {
                const pdfjs = await import('pdfjs-dist');
                const worker = (await import('pdfjs-dist/build/pdf.worker.min.js?url')).default;
                pdfjs.GlobalWorkerOptions.workerSrc = worker;
                const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
                const host = hostRef.current;
                if (cancelled || !host) return;
                host.innerHTML = '';
                const cssWidth = Math.max(280, host.clientWidth - 24);
                const dpr = window.devicePixelRatio || 1;
                for (let i = 1; i <= doc.numPages; i++) {
                    const page = await doc.getPage(i);
                    if (cancelled) return;
                    const base = page.getViewport({ scale: 1 });
                    const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = `${cssWidth}px`;
                    canvas.style.height = `${viewport.height / dpr}px`;
                    canvas.className = 'mx-auto mb-3 shadow rounded bg-white';
                    host.appendChild(canvas);
                    await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
                }
                if (!cancelled) setStatus('ready');
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [blob]);

    return (
        <div className="min-h-full bg-slate-100 p-3">
            {status === 'loading' && <p className="p-6 text-center text-sm text-slate-400">Rendering document...</p>}
            {status === 'error' && <p className="p-6 text-center text-sm font-semibold text-rose-600">Could not render this PDF. Use Download to open it.</p>}
            <div ref={hostRef} />
        </div>
    );
};

export default PdfCanvasViewer;
