// Page de gestion : la clé reste dans cet onglet (sessionStorage) et part seulement vers api/gestion.php.
(() => {
  const API = 'api/gestion.php';
  const NET = {
    x: ['X', h => `https://x.com/${h}`], instagram: ['Instagram', h => `https://www.instagram.com/${h}/`],
    tiktok: ['TikTok', h => `https://www.tiktok.com/@${h}`], bluesky: ['Bluesky', h => `https://bsky.app/profile/${h}`],
    youtube: ['YouTube', h => `https://www.youtube.com/@${h}`], facebook: ['Facebook', h => `https://www.facebook.com/${h}`],
  };
  const TYPES = {
    red: { politique: 'Politique', parti: 'Parti', media: 'Média', influenceur: 'Influenceur' },
    green: { personnalite: 'Personnalité', influenceur: 'Influenceur', organisation: 'Organisation', media: 'Média' },
  };
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const pl = (n, w) => `${n} ${w}${n > 1 ? 's' : ''}`;
  const link = (r, h) => NET[r] ? `<a href="${esc(NET[r][1](h))}" target="_blank" rel="noopener noreferrer">@${esc(h)} · ${NET[r][0]}</a>` : '';
  let cle = '';
  try { cle = sessionStorage.getItem('obed:gestion') || ''; } catch (e) {}

  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  async function call(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cle, ...body }) });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(data.erreur || `erreur ${r.status}`), { status: r.status });
    return data;
  }

  async function load() {
    const data = await call({ action: 'liste' });
    $('#login').hidden = true; $('#zone').hidden = false;
    $('#n-attente').textContent = data.attente.length;
    $('#n-profils').textContent = data.profils.length;
    $('#n-ajouts').textContent = data.ajouts.length;
    $('#attente').innerHTML = data.attente.length ? data.attente.map(p => `
      <form class="box prop" data-id="${p.id}">
        <p><span class="pill ${p.liste}">${p.liste === 'red' ? 'RedList' : 'GreenList'}</span> ${link(p.reseau, p.handle)}</p>
        <div class="field-row">
          <input name="nom" value="${esc(p.nom)}" aria-label="Nom affiché" maxlength="60">
          <select name="type" aria-label="Catégorie">${Object.entries(TYPES[p.liste]).map(([v, l]) =>
            `<option value="${v}"${v === p.type ? ' selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <input name="role" placeholder="Rôle affiché (ex. Rassemblement national)" aria-label="Rôle" maxlength="80">
        <div class="row"><button class="btn dark small" data-act="valider">Ajouter</button><button class="btn ghost small" data-act="refuser" type="button">Refuser</button></div>
      </form>`).join('') : '<p class="note">Rien à vérifier.</p>';
    $('#profils').innerHTML = data.profils.length ? `<ul class="admin-list">${data.profils.map(p => `
      <li class="${p.masque ? 'off' : ''}"><span><b>${esc(p.pseudo)}</b> ${p.handle ? link(p.reseau, p.handle) : ''}
        <small>${pl(p.red, 'blocage')} · ${pl(p.green, 'suivi')} · ${pl(p.fb, 'follow')}</small></span>
        <button class="btn ghost small" data-pid="${p.pid}" data-masque="${p.masque ? 0 : 1}">${p.masque ? 'Réafficher' : 'Masquer'}</button></li>`).join('')}</ul>`
      : '<p class="note">Aucun profil pour l’instant.</p>';
    $('#ajouts').innerHTML = data.ajouts.length ? `<ul class="admin-list">${data.ajouts.map(p => `
      <li><span><b>${esc(p.nom)}</b> ${link(p.reseau, p.handle)} <small>${p.liste === 'red' ? 'RedList' : 'GreenList'} · ${esc(TYPES[p.liste][p.type] || p.type)}</small></span>
        <button class="btn ghost small" data-retirer="${p.id}">Retirer</button></li>`).join('')}</ul>`
      : '<p class="note">Aucun compte ajouté pour l’instant.</p>';
  }
  const fail = x => {
    if (x.status === 403) { logout(); $('#login-err').textContent = 'Clé incorrecte.'; return; }
    toast(x.message);
  };

  $('#login').addEventListener('submit', async e => {
    e.preventDefault();
    cle = $('#cle').value.trim(); $('#login-err').textContent = '';
    try { await load(); try { sessionStorage.setItem('obed:gestion', cle); } catch (e) {} }
    catch (x) { x.status === 403 ? ($('#login-err').textContent = 'Clé incorrecte.') : ($('#login-err').textContent = x.message); }
  });
  function logout() {
    cle = ''; try { sessionStorage.removeItem('obed:gestion'); } catch (e) {}
    $('#zone').hidden = true; $('#login').hidden = false; $('#cle').value = '';
  }
  $('#logout').addEventListener('click', logout);

  $('#attente').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    e.preventDefault();
    const f = b.closest('form'), id = +f.dataset.id;
    try {
      if (b.dataset.act === 'valider') {
        await call({ action: 'valider', id, nom: f.elements.nom.value, role: f.elements.role.value, type: f.elements.type.value });
        toast('Compte ajouté pour tout le monde ✓');
      } else {
        if (!confirm('Refuser cette proposition ?')) return;
        await call({ action: 'refuser', id }); toast('Proposition refusée.');
      }
      load();
    } catch (x) { fail(x); }
  });
  $('#attente').addEventListener('submit', e => e.preventDefault());
  $('#profils').addEventListener('click', async e => {
    const b = e.target.closest('[data-pid]'); if (!b) return;
    try { await call({ action: 'masquer', pid: b.dataset.pid, masque: +b.dataset.masque }); load(); } catch (x) { fail(x); }
  });
  $('#ajouts').addEventListener('click', async e => {
    const b = e.target.closest('[data-retirer]'); if (!b) return;
    if (!confirm('Retirer ce compte de la liste ? Les blocages ou suivis qui le concernent seront effacés.')) return;
    try { await call({ action: 'refuser', id: +b.dataset.retirer }); toast('Compte retiré.'); load(); } catch (x) { fail(x); }
  });

  if (cle) load().catch(fail);
})();
