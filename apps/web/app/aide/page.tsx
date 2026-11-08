import { Legend } from "@/components/Legend";

export default function AidePage() {
  return (
    <div className="panel" style={{ display: "grid", gap: 16 }}>
      <h1>Aide et légende</h1>
      <Legend />
      <section>
        <h2>Ce que montrent les couleurs</h2>
        <p>
          Les statuts d&apos;occupation (libre/occupée/inconnue) sont{" "}
          <strong>distincts</strong> des restrictions légales (PMR, livraison,
          privé, résident, horaires). Une place PMR vide reste réservée et
          n&apos;apparaît jamais comme une option ordinaire pour un conducteur
          non autorisé.
        </p>
      </section>
      <section>
        <h2>Limites connues</h2>
        <ul>
          <li>Toutes les données affichées ici sont <strong>fictives</strong> (SIM-45100).</li>
          <li>Les distances affichées sont à vol d&apos;oiseau, pas un itinéraire piéton réel.</li>
          <li>Un signalement manuel n&apos;est jamais une confirmation technique.</li>
          <li>ParkVision n&apos;ouvre qu&apos;un lien vers Waze/Maps/Plans : aucune lecture de votre trajet.</li>
          <li>La détection automatique de stationnement n&apos;est pas activée dans ce lot.</li>
        </ul>
      </section>
      <section>
        <h2>Sources</h2>
        <p>
          Environnement de simulation uniquement. Aucune source municipale,
          capteur ou donnée de rue réelle n&apos;est utilisée dans les lots 1-2.
        </p>
      </section>
    </div>
  );
}
