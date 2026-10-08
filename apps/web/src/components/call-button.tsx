"use client";
import { Phone } from "lucide-react";
import { useAuth } from "@/store/auth";
import { sharedWsRef } from "@/lib/ws";
import { useWebRTC } from "@/lib/webrtc";

export function CallButton({ peerId, peerName }: { peerId: string; peerName: string }) {
  const { user } = useAuth();
  const { state, startCall } = useWebRTC(sharedWsRef, user?.name || "Someone");

  if (!user) return null;
  if (user.id === peerId) return null;

  return (
    <button
      className="btn btn-outline"
      onClick={() => {
        if (state.status !== "idle") return;
        startCall(peerId, peerName);
      }}
      style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}
      title="Voice call (peer-to-peer, no number shared)"
    >
      <Phone size={13} /> Call
    </button>
  );
}
