# Carnet Forme : passer de l'artefact Claude à une web app

## Contexte

J'utilise un artefact Claude, « Carnet Forme », pour suivre au quotidien :
- mes séances de sport, avec un carnet de musculation détaillé et des séances proposées ;
- un catalogue d'exercices ;
- mes repas (protéines et calories) et ma prise de créatine.

Je veux en faire une **petite web app gratuite**, utilisée sur **iPhone** (ajoutée à l'écran d'accueil). Je veux pouvoir **donner le lien à quelques amis** : chacun peut se créer un compte s'il le souhaite et utiliser l'app avec **ses propres données**, invisibles pour les autres. L'app doit continuer à fonctionner sans abonnement Claude.

**Fichier de référence :** `carnet-forme.html` (fourni avec ce brief). C'est le code complet de l'artefact actuel, sans aucune donnée personnelle. Il sert de base : on garde le design, les textes et le comportement, et on remplace seulement ce qui dépend de Claude (voir plus bas).

## Fonctionnalités existantes à conserver

Toute l'interface est en français, pensée d'abord pour mobile, avec un thème clair et sombre.

**Ordre des onglets : Séances, Exercices, Nutrition.** L'app s'ouvre sur Séances par défaut, puis se souvient du dernier onglet utilisé.

**En-tête commun**
- Navigation par jour : jour précédent, aujourd'hui, jour suivant. On ne peut pas aller dans le futur.

**Onglet Séances**
- Séance du jour : Musculation, Natation, Cyclisme, Punch boxing, Autre, Repos (plusieurs choix possibles).
- Fiche Musculation, affichée seulement si « Musculation » est cochée ce jour-là :
  - toute la fiche se replie, et chaque exercice aussi ;
  - ajout d'exercice par des boutons de suggestion : les plus fréquents d'abord, puis une liste de classiques, avec filtrage pendant la saisie. Un nom inconnu crée un nouvel exercice ;
  - séries notées en kg × reps, affichées en pastilles supprimables ;
  - préremplissage : la dernière série du jour, sinon l'objectif de la séance proposée, sinon la **dernière série** de la séance précédente sur cet exercice ;
  - « Dernière fois (date) : … », historique des 5 dernières séances, indicateur ↑ quand la charge maximale progresse ;
  - « Objectif : 3 × 10 · 60 kg » et l'avancement (2/3 séries) quand l'exercice vient d'une séance proposée ;
  - tonnage = Σ charge × reps, par exercice et pour la séance, comparé à la séance précédente ;
  - tractions : charge = poids de corps + lest (affichage « PDC+10×8 ») ;
  - interrupteur « par bras (tonnage ×2) » par exercice, mémorisé. Il est activé d'office pour les curls sans « barre » et pour les noms contenant haltère, dumbbell ou unilatéral ;
  - minuteur de repos : durée au choix (1:00, 1:30, 2:00, 3:00, choix mémorisé), lancé automatiquement à chaque « + Série » ou à la main. Barre fixe en bas avec +15 s et arrêt, bips à la fin, demande de garder l'écran allumé.
- Calendrier mensuel :
  - points de couleur par sport, marque « objectif protéines atteint », marque créatine ;
  - un tap sur un jour passé l'ouvre ;
  - sous le calendrier : nombre de séances du mois par sport, en barres horizontales.

**Onglet Exercices**
- **Prochaine séance** (bouton « Proposer une séance »), calculée sans IA à partir de l'historique :
  - un full body est proposé en premier (jambes, pecs, dos, épaules, plus un bras et un tronc ou bas du corps choisis parmi les moins travaillés récemment) ; « Autre proposition » passe ensuite aux séances ciblées Poussée, Tirage et Jambes, la plus reposée d'abord ;
  - rappel de la dernière séance et du temps de récupération par groupe musculaire ;
  - choix des exercices selon mes habitudes sur 60 jours (en full body, alternance avec ceux de la dernière séance) ; bouton ↻ pour remplacer un exercice par un autre du même groupe ;
  - objectif par exercice avec une règle de progression : 12 reps tenues → +2,5 kg (+2 kg aux haltères) et retour à 8 reps ; sinon même charge et une rep de plus ; reprise après plus de 21 jours → mêmes charges ; nouvel exercice → 3 × 10, à toi de trouver la charge ;
  - « Ajouter à la séance du jour » ajoute tous les exercices avec leur objectif.
