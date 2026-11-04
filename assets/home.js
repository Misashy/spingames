(() => {
 'use strict';
 const games = window.DEVWEB_CATALOGUE || [];
 const grid = document.getElementById('game-grid');
 const filters = document.getElementById('filters');
 if (!grid || !filters) return;
 const palettes = {
  sims:['#3a2c62','#1c163e'],minecraft:['#244d45','#132b31'],fortnite:['#443a86','#21254b'],roblox:['#543449','#291a40'],stardew:['#395645','#20362f'],animal:['#245d5b','#17383e'],gta:['#69433a','#332432'],valorant:['#602e44','#2b2339']
 };
 function card(game){
  const a=document.createElement('a');a.className='game-card';a.href=`jeux/${game.slug}/index.html`;a.dataset.genre=game.genre;
  const c=palettes[game.tone] || ['#353a65','#191d36'];a.style.setProperty('--card-a',c[0]);a.style.setProperty('--card-b',c[1]);
  const top=document.createElement('div');top.className='card-top';
  const icon=document.createElement('span');icon.className='card-emoji';icon.textContent=game.icon;
  const arrow=document.createElement('span');arrow.className='card-arrow';arrow.setAttribute('aria-hidden','true');arrow.textContent='↗';top.append(icon,arrow);a.append(top);
  if(game.slug==='les-sims-4'){let badge=document.createElement('span');badge.className='featured-pill';badge.textContent='★ TA ROUE SIMSPIN ORIGINALE';a.append(badge);}
  const foot=document.createElement('div');foot.className='card-bottom';
  const t=document.createElement('strong');t.textContent=game.title;const sub=document.createElement('small');sub.textContent=game.genre;const text=document.createElement('p');text.textContent=game.one;
  foot.append(t,sub,text);a.append(foot);
  a.setAttribute('aria-label',`Ouvrir la page ${game.title}`);
  return a;
 }
 games.forEach(game=>grid.append(card(game)));
 filters.addEventListener('click',e=>{
  const btn=e.target.closest('button[data-filter]');if(!btn)return;
  const genre=btn.dataset.filter;
  filters.querySelectorAll('button[data-filter]').forEach(b=>{const yes=b===btn;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});
  grid.querySelectorAll('.game-card').forEach(card=>{card.hidden=genre!=='Tous'&&card.dataset.genre!==genre;});
 });
})();
