"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatINR, timeAgo } from "@/lib/utils";
import { BadgeCheck, Star, Package, CheckCircle2 } from "lucide-react";

type PublicProfile = {
  id: string;
  name: string;
  department: string | null;
  bio: string | null;
  avatar_url: string | null;
  campus_verified: boolean;
  email_verified: boolean;
  created_at: string;
  completed_transactions: number;
  avg_rating: number;
  sold_count: number;
  active_listings: Array<{ id: string; title: string; price: number; condition: string; type: string; status: string; created_at: string }>;
  recent_ratings: Array<{ rating: number; comment: string | null; from_name: string; created_at: string }>;
};

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ["public-profile", id],
    queryFn: () => api.get<PublicProfile>(`/users/${id}`),
  });

  if (isLoading) return <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-2)" }}>Loading profile…</div>;
  if (error || !data) return <div className="card" style={{ padding: "2rem", textAlign: "center" }}>User not found.</div>;

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto" }}>
      <div className="card" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden", background: "var(--bg-2)", border: "2px solid var(--border-1)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {data.avatar_url ? <img src={data.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{data.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
              <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", margin: 0 }}>{data.name}</h1>
              {data.email_verified && <span className="badge badge-active"><BadgeCheck size={10} /> Verified</span>}
              {data.campus_verified && <span className="badge badge-verified">NMIT</span>}
            </div>
            {data.department && <div className="mono" style={{ fontSize: "0.82rem", color: "var(--text-2)", marginBottom: "0.35rem" }}>{data.department}</div>}
            {data.bio && <p style={{ fontSize: "0.9rem", color: "var(--text-1)", lineHeight: 1.6, marginTop: "0.5rem" }}>{data.bio}</p>}
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-2)", marginTop: "0.75rem" }}>Member since {new Date(data.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-0)" }}>
          <Stat icon={<CheckCircle2 size={14} />} label="Completed" value={data.completed_transactions} />
          <Stat icon={<Package size={14} />} label="Sold" value={data.sold_count} />
          <Stat icon={<Star size={14} />} label="Rating" value={data.avg_rating > 0 ? data.avg_rating.toFixed(1) : "—"} />
          <Stat icon={<Package size={14} />} label="Active" value={data.active_listings.length} />
        </div>
      </div>

      {data.active_listings.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", marginBottom: "1rem", letterSpacing: "-0.01em" }}>Active listings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "2rem" }}>
            {data.active_listings.map((l) => (
              <Link key={l.id} href={`/listing/${l.id}`} className="card hover-card" style={{ display: "block", padding: "0.9rem" }}>
                <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", marginBottom: "0.35rem" }}>{l.condition.replace("_", " ")}</div>
                <div className="hover-card-title" style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "0.92rem", marginBottom: "0.5rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</div>
                <div style={{ fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{formatINR(l.price)}</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {data.recent_ratings.length > 0 && (
        <>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", marginBottom: "1rem", letterSpacing: "-0.01em" }}>Recent reviews</h2>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {data.recent_ratings.map((r, i) => (
              <div key={i} className="card" style={{ padding: "0.9rem 1.15rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {[1,2,3,4,5].map((n) => (
                      <Star key={n} size={12} fill={r.rating >= n ? "var(--accent)" : "none"} color={r.rating >= n ? "var(--accent)" : "var(--border-2)"} />
                    ))}
                  </div>
                  <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-2)" }}>from {r.from_name} · {timeAgo(r.created_at)}</span>
                </div>
                {r.comment && <div style={{ fontSize: "0.88rem", color: "var(--text-1)" }}>"{r.comment}"</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.35rem" }}>
        {icon} {label}
      </div>
      <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-0)" }}>{value}</div>
    </div>
  );
}
