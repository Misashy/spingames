/* DOFUS IDLE COMPLET — gameplay autonome alimenté par la base DOFUS 3 */
(() => {
"use strict";
const $=s=>document.querySelector(s);
const E=(tag,attrs,...children)=>{
 const el=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs||{})){
  if(value===null||value===undefined)continue;
  if(key==="className")el.className=value;
  else if(key==="text")el.textContent=String(value);
  else if(key==="style"&&typeof value==="object")Object.assign(el.style,value);
  else if(key.startsWith("data-"))el.setAttribute(key,String(value));
  else if(key==="disabled")el.disabled=Boolean(value);
  else el[key]=value;
 }
 for(const child of children.flat(Infinity))if(child!==null&&child!==undefined&&child!==false)
  el.append(child instanceof Node?child:document.createTextNode(String(child)));
 return el;
};
const B=(text,onclick,cls="fd-button",disabled=false)=>E("button",{type:"button",className:cls,onclick,disabled},text);
const money=n=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(Math.floor(Number(n)||0));
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const KEY="dofus-idle-full-v2",OLD_KEY="dofus-idle-independent-v1";
let core=null,world=null,state=null,dropIndex={},lastTick=Date.now(),lastSave=0,lastRender=0;
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
  action:null,selectedMonster:"979",selectedZone:"444",unlocked:{},dex:{},log:[],
  lastAt:now(),totalSeconds:0,migrated:false};
}
function load(){
 let raw=null;
 try{raw=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 if(raw?.version===2&&raw.jobs&&raw.bank){
  return Object.assign(fresh(),raw,{jobs:raw.jobs||{},bank:raw.bank||{},equipment:{...fresh().equipment,...raw.equipment},upgrades:{...fresh().upgrades,...raw.upgrades}});
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
 const kamas=Math.round(5+m[1]*1.75);state.kamas+=kamas;state.earned+=kamas;
 let dropped=[];
 for(const [id,rate] of m[4]){
  if(Math.random()*100<rate){if(add(id,1))dropped.push(id)}
 }
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
 if(!list.length)box.append(E("p",{},"Aucun drop inconditionnel répertorié. Cet objet peut s'obtenir par récolte, recette, quête ou événement particulier."));
 else{
  box.append(E("p",{},"Probabilités de base DOFUS 3 (grade 1), sans prospection ni bonus de combat."));
  const grid=E("div",{className:"fd-source-list"});
  for(const [mid,rate] of list.slice(0,45)){
   const monster=world.monsters[String(mid)],loc=monster[5][0],place=world.zones[String(loc)];
   grid.append(B(monster[0]+" · "+formatRate(rate)+" · "+(place?.[0]||"Localisation spéciale"),()=>{
    state.selectedMonster=String(mid);if(place)state.selectedZone=String(loc);
    state.view="combat";monsterQuery="";monsterPage=0;closeModal();render();save();
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
 state.view=view;q="";page=0;recipeFilter="all";monsterPage=0;
 $("#sidebar").classList.remove("open");render();save();
}
function sidebar(){
 const groups=[
  ["PERSONNAGE",[["bank","🎒","Banque"],["shop","🪙","Magasin"],["character","🧙","Personnage"]]],
  ["MÉTIERS DE RÉCOLTE",Object.keys(core.gather).sort((a,b)=>Number(a)-Number(b)).map(id=>["job:"+id,jobIcon(id),jobName(id)])],
  ["MÉTIERS DE FABRICATION",Object.keys(core.jobs).filter(id=>!core.gather[id]&&(core.recipes[id]||[]).length>0).map(id=>["job:"+id,jobIcon(id),jobName(id)])],
  ["SPÉCIALISATIONS",Object.keys(core.jobs).filter(id=>!core.gather[id]&&!(core.recipes[id]||[]).length).map(id=>["job:"+id,jobIcon(id),jobName(id)])],
  ["MONDE",[["combat","⚔️","Zones et monstres"],["bestiary","📘","Bestiaire"],["recipes","🔧","Toutes les recettes"]]]
 ];
 const nav=E("div",{className:"fd-nav"});
 for(const [title,entries] of groups){
  const section=E("section",{},E("h3",{},title));
  for(const [view,emoji,label] of entries){
   const id=view.startsWith("job:")?view.split(":")[1]:null;
   section.append(B("",()=>runNav(view),"fd-nav-entry "+(state.view===view?"active":"")));
   const button=section.lastChild;
   button.append(id?jobSprite(id,"fd-menu-icon"):E("span",{className:"fd-menu-icon"},emoji),
    E("span",{className:"fd-nav-name"},label),
    id?E("span",{className:"fd-nav-level"},jobLevel(id)+"/200"):null);
  }
  nav.append(section);
 }
 $("#menu").replaceChildren(nav);
}
function header(){
 const view=state.view,job=view.startsWith("job:")?view.split(":")[1]:null;
 const lev=job?levelOf(state.jobs[job]||0):levelOf(state.playerXp);
 const tit=job?jobName(job):({bank:"Banque",shop:"Magasin",combat:"Combats",character:"Personnage",recipes:"Toutes les recettes",bestiary:"Bestiaire"}[view]||"DOFUS IDLE");
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
    gearSlot(id)?B("Équiper",()=>equip(id),"fd-mini"):null)));
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
 if(slot in state.equipment){
  const old=state.equipment[slot];if(old&&!has(old)&&slots()>=bankCap()){toast("Banque pleine.");return}
  consume(id);if(old)add(old);state.equipment[slot]=String(id);state.hp=Math.min(maxHp(),state.hp);
  toast(itemName(id)+" équipé.");render();save();
 }
}
function shopView(){
 const defs=[["bank","🏦","Extension de banque","+100 emplacements"],
  ["tool","🪓","Outils améliorés","Récolte plus rapide"],
  ["weapon","⚔️","Force supplémentaire","+6 dégâts"],
  ["armor","🛡️","Résistance","+3 défense"],
  ["fortune","🪙","Bonne fortune","Réservé aux évolutions futures"]];
 return E("div",{},panelHeading("Magasin d'Enutrof","Bonus permanents financés par les kamas.","🪙 "+money(state.kamas)),
 E("div",{className:"fd-craft-grid"},...defs.map(([id,icon,name,desc])=>{
  const lvl=state.upgrades[id]||0,price=Math.round((id==="bank"?130:170)*Math.pow(id==="bank"?1.8:2.1,lvl));
  return E("article",{className:"fd-recipe-card"},E("div",{className:"fd-shop-symbol"},icon),E("h3",{},name),E("p",{},desc),
   pill("Niv. "+lvl+" / 15"),
   B("Acheter · "+money(price)+" kamas",()=>buyUpgrade(id),"fd-button",lvl>=15||state.kamas<price));
 })));
}
function setArea(id){selectedArea=id;monsterQuery="";monsterPage=0;renderView()}
function zoneView(){
 const allZones=Object.entries(world.zones).filter(([id,z])=>z[3].length>0).sort((a,b)=>a[1][2]-b[1][2]||a[1][0].localeCompare(b[1][0],"fr"));
 const areas=[...new Set(allZones.map(([id,z])=>z[1]))].sort((a,b)=>a.localeCompare(b,"fr"));
 const ql=zoneQuery.toLowerCase();
 const visible=allZones.filter(([id,z])=>(!selectedArea||z[1]===selectedArea)&&(z[0]+" "+z[1]).toLowerCase().includes(ql));
 const box=E("div",{className:"fd-zones"});
 for(const [id,z] of visible.slice(0,130)){
  box.append(B(z[0]+" · "+z[1]+" · Niv. "+z[2]+" · "+z[3].length+" monstres",
   ()=>{state.selectedZone=id;monsterQuery="";monsterPage=0;render();save();},
   "fd-zone "+(state.selectedZone===id?"active":"")));
 }
 if(visible.length>130)box.append(E("small",{},"Affichage limité à 130 zones : affine la recherche."));
 const current=world.zones[String(state.selectedZone)]||allZones[0]?.[1];
 const mobs=current?current[3].map(id=>[String(id),world.monsters[String(id)]]).filter(([id,m])=>m):[];
 const candidates=monsterQuery?
  Object.entries(world.monsters).filter(([id,m])=>m[0].toLowerCase().includes(monsterQuery.toLowerCase())):mobs;
 candidates.sort((a,b)=>a[1][1]-b[1][1]);
 const paginated=candidates.slice(monsterPage*25,(monsterPage+1)*25);
 const list=E("div",{className:"fd-monster-list"});
 for(const [id,m] of paginated){
  const selected=String(state.selectedMonster)===id;
  list.append(B("",()=>{state.selectedMonster=id;renderView();save()},"fd-monster-row "+(selected?"active":"")));
  list.lastChild.append(mobSprite(id),E("div",{},E("strong",{},m[0]),E("small",{},"Niveau "+m[1]+" · "+money(m[2])+" PV · "+m[4].length+" butins")),
   pill((state.dex[id]||0)+" victoires"));
 }
 const m=world.monsters[String(state.selectedMonster)]||world.monsters["979"];
 return E("div",{},currentActionBox(),panelHeading("Les zones du Monde des Douze",
 "Sous-zones et monstres associés dans les fichiers du jeu. Choisis une région, une zone et un monstre.",
 pill(money(Object.keys(world.zones).length)+" zones · "+money(Object.keys(world.monsters).length)+" monstres")),
 E("div",{className:"fd-zones-layout"},
  E("div",{className:"fd-side-panel"},E("h3",{},"🧭 Zones et régions"),
   E("select",{className:"fd-select",value:selectedArea,onchange:e=>setArea(e.target.value)},
    E("option",{value:""},"Toutes les régions"),...areas.map(a=>E("option",{value:a},a))),
   E("input",{className:"fd-search",type:"search",placeholder:"Rechercher une zone...",value:zoneQuery,
    oninput:e=>{zoneQuery=e.target.value;renderView();const input=$(".fd-side-panel .fd-search");input?.focus()}}),box),
  E("div",{className:"fd-combat-panel"},E("h3",{},current?current[0]+" · Niv. "+current[2]:"Recherche générale"),
   E("input",{className:"fd-search",type:"search",value:monsterQuery,placeholder:"Chercher parmi tous les monstres...",
    oninput:e=>{monsterQuery=e.target.value;monsterPage=0;renderView();const field=$(".fd-combat-panel .fd-search");field?.focus()}}),
   list,E("div",{className:"fd-pagination"},
    B("←",()=>{monsterPage--;renderView()},"fd-mini",monsterPage<=0),
    pill((monsterPage+1)+" / "+Math.max(1,Math.ceil(candidates.length/25))),
    B("→",()=>{monsterPage++;renderView()},"fd-mini",(monsterPage+1)*25>=candidates.length))),
  E("div",{className:"fd-monster-detail"},
   mobSprite(state.selectedMonster,"fd-monster-portrait"),E("h2",{},m[0]),
   E("p",{},"Niveau "+m[1]+" · "+money(m[2])+" PV · "+m[4].length+" butins"),
   E("div",{className:"fd-combat-health"},E("span",{},"❤️ "+money(state.hp)+" / "+money(maxHp())+" PV"),meter(100*state.hp/maxHp())),
   B(state.action?.type==="combat"&&String(state.action.id)===String(state.selectedMonster)?"■ Arrêter le combat":"⚔️ Combattre automatiquement",
    ()=>startCombat(String(state.selectedMonster)),"fd-button",playerLevel()+8<m[1]),
   E("h3",{},"Butins et taux de drop"),
   E("small",{},"Taux de base DOFUS 3 en grade 1, hors conditions de quête."),
   E("div",{className:"fd-drops"},...m[4].slice(0,70).map(([iid,rate])=>
    E("div",{className:"fd-drop"},itemSprite(iid,"fd-tiny"),
     E("span",{},itemName(iid)),pill(formatRate(rate),"green")))),
   m[4].length>70?E("small",{},"Seuls les 70 premiers butins sont affichés."):null,
   E("div",{className:"fd-log"},E("h3",{},"Journal"),...state.log.slice(0,8).map(line=>E("p",{},line))))));
}
function bestiaryView(){
 const mobs=Object.entries(world.monsters).filter(([id,m])=>m[0].toLowerCase().includes(q.toLowerCase()))
  .sort((a,b)=>a[1][1]-b[1][1]);
 const grid=E("div",{className:"fd-best-grid"});
 for(const [id,m] of mobs.slice(page*54,(page+1)*54)){
  grid.append(B("",()=>{state.selectedMonster=id;state.selectedZone=String(m[5][0]||state.selectedZone);runNav("combat") },"fd-best-card"));
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
    E("strong",{},slot),E("small",{},id?itemName(id):"Vide"),
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
 if(v.startsWith("job:")){const j=v.split(":")[1];
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
    if(!focus||!["INPUT","SELECT"].includes(focus.tagName))render();
    else header();
   }
   if(!document.hidden&&t-lastSave>4000){lastSave=t;save()}
  },200);
  window.DOFUS_IDLE_FULL={getState:()=>structuredClone(state),core,world,levelOf};
 }catch(err){
  console.error("DOFUS IDLE chargement",err);
  $("#view").replaceChildren(E("div",{className:"fd-error"},E("h2",{},"La base de données DOFUS 3 n'a pas pu être chargée."),
   E("p",{},String(err.message)),
   B("Réessayer",()=>location.reload(),"fd-button")));
 }
}
init();
})();
