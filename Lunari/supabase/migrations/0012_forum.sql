-- ============================================================
-- FORUM CHANNELS
-- ============================================================

-- Extend channel type to include 'forum'
alter table public.channels
  drop constraint channels_type_check;

alter table public.channels
  add constraint channels_type_check
  check (type in ('text', 'voice', 'forum'));

-- Recreate create_channel RPC to accept forum type
drop function public.create_channel(uuid, text, boolean, uuid[], text);

create function public.create_channel(
  _workspace_id uuid,
  _name text,
  _is_private boolean,
  _member_ids uuid[],
  _type text default 'text'
)
returns public.channels as $$
declare
  _channel public.channels;
begin
  if not public.is_workspace_member(_workspace_id) then
    raise exception 'Not a member of this workspace';
  end if;
  if _type not in ('text', 'voice', 'forum') then
    raise exception 'Invalid channel type';
  end if;
  insert into public.channels (workspace_id, name, is_private, created_by, type)
  values (_workspace_id, _name, _is_private, auth.uid(), _type)
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

grant execute on function public.create_channel(uuid, text, boolean, uuid[], text) to authenticated;

-- ============================================================
-- FORUM TABLES
-- ============================================================

create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null default '',
  reply_count integer not null default 0,
  is_pinned boolean not null default false,
  is_closed boolean not null default false,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index forum_posts_channel_idx on public.forum_posts (channel_id, last_activity_at desc);

create table public.forum_tags (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  created_at timestamptz not null default now(),
  unique (channel_id, name)
);

create table public.forum_post_tags (
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  tag_id uuid not null references public.forum_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index forum_replies_post_idx on public.forum_replies (post_id, created_at);

-- Sync reply_count and last_activity_at on the parent post
create or replace function public.sync_forum_post_activity()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.forum_posts
    set reply_count = reply_count + 1, last_activity_at = now()
    where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.forum_posts
    set reply_count = greatest(0, reply_count - 1)
    where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_forum_reply_activity
  after insert or delete on public.forum_replies
  for each row execute function public.sync_forum_post_activity();

-- ============================================================
-- RLS
-- ============================================================

alter table public.forum_posts enable row level security;
alter table public.forum_tags enable row level security;
alter table public.forum_post_tags enable row level security;
alter table public.forum_replies enable row level security;

-- forum_posts: workspace members can read; insert handled by RPC
create policy "forum_posts_select" on public.forum_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_id = forum_posts.workspace_id and user_id = auth.uid()
    )
  );

create policy "forum_posts_update" on public.forum_posts
  for update to authenticated
  using (author_id = auth.uid());

create policy "forum_posts_delete" on public.forum_posts
  for delete to authenticated
  using (author_id = auth.uid());

-- forum_tags: any workspace member can read/create/delete
create policy "forum_tags_select" on public.forum_tags
  for select to authenticated
  using (
    channel_id in (
      select c.id from public.channels c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "forum_tags_insert" on public.forum_tags
  for insert to authenticated
  with check (
    channel_id in (
      select c.id from public.channels c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "forum_tags_delete" on public.forum_tags
  for delete to authenticated
  using (
    channel_id in (
      select c.id from public.channels c
      join public.workspace_members wm on wm.workspace_id = c.workspace_id
      where wm.user_id = auth.uid()
    )
  );

-- forum_post_tags: workspace members can read; post author can write
create policy "forum_post_tags_select" on public.forum_post_tags
  for select to authenticated
  using (
    post_id in (
      select fp.id from public.forum_posts fp
      join public.workspace_members wm on wm.workspace_id = fp.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "forum_post_tags_write" on public.forum_post_tags
  for all to authenticated
  using (
    post_id in (
      select id from public.forum_posts where author_id = auth.uid()
    )
  );

-- forum_replies: workspace members can read; workspace members can reply to open posts
create policy "forum_replies_select" on public.forum_replies
  for select to authenticated
  using (
    post_id in (
      select fp.id from public.forum_posts fp
      join public.workspace_members wm on wm.workspace_id = fp.workspace_id
      where wm.user_id = auth.uid()
    )
  );

create policy "forum_replies_insert" on public.forum_replies
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and post_id in (
      select fp.id from public.forum_posts fp
      join public.workspace_members wm on wm.workspace_id = fp.workspace_id
      where wm.user_id = auth.uid() and fp.is_closed = false
    )
  );

create policy "forum_replies_delete" on public.forum_replies
  for delete to authenticated
  using (author_id = auth.uid());

-- ============================================================
-- RPC: create_forum_post (avoids INSERT+RETURNING RLS issue)
-- ============================================================

create or replace function public.create_forum_post(
  _channel_id uuid,
  _title text,
  _body text,
  _tag_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _post_id uuid;
  _workspace_id uuid;
begin
  select workspace_id into _workspace_id from public.channels where id = _channel_id;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid()
  ) then
    raise exception 'Not a workspace member';
  end if;

  insert into public.forum_posts (channel_id, workspace_id, author_id, title, body)
  values (_channel_id, _workspace_id, auth.uid(), _title, _body)
  returning id into _post_id;

  if _tag_ids is not null and array_length(_tag_ids, 1) > 0 then
    insert into public.forum_post_tags (post_id, tag_id)
    select _post_id, unnest(_tag_ids);
  end if;

  return _post_id;
end;
$$;

grant execute on function public.create_forum_post(uuid, text, text, uuid[]) to authenticated;

-- ============================================================
-- GRANTS
-- ============================================================

grant select, update, delete on public.forum_posts to authenticated;
grant select, insert, delete on public.forum_tags to authenticated;
grant select, insert, delete on public.forum_post_tags to authenticated;
grant select, insert, delete on public.forum_replies to authenticated;
