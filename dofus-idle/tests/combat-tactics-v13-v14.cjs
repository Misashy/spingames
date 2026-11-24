/* DOFUS IDLE : regression tactique V13–V14 (ressources et combat). */
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const world=read("data/world.json"),core=read("data/core.json");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,errs=[];w.addEventListener("error",e=>errs.push(String(e.error||e.message)));
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.DOFUS_IDLE_CLOUD={url:"",publishableKey:""};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify({version:2,view:"character",jobs:{},bank:{},kamas:500,
 playerXp:99999999,hp:4000,classId:"iop",equipment:{},upgrades:{},selectedMonster:"979",
 selectedZone:"444",selectedRegion:"Incarnam",achievements:{"success-0":1111},dungeonClears:{"447":1}}));
w.confirm=()=>true;
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
w.eval(fs.readFileSync(path.join(root,"combat-tactics-v13-v14.js"),"utf8"));
const tactics=w.DOFUS_IDLE_TACTICS;assert(tactics,"Moteur tactique absent");
const act={type:"combat",id:979};
const state={};
let t=tactics.ensure(act,state,()=>0);
assert.equal(t.ap,6);assert.equal(t.mp,3);
const spell=["sample","Exemple","✦",1,2,"blast",1,"desc","feu"];
assert.equal(tactics.cost(spell),4);
assert(tactics.canCast(act,state,()=>0,spell));
assert(tactics.consume(act,state,()=>0,spell));
assert.equal(t.ap,2);
assert(!tactics.canCast(act,state,()=>0,spell));
tactics.advance(act,state,()=>0,1.5);
assert.equal(t.ap,4,"Regeneration des PA");
assert(tactics.switchPosition(act,state,()=>0));
assert.equal(t.mp,2);
assert(tactics.defendHit(act,100).damage<100,"Esquive tactique");
assert.equal(tactics.bossProfile("447").id,"lien");
assert(tactics.elementalHit(100,979,30,"feu").damage>=76);
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=ms=>new Promise(done=>setTimeout(done,ms));
(async()=>{
 try{
  await pause(360);
  const game=w.DOFUS_IDLE_FULL;assert(game,"Jeu ne demarre pas");
  assert(w.document.querySelector(".fd-tactical-panel"),"Panneau tactique absent");
  assert(w.document.querySelector(".fd-tactical-options select"),"Priorites absentes");
  const select=w.document.querySelector(".fd-tactical-options select");
  select.value="survival";select.dispatchEvent(new w.Event("change",{bubbles:true}));
  assert.equal(game.getState().tacticalPolicy,"survival","Priorite non sauvegardee");
  assert.equal(game.getState().achievements["success-0"],1111,"Sauvegarde ancienne alteree");
  assert.equal(game.getState().dungeonClears["447"],1,"Donjon existant efface");
  assert.equal(errs.length,0,"Erreur navigateur "+errs.join("; "));
  console.log("TACTICAL V13-V14 VERIFIED");
 }finally{w.close()}
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
