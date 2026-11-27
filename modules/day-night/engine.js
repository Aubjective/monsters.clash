/* Monsters Clash — authoritative battle time and lighting. */
(function(global){
'use strict';
const DURATION=30,TRANSITION=5;
let phase='day',remaining=DURATION,indoor=false,mode='outdoor_dynamic',fixed=false,light=0,from=0,to=0,transition=TRANSITION;
function configure(map,initialPhase){
 mode=['outdoor_dynamic','indoor_fixed','fixed_day','fixed_night'].includes(map?.time_of_day?.mode)?map.time_of_day.mode:'outdoor_dynamic';
 indoor=mode==='indoor_fixed';fixed=mode==='fixed_day'||mode==='fixed_night';
 phase=fixed?(mode==='fixed_night'?'night':'day'):initialPhase==='day'||initialPhase==='night'?initialPhase:Math.random()<.5?'day':'night';
 remaining=fixed?Infinity:DURATION;light=phase==='night'?1:0;from=to=light;transition=TRANSITION;
}
function update(dt){
 if(fixed||!Number.isFinite(dt)||dt<=0)return;
 while(dt>0){const span=Math.min(dt,remaining);remaining-=span;dt-=span;transition=Math.min(TRANSITION,transition+span);
 const p=transition/TRANSITION;light=from+(to-from)*p*p*(3-2*p);
 if(remaining<=1e-9){phase=phase==='day'?'night':'day';remaining=DURATION;from=light;to=phase==='night'?1:0;transition=0;}}
}
function getPhase(){return phase}
function getState(){return {phase,remaining:fixed?null:remaining,indoor,mode,fixed,nightBlend:light,transitioning:transition<TRANSITION}}
function matchesAffinity(monster){const m=monster?.m||monster;const e=String(m?.elemental?.primary||m?.element||'').toLowerCase();return (phase==='day'&&e==='light')||(phase==='night'&&e==='dark')}
function updateLabel(node){if(!node)return;const text=fixed?(phase==='day'?'☀ Eternal Day':'☾ Eternal Night'):(phase==='day'?'☀ Day':'☾ Night')+' · '+Math.ceil(remaining)+'s';if(node.textContent!==text)node.textContent=text;}
function render(ctx,x,y,w,h){if(indoor)return;ctx.save();
 const a=light;ctx.fillStyle='rgba(21,36,77,'+(.46*a)+')';ctx.fillRect(x,y,w,h);
 const sky=ctx.createLinearGradient(x,y,x,y+h);sky.addColorStop(0,'rgba(14,25,65,'+(.28*a)+')');sky.addColorStop(.62,'rgba(35,56,99,'+(.09*a)+')');sky.addColorStop(1,'rgba(35,56,99,0)');ctx.fillStyle=sky;ctx.fillRect(x,y,w,h);
 if(a<1){ctx.fillStyle='rgba(255,223,170,'+(.065*(1-a))+')';ctx.fillRect(x,y,w,h);}
 ctx.restore();}
global.MonstersClashDayNight=Object.freeze({configure,update,getPhase,getState,matchesAffinity,updateLabel,render});
})(window);
