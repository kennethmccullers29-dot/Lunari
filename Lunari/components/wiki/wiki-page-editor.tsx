"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { motion } from "motion/react";
import {
  Bold, Code, Heading1, Heading2, Heading3,
  Italic, List, ListOrdered, Minus, Quote,
  Strikethrough, Trash2, ArrowLeft,
} from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/optics/separator";
import { updateWikiPage, deleteWikiPage } from "@/lib/actions/wiki";

const ICON_OPTIONS = ["📄","📝","💡","🔖","📌","🗒️","🧩","🚀","⭐","🔥","📊","🎯","🛠️","📖","🌐","💬","🔐","🎨","📋","✅"];

type WikiPage = {
  id: string;
  workspace_id: string;
  title: string;
  icon: string;
  content: object;
  updated_at: string;
  updater_name: string | null;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function WikiPageEditor({ page }: { page: WikiPage }) {
  const router = useRouter();
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleting, setDeleting] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSave = useCallback(
    (fields: { title?: string; icon?: string; content?: object }) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setSaveState("saving");
      saveTimerRef.current = setTimeout(async () => {
        const { error } = await updateWikiPage(page.id, fields);
        setSaveState(error ? "error" : "saved");
        setTimeout(() => setSaveState("idle"), 2000);
      }, 1200);
    },
    [page.id]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: page.content as object,
    editorProps: {
      attributes: { class: "outline-none" },
    },
    onUpdate: ({ editor: e }) => {
      scheduleSave({ content: e.getJSON() });
    },
  });

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    scheduleSave({ title: val });
  };

  const handleIconSelect = (emoji: string) => {
    setIcon(emoji);
    setShowIconPicker(false);
    scheduleSave({ icon: emoji });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeleting(true);
    await deleteWikiPage(page.id, page.workspace_id);
  };

  const ToolbarButton = ({
    onClick,
    active,
    title: btnTitle,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={btnTitle}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`flex size-7 items-center justify-center rounded text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Separator orientation="vertical" className="mx-1 h-4 md:hidden" />
        <button
          type="button"
          onClick={() => router.push(`/w/${page.workspace_id}/wiki`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">Wiki</span>
        </button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <span className="truncate text-sm text-muted-foreground">{title || "Untitled"}</span>

        <div className="ml-auto flex items-center gap-2">
          {saveState === "saving" && (
            <span className="text-xs text-muted-foreground">Saving…</span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
          )}
          {saveState === "error" && (
            <span className="text-xs text-destructive">Save failed</span>
          )}
          <button
            type="button"
            title="Delete page"
            onClick={handleDelete}
            disabled={deleting}
            className="flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12"
        >
          {/* Icon picker */}
          <div className="relative mb-4">
            <button
              type="button"
              onClick={() => setShowIconPicker((v) => !v)}
              className="text-5xl leading-none transition-transform hover:scale-110 active:scale-95"
              title="Change icon"
            >
              {icon}
            </button>
            {showIconPicker && (
              <div className="absolute left-0 top-14 z-10 flex flex-wrap gap-1 rounded-xl border border-border bg-popover p-2 shadow-lg w-64">
                {ICON_OPTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => handleIconSelect(e)}
                    className="flex size-9 items-center justify-center rounded-lg text-xl hover:bg-muted"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="mb-6 w-full bg-transparent text-3xl font-bold text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-4xl"
          />

          {/* Formatting toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-1">
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor?.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor?.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor?.isActive("heading", { level: 3 })}
              title="Heading 3"
            >
              <Heading3 className="size-3.5" />
            </ToolbarButton>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBold().run()}
              active={editor?.isActive("bold")}
              title="Bold"
            >
              <Bold className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              active={editor?.isActive("italic")}
              title="Italic"
            >
              <Italic className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleStrike().run()}
              active={editor?.isActive("strike")}
              title="Strikethrough"
            >
              <Strikethrough className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCode().run()}
              active={editor?.isActive("code")}
              title="Inline code"
            >
              <Code className="size-3.5" />
            </ToolbarButton>
            <Separator orientation="vertical" className="mx-0.5 h-5" />
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              active={editor?.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              active={editor?.isActive("orderedList")}
              title="Numbered list"
            >
              <ListOrdered className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              active={editor?.isActive("blockquote")}
              title="Blockquote"
            >
              <Quote className="size-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              active={editor?.isActive("codeBlock")}
              title="Code block"
            >
              <span className="font-mono text-[11px] font-bold">{"</>"}</span>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
              title="Divider"
            >
              <Minus className="size-3.5" />
            </ToolbarButton>
          </div>

          {/* TipTap editor */}
          <div className="wiki-editor">
            <EditorContent editor={editor} />
          </div>

          {/* Last updated */}
          <p className="mt-12 text-xs text-muted-foreground/60">
            Last updated{" "}
            {new Date(page.updated_at).toLocaleDateString([], {
              year: "numeric", month: "long", day: "numeric",
            })}
            {page.updater_name && ` by ${page.updater_name}`}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
