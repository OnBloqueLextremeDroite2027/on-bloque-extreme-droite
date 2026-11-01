// Affiche l'adresse de contact (CONTACT dans comptes.js) sur la page des mentions légales, si elle est renseignée.
if (window.CONTACT) {
  for (const id of ['contact-legal', 'contact-droits']) {
    const el = document.getElementById(id);
    const a = document.createElement('a');
    a.href = 'mailto:' + window.CONTACT;
    a.textContent = window.CONTACT;
    el.replaceChildren(a, document.createTextNode('.'));
  }
}
