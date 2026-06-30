-- ============================================================
-- MESSAGE ATTACHMENTS (images, GIFs)
-- ============================================================
alter table public.messages
  add column attachment_url text,
  add column attachment_type text check (attachment_type in ('image', 'gif'));

alter table public.messages
  add constraint messages_attachment_consistency_check
  check ((attachment_url is null) = (attachment_type is null));

-- ============================================================
-- MESSAGE REACTIONS
--
-- channel_id/dm_conversation_id are denormalized from the parent message
-- (same nullable-pair-with-CHECK shape as messages itself) so the realtime
-- subscription can filter by a single equality column the same way
-- use-messages.ts already does for `messages` — Postgres Changes filters
-- don't support `message_id IN (...)`, and an unfiltered subscription
-- would broadcast every reaction click in every conversation to every
-- client, which doesn't fit a per-conversation, high-frequency event.
-- ============================================================
create table public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  dm_conversation_id uuid references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint message_reactions_target_check check (
    (channel_id is not null and dm_conversation_id is null)
    or (channel_id is null and dm_conversation_id is not null)
  ),
  unique (message_id, user_id, emoji)
);

create index message_reactions_channel_id_idx on public.message_reactions (channel_id);
create index message_reactions_dm_conversation_id_idx on public.message_reactions (dm_conversation_id);

alter table public.message_reactions enable row level security;

grant select, insert, delete on public.message_reactions to authenticated;

create policy "message_reactions_select_accessible"
  on public.message_reactions for select
  to authenticated
  using (
    (channel_id is not null and public.can_access_channel(channel_id))
    or (dm_conversation_id is not null and public.is_dm_participant(dm_conversation_id))
  );

-- The `exists` clause ties the client-supplied channel_id/dm_conversation_id
-- back to the real parent message's own columns. Without it, a client could
-- pair a channel_id it legitimately belongs to with a message_id it does
-- NOT have access to (e.g. a private channel it isn't in), and that
-- spoofed reaction would surface to other clients via the legitimate
-- channel's realtime subscription.
create policy "message_reactions_insert_accessible"
  on public.message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      (channel_id is not null and public.can_access_channel(channel_id))
      or (dm_conversation_id is not null and public.is_dm_participant(dm_conversation_id))
    )
    and exists (
      select 1 from public.messages m
      where m.id = message_id
        and m.channel_id is not distinct from message_reactions.channel_id
        and m.dm_conversation_id is not distinct from message_reactions.dm_conversation_id
    )
  );

create policy "message_reactions_delete_own"
  on public.message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- STORAGE: attachments bucket
--
-- Public-read bucket with unsigned, non-expiring URLs. Anyone who obtains
-- a URL can fetch it indefinitely, independent of ongoing channel/DM
-- membership (and there's no storage cleanup on message delete in this
-- MVP). UUID-randomized filenames make URLs unguessable in practice, but
-- that's obscurity, not access control — an accepted MVP tradeoff, not an
-- oversight. storage.objects already has RLS enabled and base grants
-- pre-provisioned by Supabase; only policies need creating here.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;

create policy "attachments_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "attachments_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'attachments');
