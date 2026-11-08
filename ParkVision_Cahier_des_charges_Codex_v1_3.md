# ParkVision — Cahier des charges technique pour Codex

Version 1.3 — 8 novembre 2026

> **Décision v1.3 — autorité de périmètre :** seuls les lots 1 et 2 (socle cartographique, simulation et flux de signalement manuel simulé) sont autorisés immédiatement. La collecte terrain manuelle constitue un jalon distinct, soumis à préparation et validation. Les fonctionnalités natives automatiques, vocales, IA, capteurs et caméras sont des pistes conditionnelles et non des engagements MVP. En cas de contradiction avec une section héritée de v1.2, la section 24 « Arbitrages v1.3 » prévaut. Aucune donnée simulée n’est une observation réelle.

## 1. Mission
Construire un MVP de stationnement intelligent hybride, testé d'abord sur un **jeu de données simulées** inspiré d'un quartier résidentiel, puis déployable en pilote rue Paul-Sougy, Orléans 45100, après inventaire et vérification terrain. Ne jamais présenter les données simulées comme réelles. Objectif : aider à trouver un stationnement légal, sans garantir qu'une place reste disponible.

## 2. Principes non négociables
- Distinguer **état d'occupation**, **droit de stationner**, **fraîcheur**, **source** et **confiance**.
- Une place PMR libre reste réservée ; exclure par défaut des recommandations aux conducteurs non autorisés. Prévoir d'autres restrictions : livraison, recharge, horaires, résidents, privé, arrêt interdit, travaux.
- Ne pas confondre « départ probable d'un véhicule » et « place publique réellement libérée ».
- Toute observation doit être horodatée et expirer selon source et validation empirique ; ne jamais annoncer « confirmé » sur simple déclaration.
- Pas de surveillance vidéo de la voie publique par des particuliers ; toute caméra future nécessite étude juridique, autorisations, AIPD si requise et contrôle de finalité.
- Minimisation des données de localisation ; consentements granulaires, suppression, rétention limitée, pseudonymisation, pas de suivi continu imposé.
- Aucun usage du téléphone tenu en main en conduite. Interactions vocales uniquement si OS, contexte et sécurité le permettent, sans sollicitation systématique. Pas d'activation clandestine du microphone en arrière-plan.
- Sources géographiques et restrictions doivent être tracées ; ne jamais inférer une autorisation à partir d'un simple espace vide sur la chaussée.

## 3. Périmètre du MVP
### Inclus
1. Recherche par code postal, commune, adresse et rayon autour d'une destination ; gérer les codes postaux multi-communes et les codes multiples d'une commune.
2. Carte par commune > quartier > rue > tronçon > emplacement lorsque connu ; afficher aussi les zones sans emplacements individuels cartographiés.
3. Inventaire des emplacements et restrictions avec provenance, date de contrôle et statut de vérification.
4. Signalements volontaires : place libérée, place occupée, zone saturée, obstruction présumée ; confirmation et modération.
5. Statuts visibles : libre observée, occupée observée, signalée libre, probablement disponible, inconnue, réservée/inaccessible. Ne pas mélanger occupation et légalité.
6. Notifications géographiques opt-in avec rayon, horaires silencieux, limitation de fréquence, désabonnement.
7. Détection expérimentale d'arrivée/départ via événements de mobilité OS, GPS approximatif et Bluetooth autorisé ; confirmation vocale ou différée ; modes dégradés iOS/Android.
8. Console admin : cartographie, import de données, validation terrain, modération, métriques, simulation.
9. Simulateur d'occupation reproductible pour un quartier fictif ; aucun état simulé dans l'environnement réel.
10. API documentée et tests automatisés.
### Hors MVP
Reconnaissance de plaques, caméra de rue, paiement, réservation de places publiques, sanction automatisée, disponibilité nationale réelle, prédiction ML prétendument calibrée, intégration Android Auto/CarPlay non validée.

