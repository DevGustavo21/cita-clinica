"use client";

import { useEffect, useState } from "react";
import { formatDateLong, formatTime12 } from "@/lib/config";
import type { Appointment } from "@/lib/types";
import AvailabilityCalendar from "./AvailabilityCalendar";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Programada",
  completed: "Atendida",
  cancelled: "Cancelada",
};

/**
 * Popup con la información completa de una cita y del paciente.
 * Se cierra con la tecla Escape, el botón ✕ o haciendo clic fuera.
 * Si la cita está programada, el doctor puede reprogramarla: cambiar
 * fecha y hora según la disponibilidad real.
 */
export default function AppointmentModal({
  appt,
  onClose,
  onAction,
  onReschedule,
}: {
  appt: Appointment;
  onClose: () => void;
  onAction: (kind: "cancel" | "complete") => void;
  onReschedule?: (date: string, time: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [newDate, setNewDate] = useState<string>(appt.date);
  const [newTime, setNewTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentTime = appt.time.slice(0, 5);

  // Si cambia la cita seleccionada, volvemos a la vista de detalle.
  useEffect(() => {
    setMode("view");
    setNewDate(appt.date);
    setNewTime(null);
    setError(null);
  }, [appt.id, appt.date]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (mode === "reschedule" ? setMode("view") : onClose());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, mode]);

  // Carga las horas realmente libres del día elegido. Las horas ya tomadas
  // (incluida la hora actual de esta cita) no se muestran.
  useEffect(() => {
    if (mode !== "reschedule" || !newDate) return;
    setSlotsLoading(true);
    setSlots(null);
    fetch(`/api/availability?date=${newDate}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setSlots(j.slots ?? []))
      .finally(() => setSlotsLoading(false));
  }, [mode, newDate]);

  async function saveReschedule() {
    if (!onReschedule || !newDate || !newTime) return;
    setError(null);
    setSaving(true);
    try {
      const res = await onReschedule(newDate, newTime);
      if (!res.ok) {
        setError(res.error ?? "No se pudo reprogramar.");
        // Refrescamos las horas por si el slot se ocupó mientras tanto.
        if (newDate) {
          const r = await fetch(`/api/availability?date=${newDate}`, { cache: "no-store" });
          setSlots((await r.json()).slots ?? []);
          setNewTime(null);
        }
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const statusCls =
    appt.status === "cancelled"
      ? "bg-danger-tint text-danger"
      : appt.status === "completed"
      ? "bg-bg text-soft"
      : "bg-primary-tint text-primary-deep";

  const createdAt = new Date(appt.created_at).toLocaleString("es-NI", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <span className="text-sm text-soft">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );

  const changed = !(newDate === appt.date && newTime === currentTime);
  const canSave = !!newTime && changed && !saving;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface shadow-card"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-5">
          <div>
            <p className="font-display text-xl font-semibold">
              {appt.first_name} {appt.last_name}
            </p>
            <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${statusCls}`}>
              {STATUS_LABEL[appt.status]}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-soft transition hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </div>

        {/* ── Vista de detalle ── */}
        {mode === "view" && (
          <>
            <div className="px-6 py-4">
              <Row label="Fecha" value={<span className="capitalize">{formatDateLong(appt.date)}</span>} />
              <Row label="Hora" value={formatTime12(currentTime)} />
              <Row label="Edad" value={`${appt.age} años${appt.age < 18 ? " · menor" : ""}`} />
              {appt.guardian_name && <Row label="Tutor" value={appt.guardian_name} />}
              <Row label="Teléfono" value={<a href={`tel:${appt.phone}`} className="text-primary hover:underline">{appt.phone}</a>} />
              <Row label="Correo" value={<a href={`mailto:${appt.email}`} className="text-primary hover:underline">{appt.email}</a>} />
              <Row label="Agendada el" value={createdAt} />
            </div>

            {appt.status === "scheduled" && (
              <div className="border-t border-line px-6 py-4">
                {onReschedule && (
                  <button
                    onClick={() => setMode("reschedule")}
                    className="mb-2 w-full rounded-full border border-primary px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary-tint"
                  >
                    Reprogramar cita
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => onAction("complete")}
                    className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-deep"
                  >
                    Marcar atendida
                  </button>
                  <button
                    onClick={() => onAction("cancel")}
                    className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-danger transition hover:border-danger"
                  >
                    Cancelar cita
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Vista de reprogramación ── */}
        {mode === "reschedule" && (
          <div className="px-6 py-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Reprogramar</p>
            <p className="mb-3 text-sm text-soft">
              Cita actual: <strong className="capitalize text-ink">{formatDateLong(appt.date)}</strong> · {formatTime12(currentTime)}
            </p>

            <AvailabilityCalendar
              selected={newDate}
              onSelect={(d) => { setNewDate(d); setNewTime(null); setError(null); }}
            />

            <div className="mt-4">
              <p className="mb-2 text-sm font-semibold capitalize">{formatDateLong(newDate)}</p>
              {slotsLoading && <p className="text-sm text-soft">Consultando horas disponibles…</p>}
              {slots && slots.length === 0 && (
                <p className="rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">
                  No hay horas libres ese día. Elige otro.
                </p>
              )}
              {slots && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => { setNewTime(s); setError(null); }}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition ${
                        newTime === s
                          ? "border-primary bg-primary text-white shadow-card"
                          : "border-line bg-surface text-primary-deep hover:border-primary"
                      }`}
                    >
                      {formatTime12(s)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="mt-4 rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">{error}</p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => { setMode("view"); setNewTime(null); setError(null); }}
                className="rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-soft transition hover:border-primary hover:text-primary"
              >
                Volver
              </button>
              <button
                onClick={saveReschedule}
                disabled={!canSave}
                className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-deep disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-soft">
              El paciente recibirá un mensaje con la nueva fecha y hora.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
