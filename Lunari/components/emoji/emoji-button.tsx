"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/optics/popover";
import { EmojiPicker } from "@/components/emoji/emoji-picker";
import { SmileIcon } from "lucide-react";
import { Button } from "@/components/optics/button";

export function EmojiButton({
  onSelect,
  className,
  align = "start",
  label = "Add emoji",
}: {
  onSelect: (emoji: string) => void;
  className?: string;
  align?: "start" | "end";
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            type="button"
            title={label}
            aria-label={label}
            className={clsx(
              "flex h-7 w-7 items-center justify-center rounded text-base hover:bg-muted",
              className
            )}
          >
            <SmileIcon className="h-5 w-5" />
          </Button>
        }
      />
      <PopoverContent align={align} className="w-auto p-0">
        <EmojiPicker
          onSelect={(emoji) => {
            onSelect(emoji);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
