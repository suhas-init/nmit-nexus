"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { notifApi } from "@/lib/notifications";
import { timeAgo } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

export default function NotificationsPage() {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => notifApi.list(accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 8000,
  });

  const markAll = async () => {
    if (!accessToken) return;
    await notifApi.readAll(accessToken);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
  };

  const markOne = async (id: string) => {
    if (!accessToken) return;
    await notifApi.markRead(id, accessToken);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notif-unread"] });
  };

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view notifications.</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-0)" }}>Notifications</h1>
          <p style={{ fontSize: "0.9rem" }}>Everything that happened while you were away.</p>
        </div>
        {data && data.some((n) => !n.read_at) && (
          <button className="btn btn-outline" onClick={markAll} style={{ padding: "0.45rem 0.85rem", fontSize: "0.85rem" }}>
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {isLoading && <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Loading…</div>}

      {!isLoading && (!data || data.length === 0) && (
        <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
          <Bell size={40} style={{ color: "#94a3b8", margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.35rem" }}>You're all caught up.</div>
          <div style={{ fontSize: "0.9rem" }}>New offers, messages, and handovers will show up here.</div>
        </div>
      )}

      {!isLoading && data?.map((n) => {
        const unread = !n.read_at;
        const p = n.payload || {};
        const href = p.href as string | undefined;
        const content = (
          <div style={{
            background: unread ? "#eef4ff" : "white",
            borderLeft: unread ? "3px solid var(--text-0)" : "3px solid transparent",
          }}>
            <div style={{ padding: "0.9rem 1.15rem" }}>
              <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.95rem" }}>{p.title || n.type}</div>
              {p.body && <div style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.2rem" }}>{p.body}</div>}
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.4rem" }}>{timeAgo(n.created_at)}</div>
            </div>
          </div>
        );
        return (
          <div key={n.id} className="card" style={{ marginBottom: "0.6rem", padding: 0, overflow: "hidden" }}>
            {href ? (
              <Link href={href} onClick={() => unread && markOne(n.id)}>{content}</Link>
            ) : (
              <div onClick={() => unread && markOne(n.id)} style={{ cursor: unread ? "pointer" : "default" }}>{content}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
