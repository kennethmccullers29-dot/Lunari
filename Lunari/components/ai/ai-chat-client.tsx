"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { VoiceMode } from "./voice-mode";
import { Button } from "@/components/optics/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/optics/avatar";
import { Send, Mic, Plus, Sparkles, MessageSquare, Trash2 } from "lucide-react";
import { ShimmeringText } from "@/components/ui/shimmering-text";

type Message = { id: string; role: "user" | "assistant"; content: string; created_at: string };
type Conversation = { id: string; title: string; created_at: string };

export function AiChatClient({
  workspaceId,
  workspaceName,
  channelNames,
  memberNames,
  initialConversations,
  currentUser,
}: {
  workspaceId: string;
  workspaceName: string;
  channelNames: string[];
  memberNames: string[];
  initialConversations: Conversation[];
  currentUser: { id: string; display_name: string; avatar_url: string | null };
}) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    initialConversations[0]?.id ?? null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [voiceMode, setVoiceMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const supabase = createClient();

  const systemContext = [
    `Workspace: ${workspaceName}.`,
    channelNames.length > 0 ? `Channels: ${channelNames.join(", ")}.` : "",
    memberNames.length > 0 ? `Team members: ${memberNames.join(", ")}.` : "",
  ].filter(Boolean).join(" ");

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) { setMessages([]); return; }
    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", activeConversationId)
      .order("created_at")
      .then(({ data }) => setMessages((data as Message[]) ?? []));
  }, [activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const createConversation = useCallback(async (): Promise<string | null> => {
    const { data, error: err } = await supabase
      .from("ai_conversations")
      .insert({ workspace_id: workspaceId, user_id: currentUser.id })
      .select("id, title, created_at")
      .single();
    if (err || !data) return null;
    const conv = data as Conversation;
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setMessages([]);
    return conv.id;
  }, [workspaceId, currentUser.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async (text?: string) => {
    const body = (text ?? input).trim();
    if (!body || streaming) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
    }

    setInput("");
    setStreaming(true);
    setStreamingText("");
    setError(null);

    // Optimistic user message
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "user", content: body, created_at: new Date().toISOString() },
    ]);

    try {
      abortRef.current = new AbortController();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, userMessage: body, systemContext }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text: t, error: aiErr } = JSON.parse(payload) as { text?: string; error?: string };
            if (aiErr) throw new Error(aiErr);
            if (t) { accumulated += t; setStreamingText(accumulated); }
          } catch { /* skip */ }
        }
      }

      // Replace optimistic messages with persisted ones
      const { data: fresh } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", convId)
        .order("created_at");
      setMessages((fresh as Message[]) ?? []);
      setStreamingText("");

      // Refresh conversation title
      const { data: convData } = await supabase
        .from("ai_conversations")
        .select("id, title, created_at")
        .eq("id", convId)
        .single();
      if (convData) {
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? (convData as Conversation) : c))
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setError(err.message);
      setStreamingText("");
    } finally {
      setStreaming(false);
    }
  }, [input, activeConversationId, streaming, systemContext, createConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteConversation = async (convId: string) => {
    await supabase.from("ai_conversations").delete().eq("id", convId);
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      const remaining = conversations.filter((c) => c.id !== convId);
      setActiveConversationId(remaining[0]?.id ?? null);
    }
  };

  // Called by VoiceMode after each AI exchange to refresh message list
  const handleVoiceExchange = useCallback((convId: string) => {
    setActiveConversationId(convId);
    supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", convId)
      .order("created_at")
      .then(({ data }) => setMessages((data as Message[]) ?? []));
    // Refresh title
    supabase
      .from("ai_conversations")
      .select("id, title, created_at")
      .eq("id", convId)
      .single()
      .then(({ data }) => {
        if (data) {
          setConversations((prev) => {
            const exists = prev.find((c) => c.id === convId);
            if (exists) return prev.map((c) => (c.id === convId ? (data as Conversation) : c));
            return [data as Conversation, ...prev];
          });
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (voiceMode) {
    return (
      <VoiceMode
        conversationId={activeConversationId}
        systemContext={systemContext}
        onCreateConversation={createConversation}
        onExchange={handleVoiceExchange}
        onExit={() => setVoiceMode(false)}
      />
    );
  }

  const isEmpty = messages.length === 0 && !streamingText;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Conversation list sidebar */}
      <div className="flex w-56 shrink-0 flex-col border-r overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="text-sm font-semibold">Conversations</span>
          <button
            onClick={createConversation}
            title="New conversation"
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 && (
            <p className="px-4 py-2 text-xs text-muted-foreground">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                c.id === activeConversationId ? "bg-muted" : ""
              }`}
              onClick={() => setActiveConversationId(c.id)}
            >
              <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-xs">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-500" />
            <span className="text-sm font-semibold">Lunari AI</span>
          </div>
          <button
            onClick={() => setVoiceMode(true)}
            title="Switch to voice mode"
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Mic className="size-3.5" />
            Voice mode
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {isEmpty && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-16">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-violet-100">
                <Sparkles className="size-8 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Lunari AI</h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Ask me anything — writing, brainstorming, summaries, or questions about your workspace.
                </p>
                <button
                  onClick={() => setVoiceMode(true)}
                  className="mt-4 flex items-center gap-2 mx-auto rounded-full border px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Mic className="size-4" />
                  Try voice mode
                </button>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} currentUser={currentUser} />
          ))}

          {streaming && !streamingText && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                <Sparkles className="size-4 text-violet-600" />
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-4 py-2.5 text-sm">
                <ShimmeringText
                  text="Thinking…"
                  color="#94a3b8"
                  shimmerColor="#7c3aed"
                  duration={1.5}
                />
              </div>
            </div>
          )}

          {streamingText && (
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                <Sparkles className="size-4 text-violet-600" />
              </div>
              <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-4 py-2.5 text-sm leading-relaxed">
                <span className="whitespace-pre-wrap">{streamingText}</span>
                <span className="animate-pulse ml-0.5">▋</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="border-t p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Lunari AI anything…"
              rows={1}
              className="flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400/40 min-h-[42px] max-h-40"
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
            />
            <Button
              size="sm"
              onClick={() => sendMessage()}
              disabled={streaming || !input.trim()}
              className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  currentUser,
}: {
  msg: Message;
  currentUser: { display_name: string; avatar_url: string | null };
}) {
  if (msg.role === "user") {
    return (
      <div className="flex items-start gap-3 flex-row-reverse">
        <Avatar className="size-8 shrink-0">
          {currentUser.avatar_url && <AvatarImage src={currentUser.avatar_url} width={32} height={32} alt="" />}
          <AvatarFallback className="bg-black text-white text-xs font-bold uppercase">
            {currentUser.display_name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="max-w-[75%] rounded-2xl rounded-tr-none bg-violet-600 px-4 py-2.5 text-sm text-white">
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
        <Sparkles className="size-4 text-violet-600" />
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-4 py-2.5 text-sm leading-relaxed">
        <FormattedMessage content={msg.content} />
      </div>
    </div>
  );
}

function FormattedMessage({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).replace(/^[^\n]*\n/, "");
          return (
            <code key={i} className="block rounded-lg bg-black/10 px-3 py-2 font-mono text-xs mt-1 mb-1 whitespace-pre-wrap">
              {code.trim()}
            </code>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={i} className="rounded bg-black/10 px-1 font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}
