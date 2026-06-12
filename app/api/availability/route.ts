import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { daySlots, isClosedDay, nowInManagua, todayStr, SCHEDULE } from "@/lib/config";
import type { DayAvailability } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/availability?month=YYYY-MM  → estado de cada día del mes
 * GET /api/availability?date=YYYY-MM-DD → horas disponibles de ese día
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const date = searchParams.get("date");

  const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
  try {
    if (date) return NextResponse.json({ slots: await availableSlotsFor(date) }, noStore);
    if (month) return NextResponse.json({ days: await monthAvailability(month) }, noStore);
    return NextResponse.json({ error: "Falta ?month= o ?date=" }, { status: 400 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: "Error consultando disponibilidad" }, { status: 500 });
  }
}

async function bookedCountByDay(from: string, to: string) {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select("date, time")
    .eq("status", "scheduled")
    .gte("date", from)
    .lte("date", to);
  if (error) throw error;
  const map = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!map.has(row.date)) map.set(row.date, new Set());
    map.get(row.date)!.add(String(row.time).slice(0, 5));
  }
  return map;
}

async function monthAvailability(month: string): Promise<Record<string, DayAvailability>> {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const booked = await bookedCountByDay(first, last);

  const today = todayStr();
  const horizon = new Date(Date.now() + SCHEDULE.bookingHorizonDays * 86400_000)
    .toISOString()
    .slice(0, 10);
  const totalSlots = daySlots().length;
  const result: Record<string, DayAvailability> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    const closed = isClosedDay(dateStr) || dateStr > horizon;
    const past = dateStr < today;
    const taken = booked.get(dateStr)?.size ?? 0;
    let effectiveTotal = totalSlots;
    if (dateStr === today) {
      const nowH = nowInManagua().getUTCHours();
      effectiveTotal = daySlots().filter((s) => Number(s.slice(0, 2)) > nowH).length;
    }
    const available = closed || past ? 0 : Math.max(0, effectiveTotal - taken);
    result[dateStr] = {
      closed,
      past,
      full: !closed && !past && available === 0,
      available,
      total: totalSlots,
    };
  }
  return result;
}

async function availableSlotsFor(dateStr: string): Promise<string[]> {
  if (isClosedDay(dateStr) || dateStr < todayStr()) return [];
  const booked = await bookedCountByDay(dateStr, dateStr);
  const taken = booked.get(dateStr) ?? new Set<string>();
  let slots = daySlots().filter((s) => !taken.has(s));
  if (dateStr === todayStr()) {
    const nowH = nowInManagua().getUTCHours();
    slots = slots.filter((s) => Number(s.slice(0, 2)) > nowH);
  }
  return slots;
}
