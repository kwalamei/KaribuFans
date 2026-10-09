-- KaribuFans visitor accounts: the one table the site uses.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once.
--
-- What it does: stores which places a signed-in visitor has saved.
-- Row level security means each visitor can only read, add and delete
-- their OWN rows; nobody (and no other visitor) can see anyone else's.

create table if not exists public.saved_places (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  place_id   text        not null check (char_length(place_id) between 1 and 120),
  page       text        not null check (char_length(page) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

alter table public.saved_places enable row level security;

-- Only signed-in visitors; never the anonymous (signed-out) role.
revoke all on public.saved_places from anon;
grant select, insert, delete on public.saved_places to authenticated;

drop policy if exists "read own saved places"   on public.saved_places;
drop policy if exists "add own saved places"    on public.saved_places;
drop policy if exists "delete own saved places" on public.saved_places;

create policy "read own saved places" on public.saved_places
  for select to authenticated using (user_id = auth.uid());

create policy "add own saved places" on public.saved_places
  for insert to authenticated with check (user_id = auth.uid());

create policy "delete own saved places" on public.saved_places
  for delete to authenticated using (user_id = auth.uid());

-- Check afterwards (should show rowsecurity = true):
-- select relname, relrowsecurity as rowsecurity from pg_class where relname = 'saved_places';
