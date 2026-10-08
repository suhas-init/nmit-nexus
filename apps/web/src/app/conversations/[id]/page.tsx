"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { offersApi } from "@/lib/offers";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Send, ArrowLeft, BadgeCheck } from "lucide-react";

type EnrichedConv = {
  id: string;
  listing_id: string;
  listing_title: string | null;
  buyer_id: string;
  seller_id: string;
  with_user: { id: string | null; name: string; avatar_url: string | null; campus_verified: boolean };
};

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: convo } = useQuery<EnrichedConv[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => api.get<EnrichedConv[]>("/conversations/enriched", accessToken!),
    enabled: !!user && !!accessToken,
  });

  const myConv = convo?.find((c) => c.id === id);

  const { data: msgs, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => offersApi.messages(id, accessToken!),
    enabled: !!accessToken,
    refetchInterval: 3000,
  });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || !accessToken) return;
    setSending(true);
    try {
      await offersApi.send(id, text.trim(), accessToken);
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", id] });
    } finally { setSending(false); }
  };

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in required.</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href="/conversations" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", marginBottom: "1rem", color: "var(--text-2)", fontWeight: 500 }}>
        <ArrowLeft size={14} /> Back to messages
      </Link>

      {myConv && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border-0)", display: "grid", placeItems: "center", overflow: "hidden", flexShrink: 0 }}>
            {myConv.with_user.avatar_url ? (
              <img src={myConv.with_user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-2)" }}>
                {myConv.with_user.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "var(--text-0)", fontSize: "0.98rem" }}>
              {myConv.with_user.name}
              {myConv.with_user.campus_verified && <BadgeCheck size={13} style={{ color: "var(--accent)" }} />}
            </div>
            <Link href={`/listing/${myConv.listing_id}`} className="mono" style={{ fontSize: "0.7rem", color: "var(--text-2)", textDecoration: "none" }}>
              re: {myConv.listing_title || "listing"}
            </Link>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: "0.85rem", height: "62vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.55rem", paddingRight: "0.4rem" }}>
          {isLoading && <div className="mono" style={{ textAlign: "center", color: "var(--text-2)", padding: "2rem", fontSize: "0.82rem" }}>loading_messages…</div>}
          {msgs?.map((m) => {
            const mine = m.sender_id === user.id;
            const isOffer = m.message_type === "OFFER";
            return (
              <div key={m.id} style={{
                display: "flex",
                flexDirection: mine ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: "0.5rem",
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "85%",
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "var(--bg-2)", border: "1px solid var(--border-0)",
                  display: "grid", placeItems: "center", overflow: "hidden",
                  flexShrink: 0, marginBottom: "1.1rem",
                }}>
                  {!mine && myConv?.with_user.avatar_url ? (
                    <img src={myConv.with_user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : !mine ? (
                    <span className="mono" style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-2)" }}>
                      {myConv?.with_user.name.slice(0, 2).toUpperCase() || "??"}
                    </span>
                  ) : user.avatar_url ? (
                    <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span className="mono" style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-2)" }}>
                      {user.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div style={{ minWidth: 0, maxWidth: "100%" }}>
                  <div style={{
                    padding: "0.6rem 0.85rem",
                    borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: isOffer
                      ? "var(--badge-offer-bg)"
                      : mine
                        ? "var(--bubble-mine)"
                        : "var(--bubble-theirs)",
                    color: isOffer
                      ? "var(--accent)"
                      : mine
                        ? "var(--bubble-mine-text)"
                        : "var(--bubble-theirs-text)",
                    fontSize: "0.9rem",
                    fontWeight: isOffer ? 600 : 400,
                    border: isOffer ? "1px solid var(--accent)" : "1px solid var(--border-0)",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                  }}>
                    {m.body}
                  </div>
                  <div className="mono" style={{ fontSize: "0.66rem", color: "var(--text-2)", marginTop: "0.2rem", textAlign: mine ? "right" : "left", letterSpacing: "0.05em" }}>
                    {timeAgo(m.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid var(--border-0)", paddingTop: "0.75rem" }}>
          <input
            className="input"
            placeholder="Type a message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          />
          <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
