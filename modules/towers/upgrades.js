/* Authoritative tower upgrade rules, shield lifecycle and shield rendering. */
(function(global){
'use strict';
function selectEquipment(registry,profile,base){
 const pick=(group,key,def)=>{const list=registry[group];const entry=list.find(x=>x.available!==false&&x.id===profile[key]&&profile[group].includes(x.id))||list.find(x=>x.available!==false&&x.id===def);if(!entry)throw Error('No default '+key);profile[key]=entry.id;return entry;};
 const tower=pick('towers','tower',registry.default_towers.ally),shield=pick('shields','shield',registry.default_shield),drone=pick('drones','drone',registry.default_drone);
 const generator=pick('generators','generator',registry.default_generator);
 return {tower,shield,drone,generator,config:{...base,shield_cost:shield.upgrade_cost,shield_hp:shield.hp_per_level,shield_plate_min:shield.plate_min,shield_plate_max:shield.plate_max,shield_orbit_speed:shield.orbit_speed,shield_sprite:shield.sprite,drone_cost:drone.deploy_cost,drone_max:drone.max_active,drone_damage:drone.damage,drone_interval:drone.interval_seconds,drone_range:drone.range,drone_sheet_columns:drone.sheet_columns,generator_cost:generator.upgrade_cost,generator_income:generator.income_per_level,generator_interval:generator.interval_seconds,generator_max:generator.max_level}};
}
function equip(registry,profile,group,id){
 if(!['towers','shields','drones','generators'].includes(group))return false;const key=group.slice(0,-1),item=registry[group].find(x=>x.id===id);if(!item||item.available===false)return false;
 if(!profile[group].includes(id)){const price=Number(item.unlock_cost);if(!Number.isFinite(price)||price<0||profile.coins<price)return false;profile.coins-=price;profile[group].push(id);}
 profile[key]=id;return true;
}
function quote(run,cfg,kind){
 if(!['attack','shield','drone','generator'].includes(kind))return null;
 const key=kind==='generator'?'generatorLevel':kind==='drone'?'drones':kind==='shield'?'shieldLevel':'attackLevel';
 const level=Number(run[key])||0,max=kind==='generator'?cfg.generator_max:kind==='drone'?cfg.drone_max:cfg.max_upgrade;
 const base=kind==='generator'?cfg.generator_cost:kind==='drone'?cfg.drone_cost:kind==='shield'?cfg.shield_cost:cfg.attack_cost;
 return {kind,key,level,max,cost:Math.round(base*(1+level*.5))};
}
function createShield(run,cfg){const hp=run.shieldLevel*cfg.shield_hp;return {hp,max:hp,phase:0,flash:0,broken:0,hitAngle:0};}
function purchase(run,shield,cfg,kind){
 const q=quote(run,cfg,kind);if(!q||q.level>=q.max||run.wallet<q.cost)return false;
 run.wallet-=q.cost;run[q.key]++;
 if(kind==='shield'){shield.max+=cfg.shield_hp;shield.hp=Math.min(shield.max,shield.hp+cfg.shield_hp);shield.flash=.35;shield.broken=0;}
 return true;
}
function attackStats(tower,run,cfg){
 const a=tower?.basic_attack;if(!a)return null;const lv=run.attackLevel;
 return {type:a.type,range:Math.min(cfg.tower_range_cap,(Number(a.range)||190)*(1+lv*.12)),damage:(Number(a.damage)||15)*(1+lv*.14),interval:Math.max(.35,a.cooldown_seconds/(1+lv*.15)),arrows:1+Math.floor(lv/2),stun:lv>=2?Math.min(1.2,.2+lv*.08):0,waveWidth:5+lv*1.4,droneDamage:cfg.drone_damage*(1+lv*.08)};
}
function update(shield,dt,cfg){shield.phase=(shield.phase+dt*(cfg.shield_orbit_speed||.85))%(Math.PI*2);shield.flash=Math.max(0,shield.flash-dt);shield.broken=Math.max(0,shield.broken-dt);}
function absorb(shield,damage){const used=Math.min(shield.hp,Math.max(0,damage));shield.hp-=used;if(used){shield.flash=.35;shield.hitAngle=shield.phase;if(shield.hp===0)shield.broken=.65;}return Math.max(0,damage-used);}
const shieldImages=new Map();
function renderShield(ctx,s,level,cfg,x,y,front){
 if(!s)return;
 const rx=76,ry=48,orbitY=ry*.67,flash=Math.max(0,Math.min(1,s.flash/.35));
 if(s.hp>0){
 const ratio=s.hp/Math.max(1,s.max),max=Math.min(cfg.shield_plate_max||6,(cfg.shield_plate_min||3)+Math.floor(Math.max(0,level-1)/3)),count=Math.max(1,Math.ceil(max*(.55+.45*ratio)));
 // Render the rear and front halves on their corresponding sides of the tower.
 ctx.save();
 const intensity=(.18+.035*level)*(.6+.4*ratio);
 ctx.globalAlpha=Math.min(.85,intensity*(front?1:.65)+flash*.30);
 ctx.strokeStyle=flash>.2?'#dcfbff':'#64d9ff';
 ctx.shadowColor='#38cfff';ctx.shadowBlur=5+level*.65+flash*12;
 ctx.lineWidth=1.6+level*.12+flash*1.5;
 ctx.beginPath();ctx.ellipse(x,y,rx,orbitY,0,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.stroke();
 // Secondary fine energy line, kept transparent to preserve the tower silhouette.
 ctx.globalAlpha*=.55;ctx.lineWidth=.8;ctx.shadowBlur=2;
 ctx.beginPath();ctx.ellipse(x,y,rx+4,orbitY+3,0,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.stroke();
 if(flash>0){const expand=(1-flash)*12;ctx.globalAlpha=flash*.65;ctx.strokeStyle='#d7faff';ctx.lineWidth=2;ctx.shadowBlur=10;ctx.beginPath();ctx.ellipse(x,y,rx+expand,orbitY+expand*.45,0,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.stroke();}
 ctx.restore();
 for(let i=0;i<count;i++){
 const a=s.phase+i*Math.PI*2/count,depth=Math.sin(a);if((depth>=0)!==front)continue;
 const px=x+Math.cos(a)*rx,py=y+depth*orbitY;
 const depthScale=.92+.08*depth,width=19.4*depthScale,height=24*depthScale;
 const glow=Math.max(0,flash*Math.cos(a-s.hitAngle));
 ctx.save();ctx.translate(px,py);
 ctx.globalAlpha=(front?.98:.70)*(.8+.2*ratio);ctx.shadowColor='#72dfff';ctx.shadowBlur=6+level*.9+glow*18;
 if(cfg.shield_sprite){let img=shieldImages.get(cfg.shield_sprite);if(!img){img=new Image();img.src=cfg.shield_sprite;shieldImages.set(cfg.shield_sprite,img);}if(img.complete&&img.naturalWidth>0){const hh=height*2,ww=hh*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,-ww/2,-hh/2,ww,hh);if(glow>.08){ctx.globalAlpha=glow*.8;ctx.strokeStyle='#d9faff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,ww*.55+(1-flash)*8,hh*.52+(1-flash)*8,0,0,Math.PI*2);ctx.stroke();}ctx.restore();continue;}}
 const g=ctx.createLinearGradient(-width,-height,width,height);g.addColorStop(0,'rgba(219,250,255,.82)');g.addColorStop(.35,'rgba(77,160,218,.35)');g.addColorStop(.55,'rgba(186,239,255,.54)');g.addColorStop(1,'rgba(39,93,152,.68)');
 ctx.beginPath();ctx.moveTo(0,-height);ctx.lineTo(width,-height*.52);ctx.lineTo(width*.8,height*.47);ctx.lineTo(0,height);ctx.lineTo(-width*.8,height*.47);ctx.lineTo(-width,-height*.52);ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=glow>.2?'#efffff':'#8adcf6';ctx.lineWidth=2.1+glow*2;ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle='rgba(236,253,255,.8)';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-width*.7,-height*.44);ctx.lineTo(0,-height*.8);ctx.lineTo(width*.6,-height*.48);ctx.stroke();
 ctx.strokeStyle='rgba(142,221,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-height*.8);ctx.lineTo(0,height*.76);ctx.moveTo(-width*.7,height*.35);ctx.lineTo(width*.65,-height*.42);ctx.stroke();
 ctx.restore();
 }
 }
 if(front&&s.broken>0){const q=1-s.broken/.65;ctx.save();ctx.globalAlpha=1-q;ctx.fillStyle='#a9eaff';for(let i=0;i<22;i++){const a=i*2.399963+s.hitAngle;const px=x+Math.cos(a)*(rx+45*q),py=y+Math.sin(a)*(ry*.7+45*q);ctx.save();ctx.translate(px,py);ctx.rotate(a+q*5);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,1);ctx.lineTo(-3,5);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();}
}
function renderHealth(ctx,x,y,hp,maxHp,shield,art){
 const ratio=Math.max(0,Math.min(1,hp/Math.max(1,maxHp))),breached=hp<=0;
 const sr=shield?.max>0?Math.max(0,Math.min(1,shield.hp/shield.max)):0;
 if(art?.complete&&art.naturalWidth>0){
 const w=148,h=w*art.naturalHeight/art.naturalWidth;
 ctx.save();ctx.translate(x,y);ctx.drawImage(art,-w/2,-h/2,w,h);
 const left=-w/2+w*.232,right=-w/2+w*.919,top=-h/2+h*.378,bottom=-h/2+h*.574;
 ctx.save();ctx.beginPath();ctx.moveTo(left+3,top);ctx.lineTo(right-4,top);ctx.lineTo(right,(top+bottom)/2);ctx.lineTo(right-4,bottom);ctx.lineTo(left+3,bottom);ctx.lineTo(left,(top+bottom)/2);ctx.closePath();ctx.clip();
 const fill=ctx.createLinearGradient(0,top,0,bottom);fill.addColorStop(0,ratio<=.3?'#ffac72':ratio<=.7?'#ffe098':'#a0eaff');fill.addColorStop(1,ratio<=.3?'#b83136':ratio<=.7?'#bb7728':'#216ab3');ctx.fillStyle=fill;ctx.fillRect(left,top,(right-left)*ratio,bottom-top);ctx.restore();
 ctx.font='bold 9px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=2.8;ctx.strokeStyle='#10202f';ctx.fillStyle='#fff6dd';const label=breached?'BREACHED':Math.ceil(hp)+' / '+Math.ceil(maxHp);ctx.strokeText(label,(left+right)/2,(top+bottom)/2);ctx.fillText(label,(left+right)/2,(top+bottom)/2);
 if(shield?.max>0){ctx.fillStyle='#081421';ctx.fillRect(left,bottom+7,right-left,4);ctx.fillStyle='#78e4fc';ctx.fillRect(left,bottom+7,(right-left)*sr,4);ctx.fillStyle='#b0ebff';ctx.strokeStyle='#14283e';ctx.lineWidth=3;const shieldLabel='Shield '+Math.ceil(shield.hp)+' / '+Math.ceil(shield.max);ctx.strokeText(shieldLabel,(left+right)/2,bottom+18);ctx.fillText(shieldLabel,(left+right)/2,bottom+18);}
 ctx.restore();return;
 }
 const metal=ctx.createLinearGradient(0,y-16,0,y+26);metal.addColorStop(0,'#f6d99a');metal.addColorStop(.32,'#ac8548');metal.addColorStop(.65,'#78582f');metal.addColorStop(1,'#d0a75d');
 ctx.save();ctx.translate(x,y);ctx.shadowColor='#07111b';ctx.shadowBlur=5;
 // Symmetrical battlement crest, bevelled gold frame, tapered fortress ends.
 ctx.beginPath();ctx.moveTo(-65,-10);ctx.lineTo(-59,-16);ctx.lineTo(-49,-16);ctx.lineTo(-49,-11);ctx.lineTo(-39,-11);ctx.lineTo(-39,-16);ctx.lineTo(39,-16);ctx.lineTo(39,-11);ctx.lineTo(49,-11);ctx.lineTo(49,-16);ctx.lineTo(59,-16);ctx.lineTo(65,-10);ctx.lineTo(65,14);ctx.lineTo(56,22);ctx.lineTo(-56,22);ctx.lineTo(-65,14);ctx.closePath();ctx.fillStyle=metal;ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#382c24';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#15283b';ctx.fillRect(-59,-8,118,23);
 ctx.strokeStyle='#d1aa62';ctx.lineWidth=.8;ctx.strokeRect(-59,-8,118,23);
 const grad=ctx.createLinearGradient(0,-6,0,8);
 grad.addColorStop(0,ratio<=.3?'#ffac72':ratio<=.7?'#ffe098':'#a0eaff');grad.addColorStop(1,ratio<=.3?'#b83136':ratio<=.7?'#bb7728':'#216ab3');
 ctx.fillStyle='#081421';ctx.fillRect(-55,-5,110,13);ctx.fillStyle=grad;ctx.fillRect(-55,-5,110*ratio,13);
 for(let i=1;i<5;i++){ctx.fillStyle='rgba(6,20,33,.48)';ctx.fillRect(-55+i*22,-5,1,13);}
 ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=2.6;ctx.strokeStyle='#10202f';ctx.fillStyle='#fff6dd';
 const label=breached?'BREACHED':Math.ceil(hp)+' / '+Math.ceil(maxHp);ctx.strokeText(label,0,1.5);ctx.fillText(label,0,1.5);
 ctx.fillStyle='#0a1927';ctx.fillRect(-55,11,110,4);if(sr>0){ctx.fillStyle='#78e4fc';ctx.fillRect(-55,11,110*sr,4);}
 // Tiny blue crystal crest and metal rivets.
 ctx.fillStyle='#e8c681';for(const px of [-61,61]){ctx.beginPath();ctx.arc(px,3,1.6,0,Math.PI*2);ctx.fill();}
 ctx.beginPath();ctx.moveTo(0,-25);ctx.lineTo(8,-16);ctx.lineTo(0,-8);ctx.lineTo(-8,-16);ctx.closePath();ctx.fillStyle=metal;ctx.fill();ctx.strokeStyle='#4d3924';ctx.stroke();
 ctx.beginPath();ctx.moveTo(0,-22);ctx.lineTo(5,-16);ctx.lineTo(0,-11);ctx.lineTo(-5,-16);ctx.closePath();ctx.fillStyle=breached?'#a74742':'#5dc8ff';ctx.fill();
 ctx.font='bold 9px sans-serif';ctx.fillStyle=breached?'#ff9b82':ratio<=.3?'#ffc095':'#e8c984';ctx.textBaseline='bottom';ctx.strokeStyle='#10202f';ctx.lineWidth=2;const title=breached?'TOWER BREACHED':ratio<=.3?'CRITICAL':'TOWER';ctx.strokeText(title,0,-27);ctx.fillText(title,0,-27);
 if(shield?.max>0){ctx.font='bold 9px sans-serif';ctx.textBaseline='top';ctx.fillStyle='#b0ebff';ctx.strokeText('Shield '+Math.ceil(shield.hp)+' / '+Math.ceil(shield.max),0,24);ctx.fillText('Shield '+Math.ceil(shield.hp)+' / '+Math.ceil(shield.max),0,24);}
 ctx.restore();
}
global.MonstersClashTowerUpgrades=Object.freeze({selectEquipment,equip,quote,createShield,purchase,attackStats,update,absorb,renderShield,renderHealth});
})(window);
