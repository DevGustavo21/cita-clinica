"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CLINIC } from "@/lib/config";

export default function DoctorLogin() {
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function login() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    setLoading(false);
    if (!res.ok) return setError("Clave incorrecta. Verifica e intenta de nuevo.");
    router.push("/doctor");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="fade-up w-full max-w-sm rounded-2xl border border-line bg-surface p-8 shadow-card">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary font-display text-xl font-bold text-white">+</span>
        <h1 className="mt-4 font-display text-2xl font-semibold">Panel del doctor</h1>
        <p className="mt-1 text-sm text-soft">{CLINIC.name}</p>

        <label htmlFor="key" className="mb-1.5 mt-6 block text-sm font-semibold">
          Clave de acceso
        </label>
        <input
          id="key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="••••••••"
        />
        {error && <p className="mt-2 text-xs font-medium text-danger">{error}</p>}

        <button
          onClick={login}
          disabled={loading || !key}
          className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary-deep disabled:opacity-60"
        >
          {loading ? "Verificando…" : "Entrar al panel"}
        </button>
      </div>
    </main>
  );
}
