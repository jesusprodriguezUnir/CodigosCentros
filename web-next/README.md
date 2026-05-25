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


https://github.com/s-nt-s/centros-db