- **Catalogue** d'environ 55 exercices de salle : recherche par nom ou muscle, filtres par groupe musculaire et par matériel (barre, haltères, machine, poulie, poids du corps), muscles travaillés, 2 ou 3 consignes, date de dernière réalisation, bouton « + Séance ».
- Les exercices que je crée moi-même dans une séance apparaissent aussi dans le catalogue (étiquette « Ajouté par toi »). Dans l'artefact, ils sont classés par IA (groupe, matériel, muscles, consignes) ; sans IA, ils restent dans un groupe « Autres » avec l'étiquette « À classer » (voir plus bas).

**Onglet Nutrition**
- Bloc « Repas du jour » avec deux compteurs côte à côte :
  - protéines : objectif = poids × g/kg, 1,8 g/kg par défaut ;
  - calories : objectif facultatif.
- Bouton rapide « Shaker whey » qui ajoute 25 g de protéines et 113 kcal en une seule ligne liée.
- **Seule la saisie manuelle est affichée pour l'instant** : nom, kcal et g de protéines (au moins un des deux). Le mode « Décrire le repas » (estimation par IA) existe dans le code mais est masqué ; il reviendra éventuellement plus tard (phase 2).
- Une seule liste, avec une ligne par repas. Les kcal et protéines d'un même repas sont liées par un champ `link`. Chaque ligne a une croix de suppression, et un bandeau « Annuler » reste affiché 6 s après une suppression.
- Créatine : case prise / pas prise, dose réglable, nombre de jours d'affilée.
- Réglages : poids, g/kg, dose de créatine, objectif kcal.

## Modèle de données actuel

Une entrée par jour, avec la date comme clé (`AAAA-MM-JJ`) :

```json
{
  "date": "2026-10-16",
  "protein": [{ "label": "Shaker whey", "g": 25, "link": "m…" }],
  "kcal": [{ "label": "Déjeuner", "kcal": 650, "link": "m…" }],
  "creatine": true,
  "sports": ["muscu", "natation"],
  "rest": false,
  "workout": [{ "ex": "Développé couché", "sets": [{ "kg": 60, "reps": 10 }], "plan": { "sets": 3, "reps": 10, "kg": 60 } }]
}
```

Réglages (un seul objet par utilisateur) :

```json
{
  "weight": 78, "factor": 1.8, "dose": 5, "kcalTarget": 2600,
  "perArm": { "curl biceps": true },
  "customEx": [{ "n": "Hip abduction", "g": "fessiers", "e": "machine", "m": "Moyen fessier", "c": ["…"] }]
}
```

Identifiants des sports : `muscu`, `natation`, `cyclisme`, `boxe`, `autre`. Groupes musculaires : `pecs`, `dos`, `epaules`, `biceps`, `triceps`, `jambes`, `fessiers`, `mollets`, `abdos`, `autres`. Matériel : `barre`, `halteres`, `machine`, `poulie`, `pdc`.

## Ce qui dépend de Claude dans le code actuel (à remplacer)

1. **Stockage** : `claude.use("db")`, avec la collection `days` (un document par jour) et le document `settings/main`.
   - À remplacer par une **couche de stockage unique** (ex. `storage.getAll()`, `storage.saveDay(k, data)`, `storage.saveSettings(s)`) pour pouvoir changer de backend sans toucher à l'interface.
   - Le code a déjà un mode de secours `localStorage`, qui peut servir de point de départ.
2. **IA** : `claude.use("sample")`, utilisé à deux endroits :
   - l'estimation des repas (`sample.json`, prompt dans le fichier) — masquée pour l'instant ;
   - le classement des exercices créés à la main (fonction `classify`).
   - En phase 1, **pas d'IA** : retirer ces appels proprement. Les exercices créés restent « À classer » dans le groupe « Autres » ; prévoir un petit formulaire pour que l'utilisateur choisisse lui-même le groupe et le matériel.
3. Les petites préférences `localStorage` (onglet ouvert, durée de repos) peuvent rester telles quelles.

## Choix techniques retenus

- **Backend : Supabase** (offre gratuite), pour la base de données Postgres et l'authentification.
- **Comptes : adresse e-mail + mot de passe** (Supabase Auth), **inscriptions ouvertes** à toute personne qui a le lien.
  - Écran de connexion et écran « Créer un compte » dans le style de l'app.
  - **Confirmation de l'adresse e-mail** activée, pour limiter les faux comptes. Me dire si un captcha (proposé par Supabase) vaut le coup.
  - La session reste ouverte sur l'iPhone pour ne pas devoir se reconnecter à chaque ouverture.
  - « Mot de passe oublié », « Se déconnecter » et « Supprimer mon compte et mes données » dans les Réglages.
