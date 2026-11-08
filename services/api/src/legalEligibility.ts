import type { ParkingRule, VehicleType } from "@parkvision/contracts";

export type LegalEligibility = "ELIGIBLE" | "RESTRICTED" | "EXCLUDED";

/**
 * Détermine l'éligibilité légale d'une place pour un profil donné.
 * Cf. cahier des charges v1.4 §26 règle 1 : "une place interdite ne doit
 * jamais être proposée comme option ordinaire" ; une place PMR vide reste
 * exclue pour un conducteur non autorisé, même sans occupation observée.
 */
export function evaluateLegalEligibility(
  rules: ParkingRule[],
  vehicleType: VehicleType,
  accessibilityRequested: boolean,
): { eligibility: LegalEligibility; explanation: string[] } {
  const explanation: string[] = [];

  for (const rule of rules) {
    switch (rule.category) {
      case "PMR":
        if (vehicleType !== "PMR_AUTHORIZED" && !accessibilityRequested) {
          return {
            eligibility: "EXCLUDED",
            explanation: ["Place réservée PMR : exclue par défaut, même si vide."],
          };
        }
        explanation.push("Place réservée PMR : usage conditionné à une autorisation.");
        break;
      case "PRIVATE":
        return {
          eligibility: "EXCLUDED",
          explanation: ["Place privée : hors recommandation publique."],
        };
      case "NO_PARKING":
        return {
          eligibility: "EXCLUDED",
          explanation: ["Stationnement interdit à cet emplacement."],
        };
      case "EV":
        if (vehicleType !== "EV") {
          explanation.push("Place de recharge : réservée aux véhicules électriques.");
        }
        break;
      case "DELIVERY":
        explanation.push("Restriction livraison : vérifier les horaires affichés.");
        break;
      case "RESIDENT":
        explanation.push("Réservée aux résidents munis d'un justificatif.");
        break;
      case "TEMPORARY":
        explanation.push("Restriction temporaire en vigueur : à vérifier sur place.");
        break;
      default:
        break;
    }
  }

  const hasRestriction = rules.some((r) =>
    ["EV", "DELIVERY", "RESIDENT", "TEMPORARY"].includes(r.category),
  );

  if (explanation.length === 0) {
    explanation.push("Aucune restriction connue au-delà des règles générales.");
  }

  return {
    eligibility: hasRestriction ? "RESTRICTED" : "ELIGIBLE",
    explanation,
  };
}
