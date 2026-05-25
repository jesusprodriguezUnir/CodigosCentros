-- ============================================================
-- Semana 3 — Auth, reseñas, comentarios, flags, listas
-- ============================================================

-- ----------------------------------------------------------
-- profiles: extensión de auth.users
-- ----------------------------------------------------------
create type user_role as enum ('user', 'admin');

create table profiles (
    id           uuid primary key references auth.users(id) on delete cascade,
    display_name text,
    avatar_url   text,
    role         user_role not null default 'user',
    created_at   timestamptz default now()
);

-- Trigger: crear perfil automáticamente al crear usuario
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into profiles (id, display_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure handle_new_user();

-- ----------------------------------------------------------
-- reviews: reseñas de centros (1 por usuario por centro)
-- ----------------------------------------------------------
create table reviews (
    id            uuid primary key default gen_random_uuid(),
    centro_codigo text not null references centros(codigo) on delete cascade,
    user_id       uuid not null references auth.users(id) on delete cascade,
    rating        smallint not null check (rating between 1 and 5),
    body          text not null check (char_length(body) >= 30),
    created_at    timestamptz default now(),
    updated_at    timestamptz default now(),
    hidden_at     timestamptz,
    unique (centro_codigo, user_id)
);

create index reviews_centro_idx on reviews (centro_codigo, created_at desc);
create index reviews_user_idx   on reviews (user_id);

-- Actualizar updated_at automáticamente
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger reviews_updated_at
    before update on reviews
    for each row execute procedure update_updated_at();

-- ----------------------------------------------------------
-- comments: respuestas a reseñas (1 nivel)
-- ----------------------------------------------------------
create table comments (
    id         uuid primary key default gen_random_uuid(),
    review_id  uuid not null references reviews(id) on delete cascade,
    user_id    uuid not null references auth.users(id) on delete cascade,
    body       text not null check (char_length(body) >= 5),
    created_at timestamptz default now(),
    hidden_at  timestamptz
);

create index comments_review_idx on comments (review_id, created_at asc);

-- ----------------------------------------------------------
-- flags: reportes de contenido
-- ----------------------------------------------------------
create type flag_target as enum ('review', 'comment');

create table flags (
    id          uuid primary key default gen_random_uuid(),
    target_type flag_target not null,
    target_id   uuid not null,
    user_id     uuid not null references auth.users(id) on delete cascade,
    reason      text,
    resolved_at timestamptz,
    created_at  timestamptz default now(),
    unique (target_type, target_id, user_id)
);

create index flags_target_idx      on flags (target_type, target_id);
create index flags_unresolved_idx  on flags (resolved_at) where resolved_at is null;

-- ----------------------------------------------------------
-- user_listas: listas del concursillo sincronizadas
-- ----------------------------------------------------------
create table user_listas (
    user_id    uuid not null references auth.users(id) on delete cascade,
    slug       text not null default 'default',
    payload    jsonb not null default '[]',
    updated_at timestamptz default now(),
    primary key (user_id, slug)
);
