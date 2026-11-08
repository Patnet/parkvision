"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "auto";

/**
 * P17 — Paramètres : thème, langue, accessibilité, confidentialité.
 * Lecture/écriture limitées au thème en lot 1-2 ; le reste est informatif
 * (pas de compte, pas de collecte à révoquer dans cet environnement).
 */
export default function ParametresPage() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("parkvision-theme") as Theme | null;
      if (stored) setTheme(stored);
    } catch {
      // ignoré : stockage indisponible
    }
  }, []);

  function updateTheme(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem("parkvision-theme", next);
    } catch {
      // ignoré
    }
  }

  return (
    <div className="panel" style={{ display: "grid", gap: 20 }}>
      <h1 style={{ marginTop: 0 }}>Paramètres</h1>

      <section>
        <h2>Apparence</h2>
        <div role="radiogroup" aria-label="Thème" style={{ display: "flex", gap: 8 }}>
          {(["dark", "light", "auto"] as Theme[]).map((t) => (
            <button
              key={t}
              type="button"
              className={theme === t ? "primary" : "secondary"}
              aria-pressed={theme === t}
              onClick={() => updateTheme(t)}
            >
              {t === "dark" ? "Sombre" : t === "light" ? "Clair" : "Automatique"}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Langue</h2>
        <p style={{ color: "var(--text-muted)" }}>Français uniquement dans ce lot.</p>
      </section>

      <section>
        <h2>Accessibilité</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Contraste WCAG AA, cibles tactiles ≥44×44 px, navigation clavier et
          lecteur d&apos;écran pris en charge sur les pages de ce lot.
        </p>
      </section>

      <section>
        <h2>Confidentialité</h2>
        <ul style={{ color: "var(--text-muted)" }}>
          <li>Aucun compte, aucune localisation permanente dans cet environnement.</li>
          <li>Aucune donnée personnelle collectée au-delà de ce qui reste local à votre navigateur (préférence de thème).</li>
          <li>Rien à supprimer : aucune donnée serveur n&apos;est associée à votre identité ici.</li>
        </ul>
      </section>
    </div>
  );
}
