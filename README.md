# ParkVision

MVP de stationnement intelligent hybride — aide à trouver un stationnement **légal**, sans garantir qu'une place reste disponible.

> **Statut actuel : phase de cadrage.** Aucun code n'est encore implémenté. Le périmètre engagé est strictement limité aux lots 1 et 2 (socle cartographique simulé + signalement manuel simulé). Voir [§24 de la v1.3](./ParkVision_Cahier_des_charges_Codex_v1_3.md#24-arbitrages-v13--validation-produit-avant-automatisation-priorité-sur-toute-section-antérieure) pour l'arbitrage de scope.

## Mission

Construire un MVP testé d'abord sur un **jeu de données simulées** (`SIM-45100`, quartier fictif), puis déployable en pilote réel rue Paul-Sougy (Orléans, 45100) après inventaire et validation terrain. Les données simulées ne sont jamais présentées comme réelles.

## Pourquoi cette approche

Le risque principal n'est pas technique mais communautaire : une app de stationnement collaboratif n'a de valeur que si suffisamment de participants signalent des informations exactes et à jour. La v1.3 du cahier des charges reporte donc toute détection automatique (capteurs, GPS continu, voix, native iOS/Android) après validation de cette hypothèse d'amorçage via signalement **manuel** uniquement.

## Documentation

- [`ParkVision_Cahier_des_charges_Codex_v1_3.md`](./ParkVision_Cahier_des_charges_Codex_v1_3.md) — cahier des charges technique complet et faisant autorité (architecture, modèle de données, API, séquence de livraison, critères d'acceptation, RGPD).

## Périmètre engagé maintenant (lots 1-2)

- Carte fictive de 60 emplacements sur 4 rues fictives (`SIM-45100`), avec mention permanente « SIMULATION — DONNÉES FICTIVES ».
- Recherche par code postal avec désambiguïsation commune/code INSEE.
- Restrictions de stationnement (PMR, livraison, privé, horaires, temporaire) séparées de l'occupation.
- Signalement manuel simulé « Je me gare » / « Je pars », à l'arrêt uniquement.
- Observations horodatées, expirables, avec niveaux de vérification (`FREE_REPORTED`, `OCCUPIED_REPORTED`, `UNKNOWN` — jamais `FREE_CONFIRMED` sur simple déclaration).
- API REST versionnée (OpenAPI), PostGIS, tests automatisés, tableau de bord de simulation.

## Explicitement hors périmètre pour l'instant

- Mobile natif iOS/Android, permissions de mobilité, GPS continu, Bluetooth, OBD-II.
- Microphone, assistant vocal, TTS/STT.
- Notifications push en production, prédiction IA/ML, analyse vidéo, caméras.
- Déploiement public, pilote terrain réel, collecte de données réelles, réservation, paiement.

Ces fonctionnalités restent des pistes de recherche conditionnelles, chacune soumise à une décision go/no-go distincte après mesure (voir §24.6 du cahier des charges).

## Architecture cible

```
apps/
  mobile/              # Flutter (différé)
  admin/               # Next.js, MapLibre GL JS
  web/                 # Next.js — landing + recherche accessible
services/
  api/                 # Node.js TypeScript, Fastify, Zod, OpenAPI
  prediction/          # Python FastAPI (différé)
  simulator/           # générateur déterministe d'événements fictifs
packages/
  contracts/           # schémas OpenAPI, JSON Schema, types
  geo/                 # utilitaires géographiques
infra/
  docker/              # PostgreSQL/PostGIS, API, admin, simulator
  migrations/
  monitoring/
```

## Démarrage

Aucun environnement exécutable n'est encore disponible dans ce dépôt. La procédure cible pour les lots 1-2 sera :

```bash
docker compose up --build
```

Ce README sera mis à jour dès que le socle (lot 1) sera implémenté.

## Principes non négociables

- Distinguer **occupation**, **droit de stationner**, **fraîcheur**, **source** et **confiance**.
- Aucune surveillance vidéo de la voie publique par des particuliers.
- Minimisation des données de localisation, consentement granulaire, droit à la suppression.
- Aucun usage du téléphone tenu en main en conduite ; pas d'activation clandestine du microphone.

Voir la section 2 du cahier des charges pour la liste complète.

## Licence et réutilisation de code tiers

Avant toute réutilisation de dépôt externe, une revue de licence documentée (`docs/opensource-review.md`) est obligatoire. Aucun code sous licence non vérifiée n'est intégré (voir §18 du cahier des charges).
