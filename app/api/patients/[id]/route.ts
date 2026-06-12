import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDoctor } from "@/lib/auth";
import { buildPatientPayload } from "@/lib/patients";

export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

/** GET /api/patients/[id] — perfil del paciente + total de consultas (solo doctor). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });

  const { count } = await db
    .from("medical_records")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", params.id);

  return NextResponse.json({ patient: data, recordCount: count ?? 0 }, noStore);
}

/** PATCH /api/patients/[id] — actualiza el perfil del paciente (solo doctor). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const firstName = String(body.first_name ?? "").trim();
  const lastName = String(body.last_name ?? "").trim();
  const errors: Record<string, string> = {};
  if (firstName.length < 2) errors.first_name = "Ingresa el nombre.";
  if (lastName.length < 2) errors.last_name = "Ingresa el apellido.";
  if (Object.keys(errors).length)
    return NextResponse.json({ error: "Revisa los campos.", fields: errors }, { status: 400 });

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("patients")
    .update({ ...buildPatientPayload(body), updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json({ error: "No se pudo actualizar el paciente." }, { status: 500 });
  return NextResponse.json({ ok: true, patient: data });
}

/** DELETE /api/patients/[id] — elimina el paciente y su expediente (solo doctor). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  const { error } = await db.from("patients").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
