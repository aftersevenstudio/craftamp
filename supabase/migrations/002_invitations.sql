-- Add contact fields to clients
alter table clients
  add column if not exists contact_name  text,
  add column if not exists contact_email text;

-- ============================================================
-- INVITATIONS
-- ============================================================
create table if not exists invitations (
  id          uuid primary key default uuid_generate_v4(),
  client_id   uuid not null references clients(id) on delete cascade,
  email       text not null,
  token       text not null unique,
  expires_at  timestamptz not null,
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);

alter table invitations enable row level security;

create policy "Studio admins can manage invitations for their clients"
  on invitations for all
  using (
    client_id in (
      select c.id from clients c
      join users u on u.studio_id = c.studio_id
      where u.id = auth.uid() and u.role = 'studio_admin'
    )
  );

grant all on invitations to authenticated, service_role;
