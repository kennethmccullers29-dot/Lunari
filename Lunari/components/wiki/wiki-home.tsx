"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/optics/separator";
import { createWikiPage, deleteWikiPage } from "@/lib/actions/wiki";

type WikiPage = {
  id: string;
  title: string;
  icon: string;
  updated_at: string;
  updater_name: string | null;
};

export function WikiHome({
  workspaceId,
  pages,
  currentUserId,
}: {
  workspaceId: string;
  pages: WikiPage[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [creating, startCreating] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = () => {
    startCreating(async () => {
      const { id, error } = await createWikiPage(workspaceId);
      if (id) router.push(`/w/${workspaceId}/wiki/${id}`);
      else if (error) console.error(error);
    });
  };

  const handleDelete = async (pageId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeletingId(pageId);
    await deleteWikiPage(pageId, workspaceId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="mx-1 h-4 md:hidden" />
        <FileText className="size-4 text-muted-foreground" />
        <h1 className="text-base font-semibold text-foreground">Wiki</h1>
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{creating ? "Creating…" : "New page"}</span>
        </button>
      </header>

      {/* Page grid */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <span className="text-5xl">📄</span>
            <div>
              <p className="text-sm font-medium text-foreground">No pages yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first wiki page to get started.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Plus className="size-4" />
              {creating ? "Creating…" : "Create first page"}
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pages.map((page, i) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: i * 0.04, ease: "easeOut" }}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/w/${workspaceId}/wiki/${page.id}`)}
                  disabled={deletingId === page.id}
                  className="group relative w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
                >
                  <div className="mb-3 text-3xl">{page.icon}</div>
                  <p className="truncate font-semibold text-foreground">
                    {page.title || "Untitled"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated{" "}
                    {new Date(page.updated_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                    {page.updater_name && ` · ${page.updater_name}`}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(page.id, e)}
                    aria-label="Delete page"
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
