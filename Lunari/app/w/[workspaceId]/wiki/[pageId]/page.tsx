import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WikiPageEditor } from "@/components/wiki/wiki-page-editor";

export default async function WikiPageRoute({
  params,
}: {
  params: Promise<{ workspaceId: string; pageId: string }>;
}) {
  const { workspaceId, pageId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: page } = await supabase
    .from("wiki_pages")
    .select(`
      id, workspace_id, title, icon, content, updated_at,
      updater:profiles!wiki_pages_updated_by_fkey(display_name)
    `)
    .eq("id", pageId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!page) redirect(`/w/${workspaceId}/wiki`);

  type RawPage = typeof page & { updater: { display_name: string } | null };
  const raw = page as unknown as RawPage;

  return (
    <WikiPageEditor
      page={{
        id: raw.id,
        workspace_id: raw.workspace_id,
        title: raw.title,
        icon: raw.icon,
        content: raw.content as object,
        updated_at: raw.updated_at,
        updater_name: raw.updater?.display_name ?? null,
      }}
    />
  );
}
