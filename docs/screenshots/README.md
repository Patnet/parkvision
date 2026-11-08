# Captures d'écran — preuve de fonctionnement

Demandé par §34.6 du cahier des charges ("captures d'écran desktop/mobile si possible").

Capturées le 2026-11-08 sur un **appareil Android physique** (OPPO CPH2195) via `adb exec-out screencap`, l'application tournant en local (`next build && next start` + `node dist/index.js`, PostGIS via Docker), accédée par `adb reverse tcp:3000 tcp:3000` / `tcp:3001 tcp:3001`.

| Fichier | Contenu |
|---|---|
| `mobile-home.png` | Page d'accueil (`/`) — badge simulation, recherche code postal, légende |
| `mobile-destination-results.png` | Résultats Destination Assist (`/destination`) — zones classées, boutons de signalement, liens de navigation externe |
| `mobile-espace-confirm.png` | Fiche emplacement (`/espace/[id]`) — confirmation explicite « Vous semblez être stationné. Confirmez-vous ? » (oui/non/plus tard) |
| `mobile-map-ocean-fixed.png` | Carte (`/`) après correction des coordonnées fictives (voir ci-dessous) — fond bleu (pleine mer), aucune route réelle visible |

**Desktop : non capturé.** Aucun outil de navigateur desktop n'est disponible dans cet environnement d'exécution ; seul l'accès via un appareil Android physique a permis une vérification visuelle réelle. À faire avant toute démonstration desktop.

## Incident trouvé et corrigé pendant cette vérification (2026-11-08)

En testant le bouton « Ouvrir Waze » depuis une fiche emplacement fictive, Waze a lancé une **vraie navigation de 16 km vers « Rue Paul Sougy »** — la rue réelle du pilote décrit au cahier des charges. Les coordonnées d'origine du quartier fictif SIM-45100 (`{lat: 47.805, lon: 1.75}`, documentées comme "à ~15 km du centre d'Orléans") étaient en réalité assez proches de la vraie rue Paul-Sougy pour qu'un moteur de navigation externe la résolve directement — exactement la confusion simulation/réel interdite par le cahier des charges (§1, §19).

**Correctif** : origine déplacée en pleine mer (Atlantique, au large de la Bretagne, `{lat: 47.5, lon: -8.0}`), où aucune route réelle ne peut exister. Trois occurrences dupliquées de cette constante ont été mises à jour (`services/simulator/src/fixtures.ts`, `services/api/src/mockGeocoder.ts`, `apps/web/components/ParkingMap.tsx`) — la duplication elle-même est une dette technique à corriger (constante partagée à extraire dans un package commun).

Vérifié après correctif : la carte affiche un fond bleu uni (océan, aucune tuile de route), et les coordonnées renvoyées par l'API sont bien `{lat: 47.5, lon: -8.0}` (confirmé par requête directe).
