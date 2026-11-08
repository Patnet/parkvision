"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "@/lib/api";

const MIN_DISPLAY_MS = 600;
const SESSION_KEY = "parkvision-splash-shown";

/**
 * P00 — Splash/initialisation : logo, contrôle de version (statique en
 * lot 1-2), état réseau. Affiché une fois par session navigateur, jamais
 * bloquant au-delà d'un contrôle de connectivité rapide.
 */
export function Splash() {
  const [visible, setVisible] = useState(false);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // stockage indisponible : on affiche quand même, sans persistance
    }
    if (alreadyShown) return;

    setVisible(true);
    const start = Date.now();

    fetchHealth().then((ok) => {
      setApiReachable(ok);
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(() => {
        setVisible(false);
        try {
          window.sessionStorage.setItem(SESSION_KEY, "1");
        } catch {
          // ignoré
        }
      }, remaining);
    });
  }, []);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-label="Chargement de ParkVision"
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        zIndex: 2000,
      }}
    >
      <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>ParkVision</div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
        {apiReachable === null && "Initialisation…"}
        {apiReachable === true && "Connexion établie."}
        {apiReachable === false && "Hors ligne — mode manuel disponible."}
      </div>
    </div>
  );
}
