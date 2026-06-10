import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { daySlots, isClosedDay, todayStr, nowInManagua, SCHEDULE } from "@/lib/config";
import { cancelConfirmationMessage, sendNotification } from "@/lib/notifications";
import { isDoctor } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/appointments — agendar (público, validación completa en backend)
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const age = Number(body.age);
  const guardianName = String(body.guardianName ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const date = String(body.date ?? "").trim();
  const time = String(body.time ?? "").trim();

  // ── Validaciones de campos ────────────────────────────────
  const errors: Record<string, string> = {};
  if (firstName.length < 2) errors.firstName = "Ingresa tu nombre.";
  if (lastName.length < 2) errors.lastName = "Ingresa tu apellido.";
  if (!Number.isInteger(age) || age < 1 || age > 119) errors.age = "Edad inválida.";
  if (Number.isInteger(age) && age < 18 && guardianName.length < 3)
    errors.guardianName = "Para menores de 18 años, el nombre del tutor es obligatorio.";
  if (phone.replace(/\D/g, "").length < 8) errors.phone = "Teléfono inválido.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Correo inválido.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.date = "Selecciona un día.";
  if (!/^\d{2}:\d{2}$/.test(time)) errors.time = "Selecciona una hora.";
  if (Object.keys(errors).length) {
    return NextResponse.json({ error: "Revisa los campos.", fields: errors }, { status: 400 });
  }

  // ── Validaciones de disponibilidad (backend manda) ────────
  if (date < todayStr())
    return NextResponse.json({ error: "Ese día ya pasó." }, { status: 400 });
  if (isClosedDay(date))
    return NextResponse.json({ error: "La clínica no atiende ese día." }, { status: 400 });
  const horizon = new Date(Date.now() + SCHEDULE.bookingHorizonDays * 86400_000)
    .toISOString()
    .slice(0, 10);
  if (date > horizon)
    return NextResponse.json({ error: "Solo se puede agendar dentro de los próximos 60 días." }, { status: 400 });
  if (!daySlots().includes(time))
    return NextResponse.json({ error: "Esa hora no es parte del horario de atención." }, { status: 400 });
  if (date === todayStr() && Number(time.slice(0, 2)) <= nowInManagua().getUTCHours())
    return NextResponse.json({ error: "Esa hora ya pasó hoy." }, { status: 400 });

  const db = supabaseAdmin();

  // ¿El slot está libre? (verificación + el índice único como red de seguridad)
  const { count } = await db
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("date", date)
    .eq("time", time)
    .eq("status", "scheduled");
  if ((count ?? 0) >= SCHEDULE.capacityPerSlot) {
    return NextResponse.json(
      { error: "Esa hora acaba de ser tomada. Elige otra disponible." },
      { status: 409 }
    );
  }

  const { data, error } = await db
    .from("appointments")
    .insert({
      first_name: firstName,
      last_name: lastName,
      age,
      guardian_name: age < 18 ? guardianName : null,
      phone,
      email,
      date,
      time,
    })
    .select()
    .single();

  if (error) {
    // 23505 = violación del índice único → otro usuario ganó el slot
    if ((error as any).code === "23505") {
      return NextResponse.json(
        { error: "Esa hora acaba de ser tomada. Elige otra disponible." },
        { status: 409 }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "No se pudo agendar. Intenta de nuevo." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, appointment: data }, { status: 201 });
}

/**
 * GET /api/appointments?start=YYYY-MM-DD&end=YYYY-MM-DD — solo doctor
 */
export async function GET(req: NextRequest) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end)
    return NextResponse.json({ error: "Faltan ?start= y ?end=" }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("appointments")
    .select("*")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("time", { ascending: true });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Error consultando citas" }, { status: 500 });
  }
  return NextResponse.json({ appointments: data });
}

/**
 * PATCH /api/appointments — cancelar
 *  - { cancelToken } → cancelación del paciente (enlace del mensaje)
 *  - { id, action: "cancel" | "complete" } → acción del doctor
 * Cancelar libera el slot automáticamente: el índice único solo aplica
 * a citas con status 'scheduled'.
 */
export async function PATCH(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (body.cancelToken) {
    const { data, error } = await db
      .from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("cancel_token", body.cancelToken)
      .eq("status", "scheduled")
      .select()
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Cita no encontrada o ya cancelada" }, { status: 404 });
    await sendNotification(data, "cancel_confirmation", cancelConfirmationMessage(data));
    return NextResponse.json({ ok: true });
  }

  if (body.id && (body.action === "cancel" || body.action === "complete")) {
    if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const patch =
      body.action === "cancel"
        ? { status: "cancelled", cancelled_at: new Date().toISOString() }
        : { status: "completed" };
    const { error } = await db
      .from("appointments")
      .update(patch)
      .eq("id", body.id)
      .eq("status", "scheduled");
    if (error) return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
}
