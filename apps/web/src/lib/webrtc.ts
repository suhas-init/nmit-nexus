"use client";
import { create } from "zustand";

// ============================================================
// ICE CONFIG — multiple STUN + TURN (UDP, TCP, TLS)
// ============================================================
const ICE_SERVERS: RTCIceServer[] = [
  { urls: [
    "stun:stun.l.google.com:19302",
    "stun:stun1.l.google.com:19302",
    "stun:stun2.l.google.com:19302",
    "stun:stun3.l.google.com:19302",
    "stun:stun.cloudflare.com:3478",
  ]},
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// ============================================================
// AUDIO CONSTRAINTS
// ============================================================
const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: 1,
  },
  video: false,
};

// ============================================================
// TIMEOUTS (ms)
// ============================================================
const TIMEOUTS = {
  ICE_GATHER: 4000,
  RING: 30000,
  CONNECT: 15000,
  DISCONNECT_GRACE: 5000,
  RECOVERY_GRACE: 8000,
};

// ============================================================
// TYPES
// ============================================================
export type CallState =
  | { status: "idle" }
  | { status: "calling"; peerId: string; peerName: string }
  | { status: "incoming"; peerId: string; peerName: string }
  | { status: "active"; peerId: string; peerName: string; muted: boolean }
  | { status: "ended"; reason?: string };

// ============================================================
// SINGLETON STATE
// ============================================================
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteAudioEl: HTMLAudioElement | null = null;
let ringtone: { stop: () => void } | null = null;
let ringTimeout: any = null;
let connectTimeout: any = null;
let disconnectGrace: any = null;
let pendingOffer: any = null;
let pendingCandidates: any[] = [];
let remoteStream: MediaStream | null = null;

// ============================================================
// ZUSTAND STORE
// ============================================================
type Store = { state: CallState; setState: (s: CallState) => void };
export const useCallStore = create<Store>((set) => ({
  state: { status: "idle" },
  setState: (s) => set({ state: s }),
}));

const setState = (s: CallState) => useCallStore.getState().setState(s);
const getStatus = () => useCallStore.getState().state.status;

// ============================================================
// HELPERS
// ============================================================
function getRemoteStream(): MediaStream {
  if (!remoteStream && typeof window !== "undefined") remoteStream = new MediaStream();
  return remoteStream as MediaStream;
}

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
    Object.assign(remoteAudioEl.style, {
      position: "fixed", width: "1px", height: "1px",
      opacity: "0", pointerEvents: "none", left: "-9999px",
    });
    document.body.appendChild(remoteAudioEl);
  }
  return remoteAudioEl;
}

