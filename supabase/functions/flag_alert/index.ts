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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") ?? "centroscm@proton.me";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // El webhook de Supabase envía un POST con el record en el body
  const payload = await req.json();
  const flag = payload.record;

  if (!flag) {
    return new Response("No record", { status: 400 });
  }

  // Obtener el contenido reportado
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let contentBody = "(sin contenido)";
  let contentType = flag.target_type;
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
