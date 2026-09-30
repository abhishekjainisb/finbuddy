-- FinBuddy: move sign-in from phone OTP to Microsoft (ISB) / Google SSO and email codes.
-- Run once in the Supabase SQL editor, after 0001_init.sql, then run roster_emails.sql.
--
-- What changes
--  * roster gets an email column (server-side only; never returned to the browser)
--  * auto_link(): a signed-in student whose verified email is on the roster is linked
--    to their PGID automatically. A verified ISB email also wins back a PGID that
--    someone else linked by hand.
--  * the old phone sign-in account is removed, which frees PGID links made with it.

alter table public.roster add column if not exists email text;
create unique index if not exists roster_email_key on public.roster (lower(email));

-- the caller's verified email, from the auth service's own record
create or replace function public._my_verified_email() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(u.email) from auth.users u
  where u.id = auth.uid() and u.email is not null
    and (u.email_confirmed_at is not null or u.raw_app_meta_data ->> 'provider' in ('azure', 'google'));
$$;
revoke all on function public._my_verified_email() from public;

create or replace function public.auto_link() returns json
language plpgsql security definer set search_path = public as $$
declare em text; r public.roster; holder_email text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'status', 'signed_out'); end if;
  select * into r from public.roster where claimed_by = auth.uid();
  if found then return json_build_object('ok', true, 'status', 'mine', 'pgid', r.pgid, 'name', r.name); end if;
  em := public._my_verified_email();
  if em is null then return json_build_object('ok', false, 'status', 'no_email'); end if;
  select * into r from public.roster where lower(email) = em;
  if not found then return json_build_object('ok', false, 'status', 'not_on_roster'); end if;
  if r.claimed_by is not null then
    -- someone else linked this PGID by hand; the verified ISB email takes it back
    select lower(u.email) into holder_email from auth.users u where u.id = r.claimed_by;
    if holder_email = em then return json_build_object('ok', false, 'status', 'taken'); end if;
  end if;
  update public.roster set claimed_by = auth.uid(), claimed_at = now() where pgid = r.pgid;
  insert into public.profiles (id, name) values (auth.uid(), r.name)
    on conflict (id) do update set name = excluded.name, updated_at = now();
  return json_build_object('ok', true, 'status', 'linked', 'pgid', r.pgid, 'name', r.name);
end $$;
revoke all on function public.auto_link() from public;
grant execute on function public.auto_link() to authenticated;

-- a PGID whose owner has a roster email can still be linked by hand (Google or a
-- personal email), but the ISB account can always reclaim it through auto_link().

-- ---------- reset: remove the phone sign-in account used for testing
-- Deleting the auth user cascades to its profile, progress, attempts and leaderboard
-- row, and frees its PGID link.
delete from auth.users where phone is not null and phone <> '';
