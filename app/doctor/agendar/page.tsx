"use client";

import Link from "next/link";
import BookingForm from "@/components/BookingForm";
import DoctorHeader from "@/components/DoctorHeader";

export default function AgendarManual() {
  return (
    <main className="min-h-screen pb-16">
      <DoctorHeader />

      <div className="mx-auto max-w-6xl px-5 pt-8">
        <Link href="/doctor" className="inline-flex items-center gap-1.5 text-sm font-semibold text-soft transition hover:text-primary">
          ‹ Volver al calendario
        </Link>

        <section className="fade-up mt-4 mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Agendar manualmente</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Registrar una cita</h1>
          <p className="mt-2 max-w-2xl text-sm text-soft">
            Úsalo cuando un paciente llame o llegue a la clínica. Solo se muestran las horas
            realmente libres, así no se duplican reservas con las citas en línea.
          </p>
        </section>

        <BookingForm mode="staff" />
      </div>
    </main>
  );
}
