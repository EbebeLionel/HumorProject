-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- Members page: signed-in users can see who else is a member.
-- profiles RLS stays "own row only" (it holds emails), so instead of widening it we expose
-- just the public bits through a function that only signed-in users may call.
create or replace function public.list_members()
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  joined_at timestamptz,
  photo_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.avatar_url,
    p.created_at as joined_at,
    (select count(*) from public.images i where i.user_id = p.id) as photo_count
  from public.profiles p
  where (select auth.uid()) is not null
    and nullif(trim(p.first_name), '') is not null
  order by p.created_at;
$$;

revoke execute on function public.list_members() from public, anon;
grant execute on function public.list_members() to authenticated;
