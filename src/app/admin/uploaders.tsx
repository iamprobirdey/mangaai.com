"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePages, setCover, setVolumeCover } from "./actions";

const PAGE_WIDTH = 1400; // px; tablets and desktops
const PAGE_WIDTH_SM = 800; // px; phones — roughly a third of the bytes
const WEBP_QUALITY = 0.85;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode image"))), type, quality),
  );
}

const MAX_COVER_BYTES = 5 * 1024 * 1024;

/** Uploads a cover image for a series or for one volume. */
export function CoverUploader({ seriesId, volumeId, hasCover }: { seriesId?: string; volumeId?: string; hasCover?: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  async function onFile(file: File) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return setStatus("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_COVER_BYTES) return setStatus("That image is over 5 MB. Try a smaller one.");
    setStatus("Uploading…");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = volumeId ? `volumes/${volumeId}/${Date.now()}.${ext}` : `${seriesId}/${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("covers").upload(path, file, { contentType: file.type, upsert: true });
    if (error) return setStatus(`Upload failed: ${error.message}`);
    if (volumeId) await setVolumeCover(volumeId, path);
    else if (seriesId) await setCover(seriesId, path);
    setStatus("Cover updated.");
    router.refresh();
  }

  return (
    <div className="mt-3">
      <label className="btn w-full cursor-pointer">
        {hasCover ? "Replace cover" : "Upload cover"}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </label>
      {status ? <p className="hint mt-2" role="status">{status}</p> : null}
    </div>
  );
}

/**
 * Turns a volume PDF (one book) into page images in the browser (pdf.js → canvas → WebP), uploads them to the
 * private `pages` bucket, and keeps the original PDF in the private `originals` bucket. Readers never get the PDF.
 */
export function VolumeUploader({ chapterId, hasPages }: { chapterId: string; hasPages: boolean }) {
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

      const rows: {
        page_number: number;
        image_path: string;
        width: number;
        height: number;
        image_path_sm: string;
        width_sm: number;
        height_sm: number;
      }[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: PAGE_WIDTH / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        await page.render({ canvas, viewport }).promise;
        const small = document.createElement("canvas");
        small.width = PAGE_WIDTH_SM;
        small.height = Math.round((canvas.height * PAGE_WIDTH_SM) / canvas.width);
        const ctx = small.getContext("2d")!;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(canvas, 0, 0, small.width, small.height);

        const [blob, blobSm] = await Promise.all([
          canvasToBlob(canvas, "image/webp", WEBP_QUALITY),
          canvasToBlob(small, "image/webp", WEBP_QUALITY),
        ]);
        const name = `${chapterId}/${String(i).padStart(3, "0")}-${stamp}`;
        const [lg, sm] = await Promise.all([
          supabase.storage.from("pages").upload(`${name}.webp`, blob, { contentType: "image/webp", upsert: true }),
          supabase.storage.from("pages").upload(`${name}-sm.webp`, blobSm, { contentType: "image/webp", upsert: true }),
        ]);
        const error = lg.error ?? sm.error;
        if (error) throw new Error(`Page ${i}: ${error.message}`);
        rows.push({
          page_number: i,
          image_path: `${name}.webp`,
          width: canvas.width,
          height: canvas.height,
          image_path_sm: `${name}-sm.webp`,
          width_sm: small.width,
          height_sm: small.height,
        });
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
        {hasPages ? "Replace pages from a PDF" : "Upload book PDF"}
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
      <p className="hint mt-2">Keep this tab open until it finishes. Uploading a new PDF sends the volume back to review.</p>
    </div>
  );
}
