"use strict";
/* +500 — Everything drawn to the canvas each frame. */

/* ============================================================
   DRAW
   ============================================================ */
function draw(){
  const sx = (Math.random()-0.5) * S.shake;
  const sy = (Math.random()-0.5) * S.shake;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#07080f';
  ctx.fillRect(0,0,VW,VH);
  ctx.save();
  ctx.translate(VW/2 + sx, VH/2 + sy);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);

  // ground
  ctx.fillStyle = '#0d0f1c';
  ctx.fillRect(0,0,WORLD.w,WORLD.h);

  // roads
  for(const r of roads){
    ctx.fillStyle = '#181a2b';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    if(r.w > r.h){
      for(let x = r.x+20; x < r.x+r.w; x += 70) ctx.fillRect(x, r.y + r.h/2 - 2, 36, 4);
    } else {
      for(let y = r.y+20; y < r.y+r.h; y += 70) ctx.fillRect(r.x + r.w/2 - 2, y, 4, 36);
    }
  }

  // park
  ctx.fillStyle = S.act === 1 ? '#15291f' : '#131c19';
  ctx.fillRect(park.x, park.y, park.w, park.h);
  ctx.fillStyle = S.act === 1 ? '#1d3a2a' : '#17251d';
  for(let i=0;i<7;i++){
    const tx = park.x + 40 + (i*57)%(park.w-70), ty = park.y + 40 + (i*93)%(park.h-70);
    ctx.beginPath(); ctx.arc(tx, ty, 22, 0, 7); ctx.fill();
  }

  // parking lot
  ctx.fillStyle = '#151726';
  ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 2;
  for(let x = lot.x+30; x < lot.x+lot.w; x += 80){
    ctx.beginPath(); ctx.moveTo(x, lot.y+10); ctx.lineTo(x, lot.y+100); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, lot.y+150); ctx.lineTo(x, lot.y+240); ctx.stroke();
  }

  // crosswalks
  ctx.fillStyle = 'rgba(232,233,243,.13)';
  for(const cw of crosswalks){
    for(let i = 0; i < cw.h; i += 18) ctx.fillRect(cw.x, cw.y + i, cw.w, 9);
  }

  // street lamps pools
  for(const [lx,ly] of lampPosts){
    const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 150);
    const warm = S.act === 3 ? 'rgba(255,179,71,.10)' : 'rgba(255,200,120,.16)';
    g.addColorStop(0, warm); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 150, 0, 7); ctx.fill();
  }

  // street furniture
  drawProps();

  // parked cars
  for(const c of parkedCars){
    if(c.stolen && S.flags.carStolen) continue;
    drawCar(c.x, c.y, c.c);
  }
  if(S.flags.carStolen && S.act >= 2){
    ctx.strokeStyle = 'rgba(255,46,136,.5)'; ctx.setLineDash([8,8]); ctx.lineWidth = 2;
    ctx.strokeRect(1620-23, 690-39, 46, 78); ctx.setLineDash([]);
  }

  // police cars
  for(const pc of policeCars) drawCar(pc.x, pc.y, '#22304d', true);

  // ambulance in act 2/3
  if(S.flags.npcInjured && S.act >= 2){
    ctx.fillStyle = '#e8e9f3'; ctx.fillRect(1196, 380, 60, 100);
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(1216, 415, 20, 6); ctx.fillRect(1223, 408, 6, 20);
    const blink = Math.sin(S.time*7) > 0;
    ctx.fillStyle = blink ? '#ff4d4d' : '#3b6cff';
    ctx.fillRect(1208, 372, 36, 8);
    const g = ctx.createRadialGradient(1226, 376, 2, 1226, 376, 120);
    g.addColorStop(0, blink ? 'rgba(255,77,77,.25)' : 'rgba(59,108,255,.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(1226, 376, 120, 0, 7); ctx.fill();
  }

  // buildings
  for(const b of buildings) drawBuilding(b);

  // markers
  for(const it of interactables()) drawMarker(it.x, it.y);

  // people
  const people = crowd.concat([NPC.owner, NPC.fighter, NPC.carOwn, NPC.kid, NPC.cop]);
  people.sort((a,b)=>a.y-b.y);
  for(const n of people){
    if(n.hidden) continue;
    if(n === NPC.fighter && n.state === 'down'){ drawDown(n); continue; }
    if(n === NPC.owner && S.act >= 2){ drawPerson(n, true); continue; }
    if(n === NPC.cop && S.act === 1) continue;
    drawPerson(n);
  }

  // player
  if(S.driving) drawCar(P.x, P.y, '#6a3b52');
  else drawPlayer();

  // particles
  for(const p of particles){
    ctx.globalAlpha = Math.max(0, 1 - p.t/p.life);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.sz/2, p.y - p.sz/2, p.sz, p.sz);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // ---- screen-space overlays ----
  // payout flash
  if(S.flash > 0){
    ctx.fillStyle = 'rgba(61,255,139,' + (S.flash*0.14) + ')';
    ctx.fillRect(0,0,VW,VH);
  }
  // cool darkening after the reveal
  if(S.dark > 0){
    ctx.fillStyle = 'rgba(10,16,40,' + (S.dark*0.55) + ')';
    ctx.fillRect(0,0,VW,VH);
  }
  // rain
  if(S.rain > 0){
    ctx.strokeStyle = 'rgba(190,205,255,' + (0.18 * S.rain) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(const d of rainDrops){ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 4, d.y + d.l); }
    ctx.stroke();
  }
  // off-screen objective arrow
  const it = interactables()[0];
  if(it && S.phase === 'play' && !S.busy) drawArrow(it);
}

