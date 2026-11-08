import type { Metadata } from "next";
import Link from "next/link";
import { SimulationBadge } from "@/components/SimulationBadge";
import { Splash } from "@/components/Splash";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParkVision — simulation",
  description: "MVP de stationnement intelligent hybride — environnement de simulation SIM-45100.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <ToastProvider>
          <Splash />
          <SimulationBadge />
          <header className="topbar">
            <span className="brand">ParkVision</span>
            <nav className="nav-links" aria-label="Navigation principale">
              <Link href="/">Carte</Link>
              <Link href="/destination">Destination</Link>
              <Link href="/aide">Aide</Link>
              <Link href="/parametres">Paramètres</Link>
              <Link href="/onboarding">Onboarding</Link>
            </nav>
            <ThemeToggle />
          </header>
          <main style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
