"use client";
import { Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { sharedWsRef } from "@/lib/ws";
import { callActions, useCallStore } from "@/lib/webrtc";

export function CallButton({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { user } = useAuth();
  const status = useCallStore((s) => s.state.status);

  if (!user || user.id === peerId) return null;

  return (
    <button
      className="btn btn-outline"
      onClick={() => {
        if (status !== "idle") return;
        callActions.startCall(peerId, peerName, sharedWsRef.current, user.name);
      }}
      disabled={status !== "idle"}
      style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}
      title="Voice call"
    >
      <Phone size={13} /> Call
    </button>
  );
}
