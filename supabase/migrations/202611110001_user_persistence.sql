create table if not exists public.user_persistence (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_persistence enable row level security;

create policy "Users can read their own persistence"
  on public.user_persistence for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert their own persistence"
  on public.user_persistence for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update their own persistence"
  on public.user_persistence for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_persistence to authenticated;
