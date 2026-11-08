# ParkVision

MVP de stationnement intelligent hybride — aide à trouver un stationnement **légal**, sans garantir qu'une place reste disponible.

> **Statut actuel : socle lots 1-2 implémenté et vérifié localement.** Monorepo, API Fastify/PostGIS, simulateur SIM-45100, web Next.js (carte, Destination Assist, signalement manuel) fonctionnels en local avec Docker. Le périmètre reste strictement limité aux lots 1 et 2. Voir [§24 et §§26-34 de la v1.4](./ParkVision_Cahier_des_charges_Codex_v1_4.md) pour l'arbitrage de scope.

## Mission

Construire un MVP testé d'abord sur un **jeu de données simulées** (`SIM-45100`, quartier fictif), puis déployable en pilote réel rue Paul-Sougy (Orléans, 45100) après inventaire et validation terrain. Les données simulées ne sont jamais présentées comme réelles.

## Pourquoi cette approche

Le risque principal n'est pas technique mais communautaire : une app de stationnement collaboratif n'a de valeur que si suffisamment de participants signalent des informations exactes et à jour. Le cahier des charges reporte donc toute détection automatique (capteurs, GPS continu, voix, native iOS/Android) après validation de cette hypothèse d'amorçage via signalement **manuel** uniquement.

## Documentation

- [`ParkVision_Cahier_des_charges_Codex_v1_4.md`](./ParkVision_Cahier_des_charges_Codex_v1_4.md) — cahier des charges technique complet et faisant autorité (architecture, modèle de données, API, UX/design system, Destination Assist, séquence de livraison, critères d'acceptation, RGPD).
- [`docs/ux/SCREEN_INVENTORY.md`](./docs/ux/SCREEN_INVENTORY.md) — statut de chaque écran du §27/§32, écarts documentés.
- [`docs/ux/USER_FLOWS.md`](./docs/ux/USER_FLOWS.md) — statut des parcours F1-F6 (§30).
- [`docs/architecture/DESTINATION_ASSIST.md`](./docs/architecture/DESTINATION_ASSIST.md) — interfaces du §31 et leur implémentation réelle.
- [`docs/data-source-register.md`](./docs/data-source-register.md) — registre des sources de données (§18), y compris OpenFreeMap (fond de carte réel).
- [`docs/screenshots/`](./docs/screenshots/) — captures d'écran de vérification (mobile, appareil physique).

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
  web/                 # Next.js — carte, Destination Assist, fiches, admin basique
  mobile/              # Flutter (différé, non implémenté)
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

> `packages/contracts`, `packages/geo` et `services/simulator` se résolvent en production via leur sortie compilée (`dist/`). Après les avoir modifiés, reconstruisez-les avant de relancer l'API :
> `pnpm --filter @parkvision/contracts run build && pnpm --filter @parkvision/geo run build && pnpm --filter @parkvision/simulator run build`

### Console admin

`http://localhost:3000/admin` — jeton partagé (`ADMIN_TOKEN`, défaut `dev-admin-token`), à saisir une fois dans l'écran de connexion. Couvre : tableau de bord (A02), qualité/couverture (A07), journal des observations (A06), réinitialisation reproductible du simulateur (A05), paramètres et adaptateurs (A08). Pas de vrai système de comptes/rôles — à remplacer avant tout déploiement.

### Tests

```bash
pnpm test   # packages/geo, services/simulator, services/api (26 tests)
```

Les tests de l'API couvrent le moteur d'agrégation d'occupation (`availability.ts` — jamais de `FREE_CONFIRMED`/`OCCUPIED_CONFIRMED` sur simple déclaration, gestion des contradictions et expirations) et l'éligibilité légale (`legalEligibility.ts` — exclusion PMR/privé même si vide). Le simulateur est testé pour sa reproductibilité (seed fixe, 60 places, 4 rues).

### Inventaire des écrans (§27 du cahier des charges)

| Statut | Écrans |
|---|---|
| ✅ Fait | P00 (splash), P01-P03 (onboarding, fusionné en une page), P04 (choix d'accès, intégré à l'onboarding), P05-P08 (carte, recherche, Destination Assist), P09 (fiche tronçon `/zone/[id]`), P10 (fiche emplacement `/espace/[id]`), P11 (confirmation explicite oui/non/plus tard), P15 (itinéraire externe, intégré aux fiches), P16 (aide), P17 (paramètres), P20 (états système réutilisables), P21 (signalement `/signaler`) |
| ❌ Non fait (V2/V3, hors scope lot 1-2) | P12 (historique de contributions), P13 (favoris), P14 (alertes), P18 (permissions natives), P19 (authentification) |

Console admin (§32) : A01 (connexion), A02 (tableau de bord), A05 (contrôle simulateur), A06 (journal observations), A07 (qualité/couverture), A08 (paramètres) faits. A03/A04 (édition zones/emplacements) et A09 (export protocole pilote) non faits. A10/A11 hors scope (V2/V3).

### Vérifié localement (2026-11-08)

- `pnpm install`, migrations (0001 + 0002), seed, build complet (`contracts`/`geo`/`simulator`/`api`/`web`) et démarrage **en mode production compilé** (`node dist/index.js`, `next build` + `next start`) réussis — pas seulement en dev avec `tsx`/`next dev`.
- Bug trouvé et corrigé pendant cette vérification : la réinitialisation du simulateur échouait sur un second appel (clé étrangère `postal_areas`/`roads` → `communes` sans cascade) ; corrigé dans `services/simulator/src/seedRunner.ts`.
- Endpoints testés manuellement : tous ceux du tour précédent, plus `/v1/parking/segments/:id`, `/v1/parking/spaces/:id/observations`, `/v1/reports`, `/v1/admin/stats|observations|settings|simulation/reset` (garde par jeton testée, y compris le rejet 401 sans jeton).
- Les 13 pages web répondent 200, y compris les 2 pages dynamiques (`/espace/[id]`, `/zone/[id]`) et `/admin/*` ; **rendu visuel non vérifié dans un navigateur** (outil indisponible dans cet environnement) — à faire avant toute démonstration.
- Non fait : Flutter, tests E2E navigateur, CI, édition des zones/emplacements en admin (A03/A04), export du protocole pilote (A09).

## Principes non négociables

- Distinguer **occupation**, **droit de stationner**, **fraîcheur**, **source** et **confiance**.
- Aucune surveillance vidéo de la voie publique par des particuliers.
- Minimisation des données de localisation, consentement granulaire, droit à la suppression.
- Aucun usage du téléphone tenu en main en conduite ; pas d'activation clandestine du microphone.

Voir la section 2 du cahier des charges pour la liste complète.

## Licence et réutilisation de code tiers

Avant toute réutilisation de dépôt externe, une revue de licence documentée (`docs/opensource-review.md`) est obligatoire. Aucun code sous licence non vérifiée n'est intégré (voir §18 du cahier des charges).
