/* V10-V12: smoke test de non-régression et du rendu sans cloud configuré. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const seed={version:2,view:"character",jobs:Object.fromEntries(Object.keys(core.jobs).map(j=>[j,99999999])),
 bank:{},kamas:3000,playerXp:9999999,hp:5000,classId:"iop",
 equipment:{},upgrades:{},achievements:{"success-0":1234},questClaims:{},
 visitedRegions:{"Incarnam":true},visitedZones:{"444":true}};
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
 runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.DOFUS_IDLE_CLOUD={url:"",publishableKey:""};
w.confirm=()=>true;w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>read("data/equipment-v7.json")};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>read("assets/classes/catalog.json")};
 if(url.includes("spells/catalog.json"))return {ok:true,json:async()=>read("assets/spells/catalog.json")};
 return {ok:false,status:404};
};
const errors=[];w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=n=>new Promise(r=>setTimeout(r,n));
const nav=label=>{
 const button=[...w.document.querySelectorAll(".fd-nav-entry")].find(x=>x.textContent.includes(label));
 assert(button,"Navigation introuvable : "+label);button.click();
};
(async()=>{
 try{
  await pause(320);
  assert(w.DOFUS_IDLE_FULL,"Moteur non initialisé");
  nav("Toutes les recettes");
  assert(w.document.querySelector(".fd-v10-queue"),"File d'artisanat absente");
  assert(w.document.querySelector(".fd-v10-craft-extra"),"Actions de série absentes");
  assert(w.document.querySelector(".fd-v10-deps"),"Provenance des ingrédients absente");
  const add=[...w.document.querySelectorAll(".fd-v10-craft-extra button")].find(b=>b.textContent.includes("×1")&&!b.disabled);
  assert(add,"Aucune commande disponible");
  add.click();
  assert.equal(w.DOFUS_IDLE_FULL.getState().craftQueue.length,1,"Commande non mémorisée");
  nav("Quêtes");
  assert(w.document.querySelectorAll(".fd-v11-region").length>=3,"Guides de régions absents");
  assert(w.document.querySelector(".fd-v11-region").textContent.includes("Incarnam"),"Incarnam doit apparaître en premier");
  nav("Collections");
  assert(w.document.querySelectorAll(".fd-v11-stat").length===4,"Tableau encyclopédique incomplet");
  nav("Personnage");
  await pause(30);
  assert(w.document.querySelector("#fdCloudPanel").textContent.includes("non configurée"),
   "Le cloud doit rester explicitement désactivé sans configuration");
  const saved=w.DOFUS_IDLE_FULL.getState();
  assert(saved.achievements["success-0"],"Ancienne progression effacée");
  assert.equal(saved.version,2,"Format local v2 doit rester stable");
  assert.equal(errors.length,0,errors.join("; "));
  console.log("V10 V11 V12 BASIC UI VERIFIED");
 }finally{w.close()}
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
