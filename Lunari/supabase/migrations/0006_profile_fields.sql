-- ============================================================
-- PROFILE FIELDS (full name, title, pronouns, custom status)
--
-- `status` (active/away/offline) already exists and drives the presence
-- dot — these are separate, user-authored fields layered on top, same
-- distinction Slack draws between presence and custom status.
-- ============================================================
alter table public.profiles
  add column full_name text,
  add column title text,
  add column pronouns text,
  add column status_emoji text,
  add column status_text text;

-- ============================================================
-- STORAGE: avatars bucket
--
-- Same shape as the attachments bucket (0002): public-read, insert
-- restricted to the caller's own uid-prefixed folder. Each upload uses a
-- fresh random filename (see lib/storage.ts) rather than a fixed
-- per-user path, so there's no need for an update/overwrite policy —
-- replacing an avatar just uploads a new object and updates
-- profiles.avatar_url to point at it, leaving the old object orphaned
-- (same accepted tradeoff as attachments; no storage cleanup in this MVP).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
