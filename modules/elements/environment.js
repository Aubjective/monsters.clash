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
let stage=null,ambient=null,hazard=null,particles=[],hazardZones=[],elapsed=0,hazardIn=Infinity,gustClock=0,heavyRainTime=0,enabled=true,hazardsEnabled=true;
function matchesElement(unitOrMonster){
 const m=unitOrMonster?.m||unitOrMonster;
 const element=String(m?.elemental?.primary||m?.element||'neutral').toLowerCase();
 const mapElement=String(stage?.element||stage?.affinity||'neutral').toLowerCase();
 return element===mapElement;
}
function seed(initial=false){
 const k=ambient.type,up=k==='embers'||k==='spores';
 if(k==='dust'&&ambient.sand_wind?.enabled){
   const near=Math.random()<.72;
   return {x:initial?rand(-30,W+30):rand(-65,-8),y:near?rand(275,465):rand(110,290),size:rand(.45,1.1)*ambient.size,speed:rand(.55,1.45)*ambient.speed,phase:rand(0,7),rotation:rand(0,7),near,color:palettes.dust[Math.floor(rand(0,palettes.dust.length))]};
 }
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
   heavy_count:Math.max(0,Math.min(140,Math.round(Number(a.heavy_count)||Number(a.count)||0))),
   ground_splashes:!!a.ground_splashes,
   icy_wind:a.icy_wind||null,
   sand_wind:a.sand_wind||null,
   sand_devils:a.sand_devils||null
 }:null;
 hazard=stage?.hazard?.enabled?stage.hazard:null;
 elapsed=0;gustClock=0;heavyRainTime=0;particles=[];hazardZones=[];
 if(ambient)for(let i=0;i<(ambient.type==='rain'?Math.max(ambient.count,ambient.heavy_count):ambient.count);i++)particles.push(seed(true));
 hazardIn=hazard?Math.max(1,Number(hazard.first_trigger_seconds)||10):Infinity;
}
function status(u){
 if(!u.environmentStatus)u.environmentStatus={slowTime:0,slowPct:0,freezeTime:0,lastTick:-1,source:null,fireVisual:0,shatterTime:0,rootTime:0,rootRelease:0,staggerTime:0,bleedTime:0,bleedRate:0,bleedTick:0,feedback:{}};
 return u.environmentStatus;
}
function movementMultiplier(u){const s=u?.environmentStatus;return (s?.freezeTime>0||s?.rootTime>0||s?.staggerTime>0)?0:(s?.slowTime>0?1-s.slowPct:1)}
function canAct(u){return !(u?.environmentStatus?.freezeTime>0||u?.environmentStatus?.staggerTime>0)}
function update(dt,units,applyDamage){
 if(!stage||!enabled)return;
 dt=Math.max(0,Math.min(.06,Number(dt)||0));if(!dt)return;
 elapsed+=dt;gustClock+=dt;
 heavyRainTime=Math.max(0,heavyRainTime-dt);
 if(ambient){
   const up=ambient.type==='embers'||ambient.type==='spores';
   // Wind is expressed by gently varied particle motion, never by drawn lines.
   // Two overlapping smooth pulses prevent a synchronized, mechanical gust.
   const wind=ambient.icy_wind?.enabled?ambient.icy_wind:null;
   const period=Math.max(3,Number(wind?.gust_period_seconds)||8);
   const phase=gustClock/period;
   const gust=wind?Math.max(0,Math.sin(phase*Math.PI*2)*.65+Math.sin(phase*Math.PI*3.41+.8)*.35):0;
   const gustPower=wind?Math.max(0,Number(wind.gust_strength)||16):0;
   const visibleCount=ambient.type==='rain'&&heavyRainTime<=0?ambient.count:particles.length;
   for(let i=0;i<visibleCount;i++){
     const p=particles[i];
     if(ambient?.type==='dust'&&ambient.sand_wind?.enabled){
       const sw=ambient.sand_wind,period=Math.max(3,Number(sw.gust_period_seconds)||9),strength=Math.max(0,Number(sw.gust_strength)||48);
       const pulse=Math.pow(Math.max(0,Math.sin(gustClock*Math.PI*2/period)),3);
       p.x+=(ambient.drift+p.speed+pulse*strength)*(p.near?1:.65)*dt;
       p.y+=(Math.sin(elapsed*1.6+p.phase)*8+Math.sin(elapsed*.65+p.phase*2)*4-pulse*5)*dt;
       if(p.x>W+65||p.y>H+25||p.y<90)particles[i]=seed(false);
       continue;
     }
     const flutter=Math.sin(elapsed*.85+p.phase)*4+Math.sin(elapsed*1.8+p.phase*.72)*2.4;
     const isEmber=ambient.type==='embers';
     // Rising ash follows its own soft air currents; each mote sways at a different pace.
     const sway=isEmber?Math.sin(elapsed*.48+p.phase)*9+Math.sin(elapsed*.94+p.phase*1.7)*3:0;
     const drift=ambient.drift+gust*gustPower+flutter+sway;
     p.y+=(up?-1:1)*p.speed*dt*(isEmber?.65+.22*Math.sin(p.phase+elapsed*.31):1+.08*Math.sin(p.phase+elapsed));
     p.x+=drift*dt*(.7+.3*Math.sin(p.phase*.5+1)**2);
     p.rotation+=dt*.35;
     // Rain travels down and sideways at a steady angle, without artificial wind strokes.
     if(p.y < -35||p.y > H+35||p.x < -55||p.x>W+55)particles[i]=seed(false);
   }
 }
 if(!Array.isArray(units))return;
 for(const u of units){
   if(!u||u.hp<=0)continue;
   u.environmentAge=(u.environmentAge||0)+dt;
   const s=status(u);
   const feedback=s.feedback||(s.feedback={});
   for(const key of Object.keys(feedback)){feedback[key]=Math.max(0,feedback[key]-dt);if(!feedback[key])delete feedback[key];}
   if(s.fireVisual>0)feedback.burning=3;
   if(s.bleedTime>0)feedback.bleeding=3;
   if(s.rootTime>0)feedback.rooted=3;
   if(s.staggerTime>0)feedback.staggered=3;
   if(s.freezeTime>0)feedback.frozen=3;
   if(s.slowTime>0)feedback[s.source==='rain'?'drenched':'chilled']=3;
   s.slowTime=Math.max(0,s.slowTime-dt);
   const wasFrozen=s.freezeTime>0;
   s.freezeTime=Math.max(0,s.freezeTime-dt);
   s.staggerTime=Math.max(0,(s.staggerTime||0)-dt);
   if(s.bleedTime>0){
     if(!hazardsEnabled||hazard?.type!=='piercing_spikes'){s.bleedTime=0;s.bleedTick=0;}
     else{const span=Math.min(dt,s.bleedTime);s.bleedTime=Math.max(0,s.bleedTime-span);s.bleedTick=(s.bleedTick||0)+span;
       if(s.bleedTick>=.5||s.bleedTime<=0){if(typeof applyDamage==='function')applyDamage(u,u.maxhp*s.bleedRate*s.bleedTick,'true');s.bleedTick=0;}
     }
   }
   const wasRooted=s.rootTime>0;
   s.rootTime=Math.max(0,(s.rootTime||0)-dt);
   s.rootRelease=Math.max(0,(s.rootRelease||0)-dt);
   if(wasRooted&&s.rootTime===0)s.rootRelease=.35;
   s.fireVisual=Math.max(0,(s.fireVisual||0)-dt);
   s.shatterTime=Math.max(0,(s.shatterTime||0)-dt);
   if(wasFrozen&&s.freezeTime===0)s.shatterTime=.38;
   if(s.slowTime===0){s.slowPct=0;if(s.freezeTime===0)s.source=null;}
 }
 if(!hazardsEnabled||!hazard){hazardZones=[];return;}
 if(hazard.type==='burning_areas'||hazard.type==='entangling_roots'||hazard.type==='earth_tremor'||hazard.type==='piercing_spikes'){
   // Zones are spatial hazards. They warn before igniting and damage only occupants.
   for(const zone of hazardZones){
     if(zone.warning>0){
       zone.warning=Math.max(0,zone.warning-dt);
     }else if(zone.remaining>0){
       zone.remaining=Math.max(0,zone.remaining-dt);
       // Tremor is a single impact, not a repeated damage field.
       const impact=(hazard.type==='earth_tremor'||hazard.type==='piercing_spikes')&&!zone.impacted;
       if(impact)zone.impacted=true;
       for(const u of units){
         if(!u||u.hp<=0||matchesElement(u)||u.environmentAge<(Number(hazard.minimum_spawn_age_seconds)||0))continue;
         const dx=(u.x-zone.x)/zone.radius,dy=(u.y-zone.y)/(zone.radius*.48);
         if(dx*dx+dy*dy<=1){
           if(hazard.type==='piercing_spikes'){
             if(!impact||zone.caught.has(u))continue;
             zone.caught.add(u);const st=status(u);
             st.bleedTime=Math.max(st.bleedTime||0,Number(hazard.bleed_duration_seconds)||4);
             st.bleedRate=Math.max(0,Number(hazard.bleed_max_hp_pct_per_second)||0);
             if(typeof applyDamage==='function')applyDamage(u,u.maxhp*Math.max(0,Number(hazard.damage_max_hp_pct)||0),'true');
           }else if(hazard.type==='earth_tremor'){
             if(!impact||zone.caught.has(u))continue;
             zone.caught.add(u);const st=status(u);
             st.staggerTime=Math.max(st.staggerTime||0,Number(hazard.stagger_duration_seconds)||.8);
             u.charge=null;u.walking=false;if(u.anim)u.anim=null;
             const vx=u.x-zone.x,vy=(u.y-zone.y)*1.45,len=Math.hypot(vx,vy),push=Math.max(0,Number(hazard.knockback_distance)||20);
             u.x=Math.max(171,Math.min(789,u.x+(len>.001?vx/len:(u.side>0?-1:1))*push));
             u.y=Math.max(343,Math.min(429,u.y+(len>.001?vy/len:0)*push/1.45));
             if(typeof applyDamage==='function')applyDamage(u,u.maxhp*Math.max(0,Number(hazard.damage_max_hp_pct)||0),'true');
           }else if(hazard.type==='entangling_roots'){
             if(!zone.caught.has(u)){zone.caught.add(u);const st=status(u);st.rootTime=Math.max(st.rootTime||0,Number(hazard.root_duration_seconds)||1.8);st.rootRelease=0;}
           }else if(typeof applyDamage==='function'){status(u).fireVisual=.16;applyDamage(u,u.maxhp*Math.max(0,Number(hazard.damage_max_hp_pct_per_second)||0)*dt,'true');}
         }
       }
     }
   }
   hazardZones=hazardZones.filter(zone=>zone.warning>0||zone.remaining>0);
 }
 hazardIn-=dt;
 if(hazardIn>0)return;

 if(hazard.type==='heavy_rain')heavyRainTime=Math.max(0,Number(hazard.visual_duration_seconds)||3.8);
 if(hazard.type==='burning_areas'||hazard.type==='entangling_roots'||hazard.type==='earth_tremor'||hazard.type==='piercing_spikes'){
   const range=Array.isArray(hazard.zone_count)?hazard.zone_count:[1,2];
   const low=Math.max(1,Math.round(Number(range[0])||1)),high=Math.max(low,Math.round(Number(range[1])||low));
   const count=Math.min(2,Math.floor(rand(low,high+1)));
   hazardZones=[];
   for(let i=0;i<count;i++){
     const radius=Math.max(25,Math.min(120,Number(hazard.zone_radius)||73));
     // Positions stay on the continuous battle floor, away from both towers.
     const x=count===1?rand(320,640):i===0?rand(300,365):rand(595,660);
     hazardZones.push({x,y:rand(362,408),radius,warning:Math.max(.3,Number(hazard.warning_seconds)||1),
       remaining:Math.max(.5,Number(hazard.active_seconds)||4),phase:rand(0,6),caught:new Set(),impacted:false});
   }
 }
 const limits=Array.isArray(hazard.interval_seconds)?hazard.interval_seconds:[15,22];
 hazardIn=rand(Math.max(1,Number(limits[0])||15),Math.max(1,Number(limits[1])||22));
 for(const u of units){
   if(!u||u.hp<=0||matchesElement(u)||u.environmentAge<(Number(hazard.minimum_spawn_age_seconds)||0))continue;
   if(hazard.type==='chill_freeze'||hazard.type==='heavy_rain'){
     const isRain=hazard.type==='heavy_rain';
     const s=status(u);
     s.slowTime=Math.max(s.slowTime,Number(hazard.slow_duration_seconds)||3);
     s.source=isRain?'rain':'ice';
     s.slowPct=Math.max(s.slowPct,Math.min(.9,Math.max(0,Number(hazard.slow_pct)||.2)));
     if(!isRain&&Math.random()<Math.min(1,Math.max(0,Number(hazard.freeze_chance)||0)))
       s.freezeTime=Math.max(s.freezeTime,Number(hazard.freeze_duration_seconds)||.6);
   }else if(hazard.type==='instant_damage'&&typeof applyDamage==='function'){
     applyDamage(u,Math.max(0,Number(hazard.damage)||0),'true');
   }
 }
}
function render(ctx,layer='background',viewX=0,viewY=0,viewW=W,viewH=H){
 if(!stage||!enabled||layer!=='background')return;
 ctx.save();
 const heavy=ambient?.type==='rain'&&heavyRainTime>0;
 // Subtle overcast tint during heavy rain; never change permanent base-map artwork.
 if(heavy){const haze=ctx.createLinearGradient(0,viewY,0,viewY+viewH);haze.addColorStop(0,'rgba(18,40,62,.20)');haze.addColorStop(.65,'rgba(18,40,62,.12)');haze.addColorStop(1,'rgba(18,40,62,.05)');ctx.fillStyle=haze;ctx.fillRect(viewX,viewY,viewW,viewH);}
 ctx.globalAlpha=(ambient?.opacity||0)*(heavy?1.55:1);
 const visibleCount=ambient?.type==='rain'&&!heavy?ambient.count:particles.length;
 for(let i=0;i<visibleCount;i++){const p=particles[i];
   ctx.save();if(ambient.type==='rain'){ctx.translate(viewX+(p.x/W)*viewW,viewY+(p.y/H)*viewH);}else ctx.translate(p.x,p.y);ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
   switch(ambient.type){
   case 'leaves':{
     ctx.rotate(p.rotation+Math.sin(elapsed+p.phase)*.6);const z=p.size;ctx.beginPath();ctx.moveTo(-z*1.6,0);ctx.quadraticCurveTo(0,-z*1.6,z*1.7,0);ctx.quadraticCurveTo(0,z*1.35,-z*1.6,0);ctx.fill();ctx.strokeStyle='#e4efab';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-z,0);ctx.lineTo(z,0);ctx.stroke();break;
   }
   case 'snow':ctx.beginPath();ctx.arc(0,0,p.size*.65,0,Math.PI*2);ctx.fill();break;
   case 'embers':{
     // Irregular glow and fade keep the particles from resembling synchronized dots.
     const pulse=.68+.24*Math.sin(elapsed*(1.25+p.speed*.012)+p.phase);
     ctx.globalAlpha*=Math.max(.2,pulse);
     ctx.shadowBlur=p.size*2.5;ctx.shadowColor=p.color;
     ctx.beginPath();ctx.ellipse(0,0,p.size*.45,p.size*.7,p.rotation,0,Math.PI*2);ctx.fill();
     break;
   }
   case 'spores':ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(0,0,p.size*.6,0,Math.PI*2);ctx.fill();break;
   case 'dust':{
     if(ambient.sand_wind?.enabled){
       const sw=ambient.sand_wind,period=Math.max(3,Number(sw.gust_period_seconds)||9),pulse=Math.pow(Math.max(0,Math.sin(gustClock*Math.PI*2/period)),3);
       const flicker=.75+.25*Math.sin(elapsed*2+p.phase);
       ctx.globalAlpha*=(p.near?.58:.32)*flicker;
       // Fine grit, never broad leaf-like silhouettes.
       const grain=Math.max(.3,Math.min(.95,p.size*.52));
       ctx.beginPath();ctx.arc(0,0,grain,0,Math.PI*2);ctx.fill();
       if(pulse>.35&&p.near){ctx.lineWidth=.55;ctx.globalAlpha*=.65;ctx.beginPath();ctx.moveTo(-Math.min(3,grain*(1+pulse*2)),0);ctx.lineTo(0,0);ctx.stroke();}
     }else{ctx.globalAlpha*=.45;ctx.beginPath();ctx.ellipse(0,0,p.size*1.6,p.size*.65,0,0,Math.PI*2);ctx.fill();}break;
   }
   case 'rain':{
     const length=p.size*(heavy?7:4)*(.85+.2*Math.sin(p.phase));
     ctx.globalAlpha*=.45+.5*Math.sin(p.phase+1)**2;ctx.lineWidth=(heavy?1.15:.75)*(.8+.35*Math.sin(p.phase)**2);
     ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo((ambient.drift/Math.max(1,p.speed))*length,length);ctx.stroke();
     break;
   }
   case 'metal':{
     const glint=.55+.45*Math.sin(elapsed*2.3+p.phase)**6;
     ctx.globalAlpha*=glint;ctx.beginPath();ctx.arc(0,0,Math.min(1,p.size*.45),0,Math.PI*2);ctx.fill();
     if(glint>.94){ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-2,0);ctx.lineTo(2,0);ctx.moveTo(0,-2);ctx.lineTo(0,2);ctx.stroke();}break;
   }
   }
   ctx.restore();
 }

 if(ambient?.type==='rain'&&ambient.ground_splashes){
   // Tiny water ripples on the battle floor; deterministic across frames.
   ctx.strokeStyle='#d7f7ff';ctx.lineWidth=1;
   for(let i=0;i<(heavy?26:12);i++){
     const p=particles[i*3%particles.length];
     const phase=(elapsed*(heavy?2.7:1.8)+p.phase)%1;
     const x=viewX+(((p.x+i*113)%W+W)%W)/W*viewW,y=327+(i*37)%108;
     ctx.globalAlpha=(heavy?.24:.15)*(1-phase);
     ctx.beginPath();ctx.ellipse(x,y,(3+8*phase),1+2*phase,0,0,Math.PI*2);ctx.stroke();
     if(heavy&&phase<.35){ctx.globalAlpha=.36*(1-phase/.35);ctx.beginPath();ctx.moveTo(x-3,y-4);ctx.lineTo(x,y);ctx.lineTo(x+4,y-6);ctx.stroke();}
   }
 }
 // Low, translucent sand wisps stay behind all battle sprites.
 if(ambient?.type==='dust'&&ambient.sand_wind?.enabled){
   const sw=ambient.sand_wind,period=Math.max(3,Number(sw.gust_period_seconds)||9),pulse=Math.pow(Math.max(0,Math.sin(gustClock*Math.PI*2/period)),3);
   for(let i=0;i<5;i++){
     const x=((elapsed*(32+i*4)+i*223)%(W+240))-120,y=315+i*29+Math.sin(elapsed*.7+i)*5;
     const rx=70+i*9+35*pulse;
     ctx.save();ctx.translate(x,y);ctx.scale(1,.11);const haze=ctx.createRadialGradient(0,0,0,0,0,rx);haze.addColorStop(0,'rgba(235,188,121,.32)');haze.addColorStop(.5,'rgba(224,174,106,.14)');haze.addColorStop(1,'rgba(224,174,106,0)');ctx.globalAlpha=.18+.35*pulse;ctx.fillStyle=haze;ctx.fillRect(-rx,-rx,rx*2,rx*2);ctx.restore();
   }
 }
 // Small ambient dust devils: loose spiralling grit, no solid funnel or combat effect.
 if(ambient?.type==='dust'&&ambient.sand_devils?.enabled){
   const sd=ambient.sand_devils,sw=ambient.sand_wind||{},period=Math.max(3,Number(sw.gust_period_seconds)||9),pulse=Math.pow(Math.max(0,Math.sin(gustClock*Math.PI*2/period)),3);
   const count=Math.max(0,Math.min(3,Math.round(Number(sd.count)||2))),maxCount=Math.min(3,Math.max(count,Math.round(Number(sd.max_count)||count)));
   const r=Math.max(5,Math.min(16,Number(sd.radius)||12)),height=Math.max(15,Math.min(45,Number(sd.height)||34)),speed=Math.max(1,Math.min(30,Number(sd.speed)||10)),opacity=Math.max(0,Math.min(.5,Number(sd.opacity)||.28));
   for(let i=0;i<maxCount;i++){
     const cycle=(elapsed/(12+i*2)+i*.37)%1,fade=Math.min(1,cycle*7,(1-cycle)*7)*(i<count?1:pulse*pulse);
     const x=220+((elapsed*speed*(1+i*.16)+i*193)%520),y=365+i*24+Math.sin(elapsed*.45+i*2)*8;
     ctx.save();ctx.translate(x,y);
     const dust=ctx.createRadialGradient(0,0,0,0,0,r*1.5);dust.addColorStop(0,'rgba(213,164,98,.38)');dust.addColorStop(1,'rgba(213,164,98,0)');ctx.save();ctx.scale(1,.23);ctx.globalAlpha=fade*opacity;ctx.fillStyle=dust;ctx.fillRect(-r*1.5,-r*1.5,r*3,r*3);ctx.restore();
     for(let n=0;n<48;n++){
       const z=(elapsed*(.65+(n%4)*.09)+n*.137+i*.31)%1;
       const a=elapsed*(8+(n%3)*.7)+n*2.399963+i*2;
       const width=r*(.26+.68*Math.sin(z*Math.PI*.83)),lean=z*5+Math.sin(elapsed*1.4+z*4+i)*z*3;
       const px=Math.cos(a)*width+lean,py=-z*height+Math.sin(a)*width*.18;
       ctx.globalAlpha=opacity*fade*Math.sin(z*Math.PI)*(.55+.45*(1+Math.sin(a))/2);
       ctx.fillStyle=n%3===0?'#a76e42':n%3===1?'#f1d1a0':'#d9b17a';ctx.beginPath();ctx.arc(px,py,.4+(n%4)*.15,0,Math.PI*2);ctx.fill();
     }
     ctx.restore();
   }
 }
 // Metal trap: floor warning, solid faceted steel cones, then retraction.
 if(hazardsEnabled&&hazard?.type==='piercing_spikes')for(const zone of hazardZones){
   const warning=zone.warning>0,wt=Math.max(.3,Number(hazard.warning_seconds)||1),dur=Math.max(.5,Number(hazard.active_seconds)||1.2);
   const age=warning?wt-zone.warning:dur-zone.remaining,p=Math.max(0,Math.min(1,age/(warning?wt:dur))),r=zone.radius;
   const rise=warning?.04+.07*p:Math.min(1,age/.12,zone.remaining/.32);
   ctx.save();ctx.translate(zone.x,zone.y);ctx.save();ctx.scale(1,.48);
   const glow=ctx.createRadialGradient(0,0,0,0,0,r);glow.addColorStop(0,'rgba(214,159,67,.37)');glow.addColorStop(.65,'rgba(161,114,49,.23)');glow.addColorStop(1,'rgba(161,114,49,0)');ctx.globalAlpha=warning?.65+.35*Math.sin(p*9)**2:.7*(1-p);ctx.fillStyle=glow;ctx.fillRect(-r,-r,2*r,2*r);
   for(let row=-2;row<=2;row++){const yy=row*r*.34,span=Math.sqrt(Math.max(0,r*r-yy*yy))*.9;ctx.strokeStyle='#36404a';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-span,yy);ctx.lineTo(span,yy);ctx.stroke();ctx.strokeStyle=warning?'#ffd48a':'#bd8950';ctx.lineWidth=1.6;ctx.setLineDash([12,5]);ctx.stroke();ctx.setLineDash([]);}ctx.restore();
   for(let row=0;row<3;row++)for(let col=0;col<6;col++){
     const i=row*6+col,x=(col-2.5)*r*.28+Math.sin(i*2+zone.phase)*4,y=(row-1)*r*.28;
     const w=(6+i%3*1.5),height=(25+i%4*8)*rise;
     ctx.globalAlpha=warning?.75:Math.min(1,zone.remaining/.18);ctx.fillStyle='#303844';ctx.beginPath();ctx.ellipse(x,y,w*1.2,w*.42,0,0,Math.PI*2);ctx.fill();
     const steel=ctx.createLinearGradient(x-w,y,x+w,y);steel.addColorStop(0,'#48515f');steel.addColorStop(.46,'#c8d3db');steel.addColorStop(.5,'#f3f8fc');steel.addColorStop(.72,'#8797a7');steel.addColorStop(1,'#414a56');
     ctx.fillStyle=steel;ctx.strokeStyle='#414a56';ctx.lineWidth=.85;ctx.beginPath();ctx.moveTo(x-w,y);ctx.lineTo(x,y-height);ctx.lineTo(x+w,y);ctx.quadraticCurveTo(x,y+w*.7,x-w,y);ctx.closePath();ctx.fill();ctx.stroke();
     if(!warning){ctx.globalAlpha=Math.max(0,1-age/.45);ctx.fillStyle='#ffe0a4';for(let n=0;n<3;n++){const a=i*2.4+n*2,dist=age*48;ctx.beginPath();ctx.arc(x+Math.cos(a)*dist,y-4-age*24+Math.sin(a)*dist*.4,.8,0,Math.PI*2);ctx.fill();}}
   }ctx.restore();
 }
 // Earth tremor: cracked ground telegraph, one expanding impact, then falling debris.
 if(hazardsEnabled&&hazard?.type==='earth_tremor')for(const zone of hazardZones){
   const warning=zone.warning>0,wt=Math.max(.3,Number(hazard.warning_seconds)||1),dur=Math.max(.5,Number(hazard.active_seconds)||1);
   const p=warning?Math.max(0,1-zone.warning/wt):Math.min(1,1-zone.remaining/dur),r=zone.radius;
   ctx.save();ctx.translate(zone.x,zone.y);ctx.save();ctx.scale(1,.48);
   const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(238,187,102,.45)');g.addColorStop(1,'rgba(156,96,44,0)');ctx.fillStyle=g;ctx.globalAlpha=warning?.5+p*.5:1-p;ctx.fillRect(-r,-r,2*r,2*r);
   // Broken sandstone plates and fissures communicate the affected ground without a target ring.
   for(let k=0;k<18;k++){const a=k*2.399963+zone.phase,dist=r*Math.sqrt((k+.5)/18)*.87,xx=Math.cos(a)*dist,yy=Math.sin(a)*dist;
     ctx.globalAlpha=(warning?.65:.8*(1-p));ctx.fillStyle=k%2?'#966342':'#c49363';ctx.beginPath();ctx.moveTo(xx-8,yy+3);ctx.lineTo(xx-4,yy-5);ctx.lineTo(xx+7,yy-3);ctx.lineTo(xx+10,yy+5);ctx.closePath();ctx.fill();}
   ctx.globalAlpha=warning?1:Math.max(.15,1-p);
   for(let i=0;i<8;i++){const a=i*Math.PI/4+zone.phase,rr=r*(.65+.2*Math.sin(i*3));ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a+.2)*rr*.36,Math.sin(a+.2)*rr*.36);ctx.lineTo(Math.cos(a-.12)*rr*.7,Math.sin(a-.12)*rr*.7);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);ctx.strokeStyle='#643b25';ctx.lineWidth=3;ctx.stroke();ctx.strokeStyle='#d79d62';ctx.lineWidth=1;ctx.stroke();}ctx.restore();
   for(let i=0;i<16;i++){const a=i*2.399963+zone.phase,dist=r*(warning?.3+.5*(i%5)/5:.15+.75*p),x=Math.cos(a)*dist,y=Math.sin(a)*dist*.48;
     const lift=warning?Math.abs(Math.sin(elapsed*28+i))*3:Math.sin(Math.PI*p)*(16+i%5*6);
     ctx.globalAlpha=warning?.8:1-p;ctx.save();ctx.translate(x,y-lift);ctx.rotate(a+p*5);ctx.fillStyle=i%2?'#bc8250':'#e3b17d';ctx.strokeStyle='#71492e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,2);ctx.lineTo(-2,-4);ctx.lineTo(4,-2);ctx.lineTo(5,3);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
     if(!warning){ctx.globalAlpha=(1-p)*.25;ctx.fillStyle='#e6bd83';ctx.beginPath();ctx.ellipse(x,y,8+p*11,4+p*5,0,0,Math.PI*2);ctx.fill();}
   }ctx.restore();
 }
 // Nature warning and eruption: bounded ground growth, never an obstacle.
 if(hazardsEnabled&&hazard?.type==='entangling_roots')for(const zone of hazardZones){
   const warning=zone.warning>0, wt=Math.max(.3,Number(hazard.warning_seconds)||1), duration=Math.max(.5,Number(hazard.active_seconds)||3);
   const age=warning?wt-zone.warning:duration-zone.remaining;
   const grow=warning?.12+.2*Math.max(0,age/wt):Math.min(1,.2+age*4);
   const fade=warning?1:Math.min(1,zone.remaining/.45);
   ctx.save();ctx.translate(zone.x,zone.y);
   const r=zone.radius;ctx.save();ctx.scale(1,.48);
   const glow=ctx.createRadialGradient(0,0,2,0,0,r);glow.addColorStop(0,'rgba(155,211,65,.38)');glow.addColorStop(1,'rgba(92,132,37,0)');ctx.fillStyle=glow;ctx.globalAlpha=fade;ctx.fillRect(-r,-r,2*r,2*r);
   for(let i=0;i<14;i++){const a=i*2.399963+zone.phase,rr=r*(.6+.28*Math.sin(i*3)**2);ctx.globalAlpha=(warning?.75:.9)*fade;ctx.strokeStyle='#3e4926';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.08,Math.sin(a)*r*.08);ctx.quadraticCurveTo(Math.cos(a+.36)*rr*.62,Math.sin(a+.36)*rr*.62,Math.cos(a)*rr,Math.sin(a)*rr);ctx.stroke();ctx.strokeStyle='#8da94c';ctx.lineWidth=2;ctx.stroke();}ctx.restore();
   for(let i=0;i<20;i++){
     const a=i*2.399963+zone.phase,d=r*Math.sqrt((i+.5)/20)*.91,x=Math.cos(a)*d,y=Math.sin(a)*d*.45;
     const height=(12+i%4*5)*grow, sway=Math.sin(elapsed*3+i)*4;
     ctx.globalAlpha=fade;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-8,y+3);ctx.quadraticCurveTo(x+8,y-3,x,y-height*.55);ctx.quadraticCurveTo(x-8,y-height,x+sway,y-height);ctx.strokeStyle='#354824';ctx.lineWidth=warning?3:6;ctx.stroke();ctx.strokeStyle='#8db64b';ctx.lineWidth=warning?1.5:3;ctx.stroke();
     ctx.fillStyle='#b5db65';ctx.save();ctx.translate(x+sway,y-height);ctx.rotate(a);ctx.beginPath();ctx.ellipse(3,0,5*grow+1,2.6*grow+1,0,0,Math.PI*2);ctx.fill();ctx.restore();
     const p=(elapsed*1.4+i*.17)%1;ctx.globalAlpha=fade*(1-p)*.7;ctx.fillStyle=warning?'#d6e6a1':'#a48350';ctx.beginPath();ctx.arc(x+sway*p,y-p*17,1.5,0,Math.PI*2);ctx.fill();
   }ctx.restore();
 }
 // Burning ground is a soft irregular heat patch, not a perfect target circle.
 if(hazardsEnabled&&hazard?.type==='burning_areas')for(const zone of hazardZones){
   const warning=zone.warning>0,warningTotal=Math.max(.3,Number(hazard.warning_seconds)||1);
   const duration=Math.max(.5,Number(hazard.active_seconds)||4);
   const age=warning?Math.max(0,warningTotal-zone.warning):Math.max(0,duration-zone.remaining);
   const warm=Math.min(1,age/warningTotal);
   const ignite=warning?0:Math.min(1,age/.38);
   const extinguish=warning?1:Math.min(1,zone.remaining/.7);
   const intensity=warning?(.28+.42*warm):ignite*extinguish;
   const breathe=1+.022*Math.sin(elapsed*3.6+zone.phase)+.014*Math.sin(elapsed*6.1+zone.phase*1.9);
   ctx.save();ctx.translate(zone.x,zone.y);ctx.scale(1,.48);
   // Uneven edge with several broad lobes; distortion remains subtle so the warning stays legible.
   ctx.beginPath();
   for(let i=0;i<=64;i++){
     const theta=i/64*Math.PI*2;
     const irregular=1+.065*Math.sin(theta*5+zone.phase)+.038*Math.sin(theta*9-zone.phase*2);
     const radius=zone.radius*irregular*breathe;
     const x=Math.cos(theta)*radius,y=Math.sin(theta)*radius;
     if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
   }
   ctx.closePath();
   const heat=ctx.createRadialGradient(0,0,zone.radius*.08,0,0,zone.radius*1.12);
   heat.addColorStop(0,warning?'rgba(255,130,28,.46)':'rgba(255,176,54,.75)');
   heat.addColorStop(.43,warning?'rgba(236,74,13,.32)':'rgba(250,90,19,.59)');
   heat.addColorStop(.82,'rgba(232,53,8,.18)');
   heat.addColorStop(1,'rgba(218,46,7,0)');
   ctx.globalAlpha=intensity*.76;ctx.fillStyle=heat;ctx.fill();
   // During warning, keep a thin broken edge. During ignition, dissolve it into the flames.
   // Warning is expressed by molten cracks and a fading heat patch, not a perimeter ring.
   // Branching molten fissures communicate ignition without altering the hazard footprint.
   ctx.lineCap='round';
   for(let i=0;i<8;i++){
     const a=i*Math.PI/4+zone.phase, r=zone.radius*(.55+.17*Math.sin(i*3+zone.phase));
     ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.12,Math.sin(a)*r*.12);
     ctx.lineTo(Math.cos(a+.19)*r*.45,Math.sin(a+.19)*r*.45);
     ctx.lineTo(Math.cos(a-.08)*r*.72,Math.sin(a-.08)*r*.72);
     ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
     ctx.globalAlpha=(warning?.35+.45*warm:.75*ignite*extinguish);ctx.strokeStyle='#ff591c';ctx.lineWidth=5;ctx.stroke();
     ctx.strokeStyle='#ffe298';ctx.lineWidth=1.5;ctx.stroke();
   }
   ctx.restore();
   if(!warning){
     // Short overlapping ribbons of flame, independently swaying rather than repeated triangles.
     ctx.save();
     for(let i=0;i<29;i++){
       const angle=i*2.399963+zone.phase;
       const distance=Math.sqrt((i+.5)/29)*zone.radius*.9;
       const fx=zone.x+Math.cos(angle)*distance;
       const fy=zone.y+Math.sin(angle)*distance*.43;
       const phase=elapsed*(3.7+(i%5)*.43)+i*1.91+zone.phase;
       const sway=Math.sin(phase)*5+Math.sin(phase*.61+i)*2.8;
       const height=(13+(i%6)*3.7)*(.88+.13*Math.sin(phase*.74))*ignite*extinguish;
       const width=4+(i%3)*1.4;
       ctx.globalAlpha=(.43+.14*Math.sin(phase*.79)**2)*extinguish;
       ctx.fillStyle=i%4===0?'#ffe28a':i%4===1?'#ffbd4b':i%4===2?'#ff8d27':'#ed5020';
       ctx.beginPath();ctx.moveTo(fx-width,fy);
       ctx.bezierCurveTo(fx-width*1.45,fy-height*.3,fx+sway-width,fy-height*.72,fx+sway*.8,fy-height);
       ctx.bezierCurveTo(fx+sway+width*.65,fy-height*.67,fx+width*1.7,fy-height*.25,fx+width,fy);
       ctx.closePath();ctx.fill();
       // A warmer inner tongue adds depth without taller flames hiding monsters.
       if(i%3===0){
         ctx.globalAlpha=.34*ignite*extinguish;ctx.fillStyle='#ffe6a1';
         ctx.beginPath();ctx.moveTo(fx-width*.35,fy);
         ctx.quadraticCurveTo(fx+sway*.2,fy-height*.55,fx+sway*.54,fy-height*.7);
         ctx.quadraticCurveTo(fx+width*.75,fy-height*.27,fx+width*.35,fy);
         ctx.closePath();ctx.fill();
       }
     }
     // Tiny escaping cinders rise out of the burning patch and disappear softly.
     for(let i=0;i<12;i++){
       const offset=(i*47+zone.phase*23)%127-63;
       const cycle=(elapsed*(.38+(i%4)*.07)+i*.137+zone.phase*.1)%1;
       const x=zone.x+offset+Math.sin(elapsed*2+i*2.3)*7;
       const y=zone.y-4-cycle*(24+(i%5)*7);
       ctx.globalAlpha=.43*(1-cycle)*ignite*extinguish;
       ctx.fillStyle=i%2?'#ffd280':'#ff8f3a';
       ctx.beginPath();ctx.arc(x,y,1.1+(i%3)*.48,0,Math.PI*2);ctx.fill();
     }
     ctx.restore();
   }
 }
 ctx.restore();
}
function renderStatus(ctx,u){
 const s=u?.environmentStatus;
 if(!enabled||!s)return;
 if(s.fireVisual>0){
   ctx.save();const strength=Math.min(1,s.fireVisual/.1);
   for(let i=0;i<5;i++){
     const t=elapsed*8+i*2.1, x=u.x+(i-2)*9, y=u.y+2-Math.abs(i-2)*2;
     const h=13+7*Math.sin(t)**2, sway=5*Math.sin(t*.7);
     ctx.globalAlpha=.8*strength;ctx.fillStyle='#ff7a21';ctx.beginPath();ctx.moveTo(x-5,y);
     ctx.quadraticCurveTo(x-8,y-h*.5,x+sway,y-h);ctx.quadraticCurveTo(x+9,y-h*.4,x+5,y);ctx.closePath();ctx.fill();
     ctx.fillStyle='#ffe4a0';ctx.beginPath();ctx.moveTo(x-2,y);ctx.quadraticCurveTo(x-3,y-h*.3,x+sway*.5,y-h*.65);ctx.quadraticCurveTo(x+4,y-h*.25,x+2,y);ctx.fill();
     const p=(elapsed*1.5+i*.23)%1;ctx.globalAlpha=(1-p)*strength;ctx.beginPath();ctx.arc(x+sway*p,y-8-p*29,1.4,0,Math.PI*2);ctx.fill();
   }ctx.restore();
 }
 if(s.shatterTime>0){
   const p=1-s.shatterTime/.38;ctx.save();ctx.globalAlpha=1-p;ctx.fillStyle='#b6efff';ctx.strokeStyle='#f4ffff';ctx.lineWidth=1;
   for(let i=0;i<10;i++){const a=i*2.399963, x=u.x+Math.cos(a)*(20+p*32),y=u.y-35+Math.sin(a)*(22+p*28)+p*p*22;
     ctx.save();ctx.translate(x,y);ctx.rotate(a+p*3);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(4,2);ctx.lineTo(-3,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
   ctx.restore();
 }
 if(s.bleedTime>0){
   ctx.save();ctx.translate(u.x,u.y);
   for(let i=0;i<8;i++){const p=(elapsed*1.25+i*.137)%1,x=Math.sin(i*2.4)*26,y=-48+p*52;ctx.globalAlpha=(1-p)*.95;ctx.fillStyle='#e34850';ctx.beginPath();ctx.moveTo(x,y-5);ctx.quadraticCurveTo(x-5,y+2,x,y+4);ctx.quadraticCurveTo(x+5,y+2,x,y-5);ctx.fill();ctx.strokeStyle='#681e2d';ctx.lineWidth=.7;ctx.stroke();}
   ctx.restore();
 }
 if(s.staggerTime>0){
   ctx.save();const f=Math.min(1,s.staggerTime/.2);ctx.globalAlpha=f;ctx.strokeStyle='#ffe0a4';ctx.fillStyle='#e6bd83';ctx.lineWidth=2;
   for(let i=0;i<5;i++){const a=elapsed*4+i*Math.PI*2/5,x=u.x+Math.cos(a)*22,y=u.y-62+Math.sin(a)*6;ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();const q=(elapsed*1.8+i*.2)%1;ctx.globalAlpha=f*(1-q)*.6;ctx.beginPath();ctx.ellipse(u.x+(i-2)*10,u.y-q*9,5+q*5,2+q*2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=f;}
   ctx.restore();
 }
 if(s.rootTime>0||s.rootRelease>0){
   const release=s.rootTime<=0, p=release?1-s.rootRelease/.35:0;
   ctx.save();ctx.globalAlpha=1-p;ctx.translate(u.x,u.y);
   if(!release){
     for(let i=0;i<5;i++){const x=(i-2)*10,h=12+(i%3)*5,sw=Math.sin(elapsed*3+i)*2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x-9,4);ctx.quadraticCurveTo(x+10,-2,x-4,-h*.6);ctx.quadraticCurveTo(x-8,-h,x+sw,-h);ctx.strokeStyle='#354824';ctx.lineWidth=6;ctx.stroke();ctx.strokeStyle='#9aca54';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#c2e37a';ctx.beginPath();ctx.ellipse(x+sw+3,-h,5,2.5,-.5,0,Math.PI*2);ctx.fill();}
   }else for(let i=0;i<8;i++){const a=i*2.4;ctx.fillStyle=i%2?'#b9df68':'#789e42';ctx.beginPath();ctx.ellipse(Math.cos(a)*(12+p*25),-10+Math.sin(a)*p*20+p*9,4,2,a+p*3,0,Math.PI*2);ctx.fill();}
   ctx.restore();
 }
 if(s.slowTime<=0&&s.freezeTime<=0)return;
 const freeze=s.freezeTime>0,slow=s.slowTime>0;
 if(s.source==='rain'&&slow&&!freeze){
   // Heavy Rain debuff: wet ground ripples around feet, not frost or current lines.
   ctx.save();ctx.strokeStyle='#9beff6';ctx.lineWidth=2;ctx.lineCap='round';
   for(let i=0;i<3;i++){
     const phase=(elapsed*1.3+i/3)%1;
     ctx.globalAlpha=.5*(1-phase);
     ctx.beginPath();ctx.ellipse(u.x,u.y+3,(9+phase*23),(2+phase*4),0,0,Math.PI*2);ctx.stroke();
   }
   for(let i=0;i<7;i++){
     const p=(elapsed*1.8+i*.143)%1,x=u.x+Math.sin(i*2.4)*23,y=u.y-25+p*29;
     ctx.globalAlpha=.72*Math.sin(p*Math.PI);ctx.fillStyle='#8edfff';ctx.beginPath();ctx.ellipse(x,y,1.6,3.6,-.28,0,Math.PI*2);ctx.fill();
     if(p>.78){ctx.strokeStyle='#e7fbff';ctx.beginPath();ctx.moveTo(x-4,y-3);ctx.lineTo(x,y);ctx.lineTo(x+4,y-4);ctx.stroke();}
   }
   ctx.restore();return;
 }
 // Recognizable ice crystals rather than a blue status/debug circle.
 const x=u.x,y=u.y-45, age=elapsed+(u.uid||0)*.33;
 ctx.save();
 ctx.save();ctx.translate(u.x,u.y-3);ctx.scale(1,.35);
 const mist=ctx.createRadialGradient(0,0,2,0,0,34);
 mist.addColorStop(0,'rgba(174,235,255,.37)');mist.addColorStop(1,'rgba(174,235,255,0)');ctx.fillStyle=mist;ctx.fillRect(-35,-35,70,70);ctx.restore();
 if(freeze){
   // Angular translucent crystalline casing: distinct from monster shields.
   ctx.globalAlpha=.44;
   const ice=ctx.createLinearGradient(x-34,y-42,x+30,y+32);ice.addColorStop(0,'#e4fdff');ice.addColorStop(.45,'#89dff8');ice.addColorStop(1,'#347fb6');
   ctx.fillStyle=ice;ctx.strokeStyle='#e0fbff';ctx.lineWidth=2.4;
   ctx.beginPath();ctx.moveTo(x-27,y-36);ctx.lineTo(x-6,y-53);ctx.lineTo(x+23,y-42);
   ctx.lineTo(x+36,y-11);ctx.lineTo(x+25,y+31);ctx.lineTo(x+3,y+44);
   ctx.lineTo(x-29,y+26);ctx.lineTo(x-35,y-10);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.globalAlpha=.52;ctx.strokeStyle='#f3feff';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(x-6,y-53);ctx.lineTo(x+3,y+44);ctx.moveTo(x-35,y-10);
   ctx.lineTo(x+25,y+31);ctx.moveTo(x+23,y-42);ctx.lineTo(x-29,y+26);ctx.stroke();
   ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(x-6,y-53);ctx.lineTo(x+2,y-25);ctx.lineTo(x-9,y-10);ctx.lineTo(x+7,y+7);ctx.lineTo(x+3,y+44);ctx.stroke();
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
// Draw status badges separately from body effects so HP bars remain legible.
function renderIndicators(ctx,u,barY){
 const s=u?.environmentStatus;if(!enabled||!hazardsEnabled||!s||!s.feedback)return;
 const active={burning:s.fireVisual>0,bleeding:s.bleedTime>0,rooted:s.rootTime>0,staggered:s.staggerTime>0,frozen:s.freezeTime>0,chilled:s.slowTime>0&&s.source==='ice'&&s.freezeTime<=0,drenched:s.slowTime>0&&s.source==='rain'};
 const colors={burning:'#ff9948',bleeding:'#fa5965',rooted:'#a8d86c',staggered:'#f5d27a',frozen:'#9ceaff',chilled:'#9ceaff',drenched:'#65c9ff'};
 const keys=Object.keys(colors).filter(k=>active[k]||s.feedback[k]>0).filter(k=>k!=='chilled'||!active.frozen);
 for(let i=0;i<keys.length;i++){
   const k=keys[i],x=u.x+(i-(keys.length-1)/2)*18,y=barY-10,c=colors[k];
   ctx.save();ctx.translate(x,y);ctx.globalAlpha=active[k]?1:.55;ctx.fillStyle='#172431';ctx.strokeStyle=c;ctx.lineWidth=1.3;ctx.beginPath();ctx.roundRect(-8,-8,16,16,4);ctx.fill();ctx.stroke();ctx.fillStyle=c;ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.lineCap='round';ctx.lineJoin='round';
   if(k==='burning'){ctx.beginPath();ctx.moveTo(0,-6);ctx.quadraticCurveTo(7,1,3,5);ctx.quadraticCurveTo(-7,7,-5,0);ctx.lineTo(-2,-3);ctx.quadraticCurveTo(-2,2,0,-6);ctx.fill();}
   else if(k==='bleeding'||k==='drenched'){ctx.beginPath();ctx.moveTo(0,-6);ctx.bezierCurveTo(-8,3,-4,6,0,6);ctx.bezierCurveTo(4,6,8,3,0,-6);ctx.fill();}
   else if(k==='rooted'){ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(0,-4);ctx.moveTo(0,0);ctx.lineTo(-5,-4);ctx.moveTo(0,2);ctx.lineTo(5,-2);ctx.moveTo(0,4);ctx.lineTo(-4,6);ctx.moveTo(0,4);ctx.lineTo(4,6);ctx.stroke();}
   else if(k==='staggered'){ctx.beginPath();ctx.moveTo(1,-6);ctx.lineTo(-4,1);ctx.lineTo(0,1);ctx.lineTo(-1,6);ctx.lineTo(5,-2);ctx.lineTo(1,-2);ctx.closePath();ctx.fill();}
   else {for(let j=0;j<3;j++){const a=j*Math.PI/3;ctx.beginPath();ctx.moveTo(-Math.cos(a)*5,-Math.sin(a)*5);ctx.lineTo(Math.cos(a)*5,Math.sin(a)*5);ctx.stroke();}}
   ctx.restore();
 }
}
function setEnabled(v){enabled=!!v}
function setHazardsEnabled(v){hazardsEnabled=!!v}

// Build a mask once from the actual artwork. Only hot, saturated orange/yellow
// pixels qualify; dark red rock and neutral scenery remain untouched.
let lavaSource=null,lavaMask=null,lavaSurface=null;
function renderLava(ctx,img,x,y,w,h){
 if(!enabled||!stage?.lava_animation?.enabled||global.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 if(lavaSource!==img){
  lavaSource=img;lavaMask=null;lavaSurface=null;
  try{
   const mask=document.createElement('canvas');mask.width=img.naturalWidth;mask.height=img.naturalHeight;
   const mc=mask.getContext('2d',{willReadFrequently:true});mc.drawImage(img,0,0);
   const data=mc.getImageData(0,0,mask.width,mask.height),p=data.data;
   for(let i=0;i<p.length;i+=4){
    const r=p[i],g=p[i+1],b=p[i+2];
    const heat=Math.min(1,Math.max(0,(r-185)/50),Math.max(0,(g-65)/65),Math.max(0,(g-b-36)/55),Math.max(0,(r-b-90)/65));
    p[i]=255;p[i+1]=255;p[i+2]=255;p[i+3]=Math.round(p[i+3]*heat);
   }
   mc.putImageData(data,0,0);lavaMask=mask;lavaSurface=document.createElement('canvas');lavaSurface.width=mask.width;lavaSurface.height=mask.height;
  }catch(err){return;}
 }
 if(!lavaMask||!lavaSurface)return;
 const lc=lavaSurface.getContext('2d'),mw=lavaMask.width,mh=lavaMask.height,t=elapsed*(stage.lava_animation.speed||.65);
 lc.globalCompositeOperation='source-over';lc.clearRect(0,0,mw,mh);
 // Traveling highlights, vertically on the distant slopes and laterally
 // along the foreground cracks. All light is clipped to the source mask.
 for(const [top,bottom,vertical] of [[0,.38,true],[.38,1,false]]){
  lc.save();lc.beginPath();lc.rect(0,top*mh,mw,(bottom-top)*mh);lc.clip();
  const length=vertical?mh:mw,period=length*.17;
  for(let i=-1;i<8;i++){
   const pos=i*period+(t*length*.075)%period,half=period*.43;
   const g=vertical?lc.createLinearGradient(0,pos-half,0,pos+half):lc.createLinearGradient(pos-half,0,pos+half,0);
   g.addColorStop(0,'rgba(255,94,0,0)');g.addColorStop(.24,'rgba(185,40,0,.36)');g.addColorStop(.47,'rgba(255,178,18,.72)');g.addColorStop(.62,'rgba(255,248,162,.9)');g.addColorStop(1,'rgba(255,145,24,0)');
   lc.fillStyle=g;if(vertical)lc.fillRect(0,pos-half,mw,half*2);else lc.fillRect(pos-half,0,half*2,mh);
  }lc.restore();
 }
 lc.globalCompositeOperation='destination-in';lc.drawImage(lavaMask,0,0);lc.globalCompositeOperation='source-over';
 ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=stage.lava_animation.strength??.85;ctx.drawImage(lavaSurface,x,y,w,h);ctx.restore();
}

// Soft rising smoke at authored volcano mouths, in original map coordinates.
function renderSmoke(ctx,x,y,w,h){
 if(!enabled||!stage?.smoke_animation?.enabled||global.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 ctx.save();
 for(const [j,p] of stage.smoke_animation.plumes.entries()){
  for(let i=0;i<8;i++){
   const q=(elapsed*.14+i/8+j*.23)%1;
   const px=x+w*(p.x+q*.055+Math.sin(q*5+j+i)*p.width*.22),py=y+h*(p.y-q*p.height);
   const rx=w*p.width*(.32+q*.85),ry=h*p.height*(.10+q*.20),alpha=.24*Math.sin(Math.PI*q);
   ctx.save();ctx.translate(px,py);ctx.scale(rx,ry);
   const g=ctx.createRadialGradient(0,0,.08,0,0,1);
   g.addColorStop(0,'rgba(64,48,51,'+alpha+')');g.addColorStop(.55,'rgba(76,60,63,'+(alpha*.62)+')');g.addColorStop(1,'rgba(76,60,63,0)');
   ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
 }
 ctx.restore();
}
global.MonstersClashEnvironment=Object.freeze({renderSmoke,renderLava,configure,update,render,renderStatus,renderIndicators,matchesElement,movementMultiplier,canAct,setEnabled,setHazardsEnabled});
})(window);
