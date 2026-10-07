"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "kelados:token";

export type User = { id: string; email: string; name: string; createdAt: string };
export type Preset = { _id: string; name: string; voice: string; speed: number; color: string };
export type Rule = { from: string; to: string };
export type Block = { _id?: string; text: string; voice: string; speed: number; pauseAfter: number };
export type Project = { _id: string; title: string; kind: "audiobook" | "podcast" | "voiceover" | "other"; blocks: Block[]; updatedAt: string; createdAt: string };
export type ProjectSummary = Omit<Project, "blocks"> & { blockCount: number; characters: number };
export type ApiKey = { _id: string; name: string; prefix: string; createdAt: string; lastUsedAt?: string };

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      ...init,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
      headers: {
        ...(init.json !== undefined && { "content-type": "application/json" }),
        ...(token && { authorization: `Bearer ${token}` }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Can't reach the Kelados API. Check your connection.");
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error || `Request failed (${res.status})`);
  return body as T;
}

type Auth = {
  user: User | null;
  ready: boolean;
  presets: Preset[];
  lexicon: Rule[];
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshWorkspace: () => Promise<void>;
  setUser: (u: User) => void;
};

const AuthCtx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [lexicon, setLexicon] = useState<Rule[]>([]);

  const refreshWorkspace = useCallback(async () => {
    const w = await api<{ presets: Preset[]; lexicon: Rule[] }>("/api/v1/workspace");
    setPresets(w.presets);
    setLexicon(w.lexicon);
  }, []);

  const logout = useCallback(() => {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setUser(null); setPresets([]); setLexicon([]);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (getToken()) {
          const { user } = await api<{ user: User }>("/api/auth/me");
          setUser(user);
          await refreshWorkspace();
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) logout();
      }
      setReady(true);
    })();
  }, [refreshWorkspace, logout]);

  const accept = async ({ token, user }: { token: string; user: User }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(user);
    await refreshWorkspace().catch(() => {});
  };

  const value: Auth = {
    user, ready, presets, lexicon, logout, refreshWorkspace, setUser,
    login: async (email, password) => accept(await api("/api/auth/login", { method: "POST", json: { email, password } })),
    register: async (name, email, password) => accept(await api("/api/auth/register", { method: "POST", json: { name, email, password } })),
  };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}

/** Fire-and-forget usage log for signed-in users (powers the dashboard + public counter). */
export function reportUsage(characters: number, seconds: number) {
  if (getToken()) api("/api/usage", { method: "POST", json: { characters, seconds, source: "web" } }).catch(() => {});
}
