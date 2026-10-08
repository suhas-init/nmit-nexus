"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/auth";

export type WsEvent = { type: string; [key: string]: any };

// module-level shared ref — used by useWebRTC too
export const sharedWsRef: { current: WebSocket | null } = { current: null };

export function useRealtime(onEvent?: (e: WsEvent) => void) {
  const { accessToken } = useAuth();
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!accessToken) return;
    const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(accessToken)}`);
    sharedWsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => { setConnected(false); if (sharedWsRef.current === ws) sharedWsRef.current = null; };
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as WsEvent;
        onEventRef.current?.(data);
      } catch {}
    };

    const ping = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 25000);

    return () => {
      clearInterval(ping);
      ws.close();
      if (sharedWsRef.current === ws) sharedWsRef.current = null;
    };
  }, [accessToken]);

  return { connected };
}
