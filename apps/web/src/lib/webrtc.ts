"use client";
import { create } from "zustand";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

export type CallState =
  | { status: "idle" }
  | { status: "calling"; peerId: string; peerName: string }
  | { status: "incoming"; peerId: string; peerName: string }
  | { status: "active"; peerId: string; peerName: string; muted: boolean }
  | { status: "ended"; reason?: string };

// module-level singletons — shared across all components
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;
let ringtone: { stop: () => void } | null = null;

type Store = {
  state: CallState;
  setState: (s: CallState) => void;
};

export const useCallStore = create<Store>((set) => ({
  state: { status: "idle" },
  setState: (s) => set({ state: s }),
}));

function ensureAudioEl() {
  if (typeof window === "undefined") return null;
  if (!remoteAudioEl) {
    remoteAudioEl = document.createElement("audio");
    remoteAudioEl.autoplay = true;
    document.body.appendChild(remoteAudioEl);
  }
  return remoteAudioEl;
}

function playRingtone(kind: "incoming" | "outgoing") {
  stopRingtone();
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    gain.connect(ctx.destination);
    let stopped = false;
    const beep = (freq: number, dur: number, delay: number) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.type = "sine";
      osc.connect(gain);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + dur);
    };
    const loop = () => {
      if (stopped) return;
      if (kind === "incoming") {
        beep(880, 0.4, 0);
        beep(660, 0.4, 0.5);
      } else {
        beep(440, 0.6, 0);
      }
      setTimeout(loop, kind === "incoming" ? 2000 : 2500);
    };
    loop();
    ringtone = { stop: () => { stopped = true; try { ctx.close(); } catch {} } };
  } catch {}
}

function stopRingtone() {
  ringtone?.stop();
  ringtone = null;
}

function cleanup() {
  stopRingtone();
  if (pc) { try { pc.close(); } catch {} pc = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  if (remoteAudioEl) remoteAudioEl.srcObject = null;
}

async function createPC(peerId: string, ws: WebSocket, setState: (s: CallState) => void) {
  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  localStream = stream;
  stream.getTracks().forEach((t) => pc!.addTrack(t, stream));

  pc.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "call.ice", to: peerId, candidate: e.candidate }));
    }
  };

  pc.ontrack = (e) => {
    const el = ensureAudioEl();
    if (el) { el.srcObject = e.streams[0]; el.play().catch(() => {}); }
  };

  pc.onconnectionstatechange = () => {
    if (!pc) return;
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      cleanup();
      setState({ status: "ended", reason: "Connection lost" });
      setTimeout(() => setState({ status: "idle" }), 2000);
    }
  };

  return pc;
}

export const callActions = {
  startCall: async (peerId: string, peerName: string, ws: WebSocket | null, myName: string) => {
    if (!ws) return;
    const setState = useCallStore.getState().setState;
    try {
      setState({ status: "calling", peerId, peerName });
      playRingtone("outgoing");
      const conn = await createPC(peerId, ws, setState);
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "call.offer", to: peerId, sdp: offer, peerName: myName }));
    } catch (e) {
      cleanup();
      setState({ status: "ended", reason: "Mic permission denied" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  },

  acceptCall: async (ws: WebSocket | null) => {
    const { state, setState } = useCallStore.getState();
    if (state.status !== "incoming" || !ws) return;
    const offer = (window as any).__pendingOffer;
    if (!offer) return;
    try {
      stopRingtone();
      const conn = await createPC(state.peerId, ws, setState);
      await conn.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "call.answer", to: state.peerId, sdp: answer }));
      const queued = (window as any).__pendingCandidates || [];
      for (const c of queued) { try { await conn.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      (window as any).__pendingCandidates = [];
      (window as any).__pendingOffer = null;
      setState({ status: "active", peerId: state.peerId, peerName: state.peerName, muted: false });
    } catch {
      cleanup();
      setState({ status: "ended", reason: "Could not connect" });
      setTimeout(() => setState({ status: "idle" }), 2000);
    }
  },

  declineCall: (ws: WebSocket | null) => {
    const { state, setState } = useCallStore.getState();
    if (state.status === "incoming" && ws) ws.send(JSON.stringify({ type: "call.decline", to: state.peerId }));
    cleanup();
    setState({ status: "idle" });
  },

  endCall: (ws: WebSocket | null) => {
    const { state, setState } = useCallStore.getState();
    if ((state.status === "active" || state.status === "calling") && ws) {
      ws.send(JSON.stringify({ type: "call.end", to: state.peerId }));
    }
    cleanup();
    setState({ status: "ended", reason: "Call ended" });
    setTimeout(() => setState({ status: "idle" }), 1500);
  },

  toggleMute: () => {
    const { state, setState } = useCallStore.getState();
    if (state.status !== "active" || !localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setState({ ...state, muted: !track.enabled });
    }
  },

  handleWsMessage: async (msg: any, ws: WebSocket) => {
    const { state, setState } = useCallStore.getState();
    if (msg.type === "call.offer") {
      if (state.status !== "idle") {
        ws.send(JSON.stringify({ type: "call.decline", to: msg.from }));
        return;
      }
      (window as any).__pendingOffer = msg.sdp;
      (window as any).__pendingCandidates = [];
      setState({ status: "incoming", peerId: msg.from, peerName: msg.peerName || "Someone" });
      playRingtone("incoming");
    }
    else if (msg.type === "call.answer") {
      if (!pc) return;
      stopRingtone();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const queued = (window as any).__pendingCandidates || [];
        for (const c of queued) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
        (window as any).__pendingCandidates = [];
      } catch {}
      setState((s: CallState) => s.status === "calling" ? { status: "active", peerId: s.peerId, peerName: s.peerName, muted: false } : s);
    }
    else if (msg.type === "call.ice") {
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else {
        const arr = (window as any).__pendingCandidates || [];
        arr.push(msg.candidate);
        (window as any).__pendingCandidates = arr;
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
  },
};
