"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import { Button } from "@/components/optics/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/optics/popover";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { GifPicker } from "@/components/messages/gif-picker";
import { MentionList, type MentionItem, type MentionListRef } from "@/components/messages/mention-list";
import { uploadAttachment, uploadVoice } from "@/lib/storage";
import { Bold, Code, File as FileIcon, Italic, Mic, MicOff, Paperclip, Send, Strikethrough } from "lucide-react";

type Attachment = {
  url: string;
  type: "image" | "gif" | "file" | "voice";
  name?: string;
};

type TipTapNode = {
  type: string;
  text?: string;
  attrs?: Record<string, string>;
  marks?: { type: string }[];
  content?: TipTapNode[];
};

function serializeDoc(json: { content?: TipTapNode[] }): {
  text: string;
  mentionIds: string[];
} {
  const mentionIds: string[] = [];

  function processNode(node: TipTapNode): string {
    switch (node.type) {
      case "text": {
        let t = node.text ?? "";
        for (const mark of node.marks ?? []) {
          if (mark.type === "bold") t = `*${t}*`;
          else if (mark.type === "italic") t = `_${t}_`;
          else if (mark.type === "strike") t = `~${t}~`;
          else if (mark.type === "code") t = `\`${t}\``;
        }
        return t;
      }
      case "mention": {
        const id = node.attrs?.id ?? "";
        const label = node.attrs?.label ?? "";
        if (id && !mentionIds.includes(id)) mentionIds.push(id);
        return `@[${label}](${id})`;
      }
      case "hardBreak":
        return "\n";
      case "codeBlock": {
        const inner = (node.content ?? []).map(processNode).join("");
        return "```\n" + inner + "\n```";
      }
      default:
        return (node.content ?? []).map(processNode).join("");
    }
  }

  const paragraphs = (json.content ?? []).map(processNode);
  const text = paragraphs.join("\n").trim();
  return { text, mentionIds };
}

// Popup is position:fixed — coordinates are viewport-relative, no scrollY needed.
// Flip above the cursor when there isn't enough space below.
// When above, pin the *bottom* edge to just above the cursor so the popup
// sits flush regardless of how many items it contains.
function positionPopup(popup: HTMLElement, getRect: () => DOMRect | null) {
  const rect = getRect();
  if (!rect) return;

  const MARGIN = 8;
  const POPUP_W = 220;
  const MAX_H = 260;

  // Horizontal
  let left = rect.left;
  if (left + POPUP_W > window.innerWidth - MARGIN) left = window.innerWidth - POPUP_W - MARGIN;
  if (left < MARGIN) left = MARGIN;
  popup.style.left = `${left}px`;

  // Vertical: prefer below; flip above when insufficient space below
  const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
  const spaceAbove = rect.top - MARGIN;

  if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
    // Below: top edge at cursor bottom
    popup.style.top = `${rect.bottom + 4}px`;
    popup.style.bottom = "auto";
    popup.style.maxHeight = `${Math.min(MAX_H, spaceBelow)}px`;
  } else {
    // Above: pin the *bottom* edge to just above the cursor so the popup
    // grows upward and stays adjacent no matter how tall the content is.
    popup.style.top = "auto";
    popup.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    popup.style.maxHeight = `${Math.min(MAX_H, spaceAbove)}px`;
  }
}

function buildMentionExtension(membersRef: React.RefObject<MentionItem[]>) {
  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    suggestion: {
      items: ({ query }: { query: string }) =>
        (membersRef.current ?? [])
          .filter((m) => m.label.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),

      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: HTMLElement | null = null;

        return {
          onStart: (props: SuggestionProps<MentionItem>) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });

            popup = document.createElement("div");
            popup.style.cssText =
              "position:fixed;z-index:9999;overflow-y:auto;";
            document.body.appendChild(popup);
            popup.appendChild(component.element);
            if (props.clientRect) positionPopup(popup, props.clientRect);
          },

          onUpdate: (props: SuggestionProps<MentionItem>) => {
            component?.updateProps(props);
            if (popup && props.clientRect) positionPopup(popup, props.clientRect);
          },

          onKeyDown: (props: SuggestionKeyDownProps) => {
            if (props.event.key === "Escape") {
              popup?.remove();
              component?.destroy();
              popup = null;
              component = null;
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },

          onExit: () => {
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
          },
        };
      },
    },
  });
}

