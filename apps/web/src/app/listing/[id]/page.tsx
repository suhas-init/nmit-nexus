"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, Listing } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { formatINR, timeAgo } from "@/lib/utils";
import { ArrowLeft, MapPin, ShieldCheck, Trash2, CheckCircle2 } from "lucide-react";
import { OfferModal } from "@/components/offer-modal";
import { PricePulse } from "@/components/price-pulse";
import { CopyId } from "@/components/copy-id";
import { ListingGallery } from "@/components/listing-gallery";
import { FavouriteButton } from "@/components/favourite-button";
import { MeetupMap } from "@/components/meetup-map";
import { useState } from "react";

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [showOffer, setShowOffer] = useState(false);

  const { data: listing, isLoading, error, refetch } = useQuery<Listing>({
    queryKey: ["listing", id],
    queryFn: () => api.get<Listing>(`/listings/${id}`),
  });

  const isOwner = user?.id === listing?.seller_id;

  const markSold = async () => {
    if (!accessToken || !listing) return;
    setBusy(true);
    try {
      await api.post(`/listings/${listing.id}/sold`, {}, accessToken);
      await refetch();
    } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!accessToken || !listing) return;
    if (!confirm("Delete this listing permanently?")) return;
    setBusy(true);
    try {
      await api.del(`/listings/${listing.id}`, accessToken);
      router.push("/dashboard");
    } finally { setBusy(false); }
  };

  if (isLoading) return <div style={{ padding: "3rem", textAlign: "center" }}>Loading...</div>;
  if (error || !listing) return <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Listing not found.</div>;

  return (
    <div>
      <Link href="/marketplace" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--text-0)", fontWeight: 600 }}>
        <ArrowLeft size={15} /> Back to marketplace
      </Link>

      <div className="detail-split" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        <div className="card" style={{ padding: "1.5rem" }}>
          <ListingGallery listingId={listing.id} fallback={listing.title} />
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
            <span className="badge badge-condition">{listing.condition.replace("_", " ")}</span>
            <span className="badge badge-condition">{listing.type}</span>
            {listing.status === "SOLD" ? <span className="badge badge-sold">Sold</span> : <span className="badge badge-active">Available</span>}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", marginBottom: "0.5rem" }}>
            <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", margin: 0 }}>{listing.title}</h1>
            <FavouriteButton listingId={listing.id} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-2)" }}>listed {timeAgo(listing.created_at)}</div>
            <CopyId value={listing.id} label="listing" />
          </div>
          <p style={{ fontSize: "0.95rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{listing.description}</p>
        </div>

        <aside className="sidebar-sticky" style={{ position: "sticky", top: 90 }}>
          <div className="card" style={{ padding: "1.5rem", marginBottom: "1rem" }}>
            <div style={{ fontSize: "2.1rem", fontWeight: 800, color: "var(--accent)", fontFamily: "var(--font-mono)", marginBottom: "0.25rem" }}>{formatINR(listing.price)}</div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "1.25rem" }}>Negotiable · Campus only</div>

            {!user && (
              <Link href={`/login?next=/listing/${listing.id}`} className="btn btn-primary" style={{ width: "100%" }}>Sign in to contact</Link>
            )}

            {user && !isOwner && listing.status !== "SOLD" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button className="btn btn-gold" onClick={() => setShowOffer(true)}>Make an offer</button>
              </div>
            )}
            {showOffer && listing && (
              <OfferModal listingId={listing.id} price={listing.price} onClose={() => setShowOffer(false)} />
            )}

            {isOwner && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {listing.status !== "SOLD" && (
                  <button className="btn btn-gold" onClick={markSold} disabled={busy}>
                    <CheckCircle2 size={15} /> {busy ? "..." : "Mark as sold"}
                  </button>
                )}
                <Link href={`/listing/${listing.id}/edit`} className="btn btn-outline" style={{ textAlign: "center" }}>
                  Edit listing
                </Link>
                <button className="btn btn-outline" onClick={remove} disabled={busy}>
                  <Trash2 size={15} /> Delete listing
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <PricePulse listingId={listing.id} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <MeetupMap />
          </div>

          <div className="card" style={{ padding: "1.25rem" }}>
            <Link href={`/u/${listing.seller_id}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", fontWeight: 700, color: "var(--accent)", fontSize: "0.9rem", textDecoration: "none" }}>
              <ShieldCheck size={16} /> View seller profile →
            </Link>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>Campus verified</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              <MapPin size={13} /> Campus meetup point
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
