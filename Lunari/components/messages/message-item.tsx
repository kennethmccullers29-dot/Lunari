import { clsx } from "clsx";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/optics/avatar";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { formatMessageText } from "@/lib/format-message";
import type { Message } from "@/lib/types/database";
import type { ReactionPill } from "@/lib/hooks/use-message-reactions";

export function MessageItem({
  message,
  senderName,
  senderAvatarUrl,
  reactions,
  onToggleReaction,
}: {
  message: Message;
  senderName: string;
  senderAvatarUrl?: string | null;
  reactions: ReactionPill[];
  onToggleReaction: (emoji: string) => void;
}) {
  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="group flex gap-3 px-5 py-2 hover:bg-neutral-100/60">
      <Avatar size="lg" title={senderName}>
        {senderAvatarUrl && <AvatarImage src={senderAvatarUrl} width={40} height={40} alt="" />}
        <AvatarFallback className="bg-black text-white font-bold uppercase">
          {senderName.trim().charAt(0)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-bold text-neutral-900">{senderName}</span>
          <span className="text-xs text-neutral-400">{time}</span>
        </div>

        {message.body && (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-snug text-neutral-800">
            {formatMessageText(message.body)}
          </div>
        )}

        {message.attachment_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachment_url}
            alt=""
            loading="lazy"
            className="mt-1 max-h-80 max-w-sm rounded-lg"
          />
        )}

        {reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onToggleReaction(r.emoji)}
                className={clsx(
                  "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  r.reactedByMe
                    ? "border-[#611f69] bg-[#611f69]/10 text-[#611f69]"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="opacity-0 group-hover:opacity-100">
        <EmojiButton
          onSelect={onToggleReaction}
          label="Add reaction"
          align="end"
        />
      </div>
    </div>
  );
}
