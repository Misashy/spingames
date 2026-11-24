/* DOFUS IDLE — Guide de fabrication des panoplies.
   Utilise les identifiants, recettes, stocks et butins du jeu existant.
   Aucun objet n'est donné ni consommé par le planificateur. */
(function(){
"use strict";

const str=id=>String(id);
const qty=n=>Math.max(0,Math.min(100000000,Math.floor(Number(n)||0)));
const fold=text=>String(text||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
function indexRecipes(core){
 const result=new Map();
 for(const [job,rows] of Object.entries(core.recipes||{})){
  for(const row of rows||[]){
   if(!Array.isArray(row)||!core.items?.[str(row[0])]||!Array.isArray(row[2]))continue;
   const id=str(row[0]),parts=row[2].filter(p=>Array.isArray(p)&&qty(p[1])>0)
    .map(p=>({id:str(p[0]),qty:qty(p[1])}));
   if(!parts.length)continue;
   if(!result.has(id))result.set(id,[]);
   result.get(id).push({id,job:str(job),level:qty(row[1])||1,parts});
  }
 }
 return result;
}
function stockMap(bank,equipment){
 const result=new Map();
 for(const [id,count] of Object.entries(bank||{})){
  const n=qty(count);if(n)result.set(str(id),n);
 }
 for(const id of Object.values(equipment||{})){
  if(id==null||id==="")continue;
  const key=str(id);result.set(key,(result.get(key)||0)+1);
 }
 return result;
}
/* Réserve d'abord les pièces déjà possédées, puis distribue les composants
   restants entre toutes les recettes sans compter un même objet deux fois.
   L'ordre des fabrications place les sous-recettes avant les pièces finales. */
function planSet(ids,recipes,bank,equipment,jobLevel,isEquipment){
 const stock=stockMap(bank,equipment);
 const targets=new Map();
 for(const id of ids||[])targets.set(str(id),(targets.get(str(id))||0)+1);
 const reserve=(id,count)=>{
  const n=Math.min(qty(count),stock.get(id)||0);
  if(n)stock.set(id,(stock.get(id)||0)-n);
  return n;
 };
 const pieces=[];
 for(const [id,total] of targets){
  const owned=reserve(id,total);
  pieces.push({id,total,owned,missing:total-owned});
 }
 const craft=new Map(),materials=new Map(),warnings=new Map(),order=[];
 function leaf(id,need,used,missing,warning){
  const item=materials.get(id)||{id,total:0,owned:0,missing:0};
  item.total+=need;item.owned+=used;item.missing+=missing;
  materials.set(id,item);
  if(warning)warnings.set(id,warning);
 }
 function expand(id,need,ancestry,depth){
  const required=qty(need);if(!required)return;
  const used=reserve(id,required),missing=required-used;
  if(!missing){
   // Une ressource déjà possédée peut toujours servir plusieurs recettes,
   // mais elle ne doit jamais être réservée deux fois.
   const choices=recipes.get(id)||[];
   if(!choices.length)leaf(id,required,used,0);
   return;
  }
  if(depth>=18||ancestry.has(id)){
   leaf(id,required,used,missing,ancestry.has(id)?
    "Recette circulaire détectée : composants à vérifier.":"Chaîne de recettes trop profonde.");
   return;
  }
  const options=(recipes.get(id)||[]).filter(r=>r.parts.every(p=>p.id!==id));
  if(!options.length){
   leaf(id,required,used,missing,isEquipment(id)?"Pas de recette connue pour cet équipement.":null);
   return;
  }
  const picked=options.slice().sort((a,b)=>{
   const usable=a.level<=jobLevel(a.job)?0:1,other=b.level<=jobLevel(b.job)?0:1;
   return usable-other||a.level-b.level||a.parts.length-b.parts.length;
  })[0];
  const next=new Set(ancestry);next.add(id);
  for(const part of picked.parts)expand(part.id,part.qty*missing,next,depth+1);
  if(!craft.has(id)){
   craft.set(id,{id,job:picked.job,level:picked.level,qty:0,
    canTrain:jobLevel(picked.job)>=picked.level});
   order.push(id);
  }
  const step=craft.get(id);step.qty+=missing;
 }
 for(const piece of pieces)if(piece.missing)expand(piece.id,piece.missing,new Set(),0);
 return {
  pieces,
  complete:pieces.every(p=>p.missing===0),
  owned:pieces.reduce((n,p)=>n+p.owned,0),
  total:pieces.reduce((n,p)=>n+p.total,0),
  crafts:order.map(id=>craft.get(id)),
  materials:[...materials.values()].sort((a,b)=>b.missing-a.missing||a.id.localeCompare(b.id)),
  warnings:[...warnings].map(([id,message])=>({id,message}))
 };
}
function element(tag,cls,content){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!=null)node.textContent=String(content);
 return node;
}
function button(label,fn,disabled=false,cls=""){
 const b=element("button","fd-planner-button "+cls,label);b.type="button";b.disabled=disabled;
 b.addEventListener("click",fn);return b;
}
function paragraph(parent,label,cls=""){const p=element("p",cls,label);parent.append(p);return p}
function box(parent,cls){const node=element("div",cls);parent.append(node);return node}
function badge(parent,label,cls=""){parent.append(element("span","fd-planner-badge "+cls,label))}
function itemWithImage(parent,id,api){
 const row=box(parent,"fd-planner-item");
 const image=api.image(id);
 if(image)row.append(image);
 row.append(element("strong","",api.itemName(id)));return row;
}
let cachedCore=null,cachedRecipes=null,searchQuery="",searchPage=0;
function getRecipes(core){
 if(cachedCore!==core){cachedCore=core;cachedRecipes=indexRecipes(core)}
 return cachedRecipes;
}
function discover(id,api){
 const gathers=[];
 for(const [job,rows] of Object.entries(api.core.gather||{}))
  for(const row of rows)if(str(row[0])===id)
   gathers.push({job,level:qty(row[1])});
 const fights=[];
 for(const [mid,rate] of api.dropIndex[id]||[]){
  const monster=api.world.monsters[str(mid)];
  if(!monster||!rate)continue;
  const zone=(monster[5]||[]).map(str).find(z=>api.world.zones[z]);
  if(!zone)continue;
  fights.push({id:str(mid),name:monster[0],level:qty(monster[1]),rate:Number(rate)||0,zone,
   place:api.world.zones[zone][0]});
 }
 fights.sort((a,b)=>
  (Number(b.level-8<=api.level())-Number(a.level-8<=api.level()))||
  b.rate-a.rate||a.level-b.level);
 return {gathers:gathers.slice(0,5),fights:fights.slice(0,4)};
}
function view(api){
 const sets=Object.entries(api.sets||{})
  .filter(([,def])=>Array.isArray(def?.[1])&&def[1].filter(id=>api.core.items[str(id)]).length>=2)
  .sort((a,b)=>{
   const level=def=>Math.min(...def[1].map(x=>api.itemLevel(x)));
   return level(a[1])-level(b[1])||String(a[1][0]).localeCompare(String(b[1][0]),"fr");
  });
 const root=element("div","fd-planner");
 const title=box(root,"fd-planner-heading");
 title.append(element("h2","", "🔨 Guide de fabrication des panoplies"));
 paragraph(title,"Choisis une panoplie : le jeu vérifie ta banque et tes objets équipés, calcule les sous-recettes puis indique les métiers et monstres utiles. Aucun ingrédient n'est consommé ici.");
 if(!sets.length){
  paragraph(root,"Les données de panoplies sont indisponibles. Recharge la page et vérifie les fichiers d'équipement.","fd-planner-alert");
  return root;
 }
 const picker=box(root,"fd-planner-picker");
 picker.append(element("h3","","🔎 Choisir une panoplie"));
 const input=element("input","fd-planner-search");
 input.type="search";input.placeholder="Rechercher : Bouftou, Tofu, Scarafeuille…";
 input.value=searchQuery;
 const results=box(picker,"fd-planner-results");
 const pagination=box(picker,"fd-planner-pagination");
 function populate(){
  results.replaceChildren();pagination.replaceChildren();
  const filtered=sets.filter(([,def])=>fold(def[0]).includes(fold(searchQuery)));
  const per=10,pages=Math.max(1,Math.ceil(filtered.length/per));
  searchPage=Math.min(searchPage,pages-1);
  for(const [id,def] of filtered.slice(searchPage*per,(searchPage+1)*per)){
   const picked=str(api.state.plannerSetId)===id;
   const row=box(results,"fd-planner-choice"+(picked?" selected":""));
   const display=box(row,"fd-planner-choice-title");
   display.append(element("strong","",def[0]));
   display.append(element("small","",def[1].length+" pièces · niveau "+Math.min(...def[1].map(x=>api.itemLevel(x)))));
   row.append(button(picked?"✓ Sélectionnée":"Planifier",()=>api.selectSet(id),picked));
  }
  if(!filtered.length)paragraph(results,"Aucune panoplie ne correspond à cette recherche.");
  pagination.append(button("← Précédent",()=>{searchPage--;populate()},searchPage<=0));
  badge(pagination,(searchPage+1)+" / "+pages+" · "+filtered.length+" panoplies");
  pagination.append(button("Suivant →",()=>{searchPage++;populate()},searchPage>=pages-1));
 }
 input.addEventListener("input",()=>{
  searchQuery=input.value;searchPage=0;populate();
 });
 picker.insertBefore(input,results);
 populate();
 const id=str(api.state.plannerSetId||"");
 const def=api.sets[id];
 if(!def||!Array.isArray(def[1])){paragraph(root,"Sélectionne une panoplie pour afficher les besoins de fabrication.");return root}
 const ids=def[1].map(str).filter(i=>api.core.items[i]);
 const plan=planSet(ids,getRecipes(api.core),api.state.bank,api.state.equipment,api.jobLevel,api.isEquipment);
 const overview=box(root,"fd-planner-overview");
 overview.append(element("h3","","🧩 "+def[0]));
 badge(overview,plan.owned+" / "+plan.total+" pièces possédées",plan.complete?"good":"");
 badge(overview,plan.materials.reduce((n,p)=>n+p.missing,0)+" composants manquants");
 badge(overview,plan.crafts.reduce((n,p)=>n+p.qty,0)+" objets à fabriquer");
 const meter=box(overview,"fd-planner-meter");const fill=element("span");
 fill.style.width=(plan.total?100*plan.owned/plan.total:0)+"%";meter.append(fill);
 paragraph(overview,plan.complete?
  "Panoplie complète ! Tu peux la valider dans l'onglet Collections.":
  "Il reste "+(plan.total-plan.owned)+" pièce(s) à fabriquer. Les matériaux déjà en banque sont déduits une seule fois.");
 overview.append(button("📚 Ouvrir Collections",()=>api.nav("collection"),false,"secondary"));

 const pieces=box(root,"fd-planner-section");
 pieces.append(element("h3","","🛡️ Pièces de la panoplie"));
 const pieceGrid=box(pieces,"fd-planner-grid");
 for(const p of plan.pieces){
  const row=box(pieceGrid,"fd-planner-card");
  itemWithImage(row,p.id,api);
  badge(row,p.missing===0?"✓ Possédée":"À fabriquer : "+p.missing,p.missing===0?"good":"need");
  if(p.missing)row.append(button("🔨 Voir la recette",()=>{
   const recipe=getRecipes(api.core).get(p.id)?.[0];
   if(recipe)api.goCraft(recipe.job,p.id);
  },!(getRecipes(api.core).get(p.id)||[]).length,"secondary"));
 }

 const craft=box(root,"fd-planner-section");
 craft.append(element("h3","","⚒️ Fabrications à réaliser (dans l'ordre)"));
 paragraph(craft,"Les sous-recettes sont placées avant les pièces finales. Le niveau du métier nécessaire est indiqué.");
 if(!plan.crafts.length)paragraph(craft,plan.complete?"Aucune fabrication nécessaire.":"Aucune recette disponible pour ces pièces.");
 for(const step of plan.crafts){
  const row=box(craft,"fd-planner-line");
  itemWithImage(row,step.id,api);
  badge(row,"×"+step.qty+" · "+api.jobName(step.job)+" niveau "+step.level,step.canTrain?"good":"need");
  if(!step.canTrain)paragraph(row,"Métier insuffisant : niveau actuel "+api.jobLevel(step.job),"fd-planner-warning");
  row.append(button("Ouvrir la recette",()=>api.goCraft(step.job,step.id),false,"secondary"));
 }

 const materials=box(root,"fd-planner-section");
 materials.append(element("h3","","🌿 Ressources et composants"));
 paragraph(materials,"Quantités pour les pièces manquantes, en déduisant les stocks disponibles et les ingrédients déjà réservés. Les estimations de combats utilisent les taux de butin de base et restent approximatives.");
 if(!plan.materials.length)paragraph(materials,"Aucun matériau supplémentaire à récupérer.");
 for(const part of plan.materials){
  const row=box(materials,"fd-planner-material"+(part.missing?" missing":""));
  itemWithImage(row,part.id,api);
  badge(row,part.missing?"Manque "+part.missing+" / "+part.total:"✓ "+part.total+" disponible",part.missing?"need":"good");
  if(!part.missing)continue;
  const sources=discover(part.id,api);
  const actions=box(row,"fd-planner-sources");
  for(const entry of sources.gathers){
   actions.append(button("🌾 "+api.jobName(entry.job)+" (niv. "+entry.level+")",()=>api.goGather(entry.job,part.id),
    false,"secondary"));
  }
  for(const m of sources.fights.slice(0,3)){
   const expected=m.rate>0?Math.ceil(part.missing*100/m.rate):0;
   actions.append(button("⚔️ "+m.name+" · "+m.place+" · "+m.rate+" % · ≈ "+expected+" combats",()=>api.goMonster(m.id,m.zone),
    false,"secondary"));
  }
  if(!sources.gathers.length&&!sources.fights.length){
   paragraph(row,api.isEquipment(part.id)?
    "Pas de recette disponible : cette pièce ne peut pas encore être fabriquée avec les données actuelles.":
    "Source directe absente des données actuelles : cherche une autre recette ou un objet de quête.","fd-planner-warning");
  }
 }
 if(plan.warnings.length){
  const warnings=box(root,"fd-planner-section fd-planner-alert");
  warnings.append(element("h3","","⚠️ Recettes impossibles ou incomplètes"));
  for(const p of plan.warnings)paragraph(warnings,api.itemName(p.id)+" : "+p.message);
 }
 return root;
}
window.DOFUS_IDLE_CRAFT_PLANNER={indexRecipes,planSet,stockMap,view};
})();
