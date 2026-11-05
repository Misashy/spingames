/* Bouton favoris partagé par toutes les pages des jeux. */
(() => {
  'use strict';
  const KEY = 'spingames.favorites.v1';
  const slug = location.pathname.match(/\/jeux\/([^/]+)\//)?.[1] || '';
  if (!slug) return;
  const host = document.querySelector('.g-header, .sg-sims-header');
  if (!host) return;
  const list = () => {
    try {
      const cloud=window.SpinGamesCloud;
      const items=cloud?.userId() ? cloud.get('favorites')?.values : JSON.parse(sessionStorage.getItem(KEY) || '[]');
      return Array.isArray(items) ? items : [];
    } catch (_) { return []; }
  };
  const button = document.createElement('button');
  button.type='button';
  button.className='sg-game-favorite';
  function paint(){
    const saved=list().includes(slug);
    button.classList.toggle('is-favorite',saved);
    button.textContent=saved?'★ En favori':'☆ Ajouter aux favoris';
    button.setAttribute('aria-pressed',String(saved));
    button.setAttribute('aria-label',saved?'Retirer ce jeu de ma bibliothèque':'Ajouter ce jeu à ma bibliothèque');
  }
  button.addEventListener('click',() => {
    const current = list();
    const changed=current.includes(slug)?current.filter(v=>v!==slug):current.concat(slug);
    try {
      const items=[...new Set(changed)];
      if(window.SpinGamesCloud?.userId())window.SpinGamesCloud.put('favorites',{values:items});
      else sessionStorage.setItem(KEY,JSON.stringify(items));
    } catch (_) {}
    paint();
  });
  document.addEventListener('spingames:profile-ready',event=>{if(event.detail?.kind==='favorites')paint();});
  host.append(button);
  paint();
})();
