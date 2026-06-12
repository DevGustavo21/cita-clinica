import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isDoctor } from "@/lib/auth";

export const dynamic = "force-dynamic";

const BUCKET = "patient-photos";
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/patients/photo — sube la foto del paciente (multipart, campo "file")
 * y devuelve { url } público. El bucket se crea solo la primera vez.
 */
export async function POST(req: NextRequest) {
  if (!isDoctor(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
  if (!file.type.startsWith("image/"))
    return NextResponse.json({ error: "El archivo debe ser una imagen." }, { status: 400 });
  if (file.size > MAX_BYTES)
    return NextResponse.json({ error: "La imagen no debe superar los 5 MB." }, { status: 400 });

  const db = supabaseAdmin();

  // Crea el bucket público si todavía no existe (idempotente).
  await db.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (error) {
    console.error(error);
    return NextResponse.json({ error: "No se pudo subir la imagen." }, { status: 500 });
  }

  const { data } = db.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl }, { status: 201 });
}
