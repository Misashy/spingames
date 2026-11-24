/* DOFUS IDLE — tests des Chroniques V13-V24. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
 runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;
const errors=[];
w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.DOFUS_IDLE_CLOUD={url:"",publishableKey:""};
w.confirm=()=>true;
const seed={version:2,view:"expansion",jobs:{},bank:{},kamas:1000000,
 playerXp:100000000,hp:9000,classId:"iop",kills:5000,
 equipment:{},upgrades:{},spellPreferences:{},
 dungeonClears:{"447":20},achievements:{"success-0":123456},questClaims:{},
 visitedRegions:{"Incarnam":true},visitedZones:{"444":true}};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>read("data/equipment-v7.json")};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>read("assets/classes/catalog.json")};
 if(url.includes("spells/catalog.json"))return {ok:true,json:async()=>read("assets/spells/catalog.json")};
 return {ok:false,status:404};
};
w.eval(fs.readFileSync(path.join(root,"expansion-v13-v24.js"),"utf8"));
const exp=w.DOFUS_IDLE_EXPANSION;
assert(exp,"Module d'extension manquant");
const pure={equipment:{},expansion:{}};
exp.ensure(pure);
assert.equal(exp.damageBonus(pure),0,"Aucun bonus avant l'équipement");
exp.onVictory(pure,["Bouftou",1,40],{id:979});
assert.equal(pure.expansion.specialKills,1);
exp.onDungeon(pure,"447");
assert.equal(pure.expansion.sigils,1);
assert.equal(pure.expansion.guildTokens,2);
exp.onCraft({...pure,craftedRecipes:{"2:100":10}},"2","100",1);
assert.equal(pure.expansion.guildTokens,3,"Jeton de guilde au dixième craft");
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 try{
  await pause(450);
  const game=w.DOFUS_IDLE_FULL;
  assert(game,"Le jeu principal ne démarre pas");
  assert.equal(w.document.querySelectorAll(".fd-exp-tabs button").length,12,"Les 12 extensions doivent être accessibles");
  const button=(search)=>[...w.document.querySelectorAll(".fd-exp-tabs button")].find(b=>b.textContent.includes(search));
  const state=()=>game.getState();
  assert.equal(state().achievements["success-0"],123456,"Succès antérieur perdu");
  assert.equal(state().dungeonClears["447"],20,"Progression donjon perdue");
  button("V14").click();
  assert(w.document.querySelector(".fd-exp-card").textContent.includes("Configurations des sorts"));
  button("V16").click();
  assert(w.document.querySelectorAll(".fd-exp-region").length>=3);
  button("V18").click();
  const adopt=[...w.document.querySelectorAll(".fd-exp-card button")].find(b=>b.textContent.includes("Adopter")&&!b.disabled);
  assert(adopt,"Familiers indisponibles");adopt.click();
  assert(state().expansion.petActive,"Le familier choisi n'est pas mémorisé");
  button("V20").click();
  const claim=[...w.document.querySelectorAll(".fd-exp-card button")].find(b=>b.textContent.includes("Réclamer")&&!b.disabled);
  assert(claim,"Objectif Dofus absent");
  claim.click();
  assert(Object.keys(state().expansion.dofus).length>=1,"Dofus non attribué");
  button("V24").click();
  assert(w.document.querySelector(".fd-exp-card").textContent.includes("Refuge de guilde"));
  const latest=state();
  assert(latest.expansion,"Données V24 perdues");
  assert.equal(latest.version,2,"La clé / version de sauvegarde locale doit rester compatible");
  assert.equal(errors.length,0,"Erreur JS : "+errors.join("; "));
  console.log("V13–V24 EXTENSIONS VERIFIED",JSON.stringify({
   tabs:12,existingAchievements:true,dungeonProgress:true,pet:latest.expansion.petActive,
   dofus:Object.keys(latest.expansion.dofus).length
  }));
 }finally{w.close()}
})().catch(err=>{console.error(err);w.close();process.exitCode=1});