## 4. Architecture cible
Monorepo pnpm + Turborepo :
```
apps/
  mobile/              # Flutter, dépôt séparé si nécessaire ; client OpenAPI généré
  admin/               # Next.js, MapLibre GL JS
  web/                 # Next.js landing + recherche accessible
services/
  api/                 # Node.js TypeScript, Fastify, Zod, OpenAPI
  prediction/          # Python FastAPI, règles puis ML seulement après données suffisantes
  simulator/           # générateur déterministe d'événements fictifs
packages/
  contracts/           # schémas OpenAPI, JSON Schema, types
  geo/                 # utilitaires géographiques
infra/
  docker/              # PostgreSQL/PostGIS, Redis optionnel, API, admin, simulator
  migrations/
  monitoring/
```
Prisma peut être utilisé pour le CRUD mais les opérations géospatiales PostGIS complexes passent par SQL paramétré. API en REST ; WebSocket/SSE pour mise à jour de carte. File d'événements Redis/BullMQ facultative au MVP, mais abstraire le bus. Auth OIDC ou sessions sécurisées ; RBAC USER/MODERATOR/ADMIN. Pas de dépendance à un service cartographique payant pour le développement local.

## 5. Modèle de données minimal
- `postal_areas(id, postal_code, commune_insee, label, geom)` ; index (postal_code, commune_insee).
- `communes(insee_code, name, geom)` ; `roads(id, commune_insee, name, geom)` ; `road_segments(id, road_id, geom, side, verified_at)`.
- `parking_spaces(id, segment_id, geom POINT, inventory_status, provenance, verified_at, visibility)` ; la présence de la géométrie ne prouve pas l'existence d'une place légale.
- `parking_rules(id, space_id nullable, segment_id nullable, category, valid_from, valid_to, recurring_schedule, permit_required, source_url, verified_at)` ; catégories GENERAL, PMR, DELIVERY, EV, PRIVATE, RESIDENT, NO_PARKING, TEMPORARY.
- `observations(id, space_id nullable, segment_id nullable, kind, occupancy, source, observed_at, received_at, expires_at, verification_level, confidence nullable, reporter_id nullable, moderation_status)` ; source USER, SENSOR, AUTHORIZED_CAMERA, MUNICIPAL_FEED, SIMULATION ; séparer l'origine des données de leur validation.
- `availability_snapshots(space_id/segment_id, occupancy_state, legal_state, freshness, confidence_level, computed_at, evidence_ids)` ; matérialisé et recalculable.
- `users(id, pseudonym, role, created_at)` ; `consents(user_id, purpose, granted_at, revoked_at)` ; `notification_preferences(user_id, area_geom, quiet_hours, enabled)` ; `devices(id, user_id, platform, push_token_encrypted)`.
- `trip_events(id, user_id, event_type, coarse_geom, observed_at, expires_at)` à conservation très courte, désactivé sans opt-in.
- `audit_log(id, actor_id, action, object_type, object_id, created_at)` sans localisation personnelle inutile.
Index GiST sur toutes les géométries ; index sur timestamps, états, commune et source. Contrainte interdisant `expires_at <= observed_at` ; idempotence des événements par `event_id`.

## 6. Moteur de disponibilité
Pipeline : ingestion -> validation schéma -> contrôle source et géométrie -> filtrage doublons et spam -> contrôle des règles légales -> agrégation des observations -> état et fraîcheur -> API/notifications.
- Prioriser les observations fiables et récentes ; gérer explicitement les contradictions.
- `FREE_CONFIRMED` uniquement pour une source technique autorisée et fraîche dont la fiabilité a été mesurée ; sinon `FREE_REPORTED`.
- `UNKNOWN` si aucune observation pertinente, si données expirées ou conflit non résolu.
- `LIKELY_AVAILABLE` uniquement comme estimation de zone clairement étiquetée, pas comme état vérifié d'une place.
- Ne jamais publier la position exacte d'un utilisateur, son historique de trajets ou ses habitudes.
- Une zone « saturée » signalée par un utilisateur ne prouve pas que toutes ses places sont occupées.
- Durées d'expiration configurables par type de source et par quartier ; valeurs initiales de simulation seulement, à recalibrer après pilote.

## 7. Voix et détection de départ — recherche future, hors périmètre immédiat
Machine à états : `IDLE -> PARKING_CANDIDATE -> PARKED_PROBABLE -> DEPARTURE_CANDIDATE -> CONFIRMATION_PENDING -> REPORTED | DISMISSED | EXPIRED`.
Indices possibles : mouvement OS, arrêt prolongé, géolocalisation consentie, association/déconnexion Bluetooth. Écarter les cas domicile privé, garage, passager ou stationnement non vérifié ; si doute, ne pas publier.
- La confirmation doit être **explicite** : oui / non / plus tard. Absence de réponse = aucune publication.
- Fonctionnement iOS/Android à valider sur appareils physiques : limites des micros en arrière-plan, permissions, déclenchement audio, CarPlay/Android Auto, règles de distraction. Ne pas promettre une écoute permanente.
- Préférer un parcours où l'assistant ne sollicite pas activement pendant la conduite ; confirmation à l'arrêt, commande initiée par l'utilisateur via interface autorisée, ou notification différée.
- Journaliser uniquement le résultat de confirmation, pas l'enregistrement vocal brut par défaut.

