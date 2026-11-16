/* Camp des Dresseurs — fan-prototype indépendant (HTML/CSS/JS sans dépendances).
   Pokémon et sprites : droits réservés à leurs ayants droit.
   Sprites locaux depuis PokeAPI/sprites, avec affichage de secours.
*/
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const WORLD_W=1680;
  let cameraX=0,cameraTarget=0;
  const RUN_KEY = 'camp-dresseurs-run-v01';
  const META_KEY = 'camp-dresseurs-meta-v01';
  const MAX_TEAM = 6;
  const SPRITE_ROOT = 'assets/sprites/';
  // Portraits GIF sur GitHub (PokeAPI), avec PNG locaux de secours.
  const POKE_IDS={bulbasaur:1,charmander:4,squirtle:7,pikachu:25,pidgey:16,oddish:43,geodude:74,vulpix:37,psyduck:54,eevee:133,gastly:92,magnemite:81,machop:66,dratini:147,rattata:19,zubat:41,ekans:23,meowth:52,poliwag:60,sandshrew:27,koffing:109,snorlax:143,onix:95,dragonite:149};
  const ANIMATED_ROOT='assets/animated/';
  const animatedSprite=key=>POKE_IDS[key]?ANIMATED_ROOT+key+'.gif':SPRITE_ROOT+key+'.png';
  const TYPE_COLOR = {Feu:'#f38b5a',Eau:'#69b9f5',Plante:'#73c987',Electrik:'#f4c859',Vol:'#a9b3ef',Roche:'#b7a184',Spectre:'#a68adb',Normal:'#aab4bc',Poison:'#b37ad0',Combat:'#df816e',Dragon:'#7d8cec'};
  const SPECIES = {
    bulbasaur:{name:'Bulbizarre',type:'Plante',emoji:'🌱',damage:17,cooldown:1.05,coins:42,energy:20,berries:20,unlock:0,starter:true},
    charmander:{name:'Salamèche',type:'Feu',emoji:'🔥',damage:20,cooldown:1.07,coins:45,energy:18,berries:15,unlock:0,starter:true},
    squirtle:{name:'Carapuce',type:'Eau',emoji:'💧',damage:15,cooldown:.86,coins:42,energy:20,berries:18,unlock:0,starter:true},
    pikachu:{name:'Pikachu',type:'Electrik',emoji:'⚡',damage:18,cooldown:.92,coins:50,energy:24,berries:18,unlock:0,starter:true},
    pidgey:{name:'Roucool',type:'Vol',emoji:'🪽',damage:11,cooldown:.78,coins:31,energy:12,berries:10,unlock:0},
    oddish:{name:'Mystherbe',type:'Plante',emoji:'🍃',damage:13,cooldown:.84,coins:36,energy:16,berries:14,unlock:0},
    geodude:{name:'Racaillou',type:'Roche',emoji:'🪨',damage:25,cooldown:1.46,coins:49,energy:27,berries:12,unlock:1},
    vulpix:{name:'Goupix',type:'Feu',emoji:'🦊',damage:19,cooldown:1.03,coins:55,energy:25,berries:18,unlock:2},
    psyduck:{name:'Psykokwak',type:'Eau',emoji:'🦆',damage:18,cooldown:1.03,coins:57,energy:29,berries:16,unlock:2},
    eevee:{name:'Évoli',type:'Normal',emoji:'🌟',damage:19,cooldown:.90,coins:65,energy:29,berries:23,unlock:3},
    gastly:{name:'Fantominus',type:'Spectre',emoji:'👻',damage:28,cooldown:1.35,coins:79,energy:34,berries:24,unlock:4},
    magnemite:{name:'Magnéti',type:'Electrik',emoji:'🧲',damage:29,cooldown:1.43,coins:86,energy:39,berries:25,unlock:5},
    machop:{name:'Machoc',type:'Combat',emoji:'🥊',damage:31,cooldown:1.40,coins:90,energy:39,berries:28,unlock:6},
    dratini:{name:'Minidraco',type:'Dragon',emoji:'🐉',damage:38,cooldown:1.58,coins:115,energy:60,berries:40,unlock:9}
  };
  const ENEMIES = {
    rattata:{name:'Rattata',type:'Normal',emoji:'🐭',hp:1,speed:62,power:1,gold:6},
    pidgey:{name:'Roucool',type:'Vol',emoji:'🪽',hp:.95,speed:65,power:1,gold:7},
    zubat:{name:'Nosferapti',type:'Poison',emoji:'🦇',hp:.85,speed:80,power:1,gold:8},
    ekans:{name:'Abo',type:'Poison',emoji:'🐍',hp:1.2,speed:55,power:1.2,gold:9},
    meowth:{name:'Miaouss',type:'Normal',emoji:'🐱',hp:1.1,speed:73,power:1.1,gold:10},
    poliwag:{name:'Ptitard',type:'Eau',emoji:'💦',hp:1.1,speed:55,power:1.1,gold:8},
    geodude:{name:'Racaillou',type:'Roche',emoji:'🪨',hp:2.2,speed:32,power:1.7,gold:11},
    oddish:{name:'Mystherbe',type:'Plante',emoji:'🍀',hp:1.4,speed:49,power:1.2,gold:9},
    gastly:{name:'Fantominus',type:'Spectre',emoji:'👻',hp:1,speed:85,power:1.4,gold:12},
    sandshrew:{name:'Sabelette',type:'Roche',emoji:'🐾',hp:1.9,speed:40,power:1.3,gold:12},
    koffing:{name:'Smogo',type:'Poison',emoji:'☁️',hp:2,speed:40,power:1.6,gold:14},
    machop:{name:'Machoc',type:'Combat',emoji:'🥊',hp:2.2,speed:45,power:1.7,gold:15},
    snorlax:{name:'Ronflex',type:'Normal',emoji:'💤',hp:10,speed:23,power:3.9,gold:45,boss:true},
    onix:{name:'Onix',type:'Roche',emoji:'🐍',hp:13,speed:25,power:4.2,gold:55,boss:true},
    dragonite:{name:'Dracolosse',type:'Dragon',emoji:'🐉',hp:15,speed:32,power:4.8,gold:70,boss:true}
  };
  const BUILDINGS = [
    {id:'orchard',name:'Jardin de Baies',emoji:'🍓',desc:'+2,4 baies / sec',cost:{coins:28,berries:16}},
    {id:'power',name:'Borne électrique',emoji:'⚡',desc:'+1,9 énergie / sec',cost:{coins:35,berries:19}},
    {id:'shop',name:'Boutique du camp',emoji:'🛍️',desc:'+1,2 Pokédollars / sec',cost:{coins:45,energy:24}},
    {id:'center',name:'Centre Pokémon',emoji:'➕',desc:'Soigne le portail (+1 PV/s)',cost:{coins:58,energy:40,berries:24}},
    {id:'dojo',name:'Dojo Pokémon',emoji:'🥊',desc:'+12 % aux dégâts de l’équipe',cost:{coins:75,energy:45,berries:36}},
    {id:'lab',name:'Atelier Poké Balls',emoji:'◓',desc:'+1 Poké Ball / 40 s',cost:{coins:68,energy:52,berries:40}}
  ];
  const UPGRADES = [
    {id:'supplies',name:'Sac d’aventurier',emoji:'🎒',desc:'+20 baies, énergie et pièces au départ'},
    {id:'bond',name:'Lien Pokémon',emoji:'💞',desc:'+12 % dégâts de l’équipe / niveau'},
    {id:'barrier',name:'Portail renforcé',emoji:'🛡️',desc:'+35 PV maximum du portail / niveau'}
  ];
  const ZONES=[
    {id:'forest',name:'Bois des Baies',emoji:'🌲',unlock:0,seconds:22,cost:{berries:18,energy:10},reward:{berries:65,coins:16},discover:['pidgey','oddish']},
    {id:'lake',name:'Lac Azur',emoji:'💧',unlock:2,seconds:35,cost:{berries:24,energy:25},reward:{energy:75,coins:35,balls:1},discover:['poliwag','psyduck']},
    {id:'cave',name:'Grotte des Échos',emoji:'💎',unlock:4,seconds:49,cost:{berries:35,energy:42},reward:{coins:120,energy:20,balls:2},discover:['geodude','gastly','dratini']}
  ];
  const SLOTS = [
    {x:125,y:314},{x:285,y:314},{x:445,y:314},
    {x:125,y:516},{x:285,y:516},{x:445,y:516}
  ];
  const TEAM_POSITIONS = [{x:606,y:420},{x:673,y:428},{x:610,y:515},{x:682,y:515},{x:736,y:471},{x:547,y:470}];
  const safeLoad = key => {try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
  const store = (key,data) => {try{localStorage.setItem(key,JSON.stringify(data))}catch{}};
  const metaDefault = () => ({best:0,badges:0,upgrades:{supplies:0,bond:0,barrier:0}});
  let meta = safeLoad(META_KEY) || metaDefault();
  if(!meta.upgrades)meta.upgrades=metaDefault().upgrades;
  for(const x of UPGRADES)meta.upgrades[x.id]=Math.max(0,Math.min(5,Number(meta.upgrades[x.id])||0));
  meta.best=Math.max(0,Number(meta.best)||0);meta.badges=Math.max(0,Number(meta.badges)||0);
  const maxHp = () => 240+meta.upgrades.barrier*35;
  const initialResources = () => ({berries:72+meta.upgrades.supplies*20,energy:65+meta.upgrades.supplies*20,coins:100+meta.upgrades.supplies*20,balls:3});
  const freshRun = () => ({starter:null,resources:initialResources(),buildings:Array(6).fill(null),buildingLevels:Array(6).fill(0),team:[],captures:[],hp:maxHp(),wave:0,waveActive:false,waveTimer:28,spawnLeft:0,spawnTimer:0,enemies:[],projectiles:[],particles:[],kills:0,caught:0,id:1,clock:0,paused:false,speed:1,night:0,over:false,expedition:null,expeditionsDone:0,ballsTimer:40});
  let game = safeLoad(RUN_KEY);
  if(!game||!Array.isArray(game.buildings)||!Array.isArray(game.team)||!game.resources||!Array.isArray(game.enemies))game=freshRun();
  Object.assign(game,{paused:false,speed:1,over:false});
  game.particles=[];game.projectiles=[];game.floaters=[];game.rings=[];
  game.captures ||= [];game.id ||= 1;game.ballsTimer ||= 40;game.clock ||= 0;
  game.night ||= 0;
  game.buildingLevels=game.buildings.map((b,i)=>b?Math.max(1,Math.min(3,Number(game.buildingLevels?.[i])||1)):0);
  if(!game.expedition||!ZONES.some(z=>z.id===game.expedition.id))game.expedition=null;
  game.expeditionsDone=Math.max(0,Number(game.expeditionsDone)||0);
  let selected=null,hovered=-1,rosterOpen=true,prevFrame=performance.now(),uiClock=0,saveClock=0,toastTimer=0;
  let shopSig='',teamSig='',rosterSig='',upgradeSig='',expeditionSig='';
  let soundOn=false,audio=null;
  const pictures=new Map();
  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const nfmt=n=>Math.max(0,Math.floor(n)).toLocaleString('fr-FR');
  const maxLevel=12;
  const xpNeed=level=>4+level*4;
  const buildingCount=id=>game.buildings.filter(v=>v===id).length;
  const buildingPower=id=>game.buildings.reduce((total,v,i)=>total+(v===id?1+.75*((game.buildingLevels[i]||1)-1):0),0);
  const buildingPrice=(id,level)=>Object.fromEntries(Object.entries(BUILDINGS.find(b=>b.id===id).cost).map(([resource,n])=>[resource,Math.ceil(n*(1+level*.7))]));
  const rates=()=>({berries:.75+buildingPower('orchard')*2.4,energy:.65+buildingPower('power')*1.9,coins:.25+buildingPower('shop')*1.2});
  const damageBonus=()=>1+meta.upgrades.bond*.12+buildingPower('dojo')*.12;
  const upgradeCost=id=>3+meta.upgrades[id]*3;
  const price=cost=>Object.entries(cost).map(([r,n])=>`${r==='berries'?'🍓':r==='energy'?'⚡':'🪙'} ${n}`).join('  ');
  const canBuy=cost=>Object.entries(cost).every(([r,n])=>(game.resources[r]||0)>=n);
  const pay=cost=>{if(!canBuy(cost))return false;for(const [r,n]of Object.entries(cost))game.resources[r]-=n;return true};
  const isRosterSpecies=key=>key in SPECIES;
  const getUnit=key=>game.team.find(u=>u.key===key);
  function printLog(s){$('logText').textContent=s;}
  function toast(s){$('toast').textContent=s;$('toast').classList.add('show');toastTimer=performance.now()+2700;}
  function ping(freq=600,duration=.075,type='sine',gain=.025){
    if(!soundOn)return;
    try{audio ||=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}
  }
  function playSprite(key){
    if(pictures.has(key))return pictures.get(key);
    const img=new Image();const value={img,loaded:false,error:false};pictures.set(key,value);
    img.onload=()=>{value.loaded=true};img.onerror=()=>{if(!value.fallback){value.fallback=true;img.src=SPRITE_ROOT+encodeURIComponent(key)+'.png'}else value.error=true};
    img.src=animatedSprite(key);return value;
  }
  function avatar(key,cls=''){
    const info=SPECIES[key]||ENEMIES[key]||{name:key,emoji:'✦'};
    return `<div class="poke-avatar ${cls}"><span class="emoji">${info.emoji}</span><img src="${animatedSprite(key)}" alt="" loading="lazy" onload="this.style.opacity=1" onerror="this.onerror=null;this.src='assets/sprites/${key}.png';"></div>`;
  }
  const friendlyTypes={Feu:['Plante'],Eau:['Feu','Roche'],Plante:['Eau','Roche'],Electrik:['Eau','Vol'],Roche:['Feu','Vol'],Spectre:['Spectre'],Combat:['Roche','Normal'],Dragon:['Dragon'],Vol:['Plante']};
  const resistantTypes={Feu:['Eau','Roche'],Eau:['Plante','Electrik'],Plante:['Feu','Vol','Poison'],Electrik:['Roche','Plante'],Roche:['Eau','Plante','Combat'],Normal:['Roche','Spectre'],Spectre:['Normal'],Combat:['Vol','Spectre'],Vol:['Electrik','Roche']};
  function typeFactor(attacker,defender){if(friendlyTypes[attacker]?.includes(defender))return 1.65;if(resistantTypes[attacker]?.includes(defender))return .68;return 1}
  function startWith(key){
    if(!(key in SPECIES)||!SPECIES[key].starter)return;
    game.starter=key;
    game.team=[{key,level:1,xp:0,cooldown:0}];
    $('startOverlay').classList.add('hidden');
    toast(`${SPECIES[key].name} rejoint ton équipe ! 💖`);
    printLog(`🌟 ${SPECIES[key].name} est ton premier compagnon. Construis ton camp et recrute un allié !`);
    persist();render(true);
  }
  function resetRun(){
    game=freshRun();selected=null;hovered=-1;
    $('startOverlay').classList.remove('hidden');$('endOverlay').classList.add('hidden');
    printLog('🌿 Nouvelle aventure : choisis ton Pokémon de départ.');
    persist();render(true);
  }
  function persist(){store(META_KEY,meta);if(!game.over){const {particles,projectiles,floaters,rings,...data}=game;store(RUN_KEY,data)}}
  function canRecruit(key){return !getUnit(key)&&game.team.length<MAX_TEAM&&(game.wave>=SPECIES[key].unlock||game.captures.includes(key));}
  function recruit(key){
    if(!game.starter||game.over||!isRosterSpecies(key))return;
    if(getUnit(key)){toast('Ce Pokémon est déjà dans ton équipe.');return}
    const p=SPECIES[key];if(!canRecruit(key)){toast(game.team.length>=MAX_TEAM?'Ton équipe est complète (6 Pokémon).':`Disponible à partir de la vague ${p.unlock+1}.`);return}
    if(!pay({coins:p.coins,energy:p.energy,berries:p.berries})){toast('Il manque des ressources pour ce recrutement.');return}
    game.team.push({key,level:1,xp:0,cooldown:rand(0,.7)});
    effect(TEAM_POSITIONS[game.team.length-1].x,TEAM_POSITIONS[game.team.length-1].y-20,TYPE_COLOR[p.type],15);
    printLog(`🎉 ${p.name} rejoint l’équipe ! (${game.team.length}/${MAX_TEAM})`);
    ping(730,.15,'triangle');persist();render(true);
  }
  function train(key){
    const u=getUnit(key);if(!u||game.over)return;
    if(u.level>=maxLevel){toast('Ce Pokémon a atteint le niveau maximal !');return}
    const cost={coins:Math.round(14+u.level*12),energy:Math.round(8+u.level*6)};
    if(!pay(cost)){toast('Pas assez de Pokédollars ou d’énergie.');return}
    u.level++;u.xp=0;effect(TEAM_POSITIONS[game.team.indexOf(u)].x,TEAM_POSITIONS[game.team.indexOf(u)].y-30,'#f8dd6c',20);
    toast(`🌟 ${SPECIES[key].name} monte au niveau ${u.level} !`);ping(900,.14,'sine');persist();render(true);
  }
  function chooseBuilding(id){
    if(!game.starter||game.over)return;
    selected=selected===id?null:id;
    toast(selected?`${BUILDINGS.find(x=>x.id===id).name} : clique une parcelle libre.`:'Placement annulé.');
    render(true);
  }
  function upgradeBuilding(slot){
    const id=game.buildings[slot];
    if(!id||game.over||!game.starter)return;
    const level=game.buildingLevels[slot]||1;
    if(level>=3){toast('Ce bâtiment est déjà au niveau maximal (3).');return}
    const cost=buildingPrice(id,level);
    if(!pay(cost)){toast('Amélioration : '+price(cost)+' nécessaires.');return}
    game.buildingLevels[slot]=level+1;
    const b=BUILDINGS.find(b=>b.id===id),pos=SLOTS[slot];
    effect(pos.x,pos.y-42,'#ffe48c',22);
    printLog('🏗️ '+b.name+' passe au niveau '+(level+1)+' ! Production renforcée.');
    toast('⬆ '+b.name+' · niveau '+(level+1)+'/3');ping(830,.16,'triangle');
    persist();render(true);
  }
  function placeBuilding(slot){
    if(!game.starter||game.over)return;
    if(game.buildings[slot]){upgradeBuilding(slot);return}
    if(!selected){toast('Sélectionne d’abord un bâtiment à gauche.');return}
    const b=BUILDINGS.find(x=>x.id===selected);if(!pay(b.cost)){toast('Il manque des ressources pour ce bâtiment.');return}
    game.buildings[slot]=selected;game.buildingLevels[slot]=1;selected=null;
    effect(SLOTS[slot].x,SLOTS[slot].y-30,'#ffe280',16);
    printLog(`🏡 Construction terminée : ${b.name} !`);ping(610,.16,'triangle');persist();render(true);
  }
  function repair(){
    if(!game.starter||game.over)return;
    if(game.hp>=maxHp()-1){toast('Le portail est déjà en parfait état.');return}
    if(!pay({coins:25,energy:15})){toast('Réparation : 25 Pokédollars et 15 énergie.');return}
    game.hp=Math.min(maxHp(),game.hp+55);effect(744,357,'#75e3a8',16);ping(580,.2);
    printLog('🛠️ Le portail est réparé : +55 PV.');persist();render(true);
  }
  function buyBall(){
    if(!game.starter||game.over)return;
    if(!pay({coins:22})){toast('Il te faut 22 Pokédollars.');return}
    game.resources.balls++;ping(700,.1);toast('◓ Tu as acheté une Poké Ball.');persist();render(true);
  }
  function upgrade(id){
    if(!game.starter||game.over||!UPGRADES.some(v=>v.id===id))return;
    if(meta.upgrades[id]>=5)return;
    const cost=upgradeCost(id);if(meta.badges<cost){toast('Pas assez d’insignes.');return}
    meta.badges-=cost;meta.upgrades[id]++;
    if(id==='barrier')game.hp+=35;
    toast(`✨ ${UPGRADES.find(v=>v.id===id).name} : niveau ${meta.upgrades[id]} !`);
    printLog('🏅 Une amélioration permanente vient d’être débloquée.');ping(870,.22,'triangle');persist();render(true);
  }
  function startExpedition(id){
    if(!game.starter||game.over||game.expedition)return;
    const zone=ZONES.find(z=>z.id===id);if(!zone)return;
    if(game.wave<zone.unlock){toast('Cette zone se débloque après la vague '+zone.unlock+'.');return}
    if(!pay(zone.cost)){toast('Ressources insuffisantes : '+price(zone.cost));return}
    game.expedition={id,remaining:zone.seconds};
    printLog('🧭 Des éclaireurs partent explorer '+zone.name+'.');
    toast(zone.emoji+' Expédition lancée : '+zone.name);
    ping(670,.13,'triangle');persist();render(true);
  }
  function finishExpedition(){
    const quest=game.expedition;if(!quest)return;
    const zone=ZONES.find(z=>z.id===quest.id);
    game.expedition=null;if(!zone)return;
    game.expeditionsDone++;
    for(const [resource,value] of Object.entries(zone.reward))game.resources[resource]=(game.resources[resource]||0)+value;
    let findText='';
    if(Math.random()<.33){
      const found=zone.discover[Math.floor(Math.random()*zone.discover.length)];
      if(isRosterSpecies(found)&&!game.captures.includes(found)&&!getUnit(found)){
        game.captures.push(found);
        findText=' · Espèce découverte : '+SPECIES[found].name+' !';
      }
    }
    effect(1030,330,'#ffe58e',24);
    printLog('🎒 Retour de '+zone.name+' : '+price(Object.fromEntries(Object.entries(zone.reward).filter(([k])=>k!=='balls')))+(zone.reward.balls?' · ◓ '+zone.reward.balls+' Poké Ball(s)':'')+findText);
    toast('🎒 Expédition réussie !'+findText);
    ping(970,.2,'triangle');persist();render(true);
  }
  function startWave(){
    if(!game.starter||game.waveActive||game.over)return;
    game.waveActive=true;game.waveTimer=0;
    const n=game.wave+1;
    game.spawnLeft=Math.round(4+n*1.45)+(n%5===0?1:0);
    game.spawnTimer=.3;
    printLog(`⚔️ Vague ${n} : des Pokémon sauvages approchent du camp !`);
    toast(`⚔️ VAGUE ${n} ! Défends le portail !`);ping(350,.3,'sawtooth');persist();render(true);
  }
  function spawn(){
    const n=game.wave+1;
    let options=['rattata','pidgey','zubat'];
    if(n>=2)options.push('ekans','meowth','poliwag');
    if(n>=3)options.push('oddish','geodude','sandshrew');
    if(n>=5)options.push('gastly','koffing','machop');
    let key=options[Math.floor(Math.random()*options.length)];
    if(n%5===0&&game.spawnLeft===1)key=n>=15?'dragonite':n>=10?'onix':'snorlax';
    const spec=ENEMIES[key],boss=Boolean(spec.boss);
    const base=24+n*8.5;
    const hp=Math.round(base*spec.hp*(boss?1.8:1));
    game.enemies.push({id:game.id++,key,x:WORLD_W+rand(16,80),y:[366,435,510][Math.floor(Math.random()*3)]+rand(-9,9),hp,maxHp:hp,attack:rand(.4,1),step:rand(0,7),speed:spec.speed*(1+Math.min(.45,n*.018)),damage:Math.round((5+n*.75)*spec.power),boss});
  }
  function effect(x,y,color,count=10){for(let i=0;i<count;i++)game.particles.push({x,y,vx:rand(-90,90),vy:rand(-110,-25),life:rand(.3,.75),max:.75,color,r:rand(2,6)})}
  function floatText(x,y,value,color='#ffffff'){game.floaters.push({x,y,value:String(value),color,life:.9,max:.9})}
  function ringEffect(x,y,color){game.rings.push({x,y,color,life:.38,max:.38})}
  function moveTeam(dt){
    const opponents=game.enemies.filter(e=>e.hp>0&&e.x<1140).sort((a,b)=>a.x-b.x);
    for(const [i,u] of game.team.entries()){
      const base=TEAM_POSITIONS[i];if(!base)continue;
      if(!Number.isFinite(u.mapX))u.mapX=base.x;
      if(!Number.isFinite(u.mapY))u.mapY=base.y;
      const near=game.waveActive?opponents[0]:null;
      const tx=near?clamp(near.x-170,base.x-42,745):base.x;
      const ty=near?clamp(near.y+12,base.y-30,base.y+30):base.y;
      const step=dt*(110+i*6);
      u.mapX+=clamp(tx-u.mapX,-step,step);
      u.mapY+=clamp(ty-u.mapY,-step,step);
    }
  }
  function experience(){
    for(const u of game.team){if(u.level>=maxLevel)continue;u.xp++;if(u.xp>=xpNeed(u.level)){u.level++;u.xp=0;const at=TEAM_POSITIONS[game.team.indexOf(u)];effect(at.x,at.y-35,'#ffdd6b',12);if(game.team[0]===u)toast(`${SPECIES[u.key].name} passe niveau ${u.level} !`)}}
  }
  function hurt(e,damage,color){
    if(e.hp<=0)return;
    e.hp-=damage;
    e.flash=.14;effect(e.x,e.y-36,color,5);
    floatText(e.x+rand(-12,12),e.y-75,Math.round(damage),color);ringEffect(e.x,e.y-36,color);
    if(e.hp<=0){
      game.kills++;game.resources.coins+=ENEMIES[e.key].gold+(game.wave+1)*2;
      experience();effect(e.x,e.y-34,'#f8e690',12);
      if(e.boss){game.resources.balls+=2;printLog(`🏆 Boss ${ENEMIES[e.key].name} vaincu ! +2 Poké Balls.`);ping(980,.35,'triangle')}
    }
  }
  function capture(){
    if(!game.starter||game.over)return;
    if(game.resources.balls<1){toast('Plus de Poké Balls ! Achète-en dans l’équipe.');return}
    if(!game.waveActive){toast('Il faut attendre l’arrivée de Pokémon sauvages.');return}
    const living=game.enemies.filter(e=>e.hp>0&&e.x<W-12);
    if(!living.length){toast('Aucun Pokémon à portée de capture.');return}
    living.sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp);
    const e=living[0];game.resources.balls--;
    const chance=clamp((e.boss?.035:.31)+(1-e.hp/e.maxHp)*.55,.05,e.boss?.24:.88);
    effect(e.x,e.y-45,'#f46d76',16);ping(730,.2);
    if(Math.random()<chance){
      e.hp=0;game.caught++;
      const name=ENEMIES[e.key].name;
      if(isRosterSpecies(e.key)&&!getUnit(e.key)&&game.team.length<MAX_TEAM){
        game.team.push({key:e.key,level:1,xp:0,cooldown:.3});
        printLog(`🎉 Capture réussie ! ${name} rejoint ton équipe !`);
      }else if(isRosterSpecies(e.key)){
        if(!game.captures.includes(e.key))game.captures.push(e.key);
        game.resources.coins+=16;
        printLog(`🎉 ${name} capturé ! +16 Pokédollars, espèce débloquée pour le recrutement.`);
      }else{
        game.resources.coins+=28;
        printLog(`🎉 ${name} capturé ! +28 Pokédollars.`);
      }
      effect(e.x,e.y-45,'#ffe58f',24);toast(`◓ Capturé ! ${name} !`);ping(1050,.22,'triangle');
    }else{
      printLog(`💨 ${ENEMIES[e.key].name} s’est échappé de la Poké Ball !`);toast('Oh non ! Le Pokémon s’est libéré !');ping(260,.12,'sawtooth');
    }
    persist();render(true);
  }
  function finishWave(){
    game.waveActive=false;game.wave++;
    game.waveTimer=24;
    meta.best=Math.max(meta.best,game.wave);
    const boss=game.wave%5===0;
    const reward=23+game.wave*8;
    game.resources.coins+=reward;
    game.resources.berries+=12+game.wave*2;
    game.hp=Math.min(maxHp(),game.hp+14);
    meta.badges+=boss?4:1;
    if(boss)game.resources.balls+=2;
    toast(`🏅 Vague ${game.wave} remportée ! +${boss?4:1} insigne${boss?'s':''}`);
    printLog(`✨ Vague ${game.wave} terminée ! +${reward} Pokédollars, +${boss?4:1} insigne${boss?'s':''}, +14 PV.`);
    ping(1000,.25,'triangle');persist();render(true);
  }
  function lose(){
    if(game.over)return;
    game.hp=0;game.over=true;meta.best=Math.max(meta.best,game.wave);
    try{localStorage.removeItem(RUN_KEY)}catch{}
    store(META_KEY,meta);
    $('endText').textContent=`Ton camp a résisté à ${game.wave} vague${game.wave===1?'':'s'}. Tu gardes tes insignes et tes améliorations permanentes pour la prochaine aventure.`;
    $('endResults').textContent=`⚔️ ${game.kills} adversaires vaincus  ·  ◓ ${game.caught} capturés  ·  🏅 ${meta.badges} insignes`;
    $('endOverlay').classList.remove('hidden');
    ping(130,.5,'sawtooth');render(true);
  }
  function update(dt){
    game.clock+=dt;
    game.night+=(Number(game.waveActive)-game.night)*Math.min(1,dt*.4);
    if(!game.starter||game.over)return;
    const ratesNow=rates();for(const r of ['berries','energy','coins'])game.resources[r]+=ratesNow[r]*dt;
    game.hp=Math.min(maxHp(),game.hp+buildingPower('center')*.85*dt);
    if(buildingCount('lab')){game.ballsTimer-=dt*buildingPower('lab');if(game.ballsTimer<=0){game.resources.balls++;game.ballsTimer+=40;}}
    for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=190*dt;p.life-=dt}
    game.particles=game.particles.filter(p=>p.life>0);
    for(const f of game.floaters){f.y-=dt*34;f.life-=dt}
    game.floaters=game.floaters.filter(f=>f.life>0);
    for(const q of game.rings)q.life-=dt;
    game.rings=game.rings.filter(q=>q.life>0);
    for(const e of game.enemies)e.flash=Math.max(0,(e.flash||0)-dt);
    moveTeam(dt);
    if(game.expedition){game.expedition.remaining-=dt;if(game.expedition.remaining<=0)finishExpedition()}
    if(!game.waveActive){game.waveTimer-=dt;if(game.waveTimer<=0)startWave();return}
    game.spawnTimer-=dt;
    if(game.spawnLeft>0&&game.spawnTimer<=0){spawn();game.spawnLeft--;game.spawnTimer=rand(.72,1.25)}
    for(const e of game.enemies){
      if(e.hp<=0)continue;
      e.step+=dt*5;
      if(e.x>760){e.x-=e.speed*dt;}
      else{e.attack-=dt;if(e.attack<=0){game.hp-=e.damage;effect(756,e.y-27,'#ff8590',6);floatText(756,e.y-70,'-'+e.damage,'#ffbac1');ringEffect(759,e.y-26,'#ff6579');e.attack=1.5;ping(210,.055,'square')}}
    }
    for(const u of game.team){
      u.cooldown-=dt;if(u.cooldown>0)continue;
      const spec=SPECIES[u.key];
      const living=game.enemies.filter(e=>e.hp>0&&e.x<1075).sort((a,b)=>a.x-b.x);
      if(!living.length)continue;
      const target=living[0];const base=TEAM_POSITIONS[game.team.indexOf(u)];
      game.projectiles.push({x:(u.mapX??base.x)+20,y:(u.mapY??base.y)-32,to:target.id,type:spec.type,damage:spec.damage*(1+(u.level-1)*.27)*damageBonus(),speed:spec.type==='Electrik'?580:spec.type==='Roche'?370:440,life:3.2,trail:[]});
      u.cooldown=spec.cooldown;
      if(Math.random()<.09)ping(490,.035,'triangle',.008);
    }
    for(const p of game.projectiles){
      p.trail||=[];p.trail.push({x:p.x,y:p.y});if(p.trail.length>7)p.trail.shift();
      p.life-=dt;const e=game.enemies.find(v=>v.id===p.to&&v.hp>0);
      if(!e){p.life=0;continue}
      const dx=e.x-p.x,dy=e.y-36-p.y,dist=Math.hypot(dx,dy);
      if(dist<=p.speed*dt+8){
        const factor=typeFactor(p.type,ENEMIES[e.key].type);
        hurt(e,p.damage*factor,TYPE_COLOR[p.type]);
        if(factor>1.2&&Math.random()<.2)toast('✨ C’est super efficace !');
        p.life=0;
      }else if(dist){p.x+=dx/dist*p.speed*dt;p.y+=dy/dist*p.speed*dt}
    }
    game.projectiles=game.projectiles.filter(p=>p.life>0);
    game.enemies=game.enemies.filter(e=>e.hp>0);
    if(game.hp<=0){lose();return}
    if(game.spawnLeft===0&&game.enemies.length===0){finishWave()}
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Interface : tous les éléments sont recréés à partir de l'état sauvegardé.
  function render(force=false){
    const r=game.resources;
    for(const id of ['berries','energy','coins','balls'])$(id).textContent=nfmt(r[id]||0);
    const production=rates();
    $('berryRate').textContent='+'+production.berries.toFixed(1)+'/s';
    $('energyRate').textContent='+'+production.energy.toFixed(1)+'/s';
    $('coinRate').textContent='+'+production.coins.toFixed(1)+'/s';
    $('badges').textContent=nfmt(meta.badges);
    $('hp').textContent=nfmt(game.hp);$('maxHp').textContent=nfmt(maxHp());
    $('hpBar').style.width=clamp(game.hp/maxHp()*100,0,100)+'%';
    $('hpBar').style.background=game.hp/maxHp()<.3?'#f04f65':'linear-gradient(90deg,#6ad4a3,#8de9b0)';
    $('mapHint').textContent=hovered>=0&&game.buildings[hovered]?(game.buildingLevels[hovered]>=3?'Niveau maximum':('Niveau '+game.buildingLevels[hovered]+'/3 · cliquer pour améliorer : '+price(buildingPrice(game.buildings[hovered],game.buildingLevels[hovered])))):selected?'🏗️ Clique sur une parcelle libre pour construire':'🏡 Clique sur un bâtiment pour l’améliorer · 1–6 pour construire';
    $('mapViewBtn').textContent=cameraTarget===0?'🧭 Voir la frontière →':'← Revenir au village';
    $('waveLabel').textContent=`VAGUE ${game.wave+1}`;
    $('worldTitle').textContent=game.waveActive?'⚔️ Le camp est attaqué !':'🌿 Le camp reprend des forces';
    $('worldSubtitle').textContent=game.waveActive?`${game.enemies.filter(e=>e.hp>0).length+game.spawnLeft} adversaires à repousser`:'Construis, recrute et prépare la prochaine vague.';
    $('expeditionStatus').textContent=game.expedition?'⏳ '+ZONES.find(z=>z.id===game.expedition.id).name+' : '+Math.max(0,Math.ceil(game.expedition.remaining))+' s':'Envoyez des éclaireurs récolter des ressources.';
    const esig=JSON.stringify([game.wave,game.expedition?.id,game.over,game.starter,ZONES.map(z=>canBuy(z.cost))]);
    if(esig!==expeditionSig){expeditionSig=esig;
      $('expeditionList').innerHTML=ZONES.map(z=>{
        const locked=game.wave<z.unlock,active=Boolean(game.expedition);
        return '<button class="expedition-button" data-expedition="'+z.id+'" '+(locked||active||!canBuy(z.cost)||!game.starter||game.over?'disabled':'')+'><span class="expedition-emoji">'+z.emoji+'</span><span class="expedition-details"><strong>'+z.name+'</strong><small>'+(locked?'🔒 Vague '+z.unlock:(active?'Expédition en cours…':z.seconds+' s · '+price(z.cost)))+'</small></span><span class="expedition-loot">🎒</span></button>';
      }).join('');
    }
    $('dayBadge').classList.toggle('night',game.waveActive);
    $('dayBadge').textContent=game.waveActive?'🌙 NUIT · COMBAT':'☀️ JOUR · PRÉPARATION';
    $('waveStatus').textContent=game.waveActive?`${game.enemies.filter(e=>e.hp>0).length+game.spawnLeft} Pokémon sauvages en approche`:`Attaque automatique dans ${Math.max(0,Math.ceil(game.waveTimer))} s`;
    $('waveBar').style.width=(game.waveActive?clamp(100-(game.enemies.filter(e=>e.hp>0).length+game.spawnLeft)/Math.max(1,Math.round(4+(game.wave+1)*1.45)+((game.wave+1)%5===0?1:0))*100,3,100):clamp((1-game.waveTimer/28)*100,0,100))+'%';
    $('waveBtn').disabled=game.waveActive||game.over||!game.starter;
    $('waveBtn').textContent=game.waveActive?'⚔️ COMBAT EN COURS':'⚔️ LANCER LA VAGUE';
    $('repairBtn').disabled=game.hp>=maxHp()-1||!canBuy({coins:25,energy:15})||game.over||!game.starter;
    $('captureBtn').disabled=!game.waveActive||r.balls<1||!game.enemies.some(e=>e.hp>0&&e.x<W-12)||game.over;
    $('captureBtn').querySelector('small').textContent=`${r.balls||0} Poké Ball${r.balls>1?'s':''}`;
    $('pauseBtn').textContent=game.paused?'▶️ Reprendre':'⏸ Pause';
    $('speedBtn').textContent=`⏩ x${game.speed}`;
    $('soundBtn').textContent=soundOn?'🔊 Son : oui':'🔈 Son : non';
    $('bestWave').textContent=meta.best;
    $('kills').textContent=nfmt(game.kills);
    $('teamCount').textContent=`${game.team.length} / ${MAX_TEAM}`;
    $('teamSummary').textContent=`🎒 ${game.team.length} Pokémon / ${MAX_TEAM} · ${game.caught} capture${game.caught>1?'s':''}`;
    $('roster').hidden=!rosterOpen;
    $('toggleRoster').innerHTML=(rosterOpen?'− Fermer le recrutement':'＋ Recruter un Pokémon')+` <span>${rosterOpen?'⌃':'⌄'}</span>`;
    if(game.starter)$('startOverlay').classList.add('hidden');
    if(game.over)$('endOverlay').classList.remove('hidden');
    if(force){shopSig='';teamSig='';rosterSig='';upgradeSig='';}
    const sig=JSON.stringify([selected,BUILDINGS.map(b=>canBuy(b.cost)),game.buildings,game.over]);
    if(sig!==shopSig){shopSig=sig;
      $('buildingShop').innerHTML=BUILDINGS.map((b,i)=>`<button class="shop-item ${selected===b.id?'is-selected':''}" data-building="${b.id}" aria-pressed="${selected===b.id}" title="Touche ${i+1}"><span class="shop-icon">${b.emoji}</span><span class="shop-description"><span class="shop-name">${b.name}</span><span class="shop-sub">${b.desc}</span><span class="shop-cost ${canBuy(b.cost)?'':'unaffordable'}">${price(b.cost)}</span></span><span class="shop-index">${i+1}</span></button>`).join('');
    }
    const teamsig=JSON.stringify([game.team.map(u=>[u.key,u.level,u.xp]),game.team.map(u=>canBuy({coins:Math.round(14+u.level*12),energy:Math.round(8+u.level*6)})),game.over]);
    if(teamsig!==teamSig){teamSig=teamsig;
      $('teamList').innerHTML=game.team.length?game.team.map(u=>{
        const p=SPECIES[u.key];const trainPrice={coins:Math.round(14+u.level*12),energy:Math.round(8+u.level*6)};
        return `<div class="pokemon-card">${avatar(u.key)}<div class="poke-info"><strong>${p.name} <span class="type-chip" style="background:${TYPE_COLOR[p.type]}30;color:#526175">${p.type}</span></strong><small>Niv. ${u.level} · ${u.level>=maxLevel?'MAX':`${u.xp}/${xpNeed(u.level)} EXP`}</small></div><button class="small-train" data-train="${u.key}" title="Entraîner ${p.name} : ${price(trainPrice)}" ${u.level>=maxLevel||!canBuy(trainPrice)||game.over?'disabled':''}>⬆ Niv.</button></div>`;
      }).join(''):'<div class="empty-team">Choisis ton premier compagnon pour commencer.</div>';
    }
    const rostersig=JSON.stringify([game.wave,game.captures,game.team.map(u=>u.key),r.coins|0,r.energy|0,r.berries|0,game.over]);
    if(rostersig!==rosterSig){rosterSig=rostersig;
      $('roster').innerHTML=`<button class="buy-ball" data-ball="1" ${!canBuy({coins:22})?'disabled':''}>◓ Acheter 1 Poké Ball <strong>🪙 22</strong></button>`+Object.entries(SPECIES).map(([key,p])=>{
        const has=getUnit(key),unlocked=game.wave>=p.unlock||game.captures.includes(key),full=game.team.length>=MAX_TEAM;
        const cost={coins:p.coins,energy:p.energy,berries:p.berries};
        return `<button class="roster-entry" data-recruit="${key}" ${has||!unlocked||full||!canBuy(cost)||game.over?'disabled':''}>${avatar(key)}<span class="poke-info"><strong>${p.name}</strong><small>${has?'Déjà dans l’équipe':unlocked?`${p.type} · ${p.damage} ATQ`:`🔒 Vague ${p.unlock+1}`}</small></span><span class="roster-cost">${price(cost)}</span></button>`;
      }).join('');
    }
    const upgradesig=JSON.stringify([meta.badges,meta.upgrades]);
    if(upgradesig!==upgradeSig){upgradeSig=upgradesig;
      $('upgrades').innerHTML=UPGRADES.map(u=>{
        const lv=meta.upgrades[u.id],cost=upgradeCost(u.id);
        return `<button class="shop-item" data-upgrade="${u.id}" ${lv>=5||cost>meta.badges||game.over?'disabled':''}><span class="shop-icon">${u.emoji}</span><span class="shop-description"><span class="shop-name">${u.name} <small>Niv. ${lv}/5</small></span><span class="shop-sub">${u.desc}</span><span class="shop-cost">🏅 ${lv>=5?'MAX':cost}</span></span></button>`;
      }).join('');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Décor dessiné directement dans Canvas, sans dépendance graphique externe.
  const fill=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
  function ellipse(x,y,rx,ry,color){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,2*Math.PI);ctx.fillStyle=color;ctx.fill()}
  function round(x,y,w,h,r,color,outline=null,lw=2){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
    if(outline){ctx.strokeStyle=outline;ctx.lineWidth=lw;ctx.stroke()}
  }
  function polygon(points,color,outline=null,lw=2){ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fillStyle=color;ctx.fill();if(outline){ctx.lineWidth=lw;ctx.strokeStyle=outline;ctx.stroke()}}
  function label(t,x,y,size=14,color='#fff',align='center',stroke=null){ctx.save();ctx.textAlign=align;ctx.font=`900 ${size}px Trebuchet MS,Segoe UI,sans-serif`;ctx.lineJoin='round';if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=4;ctx.strokeText(t,x,y)}ctx.fillStyle=color;ctx.fillText(t,x,y);ctx.restore()}
  function cloud(x,y,s=1){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ellipse(0,10,67,19,'#ffffffb9');ellipse(-36,1,27,23,'#ffffffd5');ellipse(1,-7,38,31,'#fffffff2');ellipse(35,7,30,18,'#fffffff0');ctx.restore()}
  function evergreen(x,y,s=1){
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    ellipse(0,4,35,9,'#568a6180');round(-6,-50,12,57,5,'#996b42');
    ellipse(-20,-60,34,31,'#358963');ellipse(20,-64,35,32,'#4fba7c');ellipse(-2,-85,41,37,'#50b879');
    ellipse(-12,-97,17,12,'#87d9a2');ellipse(27,-73,13,9,'#82d79a');
    ctx.restore();
  }
  function bush(x,y,s=1){ellipse(x,y,28*s,11*s,'#3c995c');ellipse(x-12*s,y-8*s,15*s,13*s,'#61bc78');ellipse(x+10*s,y-11*s,16*s,14*s,'#70cc83');}
  function drawSky(){
    const night=clamp(game.night,0,1);
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#94d6ff');grad.addColorStop(.66,'#d7f5ff');grad.addColorStop(1,'#f2e6ba');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.globalAlpha=1-night;
    ellipse(938,94,54,54,'#fff5bc');ellipse(938,94,39,39,'#ffe08a');
    cloud(((game.clock*8)%1350)-120,102,1.1);cloud(500+(game.clock*3)%300,70,.65);cloud(1070+(game.clock*3)%180,139,.8);
    ctx.restore();
    polygon([[0,280],[108,160],[197,253],[327,152],[448,266],[573,183],[699,260],[825,151],[974,263],[1076,191],[1180,265],[1180,450],[0,450]],'#a8d4b8');
    polygon([[0,319],[108,241],[222,300],[375,210],[504,322],[683,229],[814,310],[968,229],[1109,304],[1180,265],[1180,440],[0,440]],'#8bcba2');
    fill(0,324,W,H-324,'#93dc85');
    polygon([[0,367],[139,341],[264,368],[434,335],[578,361],[710,326],[936,363],[1074,322],[W,351],[W,H],[0,H]],'#77cd7b');
    // Prairie et sentier menant au portail.
    polygon([[492,387],[811,382],[W,402],[W,570],[820,520],[492,530]],'#ebc990');
    polygon([[514,394],[802,390],[W,422],[W,544],[806,505],[515,514]],'#f4dca5');
    for(let i=0;i<54;i++){
      const x=(i*157+17)%W,y=379+(i*71)%220;
      if(x>520&&x<1050&&y>402&&y<530)continue;
      ellipse(x,y,2.3,4,i%3===0?'#ffefb8':'#5bba71');
    }
    // Décor derrière les constructions.
    evergreen(40,360,.62);evergreen(563,330,.58);evergreen(1137,358,.82);
    bush(67,378,.7);bush(530,349,.75);bush(1101,380,1);
    for(let i=0;i<12;i++){
      const x=12+(i*87)%W,y=565+(i*23)%25;
      ellipse(x,y,4,5,i%3===0?'#ffd96c':'#fffbde');
    }
    ctx.save();ctx.globalAlpha=night*.72;fill(0,0,W,H,'#172650');ctx.restore();
    if(night>.07){
      ctx.save();ctx.globalAlpha=night;
      ellipse(995,78,33,33,'#fff2cc');ellipse(1007,67,32,32,'#405783');
      for(let i=0;i<32;i++){const x=(i*171+21)%W,y=(i*83+19)%216;ellipse(x,y,1+(i%3===0),1+(i%3===0),'#fff9df')}
      ctx.restore();
    }
  }
  function drawWilderness(){
    const grad=ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0,'#94d6ff');grad.addColorStop(.7,'#d7f5ff');grad.addColorStop(1,'#f2e6ba');
    ctx.fillStyle=grad;ctx.fillRect(W,0,WORLD_W-W,H);
    polygon([[W,260],[1330,175],[1490,260],[1610,166],[WORLD_W,228],[WORLD_W,430],[W,430]],'#a8d4b8');
    polygon([[W,316],[1300,245],[1430,300],[1550,225],[WORLD_W,316],[WORLD_W,438],[W,438]],'#8bcba2');
    fill(W,325,WORLD_W-W,H-325,'#93dc85');
    polygon([[W,351],[1400,327],[WORLD_W,355],[WORLD_W,H],[W,H]],'#77cd7b');
    polygon([[W,402],[WORLD_W,422],[WORLD_W,560],[W,546]],'#ebc990');
    polygon([[W,422],[WORLD_W,441],[WORLD_W,529],[W,527]],'#f4dca5');
    for(const [x,y,z] of [[1203,366,.7],[1308,352,.84],[1414,358,.75],[1631,352,.85]])evergreen(x,y,z);
    bush(1250,380,.75);bush(1352,380,.83);bush(1593,381,.76);
    ellipse(1500,365,96,34,'#477f6388');
    polygon([[1400,365],[1430,269],[1570,269],[1603,365]],'#93a3a0','#6e8587',5);
    ellipse(1500,370,53,77,'#344b63');ellipse(1500,372,33,61,'#1e344d');
    ellipse(1467,326,8,13,'#b9f5ee');ellipse(1538,334,7,11,'#92d6f3');
    label('GROTTE DES ÉCHOS',1500,261,14,'#fff8e8','center','#3c6678');
    ctx.save();ctx.globalAlpha=game.night*.68;fill(W,0,WORLD_W-W,H,'#172650');ctx.restore();
  }
  function drawFence(){
    for(let x=30;x<745;x+=26){
      round(x,380,8,40,3,'#a97d5d','#8a6049');polygon([[x-1,381],[x+4,368],[x+9,381]],'#bd9767');
    }
    round(30,387,717,7,3,'#d4a36f','#9b6f4c');round(30,406,717,7,3,'#d4a36f','#9b6f4c');
  }
  function drawGate(){
    const x=762;
    ellipse(x,453,56,17,'#355f6552');
    round(x-46,284,30,169,6,'#d5c8b3','#64777e',4);round(x+18,284,30,169,6,'#d5c8b3','#64777e',4);
    polygon([[x-57,298],[x-27,248],[x-6,298]],'#ff6d68','#bc4f51',3);
    polygon([[x+7,298],[x+35,248],[x+57,298]],'#ff6d68','#bc4f51',3);
    round(x-17,301,35,144,8,'#eee4cc','#7b8e91',4);
    round(x-21,365,43,79,19,'#927d68','#bba88b',4);
    round(x-12,379,25,65,9,'#556e76');
    ellipse(x,345,21,25,'#f76c7b');ellipse(x,345,14,17,'#fff3ef');label('✦',x,352,20,'#f76c7b');
    for(const y of [317,346,372]){round(x-42,y,17,10,4,'#fff8e9');round(x+28,y,16,10,4,'#fff8e9')}
    if(game.hp/maxHp()<.7){ctx.save();ctx.globalAlpha=.25+(1-game.hp/maxHp())*.6;round(x-23,313,4,14,1,'#bd4e52');round(x+38,335,3,18,1,'#bd4e52');ctx.restore()}
    round(x-45,244,89,10,6,'#395b72');round(x-43,246,clamp(game.hp/maxHp(),0,1)*85,6,4,game.hp/maxHp()<.3?'#f4696e':'#75dda4');
  }
  function drawBuilding(id,x,y){
    const sway=Math.sin(game.clock*1.9+x)*2;
    ellipse(x,y+2,69,17,'#477b5f60');
    // Dessin des murs, toit et accessoires variés.
    if(id==='orchard'){
      for(let i=-1;i<=1;i++){
        round(x+i*31-4,y-55,8,49,3,'#8c633e');
        ellipse(x+i*31,y-66,24,22,'#44975c');ellipse(x+i*31-8,y-75,18,15,'#6ec67c');
        for(let j=0;j<3;j++)ellipse(x+i*31-11+j*10,y-67+(j%2)*9,4,4,'#e85163');
      }
      round(x-57,y-14,114,14,4,'#be8e55','#8a653c',2);label('BAIES',x,y-19,12,'#fff7ea','center','#6e604a');
    }else if(id==='power'){
      round(x-49,y-49,97,49,12,'#fff6e9','#6d91a2',4);
      round(x-54,y-60,107,17,8,'#f3d264','#c9983c',3);
      for(let i=-1;i<=1;i++){round(x+i*27-8,y-35,17,32,5,'#8fcde8','#5e9db9',2);ellipse(x+i*27,y-41+sway,8,4,'#b3ecfb')}
      label('⚡',x,y-15,29,'#f3b927');
    }else if(id==='shop'){
      round(x-53,y-65,106,65,10,'#f5eddc','#c79e68',4);
      polygon([[x-63,y-59],[x+60,y-59],[x+47,y-96],[x-46,y-96]],'#ff8e78','#b76c5b',3);
      for(let i=0;i<5;i++)fill(x-47+i*23,y-59,12,13,i%2?'#fff4e9':'#e4676c');
      round(x-26,y-32,49,33,7,'#a3d6e7','#6bafbb',3);label('🪙',x+2,y-38,20);
    }else if(id==='center'){
      round(x-54,y-73,108,73,11,'#fff7ed','#9aa5b6',4);
      polygon([[x-64,y-71],[x+63,y-71],[x+50,y-103],[x-49,y-103]],'#f67476','#bd5961',3);
      round(x-19,y-58,38,30,12,'#fffef7','#bfc9cd',2);label('+',x,y-33,36,'#ed6172');
      round(x-17,y-27,33,27,8,'#9ed5e9','#79adbd',3);
    }else if(id==='dojo'){
      round(x-54,y-66,108,66,6,'#d3a06b','#95673f',4);
      polygon([[x-66,y-62],[x,y-106],[x+66,y-62]],'#d8654e','#9a483e',4);
      polygon([[x-66,y-62],[x,y-90],[x+66,y-62]],'#f58b60');
      round(x-20,y-48,40,48,5,'#664f48');label('🥊',x,y-15,25);
    }else if(id==='lab'){
      round(x-55,y-71,110,71,12,'#f4fbff','#7ca3c6',4);
      round(x-61,y-87,122,20,8,'#84b1dc','#578abf',3);
      round(x-16,y-58,32,48,9,'#a0dce8','#6ba9b6',3);
      ellipse(x,y-51,12,12,'#ff6d7a');ellipse(x,y-51,6,6,'#fff');
      label('◓',x+40,y-43,26,'#f26d7f');
    }
    if(id!=='orchard'){
      ellipse(x-31,y-8,7,4,'#e4ca89');ellipse(x+29,y-7,6,3,'#d4b47a');
    }
  }
  function drawPlots(){
    for(let i=0;i<SLOTS.length;i++){
      const s=SLOTS[i],occupied=game.buildings[i],over=hovered===i;
      ellipse(s.x,s.y+4,68,19,'#63aa6b70');
      if(occupied){if(over){round(s.x-69,s.y-125,138,139,19,'#ffffff26','#fffdd2',3)}drawBuilding(occupied,s.x,s.y);
         round(s.x+24,s.y-121,46,24,10,'#fffbea','#e7b765');label('NV.'+(game.buildingLevels[i]||1),s.x+47,s.y-105,12,'#855a38');}
      else{
        round(s.x-65,s.y-106,130,110,19,over?'#fff1b86c':'#e6f6d337',over?'#ffe17a':'#dceabd',over?4:2);
        ctx.save();ctx.setLineDash([8,6]);ctx.strokeStyle=over?'#f7bd4c':'#8acb99';ctx.lineWidth=2;ctx.strokeRect(s.x-55,s.y-93,110,87);ctx.restore();
        ellipse(s.x,s.y-50,21,21,over?'#ffe5a6':'#ffffffd7');label('+',s.x,s.y-39,31,over?'#d18c20':'#77b9ac');
      }
    }
  }
  function pokemonOnMap(key,x,y,opts={}){
    const info=SPECIES[key]||ENEMIES[key];if(!info)return;
    const size=opts.boss?126:opts.enemy?79:91;
    const bob=Math.sin(game.clock*4+(opts.shift||0))*3;
    if(opts.flash){ctx.save();ctx.shadowColor='#ffffff';ctx.shadowBlur=30;ellipse(x,y-size/2,opts.boss?65:42,opts.boss?60:40,'#ffffff70');ctx.restore()}
    ellipse(x,y+5,opts.boss?48:32,opts.boss?13:9,'#2d565c58');
    const sprite=playSprite(key);
    ellipse(x,y-37,opts.boss?54:36,opts.boss?55:36,(TYPE_COLOR[info.type]||'#b7c0d0')+'49');
    if(sprite.loaded&&sprite.img.naturalWidth){
      ctx.save();ctx.imageSmoothingEnabled=false;
      ctx.drawImage(sprite.img,x-size/2,y-size+bob,size,size);
      ctx.restore();
    }else{
      ellipse(x,y-37+bob,opts.boss?44:30,opts.boss?45:30,TYPE_COLOR[info.type]||'#a3b7bc');
      label(info.emoji,x,y-22+bob,opts.boss?42:31,'#fff');
    }
    label(info.name,x,y-size-5+bob,opts.boss?17:13,'#fff','center','#47636d');
    if(opts.enemy&&opts.hp!=null){
      round(x-(opts.boss?45:29),y-size-20+bob,opts.boss?90:58,6,5,'#4c6573');
      round(x-(opts.boss?43:27),y-size-18+bob,clamp(opts.hp/opts.maxHp,0,1)*(opts.boss?86:54),3,2,opts.boss?'#f3ba75':'#83e5a3');
    }
  }
  function drawBattle(){
    drawGate();
    for(const [i,u]of game.team.entries()){
      const base=TEAM_POSITIONS[i],x=u.mapX??base.x,y=u.mapY??base.y;
      pokemonOnMap(u.key,x,y,{shift:i*.89});
      round(x-19,y+5,38,16,7,'#ffffffd9','#b7d7d6',1);
      label('Lv '+u.level,x,y+17,10,'#4a718a');
    }
    const enemySorted=[...game.enemies].filter(e=>e.hp>0).sort((a,b)=>a.y-b.y);
    for(const e of enemySorted)pokemonOnMap(e.key,e.x,e.y+Math.sin(e.step)*2,{enemy:true,hp:e.hp,maxHp:e.maxHp,boss:e.boss,shift:e.step,flash:e.flash});
    for(const p of game.projectiles){
      const col=TYPE_COLOR[p.type]||'#a9c7df';
      ctx.save();ctx.shadowColor=col;ctx.shadowBlur=21;
      for(const [i,t] of (p.trail||[]).entries()){ctx.globalAlpha=(i+1)/(p.trail.length+2)*.6;ellipse(t.x,t.y,3+i*.7,3+i*.7,col)}
      ctx.globalAlpha=1;
      ellipse(p.x,p.y,p.type==='Feu'?14:10,p.type==='Electrik'?6:10,col);ellipse(p.x,p.y,4,4,'#fffde6');ctx.restore();
    }
    for(const p of game.particles){
      ctx.save();ctx.globalAlpha=clamp(p.life/p.max,0,1);ellipse(p.x,p.y,p.r,p.r,p.color);ctx.restore();
    }
    for(const q of game.rings){
      ctx.save();ctx.strokeStyle=q.color;ctx.lineWidth=3;ctx.globalAlpha=q.life/q.max;
      ctx.beginPath();ctx.arc(q.x,q.y,8+(1-q.life/q.max)*40,0,Math.PI*2);ctx.stroke();ctx.restore();
    }
    for(const f of game.floaters){ctx.save();ctx.globalAlpha=f.life/f.max;label(f.value,f.x,f.y,18,f.color,'center','#284f64');ctx.restore()}
  }
  function drawScene(){
    ctx.clearRect(0,0,W,H);
    ctx.save();ctx.translate(-cameraX,0);drawSky();drawWilderness();drawFence();drawPlots();drawBattle();ctx.restore();
    if(!game.starter||game.paused){
      fill(0,0,W,H,'#2c455c74');
      round(W/2-199,H/2-50,398,91,24,'#fff9efed','#ffffff',3);
      label(game.paused?'⏸ PAUSE':'✦ CHOISIS TON COMPAGNON',W/2,H/2-4,23,'#354c60');
      label(game.paused?'Appuie sur Espace pour reprendre':'La nouvelle aventure commence ici',W/2,H/2+21,13,'#7890a0');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Événements et synchronisation de la sauvegarde.
  function buildStarters(){
    $('starters').innerHTML=Object.entries(SPECIES).filter(([,v])=>v.starter).map(([key,v])=>`<button class="starter-option" data-starter="${key}">${avatar(key,'starter-avatar')}<strong>${v.name}</strong><small>${v.emoji} Type ${v.type}</small></button>`).join('');
  }
  function slotAt(x,y){return SLOTS.findIndex(s=>x>=s.x-68&&x<=s.x+68&&y>=s.y-128&&y<=s.y+15)}
  function eventSlot(ev){const r=canvas.getBoundingClientRect();return slotAt((ev.clientX-r.left)/r.width*W+cameraX,(ev.clientY-r.top)/r.height*H)}
  $('expeditionList').addEventListener('click',ev=>{const el=ev.target.closest('[data-expedition]');if(el)startExpedition(el.dataset.expedition)});
  $('starters').addEventListener('click',ev=>{const el=ev.target.closest('[data-starter]');if(el)startWith(el.dataset.starter)});
  $('buildingShop').addEventListener('click',ev=>{const el=ev.target.closest('[data-building]');if(el)chooseBuilding(el.dataset.building)});
  $('teamList').addEventListener('click',ev=>{const el=ev.target.closest('[data-train]');if(el)train(el.dataset.train)});
  $('roster').addEventListener('click',ev=>{
    const ball=ev.target.closest('[data-ball]');if(ball)buyBall();
    const el=ev.target.closest('[data-recruit]');if(el)recruit(el.dataset.recruit);
  });
  $('upgrades').addEventListener('click',ev=>{const el=ev.target.closest('[data-upgrade]');if(el)upgrade(el.dataset.upgrade)});
  $('toggleRoster').addEventListener('click',()=>{rosterOpen=!rosterOpen;render(true)});
  $('mapViewBtn').addEventListener('click',()=>{cameraTarget=cameraTarget===0?WORLD_W-W:0;render(true)});
  $('waveBtn').addEventListener('click',startWave);
  $('captureBtn').addEventListener('click',capture);
  $('repairBtn').addEventListener('click',repair);
  $('pauseBtn').addEventListener('click',()=>{game.paused=!game.paused;render(true)});
  $('speedBtn').addEventListener('click',()=>{game.speed=game.speed===1?2:game.speed===2?3:1;render(true)});
  $('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;render(true);ping(620,.11)});
  $('resetBtn').addEventListener('click',()=>{if(confirm('Commencer une nouvelle partie ? Les insignes et talents permanents seront conservés.'))resetRun()});
  $('replayBtn').addEventListener('click',resetRun);
  canvas.addEventListener('mousemove',ev=>{hovered=eventSlot(ev)});
  canvas.addEventListener('mouseleave',()=>{hovered=-1});
  canvas.addEventListener('click',ev=>{const i=eventSlot(ev);if(i>=0)placeBuilding(i);else if(selected)toast('Choisis une parcelle libre dans le village.')});
  window.addEventListener('keydown',ev=>{
    if(ev.repeat||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(ev.code==='Space'&&!['BUTTON'].includes(document.activeElement?.tagName)){ev.preventDefault();game.paused=!game.paused;render(true)}
    if(ev.key.toLowerCase()==='x'){game.speed=game.speed===1?2:game.speed===2?3:1;render(true)}
    if(ev.key.toLowerCase()==='r')repair();
    if(ev.key.toLowerCase()==='c')capture();
    if(ev.key.toLowerCase()==='d'||ev.key==='ArrowRight'){cameraTarget=WORLD_W-W;render(true)}
    if(ev.key.toLowerCase()==='a'||ev.key==='ArrowLeft'){cameraTarget=0;render(true)}
    if(ev.key==='Escape'){selected=null;render(true)}
    const i=Number(ev.key)-1;if(Number.isInteger(i)&&i>=0&&i<BUILDINGS.length)chooseBuilding(BUILDINGS[i].id);
  });
  window.addEventListener('beforeunload',persist);
  let overlayWasHidden=false;
  if(game.starter){$('startOverlay').classList.add('hidden');overlayWasHidden=true}
  buildStarters();render(true);
  if(overlayWasHidden)printLog(`🌿 Partie retrouvée ! Ton équipe de ${game.team.length} Pokémon est prête.`);
  function loop(now){
    const dt=Math.min(.065,Math.max(0,(now-prevFrame)/1000));prevFrame=now;
    if(!game.paused&&!game.over)update(dt*game.speed);
    cameraX+=(cameraTarget-cameraX)*Math.min(1,dt*5);
    drawScene();uiClock+=dt;saveClock+=dt;
    if(uiClock>.36){render();uiClock=0}
    if(saveClock>4){persist();saveClock=0}
    if(toastTimer&&now>toastTimer){$('toast').classList.remove('show');toastTimer=0}
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();