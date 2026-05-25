# Buscador de Centros Educativos · Comunidad de Madrid

App web 100 % estática (Next.js 15 + Tailwind) que consulta el histórico de
vacantes de centros educativos públicos de la Comunidad de Madrid generado por
los scripts Python del repo padre.

## Datos

Los JSON viven en [public/data/](public/data/) y se regeneran con el script
Python del repo padre:

```powershell
# Desde la raíz del repo (no desde web-next/)
python generar_json.py
```

Esto reescribe:

- `public/data/centros.json` — lista completa (1281 centros)
- `public/data/municipios.json` — 167 municipios con conteo
- `public/data/metricas.json` — KPIs

## Desarrollo

```powershell
npm install
npm run dev
# http://localhost:3000
```

## Build estático

```powershell
npm run build
# salida en out/
```

## Despliegue en Vercel

La app está configurada con `output: "export"` en
[next.config.mjs](next.config.mjs), así que se publica como sitio estático.

### Opción A — Vercel CLI

```powershell
npm i -g vercel
vercel        # primera vez: vincula el proyecto
vercel --prod # publicar
```

### Opción B — Importar repo en vercel.com

1. Importa el repo en https://vercel.com/new
2. Root directory: `web-next`
3. Framework preset: Next.js (detectado automáticamente)
4. Build command y output directory ya vienen en [vercel.json](vercel.json).

## Checklist de producción (RGPD / LOPDGDD)

La app almacena datos personales (`auth.users.email`, `profiles.display_name`,
reseñas y comentarios identificables). Antes de abrir a usuarios reales hay que
verificar **manualmente** estos puntos en los paneles correspondientes — no
están en el código:

- [ ] **Región del proyecto Supabase:** Dashboard → Project Settings → General.
      Debe ser una región europea (`eu-central-1` Frankfurt o `eu-west-*`
      Irlanda). La región **no se puede cambiar después** sin migración
      completa. Si está en `us-*`, hay que recrear el proyecto en UE antes de
      captar usuarios. Anotar la región confirmada aquí: `____`.
- [ ] **Resend (envío de emails):** la región de procesamiento condiciona dónde
      se procesan los emails de reportes. Confirmar región UE en el panel de
      Resend.
- [ ] **Site URL y redirect URLs de Auth (Supabase):** Dashboard → Authentication
      → URL Configuration. Site URL debe ser el dominio de producción (no
      `http://127.0.0.1:3000`). Redirect URLs debe incluir el dominio de
      Vercel para que el flujo OAuth funcione en producción.
- [ ] **`supabase/config.toml`** es solo para desarrollo local (valores
      `127.0.0.1`). No replicar esos valores en el proyecto cloud.
- [ ] **Secretos de la Edge Function `flag_alert`:** ver
      [supabase/functions/flag_alert/README.md](../supabase/functions/flag_alert/README.md).
      `FLAG_WEBHOOK_SECRET` configurado en el dashboard y en la cabecera
      `x-webhook-secret` del Database Webhook.


https://github.com/s-nt-s/centros-db