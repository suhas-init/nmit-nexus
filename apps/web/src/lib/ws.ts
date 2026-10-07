"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/store/auth";

export type WsEvent = {
  type: string;
  [key: string]: any;
};

export function useRealtime(onEvent?: (e: WsEvent) => void) {
  const { accessToken } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!accessToken) return;
    const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws");
    const ws = new WebSocket(`${base}/ws?token=${encodeURIComponent(accessToken)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
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
    };
  }, [accessToken]);

  return { connected };
}
