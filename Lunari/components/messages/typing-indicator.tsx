function formatTypingLabel(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing`;
  return `${names.length} people are typing`;
}

export function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <div className="flex h-5 items-center gap-1.5 px-3 text-xs text-muted-foreground sm:px-5">
      <span className="flex items-center gap-0.5">
        <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
        <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
        <span className="size-1 animate-bounce rounded-full bg-current" />
      </span>
      {formatTypingLabel(names)}
    </div>
  );
}
