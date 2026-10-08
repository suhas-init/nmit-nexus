"use client";
import { create } from "zustand";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

const AUDIO_CONSTRAINTS: MediaStreamConstraints = {
  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  video: false,
};

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
let remoteStream: MediaStream | null = null;

type Store = { state: CallState; setState: (s: CallState) => void };
export const useCallStore = create<Store>((set) => ({
  state: { status: "idle" },
  setState: (s) => set({ state: s }),
}));

const setState = (s: CallState) => useCallStore.getState().setState(s);

function getRemoteStream(): MediaStream {
  if (!remoteStream && typeof window !== "undefined") {
    remoteStream = new MediaStream();
  }
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
    remoteAudioEl.style.position = "fixed";
    remoteAudioEl.style.width = "1px";
    remoteAudioEl.style.height = "1px";
    remoteAudioEl.style.opacity = "0";
    remoteAudioEl.style.pointerEvents = "none";
    remoteAudioEl.style.left = "-9999px";
    document.body.appendChild(remoteAudioEl);
  }
  return remoteAudioEl;
}

function attachRemoteStream() {
  const el = ensureAudioEl();
  if (!el) return;
  const rs = getRemoteStream();
  if (rs.getAudioTracks().length === 0) {
    console.log("[webrtc] remote has no audio tracks yet");
    return;
  }
  if (el.srcObject !== rs) el.srcObject = rs;
  el.muted = false;
  el.volume = 1;

  const tryPlay = async (attempts = 8) => {
    for (let i = 0; i < attempts; i++) {
      try {
        await el.play();
        console.log("[webrtc] remote audio PLAYING, tracks:", rs.getAudioTracks().length);
        return;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 250 + i * 200));
      }
    }
    console.warn("[webrtc] remote audio play failed after retries");
  };
  tryPlay();
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
  remoteStream = null;
  pendingOffer = null;
  pendingCandidates = [];
}

// Force every audio transceiver to sendrecv — this is the critical fix for
// one-way audio across Chrome / Safari / Firefox and any network combination.
function forceSendRecv(conn: RTCPeerConnection) {
  try {
    conn.getTransceivers().forEach((t) => {
      try {
        const isAudio =
          (t.receiver && t.receiver.track && t.receiver.track.kind === "audio") ||
          (t.sender && t.sender.track && t.sender.track.kind === "audio") ||
          (!t.sender?.track && !t.receiver?.track); // newly-created audio slot
        if (isAudio) {
          t.direction = "sendrecv";
        }
      } catch {}
    });
  } catch (e) {
    console.warn("[webrtc] forceSendRecv failed", e);
  }
}

