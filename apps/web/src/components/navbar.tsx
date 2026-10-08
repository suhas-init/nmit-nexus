"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/auth";
import { Home, Package, PlusCircle, Inbox, MessageSquare, Megaphone, Sparkles, Heart, LayoutDashboard, LogOut, User as UserIcon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotifBell } from "./notif-bell";
import { ThemeToggle } from "./theme-toggle";

const links = [
  { href: "/", label: "Home", icon: Home },
  { href: "/marketplace", label: "Market", icon: Package },
  { href: "/ai", label: "AI", icon: Sparkles },
  { href: "/wanted", label: "Wanted", icon: Megaphone },
  { href: "/sell", label: "Sell", icon: PlusCircle },
  { href: "/favourites", label: "Saved", icon: Heart },
  { href: "/offers", label: "Offers", icon: Inbox },
  { href: "/conversations", label: "Chat", icon: MessageSquare },
  { href: "/dashboard", label: "Dash", icon: LayoutDashboard },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, accessToken, fetchMe, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { if (accessToken && !user) fetchMe(); }, [accessToken, user, fetchMe]);
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <header style={{ background: "var(--bg-1)", borderBottom: "1px solid var(--border-0)", position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0.65rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--text-0)", fontSize: "0.92rem", fontFamily: "var(--font-mono)", textDecoration: "none", letterSpacing: "-0.02em", flexShrink: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)", color: "#08090B", display: "grid", placeItems: "center", fontWeight: 900, fontSize: "0.9rem" }}>N</span>
          <span className="hide-xs">nmit_nexus</span>
        </Link>

        <nav className="desktop-nav" style={{ display: "flex", gap: "0.15rem", flex: 1, flexWrap: "wrap" }}>
          {links.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            const Icon = l.icon;
            return (
              <Link key={l.href} href={l.href} className={cn("btn", "nav-link", active ? "btn-primary" : "btn-outline")} style={{ padding: "0.35rem 0.7rem", fontSize: "0.72rem" }}>
                <Icon size={13} /> <span className="nav-label">{l.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "auto" }}>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className="btn btn-outline" style={{ padding: "0.35rem 0.65rem", fontSize: "0.72rem" }}>
                <UserIcon size={13} /> <span className="hide-xs">{user.name.split(" ")[0]}</span>
              </Link>
              <NotifBell />
              <button onClick={logout} className="btn btn-outline" style={{ padding: "0.35rem 0.6rem", fontSize: "0.72rem" }}>
                <LogOut size={13} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-outline" style={{ padding: "0.35rem 0.8rem", fontSize: "0.72rem" }}>Login</Link>
              <Link href="/register" className="btn btn-primary hide-xs" style={{ padding: "0.35rem 0.8rem", fontSize: "0.72rem" }}>Sign up</Link>
            </>
          )}
          <button
            className="mobile-menu-btn btn btn-outline"
            onClick={() => setMobileOpen((v) => !v)}
            style={{ padding: "0.35rem 0.55rem", fontSize: "0.72rem", display: "none" }}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={14} /> : <Menu size={14} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-menu" style={{ borderTop: "1px solid var(--border-0)", padding: "0.6rem 1rem 0.85rem", background: "var(--bg-1)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.4rem" }}>
            {links.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href} className={cn("btn", active ? "btn-primary" : "btn-outline")} style={{ padding: "0.55rem 0.7rem", fontSize: "0.78rem", justifyContent: "flex-start" }}>
                  <Icon size={14} /> {l.label}
                </Link>
              );
            })}
          </div>
          {!user && (
            <Link href="/register" className="btn btn-primary" style={{ width: "100%", marginTop: "0.6rem", padding: "0.55rem", fontSize: "0.78rem" }}>
              Sign up
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
