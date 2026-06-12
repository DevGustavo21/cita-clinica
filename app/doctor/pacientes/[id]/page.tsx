"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DoctorHeader from "@/components/DoctorHeader";
import PatientForm, { type PatientPayload } from "@/components/PatientForm";
import MedicalRecordForm, { type RecordPayload } from "@/components/MedicalRecordForm";
import { formatDateLong } from "@/lib/config";
import type { MedicalRecord, Patient } from "@/lib/types";

function ageFrom(birth: string | null): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const t = new Date();
  let age = t.getFullYear() - y;
  if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) age--;
  return age >= 0 ? `${age} años` : "";
}

const sortRecords = (a: MedicalRecord, b: MedicalRecord) =>
  b.visit_date.localeCompare(a.visit_date) || b.created_at.localeCompare(a.created_at);

export default function PatientRecord() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const loadPatient = useCallback(async () => {
    const res = await fetch(`/api/patients/${id}`, { cache: "no-store" });
    if (res.status === 401) return router.push("/doctor/login");
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const j = await res.json();
    setPatient(j.patient);
    setRecordCount(j.recordCount ?? 0);
  }, [id, router]);

  const loadRecords = useCallback(
    async (offset: number, append: boolean) => {
      const res = await fetch(`/api/patients/${id}/records?offset=${offset}`, { cache: "no-store" });
      if (res.status === 401) return router.push("/doctor/login");
      const j = await res.json();
      setRecords((prev) => {
        const next = append ? [...prev, ...(j.records ?? [])] : (j.records ?? []);
        return [...next].sort(sortRecords);
      });
      setTotal(j.total ?? 0);
      setHasMore(!!j.hasMore);
    },
    [id, router]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPatient(), loadRecords(0, false)]);
      setLoading(false);
    })();
  }, [loadPatient, loadRecords]);

  async function loadMore() {
    setLoadingMore(true);
    await loadRecords(records.length, true);
    setLoadingMore(false);
  }

  async function saveProfile(payload: PatientPayload) {
    const res = await fetch(`/api/patients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error, fields: j.fields };
    setPatient(j.patient);
    setEditingProfile(false);
    return { ok: true };
  }

  async function addRecord(payload: RecordPayload) {
    const res = await fetch(`/api/patients/${id}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error };
    setRecords((prev) => [j.record, ...prev].sort(sortRecords));
    setTotal((t) => t + 1);
    setRecordCount((c) => c + 1);
    setAdding(false);
    return { ok: true };
  }

  async function updateRecord(recordId: string, payload: RecordPayload) {
    const res = await fetch(`/api/records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j.error };
    setRecords((prev) => prev.map((r) => (r.id === recordId ? j.record : r)).sort(sortRecords));
    setEditingRecordId(null);
    return { ok: true };
  }

  async function deleteRecord(recordId: string) {
    if (!confirm("¿Eliminar esta consulta del expediente? No se puede deshacer.")) return;
    const res = await fetch(`/api/records/${recordId}`, { method: "DELETE" });
    if (!res.ok) return;
    setRecords((prev) => prev.filter((r) => r.id !== recordId));
    setTotal((t) => Math.max(0, t - 1));
    setRecordCount((c) => Math.max(0, c - 1));
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.reason, r.diagnosis, r.observations, r.recommendations, formatDateLong(r.visit_date)]
        .filter(Boolean)
        .some((t) => String(t).toLowerCase().includes(q))
    );
  }, [records, filter]);

  if (loading) {
    return (
      <main className="min-h-screen">
        <DoctorHeader subtitle="Expedientes" />
        <p className="py-20 text-center text-sm text-soft">Cargando expediente…</p>
      </main>
    );
  }

  if (notFound || !patient) {
    return (
      <main className="min-h-screen">
        <DoctorHeader subtitle="Expedientes" />
        <div className="mx-auto max-w-3xl px-5 pt-10 text-center">
          <p className="text-sm text-soft">Este paciente no existe o fue eliminado.</p>
          <Link href="/doctor/pacientes" className="mt-4 inline-block rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-tint">
            ‹ Volver a pacientes
          </Link>
        </div>
      </main>
    );
  }

  const initials = `${patient.first_name[0] ?? ""}${patient.last_name[0] ?? ""}`.toUpperCase();

  return (
    <main className="min-h-screen pb-16">
      <DoctorHeader subtitle="Expedientes" />

      <div className="mx-auto max-w-4xl px-5 pt-8">
        <Link href="/doctor/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-primary">
          ‹ Volver a pacientes
        </Link>

        {editingProfile ? (
          <section className="fade-up mt-4">
            <h1 className="mb-4 font-display text-2xl font-bold">Editar perfil</h1>
            <PatientForm
              initial={patient}
              submitLabel="Guardar cambios"
              onSubmit={saveProfile}
              onCancel={() => setEditingProfile(false)}
            />
          </section>
        ) : (
          <>
            {/* ── Encabezado del paciente ── */}
            <section className="fade-up mt-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <div className="flex flex-wrap items-start gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-tint">
                  {patient.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={patient.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-2xl font-bold text-primary">{initials}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="font-display text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
                  <p className="text-sm text-soft">
                    {[ageFrom(patient.birth_date), patient.gender === "F" ? "Femenino" : patient.gender === "M" ? "Masculino" : patient.gender, patient.blood_type && `Sangre ${patient.blood_type}`]
                      .filter(Boolean)
                      .join(" · ") || "Sin datos demográficos"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {patient.phone && <a href={`tel:${patient.phone}`} className="text-primary hover:underline">{patient.phone}</a>}
                    {patient.email && <a href={`mailto:${patient.email}`} className="text-primary hover:underline">{patient.email}</a>}
                  </div>
                </div>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary"
                >
                  Editar perfil
                </button>
              </div>

              {/* Datos clínicos clave */}
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Enfermedades crónicas" value={patient.chronic_conditions} highlight />
                <Field label="Alergias" value={patient.allergies} highlight />
                <Field label="Medicamentos actuales" value={patient.current_medications} />
                <Field label="Dirección" value={patient.address} />
                <Field
                  label="Contacto de emergencia"
                  value={[patient.emergency_contact_name, patient.emergency_contact_phone].filter(Boolean).join(" · ") || null}
                />
                <Field label="Notas generales" value={patient.notes} />
              </div>
            </section>

            {/* ── Historial / timeline ── */}
            <section className="fade-up mt-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-semibold">Historial médico</h2>
                  <p className="text-xs text-soft">{recordCount} consulta{recordCount === 1 ? "" : "s"} registrada{recordCount === 1 ? "" : "s"}</p>
                </div>
                {!adding && (
                  <button
                    onClick={() => { setAdding(true); setEditingRecordId(null); }}
                    className="rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-deep"
                  >
                    + Nueva consulta
                  </button>
                )}
              </div>

              {adding && (
                <div className="mb-5">
                  <MedicalRecordForm submitLabel="Guardar consulta" onSubmit={addRecord} onCancel={() => setAdding(false)} />
                </div>
              )}

              {recordCount > 3 && (
                <div className="relative mb-4">
                  <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="Filtrar en el historial cargado (motivo, diagnóstico, fecha…)"
                    className="w-full rounded-xl border border-line bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition placeholder:text-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              )}

              {records.length === 0 && !adding && (
                <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-soft">
                  Aún no hay consultas en este expediente. Agrega la primera con “Nueva consulta”.
                </div>
              )}

              {filtered.length === 0 && records.length > 0 && (
                <p className="py-6 text-center text-sm text-soft">Ningún resultado para “{filter}”.</p>
              )}

              <ol className="relative space-y-4 border-l border-line pl-6">
                {filtered.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-[1.65rem] top-1.5 grid h-3 w-3 place-items-center rounded-full bg-primary ring-4 ring-surface" />
                    {editingRecordId === r.id ? (
                      <MedicalRecordForm
                        record={r}
                        submitLabel="Guardar cambios"
                        onSubmit={(p) => updateRecord(r.id, p)}
                        onCancel={() => setEditingRecordId(null)}
                      />
                    ) : (
                      <RecordCard
                        record={r}
                        onEdit={() => { setEditingRecordId(r.id); setAdding(false); }}
                        onDelete={() => deleteRecord(r.id)}
                      />
                    )}
                  </li>
                ))}
              </ol>

              {hasMore && !filter && (
                <div className="mt-5 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-primary transition hover:border-primary disabled:opacity-60"
                  >
                    {loadingMore ? "Cargando…" : `Cargar consultas anteriores (${total - records.length})`}
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Field({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight && value ? "bg-danger-tint/40" : "bg-bg"}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-soft">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{value || <span className="text-soft/60">—</span>}</p>
    </div>
  );
}

function RecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: MedicalRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const longText = (record.observations?.length ?? 0) + (record.recommendations?.length ?? 0) > 160;
  const vitals = [
    record.blood_pressure && `PA ${record.blood_pressure}`,
    record.weight_kg != null && `${record.weight_kg} kg`,
    record.height_cm != null && `${record.height_cm} cm`,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold capitalize text-primary-deep">{formatDateLong(record.visit_date)}</p>
          {record.reason && <p className="mt-0.5 font-semibold">{record.reason}</p>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={onEdit} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary">Editar</button>
          <button onClick={onDelete} className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-danger transition hover:border-danger">Eliminar</button>
        </div>
      </div>

      {record.diagnosis && (
        <p className="mt-2 text-sm"><span className="font-semibold text-soft">Diagnóstico:</span> {record.diagnosis}</p>
      )}
      {vitals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {vitals.map((x) => (
            <span key={x} className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-soft">{x}</span>
          ))}
        </div>
      )}

      {(record.observations || record.recommendations) && (
        <div className={`mt-3 space-y-2 ${!open && longText ? "max-h-24 overflow-hidden" : ""}`}>
          {record.observations && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-soft">Observaciones</p>
              <p className="whitespace-pre-wrap text-sm text-ink">{record.observations}</p>
            </div>
          )}
          {record.recommendations && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-soft">Recomendaciones</p>
              <p className="whitespace-pre-wrap text-sm text-ink">{record.recommendations}</p>
            </div>
          )}
        </div>
      )}

      {longText && (
        <button onClick={() => setOpen((o) => !o)} className="mt-2 text-xs font-semibold text-primary hover:underline">
          {open ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}
