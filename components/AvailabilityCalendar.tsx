"use client";

import { useEffect, useState } from "react";
import type { DayAvailability } from "@/lib/types";

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  selected: string | null;
  onSelect: (date: string) => void;
}

/**
 * Calendario del paciente. El backend (/api/availability?month=) decide
 * el estado de cada día; aquí solo se pinta:
 *  - disponible → color normal, clickeable
 *  - saturado  → rojizo, bloqueado
 *  - cerrado/pasado → atenuado, bloqueado
 */
export default function AvailabilityCalendar({ selected, onSelect }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [days, setDays] = useState<Record<string, DayAvailability> | null>(null);
  const [loading, setLoading] = useState(true);

  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`/api/availability?month=${monthKey}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setDays(j.days ?? {}))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [monthKey]);

  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const next = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={prev} aria-label="Mes anterior"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-soft transition hover:border-primary hover:text-primary">
          ‹
        </button>
        <p className="font-display text-base font-semibold">
          {MONTHS[month]} {year}
        </p>
        <button type="button" onClick={next} aria-label="Mes siguiente"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-soft transition hover:border-primary hover:text-primary">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-xs font-semibold uppercase tracking-wide text-soft">{w}</span>
        ))}

        {Array.from({ length: firstWeekday }).map((_, i) => <span key={`pad-${i}`} />)}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${monthKey}-${String(d).padStart(2, "0")}`;
          const info = days?.[dateStr];
          const isSelected = selected === dateStr;

          const disabled = loading || !info || info.closed || info.past || info.full;
          const full = info?.full;
          const past = info?.past;

          let cls =
            "relative aspect-square rounded-xl text-sm font-medium transition select-none ";
          if (isSelected) {
            cls += "bg-primary text-white shadow-card";
          } else if (past) {
            cls += "bg-danger-tint/40 text-danger/50 cursor-not-allowed line-through decoration-danger/30";
          } else if (full) {
            cls += "bg-danger-tint text-danger/80 cursor-not-allowed line-through decoration-danger/40";
          } else if (disabled) {
            cls += "text-soft/40 cursor-not-allowed";
          } else {
            cls += "bg-primary-tint/50 text-primary-deep hover:bg-primary hover:text-white cursor-pointer";
          }

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(dateStr)}
              className={cls}
              title={
                past
                  ? "Día pasado"
                  : full
                  ? "Día saturado — sin horas disponibles"
                  : undefined
              }
            >
              {d}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-soft">
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-primary-tint ring-1 ring-primary/30" /> Disponible
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-danger-tint ring-1 ring-danger/40" /> Saturado
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-danger-tint/40 ring-1 ring-danger/20" /> Día pasado
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-3 w-3 rounded bg-bg ring-1 ring-line" /> No disponible
        </span>
      </div>
    </div>
  );
}