## 8. API REST initiale
- `GET /v1/geo/postal-codes?query=45100`
- `GET /v1/geo/communes?postalCode=45100`
- `GET /v1/parking/areas?lat=&lon=&radiusM=&vehicleType=`
- `GET /v1/parking/spaces?bbox=&legalFor=&observedAfter=`
- `GET /v1/parking/spaces/:id` (état, preuve agrégée, restrictions, fraîcheur)
- `POST /v1/observations` (auth, validation, anti-abus, idempotency-key)
- `POST /v1/departures/confirm` (oui/non/plus tard, événement lié à session)
- `GET /v1/recommendations?destinationLat=&destinationLon=&radiusM=&vehicleType=`
- `GET/PUT /v1/me/notification-preferences`
- `DELETE /v1/me/data`
- `GET /v1/admin/moderation` ; `POST /v1/admin/inventory/import` ; `POST /v1/admin/inventory/verify`
- `GET /v1/events/stream` SSE
Documenter OpenAPI, pagination, versionnement, rate limits, erreurs normalisées, contrôle RBAC.

## 9. Algorithme de recommandations
1. Géocoder la destination ; résoudre ambiguïtés de code postal/commune.
2. Récupérer les emplacements et zones dans le rayon demandé.
3. Exclure les places illégales/incompatibles pour le profil choisi ; ne pas considérer PMR comme une simple préférence.
4. Évaluer la fraîcheur et la qualité des observations, les conflits, l'accessibilité et la distance piétonne (si routage disponible).
5. Retourner les zones recommandées avec explication : « observation récente », « donnée ancienne », « estimation historique », « restrictions à vérifier ».
6. Ne pas réserver ni garantir une place ; recalculer à l'approche de la destination.
Un classement heuristique initial est acceptable ; ne pas présenter ses scores comme probabilités empiriquement validées.

## 10. Simulateur et scénarios de test
Créer un quartier **fictif** `SIM-45100`, distinct de toute donnée réelle, avec 4 rues, 60 emplacements, dont PMR, livraison, privés et temporaires. Horloge accélérée, graine aléatoire fixe, scénarios : départ confirmé, fausse détection, occupation avant arrivée, observation expirée, deux rapports contradictoires, signalement malveillant, changement de réglementation, GPS imprécis, perte réseau, utilisateur passager, absence de consentement, interruption de la synthèse vocale.
Afficher en permanence `MODE SIMULATION — DONNÉES FICTIVES`.

## 11. Données externes et licences
Étudier : Base officielle des codes postaux, API Découpage administratif, BAN/géocodage Géoplateforme, OpenStreetMap, jeux de données Orléans Métropole sur parkings équipés et PMR. Vérifier au moment de l'intégration : endpoints, fréquence, licence, attribution, périmètre et disponibilité. Les données de parkings équipés ne doivent pas être interprétées comme l'occupation de chaque place de rue.

## 12. Sécurité, RGPD et exploitation
TLS, secrets hors dépôt, permissions minimales, chiffrement des jetons push, validation entrées, protection anti-spam, contrôle d'accès aux imports, sauvegardes, migrations, journaux techniques sans coordonnées fines, politiques de rétention configurables, registre des traitements, droits d'accès/suppression, politique de confidentialité. Analyse d'impact à déterminer selon les traitements réels. Interdire toute reconnaissance de plaques ou suivi individuel dans le MVP.

## 13. Indicateurs du pilote
- Taux de faux positifs « place libre » vérifié sur le terrain.
- Précision des observations selon source et ancienneté.
- Temps médian de recherche d'une place avant/après, si comparaison méthodologiquement possible.
- Couverture d'inventaire vérifiée, densité des signalements, latence des notifications, incidents de sécurité et demandes de suppression.
Cible de collecte : 20–30 volontaires et au moins 100 observations vérifiées ; ces nombres sont des objectifs, non des résultats acquis.

