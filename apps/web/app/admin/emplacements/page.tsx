"use client";

import { useEffect, useState } from "react";
import { AdminGate } from "@/components/AdminGate";
import { ErrorState, LoadingState } from "@/components/SystemStates";
import { useToast } from "@/components/ToastProvider";
import {
  addAdminRule,
  deleteAdminRule,
  fetchAdminSpaces,
  updateAdminSpace,
  type AdminSpaceDto,
} from "@/lib/adminApi";

const CATEGORIES = ["GENERAL", "PMR", "DELIVERY", "EV", "PRIVATE", "RESIDENT", "NO_PARKING", "TEMPORARY"];

function SpaceRow({
  space,
  token,
  onChanged,
}: {
  space: AdminSpaceDto;
  token: string;
  onChanged: () => void;
}) {
  const [newCategory, setNewCategory] = useState("GENERAL");
  const { showToast } = useToast();

  async function handleStatusChange(inventoryStatus: string) {
    try {
      await updateAdminSpace(token, space.id, { inventoryStatus });
      onChanged();
    } catch {
      showToast("Mise à jour impossible.", "error");
    }
  }

  async function handleVisibilityToggle() {
    try {
      await updateAdminSpace(token, space.id, {
        visibility: space.visibility === "PUBLIC" ? "HIDDEN" : "PUBLIC",
      });
      onChanged();
    } catch {
      showToast("Mise à jour impossible.", "error");
    }
  }

  async function handleAddRule() {
    try {
      await addAdminRule(token, space.id, {
        category: newCategory,
        permitRequired: newCategory === "PMR" || newCategory === "PRIVATE" || newCategory === "RESIDENT",
        recurringSchedule: null,
      });
      showToast("Restriction ajoutée.", "success");
      onChanged();
    } catch {
      showToast("Ajout impossible.", "error");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    try {
      await deleteAdminRule(token, ruleId);
      onChanged();
    } catch {
      showToast("Suppression impossible.", "error");
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      <td style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{space.id.slice(0, 8)}</td>
      <td>{space.occupancy}</td>
      <td>
        <select value={space.inventoryStatus} onChange={(e) => handleStatusChange(e.target.value)}>
          <option value="KNOWN">KNOWN</option>
          <option value="ASSUMED">ASSUMED</option>
          <option value="UNVERIFIED">UNVERIFIED</option>
        </select>
      </td>
      <td>
        <button type="button" className="secondary" onClick={handleVisibilityToggle}>
          {space.visibility}
        </button>
      </td>
      <td>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {space.rules.map((r) => (
            <span
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 999,
                padding: "2px 8px",
                fontSize: "0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {r.category}
              <button
                type="button"
                aria-label={`Supprimer la restriction ${r.category}`}
                onClick={() => handleDeleteRule(r.id)}
                style={{ background: "none", border: "none", color: "var(--occupied)", cursor: "pointer" }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="button" className="secondary" onClick={handleAddRule}>
            + Ajouter
          </button>
        </div>
      </td>
    </tr>
  );
}

function EmplacementsAdmin({ token }: { token: string }) {
  const [spaces, setSpaces] = useState<AdminSpaceDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setSpaces(await fetchAdminSpaces(token));
    } catch {
      setError("Emplacements indisponibles.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!spaces) return <LoadingState label="Chargement des emplacements…" />;

  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Gestion des emplacements (A04)</h1>
      <p style={{ color: "var(--text-muted)" }}>
        {spaces.length} emplacements fictifs SIM-45100. Modifications appliquées
        directement en base — environnement de simulation uniquement.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
              <th>ID</th>
              <th>Occupation</th>
              <th>Statut inventaire</th>
              <th>Visibilité</th>
              <th>Restrictions</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((s) => (
              <SpaceRow key={s.id} space={s} token={token} onChanged={load} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AdminEmplacementsPage() {
  return <AdminGate>{(token) => <EmplacementsAdmin token={token} />}</AdminGate>;
}
