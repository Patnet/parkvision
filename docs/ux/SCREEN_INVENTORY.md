# Inventaire des écrans — statut d'implémentation

Référence : cahier des charges `ParkVision_Cahier_des_charges_Codex_v1_4.md`, §27 (application) et §32 (console admin). Demandé explicitement par §34.2.

Légende : ✅ fait (code réel, testé) · ⚠️ fait partiellement (écart documenté) · ❌ non fait (V2/V3 ou hors scope lot 1-2).

## Application automobiliste (§27)

| ID | Écran | Route | Statut | Écart / note |
|---|---|---|---|---|
| P00 | Splash / initialisation | `components/Splash.tsx` (dans `app/layout.tsx`) | ✅ | Contrôle réseau réel (`/v1/health`) ; pas de contrôle de version (pas de mécanisme de versioning client en lot 1-2) |
| P01 | Onboarding 1 — promesse | `/onboarding` | ⚠️ | Fusionné avec P02/P03/P04 en une seule page scrollable, pas 3 écrans séparés avec bouton « Passer » |
| P02 | Onboarding 2 — fonctionnement | `/onboarding` | ⚠️ | Idem — section de la même page |
| P03 | Onboarding 3 — sécurité/vie privée | `/onboarding` | ⚠️ | Idem — section de la même page |
| P04 | Choix du mode d'accès | `/onboarding` | ⚠️ | Note informative intégrée à l'onboarding ; pas d'écran de choix actif (le mode « sans compte » est le seul mode existant, aucun compte n'est implémenté) |
| P05 | Accueil / carte | `/` | ✅ | Carte MapLibre + recherche code postal + légende |
| P06 | Recherche géographique | `/` (formulaire intégré) | ✅ | Désambiguïsation commune/code INSEE via `/v1/geo/postal-codes` |
| P07 | Destination Assist — recherche | `/destination` | ✅ | Adresse, rayon 200/500/1000 m, heure d'arrivée facultative, case PMR |
| P08 | Résultats destination | `/destination` (même page) | ✅ | Liste de zones classées avec légalité, distance, explication |
| P09 | Fiche zone / rue | `/zone/[id]` | ✅ | Règles, places connues, date de contrôle |
| P10 | Fiche emplacement | `/espace/[id]` | ✅ | Occupation/restriction séparées, historique court, provenance, fraîcheur |
| P11 | Signaler « Je me gare / Je pars » | `components/ConfirmReportButton.tsx`, utilisé sur `/espace/[id]` et `/destination` | ✅ | Confirmation explicite oui/non/plus tard sur les deux pages de signalement |
| P12 | Historique de mes signalements | — | ❌ | V2 — nécessite un compte, hors scope lot 1-2 |
| P13 | Favoris / lieux enregistrés | — | ❌ | V2 |
| P14 | Alertes de zone | — | ❌ | V2 |
| P15 | Itinéraire externe | Boutons inline sur `/espace/[id]` et `/destination` | ⚠️ | Pas d'écran récapitulatif séparé ; liens directs `Ouvrir Waze` / `Ouvrir Google Maps` sur les fiches existantes |
| P16 | Aide et légende | `/aide` | ✅ | |
| P17 | Paramètres | `/parametres` | ✅ | Thème uniquement ; langue/accessibilité en lecture seule (rien d'autre à configurer en lot 1-2) |
| P18 | Permissions | — | ❌ | V2 natif — aucune permission native demandée en lot 1-2 (conforme à §28.2) |
| P19 | Authentification facultative | — | ❌ | V2 |
| P20 | États système | `components/SystemStates.tsx` | ✅ | `LoadingState`, `ErrorState`, `EmptyState`, `OfflineState`, `ExpiredDataState`, `AccessDeniedState` — utilisés sur `/espace/[id]`, `/zone/[id]`, console admin |
| P21 | Signalement abus / correction | `/signaler` | ✅ | Formulaire + `POST /v1/reports`, sans dénonciation nominative |

**Navigation mobile cible (barre inférieure)** : non implémentée telle quelle — la nav actuelle est une barre horizontale en haut de page (`app/layout.tsx`), pas une barre inférieure mobile. Écart par rapport à §27 ("barre inférieure Carte · Destination · Signaler · Favoris · Profil").

## Console admin (§32)

| ID | Page | Route | Statut | Note |
|---|---|---|---|---|
| A01 | Connexion admin | `app/admin/layout.tsx` + `components/AdminGate.tsx` | ✅ | Jeton partagé (dev), pas de rôle/compte réel |
| A02 | Tableau de bord simulation | `/admin` | ✅ | Répartition des états, avertissement simulation |
| A03 | Gestion zones/rues | — | ❌ | Non fait |
| A04 | Gestion emplacements | — | ❌ | Non fait (lecture possible via `/zone/[id]` et `/espace/[id]` côté public, mais pas d'édition admin) |
| A05 | Contrôle du simulateur | `/admin/simulateur` | ✅ | Réinitialisation reproductible (bouton → `POST /v1/admin/simulation/reset`) |
| A06 | Journal des observations | `/admin/observations` | ✅ | Table triée, 100 dernières observations |
| A07 | Qualité et couverture | `/admin` (section dédiée) | ✅ | Taux d'inconnu, âge moyen des observations |
| A08 | Paramètres / sources | `/admin/parametres` | ✅ | TTL, statut des adaptateurs mock |
| A09 | Préparation du pilote | — | ❌ | Non fait |
| A10 | Modération / utilisateurs | — | ❌ | V2, hors scope |
| A11 | Connecteurs / capteurs | — | ❌ | V3, hors scope |

## Tableau MVP / simulé / différé (demandé §34.2)

| Catégorie | Contenu |
|---|---|
| **MVP (réel, fonctionnel)** | Socle API/PostGIS, moteur d'agrégation d'occupation, éligibilité légale, recherche code postal, Destination Assist, signalement manuel, console admin (sous-ensemble), géocodage mock |
| **Simulé (données fictives, logique réelle)** | Quartier `SIM-45100` (60 places), observations initiales, réinitialisation du simulateur |
| **Différé (non codé, hors lot 1-2)** | Flutter natif, authentification, favoris, alertes, historique de contributions, permissions natives, édition admin des zones/emplacements, export du protocole pilote, voix, détection automatique arrivée/départ, pilote terrain réel |
