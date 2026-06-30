"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/optics/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/optics/popover";
import { EmojiButton } from "@/components/emoji/emoji-button";
import { GifPicker } from "@/components/messages/gif-picker";
import { uploadAttachment } from "@/lib/storage";
import { Bold, Code, Image as ImageIcon, Italic, Strikethrough } from "lucide-react";

type Attachment = { url: string; type: "image" | "gif" };

export function MessageComposer({
  onSend,
  onTyping,
  placeholder,
}: {
  onSend: (body: string, attachment?: Attachment) => void;
  onTyping?: () => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!value.trim() && !pendingAttachment) return;
    onSend(value, pendingAttachment ?? undefined);
    setValue("");
    setPendingAttachment(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
      return;
    }

    const mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      wrapSelection("*");
    } else if (key === "i") {
      e.preventDefault();
      wrapSelection("_");
    } else if (key === "e") {
      e.preventDefault();
      wrapSelection("`");
    } else if (e.shiftKey && key === "x") {
      e.preventDefault();
      wrapSelection("~");
    }
  };

  const wrapSelection = (marker: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + marker + selected + marker + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start + marker.length, start + marker.length + selected.length);
      } else {
        const cursor = start + marker.length;
        textarea.setSelectionRange(cursor, cursor);
      }
    });
  };

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setValue((v) => v + emoji);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const end = textarea.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const cursor = start + emoji.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    try {
      const { url, type } = await uploadAttachment(file);
      setPendingAttachment({ url, type });
    } catch {
      setUploadError("Could not upload file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-5 pb-5">
      {uploadError && <p className="mb-1 text-xs text-red-600">{uploadError}</p>}

      {pendingAttachment && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pendingAttachment.url}
            alt=""
            className="h-12 w-12 rounded object-cover"
          />
          <span className="text-xs text-neutral-500">
            {pendingAttachment.type === "gif" ? "GIF attached" : "Image attached"}
          </span>
          <button
            type="button"
            onClick={() => setPendingAttachment(null)}
            className="ml-auto text-sm text-neutral-400 hover:text-neutral-700"
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col rounded-lg border border-neutral-300 shadow-sm focus-within:border-neutral-500">
        <div className="flex items-center gap-0.5 border-b border-neutral-200 px-2 py-1">
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Bold (Ctrl+B)"
            aria-label="Bold"
            onClick={() => wrapSelection("*")}
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Italic (Ctrl+I)"
            aria-label="Italic"
            onClick={() => wrapSelection("_")}
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Strikethrough (Ctrl+Shift+X)"
            aria-label="Strikethrough"
            onClick={() => wrapSelection("~")}
          >
            <Strikethrough className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            title="Code (Ctrl+E)"
            aria-label="Code"
            onClick={() => wrapSelection("`")}
          >
            <Code className="size-3.5" />
          </Button>
        </div>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onTyping?.();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="resize-none px-3 py-2.5 text-[15px] outline-none"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-1">
            <EmojiButton onSelect={insertEmoji} label="Add emoji" />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <Button
              variant="ghost"
              size="icon"
              title="Upload image"
              aria-label="Upload image"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "…" : <ImageIcon />}
            </Button>

            <Popover open={gifPickerOpen} onOpenChange={setGifPickerOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="ghost"
                    type="button"
                    title="Add a GIF"
                    aria-label="Add a GIF"
                    className="flex h-7 w-9 items-center justify-center rounded text-xs font-bold hover:bg-neutral-200"
                  >
                    GIF
                  </Button>
                }
              />
              <PopoverContent align="start" className="w-auto p-0">
                <GifPicker
                  onSelect={(gif) => {
                    setPendingAttachment(gif);
                    setGifPickerOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={submit}
            disabled={!value.trim() && !pendingAttachment}
            className="px-4 py-1.5 bg-black text-white hover:bg-neutral-800"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
