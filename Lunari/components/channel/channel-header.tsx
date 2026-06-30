export function ChannelHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <h2 className="text-lg font-bold text-neutral-900">
        <span className="text-neutral-400">{icon}</span> {title}
      </h2>
    </header>

  );
}
