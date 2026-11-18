/* Monsters Clash — authoritative ambient map effects engine.
   Visual-only: affects no HP, physics, elemental bonuses or deployment.
   Stage-specific presets live in environment_effects.json. */
(function(global){
  'use strict';
  const WIDTH=960, HEIGHT=480;
  let presets={}, config=null, particles=[], time=0, enabled=true;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const palette={
    leaves:['#b3e87b','#75b951','#d6d77c','#edf2a9'],
    embers:['#ffe18c','#ff9c35','#ff692e','#f7c35a'],
    snow:['#ffffff','#e5f8ff','#c0e9f8'],
    dust:['#d9c9a5','#b6a68c','#f1e3bf'],
    spores:['#a4e8a0','#72c4a8','#c9e7a5'],
    rain:['#b7def1','#8cc6d9']
  };
  function normalize(input){
    if(!input||typeof input!=='object')return null;
    const kind=palette[input.type]?input.type:'leaves';
    return {type:kind,count:Math.min(110,Math.max(0,Math.round(Number(input.count)||0))),
      speed:Math.min(260,Math.max(2,Number(input.speed)||25)),
      drift:Number(input.drift)||0,opacity:Math.min(1,Math.max(.05,Number(input.opacity)||.6)),
      size:Math.min(14,Math.max(.8,Number(input.size)||4)),layer:input.layer==='foreground'?'foreground':'background'};
  }
  function seed(p,initial){
    const kind=p.type;return {
      x:rand(-40,WIDTH+40),y:initial?rand(-30,HEIGHT):kind==='embers'?HEIGHT+25:-25,
      size:rand(.5,1.4)*p.size,phase:rand(0,Math.PI*2),wobble:rand(4,24),speed:rand(.6,1.4)*p.speed,
      color:palette[kind][Math.floor(rand(0,palette[kind].length))],
      angle:rand(0,Math.PI*2)
    };
  }
  function configure(stage){
    const next=presets[stage?.id]||stage?.environment_effect||null;
    config=normalize(next);particles=[];time=0;
    if(config)for(let i=0;i<config.count;i++)particles.push(seed(config,true));
  }
  function update(dt){
    if(!enabled||!config)return;
    time+=Math.max(0,Math.min(dt,.06));
    const p=config,k=p.type,up=k==='embers'||k==='spores',rain=k==='rain';
    for(let i=0;i<particles.length;i++){
      const a=particles[i];
      a.y+=(up?-1:1)*a.speed*dt*(rain?2.3:1);
      a.x+=(p.drift+Math.sin(time*1.8+a.phase)*a.wobble*.3)*dt;
      a.angle+=dt*(up?1.5:.7);
      if((up&&a.y< -35)||(!up&&a.y>HEIGHT+35)||a.x< -90||a.x>WIDTH+90)particles[i]=seed(p,false);
    }
  }
  function render(ctx,layer='background'){
    if(!enabled||!config||config.layer!==layer)return;
    const k=config.type;
    ctx.save();ctx.globalAlpha=config.opacity;
    for(const p of particles){
      ctx.fillStyle=p.color;ctx.strokeStyle=p.color;
      ctx.save();ctx.translate(p.x,p.y);
      if(k==='leaves'){
        ctx.rotate(p.angle);ctx.beginPath();ctx.ellipse(0,0,p.size*1.8,p.size*.7,.4,0,Math.PI*2);ctx.fill();
        ctx.globalAlpha*=.7;ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size,0);ctx.stroke();
      }else if(k==='snow'){
        ctx.beginPath();ctx.arc(0,0,p.size*.6,0,Math.PI*2);ctx.fill();
      }else if(k==='embers'){
        ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(0,0,p.size*.65,0,Math.PI*2);ctx.fill();
      }else if(k==='dust'){
        ctx.globalAlpha*=.5;ctx.beginPath();ctx.ellipse(0,0,p.size*2,p.size,0,0,Math.PI*2);ctx.fill();
      }else if(k==='spores'){
        ctx.shadowBlur=5;ctx.shadowColor=p.color;ctx.beginPath();ctx.arc(0,0,p.size*.65,0,Math.PI*2);ctx.fill();
      }else if(k==='rain'){
        ctx.lineWidth=Math.max(1,p.size*.25);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-p.size*.8,p.size*3.5);ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }
  function register(configurations){presets=(!Array.isArray(configurations)&&configurations)||{};}
  function setEnabled(v){enabled=!!v;}
  global.MonstersClashEnvironment=Object.freeze({register,configure,update,render,setEnabled,isEnabled:()=>enabled});
})(window);
