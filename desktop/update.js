// Release check against GitHub. The app's UI is the live website (always current); only the native shell needs
// reinstalling, which is rare, so a notification + link to the download page is enough (no auto-installer).
const API = "https://api.github.com/repos/LovekeshAnand/Kelados/releases/latest";

/** True when version `a` (e.g. "1.2.0" or "v1.2.0") is newer than `b`. */
export function isNewer(a, b) {
  const p = (v) => String(v).replace(/^v/, "").split("-")[0].split(".").map((n) => Number(n) || 0);
  const [x, y] = [p(a), p(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
}

/** The newer release's tag, or null (also null when offline or rate-limited; it simply tries again later). */
export async function latestIfNewer(current) {
  try {
    const r = await fetch(API, { headers: { accept: "application/vnd.github+json" } });
    if (!r.ok) return null;
    const { tag_name } = await r.json();
    return tag_name && isNewer(tag_name, current) ? tag_name : null;
  } catch {
    return null;
  }
}
