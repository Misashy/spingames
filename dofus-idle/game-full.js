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
let equipmentData=null;
let gearPool=[],gearEligibleCache=new Map(),combatOpenZone="";
const EQUIP_LABELS={weapon:"Arme",head:"Coiffe",cape:"Cape",ring:"Anneau 1",ring2:"Anneau 2",boots:"Bottes",belt:"Ceinture",neck:"Amulette",shield:"Bouclier",pet:"Familier",mount:"Monture",dofus1:"Dofus / Trophée 1",dofus2:"Dofus / Trophée 2",dofus3:"Dofus / Trophée 3",dofus4:"Dofus / Trophée 4",dofus5:"Dofus / Trophée 5",dofus6:"Dofus / Trophée 6"};
let q="",page=0,zoneQuery="",selectedArea="",monsterQuery="",monsterPage=0,recipeFilter="all",busy=false,images={items:{},monsters:{},jobs:{}};
let bankCategory="all",bankType="all",bankSort="name";
const ICONS={"2":"🪓","24":"⛏️","26":"🌿","28":"🌾","36":"🎣","41":"🏹","27":"🧵","15":"👢","16":"💍","11":"⚒️","13":"🏹","60":"🛡️","65":"🗝️","79":"🐴","78":"📖"};
const GATHER_VERBS={"2":"Couper","24":"Extraire","26":"Cueillir","28":"Faucher","36":"Pêcher"};
const MAGE_NAMES=["mage","bestiologue","éleveur"];
const LEVEL_MAX=200;

const STAT_DEFS=[
 ["vitalite","❤️","Vitalité","Augmente les points de vie."],
 ["sagesse","🔮","Sagesse","Augmente l'expérience gagnée."],
 ["force","🪨","Force","Améliore les dégâts terrestres et le corps à corps."],
 ["intelligence","🔥","Intelligence","Améliore les dégâts de feu et les soins."],
 ["chance","💧","Chance","Améliore les dégâts d'eau et la prospection."],
 ["agilite","🌪️","Agilité","Améliore les dégâts d'air et les critiques."]
];
const CLASS_META=[
 ["iop","Iop","⚔️","Guerrier","Frappe de mêlée puissante","force",10],
 ["cra","Crâ","🏹","Archer","Attaques précises à distance","agilite",9],
 ["sacrieur","Sacrieur","🩸","Berserker","Plus de vitalité","force",11],
 ["eniripsa","Eniripsa","💚","Soigneur","Régénération accrue","intelligence",7],
 ["feca","Féca","🛡️","Protecteur","Réduction des dégâts reçus","intelligence",1],
 ["osamodas","Osamodas","🐉","Invocateur","Meilleure régénération","intelligence",2],
 ["enutrof","Enutrof","🪙","Chercheur de trésors","Kamas supplémentaires","chance",3],
 ["sram","Sram","🗡️","Assassin","Critiques plus fréquents","agilite",4],
 ["xelor","Xélor","⌛","Maître du temps","Attaques plus rapides","intelligence",5],
 ["ecaflip","Ecaflip","🎲","Joueur","Coups critiques puissants","chance",6],
 ["sadida","Sadida","🌿","Gardien des plantes","Régénération passive","force",10],
 ["pandawa","Pandawa","🍶","Combattant","Résistance accrue","chance",12],
 ["roublard","Roublard","💣","Artificier","Dégâts supplémentaires","intelligence",13],
 ["zobal","Zobal","🎭","Mascarade","Bonus défensif","agilite",14],
 ["steamer","Steamer","⚙️","Technicien","Bonus polyvalent","chance",15],
 ["eliotrope","Eliotrope","🌀","Voyageur des portails","Attaques plus rapides","intelligence",16],
 ["huppermage","Huppermage","✨","Élémentaliste","Maîtrise des quatre éléments","intelligence",17],
 ["ouginak","Ouginak","🐺","Traqueur","Dégâts en mêlée","force",18],
 ["forgelance","Forgelance","🔱","Lancier","Bonus de défense et d'attaque","force",20]
];
const CLASS_BY_ID=Object.fromEntries(CLASS_META.map(c=>[c[0],c]));

/* V8 : trois techniques par classe. Les noms rappellent DOFUS, mais les
   délais, coefficients et effets sont une adaptation originale au combat idle.
   Un sort : [id, nom, icône, niv, recharge(s), type, puissance, description, élément]. */
const CLASS_SPELLS={
 iop:[
  ["pression","Pression","⚔️",1,7,"strike",1.30,"Frappe Terre augmentée.","terre"],
  ["bond","Bond","🦵",15,25,"fury",.25,"Augmente tes dégâts pendant 10 s.","terre"],
  ["colere","Colère de Iop","💥",45,35,"execute",2.6,"Frappe violente, renforcée contre les ennemis affaiblis.","terre"]],
 cra:[
  ["fleche","Flèche Magique","🏹",1,7,"strike",1.20,"Tir Air à distance.","air"],
  ["tir","Tir Puissant","🎯",15,26,"crit",.18,"Augmente tes chances de critique pendant 11 s.","air"],
  ["explosive","Flèche Explosive","🔥",45,19,"blast",1.85,"Explosion de Feu infligeant d'importants dégâts.","feu"]],
 sacrieur:[
  ["assaut","Assaut","🩸",1,8,"leech",1.05,"Frappe Air qui te soigne selon les dégâts.","air"],
  ["chatiment","Châtiment","⚡",15,24,"fury",.32,"Augmente fortement tes dégâts pendant 10 s.","terre"],
  ["punition","Punition","💔",45,30,"execute",2.5,"Dégâts importants sur un adversaire déjà blessé.","terre"]],
 eniripsa:[
  ["mot-interdit","Mot Interdit","🔥",1,8,"strike",1.05,"Attaque magique de Feu.","feu"],
  ["mot-soignant","Mot Soignant","💚",15,13,"heal",.25,"Rend 25 % de tes PV maximum.","feu"],
  ["mot-prevention","Mot de Prévention","🛡️",45,22,"shield",.30,"Génère un bouclier qui absorbe les dégâts.","feu"]],
 feca:[
  ["attaque-naturelle","Attaque Naturelle","🔥",1,7,"strike",1.10,"Frappe magique de Feu.","feu"],
  ["rempart","Rempart","🛡️",15,26,"armor",.32,"Réduit les dégâts ennemis pendant 11 s.","feu"],
  ["glyphe","Glyphe Enflammé","♨️",45,19,"dot",.50,"Inflige des brûlures régulières à la cible.","feu"]],
 osamodas:[
  ["griffe","Griffe Spectrale","🐾",1,8,"strike",1.08,"Griffe magique de Feu.","feu"],
  ["bouftou","Invocation de Bouftou","🐑",15,20,"summon",.50,"Un allié frappe régulièrement pendant 12 s.","terre"],
  ["piqure","Piqûre Motivante","✨",45,28,"haste",.22,"Accélère tes attaques pendant 10 s.","feu"]],
 enutrof:[
  ["pieces","Lancer de Pièces","🪙",1,7,"strike",1.08,"Projectile d'Eau.","eau"],
  ["sac","Sac Animé","🎒",15,21,"shield",.25,"Protège ton personnage avec des PV de bouclier.","eau"],
  ["chance","Chance","🍀",45,28,"luck",.30,"Augmente les kamas gagnés pendant 12 s.","eau"]],
 sram:[
  ["sournoise","Attaque Sournoise","🗡️",1,7,"strike",1.22,"Frappe discrète de Terre.","terre"],
  ["invisibilite","Invisibilité","🌫️",15,24,"evade",.35,"Chance d'esquiver les attaques pendant 10 s.","air"],
  ["mortelle","Attaque Mortelle","☠️",45,24,"execute",2.45,"Frappe meurtrière plus puissante en exécution.","terre"]],
 xelor:[
  ["aiguille","Aiguille","⌛",1,7,"strike",1.16,"Projectile magique de Feu.","feu"],
  ["ralentissement","Ralentissement","⏳",15,21,"slow",.35,"Ralentit les attaques de ce monstre pendant 11 s.","feu"],
  ["rayon","Rayon Obscur","🌘",45,20,"blast",1.75,"Puissant rayon de Feu.","feu"]],
 ecaflip:[
  ["bluff","Bluff","🎲",1,7,"strike",1.16,"Attaque d'Eau imprévisible.","eau"],
  ["trefle","Trèfle","🍀",15,26,"crit",.23,"Augmente tes coups critiques pendant 10 s.","air"],
  ["rekop","Rekop","✨",45,21,"blast",2.05,"Attaque élémentaire puissante.","eau"]],
 sadida:[
  ["ronce","Ronce","🌿",1,7,"strike",1.10,"Ronce de Terre.","terre"],
  ["gonflable","La Gonflable","🌱",15,27,"regen",.030,"Soins périodiques pendant 12 s.","terre"],
  ["ronce-agressive","Ronce Agressive","🌳",45,18,"dot",.59,"Entrave la cible et lui inflige des dégâts dans le temps.","terre"]],
 pandawa:[
  ["poing","Poing Enflammé","🍶",1,7,"strike",1.18,"Frappe de Feu.","feu"],
  ["picole","Picole","🛡️",15,26,"armor",.28,"Réduit les dégâts subis pendant 11 s.","eau"],
  ["vague","Vague à Lame","🌊",45,19,"blast",1.77,"Puissante attaque d'Eau.","eau"]],
 roublard:[
  ["explobombe","Explobombe","💣",1,9,"dot",.48,"Une bombe brûle la cible pendant plusieurs secondes.","feu"],
  ["bottes","Bottes","🥾",15,25,"evade",.28,"Évite une partie des attaques ennemies.","air"],
  ["detonateur","Détonateur","💥",45,20,"blast",1.95,"Déclenche une explosion de Feu.","feu"]],
 zobal:[
  ["martelo","Martelo","🎭",1,7,"strike",1.19,"Frappe Terre.","terre"],
  ["plastron","Plastron","🛡️",15,21,"shield",.36,"Crée un puissant bouclier.","terre"],
  ["mascarade","Mascarade","💢",45,30,"fury",.40,"Augmente tes dégâts pendant 10 s.","terre"]],
 steamer:[
  ["harponneuse","Harponneuse","⚙️",1,18,"summon",.48,"Tourelle qui frappe régulièrement pendant 12 s.","feu"],
  ["gardienne","Gardienne","💚",15,27,"regen",.035,"Tourelle de soins pendant 12 s.","eau"],
  ["embuscade","Embuscade","🌊",45,20,"blast",1.87,"Frappe polyvalente à base d'Eau.","eau"]],
 eliotrope:[
  ["affront","Affront","🌀",1,7,"strike",1.18,"Attaque magique de Feu.","feu"],
  ["portail","Portail","🕳️",15,27,"haste",.25,"Accélère tes attaques pendant 11 s.","feu"],
  ["wakfu","Rayon de Wakfu","✨",45,20,"blast",1.80,"Rayon de Feu renforcé.","feu"]],
 huppermage:[
  ["lance-flammes","Lance-Flammes","🔥",1,7,"strike",1.18,"Frappe élémentaire de Feu.","feu"],
  ["orage","Orage","🌩️",15,18,"blast",1.58,"Frappe élémentaire d'Air.","air"],
  ["rune","Rune Élémentaire","🔮",45,28,"fury",.29,"Renforce les dégâts élémentaires pendant 11 s.","feu"]],
 ouginak:[
  ["machoire","Mâchoire","🐺",1,8,"leech",1.15,"Morsure de Terre qui soigne légèrement.","terre"],
  ["proie","Proie","🎯",15,22,"weaken",.30,"Réduit les dégâts du monstre pendant 12 s.","terre"],
  ["rage","Rage","🔴",45,27,"fury",.43,"Accroît les dégâts pendant 10 s.","terre"]],
 forgelance:[
  ["javelot","Javelot","🔱",1,7,"strike",1.23,"Frappe de Terre.","terre"],
  ["estoc","Estoc","🛡️",15,22,"shield",.26,"Protection issue du maniement de la lance.","terre"],
  ["deferlante","Déferlante","🌊",45,20,"blast",1.86,"Attaque de zone adaptée en frappe Air.","air"]]
};
const SPELL_BY_ID=Object.fromEntries(Object.entries(CLASS_SPELLS)
 .map(([cls,spells])=>[cls,Object.fromEntries(spells.map(sp=>[sp[0],sp]))]));
function classSpells(){return CLASS_SPELLS[state.classId]||CLASS_SPELLS.iop}
function spellReady(spell,a=state.action){
 return !!a&&a.type==="combat"&&(!a.respawnRemaining)&&
  playerLevel()>=spell[3]&&(Number(a.spellCooldowns?.[spell[0]])||0)<=0&&
  (Number(a.spellGlobalTimer)||0)<=0;
}
function spellAutoEnabled(id){return state.spellPreferences?.[state.classId+":"+id]!==false}
function toggleSpellAuto(id){
 if(!SPELL_BY_ID[state.classId]?.[id])return;
 if(!state.spellPreferences)state.spellPreferences={};
 const key=state.classId+":"+id;
 state.spellPreferences[key]=!spellAutoEnabled(id);
 render();save();
}
function ensureSpellAction(a){
 if(a.spellClass!==state.classId){
  a.spellClass=state.classId;a.spellCooldowns={};a.spellBuffs={};
  a.spellShield=0;a.spellDot=null;a.spellGlobalTimer=0;a.spellClock=0;a.spellHistory=[];
 }
 a.spellCooldowns=a.spellCooldowns||{};
 a.spellBuffs=a.spellBuffs||{};
 a.spellHistory=a.spellHistory||[];
}
function spellBuff(a,key){return a?.spellBuffs?.[key]?.remaining>0?a.spellBuffs[key].value:0}
function combatAttackInterval(a=state.action){
 return Math.max(.5,(1.65-(state.upgrades.weapon||0)*.025)*(1-spellBuff(a,"haste")));
}
function effectiveCombatCrit(a=state.action){return clamp(criticalChance()+spellBuff(a,"crit"),.01,.9)}
function effectiveCombatDamage(a=state.action){return Math.max(1,Math.round(damage()*(1+spellBuff(a,"fury"))))}

function spellIconMeta(cls,id){return window.DOFUS_IDLE_SPELL_ASSETS?.[cls+":"+id]||null}
function spellArt(cls,id,emoji="✨",cssClass="fd-spell-art"){
 const meta=spellIconMeta(cls,id);
 if(!meta?.src)return E("span",{className:cssClass+" fd-spell-emoji"},emoji);
 const img=E("img",{className:cssClass,src:"./"+meta.src,
  alt:"Icône du sort "+(meta.officialName||id),loading:"lazy",decoding:"async",
  onerror:e=>{e.target.replaceWith(E("span",{className:cssClass+" fd-spell-emoji"},emoji))}});
 img.title=meta.mapping==="exact"?"Icône DOFUS : "+meta.officialName:
  "Illustration DOFUS : "+meta.officialName+" (sort idle adapté)";
 return img;
}
function emitSpellCastEffect(spell){
 if(!spell||state.view!=="combat")return;
 const kind=spell[5],onEnemy=["strike","blast","execute","leech","dot","slow","weaken"].includes(kind);
 const anchor=onEnemy?$(".fd-enemy-panel .fd-enemy-hero"):$(".fd-player-panel .fd-hp-label");
 if(!anchor)return;
 const r=anchor.getBoundingClientRect();
 const fx=E("div",{className:"fd-cast-fx fd-cast-fx-"+(spell[8]||"soutien")+" "+
  (onEnemy?"fd-cast-fx-enemy":"fd-cast-fx-player"),"aria-hidden":"true"},
  spellArt(state.classId,spell[0],spell[2],"fd-cast-art"),
  E("strong",{},spell[1]));
 const vw=window.innerWidth||1100,vh=window.innerHeight||700;
 fx.style.left=Math.max(50,Math.min(vw-50,r.width?r.left+r.width/2:(onEnemy?vw*.7:vw*.3)))+"px";
 fx.style.top=Math.max(50,Math.min(vh-50,r.height?r.top+r.height/2:vh*.3))+"px";
 document.body.append(fx);
 if(document.querySelectorAll(".fd-cast-fx").length>12)document.querySelector(".fd-cast-fx")?.remove();
 fx.addEventListener("animationend",()=>fx.remove(),{once:true});
 setTimeout(()=>fx.remove(),1600);
}

