-- ============================================================
-- Ficha oficial — columnas extraídas de gestiona.comunidad.madrid
-- (MostrarFichaCentro.icm) que no están en el CSV de datos.cm.madrid
-- ============================================================

alter table centros
    add column if not exists distrito                text,
    add column if not exists barrio                  text,
    add column if not exists titular                 text,
    add column if not exists denominacion_generica   text,
    add column if not exists fax                     text,
    add column if not exists web                     text,
    add column if not exists servicios               jsonb,
    add column if not exists integracion_preferente  jsonb,
    add column if not exists opciones_linguisticas   jsonb,
    add column if not exists programas_excelencia    jsonb,
    add column if not exists adscripciones           jsonb,
    add column if not exists ficha_scrapeada_at      timestamptz;
