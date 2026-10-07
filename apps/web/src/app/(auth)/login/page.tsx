"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/marketplace";
  const { setTokens, fetchMe } = useAuth();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setErr(null);
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>("/auth/login", data);
      setTokens(res.access_token, res.refresh_token);
      await fetchMe();
      router.push(next);
    } catch (e) {
      const err = e as ApiError;
      setErr(err.detail || "Login failed");
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "3rem auto" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--navy)", marginBottom: "0.35rem" }}>Welcome back</h1>
        <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Sign in to your NMIT Nexus account.</p>

        {err && <div style={{ padding: "0.6rem 0.85rem", background: "#fdeaea", color: "#b42318", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</div>}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", display: "block", marginBottom: "0.35rem" }}>Email</label>
            <input className="input" type="email" autoComplete="email" {...register("email")} />
            {errors.email && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.email.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--navy)", display: "block", marginBottom: "0.35rem" }}>Password</label>
            <input className="input" type="password" autoComplete="current-password" {...register("password")} />
            {errors.password && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.password.message}</p>}
          </div>
          <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: "0.5rem" }}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={{ fontSize: "0.85rem", marginTop: "1.25rem", textAlign: "center" }}>
          No account? <Link href="/register" style={{ color: "var(--navy)", fontWeight: 600 }}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div style={{ textAlign: "center", padding: "3rem" }}>Loading...</div>}><LoginForm /></Suspense>;
}
