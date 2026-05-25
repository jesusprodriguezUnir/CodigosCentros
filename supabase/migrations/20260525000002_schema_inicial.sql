-- ============================================================
-- Esquema principal — Semana 1
-- ============================================================

-- Enum de modos de transporte
create type modo_transporte as enum ('coche', 'publico');

-- ----------------------------------------------------------
-- centros: tabla maestra de centros educativos
-- ----------------------------------------------------------
create table centros (
    codigo          text primary key,
    nombre          text not null,
    municipio       text,
    dat             text,        -- Norte, Sur, Este, Oeste, Capital
    direccion       text,
    cp              text,
    telefono        text,
    email           text,
    tipo            text,        -- CEIP, IES, EOI, CRA, ...
    titularidad     text,        -- Público, Concertado, Privado
    jornada         text,        -- continua, partida
    bilingue        boolean default false,
    idiomas_bilingue text[],
    etapa           text[],      -- Infantil, Primaria, Secundaria, ...
    geom            geography(Point, 4326),
    vacantes        jsonb,       -- {2223: n, 2324: n, 2425: n, 2526_mae: n, ...}
    updated_at      timestamptz default now()
);

-- Índices de centros
create index centros_geom_idx   on centros using gist(geom);
create index centros_etapa_idx  on centros using gin(etapa);
create index centros_nombre_trgm on centros using gin(nombre gin_trgm_ops);
create index centros_dat_idx    on centros(dat);
create index centros_tipo_idx   on centros(tipo);

-- ----------------------------------------------------------
-- dat_zonas: polígonos oficiales de las DAT de Madrid
-- ----------------------------------------------------------
create table dat_zonas (
    id      serial primary key,
    nombre  text not null,
    geom    geography(Polygon, 4326)
);

create index dat_zonas_geom_idx on dat_zonas using gist(geom);

-- ----------------------------------------------------------
-- origen_grid: rejilla de puntos origen precalculada (~1 km)
-- ----------------------------------------------------------
create table origen_grid (
    geohash text primary key,
    geom    geography(Point, 4326)
);

create index origen_grid_geom_idx on origen_grid using gist(geom);

-- ----------------------------------------------------------
-- tiempos_transito: matriz precalculada origen ↔ centro
-- ----------------------------------------------------------
create table tiempos_transito (
    origen_geohash  text             not null references origen_grid(geohash),
    centro_codigo   text             not null references centros(codigo),
    modo            modo_transporte  not null,
    segundos        integer          not null,
    computed_at     timestamptz      default now(),
    primary key (origen_geohash, centro_codigo, modo)
);

create index tiempos_centro_idx  on tiempos_transito(centro_codigo);
create index tiempos_origen_idx  on tiempos_transito(origen_geohash);

-- ----------------------------------------------------------
-- data_versions: registro de versiones de datos (changelog)
-- ----------------------------------------------------------
create table data_versions (
    id          serial primary key,
    source      text        not null,  -- 'centros_cm', 'consolidado_vacantes', 'gtfs_crtm'
    version     date        not null,
    applied_at  timestamptz default now(),
    notas       text
);
