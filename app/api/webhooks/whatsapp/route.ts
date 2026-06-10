import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { todayStr } from "@/lib/config";
import {
  cancelConfirmationMessage,
  normalizePhone,
  sendNotification,
} from "@/lib/notifications";
import type { Appointment } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/whatsapp — webhook de mensajes entrantes de Twilio.
 * Configurar en Twilio: "When a message comes in" → {SITE_URL}/api/webhooks/whatsapp
 *
 * Si el paciente escribe "Cancelar":
 *  1. Se busca su próxima cita activa por número de teléfono.
 *  2. Se marca como cancelada → el slot queda libre al instante
 *     (el índice único solo cuenta citas 'scheduled').
 *  3. Se le responde confirmando la cancelación.
 *
 * Cualquier otro mensaje no requiere acción: no responder = confirmar.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return twiml("");

  const body = String(form.get("Body") ?? "").trim().toLowerCase();
  const from = String(form.get("From") ?? "").replace("whatsapp:", "");

  if (!body.startsWith("cancelar")) {
    // No respondemos: el silencio confirma la cita.
    return twiml("");
  }

  const db = supabaseAdmin();
  const phoneDigits = normalizePhone(from).replace(/\D/g, "");

  // Próxima cita activa de este número (comparando por dígitos finales)
  const { data } = await db
    .from("appointments")
    .select("*")
    .eq("status", "scheduled")
    .gte("date", todayStr())
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  const appointment = ((data ?? []) as Appointment[]).find((a) => {
    const d = a.phone.replace(/\D/g, "");
    return phoneDigits.endsWith(d.slice(-8)) || d.endsWith(phoneDigits.slice(-8));
  });

  if (!appointment) {
    return twiml(
      "No encontramos una cita activa asociada a este número. Si crees que es un error, llámanos a la clínica. 💙"
    );
  }

  await db
    .from("appointments")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", appointment.id);

  // Registramos la confirmación (en demo queda en notifications_log)
  await sendNotification(
    appointment,
    "cancel_confirmation",
    cancelConfirmationMessage(appointment)
  );

  return twiml(cancelConfirmationMessage(appointment));
}

function twiml(message: string) {
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(xml, { headers: { "Content-Type": "text/xml" } });
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
