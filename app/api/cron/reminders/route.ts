import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { apptUtcMs, todayStr } from "@/lib/config";
import {
  reminder24hMessage,
  reminder2hMessage,
  sendNotification,
} from "@/lib/notifications";
import type { Appointment } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/reminders — ejecutado por Vercel Cron cada 15 min.
 *
 * Lógica de ventanas (tolerante a caídas del cron):
 *  - Recordatorio 24h: cuando faltan entre 2 y 25 horas y aún no se envió.
 *    (la cita del viernes recibe su recordatorio desde el jueves)
 *  - Recordatorio 2h: cuando faltan entre 0 y 2 horas y aún no se envió.
 *
 * Se marca reminder_*_sent_at ANTES de considerar la cita de nuevo,
 * así nunca se duplican mensajes.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron manda Authorization: Bearer CRON_SECRET
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .eq("status", "scheduled")
    .gte("date", todayStr()); // solo presentes/futuras

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Error leyendo citas" }, { status: 500 });
  }

  const now = Date.now();
  let sent24 = 0;
  let sent2 = 0;

  for (const a of (data ?? []) as Appointment[]) {
    const hoursLeft = (apptUtcMs(a.date, a.time.slice(0, 5)) - now) / 3600_000;
    if (hoursLeft <= 0) continue;

    if (!a.reminder_24h_sent_at && hoursLeft <= 25 && hoursLeft > 2) {
      await db
        .from("appointments")
        .update({ reminder_24h_sent_at: new Date().toISOString() })
        .eq("id", a.id);
      await sendNotification(a, "reminder_24h", reminder24hMessage(a));
      sent24++;
    }

    if (!a.reminder_2h_sent_at && hoursLeft <= 2) {
      await db
        .from("appointments")
        .update({ reminder_2h_sent_at: new Date().toISOString() })
        .eq("id", a.id);
      await sendNotification(a, "reminder_2h", reminder2hMessage(a));
      sent2++;
    }
  }

  return NextResponse.json({ ok: true, sent24, sent2 });
}
