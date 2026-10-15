"use client";
// The model runtime (transformers.js, also inside kokoro-js) stores every downloaded file in the Cache API under
// this name, keyed by its Hugging Face URL. Reading that cache tells us what is already on this device.
const CACHE = "transformers-cache";

/** "onnx-community/whisper-base" from https://huggingface.co/onnx-community/whisper-base/resolve/main/onnx/x.onnx */
const modelOf = (url: string) => {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : url;
};

async function entries() {
  if (typeof caches === "undefined") return [];
  try { return await (await caches.open(CACHE)).keys(); } catch { return []; }
}

/** True when this model's weights are already downloaded, so loading it costs no network. */
export async function hasModel(id: string) {
  return (await entries()).some((r) => r.url.endsWith(".onnx") && modelOf(r.url) === id);
}

export type CachedModel = { id: string; bytes: number | null; files: number };

/** Models stored on this device with their size (null when the CDN didn't send a length). */
export async function cachedModels(): Promise<CachedModel[]> {
  const cache = typeof caches === "undefined" ? null : await caches.open(CACHE).catch(() => null);
  if (!cache) return [];
  const byModel = new Map<string, CachedModel>();
  for (const req of await cache.keys()) {
    const id = modelOf(req.url);
    const m = byModel.get(id) ?? { id, bytes: 0, files: 0 };
    m.files++;
    const len = Number((await cache.match(req))?.headers.get("content-length"));
    m.bytes = m.bytes === null || !len ? (req.url.endsWith(".onnx") ? null : m.bytes) : m.bytes + len;
    byModel.set(id, m);
  }
  return [...byModel.values()].filter((m) => m.files > 0).sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
}

export async function deleteModel(id: string) {
  const cache = await caches.open(CACHE);
  await Promise.all((await cache.keys()).filter((r) => modelOf(r.url) === id).map((r) => cache.delete(r)));
}

/** Total bytes this site stores on the device (models, saved audio, notes). */
export async function storageUsage() {
  try { return (await navigator.storage.estimate()).usage ?? 0; } catch { return 0; }
}
