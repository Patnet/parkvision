# Parcours utilisateurs — statut d'implémentation

Référence : cahier des charges §30 (F1-F6). Demandé explicitement par §34.2.

## F1 — Explorer par code postal

> `Accueil → Saisir 45100 → Choisir commune si plusieurs → Voir rues/zones documentées → Ouvrir fiche → Vérifier restrictions et fraîcheur`

**Statut : ✅ implémenté**, avec un écart de navigation.

Réel : `/` → champ de recherche → `GET /v1/geo/postal-codes` → liste de candidats affichée si ambiguïté → carte avec marqueurs cliquables → `/espace/[id]` (fiche) → restrictions et fraîcheur visibles.

Écart : la recherche par code postal et la navigation sur la carte **n'ouvrent pas automatiquement une liste de rues/zones** avant la fiche emplacement — on passe directement du marqueur carte à la fiche individuelle, sans étape intermédiaire "liste des rues". La fiche tronçon (`/zone/[id]`) existe mais n'est atteignable que *depuis* une fiche emplacement ("Voir le tronçon"), pas depuis la recherche code postal directement.

## F2 — Paris → Orléans (Destination Assist)

> `Accueil → Destination → Saisir adresse à Orléans → Géocodage/désambiguïsation → Rayon de marche → Résultats conformes → Choisir zone → Récapitulatif → Ouvrir Waze`

**Statut : ✅ implémenté**, vérifié de bout en bout (y compris sur appareil physique Android, voir `docs/screenshots/`).

Réel : `/destination` → saisie → `GET /v1/destinations/search` (géocodeur mock, scope SIM-45100 uniquement) → sélection → rayon + heure d'arrivée facultative → `POST /v1/destinations/recommendations` → zones classées (ELIGIBLE/RESTRICTED/EXCLUDED), distance à vol d'oiseau clairement qualifiée, explications → liens directs `Ouvrir Waze` / `Ouvrir Google Maps`.

Écart : pas d'écran "récapitulatif" séparé avant l'ouverture de la navigation externe — le lien est directement sur la carte de résultat (regroupé avec P15, voir SCREEN_INVENTORY.md). Si heure d'arrivée future : le texte "disponibilité actuelle non projetée" s'affiche (`routes/destinations.ts`), mais aucune vraie prévision n'est calculée (conforme au principe "ne jamais inventer une recommandation").

## F3 — Déclarer un stationnement (MVP simulé)

> `Carte → Sélection emplacement fictif → « Je me gare » → Confirmer à l'arrêt → Créer observation OCCUPIED_REPORTED → Historique et carte mis à jour`

**Statut : ✅ implémenté**, y compris sur `/destination` (corrigé le 2026-11-08 — utilisait auparavant une publication directe sans palier de confirmation, écart désormais résolu).

Confirmation explicite oui/non/plus tard (`ConfirmReportButton`) avant `POST /v1/observations` avec `occupancy: OCCUPIED_REPORTED` — jamais `OCCUPIED_CONFIRMED` — sur `/espace/[id]` **et** `/destination`. Historique visible immédiatement après (rechargement de la fiche).

## F4 — Déclarer un départ (MVP simulé)

> `Carte → Sélection emplacement fictif → « Je pars » → Confirmer à l'arrêt → Créer FREE_REPORTED → Afficher ancienneté → Expirer/contredire → UNKNOWN`

**Statut : ✅ implémenté** (même code que F3, kind `DEPARTURE`). L'expiration et la logique de contradiction sont couvertes par les tests unitaires de `computeAvailability` (`services/api/src/availability.test.ts`), pas par un test end-to-end automatisé de ce parcours précis.

## F5 — Sans permission ou sans données

> `Recherche manuelle → Carte réglementaire → Aucune disponibilité fiable → Afficher inconnue + alternative de zone/parking connu`

**Statut : ✅ implémenté pour le cas "aucune donnée"**, ⚠️ **le cas "permission refusée" n'a pas de sens en lot 1-2** (aucune permission native n'est demandée — conforme à §28.2, donc rien à tester ici pour l'instant).

Quand aucune observation valide n'existe sur une place ou un tronçon, l'état retombe à `UNKNOWN` (jamais "libre"), avec un `unknownReason` explicite retourné par l'API et affiché côté `/destination`.

## F6 — Assistance active (ultérieure)

> Explicitement marqué "Ne pas implémenter au lot 1-2" dans le cahier des charges.

**Statut : ❌ non implémenté, conforme au périmètre.**

## Écarts à corriger en priorité

1. **F3 sur `/destination`** : ajouter la confirmation explicite oui/non/plus tard (actuellement seulement sur `/espace/[id]`).
2. **F1** : relier la recherche code postal à une liste de rues/tronçons avant la fiche individuelle, au lieu de sauter directement au marqueur carte.
