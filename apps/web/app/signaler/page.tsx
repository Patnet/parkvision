"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { LoadingState } from "@/components/SystemStates";
import { submitReport } from "@/lib/api";

const REASONS = [
  { value: "WRONG_RULE", label: "Règle incorrecte (ex. PMR/livraison erronée)" },
  { value: "WRONG_LOCATION", label: "Position incorrecte sur la carte" },
  { value: "STALE_DATA", label: "Donnée visiblement périmée" },
  { value: "ABUSE", label: "Signalement abusif ou malveillant d'un autre utilisateur" },
  { value: "OTHER", label: "Autre" },
] as const;

/**
 * P21 — Signalement d'abus/correction, sans dénonciation nominative :
 * on corrige une donnée, on ne désigne jamais une personne.
 */
export default function SignalerPage() {
  return (
    <Suspense fallback={<LoadingState label="Chargement…" />}>
      <SignalerForm />
    </Suspense>
  );
}

function SignalerForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetType = (searchParams.get("targetType") ?? "SPACE") as "SPACE" | "SEGMENT" | "OBSERVATION";
  const targetId = searchParams.get("targetId") ?? "";
  const [reason, setReason] = useState<typeof REASONS[number]["value"]>("WRONG_RULE");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) {
      showToast("Aucun élément ciblé : ouvrez ce formulaire depuis une fiche emplacement.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await submitReport({ targetType, targetId, reason, details: details || undefined });
      showToast("Signalement envoyé, merci. Il sera examiné.", "success");
      router.push("/");
    } catch {
      showToast("Signalement impossible pour l'instant.", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel" style={{ display: "grid", gap: 16, maxWidth: 480 }}>
      <h1 style={{ marginTop: 0 }}>Signaler une erreur</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Ce formulaire sert à corriger une information (règle, position,
        donnée périmée) ou signaler un abus — jamais à dénoncer nommément une
        personne.
      </p>
      {!targetId && (
        <p role="alert" style={{ color: "var(--occupied)" }}>
          Aucun élément ciblé. Revenez depuis une fiche emplacement via « Signaler une erreur ».
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label htmlFor="reason">Motif</label>
        <select id="reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <label htmlFor="details">Détails (facultatif)</label>
        <textarea
          id="details"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={500}
          rows={4}
          style={{
            background: "var(--bg)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: 10,
          }}
        />
        <button type="submit" className="primary" disabled={submitting || !targetId}>
          {submitting ? "Envoi…" : "Envoyer le signalement"}
        </button>
      </form>
    </div>
  );
}
