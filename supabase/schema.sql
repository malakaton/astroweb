-- ============================================================================
-- Grupo S Valles — esquema de Supabase
-- Ejecutar en Supabase Studio → SQL Editor (o con `supabase db push`).
--
-- Diseño: la web pública NO habla con Supabase desde el navegador. Solo la
-- Cloudflare Pages Function inserta filas usando la clave service_role, que
-- salta RLS. Por eso las políticas de RLS solo abren lectura/escritura a
-- usuarios autenticados del futuro panel de administración.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Tabla de solicitudes de presupuesto ─────────────────────────────────────
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  nombre        text not null check (char_length(nombre) between 3 and 120),
  email         text not null check (position('@' in email) > 1),
  telefono      text not null check (char_length(telefono) between 9 and 20),
  servicio      text not null,
  localidad     text,
  superficie    integer check (superficie is null or (superficie > 0 and superficie <= 10000)),
  presupuesto   text,
  mensaje       text not null check (char_length(mensaje) >= 20),
  origen        text,
  estado        text not null default 'nuevo'
                check (estado in ('nuevo', 'contactado', 'presupuestado', 'ganado', 'perdido')),
  notas         text,
  -- Hash de IP (SHA-256 truncado) para detectar abuso sin guardar datos personales
  ip_hash       text,
  user_agent    text
);

comment on table public.leads is 'Solicitudes de presupuesto recibidas desde el formulario web';

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_estado_idx on public.leads (estado);
create index if not exists leads_servicio_idx on public.leads (servicio);

-- ── updated_at automático ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.leads enable row level security;

-- Sin políticas para anon: nadie puede leer ni escribir con la clave pública.
-- La Pages Function usa service_role, que no está sujeta a RLS.

drop policy if exists "leads_admin_select" on public.leads;
create policy "leads_admin_select"
  on public.leads
  for select
  to authenticated
  using (true);

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads
  for delete
  to authenticated
  using (true);

-- ── Contenido editable desde el panel (fase 2) ──────────────────────────────
-- Estas tablas replican el esquema de las content collections de Astro
-- (src/content.config.ts). Al crearlas se puede sustituir el loader de Astro
-- por un loader que lea de Supabase sin tocar las páginas.

create table if not exists public.servicios (
  slug          text primary key,
  title         text not null,
  short_title   text,
  seo_title     text,
  description   text not null check (char_length(description) between 70 and 158),
  excerpt       text not null,
  cover_url     text not null,
  cover_alt     text not null,
  icon          text not null,
  "order"       integer not null default 99,
  price_from    integer,
  price_unit    text not null default 'proyecto',
  duration      text,
  features      jsonb not null default '[]'::jsonb,
  includes      jsonb not null default '[]'::jsonb,
  faqs          jsonb not null default '[]'::jsonb,
  body_md       text,
  draft         boolean not null default false,
  updated_at    timestamptz not null default now()
);

create table if not exists public.proyectos (
  slug          text primary key,
  title         text not null,
  description   text not null,
  excerpt       text not null,
  cover_url     text not null,
  cover_alt     text not null,
  servicio_slug text references public.servicios (slug) on delete set null,
  location      text not null,
  year          integer not null,
  surface       integer not null,
  duration      text not null,
  budget_range  text,
  highlights    jsonb not null default '[]'::jsonb,
  testimonial   jsonb,
  featured      boolean not null default false,
  "order"       integer not null default 99,
  body_md       text,
  draft         boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.servicios enable row level security;
alter table public.proyectos enable row level security;

-- Lectura pública solo del contenido publicado (lo consume el build de Astro)
drop policy if exists "servicios_public_read" on public.servicios;
create policy "servicios_public_read"
  on public.servicios for select to anon, authenticated using (draft = false);

drop policy if exists "proyectos_public_read" on public.proyectos;
create policy "proyectos_public_read"
  on public.proyectos for select to anon, authenticated using (draft = false);

-- Escritura solo para usuarios autenticados del panel
drop policy if exists "servicios_admin_write" on public.servicios;
create policy "servicios_admin_write"
  on public.servicios for all to authenticated using (true) with check (true);

drop policy if exists "proyectos_admin_write" on public.proyectos;
create policy "proyectos_admin_write"
  on public.proyectos for all to authenticated using (true) with check (true);

-- ── Vista de apoyo para el panel ────────────────────────────────────────────
create or replace view public.leads_resumen
with (security_invoker = true) as
select
  date_trunc('month', created_at) as mes,
  servicio,
  estado,
  count(*) as total
from public.leads
group by 1, 2, 3
order by 1 desc;
