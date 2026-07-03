-- SECURITY DEFINER functions for moderation operations that need to bypass RLS.

-- Admin/owner can delete any channel message in a workspace they moderate.
-- DM messages may only be deleted by the sender (no admin override).
CREATE OR REPLACE FUNCTION public.admin_delete_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_channel_id uuid;
  v_workspace_id uuid;
BEGIN
  SELECT channel_id INTO v_channel_id FROM messages WHERE id = p_message_id;

  IF v_channel_id IS NOT NULL THEN
    SELECT workspace_id INTO v_workspace_id FROM channels WHERE id = v_channel_id;

    IF NOT EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = v_workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'Permission denied: not an admin or owner of this workspace';
    END IF;
  ELSE
    -- DM messages: only sender can delete
    IF NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message_id AND sender_id = auth.uid()) THEN
      RAISE EXCEPTION 'Permission denied: not the message sender';
    END IF;
  END IF;

  DELETE FROM messages WHERE id = p_message_id;
END;
$$;

-- Change a workspace member's role.
-- Owner can promote/demote any non-owner.
-- Admin can only demote (regular) members, not other admins.
CREATE OR REPLACE FUNCTION public.change_member_role(
  p_workspace_id uuid,
  p_user_id uuid,
  p_new_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  SELECT role INTO v_caller_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: must be admin or owner';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change your own role';
  END IF;

  SELECT role INTO v_target_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this workspace';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change the workspace owner''s role';
  END IF;

  IF p_new_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot promote to owner via this function';
  END IF;

  -- Admins cannot touch other admins
  IF v_caller_role = 'admin' AND (v_target_role = 'admin' OR p_new_role = 'admin') THEN
    RAISE EXCEPTION 'Admins cannot promote or demote other admins';
  END IF;

  UPDATE workspace_members
  SET role = p_new_role
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
END;
$$;

-- Remove a member from a workspace.
-- Owner can remove anyone except themselves.
-- Admin can only remove regular members.
CREATE OR REPLACE FUNCTION public.remove_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
BEGIN
  SELECT role INTO v_caller_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid();

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'Not a member of this workspace';
  END IF;

  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Permission denied: must be admin or owner';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself from the workspace';
  END IF;

  SELECT role INTO v_target_role
  FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Target user is not a member of this workspace';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot remove the workspace owner';
  END IF;

  IF v_caller_role = 'admin' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Admins cannot remove other admins';
  END IF;

  DELETE FROM workspace_members
  WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_member_role(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_workspace_member(uuid, uuid) TO authenticated;
