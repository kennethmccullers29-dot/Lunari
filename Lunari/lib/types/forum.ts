export type ForumTag = {
  id: string;
  name: string;
  color: string;
};

export type ForumAuthor = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type ForumPost = {
  id: string;
  channel_id: string;
  author_id: string;
  title: string;
  body: string;
  reply_count: number;
  is_pinned: boolean;
  is_closed: boolean;
  last_activity_at: string;
  created_at: string;
  author: ForumAuthor;
  tags: ForumTag[];
};

export type ForumReply = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: ForumAuthor;
};

export const TAG_COLORS: Record<string, string> = {
  red: "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  teal: "bg-teal-100 text-teal-700",
  sky: "bg-sky-100 text-sky-700",
  blue: "bg-blue-100 text-blue-700",
  indigo: "bg-indigo-100 text-indigo-700",
  violet: "bg-violet-100 text-violet-700",
  pink: "bg-pink-100 text-pink-700",
  rose: "bg-rose-100 text-rose-700",
  gray: "bg-gray-100 text-gray-600",
};

export const TAG_COLOR_OPTIONS = Object.keys(TAG_COLORS);