function drawBuilding(b){
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(b.x + 8, b.y + 12, b.w, b.h);
  ctx.fillStyle = b.wall;
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = b.roof;
  ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);

  // windows
  const dead = (b.id === 'store' && S.flags.robbedStore && S.act >= 2);
  for(let y = b.y + 18; y < b.y + b.h - 26; y += 34){
    for(let x = b.x + 18; x < b.x + b.w - 26; x += 34){
      const on = ((x*31 + y*17) % 7) > (S.act === 3 ? 4 : 2);
      ctx.fillStyle = dead ? '#0f1120' : (on ? (S.act === 3 ? 'rgba(255,196,120,.35)' : 'rgba(255,214,150,.55)') : '#12142a');
      ctx.fillRect(x, y, 16, 12);
    }
  }
  // neon sign
  if(b.sign){
    const dim = dead;
    ctx.save();
    ctx.globalAlpha = dim ? 0.18 : 1;
    ctx.fillStyle = dim ? '#4a4f70' : b.signColor;
    ctx.font = '700 18px "Anton", sans-serif';
    ctx.textAlign = 'center';
    if(!dim){ ctx.shadowColor = b.signColor; ctx.shadowBlur = 18; }
    ctx.fillText(b.sign, b.x + b.w/2, b.y + b.h + 22);
    ctx.restore();
  }
  // closed notice
  if(dead){
    ctx.save();
    ctx.fillStyle = '#e8e9f3';
    ctx.fillRect(b.x + b.w/2 - 34, b.y + b.h - 18, 68, 26);
    ctx.fillStyle = '#0a0b14';
    ctx.font = '700 15px "Anton", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CLOSED', b.x + b.w/2, b.y + b.h + 1);
    ctx.restore();
  }
}

