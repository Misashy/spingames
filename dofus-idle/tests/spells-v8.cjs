/* V8 — 57 sorts (19 classes), cooldowns, protections, automation et migration. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json"),gear=read("data/equipment-v7.json");
const classes=read("assets/classes/catalog.json");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const allClasses=["iop","cra","sacrieur","eniripsa","feca","osamodas","enutrof",
 "sram","xelor","ecaflip","sadida","pandawa","roublard","zobal","steamer",
 "eliotrope","huppermage","ouginak","forgelance"];
async function mount(seed){
 const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
  runScripts:"outside-only",pretendToBeVisual:true});
 const w=dom.window;
 w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
 w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
 w.confirm=()=>true;
 w.fetch=async url=>{
  if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
  if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
  if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>gear};
  if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
  if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>classes};
  return {ok:false,status:404};
 };
 const errors=[];w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
 w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
 await new Promise(r=>setTimeout(r,280));
 assert(w.DOFUS_IDLE_FULL,"Moteur non chargé");
 return {w,dom,game:w.DOFUS_IDLE_FULL,errors};
}
function navigation(w,text){
 const btn=[...w.document.querySelectorAll(".fd-nav-entry")].find(x=>x.textContent.includes(text));
 assert(btn,"Navigation absente : "+text);btn.click();
}
function selectClass(w,name){
 navigation(w,"Personnage");
 const button=[...w.document.querySelectorAll(".fd-select-class")]
  .find(x=>x.textContent.includes(name));
 assert(button,"Classe introuvable : "+name);button.click();
}
function startBattle(w){
 navigation(w,"Zones et monstres");
 const region=w.document.querySelector(".fd-region-card");
 if(region){
  const incarnam=[...w.document.querySelectorAll(".fd-region-card")]
   .find(b=>b.textContent.includes("Incarnam"));
  assert(incarnam,"Région Incarnam absente");incarnam.click();
 }
 const zone=[...w.document.querySelectorAll(".fd-zone")].find(x=>x.textContent.includes("Champs"));
 assert(zone,"Zone Champs absente");zone.click();
 const fight=w.document.querySelector(".fd-monster-buttons .fd-danger:not(:disabled)");
 assert(fight,"Pas de combat disponible");fight.click();
}
(async()=>{
 let session;
 try{
  const seed={version:2,view:"character",bank:{},jobs:{},playerXp:0,hp:90,
   classId:"iop",equipment:{},upgrades:{},kills:4,achievements:{"success-0":21}};
  session=await mount(seed);
  let {w,game}=session;
  const names=new Set(),globalNames=new Set();
  for(const id of allClasses){
   const spells=game.getClassSpells(id);
   assert.equal(spells.length,3,"Trois sorts requis : "+id);
   assert.deepEqual(Array.from(spells,sp=>Number(sp[3])),[1,15,45],"Paliers attendus : "+id);
   assert(new Set(spells.map(sp=>sp[0])).size===3,"Doublon de sorts : "+id);
   for(const sp of spells){
    assert(sp[1]&&sp[2]&&sp[7]&&sp[4]>=6,"Sort incomplet : "+id);
    assert(!globalNames.has(id+":"+sp[0]),"Id global dupliqué");
    globalNames.add(id+":"+sp[0]);
   }
   names.add(id);
  }
  assert.equal(names.size,19);
  assert.equal(globalNames.size,57);
  assert.equal(game.getState().achievements["success-0"],21,"Ancien succès perdu");
  assert.equal(w.document.querySelectorAll(".fd-spell-card").length,3,"Grimoire du personnage absent");
  assert.equal(w.document.querySelectorAll(".fd-spell-card.locked").length,2,"Les deux sorts avancés doivent être bloqués au niveau 1");
  assert(w.document.querySelector(".fd-spell-card[data-spell-id='pression'].unlocked"),"Sort de niveau 1 absent");
  assert(!game.castSpell("pression"),"Un sort ne peut pas se lancer hors combat");
  assert(game.getState().spellCasts===0,"Le test hors combat ne doit pas compter un sort");
  assert.equal(session.errors.length,0,"Erreurs JS au niveau 1 : "+session.errors.join(" ; "));
  session.dom.window.close();
  session=null;

  const high={...seed,playerXp:999999999,hp:140,
   selectedRegion:"Incarnam",selectedZone:"444",selectedMonster:"979",
   combatMode:"zones",view:"character"};
  session=await mount(high);({w,game}=session);
  assert.equal(w.document.querySelectorAll(".fd-spell-card.locked").length,0,
   "Les trois sorts doivent être débloqués au niveau 200");
  startBattle(w);
  assert(game.getState().action?.type==="combat","Combat non démarré");
  assert.equal(w.document.querySelectorAll(".fd-player-panel .fd-spell-card").length,3,
   "Grimoire de combat absent");
  assert.equal(game.getState().spellCasts,0);
  assert(game.castSpell("pression"),"Pression manuelle doit fonctionner");
  const postStrike=game.getState();
  assert.equal(postStrike.spellCasts,1,"Compteur de sorts non incrémenté");
  assert(postStrike.action.spellCooldowns.pression>0,"Temps de recharge absent");
  assert(postStrike.action.spellHistory[0]?.name==="Pression","Historique du sort absent");
  assert(w.document.querySelector(".fd-combat-damage.is-spell"),
   "Lancer un sort d'attaque doit afficher son nom et ses dégâts flottants");
  assert(!game.castSpell("pression"),"Impossible de lancer deux fois le même sort en recharge");

  // Lancer automatique configurable sur chaque classe et persistant.
  const auto=w.document.querySelector('.fd-spell-card[data-spell-id="pression"] .fd-spell-auto');
  assert(auto&&auto.textContent.includes("ON"));auto.click();
  assert.equal(game.getState().spellPreferences["iop:pression"],false,
   "Désactivation du sort automatique non enregistrée");
  assert(JSON.parse(w.localStorage.getItem("dofus-idle-full-v2")).spellPreferences["iop:pression"]===false,
   "Préférence automatique perdue au stockage");

  // Eniripsa : soins, protections ; changer de classe ne doit pas garder les buffs de Iop.
  selectClass(w,"Eniripsa");
  assert.equal(game.getState().classId,"eniripsa","Changement de classe impossible");
  assert.equal(game.getState().action.spellClass,"eniripsa","Sorts Iop non réinitialisés");
  assert.equal(Object.keys(game.getState().action.spellCooldowns).length,0,"Anciens cooldowns conservés après changement de classe");
  navigation(w,"Zones et monstres");
  if(game.getState().action.respawnRemaining)game.simulateSeconds(2.2);
  const initialHp=game.getState().hp;
  assert(game.castSpell("mot-soignant"),"Mot Soignant ne fonctionne pas");
  assert(game.getState().hp>=initialHp,"Mot Soignant doit redonner des PV");
  game.simulateSeconds(1.3);
  if(game.getState().action.respawnRemaining)game.simulateSeconds(2);
  assert(game.castSpell("mot-prevention"),"Mot de Prévention ne fonctionne pas");
  assert(game.getState().action.spellShield>0,"Le bouclier de prévention ne protège pas");
  assert(w.document.querySelector(".fd-spell-buffs")?.textContent.includes("Bouclier"),
   "Bouclier invisible dans le grimoire de combat");

  selectClass(w,"Féca");
  assert.equal(game.getState().classId,"feca");
  navigation(w,"Zones et monstres");
  if(game.getState().action.respawnRemaining)game.simulateSeconds(2);
  assert(game.castSpell("glyphe"),"Glyphe Enflammé non lancé");
  assert(game.getState().action.spellDot?.damage>0,"Effet de brûlure non appliqué");
  assert(w.document.querySelector(".fd-spell-buffs")?.textContent.includes("périodiques"),
   "Brûlure non indiquée dans les effets actifs");

  selectClass(w,"Osamodas");
  navigation(w,"Zones et monstres");
  if(game.getState().action.respawnRemaining)game.simulateSeconds(2);
  assert(game.castSpell("bouftou"),"Invocation Bouftou non disponible");
  assert(game.getState().action.spellBuffs.summon?.remaining>0,"Invocation non active");

  // Préférences distinctes par classe, retour à l'ancienne configuration.
  selectClass(w,"Iop");
  assert.equal(game.getState().spellPreferences["iop:pression"],false);
  assert(game.getState().spellCasts>=5,"Les cinq sorts manuels doivent être enregistrés, en plus des déclenchements automatiques");
  const stored=JSON.parse(w.localStorage.getItem("dofus-idle-full-v2"));
  assert.equal(stored.achievements["success-0"],21,"Succès ancien perdu au sauvegardage");
  assert.equal(stored.spellPreferences["iop:pression"],false,"Préférences de classe non persistées");
  assert.equal(session.errors.length,0,"Erreurs JS V8 : "+session.errors.join(" ; "));
  console.log("V8 SPELLS VERIFIED",JSON.stringify({classes:names.size,spells:globalNames.size,
   cast:game.getState().spellCasts,unlockLevels:[1,15,45],
   heals:true,shield:true,dot:true,summon:true,prefsPersist:true,legacySavePreserved:true}));
 }finally{session?.dom.window.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
