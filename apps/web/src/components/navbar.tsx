"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/store/auth";
import { Home, Package, PlusCircle, Inbox, MessageSquare, LayoutDashboard, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Marketplace", icon: Package },
  { href: "/sell", label: "Sell", icon: PlusCircle },
  { href: "/offers", label: "Offers", icon: Inbox },
  { href: "/conversations", label: "Messages", icon: MessageSquare },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, accessToken, fetchMe, logout } = useAuth();

  useEffect(() => { if (accessToken && !user) fetchMe(); }, [accessToken, user, fetchMe]);

  return (
    <header style={{ background: "white", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 800, color: "var(--navy)", fontSize: "1.1rem" }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--navy)", color: "var(--gold)", display: "grid", placeItems: "center", fontWeight: 900 }}>N</span>
          NMIT Nexus
        </Link>

        <nav style={{ display: "flex", gap: "0.25rem", flex: 1, flexWrap: "wrap" }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className={cn("btn btn-outline", active && "btn-primary")} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <Icon size={15} /> {l.label}
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Link href="/dashboard" className="btn btn-outline" style={{ padding: "0.4rem 0.7rem", fontSize: "0.85rem" }}>
              <UserIcon size={15} /> {user.name.split(" ")[0]}
            </Link>
            <button onClick={logout} className="btn btn-outline" style={{ padding: "0.4rem 0.7rem", fontSize: "0.85rem" }}>
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link href="/login" className="btn btn-outline" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>Login</Link>
            <Link href="/register" className="btn btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem" }}>Sign up</Link>
          </div>
        )}
      </div>
    </header>
  );
}
