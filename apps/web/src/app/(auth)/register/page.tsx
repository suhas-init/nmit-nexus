"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/store/auth";

const schema = z.object({
  name: z.string().min(2, "Name is too short").max(120),
  email: z.string().email("Enter a valid email").refine((v) => v.toLowerCase().endsWith("@gmail.com"), "Only Gmail addresses are accepted"),
  password: z.string().min(8, "At least 8 characters"),
  department: z.string().max(60).optional(),
});
type FormData = z.infer<typeof schema>;

const DEPARTMENTS = ["CSE", "ISE", "AIML", "ECE", "EEE", "MECH", "CIVIL", "Other"];

export default function RegisterPage() {
  const router = useRouter();
  const { setTokens, fetchMe } = useAuth();
  const [err, setErr] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setErr(null);
    try {
      const res = await api.post<{ access_token: string; refresh_token: string }>("/auth/register", data);
      setTokens(res.access_token, res.refresh_token);
      await fetchMe();
      router.push("/verify");
    } catch (e) {
      const err = e as ApiError;
      setErr(err.detail || "Registration failed");
    }
  };

  return (
    <div style={{ maxWidth: 460, margin: "3rem auto" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-0)", marginBottom: "0.35rem" }}>Create your account</h1>
        <p style={{ fontSize: "0.9rem", marginBottom: "1.5rem" }}>Sign up with your Gmail. We'll send a 6-digit code to verify.</p>

        {err && <div style={{ padding: "0.6rem 0.85rem", background: "#fdeaea", color: "#b42318", borderRadius: 8, fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</div>}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Full name</label>
            <input className="input" {...register("name")} />
            {errors.name && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.name.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Campus email</label>
            <input className="input" type="email" placeholder="you@gmail.com" {...register("email")} />
            {errors.email && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.email.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Password</label>
            <input className="input" type="password" {...register("password")} />
            {errors.password && <p style={{ color: "#b42318", fontSize: "0.78rem", marginTop: "0.25rem" }}>{errors.password.message}</p>}
          </div>
          <div>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-0)", display: "block", marginBottom: "0.35rem" }}>Department <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
            <select className="select" {...register("department")}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: "0.5rem" }}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
        </form>

        <p style={{ fontSize: "0.85rem", marginTop: "1.25rem", textAlign: "center" }}>
          Already registered? <Link href="/login" style={{ color: "var(--text-0)", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
