"use client";

import { useEffect, useMemo, useState } from "react";
import AvailabilityCalendar from "./AvailabilityCalendar";
import { formatDateLong, formatTime12 } from "@/lib/config";

type FieldErrors = Record<string, string>;

export default function BookingForm({ mode = "public" }: { mode?: "public" | "staff" }) {
  const staff = mode === "staff";
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    guardianName: "",
    phone: "",
    email: "",
  });
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isMinor = useMemo(() => {
    const a = Number(form.age);
    return Number.isInteger(a) && a > 0 && a < 18;
  }, [form.age]);

  // Las horas SIEMPRE vienen del backend: solo se listan las libres.
  useEffect(() => {
    if (!date) return;
    setTime(null);
    setSlots(null);
    setSlotsLoading(true);
    fetch(`/api/availability?date=${date}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSlots(j.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [date]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };

  async function submit() {
    setGlobalError(null);
    if (!date) return setGlobalError("Selecciona un día disponible en el calendario.");
    if (!time) return setGlobalError("Selecciona una hora disponible.");
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, age: Number(form.age), date, time }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErrors(j.fields ?? {});
        setGlobalError(j.error ?? "No se pudo agendar.");
        if (res.status === 409 && date) {
          // El slot se ocupó mientras llenaba el formulario → refrescar horas
          const r = await fetch(`/api/availability?date=${date}`, { cache: "no-store" });
          setSlots((await r.json()).slots ?? []);
          setTime(null);
        }
        return;
      }
      setDone(true);
    } catch {
      setGlobalError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done && date && time) {
    return (
      <div className="fade-up rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary-tint text-primary">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold">
          {staff ? `Cita registrada para ${form.firstName}` : `¡Cita agendada, ${form.firstName}!`}
        </h2>
        <p className="mt-2 text-soft">
          {staff ? "Cita el " : "Te esperamos el "}
          <strong className="text-ink">{formatDateLong(date)}</strong> a las{" "}
          <strong className="text-ink">{formatTime12(time)}</strong>.
        </p>
        <p className="mt-4 rounded-xl bg-bg p-4 text-sm text-soft">
          {staff
            ? "El paciente recibirá recordatorios automáticos un día antes y 2 horas antes de la cita, con la opción de cancelar desde el mismo mensaje."
            : "Un día antes y 2 horas antes de tu cita recibirás un recordatorio en tu teléfono con todos los detalles. Si necesitas cancelar, podrás hacerlo desde ese mismo mensaje."}
        </p>
        <button
          onClick={() => { setDone(false); setDate(null); setTime(null); setForm({ firstName: "", lastName: "", age: "", guardianName: "", phone: "", email: "" }); }}
          className="mt-6 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary"
        >
          {staff ? "Registrar otra cita" : "Agendar otra cita"}
        </button>
      </div>
    );
  }

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
  const label = "mb-1.5 block text-sm font-semibold";
  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs font-medium text-danger">{errors[k]}</p> : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* Paso 1 — Día y hora */}
      <section className="fade-up">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Paso 1 · Elige día y hora
        </p>
        <AvailabilityCalendar selected={date} onSelect={setDate} />

        {date && (
          <div className="fade-up mt-4 rounded-2xl border border-line bg-surface p-4 shadow-card">
            <p className="mb-3 text-sm font-semibold capitalize">{formatDateLong(date)}</p>
            {slotsLoading && <p className="text-sm text-soft">Consultando horas disponibles…</p>}
            {slots && slots.length === 0 && (
              <p className="rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
                Este día se saturó. Elige otro día del calendario.
              </p>
            )}
            {slots && slots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTime(s)}
                    className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                      time === s
                        ? "border-primary bg-primary text-white shadow-card"
                        : "border-line bg-surface text-primary-deep hover:border-primary"
                    }`}
                  >
                    {formatTime12(s)}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 text-xs text-soft">Solo se muestran las horas libres. Las ocupadas no aparecen.</p>
          </div>
        )}
      </section>

      {/* Paso 2 — Datos del paciente */}
      <section className="fade-up rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
        <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          Paso 2 · {staff ? "Datos del paciente" : "Tus datos"}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={label}>Nombre</label>
            <input id="firstName" className={input} placeholder="María" value={form.firstName} onChange={set("firstName")} />
            {err("firstName")}
          </div>
          <div>
            <label htmlFor="lastName" className={label}>Apellido</label>
            <input id="lastName" className={input} placeholder="López" value={form.lastName} onChange={set("lastName")} />
            {err("lastName")}
          </div>
          <div>
            <label htmlFor="age" className={label}>Edad</label>
            <input id="age" className={input} type="number" min={1} max={119} placeholder="28" value={form.age} onChange={set("age")} />
            {err("age")}
          </div>
          {isMinor && (
            <div className="fade-up">
              <label htmlFor="guardianName" className={label}>
                Nombre del tutor <span className="font-normal text-soft">(menor de edad)</span>
              </label>
              <input id="guardianName" className={input} placeholder="Nombre completo del tutor" value={form.guardianName} onChange={set("guardianName")} />
              {err("guardianName")}
            </div>
          )}
          <div>
            <label htmlFor="phone" className={label}>Número telefónico</label>
            <input id="phone" className={input} type="tel" placeholder="8888 8888" value={form.phone} onChange={set("phone")} />
            {err("phone")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="email" className={label}>Correo electrónico</label>
            <input id="email" className={input} type="email" placeholder="maria@correo.com" value={form.email} onChange={set("email")} />
            {err("email")}
          </div>
        </div>

        {/* Resumen */}
        <div className="mt-6 rounded-xl bg-bg p-4 text-sm">
          {date && time ? (
            <p className="flex items-center gap-2">
              <svg className="shrink-0 text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="16" y1="2" x2="16" y2="6" />
              </svg>
              <span>{staff ? "Cita" : "Tu cita"}: <strong className="capitalize">{formatDateLong(date)}</strong> · <strong>{formatTime12(time)}</strong></span>
            </p>
          ) : (
            <p className="text-soft">Selecciona un día y una hora para ver el resumen de la cita.</p>
          )}
        </div>

        {globalError && (
          <p className="mt-4 rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">{globalError}</p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 w-full rounded-full bg-primary px-6 py-3.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-deep disabled:opacity-60"
        >
          {submitting ? "Agendando…" : staff ? "Agendar cita" : "Confirmar mi cita"}
        </button>
        <p className="mt-3 text-center text-xs text-soft">
          {staff
            ? "El paciente recibirá recordatorios automáticos antes de la cita."
            : "Recibirás recordatorios automáticos antes de tu cita."}
        </p>
      </section>
    </div>
  );
}
