const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root=path.resolve(__dirname,"..");
const assets = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"assets/monsters/catalog.fr.js"),"utf8"),assets);
assert.equal(assets.window.DOFUS_CATALOG_FR["979"].name,"Pissenlit Miroitant");
assert.ok(Object.keys(assets.window.DOFUS_CATALOG_FR).length>=48);

const nodes=new Map(),images=[],timers=[],intervals=[];
class ClassList {
  constructor(){this.items=new Set();}
  add(...classes){classes.forEach(v=>this.items.add(v));}
  remove(...classes){classes.forEach(v=>this.items.delete(v));}
  contains(v){return this.items.has(v);}
  toggle(v,force){if(force===undefined)force=!this.contains(v);if(force)this.add(v);else this.remove(v);return force;}
}
function element(id){
 if(!nodes.has(id))nodes.set(id,{
  id,style:{},classList:new ClassList(),listeners:{},textContent:"",innerHTML:"",
  addEventListener(type,cb){this.listeners[type]=cb;},
  querySelectorAll(){return [];},setAttribute(){},closest(){return null;},appendChild(){},
  get offsetWidth(){return 100;},
 });
 return nodes.get(id);
}
const tabs=["shop","loot","dex"].map(name=>{const e=element("tab-"+name);e.dataset={tab:name};return e});
class FakeImage{
 constructor(){this.onload=null;this.onerror=null;this._src="";this.style={};images.push(this);}
 set src(url){this._src=url;}
 get src(){return this._src;}
 decode(){return Promise.resolve();}
}
const local=new Map();
const sandbox={
 window:{...assets.window,addEventListener(){}},
 document:{
  getElementById:element,
  querySelectorAll(selector){return selector===".tab"?tabs:[];},
  addEventListener(){},createElement(){return element("damage-pop");},
 },
 Image:FakeImage,
 localStorage:{
  getItem:key=>local.get(key)||null,
  setItem:(key,value)=>local.set(key,value),
  removeItem:key=>local.delete(key),
 },
 setInterval:cb=>(intervals.push(cb),intervals.length),
 setTimeout:(cb,delay)=>(timers.push({cb,delay}),timers.length),
 clearTimeout:()=>{},
 console,
 Intl,
 Math,
 Date,
};
const source=fs.readFileSync(path.join(root,"game.js"),"utf8");
const marker='window.addEventListener("pagehide",save);';
assert.ok(source.includes(marker));
vm.runInNewContext(source.replace(marker,
 'window.__testIncarnam = {territories:INCARNAM_TERRITORIES,zones:ZONES};\n'+marker),sandbox);
const game=sandbox.window.__testIncarnam;
assert.equal(game.territories.length,7);
assert.equal(game.zones[0].enemies.length,28);
assert.equal(game.zones[0].boss.id,4051);
const expected=[
 ["Champs",[979,980,970,981]],
 ["Route des âmes",[3271,3273,3272,3270]],
 ["Pâturages",[973,972,984,971]],
 ["Forêt",[982,4105,4106]],
 ["Lac",[4110,4109,4108]],
 ["Cimetière",[4046,4048,4047,4049,4050]],
 ["Crypte de Kardorim",[4046,4048,4047,4049,4050]]
];
for(let i=0;i<expected.length;i++){
 assert.equal(game.territories[i].name,expected[i][0]);
 assert.equal(game.territories[i].monsters.map(x=>x[0]).join(","),expected[i][1].join(","));
}

async function flush(){for(let i=0;i<6;i++)await Promise.resolve();}
(async()=>{
 assert.equal(images.length,1);
 assert.equal(element("monsterImage").style.display,"none");
 assert.equal(element("monsterFallback").style.display,"none");
 images[0].onload();
 await flush();
 assert.equal(element("monsterName").textContent,"Pissenlit Miroitant");
 assert.equal(element("monsterImage").style.display,"block");
 assert.equal(element("monsterFallback").style.display,"none");
 assert.ok(images.length>=2,"l'image du prochain monstre doit être préchargée");

 for(let i=0;i<15;i++)element("attack").listeners.click();
 assert.equal(element("monsterWrap").classList.contains("defeated"),true);
 const kills=element("kills").textContent;
 for(let i=0;i<15;i++)element("attack").listeners.click();
 assert.equal(element("kills").textContent,kills,"aucun doublon de récompense pendant la transition");
 assert.equal(timers.length,1);
 assert.ok(timers[0].delay>=300);
 timers[0].cb();
 assert.equal(element("monsterImage").style.display,"none","l'ancien monstre doit être masqué");
 assert.equal(element("monsterFallback").style.display,"none","pas d'emoji clignotant");
 images[1].onload();
 await flush();
 assert.equal(element("monsterName").textContent,"Rose Vaporeuse");
 assert.ok(element("monsterImage").src.endsWith("980.png"));
 assert.equal(element("monsterWrap").classList.contains("defeated"),false);
 assert.equal(element("monsterImage").style.display,"block");
 assert.equal(element("monsterFallback").style.display,"none");
 console.log("Smoke test DOFUS Clicker : noms FR, sprites et transition OK.");
})().catch(err=>{console.error(err);process.exitCode=1});