function basePC(peerId: string, ws: WebSocket) {
  const conn = new RTCPeerConnection({
    iceServers: ICE_SERVERS,
    iceCandidatePoolSize: 10,
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  });

  conn.onicecandidate = (e) => {
    if (e.candidate && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "call.ice", to: peerId, candidate: e.candidate }));
    }
  };

  conn.ontrack = (e) => {
    console.log("[webrtc] ontrack:", e.track.kind, "muted:", e.track.muted, "streams:", e.streams?.length);
    const rs = getRemoteStream();
    const incoming = e.streams && e.streams[0] ? e.streams[0].getTracks() : [e.track];
    incoming.forEach((t) => {
      if (!rs.getTracks().find((x) => x.id === t.id)) rs.addTrack(t);
    });
    // If track starts unmuted later, re-attach
    e.track.onunmute = () => {
      console.log("[webrtc] track unmuted");
      attachRemoteStream();
    };
    attachRemoteStream();
  };

  conn.onnegotiationneeded = () => {
    console.log("[webrtc] onnegotiationneeded (informational)");
  };

  conn.onsignalingstatechange = () => {
    console.log("[webrtc] signaling:", conn.signalingState);
  };

  conn.oniceconnectionstatechange = () => {
    console.log("[webrtc] ice:", conn.iceConnectionState);
  };

  conn.onconnectionstatechange = () => {
    console.log("[webrtc] conn:", conn.connectionState);
    if (conn.connectionState === "connected") {
      forceSendRecv(conn);
      attachRemoteStream();
    }
    if (conn.connectionState === "failed") {
      cleanup();
      setState({ status: "ended", reason: "Connection failed" });
      setTimeout(() => setState({ status: "idle" }), 2500);
    }
    if (conn.connectionState === "disconnected") {
      setTimeout(() => {
        if (conn.connectionState === "disconnected") {
          cleanup();
          setState({ status: "ended", reason: "Connection lost" });
          setTimeout(() => setState({ status: "idle" }), 2000);
        }
      }, 5000);
    }
  };

  return conn;
}

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

      clearRingTimeout();
      ringTimeout = setTimeout(() => {
        if (useCallStore.getState().state.status === "calling") {
          ws.send(JSON.stringify({ type: "call.end", to: peerId }));
          cleanup();
          setState({ status: "ended", reason: "No answer" });
          setTimeout(() => setState({ status: "idle" }), 1800);
        }
      }, 30000);

      pc = basePC(peerId, ws);

      // Get mic FIRST
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      localStream = stream;
      console.log("[webrtc] caller got mic, tracks:", stream.getAudioTracks().length);

      // addTrack creates a sendrecv transceiver by default
      stream.getAudioTracks().forEach((t) => pc!.addTrack(t, stream));

      // Belt-and-braces: force sendrecv on every audio transceiver
      forceSendRecv(pc);

      const offer = await pc.createOffer();
      // Force any audio m-line in the SDP to sendrecv (fixes Firefox/Safari quirks)
      offer.sdp = (offer.sdp || "").replace(/a=(recvonly|sendonly)/g, "a=sendrecv");
      await pc.setLocalDescription(offer);
      forceSendRecv(pc);
      console.log("[webrtc] caller offer ready, sending");

      ws.send(JSON.stringify({ type: "call.offer", to: peerId, sdp: pc.localDescription, peerName: myName }));
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

    const el = ensureAudioEl();
    if (el) el.play().catch(() => {});

    try {
      stopRingtone();
      clearRingTimeout();
      console.log("[webrtc] acceptCall: creating callee pc");

      pc = basePC(cur.peerId, ws);

      // 1. Set REMOTE first — creates the audio transceiver from the offer
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[webrtc] callee: remote set, transceivers:", pc.getTransceivers().length);
      forceSendRecv(pc);

      // 2. Drain any ICE candidates that arrived before we were ready
      for (const c of pendingCandidates) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
      }
      pendingCandidates = [];

      // 3. Now get the mic and add the track — reuses the transceiver
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS);
      localStream = stream;
      console.log("[webrtc] callee got mic, tracks:", stream.getAudioTracks().length);
      stream.getAudioTracks().forEach((t) => pc!.addTrack(t, stream));
      forceSendRecv(pc);

      // 4. Create + send the answer
      const answer = await pc.createAnswer();
      answer.sdp = (answer.sdp || "").replace(/a=(recvonly|sendonly)/g, "a=sendrecv");
      await pc.setLocalDescription(answer);
      forceSendRecv(pc);
      console.log("[webrtc] callee answer ready, sending");

      ws.send(JSON.stringify({ type: "call.answer", to: cur.peerId, sdp: pc.localDescription }));

      pendingOffer = null;
      setState({ status: "active", peerId: cur.peerId, peerName: cur.peerName, muted: false });
      attachRemoteStream();
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
      console.log("[webrtc] got offer, status:", cur.status);
      if (cur.status === "incoming" && cur.peerId === msg.from && pendingOffer) {
        console.log("[webrtc] dup offer ignored");
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
        // Drain ICE that arrived before answer
        for (const c of pendingCandidates) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        pendingCandidates = [];

        await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        console.log("[webrtc] caller: answer applied, transceivers:", pc.getTransceivers().length);
        forceSendRecv(pc);
      } catch (e) {
        console.error("[webrtc] setRemoteDescription(answer) failed", e);
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
