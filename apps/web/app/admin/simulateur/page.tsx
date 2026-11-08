"use client";

import { useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { useToast } from "@/components/ToastProvider";
import { resetSimulation } from "@/lib/adminApi";

function SimulatorControl({ token }: { token: string }) {
  const [resetting, setResetting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleReset() {
    setResetting(true);
    try {
      const result = await resetSimulation(token);
      setSummary(
        `${result.summary.streets} rues, ${result.summary.spaces} emplacements ` +
          `(${result.summary.freeReported} libres signalés, ${result.summary.occupiedReported} occupés signalés).`,
      );
      showToast("Simulation SIM-45100 réinitialisée.", "success");
    } catch {
      showToast("Réinitialisation impossible pour l'instant.", "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Contrôle du simulateur (A05)</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Réinitialisation reproductible du quartier fictif SIM-45100 (graine
        fixe). N&apos;affecte jamais de données réelles.
      </p>
      <button type="button" className="primary" onClick={handleReset} disabled={resetting}>
        {resetting ? "Réinitialisation…" : "Réinitialiser SIM-45100"}
      </button>
      {summary && <p style={{ marginTop: 10 }}>{summary}</p>}
    </section>
  );
}

export default function AdminSimulatorPage() {
  return <AdminGate>{(token) => <SimulatorControl token={token} />}</AdminGate>;
}
