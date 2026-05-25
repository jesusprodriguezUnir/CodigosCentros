-- Añade columnas lat/lng float8 accesibles por la REST API de Supabase
-- (la columna geom PostGIS sigue siendo la fuente de verdad pero requiere psycopg)
ALTER TABLE centros ADD COLUMN IF NOT EXISTS lat float8;
ALTER TABLE centros ADD COLUMN IF NOT EXISTS lng float8;

-- Índices para rangos geográficos sin PostGIS (consultas de proximidad simple)
CREATE INDEX IF NOT EXISTS idx_centros_lat ON centros (lat);
CREATE INDEX IF NOT EXISTS idx_centros_lng ON centros (lng);

-- Si ya hay datos en geom, rellenar lat/lng desde ella
UPDATE centros
SET    lat = ST_Y(geom::geometry),
       lng = ST_X(geom::geometry)
WHERE  geom IS NOT NULL
  AND  lat IS NULL;
