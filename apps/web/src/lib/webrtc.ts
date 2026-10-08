"use client";
import { create } from "zustand";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free public TURN — required for cross-network (mobile data, different WiFi)
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

export type CallState =
  | { status: "idle" }
  | { status: "calling"; peerId: string; peerName: string }
  | { status: "incoming"; peerId: string; peerName: string }
  | { status: "active"; peerId: string; peerName: string; muted: boolean }
  | { status: "ended"; reason?: string };

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;
let ringtone: { stop: () => void } | null = null;
let ringTimeout: any = null;
let pendingOffer: any = null;
let pendingCandidates: any[] = [];

type Store = { state: CallState; setState: (s: CallState) => void };
export const useCallStore = create<Store>((set) => ({
  state: { status: "idle" },
  setState: (s) => set({ state: s }),
}));

const setState = (s: CallState) => useCallStore.getState().setState(s);

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
      if (kind === "incoming") { beep(880, 0.4, 0); beep(660, 0.4, 0.5); }
      else { beep(440, 0.6, 0); }
      setTimeout(loop, kind === "incoming" ? 2000 : 2500);
    };
    loop();
    ringtone = { stop: () => { stopped = true; try { ctx.close(); } catch {} } };
  } catch {}
}
function stopRingtone() { ringtone?.stop(); ringtone = null; }

function clearRingTimeout() { if (ringTimeout) { clearTimeout(ringTimeout); ringTimeout = null; } }

function cleanup() {
  stopRingtone();
  clearRingTimeout();
  if (pc) { try { pc.close(); } catch {} pc = null; }
  if (localStream) { localStream.getTracks().forEach((t) => t.stop()); localStream = null; }
  if (remoteAudioEl) remoteAudioEl.srcObject = null;
  pendingOffer = null;
  pendingCandidates = [];
}

async function createPC(peerId: string, ws: WebSocket) {
  pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceCandidatePoolSize: 10 });

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
    if (pc.connectionState === "failed") {
      cleanup();
      setState({ status: "ended", reason: "Connection failed" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
    if (pc.connectionState === "disconnected") {
      // brief grace period — often recovers
      setTimeout(() => {
        if (pc && pc.connectionState === "disconnected") {
          cleanup();
          setState({ status: "ended", reason: "Connection lost" });
          setTimeout(() => setState({ status: "idle" }), 2000);
        }
      }, 5000);
    }
  };
  return pc;
}

export const callActions = {
  startCall: async (peerId: string, peerName: string, ws: WebSocket | null, myName: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setState({ status: "ended", reason: "Reconnecting… try again" });
      setTimeout(() => setState({ status: "idle" }), 2000);
      return;
    }
    const cur = useCallStore.getState().state;
    if (cur.status !== "idle") return;
    try {
      setState({ status: "calling", peerId, peerName });
      playRingtone("outgoing");
      // if nobody answers in 30s, auto-end
      clearRingTimeout();
      ringTimeout = setTimeout(() => {
        if (useCallStore.getState().state.status === "calling") {
          ws.send(JSON.stringify({ type: "call.end", to: peerId }));
          cleanup();
          setState({ status: "ended", reason: "No answer" });
          setTimeout(() => setState({ status: "idle" }), 1800);
        }
      }, 30000);

      const conn = await createPC(peerId, ws);
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      ws.send(JSON.stringify({ type: "call.offer", to: peerId, sdp: offer, peerName: myName }));
    } catch (e) {
      cleanup();
      setState({ status: "ended", reason: "Microphone blocked" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  },

  acceptCall: async (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if (cur.status !== "incoming" || !ws || !pendingOffer) return;
    try {
      stopRingtone();
      const conn = await createPC(cur.peerId, ws);
      await conn.setRemoteDescription(new RTCSessionDescription(pendingOffer));
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "call.answer", to: cur.peerId, sdp: answer }));
      for (const c of pendingCandidates) { try { await conn.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      pendingCandidates = [];
      pendingOffer = null;
      setState({ status: "active", peerId: cur.peerId, peerName: cur.peerName, muted: false });
    } catch {
      cleanup();
      setState({ status: "ended", reason: "Could not connect" });
      setTimeout(() => setState({ status: "idle" }), 2000);
    }
  },

  declineCall: (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if (cur.status === "incoming" && ws) ws.send(JSON.stringify({ type: "call.decline", to: cur.peerId }));
    cleanup();
    setState({ status: "idle" });
  },

  endCall: (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if ((cur.status === "active" || cur.status === "calling") && ws) {
      ws.send(JSON.stringify({ type: "call.end", to: cur.peerId }));
    }
    cleanup();
    setState({ status: "ended", reason: "Call ended" });
    setTimeout(() => setState({ status: "idle" }), 1500);
  },

  toggleMute: () => {
    const cur = useCallStore.getState().state;
    if (cur.status !== "active" || !localStream) return;
    const track = localStream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setState({ ...cur, muted: !track.enabled }); }
  },

  handleWsMessage: async (msg: any, ws: WebSocket) => {
    const cur = useCallStore.getState().state;

    if (msg.type === "call.offer") {
      if (cur.status !== "idle") {
        ws.send(JSON.stringify({ type: "call.decline", to: msg.from }));
        return;
      }
      pendingOffer = msg.sdp;
      pendingCandidates = [];
      setState({ status: "incoming", peerId: msg.from, peerName: msg.peerName || "Someone" });
      playRingtone("incoming");
      // 30s auto-decline if unanswered
      clearRingTimeout();
      ringTimeout = setTimeout(() => {
        const s = useCallStore.getState().state;
        if (s.status === "incoming") {
          ws.send(JSON.stringify({ type: "call.decline", to: s.peerId }));
          cleanup();
          setState({ status: "idle" });
        }
      }, 30000);
    }
    else if (msg.type === "call.answer") {
      if (!pc) return;
      stopRingtone();
      clearRingTimeout();
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        for (const c of pendingCandidates) { try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
        pendingCandidates = [];
      } catch {}
      const s = useCallStore.getState().state;
      if (s.status === "calling") setState({ status: "active", peerId: s.peerId, peerName: s.peerName, muted: false });
    }
    else if (msg.type === "call.ice") {
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      } else {
        pendingCandidates.push(msg.candidate);
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
