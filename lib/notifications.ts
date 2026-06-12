import { supabaseAdmin } from "./supabase";
import { CLINIC, formatDateLong, formatTime12 } from "./config";
import type { Appointment } from "./types";

// ============================================================
// Plantillas de mensajes (24h antes / 2h antes / confirmación de cancelación)
// ============================================================

const CONFIRM_BLOCK = [
  "¿Te gustaría confirmar tu cita el mismo día y hora?",
  "✅ *No respondas este mensaje para confirmar.*",
  "❌ Escribe *Cancelar* para cancelar la cita y liberar el espacio para otra persona.",
].join("\n");

export function reminder24hMessage(a: Appointment): string {
  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/cancelar/${a.cancel_token}`;
  return [
    `¡Hola, ${a.first_name}! 👋 Te saludamos de ${CLINIC.name}.`,
    "",
    `Te recordamos tu cita de mañana:`,
    `🩺 ${CLINIC.doctor}`,
    `📅 ${formatDateLong(a.date)}`,
    `🕐 ${formatTime12(a.time.slice(0, 5))}`,
    `📍 ${CLINIC.address}`,
    "",
    CONFIRM_BLOCK,
    "",
    `También puedes cancelar desde este enlace: ${cancelUrl}`,
    "",
    `¡Te esperamos con gusto! 💙`,
  ].join("\n");
}

export function reminder2hMessage(a: Appointment): string {
  return [
    `¡Hola, ${a.first_name}! ⏰ Tu cita en ${CLINIC.name} es *hoy en 2 horas*.`,
    "",
    `🩺 ${CLINIC.doctor}`,
    `🕐 ${formatTime12(a.time.slice(0, 5))}`,
    `📍 ${CLINIC.address}`,
    "",
    CONFIRM_BLOCK,
    "",
    `¡Nos vemos pronto! 💙`,
  ].join("\n");
}

export function rescheduleMessage(a: Appointment): string {
  const cancelUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/cancelar/${a.cancel_token}`;
  return [
    `Hola, ${a.first_name}. Tu cita en ${CLINIC.name} fue *reprogramada*. 🔄`,
    "",
    `Estos son los nuevos datos de tu cita:`,
    `🩺 ${CLINIC.doctor}`,
    `📅 ${formatDateLong(a.date)}`,
    `🕐 ${formatTime12(a.time.slice(0, 5))}`,
    `📍 ${CLINIC.address}`,
    "",
    `Si no puedes asistir, escribe *Cancelar* o usa este enlace: ${cancelUrl}`,
    "",
    `¡Te esperamos con gusto! 💙`,
  ].join("\n");
}

export function cancelConfirmationMessage(a: Appointment): string {
  return [
    `Hola, ${a.first_name}. Tu cita del ${formatDateLong(a.date)} a las ${formatTime12(
      a.time.slice(0, 5)
    )} fue *cancelada* correctamente. ✅`,
    "",
    `El espacio quedó disponible para otra persona. Cuando quieras, puedes agendar una nueva cita en línea.`,
    "",
    `${CLINIC.name} 💙`,
  ].join("\n");
}

// ============================================================
// Envío: si hay credenciales de Twilio → WhatsApp real.
// Si no → modo demo: el mensaje queda guardado en notifications_log
// (visible y verificable, ideal para desarrollo y demos a clientes).
// ============================================================

type NotificationType = "reminder_24h" | "reminder_2h" | "cancel_confirmation" | "reschedule";

export async function sendNotification(
  appointment: Appointment,
  type: NotificationType,
  message: string
): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  let channel: "demo" | "whatsapp" = "demo";

  if (sid && token && from) {
    const to = `whatsapp:${normalizePhone(appointment.phone)}`;
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: message }),
      }
    );
    if (!res.ok) {
      console.error("Twilio error:", await res.text());
    } else {
      channel = "whatsapp";
    }
  }

  const db = supabaseAdmin();
  await db.from("notifications_log").insert({
    appointment_id: appointment.id,
    type,
    channel,
    to_phone: appointment.phone,
    message,
  });
}

/** Normaliza un teléfono a E.164 básico: dígitos + prefijo de país si falta */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  // Nicaragua: números locales de 8 dígitos
  if (digits.length === 8) return `+505${digits}`;
  return `+${digits}`;
}
