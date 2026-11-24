/* DOFUS IDLE : planificateur de panoplies et compatibilité des sauvegardes. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const core=read("data/core.json"),world=read("data/world.json"),equipmentData=read("data/equipment-v7.json");
const source=fs.readFileSync(path.join(root,"craft-planner.js"),"utf8");
const moduleWindow={};
new Function("window",source)(moduleWindow);
const planner=moduleWindow.DOFUS_IDLE_CRAFT_PLANNER;
assert(planner,"Planificateur non défini");

const recipeIndex=new Map([
 ["hat",[{id:"hat",job:"tailor",level:2,parts:[{id:"ore",qty:2},{id:"plank",qty:1}]}]],
 ["ring",[{id:"ring",job:"smith",level:2,parts:[{id:"ore",qty:3}]}]],
 ["plank",[{id:"plank",job:"wood",level:1,parts:[{id:"wood",qty:2}]}]]
]);
const bank={ore:3,wood:1},original=JSON.stringify(bank);
const plan=planner.planSet(["hat","ring"],recipeIndex,bank,{},()=>50,id=>id==="hat"||id==="ring");
const ore=plan.materials.find(x=>x.id==="ore"),wood=plan.materials.find(x=>x.id==="wood");
assert.deepEqual([ore.total,ore.owned,ore.missing],[5,3,2],"Minerai compté deux fois");
assert.deepEqual([wood.total,wood.owned,wood.missing],[2,1,1],"Sous-recette mal calculée");
assert.deepEqual(plan.crafts.map(c=>c.id),["plank","hat","ring"],"Ordre de fabrication invalide");
assert.equal(JSON.stringify(bank),original,"Le guide a consommé des ressources");
const equipped=planner.planSet(["hat","hat"],recipeIndex,{hat:1},{head:"hat"},()=>50,()=>true);
assert(equipped.complete&&equipped.crafts.length===0,"Pièces portées comptées deux fois");
const cycle=new Map([
 ["A",[{id:"A",job:"x",level:1,parts:[{id:"B",qty:1}]}]],
 ["B",[{id:"B",job:"y",level:1,parts:[{id:"A",qty:1}]}]]
]);
assert(planner.planSet(["A"],cycle,{}, {},()=>1,()=>true).warnings.length,
 "Recette circulaire non traitée");
const realRecipes=planner.indexRecipes(core);
assert(realRecipes.size>2000,"Index des recettes DOFUS incomplet");
const selection=Object.entries(equipmentData.sets)
 .find(([,def])=>Array.isArray(def[1])&&def[1].filter(id=>core.items[String(id)]).length>=2&&
  def[1].some(id=>realRecipes.has(String(id))));
assert(selection,"Aucune panoplie fabriquable");
const setId=selection[0],seed={
 version:2,view:"planner",plannerSetId:setId,jobs:{},bank:{},
 kamas:1000,playerXp:30000,hp:1000,classId:"iop",equipment:{},upgrades:{},
 achievements:{"success-0":1717},dungeonClears:{"447":1},questClaims:{}
};
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
 runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,errors=[];
w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.DOFUS_IDLE_CLOUD={url:"",publishableKey:""};
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.confirm=()=>true;
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>equipmentData};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>read("assets/classes/catalog.json")};
 if(url.includes("spells/catalog.json"))return {ok:true,json:async()=>read("assets/spells/catalog.json")};
 return {ok:false,status:404};
};
w.eval(source);
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const pause=n=>new Promise(resolve=>setTimeout(resolve,n));
const nav=label=>{
 const b=[...w.document.querySelectorAll(".fd-nav-entry")].find(x=>x.textContent.includes(label));
 assert(b,"Onglet introuvable : "+label);b.click();
};
(async()=>{
 try{
  await pause(400);
  const game=w.DOFUS_IDLE_FULL;
  assert(game,"Moteur non démarré");
  assert(w.document.querySelector(".fd-planner-heading"),"Guide non affiché");
  assert(w.document.querySelector(".fd-planner-overview")?.textContent.includes(selection[1][0]),
   "Panoplie préalablement sélectionnée perdue");
  assert(w.document.querySelectorAll(".fd-planner-card").length>=2,"Pièces manquantes");
  assert(w.document.querySelectorAll(".fd-planner-line").length>=1,"Sous-recettes absentes");
  assert(w.document.querySelectorAll(".fd-planner-material").length>=1,"Matériaux manquants");
  assert.equal(game.getState().achievements["success-0"],1717,"Ancienne progression effacée");
  assert.equal(game.getState().dungeonClears["447"],1,"Historique de donjon effacé");
  assert.equal(game.getState().version,2,"Format local modifié");
  // Navigation du guide vers la recette officielle.
  const recipeButton=w.document.querySelector(".fd-planner-line button");
  assert(recipeButton,"Raccourci vers les métiers absent");
  recipeButton.click();
  assert(game.getState().view.startsWith("craft:"),"Accès aux métiers cassé");
  // Navigation de Collections vers un plan de fabrication.
  nav("Collections");
  assert(w.document.querySelector(".fd-collection-card"),"Collections indisponibles");
  const toPlanner=[...w.document.querySelectorAll(".fd-collection-card button")]
   .find(b=>b.textContent.includes("Préparer la fabrication"));
  assert(toPlanner,"Raccourci depuis Collections absent");
  toPlanner.click();
  assert.equal(game.getState().view,"planner","Navigation Collections → Guide cassée");
  assert(w.document.querySelector(".fd-planner-overview"),"Nouveau plan non affiché");
  const state=game.getState();
  assert.equal(state.kamas,1000,"Le plan a dépensé des kamas");
  assert.equal(Object.keys(state.bank).length,0,"Le plan a modifié la banque");
  assert.equal(errors.length,0,"Erreurs JavaScript : "+errors.join("; "));
  console.log("CRAFT PLANNER VERIFIED",JSON.stringify({
   sets:Object.keys(equipmentData.sets).length,recipeIndex:realRecipes.size,
   shortages:true,savePreserved:true,sourceNavigation:true
  }));
 }finally{w.close()}
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
