const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const first=JSON.stringify({
 level:10,xp:123,kamas:456,kills:22,clickLevel:2,autoLevel:0,luckLevel:1,
 vitalityLevel:1,tempoLevel:0,playerHp:70,timeLeft:3,
 zone:0,stage:16,maxZone:0,hp:null,maxHp:null,loot:{"Plume":2},
 dex:{},bosses:[],incarnamVersion:2
});
let clock=1000,hidden=false,nextTimeout=0;
const intervals=[],timeoutTasks=new Map(),nodes=new Map(),store=new Map([["dofus-clicker-v1",first]]);
class FakeDate extends Date{static now(){return clock;}}
class CL{constructor(){this.s=new Set()}add(...a){a.forEach(x=>this.s.add(x))}remove(...a){a.forEach(x=>this.s.delete(x))}contains(x){return this.s.has(x)}toggle(x,on){if(on??!this.contains(x))this.add(x);else this.remove(x)}}
function get(id){
 if(!nodes.has(id))nodes.set(id,{
   id,style:{},hidden:id==="zoneOverlay",classList:new CL(),innerHTML:"",
   textContent:"",listeners:{},setAttribute(){},
   addEventListener(k,cb){this.listeners[k]=cb},
   querySelectorAll(){return []},
   appendChild(){},closest(){return null},
   get offsetWidth(){return 50}
 });
 return nodes.get(id);
}
class ImageFake{
 constructor(){this.onload=null;this.onerror=null;}
 set src(url){this._src=url;queueMicrotask(()=>this.onload?.());}
 get src(){return this._src;}
 decode(){return Promise.resolve();}
}
const doc={getElementById:get,querySelectorAll(){return []},addEventListener(){},createElement:()=>get("effect"),get hidden(){return hidden}};
const sandbox={
 window:{DOFUS_CATALOG_FR:{},addEventListener(){}},document:doc,Image:ImageFake,
 localStorage:{getItem:key=>store.get(key)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},
 setInterval(cb){intervals.push(cb);return intervals.length},
 setTimeout(cb,ms){const id=++nextTimeout;timeoutTasks.set(id,{cb,ms});return id},
 clearTimeout(id){timeoutTasks.delete(id)},
 console,Math,Intl,Date:FakeDate
};
const source=fs.readFileSync(path.join(root,"game.js"),"utf8");
const marker='window.addEventListener("pagehide",save);';
assert.ok(source.includes(marker));
vm.runInNewContext(source.replace(marker,
 'window.__testSurvival={state:s,defeat,maxPlayerHp,fightDuration,hit,target,refreshCombat};\n'+marker),sandbox);
const game=sandbox.window.__testSurvival;
function elapsed(seconds=1){clock+=seconds*1000;intervals[0]();}
function completeTimer(ms){const row=[...timeoutTasks].find(([id,t])=>t.ms===ms);assert.ok(row,"timing "+ms+" absent");timeoutTasks.delete(row[0]);row[1].cb();}
async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
(async()=>{
 await settle();
 const hpMax=game.maxPlayerHp();
 assert.ok(hpMax>100);
 assert.equal(get("zoneTitle").textContent,"Lac");
 assert.equal(get("territoryBannerTitle").textContent,"Incarnam • Lac");
 assert.equal(get("timerLabel").textContent,"3 s");
 hidden=true;
 elapsed(1);elapsed(1);
 assert.equal(game.state.timeLeft,3,"chrono en pause si onglet invisible");
 hidden=false;
 elapsed(1);elapsed(1);elapsed(1);
 assert.equal(game.state.stage,15,"défaite au chrono : début du Lac, pas Champs");
 assert.equal(game.state.playerHp,hpMax);
 assert.equal(game.state.kamas,456);
 assert.equal(game.state.level,10);
 assert.equal(game.state.vitalityLevel,1);
 assert.equal(game.state.loot.Plume,2);
 assert.equal(get("zoneOverlayEyebrow").textContent,"DÉFAITE • RECOMMENCER");
 completeTimer(1900);
 await settle();
 assert.equal(get("zoneOverlay").hidden,true);
 assert.equal(game.state.timeLeft,game.fightDuration());
 game.state.stage=26;game.state.playerHp=1;game.state.timeLeft=25;
 game.refreshCombat(false);
 await settle();
 for(let i=0;i<4;i++)elapsed(1);
 assert.equal(game.state.stage,23,"défaite aux PV : retour au début de la Crypte");
 assert.equal(game.state.playerHp,hpMax);
 assert.equal(game.state.kamas,456);
 completeTimer(1900);
 await settle();
 // Un nouvel endroit doit déclencher un panneau grand format et un soin total.
 game.state.stage=17;game.state.hp=1;game.state.playerHp=35;
 game.hit(100,true);
 assert.equal(game.state.stage,18,"fin du Lac > début du Cimetière");
 assert.equal(game.state.playerHp,hpMax);
 completeTimer(350);await settle();
 assert.equal(get("zoneOverlayName").textContent,"Cimetière");
 assert.equal(get("territoryBannerTitle").textContent,"Incarnam • Cimetière");
 assert.equal(get("zoneOverlay").hidden,false);
 assert.ok(game.state.timeLeft>20);
 console.log("Survie OK : pause, chrono, PV, sauvegarde, retour Lac/Crypte, transition Cimetière.");
})().catch(e=>{console.error(e);process.exitCode=1});
