"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import DoctorHeader from "@/components/DoctorHeader";
import PatientForm, { type PatientPayload } from "@/components/PatientForm";

export default function NewPatient() {
  const router = useRouter();

  async function create(payload: PatientPayload) {
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (res.status === 401) {
      router.push("/doctor/login");
      return { ok: false, error: "Sesión expirada." };
    }
    if (!res.ok) return { ok: false, error: j.error, fields: j.fields };
    router.push(`/doctor/pacientes/${j.patient.id}`);
    return { ok: true };
  }

  return (
    <main className="min-h-screen pb-16">
      <DoctorHeader subtitle="Expedientes" />

      <div className="mx-auto max-w-3xl px-5 pt-8">
        <Link href="/doctor/pacientes" className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-primary">
          ‹ Volver a pacientes
        </Link>

        <section className="fade-up mt-4 mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Nuevo expediente</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Crear perfil del paciente</h1>
          <p className="mt-2 text-sm text-soft">
            Solo el nombre y el apellido son obligatorios. Puedes completar el resto del
            expediente más adelante.
          </p>
        </section>

        <PatientForm submitLabel="Crear paciente" onSubmit={create} />
      </div>
    </main>
  );
}
