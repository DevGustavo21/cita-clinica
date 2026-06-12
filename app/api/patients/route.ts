import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDoctor } from "@/lib/auth";
import { buildPatientPayload } from "@/lib/patients";

export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store, max-age=0" } };

/**
 * GET /api/patients?q=texto — busca pacientes por nombre o apellido (solo doctor).
 * Sin ?q= devuelve los más recientes.
 */
export async function GET(req: NextRequest) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  const db = supabaseAdmin();
  let query = db
    .from("patients")
    .select("id, first_name, last_name, birth_date, phone, email, photo_url")
    .order("last_name", { ascending: true })
    .limit(50);

  if (q) {
    // Busca el término en nombre o apellido (case-insensitive).
    const safe = q.replace(/[%,]/g, " ");
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error(error);
    return NextResponse.json({ error: "Error buscando pacientes" }, { status: 500 });
  }
  return NextResponse.json({ patients: data ?? [] }, noStore);
}

/**
 * POST /api/patients — crea el perfil/expediente de un paciente (solo doctor).
 */
export async function POST(req: NextRequest) {
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
    .insert(buildPatientPayload(body))
    .select()
    .single();

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo crear el paciente." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, patient: data }, { status: 201 });
}
