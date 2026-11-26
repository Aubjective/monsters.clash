/* Authoritative tower upgrade rules, shield lifecycle and shield rendering. */
(function(global){
'use strict';
function selectEquipment(registry,profile,base){
 const pick=(group,key,def)=>{const list=registry[group];const entry=list.find(x=>x.id===profile[key]&&profile[group].includes(x.id))||list.find(x=>x.id===def);if(!entry)throw Error('No default '+key);profile[key]=entry.id;return entry;};
 const tower=pick('towers','tower',registry.default_towers.ally),shield=pick('shields','shield',registry.default_shield),drone=pick('drones','drone',registry.default_drone);
 return {tower,shield,drone,config:{...base,shield_cost:shield.upgrade_cost,shield_hp:shield.hp_per_level,shield_plate_min:shield.plate_min,shield_plate_max:shield.plate_max,shield_orbit_speed:shield.orbit_speed,drone_cost:drone.deploy_cost,drone_max:drone.max_active,drone_damage:drone.damage,drone_interval:drone.interval_seconds,drone_range:drone.range,drone_sheet_columns:drone.sheet_columns}};
}
function equip(registry,profile,group,id){
 if(!['towers','shields','drones'].includes(group))return false;const key=group.slice(0,-1),item=registry[group].find(x=>x.id===id);if(!item)return false;
 if(!profile[group].includes(id)){const price=Number(item.unlock_cost);if(!Number.isFinite(price)||price<0||profile.coins<price)return false;profile.coins-=price;profile[group].push(id);}
 profile[key]=id;return true;
}
function quote(run,cfg,kind){
 if(!['attack','shield','drone'].includes(kind))return null;
 const key=kind==='drone'?'drones':kind==='shield'?'shieldLevel':'attackLevel';
 const level=Number(run[key])||0,max=kind==='drone'?cfg.drone_max:cfg.max_upgrade;
 const base=kind==='drone'?cfg.drone_cost:kind==='shield'?cfg.shield_cost:cfg.attack_cost;
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
function renderShield(ctx,s,level,cfg,x,y,front){
 if(!s)return;
 const rx=80+Math.min(24,level*2.4),ry=98+Math.min(20,level*2),flash=s.flash/.35;
 if(s.hp>0){
 const ratio=s.hp/Math.max(1,s.max),max=Math.min(cfg.shield_plate_max||8,(cfg.shield_plate_min||5)+Math.floor(level/3)),count=Math.max(3,Math.ceil(max*(.55+.45*ratio)));
 for(let i=0;i<count;i++){
 const a=s.phase+i*Math.PI*2/count,depth=Math.sin(a);if((depth>=0)!==front)continue;
 const px=x+Math.cos(a)*rx,py=y+depth*ry*.67;
 const width=(23+level*.75)*(.35+.65*Math.abs(Math.cos(a))),height=(41+level*1.2);
 const glow=Math.max(0,flash*Math.cos(a-s.hitAngle));
 ctx.save();ctx.translate(px,py);ctx.rotate(Math.cos(a)*.16);
 ctx.globalAlpha=(front?.86:.44)*(.7+.3*ratio);ctx.shadowColor='#72dfff';ctx.shadowBlur=5+glow*15;
 const g=ctx.createLinearGradient(-width,-height,width,height);g.addColorStop(0,'rgba(219,250,255,.82)');g.addColorStop(.35,'rgba(77,160,218,.35)');g.addColorStop(.55,'rgba(186,239,255,.54)');g.addColorStop(1,'rgba(39,93,152,.68)');
 ctx.beginPath();ctx.moveTo(0,-height);ctx.lineTo(width,-height*.52);ctx.lineTo(width*.8,height*.47);ctx.lineTo(0,height);ctx.lineTo(-width*.8,height*.47);ctx.lineTo(-width,-height*.52);ctx.closePath();ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=glow>.2?'#efffff':'#8adcf6';ctx.lineWidth=2.1+glow*2;ctx.stroke();ctx.shadowBlur=0;
 ctx.strokeStyle='rgba(236,253,255,.8)';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(-width*.7,-height*.44);ctx.lineTo(0,-height*.8);ctx.lineTo(width*.6,-height*.48);ctx.stroke();
 ctx.strokeStyle='rgba(142,221,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-height*.8);ctx.lineTo(0,height*.76);ctx.moveTo(-width*.7,height*.35);ctx.lineTo(width*.65,-height*.42);ctx.stroke();
 ctx.restore();
 }
 }
 if(front&&s.broken>0){const q=1-s.broken/.65;ctx.save();ctx.globalAlpha=1-q;ctx.fillStyle='#a9eaff';for(let i=0;i<22;i++){const a=i*2.399963+s.hitAngle;const px=x+Math.cos(a)*(rx+45*q),py=y+Math.sin(a)*(ry*.7+45*q);ctx.save();ctx.translate(px,py);ctx.rotate(a+q*5);ctx.beginPath();ctx.moveTo(0,-7);ctx.lineTo(5,1);ctx.lineTo(-3,5);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();}
}
function renderHealth(ctx,x,y,hp,maxHp,shield){
 const ratio=Math.max(0,Math.min(1,hp/Math.max(1,maxHp))),breached=hp<=0;
 const sr=shield?.max>0?Math.max(0,Math.min(1,shield.hp/shield.max)):0;
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
