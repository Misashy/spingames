/* SimSpin : affichage indépendant multi-roues.
   Le moteur historique reste responsable des résultats, de l'historique et des sauvegardes. */
(() => {
  'use strict';
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const art=new Map(), nodes=new Map();
  let root=null, observer=null, spinning=false, scheduled=false;
  const norm=name=>String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
  const hash=name=>{let value=2166136261;for(const ch of name)value=Math.imul(value^ch.codePointAt(0),16777619);return value>>>0;};
  const defaults=(()=>{try{return JSON.parse(document.getElementById('sg-official-categories')?.textContent||'[]');}catch(_){return [];}})();
  const sorted=defaults.map(cat=>norm(cat.name)).sort((a,b)=>hash(a)-hash(b)||(a<b?-1:a>b?1:0));
  const assigned=new Map(sorted.map((name,index)=>[name,index%3]));
  function imageFor(cat){
    const name=norm(cat.name);
    const index=assigned.get(name)??hash(name)%3;
    if(!art.has(index)){
      const img=new Image();
      img.src='../../assets/game-art/sims-wheel-0'+(index+1)+'.webp';
      img.onload=()=>{if(!spinning)repaint();};
      art.set(index,img);
    }
    return art.get(index);
  }
  function readCategories(){
    try{
      const saved=JSON.parse(localStorage.getItem('simspin.categories.v3')||'null');
      return Array.isArray(saved)?saved:(Array.isArray(saved?.categories)?saved.categories:defaults);
    }catch(_){return defaults;}
  }
  function active(list){
    return list.filter(cat=>cat?.active!==false&&Array.isArray(cat.items)&&cat.items.length);
  }
  function lines(ctx,text,maxWidth,limit){
    const words=String(text).split(/\s+/),result=[];let line='';
    for(const word of words){
      const candidate=line?line+' '+word:word;
      if(ctx.measureText(candidate).width<=maxWidth){line=candidate;continue;}
      if(line){result.push(line);line='';}
      if(ctx.measureText(word).width<=maxWidth){line=word;continue;}
      for(const ch of word){
        if(ctx.measureText(line+ch).width>maxWidth&&line){result.push(line);line='';}
        line+=ch;
      }
    }
    if(line)result.push(line);
    if(result.length<=limit)return result;
    let last=result[limit-1]||'';
    while(last&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);
    return result.slice(0,limit-1).concat(last+'…');
  }
  function draw(node,cat){
    const ctx=node.getContext('2d');if(!ctx)return;
    const items=cat.items,N=items.length,r=480,c=500,step=2*Math.PI/N;
    const img=imageFor(cat);
    ctx.clearRect(0,0,1000,1000);
    items.forEach((item,i)=>{
      const start=-Math.PI/2-step/2+i*step,angle=start+step/2;
      ctx.beginPath();ctx.moveTo(c,c);ctx.arc(c,c,r,start,start+step);ctx.closePath();
      ctx.fillStyle=/^#[0-9a-f]{6}$/i.test(cat.color||'')?cat.color:'#8052bc';ctx.fill();
      ctx.save();ctx.clip();
      if(img.complete&&img.naturalWidth){
        const scale=Math.max(2*r/img.naturalWidth,2*r/img.naturalHeight);
        const w=img.naturalWidth*scale,h=img.naturalHeight*scale;
        ctx.drawImage(img,c-w/2,c-h/2,w,h);
      }
      ctx.fillStyle=i%2?'rgba(11,6,23,.39)':'rgba(11,6,23,.31)';
      ctx.fillRect(0,0,1000,1000);ctx.restore();
      ctx.strokeStyle='rgba(245,240,255,.79)';ctx.lineWidth=N>80?1.3:2.6;ctx.stroke();
      ctx.save();ctx.translate(c,c);ctx.rotate(angle);
      const numbered=N>44,fontSize=N<=5?37:N<=10?32:N<=20?24:N<=30?19:17;
      const at=numbered?r*.77:N<=6?r*.59:r*.69;
      ctx.translate(at,0);if(Math.cos(angle)<-.025)ctx.rotate(Math.PI);
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='900 '+fontSize+'px "Fredoka",system-ui,sans-serif';
      const text=numbered?String(i+1):String(item);
      const available=N<=2?6:Math.max(1,Math.floor((2*(at-70)*Math.tan(step/2)-14)/(fontSize*1.12)));
      const maxLines=Math.max(1,Math.min(N<=10?3:2,available));
      const label=numbered?[text]:lines(ctx,text,N<=8?220:170,maxLines);
      const lh=fontSize*1.12,pad=7;
      const width=Math.max(1,...label.map(t=>ctx.measureText(t).width))+pad*2;
      ctx.fillStyle='rgba(12,8,29,.88)';ctx.fillRect(-width/2,-label.length*lh/2-pad,width,label.length*lh+pad*2);
      ctx.fillStyle='#fff';label.forEach((line,j)=>ctx.fillText(line,0,(j-(label.length-1)/2)*lh));
      ctx.restore();
    });
    ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.strokeStyle='#f1e5ff';ctx.lineWidth=13;ctx.stroke();
  }
  function repaint(){
    if(!root)return;
    const cats=active(readCategories());
    for(const cat of cats){const node=nodes.get(norm(cat.name));if(node)draw(node,cat);}
  }
  function escapeText(value){return String(value??'');}
  function render(categories){
    if(spinning)return;
    const cats=active(Array.isArray(categories)?categories:readCategories());
    if(!root)return;
    const signature=JSON.stringify(cats.map(c=>[c.name,c.icon,c.color,c.items,c.active,c.drawCount]));
    if(root.dataset.signature===signature)return;
    root.dataset.signature=signature;
    root.dataset.count=String(cats.length);
    root.replaceChildren();nodes.clear();
    for(const cat of cats){
      const card=document.createElement('section');card.className='ss-multi-card';
      const title=document.createElement('h3');title.className='ss-multi-title';title.textContent=escapeText(cat.icon)+' '+cat.name;
      const count=document.createElement('p');count.className='ss-multi-count';count.textContent=cat.items.length+' choix · '+(cat.drawCount||1)+' tirage(s)';
      const zone=document.createElement('div');zone.className='ss-multi-zone';
      const arrow=document.createElement('span');arrow.className='ss-multi-pointer';arrow.setAttribute('aria-hidden','true');
      const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1000;canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Roue '+cat.name+' avec '+cat.items.length+' choix');
      const hub=document.createElement('span');hub.className='ss-multi-hub';hub.textContent='◆';hub.setAttribute('aria-hidden','true');
      zone.append(arrow,canvas,hub);card.append(title,count,zone);root.append(card);
      nodes.set(norm(cat.name),canvas);draw(canvas,cat);
    }
    if(!cats.length){const p=document.createElement('p');p.textContent='Coche une catégorie pour afficher sa roue.';root.append(p);}
  }
  function spin(categories,results){
    render(categories);
    spinning=true;
    const byName=new Map(results.map(x=>[norm(x.name),x]));
    for(const cat of categories){
      const node=nodes.get(norm(cat.name)),items=cat.items||[];
      const hit=byName.get(norm(cat.name))?.items?.[0];
      if(!node||!items.length||!hit)continue;
      const index=Math.max(0,items.indexOf(hit));
      const target=((360-index*360/items.length)%360+360)%360;
      node.style.transition='none';node.style.transform='rotate(0deg)';
      void node.offsetWidth;
      node.style.transition=reduce.matches?'none':'transform 4.4s cubic-bezier(.12,.72,.1,1)';
      requestAnimationFrame(()=>requestAnimationFrame(()=>{node.style.transform='rotate('+(360*6+target)+'deg)';}));
    }
    setTimeout(()=>{spinning=false;render();},reduce.matches?80:4950);
  }
  function setup(){
    const area=document.querySelector('.wheel-area');
    const original=area?.querySelector('.wheel-wrap');
    if(!area||!original)return;
    root=document.createElement('div');root.className='ss-multi-wheels';
    area.append(root);
    original.style.display='none';
    const style=document.createElement('style');
    style.textContent=`
      #simspinWheelLabel{display:none!important}
      .wheel-area{width:100%!important;max-width:none!important;padding:8px 2px!important}
      .ss-multi-wheels{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:clamp(12px,1.6vw,22px);width:100%;margin:10px auto 22px}
      .ss-multi-card{min-width:0;flex:0 1 760px;max-width:760px;text-align:center}
      .ss-multi-title{margin:7px 0 2px;font:900 clamp(16px,1.5vw,22px) 'Fredoka',system-ui,sans-serif;color:#ffe67b;overflow-wrap:anywhere}
      .ss-multi-count{margin:0 0 8px;font-size:clamp(11px,.9vw,13px);color:#e7d8ff}
      .ss-multi-zone{position:relative;aspect-ratio:1;width:100%;display:grid;place-items:center;margin:0 auto 10px}
      .ss-multi-zone canvas{width:95%;height:95%;border-radius:50%;filter:drop-shadow(0 8px 15px #10031a78)}
      .ss-multi-pointer{position:absolute;z-index:4;top:-5px;left:calc(50% - 14px);border-left:14px solid transparent;border-right:14px solid transparent;border-top:32px solid white;filter:drop-shadow(0 3px 4px #0008)}
      .ss-multi-hub{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-50%);width:clamp(32px,4.8vw,68px);height:clamp(32px,4.8vw,68px);display:grid;place-items:center;color:#66e89a;font-size:clamp(20px,2.5vw,29px);background:#210b36;border:4px solid white;border-radius:15px}
      .ss-multi-wheels[data-count="2"] .ss-multi-card,.ss-multi-wheels[data-count="4"] .ss-multi-card{flex-basis:calc((100% - 22px)/2);max-width:480px}
      .ss-multi-wheels[data-count="3"] .ss-multi-card,.ss-multi-wheels[data-count="5"] .ss-multi-card{flex-basis:calc((100% - 44px)/3);max-width:350px}
      .ss-multi-wheels[data-count="6"] .ss-multi-card{flex-basis:calc((100% - 44px)/3);max-width:350px}
      @media(max-width:800px){.ss-multi-wheels[data-count="3"] .ss-multi-card,.ss-multi-wheels[data-count="5"] .ss-multi-card,.ss-multi-wheels[data-count="6"] .ss-multi-card{flex-basis:calc((100% - 14px)/2);max-width:420px}}
      @media(max-width:560px){.ss-multi-wheels .ss-multi-card{flex-basis:100%!important;max-width:440px}.ss-multi-pointer{border-left-width:11px;border-right-width:11px;border-top-width:27px;left:calc(50% - 11px)}}
    `;
    document.head.append(style);
    render();
    const list=document.getElementById('categoryList');
    if(list){
      observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;render();});});
      observer.observe(list,{childList:true,subtree:true});
    }
  }
  window.SimSpinMulti={spin};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();