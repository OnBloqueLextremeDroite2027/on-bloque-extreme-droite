<?php
/**
 * Gestion privée (page gestion.html) : valider ou refuser les comptes proposés, masquer un pseudo.
 *
 * POST { cle, action: 'liste' }                         → propositions en attente, comptes ajoutés, profils
 * POST { cle, action: 'valider', id, nom, role, type }  → le compte proposé apparaît pour tout le monde
 * POST { cle, action: 'refuser', id }                   → supprime la proposition (ou retire un compte ajouté)
 * POST { cle, action: 'masquer', pid, masque }          → cache (1) ou réaffiche (0) un profil public
 *
 * La clé de gestion n'est jamais stockée en clair : data/cle-admin.php contient seulement son empreinte
 * (password_hash). Sans ce fichier, la gestion est fermée.
 */
require __DIR__ . '/base.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') repondre(405, ['erreur' => 'méthode non autorisée']);
limiter($db, 'gestion|', 120);

$fichier = DOSSIER_DATA . '/cle-admin.php';
if (!is_file($fichier)) repondre(503, ['erreur' => 'gestion fermée : clé non installée']);
$entree = json_decode(file_get_contents('php://input'), true);
$cle = is_array($entree) ? ($entree['cle'] ?? '') : '';
if (!is_string($cle) || $cle === '' || !password_verify($cle, (string) require $fichier)) {
    repondre(403, ['erreur' => 'clé incorrecte']);
}
$action = $entree['action'] ?? '';
$id = (int) ($entree['id'] ?? 0);

if ($action === 'liste') {
    $q = fn($sql) => $db->query($sql)->fetchAll();
    repondre(200, [
        'attente' => $q("SELECT id, liste, nom, role, type, reseau, handle, cree FROM propositions WHERE statut = 'attente' ORDER BY id"),
        'ajouts' => $q("SELECT id, liste, nom, role, type, reseau, handle FROM propositions WHERE statut = 'ok' ORDER BY id DESC"),
        'profils' => $q("SELECT p.pid, p.pseudo, p.reseau, p.handle, p.masque, p.cree,
            (SELECT COUNT(*) FROM blocages b WHERE b.appareil = p.appareil) red,
            (SELECT COUNT(*) FROM suivis s WHERE s.appareil = p.appareil AND s.liste = 'green') green,
            (SELECT COUNT(*) FROM suivis s WHERE s.appareil = p.appareil AND s.liste = 'fb') fb
            FROM profils p ORDER BY p.cree DESC LIMIT 500"),
    ]);
}

if ($action === 'valider') {
    $types = ['red' => ['politique', 'parti', 'media', 'influenceur'], 'green' => ['personnalite', 'influenceur', 'organisation', 'media']];
    $q = $db->prepare("SELECT liste FROM propositions WHERE id = ? AND statut = 'attente'");
    $q->execute([$id]);
    $liste = $q->fetchColumn();
    if (!$liste) repondre(404, ['erreur' => 'proposition introuvable']);
    $nom = nettoyer($entree['nom'] ?? '', 60);
    $role = nettoyer($entree['role'] ?? '', 80);
    $type = $entree['type'] ?? '';
    if (mb_strlen($nom) < 2 || !in_array($type, $types[$liste], true)) repondre(400, ['erreur' => 'nom ou catégorie invalide']);
    // une fois validée, la proposition n'est plus reliée à l'appareil qui l'a envoyée
    $db->prepare("UPDATE propositions SET statut = 'ok', nom = ?, role = ?, type = ?, appareil = '' WHERE id = ?")
       ->execute([$nom, $role, $type, $id]);
    viderCache();
    repondre(200, ['ok' => true]);
}

if ($action === 'refuser') {
    $q = $db->prepare('SELECT liste FROM propositions WHERE id = ?');
    $q->execute([$id]);
    $liste = $q->fetchColumn();
    if (!$liste) repondre(404, ['erreur' => 'proposition introuvable']);
    // un compte déjà ajouté puis retiré : on efface aussi les blocages ou suivis qui le concernent
    if ($liste === 'red') $db->prepare('DELETE FROM blocages WHERE compte = ?')->execute(['p' . $id]);
    else $db->prepare("DELETE FROM suivis WHERE liste = 'green' AND compte = ?")->execute(['p' . $id]);
    $db->prepare('DELETE FROM propositions WHERE id = ?')->execute([$id]);
    viderCache();
    repondre(200, ['ok' => true]);
}

if ($action === 'masquer') {
    $pid = $entree['pid'] ?? '';
    if (!is_string($pid) || !preg_match('/^[a-f0-9]{12}$/', $pid)) repondre(400, ['erreur' => 'profil invalide']);
    $db->prepare('UPDATE profils SET masque = ? WHERE pid = ?')->execute([empty($entree['masque']) ? 0 : 1, $pid]);
    viderCache();
    repondre(200, ['ok' => true]);
}

repondre(400, ['erreur' => 'action inconnue']);