## 14. Plan historique en six sprints — remplacé par la séquence v1.3 (§24)
1. Socle monorepo, Docker, PostGIS, géocodage, données simulées, CI.
2. Inventaire et règles légales, carte admin, import/export.
3. API d'observations, agrégateur, états/fraîcheur, tests de conflits.
4. Mobile Flutter : recherche code postal, carte, détails, signalement manuel à l'arrêt.
5. Notifications opt-in, machine à états départ, preuve de concept voix sur appareils réels, repli différé.
6. Simulateur complet, tableaux de bord, tests terrain, documentation, revue sécurité/RGPD.
Le planning est indicatif, dépendant des validations et du périmètre.

## 15. Critères d'acceptation
- `docker compose up` démarre un environnement de démonstration fonctionnel et documenté.
- Un code postal ambigu présente le choix de la commune.
- Une place PMR vide n'apparaît pas comme place publique libre pour un conducteur non autorisé.
- Un signalement expiré ne reste pas affiché « libre ».
- Un « oui » vocal n'entraîne aucune publication sans session de départ plausible et consentement ; un silence ne publie rien.
- La simulation est clairement séparée des données réelles.
- Tests unitaires, intégration API/PostGIS, tests E2E web et tests mobile des flux critiques.
- Documentation d'installation, diagramme d'architecture, migrations, jeu de données seed, OpenAPI, procédure de suppression des données.

## 16. Consigne initiale à Codex
« Inspecte d'abord le dépôt et ses conventions. Propose un plan d'implémentation par lots avant toute modification. Implémente en premier le socle, le schéma PostGIS, les données fictives, l'API de lecture et la carte de simulation. Exécute les tests et indique précisément ce qui est réalisé, simulé, bloqué ou non vérifié. Ne crée jamais de fausses données présentées comme réelles et ne prétends pas que les fonctions vocales en arrière-plan fonctionnent sans tests sur appareils. »


---
## 17. Extension v1.2 — Smart Arrival & Departure (recherche conditionnelle, non prioritaire)
### 17.1 Objectif
Détecter **deux événements distincts** : (a) arrivée et occupation probable d'un emplacement ; (b) départ et libération probable d'un emplacement. Le fait que le véhicule soit arrêté **avant la coupure du moteur** peut générer un `STOP_CANDIDATE`, mais ne prouve ni l'occupation d'une place ni l'état du moteur. Le téléphone ne lit pas universellement le contact ou le moteur. L'OBD-II, lorsqu'il est disponible et consenti, reste un connecteur optionnel et non une dépendance.

### 17.2 Machine à états et événements
États de session : `IDLE -> DRIVING -> STOP_CANDIDATE -> PARKING_CANDIDATE -> PARKED_PROBABLE -> PARKED_CONFIRMED -> DEPARTURE_CANDIDATE -> DEPARTED_CONFIRMED`, avec issues `AMBIGUOUS`, `CANCELLED`, `EXPIRED`. Les transitions ne sont pas nécessairement linéaires ; gérer perte de permission, perte GPS, redémarrage application et redémarrage téléphone.

Événements métier : `ARRIVAL_CANDIDATE`, `PARKING_CANDIDATE`, `PARKING_CONFIRMED`, `DEPARTURE_CANDIDATE`, `SPACE_OCCUPIED_REPORTED`, `SPACE_RELEASED_REPORTED`, `OBSERVATION_EXPIRED`, `EVENT_RETRACTED`. Séparer **événement du véhicule**, **observation d'une place** et **état public agrégé**.

### 17.3 Fusion des signaux
Sources facultatives : activité automobile/stationnaire/marche (Android Activity Recognition ; iOS Core Motion), localisation et précision GPS (Android Fused Location Provider ; iOS Core Location), durée d'immobilité, géométrie et côté de rue, Bluetooth automobile, confirmation volontaire, flux capteur autorisé. Déterminer la compatibilité de chaque signal par OS et état d'exécution ; aucun capteur seul ne permet de conclure.

- Un GPS imprécis pouvant correspondre à plusieurs places **ne doit jamais sélectionner arbitrairement une place** ; publier au mieux une observation de tronçon, clairement qualifiée.
- Le départ d'un passager ne prouve pas la libération d'une place par son véhicule ; prévoir choix « Je conduis / Je suis passager » facultatif, sans inférence abusive.
- Dépose-minute, feux rouges, embouteillages, garages, parkings privés, arrêt moteur sans stationnement, marche à proximité et Bluetooth partagé doivent être couverts par les tests.
- En l'absence de preuve, rester `UNKNOWN` pour la place. Les statuts `*_REPORTED` restent des signalements, même si le conducteur a confirmé oralement.
- Ne pas fusionner automatiquement les positions individuelles de plusieurs utilisateurs en trajectoires publiques.

