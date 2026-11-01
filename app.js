(() => {
  const KEY = 'obed:v1', KEY_COM = 'obed:communaute';
  const API = window.API || 'api/compteur.php';
  const API_COM = API + (API.includes('?') ? '&' : '?') + 'vue=communaute';
  const svg = (inner, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${inner}</svg>`;
  const NET = {
    x: { label: 'X', url: h => `https://x.com/${h}`,
      icon: svg('<path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z"/>') },
    instagram: { label: 'Instagram', url: h => `https://www.instagram.com/${h}/`,
      icon: svg('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/>', 'fill="none" stroke="currentColor" stroke-width="2.4"') },
    tiktok: { label: 'TikTok', url: h => `https://www.tiktok.com/@${h}`,
      icon: svg('<path fill="currentColor" d="M16.5 2h-3.6v13.3a2.9 2.9 0 1 1-2.1-2.8V8.8a6.6 6.6 0 1 0 5.7 6.5V8.6a8 8 0 0 0 4.5 1.4V6.4a4.6 4.6 0 0 1-4.5-4.4z"/>') },
    bluesky: { label: 'Bluesky', url: h => `https://bsky.app/profile/${h}`,
      icon: svg('<path fill="currentColor" d="M5.2 3.6C7.9 5.6 10.8 9.7 12 12c1.2-2.3 4.1-6.4 6.8-8.4 2-1.5 5.2-2.6 5.2 1 0 .7-.4 6-.7 6.9-.9 3-4 3.8-6.8 3.3 4.8.8 6 3.5 3.4 6.3-5 5.1-7.2-1.3-7.7-2.9l-.2-.5-.2.5c-.5 1.6-2.7 8-7.7 2.9-2.6-2.8-1.4-5.5 3.4-6.3-2.8.5-5.9-.3-6.8-3.3C.4 10.6 0 5.3 0 4.6c0-3.6 3.2-2.5 5.2-1z"/>') },
    youtube: { label: 'YouTube', url: h => `https://www.youtube.com/@${h}`,
      icon: svg('<path fill="currentColor" d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .4-4.8 31 31 0 0 0-.4-4.8zM9.7 15.1V8.9l5.8 3.1z"/>') },
    facebook: { label: 'Facebook', url: h => `https://www.facebook.com/${h}`,
      icon: svg('<path fill="currentColor" d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v8h4v-8h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/>') },
  };
  // forme des identifiants (la même que côté serveur, dans api/base.php)
  const HANDLE = {
    x: /^[A-Za-z0-9_]{1,15}$/, instagram: /^[A-Za-z0-9._]{1,30}$/, tiktok: /^[A-Za-z0-9._]{2,24}$/,
    bluesky: /^(?=.{3,100}$)[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/, youtube: /^[A-Za-z0-9._-]{3,30}$/, facebook: /^[A-Za-z0-9.]{5,50}$/,
  };
  const HOSTS = { 'x.com': 'x', 'twitter.com': 'x', 'instagram.com': 'instagram', 'tiktok.com': 'tiktok',
    'bsky.app': 'bluesky', 'youtube.com': 'youtube', 'facebook.com': 'facebook' };
  const TYPES = {
    red: { politique: ['Politiques', 'Politique'], parti: ['Partis', 'Parti'], media: ['Médias', 'Média'], influenceur: ['Influenceurs', 'Influenceur'] },
    green: { personnalite: ['Personnalités', 'Personnalité'], influenceur: ['Influenceurs', 'Influenceur'], organisation: ['Organisations', 'Organisation'], media: ['Médias', 'Média'] },
  };
  const $ = s => document.querySelector(s);
  const clamp = v => Math.max(0, Math.min(1, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
  const fmt = n => n.toLocaleString('fr-FR').replace(/[  ]/g, ' ');
  const plural = (n, w) => `${fmt(n)} ${w}${n > 1 ? 's' : ''}`;
  const adj = (n, w) => w + (n > 1 ? 's' : '');
  const initials = n => n.split(/[\s-]+/).filter(w => w.length > 2 || /^[A-ZÉ]/.test(w)).map(w => w[0]).slice(0, 3).join('').toUpperCase();
  const today = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-JJ, heure locale
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

  // ---------- état (stocké sur l'appareil) ----------
  // blocked = RedList, green = GreenList, fb = #FollowBack ; chaque entrée : { id, d: date du jour }
  let st = { blocked: [], green: [], fb: [] };
  try { st = { ...st, ...JSON.parse(localStorage.getItem(KEY)) }; } catch (e) {}
  for (const k of ['blocked', 'green', 'fb']) {
    st[k] = (Array.isArray(st[k]) ? st[k] : []).map(b => (typeof b === 'string' ? { id: b, d: '' } : b)); // ancien format
  }
  // identifiant aléatoire de l'appareil (= code de sauvegarde), pour que chaque compte ne compte qu'une fois
  const newId = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  if (!/^[a-f0-9]{32}$/.test(st.appareil || '')) st.appareil = newId();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  save();
  const listOf = key => (key === 'red' ? st.blocked : st[key]);
  const isBlocked = id => st.blocked.some(b => b.id === id);
  const todayCount = () => st.blocked.filter(b => b.d === today()).length;

  // données communes (classements, #FollowBack, comptes ajoutés), gardées pour un démarrage hors ligne
  let com = null;
  try { com = JSON.parse(localStorage.getItem(KEY_COM)); } catch (e) {}

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- serveur (api/compteur.php) ----------
  let live = null;        // { total, heure } quand le serveur répond, sinon on affiche le compteur perso
  async function post(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch (e) {}
    if (!r.ok) throw Object.assign(new Error(data.erreur || 'Le serveur ne répond pas. Réessaie dans un instant.'), { status: r.status });
    return data;
  }
  function gotTotals(data) {
    if (typeof data.total !== 'number') return;
    const grew = live && data.total > live.total;
    live = { total: data.total, heure: data.heure }; renderCounter(grew);
  }
  function gotMe(moi) {
    if (moi === undefined) return;
    st.moi = moi;
    st.profil = moi ? { pseudo: moi.pseudo, reseau: moi.reseau, handle: moi.handle } : null;
    save(); renderMe(); renderBoards(); decks.fb.update();
  }
  async function sync() {
    try {
      const data = await post({ appareil: st.appareil, comptes: st.blocked.map(b => b.id), green: st.green.map(b => b.id), fb: st.fb.map(b => b.id) });
      gotTotals(data); gotMe(data.moi);
    } catch (e) { if (!live) renderCounter(); }
  }
  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    try { const r = await fetch(API, { cache: 'no-store' }); if (r.ok) gotTotals(await r.json()); } catch (e) {}
  }
  let comAt = 0;
  async function loadCom() {
    if (document.visibilityState !== 'visible') return;
    comAt = Date.now();
    try {
      const r = await fetch(API_COM, { cache: 'no-store' });
      if (!r.ok) return;
      com = await r.json();
      try { localStorage.setItem(KEY_COM, JSON.stringify(com)); } catch (e) {}
      gotTotals(com);
      Object.values(decks).forEach(d => d.update());
      renderBoards();
    } catch (e) {}
  }
  setInterval(refresh, 15000);
  setInterval(loadCom, 60000);
  window.addEventListener('online', sync);

  // ---------- compteur ----------
  // compteur général : chaque action compte (blocage, soutien, follow)
  function renderCounter(bump) {
    const mine = st.blocked.length + st.green.length + st.fb.length, t = todayCount();
    const el = $('#count');
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    if (live) {
      // total de tout le monde, avec un cap « rond » juste au-dessus (16 684 470 → 16 700 000)
      const n = live.total;
      const step = Math.max(10, 10 ** (Math.floor(Math.log10(Math.max(n, 1))) - 2));
      const cap = (Math.floor(n / step) + 1) * step;
      el.textContent = fmt(n);
      $('#live-badge').textContent = 'EN DIRECT';
      $('#live-label').textContent = 'actions ensemble : blocages, soutiens et follows';
      $('#today-plus').textContent = `+${fmt(live.heure)} en 1 h`;
      $('#bar').style.width = `${(n - cap + step) / step * 100}%`;
      $('#next').textContent = `Prochain cap : ${fmt(cap)} · encore ${fmt(cap - n)}`;
    } else {
      const nx = PALIERS.find(([v]) => mine < v), prev = [...PALIERS].reverse().find(([v]) => mine >= v);
      const from = prev ? prev[0] : 0;
      el.textContent = fmt(mine);
      $('#live-badge').textContent = 'TON COMPTEUR';
      $('#live-label').textContent = 'actions sur cet appareil : blocages, soutiens et follows';
      $('#today-plus').textContent = `+${[st.blocked, st.green, st.fb].flat().filter(b => b.d === today()).length} aujourd’hui`;
      $('#bar').style.width = nx ? `${(mine - from) / (nx[0] - from) * 100}%` : '100%';
      $('#next').textContent = nx ? `Prochain cap : ${nx[0]} · encore ${nx[0] - mine}` : 'Tous les caps atteints. Respect.';
    }
    $('#day').textContent = t;
    $('#goal').textContent = OBJECTIF_JOUR;
    $('#day-bar').style.width = `${clamp(t / OBJECTIF_JOUR) * 100}%`;
  }

  // ---------- les trois listes ----------
  const GREEN = (window.GREENLIST || []).map(g => ({ ...g, id: `${g.reseau}:${g.handle.toLowerCase()}`, role: '' }));
  const LISTS = {
    red: {
      all: () => [...COMPTES, ...((com && com.ajouts && com.ajouts.red) || [])],
      types: TYPES.red, stamp: 'BLOQUÉ', btn: 'Bloquer ce compte', cls: 'red', q: 'Tu as bien bloqué', yes: 'Oui, bloqué',
      no: 'Pas de souci, il reste dans la liste.', unit: 'blocage', board: 'Top bloqueurs', together: 'blocages ensemble',
      doneAll: ['Barrage total ici.', 'Tous les comptes de cette liste sont bloqués. Essaie un autre réseau, ou fais tourner l’appli à 3 personnes.'],
    },
    green: {
      all: () => [...GREEN, ...((com && com.ajouts && com.ajouts.green) || [])],
      types: TYPES.green, stamp: 'SUIVI', btn: 'Suivre ce compte', cls: 'green', q: 'Tu suis bien', yes: 'Oui, je suis',
      no: 'Pas de souci, il reste dans la liste.', unit: 'suivi', board: 'Top soutiens', together: 'suivis ensemble',
      doneAll: ['Tu les suis tous ici.', 'Merci pour ton soutien ! Essaie un autre réseau, ou passe au #FollowBack.'],
    },
    fb: {
      // ordre : le compte X de l'appli (SUIVRE), puis les membres qui te suivent déjà (pour leur rendre le follow),
      // puis les autres dans l'ordre du serveur, qui met en avant les plus généreux (voir scoreFollowBack)
      all: () => {
        const meSuivent = new Set((st.moi && st.moi.meSuivent) || []);
        const membres = ((com && com.followback) || []).filter(p => p.id !== (st.moi && st.moi.pid))
          .map(p => ({ id: p.id, nom: p.pseudo, reseau: p.reseau, handle: p.handle, tag: meSuivent.has(p.id) ? 'Te suit déjà' : '',
            role: meSuivent.has(p.id) ? 'Te suit déjà : rends-lui le follow !'
              : p.g !== undefined ? `${plural(p.g, 'follow')} ${adj(p.g, 'donné')} · ${fmt(p.r)} ${adj(p.r, 'reçu')}` : 'Membre de l’appli' }))
          .sort((a, b) => meSuivent.has(b.id) - meSuivent.has(a.id));
        return [...(SUIVRE ? [{ id: 'suivre', nom: SUIVRE, role: 'Le compte de l’appli', reseau: 'x', handle: SUIVRE }] : []), ...membres];
      },
      types: null, allNets: true, stamp: 'SUIVI', btn: 'Suivre ce compte', cls: 'fb', q: 'Tu suis bien', yes: 'Oui, je suis',
      no: 'Pas de souci, il reste dans la liste.', unit: 'follow', board: 'Top #FollowBack', together: 'follows ensemble',
      doneAll: ['Tu as suivi tout le monde.', 'Reviens plus tard : de nouveaux membres arrivent chaque jour.'],
    },
  };

  let pending = null; // { deck, item, card } : compte ouvert, en attente de la confirmation au retour

  function makeDeck(key) {
    const cfg = LISTS[key];
    const el = $(`#${key}-deck`), netsEl = $(`#${key}-nets`), catsEl = $(`#${key}-cats`);
    const d = { key, cfg, net: null, cat: 'tous', skipped: new Set(), sig: '' };
    const done = id => listOf(key).some(b => b.id === id);
    const inFilter = c => (d.net === 'tous' || c.reseau === d.net) && (d.cat === 'tous' || c.type === d.cat);
    const items = () => cfg.all().filter(c => NET[c.reseau]);
    // signature de la pile (ordre et mentions « Te suit déjà ») : on ne redessine que si elle change
    const idsOf = () => items().map(c => c.id + (c.tag ? '*' : '')).join(',');
    d.remaining = () => items().filter(c => inFilter(c) && !done(c.id) && !d.skipped.has(c.id));

    function renderFilters() {
      const all = items();
      const nets = Object.keys(NET).filter(n => all.some(c => c.reseau === n));
      // #FollowBack : « Tous » par défaut, même avant que la liste des membres arrive (sinon on resterait bloqué sur X)
      const opts = cfg.allNets ? ['tous', ...nets] : nets;
      if (!opts.includes(d.net)) d.net = opts[0] || 'tous';
      netsEl.innerHTML = nets.length > 1 ? opts.map(n =>
        `<button role="tab" data-net="${n}" aria-selected="${n === d.net}">${n === 'tous' ? 'Tous' : NET[n].label}</button>`).join('') : '';
      if (!catsEl) return;
      const cats = ['tous', ...Object.keys(cfg.types).filter(t => all.some(c => c.type === t && (d.net === 'tous' || c.reseau === d.net)))];
      if (!cats.includes(d.cat)) d.cat = 'tous';
      catsEl.innerHTML = cats.map(t =>
        `<button role="tab" data-cat="${t}" aria-selected="${t === d.cat}">${t === 'tous' ? 'Tous' : cfg.types[t][0]}</button>`).join('');
    }
    netsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      d.net = b.dataset.net; d.render();
    });
    if (catsEl) catsEl.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      d.cat = b.dataset.cat; d.render();
    });

    function cardHTML(c) {
      const n = NET[c.reseau], url = esc(n.url(c.handle));
      const tag = c.tag || (cfg.types ? ((cfg.types[c.type] || [])[1] || n.label) : '#FollowBack');
      return `
        <span class="stamp yes">${cfg.stamp}</span><span class="stamp no">PASSE</span>
        <div class="avatar">${esc(initials(c.nom) || c.nom.slice(0, 2).toUpperCase())}<span class="badge">${n.icon}</span></div>
        <span class="tag">${esc(tag)}</span>
        <h3>${esc(c.nom)}</h3>
        ${c.role ? `<p class="role">${esc(c.role)}</p>` : ''}
        <p class="handle">@${esc(c.handle)} · ${n.label}</p>
        <a class="open" href="${url}" target="_blank" rel="noopener">Ouvrir le profil sur ${n.label}</a>
        <div class="actions">
          <button class="btn ghost" data-act="pass">Passer</button>
          <a class="btn ${cfg.cls}" data-act="yes" href="${url}" target="_blank" rel="noopener">${cfg.btn}</a>
        </div>`;
    }

    d.render = () => {
      renderFilters();
      const list = d.remaining();
      d.sig = idsOf();
      el.innerHTML = '';
      if (!list.length) {
        const all = items().filter(inFilter), nDone = all.filter(c => done(c.id)).length;
        const empty = document.createElement('div');
        empty.className = 'empty';
        if (!all.length && key === 'fb') {
          empty.innerHTML = com
            ? `<div class="bigtxt">Personne pour l’instant.</div><p>Ajoute ton compte pour être le premier ou la première du #FollowBack.</p><button class="btn dark" data-act="profil">Ajouter mon compte</button>`
            : `<div class="bigtxt">Chargement…</div><p>Il faut une connexion pour voir les membres du #FollowBack.</p>`;
        } else if (nDone === all.length) {
          empty.innerHTML = `<div class="bigtxt">${cfg.doneAll[0]}</div><p>${cfg.doneAll[1]}</p><button class="btn dark" data-act="share">Partager l’appli</button>`;
        } else {
          empty.innerHTML = `<div class="bigtxt">Fin de la pile.</div><p>Tu as passé ${plural(d.skipped.size, 'compte')}.</p><button class="btn dark" data-act="again">Les revoir</button>`;
        }
        el.appendChild(empty);
        return;
      }
      list.slice(0, 2).reverse().forEach((c, i, arr) => {
        const card = document.createElement('article');
        card.className = 'card' + (arr.length === 2 && i === 0 ? ' under' : '');
        card.innerHTML = cardHTML(c);
        card.dataset.id = c.id;
        el.appendChild(card);
        if (!card.classList.contains('under')) attachSwipe(card, c);
      });
    };
    // nouvelles données du serveur : on ne redessine que si la liste a changé (et pas pendant un geste)
    d.update = () => {
      if (dragging || pending) return; // jamais pendant un geste ou une confirmation
      if (idsOf() !== d.sig) d.render();
    };

    const pass = (card, c) => { d.skipped.add(c.id); fly(card, -1, d.render); };
    const start = (card, c, openIt) => {
      pending = { deck: d, item: c, card };
      if (openIt) window.open(NET[c.reseau].url(c.handle), '_blank', 'noopener');
      // si le profil ne s'est pas ouvert dans un autre onglet, on demande quand même
      setTimeout(() => { if (pending && pending.item === c && document.visibilityState === 'visible' && document.hasFocus()) ask(); }, 4000);
    };
    d.pass = pass; d.start = start;

    let dragging = false;
    function attachSwipe(card, c) {
      let x0 = null, dx = 0;
      const yes = card.querySelector('.stamp.yes'), no = card.querySelector('.stamp.no');
      card.addEventListener('pointerdown', e => {
        if (e.target.closest('a,button') || e.button > 0) return;
        x0 = e.clientX; dx = 0; dragging = true;
        card.setPointerCapture(e.pointerId);
        card.classList.remove('anim');
      });
      card.addEventListener('pointermove', e => {
        if (x0 === null) return;
        dx = e.clientX - x0;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
        yes.style.opacity = clamp(dx / 100); no.style.opacity = clamp(-dx / 100);
      });
      const end = () => {
        if (x0 === null) return;
        x0 = null; dragging = false;
        if (dx > 110) { snapBack(card); start(card, c, true); }
        else if (dx < -110) pass(card, c);
        else snapBack(card);
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    }

    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act], a.open'); if (!a) return;
      const card = a.closest('.card'), c = card && items().find(x => x.id === card.dataset.id);
      const act = a.dataset.act;
      if (act === 'pass' && c) pass(card, c);
      else if ((act === 'yes' || a.classList.contains('open')) && c) start(card, c, false); // le lien ouvre le profil
      else if (act === 'again') { d.skipped.clear(); d.render(); }
      else if (act === 'share') share();
      else if (act === 'profil') openProfil('fb');
    });

    // compte confirmé : on l'ajoute à la liste de l'appareil
    d.confirm = (c, card) => {
      const lst = listOf(key);
      if (lst.some(b => b.id === c.id)) return false;
      lst.push({ id: c.id, d: today() }); save();
      card && card.isConnected ? fly(card, 1, d.render) : d.render();
      return true;
    };
    return d;
  }

  function fly(card, dir, then) {
    card.classList.add('anim');
    card.style.transform = `translateX(${dir * 130}%) rotate(${dir * 18}deg)`;
    card.style.opacity = 0;
    setTimeout(then, 320);
  }
  function snapBack(card) {
    card.classList.add('anim');
    card.style.transform = '';
    card.querySelectorAll('.stamp').forEach(s => (s.style.opacity = 0));
  }

  const decks = { red: makeDeck('red'), green: makeDeck('green'), fb: makeDeck('fb') };

  // ---------- onglets ----------
  const TAB_HASH = { red: 'redlist', green: 'greenlist', fb: 'followback' };
  // #FollowBack est le premier onglet : c'est lui qui s'ouvre par défaut
  let tab = Object.keys(TAB_HASH).find(k => location.hash === '#' + TAB_HASH[k]) || (TAB_HASH[st.onglet] ? st.onglet : 'fb');
  function showTab(k) {
    tab = k; st.onglet = k; delete st.tab; save();
    document.querySelectorAll('.tabs [role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === k)));
    for (const key of Object.keys(LISTS)) $(`#panel-${key}`).hidden = key !== k;
    if (Date.now() - comAt > 30000) loadCom();
  }
  $('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab);
  });

  // ---------- classements ----------
  const rankTxt = r => (r === 1 ? '1er' : `${r}e`);
  function renderBoards() {
    for (const key of Object.keys(LISTS)) {
      const cfg = LISTS[key], rows = (com && com.classements && com.classements[key]) || [];
      const total = com && com.listes ? com.listes[key] : null;
      const me = st.moi && st.moi.rangs ? st.moi.rangs[key] : null;
      const mine = listOf(key).length;
      let foot;
      if (st.moi && st.moi.masque) foot = `<p class="board-me">Ton profil est masqué par la modération.</p>`;
      else if (st.profil) {
        const n = me ? me.n : mine;
        // #FollowBack : chacun voit aussi combien de follows il a reçus
        const score = key === 'fb' ? `${plural(n, 'follow')} ${adj(n, 'donné')} · <b>${plural(st.moi ? st.moi.recus || 0 : 0, 'follow')} ${adj(st.moi ? st.moi.recus || 0 : 0, 'reçu')}</b>` : plural(n, cfg.unit);
        foot = `<p class="board-me">Toi, <b>${esc(st.profil.pseudo)}</b> : ${me && me.rang ? `<b>${rankTxt(me.rang)}</b> · ` : ''}${score}</p>`;
      } else {
        foot = `<button class="btn ghost small" data-act="profil">Choisis un pseudo pour entrer dans le classement</button>`;
      }
      $(`#${key}-board`).innerHTML = `
        <div class="board-head"><h3>${cfg.board}</h3>${total != null ? `<span>${plural(total, cfg.unit)} ensemble</span>` : ''}</div>
        ${rows.length ? `<ol class="board-list">${rows.map((r, i) => {
          const n = NET[r.reseau];
          const who = r.handle && n
            ? `<a href="${esc(n.url(r.handle))}" target="_blank" rel="noopener noreferrer">${n.icon}@${esc(r.handle)}</a>` : '';
          // #FollowBack : follows reçus sous le pseudo, et un petit bouton pour suivre la personne
          let extra = '', btn = '';
          if (key === 'fb') {
            extra = `<small>${plural(r.recus || 0, 'follow')} ${adj(r.recus || 0, 'reçu')}</small>`;
            const moi = st.moi && r.pid === st.moi.pid;
            if (r.handle && n && !moi) {
              btn = st.fb.some(b => b.id === r.pid)
                ? `<span class="rb-done" title="Tu suis ${esc(r.pseudo)}">✓</span>`
                : `<a class="rb-follow" href="${esc(n.url(r.handle))}" target="_blank" rel="noopener noreferrer" data-follow="${esc(r.pid)}">Suivre</a>`;
            }
          }
          return `<li class="${i < 3 ? 'top' + (i + 1) : ''}"><span class="rk">${i + 1}</span><span class="who"><b>${esc(r.pseudo)}</b>${who}${extra}</span>${btn}<span class="sc">${fmt(r.n)}</span></li>`;
        }).join('')}</ol>`
          : `<p class="board-empty">${com ? 'Personne encore au classement. Sois le premier ou la première&nbsp;!' : 'Le classement s’affiche dès que la connexion revient.'}</p>`}
        ${foot}`;
    }
  }
  document.querySelectorAll('.board').forEach(b => b.addEventListener('click', e => {
    if (e.target.closest('[data-act="profil"]')) openProfil();
    // « Suivre » dans le classement #FollowBack : le lien ouvre le profil, puis on demande au retour, comme pour une carte
    const f = e.target.closest('[data-follow]');
    const r = f && ((com && com.classements && com.classements.fb) || []).find(x => x.pid === f.dataset.follow);
    if (r) decks.fb.start(null, { id: r.pid, nom: r.pseudo, reseau: r.reseau, handle: r.handle }, false);
  }));

  // ---------- confirmation au retour ----------
  const dlg = $('#confirm');
  function ask() {
    if (!pending || dlg.open || document.querySelector('dialog[open]')) return;
    const { deck, item } = pending;
    $('#confirm-q').innerHTML = `${deck.cfg.q}<br><b>${esc(item.nom)}</b> sur ${NET[item.reseau].label}&nbsp;?`;
    $('#confirm-yes').textContent = deck.cfg.yes;
    $('#confirm-yes').className = `btn ${deck.cfg.cls}`;
    dlg.showModal();
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(ask, 300); });
  window.addEventListener('focus', () => setTimeout(ask, 300));

  $('#confirm-yes').addEventListener('click', () => {
    dlg.close();
    const p = pending; pending = null;
    if (!p) return;
    const before = st.blocked.length, dayBefore = todayCount();
    if (!p.deck.confirm(p.item, p.card)) return;
    sync();
    // +1 tout de suite au compteur général, sans attendre la réponse du serveur
    if (live) live.total += 1;
    renderCounter(true);
    if (p.deck.key === 'red') {
      const palier = PALIERS.find(([v]) => before < v && st.blocked.length >= v);
      toast(palier ? `Cap atteint : ${palier[1]} !`
        : dayBefore < OBJECTIF_JOUR && todayCount() >= OBJECTIF_JOUR ? 'Objectif du jour atteint. Merci !' : '+1. Bien joué.');
    } else toast('+1. Merci pour ton soutien !');
    renderBoards();
    setTimeout(loadCom, 11000); // le classement du serveur est gardé 10 s en cache
    afterAction();
  });
  $('#confirm-no').addEventListener('click', () => {
    dlg.close(); const p = pending; pending = null;
    toast(p ? p.deck.cfg.no : 'Pas de souci.');
  });

  // première action : on propose un pseudo, puis d'installer l'appli
  function afterAction() {
    if (!st.demandeProfil && !st.profil) {
      st.demandeProfil = true; save();
      setTimeout(() => openProfil(null, true), 700);
    } else if (!askInstall()) maybeMerci();
  }

  // ---------- clavier ----------
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || /input|textarea|select/i.test(e.target.tagName)) return;
    const d = decks[tab], card = $(`#${tab}-deck .card:not(.under)`); if (!card) return;
    const c = d.remaining().find(x => x.id === card.dataset.id); if (!c) return;
    if (e.key === 'ArrowLeft') d.pass(card, c);
    if (e.key === 'ArrowRight') card.querySelector('[data-act="yes"]').click();
  });

  // ---------- profil : pseudo + compte perso ----------
  const reseauOptions = sel => (sel.innerHTML = Object.keys(NET).map(n => `<option value="${n}">${NET[n].label}</option>`).join(''));
  reseauOptions($('#p-reseau')); reseauOptions($('#q-reseau'));
  // accepte « @nom », « nom » ou un lien de profil (et choisit alors le réseau tout seul)
  function readHandle(input, select) {
    let h = input.value.trim();
    if (/[/.](com|app)\b|^https?:/i.test(h) && h.includes('/')) {
      try {
        const u = new URL(/^https?:/i.test(h) ? h : 'https://' + h);
        const host = u.hostname.replace(/^(www|m|mobile)\./, '');
        if (HOSTS[host]) select.value = HOSTS[host];
        const parts = u.pathname.split('/').filter(Boolean);
        h = (select.value === 'bluesky' && parts[0] === 'profile' ? parts[1] : parts[0]) || '';
      } catch (e) {}
    }
    h = h.replace(/^@/, '').trim();
    input.value = h;
    return h;
  }
  let profilFrom = null;
  function openProfil(from, first) {
    profilFrom = from || null;
    const p = st.profil;
    $('#profil-title').textContent = first ? 'Choisis ton pseudo' : p ? 'Mon profil' : 'Rejoins le classement';
    $('#profil-sub').innerHTML = first
      ? 'Bravo pour ton premier geste&nbsp;! Avec un pseudo, tu entres dans le classement des meilleurs contributeurs.'
      : from === 'fb' ? 'Ajoute ton compte&nbsp;: il apparaît dans le #FollowBack et les autres membres peuvent te suivre.'
      : 'Ton pseudo apparaît dans le classement des meilleurs contributeurs.';
    $('#p-pseudo').value = p ? p.pseudo : '';
    $('#p-reseau').value = p && p.reseau ? p.reseau : 'x';
    $('#p-handle').value = p && p.handle ? '@' + p.handle : '';
    $('#p-ok').checked = !!p;
    $('#p-err').textContent = '';
    $('#p-later').textContent = p ? 'Annuler' : 'Plus tard';
    $('#p-delete-wrap').hidden = !p;
    $('#profil').showModal();
    (from === 'fb' && p ? $('#p-handle') : $('#p-pseudo')).focus();
  }
  $('#me').addEventListener('click', () => openProfil());
  $('#fb-cta').addEventListener('click', () => openProfil('fb'));
  const closeProfil = () => { $('#profil').close(); askInstall(); };
  $('#p-later').addEventListener('click', closeProfil);
  $('#profil').addEventListener('cancel', e => { e.preventDefault(); closeProfil(); });
  $('#p-handle').addEventListener('change', () => readHandle($('#p-handle'), $('#p-reseau')));
  $('#profil-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#p-err'), pseudo = $('#p-pseudo').value.trim();
    const reseau = $('#p-reseau').value, handle = readHandle($('#p-handle'), $('#p-reseau'));
    err.textContent = '';
    if (pseudo.length < 2) { err.textContent = 'Choisis un pseudo (2 caractères au moins).'; return; }
    if (handle && !HANDLE[reseau].test(handle)) { err.textContent = `Cet identifiant ne ressemble pas à un compte ${NET[reseau].label}.`; return; }
    if (!$('#p-ok').checked) { err.textContent = 'Coche la case pour accepter l’affichage public.'; return; }
    $('#p-save').disabled = true;
    try {
      const data = await post({ action: 'profil', appareil: st.appareil, profil: { pseudo, reseau: handle ? reseau : '', handle } });
      gotMe(data.moi);
      $('#profil').close();
      toast(handle ? `Bienvenue ${pseudo} ! Ton compte est dans le #FollowBack.` : `Bienvenue ${pseudo} !`);
      sync(); loadCom();
      askInstall();
    } catch (x) {
      err.textContent = x.status ? x.message : 'Pas de connexion. Réessaie dans un instant.';
    } finally { $('#p-save').disabled = false; }
  });
  $('#p-delete').addEventListener('click', async () => {
    if (!confirm('Supprimer ton pseudo et ton compte du classement et du #FollowBack ? Tes blocages et suivis restent comptés.')) return;
    try {
      const data = await post({ action: 'profil', appareil: st.appareil, profil: null });
      gotMe(data.moi); $('#profil').close(); toast('Profil supprimé.'); loadCom();
    } catch (x) { $('#p-err').textContent = x.status ? x.message : 'Pas de connexion. Réessaie dans un instant.'; }
  });
  function renderMe() {
    $('#me-name').textContent = st.profil ? st.profil.pseudo : 'Pseudo';
    $('#fb-cta').textContent = st.profil && st.profil.handle ? 'Modifier mon compte' : '+ Ajouter mon compte';
  }

  // ---------- code de sauvegarde ----------
  const codeTxt = () => st.appareil.match(/.{4}/g).join('-');
  async function copyCode() {
    try { await navigator.clipboard.writeText(codeTxt()); toast('Code copié. Garde-le précieusement.'); }
    catch (e) { toast(codeTxt()); }
  }
  $('#p-code').addEventListener('click', () => {
    $('#profil').close();
    $('#code-val').textContent = codeTxt();
    $('#code-in').value = ''; $('#code-err').textContent = '';
    $('#code').showModal();
  });
  $('#code-copy').addEventListener('click', copyCode);
  $('#code-close').addEventListener('click', () => $('#code').close());
  $('#code-use').addEventListener('click', async () => {
    const code = $('#code-in').value.toLowerCase().replace(/[^a-f0-9]/g, ''), err = $('#code-err');
    err.textContent = '';
    if (!/^[a-f0-9]{32}$/.test(code)) { err.textContent = 'Ce code n’est pas complet : il fait 32 caractères (chiffres et lettres de a à f).'; return; }
    if (code === st.appareil) { err.textContent = 'C’est déjà le code de cet appareil.'; return; }
    try {
      const data = await post({ action: 'restaurer', appareil: code });
      const n = data.comptes.length + data.green.length + data.fb.length;
      if (!n && !data.moi) { err.textContent = 'Aucun progrès enregistré avec ce code.'; return; }
      if (!confirm(`Récupérer ${plural(n, 'action')}${data.moi ? ` et le pseudo ${data.moi.pseudo}` : ''} ? Ce que tu as fait sur cet appareil sera remplacé.`)) return;
      st.appareil = code;
      st.blocked = data.comptes.map(id => ({ id, d: '' }));
      st.green = data.green.map(id => ({ id, d: '' }));
      st.fb = data.fb.map(id => ({ id, d: '' }));
      st.demandeProfil = true;
      Object.values(decks).forEach(d => d.skipped.clear());
      gotMe(data.moi || null);
      $('#code').close();
      renderCounter(); Object.values(decks).forEach(d => d.render());
      toast('Progrès récupérés ✓');
      sync();
    } catch (x) { err.textContent = x.status ? x.message : 'Pas de connexion. Réessaie dans un instant.'; }
  });

  // ---------- proposer un compte ----------
  let propList = 'red';
  $('#panel-red').addEventListener('click', e => { if (e.target.closest('[data-propose]')) openPropose('red'); });
  $('#panel-green').addEventListener('click', e => { if (e.target.closest('[data-propose]')) openPropose('green'); });
  function openPropose(key) {
    propList = key;
    $('#prop-title').textContent = key === 'red' ? 'Proposer un compte à bloquer' : 'Proposer un compte à suivre';
    $('#prop-sub').innerHTML = key === 'red'
      ? 'Uniquement des comptes <b>publics</b> de personnalités politiques, de partis ou de médias d’extrême droite. Jamais de particuliers. On vérifie chaque proposition avant de l’ajouter.'
      : 'Un compte de gauche à suivre et à soutenir. On vérifie chaque proposition avant de l’ajouter.';
    $('#q-type').innerHTML = Object.entries(TYPES[key]).map(([v, [, one]]) => `<option value="${v}">${one}</option>`).join('');
    $('#q-nom').value = ''; $('#q-handle').value = ''; $('#q-err').textContent = '';
    $('#q-reseau').value = key === 'red' ? 'x' : 'instagram';
    $('#proposer').showModal();
    $('#q-nom').focus();
  }
  $('#q-cancel').addEventListener('click', () => $('#proposer').close());
  $('#prop-form').addEventListener('input', () => ($('#q-err').textContent = ''));
  $('#profil-form').addEventListener('input', () => ($('#p-err').textContent = ''));
  $('#q-handle').addEventListener('change', () => readHandle($('#q-handle'), $('#q-reseau')));
  $('#prop-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#q-err'), nom = $('#q-nom').value.trim(), reseau = $('#q-reseau').value;
    const handle = readHandle($('#q-handle'), $('#q-reseau'));
    err.textContent = '';
    if (nom.length < 2) { err.textContent = 'Indique le nom du compte.'; return; }
    if (!HANDLE[reseau].test(handle)) { err.textContent = `Indique l’identifiant ${NET[reseau].label} du compte (ou colle le lien de son profil).`; return; }
    if (LISTS[propList].all().some(c => c.reseau === reseau && c.handle.toLowerCase() === handle.toLowerCase())) {
      err.textContent = 'Ce compte est déjà dans la liste.'; return;
    }
    try {
      const data = await post({ action: 'proposer', appareil: st.appareil, liste: propList, nom, type: $('#q-type').value, reseau, handle });
      $('#proposer').close();
      toast(data.deja ? 'Déjà proposé, merci !' : 'Merci ! On vérifie, puis on l’ajoute.');
    } catch (x) { err.textContent = x.status ? x.message : 'Pas de connexion. Réessaie dans un instant.'; }
  });

  // ---------- remettre à zéro ----------
  $('#reset').addEventListener('click', async () => {
    if (!confirm('Tout remettre à zéro ? Tes blocages, tes suivis et ton pseudo seront effacés, ici et sur le serveur.')) return;
    st.blocked = []; st.green = []; st.fb = []; st.demandeProfil = false;
    Object.values(decks).forEach(d => d.skipped.clear());
    save();
    try { gotMe((await post({ action: 'profil', appareil: st.appareil, profil: null })).moi); } catch (e) {}
    renderCounter(); Object.values(decks).forEach(d => d.render()); renderBoards();
    sync(); toast('Tout est remis à zéro.');
  });

  // ---------- partage ----------
  async function share() {
    const n = st.blocked.length, url = location.href.split('#')[0];
    const text = n
      ? `J'ai bloqué ${n} compte${n > 1 ? 's' : ''} d'extrême droite. À ton tour ! #onbloquelextremedroite`
      : `On bloque l'extrême droite, trois comptes par jour. #onbloquelextremedroite`;
    if (navigator.share) { try { await navigator.share({ title: "On bloque l'extrême droite", text, url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Message et lien copiés !'); }
    catch (e) { toast(url); }
  }
  $('#share').addEventListener('click', share);

  // ---------- configuration ----------
  if (SUIVRE) {
    $('#follow').href = `https://x.com/${SUIVRE}`;
    $('#follow-handle').textContent = '@' + SUIVRE;
    $('#follow').hidden = false;
  }

  // ---------- installation (PWA) ----------
  // Chrome, Edge, Android : vraie fenêtre d'installation. iPhone et autres navigateurs : mode d'emploi.
  let deferred = null;
  const installed = () => {
    $('#install').disabled = true;
    $('#install-label').textContent = 'Appli installée ✓';
  };
  if (standalone) {
    // dans l'appli installée, on garde le bouton « Faire un don » mais plus celui d'installation
    $('#install').hidden = true; $('#dl-sub').hidden = true;
    // première ouverture de l'appli installée : un simple +1 au nombre d'installations, sans identifiant
    let dejaCompte = true;
    try { dejaCompte = localStorage.getItem('obed:installation') === '1'; } catch (e) {}
    if (!dejaCompte) {
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installation: true }) })
        .then(r => { if (r.ok) try { localStorage.setItem('obed:installation', '1'); } catch (e) {} })
        .catch(() => {});
    }
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; });
  window.addEventListener('appinstalled', () => { deferred = null; installed(); toast('Appli installée ! Retrouve-la sur ton écran d’accueil.'); });

  const helpSteps = () => isIOS ? [
      'Touche le bouton <b>Partager</b> <span aria-hidden="true">⎋</span> en bas de Safari (le carré avec une flèche vers le haut).',
      'Fais défiler et choisis <b>« Sur l’écran d’accueil »</b>.',
      'Touche <b>« Ajouter »</b> : l’appli apparaît avec tes autres applis.',
    ] : isAndroid ? [
      'Touche le menu <b>⋮</b> en haut à droite du navigateur.',
      'Choisis <b>« Installer l’application »</b> ou <b>« Ajouter à l’écran d’accueil »</b>.',
      'Confirme : l’appli apparaît avec tes autres applis.',
    ] : [
      'Dans la barre d’adresse, clique sur l’icône d’installation <b>⊕</b>, à droite.',
      'Ou ouvre le menu <b>⋮</b> du navigateur, puis <b>« Installer On bloque »</b>.',
      'Sur Firefox ou Safari pour Mac : ouvre le site sur ton téléphone, ou dans Chrome ou Edge.',
    ];
  async function install() {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome === 'accepted') installed();
      return;
    }
    $('#help-steps').innerHTML = helpSteps().map(s => `<li>${s}</li>`).join('');
    $('#install-help').showModal();
  }
  $('#install').addEventListener('click', install);
  $('#help-ok').addEventListener('click', () => $('#install-help').close());

  // après le pseudo : une seule invitation à installer l'appli pour garder ses progrès
  function askInstall() {
    if (standalone || st.demandeInstall || document.querySelector('dialog[open]')) return false;
    st.demandeInstall = true; save();
    $('#ios-note').hidden = $('#ios-copy').hidden = !isIOS;
    setTimeout(() => { if (!document.querySelector('dialog[open]')) $('#install-ask').showModal(); }, 500);
    return true;
  }

  // ---------- remerciement aux paliers d'engagement ----------
  // Une fois par palier franchi (actions de l'appareil : blocages + soutiens + follows), jamais deux fois le même.
  const PALIERS_MERCI = [10, 30, 75, 150, 300];
  const actions = () => st.blocked.length + st.green.length + st.fb.length;
  function maybeMerci() {
    const palier = [...PALIERS_MERCI].reverse().find(v => actions() >= v);
    if (!palier || palier <= (st.merci || 0) || document.querySelector('dialog[open]')) return;
    st.merci = palier; save(); // les paliers plus bas sont considérés comme vus
    const recus = st.moi ? st.moi.recus || 0 : 0;
    const stat = (n, label) => `<div><b>${fmt(n)}</b><span>${label}</span></div>`;
    $('#merci-kicker').textContent = `${fmt(actions())} actions : tu fais partie des plus engagés`;
    $('#merci-title').textContent = st.profil ? `Merci, ${st.profil.pseudo} !` : 'Merci !';
    $('#merci-perso').innerHTML = [
      stat(st.blocked.length, `${adj(st.blocked.length, 'compte')} ${adj(st.blocked.length, 'bloqué')}`),
      stat(st.green.length, `${adj(st.green.length, 'soutien')}`),
      stat(st.fb.length, `${adj(st.fb.length, 'follow')} ${adj(st.fb.length, 'donné')}`),
      st.profil && st.profil.handle ? stat(recus, `${adj(recus, 'follow')} ${adj(recus, 'reçu')}`) : '',
    ].join('');
    const L = com && com.listes;
    $('#merci-tous').innerHTML = L ? [
      com.membresFb ? `<li><b>${fmt(com.membresFb)} membres</b> se sont suivis entre eux (${plural(L.fb, 'follow')} ${adj(L.fb, 'échangé')})</li>` : '',
      `<li><b>${fmt(L.red)} blocages</b> de comptes d’extrême droite</li>`,
      L.green ? `<li><b>${plural(L.green, 'soutien')}</b> à des comptes de gauche</li>` : '',
    ].join('') : `<li><b>${fmt(live ? live.total : actions())} actions</b> faites ensemble</li>`;
    setTimeout(() => { if (!document.querySelector('dialog[open]')) $('#merci').showModal(); }, 900);
  }
  $('#merci-later').addEventListener('click', () => $('#merci').close());
  $('#merci-don').addEventListener('click', () => { $('#merci').close(); toast('Merci pour ton soutien ♥'); });
  $('#ia-later').addEventListener('click', () => $('#install-ask').close());
  $('#ia-go').addEventListener('click', () => { $('#install-ask').close(); install(); });
  $('#ios-copy').addEventListener('click', copyCode);

  renderMe();
  renderCounter();
  Object.values(decks).forEach(d => d.render());
  renderBoards();
  showTab(tab);
  sync(); // envoie les listes de l'appareil (rattrape aussi ce qui a été fait hors ligne) et récupère le total
})();
