<?php
/**
 * Compteur commun et classements « On bloque l'extrême droite ».
 *
 * GET  compteur.php                     → { total, heure }
 * GET  compteur.php?vue=communaute      → totaux, classements, profils #FollowBack et comptes ajoutés
 * POST { appareil, comptes[], green[], fb[] }      → la liste de cet appareil devient celle envoyée (clés facultatives)
 * POST { action: 'profil', appareil, profil }      → crée ou modifie le pseudo public (objet), ou le supprime (null)
 * POST { action: 'proposer', appareil, liste, nom, type, reseau, handle } → propose un compte, vérifié avant ajout
 * POST { action: 'restaurer', appareil }           → renvoie ce qui est enregistré pour ce code de sauvegarde
 * POST { installation: true }                      → +1 au nombre d'installations de l'appli (sans identifiant)
 *
 * Chaque appareil a un identifiant aléatoire (créé dans le navigateur), qui n'est jamais affiché aux autres.
 * Un même compte ne compte qu'une fois par appareil. Le pseudo et le compte perso sont facultatifs et publics.
 * Aucun e-mail ni adresse IP n'est enregistré : contre les abus, on garde seulement une empreinte de l'IP,
 * effacée au bout d'une heure.
 * Besoin : PHP 7.4+ avec pdo_sqlite et mbstring, et le dossier data/ accessible en écriture.
 */

// Envois maximum par adresse IP et par heure. Assez haut, car les opérateurs mobiles
// font souvent partager une même IP à beaucoup d'abonnés.
const LIMITE_PAR_HEURE = 300;

// Blocages comptés sur l'ancien site, ajoutés au total affiché (ils ne sont pas dans la base).
const REPORT_ANCIEN_SITE = 1345;

// Sites autorisés à appeler ce compteur depuis un AUTRE domaine (ex. l'appli hébergée sur Vercel).
// Adresse exacte, sans « / » à la fin. Le site hébergé ici même n'a pas besoin d'y figurer.
const ORIGINES_AUTORISEES = [
    'https://on-bloque-extreme-droite.vercel.app',
    // 'https://www.ton-domaine.fr',
];

// Propositions en attente maximum par appareil, et profils effacés après un an sans visite
const PROPOSITIONS_MAX = 10;
const PROFIL_INACTIF = 365 * 86400;

// Morceaux refusés dans les pseudos (début de mot, sans accents ni majuscules)
const PSEUDO_INTERDIT = '/(^|[^a-z])(nazi|hitler|heil|sieg|reich|1488|negr|bougnoul|youpin|bicot|encul|salop|connard|pute|admin|moderat)/';

require __DIR__ . '/base.php';

