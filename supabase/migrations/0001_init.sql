-- Finance Prep Portal: schema, row-level security and cohort gate.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ---------- cohorts: phone OTP cannot prove ISB membership, so an invite code gates entry
create table if not exists public.cohorts (
  code        text primary key,
  name        text not null,
  active      boolean not null default true,
  max_members int not null default 250,
  created_at  timestamptz not null default now()
);
create table if not exists public.cohort_members (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  cohort    text not null references public.cohorts(code),
  joined_at timestamptz not null default now()
);

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohort_members where user_id = auth.uid());
$$;

create or replace function public.join_cohort(invite text) returns boolean
language plpgsql security definer set search_path = public as $$
declare c public.cohorts;
begin
  if auth.uid() is null then return false; end if;
  select * into c from public.cohorts where code = upper(trim(invite)) and active;
  if not found then return false; end if;
  if (select count(*) from public.cohort_members where cohort = c.code) >= c.max_members then return false; end if;
  insert into public.cohort_members (user_id, cohort) values (auth.uid(), c.code)
    on conflict (user_id) do nothing;
  return true;
end $$;
revoke all on function public.join_cohort(text) from public;
grant execute on function public.join_cohort(text) to authenticated;

-- ---------- per-student data
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  name           text not null,
  section        text,
  background     text,
  primary_track  text,
  adjacent_track text,
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

alter table public.cohorts        enable row level security;
alter table public.cohort_members enable row level security;
alter table public.profiles       enable row level security;
alter table public.user_state     enable row level security;
alter table public.attempts       enable row level security;
alter table public.leaderboard    enable row level security;

-- cohorts: no direct access (join_cohort is the only door)
create policy "own membership" on public.cohort_members for select using (user_id = auth.uid());

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
create policy "own board row update" on public.leaderboard for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own board row delete" on public.leaderboard for delete using (user_id = auth.uid());

-- ---------- the public leaderboard: opted-in members only, visible to members only.
-- Runs with the owner's rights so it can read other rows; it exposes only these columns.
create or replace view public.leaderboard_public as
  select l.user_id, p.name, l.xp, l.week_xp, l.proven, l.streak, l.level, l.updated_at
  from public.leaderboard l
  join public.profiles p on p.id = l.user_id
  join public.cohort_members m on m.user_id = l.user_id
  where p.board_opt_in
    and public.is_member()
    and m.cohort = (select cohort from public.cohort_members where user_id = auth.uid());
revoke all on public.leaderboard_public from anon;
grant select on public.leaderboard_public to authenticated;

-- ---------- club analytics (run as an admin in the SQL editor; not exposed to students)
create or replace view public.topic_accuracy as
  select topic, count(*) as attempts, round(avg(case when ok then 1 else 0 end)::numeric, 3) as accuracy,
         count(distinct user_id) as students
  from public.attempts group by topic;
revoke all on public.topic_accuracy from anon, authenticated;

-- ---------- seed the pilot cohort (change the code before sharing it)
insert into public.cohorts (code, name, max_members) values ('FC27-PILOT', 'Finance Club Co''27 pilot', 40)
  on conflict (code) do nothing;
