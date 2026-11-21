/* DOFUS IDLE — prototype indépendant. Aucun framework ni serveur requis. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const nfmt = n => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(Math.floor(Number(n)||0));
const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STORE = 'dofus-idle-independent-v1';
const BUILD='0.2.0-sprites';
const OFFICIAL_SPRITES = window.DOFUS_IDLE_ASSETS || {items:{},monsters:{},jobs:{}};
function sprite(kind,key,emoji,style=''){
 const src=OFFICIAL_SPRITES[kind]?.[String(key)];
 if(!src)return `<span class="dofus-icon-fallback ${style}">${esc(emoji)}</span>`;
 return `<span class="dofus-sprite ${style}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="dofus-icon-fallback" hidden>${esc(emoji)}</span></span>`;
}
const MAX_LEVEL = 200;
const SKILLS = [
 {id:'wood',name:'Bûcheron',icon:'🪓',verb:'Couper',desc:'Coupe les arbres du Monde des Douze.',acts:[
  ['ash','Frêne','Bois de Frêne',1,2.35,20,'🌳',4],['chestnut','Châtaignier','Bois de Châtaignier',20,2.8,48,'🌲',9],['walnut','Noyer','Bois de Noyer',40,3.2,85,'🌳',17],['oak','Chêne','Bois de Chêne',60,3.7,125,'🌳',27],['bombu','Bombu','Bois de Bombu',70,4.1,157,'🌴',38],['maple','Érable',"Bois d'Érable",80,4.5,190,'🍁',48],['yew','If',"Bois d'If",100,5.1,265,'🌲',65],['bamboo','Bambou','Bois de Bambou',110,5.6,320,'🎋',78],['cherry','Merisier','Bois de Merisier',120,5.9,390,'🌸',92],['ebony','Ébène',"Bois d'Ébène",140,6.5,500,'🌳',124]]},
 {id:'farmer',name:'Paysan',icon:'🌾',verb:'Faucher',desc:'Récolte des céréales pour nourrir le Monde des Douze.',acts:[
  ['wheat','Blé','Blé',1,2,19,'🌾',3],['barley','Orge','Orge',20,2.5,46,'🌾',8],['oat','Avoine','Avoine',40,3,78,'🌾',15],['hop','Houblon','Houblon',60,3.5,119,'🌿',25],['flax','Lin','Lin',80,4,176,'🌱',38],['rye','Seigle','Seigle',100,4.7,255,'🌾',60],['rice','Riz','Riz',100,4.8,255,'🍚',60],['hemp','Chanvre','Chanvre',140,5.5,390,'🌱',92],['corn','Maïs','Maïs',160,6,495,'🌽',112]]},
 {id:'mining',name:'Mineur',icon:'⛏️',verb:'Extraire',desc:'Explore les filons et ramène du minerai.',acts:[
  ['iron','Fer','Fer',1,2.6,22,'🪨',5],['copper','Cuivre','Cuivre',20,3,52,'🟠',10],['bronze','Bronze','Bronze',40,3.5,90,'🪨',20],['cobalt','Kobalte','Kobalte',60,4,130,'🔷',30],['manganese','Manganèse','Manganèse',80,4.5,190,'🪨',44],['tin','Étain','Étain',100,5,265,'⚪',63],['silver','Argent','Argent',120,5.4,353,'🥈',88],['bauxite','Bauxite','Bauxite',140,6,440,'🪨',108],['gold','Or','Or',160,6.5,550,'🥇',143]]},
 {id:'fishing',name:'Pêcheur',icon:'🎣',verb:'Pêcher',desc:'Remonte des poissons dans les cours d’eau d’Amakna.',acts:[
  ['gudgeon','Goujon','Goujon',1,2.4,20,'🐟',4],['shrimp','Greuvette','Greuvette',10,2.8,31,'🦐',7],['trout','Truite','Truite',20,3.3,48,'🐟',10],['crab','Crabe Sourimi','Crabe Sourimi',30,3.7,68,'🦀',15],['catfish','Poisson-Chaton','Poisson-Chaton',40,4.2,85,'🐠',20],['breadedfish','Poisson Pané','Poisson Pané',50,4.5,109,'🐟',26],['carp',"Carpe d'Iem","Carpe d'Iem",60,4.9,139,'🐟',34],['pike','Brochet','Brochet',80,5.7,198,'🐟',51]]},
 {id:'alchemy',name:'Alchimiste',icon:'🧪',verb:'Cueillir',desc:'Trouve des plantes utiles aux potions.',acts:[
  ['nettle','Ortie','Ortie',1,2.2,19,'🌿',4],['sage','Sauge','Sauge',20,2.7,47,'🍃',9],['clover','Trèfle à 5 feuilles','Trèfle à 5 feuilles',40,3.1,85,'☘️',17],['mint','Menthe Sauvage','Menthe Sauvage',60,3.7,126,'🌱',26],['orchid','Orchidée Freyesque','Orchidée Freyesque',80,4.3,183,'🌸',43],['edelweiss','Edelweiss','Edelweiss',100,4.8,266,'🏵️',64],['ginseng','Ginseng','Ginseng',140,5.7,426,'🌿',98],['mandrake','Mandragore','Mandragore',180,6.3,640,'🌱',150]]}
];
const ACTS = {};
const ITEMS = {};
for(const skill of SKILLS) for(const row of skill.acts){
 const [id,name,item,req,time,xp,emoji,value]=row;
 ACTS[id]={id,name,item,req,time,xp,emoji,value,skill:skill.id};
 ITEMS[id]={id,name:item,emoji,value,kind:'Ressource'};
}
Object.assign(ITEMS, {
 'plume_tofu':{id:'plume_tofu',name:'Plume de Tofu',emoji:'🪶',value:12,kind:'Butin'},
 'fleur':{id:'fleur',name:'Fleur de Pissenlit Diabolique',emoji:'🌼',value:10,kind:'Butin'},
 'petale':{id:'petale',name:'Pétale de Rose Démoniaque',emoji:'🌹',value:12,kind:'Butin'},
 'feuille':{id:'feuille',name:'Feuille de Tournesol Sauvage',emoji:'🌻',value:15,kind:'Butin'},
 'etincelle':{id:'etincelle',name:'Cendres Éternelles',emoji:'🔥',value:19,kind:'Butin'},
 'laine':{id:'laine',name:'Laine de Bouftou',emoji:'🐑',value:20,kind:'Butin'},
 'os_chafer':{id:'os_chafer',name:'Os de Chafer',emoji:'🦴',value:32,kind:'Butin'},
 'gelatine':{id:'gelatine',name:'Gelée à la Menthe',emoji:'🫧',value:28,kind:'Butin'},
 'pain':{id:'pain',name:'Pain de Mie',emoji:'🥖',value:25,kind:'Consommable',heal:35},
 'potion':{id:'potion',name:'Potion de soin',emoji:'🧴',value:40,kind:'Consommable',heal:70},
 'anneau':{id:'anneau',name:'Anneau de Bouze le Clerc',emoji:'💍',value:130,kind:'Équipement',slot:'ring',hp:18,atk:2},
 'coiffe':{id:'coiffe',name:'Coiffe du Bouftou',emoji:'🧢',value:210,kind:'Équipement',slot:'head',hp:40,def:3},
 'epee':{id:'epee',name:'Épée de Boisaille',emoji:'🗡️',value:155,kind:'Équipement',slot:'weapon',atk:8},
 'cape':{id:'cape',name:'Cape Bouffante',emoji:'🧥',value:250,kind:'Équipement',slot:'cape',hp:25,def:5}
});
const RECIPES=[
 {id:'bread',name:'Pain de Mie',emoji:'🥖',desc:'Restaure 35 PV en combat.',skill:'farmer',level:1,time:3.3,xp:35,output:'pain',n:1,inputs:{wheat:5}},
 {id:'potion',name:'Potion de soin',emoji:'🧴',desc:'Restaure 70 PV en combat.',skill:'alchemy',level:1,time:3.8,xp:42,output:'potion',n:1,inputs:{nettle:5}},
 {id:'sword',name:'Épée de Boisaille',emoji:'🗡️',desc:'+8 dégâts sur les attaques.',skill:'wood',level:1,time:5,xp:65,output:'epee',n:1,inputs:{ash:12,iron:8}},
 {id:'ring',name:'Anneau de Bouze le Clerc',emoji:'💍',desc:'+2 dégâts et +18 PV.',skill:'mining',level:20,time:6,xp:90,output:'anneau',n:1,inputs:{copper:10,laine:6}},
 {id:'hat',name:'Coiffe du Bouftou',emoji:'🧢',desc:'+40 PV et +3 défense.',skill:'farmer',level:20,time:7,xp:110,output:'coiffe',n:1,inputs:{laine:16,flax:4}},
 {id:'cape',name:'Cape Bouffante',emoji:'🧥',desc:'+25 PV et +5 défense.',skill:'wood',level:20,time:7.5,xp:130,output:'cape',n:1,inputs:{laine:18,chestnut:10}}
];
const RMAP = Object.fromEntries(RECIPES.map(r=>[r.id,r]));
const TERRITORIES=[
 {name:'Incarnam · Champs',emoji:'🌾',min:1,desc:'Les premières créatures de l’île céleste.',monsters:[
  ['979','Pissenlit Miroitant','🌼',28,6,12,'fleur'],['980','Rose Vaporeuse','🌹',36,7,15,'petale'],['970','Tofu Chimérique','🐤',42,8,19,'plume_tofu'],['981','Tournesol Nébuleux','🌻',54,9,22,'feuille']]},
 {name:'Incarnam · Route des âmes',emoji:'🔥',min:3,desc:'Les feux magiques de la route des âmes.',monsters:[
  ['3271','Feu de Joie','🔥',66,10,27,'etincelle'],['3273','Feu Follet','✨',75,12,30,'etincelle'],['3272','Feu Furieux','🔥',90,13,35,'etincelle'],['3270','Feu Vif','🔥',103,14,40,'etincelle']]},
 {name:'Incarnam · Pâturages',emoji:'🐑',min:6,desc:'Les Bouftous d’Incarnam.',monsters:[
  ['973','Boufton Orageux','🐑',112,17,45,'laine'],['972','Boufton Pâlichon','🐑',120,18,47,'laine'],['984','Bouftor Éthéré','🐏',145,19,54,'laine'],['971','Bouftou Nuageux','🐏',160,20,58,'laine']]},
 {name:'Incarnam · Forêt',emoji:'🌳',min:10,desc:'Des créatures rôdent parmi les arbres.',monsters:[
  ['982','Chakrobat','🦇',175,22,66,'plume_tofu'],['4105','Ronronchon','🐱',190,23,70,'laine'],['4106','Tigrimas','🐯',220,26,82,'laine']]},
 {name:'Incarnam · Lac',emoji:'💧',min:13,desc:'Les créatures aquatiques du lac.',monsters:[
  ['4110','Grand Splatch','💦',235,29,88,'gelatine'],['4109','Petit Gloot','🫧',250,30,93,'gelatine'],['4108','Plikplok','💦',275,31,104,'gelatine']]},
 {name:'Incarnam · Cimetière',emoji:'🪦',min:17,desc:'Les Chafers montent la garde.',monsters:[
  ['4046','Chafer Débutant','💀',315,35,120,'os_chafer'],['4048','Chafer Éclaireur','💀',340,37,128,'os_chafer'],['4047','Chafer Furtif','💀',365,40,137,'os_chafer'],['4049','Chafer Piquier','💀',390,42,148,'os_chafer'],['4050','Sergent Chafer','💀',430,46,169,'os_chafer']]},
 {name:'Incarnam · Crypte de Kardorim',emoji:'🏰',min:23,desc:'Le boss de la crypte attend son adversaire.',monsters:[
  ['4051','Kardorim','👑',950,68,560,'os_chafer']]}
];
const MONSTERS = {};
for(const t of TERRITORIES) for(const [id,name,emoji,hp,atk,exp,drop] of t.monsters){MONSTERS[id]={id,name,emoji,hp,atk,exp,drop,territory:t.name,min:t.min,coins:Math.ceil(exp*.65)}}
const GROUPS=[
 {name:'PRINCIPAL',items:[['shop','🪙','Magasin'],['bank','🗃️','Banque']]},
 {name:'COMBAT',items:[['combat','⚔️','Combats'],['equipment','🛡️','Équipement'],['bestiary','📖','Bestiaire']]},
 {name:'MÉTIERS DE RÉCOLTE',items:SKILLS.map(x=>[x.id,x.icon,x.name])},
 {name:'ARTISANAT',items:[['workshop','🔨','Atelier']]},
 {name:'AVENTURIER',items:[['character','🧙','Personnage'],['achievements','🏆','Succès']]}
];
const SHOP=[
 {id:'tool',emoji:'🪓',name:'Outils de métier',info:'Réduit la durée de récolte de 7 % par amélioration.',base:175,factor:2.45,max:8},
 {id:'bank',emoji:'🗃️',name:'Extension de banque',info:'Ajoute 12 emplacements distincts à la banque.',base:125,factor:2.25,max:12},
 {id:'weapon',emoji:'⚔️',name:'Entraînement offensif',info:'Ajoute 4 dégâts en combat automatique.',base:160,factor:2.1,max:15},
 {id:'armor',emoji:'🛡️',name:'Renforcement défensif',info:'Ajoute 3 points de défense.',base:150,factor:2.1,max:12},
 {id:'fortune',emoji:'💰',name:'Bourse d’Enutrof',info:'Augmente de 10 % les kamas remportés.',base:240,factor:2.4,max:10}
];
const CLASSES=[['iop','Iop','⚔️','+20 % de dégâts en combat.'],['cra','Crâ','🏹','+12 % de chance de coup critique.'],['sacrieur','Sacrieur','🩸','+35 % de points de vie maximum.'],['eniripsa','Eniripsa','✨','+50 % de soins et récupération.']];
const ACHIEVEMENTS=[
 ['harvest','Première récolte','Ramasser une ressource.',s=>s.gathered>=1],
 ['100harvest','Travailleur acharné','Récolter 100 ressources.',s=>s.gathered>=100],
 ['firstkill','Premier combat','Vaincre un monstre.',s=>s.kills>=1],
 ['10kills','Chasseur d’Incarnam','Vaincre 10 monstres.',s=>s.kills>=10],
 ['craft','Apprenti artisan','Fabriquer un objet.',s=>s.crafted>=1],
 ['kamas','Premiers kamas','Gagner au total 1 000 kamas.',s=>s.earned>=1000],
 ['alljobs','Polyvalent','Atteindre le niveau 3 dans les cinq métiers.',s=>SKILLS.every(x=>lv(s.skills[x.id].xp)>=3)],
 ['boss','Le défi de Kardorim','Vaincre Kardorim.',s=>(s.dex['4051']||0)>=1]
];
function xpThreshold(level){return Math.round(42+17*Math.pow(level,1.62))}
function xpBetween(level){return Math.round(22+9*Math.pow(level,1.32))}
function lv(total){let xp=Math.max(0,Number(total)||0),level=1;while(level<MAX_LEVEL){const need=xpThreshold(level);if(xp<need)break;xp-=need;level++}return level}
function xpart(total){let xp=Math.max(0,Number(total)||0),level=1;while(level<MAX_LEVEL){const need=xpThreshold(level);if(xp<need)break;xp-=need;level++}return {level,xp,need:level<MAX_LEVEL?xpThreshold(level):1,percent:level>=MAX_LEVEL?100:Math.min(100,xp/xpThreshold(level)*100)}}
function mastery(total){let xp=Math.max(0,Number(total)||0),l=1;while(l<99){let need=xpBetween(l);if(xp<need)break;xp-=need;l++}return {level:l,xp,need:xpBetween(l),percent:l>=99?100:xp/xpBetween(l)*100}}
function fresh(){return {version:1,view:'wood',skills:Object.fromEntries(SKILLS.map(s=>[s.id,{xp:0}])),mastery:{},classId:'iop',playerXp:0,bank:{},kamas:150,earned:150,kills:0,gathered:0,crafted:0,upgrades:{tool:0,bank:0,weapon:0,armor:0,fortune:0},equipment:{weapon:null,head:null,ring:null,cape:null},hp:115,enemyHp:null,enemyTimer:0,target:'979',dex:{},log:['Bienvenue dans le Monde des Douze !'],action:null,lastAt:Date.now(),totalSeconds:0,offlineCount:0,selectedBank:'',unlocked:{}}}
function load(){try{const x=JSON.parse(localStorage.getItem(STORE));if(x&&x.version===1&&x.skills&&typeof x.skills==='object'){
 const s={...fresh(),...x};s.skills={...fresh().skills,...x.skills};s.mastery=x.mastery||{};s.upgrades={...fresh().upgrades,...x.upgrades};s.equipment={...fresh().equipment,...x.equipment};s.bank=x.bank||{};s.dex=x.dex||{};s.log=Array.isArray(x.log)?x.log.slice(0,12):[];if(!s.action||!['gather','craft','combat'].includes(s.action.type))s.action=null;return s;
 }}catch(e){}return fresh()}
let state=load();
let offlineReport=null, lastFrame=Date.now(),lastSave=0,lastDisplay=0,bankQuery='';
function levelOf(skill){return lv((state.skills[skill]||{xp:0}).xp)}
function combatLevel(){return lv(state.playerXp)}
function equipBonuses(){let b={atk:0,def:0,hp:0};for(const id of Object.values(state.equipment)){if(id&&ITEMS[id])for(const k of ['atk','def','hp'])b[k]+=(ITEMS[id][k]||0)}return b}
function maxHp(){const b=equipBonuses();return Math.ceil((95+combatLevel()*5+b.hp)*(state.classId==='sacrieur'?1.35:1))}
function damage(){const b=equipBonuses();return Math.ceil((7+combatLevel()*1.65+b.atk+state.upgrades.weapon*4)*(state.classId==='iop'?1.20:1))}
function defence(){return Math.floor(combatLevel()/4+state.upgrades.armor*3+equipBonuses().def)}
function attackDuration(){return Math.max(.75,1.75-state.upgrades.weapon*.045)}
function speed(act){return Math.max(.55,act.time*(1-state.upgrades.tool*.07))}
function cap(){return 36+state.upgrades.bank*12}
function occupied(){return Object.entries(state.bank).filter(([,v])=>v>0).length}
function have(id,n=1){return (state.bank[id]||0)>=n}
function canAdd(id){return have(id)||occupied()<cap()}
function add(id,n=1){if(n<=0)return true;if(!canAdd(id))return false;state.bank[id]=(state.bank[id]||0)+n;return true}
function take(id,n=1){if(!have(id,n))return false;state.bank[id]-=n;if(state.bank[id]<=0)delete state.bank[id];return true}
function xpAdd(skill,n){if(skill==='combat')state.playerXp+=n;else if(state.skills[skill])state.skills[skill].xp+=n}
function setLog(line){state.log.unshift(line);state.log=state.log.slice(0,10)}
function notify(message,warn=false){const area=$('#toastRegion');if(!area)return;const e=document.createElement('div');e.className='toast'+(warn?' warn':'');e.textContent=message;area.prepend(e);setTimeout(()=>e.remove(),3800)}
function save(){state.lastAt=Date.now();try{localStorage.setItem(STORE,JSON.stringify(state));const v=$('#miniSubtitle');if(v)v.textContent='Sauvegarde automatique active';}catch(e){notify('Impossible d’enregistrer : stockage du navigateur indisponible.',true)}}
function stop(silent=false){if(state.action){state.action=null;state.enemyTimer=0;if(!silent)notify('Activité arrêtée.')}render()}
function activeId(){return state.action?.id||null}
function chooseGather(id){const a=ACTS[id];if(!a)return;if(levelOf(a.skill)<a.req){notify(`Niveau ${a.req} de ${SKILLS.find(x=>x.id===a.skill).name} requis.`,true);return}if(state.action?.type==='gather'&&state.action.id===id){stop();return}state.action={type:'gather',id,progress:0};state.view=a.skill;notify(`Récolte lancée : ${a.name}.`);render();save()}
function canCraft(r){return Object.entries(r.inputs).every(([id,n])=>have(id,n))}
function chooseCraft(id){const r=RMAP[id];if(!r)return;if(levelOf(r.skill)<r.level){notify('Le métier associé n’a pas encore le niveau nécessaire.',true);return}if(state.action?.type==='craft'&&state.action.id===id){stop();return}if(!canCraft(r)){notify('Il manque des ressources pour cette recette.',true);return}if(!canAdd(r.output)){notify('La banque est pleine.',true);return}state.action={type:'craft',id,progress:0};state.view='workshop';notify(`Fabrication automatique : ${r.name}.`);render();save()}
function beginCombat(id){const m=MONSTERS[id];if(!m)return;if(combatLevel()<m.min){notify(`Niveau de combat ${m.min} requis pour cette zone.`,true);return}if(state.action?.type==='combat'&&state.target===id){stop();return}state.target=id;state.enemyHp=m.hp;state.enemyTimer=0;state.hp=Math.min(Math.max(1,state.hp),maxHp());state.action={type:'combat',id,progress:0};state.view='combat';setLog(`Combat lancé contre ${m.name}.`);notify(`Combat automatique : ${m.name}.`);render();save()}
function buy(id){const it=SHOP.find(x=>x.id===id);if(!it)return;const l=state.upgrades[it.id],price=Math.round(it.base*Math.pow(it.factor,l));if(l>=it.max||state.kamas<price){notify('Pas assez de kamas ou amélioration au maximum.',true);return}state.kamas-=price;state.upgrades[it.id]++;notify(`${it.name} : niveau ${state.upgrades[it.id]} !`);render();save()}
function doGather(a,count=1){if(!canAdd(a.id)){state.action=null;notify('Banque pleine ! Vends des objets ou achète des emplacements.',true);return false}add(a.id,count);state.gathered+=count;xpAdd(a.skill,a.xp*count);state.mastery[a.id]=(state.mastery[a.id]||0)+(a.xp+8)*count;return true}
function doCraft(r){if(!canCraft(r)){state.action=null;notify('Fabrication terminée : ingrédients épuisés.');return false}if(!canAdd(r.output)){state.action=null;notify('Banque pleine.',true);return false}for(const [id,n] of Object.entries(r.inputs))take(id,n);add(r.output,r.n);state.crafted++;xpAdd(r.skill,r.xp);state.mastery[r.id]=(state.mastery[r.id]||0)+r.xp;return true}
function victory(m){state.kills++;state.playerXp+=m.exp;const c=Math.ceil(m.coins*(1+state.upgrades.fortune*.10));state.kamas+=c;state.earned+=c;state.dex[m.id]=(state.dex[m.id]||0)+1;
 const dropCount=(Math.random()<.20?2:1);if(canAdd(m.drop))add(m.drop,dropCount);
 const heal=Math.floor(maxHp()*(state.classId==='eniripsa'?.25:.14));state.hp=Math.min(maxHp(),state.hp+heal);state.enemyHp=m.hp;state.enemyTimer=0;setLog(`Victoire : ${m.name} · +${m.exp} XP · +${c} kamas`);
 if(m.id==='4051')notify('Kardorim vaincu ! Succès débloqué 🏆');
}
function defeat(m){state.hp=maxHp();state.enemyHp=m.hp;state.action=null;state.enemyTimer=0;setLog(`Défaite face à ${m.name}. Tu peux réessayer sans perdre tes niveaux.`);notify('Défaite ! Le combat est arrêté. Soigne-toi puis recommence.',true)}
function critical(){return Math.random() < (0.05+(state.classId==='cra'?.12:0))}
function simulate(delta){if(!state.action||delta<=0)return false;const a=state.action;let changed=false;
 if(a.type==='gather'){
  const x=ACTS[a.id];if(!x){state.action=null;return true}
  const interval=speed(x);a.progress+=delta;let n=Math.min(20000,Math.floor(a.progress/interval));if(n>0){a.progress-=n*interval;changed=doGather(x,n)||!state.action}
 } else if(a.type==='craft'){
  const r=RMAP[a.id];if(!r){state.action=null;return true}
  a.progress+=delta;let n=Math.min(20000,Math.floor(a.progress/r.time));if(n>0){a.progress-=n*r.time;for(let i=0;i<n;i++)if(!doCraft(r))break;changed=true}
 } else if(a.type==='combat'){
  const m=MONSTERS[state.target];if(!m){state.action=null;return true}
  a.progress+=delta;state.enemyTimer+=delta;
  let attacks=Math.min(30,Math.floor(a.progress/attackDuration()));a.progress-=attacks*attackDuration();
  for(let i=0;i<attacks;i++){
   const dmg=damage()*(critical()?1.75:1);state.enemyHp=Math.max(0,(state.enemyHp??m.hp)-dmg);changed=true;
   if(state.enemyHp<=0)victory(m);
  }
  while(state.enemyTimer>=2.8&&state.action){state.enemyTimer-=2.8;const dealt=Math.max(1,m.atk-defence());state.hp=Math.max(0,state.hp-dealt);changed=true;if(state.hp<=0)defeat(m)}
 }
 return changed}
function offline(){const since=clamp((Date.now()-(Number(state.lastAt)||Date.now()))/1000,0,8*3600);if(!state.action||since<4)return;
 if(state.action.type==='combat'){offlineReport={text:'Le combat a été mis en pause pendant ton absence.'};state.action.progress=0;return}
 const before=state.gathered+state.crafted,kind=state.action.type;
 simulate(since);
 const quantity=(state.gathered+state.crafted)-before;
 if(quantity>0){state.offlineCount+=quantity;offlineReport={text:`Pendant ton absence : ${nfmt(quantity)} ${kind==='gather'?'récolte(s)':'objet(s) fabriqué(s)'} ! (maximum 8 h)`}}
}
offline();state.hp=clamp(Number(state.hp)||maxHp(),1,maxHp());
function titleFor(v){if(SKILLS.some(x=>x.id===v))return SKILLS.find(x=>x.id===v).name;return {bank:'Banque',shop:'Magasin',workshop:'Atelier',combat:'Combats',equipment:'Équipement',bestiary:'Bestiaire',character:'Personnage',achievements:'Succès'}[v]||'Bûcheron'}
function iconFor(v){if(SKILLS.some(x=>x.id===v))return SKILLS.find(x=>x.id===v).icon;return {bank:'🗃️',shop:'🪙',workshop:'🔨',combat:'⚔️',equipment:'🛡️',bestiary:'📖',character:'🧙',achievements:'🏆'}[v]||'🌳'}
function subtitleFor(v){if(SKILLS.some(x=>x.id===v))return SKILLS.find(x=>x.id===v).desc;return {bank:'Ressources, équipements et objets de l’aventurier.',shop:'Dépense tes kamas pour améliorer tes activités.',workshop:'Transforme tes récoltes en objets utiles.',combat:'Affronte les véritables créatures d’Incarnam.',equipment:'Équipe les objets fabriqués dans ton atelier.',bestiary:'Découvre les monstres du Monde des Douze.',character:'Ton héros et ses caractéristiques.',achievements:'Tes exploits dans le Monde des Douze.'}[v]||''}
function renderMenu(){const menu=$('#menu');menu.innerHTML=GROUPS.map(g=>`<div class="nav-group"><div class="nav-group-label">${g.name}</div>${g.items.map(([id,emoji,name])=>{let c=id==='bank'?`${occupied()} / ${cap()}`:id==='shop'?`🪙 ${nfmt(state.kamas)}`:SKILLS.some(s=>s.id===id)?`${levelOf(id)} / 200`:id==='combat'?`${combatLevel()} / 200`:'';return `<button class="nav-btn ${state.view===id?'active':''}" data-view="${id}"><span class="nav-emoji">${SKILLS.some(s=>s.id===id)?sprite("jobs",id,emoji,"job-icon"):emoji}</span><span class="nav-text">${name}</span>${c?`<span class="nav-level ${id==='shop'?'nav-currency':''}">${c}</span>`:''}</button>`}).join('')}</div>`).join('');}
function renderTop(){const view=state.view,sk=SKILLS.find(s=>s.id===view);let prog=sk?xpart(state.skills[sk.id].xp):xpart(state.playerXp),active=state.action;
 const activity=active?(active.type==='gather'?`Récolte de ${ACTS[active.id].name}`:active.type==='craft'?`Fabrication de ${RMAP[active.id].name}`:`Combat : ${MONSTERS[state.target].name}`):'Aucune activité en cours';
 $('#topbar').innerHTML=`<div class="skill-header ${sk?'':'non-skill'}"><div class="skill-title"><span class="skill-glyph">${sk?sprite("jobs",sk.id,sk.icon,"job-icon"):iconFor(view)}</span><div><strong>${titleFor(view)}</strong><small>${subtitleFor(view)}</small></div></div><div class="top-actions"><div class="save-time">Sauvegarde locale<b>Automatique</b></div><button class="top-btn" data-do="save">💾 Sauvegarder</button><button class="ghost-btn" data-view="character">🧙</button></div></div><div class="status-strip"><div class="status-info"><label>${sk?'Niveau du métier':'Niveau de combat'}</label><span class="pill green">${prog.level} / 200</span></div><div class="status-info"><label>XP</label><span class="pill">${nfmt(prog.xp)} / ${nfmt(prog.need)}</span><div class="xp-rail"><span style="width:${prog.percent}%"></span></div></div><div class="status-info"><label>🪙 Kamas</label><span class="pill gold">${nfmt(state.kamas)}</span></div><div class="status-info"><label>Activité</label><b class="top-activity">${esc(activity)}</b></div></div>`;
 $('#mobileMoney').textContent=`${nfmt(state.kamas)} 🪙`;
 $('#miniSubtitle').textContent=`Niveau ${combatLevel()} · ${CLASSES.find(x=>x[0]===state.classId)?.[1]||'Iop'}`;
}
function renderProgress(){const a=state.action;let icon='💤',title='Aucune activité en cours',dur=1,progress=0,reward='Choisis une activité ci-dessous pour commencer.',x='⏳';if(a){
  if(a.type==='gather'){let z=ACTS[a.id];icon=z.emoji;title=`${SKILLS.find(s=>s.id===z.skill).verb} : ${z.name}`;dur=speed(z);progress=a.progress;reward=`+${z.xp} XP · ${z.item} × 1 à chaque cycle`;x='🪓'}
  if(a.type==='craft'){let z=RMAP[a.id];icon=z.emoji;title=`Fabriquer : ${z.name}`;dur=z.time;progress=a.progress;reward=`+${z.xp} XP · ${z.name} × ${z.n} à chaque cycle`;x='🔨'}
  if(a.type==='combat'){let z=MONSTERS[a.id];icon=z.emoji;title=`Combattre : ${z.name}`;dur=attackDuration();progress=a.progress;reward=`${nfmt(damage())} dégâts par attaque · +${z.exp} XP par victoire`;x='⚔️'}
 }
 const iconImage=a?(a.type==="gather"?sprite("items",a.id,icon,"summary-art"):a.type==="craft"?sprite("items",RMAP[a.id].output,icon,"summary-art"):sprite("monsters",a.id,icon,"summary-art")):icon;
 return `<div class="wide-panel" id="activityPanel"><div class="action-progress"><span id="activeProgress" style="width:${a?100*progress/dur:0}%"></span></div><div class="action-summary"><div class="summary-left"><span class="summary-sprite">${iconImage}</span><div><b>${esc(title)}</b><div class="action-caption">${esc(reward)}</div></div></div><div class="summary-right"><span class="summary-chip">${x}<small>Action</small></span><span class="summary-chip">🏆<small>${nfmt(state.gathered+state.kills)} actions</small></span><span class="summary-chip">⏱️<small id="activeTimer">${a?`${(dur-progress).toFixed(1)} s`:'—'}</small></span>${a?'<button class="red-btn" data-do="stop">Arrêter</button>':''}</div></div></div>`
}
function renderGather(skill){const current=levelOf(skill.id);return `${renderProgress()}<div class="grid-title"><div><h2>Ressources à récolter</h2><p>Choisis une ressource : sa récolte se répète automatiquement, même si tu fermes l’onglet.</p></div><span class="smallbadge">Métier ${current} / 200</span></div><div class="activity-grid">${skill.acts.map(id=>ACTS[id[0]]).map(a=>{
 const locked=current<a.req,active=state.action?.type==='gather'&&state.action.id===a.id,m=mastery(state.mastery[a.id]||0);
 return `<button class="activity-card ${locked?'locked':''} ${active?'selected':''}" data-gather="${a.id}" ${locked?'disabled':''} title="${esc(a.name)}"><span class="action-verb">${locked?'Non disponible':skill.verb}</span><h3>${esc(a.name)}</h3>${locked?`<span class="big-symbol">${sprite("items",a.id,a.emoji,"harvest-art")}</span><div class="locked-note">Verrouillé</div><div class="locked-bar">Niveau ${a.req}</div>`:`<div class="sub">${a.xp} XP métier / ${speed(a).toFixed(2).replace('.',',')} secondes</div><span class="big-symbol">${sprite("items",a.id,a.emoji,"harvest-art")}</span><div class="card-progress"><span style="width:${active?100*state.action.progress/speed(a):0}%" data-card-progress="${a.id}"></span></div><div class="card-footer"><span class="medal">🏆</span><span class="mastery-total">${m.level}/99</span><div class="mastery-bar"><span style="width:${m.percent}%"></span></div><span class="card-quantity">×${nfmt(state.bank[a.id]||0)}</span></div>`}</button>`
 }).join('')}</div>`}
function renderBank(){let keys=Object.keys(state.bank).filter(k=>state.bank[k]>0&&ITEMS[k]);const q=bankQuery.trim().toLowerCase();if(q)keys=keys.filter(k=>ITEMS[k].name.toLowerCase().includes(q));keys.sort((a,b)=>ITEMS[a].name.localeCompare(ITEMS[b].name,'fr'));
 return `<div class="panel-heading"><div><h2>Banque d'Astrub</h2><p>Gère tes ressources, ton butin et tes créations. Les kamas ne prennent aucune place.</p></div><span class="pill gold">${occupied()} / ${cap()} emplacements</span></div><div class="stat-cards"><div class="stat-card"><small>🪙 Kamas</small><strong>${nfmt(state.kamas)}</strong></div><div class="stat-card"><small>🎒 Emplacements</small><strong>${occupied()}/${cap()}</strong></div><div class="stat-card"><small>🌿 Récoltes</small><strong>${nfmt(state.gathered)}</strong></div><div class="stat-card"><small>⚔️ Monstres vaincus</small><strong>${nfmt(state.kills)}</strong></div></div><div class="bank-tools"><input id="bankSearch" type="search" placeholder="Rechercher une ressource ou un objet…" value="${esc(bankQuery)}"><button class="secondary-btn" data-view="shop">+ Agrandir la banque</button><button class="ghost-btn" data-do="selljunk">Vendre les ressources ×10</button></div>${!keys.length?'<div class="empty-panel"><span class="empty-emoji">🗃️</span>Aucun objet à afficher. Va récolter du Frêne ou du Blé !</div>':`<div class="item-grid">${keys.map(k=>{const it=ITEMS[k];return `<div class="item-card"><span class="item-emoji">${sprite("items",k,it.emoji,"item-art")}</span><div class="item-details"><strong title="${esc(it.name)}">${esc(it.name)}</strong><small>${it.kind} · 🪙 ${it.value}/u</small><b class="item-amount">× ${nfmt(state.bank[k])}</b><div class="item-controls">${it.heal?`<button data-consume="${k}" class="sell-btn">Utiliser</button>`:''}${it.slot?`<button data-equip="${k}" class="sell-btn">Équiper</button>`:''}<button class="sell-btn" data-sell="${k}" data-count="1">Vendre 1</button><button class="sell-btn" data-sell="${k}" data-count="all">Tout</button></div></div></div>`}).join('')}</div>`}`;
}
function renderShop(){return `<div class="panel-heading"><div><h2>Le magasin d'Enutrof</h2><p>Achète des bonus permanents avec les kamas gagnés en combattant ou en vendant tes récoltes.</p></div><span class="pill gold">🪙 ${nfmt(state.kamas)}</span></div><div class="shop-grid">${SHOP.map(x=>{const lvl=state.upgrades[x.id],cost=Math.round(x.base*Math.pow(x.factor,lvl));return `<div class="shop-card"><span class="shop-icon">${x.emoji}</span><h3>${x.name}</h3><p>${x.info}</p><div class="shop-meta">Niveau ${lvl}/${x.max} · ${lvl>=x.max?'MAX':`🪙 ${nfmt(cost)}`}</div><button class="primary-btn" data-buy="${x.id}" ${lvl>=x.max||state.kamas<cost?'disabled':''}>${lvl>=x.max?'Amélioration maximale':`Acheter · ${nfmt(cost)} kamas`}</button></div>`}).join('')}</div>`}
function renderWorkshop(){return `${renderProgress()}<div class="panel-heading"><div><h2>Atelier d'artisanat</h2><p>Recettes de démonstration inspirées de DOFUS ; ingrédients et équilibrage simplifiés pour ce prototype.</p></div></div><div class="shop-grid">${RECIPES.map(r=>{const active=state.action?.type==='craft'&&state.action.id===r.id,allowed=levelOf(r.skill)>=r.level,available=canCraft(r);return `<div class="shop-card ${active?'crafting':''}"><span class="shop-icon">${sprite("items",r.output,r.emoji,"item-art")}</span><h3>${r.name}</h3><p>${r.desc}</p><div class="recipe-components">${Object.entries(r.inputs).map(([id,n])=>`<span class="${have(id,n)?'enough':'missing'}">${sprite("items",id,ITEMS[id].emoji,"recipe-art")} ${esc(ITEMS[id].name)} ${state.bank[id]||0}/${n}</span>`).join('')}</div><div class="shop-meta">${SKILLS.find(x=>x.id===r.skill).name} ${r.level} · ${r.time}s · +${r.xp} XP</div><button class="primary-btn" data-craft="${r.id}" ${!allowed||(!available&&!active)?'disabled':''}>${active?'Arrêter la fabrication':!allowed?'Métier insuffisant':available?'Fabriquer automatiquement':'Ressources manquantes'}</button></div>`}).join('')}</div>`}
function monsterVisual(m){return `<div class="creature-wrap">${sprite("monsters",m.id,m.emoji,"creature-art")}</div>`}
function renderCombat(){const m=MONSTERS[state.target]||MONSTERS['979'],running=state.action?.type==='combat';const hp=clamp(state.hp,0,maxHp()),monsterHp=clamp(state.enemyHp??m.hp,0,m.hp);
 return `<div class="battle-layout"><div class="battle-main"><div class="combat-banner"><div><strong>⚔️ Combat automatique · ${esc(m.territory)}</strong><small>${running?'Ton personnage attaque sans clic. Les monstres ripostent.':'Choisis une cible puis lance le combat.'}</small></div><span class="pill green">Niveau ${combatLevel()}</span></div><div class="hp-strip"><div class="hp-block"><header><b>❤️ Aventurier</b><b id="playerHpText">${nfmt(hp)} / ${nfmt(maxHp())} PV</b></header><div class="meter"><span id="playerHpBar" style="width:${100*hp/maxHp()}%"></span></div></div><div class="hp-block"><header><b>👹 ${esc(m.name)}</b><b id="enemyHpText">${nfmt(monsterHp)} / ${nfmt(m.hp)} PV</b></header><div class="meter enemy"><span id="enemyHpBar" style="width:${100*monsterHp/m.hp}%"></span></div></div></div><div class="monster-stage">${monsterVisual(m)}<h2>${esc(m.name)}</h2><small>+${m.exp} XP · ${m.coins} kamas · butin : ${esc(ITEMS[m.drop].name)}</small></div><div class="combat-controls"><button class="${running?'red-btn':'primary-btn'}" data-fight="${m.id}">${running?'■ Arrêter le combat':'⚔️ Combattre automatiquement'}</button><button class="secondary-btn" data-consume="pain" ${have('pain')?'':'disabled'}>${sprite("items","pain",ITEMS.pain.emoji,"recipe-art")} ${esc(ITEMS.pain.name)} ×${state.bank.pain||0} (+35 PV)</button><button class="secondary-btn" data-consume="potion" ${have('potion')?'':'disabled'}>${sprite("items","potion",ITEMS.potion.emoji,"recipe-art")} ${esc(ITEMS.potion.name)} ×${state.bank.potion||0} (+70 PV)</button></div><div class="info-box">Tes dégâts : <b>${damage()}</b> · Défense : <b>${defence()}</b> · Attaque toutes les <b>${attackDuration().toFixed(2)} s</b> · Les ennemis frappent toutes les 2,8 s. Les combats sont mis en pause hors ligne.</div><div class="combat-log"><h3>📜 Journal des combats</h3>${state.log.map(l=>`<p>• ${esc(l)}</p>`).join('')}</div></div><div class="battle-side"><div class="panel-heading"><div><h2>Bestiaire d'Incarnam</h2><p>Débloque les territoires en montant ton niveau de combat.</p></div></div>${TERRITORIES.map(z=>`<div class="zone-group"><h3>${z.emoji} ${z.name} <small>· niv. ${z.min}</small></h3><div class="mob-list">${z.monsters.map(([id,name,emoji,hp,atk,exp])=>{const locked=combatLevel()<z.min;return `<button class="mob-option ${state.target===id?'active':''}" data-target="${id}" ${locked?'disabled':''}><span class="mob-emoji">${sprite("monsters",id,emoji,"mob-art")}</span><span><b>${esc(name)}</b><small>${locked?`🔒 Niveau ${z.min}`:`❤️ ${hp} PV · ⚔️ ${atk} dégâts`}</small></span><span class="mob-meta">${state.dex[id]||0} 🏆</span></button>`}).join('')}</div></div>`).join('')}</div></div>`
}
function renderEquipment(){const b=equipBonuses();return `<div class="panel-heading"><div><h2>Équipement du personnage</h2><p>Fabrique des objets à l’Atelier puis équipe-les depuis la Banque.</p></div><button class="secondary-btn" data-view="workshop">Ouvrir l'atelier</button></div><div class="equip-grid">${[['weapon','⚔️','Arme'],['head','🧢','Coiffe'],['cape','🧥','Cape'],['ring','💍','Anneau']].map(([key,emoji,label])=>{const id=state.equipment[key],it=ITEMS[id];return `<div class="equip-slot"><span class="equip-art">${it?sprite("items",id,it.emoji,"equip-icon"):emoji}</span><b>${label}</b><strong>${it?esc(it.name):'Vide'}</strong>${it?`<button class="ghost-btn" data-unequip="${key}">Retirer</button>`:`<small>À fabriquer</small>`}</div>`}).join('')}</div><div class="stat-cards" style="margin-top:18px"><div class="stat-card"><small>⚔️ Attaque</small><strong>${damage()}</strong></div><div class="stat-card"><small>🛡️ Défense</small><strong>${defence()}</strong></div><div class="stat-card"><small>❤️ PV maximum</small><strong>${maxHp()}</strong></div><div class="stat-card"><small>✨ Bonus d'équipement</small><strong>+${b.atk} ATQ</strong></div></div>`}
function renderBestiary(){return `<div class="panel-heading"><div><h2>Bestiaire du Monde des Douze</h2><p>Les vrais noms des monstres d’Incarnam, avec le nombre de victoires sur chacun.</p></div><span class="pill gold">${Object.keys(state.dex).length} / ${Object.keys(MONSTERS).length} découverts</span></div><div class="bestiary-grid">${Object.values(MONSTERS).map(m=>`<div class="bestiary-card"><span class="mob-emoji">${sprite("monsters",m.id,m.emoji,"mob-art")}</span><div><b>${esc(m.name)}</b><small>${esc(m.territory)}</small></div><strong>${state.dex[m.id]||0} 🏆</strong></div>`).join('')}</div>`}
function renderCharacter(){let p=xpart(state.playerXp);return `<div class="panel-heading"><div><h2>Ton aventurier</h2><p>Choisis une des classes DOFUS et développe tes métiers au niveau 200.</p></div><span class="pill green">Niveau ${p.level} / 200</span></div><div class="character-hero"><div class="character-portrait">🧙‍♂️</div><div><h2>${CLASSES.find(x=>x[0]===state.classId)?.[1]} d'Incarnam</h2><div>✨ XP de combat : ${nfmt(p.xp)} / ${nfmt(p.need)}</div><div class="meter"><span style="width:${p.percent}%"></span></div><p>⚔️ ${damage()} attaque · 🛡️ ${defence()} défense · ❤️ ${maxHp()} PV</p></div></div><div class="grid-title"><div><h2>Classes</h2><p>Les bonus sont adaptés au jeu idle ; ce ne sont pas les statistiques officielles de DOFUS.</p></div></div><div class="class-grid">${CLASSES.map(([id,name,emoji,desc])=>`<button class="class-choice ${state.classId===id?'active':''}" data-class="${id}"><span>${emoji}</span><b>${name}</b><small>${desc}</small></button>`).join('')}</div><div class="grid-title" style="margin-top:24px"><h2>Maîtrise des métiers</h2></div><div class="character-grid">${SKILLS.map(s=>{let p=xpart(state.skills[s.id].xp);return `<div class="skill-row"><span class="skill-row-icon">${sprite("jobs",s.id,s.icon,"job-icon")}</span><div><b>${s.name} · Niveau ${p.level}</b><small>${nfmt(p.xp)} / ${nfmt(p.need)} XP</small><div class="progress-mini"><div><span style="width:${p.percent}%"></span></div></div></div><button class="ghost-btn" data-view="${s.id}">Ouvrir</button></div>`}).join('')}</div><div class="character-note" style="margin-top:20px">💾 <b>Sauvegarde locale :</b> ton personnage est conservé uniquement sur ce navigateur. Tu peux exporter ou importer une sauvegarde depuis les paramètres ci-dessous.</div><div class="settings-actions"><button class="secondary-btn" data-do="export">Exporter la sauvegarde (.json)</button><button class="ghost-btn" data-do="import">Importer une sauvegarde</button><button class="red-btn" data-do="reset">Nouvelle partie</button><input type="file" id="importFile" accept=".json,application/json" hidden></div>`}
function renderAchievements(){const done=ACHIEVEMENTS.filter(a=>a[3](state)).length;return `<div class="panel-heading"><div><h2>Succès de l'aventurier</h2><p>Complète les défis de progression.</p></div><span class="pill gold">${done} / ${ACHIEVEMENTS.length}</span></div><div class="achievements">${ACHIEVEMENTS.map(([id,name,desc,ok])=>`<div class="achievement ${ok(state)?'done':''}"><span>${ok(state)?'🏆':'🔒'}</span><div><b>${name}</b><small>${desc}</small></div><strong>${ok(state)?'Accompli':'À faire'}</strong></div>`).join('')}</div>`}
function renderView(){let v=state.view;const skill=SKILLS.find(s=>s.id===v);$('#view').innerHTML=skill?renderGather(skill):v==='bank'?renderBank():v==='shop'?renderShop():v==='workshop'?renderWorkshop():v==='combat'?renderCombat():v==='equipment'?renderEquipment():v==='bestiary'?renderBestiary():v==='character'?renderCharacter():renderAchievements()}
function render(){renderMenu();renderTop();renderView()}
function updateBars(){const a=state.action;if(a){let duration=a.type==='gather'?speed(ACTS[a.id]):a.type==='craft'?RMAP[a.id].time:attackDuration();let percent=clamp(a.progress/duration*100,0,100);const bar=$('#activeProgress');if(bar)bar.style.width=`${percent}%`;const timer=$('#activeTimer');if(timer)timer.textContent=`${Math.max(0,duration-a.progress).toFixed(1)} s`;const target=$(`[data-card-progress="${CSS.escape(a.id)}"]`);if(target)target.style.width=`${percent}%`}
 if(state.view==='combat'){
  const m=MONSTERS[state.target],eHp=state.enemyHp??m.hp,pHp=state.hp;
  const pText=$('#playerHpText'),eText=$('#enemyHpText'),pBar=$('#playerHpBar'),eBar=$('#enemyHpBar');
  if(pText)pText.textContent=`${nfmt(pHp)} / ${nfmt(maxHp())} PV`;if(eText)eText.textContent=`${nfmt(eHp)} / ${nfmt(m.hp)} PV`;
  if(pBar)pBar.style.width=`${100*pHp/maxHp()}%`;if(eBar)eBar.style.width=`${100*eHp/m.hp}%`;
 }
}
function sell(id,count){if(!ITEMS[id]||!have(id))return;let num=count==='all'?state.bank[id]:Math.min(Number(count)||1,state.bank[id]);take(id,num);let coins=num*ITEMS[id].value;state.kamas+=coins;state.earned+=coins;notify(`Vendu : ${ITEMS[id].name} ×${nfmt(num)} · +${nfmt(coins)} kamas`);render();save()}
function consume(id){const item=ITEMS[id];if(!item?.heal||!have(id)){notify('Tu ne possèdes pas cet objet.',true);return}if(state.hp>=maxHp()){notify('Tes points de vie sont déjà au maximum.',true);return}take(id);const heal=Math.floor(item.heal*(state.classId==='eniripsa'?1.5:1));state.hp=Math.min(maxHp(),state.hp+heal);notify(`+${heal} PV restaurés.`);render();save()}
function equip(id){const item=ITEMS[id];if(!item?.slot||!have(id))return;const slot=item.slot,old=state.equipment[slot];if(old&&!canAdd(old)){notify('Pas assez de place pour retirer l’équipement précédent.',true);return}take(id);if(old)add(old);state.equipment[slot]=id;state.hp=Math.min(maxHp(),state.hp);notify(`${item.name} équipé.`);render();save()}
function unequip(slot){if(!Object.hasOwn(state.equipment,slot)||!state.equipment[slot])return;const id=state.equipment[slot];if(!canAdd(id)){notify('Banque pleine.',true);return}add(id);state.equipment[slot]=null;state.hp=Math.min(state.hp,maxHp());render();save()}
function dialog(title,html,actions){$('#modalRoot').innerHTML=`<div class="modal-backdrop" id="modalOverlay"><div class="modal" role="dialog" aria-modal="true"><h2>${title}</h2><p>${html}</p><footer>${actions}</footer></div></div>`}
function resetPrompt(){dialog('Recommencer l’aventure ?', 'Toutes tes données de ce prototype (niveaux, kamas, banque et équipement) seront effacées. Exporte une sauvegarde avant si nécessaire.', '<button class="ghost-btn" data-do="close">Annuler</button><button class="red-btn" data-do="confirmReset">Effacer la progression</button>')}
function exportSave(){save();const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='dofus-idle-sauvegarde.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);notify('Sauvegarde exportée.')}
async function importSave(file){if(!file)return;try{if(file.size>1024*1024)throw Error('Fichier trop volumineux.');const data=JSON.parse(await file.text());if(data.version!==1||!data.skills||!data.bank||!data.upgrades||!data.equipment)throw Error('Sauvegarde invalide ou incompatible.');localStorage.setItem(STORE,JSON.stringify(data));location.reload()}catch(e){notify(`Import refusé : ${e.message}`,true)}}
document.addEventListener('click',e=>{
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.view){state.view=target.dataset.view;$('#sidebar').classList.remove('open');render();save();return}
 if(target.dataset.gather){chooseGather(target.dataset.gather);return}
 if(target.dataset.craft){chooseCraft(target.dataset.craft);return}
 if(target.dataset.buy){buy(target.dataset.buy);return}
 if(target.dataset.target){const id=target.dataset.target,m=MONSTERS[id];if(combatLevel()<m.min)return;state.target=id;state.enemyHp=m.hp;state.enemyTimer=0;if(state.action?.type==='combat')state.action=null;render();save();return}
 if(target.dataset.fight){beginCombat(target.dataset.fight);return}
 if(target.dataset.sell){sell(target.dataset.sell,target.dataset.count);return}
 if(target.dataset.consume){consume(target.dataset.consume);return}
 if(target.dataset.equip){equip(target.dataset.equip);return}
 if(target.dataset.unequip){unequip(target.dataset.unequip);return}
 if(target.dataset.class){const pre=maxHp();state.classId=target.dataset.class;state.hp=Math.min(maxHp(),state.hp+Math.max(0,maxHp()-pre));render();save();return}
 if(target.dataset.do){switch(target.dataset.do){case 'save':save();notify('Partie enregistrée.');break;case 'stop':stop();save();break;case 'selljunk':{
 let sold=0,sum=0;for(const [id,n] of Object.entries({...state.bank})){if(ITEMS[id]?.kind!=='Ressource')continue;const amount=Math.floor(n/10)*10;if(amount){take(id,amount);sum+=amount*ITEMS[id].value;sold+=amount}}
 state.kamas+=sum;state.earned+=sum;notify(sold?`${sold} ressources vendues · +${nfmt(sum)} kamas`:'Pas assez de ressources (minimum 10 par type).');render();save();break;
 }case 'export':exportSave();break;case 'import':$('#importFile')?.click();break;case 'reset':resetPrompt();break;case 'close':$('#modalRoot').innerHTML='';break;case 'confirmReset':localStorage.removeItem(STORE);location.reload();break;}}
});
document.addEventListener('change',e=>{if(e.target.id==='importFile')importSave(e.target.files[0])});
document.addEventListener('input',e=>{if(e.target.id==='bankSearch'){bankQuery=e.target.value;const pos=e.target.selectionStart;renderView();const input=$('#bankSearch');input.focus();input.setSelectionRange(pos,pos)}});
$('#menuToggle').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('#modalRoot').innerHTML='';$('#sidebar').classList.remove('open')}});
window.addEventListener('pagehide',save);
document.addEventListener('visibilitychange',()=>{if(document.hidden){save()}else{offline();state.hp=clamp(Number(state.hp)||maxHp(),1,maxHp());render();save();if(offlineReport){notify(offlineReport.text);offlineReport=null}}lastFrame=Date.now()});
render();save();
if(offlineReport)setTimeout(()=>notify(offlineReport.text),350);
setInterval(()=>{
 const now=Date.now(),dt=clamp((now-lastFrame)/1000,0,.3);lastFrame=now;
 if(!document.hidden){const changed=simulate(dt);if(changed)render();else updateBars();state.totalSeconds+=dt}
 if(now-lastDisplay>1100){lastDisplay=now;renderMenu();renderTop()}
 if(!document.hidden&&now-lastSave>3000){lastSave=now;save()}
},100);
window.DOFUS_IDLE_DEBUG={version:BUILD,getState:()=>structuredClone(state),ACTS,MONSTERS,RECIPES,lv};
})();
