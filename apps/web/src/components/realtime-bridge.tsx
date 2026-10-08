"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime, WsEvent } from "@/lib/ws";
import { useToasts } from "@/store/toasts";
import { useAuth } from "@/store/auth";
import { callActions } from "@/lib/webrtc";
import { sharedWsRef } from "@/lib/ws";

export function RealtimeBridge() {
  const qc = useQueryClient();
  const push = useToasts((s) => s.push);
  const { user } = useAuth();

  useRealtime((e: WsEvent) => {
    if (!user) return;
    if (e.type.startsWith("call.") && sharedWsRef.current) {
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
      case "message.created":
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
        push({ title: "New message", href: "/conversations" });
        break;
      case "wanted.bid.created":
        qc.invalidateQueries({ queryKey: ["wanted-bids"] });
        push({ title: "New bid on your wanted post", body: e.title ? `${e.title} — ₹${e.bid_price}` : undefined, href: `/wanted/${e.wanted_post_id}` });
        break;
      case "notification.created":
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["notif-unread"] });
        if (e.title) push({ title: e.title, body: e.body, href: e.href, kind: e.notification_type === "handover.verified" ? "success" : "info" });
        break;
      case "handover.verified":
        qc.invalidateQueries({ queryKey: ["handover"] });
        push({ title: "Handover verified ✓", body: "Deal marked complete", kind: "success" });
        break;
    }
  });

  return null;
}
