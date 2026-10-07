"use client";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/store/auth";
import { notifApi } from "@/lib/notifications";
import { Bell } from "lucide-react";

export function NotifBell() {
  const { user, accessToken } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notif-unread", user?.id],
    queryFn: () => notifApi.unread(accessToken!),
    enabled: !!user && !!accessToken,
    refetchInterval: 10000,
  });

  if (!user) return null;
  const count = data?.count || 0;

  return (
    <Link href="/notifications" className="btn btn-outline" style={{ padding: "0.4rem 0.7rem", fontSize: "0.85rem", position: "relative" }}>
      <Bell size={15} />
      {count > 0 && (
        <span style={{
          position: "absolute", top: -6, right: -6,
          background: "#b42318", color: "white", borderRadius: "50%",
          width: 18, height: 18, fontSize: "0.65rem", fontWeight: 800,
          display: "grid", placeItems: "center",
        }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
