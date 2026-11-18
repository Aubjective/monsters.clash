/* Monsters Clash - single authoritative environmental map engine.
   Owns ambient weather and map-sourced statuses; map data comes from stage JSON. */
(function(global){
'use strict';
const W=960,H=480,rand=(a,b)=>a+Math.random()*(b-a);
const palettes={
 leaves:['#b3e87b','#75b951','#d6d77c','#edf2a9'],
 embers:['#ffe18c','#ff9c35','#ff692e','#f7c35a'],
 snow:['#ffffff','#e5f8ff','#c0e9f8'],
 dust:['#d9c9a5','#b6a68c','#f1e3bf'],
 spores:['#a4e8a0','#72c4a8','#c9e7a5'],
 rain:['#b7def1','#8cc6d9'],
 metal:['#d7e5f2','#9aaec4','#fff1b8']
};
let stage=null,ambient=null,hazard=null,particles=[],elapsed=0,hazardIn=Infinity,gustClock=0,enabled=true,hazardsEnabled=true;
function matchesElement(unitOrMonster){
 const m=unitOrMonster?.m||unitOrMonster;
 const element=String(m?.elemental?.primary||m?.element||'neutral').toLowerCase();
 const mapElement=String(stage?.element||stage?.affinity||'neutral').toLowerCase();
 return element===mapElement;
}
function seed(initial=false){
 const k=ambient.type,up=k==='embers'||k==='spores';
 return {x:rand(-30,W+30),y:initial?rand(-20,H+20):(up?H+25:-25),size:rand(.55,1.35)*ambient.size,
 speed:rand(.7,1.3)*ambient.speed,phase:rand(0,7),rotation:rand(0,7),
 color:palettes[k][Math.floor(rand(0,palettes[k].length))]};
}
function configure(map){
 stage=map?.enabled===false?null:(map||null);
 const a=stage?.ambient;
 ambient=a?.enabled!==false&&a&&palettes[a.type]?{
   type:a.type,count:Math.max(0,Math.min(130,Math.round(Number(a.count)||0))),
   speed:Math.max(0,Math.min(250,Number(a.speed)||20)),drift:Number(a.drift)||0,
   opacity:Math.min(1,Math.max(0,Number(a.opacity)||.6)),
   size:Math.min(12,Math.max(.5,Number(a.size)||3)),
   layer:a.layer==='foreground'?'foreground':'background',
   icy_wind:a.icy_wind||null
 }:null;
 hazard=stage?.hazard?.enabled?stage.hazard:null;
 elapsed=0;gustClock=0;particles=[];
 if(ambient)for(let i=0;i<ambient.count;i++)particles.push(seed(true));
 hazardIn=hazard?Math.max(1,Number(hazard.first_trigger_seconds)||10):Infinity;
}
function status(u){
 if(!u.environmentStatus)u.environmentStatus={slowTime:0,slowPct:0,freezeTime:0,lastTick:-1};
 return u.environmentStatus;
}
function movementMultiplier(u){const s=u?.environmentStatus;return s?.freezeTime>0?0:(s?.slowTime>0?1-s.slowPct:1)}
function canAct(u){return !(u?.environmentStatus?.freezeTime>0)}
function update(dt,units,applyDamage){
 if(!stage||!enabled)return;
 dt=Math.max(0,Math.min(.06,Number(dt)||0));if(!dt)return;
 elapsed+=dt;gustClock+=dt;
 if(ambient){
   const up=ambient.type==='embers'||ambient.type==='spores';
   const gust=ambient.icy_wind?.enabled?Math.max(0,Math.sin(gustClock*Math.PI*2/(Number(ambient.icy_wind.gust_period_seconds)||8))):0;
   for(let i=0;i<particles.length;i++){
     const p=particles[i];
     p.y+=(up?-1:1)*p.speed*dt;
     p.x+=(ambient.drift+gust*12+Math.sin(elapsed*2+p.phase)*8)*dt;
     p.rotation+=dt*.5;
     if(p.y < -35||p.y > H+35||p.x < -55||p.x>W+55)particles[i]=seed(false);
   }
 }
 if(!Array.isArray(units))return;
 for(const u of units){
   if(!u||u.hp<=0)continue;
   u.environmentAge=(u.environmentAge||0)+dt;
   const s=status(u);
   s.slowTime=Math.max(0,s.slowTime-dt);
   s.freezeTime=Math.max(0,s.freezeTime-dt);
   if(s.slowTime===0)s.slowPct=0;
 }
 if(!hazardsEnabled||!hazard)return;
 hazardIn-=dt;
 if(hazardIn>0)return;
 const limits=Array.isArray(hazard.interval_seconds)?hazard.interval_seconds:[15,22];
 hazardIn=rand(Math.max(1,Number(limits[0])||15),Math.max(1,Number(limits[1])||22));
 for(const u of units){
   if(!u||u.hp<=0||matchesElement(u)||u.environmentAge<(Number(hazard.minimum_spawn_age_seconds)||0))continue;
   if(hazard.type==='chill_freeze'){
     const s=status(u);
     s.slowTime=Math.max(s.slowTime,Number(hazard.slow_duration_seconds)||3);
     s.slowPct=Math.max(s.slowPct,Math.min(.9,Math.max(0,Number(hazard.slow_pct)||.2)));
     if(Math.random()<Math.min(1,Math.max(0,Number(hazard.freeze_chance)||0)))
       s.freezeTime=Math.max(s.freezeTime,Number(hazard.freeze_duration_seconds)||.6);
   }else if(hazard.type==='instant_damage'&&typeof applyDamage==='function'){
     applyDamage(u,Math.max(0,Number(hazard.damage)||0));
   }
 }
}
function render(ctx,layer='background'){
 if(!stage||!enabled||!ambient||ambient.layer!==layer)return;
 ctx.save();ctx.globalAlpha=ambient.opacity;
 for(const p of particles){
   ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
   switch(ambient.type){
   case 'leaves':ctx.rotate(p.rotation);ctx.beginPath();ctx.ellipse(0,0,p.size*1.7,p.size*.65,0,0,Math.PI*2);ctx.fill();break;
   case 'snow':ctx.beginPath();ctx.arc(0,0,p.size*.65,0,Math.PI*2);ctx.fill();break;
   case 'embers':case 'spores':ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(0,0,p.size*.6,0,Math.PI*2);ctx.fill();break;
   case 'dust':ctx.globalAlpha*=.45;ctx.beginPath();ctx.ellipse(0,0,p.size*1.6,p.size*.65,0,0,Math.PI*2);ctx.fill();break;
   case 'rain':ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-p.size,p.size*4);ctx.stroke();break;
   case 'metal':ctx.rotate(p.rotation);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);break;
   }
   ctx.restore();
 }
 if(ambient.icy_wind?.enabled){
   const period=Math.max(2,Number(ambient.icy_wind.gust_period_seconds)||8);
   const phase=(gustClock%period)/period;
   const strength=Math.max(0,Math.sin(phase*Math.PI*2))*(Number(ambient.icy_wind.opacity)||.18);
   if(strength>.01){
     ctx.lineCap='round';ctx.lineWidth=2;ctx.strokeStyle='#e2faff';ctx.globalAlpha=strength;
     for(let i=0;i<7;i++){
       const y=85+i*48;
       const x=((elapsed*145+i*150)%1130)-120;
       ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+35,y-8,x+95,y-4);ctx.stroke();
     }
   }
 }
 ctx.restore();
}
function renderStatus(ctx,u){
 const s=u?.environmentStatus;if(!s||(s.slowTime<=0&&s.freezeTime<=0))return;
 const frozen=s.freezeTime>0, cx=u.x,cy=u.y-45;
 ctx.save();ctx.strokeStyle=frozen?'#b9f6ff':'#91d8f7';ctx.lineWidth=frozen?4:2;ctx.globalAlpha=frozen?.75:.45;
 ctx.beginPath();ctx.ellipse(cx,cy,37,42,0,0,Math.PI*2);ctx.stroke();
 if(frozen){ctx.fillStyle='#aaf3ff';for(let i=0;i<4;i++){let a=i*Math.PI/2+elapsed*.35;ctx.fillRect(cx+Math.cos(a)*30-3,cy+Math.sin(a)*33-3,6,6)}}
 ctx.restore();
}
function setEnabled(v){enabled=!!v}
function setHazardsEnabled(v){hazardsEnabled=!!v}
global.MonstersClashEnvironment=Object.freeze({configure,update,render,renderStatus,matchesElement,movementMultiplier,canAct,setEnabled,setHazardsEnabled});
})(window);
