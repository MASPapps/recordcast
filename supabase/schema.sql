-- Run in Supabase SQL Editor (or via migration). Creates recordings table, RLS, RPC, and storage bucket policies.

create extension if not exists "pgcrypto";

create table if not exists public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled recording',
  status text not null default 'uploading'
    check (status in ('uploading', 'ready', 'failed')),
  storage_path text,
  public_url text,
  duration_seconds integer,
  transcript text,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recordings_user_id_created_at_idx
  on public.recordings (user_id, created_at desc);

alter table public.recordings enable row level security;

create policy "recordings_select_public_ready"
  on public.recordings for select
  using (status = 'ready');

create policy "recordings_select_own"
  on public.recordings for select
  using (auth.uid() = user_id);

create policy "recordings_insert_own"
  on public.recordings for insert
  with check (auth.uid() = user_id);

create policy "recordings_update_own"
  on public.recordings for update
  using (auth.uid() = user_id);

create policy "recordings_delete_own"
  on public.recordings for delete
  using (auth.uid() = user_id);

create or replace function public.increment_recording_views(recording_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.recordings
  set view_count = view_count + 1,
      updated_at = now()
  where id = recording_id
    and status = 'ready';
end;
$$;

grant execute on function public.increment_recording_views(uuid) to anon, authenticated;

-- Storage bucket (public read so /object/public/... URLs work for the video tag)
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do update set public = excluded.public;

create policy "Public read recording objects"
  on storage.objects for select
  using (bucket_id = 'recordings');

-- Service role bypasses RLS for signed uploads created in API routes.
-- Optional: allow authenticated direct uploads to own prefix (not required for this app).
