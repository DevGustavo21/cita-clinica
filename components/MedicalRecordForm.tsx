"use client";

import { useState } from "react";
import type { MedicalRecord } from "@/lib/types";

export type RecordPayload = {
  visit_date: string;
  reason: string;
  diagnosis: string;
  weight_kg: string;
  height_cm: string;
  blood_pressure: string;
  observations: string;
  recommendations: string;
};

type Result = { ok: boolean; error?: string };

function initialFrom(r?: MedicalRecord | null): RecordPayload {
  return {
    visit_date: r?.visit_date ?? new Date().toISOString().slice(0, 10),
    reason: r?.reason ?? "",
    diagnosis: r?.diagnosis ?? "",
    weight_kg: r?.weight_kg != null ? String(r.weight_kg) : "",
    height_cm: r?.height_cm != null ? String(r.height_cm) : "",
    blood_pressure: r?.blood_pressure ?? "",
    observations: r?.observations ?? "",
    recommendations: r?.recommendations ?? "",
  };
}

export default function MedicalRecordForm({
  record,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  record?: MedicalRecord | null;
  submitLabel: string;
  onSubmit: (payload: RecordPayload) => Promise<Result>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<RecordPayload>(initialFrom(record));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set =
    (k: keyof RecordPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit() {
    setError(null);
    if (!form.reason.trim() && !form.observations.trim() && !form.diagnosis.trim()) {
      setError("Agrega al menos el motivo, el diagnóstico o una observación.");
      return;
    }
    setSaving(true);
    try {
      const res = await onSubmit(form);
      if (!res.ok) setError(res.error ?? "No se pudo guardar la consulta.");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm outline-none transition placeholder:text-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
  const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-soft";

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary-tint/20 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Fecha de la consulta</label>
          <input className={input} type="date" value={form.visit_date} onChange={set("visit_date")} />
        </div>
        <div>
          <label className={label}>Presión arterial</label>
          <input className={input} placeholder="120/80" value={form.blood_pressure} onChange={set("blood_pressure")} />
        </div>
        <div>
          <label className={label}>Peso (kg)</label>
          <input className={input} type="number" step="0.1" placeholder="70" value={form.weight_kg} onChange={set("weight_kg")} />
        </div>
        <div>
          <label className={label}>Estatura (cm)</label>
          <input className={input} type="number" step="0.1" placeholder="170" value={form.height_cm} onChange={set("height_cm")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Motivo de la consulta</label>
          <input className={input} placeholder="Dolor de cabeza, control, etc." value={form.reason} onChange={set("reason")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Diagnóstico</label>
          <input className={input} placeholder="Diagnóstico" value={form.diagnosis} onChange={set("diagnosis")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Observaciones</label>
          <textarea className={input} rows={3} placeholder="Notas de la visita…" value={form.observations} onChange={set("observations")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Recomendaciones médicas</label>
          <textarea className={input} rows={3} placeholder="Indicaciones, tratamiento, próximos pasos…" value={form.recommendations} onChange={set("recommendations")} />
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-danger-tint px-4 py-2.5 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-soft transition hover:border-primary hover:text-primary"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex-1 rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition hover:bg-primary-deep disabled:opacity-60"
        >
          {saving ? "Guardando…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
