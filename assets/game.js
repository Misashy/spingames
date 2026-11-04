/* DevWebGames — une roue complète et autonome par univers. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const dataNode=$('game-data');
 if (!dataNode) return;
 const game=JSON.parse(dataNode.textContent);
 const platformStyle=document.createElement('link');
 platformStyle.rel='stylesheet';platformStyle.href='../../assets/platform.css';
 const siteConfig=document.createElement('script');siteConfig.src='../../assets/site-config.js';siteConfig.async=false;
 const platformScript=document.createElement('script');platformScript.src='../../assets/platform.js';platformScript.async=false;
 document.head.append(platformStyle,siteConfig,platformScript);

 const CAT_KEY=`devwebgames.${game.slug}.categories.v1`;
 const HISTORY_KEY=`devwebgames.${game.slug}.history.v1`;
 const COLORS=['#b8fb6b','#a38aff','#73deec','#ffc175','#fc80bb','#68e2b7'];
 const canvas=$('wheel'), ctx=canvas.getContext('2d');
 if (!ctx) return;
 const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeColor=c=>/^#[\da-f]{6}$/i.test(c)?c:'#b8fb6b';
 const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`cat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 const opts=[1,2,3,5];
 const safeCount=v=>opts.includes(Number(v))?Number(v):1;
 const storageGet=key=>{try{return localStorage.getItem(key)}catch(_){return null}};
 let toastTimer=0,spinning=false,rotation=0;
 const cleanCategories=value=>{
  const array=Array.isArray(value)?value:value?.categories;
  if(!Array.isArray(array)||array.length>40)throw Error('Il faut au maximum 40 catégories.');
  return array.map((cat,i)=>{
   if(!cat||typeof cat!=='object')throw Error('Fichier de catégories invalide.');
   const name=String(cat.name||'').trim().slice(0,60);
   if(!name)throw Error('Une catégorie doit avoir un nom.');
   const raw=Array.isArray(cat.items)?cat.items:[];
   const items=raw.map(v=>typeof v==='string'?v:(v?.name||v?.text||'')).map(v=>String(v).trim().slice(0,120)).filter(Boolean).slice(0,250);
   return {id:id(),name,icon:String(cat.icon||'🎲').trim().slice(0,12),color:safeColor(cat.color||COLORS[i%COLORS.length]),active:cat.active!==false,items,drawCount:safeCount(cat.drawCount),noDuplicates:cat.noDuplicates!==false};
  });
 };
 function loadCategories(){try{let raw=storageGet(CAT_KEY);if(raw!==null)return cleanCategories(JSON.parse(raw))}catch(e){console.warn('Catégories non lisibles',e)}return cleanCategories(game.categories)}
 let categories=loadCategories();
 let history=[];
 try{const h=JSON.parse(storageGet(HISTORY_KEY)||'[]');if(Array.isArray(h))history=h.filter(x=>x&&Array.isArray(x.results)).slice(0,10)}catch(_){/* ignore */}
 let selected=categories[0]?.id??null;
 function save(){try{localStorage.setItem(CAT_KEY,JSON.stringify(categories));window.SpinGames?.queueSave(game.slug)}catch(_){toast('Stockage indisponible : exporte tes listes.')}}
 function saveHistory(){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));window.SpinGames?.queueSave(game.slug)}catch(_){}}
 function toast(msg){const n=$('toast');n.textContent=msg;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3200)}
 const active=()=>categories.filter(c=>c.active&&c.items.length);
 function renderList(){
  const n=categories.filter(c=>c.active).length;
  $('cat-count').textContent=`(${categories.length})`;
  $('active-counter').textContent=`${n} active${n>1?'s':''}`;
  $('toggle-all').textContent=categories.every(c=>c.active)?'Tout désactiver':'Tout activer';
  $('category-list').innerHTML=categories.length?categories.map(c=>`<div class="cat-row ${c.active?'':'off'}" style="--swatch:${safeColor(c.color)}"><input class="cat-check" data-check="${c.id}" type="checkbox" ${c.active?'checked':''} aria-label="Activer ${escapeHTML(c.name)}" ${spinning?'disabled':''}><span class="cat-symbol">${escapeHTML(c.icon)}</span><div class="cat-name"><strong>${escapeHTML(c.name)}</strong><small>${c.items.length} choix · ${c.drawCount} tirage${c.drawCount>1?'s':''}</small></div><button type="button" class="cat-edit" data-edit="${c.id}" ${spinning?'disabled':''}>✎ Modifier</button></div>`).join(''):'<p class="panel-hint">Aucune catégorie. Ajoute-en une pour commencer.</p>';
  $('spin-btn').disabled=spinning||active().length===0;
 }
 function renderWheel(){
  const cats=active(),size=canvas.width,cx=size/2,cy=size/2,r=330;
  ctx.clearRect(0,0,size,size);
  ctx.beginPath();ctx.arc(cx,cy,r+12,0,Math.PI*2);ctx.fillStyle='#e6f0ff';ctx.fill();
  if(!cats.length){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#31374b';ctx.fill();ctx.fillStyle='#b5bdcc';ctx.font='bold 25px system-ui';ctx.textAlign='center';ctx.fillText('ACTIVE UNE CATÉGORIE',cx,cy-78);return;}
  const step=2*Math.PI/cats.length;
  cats.forEach((cat,i)=>{
   const start=-Math.PI/2-step/2+i*step;
   ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+step);ctx.closePath();ctx.fillStyle=safeColor(cat.color);ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#111627';ctx.stroke();
   ctx.save();ctx.translate(cx,cy);ctx.rotate(start+step/2+Math.PI/2);
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#121522';ctx.font=`900 ${cats.length>12?16:cats.length>8?20:24}px system-ui`;
   let name=cat.name.length>19?cat.name.slice(0,18)+'…':cat.name;
   ctx.fillText(name,0,-r*.66,cats.length>9?140:198);
   ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.lineWidth=10;ctx.strokeStyle='#e6f0ff';ctx.stroke();
  for(let i=0;i<28;i++){const a=i*Math.PI/14;ctx.beginPath();ctx.arc(cx+Math.cos(a)*(r+5),cy+Math.sin(a)*(r+5),2.4,0,Math.PI*2);ctx.fillStyle='#131a28';ctx.fill();}
 }
 function renderEditor(){
  const c=categories.find(x=>x.id===selected);
  if(!c){$('editor').innerHTML='<div class="editor-empty">Choisis ou ajoute une catégorie pour la modifier.</div>';return;}
  $('editor').innerHTML=`<div class="edit-grid"><div class="edit-name"><label for="ed-name">Nom de la catégorie</label><input id="ed-name" type="text" maxlength="60" value="${escapeHTML(c.name)}"></div><div><label for="ed-icon">Icône / emoji</label><input id="ed-icon" type="text" maxlength="12" value="${escapeHTML(c.icon)}"></div><div><label for="ed-color">Couleur</label><input id="ed-color" type="color" value="${safeColor(c.color)}"></div></div><div class="editor-settings"><div class="count-control"><label for="ed-count">Choix à tirer par lancer</label><select id="ed-count">${opts.map(n=>`<option value="${n}" ${c.drawCount===n?'selected':''}>${n} choix</option>`).join('')}</select></div><label class="dedup-control"><input id="ed-unique" type="checkbox" ${c.noDuplicates?'checked':''}> Sans doublon dans cette catégorie</label></div><div><label for="ed-items">Choix possibles (un par ligne)</label><textarea id="ed-items" rows="7" placeholder="Un choix par ligne">${escapeHTML(c.items.join('\n'))}</textarea><p class="edit-info">Jusqu’à 250 choix par catégorie. Les modifications sont enregistrées sur cet appareil.</p></div><div class="editor-btns"><button id="ed-save" class="g-save" type="button">💾 Enregistrer mes modifications</button><button id="ed-delete" class="g-delete" type="button">🗑 Supprimer la catégorie</button></div>`;
  $('ed-save').addEventListener('click',()=>{
   if(spinning)return;
   const name=$('ed-name').value.trim().slice(0,60);if(!name){toast('Indique un nom de catégorie.');return;}
   const items=$('ed-items').value.split(/\r?\n/).map(x=>x.trim().slice(0,120)).filter(Boolean);
   if(items.length>250){toast('Maximum 250 choix par catégorie.');return;}
   c.name=name;c.icon=$('ed-icon').value.trim().slice(0,12)||'🎲';c.color=safeColor($('ed-color').value);c.drawCount=safeCount($('ed-count').value);c.noDuplicates=$('ed-unique').checked;c.items=items;
   save();renderList();renderWheel();toast('Catégorie enregistrée !');
  });
  $('ed-delete').addEventListener('click',()=>{
   if(spinning)return;
   if(!confirm(`Supprimer « ${c.name} » et ses choix ?`))return;
   categories=categories.filter(x=>x.id!==c.id);selected=categories[0]?.id??null;save();renderAll();toast('Catégorie supprimée.');
  });
 }
 function renderHistory(){
  $('clear-history').disabled=!history.length||spinning;
  $('history').innerHTML=history.length?history.slice(0,5).map((entry,i)=>`<details class="history-round"><summary>Lancer ${history.length-i} · ${entry.results.length} catégorie${entry.results.length>1?'s':''}</summary><p>${entry.results.map(r=>`<strong>${escapeHTML(r.name)} :</strong> ${r.items.map(escapeHTML).join(' · ')}`).join('<br>')}</p></details>`).join(''):'Aucun lancer pour le moment.';
 }
 function renderAll(){renderList();renderWheel();renderEditor();renderHistory()}
 $('category-list').addEventListener('change',e=>{
  const el=e.target.closest('[data-check]');if(!el||spinning)return;
  const c=categories.find(c=>c.id===el.dataset.check);if(!c)return;c.active=el.checked;save();renderList();renderWheel();
 });
 $('category-list').addEventListener('click',e=>{
  const el=e.target.closest('[data-edit]');if(!el||spinning)return;
  selected=el.dataset.edit;renderEditor();$('editor-section').scrollIntoView({behavior:'smooth',block:'start'});
 });
 $('toggle-all').addEventListener('click',()=>{
  if(spinning)return;const enable=!categories.every(c=>c.active);
  categories.forEach(c=>c.active=enable);save();renderList();renderWheel();
 });
 $('add-category').addEventListener('click',()=>{
  if(spinning)return;if(categories.length>=40){toast('Maximum 40 catégories.');return;}
  const c={id:id(),name:'Nouvelle catégorie',icon:'🎲',color:COLORS[categories.length%COLORS.length],active:true,items:['Premier choix','Deuxième choix','Troisième choix'],drawCount:1,noDuplicates:true};
  categories.push(c);selected=c.id;save();renderAll();$('editor-section').scrollIntoView({behavior:'smooth',block:'start'});$('ed-name').focus();$('ed-name').select();
 });
 function pick(c){
  if(!c.items.length)return[];
  if(c.noDuplicates){const seen=new Set();const pool=c.items.filter(v=>{const k=v.toLocaleLowerCase('fr-FR');if(seen.has(k))return false;seen.add(k);return true});const out=[];for(let i=0;i<c.drawCount&&pool.length;i++)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return out;}
  return Array.from({length:c.drawCount},()=>c.items[Math.floor(Math.random()*c.items.length)]);
 }
 function renderResults(results){
  $('result-status').textContent=`${results.length} catégories`;
  $('results').className='result-grid';
  $('results').innerHTML=results.map(r=>`<div class="result-tile" style="--swatch:${safeColor(r.color)}"><strong>${escapeHTML(r.icon)} ${escapeHTML(r.name)}</strong><div class="result-choices">${r.items.map(x=>`<span class="result-choice">${escapeHTML(x)}</span>`).join('')}</div></div>`).join('');
 }
 $('spin-btn').addEventListener('click',()=>{
  const used=active();if(spinning||!used.length)return;spinning=true;
  const results=used.map(c=>({name:c.name,icon:c.icon,color:c.color,items:pick(c)}));
  $('results').className='result-placeholder';$('results').textContent='La roue tourne… ✨';$('result-status').textContent='Tirage en cours';
  renderList();renderHistory();$('spin-btn').textContent='↻  ÇA TOURNE…';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const target=Math.floor(Math.random()*360);const now=(rotation%360+360)%360;
  rotation+=(target-now+360)%360+360*(5+Math.floor(Math.random()*3));
  canvas.style.transition=reduced?'none':'transform 4.2s cubic-bezier(.12,.73,.12,1)';
  let finished=false;
  const finish=()=>{
   if(finished)return;finished=true;spinning=false;
   history.unshift({at:Date.now(),results});history=history.slice(0,10);saveHistory();
   window.SpinGames?.recordSpin(game.slug);
   renderResults(results);renderList();renderHistory();$('spin-btn').textContent='↻   FAIRE TOURNER LA ROUE';
   canvas.removeEventListener('transitionend',onEnd);
  };
  const onEnd=e=>{if(e.propertyName==='transform')finish()};
  canvas.addEventListener('transitionend',onEnd);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{canvas.style.transform=`rotate(${rotation}deg)`;if(reduced)finish()}));
  if(!reduced)setTimeout(finish,4700);
 });
 $('clear-history').addEventListener('click',()=>{if(spinning)return;history=[];saveHistory();renderHistory();toast('Historique effacé.');});
 $('export-btn').addEventListener('click',()=>{
  const clean=categories.map(({name,icon,color,active,items,drawCount,noDuplicates})=>({name,icon,color,active,items,drawCount,noDuplicates}));
  const url=URL.createObjectURL(new Blob([JSON.stringify(clean,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`devwebgames-${game.slug}-mes-categories.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
  toast('Fichier JSON téléchargé.');
 });
 $('import-btn').addEventListener('click',()=>{if(!spinning)$('import-file').click()});
 $('import-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>2_000_000)throw Error('Fichier trop volumineux.');
   const imported=cleanCategories(JSON.parse(await file.text()));
   if(!confirm(`Importer ${imported.length} catégories ? Tes catégories actuelles seront remplacées.`))return;
   categories=imported;selected=categories[0]?.id??null;save();renderAll();toast(`${imported.length} catégories importées !`);
  }catch(err){toast(err.message||'Impossible de lire ce fichier JSON.')}finally{e.target.value=''}
 });
 renderAll();
})();
