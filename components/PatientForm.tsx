"use client";

import { useRef, useState } from "react";
import type { Patient } from "@/lib/types";

export type PatientPayload = Omit<Patient, "id" | "created_at" | "updated_at">;

type Result = { ok: boolean; error?: string; fields?: Record<string, string> };

const EMPTY: PatientPayload = {
  first_name: "",
  last_name: "",
  birth_date: null,
  gender: null,
  email: null,
  phone: null,
  photo_url: null,
  address: null,
  blood_type: null,
  allergies: null,
  chronic_conditions: null,
  current_medications: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  notes: null,
};

export default function PatientForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Patient>;
  submitLabel: string;
  onSubmit: (payload: PatientPayload) => Promise<Result>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<PatientPayload>({ ...EMPTY, ...sanitize(initial) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set =
    (k: keyof PatientPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [k]: e.target.value }));
      setErrors((er) => ({ ...er, [k]: "" }));
    };

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlobalError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/patients/photo", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) {
        setGlobalError(j.error ?? "No se pudo subir la imagen.");
        return;
      }
      setForm((f) => ({ ...f, photo_url: j.url }));
    } catch {
      setGlobalError("Error de conexión al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setGlobalError(null);
    const fieldErr: Record<string, string> = {};
    if ((form.first_name ?? "").trim().length < 2) fieldErr.first_name = "Ingresa el nombre.";
    if ((form.last_name ?? "").trim().length < 2) fieldErr.last_name = "Ingresa el apellido.";
    if (Object.keys(fieldErr).length) {
      setErrors(fieldErr);
      return;
    }
    setSubmitting(true);
    try {
      const res = await onSubmit(form);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        setGlobalError(res.error ?? "No se pudo guardar.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const input =
    "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none transition placeholder:text-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/15";
  const label = "mb-1.5 block text-sm font-semibold";
  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs font-medium text-danger">{errors[k]}</p> : null;
  const v = (k: keyof PatientPayload) => (form[k] ?? "") as string;

  const initials = `${v("first_name")[0] ?? ""}${v("last_name")[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
      {/* Foto */}
      <div className="mb-6 flex items-center gap-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-line bg-primary-tint">
          {form.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.photo_url} alt="Foto del paciente" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-2xl font-bold text-primary">{initials}</span>
          )}
        </div>
        <div>
          <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary disabled:opacity-60"
          >
            {uploading ? "Subiendo…" : form.photo_url ? "Cambiar foto" : "Subir foto"}
          </button>
          {form.photo_url && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, photo_url: null }))}
              className="ml-2 text-sm font-semibold text-soft transition hover:text-danger"
            >
              Quitar
            </button>
          )}
          <p className="mt-1 text-xs text-soft">Opcional · JPG o PNG, máx. 5 MB.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Nombres</label>
          <input className={input} placeholder="María Fernanda" value={v("first_name")} onChange={set("first_name")} />
          {err("first_name")}
        </div>
        <div>
          <label className={label}>Apellidos</label>
          <input className={input} placeholder="López García" value={v("last_name")} onChange={set("last_name")} />
          {err("last_name")}
        </div>
        <div>
          <label className={label}>Fecha de nacimiento</label>
          <input className={input} type="date" value={v("birth_date")} onChange={set("birth_date")} />
        </div>
        <div>
          <label className={label}>Sexo</label>
          <select className={input} value={v("gender")} onChange={set("gender")}>
            <option value="">Sin especificar</option>
            <option value="F">Femenino</option>
            <option value="M">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>
        <div>
          <label className={label}>Teléfono</label>
          <input className={input} type="tel" placeholder="8888 8888" value={v("phone")} onChange={set("phone")} />
        </div>
        <div>
          <label className={label}>Correo electrónico</label>
          <input className={input} type="email" placeholder="maria@correo.com" value={v("email")} onChange={set("email")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Dirección</label>
          <input className={input} placeholder="Barrio, calle, referencia…" value={v("address")} onChange={set("address")} />
        </div>
        <div>
          <label className={label}>Tipo de sangre</label>
          <select className={input} value={v("blood_type")} onChange={set("blood_type")}>
            <option value="">Sin especificar</option>
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Alergias</label>
          <input className={input} placeholder="Penicilina, polen…" value={v("allergies")} onChange={set("allergies")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Enfermedades crónicas</label>
          <textarea className={input} rows={2} placeholder="Diabetes, hipertensión, asma…" value={v("chronic_conditions")} onChange={set("chronic_conditions")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Medicamentos actuales</label>
          <textarea className={input} rows={2} placeholder="Medicamentos y dosis que toma actualmente" value={v("current_medications")} onChange={set("current_medications")} />
        </div>
        <div>
          <label className={label}>Contacto de emergencia</label>
          <input className={input} placeholder="Nombre del contacto" value={v("emergency_contact_name")} onChange={set("emergency_contact_name")} />
        </div>
        <div>
          <label className={label}>Teléfono de emergencia</label>
          <input className={input} type="tel" placeholder="8888 8888" value={v("emergency_contact_phone")} onChange={set("emergency_contact_phone")} />
        </div>
        <div className="sm:col-span-2">
          <label className={label}>Notas generales</label>
          <textarea className={input} rows={3} placeholder="Antecedentes, observaciones generales del expediente…" value={v("notes")} onChange={set("notes")} />
        </div>
      </div>

      {globalError && (
        <p className="mt-4 rounded-xl bg-danger-tint px-4 py-3 text-sm font-medium text-danger">{globalError}</p>
      )}

      <div className="mt-6 flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-line px-5 py-3 text-sm font-semibold text-soft transition hover:border-primary hover:text-primary"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={submitting || uploading}
          className="flex-1 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-primary-deep disabled:opacity-60"
        >
          {submitting ? "Guardando…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

function sanitize(p?: Partial<Patient>): Partial<PatientPayload> {
  if (!p) return {};
  const keys: (keyof PatientPayload)[] = [
    "first_name", "last_name", "birth_date", "gender", "email", "phone", "photo_url",
    "address", "blood_type", "allergies", "chronic_conditions", "current_medications",
    "emergency_contact_name", "emergency_contact_phone", "notes",
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const val = (p as Record<string, unknown>)[k];
    if (val !== undefined) out[k] = val ?? "";
  }
  return out as Partial<PatientPayload>;
}
