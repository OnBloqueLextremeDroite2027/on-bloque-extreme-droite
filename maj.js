// Mises à jour de l'appli installée : on vérifie à chaque retour sur l'appli, et on recharge
// dès qu'une nouvelle version est prête (jamais pendant une confirmation de blocage).
(() => {
  if (!('serviceWorker' in navigator)) return;
  const sw = navigator.serviceWorker;
  const hadController = !!sw.controller;   // false à la toute première visite : rien à recharger
  let reloading = false;

  const reloadWhenIdle = () => {
    if (document.querySelector('dialog[open]') || document.visibilityState !== 'visible') {
      setTimeout(reloadWhenIdle, 1000);
      return;
    }
    try { sessionStorage.setItem('obed:maj', '1'); } catch (e) {}
    location.reload();
  };
  sw.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    // garde-fou : jamais plus d'un rechargement automatique par minute (évite toute boucle)
    let last = 0;
    try { last = +sessionStorage.getItem('obed:maj-at') || 0; } catch (e) {}
    if (Date.now() - last < 60000) return;
    try { sessionStorage.setItem('obed:maj-at', String(Date.now())); } catch (e) {}
    reloading = true;
    reloadWhenIdle();
  });

  window.addEventListener('load', () => {
    sw.register('sw.js', { updateViaCache: 'none' }).then(reg => {
      // une appli installée reste ouverte en arrière-plan : elle ne recharge pas la page toute seule
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
      });
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});

    let updated = false;
    try { updated = sessionStorage.getItem('obed:maj') === '1'; sessionStorage.removeItem('obed:maj'); } catch (e) {}
    const toast = document.getElementById('toast');
    if (updated && toast) {
      toast.textContent = 'Appli mise à jour ✓';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2600);
    }
  });
})();