### 17.4 Interaction vocale et sécurité
L'utilisateur active explicitement la fonctionnalité ; préférer une commande initiée dans un contexte compatible ou une confirmation différée à l'arrêt. Le texte vocal proposé : « Vous semblez être stationné. Confirmez-vous ? » ou « Vous semblez avoir quitté une place. Confirmez-vous ? » ; réponses « Oui », « Non », « Plus tard ». Silence, doute, interruption ou permission manquante : **aucune publication**. Pas d'écoute permanente ni de microphone activé clandestinement. Tester les limitations de lancement de reconnaissance vocale en arrière-plan iOS/Android ; aucune promesse d'interaction automatique pendant la conduite. Éviter les notifications distrayantes et les manipulations tactiles en roulant.

### 17.5 Contrat logiciel
Créer des interfaces testables : `MotionSignalProvider`, `LocationSignalProvider`, `VehicleConnectionProvider`, `VoiceConfirmationProvider`, `ParkingDetectionEngine`, `ParkingEventFusionService`, `ParkingObservationPublisher`. Implémentations : `Simulated*`, `Android*`, `IOS*` selon faisabilité. Exposer des événements de diagnostic anonymisés, avec motif de décision, précision géographique et statut de permission. Ne pas stocker les fichiers audio par défaut.

### 17.6 API et données supplémentaires
- `POST /v1/mobility/sessions` : démarrage volontaire d'une session, paramètres et consentements.
- `POST /v1/mobility/events` : événements idempotents, horodatés, origine et précision ; ne pas accepter de verdict « confirmé » auto-déclaré par un client non fiable.
- `POST /v1/mobility/confirmations` : réponse explicite liée à une session valide et à un événement candidat.
- `GET /v1/me/mobility-settings` / `PUT /v1/me/mobility-settings` : préférences, permission et mode de fonctionnement.
- `GET /v1/admin/mobility-diagnostics` : métriques agrégées sans trajets individuels.

Tables proposées : `mobility_sessions`, `mobility_signals` (rétention courte), `parking_candidates`, `confirmation_events`, `source_capabilities`, `event_retractions`. Prévoir TTL, suppression utilisateur, horodatages client/serveur, version de l'algorithme et clef d'idempotence.

## 18. Recherche et réutilisation de projets GitHub / API
Avant de réutiliser un dépôt, Codex doit produire `docs/opensource-review.md` avec : URL, objectif, activité de maintenance, licence exacte vérifiée dans le dépôt, dépendances, sécurité, intérêt, limites et décision `ADOPT / STUDY / REJECT`. **Ne jamais copier du code d'un dépôt dont la licence n'a pas été vérifiée**. Les dépôts ci-dessous sont des **pistes à auditer**, pas des dépendances approuvées :
- https://github.com/jt-09/smart-parking-space-detector — détection visuelle d'emplacements ; vérifier notamment les obligations AGPL si la licence actuelle est bien AGPL.
- https://github.com/amnaabdul/ParkVision-AI — architecture de supervision et détection ; vérifier licence et disponibilité ; examiner aussi le risque de confusion sur le nom « ParkVision ».
- https://github.com/lotvulture/lotvulture — connecteurs vidéo/événements ; vérifier licence, hébergement et éventuels coûts.

Créer `docs/data-source-register.md` : fournisseur, URL officielle, finalité, données couvertes, licence, attribution, fréquence, limite de requêtes, disponibilité, mécanisme de mise en cache et date de vérification. Sources candidates :
- Orléans Métropole : parkings équipés (occupation agrégée), emplacements PMR (inventaire, pas occupation live).
- Base officielle des codes postaux + codes INSEE ; API Découpage administratif.
- Géocodage Géoplateforme / BAN : recherche d'adresses.
- OpenStreetMap/Overpass : voies et stationnements *cartographiés*, sans preuve d'occupation ; respecter ODbL et politiques d'usage des serveurs publics.
- Android Activity Recognition / Fused Location Provider ; iOS Core Motion / Core Location : événements de mobilité, **pas API d'état moteur ni API de disponibilité des places**.

