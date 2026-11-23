/* DOFUS IDLE v3 : tests métiers, navigation région-zone-monstre, stuff et banque. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {JSDOM}=require('/tmp/dofus-idle-test/node_modules/jsdom');
const ROOT=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const core=read('data/core.json'),world=read('data/world.json');
const classCatalog=read('assets/classes/catalog.json');
assert.equal(Object.keys(classCatalog).length,19,"19 portraits de classes officiels attendus");
assert(Object.keys(core.jobs).length>=22);
assert(Object.values(core.recipes).reduce((s,a)=>s+a.length,0)>=4700);
assert(Object.keys(world.monsters).length>=5000);
assert(Object.keys(world.zones).length>=569);
assert((core.gather['2']||[]).length>=15);
assert((core.gather['24']||[]).length>=10);
assert((core.recipes['27']||[]).length>500);
assert((core.recipes['15']||[]).length>500);
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const dom=new JSDOM(html,{url:'https://example.org/spingames/dofus-idle/',runScripts:'outside-only',pretendToBeVisual:true});
const {window:w}=dom;
// Quelques portraits officiels simulés via leurs coordonnées atlas, dans le
// même format que data/images.json généré par le client DOFUS 3.
w.DOFUS_IDLE_ASSETS={items:{},monsters:{
 "4051":["assets/atlases/monsters/001.webp",23],  // Kardorim
 "970":["assets/atlases/monsters/003.webp",5],     // monstre de Champs
 "98":["assets/atlases/monsters/004.webp",11],     // Tofu
 "180":["assets/atlases/monsters/005.webp",8],     // Wa Wabbit
 "226":["assets/atlases/monsters/006.webp",4]      // Moon
},jobs:{}};
w.fetch=async url=>{
 if(url.includes('core.json'))return {ok:true,json:async()=>core};
 if(url.includes('world.json'))return {ok:true,json:async()=>world};
 if(url.includes('images.json'))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
 if(url.includes('classes/catalog.json'))return {ok:true,json:async()=>classCatalog};
 return {ok:false,status:404};
};
w.confirm=()=>false;
w.URL.createObjectURL=()=>'/tmp/mock-save.json';
w.URL.revokeObjectURL=()=>{};
let fail=[];
w.addEventListener('error',e=>fail.push(e.message||String(e.error)));
w.eval(fs.readFileSync(path.join(ROOT,'game-full.js'),'utf8'));
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 try{
  await pause(180);
  assert(w.DOFUS_IDLE_FULL,'Moteur non initialisé');
  assert.equal(w.document.querySelectorAll('.fd-resource-card').length,(core.gather['2']||[]).length);
  const button=w.document.querySelector('.fd-resource-card:not([disabled])');
  assert(button,'aucune ressource initiale');
  button.click();
  assert.equal(w.DOFUS_IDLE_FULL.getState().action.type,'gather');
  const h=w.document.querySelectorAll('.fd-nav-entry');
  assert(h.length>=24,'tous les métiers doivent être présents');
  assert.equal(w.document.querySelector('.fd-nav h3')?.textContent,'COMBAT','Le combat doit apparaître en premier dans la sidebar');
  assert(h[0].textContent.includes('Zones et monstres'),'Les zones de combat doivent être le premier bouton');
  for(const navButton of h)assert(!/\b(?:null|undefined)\b/i.test(navButton.textContent),'Valeur null visible dans le menu: '+navButton.textContent);
  assert(!/\bnull\b/i.test(w.document.body.textContent),'null visible au chargement initial');
  const tailor=[...h].find(b=>b.textContent.includes('Tailleur'));
  assert(tailor,'tailleur manquant');
  tailor.click();
  assert(w.document.querySelectorAll('.fd-recipe-card').length>0,'recettes du Tailleur non affichées');
  assert(w.document.querySelectorAll('.fd-ingredient').length>0,'ingrédients absents');
  const all=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Toutes les recettes'));
  all.click();
  assert(w.document.querySelectorAll('.fd-recipe-card').length>0,'catalogue complet non rendu');
  const combat=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Zones et monstres'));
  assert(combat,'navigation combat absente');
  combat.click();
  const regions=[...w.document.querySelectorAll('.fd-region-card')];
  assert(regions.length>=30,'régions absentes');
  for(const name of ['Incarnam','Amakna','Île des Wabbits','Île de Moon','Frigost']){
   assert(regions.some(b=>b.textContent.includes(name)),'région manquante : '+name);
  }
  const regionLevels=regions.map(b=>Number(b.textContent.match(/niveau (\d+)/i)?.[1]||0));
  assert(regionLevels.every((x,i)=>i===0||regionLevels[i-1]<=x),'régions non triées par niveau croissant');
  const incarnam=regions.find(b=>b.textContent.includes('Incarnam'));
  assert(incarnam.querySelector('.fd-region-art'),'Portrait de région manquant');
  assert(/atlases\/monsters/.test(incarnam.querySelector('.fd-region-art').style.backgroundImage),
    'Incarnam doit utiliser le sprite DOFUS de Kardorim, et pas un emoji');
  incarnam.click();
  assert(w.document.querySelectorAll('.fd-zone').length>=9,'zones Incarnam absentes');
  assert(w.document.querySelector('.fd-combat-sort select'),'sélecteur de tri des niveaux absent');
  const zoneLvls=[...w.document.querySelectorAll('.fd-zone')].map(b=>Number(b.textContent.match(/Niveau conseillé (\d+)/)?.[1]||0));
  assert(zoneLvls.every((x,i)=>!i||zoneLvls[i-1]<=x),'zones non triées par niveau');
  assert(w.document.querySelector('.fd-region-breadcrumb-art'),'Petit portrait de région absent');
  assert(w.document.querySelectorAll('.fd-zone-art').length>=9,'Portraits de zones manquants');
  const battle=w.document.querySelector('.fd-battle-sections');
  const zoneGrid=w.document.querySelector('.fd-combat-zone-grid');
  assert(battle&&zoneGrid,'Panneaux combat et zones absents');
  assert(battle.compareDocumentPosition(zoneGrid)&w.Node.DOCUMENT_POSITION_FOLLOWING,
    'Les panneaux combat doivent se trouver au-dessus des cartes de zones');
  assert.equal(w.document.querySelectorAll('.fd-monster-row').length,0,'les monstres ne doivent apparaître qu’après ouverture');
  const champs=[...w.document.querySelectorAll('.fd-zone')].find(b=>b.textContent.includes('Champs'));
  assert(champs,'zone Champs d’Incarnam absente');
  assert(/atlases\/monsters/.test(champs.querySelector('.fd-zone-art').style.backgroundImage),
    'Champs doit utiliser un portrait DOFUS de monstre de la zone');
  champs.click();
  assert(w.document.querySelectorAll('.fd-monster-row').length>=4,'monstres de Champs absents');
  assert.equal(w.document.querySelectorAll('.fd-fight-panel').length,2,'panneaux de combat manquants');
  const target=w.document.querySelector('.fd-monster-info');
  assert(target,'sélecteur de monstre absent');
  target.click();
  const selected=w.DOFUS_IDLE_FULL.getState().selectedMonster;
  assert(world.monsters[selected],'sélection monstre invalide');
  assert(w.document.querySelector('.fd-enemy-hp'),'barre de PV monstre manquante');
  assert(w.document.querySelector('.fd-player-hp'),'barre de PV joueur manquante');
  assert(w.document.querySelector('.fd-loot-bonus'),'équipements bonus absents');
  assert(w.document.querySelectorAll('.fd-combat-gear-slot').length>=8,'emplacements de stuff manquants');
  assert(w.DOFUS_IDLE_FULL.getGearPoolSize()>500,'catalogue de stuff insuffisant');
  const fight=w.document.querySelector('.fd-monster-buttons .fd-danger:not(:disabled)');
  assert(fight,'aucun monstre de départ combattable');
  fight.click();
  assert.equal(w.DOFUS_IDLE_FULL.getState().action.type,'combat');
  w.Math.random=()=>0;
  w.DOFUS_IDLE_FULL.simulateSeconds(20);
  const state=w.DOFUS_IDLE_FULL.getState();
  assert(state.kills>=1,'la victoire automatique ne fonctionne pas');
  assert(Object.keys(state.gearDrops).length>=1,'aucun équipement ne tombe lors du roll bonus forcé');
  assert(Object.values(state.pendingLoot||{}).reduce((n,q)=>n+q,0)>0,'butin temporaire non rempli');
  assert(w.document.querySelector('.fd-loot-stash'),'butin absent sous le personnage');
  assert(w.document.querySelector('.fd-combat-log-drop .fd-log-art'),'icône de drop absente du journal');
  const stashButtons=[...w.document.querySelectorAll('.fd-loot-stash-actions button')];
  assert(stashButtons.some(b=>b.textContent.includes('Tout récupérer')),'bouton tout récupérer manquant');
  assert(stashButtons.some(b=>b.textContent.includes('Tout vendre')),'bouton tout vendre manquant');
  assert(stashButtons.some(b=>b.textContent.includes('Tout jeter')),'bouton tout jeter manquant');
  stashButtons.find(b=>b.textContent.includes('Tout récupérer')).click();
  assert.equal(Object.keys(w.DOFUS_IDLE_FULL.getState().pendingLoot).length,0,'butin non vidé après collecte');
  assert(Object.keys(state.gearDrops).every(id=>core.items[id]),'objet de stuff inexistant');
  assert(!/\bnull\b/i.test(w.document.body.textContent),'mention null visible dans le jeu');
  const bank=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Banque'));
  bank.click();
  assert(w.document.querySelectorAll('.fd-bank-item').length>=1,'les objets récupérés doivent être en banque');
  const character=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Personnage'));
  character.click();
  assert.equal(w.document.querySelectorAll('.fd-select-class').length,19,'les 19 classes ne sont pas proposées');
  assert.equal(w.document.querySelectorAll('.fd-select-class .fd-class-card-art').length,19,'portraits de classes manquants');
  assert.equal(w.document.querySelector('.fd-character-avatar').tagName,'IMG','portrait officiel non chargé sur le personnage');
  const eniripsa=[...w.document.querySelectorAll('.fd-select-class')].find(b=>b.textContent.includes('Eniripsa'));
  eniripsa.click();
  assert.equal(w.DOFUS_IDLE_FULL.getState().classId,'eniripsa','changement de classe non sauvegardé');
  assert(w.document.querySelectorAll('.fd-char-stat-row').length===6,'caractéristiques à distribuer manquantes');
  const points=w.DOFUS_IDLE_FULL.getState().playerXp;
  const addPoint=w.document.querySelector('.fd-char-stat-row .fd-mini');
  assert(addPoint&&!addPoint.disabled,'niveau acquis mais distribution de points impossible');
  addPoint.click();
  assert.equal(w.DOFUS_IDLE_FULL.getState().characteristics.vitalite,1,'la vitalité doit augmenter avec les points investis');
  const achievementsLink=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Succès'));
  assert(achievementsLink,'lien Succès manquant');
  achievementsLink.click();
  assert(w.document.querySelectorAll('.fd-achievement-card').length>=20,'catalogue des succès trop court');
  const claim=[...w.document.querySelectorAll('.fd-achievement-card button')].find(b=>!b.disabled&&b.textContent.includes('Récupérer'));
  assert(claim,'aucun succès de combat prêt à récupérer');
  claim.click();
  assert(Object.keys(w.DOFUS_IDLE_FULL.getState().achievements).length>=1,'récompense de succès non conservée');

  // Vérifier que la Crypte de Kardorim n'est visible que dans l'onglet Donjons.
  const againCombat=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Zones et monstres'));
  againCombat.click();
  const dungeonSidebar=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.trim()==='🏰Donjons'||b.textContent.includes('Donjons'));
  assert(dungeonSidebar,'Lien Donjons absent du haut du menu');
  const dungeonTab=[...w.document.querySelectorAll('.fd-combat-tab')].find(b=>b.textContent.includes('Donjons'));
  assert(dungeonTab,'onglet Donjons manquant');
  dungeonTab.click();
  const dungeonRegions=[...w.document.querySelectorAll('.fd-region-card')];
  const incDungeon=dungeonRegions.find(b=>b.textContent.includes('Incarnam'));
  assert(incDungeon,'région Incarnam absente des donjons');
  incDungeon.click();
  assert([...w.document.querySelectorAll('.fd-zone')].some(b=>b.textContent.includes('Crypte de Kardorim')),
    'Crypte de Kardorim absente des donjons officiels');

  assert.equal(fail.length,0,'erreurs javascript: '+fail.join(', '));
  console.log('SMOKE SUCCEEDED',{jobs:Object.keys(core.jobs).length,recipes:core.meta.recipes,monsters:Object.keys(world.monsters).length,zones:Object.keys(world.zones).length});
 }finally{dom.window.close()}
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
