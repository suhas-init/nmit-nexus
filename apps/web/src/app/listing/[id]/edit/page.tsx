"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, Category, Listing } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { ImageUploader } from "@/components/image-uploader";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const CONDITIONS = [
  { v: "NEW", l: "New" },
  { v: "LIKE_NEW", l: "Like new" },
  { v: "GOOD", l: "Good" },
  { v: "FAIR", l: "Fair" },
  { v: "POOR", l: "Poor" },
];
const TYPES = [
  { v: "SELL", l: "Sell" },
  { v: "RENT", l: "Rent" },
  { v: "BORROW", l: "Borrow" },
  { v: "FREE", l: "Free" },
];

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, accessToken } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("GOOD");
  const [type, setType] = useState("SELL");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const { data: listing } = useQuery<Listing>({
    queryKey: ["listing", id],
    queryFn: () => api.get<Listing>(`/listings/${id}`),
  });

  useEffect(() => {
    if (!listing || loaded) return;
    setTitle(listing.title);
    setDescription(listing.description);
    setPrice(String(listing.price));
    setCategoryId(listing.category_id || "");
    setCondition(listing.condition);
    setType(listing.type);
    api.get<{ url: string }[]>(`/listings/${id}/images`)
      .then((imgs) => setImages((imgs || []).map((i) => i.url)))
      .catch(() => {});
    setLoaded(true);
  }, [listing, id, loaded]);

  if (!user || (listing && user.id !== listing.seller_id)) {
    return (
      <div className="card" style={{ padding: "3rem 1.5rem", textAlign: "center", maxWidth: 460, margin: "3rem auto" }}>
        <div style={{ fontWeight: 700, color: "var(--text-0)", marginBottom: "0.5rem" }}>Not allowed</div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-1)", marginBottom: "1.25rem" }}>Only the seller can edit this listing.</div>
        <Link href={`/listing/${id}`} className="btn btn-primary">Back to listing</Link>
      </div>
    );
  }

  const submit = async () => {
    if (!accessToken) return;
    setBusy(true); setErr(null);
    try {
      await api.patch(`/listings/${id}`, {
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category_id: categoryId || null,
        condition,
        type,
      }, accessToken);
      await api.post(`/listings/${id}/images`, { urls: images }, accessToken);
      router.push(`/listing/${id}`);
    } catch (e: any) {
      setErr(e.detail || "Could not save changes");
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <Link href={`/listing/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.9rem", marginBottom: "1rem", color: "var(--text-1)", fontWeight: 600 }}>
        <ArrowLeft size={15} /> Back to listing
      </Link>

      <h1 style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", marginBottom: "0.35rem" }}>Edit listing</h1>
      <p style={{ fontSize: "0.9rem", color: "var(--text-2)", marginBottom: "1.5rem" }}>Update your listing details.</p>

      {err && <div className="mono" style={{ padding: "0.6rem 0.85rem", background: "rgba(248,113,113,0.08)", color: "var(--red)", borderRadius: 6, fontSize: "0.8rem", marginBottom: "1rem", border: "1px solid rgba(248,113,113,0.2)" }}>{err}</div>}

      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>TITLE</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>DESCRIPTION</label>
          <textarea className="textarea" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <ImageUploader urls={images} onChange={setImages} max={5} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>PRICE (₹)</label>
            <input className="input" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>CATEGORY</label>
            <select className="select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Select category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>CONDITION</label>
            <select className="select" value={condition} onChange={(e) => setCondition(e.target.value)}>
              {CONDITIONS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>TYPE</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" onClick={submit} disabled={busy} style={{ marginTop: "0.5rem" }}>
          {busy ? <><Loader2 size={14} className="spin" /> Saving…</> : <><Save size={14} /> Save changes</>}
        </button>
      </div>
    </div>
  );
}
