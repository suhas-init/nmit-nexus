"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/store/auth";
import { offersApi } from "@/lib/offers";
import { timeAgo } from "@/lib/utils";
import { Send } from "lucide-react";

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--navy)", marginBottom: "1rem" }}>Conversation</h1>

      <div className="card" style={{ padding: "1rem", height: "60vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.6rem", paddingRight: "0.5rem" }}>
          {isLoading && <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>Loading…</div>}
          {msgs?.map((m) => {
            const mine = m.sender_id === user.id;
            const isOffer = m.message_type === "OFFER";
            return (
              <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "75%" }}>
                <div style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: 12,
                  background: isOffer ? "#fff6d9" : mine ? "var(--navy)" : "#eef1f7",
                  color: isOffer ? "#8a6500" : mine ? "white" : "var(--navy)",
                  fontSize: "0.9rem",
                  fontWeight: isOffer ? 600 : 400,
                  border: isOffer ? "1px solid #f0dc8c" : "none",
                }}>
                  {m.body}
                </div>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "0.2rem", textAlign: mine ? "right" : "left" }}>{timeAgo(m.created_at)}</div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
          <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
