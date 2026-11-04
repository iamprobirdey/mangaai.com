"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePages, setCover } from "./actions";

const PAGE_WIDTH = 1400; // px; large enough for tablets, small enough for phones on 4G
const WEBP_QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality),
  );
}

export function CoverUploader({ seriesId }: { seriesId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onFile(file: File) {
    setStatus("Uploading…");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${seriesId}/${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("covers").upload(path, file, { contentType: file.type, upsert: true });
    if (error) return setStatus(`Upload failed: ${error.message}`);
    await setCover(seriesId, path);
    setStatus("Cover updated.");
    router.refresh();
  }

  return (
    <div className="mt-3">
      <label className="btn w-full cursor-pointer">
        Upload cover
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {status ? <p className="hint mt-2" role="status">{status}</p> : null}
    </div>
  );
}

/**
 * Turns a chapter PDF into page images in the browser (pdf.js → canvas → WebP), uploads them to the
 * private `pages` bucket, and keeps the original PDF in the private `originals` bucket. Readers never get the PDF.
 */
export function ChapterUploader({ chapterId, hasPages }: { chapterId: string; hasPages: boolean }) {
  const router = useRouter();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const busy = progress !== null && progress.done < progress.total;

  async function onFile(file: File) {
    setMessage({});
    if (file.type !== "application/pdf") return setMessage({ error: "Choose a PDF file." });
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const supabase = createClient();
      const stamp = Date.now();
      setProgress({ done: 0, total: doc.numPages });

      await supabase.storage.from("originals").upload(`${chapterId}.pdf`, file, { contentType: "application/pdf", upsert: true });

      const rows: { page_number: number; image_path: string; width: number; height: number }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PAGE_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
        const path = `${chapterId}/${String(i).padStart(3, "0")}-${stamp}.webp`;
        const { error } = await supabase.storage.from("pages").upload(path, blob, { contentType: "image/webp", upsert: true });
        if (error) throw new Error(`Page ${i}: ${error.message}`);
        rows.push({ page_number: i, image_path: path, width: canvas.width, height: canvas.height });
        page.cleanup();
        setProgress({ done: i, total: doc.numPages });
      }
      const result = await savePages(chapterId, rows);
      setMessage(result);
      router.refresh();
    } catch (e) {
      setProgress(null);
      setMessage({ error: e instanceof Error ? e.message : "Upload failed." });
    }
  }

  return (
    <div>
      <label className={`btn btn-primary cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {hasPages ? "Replace pages from a PDF" : "Upload chapter PDF"}
        <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {progress ? (
        <div className="mt-3">
          <div className="h-3 overflow-hidden rounded-full border-2 border-ink bg-paper">
            <div className="h-full bg-sun" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="hint mt-1" role="status">
            {busy ? `Converting page ${progress.done + 1} of ${progress.total}…` : `${progress.total} pages converted.`}
          </p>
        </div>
      ) : null}
      {message.error ? <p role="alert" className="mt-2 font-bold text-alert">{message.error}</p> : null}
      {message.ok ? <p role="status" className="mt-2 font-bold text-leaf">{message.ok}</p> : null}
      <p className="hint mt-2">Keep this tab open until it finishes. Uploading new pages sends the chapter back to review.</p>
    </div>
  );
}
