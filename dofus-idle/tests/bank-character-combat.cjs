/* DOFUS IDLE — banque par types officiels, fiche de personnage et KO. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const catalog=read("assets/classes/catalog.json");
const itemByCategory=new Map();
for(const [id,item] of Object.entries(core.items)){
 const type=core.types[String(item[3])];
 if(!type||![0,1,2,3,4].includes(Number(type[1])))continue;
 const group=Number(type[1]);
 if(!itemByCategory.has(group))itemByCategory.set(group,[]);
 const list=itemByCategory.get(group);
 if(list.length<4&&!list.some(x=>x.type===String(item[3])))
  list.push({id,type:String(item[3]),name:item[0]});
}
assert(itemByCategory.size>=3,"La base DOFUS doit proposer plusieurs catégories de banque");
const chosen=[...itemByCategory.values()].flat();
const bank=Object.fromEntries(chosen.map((x,i)=>[x.id,2+i*5]));
const level=300000000;
const zone=world.zones["444"];
assert(zone?.[3].length>=4,"Zone de départ absente");
const defaultMob=String(zone[3][0]);
const seed={version:2,view:"bank",jobs:{},bank,playerXp:level,hp:20000,
 classId:"iop",selectedRegion:"Incarnam",selectedZone:"444",selectedMonster:defaultMob,
 combatMode:"zones",equipment:{},upgrades:{},achievements:{},visitedZones:{},dex:{}};
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.confirm=()=>true;
w.fetch=async url=>{
 if(url.includes("core.json"))return {ok:true,json:async()=>core};
 if(url.includes("world.json"))return {ok:true,json:async()=>world};
 if(url.includes("images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>catalog};
 return {ok:false,status:404};
};
const failures=[];w.addEventListener("error",e=>failures.push(String(e.error||e.message)));
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 try{
  await pause(230);
  const game=w.DOFUS_IDLE_FULL;
  assert(game,"Moteur non chargé");
  const first=w.document.querySelector('.fd-bank-tab[data-bank-category="all"]');
  assert(first&&first.getAttribute("aria-pressed")==="true","Tous doit être l'onglet par défaut");
  assert.equal(w.document.querySelectorAll(".fd-bank-item").length,chosen.length,"Tous doit afficher tous les items");
  const navCategories=[...w.document.querySelectorAll(".fd-bank-tab")].map(x=>x.dataset.bankCategory);
  assert(navCategories.includes("equipment")||navCategories.includes("resource"),"Catégories principales absentes");
  for(const [cat,items] of itemByCategory){
   const key={"0":"equipment","1":"consumable","2":"resource","3":"quest","4":"cosmetic"}[cat];
   const tab=w.document.querySelector('.fd-bank-tab[data-bank-category="'+key+'"]');
   assert(tab,"Onglet manquant : "+key);
   tab.click();
   const visible=[...w.document.querySelectorAll(".fd-bank-item")].map(x=>x.dataset.bankItemId);
   assert(visible.length===items.length,"Catégorie incorrecte : "+key);
   assert(visible.every(id=>Number(core.types[String(core.items[id][3])][1])===cat),"Mauvaise catégorie ItemTypeData");
   const select=w.document.querySelector(".fd-bank-type");
   assert(select&&select.options.length>=2,"Sous-types officiels absents");
   const wanted=items[0].type;
   select.value=wanted;select.dispatchEvent(new w.Event("change",{bubbles:true}));
   const filtered=[...w.document.querySelectorAll(".fd-bank-item")].map(x=>x.dataset.bankItemId);
   assert(filtered.length>=1&&filtered.every(id=>String(core.items[id][3])===wanted),"Filtre par vrai type DOFUS incorrect");
  }
  const reset=w.document.querySelector(".fd-bank-reset");
  assert(reset,"Bouton Afficher tout absent");
  reset.click();
  assert(w.document.querySelector('.fd-bank-tab[data-bank-category="all"]').getAttribute("aria-pressed")==="true",
   "La remise à zéro doit revenir à Tous");
  const sort=w.document.querySelector(".fd-bank-sort");
  sort.value="quantity";sort.dispatchEvent(new w.Event("change",{bubbles:true}));
  const sorted=[...w.document.querySelectorAll(".fd-bank-item")].map(node=>Number(game.getState().bank[node.dataset.bankItemId]));
  assert(sorted.every((v,i)=>i===0||sorted[i-1]>=v),"Tri par quantité invalide");
  const character=[...w.document.querySelectorAll(".fd-nav-entry")].find(b=>b.textContent.includes("Personnage"));
  character.click();
  assert(w.document.querySelectorAll(".fd-advanced-group").length>=7,"Groupes avancés manquants");
  assert(w.document.querySelectorAll(".fd-advanced-row").length>=55,"Caractéristiques DOFUS manquantes");
  assert(w.document.querySelectorAll(".fd-advanced-marker.is-active").length>5,"Statistiques idle non identifiées");
  assert(w.document.querySelectorAll(".fd-advanced-marker:not(.is-active)").length>25,"Stats indicatives non identifiées");
  const combat=[...w.document.querySelectorAll(".fd-nav-entry")].find(b=>b.textContent.includes("Zones et monstres"));
  combat.click();
  const zoneCard=[...w.document.querySelectorAll(".fd-zone")].find(b=>b.textContent.includes("Champs"));
  assert(zoneCard,"Champs d'Incarnam introuvables");
  zoneCard.click();
  const fight=w.document.querySelector(".fd-monster-buttons .fd-danger:not(:disabled)");
  assert(fight,"Aucun monstre accessible");
  fight.click();
  w.Math.random=()=>0.99;
  game.simulateSeconds(1.7);
  const knockout=game.getState();
  assert(knockout.kills>=1,"Coup fatal attendu");
  assert.equal(knockout.action.enemyHp,0,"Monstre doit rester à 0 PV");
  assert(knockout.action.respawnRemaining>0,"Pause après KO manquante");
  assert(w.document.querySelector(".fd-enemy-defeated"),"Animation de KO invisible");
  assert(w.document.querySelector(".fd-enemy-hp span")?.style.width==="0%","Barre de vie doit être vide");
  game.simulateSeconds(0.8);
  assert.equal(game.getState().action.enemyHp,0,"0 PV doit persister pendant la pause");
  game.simulateSeconds(1.1);
  assert(game.getState().action.enemyHp>0,"PV du prochain monstre non rétablis");
  const saved=JSON.parse(w.localStorage.getItem("dofus-idle-full-v2"));
  assert.deepEqual(saved.bank,bank,"Le changement d'interface ne doit pas modifier l'inventaire");
  assert.equal(failures.length,0,"Erreurs JS : "+failures.join(" ; "));
  console.log("BANK CHARACTER KO VERIFIED",{categories:itemByCategory.size,items:chosen.length,
   stats:w.document.querySelectorAll(".fd-advanced-row").length,ko:true});
 }finally{w.close()}
})().catch(err=>{console.error(err);w.close();process.exitCode=1});
