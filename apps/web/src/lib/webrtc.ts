"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallState =
  | { status: "idle" }
  | { status: "calling"; peerId: string; peerName: string }
  | { status: "incoming"; peerId: string; peerName: string }
  | { status: "active"; peerId: string; peerName: string; muted: boolean }
  | { status: "ended"; reason?: string };

type WsMessage = {
  type: string;
  to?: string;
  from?: string;
  sdp?: any;
  candidate?: any;
  peerName?: string;
};

export function useWebRTC(wsRef: React.MutableRefObject<WebSocket | null>, myName: string) {
  const [state, setState] = useState<CallState>({ status: "idle" });
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingOfferRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<any[]>([]);

  // Create hidden audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!remoteAudioRef.current) {
      const el = document.createElement("audio");
      el.autoplay = true;
      remoteAudioRef.current = el;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach((t) => t.stop()); localStreamRef.current = null; }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    pendingOfferRef.current = null;
    pendingCandidatesRef.current = [];
  }, []);

  const createPC = useCallback(async (peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "call.ice",
          to: peerId,
          candidate: e.candidate,
        }));
      }
    };

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        cleanup();
        setState({ status: "ended", reason: "Connection lost" });
        setTimeout(() => setState({ status: "idle" }), 2000);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [wsRef, cleanup]);

  const startCall = useCallback(async (peerId: string, peerName: string) => {
    try {
      setState({ status: "calling", peerId, peerName });
      const pc = await createPC(peerId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      wsRef.current?.send(JSON.stringify({
        type: "call.offer",
        to: peerId,
        sdp: offer,
        peerName: myName,
      }));
    } catch (err) {
      cleanup();
      setState({ status: "ended", reason: "Mic permission denied" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  }, [createPC, wsRef, myName, cleanup]);

  const acceptCall = useCallback(async () => {
    if (state.status !== "incoming" || !pendingOfferRef.current) return;
    try {
      const { peerId, peerName } = state;
      const pc = await createPC(peerId);
      await pc.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      wsRef.current?.send(JSON.stringify({
        type: "call.answer",
        to: peerId,
        sdp: answer,
      }));
      // flush queued ICE
      for (const c of pendingCandidatesRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCandidatesRef.current = [];
      pendingOfferRef.current = null;
      setState({ status: "active", peerId, peerName, muted: false });
    } catch (err) {
      cleanup();
      setState({ status: "ended", reason: "Could not connect" });
      setTimeout(() => setState({ status: "idle" }), 2000);
    }
  }, [state, createPC, wsRef, cleanup]);

  const declineCall = useCallback(() => {
    if (state.status === "incoming") {
      wsRef.current?.send(JSON.stringify({ type: "call.decline", to: state.peerId }));
    }
    cleanup();
    setState({ status: "idle" });
  }, [state, wsRef, cleanup]);

  const endCall = useCallback(() => {
    if (state.status === "active" || state.status === "calling") {
      wsRef.current?.send(JSON.stringify({ type: "call.end", to: state.peerId }));
    }
    cleanup();
    setState({ status: "ended", reason: "Call ended" });
    setTimeout(() => setState({ status: "idle" }), 1500);
  }, [state, wsRef, cleanup]);

  const toggleMute = useCallback(() => {
    if (state.status !== "active") return;
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setState({ ...state, muted: !track.enabled });
    }
  }, [state]);

  // Handle incoming WS messages
  useEffect(() => {
    const handler = async (e: MessageEvent) => {
      let msg: WsMessage;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === "call.offer") {
        if (state.status !== "idle") {
          // busy — auto-decline
          wsRef.current?.send(JSON.stringify({ type: "call.decline", to: msg.from }));
          return;
        }
        pendingOfferRef.current = msg.sdp;
        setState({ status: "incoming", peerId: msg.from!, peerName: msg.peerName || "Someone" });
      }
      else if (msg.type === "call.answer") {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        for (const c of pendingCandidatesRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidatesRef.current = [];
        setState((s) => s.status === "calling" ? { status: "active", peerId: s.peerId, peerName: s.peerName, muted: false } : s);
      }
      else if (msg.type === "call.ice") {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
          try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
        } else {
          pendingCandidatesRef.current.push(msg.candidate);
        }
      }
      else if (msg.type === "call.decline") {
        cleanup();
        setState({ status: "ended", reason: "Call declined" });
        setTimeout(() => setState({ status: "idle" }), 2000);
      }
      else if (msg.type === "call.end") {
        cleanup();
        setState({ status: "ended", reason: "Call ended" });
        setTimeout(() => setState({ status: "idle" }), 1500);
      }
    };

    const ws = wsRef.current;
    if (!ws) return;
    const bound = (ev: MessageEvent) => handler(ev);
    ws.addEventListener("message", bound);
    return () => ws.removeEventListener("message", bound);
  }, [wsRef, state.status, cleanup]);

  return { state, startCall, acceptCall, declineCall, endCall, toggleMute };
}
