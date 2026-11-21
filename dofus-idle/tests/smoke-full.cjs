/* DOFUS IDLE v2 : tests moteur/UI avec la vraie base générée. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {JSDOM}=require('/tmp/dofus-idle-test/node_modules/jsdom');
const ROOT=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const core=read('data/core.json'),world=read('data/world.json');
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
w.DOFUS_IDLE_ASSETS={items:{},monsters:{},jobs:{}};
w.fetch=async url=>{
 if(url.includes('core.json'))return {ok:true,json:async()=>core};
 if(url.includes('world.json'))return {ok:true,json:async()=>world};
 if(url.includes('images.json'))return {ok:true,json:async()=>({items:{},monsters:{},jobs:{}})};
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
  const tailor=[...h].find(b=>b.textContent.includes('Tailleur'));
  assert(tailor,'tailleur manquant');
  tailor.click();
  assert(w.document.querySelectorAll('.fd-recipe-card').length>0,'recettes du Tailleur non affichées');
  assert(w.document.querySelectorAll('.fd-ingredient').length>0,'ingrédients absents');
  const all=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Toutes les recettes'));
  all.click();
  assert(w.document.querySelectorAll('.fd-recipe-card').length>0,'catalogue complet non rendu');
  const combat=[...w.document.querySelectorAll('.fd-nav-entry')].find(b=>b.textContent.includes('Zones et monstres'));
  combat.click();
  assert(w.document.querySelectorAll('.fd-zone').length>10,'zones absentes');
  assert(w.document.querySelectorAll('.fd-monster-row').length>0,'monstres de zone absents');
  const first=w.document.querySelector('.fd-monster-row');first.click();
  const selected=w.DOFUS_IDLE_FULL.getState().selectedMonster;
  assert(world.monsters[selected],'selection monstre invalide');
  const fight=w.document.querySelector('.fd-monster-detail .fd-button');
  assert(fight,'action combat absente');
  if(!fight.disabled){fight.click();assert.equal(w.DOFUS_IDLE_FULL.getState().action.type,'combat')}
  assert.equal(fail.length,0,'erreurs javascript: '+fail.join(', '));
  console.log('SMOKE SUCCEEDED',{jobs:Object.keys(core.jobs).length,recipes:core.meta.recipes,monsters:Object.keys(world.monsters).length,zones:Object.keys(world.zones).length});
 }finally{dom.window.close()}
})().catch(e=>{console.error(e);dom.window.close();process.exitCode=1});
