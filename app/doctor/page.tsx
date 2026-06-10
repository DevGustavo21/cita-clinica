"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CLINIC, daySlots, formatDateLong, formatTime12, greeting, todayStr } from "@/lib/config";
import type { Appointment } from "@/lib/types";
import AppointmentModal from "@/components/AppointmentModal";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type View = "calendar" | "list";

export default function DoctorDashboard() {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [view, setView] = useState<View>("calendar");
  const [selectedDay, setSelectedDay] = useState<string>(todayStr());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Appointment | null>(null);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const start = `${monthKey}-01`;
    const end = `${monthKey}-${String(daysInMonth).padStart(2, "0")}`;
    // Pedimos también hoy aunque esté en otro mes navegado
    const today = todayStr();
    const lo = start < today ? start : today;
    const hi = end > today ? end : today;
    const res = await fetch(`/api/appointments?start=${lo}&end=${hi}`);
    if (res.status === 401) return router.push("/doctor/login");
    const j = await res.json();
    setAppointments(j.appointments ?? []);
    setLoading(false);
  }, [monthKey, month, year, router]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      if (!map.has(a.date)) map.set(a.date, []);
      map.get(a.date)!.push(a);
    }
    return map;
  }, [appointments]);

  const today = todayStr();
  const todayPending = (byDay.get(today) ?? [])
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

  const prev = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedDayAppts = (byDay.get(selectedDay) ?? []).sort((a, b) => a.time.localeCompare(b.time));

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
        {/* Bienvenida */}
        <section className="fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary capitalize">{formatDateLong(today)}</p>
            <h1 className="mt-1 font-display text-3xl font-bold">
              {greeting()}, {CLINIC.doctor}
            </h1>
          </div>
          <Link
            href="/doctor/pendientes"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-deep"
          >
            Citas pendientes de hoy
            {todayPending.length > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-bold text-primary-deep">
                {todayPending.length}
              </span>
            )}
          </Link>
        </section>

        {/* Calendario completo */}
        <section className="fade-up mt-10">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={prev} aria-label="Mes anterior" className="grid h-9 w-9 place-items-center rounded-full border border-line text-soft transition hover:border-primary hover:text-primary">‹</button>
              <h2 className="min-w-40 text-center font-display text-xl font-semibold">{MONTHS[month]} {year}</h2>
              <button onClick={next} aria-label="Mes siguiente" className="grid h-9 w-9 place-items-center rounded-full border border-line text-soft transition hover:border-primary hover:text-primary">›</button>
            </div>

            <div className="flex rounded-full border border-line bg-surface p-1 text-sm font-semibold">
              <button onClick={() => setView("calendar")} className={`rounded-full px-4 py-1.5 transition ${view === "calendar" ? "bg-primary text-white" : "text-soft"}`}>
                Calendario
              </button>
              <button onClick={() => setView("list")} className={`rounded-full px-4 py-1.5 transition ${view === "list" ? "bg-primary text-white" : "text-soft"}`}>
                Lista
              </button>
            </div>
          </div>

          {loading && <p className="py-10 text-center text-sm text-soft">Cargando citas…</p>}

          {/* ── Vista calendario (celdas) ── */}
          {!loading && view === "calendar" && (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <div className="grid grid-cols-7 border-b border-line bg-bg text-center">
                {WEEKDAYS.map((w) => (
                  <span key={w} className="py-2 text-xs font-bold uppercase tracking-wide text-soft">{w}</span>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstWeekday }).map((_, i) => (
                  <div key={`pad-${i}`} className="min-h-20 border-b border-r border-line/60 sm:min-h-28" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
                  const appts = (byDay.get(dateStr) ?? []).filter((a) => a.status === "scheduled");
                  const isToday = dateStr === today;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => { setSelectedDay(dateStr); setView("list"); }}
                      className={`min-h-20 border-b border-r border-line/60 p-1.5 text-left align-top transition hover:bg-primary-tint/40 sm:min-h-28 sm:p-2 ${isToday ? "bg-primary-tint/50" : ""}`}
                    >
                      <span className={`text-xs font-bold ${isToday ? "text-primary-deep" : "text-soft"}`}>{d}</span>
                      <div className="mt-1 space-y-1">
                        {appts.slice(0, 3).map((a) => (
                          <span key={a.id} className="block truncate rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white sm:text-xs">
                            {a.time.slice(0, 5)} {a.first_name} {a.last_name}
                          </span>
                        ))}
                        {appts.length > 3 && (
                          <span className="block text-[10px] font-semibold text-primary">+{appts.length - 3} más</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Vista lista (por hora) ── */}
          {!loading && view === "list" && (
            <div className="rounded-2xl border border-line bg-surface shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
                <p className="font-display text-base font-semibold capitalize">{formatDateLong(selectedDay)}</p>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => e.target.value && setSelectedDay(e.target.value)}
                  className="rounded-xl border border-line px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
              </div>
              <ul>
                {daySlots().map((slot) => {
                  const appt = selectedDayAppts.find((a) => a.time.slice(0, 5) === slot);
                  return (
                    <li key={slot} className="flex items-stretch gap-4 border-b border-line/60 px-5 py-3 last:border-0">
                      <span className="w-20 shrink-0 pt-0.5 font-display text-sm font-bold text-soft">{formatTime12(slot)}</span>
                      {!appt && <span className="self-center text-sm text-soft/50">— Libre —</span>}
                      {appt && (
                        <div
                          onClick={() => setDetail(appt)}
                          className={`flex-1 cursor-pointer rounded-xl px-4 py-3 transition hover:ring-2 hover:ring-primary/30 ${appt.status === "cancelled" ? "bg-danger-tint" : appt.status === "completed" ? "bg-bg" : "bg-primary-tint/60"}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className={`font-semibold ${appt.status === "cancelled" ? "text-danger line-through" : ""}`}>
                                {appt.first_name} {appt.last_name}
                                <span className="ml-2 text-xs font-normal text-soft">{appt.age} años</span>
                              </p>
                              <p className="text-xs text-soft">{appt.phone} · {appt.email}</p>
                              {appt.guardian_name && <p className="text-xs text-soft">Tutor: {appt.guardian_name}</p>}
                            </div>
                            {appt.status === "scheduled" ? (
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); action(appt.id, "complete"); }} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-primary-deep">Atendida</button>
                                <button onClick={(e) => { e.stopPropagation(); action(appt.id, "cancel"); }} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-danger transition hover:border-danger">Cancelar</button>
                              </div>
                            ) : (
                              <span className={`text-xs font-bold uppercase tracking-wide ${appt.status === "cancelled" ? "text-danger" : "text-soft"}`}>
                                {appt.status === "cancelled" ? "Cancelada" : "Atendida"}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
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
