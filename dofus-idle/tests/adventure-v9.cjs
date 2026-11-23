/* V9 — Icônes du client, donjons, quêtes, collections et automation. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const gear=read("data/equipment-v7.json"),classes=read("assets/classes/catalog.json");
const spells=read("assets/spells/catalog.json");
assert.equal(Object.keys(spells).length,57,"57 icônes attendues");
for(const [key,meta] of Object.entries(spells)){
 assert(meta.src&&fs.existsSync(path.join(root,meta.src)),"Icône manquante : "+key);
 assert(["exact","proche","illustration"].includes(meta.mapping),"Correspondance non signalée : "+key);
}
const known=(gear.sets["1"][1]||[]).map(String).filter(id=>core.items[id]);
assert(known.length>=5,"Panoplie Bouftou incomplet");
const bank=Object.fromEntries(known.map(id=>[id,1]));
const seed={version:2,view:"character",bank,kamas:1000,playerXp:999999999,
 hp:20000,classId:"iop",jobs:{},equipment:{},upgrades:{},
 visitedZones:{"444":true},visitedRegions:{"Incarnam":true},
 achievements:{"success-0":1717},selectedRegion:"",selectedZone:"444",
 selectedMonster:"970",combatMode:"zones"};
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
 runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.confirm=()=>true;w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>gear};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>classes};
 if(url.includes("spells/catalog.json"))return {ok:true,json:async()=>spells};
 return {ok:false,status:404};
};
const err=[];w.addEventListener("error",e=>err.push(String(e.error||e.message)));
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const nav=(label)=>{
 const b=[...w.document.querySelectorAll(".fd-nav-entry")].find(x=>x.textContent.includes(label));
 assert(b,"Navigation absente : "+label);b.click();
};
(async()=>{
 try{
  await pause(260);
  const g=w.DOFUS_IDLE_FULL;assert(g,"Le jeu n'a pas démarré");
  assert(w.DOFUS_IDLE_SPELL_ASSETS,"Catalogue des visuels non chargé");
  assert.equal(w.document.querySelectorAll("img.fd-spell-art").length,3,"Les vraies images de sorts ne s'affichent pas");
  assert.equal(w.document.querySelectorAll("img.fd-spell-art[src$='.webp']").length,3);
  const rooms=g.getDungeonRooms("447").map(String);
  assert(rooms.length>=4,"Crypte de Kardorim ne comporte pas plusieurs salles");
  assert.equal(rooms.at(-1),"4051","Kardorim doit être le boss final");
  assert(rooms.every(id=>world.zones["447"][3].map(String).includes(id)),
   "Tous les monstres du donjon doivent venir de la vraie zone");
  nav("Quêtes");
  const questCards=w.document.querySelectorAll(".fd-quest-card");
  assert(questCards.length>0&&questCards.length<=24,"Carnet de quêtes vide ou non paginé");
  const select=w.document.querySelector(".fd-adventure-filters select");
  select.value="Incarnam";select.dispatchEvent(new w.Event("change",{bubbles:true}));
  const first=w.document.querySelector('[data-quest-id="quest-incarnam-0"]');
  assert(first,"Première quête Incarnam absente");
  assert(first.textContent.includes("Champs"),"Le tutoriel doit commencer par Champs d'Incarnam");
  const claim=[...first.querySelectorAll("button")].find(b=>!b.disabled);
  assert(claim,"La zone Champs déjà visitée doit valider la première quête");
  claim.click();
  assert(g.getState().questClaims["quest-incarnam-0"],"Quête Incarnam non enregistrée");
  nav("Collections");
  assert(w.document.querySelectorAll(".fd-collection-tab").length===4,"Les 4 collections sont absentes");
  const input=w.document.querySelector(".fd-collection-search");
  input.value="Bouftou";input.dispatchEvent(new w.Event("input",{bubbles:true}));
  const set=w.document.querySelector('[data-collection-id="1"]');
  assert(set,"Panoplie du Bouftou introuvable");
  assert(set.textContent.includes("pièces possédées"),"Progression de panoplie absente");
  const setButton=[...set.querySelectorAll("button")].find(b=>b.textContent.includes("Valider"));
  assert(setButton&&!setButton.disabled,"La panoplie complète doit fournir une récompense");
  setButton.click();
  assert(g.getState().collectionClaims["1"],"Collection non validée");
  assert(g.getState().unlockedTitles.some(x=>x.includes("Bouftou")),
   "Titre de collection non attribué");
  nav("Personnage");
  assert(w.document.querySelector(".fd-title-picker select")?.textContent.includes("Bouftou"),
   "Le nouveau titre doit être sélectionnable");
  nav("Automatisation");
  assert(w.document.querySelectorAll(".fd-auto-row").length>=5,"Paramètres d'automatisation manquants");
  assert.equal(g.getState().automation.lootMode,"manual","L'automatisation doit être désactivée par défaut");
  const auto=w.document.querySelector(".fd-auto-row select");
  auto.value="bank-all";auto.dispatchEvent(new w.Event("change",{bubbles:true}));
  assert.equal(g.getState().automation.lootMode,"bank-all");
  g.startDungeon("447");
  const started=g.getState();
  assert(started.action?.dungeonRun?.roomIndex==null,"Ancien format de parcours inattendu");
  assert.equal(started.action?.dungeonRun?.index,0,"Le donjon ne commence pas à la première salle");
  assert(w.document.querySelector(".fd-dungeon-panel"),"La liste de salles n'est pas affichée");
  w.Math.random=()=>0;
  for(let i=0;i<rooms.length*5;i++){
   g.simulateSeconds(3.4);
   g.simulateSeconds(2);
   if(Number(g.getState().dungeonClears?.["447"])>=1)break;
  }
  const ended=g.getState();
  assert.equal(ended.dungeonClears?.["447"],1,"Kardorim n'est pas enregistré comme vaincu");
  assert(ended.dex["4051"]>=1,"Le boss doit compter dans le bestiaire");
  assert(ended.kills>=rooms.length,"Chaque salle doit avoir une vraie victoire");
  assert.equal(Object.values(ended.pendingLoot||{}).reduce((a,b)=>a+Number(b),0),0,
   "Tout le butin doit partir en banque avec l'option d'automatisation");
  g.simulateSeconds(2);
  assert.equal(g.getState().action,null,"Le donjon terminé ne doit pas redémarrer en boucle");
  nav("Collections");
  const tabs=[...w.document.querySelectorAll(".fd-collection-tab")];
  const bossTab=tabs.find(x=>x.textContent.includes("Boss"));
  assert(bossTab);bossTab.click();
  assert(w.document.body.textContent.includes("Boss"),"Collection de boss inaccessible");
  const saved=JSON.parse(w.localStorage.getItem("dofus-idle-full-v2"));
  assert(saved.achievements["success-0"],"Ancien succès perdu");
  assert(saved.questClaims["quest-incarnam-0"],"Quête non sauvegardée");
  assert(saved.collectionClaims["1"],"Collection non sauvegardée");
  assert(saved.dungeonClears["447"]===1,"Donjon non sauvegardé");
  assert.equal(err.length,0,"Erreurs JS :"+err.join("; "));
  console.log("V9 ADVENTURE VERIFIED",JSON.stringify({
   officialSpellIcons:Object.keys(spells).length,
   dungeon:"Crypte de Kardorim",rooms:rooms.length,
   quests:true,collections:true,automation:"bank-all",preservedSave:true}));
 }finally{w.close()}
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
