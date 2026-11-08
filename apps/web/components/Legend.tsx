const ITEMS = [
  { color: "var(--free-confirmed)", label: "Libre confirmée (source instrumentée)" },
  { color: "var(--free-reported)", label: "Libre signalée (déclaration)" },
  { color: "var(--occupied)", label: "Occupée" },
  { color: "var(--unknown)", label: "Inconnue" },
  { color: "var(--pmr)", label: "Réservée / PMR" },
];

export function Legend() {
  return (
    <div className="legend" aria-label="Légende des statuts">
      {ITEMS.map((item) => (
        <span className="legend-item" key={item.label}>
          <span className="dot" style={{ background: item.color }} aria-hidden />
          {item.label}
        </span>
      ))}
    </div>
  );
}
