create table if not exists public.shared_dictionaries (
  id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  entries jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shared_dictionaries enable row level security;
create policy "Anyone can read shared dictionaries"
  on public.shared_dictionaries for select to anon, authenticated using (true);
create policy "Owners can share dictionaries"
  on public.shared_dictionaries for insert to authenticated
  with check ((select auth.uid()) = owner_id);
create policy "Owners can update shared dictionaries"
  on public.shared_dictionaries for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy "Owners can unshare dictionaries"
  on public.shared_dictionaries for delete to authenticated
  using ((select auth.uid()) = owner_id);
grant select, insert, update, delete on public.shared_dictionaries to anon, authenticated;
