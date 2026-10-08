"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ApiError, Category } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { BookSearch, BookHit } from "@/components/book-search";
import { AiDraft } from "@/components/ai-draft";
import { ImageUploader } from "@/components/image-uploader";
import Link from "next/link";

const schema = z.object({
  title: z.string().min(3, "At least 3 characters").max(200),
  description: z.string().min(10, "Describe the item in a bit more detail").max(5000),
  price: z.coerce.number().min(0, "Price can’t be negative"),
  category_id: z.string().optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "GOOD", "FAIR", "POOR"]),
  type: z.enum(["SELL", "RENT", "BORROW", "FREE"]),
});
type FormData = z.infer<typeof schema>;

const CONDITIONS = [
  { v: "NEW", l: "New" }, { v: "LIKE_NEW", l: "Like new" },
  { v: "GOOD", l: "Good" }, { v: "FAIR", l: "Fair" }, { v: "POOR", l: "Poor" },
];
const TYPES = [
  { v: "SELL", l: "Sell" }, { v: "RENT", l: "Rent" },
  { v: "BORROW", l: "Borrow" }, { v: "FREE", l: "Free" },
];

export default function SellPage() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [err, setErr] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get<Category[]>("/categories"),
  });

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { condition: "GOOD", type: "SELL", price: 0 },
  });

  const onBookPick = (b: BookHit) => {
    setValue("title", b.title, { shouldValidate: true });
    const lines = [
      b.authors.length ? `Author: ${b.authors.join(", ")}` : null,
      b.publisher ? `Publisher: ${b.publisher}` : null,
      b.publishedDate ? `Year: ${b.publishedDate}` : null,
      b.isbn ? `ISBN: ${b.isbn}` : null,
      b.pageCount ? `Pages: ${b.pageCount}` : null,
      "",
      "Condition: (edit me)",
      "Reason for selling: (edit me)",
    ].filter(Boolean);
    setValue("description", lines.join("\n"), { shouldValidate: true });

    const academics = categories?.find((c) => c.slug === "academics" || c.slug === "books");
    if (academics) setValue("category_id", academics.id);
  };

  const onSubmit = async (data: FormData) => {
    if (!accessToken) { router.push("/login?next=/sell"); return; }
    setErr(null);
    try {
      const payload = { ...data, category_id: data.category_id || null };
      const created = await api.post<{ id: string }>("/listings", payload, accessToken);
      if (imageUrls.length > 0) {
        try {
          await api.post(`/listings/${created.id}/images`, { urls: imageUrls }, accessToken);
        } catch {}
      }
      router.push(`/listing/${created.id}`);
    } catch (e) {
      const err = e as ApiError;
      setErr(err.detail || "Could not create listing");
    }
  };

  if (!user) {
    return (
      <div style={{ maxWidth: 480, margin: "3rem auto", textAlign: "center" }} className="card">
        <div style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ fontWeight: 800, color: "var(--text-0)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Sign in to sell</div>
          <p style={{ fontSize: "0.9rem", marginBottom: "1.25rem" }}>Only verified students can post listings.</p>
          <Link href="/login?next=/sell" className="btn btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.35rem" }}>Post an item</h1>
      <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Describe it clearly. Honest listings sell faster.</p>

      {err && <div style={{ padding: "0.6rem 0.85rem", background: "#fdeaea", color: "#b42318", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</div>}

      <AiDraft
        categories={categories}
        onAccept={(draft, categoryId) => {
          setValue("title", draft.title, { shouldValidate: true });
          setValue("description", draft.description, { shouldValidate: true });
          const mid = Math.round((draft.suggested_price_min + draft.suggested_price_max) / 2);
          setValue("price", mid, { shouldValidate: true });
          setValue("condition", draft.condition as any, { shouldValidate: true });
          if (categoryId) setValue("category_id", categoryId, { shouldValidate: true });
        }}
      />

      <div style={{ marginBottom: "1rem" }}>
        <BookSearch onPick={onBookPick} />
      </div>

      <div className="card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
        <ImageUploader urls={imageUrls} onChange={setImageUrls} max={5} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Title</label>
          <input className="input" placeholder="Casio FX-991CW" {...register("title")} />
          {errors.title && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.title.message}</p>}
        </div>

        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Description</label>
          <textarea className="textarea" rows={5} placeholder="Condition, accessories, reason for selling..." {...register("description")} />
          {errors.description && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.description.message}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Price (₹)</label>
            <input className="input" type="number" min={0} {...register("price")} />
            {errors.price && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.price.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Category</label>
            <select className="select" {...register("category_id")}>
              <option value="">Select category</option>
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Condition</label>
            <select className="select" {...register("condition")}>
              {CONDITIONS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Listing type</label>
            <select className="select" {...register("type")}>
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: "0.5rem" }}>
          {isSubmitting ? "Posting..." : "Post listing"}
        </button>
      </form>
    </div>
  );
}
