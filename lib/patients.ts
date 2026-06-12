/** Helpers para normalizar los cuerpos de pacientes y consultas a columnas de la BD. */

const str = (v: unknown) => {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
};

const num = (v: unknown) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Normaliza el cuerpo de un paciente (vacío → null). */
export function buildPatientPayload(body: any) {
  return {
    first_name: String(body.first_name ?? "").trim(),
    last_name: String(body.last_name ?? "").trim(),
    birth_date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.birth_date ?? "")) ? body.birth_date : null,
    gender: str(body.gender),
    email: str(body.email),
    phone: str(body.phone),
    photo_url: str(body.photo_url),
    address: str(body.address),
    blood_type: str(body.blood_type),
    allergies: str(body.allergies),
    chronic_conditions: str(body.chronic_conditions),
    current_medications: str(body.current_medications),
    emergency_contact_name: str(body.emergency_contact_name),
    emergency_contact_phone: str(body.emergency_contact_phone),
    notes: str(body.notes),
  };
}

/** Normaliza el cuerpo de una consulta del expediente. */
export function buildRecordPayload(body: any) {
  return {
    visit_date: /^\d{4}-\d{2}-\d{2}$/.test(String(body.visit_date ?? ""))
      ? body.visit_date
      : new Date().toISOString().slice(0, 10),
    reason: str(body.reason),
    diagnosis: str(body.diagnosis),
    weight_kg: num(body.weight_kg),
    height_cm: num(body.height_cm),
    blood_pressure: str(body.blood_pressure),
    observations: str(body.observations),
    recommendations: str(body.recommendations),
  };
}
