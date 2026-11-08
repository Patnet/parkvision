# Architecture — Destination Assist

Référence : cahier des charges §26 (vision produit), §31 (interfaces et contrats API). Demandé explicitement par §34.2.

## Vision (§26.1)

ParkVision ne remplace pas Waze/Google Maps/Apple Plans : il prépare la recherche de stationnement **avant** le départ et **à destination**, puis ouvre un outil de navigation externe vers une zone choisie. Mode implémenté : **A — ParkVision d'abord (MVP simulé)**. Les modes B (partage depuis une autre app) et C (assistance en trajet) sont explicitement différés (§26, modes "ultérieur"/"expérimental ultérieur").

## Interfaces du domaine (§31) — mapping code réel

Le cahier des charges définit des interfaces logiques ; voici leur traduction dans le code TypeScript actuel (lot 1-2, pas de couche d'abstraction formelle séparée — fonctions directes, mais respectant le même découpage de responsabilités) :

| Interface du cahier des charges | Implémentation réelle | Fichier |
|---|---|---|
| `DestinationResolver.resolve(query, communeHint?)` | `searchDestinations(query)` — géocodeur mock, scope SIM-45100 uniquement | `services/api/src/mockGeocoder.ts` |
| `ParkingSearchService.search(destination, radiusMeters, arrivalAt?, vehicle?, accessibility?)` | Handler `POST /v1/destinations/recommendations` : `getSpacesNearPoint()` (PostGIS `ST_DWithin`) + regroupement par tronçon | `services/api/src/routes/destinations.ts`, `services/api/src/repository.ts` |
| `ParkingRankingService.rank(candidates, preferences)` | `evaluateLegalEligibility()` (conformité) + tri par éligibilité puis distance, dans le même handler | `services/api/src/legalEligibility.ts`, `services/api/src/routes/destinations.ts` |
| `NavigationLauncher.buildUrl(provider, coordinates)` | `navigationUrl()` — construit des deep links Waze/Google Maps ; **aucune lecture ni contrôle de session Waze**, juste une URL ouverte par le navigateur | `apps/web/app/destination/page.tsx`, `apps/web/app/espace/[id]/page.tsx` |
| `ArrivalTimeProvider` (mock MVP) | Champ `datetime-local` saisi manuellement, transmis tel quel en ISO 8601 ; aucun calcul d'ETA | `apps/web/app/destination/page.tsx` |
| `DestinationWatchService` (interface seulement, pas d'implémentation) | **Non implémenté**, conforme au cahier des charges ("pas de tâche arrière-plan dans le MVP") | — |

## Flux de données (séquence réelle)

```
Utilisateur (web)
  │
  ├─ GET /v1/destinations/search?q=...        → mockGeocoder.searchDestinations()
  │                                              → liste de DestinationCandidate (source: SIMULATION)
  │
  └─ POST /v1/destinations/recommendations
       { destination, radiusMeters, arrivalAt, vehicleType, accessibility }
       │
       ├─ getSpacesNearPoint(pool, destination.coordinates, radiusMeters, now)
       │    → requête PostGIS ST_DWithin sur parking_spaces.geom::geography
       │    → pour chaque place : jointure règles (parking_rules) + observations
       │      → computeAvailability() (agrégation d'occupation, voir
       │        services/api/src/availability.ts)
       │
       ├─ regroupement par segment_id (tronçon)
       │
       ├─ pour chaque groupe :
       │    evaluateLegalEligibility(rules, vehicleType, accessibility)
       │      → ELIGIBLE / RESTRICTED / EXCLUDED (PMR exclu même si vide)
       │    haversineDistanceMeters(destination, space) → distance à vol d'oiseau
       │      (jamais présentée comme un itinéraire piéton réel)
       │
       └─ tri : éligibilité d'abord, puis distance
            → réponse { destination, zones[], generatedAt, isSimulated: true }

Le client (apps/web) affiche les zones et propose, pour chaque zone :
  - les boutons de signalement manuel (POST /v1/observations)
  - les liens "Ouvrir Waze" / "Ouvrir Google Maps" (navigationUrl(), ouverts
    dans un nouvel onglet — aucune intégration programmatique avec ces apps)
```

## Règles de non-garantie appliquées dans le code

Correspondance directe avec §26 règles 1-7 :

1. **Éligibilité légale filtrée en premier** → `evaluateLegalEligibility()` appelée avant le tri, résultat `EXCLUDED` prioritaire.
2. **Distance à pied vs vol d'oiseau** → `distanceIsEstimated: true` toujours renvoyé par l'API ; le client affiche explicitement "distance estimée, pas un itinéraire piéton réel".
3. **Source, horodatage, fraîcheur affichés** → `freshness.observedAt`/`expiresAt` sur chaque `ParkingSpace`, jamais omis.
4. **Pas de projection de disponibilité future** → si `arrivalAt` est renseigné, un message d'avertissement est ajouté à `explanation[]` au lieu de recalculer un état.
5. **Pas de réservation, pas de détour PMR non autorisé** → aucune route de réservation n'existe ; `evaluateLegalEligibility` ne retourne jamais `ELIGIBLE` pour une place PMR sans autorisation.
6. **Classement explicable** → `explanation: string[]` retourné pour chaque zone, pas de score numérique opaque.
7. **Aucun ETA Waze lu** → `NavigationLauncher` ne fait qu'émettre une URL, jamais d'appel à une API Waze/Google.

## Ce qui n'est pas implémenté (différé)

- Adaptateur de géocodage réel (BAN/Géoplateforme) — seul le mock SIM-45100 existe.
- Mode B (partage depuis une autre application) et Mode C (assistance en trajet) — explicitement hors lot 1-2.
- `DestinationWatchService` — aucune tâche de fond.
- Écran récapitulatif dédié avant ouverture de la navigation externe (voir `docs/ux/USER_FLOWS.md`, écart F2).
