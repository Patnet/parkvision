"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchSpacesInBbox, type ParkingSpaceDto } from "@/lib/api";

// Doit rester synchronisé avec services/simulator/src/fixtures.ts (lon, lat)
// — pleine mer, loin de toute route réelle. Voir le commentaire détaillé
// là-bas sur le bug de résolution Waze→Paul-Sougy qui a motivé ce choix.
const SIM_CENTER: [number, number] = [-8.0, 47.5];

const COLOR_BY_OCCUPANCY: Record<string, string> = {
  FREE_CONFIRMED: "#3ccf7a",
  FREE_REPORTED: "#d9b23c",
  OCCUPIED_CONFIRMED: "#e05a5a",
  OCCUPIED_REPORTED: "#e05a5a",
  LIKELY_AVAILABLE: "#d9b23c",
  UNKNOWN: "#6b7684",
  RESERVED_INACCESSIBLE: "#4da3ff",
};

export function ParkingMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [spaceCount, setSpaceCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: SIM_CENTER,
      zoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    // Attribution requise par la licence ODbL des données OpenStreetMap
    // servies par OpenFreeMap — cf. docs/data-source-register.md.
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "© OpenStreetMap contributors (ODbL) via OpenFreeMap",
      }),
    );

    map.on("load", async () => {
      try {
        const bbox: [number, number, number, number] = [
          SIM_CENTER[0] - 0.01,
          SIM_CENTER[1] - 0.01,
          SIM_CENTER[0] + 0.01,
          SIM_CENTER[1] + 0.01,
        ];
        const spaces = await fetchSpacesInBbox(bbox);
        renderMarkers(map, spaces);
        setSpaceCount(spaces.length);
        setStatus("ready");
      } catch {
        setStatus("error");
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderMarkers(map: MapLibreMap, spaces: ParkingSpaceDto[]) {
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = [];

    for (const space of spaces) {
      const el = document.createElement("div");
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.background = COLOR_BY_OCCUPANCY[space.occupancy] ?? COLOR_BY_OCCUPANCY.UNKNOWN;
      el.title = `${space.occupancy} — ${space.rules.map((r) => r.category).join(", ") || "aucune restriction"}`;
      el.style.cursor = "pointer";
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", `Voir la fiche de l'emplacement fictif (${space.occupancy})`);
      el.addEventListener("click", () => {
        window.location.href = `/espace/${space.id}`;
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([space.coordinates.lon, space.coordinates.lat])
        .addTo(map);
      markersRef.current.push(marker);
    }
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "480px", borderRadius: "10px", overflow: "hidden" }}
        role="application"
        aria-label="Carte du quartier fictif SIM-45100"
      />
      <div style={{ marginTop: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {status === "loading" && "Chargement des emplacements fictifs…"}
        {status === "ready" &&
          `${spaceCount} emplacements fictifs chargés depuis l'API de simulation.`}
        {status === "error" &&
          "API indisponible : vérifiez que les services Docker (api, postgres) sont démarrés."}
      </div>
    </div>
  );
}
