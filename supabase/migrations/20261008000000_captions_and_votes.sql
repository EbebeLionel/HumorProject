-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.

-- 1. images: one row per photo a user uploads for captioning
create table if not exists public.images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,  -- path inside the caption-images bucket: <user id>/<file>
  image_url text not null,            -- public URL of that file
  vibe text not null,                 -- caption style the user picked
  theme text,                         -- theme of the day when it was uploaded
  created_at timestamptz not null default now()
);

create index if not exists images_created_at_idx on public.images (created_at desc);
create index if not exists images_user_id_idx on public.images (user_id, created_at desc);

-- 2. captions: AI generated captions, with the exact prompt and model that produced them
create table if not exists public.captions (
  id uuid primary key default gen_random_uuid(),
  image_id uuid not null references public.images (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 300),
  prompt text not null,
  model text not null,
  upvotes integer not null default 0,    -- maintained by the trigger below
  downvotes integer not null default 0,
  score integer generated always as (upvotes - downvotes) stored,
  created_at timestamptz not null default now()
);

create index if not exists captions_image_id_idx on public.captions (image_id);
create index if not exists captions_score_idx on public.captions (score desc, created_at desc);

-- 3. caption_votes: one row per (user, caption); +1 = upvote, -1 = downvote
create table if not exists public.caption_votes (
  id uuid primary key default gen_random_uuid(),
  caption_id uuid not null references public.captions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  vote smallint not null check (vote in (-1, 1)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (caption_id, user_id)
);

create index if not exists caption_votes_user_id_idx on public.caption_votes (user_id);

-- Keep captions.upvotes / downvotes in sync with caption_votes.
-- security definer so it can update captions, which users have no update policy on.
create or replace function public.sync_caption_vote_counts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.caption_id, old.caption_id);
begin
  update public.captions c
  set upvotes = (select count(*) from public.caption_votes v where v.caption_id = target and v.vote = 1),
      downvotes = (select count(*) from public.caption_votes v where v.caption_id = target and v.vote = -1)
  where c.id = target;
  return null;
end;
$$;

drop trigger if exists caption_votes_sync_counts on public.caption_votes;
create trigger caption_votes_sync_counts
  after insert or update or delete on public.caption_votes
  for each row execute function public.sync_caption_vote_counts();

-- 4. Row level security
alter table public.images enable row level security;
alter table public.captions enable row level security;
alter table public.caption_votes enable row level security;
alter table public.jokes enable row level security;

-- images: anyone can browse; you can only add or delete your own
drop policy if exists "Images are public" on public.images;
create policy "Images are public" on public.images
  for select to anon, authenticated using (true);

drop policy if exists "Users can insert own images" on public.images;
create policy "Users can insert own images" on public.images
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (storage.foldername(storage_path))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own images" on public.images;
create policy "Users can delete own images" on public.images
  for delete to authenticated using ((select auth.uid()) = user_id);

-- captions: anyone can browse; you can only add captions to your own images.
-- No update policy, so vote counts can't be tampered with (only the trigger changes them).
drop policy if exists "Captions are public" on public.captions;
create policy "Captions are public" on public.captions
  for select to anon, authenticated using (true);

drop policy if exists "Users can insert captions on own images" on public.captions;
create policy "Users can insert captions on own images" on public.captions
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and upvotes = 0
    and downvotes = 0
    and exists (
      select 1 from public.images i
      where i.id = image_id and i.user_id = (select auth.uid())
    )
  );

-- caption_votes: signed-in users manage only their own votes, and can't see anyone else's
drop policy if exists "Users can view own votes" on public.caption_votes;
create policy "Users can view own votes" on public.caption_votes
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own votes" on public.caption_votes;
create policy "Users can insert own votes" on public.caption_votes
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own votes" on public.caption_votes;
create policy "Users can update own votes" on public.caption_votes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own votes" on public.caption_votes;
create policy "Users can delete own votes" on public.caption_votes
  for delete to authenticated using ((select auth.uid()) = user_id);

-- jokes: read-only for everyone (rows are added from the dashboard)
drop policy if exists "Jokes are public" on public.jokes;
create policy "Jokes are public" on public.jokes
  for select to anon, authenticated using (true);

-- 5. Storage bucket for caption photos (public read, write only inside your own folder)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caption-images', 'caption-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own caption images" on storage.objects;
create policy "Users can upload own caption images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete own caption images" on storage.objects;
create policy "Users can delete own caption images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Deleting via the Storage API first looks the file up, so owners need select on their own files
drop policy if exists "Users can read own caption images" on storage.objects;
create policy "Users can read own caption images" on storage.objects
  for select to authenticated
  using (bucket_id = 'caption-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 6. Sanity check: every table in public should now have RLS on (expect zero rows)
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
