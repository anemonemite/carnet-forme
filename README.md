# Carnet Forme

Petite web app (PWA) pour suivre ses séances de sport, ses repas et sa créatine. Elle s'installe sur l'écran d'accueil de l'iPhone. Chaque compte a ses propres données.

- **Front** : HTML, CSS et JavaScript sans framework, hébergé sur GitHub Pages.
- **Backend** : Supabase (base de données Postgres et comptes), offre gratuite.
- **Hors ligne** : un cache local IndexedDB et un service worker permettent de saisir à la salle sans réseau. Les modifications partent au retour du réseau.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page : écran de connexion et app |
| `css/style.css` | Design : couleurs, thèmes clair et sombre, polices |
| `js/config.js` | Adresse et clé publique du projet Supabase (**à remplir**) |
| `js/auth.js` | Connexion, inscription, mot de passe, suppression du compte |
| `js/storage.js` | Couche de stockage : Supabase, cache local, file d'attente hors ligne |
| `js/data.js` | Données fixes : sports, catalogue de 55 exercices, modèles de séance |
| `js/app.js` | Logique de l'app : rendu, repas, musculation, séance proposée, minuteur |
| `js/vendor/supabase.js` | Bibliothèque supabase-js 2.117.3, copiée ici pour marcher hors ligne |
| `sw.js` | Service worker (mise en cache pour le hors ligne) |
| `manifest.webmanifest`, `icons/` | Nom et icône de l'app installée |
| `supabase/schema.sql` | Tables et sécurité, à coller dans Supabase |
| `carnet-forme.html` | L'artefact d'origine, gardé comme référence (pas utilisé par l'app) |

---

## Mise en ligne pas à pas

### 1. Créer le projet Supabase (10 min)

1. Va sur <https://supabase.com>, clique sur **Start your project** et connecte-toi avec GitHub.
2. Clique sur **New project** :
   - **Name** : `carnet-forme` ;
   - **Database password** : clique sur **Generate** et garde-le dans un coin (tu n'en auras normalement pas besoin) ;
   - **Region** : *West EU (Paris)* ou *Central EU (Frankfurt)* ;
   - Plan **Free**.
3. Attends 1 à 2 minutes que le projet soit prêt.
4. Menu de gauche **SQL Editor**, puis **New query**. Colle tout le contenu de `supabase/schema.sql`, puis clique sur **Run**. Le message attendu est « Success. No rows returned ».
5. Menu **Project Settings**, puis **API** (ou **API Keys**). Note deux valeurs :
   - **Project URL**, de la forme `https://abcdefgh.supabase.co` ;
   - la clé **anon / public**, ou **publishable** sur les projets récents.

   ⚠️ Ne prends **jamais** la clé `service_role` ou `secret`.
6. Ouvre `js/config.js` et remplace `VOTRE-PROJET` et `VOTRE-CLE-ANON` par ces deux valeurs.

### 2. Régler les comptes (10 min)

Menu **Authentication** :

1. **Sign In / Providers** (ou **Providers**), section **Email** :
   - **Enable Email provider** : activé ;
   - **Confirm email** : activé ;
   - **Allow new users to sign up** : activé ;
   - longueur minimale du mot de passe : **8**.
2. **URL Configuration** :
   - **Site URL** : `https://TON-PSEUDO-GITHUB.github.io/carnet-forme/` ;
   - **Redirect URLs** : ajoute la même adresse, plus `http://localhost:8080/**` si tu veux tester sur ton ordinateur.
3. **Envoi des e-mails (indispensable pour tes amis).** Le service d'e-mails fourni par Supabase n'envoie **qu'aux membres de ton équipe Supabase**, et 2 e-mails par heure au maximum. Tes amis ne recevraient jamais leur e-mail de confirmation. Le plus simple, sans nom de domaine, est d'envoyer avec ton Gmail :
   1. Sur ton compte Google, active la **validation en deux étapes** (Sécurité > Validation en deux étapes).
   2. Crée un **mot de passe d'application** : <https://myaccount.google.com/apppasswords>, nom « Supabase ». Google affiche un code de 16 lettres : copie-le.
   3. Dans Supabase, va dans **Authentication > Emails > SMTP Settings** et active **Enable Custom SMTP** :
      - Sender email : ton adresse Gmail ;
      - Sender name : `Carnet Forme` ;
      - Host : `smtp.gmail.com` ;
      - Port : `587` ;
      - Username : ton adresse Gmail ;
      - Password : le code de 16 lettres.
   4. Dans **Authentication > Rate Limits**, laisse la limite d'e-mails par heure à 30 : c'est largement suffisant.

   Autre option : un service comme Brevo, avec un expéditeur vérifié. Les services comme Resend demandent un nom de domaine à toi.
4. Facultatif : dans **Authentication > Emails > Templates**, tu peux traduire en français le texte de « Confirm signup » et « Reset password ».

**Captcha** : pas utile au départ. Le lien circule entre amis et la confirmation par e-mail bloque déjà les faux comptes. En cas d'abus, Supabase propose hCaptcha ou Cloudflare Turnstile (Authentication > Attack Protection), mais il faudra alors ajouter un petit bout de code dans l'écran d'inscription.

### 3. Mettre le site en ligne sur GitHub Pages (10 min)

Une seule fois :

1. Sur <https://github.com/new>, crée un dépôt nommé **`carnet-forme`** en **Public**. Ne coche rien d'autre.
   - Le dépôt doit être public pour utiliser GitHub Pages gratuitement. Ce n'est pas un problème : le code ne contient aucun secret, puisque la clé anon est publique par conception et protégée par les règles RLS.
2. Dans un terminal, depuis le dossier `carnet_forme` :
   ```bash
   git init
   git add .
   git commit -m "Carnet Forme : première version"
   git branch -M main
   git remote add origin https://github.com/TON-PSEUDO-GITHUB/carnet-forme.git
   git push -u origin main
   ```
   Tu peux aussi demander à Claude Code de le faire.
3. Sur GitHub, dans le dépôt, va dans **Settings > Pages**, puis :
   - **Source** : *Deploy from a branch* ;
   - **Branch** : `main` et `/ (root)` ;
   - clique sur **Save**.
4. Une à deux minutes plus tard, le site est en ligne sur `https://TON-PSEUDO-GITHUB.github.io/carnet-forme/`.

Pour les mises à jour suivantes : `git add . && git commit -m "…" && git push`. Le site se met à jour en une minute environ, et l'app installée affiche la nouvelle version à l'ouverture suivante, parfois la deuxième.

### 4. Installer l'app sur l'iPhone

1. Ouvre l'adresse du site dans **Safari** (pas Chrome).
2. Touche le bouton **Partager** (le carré avec la flèche), puis **Sur l'écran d'accueil**, puis **Ajouter**.
3. Ouvre l'app depuis l'écran d'accueil, puis crée ton compte ou connecte-toi.

Bon à savoir :
- **Lien de confirmation :** le lien reçu par e-mail s'ouvre dans Safari, pas dans l'app installée. C'est normal : après avoir cliqué dessus, reviens dans l'app et connecte-toi avec ton e-mail et ton mot de passe. C'est pareil pour « Mot de passe oublié ».
- **Session :** elle reste ouverte. Tu n'auras pas à te reconnecter à chaque ouverture.

### 5. Récupérer ton historique de l'artefact

L'artefact garde tes données dans la base de Claude et n'a pas de bouton d'export. Pour les récupérer :

1. Dans la conversation claude.ai qui contient l'artefact, demande :
   > Ajoute dans les Réglages un bouton « Exporter » qui affiche dans une zone de texte le résultat de `JSON.stringify({days: state.days, settings: state.settings})`, avec un bouton « Copier » qui copie ce texte dans le presse-papiers. Ne change rien d'autre.
2. Dans l'artefact, touche **Exporter**, puis **Copier**.
3. Dans la web app, ouvre l'onglet **Nutrition**, puis **Réglages > Mes données > … ou coller le texte d'une sauvegarde**. Colle le texte, touche **Lire ce texte**, vérifie le résumé, puis touche **Importer**.

### 6. Partager avec tes amis

Envoie-leur simplement l'adresse `https://TON-PSEUDO-GITHUB.github.io/carnet-forme/`, avec les consignes de l'étape 4. Chacun crée son compte et ne voit que ses propres données.

---

## Limites des offres gratuites (vérifiées en octobre 2026)

| Service | Limite | Pour toi et quelques amis |
|---|---|---|
| Supabase | 50 000 utilisateurs actifs par mois | Aucun souci |
| Supabase | 500 Mo de base de données | Un jour pèse environ 1 Ko, donc plus d'un siècle de saisies par personne |
| Supabase | 5 Go de trafic par mois | Aucun souci |
| Supabase | **Pause après 1 semaine sans activité** | Pas de souci avec un usage quotidien. Sinon, un bouton « Restore » dans le tableau de bord réactive le projet en quelques minutes ; les données ne sont pas perdues |
| Supabase | 2 projets gratuits | Celui-ci en utilise un |
| E-mails (Gmail SMTP) | Environ 500 par jour côté Gmail, 30 par heure réglés côté Supabase | Largement suffisant (inscriptions et mots de passe oubliés) |
| GitHub Pages | Site de 1 Go maximum, environ 100 Go de trafic par mois, dépôt public | Le site fait moins de 1 Mo |

## Revenir sur le code avec Claude

- Le stockage passe uniquement par `js/storage.js`. Changer de backend ne touche pas l'interface.
- Après une modification, si l'iPhone affiche encore l'ancienne version, ferme complètement l'app puis rouvre-la. Pour forcer la mise à jour, change `VERSION` dans `sw.js` (par exemple `cf-v2`).
- **Tester sur l'ordinateur :** lance `npx serve -l 8080` dans le dossier, puis ouvre `http://localhost:8080`. N'ouvre pas le fichier directement : les modules JavaScript et le service worker ont besoin d'un vrai serveur.

## Phase 2 (plus tard)

L'estimation des repas et le classement des exercices par IA passeront par une Supabase Edge Function qui appellera l'API Claude. La clé restera côté serveur et les appels seront limités par compte. Le code de l'artefact d'origine (`carnet-forme.html`) contient les prompts à réutiliser.
