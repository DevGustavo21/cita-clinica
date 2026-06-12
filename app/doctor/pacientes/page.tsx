"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DoctorHeader from "@/components/DoctorHeader";

type PatientLite = {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
};

function ageFrom(birth: string | null): string {
  if (!birth) return "";
  const [y, m, d] = birth.split("-").map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age >= 0 ? `${age} años` : "";
}

export default function PatientsSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    const res = await fetch(`/api/patients?q=${encodeURIComponent(term)}`, { cache: "no-store" });
    if (res.status === 401) return router.push("/doctor/login");
    const j = await res.json();
    setPatients(j.patients ?? []);
    setLoading(false);
  }, [router]);

  // Solo busca cuando el doctor ha escrito algo (con debounce).
  // Sin término no se muestra ningún resultado.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setPatients([]);
      setLoading(false);
      return;
    }
    const t = setTimeout(() => load(term), 300);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <main className="min-h-screen pb-16">
      <DoctorHeader subtitle="Expedientes" />

      <div className="mx-auto max-w-4xl px-5 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/doctor" className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-primary">
            ‹ Volver al calendario
          </Link>
          <Link
            href="/doctor/pacientes/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-primary-deep"
          >
            + Nuevo paciente
          </Link>
        </div>

        <section className="fade-up mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Expedientes médicos</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Buscar paciente</h1>

          <div className="relative mt-5">
            <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Escribe el nombre o apellido del paciente…"
              className="w-full rounded-2xl border border-line bg-surface py-4 pl-11 pr-4 text-sm outline-none transition placeholder:text-soft/60 focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="mt-5">
            {!q.trim() && (
              <p className="py-10 text-center text-sm text-soft">
                Escribe el nombre o apellido del paciente para ver su expediente.
              </p>
            )}

            {q.trim() && loading && <p className="py-8 text-center text-sm text-soft">Buscando…</p>}

            {q.trim() && !loading && patients.length === 0 && (
              <div className="rounded-2xl border border-line bg-surface p-8 text-center shadow-card">
                <p className="text-sm text-soft">No se encontraron pacientes con ese nombre.</p>
                <Link
                  href="/doctor/pacientes/nuevo"
                  className="mt-3 inline-block rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-tint"
                >
                  Crear expediente de “{q.trim()}”
                </Link>
              </div>
            )}

            {q.trim() && !loading && patients.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {patients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/doctor/pacientes/${p.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-primary hover:shadow-md"
                    >
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-tint">
                        {p.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-base font-bold text-primary">
                            {`${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.first_name} {p.last_name}</p>
                        <p className="truncate text-xs text-soft">
                          {[ageFrom(p.birth_date), p.phone].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                        </p>
                      </div>
                      <span className="ml-auto text-soft">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
