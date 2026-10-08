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
    console.log("[call] click", { status, ws: sharedWsRef.current?.readyState });

    // 1. Mic permission pre-check — surface blocked state clearly
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        push({ title: "Voice calls not supported", body: "Your browser doesn't support microphones." });
        return;
      }
      const perm = await navigator.permissions?.query({ name: "microphone" as any }).catch(() => null);
      console.log("[call] mic permission:", perm?.state);
      if (perm?.state === "denied") {
        push({
          title: "Microphone blocked",
          body: "Click the lock icon in your browser's address bar → Site settings → allow Microphone → refresh.",
        });
        return;
      }
    } catch (e) {
      console.warn("[call] permission query failed (non-blocking):", e);
    }

    // 2. Ensure WS is open
    if (!sharedWsRef.current || sharedWsRef.current.readyState !== WebSocket.OPEN) {
      push({ title: "Connecting…", body: "Retrying in a moment." });
      setTimeout(() => {
        if (sharedWsRef.current?.readyState === WebSocket.OPEN) {
          callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
        } else {
          push({ title: "Connection lost", body: "Please refresh the page." });
        }
      }, 800);
      return;
    }

    // 3. Force reset any stuck state
    if (status !== "idle") {
      callActions.endCall(sharedWsRef.current);
      setTimeout(() => {
        callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
      }, 350);
      return;
    }

    callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
  };

  return (
    <button
      className="btn btn-outline"
      onClick={onClick}
      style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem", opacity: status !== "idle" ? 0.7 : 1 }}
      title="Voice call"
    >
      <Phone size={13} /> Call
    </button>
  );
}
