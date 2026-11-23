/* DOFUS IDLE : catalogue évolutif, suivi et migration de la sauvegarde. */
const fs=require("node:fs");
const path=require("node:path");
const assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const classes=read("assets/classes/catalog.json");
const candidates=Object.entries(core.recipes)
 .filter(([job,rs])=>core.jobs[job]&&rs.length)
 .map(([job,rs])=>({job,recipe:rs[0]}))
 .filter(({recipe:r})=>r[2]?.length>0&&!r[2].some(([iid])=>iid===r[0]))
 .sort((a,b)=>a.recipe[1]-b.recipe[1]);
assert(candidates.length>0,"Aucune recette valide pour le test");
const {job,recipe}=candidates[0];
const [itemId,level,ingredients]=recipe;
const initialBank={};
for(const [iid,qty] of ingredients)initialBank[String(iid)]=(initialBank[String(iid)]||0)+qty*3;
const seededSave={
 version:2,view:"craft:"+job,bank:initialBank,jobs:{[job]:1000000000},
 playerXp:100000,achievements:{"success-0":12345},
 kills:5,dex:{"979":5},visitedZones:{"444":true},visitedRegions:{"Incarnam":true}
};
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window;
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seededSave));
w.confirm=()=>true;
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes("classes/catalog.json"))return {ok:true,json:async()=>classes};
 return {ok:false,status:404};
};
const failures=[];w.addEventListener("error",e=>failures.push(String(e.error||e.message)));
w.eval(fs.readFileSync(path.join(root,"game-full.js"),"utf8"));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 try{
  await delay(250);
  const engine=w.DOFUS_IDLE_FULL;
  assert(engine,"Le moteur DOFUS IDLE n'a pas démarré");
  const summary=engine.getAchievementSummary();
  assert(summary.total>20000,"Catalogue insuffisant : "+summary.total);
  assert(summary.categories.bestiaire>=Object.keys(world.monsters).length*3,"Bestiaire incomplet");
  assert(summary.categories.artisanat>=core.meta.recipes,"Recettes insuffisantes");
  assert(summary.categories.exploration>=Object.keys(world.zones).length,"Exploration incomplète");
  assert(summary.categories.metiers>=Object.keys(core.jobs).length*8,"Paliers métiers insuffisants");
  assert.equal(engine.getState().achievements["success-0"],12345,"Sauvegarde des succès existants perdue");
  assert(engine.getAchievementInfo("monster-979-1")?.reached,"Victoire d'un ancien monstre non reconnue");
  assert(engine.getAchievementInfo("monster-979-10")&&!engine.getAchievementInfo("monster-979-10").reached,
   "Palier de 10 victoires déjà obtenu à tort");
  assert(engine.getAchievementInfo("zone-visit-444")?.reached,"Zone déjà découverte non reconnue");
  const recipeId="recipe-first-"+job+"-"+itemId;
  assert.equal(engine.getAchievementInfo(recipeId)?.value,0,"Le craft ne doit pas être rétroactif sans historique");
  const firstCard=w.document.querySelector(".fd-recipe-card");
  assert(firstCard,"Aucune recette rendue");
  const craftBtn=[...firstCard.querySelectorAll("button")].find(b=>b.textContent.includes("Fabriquer"));
  assert(craftBtn&&!craftBtn.disabled,"Bouton fabrication indisponible");
  craftBtn.click();
  assert.equal(engine.getState().action?.type,"craft","La fabrication ne démarre pas");
  engine.simulateSeconds(15);
  assert(engine.getState().craftedRecipes[job+":"+itemId]>=1,"Craft spécifique non comptabilisé");
  assert(engine.getAchievementInfo(recipeId).reached,"Succès de première fabrication non validé");
  assert(engine.getAchievementInfo("job-craft-"+job+"-1").reached,"Compteur de fabrication métier incorrect");
  const nav=[...w.document.querySelectorAll(".fd-nav-entry")].find(b=>b.textContent.includes("Succès"));
  assert(nav,"Lien Succès absent");
  nav.click();
  assert(w.document.querySelectorAll(".fd-achievement-card").length<=32,"Toutes les cartes sont rendues au lieu d'une page");
  const controls=w.document.querySelectorAll(".fd-achievement-filters select");
  assert.equal(controls.length,3,"Filtres catégorie/état/tri manquants");
  const input=w.document.querySelector(".fd-achievement-search");
  assert(input,"Recherche des succès absente");
  input.value="Premier craft : "+core.items[String(itemId)][0];
  input.dispatchEvent(new w.Event("input",{bubbles:true}));
  const matched=[...w.document.querySelectorAll(".fd-achievement-card")].find(x=>x.textContent.includes("Premier craft"));
  assert(matched,"Recette fabriquée introuvable par la recherche");
  const claim=matched.querySelector("button.fd-button");
  assert(claim&&!claim.disabled,"Récompense de recette non récupérable");
  claim.click();
  assert(engine.getAchievementInfo(recipeId).claimed,"Succès réclamé non sauvegardé");
  const rewardBefore=engine.getState().kamas;
  // Un succès ne peut plus être récupéré après l'attribution de ses gains.
  const again=engine.getAchievementInfo(recipeId);
  assert(again.claimed,"Succès répété à tort");
  assert.equal(engine.getState().kamas,rewardBefore,"Récompense dupliquée");
  const monsterGoal=engine.getAchievementInfo("monster-979-10");
  const search=w.document.querySelector(".fd-achievement-search");
  search.value=monsterGoal.title;
  search.dispatchEvent(new w.Event("input",{bubbles:true}));
  const track=[...w.document.querySelectorAll(".fd-achievement-card button")].find(b=>b.textContent.includes("Suivre ce succès"));
  assert(track,"Bouton de suivi absent");
  track.click();
  assert(engine.getState().trackedAchievements.includes("monster-979-10"),"Objectif suivi non conservé");
  const combat=[...w.document.querySelectorAll(".fd-nav-entry")].find(b=>b.textContent.includes("Zones et monstres"));
  combat.click();
  const incarnam=[...w.document.querySelectorAll(".fd-region-card")].find(b=>b.textContent.includes("Incarnam"));
  assert(incarnam,"Incarnam introuvable");
  incarnam.click();
  assert(w.document.querySelector(".fd-tracked-goals"),"Objectifs suivis absents du panneau Aventurier");
  const persisted=JSON.parse(w.localStorage.getItem("dofus-idle-full-v2"));
  assert(persisted.achievements["success-0"],"Ancien succès perdu dans localStorage");
  assert(persisted.achievements[recipeId],"Récompense de recette perdue dans localStorage");
  assert(persisted.trackedAchievements.includes("monster-979-10"),"Suivi non sauvegardé");
  assert.equal(failures.length,0,"Erreurs JavaScript : "+failures.join("; "));
  console.log("ACHIEVEMENTS VERIFIED",JSON.stringify({
   total:summary.total,categories:summary.categories,
   savedLegacySuccess:true,craftRecipe:itemId,tracked:true,pageSize:32
  }));
 }finally{w.close()}
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
