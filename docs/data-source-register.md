# Registre des sources de données

Référence : cahier des charges §18. Obligatoire avant toute intégration de données externes, y compris en lot 1-2.

## Sources effectivement utilisées dans le code (2026-11-08)

### OpenFreeMap (fond de carte)

| Champ | Valeur |
|---|---|
| Fournisseur | OpenFreeMap |
| URL officielle | https://openfreemap.org |
| Endpoint utilisé | `https://tiles.openfreemap.org/styles/liberty` (style vectoriel MapLibre) |
| Finalité | Fond de carte (rues, bâtiments) sous le quartier fictif SIM-45100 ; **aucune donnée d'occupation ou de stationnement ne vient de cette source** |
| Données couvertes | Géométrie OpenStreetMap, rendu vectoriel |
| Licence | Tuiles et style : ODbL (héritée d'OpenStreetMap) ; service gratuit, sans clé API |
| Attribution | Requise par ODbL — **non encore affichée dans l'UI** (écart à corriger, voir section "Écarts" ci-dessous) |
| Fréquence / limite de requêtes | Pas de limite documentée publiquement pour un usage raisonnable ; pas de cache applicatif côté ParkVision (le navigateur met en cache les tuiles nativement) |
| Disponibilité | Service tiers public, aucun SLA garanti ; pas de fallback configuré si indisponible (dégrade en carte vide, les marqueurs restent fonctionnels) |
| Date de vérification | 2026-11-08 |
| Fichier d'intégration | `apps/web/components/ParkingMap.tsx` |

### Géocodeur mock SIM-45100

| Champ | Valeur |
|---|---|
| Fournisseur | Aucun — adaptateur interne, pas de service externe |
| Finalité | Résoudre une recherche texte ("45100", nom de rue) vers des coordonnées, en environnement de simulation uniquement |
| Données couvertes | 3 entrées statiques codées en dur (le quartier `SIM-45100` et ses 2 premières rues fictives) |
| Licence | N/A (données fictives, pas de tiers) |
| Portée | **Ne couvre aucune adresse réelle** — toute recherche hors SIM-45100 retourne une liste vide |
| Date de vérification | 2026-11-08 |
| Fichier d'intégration | `services/api/src/mockGeocoder.ts` |

### Flux Waze / Google Maps / Apple Plans (navigation externe)

| Champ | Valeur |
|---|---|
| Fournisseur | Waze (Google), Google Maps, Apple |
| Endpoint utilisé | Deep links publics (`waze.com/ul`, `google.com/maps/dir`) — **pas d'API, pas de clé, pas d'authentification** |
| Finalité | Ouvrir une navigation externe vers une zone choisie, à l'initiative explicite de l'utilisateur (clic) |
| Données transmises | Uniquement des coordonnées lat/lon de la place/zone choisie — aucune donnée utilisateur, aucun identifiant |
| Licence | N/A — usage de liens publics documentés, pas d'intégration SDK |
| Limite | Aucune lecture retour (ETA, itinéraire, session) — conforme à §26 règle 7 |
| Date de vérification | 2026-11-08 |
| Fichier d'intégration | `apps/web/app/destination/page.tsx`, `apps/web/app/espace/[id]/page.tsx` |

## Sources candidates listées au cahier des charges, non intégrées (§11, §18)

Aucune de ces sources n'est appelée par le code actuel. Statut : à auditer avant toute intégration future, pas avant.

| Source | Statut |
|---|---|
| Base officielle des codes postaux / API Découpage administratif | Non intégrée |
| Géocodage Géoplateforme / BAN | Non intégrée (remplacée par le mock SIM-45100 en lot 1-2) |
| OpenStreetMap/Overpass (requêtes directes) | Non intégrée — seul le rendu de tuiles pré-généré (OpenFreeMap) est utilisé, pas de requête Overpass |
| Orléans Métropole (parkings équipés, PMR) | Non intégrée |
| Android Activity Recognition / Fused Location / iOS Core Motion / Core Location | Non intégrée — aucune détection native en lot 1-2 |

## Écarts identifiés

- ~~Attribution OpenFreeMap/OpenStreetMap manquante dans l'UI~~ — **corrigé** (2026-11-08) : `AttributionControl` ajouté explicitement dans `apps/web/components/ParkingMap.tsx`, avec mention « © OpenStreetMap contributors (ODbL) via OpenFreeMap » visible sur la carte.
