"use client";
import { useEffect } from "react";
import { API_URL } from "@/lib/api";

type Gtag = (...args: unknown[]) => void;

/**
 * Counts clicks on any element marked data-download="windows|mac|linux|chrome": an anonymous per-platform counter on
 * our API (sendBeacon survives the navigation to the file) plus a GA4 file_download event. One listener covers
 * server-rendered links and client buttons alike.
 */
export function DownloadTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("[data-download]");
      const platform = el?.getAttribute("data-download");
      if (!platform) return;
      try { navigator.sendBeacon(`${API_URL}/api/downloads/${platform}`); } catch {}
      (window as unknown as { gtag?: Gtag }).gtag?.("event", "file_download", { platform, method: el!.getAttribute("data-method") ?? "button" });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
