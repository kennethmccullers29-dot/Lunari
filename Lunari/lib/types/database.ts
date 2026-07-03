export type ProfileStatus = "active" | "away" | "offline";
export type WorkspaceRole = "owner" | "admin" | "member";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  status: ProfileStatus;
  full_name: string | null;
  title: string | null;
  pronouns: string | null;
  status_emoji: string | null;
  status_text: string | null;
  onboarded_at: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  join_code: string;
  created_by: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  joined_at: string;
}

export type ChannelType = "text" | "voice" | "forum";

export interface Channel {
  id: string;
  workspace_id: string;
  name: string;
  is_private: boolean;
  type: ChannelType;
  created_by: string;
  created_at: string;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
  joined_at: string;
}

export interface DmConversation {
  id: string;
  workspace_id: string;
  is_group: boolean;
  created_at: string;
}

export interface DmParticipant {
  dm_conversation_id: string;
  user_id: string;
}

export interface Message {
  id: string;
  channel_id: string | null;
  dm_conversation_id: string | null;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "gif" | "file" | "voice" | null;
  attachment_name: string | null;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  channel_id: string | null;
  dm_conversation_id: string | null;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface MessageRead {
  user_id: string;
  channel_id: string | null;
  dm_conversation_id: string | null;
  last_read_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  message_id: string;
  channel_id: string | null;
  dm_conversation_id: string | null;
  created_at: string;
  read_at: string | null;
}

export type UnreadCountRow = {
  target_type: "channel" | "dm";
  target_id: string;
  unread_count: number;
};

