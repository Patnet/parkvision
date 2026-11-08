"use client";

import { AdminGate } from "@/components/AdminGate";

const PROTOCOL_MARKDOWN = `# Protocole du pilote manuel — rue Paul-Sougy, Orléans (45100)

Document généré depuis ParkVision (A09). Aucune donnée réelle incluse — gabarit à remplir sur le terrain.
Cf. cahier des charges v1.4 §19 et §24.4.

## Préalable obligatoire

- [ ] Inventaire terrain réel des places publiques, règles, panneaux, PMR, zones privées et horaires rue Paul-Sougy
- [ ] Autorisations et bases légales RGPD vérifiées avant toute collecte
- [ ] Ne jamais supposer un nombre de places : seul l'inventaire terrain fait foi (60 places = simulateur uniquement, pas la rue réelle)

## Étapes

1. **Simulation** — déjà couverte par les lots 1-2 (quartier fictif SIM-45100), aucun mélange avec les données réelles
2. **Audit terrain** — inventaire manuel des places et tronçons autorisés, côté de rue, panneaux, PMR, zones privées et horaires ; provenance, date et incertitude enregistrées ; pas de surveillance vidéo
3. **Tests sur téléphones** — au minimum un Android et un iPhone ; premier plan, arrière-plan, écran verrouillé, permissions limitées, mode économie d'énergie, perte réseau, Bluetooth absent
4. **Collecte encadrée** — cible 100 trajets/tests documentés (vrais stationnements + cas négatifs : feu, bouchon, dépose-minute, passager, garage) ; confirmations uniquement à l'arrêt
5. **Évaluation** — matrice de confusion arrivée/départ, faux positifs par heure, événements manqués, délai médian, précision géographique, autonomie consommée, refus de permissions, taux de confirmations

## Participants et durée (objectifs d'essai, pas une garantie)

- 20–30 volontaires visés
- 3–4 semaines
- Au moins 100 observations contrôlées
- Consentement explicite, possibilité de retrait à tout moment
- Aucune interaction avec le téléphone pendant la conduite

## Seuils de décision à fixer AVANT la collecte (§24.4 — exploratoires, non validés scientifiquement)

- [ ] ≥ 70 % des signalements contrôlés encore exacts à 5 minutes — seuil à confirmer/ajuster avant le pilote
- [ ] ≥ 60 % des répondants jugeant le service utile — seuil à confirmer/ajuster avant le pilote
- [ ] Dénominateur, protocole d'échantillonnage et intervalles d'incertitude définis par écrit avant la collecte

## Décision go/no-go à l'issue du pilote

- **GO** si usages utiles et reproductibles observés, fraîcheur transparente, risque de fausses annonces acceptable selon critères prédéfinis
- **PIVOT** vers carte réglementaire/parkings équipés/partenariats si couverture communautaire trop faible mais données statiques utiles
- **NO-GO automatisation** si rien ne justifie que plus d'observations amélioreraient la valeur — documenter les résultats négatifs aussi

## Vie privée

- Pas de suivi permanent obligatoire ; mode manuel toujours disponible
- Géolocalisation précise uniquement si nécessaire et consentie
- Minimum de données, TTL documenté, purge testée
- Ne jamais exposer horaires récurrents ou domicile des volontaires

---
Généré le ${new Date().toISOString().slice(0, 10)} — ParkVision, environnement de simulation, aucune donnée réelle.
`;

const METRICS_CSV_HEADER =
  "date,participant_id_anonyme,tranche_horaire,type_evenement,espace_ou_tronçon,source,verification_terrain,delai_minutes,resultat_matrice_confusion,commentaire\n";

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PilotPrep() {
  return (
    <section className="panel">
      <h1 style={{ marginTop: 0 }}>Préparation du pilote (A09)</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Export de protocole et gabarit de métriques — sans données réelles.
        Rien ici n&apos;autorise ni ne démarre une collecte réelle : cette page
        prépare uniquement les documents, conformément à §19/§24.4 du cahier
        des charges. Le démarrage effectif reste soumis à décision explicite
        du porteur de projet.
      </p>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        <button
          type="button"
          className="primary"
          onClick={() => download("protocole-pilote-paul-sougy.md", PROTOCOL_MARKDOWN, "text/markdown")}
        >
          Télécharger le protocole (Markdown)
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => download("gabarit-metriques-pilote.csv", METRICS_CSV_HEADER, "text/csv")}
        >
          Télécharger le gabarit de métriques (CSV, vide)
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h2>Aperçu du protocole</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 16,
            fontSize: "0.85rem",
            maxHeight: 480,
            overflowY: "auto",
          }}
        >
          {PROTOCOL_MARKDOWN}
        </pre>
      </div>
    </section>
  );
}

export default function AdminPilotPage() {
  return <AdminGate>{() => <PilotPrep />}</AdminGate>;
}
