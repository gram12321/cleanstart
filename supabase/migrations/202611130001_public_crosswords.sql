create table if not exists public.published_crosswords (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  puzzle jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.published_crosswords enable row level security;

create policy "Anyone can read published crosswords"
  on public.published_crosswords for select to anon, authenticated
  using (true);

create policy "Users can publish their own crosswords"
  on public.published_crosswords for insert to authenticated
  with check ((select auth.uid()) = owner_id);

grant select on public.published_crosswords to anon, authenticated;
grant insert on public.published_crosswords to authenticated;
