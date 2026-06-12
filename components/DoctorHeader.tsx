"use client";

import { CLINIC } from "@/lib/config";
import DoctorMenu from "./DoctorMenu";

/** Barra superior reutilizable del panel del doctor. */
export default function DoctorHeader({ subtitle = "Panel de citas" }: { subtitle?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl border-2 border-dashed border-line bg-primary-tint font-display text-lg font-bold text-primary">+</span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold sm:text-base">Aquí puede ir tu logo</p>
            <p className="text-xs text-soft">{CLINIC.name} · {subtitle}</p>
          </div>
        </div>
        <DoctorMenu />
      </div>
    </header>
  );
}
