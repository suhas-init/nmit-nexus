import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "NMIT Nexus — Campus Commerce OS",
  description: "The trusted campus marketplace for NMIT students. Buy, sell, and find items within your campus community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Providers>
          <Navbar />
          <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
