"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime, WsEvent, sharedWsRef } from "@/lib/ws";
import { useToasts } from "@/store/toasts";
import { useAuth } from "@/store/auth";
import { callActions } from "@/lib/webrtc";

export function RealtimeBridge() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  const { user, accessToken, fetchMe } = useAuth();

  useEffect(() => {
    if (accessToken) fetchMe();
  }, [accessToken, fetchMe]);

  useRealtime((e: WsEvent) => {
    if (!user) return;

    // WebRTC signalling — do not toast
    if (e.type?.startsWith("call.") && sharedWsRef.current) {
      callActions.handleWsMessage(e, sharedWsRef.current);
      return;
    }

    switch (e.type) {
      case "offer.created":
        qc.invalidateQueries({ queryKey: ["offers-inbox"] });
        push({ title: "New offer received", body: e.listing_title ? `${e.listing_title} — ₹${e.offer_price}` : undefined, href: "/offers" });
        break;
      case "offer.updated":
        qc.invalidateQueries({ queryKey: ["offers-inbox"] });
        qc.invalidateQueries({ queryKey: ["my-offers"] });
        push({ title: `Offer ${e.status?.toLowerCase()}`, href: "/offers" });
        break;
      case "notification.created": {
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notif-unread"] });

        // INSTANT message append — no polling wait
        if (e.notification_type === "message.created" && e.conversation_id && e.message) {
          qc.setQueryData<any[]>(["messages", e.conversation_id], (old) => {
            if (!old) return old;
            if (old.some((m) => m.id === e.message.id)) return old;
            return [...old, e.message];
          });
          qc.invalidateQueries({ queryKey: ["conversations"] });
          push({ title: "New message", href: `/conversations/${e.conversation_id}` });
        } else if (e.title) {
          push({
            title: e.title,
            body: e.body,
            href: e.href,
            kind: e.notification_type === "handover.verified" ? "success" : "info",
          });
        }
        break;
      }
      case "wanted.bid.created":
        qc.invalidateQueries({ queryKey: ["wanted-bids"] });
        push({ title: "New bid on your wanted post", body: e.title ? `${e.title} — ₹${e.bid_price}` : undefined, href: `/wanted/${e.wanted_post_id}` });
        break;
      case "handover.verified":
        qc.invalidateQueries({ queryKey: ["handover"] });
        push({ title: "Handover verified ✓", body: "Deal marked complete", kind: "success" });
        break;
    }
  });

  return null;
}
