import type { ParkingSpace } from "@parkvision/contracts";
import type { EnrichedSpace } from "./repository.js";

export function serializeSpace(enriched: EnrichedSpace): ParkingSpace {
  const { space, rules, availability } = enriched;
  return {
    id: space.id,
    segmentId: space.segment_id,
    coordinates: { lat: space.lat, lon: space.lon },
    inventoryStatus: space.inventory_status,
    provenance: space.provenance,
    verifiedAt: space.verified_at?.toISOString() ?? null,
    visibility: space.visibility,
    rules: rules.map((r) => ({
      id: r.id,
      category: r.category as ParkingSpace["rules"][number]["category"],
      validFrom: r.valid_from?.toISOString() ?? null,
      validTo: r.valid_to?.toISOString() ?? null,
      recurringSchedule: r.recurring_schedule,
      permitRequired: r.permit_required,
      sourceUrl: r.source_url,
      verifiedAt: r.verified_at?.toISOString() ?? null,
    })),
    occupancy: availability.occupancy,
    freshness: {
      observedAt: availability.observedAt?.toISOString() ?? null,
      expiresAt: availability.expiresAt?.toISOString() ?? null,
    },
    isSimulated: space.is_simulated,
  };
}
