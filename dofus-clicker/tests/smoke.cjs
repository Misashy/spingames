const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const root=path.resolve(__dirname,"..");
const assets = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,"assets/monsters/catalog.fr.js"),"utf8"),assets);
assert.equal(assets.window.DOFUS_CATALOG_FR["incarnam-blue-lilpiwi"].name,"Piou Bleu");
assert.ok(Object.keys(assets.window.DOFUS_CATALOG_FR).length>=50);

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
 window:assets.window,
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
vm.runInNewContext(fs.readFileSync(path.join(root,"game.js"),"utf8"),sandbox);
async function flush(){for(let i=0;i<6;i++)await Promise.resolve();}
(async()=>{
 assert.equal(images.length,1);
 assert.equal(element("monsterImage").style.display,"none");
 assert.equal(element("monsterFallback").style.display,"none");
 images[0].onload();
 await flush();
 assert.equal(element("monsterName").textContent,"Piou Bleu");
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
 assert.equal(element("monsterName").textContent,"Chafer Débutant");
 assert.ok(element("monsterImage").src.endsWith("incarnam-chafer-novice.png"));
 assert.equal(element("monsterWrap").classList.contains("defeated"),false);
 assert.equal(element("monsterImage").style.display,"block");
 assert.equal(element("monsterFallback").style.display,"none");
 console.log("Smoke test DOFUS Clicker : noms FR, sprites et transition OK.");
})().catch(err=>{console.error(err);process.exitCode=1});
