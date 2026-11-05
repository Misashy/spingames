/* SpinGames – catalogue et favoris locaux. */
(() => {
  'use strict';
  const games = window.SPINGAMES_CATALOGUE || window.DEVWEB_CATALOGUE || [];
  const grid = document.getElementById('game-grid');
  const favGrid = document.getElementById('sg-fav-grid');
  const filters = document.getElementById('filters');
  if (!grid || !favGrid || !filters) return;

  const PALETTES = {
    sims: ['#4c2968','#231037'], minecraft: ['#346043','#142d27'],
    fortnite: ['#53319b','#181e4d'], elden: ['#51452d','#171b16'],
    mario: ['#a32f3a','#3a1b33'], ror2: ['#345da4','#101b39'],
    fm: ['#235c4b','#102b2d'], pubg: ['#6f5332','#272219'],
    apex: ['#7d323f','#2e1a2d']
  };
  const FAV_KEY = 'spingames.favorites.v1';
  let fallbackFav = [];
  function favorites() {
    const cloud = window.SpinGamesCloud;
    if (cloud?.userId()) {
      const current = cloud.get('favorites');
      return current && Array.isArray(current.values) ? current.values.filter(x => typeof x === 'string') : [];
    }
    try {
      const value = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
      return Array.isArray(value) ? value.filter(x => typeof x === 'string') : [];
    } catch (_) { return fallbackFav; }
  }
  function saveFavorites(next) {
    fallbackFav = Array.from(new Set(next));
    const cloud = window.SpinGamesCloud;
    if (cloud?.userId()) cloud.put('favorites', { values: fallbackFav });
    else {
      try { localStorage.setItem(FAV_KEY, JSON.stringify(fallbackFav)); } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('spingames:favorites-updated',{detail:{favorites:fallbackFav}}));
    render();
  }
  const isFavorite = slug => favorites().includes(slug);
  const urlFor = game => game.slug === 'les-sims-4'
    ? 'jeux/les-sims-4/lancer.html'
    : 'jeux/' + game.slug + '/index.html';

  function card(game) {
    const article = document.createElement('article');
    article.className = 'game-card sg-game-card';
    article.dataset.genre = game.genre;
    article.style.setProperty('--card-a', (PALETTES[game.tone] || ['#353a65','#191d36'])[0]);
    article.style.setProperty('--card-b', (PALETTES[game.tone] || ['#353a65','#191d36'])[1]);
    article.dataset.slug = game.slug;
    const link = document.createElement('a');
    link.className = 'sg-card-link';
    link.href = urlFor(game);
    link.setAttribute('aria-label', 'Jouer à ' + game.title);
    const top = document.createElement('div');
    top.className='card-top';
    // La vignette utilise désormais l'image du jeu : plus d'icônes décoratives.
    // Les étoiles des favoris, elles, restent accessibles.
    const footer=document.createElement('div');
    footer.className='card-bottom';
    const title=document.createElement('strong'); title.textContent=game.title;
    const genre=document.createElement('small'); genre.textContent=game.genre;
    const desc=document.createElement('p'); desc.textContent=game.one;
    footer.append(title,genre,desc);
    link.append(footer);
    article.append(link);
    if(game.slug==='les-sims-4'){
      const badge=document.createElement('span');
      badge.className='featured-pill';badge.textContent='★ TA ROUE SIMSPIN ORIGINALE';article.append(badge);
    }
    const star=document.createElement('button');
    star.type='button';star.className='sg-favorite' + (isFavorite(game.slug)?' is-favorite':'');
    star.textContent=isFavorite(game.slug)?'★':'☆';
    star.setAttribute('aria-pressed',String(isFavorite(game.slug)));
    star.setAttribute('aria-label',(isFavorite(game.slug)?'Retirer des favoris : ':'Ajouter aux favoris : ')+game.title);
    star.title=isFavorite(game.slug)?'Retirer de ma bibliothèque':'Ajouter à ma bibliothèque';
    star.addEventListener('click', () => {
      const current=favorites();
      saveFavorites(current.includes(game.slug)?current.filter(x=>x!==game.slug):current.concat(game.slug));
    });
    article.append(star);
    return article;
  }
  function render(){
    const currentFilter = filters.querySelector('button.active')?.dataset.filter || 'Tous';
    grid.replaceChildren(...games.filter(g=>currentFilter==='Tous'||g.genre===currentFilter).map(card));
    const saved=favorites();
    const mine=games.filter(g=>saved.includes(g.slug));
    favGrid.replaceChildren(...mine.map(card));
    const empty=document.getElementById('sg-library-empty');
    if(empty) empty.hidden=mine.length!==0;
    const count=document.getElementById('sg-favs-total');
    if(count) count.textContent=String(mine.length);
    const all=document.getElementById('sg-total-games');
    if(all) all.textContent=String(games.length).padStart(2,'0');
  }
  filters.addEventListener('click',event=>{
    const target=event.target.closest('button[data-filter]');
    if(!target)return;
    filters.querySelectorAll('button').forEach(button=>{
      const selected=button===target;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    render();
  });
  window.addEventListener('storage',event=>{if(event.key===FAV_KEY)render();});
  document.addEventListener('spingames:profile-ready', event => {
    if (event.detail?.kind === 'favorites') render();
  });
  render();
})();
