import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="panel" style={{ display: "grid", gap: 20 }}>
      <section>
        <h1>Trouvez une zone où chercher une place</h1>
        <p>
          ParkVision ne garantit pas qu&apos;une place reste disponible. Il vous
          aide à identifier une zone légale et à ouvrir votre navigation
          habituelle vers elle.
        </p>
      </section>
      <section>
        <h2>Comment lire les statuts</h2>
        <p>
          <strong>Confirmé</strong> (source technique fiable) ·{" "}
          <strong>Signalé</strong> (déclaration) · <strong>Inconnu</strong>{" "}
          (aucune donnée fiable) · <strong>Réservé</strong> (PMR ou autre
          restriction, même si vide).
        </p>
      </section>
      <section>
        <h2>Sécurité et vie privée</h2>
        <ul>
          <li>N&apos;utilisez jamais votre téléphone en conduisant.</li>
          <li>Les signalements se font uniquement à l&apos;arrêt.</li>
          <li>Aucune localisation permanente, aucun compte requis pour explorer.</li>
          <li>Consentements séparés et révocables pour chaque fonctionnalité.</li>
        </ul>
      </section>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/" className="primary" style={{ padding: "10px 16px", borderRadius: 6 }}>
          Explorer la carte
        </Link>
        <Link href="/destination" className="secondary" style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid var(--border)" }}>
          Choisir une destination
        </Link>
      </div>
    </div>
  );
}
