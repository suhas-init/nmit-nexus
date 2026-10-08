import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { CursorGlow } from "@/components/cursor-glow";
import { GridBg } from "@/components/grid-bg";
import { CommandPalette } from "@/components/command-palette";
import { VerifyBanner } from "@/components/verify-banner";
import { ScrollProgress } from "@/components/scroll-progress";
import { ThemeBootstrap } from "@/components/theme-bootstrap";
import { PwaRegister } from "@/components/pwa-register";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  manifest: "/manifest.json",
  themeColor: "#08090B",
  title: "NMIT Nexus — Campus Commerce OS",
  description: "The trusted campus marketplace for NMIT students. Buy, sell, and find items within your campus community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-0)" }}>
        <ThemeBootstrap />
        <PwaRegister />
        <ScrollProgress />
        <GridBg />
        <CursorGlow />
        <Providers>
          <CommandPalette />
          <Navbar />
          <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
            <VerifyBanner />
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
