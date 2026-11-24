/* Regression : seul le craft peut fournir un équipement après cette mise à jour.
   On simule volontairement des butins de monstres contenant un équipement à 100 %. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const {JSDOM}=require("/tmp/dofus-idle-test/node_modules/jsdom");
const root=path.join(__dirname,"..");
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const core=read("data/core.json"),world=read("data/world.json");
const isEquipment=id=>Number(core.types[String(core.items[String(id)]?.[3])]?.[1])===0;
const selection=Object.entries(core.recipes).flatMap(([job,rows])=>rows.map(r=>({job,r})))
 .find(({r})=>isEquipment(r[0])&&r[1]<=50&&r[2].length>0&&r[2].every(([id])=>core.items[String(id)]));
assert(selection,"Aucune recette d'équipement pour le test");
const {job,r:recipe}=selection,gear=String(recipe[0]);
const resource=String(Object.values(core.gather).flat().map(row=>row[0])
 .find(id=>Number(core.types[String(core.items[String(id)]?.[3])]?.[1])===2));
assert(resource&&core.items[resource],"Ressource récoltable absente");
const monsterId=String(world.zones["444"][3][0]),monster=world.monsters[monsterId];
assert(monster,"Monstre d'Incarnam absent");
monster[4]=[[gear,100],[resource,100]];
const bank={[gear]:1};
for(const [id,amount] of recipe[2])bank[String(id)]=Math.max(50,Number(amount)*10);
const seed={version:2,view:"combat",bank,kamas:2000,playerXp:1000000000,
 classId:"iop",jobs:{[job]:100000000},hp:9000,
 equipment:{},upgrades:{weapon:15,armor:15,bank:0},
 achievements:{"success-0":123},gearDrops:{[gear]:2},
 selectedZone:"444",selectedRegion:"Incarnam",selectedMonster:monsterId,
 combatMode:"zones",automation:{lootMode:"manual",sellValue:20,healBelow:0,stopBelow:0,switchAfter:0}};
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const dom=new JSDOM(html,{url:"https://example.org/spingames/dofus-idle/",
 runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window,errors=[];
w.addEventListener("error",e=>errors.push(String(e.error||e.message)));
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.DOFUS_IDLE_CLOUD={url:"",publishableKey:""};
w.localStorage.setItem("dofus-idle-full-v2",JSON.stringify(seed));
w.confirm=()=>true;
w.fetch=async url=>{
 if(url.includes("data/core.json"))return {ok:true,json:async()=>core};
 if(url.includes("data/world.json"))return {ok:true,json:async()=>world};
 if(url.includes("data/equipment-v7.json"))return {ok:true,json:async()=>read("data/equipment-v7.json")};
 if(url.includes("data/images.json"))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 return {ok:false,status:404};
};
// Expose les fonctions internes à ce test seulement, sans API de triche en production.
const source=fs.readFileSync(path.join(root,"game-full.js"),"utf8");
const marker="init();\n})();";
assert(source.endsWith(marker+"\n")||source.endsWith(marker),"Point d'injection du test modifié");
const instrumented=source.replace(marker,
 "window.__craftDropTest={state:()=>state,isCraftOnlyEquipment,droppableResource,queueLoot,startCombat,victory,dungeonVictory,monsterDropsPanel,startCraft,recipeFor,tick};\n"+marker);
w.eval(instrumented);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 try{
  await pause(350);
  const api=w.__craftDropTest,game=w.DOFUS_IDLE_FULL;
  assert(api&&game,"Moteur non initialisé");
  assert(api.isCraftOnlyEquipment(gear),"Équipement mal classé");
  assert(api.droppableResource(resource),"Ressource mal classée");
  assert.equal(api.queueLoot(gear,1),false,"Un équipement ne doit jamais entrer dans la poche de butin");
  assert.equal(api.queueLoot(resource,1),true,"Une ressource doit toujours pouvoir tomber");
  const panel=api.monsterDropsPanel(monsterId,monster);
  assert(panel.querySelector(".fd-craft-only-info"),"Information craft seul manquante");
  assert(!panel.querySelector(".fd-loot-bonus"),"Ancienne bannière d'équipement bonus présente");
  assert(!panel.querySelector(".fd-loot-grid").textContent.includes(core.items[gear][0]),"L'équipement figure encore dans les drops disponibles");
  api.startCombat(monsterId);
  assert(api.state().action?.type==="combat","Combat impossible");
  api.victory(monster,api.state().action);
  assert.equal(api.state().pendingLoot[gear]||0,0,"Monstre : équipement droppé malgré le filtre");
  assert((api.state().pendingLoot[resource]||0)>=2,"Monstre : ressource garantie non droppée");
  assert.equal(api.state().gearDrops[gear],2,"Ancien historique de stuff détruit");
  const before=api.state().pendingLoot[resource]||0;
  api.dungeonVictory({id:Number(monsterId),dungeonRun:{
   zoneId:"447",rooms:[Number(monsterId)],index:0,completed:false}},monster);
  assert((api.state().pendingLoot[resource]||0)>before,"Boss : bonus de ressource manquant");
  assert.equal(api.state().pendingLoot[gear]||0,0,"Boss : équipement obtenu à tort");
  assert.equal(api.state().bank[gear],1,"Ancienne pièce de banque supprimée");
  // Le craft doit encore produire une pièce supplémentaire en consommant les composants.
  api.state().action=null;
  api.startCraft(job,gear);
  assert.equal(api.state().action?.type,"craft","Craft d'équipement impossible");
  api.tick(15);
  assert((api.state().bank[gear]||0)>1,"L'équipement ne peut plus être fabriqué");
  assert((api.state().craftedRecipes[job+":"+gear]||0)>=1,"Recette fabriquée non enregistrée");
  assert.equal(api.state().achievements["success-0"],123,"Les succès existants ont disparu");
  assert.equal(errors.length,0,"Erreur JS "+errors.join("; "));
  console.log("CRAFT-ONLY EQUIPMENT VERIFIED",JSON.stringify({gear,resource,oldOwned:1,
   crafted:api.state().craftedRecipes[job+":"+gear],bossResources:true}));
 }finally{w.close()}
})().catch(error=>{console.error(error);w.close();process.exitCode=1});
