/* DOFUS IDLE — Combat tactique V13/V14. 
   Règles originales compatibles avec le rythme idle, sans tours ni grille officiels. */
(function(){
"use strict";
const ELEMENTS={terre:{label:"Terre",icon:"🪨",stat:"force"},feu:{label:"Feu",icon:"🔥",stat:"intelligence"},eau:{label:"Eau",icon:"💧",stat:"chance"},air:{label:"Air",icon:"🌪️",stat:"agilite"},neutre:{label:"Neutre",icon:"⚔️",stat:"force"}};
const ELEMENT_KEYS=Object.keys(ELEMENTS);
const COSTS={strike:2,blast:4,execute:5,leech:3,heal:3,shield:3,dot:3,
 summon:4,fury:2,crit:2,haste:2,armor:2,evade:2,slow:3,weaken:3,luck:2,regen:3};
function number(value,fallback=0){const n=Number(value);return Number.isFinite(n)?n:fallback}
function clamp(n,lo,hi){return Math.max(lo,Math.min(hi,n))}
function elementForMonster(id){return ELEMENT_KEYS[Math.abs(Math.trunc(number(id)))%ELEMENT_KEYS.length]}
function resistanceForMonster(id,level,element){
 const basis=Math.abs(Math.trunc(number(id)))%5;
 const res=element===ELEMENT_KEYS[basis]?Math.min(24,8+Math.floor(number(level)/22)):Math.max(0,Math.floor(number(level)/65));
 return clamp(res,0,24);
}
function elementalHit(amount,monsterId,level,element){
 const resistance=resistanceForMonster(monsterId,level,element);
 return {resistance,damage:Math.max(1,Math.round(Math.max(1,number(amount,1))*(1-resistance/100)))};
}
function maximumAP(s,stat){return clamp(6+Math.floor(Math.max(0,number(stat("ap")))/1),6,12)}
function maximumMP(s,stat){return clamp(3+Math.floor(Math.max(0,number(stat("mp")))/1),3,6)}
function ensure(a,s,stat){
 if(!a||a.type!=="combat")return null;
 const apMax=maximumAP(s,stat),mpMax=maximumMP(s,stat);
 if(!a.tactical||typeof a.tactical!=="object")a.tactical={ap:apMax,mp:mpMax,regen:0,mpRegen:0,turn:0};
 const t=a.tactical;
 t.ap=clamp(number(t.ap,apMax),0,apMax);
 t.mp=clamp(number(t.mp,mpMax),0,mpMax);
 t.regen=clamp(number(t.regen),0,30);
 t.mpRegen=clamp(number(t.mpRegen),0,30);
 t.turn=number(t.turn);
 return t;
}
function advance(a,s,stat,seconds){
 const t=ensure(a,s,stat);if(!t||a.respawnRemaining)return;
 // Reconstitution de ressources en continu : 1 PA / 0,75 s et 1 PM / 5 s.
 const dt=clamp(number(seconds),0,30),apMax=maximumAP(s,stat),mpMax=maximumMP(s,stat);
 t.regen+=dt;
 const gained=Math.floor(t.regen/.75);
 if(gained){t.regen-=gained*.75;t.ap=Math.min(apMax,t.ap+gained)}
 t.mpRegen+=dt;
 const steps=Math.floor(t.mpRegen/5);
 if(steps){t.mpRegen-=steps*5;t.mp=Math.min(mpMax,t.mp+steps)}
 t.turn+=dt;
}
function cost(spell){return COSTS[spell?.[5]]||2}
function canCast(a,s,stat,spell){
 const t=ensure(a,s,stat);return !!t&&t.ap>=cost(spell);
}
function consume(a,s,stat,spell){
 if(!canCast(a,s,stat,spell))return false;
 a.tactical.ap-=cost(spell);return true;
}
function switchPosition(a,s,stat){
 const t=ensure(a,s,stat);if(!t||t.mp<1||a.respawnRemaining)return false;
 t.mp-=1;t.dodge=Math.min(4,number(t.dodge)+1);return true;
}
function defendHit(a,damage){
 const t=a?.tactical;if(!t)return {damage,evaded:false};
 if(number(t.dodge)>0){
  t.dodge--;return {damage:Math.max(0,Math.round(damage*.55)),evaded:true};
 }
 return {damage,evaded:false};
}
function resetOpponent(a,s,stat){
 const t=ensure(a,s,stat);if(!t)return;
 t.mp=maximumMP(s,stat);
 t.dodge=0;
}
function bossProfile(zoneId){
 const variant=Math.abs(Math.trunc(number(zoneId)))%3;
 return [
  {id:"lien",label:"Lien protecteur",icon:"🛡️",desc:"Le boss renforce périodiquement son bouclier pendant la première phase."},
  {id:"tourment",label:"Tourment élémentaire",icon:"🔥",desc:"Le boss frappe dans un élément défini et peut provoquer une brûlure limitée."},
  {id:"entrave",label:"Entrave",icon:"⏳",desc:"Le boss retire des PA périodiquement ; la mobilité aide à préparer une esquive."}
 ][variant];
}
function bossSpecial(a,s,zoneId,damage){
 const t=a?.tactical,profile=bossProfile(zoneId);
 if(!t)return {damage,description:""};
 const d=a.dungeonRun||{},phase=d.bossPhase||"normal";
 if(profile.id==="entrave"&&phase!=="bouclier"){
  t.ap=Math.max(0,t.ap-1);
  return {damage,description:"−1 PA · Entrave"};
 }
 if(profile.id==="tourment"&&phase==="enrage"){
  return {damage:Math.round(damage*1.12),description:"Tourment élémentaire"};
 }
 if(profile.id==="lien"&&phase==="bouclier"){
  return {damage:Math.max(1,Math.round(damage*.9)),description:"Lien protecteur"};
 }
 return {damage,description:""};
}
function chooseAutoSpell(spells,preference,healthRatio){
 const available=spells.filter(s=>preference(s[0])&&(s[5]!=="heal"&&s[5]!=="regen"||healthRatio<.78));
 return available.find(s=>["heal","shield","regen"].includes(s[5])&&healthRatio<.5)||
  available.find(s=>s[5]==="execute"&&healthRatio>=0)||
  available[0]||null;
}
function panel(a,s,stat,spells,onMove,onPolicy){
 const doc=typeof document!=="undefined"?document:null;if(!doc)return null;
 const wrap=doc.createElement("section");wrap.className="fd-tactical-panel";
 const heading=doc.createElement("h3");heading.textContent="⚔️ Tactique idle · PA, PM et résistances";wrap.append(heading);
 const summary=doc.createElement("p");
 summary.textContent="Système adapté à DOFUS IDLE : les PA se régénèrent en continu, les PM permettent une esquive préparée. Les monstres ont des résistances élémentaires déterministes.";
 wrap.append(summary);
 if(a?.type==="combat"){
  const t=ensure(a,s,stat);
  const stats=doc.createElement("div");stats.className="fd-tactical-stats";
  for(const [label,amount,max] of [["🔷 PA",t.ap,maximumAP(s,stat)],["🟢 PM",t.mp,maximumMP(s,stat)]]){
   const pill=doc.createElement("strong");pill.textContent=label+" "+amount+"/"+max;stats.append(pill);
  }
  wrap.append(stats);
  const btn=doc.createElement("button");btn.type="button";btn.className="fd-exp-button";
  btn.textContent="↪ Se repositionner (1 PM, esquive)";
  btn.disabled=t.mp<1||!!a.respawnRemaining;
  btn.addEventListener("click",onMove);wrap.append(btn);
 }else{
  const p=doc.createElement("p");p.textContent="Lance un combat pour voir tes réserves de PA et de PM.";wrap.append(p);
 }
 const prefs=doc.createElement("div");prefs.className="fd-tactical-options";
 const label=doc.createElement("label");
 label.textContent="Priorité automatique : ";
 const select=doc.createElement("select");select.className="fd-select";
 for(const [id,name] of [["balanced","Équilibrée"],["offense","Offensive"],["survival","Survie"]]){
  const opt=doc.createElement("option");opt.value=id;opt.textContent=name;select.append(opt);
 }
 select.value=["balanced","offense","survival"].includes(s.tacticalPolicy)?s.tacticalPolicy:"balanced";
 select.addEventListener("change",()=>onPolicy(select.value));
 label.append(select);prefs.append(label);wrap.append(prefs);
 if(a?.type==="combat"){
  const mId=String(a.id),level=number(a.monsterLevel,1);
  const res=doc.createElement("p");
  res.textContent="Résistances estimées de la cible : "+ELEMENT_KEYS.map(key=>
    ELEMENTS[key].icon+" "+ELEMENTS[key].label+" "+resistanceForMonster(mId,level,key)+" %").join(" · ");
  wrap.append(res);
  if(a.dungeonRun){
   const boss=doc.createElement("p");boss.textContent="Boss : "+bossProfile(a.dungeonRun.zoneId).label+" — "+bossProfile(a.dungeonRun.zoneId).desc;
   wrap.append(boss);
  }
 }
 return wrap;
}
window.DOFUS_IDLE_TACTICS={ELEMENTS,elementForMonster,resistanceForMonster,elementalHit,
 maximumAP,maximumMP,ensure,advance,cost,canCast,consume,switchPosition,defendHit,
 resetOpponent,bossProfile,bossSpecial,chooseAutoSpell,panel};
})();
