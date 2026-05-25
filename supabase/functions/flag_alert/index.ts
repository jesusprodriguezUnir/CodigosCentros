// Supabase Edge Function: flag_alert
// Dispara cuando se inserta una fila en la tabla `flags`.
// Envía un email al administrador con el contenido reportado.
//
// Desplegar:
//   supabase functions deploy flag_alert --no-verify-jwt
//
// Configurar el Database Webhook en el dashboard de Supabase:
//   Tabla: flags  |  Evento: INSERT
//   URL: https://<ref>.supabase.co/functions/v1/flag_alert
//   HTTP Headers: x-webhook-secret = <valor de FLAG_WEBHOOK_SECRET>
//
// Configurar secretos de la función (Supabase Dashboard → Edge Functions → Secrets):
//   FLAG_WEBHOOK_SECRET=<token aleatorio largo>
//   RESEND_API_KEY=<api key de Resend>
//   ADMIN_EMAIL=<destinatario>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "centroscm@proton.me";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FLAG_WEBHOOK_SECRET = Deno.env.get("FLAG_WEBHOOK_SECRET");

// Comparación en tiempo constante para evitar timing attacks.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  // 1. Verificar secreto compartido. Sin esto, cualquiera podría invocar la URL
  //    pública de la función (desplegada con --no-verify-jwt) y disparar emails.
  if (!FLAG_WEBHOOK_SECRET) {
    console.error("FLAG_WEBHOOK_SECRET no configurado");
    return new Response("Server misconfigured", { status: 500 });
  }
  const providedSecret = req.headers.get("x-webhook-secret") ?? "";
  if (!timingSafeEqual(providedSecret, FLAG_WEBHOOK_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parsear y validar la forma del payload.
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const rawFlag = (payload as { record?: Record<string, unknown> } | null)?.record;
  if (
    !rawFlag ||
    typeof rawFlag.target_type !== "string" ||
    (rawFlag.target_type !== "review" && rawFlag.target_type !== "comment") ||
    typeof rawFlag.target_id !== "string"
  ) {
    return new Response("Invalid payload", { status: 400 });
  }
  const flag = {
    target_type: rawFlag.target_type as "review" | "comment",
    target_id: rawFlag.target_id,
    reason: typeof rawFlag.reason === "string" ? rawFlag.reason : null,
  };

  // Obtener el contenido reportado
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let contentBody = "(sin contenido)";
  const contentType = flag.target_type;
  let centroLink = "";

  if (flag.target_type === "review") {
    const { data } = await supabase
      .from("reviews")
      .select("body, centro_codigo")
      .eq("id", flag.target_id)
      .single();
    if (data) {
      contentBody = data.body;
      centroLink = `https://codigos-centros.vercel.app/centro/${data.centro_codigo}`;
    }
  } else if (flag.target_type === "comment") {
    const { data } = await supabase
      .from("comments")
      .select("body")
      .eq("id", flag.target_id)
      .single();
    if (data) contentBody = data.body;
  }

  const subject = `[Centros CM] Nuevo reporte de ${contentType}`;
  const html = `
    <p>Se ha reportado el siguiente contenido:</p>
    <blockquote style="border-left:3px solid #c8102e;padding-left:12px;color:#555">
      ${contentBody}
    </blockquote>
    <p><strong>Motivo:</strong> ${flag.reason ?? "Sin especificar"}</p>
    ${centroLink ? `<p><a href="${centroLink}">Ver centro</a></p>` : ""}
    <p>
      <a href="https://codigos-centros.vercel.app/admin/moderacion">
        Ir al panel de moderación →
      </a>
    </p>
  `;

  // Enviar email via Resend (si hay API key) o solo loggear
  if (RESEND_API_KEY) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Centros CM <noreply@centroscm.es>",
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    });
  } else {
    console.log("RESEND_API_KEY not set — email not sent:", subject);
  }

  return new Response("ok", { status: 200 });
});
