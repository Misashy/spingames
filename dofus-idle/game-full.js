/* DOFUS IDLE COMPLET — gameplay autonome alimenté par la base DOFUS 3 */
(() => {
"use strict";
const $=s=>document.querySelector(s);
// Supprime les marqueurs de traduction absents visibles comme « null » dans l'UI.
const displayText=value=>String(value??"").replace(/\b(?:null|undefined)\b/gi,"").replace(/\s{2,}/g," ").trim();
const E=(tag,attrs,...children)=>{
 const el=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs||{})){
  if(value===null||value===undefined)continue;
  if(key==="className")el.className=value;
  else if(key==="text")el.textContent=displayText(value);
  else if(key==="style"&&typeof value==="object")Object.assign(el.style,value);
  else if(key.startsWith("data-"))el.setAttribute(key,String(value));
  else if(key==="disabled")el.disabled=Boolean(value);
  else el[key]=value;
 }
 for(const child of children.flat(Infinity))if(child!==null&&child!==undefined&&child!==false)
  el.append(child instanceof Node?child:document.createTextNode(displayText(child)));
 return el;
};
const B=(text,onclick,cls="fd-button",disabled=false)=>E("button",{type:"button",className:cls,onclick,disabled},text);
const money=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Math.floor(Number(n)||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const KEY="dofus-idle-full-v2",OLD_KEY="dofus-idle-independent-v1";
let core=null,world=null,state=null,dropIndex={},lastTick=Date.now(),lastSave=0,lastRender=0;
let gearPool=[],gearEligibleCache=new Map(),combatOpenZone="";
const EQUIP_LABELS={weapon:"Arme",head:"Coiffe",cape:"Cape",ring:"Anneau",boots:"Bottes",belt:"Ceinture",neck:"Amulette",shield:"Bouclier"};
let q="",page=0,zoneQuery="",selectedArea="",monsterQuery="",monsterPage=0,recipeFilter="all",busy=false,images={items:{},monsters:{},jobs:{}};
const ICONS={"2":"🪓","24":"⛏️","26":"🌿","28":"🌾","36":"🎣","41":"🏹","27":"🧵","15":"👢","16":"💍","11":"⚒️","13":"🏹","60":"🛡️","65":"🗝️","79":"🐴","78":"📖"};
const GATHER_VERBS={"2":"Couper","24":"Extraire","26":"Cueillir","28":"Faucher","36":"Pêcher"};
const MAGE_NAMES=["mage","bestiologue","éleveur"];
const LEVEL_MAX=200;
const now=()=>Date.now();
function xpNeed(l){return Math.round(42+17*Math.pow(l,1.62))}
function levelOf(total){
 let left=Math.max(0,Number(total)||0),lv=1;
 while(lv<LEVEL_MAX){const need=xpNeed(lv);if(left<need)break;left-=need;lv++}
 return {level:lv,xp:left,next:lv===LEVEL_MAX?1:xpNeed(lv),ratio:lv===LEVEL_MAX?100:100*left/xpNeed(lv)};
}
function jobLevel(id){return levelOf(state.jobs[id]||0).level}
function playerLevel(){return levelOf(state.playerXp).level}
function maxHp(){return Math.ceil((105+playerLevel()*8+(state.upgrades.armor||0)*12)* (state.classId==="sacrieur"?1.35:1)+equippedBonus("hp"))}
function equippedBonus(type){
 let n=0;for(const id of Object.values(state.equipment)){if(!id)continue;
  const item=core.items[id];if(!item)continue;
  const slot=gearSlot(id);
  if(type==="atk"&&slot==="weapon")n+=Math.ceil(item[2]*.36);
  if(type==="hp"&&slot!=="weapon")n+=Math.ceil(item[2]*.6);
  if(type==="def"&&slot!=="weapon")n+=Math.ceil(item[2]*.11);
 }return n;
}
function damage(){return Math.ceil((9+playerLevel()*2.2+(state.upgrades.weapon||0)*6+equippedBonus("atk"))*(state.classId==="iop"?1.2:1))}
function defense(){return Math.floor(playerLevel()*.4+equippedBonus("def")+(state.upgrades.armor||0)*3)}
function bankCap(){return 150+(state.upgrades.bank||0)*100}
function slots(){return Object.keys(state.bank).filter(i=>state.bank[i]>0).length}
function has(id,n=1){return Number(state.bank[id]||0)>=n}
function add(id,n=1){id=String(id);if(!core.items[id])return false;if(!has(id)&&slots()>=bankCap())return false;state.bank[id]=(state.bank[id]||0)+n;return true}
function consume(id,n=1){id=String(id);if(!has(id,n))return false;state.bank[id]-=n;if(state.bank[id]<=0)delete state.bank[id];return true}
function itemName(id){return core.items[String(id)]?.[0]||"Objet "+id}
function itemLevel(id){return core.items[String(id)]?.[2]||1}
function itemValue(id){return Math.max(1,Math.round(Math.sqrt(Math.max(1,core.items[id]?.[4]||1))))}
function jobName(id){return core.jobs[String(id)]?.[0]||"Métier"}
function jobIcon(id){return ICONS[String(id)]||"✨"}
function typeName(id){return core.types[String(core.items[String(id)]?.[3]||0)]?.[0]||"Objet"}
function gearSlot(id){
 const n=typeName(id).toLowerCase();
 if(/coiffe|chapeau|casque|capuche/.test(n))return "head";
 if(/cape|sac à dos|costume/.test(n))return "cape";
 if(/anneau/.test(n))return "ring";
 if(/botte/.test(n))return "boots";
 if(/ceinture/.test(n))return "belt";
 if(/amulette/.test(n))return "neck";
 if(/bouclier/.test(n))return "shield";
 if(/épée|dague|arc|baguette|bâton|hache|marteau|pelle|faux|arme/.test(n))return "weapon";
 return "";
}
function sprite(kind,id,emoji="✦",css="fd-icon"){
 const holder=E("span",{className:css});
 const path=images[kind]?.[String(id)];
 if(!path){holder.textContent=emoji;return holder}
 if(Array.isArray(path)){
  const atlas=path[0],slot=Number(path[1]);
  if(typeof atlas==="string"&&Number.isInteger(slot)&&slot>=0&&slot<100){
   holder.style.backgroundImage='url("'+atlas+'")';
   holder.style.backgroundSize="1000% 1000%";
   holder.style.backgroundPosition=(slot%10)*100/9+"% "+Math.floor(slot/10)*100/9+"%";
   holder.style.backgroundRepeat="no-repeat";
   return holder;
  }
 }
 const img=E("img",{src:path,alt:"",loading:"lazy",decoding:"async"});
 img.onerror=()=>{img.remove();holder.textContent=emoji};
 holder.append(img);return holder;
}
function itemSprite(id,cls="fd-icon"){return sprite("items",id,"✦",cls)}
function mobSprite(id,cls="fd-mob-icon"){return sprite("monsters",id,"👹",cls)}
function jobSprite(id,cls="fd-icon"){return sprite("jobs",id,jobIcon(id),cls)}
function fresh(){
 return {version:2,view:"job:2",jobs:{},mastery:{},bank:{},kamas:150,earned:150,
  playerXp:0,classId:"iop",kills:0,gathered:0,crafted:0,hp:115,
  equipment:{weapon:null,head:null,cape:null,ring:null,boots:null,belt:null,neck:null,shield:null},
  upgrades:{bank:0,tool:0,weapon:0,armor:0,fortune:0},
  action:null,selectedMonster:"979",selectedZone:"444",selectedRegion:"",combatMode:"zones",gearDrops:{},unlocked:{},dex:{},log:[],
  lastAt:now(),totalSeconds:0,migrated:false};
}
function load(){
 let raw=null;
 try{raw=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 if(raw?.version===2&&raw.jobs&&raw.bank){
  return Object.assign(fresh(),raw,{jobs:raw.jobs||{},bank:raw.bank||{},equipment:{...fresh().equipment,...raw.equipment},upgrades:{...fresh().upgrades,...raw.upgrades},gearDrops:raw.gearDrops||{}});
 }
 let s=fresh();
 try{
  const old=JSON.parse(localStorage.getItem(OLD_KEY));
  if(old?.version===1){
   for(const [oldName,id] of Object.entries(core.legacyJobs||{}))
    if(old.skills?.[oldName])s.jobs[String(id)]=Math.max(0,Number(old.skills[oldName].xp)||0);
   for(const [oldKey,amount] of Object.entries(old.bank||{})){
    const id=core.legacyItems?.[oldKey];if(id&&core.items[String(id)]&&Number(amount)>0)s.bank[String(id)]=(s.bank[String(id)]||0)+Number(amount);
   }
   s.kamas=Math.max(0,Number(old.kamas)||0);s.playerXp=Math.max(0,Number(old.playerXp)||0);
   s.kills=Math.max(0,Number(old.kills)||0);s.earned=Math.max(s.kamas,Number(old.earned)||0);
   s.gathered=Math.max(0,Number(old.gathered)||0);s.crafted=Math.max(0,Number(old.crafted)||0);
   s.classId=old.classId||"iop";s.upgrades={...s.upgrades,...old.upgrades};
   for(const [slot,legacyId] of Object.entries(old.equipment||{})){
    const iid=core.legacyItems?.[legacyId];if(iid&&core.items[String(iid)]&&s.equipment.hasOwnProperty(slot))s.equipment[slot]=String(iid);
   }
   s.migrated=true;
  }
 }catch(e){}
 return s;
}
function save(){if(!state)return;state.lastAt=now();try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){toast("Sauvegarde impossible. Vérifie le stockage du navigateur.")}}
function toast(msg){const region=$("#toastRegion");if(!region)return;const child=E("div",{className:"toast"},msg);region.prepend(child);setTimeout(()=>child.remove(),3800)}
function formatRate(r){return String(Number(r.toFixed(2))).replace(".",",")+" %"}
function actionCost(a){
 if(a.type==="gather"){const skill=core.gather[String(a.job)]?.find(x=>x[0]===a.id);return clamp(2.3+(skill?.[1]||1)*.026,2.3,9)*(1-(state.upgrades.tool||0)*.055)}
 if(a.type==="craft")return clamp(2.8+itemLevel(a.id)*.025,3,9);
 if(a.type==="train")return 4;
 return 1.65;
}
function expGain(level){return Math.ceil(18+level*1.3)}
function startGather(job,id){
 const skill=core.gather[String(job)]?.find(x=>x[0]===id);if(!skill)return;
 if(jobLevel(job)<skill[1]){toast("Niveau "+skill[1]+" de "+jobName(job)+" requis.");return}
 if(state.action?.type==="gather"&&state.action.id===id){state.action=null;render();save();return}
 state.action={type:"gather",job:String(job),id,progress:0};
 toast(GATHER_VERBS[job]+" : "+itemName(id));render();save();
}
function recipeFor(job,id){
 return (core.recipes[String(job)]||[]).find(r=>r[0]===id);
}
function canCraft(recipe){return recipe[2].every(([id,n])=>has(id,n))}
function startCraft(job,id){
 const r=recipeFor(job,id);if(!r)return;
 if(jobLevel(job)<r[1]){toast("Métier niveau "+r[1]+" requis.");return}
 if(state.action?.type==="craft"&&state.action.id===id){state.action=null;render();save();return}
 if(!canCraft(r)){toast("Ingrédients manquants. Consulte leurs sources.");return}
 state.action={type:"craft",job:String(job),id,progress:0};render();save();
}
function startTraining(job){
 if(state.action?.type==="train"&&state.action.job===String(job)){state.action=null;render();save();return}
 state.action={type:"train",job:String(job),id:0,progress:0};
 toast("Formation "+jobName(job)+" : entraînement idle simplifié.");render();save();
}
// Les équipements « surprise » sont un bonus du prototype idle, distinct
// des butins officiels du monstre et de leurs pourcentages extraits de DOFUS.
function possibleEquipment(level){
 const lvl=Math.max(1,Math.floor(Number(level)||1));
 if(gearEligibleCache.has(lvl))return gearEligibleCache.get(lvl);
 const ceiling=Math.min(200,lvl+8),floor=Math.max(1,Math.floor(lvl*.55));
 let pool=gearPool.filter(id=>itemLevel(id)>=floor&&itemLevel(id)<=ceiling);
 if(!pool.length)pool=gearPool.filter(id=>itemLevel(id)<=ceiling);
 gearEligibleCache.set(lvl,pool);
 return pool;
}
function equipmentChance(m){
 const zone=world.zones[String(state.selectedZone)];
 return zone&&zone[3].some(id=>String(id)===String(state.selectedMonster))&&Number(zone[5])>=0?5:3;
}
function rollEquipment(m,dropped){
 const pool=possibleEquipment(m[1]),rate=equipmentChance(m);
 if(!pool.length||Math.random()*100>=rate)return null;
 const chosen=pool[Math.floor(Math.random()*pool.length)];
 if(!add(chosen,1))return null;
 dropped.push(chosen);
 state.gearDrops[chosen]=(state.gearDrops[chosen]||0)+1;
 return chosen;
}
function startCombat(id){
 const m=world.monsters[String(id)];if(!m)return;
 if(playerLevel()+8<m[1]){toast("Niveau de combat conseillé : "+m[1]+".");return}
 if(state.action?.type==="combat"&&state.action.id===Number(id)){state.action=null;render();save();return}
 state.selectedMonster=String(id);state.action={type:"combat",id:Number(id),progress:0,enemyHp:m[2],enemyTick:0};
 if(state.hp<=0)state.hp=maxHp();
 toast("Combat contre "+m[0]);render();save();
}
function buyUpgrade(type){
 const l=state.upgrades[type]||0;
 const price=Math.round((type==="bank"?130:170)*Math.pow(type==="bank"?1.8:2.1,l));
 if(l>=15||state.kamas<price){toast("Pas assez de kamas.");return}
 state.kamas-=price;state.upgrades[type]=l+1;toast("Amélioration achetée.");render();save();
}
function trainingTick(job){
 const cost=Math.ceil(2+jobLevel(job)*.5);
 if(state.kamas<cost){state.action=null;toast("Plus assez de kamas pour l'entraînement.");return}
 state.kamas-=cost;state.jobs[job]=(state.jobs[job]||0)+expGain(jobLevel(job));
}
function tick(dt){
 if(!state.action||dt<=0)return false;
 const a=state.action; a.progress+=dt;
 if(a.type==="gather"){
  const seconds=actionCost(a);const n=Math.min(10000,Math.floor(a.progress/seconds));
  if(!n)return false;
  a.progress-=n*seconds;
  if(!add(a.id,n)){state.action=null;toast("Banque pleine.");return true}
  state.gathered+=n;state.jobs[a.job]=(state.jobs[a.job]||0)+n*expGain(itemLevel(a.id));
  state.mastery[a.id]=(state.mastery[a.id]||0)+n;return true;
 }
 if(a.type==="craft"){
  const seconds=actionCost(a);const n=Math.min(3000,Math.floor(a.progress/seconds));
  if(!n)return false;
  a.progress-=n*seconds;
  const r=recipeFor(a.job,a.id);if(!r){state.action=null;return true}
  let crafted=0;
  for(let i=0;i<n;i++){
   if(!canCraft(r)){state.action=null;break}
   if(!has(a.id)&&slots()>=bankCap()){state.action=null;toast("Banque pleine.");break}
   for(const [id,qty] of r[2])consume(id,qty);
   add(a.id,1);crafted++;state.crafted++;
  }
  if(crafted){state.jobs[a.job]=(state.jobs[a.job]||0)+crafted*expGain(r[1])*2}
  if(!state.action)toast("Fabrication terminée (ressources épuisées).");
  return true;
 }
 if(a.type==="train"){
  const n=Math.min(1000,Math.floor(a.progress/4));
  if(!n)return false;a.progress-=n*4;
  for(let i=0;i<n&&state.action;i++)trainingTick(a.job);
  return true;
 }
 if(a.type==="combat"){
  const m=world.monsters[String(a.id)];if(!m){state.action=null;return true}
  const second=1.65-(state.upgrades.weapon||0)*.025;
  a.enemyTick=(a.enemyTick||0)+dt;
  let changed=false;
  let attacks=Math.min(10,Math.floor(a.progress/second));a.progress-=attacks*second;
  while(attacks-- && state.action){
   const hit=damage()*(Math.random()<(state.classId==="cra"?.16:.05)?1.7:1);
   a.enemyHp-=hit;changed=true;
   if(a.enemyHp<=0)victory(m,a);
  }
  while(a.enemyTick>=2.8&&state.action){
   a.enemyTick-=2.8;
   const enemyDmg=Math.max(1,Math.round(m[1]*.65+4)-defense());
   state.hp=Math.max(0,state.hp-enemyDmg);changed=true;
   if(state.hp<=0){state.action=null;state.hp=maxHp();state.log.unshift("Défaite face à "+m[0]+".");toast("Défaite : tente un monstre moins puissant.")}
  }
  return changed;
 }
 return false;
}
function victory(m,a){
 state.kills++;state.dex[String(a.id)]=(state.dex[String(a.id)]||0)+1;
 // Les niveaux et PV des monstres sont ceux de la base; XP et kamas sont adaptés.
 state.playerXp+=Math.max(15,Math.round(17+m[1]*3.2));
 const kamas=Math.round((5+m[1]*1.75)*(1+(state.upgrades.fortune||0)*.1));state.kamas+=kamas;state.earned+=kamas;
 let dropped=[];
 for(const [id,rate] of m[4]){
  if(Math.random()*100<rate){if(add(id,1))dropped.push(id)}
 }
 const bonus=rollEquipment(m,dropped);
 if(bonus){toast("🎁 Équipement obtenu : "+itemName(bonus)+" ! Va dans la Banque pour l'équiper.");}
 if(dropped.length)state.log.unshift(m[0]+" : "+dropped.map(i=>itemName(i)).slice(0,5).join(", ")+(dropped.length>5?"…":""));
 else state.log.unshift(m[0]+" vaincu : +"+kamas+" kamas");
 state.log=state.log.slice(0,15);
 state.jobs["41"]=(state.jobs["41"]||0)+expGain(m[1]); // Chasseur
 state.jobs["78"]=(state.jobs["78"]||0)+Math.ceil(expGain(m[1])*.35); // Bestiologue
 state.hp=Math.min(maxHp(),state.hp+Math.ceil(maxHp()*.15*(state.classId==="eniripsa"?1.6:1)));
 a.enemyHp=m[2];a.enemyTick=0;
}
function offline(){
 const elapsed=clamp((now()-(state.lastAt||now()))/1000,0,8*3600);
 if(state.action?.type==="combat"){state.action=null;return}
 if(elapsed>5&&state.action){
  const before=state.gathered+state.crafted;
  let seconds=elapsed;
  while(seconds>0&&state.action){
   const piece=Math.min(seconds,1800);tick(piece);seconds-=piece;
  }
  const gain=state.gathered+state.crafted-before;
  if(gain>0)toast("Progression hors ligne : "+money(gain)+" actions en ton absence.");
 }
}
function meter(percent,extra=""){
 return E("div",{className:"fd-meter "+extra},E("span",{style:{width:clamp(percent,0,100)+"%"}}));
}
function panelHeading(title,desc,right){
 return E("div",{className:"fd-heading"},E("div",{},E("h2",{},title),E("p",{},desc)),right||"");
}
function pill(text,cls=""){return E("span",{className:"fd-pill "+cls},text)}
function itemTag(id,qty=1,source=false){
 const item=E("span",{className:"fd-ingredient "+(has(id,qty)?"owned":"missing")},
  itemSprite(id,"fd-tiny"),E("span",{},itemName(id)+" "+money(state.bank[id]||0)+"/"+qty));
 if(source)item.append(B("Sources",()=>showSources(id),"fd-mini"));
 return item;
}
function showSources(id){
 const list=(dropIndex[id]||[]).slice().sort((a,b)=>b[1]-a[1]);
 const box=E("div",{className:"fd-modal"});
 box.append(E("h2",{},"Comment obtenir : "+itemName(id)));
 const gatherers=Object.entries(core.gather).flatMap(([job,skills])=>skills.filter(row=>String(row[0])===String(id)).map(row=>[job,row[1]]));
 for(const [job,req] of gatherers)box.append(B("🌿 Récolte : "+jobName(job)+" niveau "+req,()=>{closeModal();runNav("job:"+job)},"fd-source"));
 const makers=Object.entries(core.recipes).flatMap(([job,recipes])=>recipes.filter(r=>String(r[0])===String(id)).map(r=>[job,r[1]]));
 for(const [job,req] of makers.slice(0,6))box.append(B("🔨 Fabrication : "+jobName(job)+" niveau "+req,()=>{closeModal();runNav("craft:"+job)},"fd-source"));
 if(!list.length&&!gatherers.length&&!makers.length)box.append(E("p",{},"Aucune source directe sans conditions détectée. Il peut s'agir d'un objet de quête ou d'événement."));
 else{
  box.append(E("p",{},"Probabilités de base DOFUS 3 (grade 1), sans prospection ni bonus de combat."));
  const grid=E("div",{className:"fd-source-list"});
  for(const [mid,rate] of list.slice(0,45)){
   const monster=world.monsters[String(mid)],loc=monster[5][0],place=world.zones[String(loc)];
   grid.append(B(monster[0]+" · "+formatRate(rate)+" · "+(place?.[0]||"Localisation spéciale"),()=>{
    closeModal();focusMonster(mid,loc);
   },"fd-source"));
  }
  box.append(grid);
 }
 box.append(B("Fermer",closeModal,"fd-secondary"));
 $("#modalRoot").replaceChildren(E("div",{className:"fd-overlay",onclick:e=>{if(e.target.classList.contains("fd-overlay"))closeModal()}},box));
}
function closeModal(){$("#modalRoot").replaceChildren()}
function currentActionBox(){
 const a=state.action;if(!a)return E("div",{className:"fd-action-box idle"},E("span",{},"⏳"),E("div",{},E("strong",{},"Aucune activité en cours"),E("small",{},"Choisis une récolte, une recette ou un monstre.")));
 const label=a.type==="gather"?"Récolte : "+itemName(a.id):a.type==="craft"?"Fabrication : "+itemName(a.id):a.type==="train"?"Formation : "+jobName(a.job):"Combat : "+world.monsters[String(a.id)]?.[0];
 const p=100*(a.progress||0)/actionCost(a);
 return E("div",{className:"fd-action-box"},E("div",{className:"fd-action-main"},
 E("strong",{},"⚡ "+label),E("small",{},"Progression automatique · "+Math.ceil(actionCost(a)*10)/10+" secondes par action"),
 B("■ Arrêter",()=>{state.action=null;render();save()},"fd-danger")),
 meter(p,"fd-active-meter"));
}
function runNav(view){
 const wasMode=state.combatMode==="dungeons"?"dungeons":"zones";
 if(view==="dungeons"||view==="combat"){
  const mode=view==="dungeons"?"dungeons":"zones";
  state.combatMode=mode;
  if(wasMode!==mode){state.selectedRegion="";combatOpenZone="";zoneQuery="";monsterQuery="";}
 }
 state.view=view==="dungeons"?"combat":view;
 q="";page=0;recipeFilter="all";monsterPage=0;
 $("#sidebar").classList.remove("open");render();save();
}
function sidebar(){
 // On affiche le combat en premier, au-dessus de la banque et des métiers.
 const groups=[
  ["COMBAT",[["combat","⚔️","Zones et monstres"],["dungeons","🏰","Donjons"],["bestiary","📘","Bestiaire"]]],
  ["PERSONNAGE",[["bank","🎒","Banque"],["shop","🪙","Magasin"],["character","🧙","Personnage"]]],
  ["MÉTIERS DE RÉCOLTE",Object.keys(core.gather).sort((a,b)=>Number(a)-Number(b)).flatMap(id=>
   [["job:"+id,jobIcon(id),jobName(id)],
    ...(core.recipes[id]?.length?[["craft:"+id,"↳","Recettes "+jobName(id)]]:[])] )],
  ["MÉTIERS DE FABRICATION",Object.keys(core.jobs).filter(id=>!core.gather[id]&&(core.recipes[id]||[]).length>0).map(id=>["job:"+id,jobIcon(id),jobName(id)])],
  ["SPÉCIALISATIONS",Object.keys(core.jobs).filter(id=>!core.gather[id]&&!(core.recipes[id]||[]).length).map(id=>["job:"+id,jobIcon(id),jobName(id)])],
  ["CATALOGUE",[["recipes","🔧","Toutes les recettes"]]]
 ];
 const nav=E("div",{className:"fd-nav"});
 for(const [title,entries] of groups){
  const section=E("section",{},E("h3",{},title));
  for(const [view,emoji,label] of entries){
   const id=view.startsWith("job:")?view.split(":")[1]:null;
   const selected=(view==="dungeons"&&state.view==="combat"&&state.combatMode==="dungeons")||
    (view==="combat"&&state.view==="combat"&&state.combatMode!=="dungeons")||
    (view!=="combat"&&view!=="dungeons"&&state.view===view);
   const cls="fd-nav-entry "+(selected?"active ":"")+(view.startsWith("craft:")?"fd-nav-sub":"");
   const button=B("",()=>runNav(view),cls);
   button.append(id?jobSprite(id,"fd-menu-icon"):E("span",{className:"fd-menu-icon"},emoji));
   button.append(E("span",{className:"fd-nav-name"},label));
   // Ne jamais passer une valeur null à Element.append : cela imprime « null ».
   if(id)button.append(E("span",{className:"fd-nav-level"},jobLevel(id)+"/200"));
   section.append(button);
  }
  nav.append(section);
 }
 $("#menu").replaceChildren(nav);
}
function header(){
 const view=state.view,job=view.startsWith("job:")||view.startsWith("craft:")?view.split(":")[1]:null;
 const lev=job?levelOf(state.jobs[job]||0):levelOf(state.playerXp);
 const tit=job?jobName(job)+(view.startsWith("craft:")?" · Recettes":""):({bank:"Banque",shop:"Magasin",combat:"Combats",character:"Personnage",recipes:"Toutes les recettes",bestiary:"Bestiaire"}[view]||"DOFUS IDLE");
 const h=E("div",{className:"fd-headline"},job?jobSprite(job,"fd-head-icon"):E("span",{className:"fd-head-icon"},"✦"),
  E("div",{},E("h1",{},tit),E("small",{},"DOFUS IDLE · Monde des Douze")));
 const stats=E("div",{className:"fd-headstats"},
  pill("Niv. "+lev.level+" / 200","green"),pill("XP "+money(lev.xp)+" / "+money(lev.next)),
  pill("🪙 "+money(state.kamas),"gold"),pill("🎒 "+slots()+"/"+bankCap()),
  B("💾 Sauver",()=>{save();toast("Sauvegarde enregistrée.")},"fd-secondary"));
 $("#topbar").replaceChildren(E("div",{className:"fd-topline"},h,stats),meter(lev.ratio,"fd-head-meter"));
 $("#mobileMoney").textContent=money(state.kamas)+" 🪙";
 $("#buildVersion").textContent="v2.0";
}
function searchField(placeholder,value,onvalue){
 return E("input",{type:"search",placeholder,value,className:"fd-search",oninput:e=>{
  const sel=e.target.selectionStart;
  onvalue(e.target.value);renderView();
  const next=$(".fd-search");if(next){next.focus();try{next.setSelectionRange(sel,sel)}catch(x){}}
 }});
}
function pagination(total,per,onChange){
 if(total<=per)return null;
 const pages=Math.ceil(total/per);
 return E("div",{className:"fd-pagination"},B("← Précédent",()=>onChange(-1),"fd-secondary",page<=0),
  pill("Page "+(page+1)+"/"+pages),B("Suivant →",()=>onChange(1),"fd-secondary",page>=pages-1));
}
function gatherView(job){
 const skills=core.gather[job]||[],lv=jobLevel(job);
 const filtered=skills.filter(([id])=>itemName(id).toLowerCase().includes(q.toLowerCase()));
 const cards=E("div",{className:"fd-cards"});
 const visible=filtered.slice(page*40,(page+1)*40);
 for(const [id,req] of visible){
  const locked=lv<req,active=state.action?.type==="gather"&&state.action.id===id;
  cards.append(E("button",{type:"button",disabled:locked,
   className:"fd-resource-card "+(locked?"locked ":"")+(active?"active":""),
   onclick:()=>startGather(job,id)},
   E("span",{className:"fd-card-top"},pill("Niveau "+req),active?pill("EN COURS","green"):null),
   itemSprite(id,"fd-big-art"),E("h3",{},itemName(id)),E("small",{},GATHER_VERBS[job]+" · +"+expGain(req)+" XP · "+actionCost({type:"gather",job,id}).toFixed(1)+" s"),
   E("strong",{className:"fd-card-bottom"},locked?"🔒 Débloqué au niveau "+req:"En banque : "+money(state.bank[id]||0))));
 }
 return E("div",{},currentActionBox(),
  panelHeading(jobName(job)+" · Toutes les ressources","Récolte répétée automatiquement. Paliers de déblocage issus de DOFUS 3.",pill(skills.length+" ressources")),
  (core.recipes[job]||[]).length?B("🔨 Voir les "+(core.recipes[job]||[]).length+" recettes de "+jobName(job),()=>runNav("craft:"+job),"fd-secondary"):null,
  searchField("Rechercher une ressource...",q,v=>{q=v;page=0}),
  cards,pagination(filtered.length,40,d=>{page+=d;renderView()}));
}
function craftingCard(job,r){
 const [id,req,parts]=r,allowed=jobLevel(job)>=req,can=canCraft(r),active=state.action?.type==="craft"&&state.action.id===id;
 const card=E("article",{className:"fd-recipe-card "+(active?"active":"")},
  E("div",{className:"fd-recipe-title"},itemSprite(id,"fd-recipe-art"),
   E("div",{},E("h3",{},itemName(id)),E("small",{},typeName(id)+" · Niv. "+req))),
  E("div",{className:"fd-components"},...parts.map(([ingredient,n])=>itemTag(String(ingredient),n,true))),
  E("div",{className:"fd-recipe-actions"},
   pill(allowed?"Métier "+jobLevel(job):"Niveau "+req+" requis",allowed?"green":""),
   B(active?"■ Arrêter":!allowed?"Verrouillé":can?"Fabriquer en continu":"Ressources manquantes",
    ()=>startCraft(job,id),"fd-button",!allowed||(!can&&!active))));
 return card;
}
function craftingView(job,all=false){
 const jobs=all?Object.keys(core.recipes):[job];
 const available=jobs.flatMap(jid=>(core.recipes[jid]||[]).map(r=>[jid,r]));
 const search=q.toLowerCase();
 const filtered=available.filter(([jid,r])=>itemName(r[0]).toLowerCase().includes(search) &&
  (recipeFilter==="all"||recipeFilter==="unlocked"&&jobLevel(jid)>=r[1]||recipeFilter==="craftable"&&jobLevel(jid)>=r[1]&&canCraft(r)));
 filtered.sort((a,b)=>a[1][1]-b[1][1]);
 const pages=Math.ceil(filtered.length/28);page=clamp(page,0,Math.max(0,pages-1));
 const filter=E("select",{className:"fd-select",value:recipeFilter,onchange:e=>{recipeFilter=e.target.value;page=0;renderView()}},
  E("option",{value:"all"},"Toutes les recettes"),E("option",{value:"unlocked"},"Niveau atteint"),E("option",{value:"craftable"},"Fabricables maintenant"));
 const grid=E("div",{className:"fd-craft-grid"});
 for(const [jid,r] of filtered.slice(page*28,(page+1)*28)){
  const card=craftingCard(jid,r);
  if(all)card.prepend(pill(jobName(jid),"fd-job-label"));
  grid.append(card);
 }
 return E("div",{},currentActionBox(),
  panelHeading(all?"Recettes de tous les métiers":jobName(job)+" · Recettes officielles",
   "Composants et quantités DOFUS 3. Le temps de fabrication et l'XP sont adaptés au jeu.",
   pill(money(available.length)+" recettes")),
  E("div",{className:"fd-filters"},searchField("Chercher une coiffe, cape, bottes, potion...",q,v=>{q=v;page=0}),filter),
  grid,E("div",{className:"fd-pagination"},
   B("← Précédent",()=>{page=Math.max(0,page-1);renderView()},"fd-secondary",page<=0),
   pill("Page "+(page+1)+"/"+Math.max(1,pages)+" · "+money(filtered.length)+" résultats"),
   B("Suivant →",()=>{page=Math.min(pages-1,page+1);renderView()},"fd-secondary",page>=pages-1)));
}
function specialView(job){
 const name=jobName(job);
 const isHunter=job==="41",isStudy=job==="78";
 const desc=isHunter?"Le Chasseur gagne de l'expérience en vainquant des monstres. Consulte les recettes ci-dessous.":isStudy?
  "Le Bestiologue progresse en étudiant les monstres vaincus.":"Cette profession ne possède pas de recettes standards dans le fichier des recettes DOFUS. L'entraînement présenté est une mécanique idle simplifiée.";
 return E("div",{},currentActionBox(),panelHeading(name+" · Spécialisation",desc,pill("Niv. "+jobLevel(job))),
  E("div",{className:"fd-special"},
   jobSprite(job,"fd-big-art"),E("p",{},desc),
   B(state.action?.type==="train"&&state.action.job===job?"■ Arrêter l'entraînement":"Entraînement automatique (kamas → XP)",()=>startTraining(job),"fd-button"),
   E("small",{},"Les activités d'élevage, de forgemagie et de spécialisation ne reproduisent pas encore toutes les mécaniques d'Ankama.")));
}
function bankView(){
 const keys=Object.keys(state.bank).filter(id=>state.bank[id]>0&&core.items[id]&&itemName(id).toLowerCase().includes(q.toLowerCase()));
 keys.sort((a,b)=>itemName(a).localeCompare(itemName(b),"fr"));
 const cards=E("div",{className:"fd-bank-grid"});
 for(const id of keys.slice(page*45,(page+1)*45)){
  const qty=state.bank[id];
  cards.append(E("article",{className:"fd-bank-item"},itemSprite(id,"fd-bank-art"),
   E("strong",{},itemName(id)),E("small",{},typeName(id)+" · Niveau "+itemLevel(id)),
   pill("× "+money(qty)+" · 🪙 "+itemValue(id)+"/u"),
   E("div",{className:"fd-bank-actions"},
    B("Vendre 1",()=>sell(id,1),"fd-mini"),
    B("Tout vendre",()=>sell(id,qty),"fd-mini"),
    B("Sources",()=>showSources(id),"fd-mini"),
    gearSlot(id)?B(playerLevel()<itemLevel(id)?"Niv. "+itemLevel(id)+" requis":"Équiper",()=>equip(id),"fd-mini",playerLevel()<itemLevel(id)):null)));
 }
 return E("div",{},panelHeading("Banque","Tous tes objets de récolte, de craft et les ressources obtenues en combat.",
  pill(slots()+" / "+bankCap()+" emplacements")),
  searchField("Rechercher un objet ou une ressource...",q,v=>{q=v;page=0}),
  cards,E("div",{className:"fd-pagination"},
  B("← Précédent",()=>{page--;renderView()},"fd-secondary",page<=0),
  pill("Page "+(page+1)+" / "+Math.max(1,Math.ceil(keys.length/45))),
  B("Suivant →",()=>{page++;renderView()},"fd-secondary",(page+1)*45>=keys.length)));
}
function sell(id,qty){
 if(!has(id))return;const count=Math.min(qty,state.bank[id]);consume(id,count);
 const earn=count*itemValue(id);state.kamas+=earn;state.earned+=earn;
 toast("Vendu : "+money(count)+" × "+itemName(id)+" · +"+money(earn)+" kamas");render();save();
}
function equip(id){
 if(!has(id))return;const slot=gearSlot(id);if(!slot)return;
 if(playerLevel()<itemLevel(id)){toast("Niveau de combat "+itemLevel(id)+" requis pour équiper "+itemName(id)+".");return}
 if(slot in state.equipment){
  const old=state.equipment[slot];if(old&&!has(old)&&slots()>=bankCap()&&state.bank[id]>1){toast("Banque pleine.");return}
  consume(id);if(old)add(old);state.equipment[slot]=String(id);state.hp=Math.min(maxHp(),state.hp);
  toast(itemName(id)+" équipé.");render();save();
 }
}
function shopView(){
 const defs=[["bank","🏦","Extension de banque","+100 emplacements"],
  ["tool","🪓","Outils améliorés","Récolte plus rapide"],
  ["weapon","⚔️","Force supplémentaire","+6 dégâts"],
  ["armor","🛡️","Résistance","+3 défense"],
  ["fortune","🪙","Bonne fortune","+10 % kamas par amélioration"]];
 return E("div",{},panelHeading("Magasin d'Enutrof","Bonus permanents financés par les kamas.","🪙 "+money(state.kamas)),
 E("div",{className:"fd-craft-grid"},...defs.map(([id,icon,name,desc])=>{
  const lvl=state.upgrades[id]||0,price=Math.round((id==="bank"?130:170)*Math.pow(id==="bank"?1.8:2.1,lvl));
  return E("article",{className:"fd-recipe-card"},E("div",{className:"fd-shop-symbol"},icon),E("h3",{},name),E("p",{},desc),
   pill("Niv. "+lvl+" / 15"),
   B("Acheter · "+money(price)+" kamas",()=>buyUpgrade(id),"fd-button",lvl>=15||state.kamas<price));
 })));
}

/* Navigation : Continent/Région -> Sous-zones officielles -> Monstres -> Combat.
   Les noms de zones et compositions proviennent toujours du fichier SubAreaData.
   Les étiquettes des grandes régions servent seulement à rendre la carte lisible. */
const REGIONS_FAVORITES=["Incarnam","Amakna","Île des Wabbits","Île de Moon","Frigost","Astrub","Pandala","Otomaï","Saharach","Cania"];
const REGIONS_ICONS={"Incarnam":"☁️","Amakna":"🌳","Île des Wabbits":"🐰","Île de Moon":"🌴","Frigost":"❄️","Astrub":"🏘️","Pandala":"🎋","Otomaï":"🌺","Saharach":"🏜️","Cania":"🌾"};
const SLOT_ICONS={weapon:"⚔️",head:"🪖",cape:"🧥",ring:"💍",boots:"🥾",belt:"🧷",neck:"📿",shield:"🛡️"};
function regionFor(zone){
 const origin=displayText(zone?.[1]||"");
 if(!origin)return "Région inconnue";
 const normal=origin.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 if(normal.includes("incarnam"))return "Incarnam";
 if(normal.includes("wabbit"))return "Île des Wabbits";
 if(normal.includes("frigost"))return "Frigost";
 if(normal.includes("moon"))return "Île de Moon";
 if(normal.includes("amakna"))return "Amakna";
 if(normal.includes("astrub"))return "Astrub";
 if(normal.includes("pandala"))return "Pandala";
 if(normal.includes("otomai"))return "Otomaï";
 if(normal.includes("saharach"))return "Saharach";
 if(normal.includes("cania"))return "Cania";
 return origin;
}
// Il n'existe pas de « logo de région » dans nos archives de sprites.
// On utilise donc le portrait de vraies créatures présentes dans chaque région.
// Les ids DOFUS ci-dessous sont validés avec world.json (SubAreaData).
const REGION_MASCOTS={
 "Incarnam":"4051",       // Kardorim
 "Amakna":"98",          // Tofu
 "Île des Wabbits":"180",// Wa Wabbit
 "Île de Moon":"226",    // Moon
 "Frigost":"2850",       // Boufmouth
 "Astrub":"491",         // Piou Bleu
 "Pandala":"6230",       // Akakwa
 "Otomaï":"1069",        // Kido
 "Cania":"287",          // Kanigrou
 "Saharach":"4621",      // Mantiscore
 "Bonta":"7738"          // Tofu bontarien
};
function regionMascotId(region,zones){
 const ids=new Set(zones.flatMap(([,z])=>z[3].map(String)));
 const preferred=REGION_MASCOTS[region];
 if(preferred&&ids.has(preferred)&&images.monsters[preferred])return preferred;
 const candidates=zones.flatMap(([,z])=>z[3].map(String));
 // Choisit un véritable monstre visible dans une sous-zone de la région.
 return candidates.find(id=>images.monsters[id]&&!/oeuf de pwak|robot pousse-pousse/i.test(world.monsters[id]?.[0]||""))||
   candidates.find(id=>images.monsters[id])||null;
}
function regionArt(region,zones,cls="fd-region-art"){
 const id=regionMascotId(region,zones);
 if(!id)return E("span",{className:cls+" fd-region-fallback",title:"Illustration indisponible"},"🗺️");
 const el=mobSprite(id,cls);
 el.title="Créature DOFUS : "+world.monsters[id][0]+" · représentative de "+region;
 return el;
}
function zoneArt(zone,cls="fd-zone-art"){
 const id=zone[3].map(String).find(mid=>images.monsters[mid])||null;
 if(!id)return E("span",{className:cls+" fd-region-fallback"},"🗺️");
 const el=mobSprite(id,cls);
 el.title="Créature DOFUS de cette zone : "+world.monsters[id][0];
 return el;
}
function regionCatalog(){
 const map=new Map();
 for(const [id,z] of Object.entries(world.zones)){
  if(!Array.isArray(z)||!Array.isArray(z[3])||!z[3].length)continue;
  const region=regionFor(z);
  if(!map.has(region))map.set(region,[]);
  map.get(region).push([id,z]);
 }
 for(const zones of map.values())zones.sort((a,b)=>a[1][2]-b[1][2]||String(a[1][0]).localeCompare(String(b[1][0]),"fr"));
 return [...map.entries()].sort((a,b)=>{
  const ia=REGIONS_FAVORITES.indexOf(a[0]),ib=REGIONS_FAVORITES.indexOf(b[0]);
  if(ia>=0||ib>=0)return (ia<0?99:ia)-(ib<0?99:ib);
  return a[0].localeCompare(b[0],"fr");
 });
}
function zoneSymbol(name){
 const n=String(name||"").toLowerCase();
 if(/donjon|crypte|souterrain|grotte|mine|caverne/.test(n))return "🏰";
 if(/cimetière|tombe|ossement|mort/.test(n))return "🪦";
 if(/forêt|bois|jungle/.test(n))return "🌲";
 if(/lac|rivière|plage|mer|baie|marais/.test(n))return "🌊";
 if(/champ|prairie|pâturage|plaine/.test(n))return "🌾";
 if(/glace|gel|neige|frigost/.test(n))return "❄️";
 if(/route|chemin|sentier/.test(n))return "🛤️";
 if(/village|cité|ville/.test(n))return "🏘️";
 if(/montagne|falaise|sommet/.test(n))return "⛰️";
 return "🗺️";
}
function difficultyChip(level){
 if(level<50)return pill("Facile","green");
 if(level<115)return pill("Normale","fd-difficulty-medium");
 return pill("Difficile","fd-difficulty-hard");
}
function selectRegion(region){
 if(state.action?.type==="combat")state.action=null;
 state.selectedRegion=region;
 combatOpenZone="";
 zoneQuery="";monsterQuery="";monsterPage=0;
 render();save();
}
function chooseZone(id){
 if(combatOpenZone===id){combatOpenZone="";monsterQuery="";renderView();return}
 const zone=world.zones[String(id)];
 if(!zone)return;
 combatOpenZone=String(id);state.selectedZone=String(id);
 monsterPage=0;monsterQuery="";
 const first=zone[3].find(mid=>world.monsters[String(mid)]);
 if(first!=null)state.selectedMonster=String(first);
 if(state.action?.type==="combat"&&String(state.action.id)!==state.selectedMonster)state.action=null;
 render();save();
}
function focusMonster(id,zoneId){
 const m=world.monsters[String(id)];
 if(!m)return;
 let zid=zoneId;
 if(!world.zones[String(zid)])zid=m[5]?.find(x=>world.zones[String(x)])||"";
 const zone=world.zones[String(zid)];
 if(zone){
  state.selectedZone=String(zid);
  state.selectedRegion=regionFor(zone);
  state.combatMode=Number(zone[5])>=0?"dungeons":"zones";
  combatOpenZone=String(zid);
 }
 state.selectedMonster=String(id);monsterQuery="";monsterPage=0;state.view="combat";
 render();save();
}
function monsterDropsPanel(id,m){
 const drops=E("div",{className:"fd-combat-drops"});
 const real=E("div",{className:"fd-loot-grid"});
 const rates=m[4]||[];
 for(const [iid,rate] of rates.slice(0,64)){
  const row=E("div",{className:"fd-loot-item"},
   itemSprite(iid,"fd-loot-art"),
   E("div",{},E("strong",{},itemName(iid)),E("small",{},typeName(iid))),
   pill(formatRate(rate),"green"));
  real.append(row);
 }
 drops.append(E("div",{className:"fd-subtitle"},E("strong",{},"Butins officiels sans conditions"),pill(money(rates.length)+" objets")),
   E("small",{className:"fd-muted"},"Pourcentages de base du grade 1, avant prospection et modificateurs."));
 if(real.childNodes.length)drops.append(real);
 else drops.append(E("p",{className:"fd-muted"},"Aucun butin libre répertorié pour ce monstre."));
 const conditional=m[6]||[];
 if(conditional.length){
  const details=E("details",{className:"fd-loot-conditional"},
   E("summary",{},"🔒 Voir "+money(conditional.length)+" butins à conditions (quêtes, événements…)"));
  const grid=E("div",{className:"fd-loot-grid"});
  for(const [iid,rate,criteria] of conditional.slice(0,64)){
   grid.append(E("div",{className:"fd-loot-item conditional",title:criteria||"Condition spéciale"},
    itemSprite(iid,"fd-loot-art"),E("strong",{},itemName(iid)),pill(formatRate(rate),"locked")));
  }
  details.append(E("small",{className:"fd-muted"},"Conditions non simulées : ces objets ne tombent pas dans le prototype."),grid);
  drops.append(details);
 }
 const pool=possibleEquipment(m[1]),chance=equipmentChance(m);
 drops.append(E("div",{className:"fd-loot-bonus"},
  E("strong",{},"🎁 Stuff bonus DOFUS IDLE · "+chance+" % par victoire"),
  E("p",{},"Équipement réel de DOFUS adapté au niveau du monstre, mais tirage supplémentaire propre au jeu idle. Ce n'est pas un drop officiel de ce monstre."),
  E("div",{className:"fd-loot-examples"},
   ...pool.slice(0,6).map(iid=>E("span",{className:"fd-loot-preview",title:itemName(iid)},itemSprite(iid,"fd-loot-art")))),
  E("small",{},"Récompenses possibles dans la sélection : "+money(pool.length)+" équipements. Les objets gagnés vont dans la Banque.")));
 return drops;
}
function combatPlayerPanel(){
 const pv=clamp(state.hp,0,maxHp()),pct=maxHp()?100*pv/maxHp():0;
 const isRunning=state.action?.type==="combat";
 const timer=isRunning?Math.max(0,1.65-(state.upgrades.weapon||0)*.025-state.action.progress):0;
 const equipment=E("div",{className:"fd-combat-equipment"});
 for(const [slot,id] of Object.entries(state.equipment)){
  const label=EQUIP_LABELS[slot]||slot;
  const button=B("",()=>runNav("character"),"fd-combat-gear-slot");
  button.title=id?label+" : "+itemName(id)+" (ouvrir l'équipement)":label+" : vide (ouvrir l'équipement)";
  button.append(id?itemSprite(id,"fd-combat-gear-image"):E("span",{className:"fd-combat-gear-image"},SLOT_ICONS[slot]||"◻"),
   E("small",{},label));
  equipment.append(button);
 }
 return E("section",{className:"fd-fight-panel fd-player-panel"},
  E("div",{className:"fd-fight-panel-title"},E("strong",{},"🛡️ Ton aventurier"),pill("Niv. "+playerLevel(),"green")),
  E("div",{className:"fd-hp-label"},E("strong",{},"❤️ "+money(pv)+" / "+money(maxHp())+" PV"),
   E("small",{},isRunning?"Prochaine attaque : "+timer.toFixed(1)+" s":"Intervalle d'attaque : "+Math.max(.5,1.65-(state.upgrades.weapon||0)*.025).toFixed(2)+" s")),
  meter(pct,"fd-player-hp"),
  E("div",{className:"fd-player-layout"},
   E("div",{className:"fd-player-gear"},
    E("div",{className:"fd-fight-section-label"},"Équipement"),equipment,
    B("🎒 Voir ma banque / équiper",()=>runNav("bank"),"fd-secondary fd-wide")),
   E("div",{className:"fd-player-stats"},
    E("div",{className:"fd-fight-section-label"},"Statistiques de combat"),
    E("div",{className:"fd-stat"},E("span",{},"⚔️ Dégâts / coup"),E("strong",{},money(damage()))),
    E("div",{className:"fd-stat"},E("span",{},"🛡️ Défense"),E("strong",{},money(defense()))),
    E("div",{className:"fd-stat"},E("span",{},"💥 Coup critique"),E("strong",{},state.classId==="cra"?"16 %":"5 %")),
    E("div",{className:"fd-stat"},E("span",{},"❤️ PV maximum"),E("strong",{},money(maxHp()))),
    E("div",{className:"fd-stat"},E("span",{},"🏆 Monstres vaincus"),E("strong",{},money(state.kills))),
    B("🧙 Mon personnage",()=>runNav("character"),"fd-secondary fd-wide"))));
}
function combatEnemyPanel(){
 const m=world.monsters[String(state.selectedMonster)],zone=world.zones[String(state.selectedZone)];
 const inZone=m&&zone?.[3]?.some(mid=>String(mid)===String(state.selectedMonster));
 if(!m||!inZone||!combatOpenZone){
  return E("section",{className:"fd-fight-panel fd-enemy-panel"},
   E("div",{className:"fd-fight-panel-title"},E("strong",{},"👹 Cible ennemie")),
   E("div",{className:"fd-combat-empty"},"Sélectionne une zone, puis un monstre pour voir ses caractéristiques et ses butins."));
 }
 const active=state.action?.type==="combat"&&String(state.action.id)===String(state.selectedMonster);
 const enemyHp=active?clamp(state.action.enemyHp,0,m[2]):m[2];
 const enemyPct=m[2]?100*enemyHp/m[2]:0;
 return E("section",{className:"fd-fight-panel fd-enemy-panel"},
  E("div",{className:"fd-fight-panel-title"},E("strong",{},"⚔️ Adversaire : "+m[0]),pill("Niv. "+m[1],"fd-difficulty-hard")),
  E("div",{className:"fd-hp-label"},E("strong",{},"❤️ "+money(enemyHp)+" / "+money(m[2])+" PV"),
    E("small",{},active?"Le monstre attaque toutes les 2,8 secondes":"Combat arrêté")),
  meter(enemyPct,"fd-enemy-hp"),
  E("div",{className:"fd-enemy-hero"},
   mobSprite(state.selectedMonster,"fd-enemy-portrait"),
   E("div",{},E("h2",{},m[0]),
     E("p",{},"📍 "+zone[0]+" · Niveau "+m[1]),
     E("p",{},"🏆 "+money(state.dex[String(state.selectedMonster)]||0)+" victoires"),
     pill("🪙 "+money(Math.round((5+m[1]*1.75)*(1+(state.upgrades.fortune||0)*.1)))+" / victoire"))),
  E("div",{className:"fd-combat-actions"},
   B(active?"■ Arrêter le combat":"⚔️ Combattre",()=>startCombat(state.selectedMonster),
    active?"fd-danger":"fd-button",!active&&playerLevel()+8<m[1]),
   B("🎁 Voir les butins",()=>{const el=$("#fdCombatLoot");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"nearest"})},"fd-secondary"),
   B("🎒 Équiper du stuff",()=>runNav("bank"),"fd-secondary")),
  E("div",{id:"fdCombatLoot"},monsterDropsPanel(state.selectedMonster,m)),
  E("div",{className:"fd-log"},E("h3",{},"📜 Journal de combat"),
    ...state.log.slice(0,8).map(line=>E("p",{},line))));
}
function combatMonsterRow(mid,m,zoneId){
 const active=String(state.selectedMonster)===String(mid);
 const row=E("div",{className:"fd-monster-row "+(active?"active":"")});
 const pick=B("",()=>focusMonster(mid,zoneId),"fd-monster-info");
 pick.append(mobSprite(mid,"fd-combat-list-art"),
  E("span",{},E("strong",{},m[0]),E("small",{},"Niveau de combat "+m[1]+" · ❤️ "+money(m[2])+" PV")));
 row.append(pick,E("div",{className:"fd-monster-buttons"},
  B("Combattre",()=>{focusMonster(mid,zoneId);startCombat(mid)},"fd-danger",playerLevel()+8<m[1]),
  B("Butins",()=>{focusMonster(mid,zoneId);(()=>{const el=$("#fdCombatLoot");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"nearest"})})()},"fd-secondary")));
 return row;
}
function combatZoneCard(id,z){
 const open=combatOpenZone===String(id);
 const zoneLevel=z[2]||1;
 const card=E("article",{className:"fd-zone-card "+(open?"expanded":"")});
 const head=E("button",{type:"button",className:"fd-zone "+(open?"active":""),onclick:()=>chooseZone(id)});
 head.append(zoneArt(z),
  E("span",{className:"fd-zone-summary"},
   E("strong",{},z[0]||"Zone inconnue"),E("small",{},"Niveau conseillé "+zoneLevel+" · "+z[3].length+" monstres")),
  difficultyChip(zoneLevel),E("span",{className:"fd-chevron"},open?"−":"+"));
 card.append(head);
 if(open){
  const matches=z[3].filter(mid=>world.monsters[String(mid)]&&world.monsters[String(mid)][0].toLowerCase().includes(monsterQuery.toLowerCase()));
  const rows=E("div",{className:"fd-zone-monsters"},E("div",{className:"fd-zone-monster-head"},"MONSTRES DE LA ZONE",pill(money(matches.length))));
  if(matches.length>20)rows.append(E("input",{className:"fd-zone-monster-search",type:"search",value:monsterQuery,placeholder:"Chercher un monstre de cette zone…",
   oninput:e=>{monsterQuery=e.target.value;monsterPage=0;renderView();const next=$(".fd-zone-monster-search");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}}}));
  for(const mid of matches.slice(monsterPage*20,(monsterPage+1)*20)){
   rows.append(combatMonsterRow(mid,world.monsters[String(mid)],id));
  }
  if(!matches.length)rows.append(E("p",{className:"fd-muted"},"Aucun monstre correspondant."));
  if(matches.length>20)rows.append(E("div",{className:"fd-zone-pagination"},
   B("←",()=>{monsterPage=Math.max(0,monsterPage-1);renderView()},"fd-mini",monsterPage===0),
   pill((monsterPage+1)+" / "+Math.max(1,Math.ceil(matches.length/20))),
   B("→",()=>{monsterPage=Math.min(Math.ceil(matches.length/20)-1,monsterPage+1);renderView()},"fd-mini",(monsterPage+1)*20>=matches.length)));
  card.append(rows);
 }
 return card;
}
function zoneView(){
 const all=regionCatalog();
 const mode=state.combatMode==="dungeons"?"dungeons":"zones";
 const regions=all.map(([name,zones])=>[name,zones.filter(([id,z])=>mode==="dungeons"?Number(z[5])>=0:Number(z[5])<0)])
  .filter(([name,zones])=>zones.length>0);
 const chosen=regions.find(([name])=>name===state.selectedRegion);
 const outer=E("div",{className:"fd-combat-page"},
  E("div",{className:"fd-combat-tabs"},
   B("⚔️ Zones de combat",()=>{state.combatMode="zones";state.selectedRegion="";combatOpenZone="";zoneQuery="";render();save()},"fd-combat-tab "+(mode==="zones"?"active":"")),
   B("🏰 Donjons",()=>{state.combatMode="dungeons";state.selectedRegion="";combatOpenZone="";zoneQuery="";render();save()},"fd-combat-tab "+(mode==="dungeons"?"active":"")),
   B("📚 Bestiaire",()=>runNav("bestiary"),"fd-combat-tab"),
   B("🎒 Équipement",()=>runNav("character"),"fd-combat-tab")));
 if(!chosen){
  const grid=E("div",{className:"fd-region-cards"});
  for(const [name,zones] of regions){
   const lvMin=Math.min(...zones.map(([id,z])=>Number(z[2])||1));
   const card=E("button",{className:"fd-region-card",type:"button",onclick:()=>selectRegion(name)});
   card.append(regionArt(name,zones),
    E("span",{className:"fd-region-body"},E("strong",{},name),E("small",{},zones.length+" zones disponibles · dès le niveau "+lvMin)),
    E("span",{className:"fd-region-chevron"},"›"));
   grid.append(card);
  }
  outer.append(panelHeading("🌍 Choisis une région",
    "Incarnam, Amakna, Île des Wabbits, Moon, Frigost et toutes les régions présentes dans DOFUS 3.",
    pill(money(regions.length)+" régions")),grid);
  return outer;
 }
 const [region,zones]=chosen;
 const filtered=zones.filter(([id,z])=>String(z[0]+" "+z[1]).toLowerCase().includes(zoneQuery.toLowerCase()));
 const cards=E("div",{className:"fd-combat-zone-grid"});
 for(const [id,z] of filtered)cards.append(combatZoneCard(id,z));
 outer.append(E("div",{className:"fd-combat-breadcrumb"},
    B("← Toutes les régions",()=>selectRegion(""),"fd-secondary"),
    E("strong",{className:"fd-region-heading"},regionArt(region,zones,"fd-region-breadcrumb-art"),E("span",{},region)),
    pill(money(zones.length)+" zones")),
  E("div",{className:"fd-battle-sections"},combatPlayerPanel(),combatEnemyPanel()),
  panelHeading(mode==="dungeons"?"🏰 Donjons de "+region:"⚔️ Zones de "+region,
   "Clique sur une zone pour afficher ses véritables monstres, puis choisis Combattre ou Butins.",
   pill(money(filtered.length)+" affichées")),
  E("input",{type:"search",className:"fd-region-search",value:zoneQuery,placeholder:"Rechercher une zone de "+region+"…",
   oninput:e=>{zoneQuery=e.target.value;renderView();const next=$(".fd-region-search");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}}}),
  cards);
 return outer;
}
function bestiaryView(){
 const mobs=Object.entries(world.monsters).filter(([id,m])=>m[0].toLowerCase().includes(q.toLowerCase()))
  .sort((a,b)=>a[1][1]-b[1][1]);
 const grid=E("div",{className:"fd-best-grid"});
 for(const [id,m] of mobs.slice(page*54,(page+1)*54)){
  grid.append(B("",()=>{focusMonster(id,m[5][0]||state.selectedZone) },"fd-best-card"));
  grid.lastChild.append(mobSprite(id,"fd-best-art"),E("strong",{},m[0]),E("small",{},"Niv. "+m[1]),pill((state.dex[id]||0)+" 🏆"));
 }
 return E("div",{},panelHeading("Bestiaire complet","Tous les monstres extraits de la base DOFUS 3.",pill(money(mobs.length)+" résultats")),
  searchField("Chercher un monstre...",q,v=>{q=v;page=0}),grid,
  E("div",{className:"fd-pagination"},B("←",()=>{page--;renderView()},"fd-mini",page<=0),
   pill((page+1)+" / "+Math.max(1,Math.ceil(mobs.length/54))),
   B("→",()=>{page++;renderView()},"fd-mini",(page+1)*54>=mobs.length)));
}
function characterView(){
 const classes=[["iop","Iop","⚔️","+20 % dégâts"],["cra","Crâ","🏹","+11 % critique"],["sacrieur","Sacrieur","🩸","+35 % PV"],["eniripsa","Eniripsa","💚","+60 % soin"]];
 return E("div",{},panelHeading("Ton aventurier","Choisis ta classe et équipe les créations de tes métiers.",pill("Combat niv. "+playerLevel())),
  E("div",{className:"fd-character-stats"},pill("❤️ "+money(maxHp())+" PV"),pill("⚔️ "+damage()+" dégâts"),pill("🛡️ "+defense()+" défense"),pill("🏆 "+state.kills+" victoires")),
  E("div",{className:"fd-class-grid"},...classes.map(([id,n,icon,bonus])=>
   B(icon+" "+n+" · "+bonus,()=>{state.classId=id;state.hp=Math.min(state.hp,maxHp());render();save()},
   "fd-class "+(state.classId===id?"active":"")))),
  panelHeading("Équipements","Les bonus de statistiques de ce prototype sont simplifiés.",""),
  E("div",{className:"fd-equipment"},...Object.entries(state.equipment).map(([slot,id])=>
   E("div",{className:"fd-equip-slot"},id?itemSprite(id,"fd-bank-art"):E("span",{className:"fd-bank-art"},"＋"),
    E("strong",{},EQUIP_LABELS[slot]||slot),E("small",{},id?itemName(id):"Vide"),
    id?B("Retirer",()=>{if(!add(id)){toast("Banque pleine.");return}state.equipment[slot]=null;render();save()},"fd-mini"):null))),
  E("div",{className:"fd-character-actions"},
   B("📦 Exporter sauvegarde",exportSave,"fd-secondary"),
   B("📥 Importer sauvegarde",()=>$("#fdImport").click(),"fd-secondary"),
   B("🗑️ Nouvelle partie",()=>{if(confirm("Effacer la sauvegarde DOFUS IDLE complète ?")){localStorage.removeItem(KEY);location.reload()}},"fd-danger"),
   E("input",{id:"fdImport",type:"file",accept:".json,application/json",style:{display:"none"},onchange:async e=>{const f=e.target.files[0];if(!f)return;try{
    if(f.size>2000000)throw Error("Sauvegarde trop volumineuse");
    const data=JSON.parse(await f.text());if(data.version!==2||!data.bank||!data.jobs)throw Error("Fichier invalide");
    localStorage.setItem(KEY,JSON.stringify(data));location.reload();
   }catch(err){toast("Import refusé : "+err.message)}}})));
}
function exportSave(){
 save();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=E("a",{href:url,download:"dofus-idle-save-v2.json"});
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function renderView(){
 if(!state)return;
 const v=state.view;
 let node=null;
 if(v.startsWith("craft:"))node=craftingView(v.split(":")[1]);
 else if(v.startsWith("job:")){const j=v.split(":")[1];
  node=core.gather[j]?.length?gatherView(j):(core.recipes[j]||[]).length?craftingView(j):specialView(j);
 }else if(v==="bank")node=bankView();
 else if(v==="shop")node=shopView();
 else if(v==="combat")node=zoneView();
 else if(v==="bestiary")node=bestiaryView();
 else if(v==="recipes")node=craftingView(null,true);
 else node=characterView();
 $("#view").replaceChildren(node);
}
function render(){sidebar();header();renderView()}
async function init(){
 try{
  const req=await Promise.all(["./data/core.json","./data/world.json"].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error(url+" : "+r.status);return r.json()})));
  core=req[0];world=req[1];
  if(!core.jobs||!core.items||!world.monsters||!world.zones)throw Error("Base DOFUS 3 incomplète");
  // Les sprites courants sont déjà présents dans les imports précédents.
  const catalog=window.DOFUS_IDLE_ASSETS||{items:{},monsters:{},jobs:{}};
  for(const kind of ["items","monsters","jobs"])images[kind]={...(catalog[kind]||{})};
  // Alias des anciens items par identifiant DOFUS pour préserver leurs vraies images.
  for(const [key,id] of Object.entries(core.legacyItems||{}))if(catalog.items?.[key])images.items[String(id)]=catalog.items[key];
  const jobAlias={"2":"wood","24":"mining","26":"alchemy","28":"farmer","36":"fishing"};
  for(const [jid,key] of Object.entries(jobAlias))if(catalog.jobs?.[key])images.jobs[jid]=catalog.jobs[key];
  // Alias des 24 portraits d'Incarnam.
  for(const mid of Object.keys(world.monsters))if(catalog.monsters?.[mid])images.monsters[mid]=catalog.monsters[mid];
  try{
   const r=await fetch("./data/images.json");if(r.ok){const c=await r.json();
    for(const kind of ["items","monsters","jobs"])Object.assign(images[kind],c[kind]||{});
   }
  }catch(e){}
  for(const [mid,m] of Object.entries(world.monsters)){
   for(const [iid,rate] of m[4]){
    if(!dropIndex[iid])dropIndex[iid]=[];dropIndex[iid].push([mid,rate]);
   }
  }
  // Catalogue des vrais équipements fabriquables : le taux d'obtention bonus
  // est propre à DOFUS IDLE, les identités et niveaux proviennent du client.
  gearPool=[...new Set(Object.values(core.recipes).flatMap(list=>list.map(recipe=>String(recipe[0]))))]
    .filter(id=>core.items[id]&&gearSlot(id)&&itemLevel(id)<=200);
  state=load();offline();state.hp=clamp(Number(state.hp)||maxHp(),1,maxHp());
  $("#menuToggle").onclick=()=>$("#sidebar").classList.toggle("open");
  window.addEventListener("pagehide",save);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
  document.addEventListener("visibilitychange",()=>{
   if(document.hidden)save();else{offline();lastTick=now();render();save()}
  });
  render();save();
  if(state.migrated)toast("Ancienne sauvegarde DOFUS IDLE importée : niveaux, kamas et inventaire préservés.");
  setInterval(()=>{
   const t=now(),dt=clamp((t-lastTick)/1000,0,.4);lastTick=t;
   if(!document.hidden)tick(dt);
   if(!document.hidden&&t-lastRender>900){
    lastRender=t;
    const focus=document.activeElement;
    if(!focus||!["INPUT","SELECT"].includes(focus.tagName)){
     const scrolls=[".fd-zones",".fd-monster-list",".fd-drops",".fd-source-list",".fd-zone-monsters",".fd-loot-grid"].map(sel=>[sel,$(sel)?.scrollTop||0]);
     render();
     for(const [sel,y] of scrolls){const node=$(sel);if(node)node.scrollTop=y}
    }
    else header();
   }
   if(!document.hidden&&t-lastSave>4000){lastSave=t;save()}
  },200);
  window.DOFUS_IDLE_FULL={getState:()=>JSON.parse(JSON.stringify(state)),core,world,levelOf,getGearPoolSize:()=>gearPool.length,simulateSeconds:seconds=>{tick(seconds);render()}};
 }catch(err){
  console.error("DOFUS IDLE chargement",err);
  $("#view").replaceChildren(E("div",{className:"fd-error"},E("h2",{},"La base de données DOFUS 3 n'a pas pu être chargée."),
   E("p",{},String(err.message)),
   B("Réessayer",()=>location.reload(),"fd-button")));
 }
}
init();
})();
