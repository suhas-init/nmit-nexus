"use client";
import { useWebRTC } from "@/lib/webrtc";
import { sharedWsRef } from "@/lib/ws";
import { useAuth } from "@/store/auth";
import { Phone, PhoneOff, Mic, MicOff, PhoneIncoming } from "lucide-react";

export function CallUI() {
  const { user } = useAuth();
  const { state, acceptCall, declineCall, endCall, toggleMute } = useWebRTC(sharedWsRef, user?.name || "Someone");

  if (state.status === "idle") return null;

  const isRinging = state.status === "incoming";
  const isCalling = state.status === "calling";
  const isActive = state.status === "active";
  const isEnded = state.status === "ended";

  const peerName = "peerName" in state ? state.peerName : "";

  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 500, animation: "callSlide 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)",
    }}>
      <style>{`
        @keyframes callSlide { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes callPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.55); } 50% { box-shadow: 0 0 0 12px rgba(74, 222, 128, 0); } }
      `}</style>

      <div className="card" style={{
        padding: "0.85rem 1rem",
        display: "flex", alignItems: "center", gap: "0.85rem",
        background: "var(--bg-1)",
        border: "1px solid var(--border-1)",
        boxShadow: "0 20px 60px -12px rgba(0,0,0,0.6)",
        minWidth: 320,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: isEnded ? "var(--bg-3)" : isRinging ? "var(--green)" : "var(--accent)",
          color: isEnded ? "var(--text-2)" : "#08090B",
          display: "grid", placeItems: "center", flexShrink: 0,
          animation: isRinging ? "callPulse 1.4s infinite" : "none",
        }}>
          {isEnded ? <PhoneOff size={18} /> : isRinging ? <PhoneIncoming size={18} /> : <Phone size={18} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ fontSize: "0.66rem", color: "var(--text-2)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.15rem" }}>
            {isRinging ? "INCOMING_CALL" : isCalling ? "CALLING" : isActive ? "IN_CALL" : "ENDED"}
          </div>
          <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--text-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {peerName}
          </div>
          {isEnded && "reason" in state && state.reason && (
            <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", marginTop: "0.1rem" }}>{state.reason}</div>
          )}
        </div>

        {isRinging && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="btn btn-primary" onClick={acceptCall} style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}>
              Accept
            </button>
            <button className="btn btn-outline" onClick={declineCall} style={{ padding: "0.5rem 0.75rem" }}>
              <PhoneOff size={14} />
            </button>
          </div>
        )}

        {isCalling && (
          <button className="btn btn-outline" onClick={endCall} style={{ padding: "0.5rem 0.75rem" }}>
            <PhoneOff size={14} />
          </button>
        )}

        {isActive && (
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button className="btn btn-outline" onClick={toggleMute} style={{ padding: "0.5rem 0.75rem" }}>
              {state.muted ? <MicOff size={14} /> : <Mic size={14} />}
            </button>
            <button className="btn btn-outline" onClick={endCall} style={{ padding: "0.5rem 0.75rem", borderColor: "var(--red)", color: "var(--red)" }}>
              <PhoneOff size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
