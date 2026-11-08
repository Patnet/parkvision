"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { fetchRoadsInBbox, fetchSpacesInBbox, type ParkingSpaceDto, type RoadDto } from "@/lib/api";

const ROADS_SOURCE_ID = "sim-roads";
const ROADS_LAYER_ID = "sim-roads-line";

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
  const [roadCount, setRoadCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: SIM_CENTER,
      // Zoom 15 montrait les 4 rues d'un coup, mais à cette échelle
      // (~3 m/pixel) le décalage latéral réaliste des places (quelques
      // mètres) est plus petit que le rayon des marqueurs (~9 px) : la
      // polyline de rue restait entièrement cachée sous les marqueurs.
      // À 18 (~0.4 m/pixel), le même décalage dépasse le rayon du
      // marqueur et la rue redevient visible entre les deux rangées.
      zoom: 18,
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
        const [spaces, roads] = await Promise.all([
          fetchSpacesInBbox(bbox),
          fetchRoadsInBbox(bbox),
        ]);
        renderRoads(map, roads);
        renderMarkers(map, spaces);
        setSpaceCount(spaces.length);
        setRoadCount(roads.length);
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

  function renderRoads(map: MapLibreMap, roads: RoadDto[]) {
    const geojson = {
      type: "FeatureCollection" as const,
      features: roads.map((road) => ({
        type: "Feature" as const,
        properties: { name: road.name },
        geometry: road.geometry,
      })),
    };

    if (map.getSource(ROADS_SOURCE_ID)) {
      (map.getSource(ROADS_SOURCE_ID) as maplibregl.GeoJSONSource).setData(
        geojson as GeoJSON.FeatureCollection,
      );
      return;
    }

    map.addSource(ROADS_SOURCE_ID, { type: "geojson", data: geojson as GeoJSON.FeatureCollection });
    map.addLayer(
      {
        id: ROADS_LAYER_ID,
        type: "line",
        source: ROADS_SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#1a1a2e",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      },
      // sous les marqueurs (ajoutés après) mais au-dessus du fond de carte
    );
  }

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
          `${spaceCount} emplacements fictifs et ${roadCount} rues chargés depuis l'API de simulation.`}
        {status === "error" &&
          "API indisponible : vérifiez que les services Docker (api, postgres) sont démarrés."}
      </div>
    </div>
  );
}
