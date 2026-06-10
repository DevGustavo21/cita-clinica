# 🏥 Clínica Citas — Plataforma de agendado para clínicas privadas

Plataforma web (Next.js 14 App Router + Supabase + Tailwind) con dos pantallas:

| Pantalla | Ruta | Descripción |
|---|---|---|
| **Paciente** | `/` | Formulario de agendado con calendario de disponibilidad real |
| **Doctor** | `/doctor` | Dashboard con lista cronológica del día, vista calendario (celdas) y vista lista (por hora) |

---

## ⚡ Setup en 5 minutos

### 1. Base de datos (Supabase)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre **SQL Editor** y pega el contenido de `supabase/schema.sql` → **Run**.
3. Copia la **URL** y la **service_role key** (Settings → API).

### 2. Variables de entorno
```bash
cp .env.example .env.local
```
Rellena:
- `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- `DOCTOR_ACCESS_KEY` → la clave con la que el doctor entra a `/doctor/login`
- `CRON_SECRET` → cualquier string aleatorio
- `NEXT_PUBLIC_SITE_URL` → URL pública (para el enlace de cancelación)

### 3. Correr
```bash
npm install
npm run dev
```

---

## 🔒 Validación de disponibilidad (100% backend)

- `GET /api/availability?month=YYYY-MM` → estado de cada día (`full`, `closed`, `past`, `available`). El frontend pinta los días saturados en **rojizo y bloqueados**.
- `GET /api/availability?date=YYYY-MM-DD` → **solo** las horas libres (las ocupadas nunca llegan al cliente). Para "hoy", las horas pasadas se excluyen.
- `POST /api/appointments` re-valida todo: campos, tutor obligatorio si edad < 18, día abierto, hora dentro del horario, slot libre.
- **Anti doble-reserva real**: índice único parcial en Postgres sobre `(date, time) where status='scheduled'`. Si dos personas reservan el mismo slot al mismo tiempo, la segunda recibe un 409 y el frontend refresca las horas automáticamente.
- Al **cancelar** (paciente o doctor), el status cambia a `cancelled` → el índice deja de aplicar → **el slot se libera al instante**.

## ⏰ Recordatorios automáticos

`/api/cron/reminders` corre cada 15 min vía **Vercel Cron** (ya configurado en `vercel.json`).

- **24h antes** (ventana 25h→2h): mensaje personalizado con nombre, doctor, día, hora y dirección, más el bloque de confirmación:
  > ¿Te gustaría confirmar tu cita el mismo día y hora?
  > ✅ No respondas este mensaje para confirmar.
  > ❌ Escribe **Cancelar** para cancelar la cita y liberar el espacio.
- **2h antes** (ventana 2h→0h): segundo recordatorio el mismo día.
- Cada envío marca `reminder_*_sent_at` → nunca hay duplicados, y si el cron estuvo caído, alcanza los pendientes.

### Modo demo vs WhatsApp real
- **Sin credenciales de Twilio** → modo demo: todos los mensajes quedan guardados en la tabla `notifications_log` (puedes verlos en Supabase para validar el flujo completo sin costo).
- **Con Twilio** (descomenta las 3 variables en `.env.local`) → se envían por WhatsApp.
  - Webhook de respuesta: en Twilio → WhatsApp Sender → *When a message comes in* → `https://TU-DOMINIO/api/webhooks/whatsapp`
  - Si el paciente escribe **"Cancelar"**, el sistema busca su próxima cita activa por teléfono, la cancela, libera el slot y le responde confirmando.
- Adicional: cada recordatorio incluye un **enlace de cancelación** (`/cancelar/[token]`) como vía alternativa.

## ⚙️ Configuración de la clínica

Todo en `lib/config.ts`:
- Nombre, doctor, dirección (lorem por ahora), teléfono.
- Horario: 8:00–17:00, almuerzo 12:00 bloqueado, domingo cerrado, 1 cita/hora, horizonte de 60 días.
- Zona horaria fija: America/Managua (UTC-6).

## 🔐 Acceso del doctor

Login simple por clave (`DOCTOR_ACCESS_KEY`) → cookie httpOnly de 12h. El middleware protege `/doctor/*` y la API de citas verifica la cookie en cada request. Para multi-doctor o roles, el siguiente paso natural es Supabase Auth.

## 🧪 Probar el flujo de recordatorios localmente

```bash
# Agenda una cita para mañana desde la web, luego:
curl -H "Authorization: Bearer TU_CRON_SECRET" http://localhost:3000/api/cron/reminders
# Revisa la tabla notifications_log en Supabase: ahí está el mensaje completo.
```

## 📦 Deploy a Vercel

1. Sube el repo y conéctalo a Vercel.
2. Agrega las variables de entorno del `.env.example`.
3. `vercel.json` ya registra el cron (`*/15 * * * *`). Vercel envía automáticamente `Authorization: Bearer $CRON_SECRET`.
