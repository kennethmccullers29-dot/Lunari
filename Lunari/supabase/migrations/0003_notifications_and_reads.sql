-- ============================================================
-- MESSAGE READS
--
-- One row per (user, conversation) tracking the last time that user read
-- that channel/DM, used to compute unread counts. Same nullable-pair-with-
-- CHECK shape as messages/message_reactions. Primary keys can't include
-- nullable columns, so uniqueness is enforced via two partial indexes
-- instead of a composite PK — a plain UNIQUE(user_id, channel_id,
-- dm_conversation_id) wouldn't work here: SQL treats NULL as distinct from
-- NULL for uniqueness purposes, so every "channel" row's NULL
-- dm_conversation_id would never collide with another channel row's NULL,
-- letting duplicates through.
-- ============================================================
create table public.message_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  dm_conversation_id uuid references public.dm_conversations(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  constraint message_reads_target_check check (
    (channel_id is not null and dm_conversation_id is null)
    or (channel_id is null and dm_conversation_id is not null)
  )
);

create unique index message_reads_channel_unique
  on public.message_reads (user_id, channel_id)
  where channel_id is not null;

create unique index message_reads_dm_unique
  on public.message_reads (user_id, dm_conversation_id)
  where dm_conversation_id is not null;

alter table public.message_reads enable row level security;

grant select, insert, update on public.message_reads to authenticated;

create policy "message_reads_select_own"
  on public.message_reads for select
  to authenticated
  using (user_id = auth.uid());

create policy "message_reads_insert_own"
  on public.message_reads for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      (channel_id is not null and public.can_access_channel(channel_id))
      or (dm_conversation_id is not null and public.is_dm_participant(dm_conversation_id))
    )
  );

create policy "message_reads_update_own"
  on public.message_reads for update
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- UNREAD COUNTS (per workspace, for the calling user)
--
-- A single RPC rather than N client-side count queries (one per channel/DM)
-- — this is the same "atomic instead of chatty" preference the RPC
-- functions in 0001 already follow. Channels/DMs with zero messages simply
-- don't appear in the result; the caller treats a missing row as 0 unread.
-- ============================================================
create function public.get_unread_counts(_workspace_id uuid)
returns table (target_type text, target_id uuid, unread_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select 'channel', c.id,
    count(*) filter (
      where m.created_at > coalesce(mr.last_read_at, '-infinity'::timestamptz)
        and m.sender_id <> auth.uid()
    )
  from public.channels c
  join public.messages m on m.channel_id = c.id
  left join public.message_reads mr on mr.channel_id = c.id and mr.user_id = auth.uid()
  where c.workspace_id = _workspace_id
    and (
      (c.is_private = false and public.is_workspace_member(_workspace_id))
      or (c.is_private = true and public.is_channel_member(c.id))
    )
  group by c.id

  union all

  select 'dm', dc.id,
    count(*) filter (
      where m.created_at > coalesce(mr.last_read_at, '-infinity'::timestamptz)
        and m.sender_id <> auth.uid()
    )
  from public.dm_conversations dc
  join public.messages m on m.dm_conversation_id = dc.id
  left join public.message_reads mr on mr.dm_conversation_id = dc.id and mr.user_id = auth.uid()
  where dc.workspace_id = _workspace_id
    and public.is_dm_participant(dc.id)
  group by dc.id;
$$;

grant execute on function public.get_unread_counts(uuid) to authenticated;

-- ============================================================
-- WORKSPACE-LEVEL UNREAD TOTALS (across every workspace the caller
-- belongs to) — powers the unread dot on each workspace icon in the
-- switcher, which needs totals for workspaces other than the one
-- currently open.
-- ============================================================
create function public.get_workspace_unread_totals()
returns table (workspace_id uuid, unread_count bigint)
language sql
security definer
stable
set search_path = public
as $$
  select c.workspace_id,
    count(*) filter (
      where m.created_at > coalesce(mr.last_read_at, '-infinity'::timestamptz)
        and m.sender_id <> auth.uid()
    )
  from public.channels c
  join public.messages m on m.channel_id = c.id
  left join public.message_reads mr on mr.channel_id = c.id and mr.user_id = auth.uid()
  where (
    (c.is_private = false and public.is_workspace_member(c.workspace_id))
    or (c.is_private = true and public.is_channel_member(c.id))
  )
  group by c.workspace_id

  union all

  select dc.workspace_id,
    count(*) filter (
      where m.created_at > coalesce(mr.last_read_at, '-infinity'::timestamptz)
        and m.sender_id <> auth.uid()
    )
  from public.dm_conversations dc
  join public.messages m on m.dm_conversation_id = dc.id
  left join public.message_reads mr on mr.dm_conversation_id = dc.id and mr.user_id = auth.uid()
  where public.is_dm_participant(dc.id)
  group by dc.workspace_id;
$$;

grant execute on function public.get_workspace_unread_totals() to authenticated;

-- ============================================================
-- NOTIFICATIONS
--
-- A focused activity feed, not a mirror of every message: DMs always
-- notify the other participant(s); channel messages only notify members
-- explicitly @mentioned by display name. Rows are fanned out server-side
-- by a trigger (security definer, bypassing RLS) rather than inserted by
-- the client, for the same reason create_channel()/start_dm() are RPCs —
-- the client legitimately needs to create a row "for" another user here,
-- which a client-owned insert policy can't safely express without also
-- letting any sender spoof notifications for any recipient.
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  channel_id uuid references public.channels(id) on delete cascade,
  dm_conversation_id uuid references public.dm_conversations(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_target_check check (
    (channel_id is not null and dm_conversation_id is null)
    or (channel_id is null and dm_conversation_id is not null)
  )
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

grant select, update on public.notifications to authenticated;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

-- Mention matching is a simple case-insensitive substring search for
-- "@display_name" — it'll false-positive on names that are substrings of
-- other words (e.g. "Jan" inside "Janet") and won't support disambiguating
-- two members with the same display name. Acceptable for this app's scale;
-- a real mention system would tag mentions with user IDs at compose time
-- instead of re-deriving them from text after the fact.
create function public.fanout_message_notification()
returns trigger as $$
declare
  _channel public.channels;
begin
  if new.dm_conversation_id is not null then
    insert into public.notifications (user_id, actor_id, message_id, dm_conversation_id)
    select p.user_id, new.sender_id, new.id, new.dm_conversation_id
    from public.dm_participants p
    where p.dm_conversation_id = new.dm_conversation_id
      and p.user_id <> new.sender_id;
    return new;
  end if;

  select * into _channel from public.channels where id = new.channel_id;

  if _channel.is_private then
    insert into public.notifications (user_id, actor_id, message_id, channel_id)
    select cm.user_id, new.sender_id, new.id, new.channel_id
    from public.channel_members cm
    join public.profiles pr on pr.id = cm.user_id
    where cm.channel_id = new.channel_id
      and cm.user_id <> new.sender_id
      and position(lower('@' || pr.display_name) in lower(new.body)) > 0;
  else
    insert into public.notifications (user_id, actor_id, message_id, channel_id)
    select wm.user_id, new.sender_id, new.id, new.channel_id
    from public.workspace_members wm
    join public.profiles pr on pr.id = wm.user_id
    where wm.workspace_id = _channel.workspace_id
      and wm.user_id <> new.sender_id
      and position(lower('@' || pr.display_name) in lower(new.body)) > 0;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_message_insert_fanout_notification
  after insert on public.messages
  for each row execute procedure public.fanout_message_notification();
