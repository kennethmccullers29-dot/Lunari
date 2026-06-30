-- ============================================================
-- INVITES
--
-- Adds the ability for workspace owners and admins to regenerate
-- the workspace join code. The existing join_code column on
-- workspaces already acts as an invite code; this RPC simply
-- rotates it to a fresh value when the caller has sufficient role.
-- ============================================================

create or replace function public.regenerate_join_code(_workspace_id uuid)
returns public.workspaces as $$
declare
  _workspace public.workspaces;
  _role text;
begin
  select role into _role
    from public.workspace_members
    where workspace_id = _workspace_id and user_id = auth.uid();

  if _role is null or _role not in ('owner', 'admin') then
    raise exception 'Only workspace owners and admins can regenerate the invite code';
  end if;

  update public.workspaces
    set join_code = substr(md5(gen_random_uuid()::text), 1, 8)
    where id = _workspace_id
    returning * into _workspace;

  return _workspace;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function public.regenerate_join_code(uuid) to authenticated;
