"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { fetchAdminSettings, type AdminSettingsDto } from "@/lib/adminApi";

function Settings({ token }: { token: string }) {
  const [settings, setSettings] = useState<AdminSettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminSettings(token)
      .then(setSettings)
      .catch(() => setError("Paramètres indisponibles."));
  }, [token]);

  if (error) return <ErrorState message={error} />;
  if (!settings) return <LoadingState label="Chargement des paramètres…" />;

  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Paramètres et sources (A08)</h1>
      <p>TTL des observations : {settings.observationTtlMinutes} minutes.</p>
      <h2>Adaptateurs</h2>
      <ul>
        {Object.entries(settings.adapters).map(([name, info]) => (
          <li key={name}>
            <strong>{name}</strong> — {info.kind} — {info.status}
            {info.scope ? ` (${info.scope})` : ""}
          </li>
        ))}
      </ul>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{settings.adminAuth}</p>
    </section>
  );
}

export default function AdminSettingsPage() {
  return <AdminGate>{(token) => <Settings token={token} />}</AdminGate>;
}