function attachRemoteStream() {
  const el = ensureAudioEl();
  if (!el) return;
  const rs = getRemoteStream();
  if (rs.getAudioTracks().length === 0) return;
  if (el.srcObject !== rs) el.srcObject = rs;
  el.muted = false;
  el.volume = 1;
  (async () => {
    for (let i = 0; i < 8; i++) {
      try { await el.play(); console.log("[webrtc] remote audio playing"); return; }
      catch { await new Promise((r) => setTimeout(r, 250 + i * 200)); }
    }
    console.warn("[webrtc] remote audio play failed after retries");
  })();
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
function clearTimers() {
  if (ringTimeout) { clearTimeout(ringTimeout); ringTimeout = null; }
  if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
  if (disconnectGrace) { clearTimeout(disconnectGrace); disconnectGrace = null; }
}

function cleanup() {
  stopRingtone();
  clearTimers();
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
  remoteStream = null;
  pendingOffer = null;
  pendingCandidates = [];
}

function forceSendRecv(conn: RTCPeerConnection) {
  try {
    conn.getTransceivers().forEach((t) => {
      try {
        if (t.direction !== "sendrecv") {
          t.direction = "sendrecv";
          console.log("[webrtc] forced transceiver to sendrecv");
        }
      } catch {}
    });
  } catch {}
}

function patchSdp(sdp: string | undefined): string {
  if (!sdp) return "";
  return sdp.replace(/a=(recvonly|sendonly)/g, "a=sendrecv");
}

function waitForIceGathering(conn: RTCPeerConnection, timeoutMs = TIMEOUTS.ICE_GATHER): Promise<void> {
  return new Promise((resolve) => {
    if (conn.iceGatheringState === "complete") { resolve(); return; }
    const timer = setTimeout(() => { conn.removeEventListener("icegatheringstatechange", check); resolve(); }, timeoutMs);
    const check = () => {
      if (conn.iceGatheringState === "complete") {
        clearTimeout(timer);
        conn.removeEventListener("icegatheringstatechange", check);
        resolve();
      }
    };
    conn.addEventListener("icegatheringstatechange", check);
  });
}

// ============================================================
// getUserMedia WITH FULL ERROR HANDLING
// ============================================================
async function safeGetUserMedia(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("VOICE_UNSUPPORTED");
  }
  try {
    return await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
  } catch (err: any) {
    const name = err?.name || "";
    const map: Record<string, string> = {
      NotAllowedError: "MIC_BLOCKED",
      PermissionDeniedError: "MIC_BLOCKED",
      SecurityError: "MIC_BLOCKED",
      NotFoundError: "NO_MIC",
      DevicesNotFoundError: "NO_MIC",
      OverconstrainedError: "MIC_CONSTRAINT",
      ConstraintNotSatisfiedError: "MIC_CONSTRAINT",
      NotReadableError: "MIC_IN_USE",
      TrackStartError: "MIC_IN_USE",
      AbortError: "MIC_ABORTED",
    };
    throw new Error(map[name] || "MIC_UNKNOWN");
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  VOICE_UNSUPPORTED: "Voice calls aren't supported in this browser.",
  MIC_BLOCKED: "Microphone blocked. Click the lock icon in the address bar and allow Microphone, then refresh.",
  NO_MIC: "No microphone found on this device.",
  MIC_CONSTRAINT: "Your microphone doesn't support the required settings.",
  MIC_IN_USE: "Your microphone is being used by another app. Close it and try again.",
  MIC_ABORTED: "Microphone access was interrupted. Try again.",
  MIC_UNKNOWN: "Couldn't access your microphone.",
};

// ============================================================
// CREATE PEER CONNECTION WITH ALL HANDLERS
// ============================================================
function createPeerConnection(peerId: string, ws: WebSocket): RTCPeerConnection {
  const conn = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  conn.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "call.ice", to: peerId, candidate: e.candidate })); } catch {}
    }
  };

  conn.ontrack = (e) => {
    console.log("[webrtc] ontrack:", e.track.kind, "muted:", e.track.muted, "streams:", e.streams?.length);
    const rs = getRemoteStream();
    const incoming = e.streams?.[0]?.getTracks() ?? [e.track];
    incoming.forEach((t) => {
      if (!rs.getTracks().find((x) => x.id === t.id)) rs.addTrack(t);
    });
    e.track.onunmute = () => { console.log("[webrtc] track unmuted"); attachRemoteStream(); };
    e.track.onended = () => { console.warn("[webrtc] track ended"); };
    attachRemoteStream();
  };

  conn.oniceconnectionstatechange = () => {
    const st = conn.iceConnectionState;
    console.log("[webrtc] ice:", st);

    if (st === "failed") {
      console.warn("[webrtc] ICE failed — attempting restart");
      try { conn.restartIce(); } catch {}
      // if restart doesn't help within grace period, end the call
      setTimeout(() => {
        if (conn.iceConnectionState === "failed" || conn.iceConnectionState === "disconnected") {
          cleanup();
          setState({ status: "ended", reason: "Network unreachable. Try a different network." });
          setTimeout(() => setState({ status: "idle" }), 3000);
        }
      }, TIMEOUTS.RECOVERY_GRACE);
    }

    if (st === "disconnected") {
      // Grace period — often recovers on its own
      if (disconnectGrace) clearTimeout(disconnectGrace);
      disconnectGrace = setTimeout(() => {
        if (conn.iceConnectionState === "disconnected") {
          console.warn("[webrtc] ICE still disconnected after grace — restarting");
          try { conn.restartIce(); } catch {}
          setTimeout(() => {
            if (conn.iceConnectionState === "disconnected" || conn.iceConnectionState === "failed") {
              cleanup();
              setState({ status: "ended", reason: "Connection lost." });
              setTimeout(() => setState({ status: "idle" }), 2500);
            }
          }, TIMEOUTS.RECOVERY_GRACE);
        }
      }, TIMEOUTS.DISCONNECT_GRACE);
    }

    if (st === "connected" || st === "completed") {
      if (disconnectGrace) { clearTimeout(disconnectGrace); disconnectGrace = null; }
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      forceSendRecv(conn);
      attachRemoteStream();
    }
  };

  conn.onconnectionstatechange = () => {
    const st = conn.connectionState;
    console.log("[webrtc] conn:", st);
    if (st === "connected") {
      if (connectTimeout) { clearTimeout(connectTimeout); connectTimeout = null; }
      forceSendRecv(conn);
      attachRemoteStream();
    }
    if (st === "failed") {
      cleanup();
      setState({ status: "ended", reason: "Connection failed." });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  };

  conn.onsignalingstatechange = () => console.log("[webrtc] signaling:", conn.signalingState);

  conn.onicegatheringstatechange = () => console.log("[webrtc] gathering:", conn.iceGatheringState);

  // Connection timeout — if we never reach connected within N seconds
  if (connectTimeout) clearTimeout(connectTimeout);
  connectTimeout = setTimeout(() => {
    if (conn.connectionState !== "connected") {
      console.warn("[webrtc] connection timeout");
      cleanup();
      setState({ status: "ended", reason: "Couldn't connect. Try again." });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
  }, TIMEOUTS.CONNECT);

  return conn;
}

// ============================================================
// ACTIONS
// ============================================================
export const callActions = {
  startCall: async (peerId: string, peerName: string, ws: WebSocket | null, myName: string) => {
    console.log("[webrtc] startCall, ws:", ws?.readyState);

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setState({ status: "ended", reason: "Reconnecting… try again" });
      setTimeout(() => setState({ status: "idle" }), 2000);
      return;
    }

    cleanup();
    setState({ status: "idle" });

    const el = ensureAudioEl();
    if (el) el.play().catch(() => {});

    try {
      setState({ status: "calling", peerId, peerName });
      playRingtone("outgoing");

      // Ring timeout
      if (ringTimeout) clearTimeout(ringTimeout);
      ringTimeout = setTimeout(() => {
        if (getStatus() === "calling") {
          try { ws.send(JSON.stringify({ type: "call.end", to: peerId })); } catch {}
          cleanup();
          setState({ status: "ended", reason: "No answer" });
          setTimeout(() => setState({ status: "idle" }), 1800);
        }
      }, TIMEOUTS.RING);

      // Get mic first (caller)
      const stream = await safeGetUserMedia();
      localStream = stream;
      console.log("[webrtc] caller got mic, tracks:", stream.getAudioTracks().length);

      pc = createPeerConnection(peerId, ws);
      stream.getAudioTracks().forEach((t) => pc!.addTrack(t, stream));
      forceSendRecv(pc);

      const offer = await pc.createOffer();
      offer.sdp = patchSdp(offer.sdp);
      await pc.setLocalDescription(offer);
      forceSendRecv(pc);

      console.log("[webrtc] caller gathering ICE…");
      await waitForIceGathering(pc);
      console.log("[webrtc] caller ICE ready, sending offer");

      try { ws.send(JSON.stringify({ type: "call.offer", to: peerId, sdp: pc.localDescription, peerName: myName })); } catch {}
    } catch (e: any) {
      const reason = ERROR_MESSAGES[e?.message] || ERROR_MESSAGES.MIC_UNKNOWN;
      console.error("[webrtc] startCall failed:", e);
      cleanup();
      setState({ status: "ended", reason });
      setTimeout(() => setState({ status: "idle" }), 3500);
    }
  },

  acceptCall: async (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if (cur.status !== "incoming" || !ws || !pendingOffer) return;
    const offer = pendingOffer;

    const el = ensureAudioEl();
    if (el) el.play().catch(() => {});

    try {
      stopRingtone();
      clearTimers();
      console.log("[webrtc] acceptCall: creating callee pc");

      pc = createPeerConnection(cur.peerId, ws);

      // 1. Remote offer FIRST
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[webrtc] callee: remote set, transceivers:", pc.getTransceivers().length);
      forceSendRecv(pc);

      // 2. Drain queued ICE
      const drained = pendingCandidates;
      pendingCandidates = [];
      for (const c of drained) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }

      // 3. Get mic — attach to negotiated transceiver
      const stream = await safeGetUserMedia();
      localStream = stream;
      const audioTrack = stream.getAudioTracks()[0];
      console.log("[webrtc] callee got mic");

      // Find the audio transceiver from the offer and use replaceTrack
      let attached = false;
      for (const t of pc.getTransceivers()) {
        try {
          const isAudio =
            t.receiver?.track?.kind === "audio" ||
            t.sender?.track?.kind === "audio" ||
            (!t.sender?.track && !t.receiver?.track);
          if (isAudio) {
            t.direction = "sendrecv";  // FORCE before replaceTrack
            await t.sender.replaceTrack(audioTrack);
            attached = true;
            console.log("[webrtc] callee attached via replaceTrack");
            break;
          }
        } catch (err) { console.warn("[webrtc] replaceTrack failed", err); }
      }
      if (!attached) {
        console.log("[webrtc] callee fallback to addTrack");
        pc.addTrack(audioTrack, stream);
      }
      forceSendRecv(pc);

      // 4. Answer
      const answer = await pc.createAnswer();
      answer.sdp = patchSdp(answer.sdp);
      await pc.setLocalDescription(answer);
      forceSendRecv(pc);

      console.log("[webrtc] callee gathering ICE…");
      await waitForIceGathering(pc);
      console.log("[webrtc] callee ICE ready, sending answer");

      try { ws.send(JSON.stringify({ type: "call.answer", to: cur.peerId, sdp: pc.localDescription })); } catch {}

      pendingOffer = null;
      setState({ status: "active", peerId: cur.peerId, peerName: cur.peerName, muted: false });
      attachRemoteStream();
    } catch (e: any) {
      const reason = ERROR_MESSAGES[e?.message] || "Could not connect";
      console.error("[webrtc] acceptCall failed:", e);
      cleanup();
      setState({ status: "ended", reason });
      setTimeout(() => setState({ status: "idle" }), 3000);
    }
  },

  declineCall: (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if (cur.status === "incoming" && ws) {
      try { ws.send(JSON.stringify({ type: "call.decline", to: cur.peerId })); } catch {}
    }
    cleanup();
    setState({ status: "idle" });
  },

  endCall: (ws: WebSocket | null) => {
    const cur = useCallStore.getState().state;
    if ((cur.status === "active" || cur.status === "calling") && ws) {
      try { ws.send(JSON.stringify({ type: "call.end", to: cur.peerId })); } catch {}
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
      console.log("[webrtc] got offer, status:", cur.status);

      // Ignore duplicate offers
      if (cur.status === "incoming" && cur.peerId === msg.from && pendingOffer) {
        console.log("[webrtc] dup offer ignored");
        return;
      }
      // Busy — auto-decline
      if (cur.status !== "idle") {
        try { ws.send(JSON.stringify({ type: "call.decline", to: msg.from })); } catch {}
        return;
      }

      pendingOffer = msg.sdp;
      pendingCandidates = [];
      setState({ status: "incoming", peerId: msg.from, peerName: msg.peerName || "Someone" });
      playRingtone("incoming");

      if (ringTimeout) clearTimeout(ringTimeout);
      ringTimeout = setTimeout(() => {
        if (getStatus() === "incoming") {
          try { ws.send(JSON.stringify({ type: "call.decline", to: msg.from })); } catch {}
          cleanup();
          setState({ status: "idle" });
        }
      }, TIMEOUTS.RING);
    }

    else if (msg.type === "call.answer") {
      if (!pc) return;
      stopRingtone();
      clearTimers();
      try {
        // 1. Answer FIRST
        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        console.log("[webrtc] caller: answer applied");
        forceSendRecv(pc);

        // 2. THEN drain queued ICE
        const drained = pendingCandidates;
        pendingCandidates = [];
        for (const c of drained) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
      } catch (e) {
        console.error("[webrtc] answer handling failed", e);
      }
      const s = useCallStore.getState().state;
      if (s.status === "calling") {
        setState({ status: "active", peerId: s.peerId, peerName: s.peerName, muted: false });
        attachRemoteStream();
      }
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
