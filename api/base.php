<?php
/**
 * Code commun à compteur.php et gestion.php : en-têtes, base SQLite, limite anti-abus.
 * Ce fichier n'est pas fait pour être appelé directement.
 */
if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) { http_response_code(404); exit; }

// Jamais d'erreur affichée au public (elle pourrait révéler des chemins du serveur)
ini_set('display_errors', '0');
header_remove('X-Powered-By');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

// Dossier de la base. Le mieux : un dossier HORS du site (ex. dirname(__DIR__, 3) . '/obed-data').
// Par défaut api/data/, protégé par son .htaccess (Apache, LiteSpeed). Sur Nginx, change ce chemin.
const DOSSIER_DATA = __DIR__ . '/data';

// Réseaux acceptés pour les comptes proposés et les comptes perso (#FollowBack), avec la forme de l'identifiant
const RESEAUX = [
    'x'         => '/^[A-Za-z0-9_]{1,15}$/',
    'instagram' => '/^[A-Za-z0-9._]{1,30}$/',
    'tiktok'    => '/^[A-Za-z0-9._]{2,24}$/',
    'bluesky'   => '/^(?=.{3,100}$)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/',
    'youtube'   => '/^[A-Za-z0-9._-]{3,30}$/',
    'facebook'  => '/^[A-Za-z0-9.]{5,50}$/',
];

function repondre(int $code, array $data): void {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- base SQLite (créée automatiquement) ----------
if (!is_dir(DOSSIER_DATA)) mkdir(DOSSIER_DATA, 0750, true);
try {
    $db = new PDO('sqlite:' . DOSSIER_DATA . '/compteur.sqlite', null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;');
    $db->exec('CREATE TABLE IF NOT EXISTS blocages (
        appareil TEXT NOT NULL, compte TEXT NOT NULL, cree INTEGER NOT NULL,
        PRIMARY KEY (appareil, compte))');
    $db->exec('CREATE INDEX IF NOT EXISTS blocages_cree ON blocages (cree)');
    $db->exec('CREATE TABLE IF NOT EXISTS limites (cle TEXT PRIMARY KEY, n INTEGER NOT NULL, heure INTEGER NOT NULL)');
    // comptes suivis : liste 'green' (greenlist) ou 'fb' (#FollowBack, compte = identifiant public du profil)
    $db->exec('CREATE TABLE IF NOT EXISTS suivis (
        appareil TEXT NOT NULL, liste TEXT NOT NULL, compte TEXT NOT NULL, cree INTEGER NOT NULL,
        PRIMARY KEY (appareil, liste, compte))');
    $db->exec('CREATE INDEX IF NOT EXISTS suivis_compte ON suivis (liste, compte)');
    // pseudo public (facultatif), avec le compte perso pour le #FollowBack (facultatif aussi)
    $db->exec('CREATE TABLE IF NOT EXISTS profils (
        appareil TEXT PRIMARY KEY, pid TEXT NOT NULL UNIQUE, pseudo TEXT NOT NULL, pseudo_cle TEXT NOT NULL UNIQUE,
        reseau TEXT NOT NULL DEFAULT \'\', handle TEXT NOT NULL DEFAULT \'\',
        cree INTEGER NOT NULL, maj INTEGER NOT NULL, masque INTEGER NOT NULL DEFAULT 0)');
    // comptes proposés pour la RedList ou la GreenList : statut 'attente', puis 'ok' une fois vérifiés
    $db->exec('CREATE TABLE IF NOT EXISTS propositions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, liste TEXT NOT NULL, nom TEXT NOT NULL, role TEXT NOT NULL DEFAULT \'\',
        type TEXT NOT NULL, reseau TEXT NOT NULL, handle TEXT NOT NULL, appareil TEXT NOT NULL DEFAULT \'\',
        cree INTEGER NOT NULL, statut TEXT NOT NULL DEFAULT \'attente\')');
    // simples totaux, sans aucun lien avec un appareil
    $db->exec('CREATE TABLE IF NOT EXISTS stats (nom TEXT PRIMARY KEY, n INTEGER NOT NULL)');
} catch (Throwable $e) {
    repondre(500, ['erreur' => 'base indisponible']);
}

// La page communauté est gardée 10 s en cache : on l'efface dès qu'un profil ou un ajout change
function viderCache(): void { @unlink(DOSSIER_DATA . '/communaute.json'); }

// ---------- limite anti-abus (empreinte d'IP, effacée chaque heure) ----------
// Renvoie true quand cette IP a dépassé $max envois dans l'heure, pour ce type d'envoi ($prefixe)
function depasse(PDO $db, string $prefixe, int $max): bool {
    $heure = intdiv(time(), 3600);
    // La clé secrète vit dans un fichier .php : même si quelqu'un l'appelle par le web, il ne s'affiche pas.
    // Sans elle, les empreintes de la base ne permettent pas de retrouver une IP.
    $fichierCle = DOSSIER_DATA . '/cle-secrete.php';
    if (!is_file($fichierCle)) file_put_contents($fichierCle, "<?php return '" . bin2hex(random_bytes(32)) . "';\n", LOCK_EX);
    $secret = require $fichierCle;
    $db->prepare('DELETE FROM limites WHERE heure < ?')->execute([$heure]);
    $cle = hash_hmac('sha256', $prefixe . ($_SERVER['REMOTE_ADDR'] ?? '') . '|' . $heure, $secret);
    $db->prepare('INSERT INTO limites (cle, n, heure) VALUES (?, 1, ?) ON CONFLICT(cle) DO UPDATE SET n = n + 1')
       ->execute([$cle, $heure]);
    $q = $db->prepare('SELECT n FROM limites WHERE cle = ?');
    $q->execute([$cle]);
    return (int) $q->fetchColumn() > $max;
}
function limiter(PDO $db, string $prefixe, int $max): void {
    if (depasse($db, $prefixe, $max)) repondre(429, ['erreur' => 'trop de requêtes, réessaie plus tard']);
}

// Texte court sur une ligne : sans caractères de contrôle, espaces regroupés
function nettoyer($s, int $max): string {
    if (!is_string($s)) return '';
    $s = trim(preg_replace('/\s+/u', ' ', preg_replace('/[\p{C}]/u', '', $s) ?? '') ?? '');
    return mb_substr($s, 0, $max);
}
