# Captures d'écran — preuve de fonctionnement

Demandé par §34.6 du cahier des charges ("captures d'écran desktop/mobile si possible").

Capturées le 2026-11-08 sur un **appareil Android physique** (OPPO CPH2195) via `adb exec-out screencap`, l'application tournant en local (`next build && next start` + `node dist/index.js`, PostGIS via Docker), accédée par `adb reverse tcp:3000 tcp:3000` / `tcp:3001 tcp:3001`.

| Fichier | Contenu |
|---|---|
| `mobile-home.png` | Page d'accueil (`/`) — badge simulation, recherche code postal, légende |
| `mobile-destination-results.png` | Résultats Destination Assist (`/destination`) — zones classées, boutons de signalement, liens de navigation externe |
| `mobile-espace-confirm.png` | Fiche emplacement (`/espace/[id]`) — confirmation explicite « Vous semblez être stationné. Confirmez-vous ? » (oui/non/plus tard) |

**Desktop : non capturé.** Aucun outil de navigateur desktop n'est disponible dans cet environnement d'exécution ; seul l'accès via un appareil Android physique a permis une vérification visuelle réelle. À faire avant toute démonstration desktop.
