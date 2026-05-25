# flag_alert

Edge Function que se dispara con un Database Webhook cuando se inserta una fila en `flags`. Recupera el contenido reportado (reseña o comentario) y envía un email al administrador vía Resend.

## Autenticación

La función se despliega con `--no-verify-jwt` porque la invoca un webhook de Supabase (no un usuario autenticado). Para evitar que cualquiera pueda invocar la URL pública y disparar emails, se verifica un **secreto compartido** en la cabecera `x-webhook-secret`.

Sin esa cabecera (o con valor incorrecto) la función responde `401 Unauthorized`.

## Secretos requeridos

Configurar en **Supabase Dashboard → Edge Functions → flag_alert → Secrets**:

| Nombre | Descripción |
|---|---|
| `FLAG_WEBHOOK_SECRET` | Token aleatorio largo. Generar con `openssl rand -hex 32`. |
| `RESEND_API_KEY` | API key de Resend para envío de emails. |
| `ADMIN_EMAIL` | Destinatario del aviso (por defecto `centroscm@proton.me`). |

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente.

## Configurar el webhook

**Supabase Dashboard → Database → Webhooks → Create a new hook**

- **Name:** `flag_alert`
- **Table:** `flags`
- **Events:** `INSERT`
- **Type:** HTTP Request
- **HTTP method:** `POST`
- **URL:** `https://<ref>.supabase.co/functions/v1/flag_alert`
- **HTTP Headers:**
  - `Content-Type: application/json`
  - `x-webhook-secret: <mismo valor que FLAG_WEBHOOK_SECRET>`

## Desplegar

```bash
supabase functions deploy flag_alert --no-verify-jwt
```

## Verificar

Sin cabecera → 401:

```bash
curl -i -X POST https://<ref>.supabase.co/functions/v1/flag_alert \
  -H "Content-Type: application/json" \
  -d '{"record":{"target_type":"review","target_id":"abc"}}'
# HTTP/2 401
```

Con cabecera correcta y payload válido → 200:

```bash
curl -i -X POST https://<ref>.supabase.co/functions/v1/flag_alert \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <secreto>" \
  -d '{"record":{"target_type":"review","target_id":"<uuid real>","reason":"spam"}}'
# HTTP/2 200
```

Payload mal formado (sin `record` o sin `target_type`/`target_id`) → 400.

## Rotar el secreto

1. Generar nuevo valor (`openssl rand -hex 32`).
2. Actualizar `FLAG_WEBHOOK_SECRET` en los secretos de la función.
3. Actualizar la cabecera `x-webhook-secret` del webhook en el dashboard.
4. Los dos cambios deben aplicarse a la vez para evitar ventana de error.
