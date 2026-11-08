const EARTH_RADIUS_METERS = 6_371_000;

export interface LatLon {
  lat: number;
  lon: number;
}

/**
 * Distance à vol d'oiseau (Haversine), en mètres.
 * Ne doit jamais être présentée comme une distance piétonne réelle
 * sans routage — cf. cahier des charges v1.4 §26.
 */
export function haversineDistanceMeters(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

export function isWithinRadius(
  center: LatLon,
  point: LatLon,
  radiusMeters: number,
): boolean {
  return haversineDistanceMeters(center, point) <= radiusMeters;
}

/**
 * Déplace un point d'un offset en mètres (approximation plane,
 * suffisante pour générer un quartier fictif à l'échelle d'une rue).
 */
export function offsetMeters(
  origin: LatLon,
  dxMeters: number,
  dyMeters: number,
): LatLon {
  const latPerMeter = 1 / 111_320;
  const lonPerMeter = 1 / (111_320 * Math.cos((origin.lat * Math.PI) / 180));
  return {
    lat: origin.lat + dyMeters * latPerMeter,
    lon: origin.lon + dxMeters * lonPerMeter,
  };
}
