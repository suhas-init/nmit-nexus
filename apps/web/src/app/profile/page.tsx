"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { ImageUploader } from "@/components/image-uploader";
import { Save, Loader2, BadgeCheck } from "lucide-react";

export default function ProfilePage() {
  const { user, accessToken, fetchMe } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [avatar, setAvatar] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setBio(user.bio || "");
      setDepartment(user.department || "");
      setAvatar(user.avatar_url ? [user.avatar_url] : []);
    }
  }, [user]);

  if (!user) return <div className="card" style={{ padding: "3rem", textAlign: "center" }}>Sign in to view your profile.</div>;

  const save = async () => {
    if (!accessToken) return;
    setBusy(true);
    try {
      await api.patch("/auth/me", {
        name,
        bio,
        department,
        avatar_url: avatar[0] || null,
      }, accessToken);
      await fetchMe();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setBusy(false); }
  };

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto" }}>
      <div className="term-label" style={{ marginBottom: "0.5rem" }}>MY_PROFILE</div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-0)", fontFamily: "var(--font-mono)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>Your profile</h1>

      <div className="card" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", overflow: "hidden", background: "var(--bg-2)", border: "1px solid var(--border-0)", display: "grid", placeItems: "center", flexShrink: 0 }}>
            {avatar[0] ? <img src={avatar[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (
              <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{user.name.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--text-0)", fontSize: "1.1rem" }}>{user.name}</div>
            <div className="mono" style={{ fontSize: "0.78rem", color: "var(--text-2)", marginTop: "0.15rem" }}>{user.email}</div>
            <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {user.email_verified && <span className="badge badge-active"><BadgeCheck size={10} /> Verified</span>}
              {user.campus_verified && <span className="badge badge-verified">NMIT</span>}
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>AVATAR</label>
          <ImageUploader urls={avatar} onChange={setAvatar} max={1} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>NAME</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>DEPARTMENT</label>
          <select className="select" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Select department</option>
            {["CSE","ISE","AIML","ECE","EEE","MECH","CIVIL","Other"].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label className="term-label" style={{ display: "block", marginBottom: "0.5rem" }}>BIO</label>
          <textarea className="textarea" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell other students about yourself..." maxLength={500} />
          <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-2)", marginTop: "0.35rem", textAlign: "right" }}>{bio.length}/500</div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center" }}>
          <Link href={`/u/${user.id}`} className="btn btn-outline">View public profile →</Link>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            {saved ? "Saved ✓" : busy ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
