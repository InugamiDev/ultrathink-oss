"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useRTCClient,
  useLocalMicrophoneTrack,
  useRemoteUsers,
  useClientEvent,
  useIsConnected,
  useJoin,
  usePublish,
  RemoteUser,
} from "agora-rtc-react";
import type { AgoraTokenData, StopConversationRequest } from "@/lib/agora/types";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";

interface VoiceChatProps {
  agoraData: AgoraTokenData;
  onTokenWillExpire: (uid: string) => Promise<string>;
  onEndConversation: () => void;
}

export default function VoiceChat({ agoraData, onTokenWillExpire, onEndConversation }: VoiceChatProps) {
  const client = useRTCClient();
  const isConnected = useIsConnected();
  const agentUID = process.env.NEXT_PUBLIC_AGORA_AGENT_UID || "333";

  const [micEnabled, setMicEnabled] = useState(true);
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micEnabled);
  const remoteUsers = useRemoteUsers();

  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Join the channel
  useJoin(
    {
      appid: process.env.NEXT_PUBLIC_AGORA_APP_ID!,
      channel: agoraData.channel,
      token: agoraData.token,
      uid: parseInt(agoraData.uid, 10),
    },
    true
  );

  usePublish([localMicrophoneTrack]);

  // Track agent join/leave
  useClientEvent(client, "user-joined", (user) => {
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(true);
      setIsConnecting(false);
    }
  });

  useClientEvent(client, "user-left", (user) => {
    if (user.uid.toString() === agentUID) {
      setIsAgentConnected(false);
    }
  });

  // Sync agent status with remote users list
  useEffect(() => {
    setIsAgentConnected(remoteUsers.some((u) => u.uid.toString() === agentUID));
  }, [remoteUsers, agentUID]);

  // Elapsed timer
  useEffect(() => {
    if (isAgentConnected) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((t) => t + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAgentConnected]);

  // Token renewal
  const handleTokenRenew = useCallback(async () => {
    if (!client?.uid) return;
    try {
      const newToken = await onTokenWillExpire(client.uid.toString());
      await client.renewToken(newToken);
    } catch (err) {
      console.error("Token renewal failed:", err);
    }
  }, [client, onTokenWillExpire]);

  useClientEvent(client, "token-privilege-will-expire", handleTokenRenew);

  // Cleanup
  useEffect(() => {
    return () => {
      client?.leave();
    };
  }, [client]);

  // Mic toggle
  const toggleMic = async () => {
    if (localMicrophoneTrack) {
      const next = !micEnabled;
      await localMicrophoneTrack.setEnabled(next);
      setMicEnabled(next);
    }
  };

  // Stop agent
  const handleStop = async () => {
    if (!agoraData.agentId) return;
    try {
      const req: StopConversationRequest = { agent_id: agoraData.agentId };
      await fetch("/api/agora/agent/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
    } catch (err) {
      console.error("Stop agent error:", err);
    }
    onEndConversation();
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Status orb */}
      <div className="relative flex items-center justify-center">
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
            isAgentConnected
              ? "bg-[var(--color-accent)]/20 shadow-[0_0_40px_var(--color-accent)]"
              : isConnected
                ? "bg-[var(--color-surface-2)] animate-pulse"
                : "bg-[var(--color-surface-2)]"
          }`}
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
              isAgentConnected ? "bg-[var(--color-accent)]/40" : "bg-[var(--color-surface)]"
            }`}
          >
            {isAgentConnected ? (
              <AudioBars />
            ) : isConnecting ? (
              <Loader2 className="w-8 h-8 text-[var(--color-text-dim)] animate-spin" />
            ) : (
              <div className="w-3 h-3 rounded-full bg-[var(--color-text-dim)]" />
            )}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="text-lg font-medium text-[var(--color-text)]">
          {isAgentConnected
            ? "AI is listening"
            : isConnecting
              ? "Connecting agent..."
              : isConnected
                ? "Waiting for agent..."
                : "Connecting to channel..."}
        </p>
        {isAgentConnected && (
          <p className="text-sm text-[var(--color-text-dim)] mt-1 font-mono">{formatTime(elapsed)}</p>
        )}
      </div>

      {/* Remote audio (hidden — plays through speakers) */}
      <div className="hidden">
        {remoteUsers.map((user) => (
          <RemoteUser key={user.uid} user={user} />
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            micEnabled
              ? "bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
              : "bg-red-500/20 border border-red-500/40 text-red-400"
          }`}
          title={micEnabled ? "Mute" : "Unmute"}
        >
          {micEnabled ? <Mic className="w-5 h-5 text-[var(--color-text)]" /> : <MicOff className="w-5 h-5" />}
        </button>

        <button
          onClick={handleStop}
          className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center hover:bg-red-500/30 transition-all text-red-400"
          title="End conversation"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

/** Animated bars for active voice */
function AudioBars() {
  return (
    <div className="flex items-center gap-1 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 rounded-full bg-[var(--color-accent)] animate-voice-bar"
          style={{
            animationDelay: `${i * 120}ms`,
            height: "4px",
          }}
        />
      ))}
    </div>
  );
}
