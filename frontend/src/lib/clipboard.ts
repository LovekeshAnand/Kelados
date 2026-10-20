"use client";
/** Copy text: the browser clipboard, or the desktop app's own clipboard if the page isn't allowed to write. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const app = (window as unknown as { kelados?: { copy?: (t: string) => void } }).kelados;
    if (!app?.copy) throw new Error("the clipboard isn't available here");
    app.copy(text);
  }
}
