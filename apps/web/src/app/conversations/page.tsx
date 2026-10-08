"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { MessageSquare, BadgeCheck } from "lucide-react";

type EnrichedConv = {
  id: string;
  listing_id: string;
  listing_title: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  with_user: { id: string | null; name: string; avatar_url: string | null; campus_verified: boolean };
  i_am_buyer: boolean;
  latest_message?: string | null;
  latest_message_type?: string | null;
  latest_sender_id?: string | null;
};

export default function ConversationsPage() {
  const { user, accessToken } = useAuth();

  const { data, isLoading } = useQuery<EnrichedConv[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => api.get<EnrichedConv[]>("/conversations/enriched", accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 15000,
  });

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view chats.</div>;

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="term-label" style={{ marginBottom: "0.5rem" }}>MESSAGES</div>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>Conversations</h1>
        <p style={{ fontSize: "0.9rem", color: "var(--text-2)" }}>Chat with buyers and sellers.</p>
      </div>

      {isLoading && <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-2)" }}>Loading…</div>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <MessageSquare size={40} style={{ color: "var(--text-2)", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>No conversations yet.</div>
          <div style={{ fontSize: "0.9rem", color: "var(--text-1)" }}>Make an offer on a listing to start a chat.</div>
        </div>
      )}

      {!isLoading && data?.map((c) => (
        <Link key={c.id} href={`/conversations/${c.id}`} className="card lift" style={{ padding: "1rem 1.15rem", display: "block", marginBottom: "0.6rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--bg-2)", border: "1px solid var(--border-0)", display: "grid", placeItems: "center", flexShrink: 0, overflow: "hidden" }}>
              {c.with_user.avatar_url ? (
                <img src={c.with_user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-2)" }}>
                  {c.with_user.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.with_user.name}
                </span>
                {c.with_user.campus_verified && <BadgeCheck size={12} style={{ color: "var(--accent)" }} />}
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-1)", marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.latest_sender_id === user.id && <span style={{ color: "var(--text-2)" }}>You: </span>}
                {c.latest_message || (c.listing_title ? `re: ${c.listing_title}` : "conversation")}
              </div>
            </div>
            <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", flexShrink: 0 }}>
              {timeAgo(c.last_message_at)}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
