"use client";

import { useState } from "react";
import { CLINIC } from "@/lib/config";

export default function CancelPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function cancel() {
    setState("loading");
    const res = await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelToken: params.token }),
    });
    setState(res.ok ? "done" : "error");
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="fade-up w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary font-display text-xl font-bold text-white">+</span>
        <h1 className="mt-4 font-display text-2xl font-semibold">{CLINIC.name}</h1>

        {state === "idle" && (
          <>
            <p className="mt-3 text-soft">
              ¿Deseas cancelar tu cita? El horario quedará disponible para otra persona.
            </p>
            <button onClick={cancel} className="mt-6 w-full rounded-full bg-danger px-6 py-3 text-sm font-bold text-white transition hover:opacity-90">
              Sí, cancelar mi cita
            </button>
            <a href="/" className="mt-3 block text-sm font-semibold text-primary">No, conservar mi cita</a>
          </>
        )}
        {state === "loading" && <p className="mt-4 text-soft">Cancelando…</p>}
        {state === "done" && (
          <>
            <p className="mt-4 rounded-xl bg-primary-tint px-4 py-3 text-sm font-medium text-primary-deep">
              Tu cita fue cancelada y el espacio quedó libre.
            </p>
            <a href="/" className="mt-4 block text-sm font-semibold text-primary">Agendar una nueva cita</a>
          </>
        )}
        {state === "error" && (
          <p className="mt-4 rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
            No encontramos una cita activa con este enlace. Es posible que ya haya sido cancelada.
          </p>
        )}
      </div>
    </main>
  );
}
