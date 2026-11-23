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
 spray:['#c7fcff','#8eeaf2','#f2ffff'],
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
 const k=ambient.type,up=k==='embers'||k==='spores'||k==='spray';
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
 if(!u.environmentStatus)u.environmentStatus={slowTime:0,slowPct:0,freezeTime:0,lastTick:-1,source:null};
 return u.environmentStatus;
}
function movementMultiplier(u){const s=u?.environmentStatus;return s?.freezeTime>0?0:(s?.slowTime>0?1-s.slowPct:1)}
function canAct(u){return !(u?.environmentStatus?.freezeTime>0)}
function update(dt,units,applyDamage){
 if(!stage||!enabled)return;
 dt=Math.max(0,Math.min(.06,Number(dt)||0));if(!dt)return;
 elapsed+=dt;gustClock+=dt;
 if(ambient){
   const up=ambient.type==='embers'||ambient.type==='spores'||ambient.type==='spray';
   // Wind is expressed by gently varied particle motion, never by drawn lines.
   // Two overlapping smooth pulses prevent a synchronized, mechanical gust.
   const wind=ambient.icy_wind?.enabled?ambient.icy_wind:null;
   const period=Math.max(3,Number(wind?.gust_period_seconds)||8);
   const phase=gustClock/period;
   const gust=wind?Math.max(0,Math.sin(phase*Math.PI*2)*.65+Math.sin(phase*Math.PI*3.41+.8)*.35):0;
   const gustPower=wind?Math.max(0,Number(wind.gust_strength)||16):0;
   for(let i=0;i<particles.length;i++){
     const p=particles[i];
     const flutter=Math.sin(elapsed*.85+p.phase)*4+Math.sin(elapsed*1.8+p.phase*.72)*2.4;
     const drift=ambient.drift+gust*gustPower+flutter;
     p.y+=(up?-1:1)*p.speed*dt*(1+.08*Math.sin(p.phase+elapsed));
     p.x+=drift*dt*(.7+.3*Math.sin(p.phase*.5+1)**2);
     p.rotation+=dt*.35;
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
   if(s.slowTime===0){s.slowPct=0;if(s.freezeTime===0)s.source=null;}
 }
 if(!hazardsEnabled||!hazard)return;
 hazardIn-=dt;
 if(hazardIn>0)return;
 const limits=Array.isArray(hazard.interval_seconds)?hazard.interval_seconds:[15,22];
 hazardIn=rand(Math.max(1,Number(limits[0])||15),Math.max(1,Number(limits[1])||22));
 for(const u of units){
   if(!u||u.hp<=0||matchesElement(u)||u.environmentAge<(Number(hazard.minimum_spawn_age_seconds)||0))continue;
   if(hazard.type==='chill_freeze'||hazard.type==='current_slow'){
     const isCurrent=hazard.type==='current_slow';
     const s=status(u);
     s.slowTime=Math.max(s.slowTime,Number(hazard.slow_duration_seconds)||3);
     s.source=isCurrent?'water':'ice';
     s.slowPct=Math.max(s.slowPct,Math.min(.9,Math.max(0,Number(hazard.slow_pct)||.2)));
     if(!isCurrent&&Math.random()<Math.min(1,Math.max(0,Number(hazard.freeze_chance)||0)))
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
   case 'spray':ctx.globalAlpha*=.7;ctx.beginPath();ctx.ellipse(0,0,p.size*.55,p.size*.8,0,0,Math.PI*2);ctx.fill();break;
   case 'metal':ctx.rotate(p.rotation);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size);break;
   }
   ctx.restore();
 }

 ctx.restore();
}
function renderStatus(ctx,u){
 const s=u?.environmentStatus;
 if(!s||(s.slowTime<=0&&s.freezeTime<=0))return;
 const freeze=s.freezeTime>0,slow=s.slowTime>0;
 if(s.source==='water'&&slow&&!freeze){
   // Coastal-current debuff is indicated by moving wavelets around the feet,
   // never by ice crystals or an all-purpose blue status ring.
   ctx.save();ctx.strokeStyle='#9beff6';ctx.lineWidth=2;ctx.lineCap='round';
   for(let i=0;i<3;i++){
     const progress=(elapsed*.6+i/3)%1;
     const xx=u.x-30+progress*60,yy=u.y+4+(i%2)*5;
     ctx.globalAlpha=.28+.45*(1-progress);
     ctx.beginPath();ctx.moveTo(xx-9,yy);ctx.quadraticCurveTo(xx-4,yy-5,xx+1,yy);
     ctx.quadraticCurveTo(xx+6,yy+5,xx+11,yy);ctx.stroke();
   }
   ctx.restore();return;
 }
 // Recognizable ice crystals rather than a blue status/debug circle.
 const x=u.x,y=u.y-45, age=elapsed+(u.uid||0)*.33;
 ctx.save();
 if(freeze){
   // Angular translucent crystalline casing: distinct from monster shields.
   ctx.globalAlpha=.44;
   ctx.fillStyle='#85ddfa';ctx.strokeStyle='#e0fbff';ctx.lineWidth=2.4;
   ctx.beginPath();ctx.moveTo(x-27,y-36);ctx.lineTo(x-6,y-53);ctx.lineTo(x+23,y-42);
   ctx.lineTo(x+36,y-11);ctx.lineTo(x+25,y+31);ctx.lineTo(x+3,y+44);
   ctx.lineTo(x-29,y+26);ctx.lineTo(x-35,y-10);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.globalAlpha=.52;ctx.strokeStyle='#f3feff';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(x-6,y-53);ctx.lineTo(x+3,y+44);ctx.moveTo(x-35,y-10);
   ctx.lineTo(x+25,y+31);ctx.moveTo(x+23,y-42);ctx.lineTo(x-29,y+26);ctx.stroke();
 }
 if(slow||freeze){
   // A handful of tiny diamond-shaped ice chips orbit around the lower body.
   const count=freeze?8:5;
   for(let i=0;i<count;i++){
     const t=i/count*Math.PI*2+age*(i%2?-.46:.42);
     const rx=freeze?35:30,ry=freeze?36:22;
     const px=x+Math.cos(t)*rx,py=y+9+Math.sin(t)*ry;
     const chip=freeze?4.8:3.3;
     ctx.globalAlpha=freeze?.9:.63;
     ctx.fillStyle=i%2?'#dffaff':'#76d1f1';
     ctx.beginPath();ctx.moveTo(px,py-chip*1.5);ctx.lineTo(px+chip*.7,py);
     ctx.lineTo(px,py+chip*1.5);ctx.lineTo(px-chip*.7,py);ctx.closePath();ctx.fill();
   }
   // Snowflake at shoulder height: clear status indicator at small sizes.
   const fx=x,fy=y-56;
   ctx.globalAlpha=freeze?1:.82;ctx.strokeStyle='#e7fcff';ctx.lineWidth=2;
   for(let i=0;i<3;i++){
     const a=i*Math.PI/3,dx=Math.cos(a)*7,dy=Math.sin(a)*7;
     ctx.beginPath();ctx.moveTo(fx-dx,fy-dy);ctx.lineTo(fx+dx,fy+dy);ctx.stroke();
   }
 }
 ctx.restore();
}
function setEnabled(v){enabled=!!v}
function setHazardsEnabled(v){hazardsEnabled=!!v}
global.MonstersClashEnvironment=Object.freeze({configure,update,render,renderStatus,matchesElement,movementMultiplier,canAct,setEnabled,setHazardsEnabled});
})(window);
