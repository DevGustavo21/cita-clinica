import BookingForm from "@/components/BookingForm";
import { CLINIC } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Encabezado */}
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-dashed border-line bg-primary-tint font-display text-lg font-bold text-primary">+</span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold">Aquí puede ir tu logo</p>
              <p className="text-xs text-soft">{CLINIC.tagline}</p>
            </div>
          </div>
          <button type="button" className="hidden rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary sm:block">
            Aquí puede ir tu número
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 inline-block rounded-full bg-primary-tint px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-deep">
            Citas en línea · {CLINIC.doctor}
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
            Agenda tu cita en{" "}
            <span className="text-primary">2 minutos</span>, sin llamadas.
          </h1>
          <p className="mt-4 text-base text-soft sm:text-lg">
            Elige el día y la hora que mejor te convenga — solo verás los espacios realmente disponibles.
            Te recordaremos tu cita por mensaje un día antes y 2 horas antes.
          </p>
        </div>

        <BookingForm />

        <footer className="mt-14 border-t border-line pt-6 text-sm text-soft">
          <p className="flex items-center gap-2">
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {CLINIC.address}
          </p>
          <p className="mt-1">Lunes a sábado · 8:00 AM – 5:00 PM</p>
        </footer>
      </div>
    </main>
  );
}