function drawProps(){
  const shade = S.act === 3 ? 0.65 : 1;
  for(const p of props){
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    if(p.t === 'dumpster'){
      ctx.fillRect(p.x - 20, p.y - 6, 46, 26);
      ctx.fillStyle = '#2a4438'; ctx.fillRect(p.x - 24, p.y - 16, 46, 26);
      ctx.fillStyle = '#35533f'; ctx.fillRect(p.x - 24, p.y - 16, 46, 7);
    } else if(p.t === 'bench'){
      ctx.fillRect(p.x - 20, p.y - 2, 44, 12);
      ctx.fillStyle = '#4a3b2e'; ctx.fillRect(p.x - 22, p.y - 8, 44, 12);
      ctx.fillStyle = '#5c4a39'; ctx.fillRect(p.x - 22, p.y - 14, 44, 5);
    } else if(p.t === 'hydrant'){
      ctx.fillRect(p.x - 4, p.y + 2, 12, 6);
      ctx.fillStyle = '#8c3448'; ctx.fillRect(p.x - 5, p.y - 12, 10, 16);
      ctx.fillRect(p.x - 8, p.y - 8, 16, 4);
    } else if(p.t === 'trash'){
      ctx.fillRect(p.x - 8, p.y + 2, 20, 7);
      ctx.fillStyle = '#31344f'; ctx.fillRect(p.x - 9, p.y - 12, 18, 16);
      ctx.fillStyle = '#3c4060'; ctx.fillRect(p.x - 11, p.y - 14, 22, 4);
    } else if(p.t === 'planter'){
      ctx.fillRect(p.x - 12, p.y - 2, 28, 12);
      ctx.fillStyle = '#3a3550'; ctx.fillRect(p.x - 14, p.y - 10, 28, 14);
      ctx.fillStyle = S.act === 1 ? '#2f6a45' : '#2a4535';
      ctx.beginPath(); ctx.arc(p.x, p.y - 16, 11, 0, 7); ctx.fill();
    } else if(p.t === 'stop'){
      ctx.fillRect(p.x - 3, p.y - 2, 10, 6);
      ctx.fillStyle = '#2b2f4d'; ctx.fillRect(p.x - 3, p.y - 52, 5, 52);
      ctx.fillStyle = shade > 0.8 ? '#ffb347' : '#6b6650';
      ctx.fillRect(p.x - 16, p.y - 62, 34, 14);
    }
  }
  // lamp posts, drawn after the light pools so the pole reads on top
  for(const [lx,ly] of lampPosts){
    ctx.fillStyle = '#20233c';
    ctx.fillRect(lx - 3, ly - 44, 6, 44);
    ctx.fillStyle = S.act === 3 ? 'rgba(255,179,71,.55)' : 'rgba(255,214,150,.9)';
    ctx.fillRect(lx - 9, ly - 52, 18, 9);
  }
}

function drawCar(x, y, color, police){
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(x - 21, y - 34, 46, 78);
  ctx.fillStyle = color;
  ctx.fillRect(x - 23, y - 39, 46, 78);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(x - 17, y - 28, 34, 22);
  ctx.fillRect(x - 17, y + 6, 34, 20);
  if(police){
    const blink = Math.sin(S.time*10) > 0;
    ctx.fillStyle = blink ? '#ff4d4d' : '#3b6cff';
    ctx.fillRect(x - 16, y - 4, 32, 7);
    const g = ctx.createRadialGradient(x, y, 2, x, y, 110);
    g.addColorStop(0, blink ? 'rgba(255,77,77,.22)' : 'rgba(59,108,255,.22)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 110, 0, 7); ctx.fill();
  }
}

function drawPerson(n, sitting){
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 12, 11, 5, 0, 0, 7); ctx.fill();
  if(sitting){
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 9, n.y - 6, 18, 18);
    ctx.beginPath(); ctx.arc(n.x, n.y - 13, 7, 0, 7); ctx.fill();
    return;
  }
  const bob = Math.sin((n.walk || 0) * 6) * 1.5;
  const lean = n.mode === 'flee' ? (n.face || 1) * 2.5 : 0;
  ctx.fillStyle = n.c;
  ctx.fillRect(n.x - 8 + lean, n.y - 14 + bob, 16, 24);
  ctx.beginPath(); ctx.arc(n.x + lean, n.y - 20 + bob, 7.5, 0, 7); ctx.fill();
  if(n.mode === 'flee'){
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = '700 15px "Anton", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', n.x, n.y - 32 + bob);
  } else if(S.act === 3 && n.avoiding > 0){
    ctx.fillStyle = 'rgba(200,210,245,.45)';
    ctx.beginPath(); ctx.arc(n.x, n.y - 34, 2.5, 0, 7); ctx.fill();
  }
}

