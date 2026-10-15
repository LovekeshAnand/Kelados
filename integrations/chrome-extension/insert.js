// Injected into the page with chrome.scripting.executeScript, so it must be self-contained (no closures).
// Types `text` at the caret of whatever field the user was in, the way each kind of editor expects it.
export function insertText(text) {
  const paste = (target) => {
    const data = new DataTransfer();
    data.setData("text/plain", text);
    return !target.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  };

  // Google Docs draws its own canvas; keystrokes go to a hidden iframe whose paste handler inserts at the cursor.
  const docs = document.querySelector(".docs-texteventtarget-iframe");
  if (docs?.contentDocument) {
    const target = docs.contentDocument.activeElement || docs.contentDocument.body;
    paste(target);
    return { ok: true };
  }

  // Follow focus into shadow roots and same-origin iframes.
  let el = document.activeElement;
  for (;;) {
    if (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
    else if (el instanceof HTMLIFrameElement) { try { el = el.contentDocument.activeElement; } catch { break; } }
    else break;
  }
  if (!el || el === document.body) return { ok: false, error: "click into a text field first" };
  const doc = el.ownerDocument;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    // execCommand keeps the field's undo history and fires the input events frameworks listen for.
    if (!doc.execCommand("insertText", false, text)) {
      el.setRangeText(text, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, "end");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return { ok: true };
  }
  if (el.isContentEditable) {
    // Gmail, Notion, ProseMirror, Lexical…: native insert first, synthetic paste as the fallback.
    if (!doc.execCommand("insertText", false, text)) paste(el);
    return { ok: true };
  }
  return { ok: false, error: "the focused element doesn't accept text" };
}
