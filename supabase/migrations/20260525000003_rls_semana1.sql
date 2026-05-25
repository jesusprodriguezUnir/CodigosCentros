-- ============================================================
-- RLS (Row Level Security) — Semana 1
-- Sólo sobre centros y data_versions (lectura pública)
-- Las tablas de foro y auth se añaden en semanas 3-4
-- ============================================================

-- centros: lectura pública, escritura solo desde service_role
alter table centros enable row level security;

create policy "centros_select_public"
    on centros for select
    using (true);

-- dat_zonas: lectura pública
alter table dat_zonas enable row level security;

create policy "dat_zonas_select_public"
    on dat_zonas for select
    using (true);

-- origen_grid: lectura pública
alter table origen_grid enable row level security;

create policy "origen_grid_select_public"
    on origen_grid for select
    using (true);

-- tiempos_transito: lectura pública
alter table tiempos_transito enable row level security;

create policy "tiempos_select_public"
    on tiempos_transito for select
    using (true);

-- data_versions: lectura pública
alter table data_versions enable row level security;

create policy "data_versions_select_public"
    on data_versions for select
    using (true);