function drawDown(n){
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 8, 18, 7, 0, 0, 7); ctx.fill();
  ctx.fillStyle = n.c;
  ctx.fillRect(n.x - 18, n.y - 4, 36, 14);
  ctx.beginPath(); ctx.arc(n.x - 22, n.y + 3, 7, 0, 7); ctx.fill();
}

function drawPlayer(){
  const spd = Math.hypot(P.vx, P.vy);
  // grounding ring — the one silhouette the eye should always find
  ctx.strokeStyle = S.act === 3 ? 'rgba(160,172,215,.35)' : 'rgba(255,46,136,.45)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 15, 6.5, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 13, 12, 5, 0, 0, 7); ctx.fill();

  const bob = Math.sin(P.walk * 6) * (1.4 + S.sprint);
  const lean = P.face * S.sprint * 3;
  ctx.save();
  ctx.translate(lean, 0);
  // body
  ctx.fillStyle = S.act === 3 ? '#cfd4ee' : '#f6f7ff';
  ctx.fillRect(P.x - 9, P.y - 17 + bob, 18, 28);
  ctx.strokeStyle = 'rgba(8,9,17,.85)'; ctx.lineWidth = 2;
  ctx.strokeRect(P.x - 9, P.y - 17 + bob, 18, 28);
  // jacket band
  ctx.fillStyle = S.act === 3 ? '#2a2f4d' : '#ff2e88';
  ctx.fillRect(P.x - 9, P.y - 5 + bob, 18, 7);
  // legs
  const swing = Math.sin(P.walk * 6) * Math.min(5, spd * 0.03);
  ctx.fillStyle = '#20233c';
  ctx.fillRect(P.x - 8, P.y + 9 + bob, 6, 5 + swing);
  ctx.fillRect(P.x + 2, P.y + 9 + bob, 6, 5 - swing);
  // head
  ctx.fillStyle = '#ffe1c4';
  ctx.beginPath(); ctx.arc(P.x + P.face*1.5, P.y - 24 + bob, 8, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(8,9,17,.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(P.x + P.face*1.5, P.y - 24 + bob, 8, 0, 7); ctx.stroke();
  ctx.restore();
}

function drawMarker(x, y){
  const t = (S.time*2) % 1;
  const col = S.act === 1 ? '61,255,139' : (S.act === 2 ? '255,179,71' : '232,233,243');
  ctx.strokeStyle = 'rgba(' + col + ',' + (0.9 - t*0.9) + ')';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, 16 + t*32, 8 + t*16, 0, 0, 7); ctx.stroke();
  const g = ctx.createLinearGradient(x, y - 90, x, y);
  g.addColorStop(0, 'rgba(' + col + ',0)');
  g.addColorStop(1, 'rgba(' + col + ',.28)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 11, y - 90, 22, 90);
}

function drawArrow(it){
  const dx = (it.x - cam.x) * cam.z, dy = (it.y - cam.y) * cam.z;
  if(Math.abs(dx) < VW/2 - 60 && Math.abs(dy) < VH/2 - 60) return;
  const a = Math.atan2(dy, dx);
  const r = 210;
  const ax = VW/2 + Math.cos(a)*r, ay = VH/2 + Math.sin(a)*r;
  ctx.save();
  ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = S.act === 1 ? '#3dff8b' : '#e8e9f3';
  ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.moveTo(14,0); ctx.lineTo(-10,9); ctx.lineTo(-10,-9); ctx.closePath(); ctx.fill();
  ctx.restore();
}