- **Sécurité : Row Level Security activée** sur toutes les tables, avec des politiques `user_id = auth.uid()` en lecture comme en écriture. Chaque utilisateur ne voit que ses données. Seule la clé publique (anon) va dans le front, **jamais** la clé `service_role`.
- **Front** : Supabase n'est pas fait pour héberger le site lui-même. La page doit être servie par un hébergeur statique gratuit (GitHub Pages, Netlify ou Cloudflare Pages). Me proposer le plus simple pour moi.
- **Limites des offres gratuites** : vérifier les limites actuelles de Supabase et de l'hébergeur (nombre d'utilisateurs, stockage, e-mails d'authentification par heure, mise en pause d'un projet inactif…) et me dire si elles posent problème pour moi et quelques amis.

## Plan proposé, par étapes

### Phase 1 : web app multi-comptes, sans IA
- Découper le fichier en projet propre : HTML, CSS, JS. Pas de framework obligatoire, le vanilla JS actuel suffit, avec le client `supabase-js`.
- Schéma proposé (à affiner) :
  - table `days` (`user_id`, `date`, `data jsonb`, `updated_at`), clé primaire (`user_id`, `date`) ;
  - table `settings` (`user_id` en clé primaire, `data jsonb`, `updated_at`) ;
  - garder le JSON actuel tel quel dans `data`, pour réutiliser le code existant.
- Pour un nouveau compte : écran vide accueillant, qui invite à renseigner son poids dans les Réglages.
- Couche de stockage : Supabase comme source de vérité, et **IndexedDB comme cache local**, pour ouvrir l'app et saisir même sans réseau à la salle. Les modifications faites hors ligne sont envoyées au retour du réseau (la dernière écriture gagne, ce qui suffit pour un utilisateur sur ses appareils). Vider le cache local à la déconnexion, pour qu'un autre compte sur le même téléphone ne voie rien.
- En faire une **PWA** :
  - `manifest.webmanifest` avec nom, couleurs et une icône perso ;
  - `apple-touch-icon` pour l'écran d'accueil iPhone ;
  - service worker pour le fonctionnement hors ligne.
- Boutons **Exporter mes données** (fichier JSON daté) et **Importer** (avec confirmation avant d'écraser) dans les Réglages, pour sauvegarder et pour récupérer mon historique de l'artefact.
- Me fournir le SQL (tables + politiques RLS) à coller dans Supabase, et un pas-à-pas pour : créer le projet Supabase, régler l'authentification (inscriptions, confirmation e-mail, adresses de redirection), mettre le site en ligne, l'installer sur l'iPhone, et partager le lien à mes amis.

### Phase 2 (plus tard) : IA pour l'estimation des repas et le classement des exercices
- Relais via une **Supabase Edge Function** qui appelle l'**API Claude**. La clé API est stockée dans les secrets Supabase, **jamais dans le front**.
- La fonction n'accepte que les utilisateurs connectés, avec une limite d'appels par utilisateur et par jour.
- Attention aux coûts : avec plusieurs utilisateurs, c'est moi qui paie l'API pour tout le monde. Proposer de réserver l'IA à mon compte, ou une petite limite quotidienne par compte.
- **Si l'appel échoue** (pas de clé, crédits épuisés, limite atteinte, hors ligne) : message clair, ex. « Estimation indisponible pour le moment, saisis les kcal et les protéines à la main », et l'app continue de fonctionner normalement.
- À vérifier ensemble : mon plan Claude inclut-il des crédits API utilisables ainsi ? Sinon, quel coût avec un compte API payé à l'usage ? Quel modèle choisir (rapide et peu cher suffit) ?

## Contraintes

- Gratuit : offres gratuites de Supabase et de l'hébergeur, hors éventuel coût de l'API IA en phase 2.
- Usage privé entre amis : chaque compte ne voit que ses propres données, aucun secret dans le code côté navigateur.
- iPhone d'abord : affichage correct à 380 px de large, zones de tap confortables, marges de sécurité iOS (`env(safe-area-inset-*)`).
- Garder le design actuel : tokens de couleur, polices Barlow Condensed, IBM Plex Sans et IBM Plex Mono, thème clair et sombre.
- Code simple et commenté : je dois pouvoir y revenir facilement avec Claude.

## Première étape demandée à Claude Code

1. Lire `carnet-forme.html` et me résumer sa structure.
2. Me proposer l'arborescence du projet, le schéma Supabase et l'hébergeur du front pour la phase 1, avec les avantages et inconvénients de chaque hébergeur en deux lignes.
3. Une fois validé, réaliser la phase 1 et m'expliquer pas à pas comment la mettre en ligne, l'installer sur mon iPhone et la partager.