function spellHistory(a,spell,description){
 a.spellHistory.unshift({id:spell[0],icon:spell[2],name:spell[1],text:description});
 a.spellHistory=a.spellHistory.slice(0,6);
 state.spellCasts=(Number(state.spellCasts)||0)+1;
 state.spellCastsById=state.spellCastsById||{};
 const key=state.classId+":"+spell[0];
 state.spellCastsById[key]=(state.spellCastsById[key]||0)+1;
}
function emitSpellFloat(target,text,icon="✨"){
 if(state?.view!=="combat"||typeof document==="undefined")return;
 const anchor=target==="enemy"?$(".fd-enemy-panel .fd-enemy-hero"):
  $(".fd-player-panel .fd-hp-label");
 if(!anchor)return;
 const r=anchor.getBoundingClientRect();
 const node=E("span",{className:"fd-spell-floating "+(target==="enemy"?"fd-spell-floating-enemy":"fd-spell-floating-player"),
  "aria-hidden":"true"},icon+" "+text);
 const w=window.innerWidth||1100,h=window.innerHeight||700;
 const x=r.width>0?r.left+r.width*.5:(target==="enemy"?w*.72:w*.25);
 const y=r.height>0?r.top+r.height*.45:(target==="enemy"?h*.33:h*.25);
 node.style.left=Math.max(44,Math.min(w-44,x))+"px";
 node.style.top=Math.max(42,Math.min(h-42,y))+"px";
 document.body.append(node);
 if(document.querySelectorAll(".fd-spell-floating").length>14)document.querySelector(".fd-spell-floating")?.remove();
 node.addEventListener("animationend",()=>node.remove(),{once:true});
 setTimeout(()=>node.remove(),1600);
}
function spellHit(a,m,spell,multiplier=1){
 const elem={terre:"force",feu:"intelligence",eau:"chance",air:"agilite"}[spell[8]]||"force";
 const bonus=(statValue(elem)+gearStat(elem)+gearStat("power"))*.035;
 const crit=Math.random()<effectiveCombatCrit(a);
 const threshold=spell[5]==="execute"&&a.enemyHp/m[2]<=.4?1.65:1;
 const total=Math.max(1,Math.round((effectiveCombatDamage(a)*spell[6]*multiplier+bonus)*
  threshold*(crit?1.7:1)));
 const amount=isDungeonBoss(a)&&a.dungeonRun.bossPhase==="bouclier"?Math.max(1,Math.round(total*.65)):total;
 const hit=Math.min(Math.max(0,a.enemyHp),amount);
 a.enemyHp=Math.max(0,a.enemyHp-amount);
 emitDamageNumber("enemy",amount,crit,spell[2]+" "+spell[1]);
 return hit;
}
function castClassSpell(spellId,manual=false){
 const spell=SPELL_BY_ID[state.classId]?.[spellId],a=state.action;
 if(!spell||!a||a.type!=="combat"||!world.monsters[String(a.id)]){if(manual)toast("Lance un combat pour utiliser tes sorts.");return false}
 ensureSpellAction(a);
 if(playerLevel()<spell[3]){if(manual)toast("Sort débloqué au niveau "+spell[3]+".");return false}
 if(!spellReady(spell,a)){if(manual)toast("Ce sort est en recharge ou le monstre est vaincu.");return false}
 const m=world.monsters[String(a.id)],type=spell[5],amount=spell[6];
 let text="";
 if(["strike","blast","execute","leech"].includes(type)){
  const dealt=spellHit(a,m,spell);
  text="−"+Math.round(dealt)+" PV";
  if(type==="leech"){
   const heal=Math.min(maxHp()-state.hp,Math.max(1,Math.round(dealt*.30)));
   state.hp=Math.min(maxHp(),state.hp+heal);
   text+=" · +"+heal+" PV";
   if(heal)emitSpellFloat("player","+"+heal+" PV",spell[2]);
  }
 }else if(type==="heal"){
  const heal=Math.min(maxHp()-state.hp,Math.ceil(maxHp()*amount));
  state.hp=Math.min(maxHp(),state.hp+heal);text="+"+heal+" PV";
  emitSpellFloat("player",text,spell[2]);
 }else if(type==="shield"){
  const shield=Math.ceil(maxHp()*amount);
  a.spellShield=Math.min(Math.ceil(maxHp()*.75),(a.spellShield||0)+shield);
  text="+"+shield+" bouclier";
  emitSpellFloat("player",text,spell[2]);
 }else if(type==="dot"){
  a.spellDot={remaining:8,progress:0,damage:Math.max(1,Math.round(damage()*amount)),name:spell[1],icon:spell[2]};
  text="Brûlure : 8 secondes";emitSpellFloat("enemy","Brûlure",spell[2]);
 }else if(type==="summon"){
  a.spellBuffs.summon={remaining:12,value:amount,progress:0,icon:spell[2]};
  text="Allié invoqué : 12 secondes";emitSpellFloat("player","Allié invoqué",spell[2]);
 }else{
  const times={fury:10,crit:11,haste:11,armor:11,evade:11,slow:11,weaken:12,luck:12,regen:12};
  const duration=times[type]||10;
  a.spellBuffs[type]={remaining:duration,value:amount,progress:0,icon:spell[2]};
  text=(type==="regen"?"Régénération":type==="fury"?"Dégâts renforcés":
   type==="crit"?"Critiques renforcés":type==="haste"?"Attaques accélérées":
   type==="armor"?"Protection":type==="evade"?"Esquive":
   type==="slow"?"Monstre ralenti":type==="weaken"?"Monstre affaibli":
   type==="luck"?"Kamas améliorés":"Bonus")+" : "+duration+" s";
  emitSpellFloat(type==="slow"||type==="weaken"?"enemy":"player",text,spell[2]);
 }
 a.spellCooldowns[spell[0]]=spell[4];
 a.spellGlobalTimer=1.2;
 spellHistory(a,spell,text);
 emitSpellCastEffect(spell);
 if(a.enemyHp<=0&&state.action===a)victory(m,a);
 if(manual){render();save()}
 return true;
}
function advanceSpellTimers(a,dt){
 ensureSpellAction(a);
 a.spellClock=(a.spellClock||0)+dt;
 a.spellGlobalTimer=Math.max(0,(a.spellGlobalTimer||0)-dt);
 for(const key of Object.keys(a.spellCooldowns))
  a.spellCooldowns[key]=Math.max(0,(Number(a.spellCooldowns[key])||0)-dt);
 for(const [key,status] of Object.entries(a.spellBuffs)){
  if(!status)continue;
  const activeDt=Math.min(Math.max(0,Number(status.remaining)||0),dt);
  if((key==="regen")&&activeDt>0)
   state.hp=Math.min(maxHp(),state.hp+Math.ceil(maxHp()*status.value*activeDt));
  status.remaining=Math.max(0,status.remaining-dt);
  if(status.remaining<=0)delete a.spellBuffs[key];
 }
}
function advanceCombatDot(a,m,dt){
 if(!a.spellDot||a.enemyHp<=0)return false;
 const dot=a.spellDot;
 const duration=Math.min(Math.max(0,dot.remaining),dt);
 dot.progress=(dot.progress||0)+duration;
 dot.remaining=Math.max(0,dot.remaining-dt);
 let changed=false;
 const ticks=Math.min(8,Math.floor(dot.progress));
 dot.progress-=ticks;
 for(let i=0;i<ticks&&a.enemyHp>0;i++){
  a.enemyHp=Math.max(0,a.enemyHp-dot.damage);changed=true;
  emitDamageNumber("enemy",dot.damage,false,dot.icon+" "+dot.name);
  if(a.enemyHp<=0){victory(m,a);return true}
 }
 if(!dot.remaining)a.spellDot=null;
 return changed;
}
function advanceCombatSummon(a,m,dt){
 const summ=a.spellBuffs?.summon;if(!summ||a.enemyHp<=0)return false;
 summ.progress=(summ.progress||0)+dt;
 const n=Math.min(8,Math.floor(summ.progress/2.5));
 summ.progress-=n*2.5;
 let changed=false;
 for(let i=0;i<n&&a.enemyHp>0;i++){
  const dmg=Math.max(1,Math.round(damage()*summ.value));
  a.enemyHp=Math.max(0,a.enemyHp-dmg);changed=true;
  emitDamageNumber("enemy",dmg,false,summ.icon+" Invocation");
  if(a.enemyHp<=0){victory(m,a);return true}
 }
 return changed;
}
function castAutoSpell(a){
 if(a.spellClock<2||a.spellGlobalTimer>0||a.respawnRemaining||a.enemyHp<=0)return false;
 const available=classSpells().filter(sp=>spellAutoEnabled(sp[0])&&spellReady(sp,a));
 // Le soigneur n'emploie pas ses soins si les PV sont quasiment pleins.
 const chosen=available.find(sp=>
  (sp[5]!=="heal"&&sp[5]!=="regen")||state.hp/maxHp()<.78);
 if(!chosen)return false;
 return castClassSpell(chosen[0],false);
}

function statValue(key){return Math.max(0,Math.floor(Number(state.characteristics?.[key])||0))}
function statCost(key,value){
 if(key==="vitalite")return 1;
 if(key==="sagesse")return 3;
 return 1+Math.min(4,Math.floor(value/100));
}
function statsSpent(){
 return STAT_DEFS.reduce((total,[key])=>{
  const n=statValue(key);
  if(key==="vitalite")return total+n;
  if(key==="sagesse")return total+n*3;
  let cost=0;for(let i=0;i<n;i++)cost+=statCost(key,i);
  return total+cost;
 },0);
}
function availableStats(){return Math.max(0,(playerLevel()-1)*5-statsSpent())}
function spendStat(key,count=1){
 if(!STAT_DEFS.some(x=>x[0]===key))return;
 let got=0;
 while(count-->0){
  const c=statCost(key,statValue(key));
  if(availableStats()<c)break;
  state.characteristics[key]=(state.characteristics[key]||0)+1;got++;
 }
 if(got){toast("Caractéristique améliorée : +"+got+" "+STAT_DEFS.find(x=>x[0]===key)[2]);render();save()}
}
function resetStats(){
 if(!statsSpent())return;
 if(!confirm("Réinitialiser tous les points de caractéristiques ? Cette action est gratuite dans ce prototype."))return;
 state.characteristics={};state.hp=Math.min(state.hp,maxHp());render();save();
}
function changeClass(id){
 if(!CLASS_BY_ID[id]||state.classId===id)return;
 state.classId=id;state.classSelected=true;
 if(state.action?.type==="combat"){
  state.action.spellClass=null;ensureSpellAction(state.action);
 }
 state.hp=clamp(state.hp,1,maxHp());
 toast("Nouvelle classe : "+CLASS_BY_ID[id][1]);
 render();save();
}
function classArt(id,cls="fd-class-art"){
 const icon=CLASS_BY_ID[id];
 const asset=window.DOFUS_IDLE_CLASS_ASSETS?.[id];
 if(!asset)return E("span",{className:cls+" fd-class-emoji"},icon?.[2]||"🧙");
 return E("img",{className:cls,src:asset,alt:"Classe "+icon[1],loading:"lazy",onerror:e=>{e.target.replaceWith(E("span",{className:cls+" fd-class-emoji"},icon[2]))}});
}
const ACHIEVEMENTS=[
 ["combat","Premier combat","Remporter son premier combat","kills",1,60,25],
 ["combat","Apprenti combattant","Vaincre 25 monstres","kills",25,300,150],
 ["combat","Chasseur aguerri","Vaincre 100 monstres","kills",100,800,400],
 ["combat","Terreur des monstres","Vaincre 500 monstres","kills",500,2500,1200],
 ["combat","Combattant légendaire","Vaincre 2 000 monstres","kills",2000,6500,3000],
 ["exploration","Premiers pas","Découvrir une zone de combat","zones",1,120,60],
 ["exploration","Explorateur","Explorer 10 zones différentes","zones",10,650,250],
 ["exploration","Tour du Monde des Douze","Explorer 50 zones","zones",50,2500,1200],
 ["exploration","Voyageur des Douze","Visiter 5 régions","regions",5,1200,500],
 ["exploration","Grand voyageur","Visiter 15 régions","regions",15,4000,2000],
 ["metiers","Mes premières ressources","Récolter 10 ressources","gather",10,100,50],
 ["metiers","Récolteur assidu","Récolter 250 ressources","gather",250,750,350],
 ["metiers","Maître de la récolte","Récolter 2 000 ressources","gather",2000,3500,1500],
 ["metiers","Premier objet fabriqué","Fabriquer un équipement ou objet","craft",1,120,80],
 ["metiers","Artisan reconnu","Fabriquer 100 objets","craft",100,800,350],
 ["metiers","Grand artisan","Fabriquer 1 000 objets","craft",1000,4500,1700],
 ["personnage","Nouveau départ","Atteindre le niveau 5","level",5,150,70],
 ["personnage","Vétéran","Atteindre le niveau 25","level",25,750,300],
 ["personnage","Héros du Monde des Douze","Atteindre le niveau 100","level",100,6000,3000],
 ["personnage","Légende vivante","Atteindre le niveau 200","level",200,20000,10000],
 ["personnage","Premier entraînement","Distribuer 5 points de caractéristiques","stats",5,180,80],
 ["personnage","Maîtrise des caractéristiques","Distribuer 100 points","stats",100,1200,500],
 ["butin","Premier trésor","Obtenir un butin de monstre","loot",1,160,80],
 ["butin","Collectionneur","Obtenir 100 objets de monstres","loot",100,900,450],
 ["butin","Chasseur d'équipement","Obtenir son premier équipement bonus","gear",1,500,200],
 ["butin","Roi du butin","Obtenir 25 équipements bonus","gear",25,4500,2000],
 ["butin","Connaisseur","Vaincre 25 espèces de monstres différentes","species",25,1500,650]
].map(([cat,title,desc,metric,target,kamas,xp],index)=>({id:"success-"+index,cat,title,desc,metric,target,kamas,xp}));
const ACH_GROUPS={
 combat:"⚔️ Combats",bestiaire:"🐉 Bestiaire",exploration:"🧭 Exploration",
 metiers:"🪓 Métiers",recolte:"🌿 Récoltes",artisanat:"🔨 Artisanat",
 personnage:"🧙 Personnage",butin:"🎁 Butins",equipements:"🛡️ Équipements",economie:"🪙 Économie"
};

/* Succès générés depuis les données du client DOFUS 3.
   Les 27 ID existants sont conservés, les nouveaux IDs sont stables et
   les récompenses/conditions sont conçues pour DOFUS IDLE, non officielles. */
let achievementCatalog=[...ACHIEVEMENTS];
let achievementCategory="all",achievementStatus="all",achievementSort="progress";
let achievementQuery="",achievementPage=0;
const ACH_PAGE_SIZE=32;
const achievementNum=x=>Math.max(0,Math.floor(Number(x)||0));
const achievementKey=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function achievementObject(id,cat,title,desc,metric,target,kamas,xp,points=1){
 return {id,cat,title,desc,metric,target,kamas,xp,points};
}
function buildAchievementCatalog(){
 const all=[...ACHIEVEMENTS];
 const push=(id,cat,title,desc,metric,target,kamas,xp,points)=>
  all.push(achievementObject(id,cat,title,desc,metric,target,kamas,xp,points));
 // Progressions globales toujours accessibles, y compris sur anciens profils.
 for(const [metric,cat,label,thresholds] of [
  ["kills","combat","Victoire",[5,10,50,250,1000,5000,10000,25000]],
  ["species","bestiaire","Créatures différentes vaincues",[5,10,50,100,250,500,1000,2500,5000]],
  ["zones","exploration","Sous-zones découvertes",[5,25,100,200,350,500]],
  ["regions","exploration","Régions visitées",[2,10,20,40]],
  ["gather","recolte","Ressources récoltées",[25,100,500,1000,5000,25000,100000]],
  ["craft","artisanat","Objets fabriqués",[5,25,50,250,500,2500,10000]],
  ["loot","butin","Objets obtenus en combat",[10,50,250,500,1000,5000,25000]],
  ["gear","equipements","Équipements bonus obtenus",[2,5,10,50,100,250]],
  ["sold","economie","Objets vendus",[10,100,500,2500,10000]],
  ["banked","economie","Butins rangés en banque",[10,100,500,2500,10000]],
  ["time","personnage","Heures d'activité",[1,5,10,25,50,100,250,500]],
  ["level","personnage","Niveau de personnage",[10,50,75,125,150,175]],
  ["stats","personnage","Points de caractéristiques utilisés",[20,50,250,500,900]],
  ["recipesKnown","artisanat","Recettes différentes fabriquées",[1,10,25,50,100,250,500,1000,2500,4500]],
  ["resourcesKnown","recolte","Types de ressources récoltées",[1,5,10,25,50,85]],
  ["equipped","equipements","Emplacements d'équipement équipés",[1,2,4,6,8]]
 ]){
  for(const target of thresholds){
   const numericTarget=metric==="time"?target*3600:target;
   push("extra-"+metric+"-"+target,cat,label+" : "+target+(metric==="time"?" h":""),
    "Atteindre "+target+(metric==="time"?" heure(s) d'activité":" — "+label.toLowerCase())+".",
    metric,numericTarget,Math.min(5000,80+target*4),Math.min(2500,40+target*2),target>=100?10:target>=25?5:2);
  }
 }
 // Chaque métier a ses propres objectifs de niveau et de fabrication.
 for(const [jid,job] of Object.entries(core.jobs)){
  for(const level of [5,10,20,40,60,80,100,125,150,175,200]){
   push("job-level-"+jid+"-"+level,"metiers",job[0]+" · Niveau "+level,
    "Atteindre le niveau "+level+" de "+job[0]+".","job:"+jid,level,
    level*24,level*12,level>=150?15:level>=80?8:3);
  }
  if(core.recipes[jid]?.length){
   for(const n of [1,10,50,100,500]){
    push("job-craft-"+jid+"-"+n,"artisanat",job[0]+" · "+n+" fabrications",
     "Fabriquer "+n+" objets avec le métier "+job[0]+".","jobCraft:"+jid,n,
     Math.min(6000,80+n*8),Math.min(3000,35+n*4),n>=100?10:3);
   }
  }
 }
 // 85 ressources récoltables, avec 4 paliers de maîtrise chacune.
 const resourceJobs=new Map();
 for(const [jid,rows] of Object.entries(core.gather)){
  for(const row of rows)if(!resourceJobs.has(String(row[0])))resourceJobs.set(String(row[0]),jid);
 }
 for(const [iid,jid] of resourceJobs){
  const name=itemName(iid),job=jobName(jid),level=itemLevel(iid);
  for(const count of [1,25,250,1000]){
   push("resource-"+iid+"-"+count,"recolte",name+" · "+count+" récoltes",
    "Récolter "+count+" fois "+name+" ("+job+").","harvest:"+iid,count,
    Math.min(2500,50+level*2+count),Math.min(1500,25+level+Math.round(count/2)),count>=250?8:2);
  }
 }
 // Le bestiaire complet, avec des paliers de chasse pour chaque monstre.
 for(const [mid,m] of Object.entries(world.monsters)){
  if(!m?.[0])continue;
  for(const count of [1,10,50]){
   const title=count===1?m[0]+" · Première victoire":m[0]+" · "+count+" victoires";
   push("monster-"+mid+"-"+count,"bestiaire",title,
    "Vaincre "+count+" fois "+m[0]+" (niveau "+m[1]+").","monster:"+mid,count,
    Math.min(3500,60+Math.round(m[1]*1.5)+count*8),
    Math.min(2000,30+Math.round(m[1])+(count*3)),count>=50?10:count>=10?5:2);
  }
 }
 // Explore et maîtrise les sous-zones réellement utilisées dans le jeu.
 const regions=new Map();
 for(const [zid,z] of Object.entries(world.zones)){
  if(!z?.[3]?.length)continue;
  const region=regionFor(z);
  if(!regions.has(region))regions.set(region,[]);
  regions.get(region).push(zid);
  push("zone-visit-"+zid,"exploration","Découvrir : "+z[0],
   "Visiter "+z[0]+" dans "+region+".","visitZone:"+zid,1,
   50+z[2]*2,35+z[2],2);
  for(const count of [10,50]){
   push("zone-fight-"+zid+"-"+count,"exploration",z[0]+" · "+count+" victoires",
    "Remporter "+count+" combats dans "+z[0]+".","zoneKills:"+zid,count,
    Math.min(3000,120+z[2]*3+count*4),Math.min(1800,60+z[2]*2+count*2),count>=50?10:5);
  }
 }
 for(const [region,zones] of regions){
  for(const n of [1,Math.min(5,zones.length),zones.length]){
   if(n<1)continue;
   push("region-zones-"+achievementKey(region)+"-"+n,"exploration",
    region+" · "+n+" zone"+(n>1?"s":""),
    "Découvrir "+n+" zone(s) de "+region+".","regionZones:"+region,n,
    Math.min(5000,120+n*100),Math.min(2500,60+n*50),n===zones.length?12:3);
  }
 }
 // Chaque recette réelle offre au moins une réussite. Les anciennes
 // sauvegardes n'avaient qu'un total, ces succès spécifiques commencent
 // donc à compter lors des nouvelles fabrications.
 for(const [jid,recipes] of Object.entries(core.recipes)){
  for(const [itemId,level] of recipes){
   const key=jid+":"+itemId;
   push("recipe-first-"+jid+"-"+itemId,"artisanat","Premier craft : "+itemName(itemId),
    "Fabriquer "+itemName(itemId)+" avec "+jobName(jid)+" (niveau "+level+").",
    "recipe:"+key,1,Math.min(600,45+level*3),Math.min(400,25+level*2),2);
  }
 }
 const ids=new Set();
 achievementCatalog=all.filter(a=>{
  if(ids.has(a.id))return false;
  ids.add(a.id);
  a.search=achievementKey(a.title+" "+a.desc+" "+(ACH_GROUPS[a.cat]||a.cat));
  a.points=a.points||Math.max(1,Math.min(10,Math.ceil(a.target/100)));
  return true;
 });
}