Définir des adaptateurs `Geocoder`, `ParkingInventoryFeed`, `OccupancyFeed`, `MapDataProvider`, `MobilitySignals`; fournir des mocks hors ligne et ne pas rendre le MVP dépendant d'un fournisseur unique. Vérifier les endpoints actuels lors de l'implémentation. Éviter les requêtes massives directes aux instances publiques d'Overpass.

## 19. Pilote expérimental réel — rue Paul-Sougy, Orléans (manuel d’abord ; natif séparé)
### Étapes
1. **Simulation** : quartier fictif `SIM-45100` avec 60 emplacements, tests de transitions, données contradictoires et restrictions ; aucun mélange avec le quartier réel.
2. **Audit terrain** : inventaire manuel des places et tronçons autorisés, côté de rue, panneaux, PMR, zones privées et horaires ; enregistrer provenance, date et incertitude ; pas de surveillance vidéo de la voie publique.
3. **Tests sur téléphones** : au minimum un Android et un iPhone ; comparer premier plan, arrière-plan, écran verrouillé, permissions limitées, mode économie d'énergie, perte réseau et Bluetooth absent.
4. **Collecte encadrée** : viser 100 trajets/tests documentés, comprenant vrais stationnements et cas négatifs (feu, bouchon, dépose-minute, passager, garage) ; recueillir les confirmations uniquement à l'arrêt, selon un protocole sûr.
5. **Évaluation** : matrice de confusion arrivée/départ, faux positifs par heure, événements manqués, délai médian, précision géographique, autonomie consommée, refus de permissions et taux de confirmations ; publier les limites, sans promesse de temps réel.

### Seuils de décision
Les objectifs numériques de performance ne doivent pas être inventés. Définir des seuils go/no-go **avant** la campagne de tests, puis documenter résultats, intervalles d'incertitude et différences Android/iOS. Si la localisation ne distingue pas des places adjacentes, limiter la sortie au **tronçon** ou à la **zone**.

### Vie privée
Pas de suivi permanent obligatoire ; possibilité de mode manuel. Géolocalisation précise activée uniquement si nécessaire et consentie ; conserver le minimum de données, avec TTL documenté et purge testée. Ne pas exposer les horaires récurrents ou le domicile des volontaires. Vérifier les bases légales et obligations RGPD avant pilote.

## 20. Séquence d’implémentation v1.3 — arbitrage exécutoire
**Lot 0 — Audit sans modification** : inspecter le dépôt, dépendances, licences, contraintes et documenter les écarts.
**Lot 1 — Socle exécutable, AUTORISÉ** : Docker Compose, PostGIS, migrations, seed fictif 60 places/4 rues, recherche code postal et commune, API de lecture OpenAPI, carte web MapLibre, tests et README.
**Lot 2 — Simulation et signalement manuel simulé, AUTORISÉ** : flux « Je me gare / Je pars » uniquement à l’arrêt, observations horodatées, expiration, conflits, modération minimale, recalcul des états, SSE si justifié, scénarios déterministes et tests. Aucune donnée de mobilité native ni voix.
**Jalon P — Pilote terrain manuel, NON AUTORISÉ PAR DÉFAUT** : inventaire de Paul-Sougy et règles vérifiées, 20–30 volontaires visés, 3–4 semaines, consentements, protocole d’observation et évaluation. Démarrage seulement après revue du socle, des risques, des autorisations et décision explicite du porteur.
**Lot R — Recherche automatique indépendante, CONDITIONNELLE** : étude Android/iOS de détection et voix, sur simulateur ou appareils volontaires, sans publication vers la carte publique. Décision go/no-go distincte.
**Lots ultérieurs — CONDITIONNELS** : Flutter complet, notifications, prédiction statistique, capteurs, caméras, partenaires, extension géographique. Aucune promesse de délai ni de coût sans mesures.

**Règle Codex :** exécuter seulement les lots 1 et 2 après audit. Ne pas démarrer le pilote, le natif, la voix ou les services payants sans instruction ultérieure explicite.

## 21. Critères d'acceptation v1.2 supplémentaires
- Un arrêt moteur **non observé** n'est jamais inféré comme certain.
- Un feu rouge et une dépose-minute ne publient pas d'occupation confirmée.
- Un départ ne publie pas de place libre sans correspondance géographique crédible et confirmation ou source instrumentée fiable.
- Une confirmation vocale « oui » hors session candidate valide ne change rien.
- Une permission refusée n'empêche pas le mode manuel.
- Les observations issues du mobile sont distinguées des mesures de capteurs autorisés.
- Le système fonctionne en simulation hors ligne, avec événements reproductibles.
- Les données Orléans Métropole de parkings équipés ne sont jamais extrapolées aux places de rue.
- Les licences des bibliothèques et dépôts candidats sont vérifiées avant adoption.
- Le pilote produit un rapport de qualité mesurée, y compris les échecs.

