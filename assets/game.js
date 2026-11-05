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
 const cloudScript=document.createElement('script');cloudScript.src='../../assets/cloud-sync.js?v=20261105-private-v2';cloudScript.async=false;
 const platformScript=document.createElement('script');platformScript.src='../../assets/platform.js?v=20261105-private-v2';platformScript.async=false;
 document.head.append(platformStyle,siteConfig,cloudScript,platformScript);

 const CAT_KEY=`devwebgames.${game.slug}.categories.v1`;
 const HISTORY_KEY=`devwebgames.${game.slug}.history.v1`;
 const COLORS=['#b8fb6b','#a38aff','#73deec','#ffc175','#fc80bb','#68e2b7'];
 const firstCanvas=$('wheel');
 if (!firstCanvas || !firstCanvas.getContext('2d')) return;
 const wheelGrid=document.createElement('div');
 wheelGrid.id='multi-wheels';
 wheelGrid.className='multi-wheels';
 firstCanvas.closest('.wheel-zone').replaceWith(wheelGrid);
 const wheelNodes=new Map();
 let canvas=firstCanvas,ctx=canvas.getContext('2d');
 const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeColor=c=>/^#[\da-f]{6}$/i.test(c)?c:'#b8fb6b';
 const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`cat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
 const opts=[1,2,3,4,5];
 const safeCount=v=>opts.includes(Number(v))?Number(v):1;
 // Les invités utilisent l'espace temporaire de l'onglet ; les comptes ont des clés isolées.
 const scopedKey=key=>window.SpinGames?.user?.id
  ? 'spingames.account.'+window.SpinGames.user.id+'.'+key
  : 'spingames.guest.'+key;
 const storageArea=()=>window.SpinGames?.user?.id ? localStorage : sessionStorage;
 const storageGet=key=>{try{return storageArea().getItem(scopedKey(key))}catch(_){return null}};
 const storageSet=(key,value)=>storageArea().setItem(scopedKey(key),value);
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
   return {id:id(),name,icon:String(cat.icon||'🎲').trim().slice(0,12),color:safeColor(cat.color||COLORS[i%COLORS.length]),active:cat.active!==false,items,drawCount:safeCount(cat.drawCount),spinMode:cat.spinMode==='each'?'each':'once',noDuplicates:cat.noDuplicates!==false};
  });
 };
 function loadCategories(){try{let raw=storageGet(CAT_KEY);if(raw!==null)return cleanCategories(JSON.parse(raw))}catch(e){console.warn('Catégories non lisibles',e)}return cleanCategories(game.categories)}
 let categories=loadCategories();
 let history=[];
 try{const h=JSON.parse(storageGet(HISTORY_KEY)||'[]');if(Array.isArray(h))history=h.filter(x=>x&&Array.isArray(x.results)).slice(0,10)}catch(_){/* ignore */}
 let selected=categories[0]?.id??null;
 let wheelActiveId=selected;
 function save(){try{storageSet(CAT_KEY,JSON.stringify(categories));window.SpinGames?.queueSave(game.slug)}catch(_){toast('Stockage indisponible : exporte tes listes.')}}
 function saveHistory(){try{storageSet(HISTORY_KEY,JSON.stringify(history));window.SpinGames?.queueSave(game.slug)}catch(_){}}
 function toast(msg){const n=$('toast');n.textContent=msg;n.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('visible'),3200)}
 const active=()=>categories.filter(c=>c.active&&c.items.length);
 // Visuels de présentation uniquement : aucune donnée de catégorie n'est ajoutée
 // aux sauvegardes locales ou cloud. Les anciennes listes sont reconnues par nom.
 const categoryArt=game.slug==='minecraft'?new Map([
  ['survie','minecraft-wheel-survie.webp'],
  ['construction','minecraft-wheel-construction.webp'],
  ['exploration','minecraft-wheel-exploration.webp'],
  ['vie du monde','minecraft-wheel-vie-du-monde.webp']
 ]):game.slug==='fortnite'?new Map([
  ['facile','fortnite-wheel-facile.webp'],
  ['moyen','fortnite-wheel-moyen.webp'],
  ['difficile','fortnite-wheel-difficile.webp'],
  ['extreme','fortnite-wheel-extreme.webp'],
  ['defi trool','fortnite-wheel-defi-trool.webp']
 ]):null;
 const wheelImages=new Map();
 function categoryImage(cat){
  if(!categoryArt||!cat)return null;
  const name=cat.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr-FR').trim().replace(/\s+/g,' ');
  const fallback=game.slug==='fortnite'?'fortnite.webp':'minecraft.webp';
  const src=`../../assets/game-art/${categoryArt.get(name)||fallback}`;
  if(!wheelImages.has(src)){
   const img=new Image();
   wheelImages.set(src,img);
   img.onload=()=>{if(!spinning)renderWheel();};
   img.onerror=()=>{
    // Ne pas casser les roues si une image personnalisée n'a pas encore été publiée.
    img.onerror=null;
    if(!src.endsWith('/'+fallback))img.src='../../assets/game-art/'+fallback;
   };
   // En cas d'échec, le secteur conserve sa couleur et son texte contrasté.
   img.src=src;
  }
  return wheelImages.get(src);
 }
 function drawCategorySector(img,cx,cy,r,i){
  ctx.save();ctx.clip();
  if(img?.complete&&img.naturalWidth){
   // Même cadrage cover pour chaque part : l'illustration reste continue,
   // mais chaque secteur est réellement découpé par le chemin courant.
   const scale=Math.max(2*r/img.naturalWidth,2*r/img.naturalHeight);
   const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
   ctx.drawImage(img,cx-w/2,cy-h/2,w,h);
  }
  ctx.fillStyle=i%2?'rgba(5,10,18,.32)':'rgba(5,10,18,.24)';
  ctx.fillRect(cx-r,cy-r,2*r,2*r);
  ctx.restore();
 }
 function drawCategoryLabel(item,index,count,step,r,numberOnly,fontSize,maxWidth,maxLines){
  const padding=5,anchor=numberOnly?r*.76:count<=6?r*.60:r*.70;
  const minimumSize=Math.max(12,Math.ceil(fontSize*.85));
  let size=fontSize,lines,lineHeight;
  // La hauteur disponible dépend de l'angle réel du secteur à son bord intérieur.
  const availableHeight=count<=2?2*r:2*(anchor-maxWidth/2-padding)*Math.tan(step/2);
  do{
   ctx.font=`900 ${size}px "DM Sans",system-ui,sans-serif`;
   lineHeight=size*1.12;
   const limit=Math.max(1,Math.min(maxLines,Math.floor((availableHeight-2*padding)/lineHeight)));
   lines=numberOnly?[String(index+1)]:wheelTextLines(item,maxWidth,limit);
   if(!lines.some(line=>line.endsWith('…'))||size<=minimumSize)break;
   size-=1;
  }while(size>=minimumSize);
  const width=Math.max(...lines.map(line=>ctx.measureText(line).width))+2*padding;
  const height=lines.length*lineHeight+2*padding;
  ctx.fillStyle='rgba(7,12,22,.88)';
  ctx.fillRect(-width/2,-height/2,width,height);
  ctx.fillStyle='#fff';
  lines.forEach((line,j)=>ctx.fillText(line,0,(j-(lines.length-1)/2)*lineHeight));
 }
 function renderList(){
  const n=categories.filter(c=>c.active).length;
  $('cat-count').textContent=`(${categories.length})`;
  $('active-counter').textContent=`${n} active${n>1?'s':''}`;
  $('toggle-all').textContent=categories.every(c=>c.active)?'Tout désactiver':'Tout activer';
  $('category-list').innerHTML=categories.length?categories.map(c=>`<div class="cat-row ${c.active?'':'off'} ${c.active&&c.items.length?'wheel-visible':''}" style="--swatch:${safeColor(c.color)}"><input class="cat-check" data-check="${c.id}" type="checkbox" ${c.active?'checked':''} aria-label="Activer ${escapeHTML(c.name)}" ${spinning?'disabled':''}><span class="cat-symbol">${escapeHTML(c.icon)}</span><button type="button" class="cat-name cat-preview" data-preview="${c.id}" aria-label="Sélectionner ${escapeHTML(c.name)} pour modifier ses choix" ${spinning?'disabled':''}><strong>${escapeHTML(c.name)}</strong><small>${c.items.length} choix · ${c.drawCount} tirage${c.drawCount>1?'s':''}</small></button><button type="button" class="cat-edit" data-edit="${c.id}" ${spinning?'disabled':''}>✎ Modifier</button><div class="cat-options"><label>Tirages <select data-count="${c.id}" aria-label="Nombre de tirages pour ${escapeHTML(c.name)}" ${spinning?'disabled':''}>${opts.map(x=>`<option value="${x}" ${c.drawCount===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Animation <select data-mode="${c.id}" aria-label="Mode d'animation pour ${escapeHTML(c.name)}" ${spinning?'disabled':''}><option value="once" ${c.spinMode!=='each'?'selected':''}>1 tour</option><option value="each" ${c.spinMode==='each'?'selected':''}>Chaque choix</option></select></label></div></div>`).join(''):'<p class="panel-hint">Aucune catégorie. Ajoute-en une pour commencer.</p>';
  $('spin-btn').disabled=spinning||active().length===0;
 }
 // Découpe les libellés en lignes sans écraser les lettres : le texte complet
 // reste consultable dans la liste accessible sous la roue.
 function wheelTextLines(value,maxWidth,maxLines){
  const words=String(value).trim().split(/\s+/).filter(Boolean),all=[];
  let line='';
  for(const word of words){
   if(ctx.measureText(line?`${line} ${word}`:word).width<=maxWidth){line=line?`${line} ${word}`:word;continue;}
   if(line){all.push(line);line='';}
   if(ctx.measureText(word).width<=maxWidth){line=word;continue;}
   // Les mots sans espace doivent aussi tenir dans un secteur.
   for(const ch of Array.from(word)){
    if(ctx.measureText(line+ch).width<=maxWidth){line+=ch;}
    else{if(line)all.push(line);line=ch;}
   }
  }
  if(line)all.push(line);
  if(all.length<=maxLines)return all;
  const visible=all.slice(0,maxLines);
  let last=visible[maxLines-1]||'';
  while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);
  visible[maxLines-1]=last+'…';
  return visible;
 }
 function paintWheel(cat,node){
  canvas=node;ctx=canvas.getContext('2d');
  const items=cat.items,size=720,cx=size/2,cy=size/2,r=330;
  const illustration=categoryImage(cat);
  const numberOnly=items.length>44;
  canvas.setAttribute('aria-label',cat?`Roue des choix de ${cat.name}. ${items.length} possibilités.`:'Roue vide : active une catégorie');
  // Les coordonnées restent basées sur 720 px ; le dessin est rendu en 1440 px.
  const pixelScale=canvas.width/720;ctx.setTransform(pixelScale,0,0,pixelScale,0,0);
  ctx.clearRect(0,0,size,size);
  ctx.beginPath();ctx.arc(cx,cy,r+12,0,Math.PI*2);ctx.fillStyle='#e6f0ff';ctx.fill();
  if(!items.length){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#31374b';ctx.fill();ctx.fillStyle='#e7eeff';ctx.font='800 24px system-ui';ctx.textAlign='center';ctx.fillText('ACTIVE UNE CATÉGORIE',cx,cy-78);return;}
  const step=2*Math.PI/items.length;
  const compact=window.matchMedia('(max-width:650px)').matches;
  const fontSize=items.length<=5?(compact?30:26):items.length<=10?(compact?28:22):items.length<=14?(compact?24:20):items.length<=20?(compact?20:17):items.length<=30?14:12;
  // Garder une marge entre les lignes et les bords des secteurs,
  // y compris sur les téléphones où les textes occupent plus de place.
  const maxLines=items.length<=10?3:items.length<=26?2:1;
  const maxWidth=items.length<=6?216:items.length<=20?170:150;
  items.forEach((item,i)=>{
   const start=-Math.PI/2-step/2+i*step,angle=start+step/2;
   ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+step);ctx.closePath();ctx.fillStyle=safeColor(cat.color);ctx.fill();
   if(categoryArt)drawCategorySector(illustration,cx,cy,r,i);
   else if(i%2){ctx.fillStyle='rgba(255,255,255,.23)';ctx.fill();}
   ctx.lineWidth=items.length>80?0.8:1.8;ctx.strokeStyle=categoryArt?'rgba(230,240,255,.8)':'#17202a';ctx.stroke();
   ctx.save();if(categoryArt)ctx.clip();ctx.translate(cx,cy);ctx.rotate(angle);
   // Les textes suivent le rayon du secteur : ils disposent de sa profondeur,
   // et non de la petite largeur de son arc, contrairement à l'ancienne roue.
   ctx.translate(numberOnly?r*.76:items.length<=6?r*.60:r*.70,0);
   if(Math.cos(angle)<-0.025)ctx.rotate(Math.PI);
   ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#151b24';
   if(categoryArt)drawCategoryLabel(item,i,items.length,step,r,numberOnly,fontSize,maxWidth,maxLines);
   else{
    ctx.font=`900 ${fontSize}px "DM Sans",system-ui,sans-serif`;
    const lines=numberOnly?[String(i+1)]:wheelTextLines(item,maxWidth,maxLines);
    const lineHeight=fontSize*1.12;
    lines.forEach((line,j)=>ctx.fillText(line,0,(j-(lines.length-1)/2)*lineHeight));
   }
   ctx.restore();
  });
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.lineWidth=10;ctx.strokeStyle='#e6f0ff';ctx.stroke();
  for(let i=0;i<28;i++){const a=i*Math.PI/14;ctx.beginPath();ctx.arc(cx+Math.cos(a)*(r+5),cy+Math.sin(a)*(r+5),2.4,0,Math.PI*2);ctx.fillStyle='#131a28';ctx.fill();}
 }
 function renderWheel(){
  const visible=active();
  wheelGrid.dataset.count=String(visible.length);
  wheelNodes.clear();
  if(!visible.length){
   wheelGrid.innerHTML='<p class="multi-wheels-empty">Active au moins une catégorie avec des choix pour afficher sa roue.</p>';
   $('wheel-label').textContent='Aucune catégorie active.';
   $('wheel-choices-list').innerHTML='';
   return;
  }
  $('wheel-label').textContent=visible.length===1
   ? 'Une catégorie active : une roue.'
   : visible.length+' catégories actives : '+visible.length+' roues, un seul lancement simultané.';
  const fragment=document.createDocumentFragment();
  for(const cat of visible){
   const tile=document.createElement('section');
   tile.className='multi-wheel-card';
   tile.setAttribute('aria-label','Roue de '+cat.name);
   tile.innerHTML=`<h3 class="multi-wheel-title">${escapeHTML(cat.icon)} ${escapeHTML(cat.name)}</h3>
    <p class="multi-wheel-count">${cat.items.length} choix · ${cat.drawCount} tirage${cat.drawCount>1?'s':''}</p>
    <div class="wheel-zone"><span class="wheel-pointer" aria-hidden="true"></span>
    <canvas width="1440" height="1440" role="img"></canvas>
    <div class="wheel-hub" aria-hidden="true">✳</div></div>`;
   const node=tile.querySelector('canvas');
   node.width=visible.length>=3?960:1440;node.height=node.width;
   wheelNodes.set(cat.id,node);
   fragment.append(tile);
  }
  wheelGrid.replaceChildren(fragment);
  for(const cat of visible)paintWheel(cat,wheelNodes.get(cat.id));
  $('wheel-choices-list').innerHTML=visible.map(cat=>
   `<li><strong>${escapeHTML(cat.name)}</strong> — ${cat.items.map(escapeHTML).join(' · ')}</li>`).join('');
 }
 function renderEditor(){
  const c=categories.find(x=>x.id===selected);
  if(!c){$('editor').innerHTML='<div class="editor-empty">Choisis ou ajoute une catégorie pour la modifier.</div>';return;}
  $('editor').innerHTML=`<div class="edit-grid"><div class="edit-name"><label for="ed-name">Nom de la catégorie</label><input id="ed-name" type="text" maxlength="60" value="${escapeHTML(c.name)}"></div><div><label for="ed-icon">Icône / emoji</label><input id="ed-icon" type="text" maxlength="12" value="${escapeHTML(c.icon)}"></div><div><label for="ed-color">Couleur</label><input id="ed-color" type="color" value="${safeColor(c.color)}"></div></div><div class="editor-settings"><div class="count-control"><label for="ed-count">Choix à tirer par lancer</label><select id="ed-count">${opts.map(n=>`<option value="${n}" ${c.drawCount===n?'selected':''}>${n} choix</option>`).join('')}</select></div><div class="count-control"><label for="ed-mode">Animation des tirages</label><select id="ed-mode"><option value="once" ${c.spinMode!=='each'?'selected':''}>1 tour pour tous les choix</option><option value="each" ${c.spinMode==='each'?'selected':''}>1 tour par choix</option></select></div><label class="dedup-control"><input id="ed-unique" type="checkbox" ${c.noDuplicates?'checked':''}> Sans doublon dans cette catégorie</label></div><div><label for="ed-items">Choix possibles (un par ligne)</label><textarea id="ed-items" rows="7" placeholder="Un choix par ligne">${escapeHTML(c.items.join('\n'))}</textarea><p class="edit-info">Jusqu’à 250 choix par catégorie. Les modifications sont enregistrées sur cet appareil.</p></div><div class="editor-btns"><button id="ed-save" class="g-save" type="button">💾 Enregistrer mes modifications</button><button id="ed-delete" class="g-delete" type="button">🗑 Supprimer la catégorie</button></div>`;
  $('ed-save').addEventListener('click',()=>{
   if(spinning)return;
   const name=$('ed-name').value.trim().slice(0,60);if(!name){toast('Indique un nom de catégorie.');return;}
   const items=$('ed-items').value.split(/\r?\n/).map(x=>x.trim().slice(0,120)).filter(Boolean);
   if(items.length>250){toast('Maximum 250 choix par catégorie.');return;}
   c.name=name;c.icon=$('ed-icon').value.trim().slice(0,12)||'🎲';c.color=safeColor($('ed-color').value);c.drawCount=safeCount($('ed-count').value);c.spinMode=$('ed-mode').value==='each'?'each':'once';c.noDuplicates=$('ed-unique').checked;c.items=items;
   save();renderList();renderWheel();toast('Catégorie enregistrée !');
  });
  $('ed-delete').addEventListener('click',()=>{
   if(spinning)return;
   if(!confirm(`Supprimer « ${c.name} » et ses choix ?`))return;
   categories=categories.filter(x=>x.id!==c.id);selected=categories[0]?.id??null;wheelActiveId=selected;save();renderAll();toast('Catégorie supprimée.');
  });
 }
 function renderHistory(){
  $('clear-history').disabled=!history.length||spinning;
  $('history').innerHTML=history.length?history.slice(0,5).map((entry,i)=>`<details class="history-round"><summary>Lancer ${history.length-i} · ${entry.results.length} catégorie${entry.results.length>1?'s':''}</summary><p>${entry.results.map(r=>`<strong>${escapeHTML(r.name)} :</strong> ${r.items.map(escapeHTML).join(' · ')}`).join('<br>')}</p></details>`).join(''):'Aucun lancer pour le moment.';
 }
 function renderAll(){renderList();renderWheel();renderEditor();renderHistory()}
 $('category-list').addEventListener('change',e=>{
  if(spinning)return;
  const el=e.target;
  if(el.matches('[data-check]')){
   const c=categories.find(c=>c.id===el.dataset.check);if(!c)return;
   c.active=el.checked;save();renderList();renderWheel();return;
  }
  if(el.matches('[data-count],[data-mode]')){
   const catId=el.dataset.count||el.dataset.mode;
   const c=categories.find(c=>c.id===catId);if(!c)return;
   if(el.matches('[data-count]'))c.drawCount=safeCount(el.value);
   else c.spinMode=el.value==='each'?'each':'once';
   save();renderList();if(selected===catId)renderEditor();
  }
 });
 $('category-list').addEventListener('click',e=>{
  if(spinning)return;
  const preview=e.target.closest('[data-preview]');
  if(preview){wheelActiveId=preview.dataset.preview;renderWheel();renderList();return;}
  const edit=e.target.closest('[data-edit]');if(!edit)return;
  selected=edit.dataset.edit;wheelActiveId=edit.dataset.edit;renderEditor();renderList();renderWheel();$('editor-section').scrollIntoView({behavior:'smooth',block:'start'});
 });
 $('toggle-all').addEventListener('click',()=>{
  if(spinning)return;const enable=!categories.every(c=>c.active);
  categories.forEach(c=>c.active=enable);save();renderList();renderWheel();
 });
 $('add-category').addEventListener('click',()=>{
  if(spinning)return;if(categories.length>=40){toast('Maximum 40 catégories.');return;}
  const c={id:id(),name:'Nouvelle catégorie',icon:'🎲',color:COLORS[categories.length%COLORS.length],active:true,items:['Premier choix','Deuxième choix','Troisième choix'],drawCount:1,spinMode:'once',noDuplicates:true};
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
 // Une animation indépendante par roue ; le pointeur sélectionne le vrai résultat.
 async function animatePick(category,choice,reduced){
  const node=wheelNodes.get(category.id);
  if(!node||!category.items.length)return;
  node.style.transition='none';
  node.style.transform='rotate(0deg)';
  void node.offsetWidth;
  const index=Math.max(0,category.items.indexOf(choice));
  const desired=((360-index*360/category.items.length)%360+360)%360;
  if(reduced){node.style.transform=`rotate(${desired}deg)`;return;}
  const finishAngle=360*4+desired,duration=1800;
  await new Promise(resolve=>{
   let done=false,timer;
   const finish=()=>{if(done)return;done=true;clearTimeout(timer);node.removeEventListener('transitionend',onEnd);node.style.transition='none';node.style.transform=`rotate(${desired}deg)`;resolve();};
   const onEnd=e=>{if(e.target===node&&e.propertyName==='transform')finish();};
   node.addEventListener('transitionend',onEnd);
   node.style.transition=`transform ${duration}ms cubic-bezier(.12,.73,.12,1)`;
   requestAnimationFrame(()=>requestAnimationFrame(()=>{node.style.transform=`rotate(${finishAngle}deg)`;}));
   timer=setTimeout(finish,duration+350);
  });
 }
 $('spin-btn').addEventListener('click',async()=>{
  const used=active();if(spinning||!used.length)return;
  spinning=true;
  const results=used.map(c=>({id:c.id,name:c.name,icon:c.icon,color:c.color,items:pick(c)}));
  const shown=new Map(used.map(c=>[c.id,[]]));
  const roundsByCategory=new Map();
  for(const c of used){
   const drawn=results.find(r=>r.id===c.id)?.items||[];
   const rounds=c.spinMode==='each'
    ? drawn.map(choice=>({choice,reveal:[choice]}))
    : drawn.length?[{choice:drawn[0],reveal:drawn}]:[];
   roundsByCategory.set(c.id,rounds);
  }
  const totalRounds=Math.max(0,...[...roundsByCategory.values()].map(a=>a.length));
  $('results').className='result-placeholder';
  $('results').textContent='Toutes les roues tournent… ✨';
  $('result-status').textContent='Tirage en cours';
  renderList();renderHistory();$('spin-btn').disabled=true;
  $('spin-btn').textContent='↻  LES ROUES TOURNENT…';
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try{
   for(let round=0;round<totalRounds;round++){
    $('result-status').textContent=`Tour ${round+1} / ${totalRounds} · roues simultanées`;
    const steps=used.map(c=>({cat:c,step:roundsByCategory.get(c.id)[round]})).filter(x=>x.step);
    await Promise.all(steps.map(x=>animatePick(x.cat,x.step.choice,reduced)));
    for(const {cat,step} of steps)shown.get(cat.id).push(...step.reveal);
    renderResults(results.filter(r=>shown.get(r.id).length).map(r=>({...r,items:shown.get(r.id)})));
   }
  }finally{
   spinning=false;
   history.unshift({at:Date.now(),results:results.map(({id,...rest})=>rest)});
   history=history.slice(0,10);
   saveHistory();
   window.SpinGames?.recordSpin(game.slug);
   renderResults(results);
   $('result-status').textContent=`${results.length} catégorie${results.length>1?'s':''} · ${totalRounds} tour${totalRounds>1?'s':''}`;
   renderList();renderHistory();$('spin-btn').textContent='↻   FAIRE TOURNER LES ROUES';
  }
 });
 $('clear-history').addEventListener('click',()=>{if(spinning)return;history=[];saveHistory();renderHistory();toast('Historique effacé.');});
 $('export-btn').addEventListener('click',()=>{
  const clean=categories.map(({name,icon,color,active,items,drawCount,spinMode,noDuplicates})=>({name,icon,color,active,items,drawCount,spinMode,noDuplicates}));
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
   categories=imported;selected=categories[0]?.id??null;wheelActiveId=selected;save();renderAll();toast(`${imported.length} catégories importées !`);
  }catch(err){toast(err.message||'Impossible de lire ce fichier JSON.')}finally{e.target.value=''}
 });
 // Sur téléphone, la liste développe les intitulés complets pour les choix longs.
 const wheelDetails=document.querySelector('.wheel-choices');
 if(wheelDetails&&window.matchMedia('(max-width:650px)').matches)wheelDetails.open=true;
 let lastCompact=window.matchMedia('(max-width:650px)').matches;
 window.addEventListener('resize',()=>{const compact=window.matchMedia('(max-width:650px)').matches;if(compact!==lastCompact){lastCompact=compact;if(!spinning)renderWheel();}},{passive:true});
 // Changer de compte ne doit jamais afficher les modifications d'un autre joueur.
 function reloadPersonalData(){
  if(spinning)return;
  categories=loadCategories();
  try{const h=JSON.parse(storageGet(HISTORY_KEY)||'[]');history=Array.isArray(h)?h.filter(x=>x&&Array.isArray(x.results)).slice(0,10):[]}
  catch(_){history=[]}
  selected=categories[0]?.id??null;wheelActiveId=selected;rotation=0;
  renderAll();
 }
 document.addEventListener('spingames:auth',reloadPersonalData);
 document.addEventListener('spingames:progress-ready',event=>{
  if(event.detail?.slug===game.slug)reloadPersonalData();
 });
 renderAll();
})();
