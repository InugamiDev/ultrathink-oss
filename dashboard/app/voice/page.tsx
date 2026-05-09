"use client";

import { useState, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import { Mic, Loader2, AlertCircle } from "lucide-react";
import type { AgoraTokenData, ClientStartRequest, AgentResponse } from "@/lib/agora/types";

/* ─── Dynamic imports (no SSR — Agora uses WebRTC/window) ─────────── */

const AgoraProvider = dynamic(
  async () => {
    const { AgoraRTCProvider, default: AgoraRTC } = await import("agora-rtc-react");
    return {
      default: ({ children }: { children: React.ReactNode }) => {
        const client = useMemo(() => AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }), []);
        return <AgoraRTCProvider client={client}>{children}</AgoraRTCProvider>;
      },
    };
  },
  { ssr: false }
);

const VoiceChat = dynamic(() => import("@/components/voice/voice-chat"), {
  ssr: false,
});

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function VoicePage() {
  const [phase, setPhase] = useState<"idle" | "connecting" | "active">("idle");
  const [error, setError] = useState<string | null>(null);
  const [agoraData, setAgoraData] = useState<AgoraTokenData | null>(null);

  const startConversation = async () => {
    setPhase("connecting");
    setError(null);

    try {
      // Step 1: Get RTC token
      const tokenRes = await fetch("/api/agora/token");
      if (!tokenRes.ok) {
        const err = await tokenRes.json();
        throw new Error(err.error || "Failed to generate token");
      }
      const tokenData: AgoraTokenData = await tokenRes.json();

      // Step 2: Start AI agent
      const startReq: ClientStartRequest = {
        requester_id: tokenData.uid,
        channel_name: tokenData.channel,
        input_modalities: ["text"],
        output_modalities: ["text", "audio"],
      };

      const agentRes = await fetch("/api/agora/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startReq),
      });

      if (!agentRes.ok) {
        const err = await agentRes.json();
        throw new Error(err.error || "Failed to start AI agent");
      }

      const agentData: AgentResponse = await agentRes.json();
      setAgoraData({ ...tokenData, agentId: agentData.agent_id });
      setPhase("active");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
      setPhase("idle");
    }
  };

  const handleTokenRefresh = async (uid: string): Promise<string> => {
    const res = await fetch(`/api/agora/token?channel=${agoraData?.channel}&uid=${uid}`);
    const data = await res.json();
    if (!res.ok) throw new Error("Token refresh failed");
    return data.token;
  };

  const handleEnd = () => {
    setAgoraData(null);
    setPhase("idle");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">Voice AI</h1>
        <p className="text-sm text-[var(--color-text-dim)] mt-1">
          Real-time voice conversation powered by Agora Conversational AI Engine
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        {phase === "idle" && (
          <div className="text-center space-y-6 max-w-md">
            {/* Mic orb */}
            <button
              onClick={startConversation}
              className="mx-auto w-28 h-28 rounded-full bg-[var(--color-accent)]/10 border-2 border-[var(--color-accent)]/30 flex items-center justify-center hover:bg-[var(--color-accent)]/20 hover:border-[var(--color-accent)]/50 hover:scale-105 transition-all group"
            >
              <Mic className="w-10 h-10 text-[var(--color-accent)] group-hover:scale-110 transition-transform" />
            </button>

            <div>
              <p className="text-lg font-medium text-[var(--color-text)]">Tap to start a voice conversation</p>
              <p className="text-sm text-[var(--color-text-dim)] mt-1">
                Speak naturally — the AI will listen, think, and respond in real time.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { label: "Voice-to-Voice", color: "var(--color-accent)" },
                { label: "~650ms Latency", color: "#22d3ee" },
                { label: "Interrupt Anytime", color: "#a78bfa" },
                { label: "Groq LPU", color: "#4ade80" },
              ].map((f) => (
                <span
                  key={f.label}
                  className="px-2.5 py-1 text-xs rounded-full border font-medium"
                  style={{
                    color: f.color,
                    borderColor: `color-mix(in srgb, ${f.color} 30%, transparent)`,
                    backgroundColor: `color-mix(in srgb, ${f.color} 8%, transparent)`,
                  }}
                >
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {phase === "connecting" && (
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-[var(--color-accent)] animate-spin" />
            <p className="text-[var(--color-text-dim)]">Setting up voice channel...</p>
          </div>
        )}

        {phase === "active" && agoraData && (
          <Suspense
            fallback={
              <div className="text-center">
                <Loader2 className="w-8 h-8 mx-auto text-[var(--color-accent)] animate-spin" />
              </div>
            }
          >
            <AgoraProvider>
              <VoiceChat agoraData={agoraData} onTokenWillExpire={handleTokenRefresh} onEndConversation={handleEnd} />
            </AgoraProvider>
          </Suspense>
        )}
      </div>
    </div>
  );
}
