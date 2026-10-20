"use client";
// What the radial menu does with a piece of text. Format actions return new text; the rest save a file, open an app
// or speak, and return a short message for the toast.
import { encodeWav } from "@/lib/audio";
import { copyText } from "@/lib/clipboard";
import { synthesize } from "@/lib/engine/tts";
import { readAloud } from "@/lib/reader";
import { docx, pdf } from "@/lib/exportFormats";
import { refine, toBullets, toEmail, toNumbered, toParagraph } from "@/lib/speech/format";

/** `suggest`: show the new text for the person to accept or discard instead of applying it. */
export type ActionResult = { text?: string; message: string; suggest?: boolean };
export type Action = { id: string; label: string; run: (text: string) => ActionResult | Promise<ActionResult> };
export type Segment = { id: "share" | "convert" | "format" | "listen"; label: string; actions: Action[] };

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");

/** Hand a file to the browser's save flow (the desktop app shows a Save dialog). */
export function saveFile(data: Blob, name: string) {
  const url = URL.createObjectURL(data);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const FONT = `"Manrope", "Segoe UI", "Nirmala UI", "Mangal", system-ui, sans-serif`;

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
  }
  return out;
}

/** Text drawn onto white pages: A4 proportions (1240×1754 at 150 dpi) for PDF, or one tall page for an image. */
function render(text: string, page: "a4" | "fit") {
  const W = 1240, PAD = 110, SIZE = 34, LH = SIZE * 1.55;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `500 ${SIZE}px ${FONT}`;
  const all = wrap(ctx, text.replace(/^- /gm, "•  "), W - PAD * 2);
  const perPage = page === "a4" ? Math.floor((1754 - PAD * 2) / LH) : all.length;
  const pages: HTMLCanvasElement[] = [];
  for (let i = 0; i < Math.max(1, all.length); i += perPage) {
    const c = document.createElement("canvas");
    const chunk = all.slice(i, i + perPage);
    c.width = W;
    c.height = page === "a4" ? 1754 : Math.max(600, Math.ceil(chunk.length * LH + PAD * 2));
    const g = c.getContext("2d")!;
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#18181b"; g.font = `500 ${SIZE}px ${FONT}`; g.textBaseline = "top";
    chunk.forEach((l, k) => g.fillText(l, PAD, PAD + k * LH));
    pages.push(c);
  }
  return pages;
}

const jpeg = (c: HTMLCanvasElement) => new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), "image/jpeg", 0.92));

export const SEGMENTS: Segment[] = [
  { id: "share", label: "Share", actions: [
    { id: "email", label: "Email", run: (t) => {
      // A Gmail compose window in the browser with the text filled in; the person adds the recipient. Gmail takes long
      // bodies, but very long links can fail, so the full text is on the clipboard as well.
      copyText(t).catch(() => {});
      const subject = t.split("\n")[0].replace(/^[-•\d.)\s]+/, "").slice(0, 70);
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(t.slice(0, 6000))}`, "_blank");
      return { message: "Opened a new email with your text" };
    } },
    { id: "whatsapp", label: "WhatsApp", run: (t) => {
      // The desktop app asks the system whether WhatsApp is installed and opens it, or WhatsApp Web. In a browser tab,
      // WhatsApp's own page offers both.
      const app = (window as unknown as { kelados?: { whatsapp?: (text: string) => void } }).kelados;
      if (app?.whatsapp) app.whatsapp(t);
      else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(t.slice(0, 4000))}`, "_blank");
      return { message: "Opened WhatsApp with your text" };
    } },
    { id: "copy", label: "Copy", run: async (t) => { await copyText(t); return { message: "Copied" }; } },
  ] },
  { id: "convert", label: "Convert", actions: [
    { id: "pdf", label: "PDF", run: async (t) => {
      const pages = await Promise.all(render(t, "a4").map(async (c) => ({ jpeg: new Uint8Array(await (await jpeg(c)).arrayBuffer()), width: c.width, height: c.height })));
      saveFile(new Blob([pdf(pages) as BlobPart], { type: "application/pdf" }), `kelados-${stamp()}.pdf`);
      return { message: "Saved as PDF" };
    } },
    { id: "jpg", label: "JPG", run: async (t) => { saveFile(await jpeg(render(t, "fit")[0]), `kelados-${stamp()}.jpg`); return { message: "Saved as an image" }; } },
    { id: "word", label: "Word", run: (t) => {
      saveFile(new Blob([docx(t) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), `kelados-${stamp()}.docx`);
      return { message: "Saved as a Word document" };
    } },
    { id: "txt", label: "Text", run: (t) => { saveFile(new Blob([t], { type: "text/plain" }), `kelados-${stamp()}.txt`); return { message: "Saved as text" }; } },
  ] },
  { id: "format", label: "Format", actions: [
    { id: "bullets", label: "Bullets", run: (t) => ({ text: toBullets(t), message: "Made bullet points" }) },
    { id: "numbered", label: "Numbered", run: (t) => ({ text: toNumbered(t), message: "Made a numbered list" }) },
    { id: "paragraph", label: "Paragraph", run: (t) => ({ text: toParagraph(t), message: "Joined into a paragraph" }) },
    { id: "email", label: "Email", run: (t) => ({ text: toEmail(t), message: "Shaped as an email" }) },
    { id: "refine", label: "Refine", run: (t) => ({ text: refine(t), message: "Refined", suggest: true }) },
  ] },
  { id: "listen", label: "Listen", actions: [
    // The reader bar on the page shows progress and a Stop button, so no toast is needed.
    { id: "read", label: "Read aloud", run: (t) => { readAloud(t); return { message: "" }; } },
    { id: "audio", label: "Save audio", run: async (t) => {
      const chunks = await synthesize(t, { voice: "af_heart", speed: 1 });
      const rate = chunks[0]?.sampleRate ?? 24000;
      const all = new Float32Array(chunks.reduce((n, c) => n + c.audio.length, 0));
      let o = 0;
      for (const c of chunks) { all.set(c.audio, o); o += c.audio.length; }
      saveFile(encodeWav(all, rate), `kelados-${stamp()}.wav`);
      return { message: "Saved as audio" };
    } },
  ] },
];
