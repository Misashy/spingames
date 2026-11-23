/* DOFUS IDLE V7 — vrais effets d'objets, panoplies, équipement et comparaison. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const db=read("data/equipment-v7.json"),classes=read("assets/classes/catalog.json");
assert(db.meta.itemCount>12000,"Objets officiels incomplets");
assert(db.meta.setCount>500,"Panoplies officielles incomplètes");
assert.equal(db.items["2411"][0],1,"Bouftou doit appartenir à la panoplie 1");
assert.deepEqual(db.items["2411"][1][0],[118,16,20],"Les jets 16 à 20 Force DOFUS doivent être exacts");
const ids=db.sets["1"][1].map(String).filter(id=>core.items[id]);
const bank=Object.fromEntries(ids.map(id=>[id,1]));
const equipment={weapon:null,head:null,cape:null,ring:null,boots:null,belt:null,neck:null,shield:null};
const seed={version:2,view:"bank",bank,jobs:{},playerXp:999999999,hp:200000,
 classId:"iop",equipment,kamas:1000,selectedRegion:"Incarnam",selectedMonster:"979",selectedZone:"444"};
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.confirm=()=>true;
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>db};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>classes};
 return {ok:false,status:404};
};
const errors=[];w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 try{
  await delay(250);
  const game=w.DOFUS_IDLE_FULL;assert(game,"Moteur non initialisé");
  assert(game.getEquipmentData(),"Données d'équipement absentes");
  assert(game.getEquipmentData().sets["1"],"Panoplie Bouftou absente");
  assert(game.getState().equipment.ring2===null,"Le deuxième emplacement d'anneau doit être créé sans perdre les slots anciens");
  assert(Object.keys(game.getState().equipment).length>=17,"Emplacements DOFUS complémentaires manquants");
  const p="2411",pSlot=game.getGearSlots(p)[0];
  assert(pSlot,"Objet 2411 non équipable");
  const another=ids.find(id=>id!==p&&game.getGearSlots(id).some(slot=>slot!==pSlot));
  assert(another,"Aucune deuxième pièce de panoplie compatible");
  const row=w.document.querySelector('.fd-bank-item[data-bank-item-id="'+p+'"]');
  assert(row,"Objet à comparer absent de la banque");
  const compare=[...row.querySelectorAll("button")].find(b=>b.textContent.includes("Comparer"));
  assert(compare,"Bouton Comparer absent");
  compare.click();
  assert(w.document.querySelector(".fd-equipment-modal"),"Comparateur non ouvert");
  assert(w.document.querySelector(".fd-equipment-effects").textContent.includes("Force"),"Jet officiel Force introuvable");
  assert(w.document.querySelector(".fd-modal-set").textContent.includes("Panoplie du Bouftou"),"Panoplie non montrée dans le comparateur");
  const equip=[...w.document.querySelectorAll(".fd-equipment-modal-actions button")].find(b=>b.textContent.includes("Équiper"));
  assert(equip&&!equip.disabled,"Bouton Équiper inaccessible");
  const before=game.getState().kamas;
  equip.click();
  assert(Object.values(game.getState().equipment).some(id=>String(id)===p),"Premier objet non équipé");
  assert(!game.getState().bank[p],"Premier objet non sorti de la banque");
  const stats=game.getGearSummary();
  assert.equal(stats.stats.force,18,"Le jet médian 16 à 20 Force doit donner +18");
  assert.equal(stats.stats.intelligence,18,"Le jet médian 16 à 20 Intelligence doit donner +18");
  assert.equal(stats.sets.find(x=>x.id==="1")?.count,1,"Panoplie 1 pièce mal calculée");
  assert.equal(game.getState().kamas,before,"Équiper ne doit jamais coûter des kamas");
  const row2=w.document.querySelector('.fd-bank-item[data-bank-item-id="'+another+'"]');
  assert(row2,"Deuxième pièce absente");
  const equip2=[...row2.querySelectorAll("button")].find(b=>b.textContent==="Équiper");
  assert(equip2,"Deuxième bouton Équiper absent");
  equip2.click();
  const after=game.getGearSummary();
  assert.equal(after.sets.find(x=>x.id==="1")?.count,2,"Bonus de panoplie à 2 pièces non activé");
  const gearForce=(db.items[p][1]||[]).filter(x=>db.effects[String(x[0])]?.[1]===10)
   .reduce((n,x)=>n+Math.round((x[1]+x[2])/2),0);
  const secondForce=(db.items[another][1]||[]).filter(x=>db.effects[String(x[0])]?.[1]===10)
   .reduce((n,x)=>n+Math.round((x[1]+x[2])/2),0);
  const setForce=(db.sets["1"][2][1]||[]).filter(x=>db.effects[String(x[0])]?.[1]===10)
   .reduce((n,x)=>n+Math.round((x[1]+x[2])/2),0);
  assert.equal(after.stats.force,gearForce+secondForce+setForce,"L'effet Force de panoplie est erroné ou cumulé deux fois");
  const char=[...w.document.querySelectorAll(".fd-nav-entry")].find(b=>b.textContent.includes("Personnage"));
  assert(char);char.click();
  assert(w.document.querySelector(".fd-set-panel").textContent.includes("Panoplie du Bouftou"),
   "Panoplies actives absentes de la fiche personnage");
  assert(w.document.querySelector(".fd-advanced-row[data-stat-name='Force']"),
   "Force totale non affichée dans la fiche complète");
  const equippedCards=[...w.document.querySelectorAll(".fd-char-gear-slot")].filter(node=>node.textContent.includes("Retirer"));
  assert(equippedCards.length>=2,"Deux objets équipés attendus");
  const piece=equippedCards.find(x=>x.textContent.includes(core.items[another][0]));
  assert(piece,"Deuxième pièce de panoplie introuvable dans l'équipement");
  const remove=[...piece.querySelectorAll("button")].find(b=>b.textContent==="Retirer");
  assert(remove);remove.click();
  assert.equal(game.getGearSummary().sets.find(x=>x.id==="1")?.count,1,
   "Bonus de panoplie non désactivé après avoir retiré une pièce");
  assert(game.getState().bank[another]>=1,"L'objet retiré doit retourner en banque");
  assert.equal(errors.length,0,"Erreurs javascript : "+errors.join("; "));
  console.log("V7 EQUIPMENT VERIFIED",JSON.stringify({officialItems:db.meta.itemCount,
   sets:db.meta.setCount,effects:db.meta.effectTypes,bouftouFirst:p,
   second:another,statForce:after.stats.force,passed:true}));
 }finally{w.close()}
})().catch(err=>{console.error(err);w.close();process.exitCode=1});
