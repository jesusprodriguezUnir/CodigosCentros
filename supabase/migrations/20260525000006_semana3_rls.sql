-- ============================================================
-- Semana 3 — RLS (Row Level Security)
-- ============================================================

-- ----------------------------------------------------------
-- profiles
-- ----------------------------------------------------------
alter table profiles enable row level security;

-- Cualquiera puede ver perfiles públicos
create policy "profiles_select_public"
    on profiles for select using (true);

-- Solo el propio usuario puede actualizar su perfil
create policy "profiles_update_own"
    on profiles for update using (auth.uid() = id);

-- ----------------------------------------------------------
-- reviews
-- ----------------------------------------------------------
alter table reviews enable row level security;

-- Cualquiera puede leer reseñas no ocultas
create policy "reviews_select_public"
    on reviews for select using (hidden_at is null);

-- Admins pueden ver todas (incluso ocultas)
create policy "reviews_select_admin"
    on reviews for select
    using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Solo autenticados pueden insertar (1 por centro: enforced por unique constraint)
create policy "reviews_insert_auth"
    on reviews for insert
    with check (auth.uid() = user_id);

-- Solo el autor puede actualizar su reseña
create policy "reviews_update_own"
    on reviews for update
    using (auth.uid() = user_id);

-- Solo el autor puede borrar su reseña
create policy "reviews_delete_own"
    on reviews for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- comments
-- ----------------------------------------------------------
alter table comments enable row level security;

create policy "comments_select_public"
    on comments for select using (hidden_at is null);

create policy "comments_select_admin"
    on comments for select
    using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "comments_insert_auth"
    on comments for insert
    with check (auth.uid() = user_id);

create policy "comments_update_own"
    on comments for update
    using (auth.uid() = user_id);

create policy "comments_delete_own"
    on comments for delete
    using (auth.uid() = user_id);

-- ----------------------------------------------------------
-- flags
-- ----------------------------------------------------------
alter table flags enable row level security;

-- Solo admins pueden SELECT
create policy "flags_select_admin"
    on flags for select
    using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Cualquier autenticado puede reportar
create policy "flags_insert_auth"
    on flags for insert
    with check (auth.uid() = user_id);

-- Solo admins pueden update (resolver flags)
create policy "flags_update_admin"
    on flags for update
    using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ----------------------------------------------------------
-- user_listas
-- ----------------------------------------------------------
alter table user_listas enable row level security;

create policy "listas_own"
    on user_listas for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
