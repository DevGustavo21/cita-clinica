import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDoctor } from "@/lib/auth";
import { buildRecordPayload } from "@/lib/patients";

export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };
const PAGE_SIZE = 8;

/**
 * GET /api/patients/[id]/records?offset=0 — página del historial (más reciente
 * primero). Devuelve { records, total, hasMore } para paginar expedientes largos.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);

  const db = supabaseAdmin();
  const { data, error, count } = await db
    .from("medical_records")
    .select("*", { count: "exact" })
    .eq("patient_id", params.id)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Error consultando el historial" }, { status: 500 });
  }

  const total = count ?? 0;
  return NextResponse.json(
    { records: data ?? [], total, hasMore: offset + (data?.length ?? 0) < total },
    noStore
  );
}

/** POST /api/patients/[id]/records — agrega una consulta al expediente (solo doctor). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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
    .insert({ patient_id: params.id, ...buildRecordPayload(body) })
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo guardar la consulta." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, record: data }, { status: 201 });
}
