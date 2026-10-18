"use client";
import { useEffect } from "react";
import { useLocal, writeLocal } from "./local-store";

export type Theme = "dark" | "light";
const KEY = "kelados:theme";

/** Black by default. Every page on this origin (the app window and the dictation overlay) follows the choice. */
export function useTheme() {
  const theme = useLocal<Theme>(KEY, "dark");
  useEffect(() => {
    if (theme === "light") document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    // In the desktop app, the window's own title bar buttons follow along.
    (window as unknown as { kelados?: { theme?: (t: Theme) => void } }).kelados?.theme?.(theme);
  }, [theme]);
  return [theme, (t: Theme) => writeLocal(KEY, t)] as const;
}

// Runs before paint (inlined in <head>), so a light-theme page never flashes black.
export const THEME_SCRIPT = `try{if(JSON.parse(localStorage.getItem("${KEY}"))==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export function ThemeSync() {
  useTheme();
  return null;
}
