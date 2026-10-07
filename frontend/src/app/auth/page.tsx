"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/api";
import { Logo } from "@/components/Nav";
import { btn, input } from "@/components/ui";

function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(params.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/dashboard/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      router.push(next);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <section className="mx-auto flex min-h-[75vh] max-w-sm flex-col justify-center px-5 py-16">
      <div className="flex justify-center"><Logo /></div>
      <h1 className="mt-8 text-center text-2xl font-semibold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-2 text-center text-sm text-muted">
        {mode === "login" ? "Sign in to sync projects, presets and API keys." : "Free forever. Generating speech never needs an account."}
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === "register" && <input className={input} placeholder="Name" value={form.name} onChange={set("name")} required maxLength={80} autoComplete="name" />}
        <input className={input} type="email" placeholder="Email" value={form.email} onChange={set("email")} required autoComplete="email" />
        <input className={input} type="password" placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} required minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"} />
        {error && <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{error}</p>}
        <button className={`${btn("primary", "md")} w-full`} disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <button className="text-fg underline underline-offset-2" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </section>
  );
}

export default function AuthPage() {
  return <Suspense><AuthForm /></Suspense>;
}
