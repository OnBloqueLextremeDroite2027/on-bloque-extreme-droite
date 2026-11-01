# On bloque l'extrême droite

Application web (PWA) militante et indépendante : chacun bloque lui-même les comptes publics de l'extrême droite (RedList), soutient des comptes de gauche (GreenList) et se fait suivre entre membres (#FollowBack).

Site : https://on-bloque-extreme-droite.vercel.app

## Ce que fait l'appli (et ne fait pas)

- Elle **ne bloque ni ne suit rien à ta place** et ne se connecte à aucun de tes comptes : elle ouvre le profil, tu agis toi-même sur le réseau, puis tu confirmes dans l'appli.
- Sans inscription. Un identifiant aléatoire est créé dans ton navigateur. Le pseudo et le compte social sont **facultatifs** et publiés seulement avec ton accord.
- Aucun traceur, aucune pub, aucun service tiers (la police est hébergée sur le site).
- L'adresse IP n'est pas enregistrée : seule une empreinte chiffrée est gardée une heure contre les abus.
- Une fenêtre « Soutenir le projet » (lien vers une cagnotte) s'affiche une seule fois à certains paliers d'actions (10, 30, 75, 150, 300), avec un bouton « Plus tard ». Le don n'est jamais nécessaire.

## Organisation du code

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js` | L'appli (cartes à glisser, onglets, classements, profil) |
| `comptes.js` | RedList : comptes publics proposés au blocage |
| `greenlist.js` | GreenList : comptes de gauche à suivre |
| `maj.js`, `sw.js`, `manifest.webmanifest` | Appli installable et mises à jour automatiques |
| `api/compteur.php` | Compteur commun, classements, profils, propositions (PHP + SQLite) |
| `api/gestion.php`, `gestion.html`, `gestion.js` | Modération : valider les comptes proposés, masquer un pseudo |
| `api/base.php` | Base de données, limite anti-abus |
| `mentions-legales.html` | Mentions légales, règles et données personnelles |

Ordre des cartes #FollowBack : `scoreFollowBack()` dans `api/compteur.php` met en avant ceux qui suivent le plus par rapport à ce qu'ils reçoivent.

## Installer sa propre copie

1. Hébergement PHP 7.4+ avec `pdo_sqlite` et `mbstring` (Apache ou LiteSpeed pour les `.htaccess`).
2. Copier les fichiers. Le dossier `api/data/` se crée et se remplit tout seul (base, clé secrète).
3. Dans `comptes.js`, mettre l'adresse de `api/compteur.php` dans `window.API` et ton compte dans `window.SUIVRE`.
4. Pour la modération, créer `api/data/cle-admin.php` :
   `php -r 'echo "<?php return " . var_export(password_hash("TA-CLE", PASSWORD_DEFAULT), true) . ";\n";' > api/data/cle-admin.php`

Ne publie jamais le contenu de `api/data/` : il contient la base des membres et les clés.
