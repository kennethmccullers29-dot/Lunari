import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { conversationId, userMessage, systemContext } = await request.json() as {
    conversationId: string;
    userMessage: string;
    systemContext?: string;
  };

  if (!conversationId || !userMessage?.trim()) {
    return new Response("Bad request", { status: 400 });
  }

  // Save user message first
  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: userMessage.trim(),
  });

  // Fetch conversation history (all messages including the one we just inserted)
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at");

  const allMessages = history ?? [];
  // Build Gemini contents array from history (all but the last user message we just added,
  // since we'll send it as the final user turn)
  const historyContents = allMessages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const systemInstruction = [
    "You are Lunari AI, a helpful assistant built into Lunari — a modern team chat platform.",
    "You help teammates communicate, brainstorm, write, summarize, and answer questions.",
    "Be concise and friendly. Format with markdown when helpful.",
    systemContext ? `\nWorkspace context: ${systemContext}` : "",
  ].join(" ");

  let fullResponse = "";
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const geminiStream = await ai.models.generateContentStream({
          model: "gemini-2.5-flash",
          config: { systemInstruction },
          contents: [
            ...historyContents,
            { role: "user", parts: [{ text: userMessage.trim() }] },
          ],
        });

        for await (const chunk of geminiStream) {
          const text = chunk.text;
          if (text) {
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Persist assistant reply
        await supabase.from("ai_messages").insert({
          conversation_id: conversationId,
          role: "assistant",
          content: fullResponse,
        });

        // Update conversation title on first exchange
        if (historyContents.length === 0) {
          const title = userMessage.trim().slice(0, 70);
          await supabase
            .from("ai_conversations")
            .update({ title })
            .eq("id", conversationId);
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
