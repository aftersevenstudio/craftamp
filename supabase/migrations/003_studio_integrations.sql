-- Allow studio-level integrations (e.g. Google Analytics OAuth)
-- by making client_id optional and adding studio_id
alter table integrations
  alter column client_id drop not null,
  add column if not exists studio_id uuid references studios(id) on delete cascade;

-- Update RLS to cover studio-level integrations
create policy "Studio admins can manage studio-level integrations"
  on integrations for all
  using (
    studio_id in (
      select studio_id from users
      where users.id = auth.uid() and users.role = 'studio_admin'
    )
  );

grant all on integrations to authenticated, service_role;
