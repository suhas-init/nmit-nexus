"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { MapPin } from "lucide-react";

type MeetupPoint = {
  id: string;
  name: string;
  campus_zone: string;
  latitude: number;
  longitude: number;
};

export function MeetupMap() {
  const { data } = useQuery<MeetupPoint[]>({
    queryKey: ["meetups"],
    queryFn: () => api.get<MeetupPoint[]>("/meetups"),
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="card" style={{ padding: "1.25rem" }}>
      <div className="term-label" style={{ marginBottom: "0.75rem" }}>CAMPUS_MEETUP_POINTS</div>
      <div style={{ display: "grid", gap: "0.5rem" }}>
        {data.map((m) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border-0)" }}>
            <MapPin size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.88rem", color: "var(--text-0)", fontWeight: 500 }}>{m.name}</div>
              <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{m.campus_zone} ZONE</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
