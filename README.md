# Palmarès Vitality — version hébergée (Netlify)

Ce dossier contient tout ce qu'il faut pour héberger le dashboard sur Netlify,
avec une vraie authentification côté serveur : tout le monde peut consulter
via le lien public, mais seule la personne qui connaît le mot de passe peut
ajouter, modifier ou supprimer des lignes.

## Comment ça marche

- `index.html` : le dashboard (frontend). Il ne stocke plus rien dans le
  navigateur — il va chercher/écrire les données sur le serveur.
- `netlify/functions/data.js` : API qui lit/écrit les données. La lecture est
  publique, l'écriture nécessite un jeton valide.
- `netlify/functions/login.js` : vérifie le mot de passe et délivre un jeton
  signé (valable 30 jours). Le mot de passe n'est jamais présent dans le code
  ni visible côté navigateur : il est stocké dans les variables d'environnement
  Netlify, comparé côté serveur uniquement.
- Les données sont stockées avec **Netlify Blobs**, un stockage intégré à
  Netlify — pas besoin de créer un compte séparé chez un fournisseur de base
  de données.

## Déploiement — étape par étape

### 1. Créer un compte Netlify (gratuit)
Sur https://app.netlify.com si tu n'en as pas déjà un.

### 2. Déployer ce dossier
Le plus simple : héberger ce dossier sur un dépôt GitHub, puis dans Netlify
choisir "Add new site" → "Import an existing project" → connecter le dépôt.
Netlify détecte automatiquement `netlify.toml` et installe les dépendances
(`@netlify/blobs`) tout seul au moment du build.

(La méthode "glisser-déposer" ne fonctionne pas ici car il faut que Netlify
installe le package `@netlify/blobs` — il faut donc passer par un dépôt Git,
ou par la Netlify CLI avec `netlify deploy`.)

### 3. Configurer les variables d'environnement
Dans Netlify : Site settings → Environment variables → Add a variable.
Ajoute ces deux variables :

- `EDITOR_PASSWORD` → le mot de passe que toi seul connaîtras pour éditer
- `TOKEN_SECRET` → une longue chaîne aléatoire, utilisée uniquement pour
  signer les sessions. Génère-en une avec, par exemple :
  ```
  openssl rand -hex 32
  ```
  (ou n'importe quel générateur de mot de passe long — 40+ caractères).

Redéploie le site après avoir ajouté ces variables (Netlify le fait
automatiquement, ou clique "Trigger deploy").

### 4. C'est en ligne
Le lien Netlify (ex: `https://ton-site.netlify.app`) est celui à partager.
Tout le monde qui l'ouvre voit le dashboard en lecture seule. En cliquant sur
"Se connecter" en haut à droite et en entrant `EDITOR_PASSWORD`, tu passes en
mode édition sur cet appareil (mémorisé 30 jours).

## Sécurité — ce qui est garanti et ce qui ne l'est pas

- Le mot de passe n'est **jamais** envoyé au navigateur ni visible dans le
  code source : il reste côté serveur, dans les variables d'environnement.
- Chaque écriture est vérifiée côté serveur via un jeton signé
  cryptographiquement (HMAC) — impossible à fabriquer sans connaître
  `TOKEN_SECRET`.
- Un visiteur qui inspecte le code ne peut ni lire le mot de passe, ni
  fabriquer un jeton valide, ni écrire sans un jeton valide.
- Limite : si quelqu'un devine ou obtient ton mot de passe, il peut éditer.
  Change `EDITOR_PASSWORD` à tout moment dans Netlify si besoin (ça invalide
  aussi les sessions déjà ouvertes ailleurs, car elles ne pourront plus se
  reconnecter — mais un jeton déjà émis reste valable jusqu'à son expiration
  de 30 jours si tu ne changes pas aussi `TOKEN_SECRET`. Pour couper l'accès
  immédiatement à toute session en cours, change aussi `TOKEN_SECRET`).

## Import de tes données existantes

Si tu as déjà des ajouts faits dans la version précédente (celle ouverte
depuis Claude), utilise le bouton "Sauvegarde / export" → "Exporter" sur
cette ancienne version pour copier le JSON, puis colle-le dans "Importer"
ici une fois connecté en mode édition sur la nouvelle version hébergée.