function achievementValue(metric){
 if(metric.startsWith("monster:"))return achievementNum(state.dex?.[metric.slice(8)]);
 if(metric.startsWith("job:"))return jobLevel(metric.slice(4));
 if(metric.startsWith("jobCraft:"))return achievementNum(state.jobCraftCount?.[metric.slice(9)]);
 if(metric.startsWith("harvest:"))return achievementNum(state.mastery?.[metric.slice(8)]);
 if(metric.startsWith("recipe:"))return achievementNum(state.craftedRecipes?.[metric.slice(7)]);
 if(metric.startsWith("visitZone:"))return state.visitedZones?.[metric.slice(10)]?1:0;
 if(metric.startsWith("zoneKills:"))return achievementNum(state.zoneKills?.[metric.slice(10)]);
 if(metric.startsWith("regionZones:")){
  const name=metric.slice(12);
  return achievementNum(state.regionZoneCount?.[name]||
   Object.keys(state.visitedZones||{}).filter(zid=>world.zones[zid]&&regionFor(world.zones[zid])===name).length);
 }
 if(metric==="kills")return achievementNum(state.kills);
 if(metric==="zones")return Object.keys(state.visitedZones||{}).length;
 if(metric==="regions")return Object.keys(state.visitedRegions||{}).length;
 if(metric==="gather")return achievementNum(state.gathered);
 if(metric==="craft")return achievementNum(state.crafted);
 if(metric==="level")return playerLevel();
 if(metric==="stats")return statsSpent();
 if(metric==="loot")return achievementNum(state.lootCount);
 if(metric==="gear")return Object.values(state.gearDrops||{}).reduce((s,n)=>s+achievementNum(n),0);
 if(metric==="species")return Object.values(state.dex||{}).filter(n=>achievementNum(n)>0).length;
 if(metric==="sold")return achievementNum(state.itemsSold);
 if(metric==="banked")return achievementNum(state.itemsBanked);
 if(metric==="time")return Math.floor(Number(state.totalSeconds)||0);
 if(metric==="recipesKnown")return Object.values(state.craftedRecipes||{}).filter(n=>achievementNum(n)>0).length;
 if(metric==="resourcesKnown")return Object.values(state.mastery||{}).filter(n=>achievementNum(n)>0).length;
 if(metric==="equipped")return Object.values(state.equipment||{}).filter(Boolean).length;
 return 0;
}
function achievementReached(a){return achievementValue(a.metric)>=a.target}
function achievementsScore(){return achievementCatalog.reduce((sum,a)=>sum+(state.achievements?.[a.id]?(a.points||1):0),0)}
function achievementsClaimed(){return achievementCatalog.reduce((n,a)=>n+(state.achievements?.[a.id]?1:0),0)}


function toggleTrackAchievement(id){
 const a=achievementCatalog.find(x=>x.id===id);if(!a)return;
 if(!Array.isArray(state.trackedAchievements))state.trackedAchievements=[];
 if(state.trackedAchievements.includes(id))
  state.trackedAchievements=state.trackedAchievements.filter(x=>x!==id);
 else {
  if(state.trackedAchievements.length>=3){toast("Tu peux suivre jusqu'à 3 succès simultanément.");return}
  if(state.achievements[id]){toast("Ce succès a déjà été obtenu.");return}
  state.trackedAchievements.push(id);
 }
 render();save();
}
function trackedAchievementsPanel(){
 const ids=(state.trackedAchievements||[]).filter(Boolean);
 const cards=E("div",{className:"fd-tracked-list"});
 for(const id of ids){
  const a=achievementCatalog.find(x=>x.id===id);if(!a)continue;
  const value=achievementValue(a.metric),done=value>=a.target;
  cards.append(E("div",{className:"fd-tracked-card"},
   E("div",{className:"fd-tracked-card-title"},
    E("strong",{},a.title),pill(money(Math.min(value,a.target))+" / "+money(a.target))),
   meter(value/a.target*100),
   E("div",{className:"fd-tracked-card-actions"},
    done&&!state.achievements[id]?B("🏆 Récupérer",()=>claimAchievement(id),"fd-mini"):null,
    B("✕ Retirer",()=>toggleTrackAchievement(id),"fd-mini"))));
 }
 return E("section",{className:"fd-tracked-goals"},
  E("div",{className:"fd-loot-stash-heading"},
   E("strong",{},"🎯 Objectifs suivis"),
   pill(cards.childNodes.length+" / 3")),
  cards.childNodes.length?cards:E("p",{className:"fd-muted"},"Suis jusqu'à trois succès pour garder tes objectifs sous les yeux pendant les combats."),
  B("🏆 Parcourir les succès",()=>runNav("achievements"),"fd-secondary fd-wide"));
}

function claimAchievement(id){
 const a=achievementCatalog.find(x=>x.id===id);
 if(!a||state.achievements[id]||!achievementReached(a))return;
 state.achievements[id]=Date.now();
 state.trackedAchievements=(state.trackedAchievements||[]).filter(x=>x!==id);
 state.kamas+=a.kamas;state.earned+=a.kamas;state.playerXp+=a.xp;
 toast("🏆 Succès obtenu : "+a.title+" ! +"+a.kamas+" kamas, +"+a.xp+" XP");
 render();save();
}
function visitZone(id){
 const z=world.zones[String(id)];if(!z)return;
 const region=regionFor(z);
 if(!state.visitedZones[String(id)]){
  state.regionZoneCount[region]=(state.regionZoneCount[region]||0)+1;
 }
 state.visitedZones[String(id)]=true;
 state.visitedRegions[region]=true;
}

const now=()=>Date.now();
function xpNeed(l){return Math.round(42+17*Math.pow(l,1.62))}
function levelOf(total){
 let left=Math.max(0,Number(total)||0),lv=1;
 while(lv<LEVEL_MAX){const need=xpNeed(lv);if(left<need)break;left-=need;lv++}
 return {level:lv,xp:left,next:lv===LEVEL_MAX?1:xpNeed(lv),ratio:lv===LEVEL_MAX?100:100*left/xpNeed(lv)};
}
function jobLevel(id){return levelOf(state.jobs[id]||0).level}
function playerLevel(){return levelOf(state.playerXp).level}
function maxHpFor(gear=state.equipment){
 const vit=gearStatsFor(gear).stats.vitalite||0;
 return Math.max(1,Math.ceil((105+playerLevel()*8+(state.upgrades.armor||0)*12+statValue("vitalite")+vit)*(state.classId==="sacrieur"?1.35:1)));
}
function maxHp(){return maxHpFor(state.equipment)}
/* Référentiel de jets du client DOFUS 3 — valeur médiane, sans jet aléatoire.
   L'ID est celui de l'effet/action officiel, sa caractéristique provient de EffectData. */
const CHARACTERISTIC_KEYS={
 "1":"ap","10":"force","11":"vitalite","12":"sagesse","13":"chance",
 "14":"agilite","15":"intelligence","18":"critical","19":"range","23":"mp",
 "25":"power","48":"prospection","44":"initiative"
};
const BONUS_LABELS={vitalite:"Vitalité",force:"Force",intelligence:"Intelligence",
 chance:"Chance",agilite:"Agilité",sagesse:"Sagesse",power:"Puissance",
 critical:"Coups critiques",ap:"PA",mp:"PM",range:"PO",prospection:"Prospection",
 initiative:"Initiative",damage:"Dommages",damageFire:"Dommages Feu",
 damageWater:"Dommages Eau",damageEarth:"Dommages Terre",damageAir:"Dommages Air",
 damageNeutral:"Dommages Neutre",resistance:"Résistance fixe",
 resistancePct:"Résistance %",healing:"Soins"};