export function RichComposer({
  onSend,
  onTyping,
  placeholder,
  members = [],
}: {
  onSend: (body: string, attachment?: Attachment, mentionIds?: string[]) => void;
  onTyping?: () => void;
  placeholder: string;
  members?: MentionItem[];
}) {
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  // Tracked via onUpdate so React re-renders when editor content changes
  const [editorEmpty, setEditorEmpty] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Ref so the mention suggestion always reads the latest members list without
  // needing to recreate the TipTap extension (which would reset the editor).
  const membersRef = useRef<MentionItem[]>(members);
  useEffect(() => { membersRef.current = members; }, [members]);

  // submitRef lets the editor's keydown handler always call the latest submit
  // without becoming a stale closure (same pattern as voice-mode.tsx).
  const submitRef = useRef<() => void>(() => {});

  const mentionExtension = useRef(buildMentionExtension(membersRef));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      mentionExtension.current,
    ],
    editorProps: {
      attributes: { class: "min-h-[36px] px-3 py-2.5 text-[15px] outline-none" },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && !event.shiftKey) {
          event.preventDefault();
          submitRef.current();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      setEditorEmpty(e.isEmpty);
      onTyping?.();
    },
  });

  const submit = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    const { text, mentionIds } = serializeDoc(json as { content?: TipTapNode[] });
    if (!text && !pendingAttachment) return;
    onSend(text, pendingAttachment ?? undefined, mentionIds);
    editor.commands.clearContent();
    setPendingAttachment(null);
    setEditorEmpty(true);
  }, [editor, pendingAttachment, onSend]);

  // Keep submitRef current every render
  useEffect(() => { submitRef.current = submit; }, [submit]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const { url, type, name } = await uploadAttachment(file);
      setPendingAttachment({ url, type, name });
    } catch {
      setUploadError("Could not upload file");
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setUploading(true);
        try {
          const { url, name } = await uploadVoice(blob);
          setPendingAttachment({ url, type: "voice", name });
        } catch {
          setUploadError("Could not upload voice message");
        } finally {
          setUploading(false);
          setRecording(false);
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setUploadError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
  };

  return (
    <div className="px-3 pb-3 sm:px-5 sm:pb-5">
      {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}

      {pendingAttachment && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
          {pendingAttachment.type === "voice" ? (
            <div className="flex items-center gap-2">
              <Mic className="size-4 text-[#611f69]" />
              <span className="text-xs text-muted-foreground">Voice message ready</span>
            </div>
          ) : pendingAttachment.type === "file" ? (
            <div className="flex items-center gap-2">
              <FileIcon className="size-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[200px]">
                {pendingAttachment.name ?? "File"}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pendingAttachment.url} alt="" className="h-12 w-12 rounded object-cover" />
          )}
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="ml-auto text-sm text-muted-foreground hover:text-foreground"
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col rounded-lg border border-border shadow-sm focus-within:border-ring/60">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border px-2 py-1 scrollbar-none">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Strikethrough"
            aria-label="Strikethrough"
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Code"
            aria-label="Code"
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code className="size-3.5" />
          </Button>
        </div>

        {/* TipTap editor */}
        <EditorContent editor={editor} className="min-h-[40px]" />

        {/* Bottom action bar */}
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <EmojiButton
              onSelect={(emoji) => editor?.chain().focus().insertContent(emoji).run()}
              label="Add emoji"
            />

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="ghost"
              size="icon"
              title="Attach file"
              aria-label="Attach file"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <span className="text-xs">…</span> : <Paperclip className="size-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              title={recording ? "Stop recording" : "Record voice message"}
              aria-label={recording ? "Stop recording" : "Record voice message"}
              onClick={() => (recording ? stopRecording() : startRecording())}
              className={recording ? "text-red-500 hover:text-red-600" : ""}
            >
              {recording ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            </Button>

            <Popover open={gifPickerOpen} onOpenChange={setGifPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    type="button"
                    title="Add a GIF"
                    aria-label="Add a GIF"
                    className="flex h-7 w-9 items-center justify-center rounded text-xs font-bold hover:bg-muted"
                  >
                    GIF
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-auto p-0">
                <GifPicker
                  onSelect={(gif) => {
                    setPendingAttachment({ url: gif.url, type: gif.type });
                    setGifPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={submit}
            disabled={editorEmpty && !pendingAttachment}
            className="px-3 py-1.5 sm:px-4 bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
          >
            <Send className="size-3.5" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
