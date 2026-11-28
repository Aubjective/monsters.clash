/* Authoritative tower upgrade rules, shield lifecycle and shield rendering. */
(function(global){
'use strict';
function selectEquipment(registry,profile,base){
 const pick=(group,key,def)=>{const list=registry[group];const entry=list.find(x=>x.available!==false&&x.id===profile[key]&&profile[group].includes(x.id))||list.find(x=>x.available!==false&&x.id===def);if(!entry)throw Error('No default '+key);profile[key]=entry.id;return entry;};
 const tower=pick('towers','tower',registry.default_towers.ally),shield=pick('shields','shield',registry.default_shield),drone=pick('drones','drone',registry.default_drone);
 const generator=pick('generators','generator',registry.default_generator);
 const towerWeapon=registry.weapons?.find(w=>w.id===tower.basic_attack?.weapon_id),droneWeapon=registry.weapons?.find(w=>w.id===drone.weapon_id);return {tower,shield,drone,generator,config:{...base,mechanical_limits:registry.mechanical_limits,towerWeapon,droneWeapon,fortress_max_hp:tower.max_hp,upgrade_groups:{attack:tower.upgrades||{},shield:shield.upgrades||{},drone:drone.upgrades||{},generator:generator.upgrades||{}},shield_cost:shield.upgrade_cost,shield_hp:shield.hp_per_level,shield_plate_min:shield.plate_min,shield_plate_max:shield.plate_max,shield_orbit_speed:shield.orbit_speed,shield_render_mode:shield.render_mode||'sprite',shield_sprite:shield.sprite,drone_cost:drone.deploy_cost,drone_max:drone.max_active,drone_damage:drone.damage,drone_damage_type:drone.damage_type,drone_interval:drone.interval_seconds,drone_range:drone.range,drone_sheet_columns:drone.sheet_columns,drone_patrol:drone.patrol,generator_cost:generator.upgrade_cost,generator_income:generator.income_per_level,generator_interval:generator.interval_seconds}};
}
function equip(registry,profile,group,id){
 if(!['towers','shields','drones','generators'].includes(group))return false;const key=group.slice(0,-1),item=registry[group].find(x=>x.id===id);if(!item||item.available===false)return false;
 if(!profile[group].includes(id)){const price=Number(item.unlock_cost);if(!Number.isFinite(price)||price<0||profile.coins<price)return false;profile.coins-=price;profile[group].push(id);}
 profile[key]=id;return true;
}
function quote(run,cfg,kind){
 const entry=Object.values(cfg.upgrade_groups||{}).map(g=>g[kind]).find(Boolean);if(!entry)return null;
 const group=Object.keys(cfg.upgrade_groups).find(g=>cfg.upgrade_groups[g][kind]);const key={attack:'attackLevel',shield:'shieldLevel',drone:'droneLevel',generator:'generatorLevel'}[group];
 const level=Number(run[key])||0;return {kind,key,level,max:Infinity,cost:Math.round((cfg.upgrade_groups[group][group]?.cost||entry.cost)*(1+level*.5)),label:entry.label,step:entry.step};
}
function equipmentStats(run,cfg){
 const value=k=>{const q=quote(run,cfg,k);return q?q.level*q.step:0;};
 return {maxHp:cfg.fortress_max_hp+value('fortress_hp'),shieldMax:value('shield'),shieldRegen:value('shield_regen'),shieldDelay:Math.max(cfg.mechanical_limits.minimum_shield_recovery_seconds,6-value('shield_recovery')),droneDamageType:cfg.drone_damage_type,droneDamage:cfg.drone_damage*(1+value('drone_damage'))+(Number(cfg.droneWeapon?.damage_bonus)||0),droneInterval:Math.max(cfg.mechanical_limits.minimum_attack_interval_seconds,cfg.drone_interval/(1+value('drone_speed'))),droneRange:Math.min(cfg.tower_range_cap||425,cfg.drone_range+value('drone_range')),dronePenetration:Math.min(cfg.mechanical_limits.maximum_penetration_pct,value('drone_penetration')+(Number(cfg.droneWeapon?.penetration_bonus)||0)),generatorIncome:value('generator'),generatorInterval:Math.max(cfg.mechanical_limits.minimum_generator_interval_seconds,cfg.generator_interval/(1+value('generator_speed')))};
}
function createShield(run,cfg){const hp=equipmentStats(run,cfg).shieldMax;return {hp,max:hp,phase:0,flash:0,broken:0,hitAngle:0,recovery:0};}
function purchase(run,shield,cfg,kind){
 const q=quote(run,cfg,kind);if(!q||q.level>=q.max||run.wallet<q.cost)return false;
 if(kind.startsWith('shield_')&&!run.shieldLevel||kind.startsWith('drone_')&&!run.drones||kind==='generator_speed'&&!run.generatorLevel)return false;
 run.wallet-=q.cost;run[q.key]=q.level+1;if(q.key==='droneLevel')run.drones=Math.min(cfg.drone_max,run.droneLevel);
 if(q.key==='shieldLevel'){const old=shield.max;shield.max=equipmentStats(run,cfg).shieldMax;shield.hp=Math.min(shield.max,shield.hp+shield.max-old);shield.flash=.35;shield.broken=0;}
 return true;
}
function attackStats(tower,run,cfg){
 const a=tower?.basic_attack;if(!a)return null;const value=k=>{const q=quote(run,cfg,k);return q?q.level*q.step:0;};
 return {type:a.type,damageType:a.damage_type,range:Math.min(cfg.tower_range_cap||425,(Number(a.range)||190)+value('fortress_range')),damage:(Number(a.damage)||15)*(1+value('attack'))+(Number(cfg.towerWeapon?.damage_bonus)||0),interval:Math.max(cfg.mechanical_limits.minimum_attack_interval_seconds,a.cooldown_seconds/(1+value('fortress_speed'))),arrows:Math.min(cfg.mechanical_limits.maximum_fortress_projectiles,1+value('fortress_projectiles')),penetration:Math.min(cfg.mechanical_limits.maximum_penetration_pct,value('fortress_penetration')+(Number(cfg.towerWeapon?.penetration_bonus)||0)),stun:Math.min(cfg.mechanical_limits.maximum_stun_seconds,value('fortress_stun')),waveWidth:5+value('fortress_range')*.04,...equipmentStats(run,cfg)};
}
function update(shield,dt,cfg,run){shield.phase=(shield.phase+dt*(cfg.shield_orbit_speed||.85))%(Math.PI*2);shield.flash=Math.max(0,shield.flash-dt);shield.broken=Math.max(0,shield.broken-dt);if(run){const stats=equipmentStats(run,cfg);shield.recovery=Math.max(0,(shield.recovery||0)-dt);if(shield.recovery<=0)shield.hp=Math.min(shield.max,shield.hp+stats.shieldRegen*dt);}}
function absorb(shield,damage,delay=6){const used=Math.min(shield.hp,Math.max(0,damage));shield.hp-=used;if(used){shield.recovery=delay;shield.flash=.35;shield.hitAngle=shield.phase;if(shield.hp===0)shield.broken=.65;}return Math.max(0,damage-used);}
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
 if(cfg.shield_render_mode!=='procedural'&&cfg.shield_sprite){let img=shieldImages.get(cfg.shield_sprite);if(!img){img=new Image();img.src=cfg.shield_sprite;shieldImages.set(cfg.shield_sprite,img);}if(img.complete&&img.naturalWidth>0){const hh=height*2,ww=hh*img.naturalWidth/img.naturalHeight;ctx.drawImage(img,-ww/2,-hh/2,ww,hh);if(glow>.08){ctx.globalAlpha=glow*.8;ctx.strokeStyle='#d9faff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,0,ww*.55+(1-flash)*8,hh*.52+(1-flash)*8,0,0,Math.PI*2);ctx.stroke();}ctx.restore();continue;}}
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
 const left=-w/2+w*.225,right=-w/2+w*.85,top=-h/2+h*.415,bottom=-h/2+h*.60;
 ctx.save();ctx.beginPath();ctx.moveTo(left+3,top);ctx.lineTo(right-4,top);ctx.lineTo(right,(top+bottom)/2);ctx.lineTo(right-4,bottom);ctx.lineTo(left+3,bottom);ctx.lineTo(left,(top+bottom)/2);ctx.closePath();ctx.clip();ctx.fillStyle='#131c2a';ctx.fillRect(left,top,right-left,bottom-top);
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
 ctx.font='bold 9px sans-serif';ctx.fillStyle=breached?'#ff9b82':ratio<=.3?'#ffc095':'#e8c984';ctx.textBaseline='bottom';ctx.strokeStyle='#10202f';ctx.lineWidth=2;const title=breached?'FORTRESS BREACHED':ratio<=.3?'CRITICAL':'FORTRESS';ctx.strokeText(title,0,-27);ctx.fillText(title,0,-27);
 if(shield?.max>0){ctx.font='bold 9px sans-serif';ctx.textBaseline='top';ctx.fillStyle='#b0ebff';ctx.strokeText('Shield '+Math.ceil(shield.hp)+' / '+Math.ceil(shield.max),0,24);ctx.fillText('Shield '+Math.ceil(shield.hp)+' / '+Math.ceil(shield.max),0,24);}
 ctx.restore();
}
global.MonstersClashTowerUpgrades=Object.freeze({selectEquipment,equip,quote,equipmentStats,createShield,purchase,attackStats,update,absorb,renderShield,renderHealth});
})(window);
