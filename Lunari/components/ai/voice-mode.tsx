"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, MessageSquare, Sparkles } from "lucide-react";
import { Orb, type AgentState as OrbAgentState } from "@/components/ui/orb";
import { ShimmeringText } from "@/components/ui/shimmering-text";

type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

export function VoiceMode({
  conversationId,
  systemContext,
  onCreateConversation,
  onExchange,
  onExit,
}: {
  conversationId: string | null;
  systemContext: string;
  onCreateConversation: () => Promise<string | null>;
  onExchange: (convId: string) => void;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [statusText, setStatusText] = useState("Tap to speak");
  const [aiText, setAiText] = useState("");
  const [transcript, setTranscript] = useState("");

  const phaseRef = useRef<VoicePhase>("idle");
  const convIdRef = useRef<string | null>(conversationId);
  const isMountedRef = useRef(true);
  const systemContextRef = useRef(systemContext);
  systemContextRef.current = systemContext;

  // Volume refs polled by the Orb's WebGL frame loop
  const inputVolumeRef = useRef(0);
  const outputVolumeRef = useRef(0);

  // Mic amplitude tracking
  const micCtxRef = useRef<AudioContext | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRafRef = useRef<number | null>(null);

  // Speaker Web Audio
  const speakerCtxRef = useRef<AudioContext | null>(null);
  const speakerSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speakerRafRef = useRef<number | null>(null);

  const ensureSpeakerCtx = useCallback(() => {
    if (!speakerCtxRef.current || speakerCtxRef.current.state === "closed") {
      speakerCtxRef.current = new AudioContext();
    } else if (speakerCtxRef.current.state === "suspended") {
      speakerCtxRef.current.resume();
    }
  }, []);

  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessageRef = useRef<(text: string) => Promise<void>>(() => Promise.resolve());
  const startListeningRef = useRef<() => void>(() => {});

  useEffect(() => { convIdRef.current = conversationId; }, [conversationId]);

  const setPhaseSync = useCallback((p: VoicePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // ── Mic amplitude → inputVolumeRef ──────────────────────────
  const stopMicAmplitude = useCallback(() => {
    if (micRafRef.current) { cancelAnimationFrame(micRafRef.current); micRafRef.current = null; }
    try { micCtxRef.current?.close(); } catch { /* ignore */ }
    micCtxRef.current = null;
    micAnalyserRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    inputVolumeRef.current = 0;
  }, []);

  const startMicAmplitude = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!isMountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      micCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      micAnalyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!micAnalyserRef.current || !isMountedRef.current) return;
        micAnalyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 128;
        inputVolumeRef.current = Math.min(avg, 1);
        micRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Mic permission denied — orb still animates in auto mode
    }
  }, []);

  // ── Speaker → outputVolumeRef ────────────────────────────────
  const stopSpeaker = useCallback(() => {
    try { speakerSourceRef.current?.stop(); } catch { /* ignore */ }
    speakerSourceRef.current = null;
    if (speakerRafRef.current) { cancelAnimationFrame(speakerRafRef.current); speakerRafRef.current = null; }
    outputVolumeRef.current = 0;
  }, []);

  // ── TTS via ElevenLabs API, amplitude via Web Audio ─────────
  const speak = useCallback(async (text: string, onEnd: () => void) => {
    stopSpeaker();

    const tryElevenLabs = async (): Promise<boolean> => {
      const res = await fetch("/api/ai/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abortRef.current?.signal,
      });
      if (!res.ok) return false;

      const arrayBuffer = await res.arrayBuffer();
      if (!isMountedRef.current) return true;

      const ctx = speakerCtxRef.current;
      if (!ctx || ctx.state === "closed") return false;
      if (ctx.state === "suspended") await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      if (!isMountedRef.current) return true;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;

      const source = ctx.createBufferSource();
      speakerSourceRef.current = source;
      source.buffer = audioBuffer;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!isMountedRef.current) return;
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 128;
        outputVolumeRef.current = Math.min(avg * 2.2, 1);
        speakerRafRef.current = requestAnimationFrame(tick);
      };
      tick();

      source.start();
      source.onended = () => {
        if (speakerRafRef.current) { cancelAnimationFrame(speakerRafRef.current); speakerRafRef.current = null; }
        speakerSourceRef.current = null;
        outputVolumeRef.current = 0;
        if (isMountedRef.current) onEnd();
      };
      return true;
    };

    const fallback = (onEnd: () => void) => {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[#*`_~>]/g, "").trim();
      if (!clean) { onEnd(); return; }
      const utter = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();
      const best =
        voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("google")) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        null;
      if (best) utter.voice = best;
      utter.rate = 1.05;
      utter.onend = onEnd;
      utter.onerror = onEnd;
      window.speechSynthesis.speak(utter);
    };

    try {
      const ok = await tryElevenLabs();
      if (!ok) fallback(onEnd);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      fallback(onEnd);
    }
  }, [stopSpeaker]);

  // ── AI call ──────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    setPhaseSync("thinking");
    setStatusText("Thinking…");
    setAiText("");

    let convId = convIdRef.current;
    if (!convId) {
      convId = await onCreateConversation();
      if (!convId) { setPhaseSync("idle"); setStatusText("Tap to speak"); return; }
      convIdRef.current = convId;
    }

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          userMessage: text,
          systemContext: systemContextRef.current,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("AI error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const { text: t, error: e } = JSON.parse(payload) as { text?: string; error?: string };
            if (e) throw new Error(e);
            if (t) { full += t; if (isMountedRef.current) setAiText(full); }
          } catch { /* skip malformed chunk */ }
        }
      }

      if (!isMountedRef.current) return;
      onExchange(convId);

      if (full) {
        setPhaseSync("speaking");
        setStatusText("Speaking…");
        await speak(full, () => {
          if (!isMountedRef.current) return;
          if (phaseRef.current === "speaking") {
            setAiText("");
            setTranscript("");
            startListeningRef.current();
          }
        });
      } else {
        setPhaseSync("idle");
        setStatusText("Tap to speak");
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err instanceof Error && err.name === "AbortError") return;
      setPhaseSync("idle");
      setStatusText("Error — tap to try again");
    }
  }, [onCreateConversation, speak, onExchange, setPhaseSync]);

  // ── Speech recognition ───────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isMountedRef.current) return;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { setStatusText("Speech recognition not supported"); return; }

    window.speechSynthesis.cancel();
    const rec = new SR();
    recognitionRef.current = rec;
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = async () => {
      setPhaseSync("listening");
      setStatusText("Listening…");
      await startMicAmplitude();
    };

    rec.onresult = (event: any) => {
      const text = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(text);
      if ((event.results[event.results.length - 1] as any).isFinal && text.trim()) {
        stopMicAmplitude();
        recognitionRef.current = null;
        sendMessageRef.current(text.trim());
      }
    };

    rec.onend = () => {
      stopMicAmplitude();
      if (phaseRef.current === "listening" && isMountedRef.current) {
        setPhaseSync("idle");
        setStatusText("Tap to speak");
        setTranscript("");
      }
    };

    rec.onerror = () => {
      stopMicAmplitude();
      if (isMountedRef.current) { setPhaseSync("idle"); setStatusText("Tap to speak"); }
    };

    rec.start();
  }, [setPhaseSync, startMicAmplitude, stopMicAmplitude]);

  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
      abortRef.current?.abort();
      stopMicAmplitude();
      stopSpeaker();
      try { speakerCtxRef.current?.close(); } catch { /* ignore */ }
      speakerCtxRef.current = null;
    };
  }, [stopMicAmplitude, stopSpeaker]);

  // ── Orb tap ──────────────────────────────────────────────────
  const handleOrbTap = () => {
    ensureSpeakerCtx();

    if (phase === "idle") {
      startListening();
    } else if (phase === "listening") {
      recognitionRef.current?.stop();
      stopMicAmplitude();
      setPhaseSync("idle");
      setStatusText("Tap to speak");
      setTranscript("");
    } else if (phase === "speaking") {
      stopSpeaker();
      window.speechSynthesis.cancel();
      setAiText("");
      startListening();
    } else if (phase === "thinking") {
      abortRef.current?.abort();
      setPhaseSync("idle");
      setStatusText("Tap to speak");
    }
  };

  // Map our phases to ElevenLabs Orb agentState
  const orbState: OrbAgentState =
    phase === "idle" ? null
    : phase === "listening" ? "listening"
    : phase === "thinking" ? "thinking"
    : "talking"; // speaking → "talking"

  return (
    <div className="flex flex-1 flex-col items-center justify-center relative overflow-hidden bg-background">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background:
            phase === "listening"
              ? "radial-gradient(ellipse at center, #05966918 0%, transparent 65%)"
              : phase === "speaking"
              ? "radial-gradient(ellipse at center, #7c3aed18 0%, transparent 65%)"
              : phase === "thinking"
              ? "radial-gradient(ellipse at center, #a21caf14 0%, transparent 65%)"
              : "radial-gradient(ellipse at center, #4f46e510 0%, transparent 65%)",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="size-3.5" />
          Text mode
        </button>
        <button onClick={onExit} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="size-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-5 px-8 max-w-sm w-full">
        {/* Title */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="size-4 text-violet-500" />
          <span className="text-sm font-medium">Lunari AI</span>
        </div>

        {/* ElevenLabs Orb — the main interactive element */}
        <button
          onClick={handleOrbTap}
          className="outline-none focus:outline-none select-none"
          aria-label={phase === "idle" ? "Start speaking" : phase === "listening" ? "Stop listening" : "Interrupt"}
        >
          <Orb
            agentState={orbState}
            volumeMode="manual"
            inputVolumeRef={inputVolumeRef}
            outputVolumeRef={outputVolumeRef}
            colors={["#7c3aed", "#c084fc"]}
            className="size-52 cursor-pointer"
          />
        </button>

        {/* Status */}
        <div className="h-5 flex items-center justify-center">
          {phase === "thinking" ? (
            <ShimmeringText
              text="Thinking…"
              className="text-sm font-medium"
              duration={1.8}
              color="#94a3b8"
              shimmerColor="#6d28d9"
            />
          ) : (
            <p className="text-sm font-medium text-muted-foreground transition-all duration-300">
              {statusText}
            </p>
          )}
        </div>

        {/* What user said */}
        {transcript && phase !== "speaking" && (
          <p className="text-sm text-center text-foreground/55 italic">
            &ldquo;{transcript}&rdquo;
          </p>
        )}

        {/* What AI said */}
        {aiText && (
          <p className="text-sm text-center text-foreground/75 leading-relaxed line-clamp-4 max-w-[280px]">
            {aiText}
          </p>
        )}
      </div>

      {/* Contextual hint */}
      <div className="absolute bottom-8 text-xs text-muted-foreground/50 transition-all duration-300">
        {phase === "idle" && "Tap orb to speak"}
        {phase === "listening" && "Tap orb to stop"}
        {phase === "speaking" && "Tap orb to interrupt"}
      </div>
    </div>
  );
}
