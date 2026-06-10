// ============================================================
// Configuración central — TODO lo editable de la clínica vive aquí
// ============================================================

export const CLINIC = {
  name: "Clínica Vida Plena",
  tagline: "Medicina general y odontología",
  doctor: "Dra. María Fernanda Castillo",
  specialty: "Medicina General",
  // Dirección lorem (placeholder) — reemplazar por la real
  address: "Av. Lorem Ipsum #123, Plaza Salud, Módulo 4, Managua",
  phone: "+505 8888 8888",
};

export const SCHEDULE = {
  /** Hora de apertura (inclusive) */
  startHour: 8,
  /** Última hora agendable: se generan slots hasta endHour - 1 (la última cita es 16:00) */
  endHour: 17,
  /** Horas bloqueadas (almuerzo, etc.) */
  blockedHours: [12],
  /** Días cerrados: 0 = domingo ... 6 = sábado */
  closedWeekdays: [0],
  /** Citas simultáneas por slot */
  capacityPerSlot: 1,
  /** Cuántos días hacia adelante se puede agendar */
  bookingHorizonDays: 60,
};

/** Offset fijo de Nicaragua (UTC-6, sin horario de verano) */
export const TZ_OFFSET_HOURS = -6;

/** Genera la lista de horas agendables de un día: ["08:00", "09:00", ...] */
export function daySlots(): string[] {
  const slots: string[] = [];
  for (let h = SCHEDULE.startHour; h < SCHEDULE.endHour; h++) {
    if (SCHEDULE.blockedHours.includes(h)) continue;
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

/** ¿El día de la semana está cerrado? dateStr = "YYYY-MM-DD" */
export function isClosedDay(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return SCHEDULE.closedWeekdays.includes(weekday);
}

/** "Ahora" en hora de Managua, como objeto Date desplazado (usar solo getUTC*) */
export function nowInManagua(): Date {
  return new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000);
}

/** Fecha de hoy en Managua: "YYYY-MM-DD" */
export function todayStr(): string {
  return nowInManagua().toISOString().slice(0, 10);
}

/** Saludo según la hora de Managua: "Buenos días" / "Buenas tardes" / "Buenas noches" */
export function greeting(): string {
  const h = nowInManagua().getUTCHours();
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Instante UTC (ms) de una cita local de Managua */
export function apptUtcMs(dateStr: string, timeStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh - TZ_OFFSET_HOURS, mm || 0);
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-NI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export function formatTime12(timeStr: string): string {
  const [hh] = timeStr.split(":").map(Number);
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:00 ${suffix}`;
}
