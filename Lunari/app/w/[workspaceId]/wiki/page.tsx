import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WikiHome } from "@/components/wiki/wiki-home";

export default async function WikiPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pages } = await supabase
    .from("wiki_pages")
    .select(`
      id, title, icon, updated_at,
      updater:profiles!wiki_pages_updated_by_fkey(display_name)
    `)
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  type RawPage = {
    id: string;
    title: string;
    icon: string;
    updated_at: string;
    updater: { display_name: string } | null;
  };

  const formatted = ((pages ?? []) as unknown as RawPage[]).map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.icon,
    updated_at: p.updated_at,
    updater_name: p.updater?.display_name ?? null,
  }));

  return (
    <WikiHome
      workspaceId={workspaceId}
      pages={formatted}
      currentUserId={user.id}
    />
  );
}