header('Vary: Origin');
$origine = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origine !== '' && in_array($origine, ORIGINES_AUTORISEES, true)) {
    header('Access-Control-Allow-Origin: ' . $origine);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
}
// le navigateur demande la permission (« preflight ») avant chaque POST venant d'un autre domaine
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Compteur général : chaque action compte (blocage RedList, soutien GreenList, follow #FollowBack)
function totaux(PDO $db): array {
    $total = (int) $db->query('SELECT (SELECT COUNT(*) FROM blocages) + (SELECT COUNT(*) FROM suivis)')->fetchColumn() + REPORT_ANCIEN_SITE;
    $q = $db->prepare('SELECT (SELECT COUNT(*) FROM blocages WHERE cree > ?) + (SELECT COUNT(*) FROM suivis WHERE cree > ?)');
    $q->execute([time() - 3600, time() - 3600]);
    return ['total' => $total, 'heure' => (int) $q->fetchColumn()];
}

// Le compte X de l'appli (SUIVRE dans comptes.js) : toujours proposé dans le #FollowBack, sous l'identifiant 'suivre'
function compteAppli(): string {
    preg_match("/window\.SUIVRE\s*=\s*'([A-Za-z0-9_]{1,15})'/", (string) @file_get_contents(dirname(__DIR__) . '/comptes.js'), $m);
    return $m[1] ?? '';
}

// Nombre d'actions par appareil pour une liste ('red', 'green' ou 'fb') : colonnes a (appareil), n, t (dernière action)
function parAppareil(string $liste): string {
    return $liste === 'red'
        ? 'SELECT appareil a, COUNT(*) n, MAX(cree) t FROM blocages GROUP BY appareil'
        : "SELECT appareil a, COUNT(*) n, MAX(cree) t FROM suivis WHERE liste = '" . ($liste === 'fb' ? 'fb' : 'green') . "' GROUP BY appareil";
}

// Meilleurs contributeurs : seuls les appareils qui ont choisi un pseudo (et non masqués) apparaissent
// Pour le #FollowBack, chaque ligne a aussi l'identifiant public (pour le suivre) et ses follows reçus
function classement(PDO $db, string $liste, int $limite = 10): array {
    $q = $db->prepare('SELECT p.pid, p.pseudo, p.reseau, p.handle, s.n FROM (' . parAppareil($liste) . ') s
        JOIN profils p ON p.appareil = s.a WHERE p.masque = 0 ORDER BY s.n DESC, s.t ASC LIMIT ?');
    $q->execute([$limite]);
    return array_map(function ($r) use ($db, $liste) {
        $ligne = ['pseudo' => $r['pseudo'], 'reseau' => $r['reseau'], 'handle' => $r['handle'], 'n' => (int) $r['n']];
        return $liste === 'fb' ? $ligne + ['pid' => $r['pid'], 'recus' => recus($db, $r['pid'])] : $ligne;
    }, $q->fetchAll());
}

// Follows reçus par un profil dans le #FollowBack
function recus(PDO $db, string $pid): int {
    $q = $db->prepare("SELECT COUNT(*) FROM suivis WHERE liste = 'fb' AND compte = ?");
    $q->execute([$pid]);
    return (int) $q->fetchColumn();
}

/**
 * Ordre des cartes du #FollowBack : d'abord les plus généreux.
 *   score = (donnés + 3)² / (reçus + 3)
 * Donner beaucoup fait monter ; recevoir beaucoup sans rendre fait descendre, ce qui laisse la place aux autres.
 * Le « + 3 » évite qu'un nouveau membre (0 donné, 0 reçu) soit enterré : il démarre à 3, comme quelqu'un d'équilibré.
 * Bonus ×1,5 pendant les 48 h qui suivent l'inscription (pour être vu tout de suite), ×0,5 sans visite depuis 14 jours
 * (il ne rendrait sans doute pas le follow).
 */
function scoreFollowBack(int $donnes, int $recus, int $cree, int $maj): float {
    $score = ($donnes + 3) ** 2 / ($recus + 3);
    if (time() - $cree < 2 * 86400) $score *= 1.5;
    if (time() - $maj > 14 * 86400) $score *= 0.5;
    return $score;
}

function rang(PDO $db, string $liste, string $appareil): array {
    $q = $db->prepare('SELECT n FROM (' . parAppareil($liste) . ') s WHERE s.a = ?');
    $q->execute([$appareil]);
    $n = (int) $q->fetchColumn();
    if (!$n) return ['rang' => null, 'n' => 0];
    $q = $db->prepare('SELECT COUNT(*) FROM (' . parAppareil($liste) . ') s
        JOIN profils p ON p.appareil = s.a WHERE p.masque = 0 AND s.n > CAST(? AS INTEGER)');
    $q->execute([$n]);
    return ['rang' => (int) $q->fetchColumn() + 1, 'n' => $n];
}

function moi(PDO $db, string $appareil): ?array {
    $q = $db->prepare('SELECT pid, pseudo, reseau, handle, masque FROM profils WHERE appareil = ?');
    $q->execute([$appareil]);
    $p = $q->fetch();
    if (!$p) return null;
    // les membres qui me suivent (pour les suivre en retour) : visible seulement par cet appareil
    $q = $db->prepare("SELECT p.pid FROM suivis s JOIN profils p ON p.appareil = s.appareil
        WHERE s.liste = 'fb' AND s.compte = ? AND p.masque = 0 AND p.handle <> ''");
    $q->execute([$p['pid']]);
    return ['pid' => $p['pid'], 'pseudo' => $p['pseudo'], 'reseau' => $p['reseau'], 'handle' => $p['handle'],
        'masque' => (bool) $p['masque'], 'recus' => recus($db, $p['pid']), 'meSuivent' => $q->fetchAll(PDO::FETCH_COLUMN),
        'rangs' => ['red' => rang($db, 'red', $appareil), 'green' => rang($db, 'green', $appareil), 'fb' => rang($db, 'fb', $appareil)]];
}

function ajouts(PDO $db, string $liste): array {
    $q = $db->prepare("SELECT 'p' || id id, nom, role, type, reseau, handle FROM propositions WHERE liste = ? AND statut = 'ok' ORDER BY id");
    $q->execute([$liste]);
    return $q->fetchAll();
}

// Membres du #FollowBack, triés par scoreFollowBack, avec leurs follows donnés (g) et reçus (r)
function followback(PDO $db): array {
    $lignes = $db->query("SELECT p.pid id, p.pseudo, p.reseau, p.handle, p.cree, p.maj,
        (SELECT COUNT(*) FROM suivis s WHERE s.appareil = p.appareil AND s.liste = 'fb') g,
        (SELECT COUNT(*) FROM suivis s WHERE s.liste = 'fb' AND s.compte = p.pid) r
        FROM profils p WHERE p.masque = 0 AND p.handle <> ''")->fetchAll();
    foreach ($lignes as &$l) $l['score'] = scoreFollowBack((int) $l['g'], (int) $l['r'], (int) $l['cree'], (int) $l['maj']);
    unset($l);
    usort($lignes, fn($a, $b) => $b['score'] <=> $a['score']);
    return array_map(fn($l) => ['id' => $l['id'], 'pseudo' => $l['pseudo'], 'reseau' => $l['reseau'], 'handle' => $l['handle'],
        'g' => (int) $l['g'], 'r' => (int) $l['r']], array_slice($lignes, 0, 300));
}

function communaute(PDO $db): array {
    $compte = fn($sql) => (int) $db->query($sql)->fetchColumn();
    return totaux($db) + [
        'listes' => [
            'red' => $compte('SELECT COUNT(*) FROM blocages') + REPORT_ANCIEN_SITE,
            'green' => $compte("SELECT COUNT(*) FROM suivis WHERE liste = 'green'"),
            'fb' => $compte("SELECT COUNT(*) FROM suivis WHERE liste = 'fb'"),
        ],
        // nombre de membres qui ont suivi au moins un autre membre dans le #FollowBack
        'membresFb' => $compte("SELECT COUNT(DISTINCT appareil) FROM suivis WHERE liste = 'fb'"),
        'classements' => ['red' => classement($db, 'red'), 'green' => classement($db, 'green'), 'fb' => classement($db, 'fb')],
        'followback' => followback($db),
        'ajouts' => ['red' => ajouts($db, 'red'), 'green' => ajouts($db, 'green')],
    ];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['vue'] ?? '') !== 'communaute') repondre(200, totaux($db));
    $cache = DOSSIER_DATA . '/communaute.json';
    if (is_file($cache) && filemtime($cache) > time() - 10) { echo file_get_contents($cache); exit; }
    $json = json_encode(communaute($db), JSON_UNESCAPED_UNICODE);
    if (@file_put_contents($cache . '.tmp', $json, LOCK_EX)) @rename($cache . '.tmp', $cache);
    echo $json;
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') repondre(405, ['erreur' => 'méthode non autorisée']);

limiter($db, '', LIMITE_PAR_HEURE);

$entree = json_decode(file_get_contents('php://input'), true);
if (!is_array($entree)) repondre(400, ['erreur' => 'requête invalide']);
$t = time();

// ---------- première ouverture de l'appli installée ----------
if (($entree['installation'] ?? null) === true) {
    // au plus 10 installations comptées par IP et par heure, pour qu'on ne puisse pas gonfler le chiffre
    if (!depasse($db, 'installation|', 10)) {
        $db->exec("INSERT INTO stats (nom, n) VALUES ('installations', 1) ON CONFLICT(nom) DO UPDATE SET n = n + 1");
    }
    repondre(200, ['ok' => true]);
}

// ---------- validation ----------
$appareil = $entree['appareil'] ?? '';
if (!is_string($appareil) || !preg_match('/^[a-f0-9]{32}$/', $appareil)) repondre(400, ['erreur' => 'requête invalide']);
$action = $entree['action'] ?? 'sync';

// identifiants acceptés : ceux des fichiers comptes.js et greenlist.js, plus les comptes ajoutés après vérification
function connus(PDO $db, string $liste): array {
    $racine = dirname(__DIR__);
    if ($liste === 'red') {
        preg_match_all("/\bid:\s*'([a-z0-9-]+)'/", (string) @file_get_contents($racine . '/comptes.js'), $m);
        $ids = $m[1];
    } else {
        preg_match_all('/"reseau":\s*"([a-z]+)",\s*"handle":\s*"([^"]+)"/', (string) @file_get_contents($racine . '/greenlist.js'), $m, PREG_SET_ORDER);
        $ids = array_map(fn($x) => $x[1] . ':' . strtolower($x[2]), $m);
    }
    return array_flip(array_merge($ids, array_column(ajouts($db, $liste), 'id')));
}
function filtrer($liste, array $connus): array {
    if (!is_array($liste)) return [];
    return array_values(array_unique(array_filter($liste, fn($c) => is_string($c) && isset($connus[$c]))));
}

// ---------- profil public (pseudo + compte perso facultatif) ----------
if ($action === 'profil') {
    $p = $entree['profil'] ?? null;
    if ($p === null) {
        $q = $db->prepare('SELECT pid FROM profils WHERE appareil = ?');
        $q->execute([$appareil]);
        if ($pid = $q->fetchColumn()) {
            $db->prepare("DELETE FROM suivis WHERE liste = 'fb' AND compte = ?")->execute([$pid]);
            $db->prepare('DELETE FROM profils WHERE appareil = ?')->execute([$appareil]);
        }
        viderCache();
        repondre(200, ['ok' => true, 'moi' => null]);
    }
    if (!is_array($p)) repondre(400, ['erreur' => 'requête invalide']);
    $pseudo = nettoyer($p['pseudo'] ?? '', 40);
    if (mb_strlen($pseudo) < 2 || mb_strlen($pseudo) > 24 || !preg_match("/^[\p{L}\p{N}][\p{L}\p{N} ._'-]*$/u", $pseudo)) {
        repondre(400, ['erreur' => 'Pseudo : 2 à 24 caractères (lettres, chiffres, espace, point, tiret).']);
    }
    // clé de comparaison : minuscules, sans accents ni signes → « Jean-Luc » et « jeanluc » sont le même pseudo
    $sansAccents = strtolower(@iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $pseudo) ?: $pseudo);
    $cle = preg_replace('/[^a-z0-9]/', '', $sansAccents);
    if (strlen($cle) < 2 || preg_match(PSEUDO_INTERDIT, preg_replace('/[^a-z0-9]+/', ' ', $sansAccents))) {
        repondre(400, ['erreur' => 'Ce pseudo n’est pas accepté. Choisis-en un autre.']);
    }
    $reseau = is_string($p['reseau'] ?? null) ? $p['reseau'] : '';
    $handle = is_string($p['handle'] ?? null) ? ltrim(trim($p['handle']), '@') : '';
    if ($handle === '') $reseau = '';
    elseif (!isset(RESEAUX[$reseau]) || !preg_match(RESEAUX[$reseau], $handle)) {
        repondre(400, ['erreur' => 'Cet identifiant ne correspond pas au réseau choisi.']);
    }
    $q = $db->prepare('SELECT 1 FROM profils WHERE pseudo_cle = ? AND appareil <> ?');
    $q->execute([$cle, $appareil]);
    if ($q->fetchColumn()) repondre(409, ['erreur' => 'Ce pseudo est déjà pris. Choisis-en un autre.']);
    if ($handle !== '') {
        $q = $db->prepare('SELECT 1 FROM profils WHERE reseau = ? AND lower(handle) = lower(?) AND appareil <> ?');
        $q->execute([$reseau, $handle, $appareil]);
        if ($q->fetchColumn() || ($reseau === 'x' && strcasecmp($handle, compteAppli()) === 0)) {
            repondre(409, ['erreur' => 'Ce compte est déjà inscrit dans le #FollowBack.']);
        }
    }
    $db->prepare('INSERT INTO profils (appareil, pid, pseudo, pseudo_cle, reseau, handle, cree, maj) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(appareil) DO UPDATE SET pseudo = excluded.pseudo, pseudo_cle = excluded.pseudo_cle,
        reseau = excluded.reseau, handle = excluded.handle, maj = excluded.maj')
       ->execute([$appareil, bin2hex(random_bytes(6)), $pseudo, $cle, $reseau, $handle, $t, $t]);
    viderCache();
    repondre(200, ['ok' => true, 'moi' => moi($db, $appareil)]);
}

// ---------- proposer un compte pour la RedList ou la GreenList ----------
if ($action === 'proposer') {
    $types = ['red' => ['politique', 'parti', 'media', 'influenceur'], 'green' => ['personnalite', 'influenceur', 'organisation', 'media']];
    $liste = $entree['liste'] ?? '';
    if (!is_string($liste) || !isset($types[$liste])) repondre(400, ['erreur' => 'requête invalide']);
    $nom = nettoyer($entree['nom'] ?? '', 60);
    $type = $entree['type'] ?? '';
    $reseau = $entree['reseau'] ?? '';
    $handle = is_string($entree['handle'] ?? null) ? ltrim(trim($entree['handle']), '@') : '';
    if (mb_strlen($nom) < 2) repondre(400, ['erreur' => 'Indique le nom du compte.']);
    if (!in_array($type, $types[$liste], true)) repondre(400, ['erreur' => 'Choisis une catégorie.']);
    if (!is_string($reseau) || !isset(RESEAUX[$reseau]) || !preg_match(RESEAUX[$reseau], $handle)) {
        repondre(400, ['erreur' => 'Cet identifiant ne correspond pas au réseau choisi.']);
    }
    $q = $db->prepare('SELECT 1 FROM propositions WHERE liste = ? AND reseau = ? AND lower(handle) = lower(?)');
    $q->execute([$liste, $reseau, $handle]);
    if ($q->fetchColumn()) repondre(200, ['ok' => true, 'deja' => true]);
    $q = $db->prepare("SELECT COUNT(*) FROM propositions WHERE appareil = ? AND statut = 'attente'");
    $q->execute([$appareil]);
    if ((int) $q->fetchColumn() >= PROPOSITIONS_MAX) repondre(429, ['erreur' => 'Tu as déjà plusieurs propositions en attente. Merci, on les vérifie !']);
    $db->prepare('INSERT INTO propositions (liste, nom, type, reseau, handle, appareil, cree) VALUES (?, ?, ?, ?, ?, ?, ?)')
       ->execute([$liste, $nom, $type, $reseau, $handle, $appareil, $t]);
    repondre(200, ['ok' => true]);
}

// ---------- restaurer ses progrès avec son code de sauvegarde ----------
if ($action === 'restaurer') {
    $q = $db->prepare('SELECT compte FROM blocages WHERE appareil = ? ORDER BY cree');
    $q->execute([$appareil]);
    $data = ['comptes' => $q->fetchAll(PDO::FETCH_COLUMN)];
    foreach (['green', 'fb'] as $l) {
        $q = $db->prepare('SELECT compte FROM suivis WHERE appareil = ? AND liste = ? ORDER BY cree');
        $q->execute([$appareil, $l]);
        $data[$l] = $q->fetchAll(PDO::FETCH_COLUMN);
    }
    repondre(200, $data + ['moi' => moi($db, $appareil)]);
}

if ($action !== 'sync') repondre(400, ['erreur' => 'requête invalide']);

// ---------- les listes de l'appareil deviennent exactement celles envoyées ----------
// (les anciennes versions de l'appli n'envoient que « comptes » : leurs autres listes ne bougent pas)
$db->beginTransaction();
if (array_key_exists('comptes', $entree)) {
    $comptes = filtrer($entree['comptes'], connus($db, 'red'));
    $marques = implode(',', array_fill(0, count($comptes), '?'));
    $db->prepare('DELETE FROM blocages WHERE appareil = ?' . ($comptes ? " AND compte NOT IN ($marques)" : ''))
       ->execute(array_merge([$appareil], $comptes));
    $ins = $db->prepare('INSERT OR IGNORE INTO blocages (appareil, compte, cree) VALUES (?, ?, ?)');
    foreach ($comptes as $c) $ins->execute([$appareil, $c, $t]);
}
foreach (['green', 'fb'] as $l) {
    if (!array_key_exists($l, $entree)) continue;
    if ($l === 'green') $ok = connus($db, 'green');
    else {
        // on ne se suit pas soi-même
        $q = $db->prepare('SELECT pid FROM profils WHERE appareil <> ? AND masque = 0');
        $q->execute([$appareil]);
        $ok = array_flip($q->fetchAll(PDO::FETCH_COLUMN));
        if (compteAppli() !== '') $ok['suivre'] = true;
    }
    $ids = filtrer($entree[$l], $ok);
    $marques = implode(',', array_fill(0, count($ids), '?'));
    $db->prepare('DELETE FROM suivis WHERE appareil = ? AND liste = ?' . ($ids ? " AND compte NOT IN ($marques)" : ''))
       ->execute(array_merge([$appareil, $l], $ids));
    $ins = $db->prepare('INSERT OR IGNORE INTO suivis (appareil, liste, compte, cree) VALUES (?, ?, ?, ?)');
    foreach ($ids as $c) $ins->execute([$appareil, $l, $c, $t]);
}
$db->prepare('UPDATE profils SET maj = ? WHERE appareil = ?')->execute([$t, $appareil]);
$db->commit();

// de temps en temps : les profils sans visite depuis un an sont effacés (avec les suivis qu'ils ont reçus)
if (random_int(1, 200) === 1) {
    $vieux = $db->prepare('SELECT pid FROM profils WHERE maj < ?');
    $vieux->execute([$t - PROFIL_INACTIF]);
    foreach ($vieux->fetchAll(PDO::FETCH_COLUMN) as $pid) $db->prepare("DELETE FROM suivis WHERE liste = 'fb' AND compte = ?")->execute([$pid]);
    $db->prepare('DELETE FROM profils WHERE maj < ?')->execute([$t - PROFIL_INACTIF]);
    viderCache();
}

repondre(200, totaux($db) + ['moi' => moi($db, $appareil)]);
