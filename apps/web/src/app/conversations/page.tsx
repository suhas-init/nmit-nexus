"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { offersApi } from "@/lib/offers";
import { timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default function ConversationsPage() {
  const { user, accessToken } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => offersApi.conversations(accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 5000,
  });

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view chats.</div>;

  return (
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.35rem" }}>Messages</h1>
      <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Chat with buyers and sellers.</p>

      {isLoading && <div className="card" style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <MessageSquare size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--navy)", marginBottom: "0.35rem" }}>No conversations yet.</div>
          <div style={{ fontSize: "0.9rem" }}>Make an offer on a listing to start a chat.</div>
        </div>
      )}

      {!isLoading && data?.map((c) => (
        <Link key={c.id} href={`/conversations/${c.id}`} className="card" style={{ padding: "1rem 1.25rem", display: "block", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem" }}>
              {c.buyer_id === user.id ? "You → seller" : "Buyer → you"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{timeAgo(c.last_message_at)}</div>
          </div>
          <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "0.2rem" }}>Listing · {c.listing_id.slice(0, 8)}</div>
        </Link>
      ))}
    </div>
  );
}
