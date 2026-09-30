-- FinBuddy: schema, row-level security and the PGID gate.
-- Run once in the Supabase SQL editor (or `supabase db push`), then run
-- roster_seed.sql (kept out of git) to load the class list.
--
-- How access works: a student signs in with a phone OTP, then links the account
-- to their PGID from the class roster. Only a linked account can save progress
-- or see the leaderboard. Each PGID links to one account, once.

-- ---------- class roster (PGID and name only; no emails, no sections)
create table if not exists public.roster (
  pgid       text primary key check (pgid ~ '^[0-9]{8}$'),
  name       text not null,
  claimed_by uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz
);
alter table public.roster enable row level security;
-- no policies: students reach the roster only through the functions below

-- every lookup and claim is logged so nobody can walk the PGID range
create table if not exists public.pgid_attempts (
  id      bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pgid    text,
  at      timestamptz not null default now()
);
create index if not exists pgid_attempts_user_at on public.pgid_attempts (user_id, at desc);
alter table public.pgid_attempts enable row level security;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.roster where claimed_by = auth.uid());
$$;

-- the caller's own link, if any
create or replace function public.my_link() returns table (pgid text, name text)
language sql stable security definer set search_path = public as $$
  select r.pgid, r.name from public.roster r where r.claimed_by = auth.uid();
$$;

create or replace function public._attempt_budget_ok(p text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from public.pgid_attempts where user_id = auth.uid() and at > now() - interval '1 hour';
  if n >= 15 then return false; end if;
  insert into public.pgid_attempts (user_id, pgid) values (auth.uid(), p);
  return true;
end $$;

-- look up one PGID: returns its name and whether it is free, yours, or taken.
-- A taken PGID does not reveal the name.
create or replace function public.lookup_pgid(p text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.roster;
begin
  if auth.uid() is null then return json_build_object('status', 'signed_out'); end if;
  p := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  if p !~ '^[0-9]{8}$' then return json_build_object('status', 'invalid'); end if;
  if not public._attempt_budget_ok(p) then return json_build_object('status', 'too_many'); end if;
  select * into r from public.roster where pgid = p;
  if not found then return json_build_object('status', 'not_found'); end if;
  if r.claimed_by = auth.uid() then return json_build_object('status', 'mine', 'name', r.name); end if;
  if r.claimed_by is not null then return json_build_object('status', 'taken'); end if;
  return json_build_object('status', 'free', 'name', r.name);
end $$;

-- link the caller's account to a PGID (one PGID per account, one account per PGID)
create or replace function public.claim_pgid(p text) returns json
language plpgsql security definer set search_path = public as $$
declare r public.roster; existing text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'status', 'signed_out'); end if;
  p := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  select pgid into existing from public.roster where claimed_by = auth.uid();
  if existing is not null then
    if existing = p then return json_build_object('ok', true, 'status', 'mine', 'pgid', p, 'name', (select name from public.roster where pgid = p)); end if;
    return json_build_object('ok', false, 'status', 'already_linked', 'pgid', existing);
  end if;
  if not public._attempt_budget_ok(p) then return json_build_object('ok', false, 'status', 'too_many'); end if;
  update public.roster set claimed_by = auth.uid(), claimed_at = now()
    where pgid = p and claimed_by is null
    returning * into r;
  if not found then
    if exists (select 1 from public.roster where pgid = p) then return json_build_object('ok', false, 'status', 'taken'); end if;
    return json_build_object('ok', false, 'status', 'not_found');
  end if;
  insert into public.profiles (id, name) values (auth.uid(), r.name)
    on conflict (id) do update set name = excluded.name, updated_at = now();
  return json_build_object('ok', true, 'status', 'linked', 'pgid', r.pgid, 'name', r.name);
end $$;

revoke all on function public.is_member() from public;
revoke all on function public.my_link() from public;
revoke all on function public._attempt_budget_ok(text) from public;
revoke all on function public.lookup_pgid(text) from public;
revoke all on function public.claim_pgid(text) from public;
grant execute on function public.is_member() to authenticated;
grant execute on function public.my_link() to authenticated;
grant execute on function public.lookup_pgid(text) to authenticated;
grant execute on function public.claim_pgid(text) to authenticated;

-- ---------- per-student data
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null,
  background     text,
  primary_track  text,
  board_opt_in   boolean not null default false,
  updated_at     timestamptz not null default now()
);
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);
create table if not exists public.attempts (
  id      bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  t       timestamptz not null,
  ref     text not null,
  topic   text not null,
  ok      boolean not null,
  tag     text,
  src     text not null
);
create index if not exists attempts_user_t on public.attempts (user_id, t desc);
create index if not exists attempts_topic on public.attempts (topic, ok);
create table if not exists public.leaderboard (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  xp         int not null default 0,
  week_xp    int not null default 0,
  proven     int not null default 0,
  streak     int not null default 0,
  level      text not null default 'Analyst',
  updated_at timestamptz not null default now()
);

alter table public.profiles    enable row level security;
alter table public.user_state  enable row level security;
alter table public.attempts    enable row level security;
alter table public.leaderboard enable row level security;

create policy "own profile read"   on public.profiles for select using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert with check (id = auth.uid() and public.is_member());
create policy "own profile update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and public.is_member());

create policy "own state read"   on public.user_state for select using (user_id = auth.uid());
create policy "own state insert" on public.user_state for insert with check (user_id = auth.uid() and public.is_member());
create policy "own state update" on public.user_state for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member());

create policy "own attempts read"   on public.attempts for select using (user_id = auth.uid());
create policy "own attempts insert" on public.attempts for insert with check (user_id = auth.uid() and public.is_member());

create policy "own board row read"   on public.leaderboard for select using (user_id = auth.uid());
create policy "own board row insert" on public.leaderboard for insert with check (user_id = auth.uid() and public.is_member());
create policy "own board row update" on public.leaderboard for update using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_member());
create policy "own board row delete" on public.leaderboard for delete using (user_id = auth.uid());

-- ---------- the public leaderboard: opted-in, linked students; visible to linked students.
-- The name comes from the roster, so nobody can post under another name.
create or replace view public.leaderboard_public as
  select l.user_id, r.name, l.xp, l.week_xp, l.proven, l.streak, l.level, l.updated_at
  from public.leaderboard l
  join public.profiles p on p.id = l.user_id
  join public.roster r on r.claimed_by = l.user_id
  where p.board_opt_in and public.is_member();
revoke all on public.leaderboard_public from anon, public;
grant select on public.leaderboard_public to authenticated;

-- ---------- club analytics (admin SQL editor only; not exposed to students)
create or replace view public.topic_accuracy as
  select topic, count(*) as attempts, round(avg(case when ok then 1 else 0 end)::numeric, 3) as accuracy,
         count(distinct user_id) as students
  from public.attempts group by topic;
revoke all on public.topic_accuracy from anon, authenticated, public;

create or replace view public.link_status as
  select count(*) filter (where claimed_by is not null) as linked, count(*) as roster from public.roster;
revoke all on public.link_status from anon, authenticated, public;

-- ---------- admin cheat sheet (run in the SQL editor)
-- Free a PGID someone linked by mistake:
--   update public.roster set claimed_by = null, claimed_at = null where pgid = '6261xxxx';
-- Add a late joiner:
--   insert into public.roster (pgid, name) values ('6261xxxx', 'Full Name');
-- See who has linked:
--   select pgid, name, claimed_at from public.roster where claimed_by is not null order by claimed_at desc;
