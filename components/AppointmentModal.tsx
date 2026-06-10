"use client";

import { useEffect } from "react";
import { formatDateLong, formatTime12 } from "@/lib/config";
import type { Appointment } from "@/lib/types";

const STATUS_LABEL: Record<Appointment["status"], string> = {
  scheduled: "Programada",
  completed: "Atendida",
  cancelled: "Cancelada",
};

/**
 * Popup con la información completa de una cita y del paciente.
 * Se cierra con la tecla Escape, el botón ✕ o haciendo clic fuera.
 */
export default function AppointmentModal({
  appt,
  onClose,
  onAction,
}: {
  appt: Appointment;
  onClose: () => void;
  onAction: (kind: "cancel" | "complete") => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-up w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-card"
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

        <div className="px-6 py-4">
          <Row label="Fecha" value={<span className="capitalize">{formatDateLong(appt.date)}</span>} />
          <Row label="Hora" value={formatTime12(appt.time.slice(0, 5))} />
          <Row label="Edad" value={`${appt.age} años${appt.age < 18 ? " · menor" : ""}`} />
          {appt.guardian_name && <Row label="Tutor" value={appt.guardian_name} />}
          <Row label="Teléfono" value={<a href={`tel:${appt.phone}`} className="text-primary hover:underline">{appt.phone}</a>} />
          <Row label="Correo" value={<a href={`mailto:${appt.email}`} className="text-primary hover:underline">{appt.email}</a>} />
          <Row label="Agendada el" value={createdAt} />
        </div>

        {appt.status === "scheduled" && (
          <div className="flex gap-2 border-t border-line px-6 py-4">
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
        )}
      </div>
    </div>
  );
}