## 22. Prompt de démarrage consolidé pour Codex — v1.3
> Lis intégralement `ParkVision_Cahier_des_charges_Codex_v1_3.md` et inspecte le dépôt. **La section 24 prévaut sur les sections héritées**. Fais un audit succinct, puis réalise **uniquement les lots 1 et 2** : socle PostGIS/cartographie simulée, API, simulateur déterministe et signalements manuels simulés « Je me gare / Je pars ». Pas de géolocalisation native, de détection automatique, de microphone, de collecte terrain ni de prédiction IA à ce stade. Les données fictives doivent être visuellement marquées. Fournis migrations, seed, OpenAPI, tests, README, journal des décisions, liste des limites et preuves des commandes exécutées. Ne prétends pas qu’un test non exécuté est réussi. Demande validation avant toute dépense, dépendance à licence contraignante, collecte réelle ou lot conditionnel.

## 23. Journal des modifications
- **v1.0** : architecture nationale, cartographie, disponibilités, restrictions, signalements, voix de départ et simulateur.
- **v1.2** : ajout arrivée **avant coupure du moteur** comme hypothèse d'arrêt, détection bidirectionnelle, API mobilité, compatibilité native, revue GitHub/licences, registre des API, pilote 100 trajets, stratégie de tests et consigne Codex consolidée.


---
## 24. Arbitrages v1.3 — validation produit avant automatisation (PRIORITÉ SUR TOUTE SECTION ANTÉRIEURE)

### 24.1 Hypothèse produit à vérifier
ParkVision doit réduire l’effort de recherche d’un stationnement **légal** en quartier résidentiel. Le risque principal est l’**amorçage communautaire** : une faible proportion de conducteurs équipés peut rendre les observations insuffisantes, même si les signalements sont exacts. La détection automatique n’est ni une condition de lancement ni une solution présumée à ce risque.

**Hypothèses séparées à mesurer :** (A) assez de participants actifs ; (B) participation suffisante par utilisateur ; (C) observations exactes et fraîches ; (D) utilité concrète pour les personnes qui cherchent une place. Ne pas confondre ces causes d’échec.

### 24.2 Périmètre engagé maintenant
1. Carte fictive de 60 emplacements répartis sur quatre rues fictives `SIM-45100`, distinctes de Paul-Sougy ; couleurs et légendes accessibles, avertissement permanent « SIMULATION — DONNÉES FICTIVES ».
2. Recherche par code postal avec désambiguïsation commune/code INSEE, géocodage abstrait et adaptateur mock ; pas de couverture nationale d’occupation annoncée.
3. Restrictions séparées de l’occupation : PMR, livraison, privé, horaires, temporaire, inconnu ; provenance des règles et date de vérification.
4. Simulation de signalements manuels « Je me gare » / « Je pars », confirmation explicite et facultative, uniquement lorsque l’utilisateur est à l’arrêt ; en simulation, aucun suivi GPS n’est nécessaire.
5. Observations immuables et horodatées, source, niveau de vérification, durée de validité, contradictions, anti-spam minimal, idempotence ; affichage `FREE_REPORTED`, `OCCUPIED_REPORTED`, `UNKNOWN`, jamais `FREE_CONFIRMED` sur simple déclaration.
6. API versionnée, PostGIS, tests, journal d’événements, tableau de bord de simulation et documentation de lancement local. Éviter la complexité d’infrastructure non nécessaire ; Redis, ML et mobile natif sont facultatifs ou différés.

### 24.3 Exclusions explicites des lots 1–2
- Flutter iOS/Android et permissions natives de mobilité ; détection GPS/Bluetooth/OBD-II ; activation microphone, TTS/STT et assistant vocal ; Android Auto/CarPlay.
- Notifications push en production, prédiction IA, analyse vidéo, caméras, capteurs, collecte de trajets, monitoring individuel et import d’observations réelles de rue.
- Déploiement public, réservation d’emplacement, paiement et garantie de disponibilité.
- Le code peut prévoir des **interfaces** (`MobilitySignals`, `OccupancyFeed`, `VoiceConfirmation`) sans implémenter leurs adaptateurs réels ni leurs permissions.

