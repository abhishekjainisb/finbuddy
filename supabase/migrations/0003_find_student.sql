-- FinBuddy: "find yourself" search on the sign-in page.
-- A student types part of their name or PGID, picks themselves, and the code goes to
-- the ISB email on the roster. Run once in the Supabase SQL editor after 0002.
--
-- Trade-off: the email of a selected student reaches the browser (sign-in needs it).
-- Searches need 3+ letters or 4+ digits and return at most 6 people.

create or replace function public.find_student(q text) returns table (pgid text, name text, email text)
language plpgsql stable security definer set search_path = public as $$
declare
  qq text := lower(trim(coalesce(q, '')));
  toks text[];
begin
  -- PGID: digits only, at least 4, matched from the start
  if qq ~ '^[0-9]+$' then
    if length(qq) < 4 then return; end if;
    return query select r.pgid, r.name, r.email from public.roster r
      where r.pgid like qq || '%' and r.email is not null order by r.pgid limit 6;
    return;
  end if;
  -- name: every word typed must start a word in the name (any order), or appear
  -- inside the name with spaces removed ("abhishekj" finds "Abhishek Jain")
  qq := trim(regexp_replace(qq, '[^a-z ]', ' ', 'g'));
  if length(replace(qq, ' ', '')) < 3 then return; end if;
  toks := array(select t from unnest(regexp_split_to_array(qq, '\s+')) t where t <> '');
  return query select r.pgid, r.name, r.email from public.roster r
    where r.email is not null
      and (select bool_and(lower(r.name) ~ ('\m' || t) or replace(lower(r.name), ' ', '') like '%' || t || '%') from unnest(toks) t)
    order by (lower(r.name) like toks[1] || '%') desc, r.name
    limit 6;
end $$;
revoke all on function public.find_student(text) from public;
grant execute on function public.find_student(text) to anon, authenticated;
