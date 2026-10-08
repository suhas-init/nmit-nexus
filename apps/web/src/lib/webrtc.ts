"use client";
import { create } from "zustand";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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

function ensureAudioEl(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!remoteAudioEl) {
    remoteAudioEl = document.createElement("audio");
    remoteAudioEl.autoplay = true;
    (remoteAudioEl as any).playsInline = true;
    remoteAudioEl.setAttribute("playsinline", "true");
    remoteAudioEl.setAttribute("webkit-playsinline", "true");
    remoteAudioEl.muted = false;
    remoteAudioEl.volume = 1;
    remoteAudioEl.style.position = "fixed";
    remoteAudioEl.style.width = "1px";
    remoteAudioEl.style.height = "1px";
    remoteAudioEl.style.opacity = "0";
    remoteAudioEl.style.pointerEvents = "none";
    document.body.appendChild(remoteAudioEl);
  }
  return remoteAudioEl;
}

async function tryPlay(el: HTMLAudioElement, attempts = 6) {
  for (let i = 0; i < attempts; i++) {
    try {
      await el.play();
      return true;
    } catch (err) {
      await new Promise((r) => setTimeout(r, 200 + i * 150));
    }
  }
  return false;
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
  if (pc) {
    try { pc.getSenders().forEach((s) => { try { s.track?.stop(); } catch {} }); } catch {}
    try { pc.close(); } catch {}
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    localStream = null;
  }
  if (remoteAudioEl) remoteAudioEl.srcObject = null;
  pendingOffer = null;
  pendingCandidates = [];
}

async function createPC(peerId: string, ws: WebSocket, isCaller: boolean) {
  pc = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
  });

  console.log("[webrtc] createPC start, isCaller:", isCaller);
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
  localStream = stream;
  stream.getTracks().forEach((t) => pc!.addTrack(t, stream));

  pc.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "call.ice", to: peerId, candidate: e.candidate }));
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log("[webrtc] ice:", pc?.iceConnectionState);
  };

  pc.ontrack = (e) => {
    console.log("[webrtc] ontrack:", e.track.kind, "streams:", e.streams.length);
    const el = ensureAudioEl();
    if (!el) return;
    if (e.streams && e.streams[0]) {
      el.srcObject = e.streams[0];
    } else {
      const s = new MediaStream([e.track]);
      el.srcObject = s;
    }
    el.muted = false;
    el.volume = 1;
    tryPlay(el).then((ok) => { if (!ok) console.warn("[webrtc] audio play blocked"); });
  };

  pc.onconnectionstatechange = () => {
    console.log("[webrtc] conn:", pc?.connectionState);
    if (!pc) return;
    if (pc.connectionState === "failed") {
      cleanup();
      setState({ status: "ended", reason: "Connection failed" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
    if (pc.connectionState === "disconnected") {
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
    // Always force a clean slate
    cleanup();
    setState({ status: "idle" });
    // Force user-gesture audio unlock — helps mobile Safari/Chrome
    const el = ensureAudioEl();
    if (el) {
      // Do NOT await — play() can hang indefinitely when autoplay is blocked
      el.play().catch(() => {});
    }

    console.log("[webrtc] startCall entry — proceeding");
    try {
      console.log("[webrtc] startCall — setting calling state");
      setState({ status: "calling", peerId, peerName });
      playRingtone("outgoing");
      console.log("[webrtc] ringtone started");

      clearRingTimeout();
      ringTimeout = setTimeout(() => {
        if (useCallStore.getState().state.status === "calling") {
          ws.send(JSON.stringify({ type: "call.end", to: peerId }));
          cleanup();
          setState({ status: "ended", reason: "No answer" });
          setTimeout(() => setState({ status: "idle" }), 1800);
        }
      }, 30000);

      const conn = await createPC(peerId, ws, true);
      console.log("[webrtc] pc created, creating offer");
      const offer = await conn.createOffer();
      await conn.setLocalDescription(offer);
      console.log("[webrtc] offer set, sending");
      ws.send(JSON.stringify({ type: "call.offer", to: peerId, sdp: offer, peerName: myName }));
      console.log("[webrtc] offer sent");
    } catch (e) {
      console.error("[webrtc] startCall failed", e);
      cleanup();
      setState({ status: "ended", reason: "Microphone blocked" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  },

  acceptCall: async (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if (cur.status !== "incoming" || !ws || !pendingOffer) return;
    const offer = pendingOffer;

    // unlock audio element via the Accept click gesture
    const el = ensureAudioEl();
    if (el) {
      el.play().catch(() => {});
    }

    try {
      stopRingtone();
      clearRingTimeout();
      const conn = await createPC(cur.peerId, ws, false);
      console.log("[webrtc] answer side: pc created");
      await conn.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[webrtc] remote offer set");
      const answer = await conn.createAnswer();
      await conn.setLocalDescription(answer);
      ws.send(JSON.stringify({ type: "call.answer", to: cur.peerId, sdp: answer }));
      for (const c of pendingCandidates) { try { await conn.addIceCandidate(new RTCIceCandidate(c)); } catch {} }
      pendingCandidates = [];
      pendingOffer = null;
      setState({ status: "active", peerId: cur.peerId, peerName: cur.peerName, muted: false });
    } catch (e) {
      console.error("[webrtc] acceptCall failed", e);
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
      console.log("[webrtc] got offer from", msg.from, "current:", cur.status, "pendingOffer:", !!pendingOffer);
      // Ignore duplicate offer (same peer, already pending)
      if (cur.status === "incoming" && cur.peerId === msg.from && pendingOffer) {
        console.log("[webrtc] duplicate offer ignored");
        return;
      }
      if (cur.status !== "idle") {
        ws.send(JSON.stringify({ type: "call.decline", to: msg.from }));
        return;
      }
      pendingOffer = msg.sdp;
      pendingCandidates = [];
      setState({ status: "incoming", peerId: msg.from, peerName: msg.peerName || "Someone" });
      playRingtone("incoming");
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
      } catch (e) {
        console.error("[webrtc] setRemoteDescription(answer) failed", e);
      }
      const s = useCallStore.getState().state;
      if (s.status === "calling") setState({ status: "active", peerId: s.peerId, peerName: s.peerName, muted: false });
    }
    else if (msg.type === "call.ice") {
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
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
