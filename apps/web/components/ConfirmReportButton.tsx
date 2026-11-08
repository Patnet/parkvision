"use client";

import { useState } from "react";

interface ConfirmReportButtonProps {
  label: string;
  question: string;
  onConfirm: () => Promise<void> | void;
}

/**
 * P11 — confirmation explicite oui/non/plus tard avant toute publication
 * d'un signalement. Le silence ou "Plus tard" ne publie rien, cf. cahier
 * des charges v1.4 §7, §17.4 (texte transposé du vocal au manuel).
 */
export function ConfirmReportButton({ label, question, onConfirm }: ConfirmReportButtonProps) {
  const [pending, setPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (pending) {
    return (
      <div className="panel" role="group" aria-label={question} style={{ padding: 10 }}>
        <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>{question}</p>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className="primary"
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await onConfirm();
              setSubmitting(false);
              setPending(false);
            }}
          >
            Oui
          </button>
          <button type="button" className="secondary" onClick={() => setPending(false)}>
            Non
          </button>
          <button type="button" className="secondary" onClick={() => setPending(false)}>
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  return (
    <button type="button" className="secondary" onClick={() => setPending(true)}>
      {label}
    </button>
  );
}
