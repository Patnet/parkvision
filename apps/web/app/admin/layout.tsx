import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <nav
        aria-label="Navigation admin"
        style={{ display: "flex", gap: 14, borderBottom: "1px solid var(--border)", paddingBottom: 10 }}
      >
        <Link href="/admin">Tableau de bord</Link>
        <Link href="/admin/zones">Zones</Link>
        <Link href="/admin/emplacements">Emplacements</Link>
        <Link href="/admin/observations">Observations</Link>
        <Link href="/admin/simulateur">Simulateur</Link>
        <Link href="/admin/pilote">Pilote</Link>
        <Link href="/admin/parametres">Paramètres</Link>
      </nav>
      {children}
    </div>
  );
}