### 24.4 Pilote manuel — protocole à préparer, pas à lancer automatiquement
**Site envisagé :** rue Paul-Sougy, 45100 Orléans, sous réserve d’inventaire réel des places publiques, règles et autorisations. Ne jamais supposer qu’il y a 60 places sur cette rue : ce nombre concerne uniquement le simulateur.

**Plan d’étude proposé :** 20–30 volontaires, 3–4 semaines, au moins 100 observations contrôlées ; ces valeurs sont des objectifs d’essai, non une garantie de couverture. Consentement explicite et possibilité de retrait. Aucune interaction avec le téléphone pendant la conduite. Prévoir des relevés terrain indépendants et sécurisés, avec une méthode d’échantillonnage et une distinction entre observations vérifiées et simples déclarations.

**Mesures à produire :** participants actifs/jour, nombre de signalements par participant et par tranche horaire, proportion des places/tronçons couverts, ancienneté des données au moment de consultation, précision à 2/5/10 minutes, taux de fausses annonces « libre », recherches abouties, temps de recherche si comparable, retours d’utilité, refus et abandons. Mesurer séparément la valeur d’une carte des règles même si l’occupation est peu renseignée.

**Cibles exploratoires à discuter avant pilote :** ≥70 % des signalements contrôlés encore exacts à 5 minutes ; ≥60 % des répondants jugeant le service utile. Ce ne sont pas des seuils validés scientifiquement. Définir le dénominateur, le protocole, les intervalles d’incertitude et les seuils go/no-go **avant** collecte. Le nombre d’observations seul ne suffit pas à déclarer un succès.

### 24.5 Décision go/no-go à l’issue du pilote
- **GO pour poursuivre le produit** si des usages utiles et reproductibles sont observés, avec transparence sur la fraîcheur et un risque de fausses annonces acceptable selon critères prédéfinis.
- **PIVOT** vers carte réglementaire, parkings équipés ou partenariats si la couverture communautaire est trop faible mais que les informations statiques rendent service.
- **NO-GO pour automatisation coûteuse** si aucune hypothèse crédible ne justifie que plus d’observations amélioreront réellement la valeur. Documenter les résultats négatifs.

### 24.6 Recherche native ultérieure — expérience indépendante
Si le pilote justifie un investissement, prototyper hors production la reconnaissance de stationnement/ départ sur Android et iOS avec groupe témoin manuel. Mesurer précision, rappel, faux positifs (feu, bouchon, dépose-minute, garage, passager), consommation batterie, latence, permissions et restrictions OS. Un départ détecté ne prouve pas qu’une place publique reste libre. Ne publier aucun événement natif sans validation du protocole et des garde-fous. Voix seulement si techniquement faisable et non distractive, avec repli différé.

### 24.7 Contrats d’acceptation des lots 1–2
- `docker compose up --build` ou procédure documentée équivalente lance le prototype local.
- 60 emplacements fictifs reproductibles, aucun emplacement fictif confondu avec Paul-Sougy.
- Recherche `45100` et choix de commune démontrables avec données mock/documentées.
- Signalements « Je me gare » / « Je pars » simulés modifient les états affichés et alimentent l’historique.
- Un signalement expiré ou contradictoire retourne à `UNKNOWN` ou à un état prudent, jamais à « libre confirmé ».
- Les places PMR et autres restrictions restent exclues des recommandations incompatibles même si vides.
- Tests automatisés de transitions, anti-doublons, idempotence, expiration, conflit, filtrage légal et séparation simulation/réel.
- Documentation d’architecture, OpenAPI, migrations, README, `.env.example`, résultats de tests et limitations connues.

### 24.8 Livrables et règles de décision
Codex doit remettre un tableau `fait / simulé / non fait / non testé`, le détail des commandes exécutées, un journal des décisions et les prochaines hypothèses à tester. Toute modification de périmètre exige validation explicite. Le projet reste **hybride à terme**, mais son premier lancement est **manuel et simulé**, puis **manuel réel si autorisé**.

## 25. Journal des modifications v1.3
- **v1.3** : priorité à l’amorçage et à la valeur d’usage ; lots 1–2 uniquement ; signalement manuel au lieu de détection native dans le MVP ; pilote manuel préalable à toute automatisation ; seuils go/no-go et recherche native séparée ; clarification des exclusions et des critères de livraison.
