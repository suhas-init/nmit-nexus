"use client";
import { Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { sharedWsRef } from "@/lib/ws";
import { callActions, useCallStore } from "@/lib/webrtc";

export function CallButton({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { user } = useAuth();
  const status = useCallStore((s) => s.state.status);

  if (!user || user.id === peerId) return null;

  const onClick = () => {
    console.log("[call] click, status:", status, "wsState:", sharedWsRef.current?.readyState);

    // Force-reset any stuck state before starting fresh
    if (status !== "idle") {
      console.log("[call] stuck state — force resetting");
      callActions.endCall(sharedWsRef.current);
      setTimeout(() => {
        callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
      }, 300);
      return;
    }

    if (!sharedWsRef.current || sharedWsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[call] WS not open — waiting and retrying");
      // Wait briefly for reconnect
      setTimeout(() => {
        if (sharedWsRef.current?.readyState === WebSocket.OPEN) {
          callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
        } else {
          alert("Connection lost — please refresh the page");
        }
      }, 800);
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
