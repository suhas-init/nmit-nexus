"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/auth";

export type WsEvent = { type: string; [key: string]: any };

export const sharedWsRef: { current: WebSocket | null } = { current: null };

export function useRealtime(onEvent?: (e: WsEvent) => void) {
  const { accessToken } = useAuth();
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!accessToken) return;
    let closed = false;
    let attempt = 0;
    let ping: any = null;

    // Close any lingering connection from a previous mount
    if (sharedWsRef.current) {
      try { sharedWsRef.current.close(); } catch {}
      sharedWsRef.current = null;
    }

    const connect = () => {
      if (closed) return;
      // Don't stack connections
      if (sharedWsRef.current && sharedWsRef.current.readyState === WebSocket.OPEN) {
        return;
      }
      const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");
      const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(accessToken)}`);
      sharedWsRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
        setConnected(true);
        clearInterval(ping);
        ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 20000);
      };
      ws.onclose = () => {
        setConnected(false);
        clearInterval(ping);
        if (sharedWsRef.current === ws) sharedWsRef.current = null;
        if (closed) return;
        const delay = Math.min(800 * Math.pow(1.6, attempt++), 8000);
        setTimeout(connect, delay);
      };
      ws.onerror = () => setConnected(false);
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as WsEvent;
          onEventRef.current?.(data);
        } catch {}
      };
    };

    connect();

    return () => {
      closed = true;
      clearInterval(ping);
      try { sharedWsRef.current?.close(); } catch {}
      sharedWsRef.current = null;
    };
  }, [accessToken]);

  return { connected };
}
