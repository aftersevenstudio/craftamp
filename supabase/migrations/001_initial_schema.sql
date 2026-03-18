-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('studio_admin', 'client_user');
create type report_status as enum ('draft', 'sent');

-- ============================================================
-- TABLES
-- All tables are created before any RLS policies so cross-table
-- references in policy bodies resolve correctly.
-- ============================================================

create table if not exists studios (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  slug          text not null unique,
  brand_color   text,
  logo_url      text,
  custom_domain text,
  created_at    timestamptz not null default now()
);

create table if not exists users (
  id         uuid primary key references auth.users(id) on delete cascade,
  studio_id  uuid references studios(id) on delete cascade,
  client_id  uuid,
  email      text not null,
  role       user_role not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id              uuid primary key default uuid_generate_v4(),
  studio_id       uuid not null references studios(id) on delete cascade,
  business_name   text not null,
  business_type   text,
  timezone        text not null default 'UTC',
  ga4_property_id text,
  gbp_location_id text,
  created_at      timestamptz not null default now()
);

create table if not exists integrations (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references clients(id) on delete cascade,
  provider      text not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists reports (
  id           uuid primary key default uuid_generate_v4(),
  client_id    uuid not null references clients(id) on delete cascade,
  status       report_status not null default 'draft',
  period_month text not null,
  sent_at      timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists report_sections (
  id            uuid primary key default uuid_generate_v4(),
  report_id     uuid not null references reports(id) on delete cascade,
  section_type  text not null,
  ai_content    text,
  raw_data      jsonb,
  display_order int not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists opportunities (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  type        text not null,
  title       text not null,
  description text,
  status      text not null default 'open',
  created_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enabled and policies defined after all tables exist.
-- ============================================================

alter table studios         enable row level security;
alter table users           enable row level security;
alter table clients         enable row level security;
alter table integrations    enable row level security;
alter table reports         enable row level security;
alter table report_sections enable row level security;
alter table opportunities   enable row level security;

-- studios
create policy "Studio admins can read their own studio"
  on studios for select
  using (
    id in (
      select studio_id from users
      where users.id = auth.uid() and users.role = 'studio_admin'
    )
  );

create policy "Studio admins can update their own studio"
  on studios for update
  using (
    id in (
      select studio_id from users
      where users.id = auth.uid() and users.role = 'studio_admin'
    )
  );

-- users
create policy "Users can read their own row"
  on users for select
  using (id = auth.uid());

create policy "Studio admins can read users in their studio"
  on users for select
  using (
    studio_id in (
      select studio_id from users u2
      where u2.id = auth.uid() and u2.role = 'studio_admin'
    )
  );

create policy "Studio admins can insert users in their studio"
  on users for insert
  with check (
    studio_id in (
      select studio_id from users u2
      where u2.id = auth.uid() and u2.role = 'studio_admin'
    )
  );

-- clients
create policy "Studio admins can manage their clients"
  on clients for all
  using (
    studio_id in (
      select studio_id from users
      where users.id = auth.uid() and users.role = 'studio_admin'
    )
  );

create policy "Client users can read their own client record"
  on clients for select
  using (
    id in (
      select client_id from users
      where users.id = auth.uid() and users.role = 'client_user'
    )
  );

-- integrations
create policy "Studio admins can manage integrations for their clients"
  on integrations for all
  using (
    client_id in (
      select c.id from clients c
      join users u on u.studio_id = c.studio_id
      where u.id = auth.uid() and u.role = 'studio_admin'
    )
  );

-- reports
create policy "Studio admins can manage reports for their clients"
  on reports for all
  using (
    client_id in (
      select c.id from clients c
      join users u on u.studio_id = c.studio_id
      where u.id = auth.uid() and u.role = 'studio_admin'
    )
  );

create policy "Client users can read their own reports"
  on reports for select
  using (
    client_id in (
      select client_id from users
      where users.id = auth.uid() and users.role = 'client_user'
    )
  );

-- report_sections
create policy "Studio admins can manage report sections"
  on report_sections for all
  using (
    report_id in (
      select r.id from reports r
      join clients c on c.id = r.client_id
      join users u on u.studio_id = c.studio_id
      where u.id = auth.uid() and u.role = 'studio_admin'
    )
  );

create policy "Client users can read their own report sections"
  on report_sections for select
  using (
    report_id in (
      select r.id from reports r
      where r.client_id in (
        select client_id from users
        where users.id = auth.uid() and users.role = 'client_user'
      )
    )
  );

-- opportunities
create policy "Studio admins can manage opportunities for their clients"
  on opportunities for all
  using (
    client_id in (
      select c.id from clients c
      join users u on u.studio_id = c.studio_id
      where u.id = auth.uid() and u.role = 'studio_admin'
    )
  );

create policy "Client users can read their own opportunities"
  on opportunities for select
  using (
    client_id in (
      select client_id from users
      where users.id = auth.uid() and users.role = 'client_user'
    )
  );

-- ============================================================
-- GRANTS
-- Ensure authenticated and service_role have table-level access.
-- RLS policies above control row-level visibility.
-- ============================================================
grant usage on schema public to authenticated, service_role;

grant all on studios, users, clients, integrations, reports, report_sections, opportunities
  to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;
