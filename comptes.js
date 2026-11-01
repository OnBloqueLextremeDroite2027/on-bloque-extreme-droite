// Liste des comptes proposés. Uniquement des comptes PUBLICS de personnalités politiques et de partis.
// Pour ajouter un compte : copie une ligne, change l'id (unique), le nom, le rôle, le type, le réseau et l'identifiant.
// Réseaux gérés : 'x', 'instagram', 'facebook', 'tiktok', 'youtube' (un onglet n'apparaît que s'il a des comptes).
// Types : 'politique', 'parti', 'media', 'influenceur'. Vérifie toujours l'identifiant en ouvrant le profil.
window.COMPTES = [
  { id: 'mlp-x',        nom: 'Marine Le Pen',          role: 'Rassemblement national',   type: 'politique', reseau: 'x',         handle: 'MLP_officiel' },
  { id: 'bardella-x',   nom: 'Jordan Bardella',        role: 'Rassemblement national',   type: 'politique', reseau: 'x',         handle: 'J_Bardella' },
  { id: 'zemmour-x',    nom: 'Éric Zemmour',           role: 'Reconquête',               type: 'politique', reseau: 'x',         handle: 'ZemmourEric' },
  { id: 'rn-x',         nom: 'Rassemblement national', role: 'Compte officiel du parti', type: 'parti',     reseau: 'x',         handle: 'RNational_off' },
  { id: 'marechal-x',   nom: 'Marion Maréchal',        role: 'Identité-Libertés',        type: 'politique', reseau: 'x',         handle: 'MarionMarechal' },
  { id: 'bardella-ig',  nom: 'Jordan Bardella',        role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'jordanbardella' },
  { id: 'reconquete-x', nom: 'Reconquête',             role: 'Compte officiel du parti', type: 'parti',     reseau: 'x',         handle: 'Reconquete_Z' },
  { id: 'ciotti-x',     nom: 'Éric Ciotti',            role: 'UDR, allié du RN',         type: 'politique', reseau: 'x',         handle: 'eciotti' },
  { id: 'mlp-ig',       nom: 'Marine Le Pen',          role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'marine_lepen' },
  { id: 'knafo-x',      nom: 'Sarah Knafo',            role: 'Reconquête',               type: 'politique', reseau: 'x',         handle: 'knafo_sarah' },
  { id: 'aliot-x',      nom: 'Louis Aliot',            role: 'Rassemblement national',   type: 'politique', reseau: 'x',         handle: 'louis_aliot' },
  { id: 'chenu-x',      nom: 'Sébastien Chenu',        role: 'Rassemblement national',   type: 'politique', reseau: 'x',         handle: 'sebchenu' },
  { id: 'marechal-ig',  nom: 'Marion Maréchal',        role: 'Identité-Libertés',        type: 'politique', reseau: 'instagram', handle: 'marionmarechal' },
  { id: 'philippot-x',  nom: 'Florian Philippot',      role: 'Les Patriotes',            type: 'politique', reseau: 'x',         handle: 'f_philippot' },
  // Ajouts du 31/10/2026 (repérés sur onbloquelextremedroite.fr, filtrés et vérifiés un par un)
  { id: 'mariani-x',       nom: 'Thierry Mariani',        role: 'Rassemblement national',   type: 'politique', reseau: 'x',         handle: 'ThierryMARIANI' },
  { id: 'patriotes-x',     nom: 'Les Patriotes',          role: 'Compte officiel du parti', type: 'parti',     reseau: 'x',         handle: '_LesPatriotes' },
  { id: 'zemmour-ig',      nom: 'Éric Zemmour',           role: 'Reconquête',               type: 'politique', reseau: 'instagram', handle: 'ericzemmour_' },
  { id: 'knafo-ig',        nom: 'Sarah Knafo',            role: 'Reconquête',               type: 'politique', reseau: 'instagram', handle: 'sarahknafo1' },
  { id: 'aliot-ig',        nom: 'Louis Aliot',            role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'louis_aliot' },
  { id: 'lavalette-ig',    nom: 'Laure Lavalette',        role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'laure_lavalette' },
  { id: 'chenu-ig',        nom: 'Sébastien Chenu',        role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'sebastien_chenu' },
  { id: 'tanguy-ig',       nom: 'Jean-Philippe Tanguy',   role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'tanguyjeanphilippe' },
  { id: 'sanchez-ig',      nom: 'Julien Sanchez',         role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'jsanchez_rn' },
  { id: 'diaz-ig',         nom: 'Edwige Diaz',            role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'edwige_diaz' },
  { id: 'jacobelli-ig',    nom: 'Laurent Jacobelli',      role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'laurentjacobelli' },
  { id: 'odoul-ig',        nom: 'Julien Odoul',           role: 'Rassemblement national',   type: 'politique', reseau: 'instagram', handle: 'julien_odoul' },
  { id: 'philippot-ig',    nom: 'Florian Philippot',      role: 'Les Patriotes',            type: 'politique', reseau: 'instagram', handle: 'f_philippot' },
  { id: 'rigault-ig',      nom: 'Stanislas Rigault',      role: 'Identité-Libertés',        type: 'politique', reseau: 'instagram', handle: 'stanislasrigault' },
  { id: 'ciotti-ig',       nom: 'Éric Ciotti',            role: 'UDR, allié du RN',         type: 'politique', reseau: 'instagram', handle: 'eciotti' },
  { id: 'rn-ig',           nom: 'Rassemblement national', role: 'Compte officiel du parti', type: 'parti',     reseau: 'instagram', handle: 'rassemblementnational_fr' },
  { id: 'groupern-ig',     nom: 'Groupe RN',              role: 'Groupe à l’Assemblée nationale', type: 'parti', reseau: 'instagram', handle: 'groupern' },
  { id: 'jab-ig',          nom: 'Les Jeunes avec Bardella', role: 'Mouvement de jeunes du RN', type: 'parti',  reseau: 'instagram', handle: 'jeunesavecbardella' },
  { id: 'reconquete-ig',   nom: 'Reconquête',             role: 'Compte officiel du parti', type: 'parti',     reseau: 'instagram', handle: 'reconquete_officiel' },
  { id: 'genz-ig',         nom: 'Génération Zemmour',     role: 'Mouvement de jeunes de Reconquête', type: 'parti', reseau: 'instagram', handle: 'generation_zemmour' },
  { id: 'idl-ig',          nom: 'Identité-Libertés',      role: 'Compte officiel du parti', type: 'parti',     reseau: 'instagram', handle: 'id_libertes' },
  { id: 'udr-ig',          nom: 'UDR',                    role: 'Compte officiel du parti, allié du RN', type: 'parti', reseau: 'instagram', handle: 'partiudr' },
];

// Paliers du compteur : [nombre de blocages, nom du palier]
window.PALIERS = [[3, 'Premier pas'], [10, 'Rempart'], [36, 'Barrage total']];

// Objectif quotidien affiché sous les filtres (« Aujourd'hui : 0 / 3 »)
window.OBJECTIF_JOUR = 3;

// Ton compte X à mettre en avant en haut (« Suivre @… »), sans le @. Vide = bouton masqué.
window.SUIVRE = 'everyonetogethe';

// Adresse du compteur commun (le fichier PHP).
// - Tout sur Hostinger : laisser 'api/compteur.php'.
// - Appli sur Vercel : mettre l'adresse complète sur Hostinger, ex. 'https://ton-domaine.fr/api/compteur.php',
//   et ajouter l'adresse Vercel dans ORIGINES_AUTORISEES, en haut de api/compteur.php.
window.API = 'https://olivedrab-cassowary-803566.hostingersite.com/api/compteur.php';

// Adresse pour signaler une erreur ou proposer un compte (laisser vide pour masquer les liens)
window.CONTACT = '';
