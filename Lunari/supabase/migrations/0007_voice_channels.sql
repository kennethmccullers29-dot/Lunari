-- ============================================================
-- VOICE CHANNELS
--
-- Adds a type column to channels so text and voice channels can
-- coexist in the same table/sidebar. Existing rows default to
-- 'text', preserving all current channel data and RLS policies
-- with zero migration risk.
--
-- The create_channel RPC is recreated to accept an optional
-- _type parameter. Existing callers that omit it continue to
-- work because 'text' is the default.
-- ============================================================
alter table public.channels
  add column type text not null default 'text'
  check (type in ('text', 'voice'));

-- Drop and recreate with the added _type parameter.
-- The grant below covers the new signature.
drop function public.create_channel(uuid, text, boolean, uuid[]);

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
