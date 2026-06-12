"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CLINIC } from "@/lib/config";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const ICONS = {
  calendar: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  ),
  clock: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  ),
  plus: (
    <svg {...iconProps}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  clipboard: (
    <svg {...iconProps}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  ),
  logout: (
    <svg {...iconProps}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const NAV = [
  { href: "/doctor", label: "Calendario", icon: ICONS.calendar },
  { href: "/doctor/pendientes", label: "Citas pendientes", icon: ICONS.clock },
  { href: "/doctor/agendar", label: "Agendar cita", icon: ICONS.plus },
  { href: "/doctor/pacientes", label: "Expedientes", icon: ICONS.clipboard },
];

/** Botón de hamburguesa + sidebar deslizable con la navegación del panel. */
export default function DoctorMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setMounted(true), []);

  // Cierra con Escape y bloquea el scroll del fondo mientras está abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    if (open) document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/doctor/login");
  }

  const isActive = (href: string) =>
    href === "/doctor" ? pathname === "/doctor" : pathname.startsWith(href);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-soft transition hover:border-primary hover:text-primary"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mounted && createPortal(
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${
              open ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 right-0 z-50 flex w-72 max-w-[80vw] flex-col border-l border-line bg-surface shadow-card transition-transform duration-200 ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-dashed border-line bg-primary-tint font-display text-lg font-bold text-primary">+</span>
            <div className="leading-tight">
              <p className="font-display text-sm font-semibold">Aquí puede ir tu logo</p>
              <p className="text-xs text-soft">{CLINIC.name}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-soft transition hover:border-danger hover:text-danger"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-primary text-white shadow-card" : "text-ink hover:bg-primary-tint/50"
                }`}
              >
                <span className={active ? "text-white" : "text-soft"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger-tint"
          >
            {ICONS.logout}
            Cerrar sesión
          </button>
        </div>
          </aside>
        </>,
        document.body
      )}
    </>
  );
}