function gearEffectKey(effectId){
 const def=equipmentData?.effects?.[String(effectId)];
 if(!def)return null;
 const char=CHARACTERISTIC_KEYS[String(def[1])];
 if(char)return char;
 const name=String(def[0]||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 if(name.includes("dommages")){
  if(/poussee|piege|critique|sort|arme|melee|distance/.test(name))return null;
  if(/feu/.test(name))return "damageFire";
  if(/eau/.test(name))return "damageWater";
  if(/terre/.test(name))return "damageEarth";
  if(/air/.test(name))return "damageAir";
  if(/neutre/.test(name))return "damageNeutral";
  if(!name.includes("%"))return "damage";
 }
 if(/resistance/.test(name)){
  if(/poussee|critique|melee|distance|sort|arme/.test(name))return null;
  return name.includes("%")?"resistancePct":"resistance";
 }
 if(/soins/.test(name))return "healing";
 return null;
}
function gearEffectValue(line){
 const [eid,lo,hi]=line;
 let min=Number(lo)||0,max=Number(hi)||min;
 if(max<min)[min,max]=[max,min];
 const sign=equipmentData?.effects?.[String(eid)]?.[2]==="-"?-1:1;
 return Math.round((min+max)/2)*sign;
}
function gearStatsFor(equipment){
 const stats={},setCounts={},detail=[];
 const addLine=(line,source)=>{
  const key=gearEffectKey(line[0]);const amount=gearEffectValue(line);
  if(key&&amount)stats[key]=(stats[key]||0)+amount;
  detail.push({line,source,key,value:amount});
 };
 for(const [slot,rawId] of Object.entries(equipment||{})){
  const id=String(rawId||"");
  if(!id||!core.items[id])continue;
  const entry=equipmentData?.items?.[id];
  if(!entry)continue;
  for(const line of entry[1]||[])addLine(line,slot);
  const setId=Number(entry[0]);
  if(setId>=0&&(equipmentData.sets?.[String(setId)])){
   if(!setCounts[setId])setCounts[setId]=new Set();
   setCounts[setId].add(id);
  }
 }
 const sets=[];
 for(const [setId,ids] of Object.entries(setCounts)){
  const def=equipmentData.sets[setId];if(!def)continue;
  const count=ids.size,bonuses=def[2]?.[count-1]||[];
  sets.push({id:setId,name:def[0],count,total:def[1].length,bonuses,items:def[1]});
  // Chaque palier est un bonus total : ne pas cumuler les paliers inférieurs.
  if(count>=2)for(const line of bonuses)addLine(line,"set:"+setId);
 }
 return {stats,sets,detail};
}
function currentGearStats(){return gearStatsFor(state?.equipment||{}).stats}
function gearStat(name){return Number(currentGearStats()[name]||0)}
function equippedBonus(type){
 const gear=currentGearStats();
 if(type==="hp")return Number(gear.vitalite||0);
 if(type==="atk")return Number(gear.damage||0)+Number(gear.power||0)*.08;
 if(type==="def")return Number(gear.resistance||0)+Number(gear.resistancePct||0)*.25;
 return 0;
}
function equippedSetInfo(){return gearStatsFor(state.equipment).sets}
function statTooltip(line){
 const [effectId,lo,hi]=line;
 const def=equipmentData?.effects?.[String(effectId)];
 const name=def?.[0]||"Effet n°"+effectId;
 const symbol=def?.[2]==="-"?"−":"+";
 const range=lo===hi?String(lo):String(lo)+" à "+String(hi);
 return symbol+" "+range+" "+name;
}
function itemEffects(id){return equipmentData?.items?.[String(id)]?.[1]||[]}
function itemSetInfo(id){
 const sid=equipmentData?.items?.[String(id)]?.[0];
 return sid!=null&&sid>=0?equipmentData?.sets?.[String(sid)]:null;
}

function damageFor(gear=state.equipment){
 const focus=CLASS_BY_ID[state.classId]?.[5]||"force";
 const stats=gearStatsFor(gear).stats,elemental=statValue(focus)+(stats[focus]||0);
 const dmgKey={force:"damageEarth",intelligence:"damageFire",chance:"damageWater",agilite:"damageAir"}[focus];
 const flat=(stats.damage||0)+(stats[dmgKey]||0);
 return Math.max(1,Math.ceil((9+playerLevel()*2.2+elemental*.16+(stats.power||0)*.08+flat+
  (state.upgrades.weapon||0)*6)*(state.classId==="iop"?1.2:state.classId==="ouginak"?1.15:1)));
}
function damage(){return damageFor(state.equipment)}
function defenseFor(gear=state.equipment){
 const stats=gearStatsFor(gear).stats;
 return Math.max(0,Math.floor(playerLevel()*.4+(statValue("agilite")+(stats.agilite||0))*.07+
  (stats.resistance||0)+(stats.resistancePct||0)*.25+
  (state.upgrades.armor||0)*3+(state.classId==="feca"?5:0)));
}
function defense(){return defenseFor(state.equipment)}
function criticalChance(gear=state.equipment){
 const stats=gearStatsFor(gear).stats;
 return clamp(.05+(state.classId==="cra"?.11:state.classId==="sram"?.09:0)+
  (statValue("agilite")+(stats.agilite||0))*.00015+(stats.critical||0)/100,.01,.75);
}
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
 if(/dofus|trophée|trophee|prysmaradite/.test(n))return "dofus1";
 if(/familier|montilier/.test(n))return "pet";
 if(/monture/.test(n))return "mount";
 if(/épée|dague|arc|baguette|bâton|hache|marteau|pelle|faux|arme|pioche/.test(n))return "weapon";
 return "";
}
function availableGearSlots(id){
 const slot=gearSlot(id);
 if(!slot)return [];
 if(slot==="ring")return ["ring","ring2"];
 if(slot==="dofus1")return ["dofus1","dofus2","dofus3","dofus4","dofus5","dofus6"];
 return [slot];
}
function preferredGearSlot(id){
 const slots=availableGearSlots(id);
 return slots.find(x=>!state.equipment[x])||slots[0]||"";
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
  equipment:{weapon:null,head:null,cape:null,ring:null,ring2:null,boots:null,belt:null,neck:null,shield:null,pet:null,mount:null,dofus1:null,dofus2:null,dofus3:null,dofus4:null,dofus5:null,dofus6:null},
  upgrades:{bank:0,tool:0,weapon:0,armor:0,fortune:0},
  action:null,selectedMonster:"979",selectedZone:"444",selectedRegion:"",combatMode:"zones",combatSort:"asc",gearDrops:{},unlocked:{},dex:{},log:[],
  pendingLoot:{},lootCount:0,characteristics:{},achievements:{},visitedZones:{},visitedRegions:{},classSelected:false,
  craftedRecipes:{},jobCraftCount:{},zoneKills:{},itemsSold:0,itemsBanked:0,regionZoneCount:{},trackedAchievements:[],
  spellPreferences:{},spellCasts:0,spellCastsById:{},
  dungeonClears:{},dungeonLastClear:"",questClaims:{},collectionClaims:{},unlockedTitles:[],selectedTitle:"",
  automation:{lootMode:"manual",sellValue:20,healBelow:0,stopBelow:0,switchAfter:0},
  lastAt:now(),totalSeconds:0,migrated:false};
}
function load(){
 let raw=null;
 try{raw=JSON.parse(localStorage.getItem(KEY))}catch(e){}
 if(raw?.version===2&&raw.jobs&&raw.bank){
  return Object.assign(fresh(),raw,{jobs:raw.jobs||{},bank:raw.bank||{},equipment:{...fresh().equipment,...raw.equipment},upgrades:{...fresh().upgrades,...raw.upgrades},gearDrops:raw.gearDrops||{},pendingLoot:raw.pendingLoot||{},characteristics:raw.characteristics||{},achievements:raw.achievements||{},visitedZones:raw.visitedZones||{},visitedRegions:raw.visitedRegions||{},
  craftedRecipes:raw.craftedRecipes||{},jobCraftCount:raw.jobCraftCount||{},zoneKills:raw.zoneKills||{},regionZoneCount:raw.regionZoneCount||{},trackedAchievements:Array.isArray(raw.trackedAchievements)?raw.trackedAchievements.slice(0,3):[],
  spellPreferences:raw.spellPreferences&&typeof raw.spellPreferences==="object"?raw.spellPreferences:{},spellCasts:Number(raw.spellCasts)||0,spellCastsById:raw.spellCastsById||{},
  dungeonClears:raw.dungeonClears||{},questClaims:raw.questClaims||{},collectionClaims:raw.collectionClaims||{},
  unlockedTitles:Array.isArray(raw.unlockedTitles)?raw.unlockedTitles:[],selectedTitle:raw.selectedTitle||"",
  automation:{...fresh().automation,...(raw.automation||{})}});
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

function queueLoot(id,n=1){
 id=String(id);n=Math.max(1,Math.floor(Number(n)||1));
 if(!core.items[id])return false;
 const bag=state.pendingLoot||{};
 if(!bag[id]&&Object.keys(bag).filter(x=>bag[x]>0).length>=250){
  state.action=null;toast("La poche de butin est pleine : libère des objets avant de continuer.");return false;
 }
 bag[id]=(bag[id]||0)+n;state.pendingLoot=bag;
 state.lootCount=(state.lootCount||0)+n;
 return true;
}
function pendingEntries(){return Object.entries(state.pendingLoot||{}).filter(([id,n])=>n>0&&core.items[id])}
function pendingTotal(){return pendingEntries().reduce((n,[id,qty])=>n+qty,0)}
function processPending(mode,id=null){
 const pairs=id!=null?pendingEntries().filter(([key])=>String(key)===String(id)):pendingEntries();
 if(!pairs.length)return;
 if(mode==="discard"&&!confirm("Jeter définitivement "+pairs.reduce((n,x)=>n+x[1],0)+" objet(s) du butin temporaire ?"))return;
 let moved=0,kamas=0;
 for(const [itemId,n] of pairs){
  if(mode==="bank"){
   if(!add(itemId,n))continue;
  }else if(mode==="sell"){
   kamas+=n*itemValue(itemId);
  }else if(mode!=="discard")return;
  moved+=n;delete state.pendingLoot[itemId];
  if(mode==="bank")state.itemsBanked=(state.itemsBanked||0)+n;
  if(mode==="sell")state.itemsSold=(state.itemsSold||0)+n;
 }
 if(mode==="sell"){state.kamas+=kamas;state.earned+=kamas}
 toast(moved?mode==="bank"?"🎒 "+money(moved)+" objets rangés en banque":
  mode==="sell"?"🪙 "+money(moved)+" objets vendus pour "+money(kamas)+" kamas":
   "🗑️ "+money(moved)+" objets jetés":"Aucun transfert : vérifie les emplacements disponibles dans la banque.");
 render();save();
}
function lootStashPanel(){
 const entries=pendingEntries(),total=pendingTotal();
 const block=E("section",{className:"fd-loot-stash"},
  E("div",{className:"fd-loot-stash-heading"},E("strong",{},"🎁 Butin du combat"),
   pill(money(total)+" objet(s) · "+money(entries.length)+" types","gold")),
  E("small",{className:"fd-muted"},"Les objets restent ici jusqu'à récupération, vente ou suppression. Sauvegardé automatiquement."));
 if(!entries.length)block.append(E("p",{className:"fd-loot-stash-empty"},"Aucun butin en attente. Combats un monstre pour gagner des ressources ou du stuff."));
 else{
  const actions=E("div",{className:"fd-loot-stash-actions"},
   B("🎒 Tout récupérer",()=>processPending("bank"),"fd-button"),
   B("🪙 Tout vendre",()=>processPending("sell"),"fd-secondary"),
   B("🗑️ Tout jeter",()=>processPending("discard"),"fd-danger"));
  block.append(actions);
  const grid=E("div",{className:"fd-loot-stash-grid"});
  for(const [id,n] of entries.slice(0,72)){
   const card=E("div",{className:"fd-stash-item"},
    itemSprite(id,"fd-stash-art"),
    E("span",{className:"fd-stash-info"},E("strong",{},itemName(id)),
      E("small",{},money(n)+" × "+typeName(id))),
    pill("× "+money(n)));
   card.append(E("div",{className:"fd-stash-item-actions"},
    B("Banque",()=>processPending("bank",id),"fd-mini"),
    B("Vendre",()=>processPending("sell",id),"fd-mini"),
    B("Jeter",()=>processPending("discard",id),"fd-mini fd-stash-trash")));
   grid.append(card);
  }
  if(entries.length>72)grid.append(E("p",{className:"fd-muted"},"Affichage des 72 premiers types d'objets. Les actions globales gèrent la totalité du butin."));
  block.append(grid);
 }
 return block;
}
function combatLogRow(event){
 if(typeof event==="string")return E("div",{className:"fd-combat-log-row"},E("span",{},event));
 if(!event||typeof event!=="object")return E("div",{className:"fd-combat-log-row"},"Combat");
 const row=E("div",{className:"fd-combat-log-row"});
 const header=E("div",{className:"fd-combat-log-main"},
  event.monsterId?mobSprite(event.monsterId,"fd-combat-log-portrait"):E("span",{className:"fd-combat-log-portrait"},"⚔️"),
  E("span",{},E("strong",{},event.monsterName||"Monstre"),
   E("small",{},event.kind==="defeat"?"Défaite":"Victoire · +"+money(event.kamas||0)+" kamas")));
 row.append(header);
 if(Array.isArray(event.items)&&event.items.length){
  const items=E("div",{className:"fd-combat-log-items"});
  for(const [id,n] of event.items.slice(0,20))items.append(E("span",{className:"fd-combat-log-drop",title:itemName(id)+" × "+n},
   itemSprite(id,"fd-log-art"),E("small",{},itemName(id)+" ×"+money(n))));
  if(event.items.length>20)items.append(E("small",{className:"fd-muted"},"+"+(event.items.length-20)+" autres objets"));
  row.append(items);
 }
 return row;
}

function rollEquipment(m,dropped){
 const pool=possibleEquipment(m[1]),rate=equipmentChance(m);
 if(!pool.length||Math.random()*100>=rate)return null;
 const chosen=pool[Math.floor(Math.random()*pool.length)];
 if(!queueLoot(chosen,1))return null;
 dropped.push(chosen);
 state.gearDrops[chosen]=(state.gearDrops[chosen]||0)+1;
 return chosen;
}

/* En DOFUS IDLE, on autorise un monstre jusqu'à 8 niveaux au-dessus
   de l'aventurier. Le minimum affiché est le vrai seuil appliqué au bouton. */
function minimumCombatLevel(monster){
 const level=typeof monster==="number"?monster:Number(monster?.[1])||1;
 return Math.max(1,Math.ceil(level)-8);
}
function canFight(monster){return !!monster&&playerLevel()>=minimumCombatLevel(monster)}
function zoneCombatMin(zone){
 const levels=(zone?.[3]||[]).map(mid=>world.monsters[String(mid)])
  .filter(Boolean).map(minimumCombatLevel);
 return levels.length?Math.min(...levels):Math.max(1,Number(zone?.[2])||1);
}
function regionCombatMin(zones){
 const values=zones.map(([,z])=>zoneCombatMin(z));
 return values.length?Math.min(...values):1;
}
function regionOrder(a,b,sign=1){
 if(a[0]==="Incarnam")return b[0]==="Incarnam"?0:-1;
 if(b[0]==="Incarnam")return 1;
 const minA=regionCombatMin(a[1]),minB=regionCombatMin(b[1]);
 return sign*(minA-minB)||a[0].localeCompare(b[0],"fr");
}
/* Les chiffres flottants sont dans document.body : ils restent visibles
   pendant la re-création automatique des panneaux de combat (toutes les 900 ms).
   Aucun effet de dégâts n'est écrit dans la sauvegarde. */
let floatingDamageSeq=0;
function emitDamageNumber(target,amount,critical=false,spellName=""){
 if(state?.view!=="combat"||typeof document==="undefined")return;
 const anchor=target==="player"?$(".fd-player-panel .fd-hp-label"):
  $(".fd-enemy-panel .fd-enemy-portrait")||$(".fd-enemy-panel .fd-enemy-hero");
 if(!anchor)return;
 const rect=anchor.getBoundingClientRect();
 const pop=document.createElement("span");
 const side=target==="player"?"player":"enemy";
 pop.className="fd-combat-damage fd-combat-damage-"+side+(critical?" is-critical":" is-normal")+(spellName?" is-spell":"");
 pop.setAttribute("aria-hidden","true");
 pop.textContent=spellName?spellName+(critical?" 💥 COUP CRITIQUE !":"")+" −"+Math.round(amount):
  critical?"💥 COUP CRITIQUE ! −"+Math.round(amount):"−"+Math.round(amount);
 const shift=(floatingDamageSeq++%3-1)*24;
 const width=window.innerWidth||1100,height=window.innerHeight||700;
 const x=rect.width>0?rect.left+rect.width/2+shift:(side==="enemy"?width*.73:width*.23);
 const y=rect.height>0?rect.top+rect.height*.48:(side==="enemy"?height*.35:height*.29);
 pop.style.left=Math.max(38,Math.min(width-38,x))+"px";
 pop.style.top=Math.max(42,Math.min(height-42,y))+"px";
 document.body.appendChild(pop);
 const active=document.querySelectorAll(".fd-combat-damage");
 if(active.length>20)active[0].remove();
 pop.addEventListener("animationend",()=>pop.remove(),{once:true});
 setTimeout(()=>pop.remove(),1500);
}


/* Donjons DOFUS IDLE : les identités et monstres viennent des sous-zones réelles,
   les salles, attaques spéciales et récompenses supplémentaires sont du gameplay idle. */
function dungeonRoomList(zoneId){
 const z=world.zones[String(zoneId)];if(!z)return [];
 const ids=[...new Set(z[3].map(String))].filter(id=>world.monsters[id]&&world.monsters[id][1]>0);
 const level=Number(z[2])||1;
 const pool=ids.filter(id=>world.monsters[id][1]<=level+16);
 const usable=pool.length>=2?pool:ids;
 if(usable.length<2)return [];
 const boss=usable.slice().sort((a,b)=>Math.abs(world.monsters[a][1]-level)-Math.abs(world.monsters[b][1]-level)||world.monsters[b][1]-world.monsters[a][1])[0];
 return [...usable.filter(id=>id!==boss).sort((a,b)=>world.monsters[a][1]-world.monsters[b][1]).slice(0,4),boss];
}
function dungeonRequiredLevel(zoneId){
 const rooms=dungeonRoomList(zoneId);return rooms.length?minimumCombatLevel(world.monsters[String(rooms[rooms.length-1])]):1;
}
function isDungeonBoss(a=state.action){
 return !!a?.dungeonRun&&!a.dungeonRun.completed&&a.dungeonRun.index===a.dungeonRun.rooms.length-1;
}
function startDungeon(zoneId){
 const id=String(zoneId),z=world.zones[id],rooms=dungeonRoomList(id);
 if(!z||Number(z[5])<0||rooms.length<2)return;
 if(playerLevel()<dungeonRequiredLevel(id)){toast("🔒 Niveau "+dungeonRequiredLevel(id)+" requis pour ce boss.");return}
 if(pendingEntries().length>=250){toast("Poche de butin pleine : libère de la place.");return}
 if(state.action?.type==="combat"&&!confirm("Abandonner ton combat et commencer "+z[0]+" ?"))return;
 const m=world.monsters[String(rooms[0])];if(!m)return;
 state.view="combat";state.combatMode="dungeons";
 state.selectedZone=id;state.selectedRegion=regionFor(z);state.selectedMonster=String(rooms[0]);
 combatOpenZone=id;visitZone(id);
 state.action={type:"combat",id:Number(rooms[0]),progress:0,enemyHp:m[2],enemyTick:0,
  spellClass:state.classId,spellCooldowns:{},spellBuffs:{},spellShield:0,spellDot:null,
  spellClock:0,spellHistory:[],spellGlobalTimer:0,
  dungeonRun:{zoneId:id,rooms,index:0,completed:false,specialClock:0,bossPhase:"normal"}};
 if(state.hp<=0)state.hp=maxHp();
 toast("🏰 "+z[0]+" : salle 1 / "+rooms.length);render();save();
}
function dungeonVictory(a,m){
 const d=a.dungeonRun;if(!d||d.completed)return;
 if(d.index===d.rooms.length-1){
  d.completed=true;
  state.dungeonClears=state.dungeonClears||{};
  state.dungeonClears[d.zoneId]=(Number(state.dungeonClears[d.zoneId])||0)+1;
  state.dungeonLastClear=d.zoneId;
  const xp=80+m[1]*12,kamas=60+m[1]*10;
  state.playerXp+=xp;state.kamas+=kamas;state.earned+=kamas;
  const drops=(m[4]||[]).filter(([id,rate])=>core.items[String(id)]&&rate>0).sort((a,b)=>a[1]-b[1]);
  if(drops[0]&&queueLoot(drops[0][0],1))toast("🎁 Ressource du boss en bonus : "+itemName(drops[0][0]));
  toast("🏆 Donjon terminé : "+world.zones[d.zoneId][0]+" · +"+xp+" XP, +"+kamas+" kamas");
 }else{
  d.index++;toast("🏰 Salle "+(d.index+1)+"/"+d.rooms.length);
 }
 d.specialClock=0;d.bossPhase="normal";
}
function dungeonBossSpecial(a,m,dt){
 if(!isDungeonBoss(a)||a.enemyHp<=0)return false;
 const d=a.dungeonRun;d.specialClock=(d.specialClock||0)+dt;
 d.bossPhase=d.specialClock<5?"bouclier":a.enemyHp/m[2]<=.35?"enrage":"normal";
 if(d.specialClock<8)return false;
 d.specialClock=0;
 const shield=Math.min(Number(a.spellShield)||0,Math.ceil(m[1]*.35)+10);
 const attack=Math.max(1,Math.round(m[1]*.36+11));
 const damage=Math.max(0,Math.round(attack*(d.bossPhase==="enrage"?1.5:1))-shield);
 a.spellShield=Math.max(0,(a.spellShield||0)-shield);
 state.hp=Math.max(0,state.hp-damage);
 emitSpellFloat("player","ATTAQUE DU BOSS −"+damage,"💢");
 if(state.hp<=0){
  state.action=null;state.hp=maxHp();
  toast("💀 Défaite dans "+world.zones[d.zoneId][0]+".");
 }
 return true;
}
function dungeonRoomPanel(id,zone){
 const rooms=dungeonRoomList(id),action=state.action,run=action?.dungeonRun;
 const active=run?.zoneId===String(id);
 const root=E("section",{className:"fd-dungeon-panel","data-dungeon-id":String(id)},
  E("h3",{},"🏰 Salles du donjon : "+zone[0]),
  E("p",{className:"fd-muted"},"Monstres DOFUS authentiques, boss à bouclier et enrage, récompenses bonus propres au mode idle."),
  E("div",{className:"fd-dungeon-meta"},pill(rooms.length+" salles"),pill("Niv. "+dungeonRequiredLevel(id)+" minimum"),
   pill((state.dungeonClears?.[String(id)]||0)+" donjon(s) terminé(s)")));
 const list=E("div",{className:"fd-dungeon-rooms"});
 for(let i=0;i<rooms.length;i++){
  const mid=rooms[i],m=world.monsters[String(mid)],boss=i===rooms.length-1;
  list.append(E("div",{className:"fd-dungeon-room "+(active&&run.index===i?"active":"")+
   (active&&run.index>i?" cleared":"")},
   mobSprite(mid,"fd-dungeon-mob-art"),
   E("div",{},E("strong",{},(boss?"👑 BOSS · ":"Salle "+(i+1)+" · ")+m[0]),
    E("small",{},"Niveau "+m[1]+" · "+money(m[2])+" PV")),
   E("span",{},active&&run.index>i?"✓":active&&run.index===i?"⚔️":boss?"🏆":"")));
 }
 root.append(list);
 if(active)root.append(E("strong",{className:"fd-dungeon-status"},
  run.completed?"🏆 Boss vaincu !":"Salle "+(run.index+1)+"/"+run.rooms.length+
  (isDungeonBoss(action)?" · Phase "+run.bossPhase:"")));
 else root.append(B(playerLevel()<dungeonRequiredLevel(id)?"🔒 Niveau "+dungeonRequiredLevel(id)+" requis":
  "▶ Commencer le parcours",()=>startDungeon(id),"fd-button fd-dungeon-start",playerLevel()<dungeonRequiredLevel(id)));
 return root;
}

function startCombat(id){
 const m=world.monsters[String(id)];if(!m)return;
 if(!canFight(m)){toast("🔒 "+m[0]+" (niveau "+m[1]+") : niveau "+minimumCombatLevel(m)+" minimum pour combattre. Ton aventurier est niveau "+playerLevel()+". Commence par Incarnam.");return}
 if(state.action?.type==="combat"&&state.action.id===Number(id)){state.action=null;render();save();return}
 if(Object.keys(state.pendingLoot||{}).filter(k=>state.pendingLoot[k]>0).length>=250){toast("Butin temporaire plein. Récupère, vends ou jette les objets.");return}
 state.selectedMonster=String(id);state.action={type:"combat",id:Number(id),progress:0,enemyHp:m[2],enemyTick:0,
  spellClass:state.classId,spellCooldowns:{},spellBuffs:{},spellShield:0,spellDot:null,spellClock:0,spellHistory:[],spellGlobalTimer:0};
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
 state.totalSeconds=(Number(state.totalSeconds)||0)+dt;
 const a=state.action;
 if(a.type==="combat")advanceSpellTimers(a,dt);
 // Laisser le monstre à 0 PV pendant 1,8 seconde, même après un one-shot.
 // Les attaques et dégâts ennemis restent suspendus pendant ce délai.
 if(a.type==="combat"&&Number(a.respawnRemaining)>0){
  a.respawnRemaining=Math.max(0,a.respawnRemaining-dt);
  if(a.respawnRemaining===0){
   if(a.dungeonRun?.completed){state.action=null;return true}
   if(a.dungeonRun){
    const nextId=a.dungeonRun.rooms[a.dungeonRun.index];
    if(nextId){a.id=Number(nextId);state.selectedMonster=String(nextId)}
   }
   const next=world.monsters[String(a.id)];
   if(next){a.enemyHp=next[2];a.enemyTick=0;a.progress=0;a.spellDot=null;
    delete a.spellBuffs.slow;delete a.spellBuffs.weaken;}
  }
  return true;
 }
 a.progress+=dt;
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
   const recipeKey=a.job+":"+a.id;
   state.craftedRecipes[recipeKey]=(state.craftedRecipes[recipeKey]||0)+1;
   state.jobCraftCount[a.job]=(state.jobCraftCount[a.job]||0)+1;
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
  const second=combatAttackInterval(a);
  a.enemyTick=(a.enemyTick||0)+dt;
  if(dungeonBossSpecial(a,m,dt)&&!state.action)return true;
  let changed=false;
  let attacks=Math.min(10,Math.floor(a.progress/second));a.progress-=attacks*second;
  while(attacks-- && state.action){
   const crit=effectiveCombatCrit(a);
   const isCritical=Math.random()<crit;
   let hit=Math.max(1,Math.round(effectiveCombatDamage(a)*(isCritical?(state.classId==="ecaflip"?2:1.7):1)));
   if(isDungeonBoss(a)&&a.dungeonRun.bossPhase==="bouclier")hit=Math.max(1,Math.round(hit*.65));
   a.enemyHp-=hit;changed=true;
   emitDamageNumber("enemy",hit,isCritical);
   if(a.enemyHp<=0){victory(m,a);break}
  }
  if(a.respawnRemaining)return true;
  if(advanceCombatDot(a,m,dt))changed=true;
  if(a.respawnRemaining)return true;
  if(advanceCombatSummon(a,m,dt))changed=true;
  if(a.respawnRemaining)return true;
  if(castAutoSpell(a))changed=true;
  if(a.respawnRemaining)return true;
  const enemyInterval=2.8*(1+spellBuff(a,"slow"));
  while(a.enemyTick>=enemyInterval&&state.action&&!a.respawnRemaining){
   a.enemyTick-=enemyInterval;
   if(Math.random()<spellBuff(a,"evade")){
    emitSpellFloat("player","ESQUIVE !","🌫️");changed=true;continue;
   }
   let enemyDmg=Math.max(1,Math.round((m[1]*.65+4)*(state.classId==="feca"?.88:1))-
    defense());
   enemyDmg=Math.max(1,Math.round(enemyDmg*(1-spellBuff(a,"armor"))*(1-spellBuff(a,"weaken"))));
   const absorbed=Math.min(enemyDmg,Number(a.spellShield)||0);
   if(absorbed>0){
    a.spellShield=Math.max(0,a.spellShield-absorbed);
    emitSpellFloat("player","Bouclier −"+absorbed,"🛡️");
   }
   enemyDmg=Math.max(0,enemyDmg-absorbed);
   state.hp=Math.max(0,state.hp-enemyDmg);changed=true;
   if(enemyDmg>0)emitDamageNumber("player",enemyDmg);
   if(state.hp<=0){state.action=null;state.hp=maxHp();state.log.unshift({kind:"defeat",monsterId:String(a.id),monsterName:m[0]});toast("Défaite : tente un monstre moins puissant.")}
  }
  return changed;
 }
 return false;
}
function victory(m,a){
 const previousLevel=playerLevel();
 state.kills++;state.dex[String(a.id)]=(state.dex[String(a.id)]||0)+1;
 const zoneId=String(state.selectedZone||"");
 if(world.zones[zoneId]?.[3]?.some(mid=>String(mid)===String(a.id)))
  state.zoneKills[zoneId]=(state.zoneKills[zoneId]||0)+1;
 // L'identité et les taux de drop viennent de DOFUS ; progression adaptée à l'idle.
 const baseXp=Math.max(15,Math.round(17+m[1]*3.2));
 state.playerXp+=Math.round(baseXp*(1+(statValue("sagesse")+gearStat("sagesse"))*.002));
 const kamas=Math.round((5+m[1]*1.75)*(1+(state.upgrades.fortune||0)*.1)*(state.classId==="enutrof"?1.15:1)*(1+spellBuff(a,"luck")));
 state.kamas+=kamas;state.earned+=kamas;
 const dropped=[];
 for(const [id,rate] of m[4]){
  if(Math.random()*100<rate&&queueLoot(id,1))dropped.push(String(id));
 }
 const bonus=rollEquipment(m,dropped);
 if(bonus)toast("🎁 Équipement trouvé : "+itemName(bonus)+" ! Consulte le butin sous ton aventurier.");
 const qty=new Map();
 for(const id of dropped)qty.set(String(id),(qty.get(String(id))||0)+1);
 state.log.unshift({kind:"victory",monsterId:String(a.id),monsterName:m[0],
  kamas,items:[...qty.entries()],at:Date.now()});
 state.log=state.log.slice(0,40);
 if(playerLevel()>previousLevel)toast("✨ Niveau "+playerLevel()+" atteint : +"+((playerLevel()-previousLevel)*5)+" points de caractéristiques !");
 state.jobs["41"]=(state.jobs["41"]||0)+expGain(m[1]);
 state.jobs["78"]=(state.jobs["78"]||0)+Math.ceil(expGain(m[1])*.35);
 state.hp=Math.min(maxHp(),state.hp+Math.ceil(maxHp()*.15*
  (state.classId==="eniripsa"?1.6:state.classId==="osamodas"?1.25:1)));
 dungeonVictory(a,m);
 a.enemyHp=0;a.enemyTick=0;a.progress=0;a.respawnRemaining=1.8;a.spellDot=null;
 delete a.spellBuffs.slow;delete a.spellBuffs.weaken;
 // Rafraîchit immédiatement la barre à zéro, sans attendre le prochain
 // rendu de la page (qui a lieu au maximum toutes les 900 ms).
 if(state.view==="combat"&&typeof document!=="undefined"&&!document.hidden){
  const previous=$(".fd-enemy-panel");
  if(previous)previous.replaceWith(combatEnemyPanel());
 }
 if(pendingEntries().length>=250){
  state.action=null;toast("Butin plein : utilise les options de récupération pour reprendre le combat.");
 }
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
 if(view==="achievements")achievementPage=0;
 $("#sidebar").classList.remove("open");render();save();
}
function sidebar(){
 // On affiche le combat en premier, au-dessus de la banque et des métiers.
 const groups=[
  ["COMBAT",[["combat","⚔️","Zones et monstres"],["dungeons","🏰","Donjons"],["bestiary","📘","Bestiaire"]]],
  ["PERSONNAGE",[["bank","🎒","Banque"],["shop","🪙","Magasin"],["character","🧙","Personnage"],["achievements","🏆","Succès"],["quests","📜","Quêtes"]]],
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
 const tit=job?jobName(job)+(view.startsWith("craft:")?" · Recettes":""):({bank:"Banque",shop:"Magasin",combat:"Combats",character:"Personnage",achievements:"Succès",recipes:"Toutes les recettes",bestiary:"Bestiaire"}[view]||"DOFUS IDLE");
 const h=E("div",{className:"fd-headline"},job?jobSprite(job,"fd-head-icon"):E("span",{className:"fd-head-icon"},"✦"),
  E("div",{},E("h1",{},tit),E("small",{},"DOFUS IDLE · Monde des Douze")));
 const stats=E("div",{className:"fd-headstats"},
  pill("Niv. "+lev.level+" / 200","green"),pill("XP "+money(lev.xp)+" / "+money(lev.next)),
  pill("🪙 "+money(state.kamas),"gold"),pill("🎒 "+slots()+"/"+bankCap()),
  B("💾 Sauver",()=>{save();toast("Sauvegarde enregistrée.")},"fd-secondary"));
 $("#topbar").replaceChildren(E("div",{className:"fd-topline"},h,stats),meter(lev.ratio,"fd-head-meter"));
 $("#mobileMoney").textContent=money(state.kamas)+" 🪙";
 $("#buildVersion").textContent="v8.0";
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
/* Banque : les catégories et sous-types viennent exactement de
   ItemTypeData.categoryId / ItemTypeData.nameId (version DOFUS 3)
   et du typeId porté par chaque ItemData/WeaponData. */
const BANK_CATEGORIES=[
 ["all","Tous","🧰"],
 ["equipment","Équipements","🛡️"],
 ["consumable","Consommables","🧪"],
 ["resource","Ressources","🌿"],
 ["quest","Objets de quête","📜"],
 ["cosmetic","Cosmétiques","🎭"],
 ["other","Autres","📦"]
];
const BANK_CATEGORY_BY_ID={"0":"equipment","1":"consumable","2":"resource","3":"quest","4":"cosmetic"};
function bankItemTypeId(id){return String(core.items[String(id)]?.[3]??0)}
function bankItemCategory(id){
 const type=core.types[bankItemTypeId(id)];
 const category=type?.[1];
 return BANK_CATEGORY_BY_ID[String(category)]||"other";
}
function bankSearchText(text){
 return String(text??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function bankSortItems(a,b){
 if(bankSort==="level-asc")return itemLevel(a)-itemLevel(b)||itemName(a).localeCompare(itemName(b),"fr");
 if(bankSort==="level-desc")return itemLevel(b)-itemLevel(a)||itemName(a).localeCompare(itemName(b),"fr");
 if(bankSort==="quantity")return (state.bank[b]||0)-(state.bank[a]||0)||itemName(a).localeCompare(itemName(b),"fr");
 if(bankSort==="value")return itemValue(b)-itemValue(a)||itemName(a).localeCompare(itemName(b),"fr");
 if(bankSort==="type")return typeName(a).localeCompare(typeName(b),"fr")||itemName(a).localeCompare(itemName(b),"fr");
 return itemName(a).localeCompare(itemName(b),"fr");
}
function bankView(){
 const owned=Object.keys(state.bank).filter(id=>state.bank[id]>0&&core.items[id]);
 const categoryCounts=Object.fromEntries(BANK_CATEGORIES.map(([key])=>[key,0]));
 categoryCounts.all=owned.length;
 for(const id of owned)categoryCounts[bankItemCategory(id)]++;
 // Si une catégorie a été vidée en vendant les derniers objets,
 // garder le filtre permet de voir un état vide explicite plutôt que
 // de changer de catégorie sans que le joueur le demande.
 const tabs=E("div",{className:"fd-bank-tabs",role:"group","aria-label":"Catégories de la banque"});
 for(const [key,label,icon] of BANK_CATEGORIES){
  if(key!=="all"&&!categoryCounts[key])continue;
  const active=bankCategory===key;
  const button=B("",()=>{
   bankCategory=key;bankType="all";page=0;renderView();
  },"fd-bank-tab "+(active?"active":""));
  button.setAttribute("data-bank-category",key);
  button.setAttribute("aria-pressed",active?"true":"false");
  button.append(E("span",{className:"fd-bank-tab-icon"},icon),
   E("span",{className:"fd-bank-tab-label"},label),
   E("span",{className:"fd-bank-tab-count"},money(categoryCounts[key]||0)));
  tabs.append(button);
 }
 const withinCategory=owned.filter(id=>bankCategory==="all"||bankItemCategory(id)===bankCategory);
 const counts=new Map();
 for(const id of withinCategory){
  const typeId=bankItemTypeId(id);
  counts.set(typeId,(counts.get(typeId)||0)+1);
 }
 const types=[...counts].sort((a,b)=>typeNameForId(a[0]).localeCompare(typeNameForId(b[0]),"fr"));
 if(bankType!=="all"&&!counts.has(bankType))bankType="all";
 const typeSelect=E("select",{className:"fd-select fd-bank-type",value:bankType,
  "aria-label":"Filtrer par type exact DOFUS",onchange:e=>{
   bankType=e.target.value;page=0;renderView();
  }},E("option",{value:"all"},"Tous les types ("+money(withinCategory.length)+")"));
 for(const [typeId,count] of types)typeSelect.append(E("option",{value:typeId},
  typeNameForId(typeId)+" ("+money(count)+")"));
 const sortSelect=E("select",{className:"fd-select fd-bank-sort",value:bankSort,
  "aria-label":"Trier les objets de la banque",onchange:e=>{
   bankSort=e.target.value;page=0;renderView();
  }},
   E("option",{value:"name"},"Nom : A → Z"),
   E("option",{value:"type"},"Type DOFUS : A → Z"),
   E("option",{value:"level-asc"},"Niveau : croissant"),
   E("option",{value:"level-desc"},"Niveau : décroissant"),
   E("option",{value:"quantity"},"Quantité : décroissante"),
   E("option",{value:"value"},"Valeur : décroissante"));
 const search=bankSearchText(q.trim());
 const keys=withinCategory.filter(id=>
  (bankType==="all"||bankItemTypeId(id)===bankType)&&
  (!search||bankSearchText(itemName(id)+" "+typeName(id)).includes(search)));
 keys.sort(bankSortItems);
 const totalPages=Math.max(1,Math.ceil(keys.length/45));
 page=Math.max(0,Math.min(page,totalPages-1));
 const cards=E("div",{className:"fd-bank-grid"});
 for(const id of keys.slice(page*45,(page+1)*45)){
  const qty=state.bank[id];
  cards.append(E("article",{className:"fd-bank-item","data-bank-item-id":String(id)},
   itemSprite(id,"fd-bank-art"),
   E("strong",{},itemName(id)),
   E("small",{},typeName(id)+" · Niveau "+itemLevel(id)),
   pill("× "+money(qty)+" · 🪙 "+itemValue(id)+"/u"),
   E("div",{className:"fd-bank-actions"},
    B("Vendre 1",()=>sell(id,1),"fd-mini"),
    B("Tout vendre",()=>sell(id,qty),"fd-mini"),
    B("Sources",()=>showSources(id),"fd-mini"),
    gearSlot(id)?B("Comparer",()=>equipmentDetails(id),"fd-mini fd-compare-button"):null,
    gearSlot(id)?B(playerLevel()<itemLevel(id)?"Niv. "+itemLevel(id)+" requis":"Équiper",()=>equip(id),"fd-mini",playerLevel()<itemLevel(id)):null)));
 }
 const filters=E("div",{className:"fd-bank-controls"},
  E("div",{className:"fd-bank-search-wrap"},
   E("label",{},"🔎 Recherche"),
   searchField("Nom d'objet ou type DOFUS...",q,v=>{q=v;page=0})),
  E("div",{className:"fd-bank-control"},
   E("label",{},"📂 Type d'objet"),typeSelect),
  E("div",{className:"fd-bank-control"},
   E("label",{},"⇅ Trier par"),sortSelect));
 const chosen=BANK_CATEGORIES.find(([key])=>key===bankCategory);
 const summary=E("div",{className:"fd-bank-summary"},
  E("strong",{},chosen?chosen[2]+" "+chosen[1]:"🧰 Tous"),
  E("span",{},money(keys.length)+" type(s) d'objet"+(search?" correspondant à la recherche":"")),
  bankCategory!=="all"||bankType!=="all"||q?B("↺ Afficher tout",()=>{
    bankCategory="all";bankType="all";bankSort="name";q="";page=0;renderView();
   },"fd-secondary fd-bank-reset"):null);
 return E("div",{className:"fd-bank-page"},
  panelHeading("🎒 Banque","Retrouve tes équipements, ressources, consommables et objets de quête selon les catégories et types officiels DOFUS.",
   pill(slots()+" / "+bankCap()+" emplacements")),
  tabs,filters,summary,
  keys.length?cards:E("div",{className:"fd-bank-empty"},
   "Aucun objet dans cette sélection. Essaie l'onglet Tous ou supprime les filtres."),
  E("div",{className:"fd-pagination"},
   B("← Précédent",()=>{page--;renderView()},"fd-secondary",page<=0),
   pill("Page "+(page+1)+" / "+totalPages),
   B("Suivant →",()=>{page++;renderView()},"fd-secondary",page>=totalPages-1)));
}
function typeNameForId(typeId){return displayText(core.types[String(typeId)]?.[0])||"Autre type d'objet"}

function sell(id,qty){
 if(!has(id))return;const count=Math.min(qty,state.bank[id]);consume(id,count);
 const earn=count*itemValue(id);state.kamas+=earn;state.earned+=earn;
 state.itemsSold=(state.itemsSold||0)+count;
 toast("Vendu : "+money(count)+" × "+itemName(id)+" · +"+money(earn)+" kamas");render();save();
}

/* Comparer un équipement : les écarts incluent le changement de panoplie.
   Chaque objet utilise le jet moyen d'une plage officielle, non un jet inventé. */
function equipmentDetails(id,slotChoice=preferredGearSlot(id)){
 id=String(id);if(!core.items[id]||!gearSlot(id))return;
 const candidate=availableGearSlots(id);
 const slot=candidate.includes(slotChoice)?slotChoice:candidate[0];
 const current=gearStatsFor(state.equipment);
 const hypothetical={...state.equipment,[slot]:id};
 const next=gearStatsFor(hypothetical);
 const effects=itemEffects(id),setInfo=itemSetInfo(id);
 const modal=E("div",{className:"fd-modal fd-equipment-modal"},
  E("div",{className:"fd-equipment-modal-header"},itemSprite(id,"fd-equipment-modal-art"),
   E("div",{},E("h2",{},itemName(id)),
    E("p",{},typeName(id)+" · Niveau "+itemLevel(id)),
    pill("Jet médian des bornes DOFUS 3","green"))));
 if(candidate.length>1){
  modal.append(E("label",{className:"fd-equip-choice"},"Emplacement",
   E("select",{className:"fd-select",value:slot,onchange:e=>equipmentDetails(id,e.target.value)},
    ...candidate.map(k=>E("option",{value:k},EQUIP_LABELS[k]||k)))));
 }
 modal.append(E("p",{className:"fd-muted"},"Remplace : "+(state.equipment[slot]?itemName(state.equipment[slot]):"Emplacement vide")));
 const bonuses=E("div",{className:"fd-equipment-effects"});
 for(const line of effects){
  const key=gearEffectKey(line[0]);
  bonuses.append(E("div",{className:"fd-equipment-effect "+(key?"is-applied":"")},
   E("span",{},statTooltip(line)),
   pill(key?"Appliqué (idle)":"Hors combat idle",key?"green":"")));
 }
 modal.append(E("h3",{},"Effets de l'objet"),
  effects.length?bonuses:E("p",{className:"fd-muted"},"Aucun jet d'effet disponible pour cet objet dans la source épinglée."));
 if(setInfo){
  const sid=equipmentData.items[id][0],count=next.sets.find(x=>x.id===String(sid))?.count||1;
  const setBlock=E("section",{className:"fd-modal-set"},
   E("h3",{},"🧩 "+setInfo[0]+" · "+count+" / "+setInfo[1].length+" pièces"),
   E("small",{className:"fd-muted"},"Bonus officiel correspondant au nombre de pièces équipées."));
  for(let n=2;n<=setInfo[1].length;n++){
   const lines=setInfo[2]?.[n-1]||[];
   if(!lines.length)continue;
   const div=E("div",{className:"fd-set-tier "+(n===count?"active":"")},E("strong",{},n+" pièces"+(n===count?" — bonus actif":"")));
   div.append(E("small",{},lines.map(statTooltip).join(" · ")));
   setBlock.append(div);
  }
  modal.append(setBlock);
 }
 const keys=["vitalite","force","intelligence","chance","agilite","sagesse",
  "power","critical","ap","mp","range","damage","resistance","resistancePct"];
 const diff=keys.map(key=>[key,(next.stats[key]||0)-(current.stats[key]||0)]).filter(([,d])=>d!==0);
 const list=E("div",{className:"fd-equipment-compare"});
 for(const [key,delta] of diff)list.append(E("div",{className:"fd-equipment-delta "+(delta>0?"positive":"negative")},
  E("span",{},BONUS_LABELS[key]||key),E("strong",{},(delta>0?"+":"")+delta)));
 modal.append(E("h3",{},"Comparaison avec ton stuff actuel"),
  diff.length?list:E("p",{className:"fd-muted"},"Aucun écart de statistique actuellement simulée."),
  E("div",{className:"fd-equipment-compare-totals"},
   pill("❤️ "+money(maxHpFor(state.equipment))+" → "+money(maxHpFor(hypothetical))+" PV"),
   pill("⚔️ "+money(damageFor(state.equipment))+" → "+money(damageFor(hypothetical))+" dégâts"),
   pill("🛡️ "+money(defenseFor(state.equipment))+" → "+money(defenseFor(hypothetical))+" défense")));
 const allowed=has(id)&&playerLevel()>=itemLevel(id);
 modal.append(E("div",{className:"fd-equipment-modal-actions"},
  B(allowed?"⚔️ Équiper dans "+(EQUIP_LABELS[slot]||slot):"Niveau "+itemLevel(id)+" requis",
   ()=>{closeModal();equip(id,slot)},"fd-button",!allowed),
  B("Fermer",closeModal,"fd-secondary")));
 $("#modalRoot").replaceChildren(E("div",{className:"fd-overlay",
  onclick:e=>{if(e.target.classList.contains("fd-overlay"))closeModal()}},modal));
}
function equipmentSetPanel(){
 const active=equippedSetInfo();
 const root=E("section",{className:"fd-character-panel fd-set-panel"},
  E("div",{className:"fd-character-panel-heading"},
   E("h3",{},"🧩 Mes panoplies"),pill(active.length+" actives")));
 if(!active.length)root.append(E("p",{className:"fd-muted"},"Équipe plusieurs pièces d'une même panoplie pour activer ses véritables bonus. Les bonus commencent généralement à 2 pièces."));
 for(const row of active){
  const container=E("div",{className:"fd-equipped-set"},
   E("div",{className:"fd-equipped-set-head"},E("strong",{},row.name),
    pill(row.count+" / "+row.total+" pièces",row.count>=2?"green":"")),
   meter(100*row.count/row.total));
  const currentTier=row.count>=2?row.bonuses:[];
  container.append(E("p",{},currentTier?.length?
   currentTier.map(statTooltip).join(" · "):
   "Encore "+Math.max(1,2-row.count)+" pièce(s) pour un bonus."));
  root.append(container);
 }
 return root;
}

function equip(id,chosenSlot=null){
 id=String(id);
 if(!has(id))return;
 const allowed=availableGearSlots(id);
 const slot=chosenSlot&&allowed.includes(chosenSlot)?chosenSlot:preferredGearSlot(id);
 if(!slot)return;
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
const SLOT_ICONS={weapon:"⚔️",head:"🪖",cape:"🧥",ring:"💍",ring2:"💍",boots:"🥾",belt:"🧷",neck:"📿",shield:"🛡️",pet:"🐾",mount:"🐎",dofus1:"🥚",dofus2:"🥚",dofus3:"🥚",dofus4:"🥚",dofus5:"🥚",dofus6:"🥚"};
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
 const sign=state.combatSort==="desc"?-1:1;
 for(const zones of map.values())zones.sort((a,b)=>sign*(a[1][2]-b[1][2])||String(a[1][0]).localeCompare(String(b[1][0]),"fr"));
 return [...map.entries()].sort((a,b)=>regionOrder(a,b,state.combatSort==="desc"?-1:1));
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
 combatOpenZone=String(id);state.selectedZone=String(id);visitZone(id);
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
  state.selectedZone=String(zid);visitZone(zid);
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
  E("small",{},"Récompenses possibles : "+money(pool.length)+" équipements. Les objets arrivent dans le butin temporaire sous Ton aventurier.")));
 return drops;
}

/* Panneau de sorts partagé entre Personnage et Combat : la jauge de recharge
   est calculée à partir du même état, sans stockage séparé des anciennes parties. */
function spellBookPanel(context="character"){
 const inCombat=context==="combat",cls=CLASS_BY_ID[state.classId]||CLASS_BY_ID.iop;
 const a=state.action?.type==="combat"?state.action:null;
 if(a)ensureSpellAction(a);
 const root=E("section",{className:"fd-spell-book fd-spell-book-"+context,
  "data-spell-class":state.classId},
  E("div",{className:"fd-spell-header"},
   E("div",{className:"fd-spell-head-title"},
    E("h3",{},"✨ Grimoire de "+cls[1]),
    E("small",{},"Sorts adaptés à DOFUS IDLE · 3 capacités de classe")),
   pill(money(state.spellCasts||0)+" sorts lancés","green")),
  E("p",{className:"fd-spell-intro"},
   "Active ou désactive le lancement automatique pour chaque sort. En combat, tu peux aussi lancer un sort manuellement s'il est disponible. Les temps de recharge sont indépendants du PA/PM."));
 const grid=E("div",{className:"fd-spell-grid"});
 for(const sp of classSpells()){
  const [id,name,emoji,required,cooldown,kind,power,description]=sp;
  const unlocked=playerLevel()>=required;
  const ready=unlocked&&spellReady(sp,a);
  const remaining=a?Math.max(0,Number(a.spellCooldowns?.[id])||0):0;
  const automated=spellAutoEnabled(id);
  const card=E("article",{className:"fd-spell-card "+(unlocked?"unlocked":"locked")+(a&&ready?" is-ready":""),
   "data-spell-id":id,"data-spell-level":String(required),"data-spell-element":sp[8]||"soutien",
   title:name+" · "+description+" · Recharge "+cooldown+" secondes"},
   E("div",{className:"fd-spell-card-top"},
    E("span",{className:"fd-spell-icon","aria-hidden":"true"},spellArt(state.classId,id,emoji)),
    E("div",{className:"fd-spell-name"},E("strong",{},name),
     E("small",{},unlocked?"Niveau "+required+" · recharge "+cooldown+" s":"🔒 Débloqué au niveau "+required))),
   E("p",{className:"fd-spell-description"},description));
  if(a&&unlocked){
   card.append(E("div",{className:"fd-spell-recharge"},
    E("div",{className:"fd-spell-recharge-line"},
     E("span",{},remaining>0?"Recharge en cours":"Sort prêt"),
     E("strong",{},remaining>0?remaining.toFixed(1)+" s":"✓ Prêt")),
    meter(remaining>0?100*(1-remaining/cooldown):100,"fd-spell-meter")));
  }
  card.append(E("div",{className:"fd-spell-controls"},
   B(automated?"⚙️ Auto : ON":"⚙️ Auto : OFF",()=>toggleSpellAuto(id),
    "fd-spell-auto "+(automated?"active":"off"),!unlocked),
   B(!unlocked?"Niv. "+required+" requis":!a?"Hors combat":remaining>0?
     remaining.toFixed(1)+" s":ready?"Lancer":"Patiente",
     ()=>castClassSpell(id,true),"fd-spell-cast",!ready)));
  grid.append(card);
 }
 root.append(grid);
 if(inCombat&&a){
  const values=[
   ["🛡️ Bouclier",Math.round(Number(a.spellShield)||0)],
   ...Object.entries(a.spellBuffs||{}).filter(([,v])=>v?.remaining>0)
    .map(([id,v])=>[(v.icon||"✨")+" "+({
     fury:"Dégâts+",crit:"Critiques+",haste:"Vitesse+",armor:"Protection",
     regen:"Régénération",evade:"Esquive",slow:"Ralenti",weaken:"Affaibli",
     luck:"Butin+",summon:"Invocation"}[id]||id),v.remaining.toFixed(1)+" s"])];
  if(a.spellDot?.remaining>0)values.push(["🔥 Dégâts périodiques",a.spellDot.remaining.toFixed(1)+" s"]);
  if(values.length&&values.some(([,v])=>v)){
   root.append(E("div",{className:"fd-spell-buffs"},
    E("strong",{},"Effets actifs"),
    ...values.filter(([,v])=>v&&v!=="0").map(([label,v])=>pill(label+" · "+v,"green"))));
  }
  if(a.spellHistory?.length){
   const history=E("div",{className:"fd-spell-history"},
    E("strong",{},"Derniers sorts utilisés"));
   for(const h of a.spellHistory.slice(0,4))
    history.append(E("div",{className:"fd-spell-history-line"},
     E("span",{className:"fd-spell-history-name"},spellArt(state.classId,h.id,h.icon,"fd-spell-mini-art"),h.name),E("small",{},h.text)));
   root.append(history);
  }
 }
 return root;
}

function combatPlayerPanel(){
 const pv=clamp(state.hp,0,maxHp()),pct=maxHp()?100*pv/maxHp():0;
 const isRunning=state.action?.type==="combat";
 const timer=isRunning?Math.max(0,combatAttackInterval(state.action)-state.action.progress):0;
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
   E("small",{},isRunning?"Prochaine attaque : "+timer.toFixed(1)+" s":"Intervalle d'attaque : "+combatAttackInterval().toFixed(2)+" s")),
  meter(pct,"fd-player-hp"),
  E("div",{className:"fd-player-layout"},
   E("div",{className:"fd-player-gear"},
    E("div",{className:"fd-fight-section-label"},"Équipement"),equipment,
    B("🎒 Voir ma banque / équiper",()=>runNav("bank"),"fd-secondary fd-wide")),
   E("div",{className:"fd-player-stats"},
    E("div",{className:"fd-fight-section-label"},"Statistiques de combat"),
    E("div",{className:"fd-stat"},E("span",{},"⚔️ Dégâts / coup"),E("strong",{},money(damage()))),
    E("div",{className:"fd-stat"},E("span",{},"🛡️ Défense"),E("strong",{},money(defense()))),
    E("div",{className:"fd-stat"},E("span",{},"💥 Coup critique"),E("strong",{},(effectiveCombatCrit()*100).toFixed(1)+" %")),
    E("div",{className:"fd-stat"},E("span",{},"❤️ PV maximum"),E("strong",{},money(maxHp()))),
    E("div",{className:"fd-stat"},E("span",{},"🏆 Monstres vaincus"),E("strong",{},money(state.kills))),
    B("🧙 Mon personnage",()=>runNav("character"),"fd-secondary fd-wide"))),
  lootStashPanel(),spellBookPanel("combat"),trackedAchievementsPanel());
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
 const knockedOut=active&&Number(state.action.respawnRemaining)>0;
 const enemyHp=knockedOut?0:active?clamp(state.action.enemyHp,0,m[2]):m[2];
 const enemyPct=m[2]?100*enemyHp/m[2]:0;
 const minimum=minimumCombatLevel(m),allowed=canFight(m);
 return E("section",{className:"fd-fight-panel fd-enemy-panel"},
  E("div",{className:"fd-fight-panel-title"},E("strong",{},"⚔️ Adversaire : "+m[0]),pill("Niv. "+m[1],"fd-difficulty-hard")),
  E("div",{className:"fd-hp-label"},E("strong",{},"❤️ "+money(enemyHp)+" / "+money(m[2])+" PV"),
    E("small",{},knockedOut?"💀 Monstre vaincu — nouvel adversaire dans "+Number(state.action.respawnRemaining).toFixed(1)+" s":
     active?"Le monstre attaque toutes les 2,8 secondes":"Combat arrêté")),
  meter(enemyPct,"fd-enemy-hp"),
  knockedOut?E("div",{className:"fd-enemy-defeated",role:"status"},
   E("strong",{},"💀 MONSTRE VAINCU !"),
   E("small",{},"0 PV — nouvelle cible après une courte pause")):null,
  E("div",{className:"fd-enemy-hero "+(knockedOut?"fd-enemy-hero-ko":"")},
   mobSprite(state.selectedMonster,"fd-enemy-portrait"),
   E("div",{},E("h2",{},m[0]),
     E("p",{},"📍 "+zone[0]+" · Niveau "+m[1]),
     state.action?.dungeonRun?E("p",{className:"fd-dungeon-boss-phase"},
      "🏰 Salle "+(state.action.dungeonRun.index+1)+"/"+state.action.dungeonRun.rooms.length+
      (isDungeonBoss(state.action)?" · 👑 "+state.action.dungeonRun.bossPhase:"")):null,
     E("p",{},"🏆 "+money(state.dex[String(state.selectedMonster)]||0)+" victoires"),
     pill("🪙 "+money(Math.round((5+m[1]*1.75)*(1+(state.upgrades.fortune||0)*.1)))+" / victoire"))),
  E("div",{className:"fd-fight-level-info "+(allowed?"is-available":"is-locked")},
   E("strong",{},allowed?"✅ Combat disponible":"🔒 Combat bloqué · Niveau "+minimum+" requis"),
   E("small",{},allowed?"Ton niveau "+playerLevel()+" est suffisant pour ce monstre niveau "+m[1]+".":
    "Ton aventurier est niveau "+playerLevel()+". Ce monstre est niveau "+m[1]+
    " : il te manque "+(minimum-playerLevel())+" niveau(x). Commence par les monstres d'Incarnam.")),
  E("div",{className:"fd-combat-actions"},
   B(active?"■ Arrêter le combat":allowed?"⚔️ Combattre":"🔒 Niveau "+minimum+" requis",()=>startCombat(state.selectedMonster),
    active?"fd-danger":"fd-button",!active&&!allowed),
   B("🎁 Voir les butins",()=>{const el=$("#fdCombatLoot");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"nearest"})},"fd-secondary"),
   B("🎒 Équiper du stuff",()=>runNav("bank"),"fd-secondary")),
  E("div",{id:"fdCombatLoot"},monsterDropsPanel(state.selectedMonster,m)),
  E("div",{className:"fd-log"},E("h3",{},"📜 Journal de combat"),
    ...state.log.slice(0,14).map(combatLogRow)));
}
function combatMonsterRow(mid,m,zoneId){
 const active=String(state.selectedMonster)===String(mid);
 const row=E("div",{className:"fd-monster-row "+(active?"active":"")});
 const pick=B("",()=>focusMonster(mid,zoneId),"fd-monster-info");
 const minimum=minimumCombatLevel(m);
 pick.append(mobSprite(mid,"fd-combat-list-art"),
  E("span",{},E("strong",{},m[0]),
   E("small",{},"Monstre niveau "+m[1]+" · ❤️ "+money(m[2])+" PV"),
   E("small",{className:"fd-combat-min-level "+(canFight(m)?"is-available":"is-locked")},
    (canFight(m)?"✅ Accessible":"🔒 Verrouillé")+" · Ton niveau minimum : "+minimum)));
 row.append(pick,E("div",{className:"fd-monster-buttons"},
  B(canFight(m)?"Combattre":"Niv. "+minimum+" requis",()=>{focusMonster(mid,zoneId);startCombat(mid)},"fd-danger",!canFight(m)),
  B("Butins",()=>{focusMonster(mid,zoneId);(()=>{const el=$("#fdCombatLoot");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"nearest"})})()},"fd-secondary")));
 return row;
}
function combatZoneCard(id,z){
 const open=combatOpenZone===String(id);
 const zoneLevel=z[2]||1;
 const minLevel=zoneCombatMin(z);
 const card=E("article",{className:"fd-zone-card "+(open?"expanded":"")});
 const head=E("button",{type:"button",className:"fd-zone "+(open?"active":""),onclick:()=>chooseZone(id)});
 head.append(zoneArt(z),
  E("span",{className:"fd-zone-summary"},
   E("strong",{},z[0]||"Zone inconnue"),
   E("small",{},"Niveau conseillé "+zoneLevel+" · "+z[3].length+" monstres"),
   E("small",{className:"fd-zone-min-level"},(playerLevel()>=minLevel?"✅":"🔒")+" Premiers combats dès le niveau "+minLevel)),
  difficultyChip(zoneLevel),E("span",{className:"fd-chevron"},open?"−":"+"));
 card.append(head);
 if(open&&state.combatMode==="dungeons"&&Number(z[5])>=0)
  card.append(dungeonRoomPanel(id,z));
 if(open){
  const matches=z[3].filter(mid=>world.monsters[String(mid)]&&world.monsters[String(mid)][0].toLowerCase().includes(monsterQuery.toLowerCase()))
   .sort((x,y)=>world.monsters[String(x)][1]-world.monsters[String(y)][1]);
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
  .filter(([name,zones])=>zones.length>0)
  .sort((a,b)=>regionOrder(a,b,state.combatSort==="desc"?-1:1));
 const chosen=regions.find(([name])=>name===state.selectedRegion);
 const outer=E("div",{className:"fd-combat-page"},
  E("div",{className:"fd-combat-tabs"},
   B("⚔️ Zones de combat",()=>{state.combatMode="zones";state.selectedRegion="";combatOpenZone="";zoneQuery="";render();save()},"fd-combat-tab "+(mode==="zones"?"active":"")),
   B("🏰 Donjons",()=>{state.combatMode="dungeons";state.selectedRegion="";combatOpenZone="";zoneQuery="";render();save()},"fd-combat-tab "+(mode==="dungeons"?"active":"")),
   B("📚 Bestiaire",()=>runNav("bestiary"),"fd-combat-tab"),
   B("🎒 Équipement",()=>runNav("character"),"fd-combat-tab")));
 const sortSelect=E("label",{className:"fd-combat-sort"},"Trier par niveau",
  E("select",{className:"fd-select",value:state.combatSort||"asc",
   onchange:e=>{state.combatSort=e.target.value;render();save()}},
   E("option",{value:"asc"},"Niveau croissant ↑"),
   E("option",{value:"desc"},"Niveau décroissant ↓")));
 if(!chosen){
  const grid=E("div",{className:"fd-region-cards"});
  for(const [name,zones] of regions){
   const lvMin=regionCombatMin(zones);
   const card=E("button",{className:"fd-region-card",type:"button",onclick:()=>selectRegion(name)});
   card.append(regionArt(name,zones),
    E("span",{className:"fd-region-body"},E("strong",{},name),E("small",{},zones.length+" zones · Premiers combats dès le niveau "+lvMin),
     name==="Incarnam"?E("small",{className:"fd-incarnam-hint"},"⭐ Commencer ici"):null),
    E("span",{className:"fd-region-chevron"},"›"));
   grid.append(card);
  }
  outer.append(panelHeading("🌍 Choisis une région",
    "Commence par Incarnam. Le niveau minimum indiqué correspond aux monstres les plus accessibles de chaque région. Le niveau conseillé peut être plus élevé.",
    pill(money(regions.length)+" régions")),sortSelect,grid);
  return outer;
 }
 const [region,zones]=chosen;
 const filtered=zones.filter(([id,z])=>String(z[0]+" "+z[1]).toLowerCase().includes(zoneQuery.toLowerCase()))
  .sort((a,b)=>(state.combatSort==="desc"?-1:1)*(Number(a[1][2])-Number(b[1][2]))||a[1][0].localeCompare(b[1][0],"fr"));
 const cards=E("div",{className:"fd-combat-zone-grid"});
 for(const [id,z] of filtered)cards.append(combatZoneCard(id,z));
 outer.append(E("div",{className:"fd-combat-breadcrumb"},
    B("← Toutes les régions",()=>selectRegion(""),"fd-secondary"),
    E("strong",{className:"fd-region-heading"},regionArt(region,zones,"fd-region-breadcrumb-art"),E("span",{},region)),
    pill(money(zones.length)+" zones")),
  E("div",{className:"fd-battle-sections"},combatPlayerPanel(),combatEnemyPanel()),
  E("div",{className:"fd-combat-rule"},
   E("strong",{},"📘 Comprendre les niveaux de combat"),
   E("span",{},"Ton aventurier est niveau "+playerLevel()+
    ". Tu peux combattre les monstres jusqu'au niveau "+(playerLevel()+8)+
    ". Chaque monstre indique son niveau minimum requis. Le niveau conseillé d'une zone est une recommandation, pas le seuil de déblocage.")),
  sortSelect,
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

function statAllocationPanel(){
 const capital=availableStats();
 const content=E("section",{className:"fd-character-panel fd-character-points"},
  E("div",{className:"fd-character-panel-heading"},
   E("h3",{},"✨ Répartir mes caractéristiques"),pill(money(capital)+" points disponibles",capital>0?"green":"")),
  E("p",{className:"fd-muted"},"5 points gagnés par niveau. Force, Intelligence, Chance et Agilité ont des paliers progressifs ; Vitalité coûte 1 point et Sagesse 3 points."));
 for(const [key,icon,label,desc] of STAT_DEFS){
  const n=statValue(key),cost=statCost(key,n);
  content.append(E("div",{className:"fd-char-stat-row"},
   E("span",{className:"fd-char-stat-symbol"},icon),
   E("span",{className:"fd-char-stat-desc"},E("strong",{},label),E("small",{},desc)),
   E("div",{className:"fd-char-stat-actions"},pill(money(n)),
    B("+1",()=>spendStat(key,1),"fd-mini",capital<cost),
    B("+10",()=>spendStat(key,10),"fd-mini",capital<cost))));
  content.lastChild.append(E("small",{className:"fd-char-stat-cost"},"Coût actuel : "+cost+" pt"+(cost>1?"s":"")+"/1"));
 }
 content.append(E("div",{className:"fd-char-points-footer"},
  E("small",{className:"fd-muted"},"Capital total : "+money((playerLevel()-1)*5)+" points · distribués : "+money(statsSpent())),
  B("Réinitialiser mes points",resetStats,"fd-secondary",statsSpent()===0)));
 return content;
}
function characterEquipmentPanel(){
 const slots=E("div",{className:"fd-character-gear-grid"});
 for(const [slot,id] of Object.entries(state.equipment)){
  const card=E("article",{className:"fd-char-gear-slot"},
   id?itemSprite(id,"fd-char-gear-image"):E("span",{className:"fd-char-gear-image"},SLOT_ICONS[slot]||"＋"),
   E("strong",{},EQUIP_LABELS[slot]||slot),
   E("small",{},id?itemName(id):"Emplacement vide"));
  if(id&&equipmentData?.items?.[String(id)])card.append(B("Détails",()=>equipmentDetails(id,slot),"fd-mini"));
  if(id)card.append(B("Retirer",()=>{
   if(!add(id)){toast("Banque pleine.");return}
   state.equipment[slot]=null;state.hp=Math.min(state.hp,maxHp());render();save();
  },"fd-mini"));
  slots.append(card);
 }
 return E("section",{className:"fd-character-panel fd-character-gear"},
  E("div",{className:"fd-character-panel-heading"},E("h3",{},"🛡️ Mes équipements"),
   pill("Niv. "+playerLevel())),
  slots,B("🎒 Ouvrir la banque pour s'équiper",()=>runNav("bank"),"fd-secondary fd-wide"));
}
function achievementPreview(){
 const total=achievementCatalog.length;
 const completed=achievementsClaimed();
 const ready=achievementCatalog.filter(a=>!state.achievements?.[a.id]&&achievementReached(a)).length;
 return E("section",{className:"fd-character-panel fd-character-success-preview"},
  E("div",{className:"fd-character-panel-heading"},E("h3",{},"🏆 Mes succès"),pill(money(completed)+" / "+money(total))),
  meter(total?completed*100/total:0),
  E("p",{className:"fd-muted"},"⭐ "+money(achievementsScore())+" points de succès obtenus"),
  E("p",{className:"fd-muted"},ready?money(ready)+" récompense(s) à récupérer !":"Explore le bestiaire, apprends les métiers et maîtrise les zones."),
  B("Voir tous les succès",()=>runNav("achievements"),"fd-button fd-wide"));
}

/* Statistiques détaillées de style DOFUS. Les jets réels des objets ne sont pas
   dans notre core.json : valeurs non simulées signalées « Indicatif ». */
function advancedCharacterStats(){
 const v=statValue("vitalite"),sag=statValue("sagesse"),fo=statValue("force");
 const intel=statValue("intelligence"),ch=statValue("chance"),agi=statValue("agilite");
 const crit=Number((criticalChance()*100).toFixed(2));
 const active=(icon,label,value,detail)=>[icon,label,value,true,detail];
 const preview=(icon,label,value=0)=>[icon,label,value,false,"Statistique indicative : effet non encore simulé et jets exacts d'équipement non importés."];
 const elemental=[["⚪","Neutre"],["🪨","Terre"],["🔥","Feu"],["💧","Eau"],["🌪️","Air"]];
 const groups=[
  ["primaires","❤️ Caractéristiques principales",[
   active("❤️","Vitalité",v+gearStat("vitalite"),"Capital et jet médian du stuff actuel."),
   active("🔮","Sagesse",sag+gearStat("sagesse"),"Capital et jet médian du stuff, influencent l’XP idle."),
   active("🪨","Force",fo+gearStat("force"),"Capital et jet médian du stuff."),
   active("🔥","Intelligence",intel+gearStat("intelligence"),"Capital et jet médian du stuff."),
   active("💧","Chance",ch+gearStat("chance"),"Capital et jet médian du stuff."),
   active("🌪️","Agilité",agi+gearStat("agilite"),"Capital et jet médian du stuff."),
   active("❤️","Points de vie",money(state.hp)+" / "+money(maxHp()),"PV actuels et PV maximum."),
   preview("🟦","Points de bouclier")
  ]],
  ["utilitaires","⚡ PA, PM et utilitaires",[
   preview("⚡","PA",6+gearStat("ap")),preview("🟢","PM",3+gearStat("mp")),preview("👁️","Portée (PO)",gearStat("range")),
   preview("🚩","Initiative",fo+intel+ch+agi+gearStat("initiative")),
   preview("🔎","Prospection",100+Math.floor((ch+gearStat("chance"))/10)+gearStat("prospection")),
   preview("🐉","Invocations",1),preview("📦","Pods",1000+fo*5),
   active("🎯","Coups critiques",crit+" %","Chance réelle de coup critique dans le jeu idle."),
   active("✨","Puissance",gearStat("power"),"Bonus de puissance d'équipement appliqué aux dégâts idle."),preview("💚","Soins",gearStat("healing")),preview("🪄","Puissance pièges")
  ]],
  ["dommages","⚔️ Dommages",[
   preview("⚔️","Dommages fixes"),
   ...elemental.map(([i,n])=>preview(i,"Dommages "+n)),
   preview("💥","Dommages Critiques"),preview("➡️","Dommages Poussée"),
   preview("🪤","Dommages pièges"),preview("🪤","% Dommages pièges","0 %"),
   preview("🥊","% Dommages mêlée","0 %"),preview("🏹","% Dommages distance","0 %"),
   preview("📜","% Dommages sorts","0 %"),preview("🗡️","% Dommages armes","0 %"),
   preview("⚡","% Dommages finaux","0 %"),
   active("⚔️","Dégâts par coup (idle)",damage(),"Valeur réellement utilisée à chaque attaque automatique.")
  ]],
  ["resistpercent","🛡️ Résistances en %",[
   ...elemental.map(([i,n])=>preview(i,"% Résistance "+n,"0 %")),
   preview("🥊","% Résistance mêlée","0 %"),preview("🏹","% Résistance distance","0 %"),
   preview("📜","% Résistance sorts","0 %"),preview("🗡️","% Résistance armes","0 %")
  ]],
  ["resistfix","🧱 Résistances fixes",[
   ...elemental.map(([i,n])=>preview(i,"Résistance "+n)),
   preview("💥","Résistance Critique"),preview("➡️","Résistance Poussée"),
   active("🛡️","Réduction des dégâts (idle)",defense(),"Réduction directe utilisée contre les monstres.")
  ]],
  ["entrave","🌀 Entrave et mobilité",[
   preview("🤝","Tacle",Math.floor(agi/10)),
   preview("🪽","Fuite",Math.floor(agi/10)),
   preview("🔵","Esquive PA",Math.floor(sag/10)),
   preview("🟢","Esquive PM",Math.floor(sag/10)),
   preview("🔵","Retrait PA",Math.floor(sag/10)),
   preview("🟢","Retrait PM",Math.floor(sag/10))
  ]],
  ["idle","🎮 Caractéristiques actives en idle",[
   active("⚔️","Attaque",damage(),"Dégâts par attaque automatique."),
   active("🛡️","Défense",defense(),"Réduction plate contre les attaques."),
   active("⏱️","Vitesse d'attaque",Math.max(.5,1.65-(state.upgrades.weapon||0)*.025).toFixed(2)+" s","Intervalle entre deux coups."),
   active("🎯","Chance de critique",crit+" %","Taux appliqué à chaque attaque."),
   active("💥","Multiplicateur critique",state.classId==="ecaflip"?"×2":"×1,7","Multiplicateur de frappe critique."),
   active("💚","Soin après victoire",(15*(state.classId==="eniripsa"?1.6:state.classId==="osamodas"?1.25:1)).toFixed(1)+" %","Pourcentage des PV maximum rendus après le combat."),
   active("🏆","Niveau de combat",playerLevel(),"Niveau du personnage."),
   active("🔮","Bonus XP",Number(((sag+gearStat("sagesse"))*.2).toFixed(1))+" %","Sagesse totale × 0,2 %."),
   active("🪙","Bonus Kamas",Math.round(((1+(state.upgrades.fortune||0)*.1)*(state.classId==="enutrof"?1.15:1)-1)*100)+" %","Bonus de victoire."),
   active("❤️","PV d'équipement",equippedBonus("hp"),"Valeur médiane des vrais jets DOFUS."),
   active("⚔️","Dégâts d'équipement",equippedBonus("atk"),"Dommages fixes et puissance reconnus du stuff."),
   active("🛡️","Défense d'équipement",equippedBonus("def"),"Résistances exploitées par le moteur idle.")
  ]]
 ];
 const total=groups.reduce((sum,group)=>sum+group[2].length,0);
 const root=E("section",{className:"fd-character-panel fd-advanced-sheet",id:"fdAdvancedStats"},
  E("div",{className:"fd-character-panel-heading"},
   E("h3",{},"📊 Toutes les caractéristiques DOFUS"),pill(total+" caractéristiques")),
  E("p",{className:"fd-advanced-disclaimer"},
   "Les valeurs « Idle » sont calculées et utilisées dans le prototype. Les valeurs « Indicatif » sont affichées pour retrouver les statistiques DOFUS, mais leurs effets ne sont pas encore simulés. Les jets officiels du stuff ne figurent pas dans la base actuellement chargée."));
 const layout=E("div",{className:"fd-advanced-groups"});
 for(const [key,title,rows] of groups){
  const group=E("section",{className:"fd-advanced-group","data-stat-group":key},E("h4",{},title));
  for(const [icon,label,value,used,explain] of rows){
   group.append(E("div",{className:"fd-advanced-row","data-stat-name":label,title:explain},
    E("span",{className:"fd-advanced-label"},E("span",{className:"fd-advanced-icon"},icon),label),
    E("strong",{className:"fd-advanced-value"},String(value)),
    E("span",{className:"fd-advanced-marker "+(used?"is-active":"")},used?"Idle":"Indicatif")));
  }
  layout.append(group);
 }
 root.append(layout);
 return root;
}

function characterView(){
 const current=CLASS_BY_ID[state.classId]||CLASS_BY_ID.iop;
 const lvl=levelOf(state.playerXp);
 const hero=E("section",{className:"fd-character-hero"},
  E("div",{className:"fd-character-avatar-wrap"},classArt(state.classId,"fd-character-avatar")),
  E("div",{className:"fd-character-hero-info"},
   pill("AVENTURIER · NIVEAU "+playerLevel(),"green"),
   E("h2",{},current[1]),E("p",{},current[3]+" · "+current[4]),
   E("div",{className:"fd-character-hero-metrics"},
    pill("❤️ "+money(maxHp())+" PV"),pill("⚔️ "+money(damage())+" dégâts"),
    pill("🛡️ "+money(defense())+" défense")),
   E("small",{},"Expérience : "+money(lvl.xp)+" / "+money(lvl.next)+" XP"),
   meter(lvl.ratio)),
  B("🏆 Succès",()=>runNav("achievements"),"fd-secondary"));
 const allClasses=E("div",{className:"fd-select-classes"});
 for(const [id,name,icon,role,description] of CLASS_META){
  const selected=state.classId===id;
  const btn=B("",()=>changeClass(id),"fd-select-class "+(selected?"active":""));
  btn.append(classArt(id,"fd-class-card-art"),E("strong",{},name),
   E("small",{},role),selected?pill("✓ Sélectionnée","green"):null);
  allClasses.append(btn);
 }
 return E("div",{className:"fd-character-page"},
  panelHeading("🧙 Mon personnage",
   "Personnalise ton aventurier, choisis ta classe et distribue tes points comme dans DOFUS.",
   pill("Niv. "+playerLevel()+" / 200")),
  hero,
  spellBookPanel("character"),
  E("div",{className:"fd-character-main-layout"},
   characterEquipmentPanel(),
   statAllocationPanel(),
   E("div",{className:"fd-character-side"},
    E("section",{className:"fd-character-panel"},
     E("div",{className:"fd-character-panel-heading"},E("h3",{},"📊 Statistiques")),
     E("div",{className:"fd-stat"},E("span",{},"Niveau de combat"),E("strong",{},playerLevel())),
     E("div",{className:"fd-stat"},E("span",{},"Monstres vaincus"),E("strong",{},money(state.kills))),
     E("div",{className:"fd-stat"},E("span",{},"Dégâts moyens"),E("strong",{},money(damage()))),
     E("div",{className:"fd-stat"},E("span",{},"Défense"),E("strong",{},money(defense()))),
     E("div",{className:"fd-stat"},E("span",{},"Butins en attente"),E("strong",{},money(pendingTotal())))),
    achievementPreview())),
  equipmentSetPanel(),
  advancedCharacterStats(),
  E("section",{className:"fd-character-panel fd-class-chooser"},
   E("div",{className:"fd-character-panel-heading"},E("h3",{},"⚔️ Choisir ma classe"),
    pill(CLASS_META.length+" classes DOFUS")),
   E("p",{className:"fd-muted"},"Choisis librement parmi les classes du Monde des Douze. Les rôles et bonus de combat sont adaptés au prototype idle."),
   allClasses),
  E("div",{className:"fd-character-actions"},
   B("📦 Exporter sauvegarde",exportSave,"fd-secondary"),
   B("📥 Importer sauvegarde",()=>$("#fdImport").click(),"fd-secondary"),
   B("🗑️ Nouvelle partie",()=>{if(confirm("Effacer la sauvegarde DOFUS IDLE complète ?")){localStorage.removeItem(KEY);location.reload()}},"fd-danger"),
   E("input",{id:"fdImport",type:"file",accept:".json,application/json",style:{display:"none"},onchange:async e=>{
    const file=e.target.files[0];if(!file)return;
    try{
     if(file.size>2500000)throw Error("Sauvegarde trop volumineuse");
     const data=JSON.parse(await file.text());
     if(data.version!==2||!data.bank||!data.jobs)throw Error("Fichier invalide");
     localStorage.setItem(KEY,JSON.stringify(data));location.reload();
    }catch(err){toast("Import refusé : "+err.message)}
   }})));
}
function achievementsView(){
 const catalog=achievementCatalog;
 const total=catalog.length;
 const claimed=achievementsClaimed();
 const ready=catalog.filter(a=>!state.achievements?.[a.id]&&achievementReached(a)).length;
 const search=achievementKey(achievementQuery.trim());
 const visible=catalog.filter(a=>
  (achievementCategory==="all"||a.cat===achievementCategory)&&
  (!search||a.search.includes(search)));
 let matches=visible.map(a=>{
  const value=achievementValue(a.metric);
  const done=value>=a.target;
  const redeemed=!!state.achievements[a.id];
  return {a,value,done,redeemed,pct:Math.min(1,a.target?value/a.target:0)};
 }).filter(x=>
  achievementStatus==="all"||
  achievementStatus==="ready"&&x.done&&!x.redeemed||
  achievementStatus==="claimed"&&x.redeemed||
  achievementStatus==="progress"&&!x.done&&!x.redeemed);
 if(achievementSort==="progress")matches.sort((a,b)=>{
  const sa=a.redeemed?2:a.done?0:1,sb=b.redeemed?2:b.done?0:1;
  return sa-sb||b.pct-a.pct||b.a.target-a.a.target||a.a.title.localeCompare(b.a.title,"fr");
 });
 else if(achievementSort==="level")matches.sort((a,b)=>a.a.target-b.a.target||a.a.title.localeCompare(b.a.title,"fr"));
 else if(achievementSort==="reward")matches.sort((a,b)=>b.a.points-a.a.points||b.a.kamas-a.a.kamas);
 else if(achievementSort==="name")matches.sort((a,b)=>a.a.title.localeCompare(b.a.title,"fr"));
 const pages=Math.max(1,Math.ceil(matches.length/ACH_PAGE_SIZE));
 achievementPage=Math.max(0,Math.min(pages-1,achievementPage));
 const select=(value,options,change)=>{
  const el=E("select",{className:"fd-select",value,onchange:e=>{change(e.target.value);achievementPage=0;renderView()}});
  for(const [key,label] of options)el.append(E("option",{value:key},label));
  return el;
 };
 const categoryOptions=[["all","Toutes les catégories ("+money(total)+")"],...Object.entries(ACH_GROUPS).map(([key,label])=>
  [key,label+" ("+money(catalog.filter(a=>a.cat===key).length)+")"])];
 const filters=E("div",{className:"fd-achievement-filters"},
  E("input",{className:"fd-search fd-achievement-search",type:"search",value:achievementQuery,
   placeholder:"Chercher un monstre, une coiffe, une recette, une zone…",
   oninput:e=>{
    const cursor=e.target.selectionStart;achievementQuery=e.target.value;achievementPage=0;
    renderView();const field=$(".fd-achievement-search");
    if(field){field.focus();try{field.setSelectionRange(cursor,cursor)}catch(err){}}
   }}),
  select(achievementCategory,categoryOptions,v=>achievementCategory=v),
  select(achievementStatus,[["all","Tous les états"],["ready","🎁 À récupérer"],["progress","En progression"],["claimed","Déjà obtenus"]],v=>achievementStatus=v),
  select(achievementSort,[["progress","Disponibles / progression"],["name","Ordre alphabétique"],["level","Petits objectifs d'abord"],["reward","Points de succès"]],v=>achievementSort=v));
 const stats=E("div",{className:"fd-achievement-stats"},
  E("div",{},E("strong",{},money(claimed)),E("small",{},"Succès obtenus")),
  E("div",{},E("strong",{},money(ready)),E("small",{},"Récompenses disponibles")),
  E("div",{},E("strong",{},money(achievementsScore())),E("small",{},"Points de succès")),
  E("div",{},E("strong",{},money(total)),E("small",{},"Objectifs au total")));
 const list=E("div",{className:"fd-achievement-grid fd-achievement-library"});
 for(const {a,value,done,redeemed,pct} of matches.slice(achievementPage*ACH_PAGE_SIZE,(achievementPage+1)*ACH_PAGE_SIZE)){
  const source=a.metric.startsWith("monster:")?"🐉":
   a.metric.startsWith("recipe:")?"🔨":a.metric.startsWith("harvest:")?"🌿":
   a.metric.startsWith("zone")||a.metric.startsWith("visitZone:")?"🗺️":
   a.metric.startsWith("job:")?"🪓":"🏆";
  const card=E("article",{className:"fd-achievement-card "+(redeemed?"claimed":done?"ready":"")},
   E("div",{className:"fd-achievement-card-header"},
    E("strong",{},source+" "+a.title),pill(redeemed?"✓ Obtenu":done?"À récupérer":"En cours",
     redeemed?"green":done?"gold":"")),
   E("p",{},a.desc),meter(pct*100),
   E("div",{className:"fd-achievement-progress"},
    E("small",{},money(Math.min(value,a.target))+" / "+money(a.target)),
    E("small",{},"⭐ "+a.points+" pt"+(a.points>1?"s":""))),
   E("div",{className:"fd-achievement-rewards"},
    pill("🪙 "+money(a.kamas)),pill("✨ "+money(a.xp)+" XP")),
   B(redeemed?"✓ Récompense reçue":done?"🎁 Récupérer":"Objectif en cours",
    ()=>claimAchievement(a.id),"fd-button",redeemed||!done),
   B((state.trackedAchievements||[]).includes(a.id)?"📌 Ne plus suivre":"🎯 Suivre ce succès",
    ()=>toggleTrackAchievement(a.id),"fd-secondary fd-achievement-watch",redeemed));
  list.append(card);
 }
 const root=E("div",{className:"fd-achievements-page"},
  panelHeading("🏆 Succès du Monde des Douze",
   "Des objectifs pour chaque monstre, recette, zone, ressource et métier. Les récompenses sont propres à DOFUS IDLE.",
   pill(money(total)+" succès")),
  stats,
  E("section",{className:"fd-achievement-summary"},
   E("div",{className:"fd-achievement-summary-head"},
    E("strong",{},"Progression générale"),pill(money(claimed)+" / "+money(total),"green")),
   meter(total?claimed*100/total:0),
   E("small",{},"Récompenses en XP, kamas et points de succès, à récupérer une seule fois.")),
  filters,
  E("div",{className:"fd-achievement-list-header"},
   E("strong",{},money(matches.length)+" succès affichables"),
   ready?B("🎁 Réclamer jusqu'à 40 récompenses",()=>claimReadyAchievements(40),"fd-secondary"):null),
  list);
 if(!matches.length)root.append(E("div",{className:"fd-achievement-empty"},
  "Aucun succès ne correspond aux filtres. Modifie la recherche ou sélectionne une autre catégorie."));
 root.append(E("div",{className:"fd-achievement-pages"},
  B("← Précédent",()=>{achievementPage=Math.max(0,achievementPage-1);renderView()},"fd-secondary",achievementPage===0),
  pill("Page "+(achievementPage+1)+" / "+pages),
  B("Suivant →",()=>{achievementPage=Math.min(pages-1,achievementPage+1);renderView()},"fd-secondary",achievementPage>=pages-1)));
 return root;
}
function claimReadyAchievements(limit=40){
 let n=0,kamas=0,xp=0;
 for(const a of achievementCatalog){
  if(n>=limit)break;
  if(state.achievements[a.id]||!achievementReached(a))continue;
  state.achievements[a.id]=Date.now();
  state.trackedAchievements=(state.trackedAchievements||[]).filter(x=>x!==a.id);
  kamas+=a.kamas;xp+=a.xp;n++;
 }
 if(!n){toast("Aucun succès à récupérer.");return}
 state.kamas+=kamas;state.earned+=kamas;state.playerXp+=xp;
 toast("🏆 "+n+" succès récupérés : +"+money(kamas)+" kamas, +"+money(xp)+" XP.");
 render();save();
}
function exportSave(){
 save();const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob);const a=E("a",{href:url,download:"dofus-idle-save-v2.json"});
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
}

/* Carnet de quêtes de DOFUS IDLE : aventures construites avec les vraies
   régions, sous-zones, monstres et donjons, mais scénarios et XP adaptés. */
let questCatalog=[],questRegion="all",questSearch="",questPage=0;
function buildQuestCatalog(){
 const result=[];
 for(const [region,zones] of regionCatalog()){
  const ordered=zones.slice().sort((a,b)=>a[1][2]-b[1][2]);
  const normal=ordered.filter(([,z])=>Number(z[5])<0);
  const dungeons=ordered.filter(([id,z])=>Number(z[5])>=0&&dungeonRoomList(id).length>=2);
  if(!normal.length&&!dungeons.length)continue;
  const start=region==="Incarnam"?(normal.find(([,z])=>/champs/i.test(z[0]))||normal[0]):normal[0];
  const later=normal.find(([id])=>id!==start?.[0])||normal[0];
  const key=achievementKey(region).replace(/\s+/g,"-");
  const chain=[];
  if(start){
   chain.push(["visitZone:"+start[0],1,"Découvrir "+start[1][0],
    "Explore "+start[1][0]+", dans la région "+region+"."]);
   const mid=start[1][3].map(String).filter(id=>world.monsters[id])
    .sort((a,b)=>world.monsters[a][1]-world.monsters[b][1])[0];
   if(mid)chain.push(["monster:"+mid,5,"Première chasse : "+world.monsters[mid][0],
    "Vaincs cinq "+world.monsters[mid][0]+"."]);
  }
  if(later?.[0]!==start?.[0])chain.push(["visitZone:"+later[0],1,
   "Explorer "+later[1][0],"Découvre une seconde sous-zone : "+later[1][0]+"."]);
  if(dungeons.length){
   const dungeon=dungeons[0];
   chain.push(["dungeonClear:"+dungeon[0],1,"Vaincre le boss de "+dungeon[1][0],
    "Termine le donjon "+dungeon[1][0]+" et bats son boss final."]);
  }
  for(let i=0;i<chain.length;i++){
   const [metric,target,title,desc]=chain[i];
   const prev=i?result[result.length-1]?.id:null;
   // La chaîne doit rester dans la même région : pas de prérequis
   // inter-région ; les joueurs sont libres d'explorer toutes les zones.
   const id="quest-"+key+"-"+i;
   result.push({id,region,metric,target,title,desc,prev:i?("quest-"+key+"-"+(i-1)):null,
    kamas:75+(i+1)*60+(ordered[0]?.[1][2]||1)*7,
    xp:80+(i+1)*80+(ordered[0]?.[1][2]||1)*8,
    final:i===chain.length-1});
  }
 }
 questCatalog=result;
}
function questValue(q){
 if(q.metric.startsWith("dungeonClear:"))return Number(state.dungeonClears?.[q.metric.slice(13)])||0;
 return achievementValue(q.metric);
}
function questUnlocked(q){return !q.prev||!!state.questClaims?.[q.prev]}
function claimQuest(qid){
 const q=questCatalog.find(x=>x.id===qid);
 if(!q||state.questClaims[qid]||!questUnlocked(q)||questValue(q)<q.target)return;
 state.questClaims[qid]=Date.now();
 state.kamas+=q.kamas;state.earned+=q.kamas;state.playerXp+=q.xp;
 if(q.final){
  const name="Explorateur de "+q.region;
  if(!state.unlockedTitles.includes(name))state.unlockedTitles.push(name);
  toast("🎖️ Nouveau titre : "+name);
 }
 toast("📜 Quête accomplie : "+q.title+" · +"+q.xp+" XP / +"+q.kamas+" kamas");
 render();save();
}
function questsView(){
 const all=questCatalog,completed=all.filter(q=>state.questClaims[q.id]).length;
 const search=achievementKey(questSearch);
 const matched=all.filter(q=>(questRegion==="all"||questRegion===q.region)&&
  (!search||achievementKey(q.title+" "+q.desc+" "+q.region).includes(search)));
 matched.sort((a,b)=>{
  const status=q=>state.questClaims[q.id]?3:questUnlocked(q)&&questValue(q)>=q.target?0:
   questUnlocked(q)?1:2;
  return status(a)-status(b)||a.region.localeCompare(b.region,"fr");
 });
 const pageCount=Math.max(1,Math.ceil(matched.length/24));
 questPage=Math.min(Math.max(0,questPage),pageCount-1);
 const root=E("div",{className:"fd-adventure-page"},
  panelHeading("📜 Carnet de quêtes","Des parcours régionaux construits à partir des vrais monstres et donjons du jeu. Les scénarios et récompenses sont propres à DOFUS IDLE.",
   pill(money(completed)+" / "+money(all.length)+" quêtes")),
  E("section",{className:"fd-adventure-summary"},
   pill("🌍 "+new Set(all.map(q=>q.region)).size+" régions"),
   pill("📜 "+money(completed)+" terminées"),
   pill("🏆 "+money(all.filter(q=>questUnlocked(q)&&questValue(q)>=q.target&&!state.questClaims[q.id]).length)+" récompenses prêtes"),
   meter(all.length?completed*100/all.length:0)));
 const filter=E("div",{className:"fd-adventure-filters"},
  E("input",{type:"search",className:"fd-quest-search",value:questSearch,
   placeholder:"Chercher une quête, un monstre ou une région…",oninput:e=>{
    questSearch=e.target.value;questPage=0;renderView();
    const i=$(".fd-quest-search");if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length)}
   }}),
  E("select",{className:"fd-select",value:questRegion,onchange:e=>{questRegion=e.target.value;questPage=0;renderView()}},
   E("option",{value:"all"},"Toutes les régions"),
   ...[...new Set(all.map(q=>q.region))].sort((a,b)=>a==="Incarnam"?-1:b==="Incarnam"?1:a.localeCompare(b,"fr"))
    .map(region=>E("option",{value:region},region))));
 root.append(filter);
 const grid=E("div",{className:"fd-adventure-grid"});
 for(const q of matched.slice(questPage*24,(questPage+1)*24)){
  const v=questValue(q),claimed=!!state.questClaims[q.id],unlocked=questUnlocked(q);
  const ready=unlocked&&!claimed&&v>=q.target;
  grid.append(E("article",{className:"fd-quest-card "+(claimed?"done":ready?"ready":!unlocked?"locked":""),
   "data-quest-id":q.id},
   E("div",{className:"fd-quest-card-header"},E("strong",{},q.title),pill(q.region)),
   E("p",{},q.desc),
   E("small",{},claimed?"✓ Quête terminée":!unlocked?"🔒 Termine l'étape précédente":
    ready?"🎁 Récompense disponible":"En cours"),
   meter(v/q.target*100),
   E("small",{},money(Math.min(v,q.target))+" / "+q.target),
   E("div",{className:"fd-quest-rewards"},pill("✨ "+money(q.xp)+" XP"),pill("🪙 "+money(q.kamas)+" kamas"),
    q.final?pill("🎖️ Titre de région"):null),
   B(claimed?"✓ Terminée":ready?"🎁 Récupérer":"Objectif en cours",
    ()=>claimQuest(q.id),"fd-button",!ready)));
 }
 root.append(grid,
  E("div",{className:"fd-achievement-pages"},
   B("← Précédent",()=>{questPage--;renderView()},"fd-secondary",questPage===0),
   pill("Page "+(questPage+1)+" / "+pageCount),
   B("Suivant →",()=>{questPage++;renderView()},"fd-secondary",questPage>=pageCount-1)));
 return root;
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
 else if(v==="achievements")node=achievementsView();
 else if(v==="quests")node=questsView();
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
  try{
   const r=await fetch("./assets/spells/catalog.json");
   if(r.ok){
    const entries=await r.json();
    if(entries&&Object.keys(entries).length===57)window.DOFUS_IDLE_SPELL_ASSETS=entries;
   }
  }catch(e){/* Les pictogrammes restent visibles si les images ne sont pas déployées. */}
  // Portraits DOFUS 3 des 19 classes, générés depuis images-class.zip.
  try{
   const r=await fetch("./assets/classes/catalog.json");
   if(r.ok){
    const catalog=await r.json();
    if(catalog&&Object.keys(catalog).length===19)window.DOFUS_IDLE_CLASS_ASSETS=catalog;
   }
  }catch(e){/* anciens déploiements : garde les pictogrammes de secours */}
  for(const [mid,m] of Object.entries(world.monsters)){
   for(const [iid,rate] of m[4]){
    if(!dropIndex[iid])dropIndex[iid]=[];dropIndex[iid].push([mid,rate]);
   }
  }
  // Import unique des effets et panoplies : le jeu garde la dernière sauvegarde
  // même en cas de chargement réseau impossible.
  try{
   const r=await fetch("./data/equipment-v7.json");
   if(r.ok){
    const data=await r.json();
    if(data?.meta?.itemCount>4000&&data?.meta?.setCount>400)equipmentData=data;
   }
  }catch(e){console.warn("Référentiel de stuff inaccessible",e)}
  // Catalogue des vrais équipements fabriquables : le taux d'obtention bonus
  // est propre à DOFUS IDLE, les identités et niveaux proviennent du client.
  gearPool=[...new Set(Object.values(core.recipes).flatMap(list=>list.map(recipe=>String(recipe[0]))))]
    .filter(id=>core.items[id]&&gearSlot(id)&&itemLevel(id)<=200);
  state=load();
  // Migration non destructive de l'historique d'exploration v4 vers les
  // compteurs régionaux ; les valeurs déjà enregistrées sont conservées.
  if(!Object.keys(state.regionZoneCount||{}).length){
   for(const zid of Object.keys(state.visitedZones||{})){
    const z=world.zones[zid];if(!z)continue;
    const region=regionFor(z);
    state.regionZoneCount[region]=(state.regionZoneCount[region]||0)+1;
   }
  }
  buildAchievementCatalog();buildQuestCatalog();
  offline();state.hp=clamp(Number(state.hp)||maxHp(),1,maxHp());
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
  window.DOFUS_IDLE_FULL={getState:()=>JSON.parse(JSON.stringify(state)),core,world,levelOf,getGearPoolSize:()=>gearPool.length,simulateSeconds:seconds=>{tick(seconds);render()},getGearSummary:()=>gearStatsFor(state.equipment),getEquipmentData:()=>equipmentData,getGearSlots:id=>availableGearSlots(id),getClassSpells:classId=>CLASS_SPELLS[classId]||[],castSpell:id=>castClassSpell(id,true),
 getDungeonRooms:id=>dungeonRoomList(id),startDungeon:id=>startDungeon(id),getAchievementSummary:()=>({total:achievementCatalog.length,claimed:achievementsClaimed(),ready:achievementCatalog.filter(a=>!state.achievements[a.id]&&achievementReached(a)).length,categories:Object.fromEntries(Object.keys(ACH_GROUPS).map(k=>[k,achievementCatalog.filter(a=>a.cat===k).length]))}),getAchievementInfo:id=>{const a=achievementCatalog.find(x=>x.id===id);return a?{...a,value:achievementValue(a.metric),reached:achievementReached(a),claimed:!!state.achievements[a.id]}:null}};
 }catch(err){
  console.error("DOFUS IDLE chargement",err);
  $("#view").replaceChildren(E("div",{className:"fd-error"},E("h2",{},"La base de données DOFUS 3 n'a pas pu être chargée."),
   E("p",{},String(err.message)),
   B("Réessayer",()=>location.reload(),"fd-button")));
 }
}
init();
})();
