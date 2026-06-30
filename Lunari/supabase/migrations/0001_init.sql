-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES (1:1 with auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  status text not null default 'active' check (status in ('active', 'away', 'offline')),
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- WORKSPACES
-- ============================================================
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  join_code text not null unique default substr(md5(random()::text), 1, 8),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- ============================================================
-- CHANNELS
-- ============================================================
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  is_private boolean not null default false,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.channel_members (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
create table public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.dm_participants (
  dm_conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (dm_conversation_id, user_id)
);

-- ============================================================
-- MESSAGES (shared by channels and DMs)
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references public.channels(id) on delete cascade,
  dm_conversation_id uuid references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  constraint messages_target_check check (
    (channel_id is not null and dm_conversation_id is null)
    or (channel_id is null and dm_conversation_id is not null)
  )
);

create index messages_channel_id_created_at_idx on public.messages (channel_id, created_at);
create index messages_dm_conversation_id_created_at_idx on public.messages (dm_conversation_id, created_at);

-- ============================================================
-- HELPER FUNCTIONS (security definer, used inside RLS to avoid recursive RLS issues)
-- ============================================================
create function public.is_workspace_member(_workspace_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function public.is_channel_member(_channel_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.channel_members
    where channel_id = _channel_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function public.is_dm_participant(_dm_conversation_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.dm_participants
    where dm_conversation_id = _dm_conversation_id and user_id = auth.uid()
  );
$$ language sql security definer stable set search_path = public;

create function public.can_access_channel(_channel_id uuid)
returns boolean as $$
  select
    case
      when (select is_private from public.channels where id = _channel_id) then
        public.is_channel_member(_channel_id)
      else
        public.is_workspace_member((select workspace_id from public.channels where id = _channel_id))
    end;
$$ language sql security definer stable set search_path = public;

-- ============================================================
-- RPC FUNCTIONS
--
-- Workspace creation and join-by-code are RPCs rather than raw client-side
-- inserts/selects. This keeps `workspaces` SELECT strictly membership-only
-- (no policy ever needs to expose join_code via a blanket `using (true)`
-- clause), and makes workspace creation atomic (workspace + owner row
-- together, no risk of an orphaned workspace from a partial failure).
-- ============================================================
create function public.create_workspace(_name text, _slug text)
returns public.workspaces as $$
declare
  _workspace public.workspaces;
begin
  insert into public.workspaces (name, slug, created_by)
  values (_name, _slug, auth.uid())
  returning * into _workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (_workspace.id, auth.uid(), 'owner');

  return _workspace;
end;
$$ language plpgsql security definer set search_path = public;

create function public.join_workspace_by_code(_join_code text)
returns public.workspaces as $$
declare
  _workspace public.workspaces;
begin
  select * into _workspace from public.workspaces where join_code = _join_code;

  if _workspace.id is null then
    raise exception 'Invalid join code';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (_workspace.id, auth.uid(), 'member')
  on conflict (workspace_id, user_id) do nothing;

  return _workspace;
end;
$$ language plpgsql security definer set search_path = public;

-- Channel creation and DM start/find-or-create are RPCs for the same reason:
-- INSERT ... RETURNING requires the new row to pass the table's SELECT
-- policy too, but a private channel's creator isn't a channel_member yet
-- (and a new DM's participants aren't dm_participants yet) at the moment
-- the row is returned. Doing the related inserts atomically as the
-- definer sidesteps that chicken-and-egg RLS check. Each function
-- re-implements the authorization check the dropped INSERT policy used to
-- provide, since security definer bypasses RLS entirely.
create function public.create_channel(
  _workspace_id uuid,
  _name text,
  _is_private boolean,
  _member_ids uuid[]
)
returns public.channels as $$
declare
  _channel public.channels;
begin
  if not public.is_workspace_member(_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  insert into public.channels (workspace_id, name, is_private, created_by)
  values (_workspace_id, _name, _is_private, auth.uid())
  returning * into _channel;

  if _is_private then
    insert into public.channel_members (channel_id, user_id)
    select _channel.id, member_id
    from unnest(array_append(_member_ids, auth.uid())) as member_id
    on conflict do nothing;
  end if;

  return _channel;
end;
$$ language plpgsql security definer set search_path = public;

create function public.start_dm(_workspace_id uuid, _other_user_ids uuid[])
returns public.dm_conversations as $$
declare
  _conversation public.dm_conversations;
  _is_group boolean;
  _existing_id uuid;
begin
  if not public.is_workspace_member(_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;

  if _other_user_ids is null or array_length(_other_user_ids, 1) is null then
    raise exception 'No participants specified';
  end if;

  _is_group := array_length(_other_user_ids, 1) > 1;

  if not _is_group then
    select dc.id into _existing_id
    from public.dm_conversations dc
    where dc.workspace_id = _workspace_id
      and dc.is_group = false
      and exists (
        select 1 from public.dm_participants p
        where p.dm_conversation_id = dc.id and p.user_id = auth.uid()
      )
      and exists (
        select 1 from public.dm_participants p
        where p.dm_conversation_id = dc.id and p.user_id = _other_user_ids[1]
      )
      and (select count(*) from public.dm_participants p where p.dm_conversation_id = dc.id) = 2
    limit 1;

    if _existing_id is not null then
      select * into _conversation from public.dm_conversations where id = _existing_id;
      return _conversation;
    end if;
  end if;

  insert into public.dm_conversations (workspace_id, is_group)
  values (_workspace_id, _is_group)
  returning * into _conversation;

  insert into public.dm_participants (dm_conversation_id, user_id)
  select _conversation.id, member_id
  from unnest(array_append(_other_user_ids, auth.uid())) as member_id
  on conflict do nothing;

  return _conversation;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.create_workspace(text, text) to authenticated;
grant execute on function public.join_workspace_by_code(text) to authenticated;
grant execute on function public.create_channel(uuid, text, boolean, uuid[]) to authenticated;
grant execute on function public.start_dm(uuid, uuid[]) to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.channels enable row level security;
alter table public.channel_members enable row level security;
alter table public.dm_conversations enable row level security;
alter table public.dm_participants enable row level security;
alter table public.messages enable row level security;

-- ============================================================
-- BASE TABLE GRANTS
--
-- RLS policies only filter rows on top of an existing SQL privilege grant —
-- they do not substitute for one. Without these, every query from the
-- `authenticated` role fails with "permission denied for table ..." before
-- RLS is ever evaluated, regardless of how permissive the policies are.
-- Grants below are scoped to exactly the operations each table's policies
-- actually allow.
-- ============================================================
grant select, update on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select on public.channels to authenticated;
grant select on public.channel_members to authenticated;
grant select on public.dm_conversations to authenticated;
grant select on public.dm_participants to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

-- PROFILES: any authenticated user can read any profile (needed to show
-- names/avatars in member lists and message senders). Users can only
-- update their own row.
create policy "profiles_select_all_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- WORKSPACES: select only if member. No direct insert policy — creation
-- goes through the create_workspace() RPC so the owner row is created
-- atomically. No update/delete policy in this MVP.
create policy "workspaces_select_member"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

-- WORKSPACE_MEMBERS: select if you are a member of that workspace (so you
-- can see the member list). No direct insert policy — membership rows are
-- only created via the create_workspace()/join_workspace_by_code() RPCs.
create policy "workspace_members_select_member"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- CHANNELS: select public channels in workspaces you belong to, OR private
-- channels you are a member of.
create policy "channels_select_accessible"
  on public.channels for select
  to authenticated
  using (
    (is_private = false and public.is_workspace_member(workspace_id))
    or (is_private = true and public.is_channel_member(id))
  );

-- No direct insert policy — creation goes through the create_channel() RPC
-- so a private channel's creator becomes a channel_member atomically (see
-- the RPC FUNCTIONS section for why this can't be two separate client-side
-- inserts).

-- CHANNEL_MEMBERS: select if you can access the channel. No direct insert
-- policy — rows are only created via the create_channel() RPC.
create policy "channel_members_select_accessible"
  on public.channel_members for select
  to authenticated
  using (public.can_access_channel(channel_id));

-- DM_CONVERSATIONS: select if participant. No direct insert policy —
-- creation/find-or-create goes through the start_dm() RPC.
create policy "dm_conversations_select_participant"
  on public.dm_conversations for select
  to authenticated
  using (public.is_dm_participant(id));

-- DM_PARTICIPANTS: select if you are also a participant. No direct insert
-- policy — rows are only created via the start_dm() RPC.
create policy "dm_participants_select_participant"
  on public.dm_participants for select
  to authenticated
  using (public.is_dm_participant(dm_conversation_id));

-- MESSAGES: select/insert if you can access the parent channel or are a DM
-- participant. Senders may edit/delete only their own messages.
create policy "messages_select_accessible"
  on public.messages for select
  to authenticated
  using (
    (channel_id is not null and public.can_access_channel(channel_id))
    or (dm_conversation_id is not null and public.is_dm_participant(dm_conversation_id))
  );

create policy "messages_insert_accessible"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (channel_id is not null and public.can_access_channel(channel_id))
      or (dm_conversation_id is not null and public.is_dm_participant(dm_conversation_id))
    )
  );

create policy "messages_update_own"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid());

create policy "messages_delete_own"
  on public.messages for delete
  to authenticated
  using (sender_id = auth.uid());
