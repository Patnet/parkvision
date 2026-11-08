# ParkVision

MVP de stationnement intelligent hybride — aide à trouver un stationnement **légal**, sans garantir qu'une place reste disponible.

> **Statut actuel : socle lots 1-2 implémenté et vérifié localement.** Monorepo, API Fastify/PostGIS, simulateur SIM-45100, web Next.js (carte, Destination Assist, signalement manuel) fonctionnels en local avec Docker. Le périmètre reste strictement limité aux lots 1 et 2. Voir [§24 et §§26-34 de la v1.4](./ParkVision_Cahier_des_charges_Codex_v1_4.md) pour l'arbitrage de scope.

## Mission

Construire un MVP testé d'abord sur un **jeu de données simulées** (`SIM-45100`, quartier fictif), puis déployable en pilote réel rue Paul-Sougy (Orléans, 45100) après inventaire et validation terrain. Les données simulées ne sont jamais présentées comme réelles.

## Pourquoi cette approche

Le risque principal n'est pas technique mais communautaire : une app de stationnement collaboratif n'a de valeur que si suffisamment de participants signalent des informations exactes et à jour. Le cahier des charges reporte donc toute détection automatique (capteurs, GPS continu, voix, native iOS/Android) après validation de cette hypothèse d'amorçage via signalement **manuel** uniquement.

## Documentation

- [`ParkVision_Cahier_des_charges_Codex_v1_4.md`](./ParkVision_Cahier_des_charges_Codex_v1_4.md) — cahier des charges technique complet et faisant autorité (architecture, modèle de données, API, UX/design system, Destination Assist, séquence de livraison, critères d'acceptation, RGPD).

## Périmètre engagé maintenant (lots 1-2)

- Carte fictive de 60 emplacements sur 4 rues fictives (`SIM-45100`), avec mention permanente « SIMULATION — DONNÉES FICTIVES ».
- Recherche par code postal avec désambiguïsation commune/code INSEE.
- Restrictions de stationnement (PMR, livraison, privé, horaires, temporaire) séparées de l'occupation.
- Signalement manuel simulé « Je me gare » / « Je pars », à l'arrêt uniquement.
- Observations horodatées, expirables, avec niveaux de vérification (`FREE_REPORTED`, `OCCUPIED_REPORTED`, `UNKNOWN` — jamais `FREE_CONFIRMED` sur simple déclaration).
- **Destination Assist simulé** : recherche à destination (ex. Paris → Orléans), rayon de marche configurable, filtres (PMR, véhicule, horaires), résultats classés et explicables, ouverture d'un lien externe vers Waze/Google Maps/Apple Plans après choix explicite d'une zone — sans lecture ni contrôle de la session de navigation externe.
- Design system sombre (par défaut) / clair / automatique, onboarding court sans compte ni permission requise, navigation responsive desktop/mobile.
- API REST versionnée (OpenAPI), PostGIS, tests automatisés, tableau de bord de simulation.

## Explicitement hors périmètre pour l'instant

- Mobile natif iOS/Android, permissions de mobilité, GPS continu, Bluetooth, OBD-II.
- Microphone, assistant vocal, TTS/STT.
- Notifications push en production, prédiction IA/ML, analyse vidéo, caméras.
- Déploiement public, pilote terrain réel, collecte de données réelles, réservation, paiement.

Ces fonctionnalités restent des pistes de recherche conditionnelles, chacune soumise à une décision go/no-go distincte après mesure (voir §24.6 et §33 du cahier des charges).

## Architecture cible

```
apps/
  web/                 # Next.js — carte, Destination Assist, onboarding, aide
  mobile/              # Flutter (différé, non implémenté)
  admin/               # Console admin (différé, non implémenté)
services/
  api/                 # Node.js TypeScript, Fastify, Zod, OpenAPI, PostGIS
  simulator/           # générateur déterministe du quartier fictif SIM-45100
  prediction/          # Python FastAPI (différé, non implémenté)
packages/
  contracts/           # schémas Zod partagés (statuts, règles, API)
  geo/                 # utilitaires géographiques (distance, rayon)
infra/
  docker/              # docker-compose.yml : PostgreSQL/PostGIS, API, web
  migrations/          # schéma SQL versionné
```

## Démarrage

```bash
cp .env.example .env
docker compose -f infra/docker/docker-compose.yml --env-file .env up --build
```

Puis, dans un autre terminal, une fois la base démarrée :

```bash
pnpm install
pnpm db:migrate   # applique infra/migrations/*.sql
pnpm db:seed      # peuple le quartier fictif SIM-45100 (60 places, 4 rues)
```

- Web : http://localhost:3000 (carte, Destination Assist, aide, onboarding)
- API : http://localhost:3001 — documentation OpenAPI sur http://localhost:3001/docs

En développement sans Docker pour le code applicatif (seule la base a besoin de Docker) :

```bash
docker compose -f infra/docker/docker-compose.yml --env-file .env up -d postgres
pnpm db:migrate && pnpm db:seed
pnpm --filter @parkvision/api run dev    # :3001
pnpm --filter @parkvision/web run dev    # :3000
```

### Tests

```bash
pnpm test   # packages/geo, services/simulator, services/api (26 tests)
```

Les tests de l'API couvrent le moteur d'agrégation d'occupation (`availability.ts` — jamais de `FREE_CONFIRMED`/`OCCUPIED_CONFIRMED` sur simple déclaration, gestion des contradictions et expirations) et l'éligibilité légale (`legalEligibility.ts` — exclusion PMR/privé même si vide). Le simulateur est testé pour sa reproductibilité (seed fixe, 60 places, 4 rues).

### Vérifié localement (2026-11-08)

- `pnpm install`, migrations, seed, API et web démarrés avec succès.
- Endpoints testés manuellement : `/v1/health`, `/v1/geo/postal-codes`, `/v1/parking/spaces` (bbox, 60 résultats), `/v1/parking/spaces/:id`, `/v1/destinations/search`, `/v1/destinations/recommendations`, `/v1/observations` (idempotence confirmée).
- Pages web testées via requêtes HTTP (200 sur `/`, `/destination`, `/aide`, `/onboarding`) ; **non vérifiées visuellement dans un navigateur** (outil indisponible dans cet environnement) — à faire avant toute démonstration.
- Non fait : console admin, Flutter, tests E2E navigateur, CI.

## Principes non négociables

- Distinguer **occupation**, **droit de stationner**, **fraîcheur**, **source** et **confiance**.
- Aucune surveillance vidéo de la voie publique par des particuliers.
- Minimisation des données de localisation, consentement granulaire, droit à la suppression.
- Aucun usage du téléphone tenu en main en conduite ; pas d'activation clandestine du microphone.

Voir la section 2 du cahier des charges pour la liste complète.

## Licence et réutilisation de code tiers

Avant toute réutilisation de dépôt externe, une revue de licence documentée (`docs/opensource-review.md`) est obligatoire. Aucun code sous licence non vérifiée n'est intégré (voir §18 du cahier des charges).
