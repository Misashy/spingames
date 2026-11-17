(() => {
"use strict";
// Noms et IDs exacts du bestiaire DOFUS 3 pour les sept étapes d'Incarnam.
const INCARNAM_TERRITORIES=[{"name":"Champs","icon":"🌾","monsters":[[979,"Pissenlit Miroitant"],[980,"Rose Vaporeuse"],[970,"Tofu Chimérique"],[981,"Tournesol Nébuleux"]],"dungeon":false},{"name":"Route des âmes","icon":"🔥","monsters":[[3271,"Feu de Joie"],[3273,"Feu Follet"],[3272,"Feu Furieux"],[3270,"Feu Vif"]],"dungeon":false},{"name":"Pâturages","icon":"🐑","monsters":[[973,"Boufton Orageux"],[972,"Boufton Pâlichon"],[984,"Bouftor Éthéré"],[971,"Bouftou Nuageux"]],"dungeon":false},{"name":"Forêt","icon":"🌲","monsters":[[982,"Chakrobat"],[4105,"Ronronchon"],[4106,"Tigrimas"]],"dungeon":false},{"name":"Lac","icon":"💧","monsters":[[4110,"Grand Splatch"],[4109,"Petit Gloot"],[4108,"Plikplok"]],"dungeon":false},{"name":"Cimetière","icon":"🪦","monsters":[[4046,"Chafer Débutant"],[4048,"Chafer Éclaireur"],[4047,"Chafer Furtif"],[4049,"Chafer Piquier"],[4050,"Sergent Chafer"]],"dungeon":false},{"name":"Crypte de Kardorim","icon":"🏰","monsters":[[4046,"Chafer Débutant"],[4048,"Chafer Éclaireur"],[4047,"Chafer Furtif"],[4049,"Chafer Piquier"],[4050,"Sergent Chafer"]],"dungeon":true}];
const INCARNAM_MONSTERS=[];
const INCARNAM_BOUNDS=INCARNAM_TERRITORIES.map((area,index)=>{
 const start=INCARNAM_MONSTERS.length;
 for(const [id,name] of area.monsters) {
  const i=INCARNAM_MONSTERS.length;
  INCARNAM_MONSTERS.push({id,name,emoji:index===5||index===6?"💀":area.icon,
   loot:index===5||index===6?"Os de Chafer":"Ressource d'Incarnam",territoryIndex:index,
   hp:Math.round(12+i*4.2+Math.pow(i,1.35)),xp:Math.round(9+i*3.6),k:Math.round(6+i*2.6)});
 }
 return {name:area.name,icon:area.icon,start,count:area.monsters.length,dungeon:area.dungeon};
});
const ZONES=[
 {name:"Incarnam",subtitle:"L'Île céleste",icon:"🌿",color:"#8bc89f",enemies:INCARNAM_MONSTERS,boss:{id:4051,name:"Kardorim",emoji:"💀",hp:680,xp:390,k:480,loot:"Relique de Kardorim"}},
 {name:"Astrub",subtitle:"Les champs d'Astrub",icon:"🏘️",color:"#e8c77b",enemies:[{id:48,name:"Tournesol Sauvage",emoji:"🌻",hp:50,xp:26,k:21,loot:"Pétale de Tournesol"},{id:79,name:"Pissenlit Diabolique",emoji:"🌼",hp:60,xp:31,k:25,loot:"Feuille de Pissenlit"},{id:59,name:"Champ Champ",emoji:"🍄",hp:76,xp:39,k:31,loot:"Champignon"}],boss:{id:104,name:"Sanglier",emoji:"🐗",hp:380,xp:140,k:180,loot:"Défense de Sanglier"}},
 {name:"Tainéla",subtitle:"Le berceau des Bouftous",icon:"🐑",color:"#e8d8ae",enemies:[{id:134,name:"Boufton Blanc",emoji:"🐑",hp:140,xp:69,k:57,loot:"Laine de Boufton"},{id:149,name:"Boufton Noir",emoji:"🐑",hp:166,xp:81,k:69,loot:"Laine noire"},{id:36,name:"Bouftou",emoji:"🐏",hp:220,xp:104,k:87,loot:"Laine de Bouftou"}],boss:{id:147,name:"Bouftou Royal",emoji:"👑",hp:1000,xp:350,k:460,loot:"Couronne Bouftou"}},
 {name:"Forêt d'Amakna",subtitle:"Le bois des Abraknydes",icon:"🌲",color:"#92b775",enemies:[{id:103,name:"Prespic",emoji:"🦔",hp:420,xp:175,k:142,loot:"Pic de Prespic"},{id:47,name:"Abraknyde",emoji:"🌳",hp:540,xp:210,k:180,loot:"Racine d'Abraknyde"},{id:102,name:"Mulou",emoji:"🐺",hp:610,xp:245,k:216,loot:"Poil de Mulou"}],boss:{id:173,name:"Abraknyde Ancestral",emoji:"🌳",hp:3300,xp:980,k:1120,loot:"Écorce ancestrale"}},
 {name:"Péninsule des Gelées",subtitle:"Les terres sucrées",icon:"🍬",color:"#f3a5c9",enemies:[{id:55,name:"Gelée Bleuet",emoji:"🫐",hp:900,xp:380,k:325,loot:"Gelée bleue"},{id:56,name:"Gelée Menthe",emoji:"🍃",hp:1200,xp:420,k:350,loot:"Gelée verte"},{id:57,name:"Gelée Fraise",emoji:"🍓",hp:1400,xp:490,k:390,loot:"Gelée rouge"}],boss:{id:58,name:"Gelée Royale Bleuet",emoji:"👑",hp:7000,xp:2200,k:2500,loot:"Gelée royale"}},
 {name:"Île des Wabbits",subtitle:"La Cawotte mythique",icon:"🥕",color:"#efb37b",enemies:[{id:96,name:"Tiwabbit",emoji:"🐇",hp:2400,xp:850,k:700,loot:"Oreille de Tiwabbit"},{id:64,name:"Wabbit",emoji:"🐰",hp:2900,xp:970,k:800,loot:"Cawotte"},{id:65,name:"Black Wabbit",emoji:"🐇",hp:3600,xp:1100,k:1000,loot:"Poil de Wabbit Noir"}],boss:{id:180,name:"Wa Wabbit",emoji:"👑",hp:20000,xp:4900,k:6000,loot:"Couronne du Wa"}}
];
// Source: MonsterData.nameId + i18n_fr.json (même monsterId que l'image).
// Les variantes historiques remplacées adoptent le NOM EXACT du sprite DOFUS 3.
const OFFICIAL_NAMES = window.DOFUS_CATALOG_FR || {};
for (const z of ZONES) {
 for (const monster of [...z.enemies,z.boss]) {
  const official = OFFICIAL_NAMES[String(monster.id)];
  if (official && typeof official.name === "string" && official.name.trim()) {
   monster.name = official.name.trim();
  }
 }
}
const STORAGE="dofus-clicker-v1";
const DEFAULT={level:1,xp:0,kamas:0,kills:0,clickLevel:0,autoLevel:0,luckLevel:0,zone:0,stage:0,maxZone:0,hp:null,maxHp:null,loot:{},dex:{},bosses:[],last:0,incarnamVersion:2};
function load(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE));if(parsed&&typeof parsed==="object"){const result={...DEFAULT,...parsed};result.kamas=Math.max(0,Number(result.kamas)||0);result.zone=Math.min(ZONES.length-1,Math.max(0,Number(result.zone)||0));result.maxZone=Math.min(ZONES.length-1,Math.max(0,Number(result.maxZone)||0));result.zone=Math.min(result.zone,result.maxZone);result.stage=Math.max(0,Math.min(ZONES[result.zone].enemies.length,Number(result.stage)||0));if(result.incarnamVersion!==2){if(result.zone===0){result.stage=0;result.hp=null;result.maxHp=null;}result.incarnamVersion=2;}result.loot=result.loot||{};result.dex=result.dex||{};result.bosses=Array.isArray(result.bosses)?result.bosses:[];return result}}catch(e){}return {...DEFAULT,loot:{},dex:{},bosses:[]}}
let s=load(),tab="shop",muted=true,ctx=null,lastFrame=Date.now(),lastSave=0;
let transitioning=false,switchingMonster=false,monsterRequest=0,victoryTimer=null;
const spriteCache=new Map();
const el=(id)=>document.getElementById(id);
const nf=(n)=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:1,notation:n>=10000?"compact":"standard"}).format(Math.floor(n));
const zone=()=>ZONES[s.zone];
const bossStage=()=>zone().enemies.length;
const totalStages=()=>bossStage()+1;
const target=()=>s.stage>=bossStage()?zone().boss:zone().enemies[s.stage%zone().enemies.length];
const incarnamArea=()=>s.zone!==0?null:(INCARNAM_BOUNDS.find(area=>s.stage<area.start+area.count)||INCARNAM_BOUNDS[INCARNAM_BOUNDS.length-1]);
const incarnamAreaIndex=()=>Math.max(0,INCARNAM_BOUNDS.indexOf(incarnamArea()));
const clickDamage=()=>1+2*s.clickLevel+Math.floor((s.level-1)/3);
const dps=()=>s.autoLevel*1.8*Math.pow(1.16,Math.max(0,s.autoLevel-1));
const xpReq=()=>Math.floor(20+s.level*s.level*15);
const cost=(kind)=>kind==="click"?Math.floor(15*Math.pow(1.55,s.clickLevel)):kind==="auto"?Math.floor(35*Math.pow(1.6,s.autoLevel)):Math.floor(85*Math.pow(1.7,s.luckLevel));
function resetHp(){s.maxHp=target().hp;s.hp=s.maxHp}
if(s.hp===null||s.hp<=0||s.maxHp!==target().hp)resetHp();
function save(){s.last=Date.now();try{localStorage.setItem(STORAGE,JSON.stringify(s));el("saveStatus").textContent="Sauvegarde automatique activée"}catch(e){el("saveStatus").textContent="Impossible de sauvegarder sur cet appareil"}}
// Précharger le PNG avant de toucher au visuel du combat : plus de monstre fantôme.
function spriteFor(m) {
 const url="./assets/monsters/"+encodeURIComponent(String(m.id))+".png";
 if (!spriteCache.has(url)) {
  const promise=new Promise(resolve=>{
   const preload=new Image();
   preload.onload=()=>{
   // Décodage avant affichage pour empêcher l'ancien bitmap de réapparaître.
   if(typeof preload.decode==="function"){
    preload.decode().then(()=>resolve({url,ok:true}),()=>resolve({url,ok:true}));
   }else resolve({url,ok:true});
  };
   preload.onerror=()=>resolve({url,ok:false});
   preload.src=url;
  });
  spriteCache.set(url,promise);
 }
 return spriteCache.get(url);
}
function preloadFollowing() {
 const nextStage=s.stage+1;
 const following=nextStage<bossStage()?zone().enemies[nextStage]
   :nextStage===bossStage()?zone().boss
   :(s.zone<ZONES.length-1?ZONES[s.zone+1].enemies[0]:null);
 if (following) spriteFor(following);
}
function setMonster(){
 const m=target(),request=++monsterRequest;
 const img=el("monsterImage"),fallback=el("monsterFallback"),wrap=el("monsterWrap");
 switchingMonster=true;
 img.style.display="none";fallback.style.display="none";
 wrap.classList.remove("hit");
 spriteFor(m).then(({url,ok})=>{
  if(request!==monsterRequest)return; // ancien chargement terminé en retard
  if(ok){img.alt=m.name;img.src=url;img.style.display="block";fallback.style.display="none";}
  else{fallback.textContent=m.emoji;fallback.style.display="block";img.style.display="none";}
  wrap.classList.remove("defeated","hit");
  switchingMonster=false;
  preloadFollowing();
 });
}
function renderZones(){
 el("zones").innerHTML=ZONES.map((z,i)=>'<button class="zone '+(i===s.zone?"active ":"")+(i>s.maxZone?"locked":"")+'" '+(i>s.maxZone?"disabled":"")+' data-zone="'+i+'"><span class="zone-icon">'+z.icon+'</span><span class="zone-details"><strong>'+z.name+'</strong><small>'+(i>s.maxZone?"🔒 Zone verrouillée":i===s.zone?"⚔ En cours":"✓ Accessible")+'</small></span><span class="zone-arrow">'+(i>s.maxZone?"🔒":"›")+'</span></button>').join("");
 const container=el("incarnamStages");
 if(!container)return;
 container.hidden=s.zone!==0;
 if(s.zone!==0)return;
 const current=incarnamAreaIndex();
 container.innerHTML='<div class="inc-stages-title">LES 7 TERRITOIRES D’INCARNAM</div>'+
 INCARNAM_BOUNDS.map((area,i)=>{
  const done=Math.max(0,Math.min(area.count,s.stage-area.start));
  const boss=area.dungeon&&s.stage>=bossStage();
  return '<div class="inc-stage '+(i===current?"active ":"")+(s.stage>=area.start+area.count?"completed":"")+'">'+
   '<span class="inc-stage-icon">'+area.icon+'</span><span class="inc-stage-label"><strong>'+(i+1)+'. '+area.name+'</strong><small>'+
   (boss?"👑 Kardorim — boss final":done+"/"+area.count+" monstres")+'</small></span></div>';
 }).join("");
}
function renderHud(){const m=target(),z=zone(),isBoss=s.stage>=bossStage();el("kamas").textContent=nf(s.kamas);el("kills").textContent=nf(s.kills);el("power").textContent=nf(clickDamage())+"/clic";el("attackPower").textContent="+"+nf(clickDamage());el("dps").textContent=nf(dps())+" DPS";el("autoText").textContent=s.autoLevel?("Niveau "+s.autoLevel+" • Attaques continues"):"Achète ton premier compagnon";el("levelLabel").textContent="Niveau "+s.level;el("xpLabel").textContent=nf(s.xp)+" / "+nf(xpReq())+" XP";el("xpFill").style.width=Math.min(100,100*s.xp/xpReq())+"%";el("zoneTitle").textContent=z.name;el("zoneSubtitle").textContent=z.subtitle.toUpperCase()+" • ZONE "+(s.zone+1);el("monsterName").textContent=m.name;el("monsterType").textContent=isBoss?"👑 BOSS DE ZONE • RÉCOMPENSE RARE":"Monstre sauvage • "+nf(m.xp)+" XP";el("enemyLevel").textContent="NIV. "+Math.max(1,s.zone*25+Math.ceil(m.hp/75));el("bossTag").textContent=isBoss?"👑 COMBAT DE BOSS":"⚔ COMBAT NORMAL";el("bossTag").classList.toggle("boss",isBoss);el("arena").classList.toggle("boss-mode",isBoss);el("hpLabel").textContent=nf(Math.max(0,Math.ceil(s.hp)))+" / "+nf(s.maxHp)+" PV";el("hpFill").style.width=Math.max(0,Math.min(100,100*s.hp/s.maxHp))+"%";el("progressLabel").textContent=s.stage+" / "+totalStages();el("steps").innerHTML=Array.from({length:totalStages()},(_,i)=>'<i class="'+(i<s.stage?"done ":"")+(i===bossStage()?"boss-step":"")+'"></i>').join("");el("tip").textContent=isBoss?"Le boss se dresse devant toi ! Vaincs-le pour avancer.":(bossStage()-s.stage)+" victoire(s) avant le boss de la zone.";el("questText").textContent=isBoss?"Terrasse "+m.name+" !":"Vaincs le boss "+z.boss.name+" pour progresser."}
function renderPanel(){const p=el("panel");if(tab==="shop"){p.innerHTML='<p class="section-label">AMÉLIORE TA PUISSANCE</p>'+[
 {kind:"click",icon:"⚔️",name:"Maîtrise des armes",desc:"Dégâts par clic • niveau "+s.clickLevel,price:cost("click")},
 {kind:"auto",icon:"🤝",name:"Compagnon d'armes",desc:"Dégâts automatiques • niveau "+s.autoLevel,price:cost("auto")},
 {kind:"luck",icon:"🍀",name:"Prospection",desc:"Chances de butin • niveau "+s.luckLevel,price:cost("luck")}].map(u=>'<div class="upgrade"><div class="upgrade-emoji">'+u.icon+'</div><div class="upgrade-info"><strong>'+u.name+'</strong><small>'+u.desc+'</small></div><button class="buy" data-buy="'+u.kind+'" '+(s.kamas<u.price?"disabled":"")+'>'+nf(u.price)+' 🪙</button></div>').join("")+'<div class="upgrade-note">💡 Les kamas gagnés pendant les combats servent à acheter des améliorations permanentes.</div>'}
else if(tab==="loot"){const entries=Object.entries(s.loot).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);p.innerHTML='<p class="section-label">RESSOURCES RÉCOLTÉES</p>'+(entries.length?entries.map(x=>'<div class="loot-row"><span class="item-icon">📦</span><span>'+x[0]+'</span><strong>× '+nf(x[1])+'</strong></div>').join(""):'<p class="muted">Aucun butin pour le moment. Combat des monstres pour récupérer des ressources.</p>')}
else{let enemies=ZONES.flatMap(z=>[...z.enemies,z.boss]);const unique=[...new Map(enemies.map(m=>[m.id,m])).values()];p.innerHTML='<p class="section-label">MONSTRES DÉCOUVERTS • '+Object.keys(s.dex).length+'/'+unique.length+'</p>'+unique.map(m=>'<div class="dex-row"><span class="item-icon dex-icon">'+(s.dex[m.id]?'<img src="./assets/monsters/'+encodeURIComponent(String(m.id))+'.png" alt="" loading="lazy" width="34" height="34"><span class="dex-fallback" hidden>'+m.emoji+'</span>':"❔")+'</span><span>'+(s.dex[m.id]?m.name:"Monstre inconnu")+'</span><strong>'+(s.dex[m.id]?"× "+nf(s.dex[m.id]):"—")+'</strong></div>').join("")}
p.querySelectorAll(".dex-icon img").forEach(img=>img.addEventListener("error",()=>{
 img.hidden=true;
 const emoji=img.nextElementSibling;if(emoji)emoji.hidden=false;
}));
}
function render(){renderHud();renderZones();renderPanel()}
function sound(freq){if(muted)return;try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type="triangle";oscillator.frequency.value=freq;gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.08);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.08)}catch(e){}}
function damagePop(dmg,crit){const node=document.createElement("span");node.className="damage-pop"+(crit?" crit":"");node.textContent=(crit?"CRITIQUE ! ":"−")+nf(dmg);node.style.left=(45+Math.random()*12)+"%";el("floatingDamage").appendChild(node);node.addEventListener("animationend",()=>node.remove())}
function hit(dmg,fromClick){if(transitioning||switchingMonster||!Number.isFinite(dmg)||dmg<=0)return;s.hp=Math.max(0,s.hp-dmg);if(fromClick){el("monsterWrap").classList.remove("hit");void el("monsterWrap").offsetWidth;el("monsterWrap").classList.add("hit");damagePop(dmg,false);sound(340)}if(s.hp<=0)victory();else{el("hpFill").style.width=(100*s.hp/s.maxHp)+"%";el("hpLabel").textContent=nf(Math.ceil(s.hp))+" / "+nf(s.maxHp)+" PV"}}
function victory(){
 if(transitioning)return;
 transitioning=true;
 const m=target(),boss=s.stage>=bossStage();
 el("monsterWrap").classList.add("defeated");
 s.kills++;s.kamas+=Math.round(m.k*(1+.08*s.luckLevel));s.xp+=m.xp;
 s.dex[m.id]=(s.dex[m.id]||0)+1;
 const dropChance=Math.min(.88,.2+.05*s.luckLevel+(boss?.35:0));
 if(Math.random()<dropChance)s.loot[m.loot]=(s.loot[m.loot]||0)+1;
 while(s.xp>=xpReq()){s.xp-=xpReq();s.level++;sound(550)}
 if(boss){
  if(!s.bosses.includes(s.zone))s.bosses.push(s.zone);
  s.maxZone=Math.max(s.maxZone,Math.min(ZONES.length-1,s.zone+1));
  s.stage=0;
  if(s.zone<ZONES.length-1)s.zone++;
 }else s.stage++;
 resetHp();save();
 if(victoryTimer!==null)clearTimeout(victoryTimer);
 victoryTimer=setTimeout(()=>{
  victoryTimer=null;
  // L'ancien sprite reste caché pendant le chargement du nouveau.
  setMonster();render();save();
  transitioning=false;
 },350);
}
function buy(kind){const price=cost(kind);if(s.kamas<price)return;s.kamas-=price;if(kind==="click")s.clickLevel++;if(kind==="auto")s.autoLevel++;if(kind==="luck")s.luckLevel++;sound(480);render();save()}
function setZone(i){if(transitioning||switchingMonster||i<0||i>s.maxZone||i===s.zone)return;s.zone=i;s.stage=0;resetHp();setMonster();render();save()}
function doAttack(){const crit=Math.random()<(.08+.01*s.luckLevel);const dmg=clickDamage()*(crit?2:1);hit(dmg,true);if(crit)damagePop(dmg,true)}
el("attack").addEventListener("click",doAttack);el("monsterWrap").addEventListener("click",doAttack);
document.addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat&&e.target.tagName!=="BUTTON"&&!["INPUT","TEXTAREA"].includes(e.target.tagName)){e.preventDefault();doAttack()}});
el("zones").addEventListener("click",e=>{const b=e.target.closest("[data-zone]");if(b)setZone(Number(b.dataset.zone))});
el("panel").addEventListener("click",e=>{const b=e.target.closest("[data-buy]");if(b)buy(b.dataset.buy)});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;document.querySelectorAll(".tab").forEach(t=>{t.classList.toggle("active",t===b);t.setAttribute("aria-selected",String(t===b))});renderPanel()}));
el("reset").addEventListener("click",()=>{if(confirm("Recommencer l\'aventure ? Les sauvegardes et ressources seront effacées.")){if(victoryTimer!==null)clearTimeout(victoryTimer);victoryTimer=null;transitioning=false;monsterRequest++;localStorage.removeItem(STORAGE);s={...DEFAULT,loot:{},dex:{},bosses:[]};resetHp();setMonster();render();save()}});
el("soundToggle").addEventListener("click",()=>{muted=!muted;el("soundToggle").textContent=muted?"🔈 Sons désactivés":"🔊 Sons activés";el("soundToggle").setAttribute("aria-pressed",String(!muted));if(!muted)sound(440)});
setMonster();render();save();
setInterval(()=>{const now=Date.now();const elapsed=Math.min(2,(now-lastFrame)/1000);lastFrame=now;const p=dps();if(p>0)hit(p*elapsed,false);if(now-lastSave>2200){lastSave=now;save();if(tab==="shop")renderPanel()}},250);
window.addEventListener("pagehide",save);
})();
