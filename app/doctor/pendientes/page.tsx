"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CLINIC, formatDateLong, formatTime12, greeting, todayStr } from "@/lib/config";
import type { Appointment } from "@/lib/types";
import AppointmentModal from "@/components/AppointmentModal";

export default function PendingAppointments() {
  const router = useRouter();
  const today = todayStr();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Appointment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/appointments?start=${today}&end=${today}`);
    if (res.status === 401) return router.push("/doctor/login");
    const j = await res.json();
    setAppointments(j.appointments ?? []);
    setLoading(false);
  }, [today, router]);

  useEffect(() => { load(); }, [load]);

  const pending = appointments
    .filter((a) => a.status === "scheduled")
    .sort((a, b) => a.time.localeCompare(b.time));

  async function action(id: string, kind: "cancel" | "complete") {
    if (kind === "cancel" && !confirm("¿Cancelar esta cita? El horario quedará libre para otros pacientes.")) return;
    await fetch("/api/appointments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: kind }),
    });
    load();
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/doctor/login");
  }

  return (
    <main className="min-h-screen pb-16">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-white">+</span>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold sm:text-base">{CLINIC.doctor}</p>
              <p className="text-xs text-soft">{CLINIC.name} · Panel de citas</p>
            </div>
          </div>
          <button onClick={logout} className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-soft transition hover:border-danger hover:text-danger">
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pt-8">
        <Link href="/doctor" className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-primary">
          ‹ Volver al calendario
        </Link>

        <section className="fade-up mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary capitalize">{greeting()} · {formatDateLong(today)}</p>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {loading
              ? "Cargando citas…"
              : pending.length === 0
              ? "Sin citas pendientes hoy"
              : `${pending.length} cita${pending.length > 1 ? "s" : ""} pendiente${pending.length > 1 ? "s" : ""} hoy`}
          </h1>

          {!loading && pending.length > 0 && (
            <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pending.map((a) => (
                <li
                  key={a.id}
                  onClick={() => setDetail(a)}
                  className="cursor-pointer rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-primary hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary-tint px-3 py-1 font-display text-sm font-bold text-primary-deep">
                      {formatTime12(a.time.slice(0, 5))}
                    </span>
                    <span className="text-xs text-soft">{a.age} años{a.guardian_name ? " · menor" : ""}</span>
                  </div>
                  <p className="mt-3 font-semibold">{a.first_name} {a.last_name}</p>
                  <p className="text-sm text-soft">{a.phone}</p>
                  {a.guardian_name && <p className="text-xs text-soft">Tutor: {a.guardian_name}</p>}
                  <div className="mt-3 flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); action(a.id, "complete"); }} className="flex-1 rounded-full bg-primary px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-deep">
                      Atendida
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); action(a.id, "cancel"); }} className="flex-1 rounded-full border border-line px-3 py-2 text-xs font-semibold text-danger transition hover:border-danger">
                      Cancelar
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {!loading && pending.length === 0 && (
            <p className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center text-sm text-soft shadow-card">
              No hay citas programadas para hoy. Revisa el calendario para ver otros días.
            </p>
          )}
        </section>
      </div>

      {detail && (
        <AppointmentModal
          appt={detail}
          onClose={() => setDetail(null)}
          onAction={async (kind) => {
            await action(detail.id, kind);
            setDetail(null);
          }}
        />
      )}
    </main>
  );
}
