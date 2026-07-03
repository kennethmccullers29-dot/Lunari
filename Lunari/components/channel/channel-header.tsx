import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/optics/separator";

export function ChannelHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Separator orientation="vertical" className="mx-1 h-4 md:hidden" />
      <h2 className="text-base font-bold text-foreground truncate sm:text-lg">
        <span className="text-muted-foreground">{icon}</span> {title}
      </h2>
    </header>
  );
}
