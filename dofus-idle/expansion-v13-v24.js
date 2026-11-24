/* DOFUS IDLE — Extensions V13 à V24.
   Systèmes idle originaux inspirés du Monde des Douze ; pas une reproduction
   des mécaniques officielles. Aucun reset ni nouvelle clé localStorage. */
(function(){
"use strict";
const TABS=[
 ["combat","V13","⚔️","Combat tactique"],
 ["builds","V14","📖","Builds de sorts"],
 ["forgemagie","V15","🔮","Forgemagie"],
 ["carte","V16","🗺️","Carte du monde"],
 ["boss","V17","🏰","Contrats de boss"],
 ["familiers","V18","🐾","Familiers"],
 ["marche","V19","🪙","Marché"],
 ["dofus","V20","🥚","Quête des Dofus"],
 ["metiers","V21","🔨","Contrats de métier"],
 ["dimensions","V22","🌀","Dimensions"],
 ["songes","V23","🌙","Songes infinis"],
 ["guilde","V24","🏛️","Guilde"]
];
const PETS=[
 {id:"bouftou",name:"Bouftou apprivoisé",icon:"🐑",min:1,cost:300,bonus:2},
 {id:"bwak",name:"Bwak flamboyant",icon:"🐦",min:30,cost:2500,bonus:4},
 {id:"nomoon",name:"Nomoon",icon:"🐒",min:70,cost:10000,bonus:6},
 {id:"dragodinde",name:"Dragodinde Pourpre",icon:"🐲",min:110,cost:30000,bonus:9}
];
const DOFUS=[
 {id:"emeraude",name:"Émeraude",icon:"💚",level:20,kills:30,dungeons:1,bonus:3},
 {id:"pourpre",name:"Pourpre",icon:"🔴",level:50,kills:150,dungeons:2,bonus:5},
 {id:"turquoise",name:"Turquoise",icon:"🔵",level:80,kills:400,dungeons:4,bonus:7},
 {id:"ocre",name:"Ocre",icon:"🟠",level:120,kills:1000,dungeons:8,bonus:9},
 {id:"ivoire",name:"Ivoire",icon:"🤍",level:160,kills:2400,dungeons:12,bonus:11},
 {id:"ebene",name:"Ébène",icon:"🖤",level:200,kills:5000,dungeons:18,bonus:13}
];
const DIMENSIONS=[
 ["enutrosor","Enutrosor","💰",60,180,12],
 ["srambad","Srambad","🗡️",100,350,22],
 ["xelorium","Xélorium","⏳",140,600,35],
 ["ecaflipus","Écaflipus","🎲",180,900,50]
];
function ensure(s){
 if(!s.expansion||typeof s.expansion!=="object")s.expansion={};
 const e=s.expansion;
 if(!TABS.some(t=>t[0]===e.tab))e.tab="combat";
 e.builds=e.builds&&typeof e.builds==="object"&&!Array.isArray(e.builds)?e.builds:{};
 e.runes=e.runes&&typeof e.runes==="object"&&!Array.isArray(e.runes)?e.runes:{};
 e.dofus=e.dofus&&typeof e.dofus==="object"&&!Array.isArray(e.dofus)?e.dofus:{};
 e.pets=e.pets&&typeof e.pets==="object"&&!Array.isArray(e.pets)?e.pets:{};
 e.bossClaims=e.bossClaims&&typeof e.bossClaims==="object"&&!Array.isArray(e.bossClaims)?e.bossClaims:{};
 e.contracts=e.contracts&&typeof e.contracts==="object"&&!Array.isArray(e.contracts)?e.contracts:{};
 e.dimensionClears=e.dimensionClears&&typeof e.dimensionClears==="object"&&!Array.isArray(e.dimensionClears)?e.dimensionClears:{};
 e.guild=e.guild&&typeof e.guild==="object"&&!Array.isArray(e.guild)?e.guild:{};
 e.dreams=e.dreams&&typeof e.dreams==="object"?e.dreams:{floor:1,wins:0,failed:0};
 e.marketTrades=Math.max(0,Number(e.marketTrades)||0);
 e.shards=Math.max(0,Number(e.shards)||0);
 e.sigils=Math.max(0,Number(e.sigils)||0);
 e.dimEssence=Math.max(0,Number(e.dimEssence)||0);
 e.guildTokens=Math.max(0,Number(e.guildTokens)||0);
 e.petActive=typeof e.petActive==="string"?e.petActive:"";
 e.expedition=e.expedition&&typeof e.expedition==="object"?e.expedition:null;
 e.bossWins=Math.max(0,Number(e.bossWins)||0);
 e.specialKills=Math.max(0,Number(e.specialKills)||0);
 return e;
}
function dungeonCount(s){return Object.values(s.dungeonClears||{}).reduce((n,v)=>n+Math.max(0,Number(v)||0),0)}
function petBonus(e){const p=PETS.find(p=>p.id===e.petActive);return p&&e.pets[p.id]?p.bonus+Math.min(8,Math.floor((e.pets[p.id].xp||0)/30)):0}
function damageBonus(s){
 const e=ensure(s),rune=[...new Set(Object.values(s.equipment||{}).filter(Boolean).map(String))].reduce((n,id)=>n+Math.min(5,Math.max(0,Number(e.runes[id])||0)),0);
 const eggs=DOFUS.filter(d=>e.dofus[d.id]).reduce((n,d)=>n+d.bonus,0);
 return Math.min(160,rune+eggs+petBonus(e)+Math.min(10,Number(e.guild.forge)||0)*2+Math.min(20,Number(e.guild.bossTraining)||0)*2+Math.min(50,Number(e.dreams.wins)||0)*.15);
}
function defenseBonus(s){const e=ensure(s);return Math.min(80,(Number(e.guild.rempart)||0)*3+Math.floor(petBonus(e)/2))}
function onVictory(s,m,a){
 const e=ensure(s);
 e.specialKills+=1;
 e.shards+=Math.random()<(e.hardMode?.30:.12)?1:0;
 if(e.petActive&&e.pets[e.petActive])e.pets[e.petActive].xp=(Number(e.pets[e.petActive].xp)||0)+1;
 // Les contrats restent passifs et les mêmes victoires ne sont pas dupliquées.
 if(e.expedition&&e.expedition.kind==="hunt"&&String(a.id)===String(e.expedition.monsterId))
  e.expedition.progress=Math.min(e.expedition.target,e.expedition.progress+1);
}
function onCraft(s,job,id,quantity){
 const e=ensure(s),count=Math.max(0,Number(s.craftedRecipes?.[job+":"+id])||0);
 if(count>0&&count%10===0)e.guildTokens++;
}
function onDungeon(s,zoneId){
 const e=ensure(s);e.bossWins++;e.sigils++;e.guildTokens+=2;
 if(!e.bossClaims["first-"+zoneId]){e.bossClaims["first-"+zoneId]=true;e.shards+=2}
}
function h(tag,cls,text){
 const el=document.createElement(tag);if(cls)el.className=cls;
 if(text!==undefined&&text!==null)el.textContent=String(text);
 return el;
}
function button(label,action,disabled=false,kind=""){
 const b=h("button","fd-exp-button "+kind,label);b.type="button";b.disabled=!!disabled;b.addEventListener("click",action);return b;
}
function text(parent,content,tag="p",cls=""){const el=h(tag,cls,content);parent.append(el);return el}
function card(parent,title,detail){const el=h("article","fd-exp-card");text(el,title,"h3");if(detail)text(el,detail,"p","fd-muted");parent.append(el);return el}
function badge(parent,value){return text(parent,value,"span","fd-exp-chip")}
function commit(a){a.save();a.render()}
function spend(s,kamas){if(!Number.isFinite(kamas)||kamas<0||s.kamas<kamas)return false;s.kamas-=kamas;return true}
function bonusLabel(s){return "Bonus offensif de l'extension : +"+damageBonus(s).toFixed(1)+" dégâts | Défense : +"+defenseBonus(s)}
function navigateCard(c,label,target){c.append(button(label,()=>target()))}
function sectionCombat(s,a,root){
 const e=ensure(s);const c=card(root,"⚔️ V13 · Modificateurs de combat",
 "Le combat conserve son rythme idle. Les résistances et les phases spéciales des boss déjà existantes restent actives.");
 badge(c,bonusLabel(s));
 text(c,"Éclats de rune : "+e.shards+" • Sceaux de boss : "+e.sigils);
 text(c,"Victoires depuis l'extension : "+e.specialKills+". Mode normal : 12 % d'éclat, mode défi : 30 % mais les ennemis frappent plus fort.");
 c.append(button(e.hardMode?"⚠️ Mode défi actif — désactiver":"Activer le mode défi (+35 % dégâts reçus)",()=>{
  e.hardMode=!e.hardMode;commit(a);
 }));
 navigateCard(c,"Ouvrir les combats",()=>a.nav("combat"));
}
function sectionBuilds(s,a,root){
 const e=ensure(s),c=card(root,"📖 V14 · Configurations des sorts",
 "Sauvegarde 3 rotations de sorts par classe. Un build mémorise les sorts automatiques, sans modifier les caractéristiques ni l'équipement.");
 const classId=s.classId||"iop",spells=a.classSpells(classId)||[];
 for(let i=1;i<=3;i++){
  const key=classId+":"+i,slot=e.builds[key],line=h("div","fd-exp-line");
  text(line,"Build "+i+" · "+(slot?"Enregistré":"Vide"),"strong");
  line.append(button("💾 Enregistrer",()=>{
   e.builds[key]={classId,preferences:Object.fromEntries(spells.map(sp=>[sp[0],s.spellPreferences?.[classId+":"+sp[0]]!==false]))};
   commit(a);
  }));
  line.append(button("▶ Charger",()=>{
   if(!slot)return;
   s.spellPreferences=s.spellPreferences||{};
   for(const [id,on] of Object.entries(slot.preferences))if(spells.some(sp=>sp[0]===id))s.spellPreferences[classId+":"+id]=!!on;
   a.toast("Build "+i+" de "+classId+" équipé");commit(a);
  },!slot));
  c.append(line);
 }
 navigateCard(c,"Configurer les sorts",()=>a.nav("character"));
}
function sectionForgemagie(s,a,root){
 const e=ensure(s),c=card(root,"🔮 V15 · Atelier des runes",
 "Amélioration simplifiée des pièces équipées : 1 à 5 niveaux par identifiant d'objet, coût croissant en kamas et éclats. L'amélioration donne un bonus fixe en dégâts.");
 badge(c,"Éclats disponibles : "+e.shards);
 const entries=[...new Set(Object.values(s.equipment||{}).filter(Boolean).map(String))];
 if(!entries.length)text(c,"Équipe d'abord une arme ou une pièce d'armure.");
 for(const id of entries.slice(0,18)){
  const lvl=Math.min(5,Number(e.runes[id])||0),cost=150*(lvl+1)*(lvl+1),shards=lvl+1;
  const line=h("div","fd-exp-line");
  text(line,a.itemName(id)+" · Rune "+lvl+"/5","strong");
  line.append(button("Améliorer : "+cost+" 🪙 / "+shards+" ✨",()=>{
   if(s.kamas<cost||e.shards<shards){a.toast("Kamas ou éclats insuffisants.");return}
   s.kamas-=cost;
   e.shards-=shards;e.runes[id]=lvl+1;commit(a);
  },lvl>=5||s.kamas<cost||e.shards<shards));
  c.append(line);
 }
}
function sectionCarte(s,a,root){
 const c=card(root,"🗺️ V16 · Atlas du Monde des Douze",
 "Choisis une région et accède aux zones de combat existantes. L'atlas n'invente aucune nouvelle zone dans la base DOFUS.");
 const regions=a.regions().slice().sort((x,y)=>{
  const rank=n=>n==="Incarnam"?-3:n==="Astrub"?-2:n==="Amakna"?-1:0;
  return rank(x[0])-rank(y[0])||a.regionMin(x[1])-a.regionMin(y[1]);
 });
 const grid=h("div","fd-exp-region-grid");
 for(const [name,zones] of regions.slice(0,70)){
  const r=h("article","fd-exp-region");
  text(r,name,"strong");text(r,zones.length+" zones • niveau conseillé "+a.regionMin(zones),"small");
  r.append(button("Explorer",()=>a.openRegion(name)));
  grid.append(r);
 }
 c.append(grid);
}
function sectionBoss(s,a,root){
 const e=ensure(s),c=card(root,"🏰 V17 · Contrats de donjon",
 "Le premier succès de chaque donjon accorde deux éclats et un sceau par boss vaincu. Échange les sceaux contre un entraînement durable.");
 badge(c,"Boss vaincus : "+e.bossWins+" • Sceaux : "+e.sigils);
 const cost=3+2*Math.max(0,Number(e.guild.bossTraining)||0);
 c.append(button("Entraînement boss : "+cost+" sceaux (+2 dégâts)",()=>{
  if(e.sigils<cost)return;e.sigils-=cost;e.guild.bossTraining=(Number(e.guild.bossTraining)||0)+1;commit(a);
 },e.sigils<cost||Number(e.guild.bossTraining)>=20));
 navigateCard(c,"Choisir un donjon",()=>a.nav("dungeons"));
}
function sectionPets(s,a,root){
 const e=ensure(s),c=card(root,"🐾 V18 · Compagnons et montures",
 "Un seul compagnon actif. Son bonus augmente avec les victoires et ne consomme pas de nourriture automatiquement.");
 const grid=h("div","fd-exp-cards");
 for(const p of PETS){
  const owned=!!e.pets[p.id],active=e.petActive===p.id;
  const slot=card(grid,p.icon+" "+p.name,"Niveau requis "+p.min+" • Bonus : +"+(p.bonus+(owned?Math.min(8,Math.floor((e.pets[p.id].xp||0)/30)):0))+" dégâts");
  if(owned)badge(slot,"Expérience : "+(e.pets[p.id].xp||0));
  slot.append(button(owned?(active?"✓ Actif":"Activer"):"Adopter • "+p.cost+" 🪙",()=>{
   if(!owned){if(a.level()<p.min||!spend(s,p.cost))return;e.pets[p.id]={xp:0};}
   e.petActive=p.id;commit(a);
  },active||(!owned&&(a.level()<p.min||s.kamas<p.cost))));
 }
 c.append(grid);
}
function sectionMarket(s,a,root){
 const e=ensure(s),c=card(root,"🪙 V19 · Comptoir d'Astrub",
 "Marché simulé et déterministe : achat plus cher que revente. Les objets sont de vrais identifiants DOFUS et les échanges modifient la banque.");
 badge(c,"Transactions : "+e.marketTrades);
 const eligible=Object.entries(s.bank||{}).filter(([id,n])=>n>0&&a.exists(id)&&!a.gearSlot(id))
  .sort((x,y)=>Number(y[1])-Number(x[1])).slice(0,20);
 const buyer=Object.entries(a.core.gather||{}).flatMap(([,rows])=>rows.slice(0,2).map(x=>String(x[0])))
  .filter(id=>a.exists(id)).slice(0,15);
 const marketPrice=id=>Math.max(2,a.itemPrice(id));
 text(c,"Vendre depuis la banque","h4");
 if(!eligible.length)text(c,"Aucune ressource disponible.");
 for(const [id,n] of eligible){
  const line=h("div","fd-exp-line");
  text(line,a.itemName(id)+" ×"+n,"strong");
  line.append(button("Vendre 1 • "+marketPrice(id)+" 🪙",()=>{
   if(!a.take(id,1))return;s.kamas+=marketPrice(id);s.earned=(s.earned||0)+marketPrice(id);e.marketTrades++;commit(a);
  }));
  c.append(line);
 }
 text(c,"Acheter des ressources de départ","h4");
 for(const id of [...new Set(buyer)].slice(0,12)){
  const price=marketPrice(id)*3;
  const line=h("div","fd-exp-line");
  text(line,a.itemName(id),"strong");
  line.append(button("Acheter 1 • "+price+" 🪙",()=>{
   if(s.kamas<price||!a.give(id,1))return;
   s.kamas-=price;e.marketTrades++;commit(a);
  },s.kamas<price));c.append(line);
 }
}
function sectionDofus(s,a,root){
 const e=ensure(s),c=card(root,"🥚 V20 · Les six Dofus",
 "Quêtes longues adaptées à l'Idle : niveaux, victoires et donjons terminés. Les Dofus sont des récompenses de progression liées au compte local, distinctes des objets de la banque.");
 const cleared=dungeonCount(s);
 for(const d of DOFUS){
  const obtained=!!e.dofus[d.id],ok=a.level()>=d.level&&(Number(s.kills)||0)>=d.kills&&cleared>=d.dungeons;
  const line=h("div","fd-exp-line");
  text(line,d.icon+" Dofus "+d.name+" · "+d.level+" niv. / "+d.kills+" victoires / "+d.dungeons+" donjons","strong");
  line.append(button(obtained?"✓ Acquis":ok?"Réclamer (+"+d.bonus+" dégâts)":"Objectif incomplet",()=>{
   if(!ok||obtained)return;e.dofus[d.id]=Date.now();a.toast("Dofus "+d.name+" obtenu");commit(a);
  },!ok||obtained));c.append(line);
 }
}
function sectionMetiers(s,a,root){
 const e=ensure(s),c=card(root,"🔨 V21 · Ordres des artisans",
 "Contrats fondés sur les vrais objets déjà fabriqués. Chaque palier de 25 créations donne des jetons de guilde, sans consommer à nouveau les ressources.");
 const recipes=Object.entries(s.craftedRecipes||{}).filter(([,n])=>Number(n)>0).sort((x,y)=>Number(y[1])-Number(x[1])).slice(0,30);
 for(const [key,n] of recipes){
  const [job,id]=key.split(":"),tier=Math.floor(Math.max(0,Number(n)||0)/25);
  const claimed=Number(e.contracts[key])||0;
  const line=h("div","fd-exp-line");text(line,a.itemName(id)+" · "+n+" créations • rang "+tier,"strong");
  line.append(button(tier>claimed?"Récupérer "+(tier-claimed)*3+" jetons":"À poursuivre",()=>{
   if(tier<=claimed)return;e.guildTokens+=(tier-claimed)*3;e.contracts[key]=tier;commit(a);
  },tier<=claimed));c.append(line);
 }
 if(!recipes.length)text(c,"Fabrique quelques objets pour débloquer tes premiers contrats.");
 navigateCard(c,"Voir les métiers",()=>a.nav("recipes"));
}
function sectionDimensions(s,a,root){
 const e=ensure(s),c=card(root,"🌀 V22 · Expéditions dimensionnelles",
 "Des expéditions idle à lancer volontairement. Aucun combat ni action en cours n'est interrompu. Tu récupères les récompenses après la durée indiquée.");
 if(e.expedition?.kind==="dimension"){
  const exp=e.expedition,remaining=Math.max(0,Math.ceil((exp.ends-Date.now())/1000));
  badge(c,remaining?"En cours : "+remaining+" s restantes":"Expédition terminée");
  c.append(button("Réclamer la récompense",()=>{
   if(Date.now()<exp.ends)return;e.dimEssence+=exp.reward;e.dimensionClears[exp.id]=(Number(e.dimensionClears[exp.id])||0)+1;
   e.expedition=null;commit(a);
  },remaining>0));
 }else if(e.expedition){text(c,"Une expédition est déjà en cours.");}
 else for(const [id,name,icon,min,cost,reward] of DIMENSIONS){
  const line=h("div","fd-exp-line");text(line,icon+" "+name+" • Niveau "+min+" • "+cost+" kamas","strong");
  line.append(button("Partir (2 min)",()=>{
   if(a.level()<min||!spend(s,cost))return;
   e.expedition={kind:"dimension",id,ends:Date.now()+120000,reward};commit(a);
  },a.level()<min||s.kamas<cost));c.append(line);
 }
 badge(c,"Essences dimensionnelles : "+e.dimEssence);
}
function sectionSonges(s,a,root){
 const e=ensure(s),c=card(root,"🌙 V23 · Songes infinis",
 "Épreuve idle à étage croissant. Un défi de puissance sans risque de perdre ta partie : le coût est prélevé au lancement et la réussite est calculée à la fin.");
 const d=e.dreams;
 badge(c,"Étage "+d.floor+" • Réussites "+d.wins+" • Échecs "+d.failed);
 if(e.expedition?.kind==="dream"){
  const exp=e.expedition,wait=Math.max(0,Math.ceil((exp.ends-Date.now())/1000));
  c.append(button(wait?"En cours : "+wait+" secondes":"Conclure l'épreuve",()=>{
   if(wait)return;
   const power=a.attack()+a.guard()*2;
   const required=15+Math.round(exp.floor*5.5);
   if(power>=required){d.floor++;d.wins++;e.shards+=1+Math.floor(exp.floor/5);e.guildTokens+=1;a.toast("Songe remporté !")}
   else{d.failed++;a.toast("Épreuve échouée. Améliore ton équipement et tes sorts.")}
   e.expedition=null;commit(a);
  },wait>0));
 }else if(!e.expedition){
  const cost=20+10*d.floor;
  c.append(button("Explorer l'étage • "+cost+" 🪙 (45 s)",()=>{
   if(!spend(s,cost))return;e.expedition={kind:"dream",floor:d.floor,ends:Date.now()+45000};commit(a);
  },s.kamas<cost));
 }else text(c,"Une autre expédition est en cours.");
}
function sectionGuilde(s,a,root){
 const e=ensure(s),c=card(root,"🏛️ V24 · Refuge de guilde",
 "Améliorations permanentes de la guilde personnelle. Les jetons viennent des boss, des fabrications et des songes. Le multijoueur n'est pas simulé.");
 badge(c,"Jetons de guilde : "+e.guildTokens);
 for(const [id,title,desc,max] of [
  ["forge","Forge commune","+2 dégâts par niveau",10],
  ["rempart","Rempart protecteur","+3 défense par niveau",10],
  ["bossTraining","Entraînement des boss","+2 dégâts par niveau, acheté avec les sceaux",20]]){
  const lvl=Math.min(max,Number(e.guild[id])||0);
  const line=h("div","fd-exp-line");
  text(line,title+" · "+lvl+"/"+max+" · "+desc,"strong");
  if(id!=="bossTraining"){
   const price=3+lvl*2;
   line.append(button("Améliorer • "+price+" jetons",()=>{
    if(e.guildTokens<price)return;e.guildTokens-=price;e.guild[id]=lvl+1;commit(a);
   },lvl>=max||e.guildTokens<price));
  }
  c.append(line);
 }
}
const SECTIONS={combat:sectionCombat,builds:sectionBuilds,forgemagie:sectionForgemagie,
 carte:sectionCarte,boss:sectionBoss,familiers:sectionPets,marche:sectionMarket,
 dofus:sectionDofus,metiers:sectionMetiers,dimensions:sectionDimensions,
 songes:sectionSonges,guilde:sectionGuilde};
function view(s,api){
 const e=ensure(s),root=h("div","fd-expansion");
 const header=h("header","fd-exp-hero");
 text(header,"⚜️ Les Chroniques des Douze","h2");
 text(header,"Extensions jouables V13–V24 : progression, artisanat, aventures et objectifs de fin de jeu. Les règles sont des adaptations originales pour l'idle.");
 header.append(h("div","fd-exp-metrics"));
 root.append(header);
 const tabs=h("nav","fd-exp-tabs");tabs.setAttribute("aria-label","Extensions de jeu");
 for(const [id,version,icon,label] of TABS){
  const b=button(icon+" "+version+" · "+label,()=>{
   e.tab=id;api.save();api.render();
  },false,e.tab===id?"selected":"");
  b.setAttribute("aria-pressed",String(e.tab===id));tabs.append(b);
 }
 root.append(tabs);
 SECTIONS[e.tab](s,api,root);
 return root;
}
window.DOFUS_IDLE_EXPANSION={ensure,view,onVictory,onCraft,onDungeon,damageBonus,defenseBonus,enemyMultiplier:s=>ensure(s).hardMode?1.35:1,TABS};
})();
