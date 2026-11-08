# Captures d'écran — preuve de fonctionnement

Demandé par §34.6 du cahier des charges ("captures d'écran desktop/mobile si possible").

Capturées le 2026-11-08 sur un **appareil Android physique** (OPPO CPH2195) via `adb exec-out screencap`, l'application tournant en local (`next build && next start` + `node dist/index.js`, PostGIS via Docker), accédée par `adb reverse tcp:3000 tcp:3000` / `tcp:3001 tcp:3001`.

| Fichier | Contenu |
|---|---|
| `mobile-home.png` | Page d'accueil (`/`) — badge simulation, recherche code postal, légende |
| `mobile-destination-results.png` | Résultats Destination Assist (`/destination`) — zones classées, boutons de signalement, liens de navigation externe |
| `mobile-espace-confirm.png` | Fiche emplacement (`/espace/[id]`) — confirmation explicite « Vous semblez être stationné. Confirmez-vous ? » (oui/non/plus tard) |
| `mobile-map-ocean-fixed.png` | Carte (`/`) après correction des coordonnées fictives (voir ci-dessous) — fond bleu (pleine mer), aucune route réelle visible |
| `mobile-polyline-visible.png` | Carte (`/`) après ajout des polylines de rue (voir ci-dessous) — ligne de rue visible entre deux rangées de places, zoom rapproché |
| `mobile-admin-zones.png` | Console admin — Gestion des zones/rues (`/admin/zones`, A03) — 8 tronçons, nombre de places, date de contrôle |
| `mobile-admin-emplacements.png` | Console admin — Gestion des emplacements (`/admin/emplacements`, A04) — édition en direct du statut d'inventaire |
| `mobile-admin-pilote-download.png` | Console admin — Préparation du pilote (`/admin/pilote`, A09) — téléchargement réel du protocole confirmé par Chrome ("Fichier téléchargé, 3,13 Ko") |

**Desktop : non capturé.** Aucun outil de navigateur desktop n'est disponible dans cet environnement d'exécution ; seul l'accès via un appareil Android physique a permis une vérification visuelle réelle. À faire avant toute démonstration desktop.

## Incident trouvé et corrigé pendant cette vérification (2026-11-08)

En testant le bouton « Ouvrir Waze » depuis une fiche emplacement fictive, Waze a lancé une **vraie navigation de 16 km vers « Rue Paul Sougy »** — la rue réelle du pilote décrit au cahier des charges. Les coordonnées d'origine du quartier fictif SIM-45100 (`{lat: 47.805, lon: 1.75}`, documentées comme "à ~15 km du centre d'Orléans") étaient en réalité assez proches de la vraie rue Paul-Sougy pour qu'un moteur de navigation externe la résolve directement — exactement la confusion simulation/réel interdite par le cahier des charges (§1, §19).

**Correctif** : origine déplacée en pleine mer (Atlantique, au large de la Bretagne, `{lat: 47.5, lon: -8.0}`), où aucune route réelle ne peut exister. Trois occurrences dupliquées de cette constante ont été mises à jour (`services/simulator/src/fixtures.ts`, `services/api/src/mockGeocoder.ts`, `apps/web/components/ParkingMap.tsx`) — la duplication elle-même est une dette technique à corriger (constante partagée à extraire dans un package commun).

Vérifié après correctif : la carte affiche un fond bleu uni (océan, aucune tuile de route), et les coordonnées renvoyées par l'API sont bien `{lat: 47.5, lon: -8.0}` (confirmé par requête directe).

## Manque trouvé et corrigé : pas de tracé de rue sur la carte (2026-11-08)

La carte n'affichait que des marqueurs de places (points), jamais la géométrie des rues elles-mêmes (`road_segments.geom`/`roads.geom`, stockée en base depuis le premier seed mais jamais exposée par l'API). Contraire à §29.2 du cahier des charges ("zoom intermédiaire : tronçons et restrictions").

**Correctif** : nouvel endpoint `GET /v1/parking/roads?bbox=...` (géométrie `roads` en GeoJSON) et rendu MapLibre en couche `line`. Deux ajustements supplémentaires ont été nécessaires pour que la ligne soit réellement visible (pas seulement présente) :
- Le zoom par défaut de la carte est passé de 15 à 18 : à 15 (~3 m/pixel), le décalage latéral réaliste des places (quelques mètres) est plus petit que le rayon des marqueurs (~9 px), donc la rue restait entièrement cachée sous les marqueurs quelle que soit sa couleur ou épaisseur.
- L'écart latéral des places par rapport à l'axe de la rue (`services/simulator/src/fixtures.ts`) est passé de 3 m à 8 m, pour laisser un espace visible entre les deux rangées de places à ce zoom.

Conséquence assumée : la vue par défaut montre une rue à la fois plutôt que les 4 d'un coup (l'utilisateur dézoome via les contrôles `+`/`-` pour voir l'ensemble du quartier fictif).
