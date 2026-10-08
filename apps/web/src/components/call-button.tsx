"use client";
import { Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { sharedWsRef } from "@/lib/ws";
import { callActions, useCallStore } from "@/lib/webrtc";
import { useToasts } from "@/store/toasts";

export function CallButton({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { user } = useAuth();
  const status = useCallStore((s) => s.state.status);
  const push = useToasts((s) => s.push);

  if (!user || user.id === peerId) return null;

  const onClick = async () => {
    if (status !== "idle") {
      callActions.endCall(sharedWsRef.current);
      setTimeout(() => callActions.startCall(peerId, peerName, sharedWsRef.current, user.name), 300);
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        push({ title: "Voice not supported", body: "This browser can't access the microphone." });
        return;
      }
      const perm = await navigator.permissions?.query({ name: "microphone" as any }).catch(() => null);
      if (perm?.state === "denied") {
        push({ title: "Microphone blocked", body: "Allow mic access in your browser settings and refresh." });
        return;
      }
    } catch {}

    if (!sharedWsRef.current || sharedWsRef.current.readyState !== WebSocket.OPEN) {
      push({ title: "Reconnecting…", body: "Try again in a moment." });
      return;
    }

    callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
  };

  return (
    <button
      onClick={onClick}
      className="call-btn"
      style={{ opacity: status !== "idle" ? 0.7 : 1 }}
      title="Start peer-to-peer voice call"
    >
      <Phone size={14} />
      <span>Voice call</span>
    </button>
  );
}
