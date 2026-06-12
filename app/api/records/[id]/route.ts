import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDoctor } from "@/lib/auth";
import { buildRecordPayload } from "@/lib/patients";

export const dynamic = "force-dynamic";

/** PATCH /api/records/[id] — edita una consulta del expediente (solo doctor). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data, error } = await db
    .from("medical_records")
    .update({ ...buildRecordPayload(body), updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error || !data)
    return NextResponse.json({ error: "No se pudo actualizar la consulta." }, { status: 500 });
  return NextResponse.json({ ok: true, record: data });
}

/** DELETE /api/records/[id] — elimina una consulta del expediente (solo doctor). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const db = supabaseAdmin();
  const { error } = await db.from("medical_records").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: "No se pudo eliminar." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
