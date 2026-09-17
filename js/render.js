"use strict";
/* +500 — Everything drawn to the canvas each frame. High-fidelity neo-noir graphics. */

/* ============================================================
   DRAW MAIN LOOP
   ============================================================ */
function draw(){
  const sx = (Math.random()-0.5) * S.shake;
  const sy = (Math.random()-0.5) * S.shake;
  ctx.setTransform(1,0,0,1,0,0);
  ctx.fillStyle = '#06070d';
  ctx.fillRect(0,0,VW,VH);
  ctx.save();
  ctx.translate(VW/2 + sx, VH/2 + sy);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);

  // 1. Ground base
  ctx.fillStyle = '#0a0c18';
  ctx.fillRect(0,0,WORLD.w,WORLD.h);

  // 2. Sidewalks with curbs and paver grid
  drawSidewalks();

  // 3. Roads, crosswalks, parking lot, park
  drawRoadsAndGround();

  // 4. Utilities (manholes, storm drain grates)
  drawUtilities();

  // 5. Skid marks from vehicles
  if(skidMarks.length > 0){
    ctx.strokeStyle = 'rgba(10,12,22,.65)'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    for(const sm of skidMarks){
      ctx.beginPath(); ctx.moveTo(sm.x1, sm.y1); ctx.lineTo(sm.x2, sm.y2); ctx.stroke();
    }
  }

  // 6. Neon reflections on wet asphalt (drawn before props/cars)
  drawNeonReflections();

  // 7. Street lamp warm light pools & specular highlights
  drawLightPools();

  // 8. Ground props (vending machines, sidewalk signs, dumpsters, benches, hydrants)
  drawProps();

  // 9. Street trees with cast-iron sidewalk grates and volumetric canopies
  drawTrees();

  // 10. Parked & ambient cars
  for(const c of parkedCars){
    if(c.stolen && S.flags.carStolen) continue;
    drawCar(c.x, c.y, c.c, c.type||'sedan');
  }
  if(S.flags.carStolen && S.act >= 2){
    ctx.strokeStyle = 'rgba(255,46,136,.6)'; ctx.setLineDash([8,8]); ctx.lineWidth = 2;
    ctx.strokeRect(1620-24, 690-41, 48, 82); ctx.setLineDash([]);
  }

  // 11. Police cars & Ambulance
  for(const pc of policeCars) drawCar(pc.x, pc.y, '#1b2238', 'police', true);
  if(S.flags.npcInjured && S.act >= 2) drawAmbulance(1196, 380);

  // 12. Buildings & Storefronts
  for(const b of buildings) drawBuilding(b);

  // 13. Lamp post poles & lanterns (drawn over sidewalks/roads)
  drawLampPoles();

  // 14. Objective Markers
  for(const it of interactables()) drawMarker(it.x, it.y);

  // 15. People & NPCs (sorted by y-depth)
  const people = crowd.concat([NPC.owner, NPC.fighter, NPC.carOwn, NPC.kid, NPC.cop, NPC.witness]);
  people.sort((a,b)=>a.y-b.y);
  for(const n of people){
    if(n.hidden) continue;
    if(n === NPC.fighter && n.state === 'down'){ drawDown(n); continue; }
    if(n === NPC.owner && S.act >= 2 && n.state !== 'crying'){ drawPerson(n, true); continue; }
    if(n === NPC.cop && S.act === 1) continue;
    drawPerson(n);
  }

  // 16. Player
  if(!P.hidden){
    if(S.driving) drawCar(P.x, P.y, '#6a3b52', 'sports', false, true);
    else drawPlayer();
  }

  // 17. Particles
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
    ctx.fillStyle = 'rgba(61,255,139,' + (S.flash*0.15) + ')';
    ctx.fillRect(0,0,VW,VH);
  }
  // cool darkening after the reveal
  if(S.dark > 0){
    ctx.fillStyle = 'rgba(8,12,30,' + (S.dark*0.58) + ')';
    ctx.fillRect(0,0,VW,VH);
  }
  // rain streaks & ground splashes
  if(S.rain > 0){
    ctx.strokeStyle = 'rgba(190,215,255,' + (0.22 * S.rain) + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(const d of rainDrops){ ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 5, d.y + d.l); }
    ctx.stroke();
  }
  // off-screen objective arrow
  const it = interactables()[0];
  if(it && S.phase === 'play' && !S.busy) drawArrow(it);
}

/* ============================================================
   SIDEWALKS & ROADS
   ============================================================ */
function drawSidewalks(){
  ctx.fillStyle = S.act === 3 ? '#161828' : '#1c1f32';
  for(const sw of (typeof sidewalks !== 'undefined' ? sidewalks : [])){
    ctx.fillRect(sw.x, sw.y, sw.w, sw.h);
    // paver grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,.03)';
    ctx.lineWidth = 1;
    if(sw.w > sw.h){
      for(let x = sw.x; x < sw.x + sw.w; x += 40){
        ctx.beginPath(); ctx.moveTo(x, sw.y); ctx.lineTo(x, sw.y + sw.h); ctx.stroke();
      }
    } else {
      for(let y = sw.y; y < sw.y + sw.h; y += 40){
        ctx.beginPath(); ctx.moveTo(sw.x, y); ctx.lineTo(sw.x + sw.w, y); ctx.stroke();
      }
    }
    // raised stone curbs with bevel edge & drop shadow
    if(sw.curb === 'bottom'){
      ctx.fillStyle = '#2d324d'; ctx.fillRect(sw.x, sw.y + sw.h - 4, sw.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sw.x, sw.y + sw.h, sw.w, 3);
    } else if(sw.curb === 'top'){
      ctx.fillStyle = '#2d324d'; ctx.fillRect(sw.x, sw.y, sw.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sw.x, sw.y - 3, sw.w, 3);
    } else if(sw.curb === 'right'){
      ctx.fillStyle = '#2d324d'; ctx.fillRect(sw.x + sw.w - 4, sw.y, 4, sw.h);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sw.x + sw.w, sw.y, 3, sw.h);
    } else if(sw.curb === 'left'){
      ctx.fillStyle = '#2d324d'; ctx.fillRect(sw.x, sw.y, 4, sw.h);
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(sw.x - 3, sw.y, 3, sw.h);
    }
  }
}

function drawRoadsAndGround(){
  // roads asphalt
  for(const r of roads){
    ctx.fillStyle = '#131522';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // road lane dividers (dashed yellow/white)
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    if(r.w > r.h){
      // horizontal road
      const midY = r.y + r.h/2;
      for(let x = r.x + 20; x < r.x + r.w; x += 65) ctx.fillRect(x, midY - 2, 34, 4);
      // boundary lane edge lines
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(r.x, r.y + 6, r.w, 2);
      ctx.fillRect(r.x, r.y + r.h - 8, r.w, 2);
    } else {
      // vertical avenue
      const midX = r.x + r.w/2;
      for(let y = r.y + 20; y < r.y + r.h; y += 65) ctx.fillRect(midX - 2, y, 4, 34);
      ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(r.x + 6, r.y, 2, r.h);
      ctx.fillRect(r.x + r.w - 8, r.y, 2, r.h);
    }
  }

  // park with lush lawn and garden paths
  ctx.fillStyle = S.act === 1 ? '#13281c' : '#101c18';
  ctx.fillRect(park.x, park.y, park.w, park.h);
  // park path
  ctx.fillStyle = '#1e1c1a';
  ctx.fillRect(park.x + 30, park.y + park.h/2 - 14, park.w - 60, 28);
  ctx.fillRect(park.x + park.w/2 - 14, park.y + 30, 28, park.h - 60);

  // parking lot with stalls and oil stains
  ctx.fillStyle = '#111320';
  ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
  ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 2.5;
  for(let x = lot.x + 30; x < lot.x + lot.w; x += 80){
    ctx.beginPath(); ctx.moveTo(x, lot.y + 12); ctx.lineTo(x, lot.y + 105); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, lot.y + 145); ctx.lineTo(x, lot.y + 238); ctx.stroke();
    // oil stain in stall
    ctx.fillStyle = 'rgba(5,7,14,.55)';
    ctx.beginPath(); ctx.ellipse(x + 40, lot.y + 60, 14, 8, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 40, lot.y + 190, 14, 8, 0, 0, 7); ctx.fill();
  }
  // parking lot entrance line
  ctx.fillStyle = 'rgba(255,179,71,.3)'; ctx.fillRect(lot.x, lot.y + lot.h - 4, lot.w, 4);

  // crosswalks with textured zebra stripes
  for(const cw of crosswalks){
    ctx.fillStyle = 'rgba(235,238,252,.18)';
    for(let i = 0; i < cw.h; i += 18){
      ctx.fillRect(cw.x, cw.y + i, cw.w, 10);
      // subtle border edge
      ctx.fillStyle = 'rgba(255,255,255,.24)';
      ctx.fillRect(cw.x, cw.y + i, 2, 10);
      ctx.fillRect(cw.x + cw.w - 2, cw.y + i, 2, 10);
      ctx.fillStyle = 'rgba(235,238,252,.18)';
    }
  }
}

function drawUtilities(){
  // manhole covers
  if(typeof manholes !== 'undefined'){
    for(const m of manholes){
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.beginPath(); ctx.arc(m.x + 2, m.y + 2, 14, 0, 7); ctx.fill();
      ctx.fillStyle = '#22253a';
      ctx.beginPath(); ctx.arc(m.x, m.y, 13, 0, 7); ctx.fill();
      ctx.strokeStyle = '#323754'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(m.x, m.y, 9, 0, 7); ctx.stroke();
      ctx.fillStyle = '#3a4060';
      ctx.fillRect(m.x - 4, m.y - 4, 8, 8);
    }
  }
  // storm drain grates
  if(typeof drainGrates !== 'undefined'){
    for(const dg of drainGrates){
      ctx.fillStyle = '#10121c'; ctx.fillRect(dg.x - 12, dg.y - 4, 24, 8);
      ctx.fillStyle = '#2b3048';
      for(let gx = dg.x - 10; gx < dg.x + 10; gx += 4) ctx.fillRect(gx, dg.y - 4, 2, 8);
    }
  }
}

/* ============================================================
   LIGHTING & NEON REFLECTIONS
   ============================================================ */
function drawNeonReflections(){
  // Maria's neon reflection
  const g1 = ctx.createLinearGradient(310, 410, 310, 560);
  g1.addColorStop(0, S.flags.robbedStore && S.act >= 2 ? 'rgba(255,46,136,.02)' : 'rgba(255,46,136,.14)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(200, 420, 220, 130);

  // Pawn Shop amber reflection
  const g2 = ctx.createLinearGradient(1380, 340, 1380, 520);
  g2.addColorStop(0, 'rgba(255,179,71,.12)'); g2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(1280, 350, 200, 120);

  // Police Station blue reflection
  const g3 = ctx.createLinearGradient(1550, 1040, 1550, 940);
  g3.addColorStop(0, 'rgba(94,169,255,.14)'); g3.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g3;
  ctx.fillRect(1420, 960, 240, 90);
}

function drawLightPools(){
  for(const [lx,ly] of lampPosts){
    const g = ctx.createRadialGradient(lx, ly, 4, lx, ly, 160);
    const warm1 = S.act === 3 ? 'rgba(255,179,71,.12)' : 'rgba(255,214,140,.20)';
    const warm2 = S.act === 3 ? 'rgba(255,140,40,.04)' : 'rgba(255,160,60,.06)';
    g.addColorStop(0, warm1);
    g.addColorStop(0.5, warm2);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, 160, 0, 7); ctx.fill();

    // ground specular highlight right beneath the lamp
    ctx.fillStyle = 'rgba(255,240,200,.18)';
    ctx.beginPath(); ctx.ellipse(lx, ly + 2, 12, 5, 0, 0, 7); ctx.fill();
  }
}

function drawLampPoles(){
  for(const [lx,ly] of lampPosts){
    // cast shadow
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(lx + 4, ly + 2, 8, 4, 0, 0, 7); ctx.fill();
    // ornate cast-iron base
    ctx.fillStyle = '#181a2e'; ctx.fillRect(lx - 5, ly - 8, 10, 8);
    // pole
    ctx.fillStyle = '#22253f'; ctx.fillRect(lx - 3, ly - 48, 6, 42);
    // crossarm bracket
    ctx.fillStyle = '#2d3152'; ctx.fillRect(lx - 9, ly - 42, 18, 4);
    // glass lantern housing
    ctx.fillStyle = '#1c1e33'; ctx.fillRect(lx - 8, ly - 56, 16, 10);
    // glowing filament
    const glow = S.act === 3 ? 'rgba(255,179,71,.9)' : 'rgba(255,230,170,.95)';
    ctx.fillStyle = glow; ctx.fillRect(lx - 6, ly - 54, 12, 7);
  }
}

/* ============================================================
   BUILDINGS & STOREFRONTS
   ============================================================ */
function drawBuilding(b){
  // building mass drop shadow
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(b.x + 10, b.y + 14, b.w, b.h);

  // facade wall
  ctx.fillStyle = b.wall;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  // roof body
  ctx.fillStyle = b.roof;
  ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);

  // roof parapet coping trim
  ctx.strokeStyle = '#313658'; ctx.lineWidth = 3;
  ctx.strokeRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);

  // rooftop HVAC air conditioning units & vents
  ctx.fillStyle = '#16182a';
  ctx.fillRect(b.x + 22, b.y + 22, 28, 22);
  ctx.fillStyle = '#252945';
  ctx.fillRect(b.x + 24, b.y + 24, 24, 18);
  ctx.fillStyle = '#121422';
  ctx.beginPath(); ctx.arc(b.x + 36, b.y + 33, 6, 0, 7); ctx.fill();

  // upper floor windows
  const dead = (b.id === 'store' && S.flags.robbedStore && S.act >= 2);
  for(let y = b.y + 18; y < b.y + b.h - 52; y += 34){
    for(let x = b.x + 18; x < b.x + b.w - 26; x += 36){
      const on = ((x*31 + y*17) % 7) > (S.act === 3 ? 4 : 2);
      // window frame
      ctx.fillStyle = '#0f1120'; ctx.fillRect(x - 2, y - 2, 20, 16);
      // glass with warm interior glow
      ctx.fillStyle = dead ? '#121424' : (on ? (S.act === 3 ? 'rgba(255,196,120,.35)' : 'rgba(255,214,150,.65)') : '#181b32');
      ctx.fillRect(x, y, 16, 12);
      // window sash bar
      ctx.fillStyle = '#22253f';
      ctx.fillRect(x + 7, y, 2, 12); ctx.fillRect(x, y + 5, 16, 2);
      // stone window sill
      ctx.fillStyle = '#3a3f66'; ctx.fillRect(x - 3, y + 12, 22, 3);
    }
  }

  // ground floor storefront details
  if(b.id === 'store'){
    drawStorefrontMaria(b, dead);
  } else if(b.sign){
    // standard commercial neon sign
    const dim = dead;
    ctx.save();
    ctx.globalAlpha = dim ? 0.2 : 1;
    ctx.fillStyle = dim ? '#4a4f70' : b.signColor;
    ctx.font = '700 20px "Anton", sans-serif';
    ctx.textAlign = 'center';
    if(!dim){ ctx.shadowColor = b.signColor; ctx.shadowBlur = 20; }
    ctx.fillText(b.sign, b.x + b.w/2, b.y + b.h + 22);
    ctx.restore();
  }
}

function drawStorefrontMaria(b, isClosed){
  const gx = b.x + 16, gy = b.y + b.h - 48, gw = b.w - 32, gh = 44;

  if(!isClosed){
    // storefront glass
    ctx.fillStyle = 'rgba(255,214,150,.25)';
    ctx.fillRect(gx, gy, gw, gh);
    // interior merchandise shelves
    ctx.fillStyle = 'rgba(255,230,170,.45)';
    ctx.fillRect(gx + 10, gy + 12, 60, 6);
    ctx.fillRect(gx + 10, gy + 24, 60, 6);
    ctx.fillRect(gx + 90, gy + 12, 70, 6);
    ctx.fillRect(gx + 90, gy + 24, 70, 6);
    // glass frame
    ctx.strokeStyle = '#323758'; ctx.lineWidth = 3;
    ctx.strokeRect(gx, gy, gw, gh);
    // entrance door
    ctx.fillStyle = '#1c2038'; ctx.fillRect(gx + gw/2 - 18, gy + 4, 36, gh - 4);
    ctx.strokeStyle = '#4e5684'; ctx.lineWidth = 1.5;
    ctx.strokeRect(gx + gw/2 - 18, gy + 4, 36, gh - 4);
    ctx.fillStyle = '#ffd9a0'; ctx.fillRect(gx + gw/2 + 8, gy + 20, 3, 6); // handle

    // striped fabric awning
    const awY = gy - 12;
    for(let ax = gx - 6; ax < gx + gw + 6; ax += 18){
      ctx.fillStyle = (Math.floor(ax/18) % 2 === 0) ? '#ff2e88' : '#1e2440';
      ctx.fillRect(ax, awY, 18, 14);
    }
    ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(gx - 6, awY + 14, gw + 12, 4);
  } else {
    // rolled down corrugated metal security shutter
    ctx.fillStyle = '#1e2136';
    ctx.fillRect(gx, gy, gw, gh);
    ctx.strokeStyle = '#141624'; ctx.lineWidth = 1.5;
    for(let sy = gy; sy < gy + gh; sy += 5){
      ctx.beginPath(); ctx.moveTo(gx, sy); ctx.lineTo(gx + gw, sy); ctx.stroke();
    }
    ctx.strokeStyle = '#323758'; ctx.lineWidth = 3;
    ctx.strokeRect(gx, gy, gw, gh);

    // taped "CLOSED" paper sign
    ctx.save();
    ctx.fillStyle = '#e8e9f3';
    ctx.fillRect(b.x + b.w/2 - 38, gy + 10, 76, 26);
    ctx.fillStyle = '#0a0b14';
    ctx.font = '700 15px "Anton", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('CLOSED', b.x + b.w/2, gy + 28);
    ctx.restore();
  }

  // glowing "MARIA'S CONVENIENCE" neon sign
  ctx.save();
  ctx.globalAlpha = isClosed ? 0.2 : 1;
  ctx.fillStyle = isClosed ? '#4a4f70' : '#ff2e88';
  ctx.font = '700 24px "Anton", sans-serif';
  ctx.textAlign = 'center';
  if(!isClosed){ ctx.shadowColor = '#ff2e88'; ctx.shadowBlur = 24; }
  ctx.fillText("MARIA'S", b.x + b.w/2, b.y + b.h + 24);
  ctx.font = '600 10px "IBM Plex Sans", sans-serif';
  ctx.fillStyle = isClosed ? '#3a3f55' : '#ffd9a0';
  ctx.shadowBlur = 0;
  ctx.fillText("CONVENIENCE · GROCERY", b.x + b.w/2, b.y + b.h + 38);
  ctx.restore();
}

/* ============================================================
   PROPS, TREES & STREET FURNITURE
   ============================================================ */
function drawTrees(){
  if(typeof trees === 'undefined') return;
  const wind = Math.sin(S.time * 2.2) * 2;
  for(const t of trees){
    // cast-iron sidewalk tree grate
    if(t.grate){
      ctx.fillStyle = '#1c2033'; ctx.fillRect(t.x - 14, t.y - 14, 28, 28);
      ctx.strokeStyle = '#2d3350'; ctx.lineWidth = 1.5;
      ctx.strokeRect(t.x - 14, t.y - 14, 28, 28);
      ctx.fillStyle = '#10121e';
      ctx.beginPath(); ctx.arc(t.x, t.y, 7, 0, 7); ctx.fill();
    }
    // tree drop shadow
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(t.x + 8, t.y + 10, t.r * 1.1, t.r * 0.55, 0, 0, 7); ctx.fill();

    // tree trunk
    ctx.fillStyle = '#2e2016';
    ctx.fillRect(t.x - 4, t.y - 10, 8, 14);

    // leafy canopy clusters (3 volumetric layers)
    const sway = wind * (t.r / 25);
    const col1 = S.act === 1 ? '#183824' : '#142a1e';
    const col2 = S.act === 1 ? '#235235' : '#1b3b2a';
    const col3 = S.act === 1 ? '#2f6e47' : '#234f37';

    // base dark cluster
    ctx.fillStyle = col1;
    ctx.beginPath(); ctx.arc(t.x + sway*0.5, t.y - 20, t.r, 0, 7); ctx.fill();
    // mid cluster
    ctx.fillStyle = col2;
    ctx.beginPath(); ctx.arc(t.x - 8 + sway, t.y - 26, t.r * 0.75, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(t.x + 8 + sway, t.y - 24, t.r * 0.75, 0, 7); ctx.fill();
    // top highlight cluster
    ctx.fillStyle = col3;
    ctx.beginPath(); ctx.arc(t.x + sway*1.2, t.y - 32, t.r * 0.55, 0, 7); ctx.fill();
  }
}

function drawProps(){
  // vending machines
  if(typeof vendingMachines !== 'undefined'){
    for(const vm of vendingMachines){
      // drop shadow
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(vm.x - 2, vm.y + vm.h - 4, vm.w + 4, 8);
      // cabinet
      ctx.fillStyle = '#1c2035'; ctx.fillRect(vm.x, vm.y, vm.w, vm.h);
      // illuminated header
      ctx.fillStyle = vm.c; ctx.fillRect(vm.x + 3, vm.y + 4, vm.w - 6, 8);
      ctx.save(); ctx.shadowColor = vm.c; ctx.shadowBlur = 10;
      ctx.fillStyle = '#fff'; ctx.font = '700 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(vm.sign, vm.x + vm.w/2, vm.y + 11);
      ctx.restore();
      // display window with illuminated can rows
      ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(vm.x + 3, vm.y + 14, vm.w - 6, 16);
      for(let cy = vm.y + 16; cy < vm.y + 28; cy += 6){
        for(let cx = vm.x + 5; cx < vm.x + vm.w - 6; cx += 5){
          ctx.fillStyle = (cx % 2 === 0) ? '#ff3366' : '#00d2ff';
          ctx.fillRect(cx, cy, 3, 4);
        }
      }
      // dispensing slot
      ctx.fillStyle = '#0a0c16'; ctx.fillRect(vm.x + 4, vm.y + vm.h - 8, vm.w - 8, 5);
    }
  }

  // sidewalk A-frame chalkboard sign
  if(typeof sidewalkSigns !== 'undefined'){
    for(const ss of sidewalkSigns){
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(ss.x - 2, ss.y + 22, 26, 6);
      // wooden frame
      ctx.fillStyle = '#422f20'; ctx.fillRect(ss.x, ss.y, 22, 26);
      ctx.fillStyle = '#14161f'; ctx.fillRect(ss.x + 2, ss.y + 2, 18, 22);
      // chalk text
      ctx.fillStyle = '#e8e9f3'; ctx.font = '700 5px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText("GOOD FOOD", ss.x + 11, ss.y + 10);
      ctx.fillText("BETTER", ss.x + 11, ss.y + 16);
      ctx.fillText("PEOPLE", ss.x + 11, ss.y + 21);
    }
  }

  // standard props
  for(const p of props){
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    if(p.t === 'dumpster'){
      // shadow
      ctx.fillRect(p.x - 22, p.y + 10, 48, 12);
      // body
      ctx.fillStyle = p.c || '#243e30'; ctx.fillRect(p.x - 24, p.y - 16, 46, 28);
      // front rib lines
      ctx.fillStyle = '#182820';
      ctx.fillRect(p.x - 14, p.y - 12, 4, 20); ctx.fillRect(p.x + 4, p.y - 12, 4, 20);
      // hinged lid
      ctx.fillStyle = '#15201a'; ctx.fillRect(p.x - 25, p.y - 18, 48, 6);
    } else if(p.t === 'bench'){
      ctx.fillRect(p.x - 20, p.y + 4, 44, 10);
      // cast iron frame
      ctx.fillStyle = '#1b1d2e';
      ctx.fillRect(p.x - 20, p.y - 8, 4, 14); ctx.fillRect(p.x + 16, p.y - 8, 4, 14);
      // wood slats
      ctx.fillStyle = '#4e3828';
      ctx.fillRect(p.x - 22, p.y - 10, 44, 4);
      ctx.fillRect(p.x - 22, p.y - 4, 44, 4);
      ctx.fillRect(p.x - 22, p.y + 2, 44, 4);
    } else if(p.t === 'hydrant'){
      ctx.fillRect(p.x - 5, p.y + 4, 12, 6);
      ctx.fillStyle = '#a62d43'; ctx.fillRect(p.x - 6, p.y - 14, 12, 18);
      ctx.fillStyle = '#d63c58'; ctx.fillRect(p.x - 4, p.y - 16, 8, 4);
      ctx.fillStyle = '#e5a539'; ctx.fillRect(p.x - 9, p.y - 8, 18, 5); // brass caps
    } else if(p.t === 'trash'){
      ctx.fillRect(p.x - 8, p.y + 4, 20, 8);
      ctx.fillStyle = '#262a40'; ctx.fillRect(p.x - 9, p.y - 12, 18, 18);
      ctx.fillStyle = '#3a4060'; ctx.fillRect(p.x - 11, p.y - 14, 22, 4);
    } else if(p.t === 'planter'){
      ctx.fillRect(p.x - 12, p.y + 4, 28, 10);
      ctx.fillStyle = '#2f344e'; ctx.fillRect(p.x - 14, p.y - 8, 28, 14);
      ctx.fillStyle = S.act === 1 ? '#2a6340' : '#1f4830';
      ctx.beginPath(); ctx.arc(p.x, p.y - 12, 11, 0, 7); ctx.fill();
    }
  }
}

/* ============================================================
   DETAILED VEHICLES
   ============================================================ */
function drawCar(x, y, color, type, isPolice, isStolen){
  ctx.save();
  // ground shadow with ambient occlusion
  ctx.fillStyle = 'rgba(0,0,0,.65)';
  ctx.fillRect(x - 26, y - 40, 52, 84);

  // recessed wheels & tires
  ctx.fillStyle = '#0f111a';
  ctx.fillRect(x - 25, y - 32, 6, 16); // front left
  ctx.fillRect(x + 19, y - 32, 6, 16); // front right
  ctx.fillRect(x - 25, y + 16, 6, 16); // rear left
  ctx.fillRect(x + 19, y + 16, 6, 16); // rear right
  // silver rim centers
  ctx.fillStyle = '#7a81a8';
  ctx.fillRect(x - 24, y - 26, 3, 4);
  ctx.fillRect(x + 21, y - 26, 3, 4);
  ctx.fillRect(x - 24, y + 22, 3, 4);
  ctx.fillRect(x + 21, y + 22, 3, 4);

  // car body chassis
  ctx.fillStyle = color;
  ctx.fillRect(x - 23, y - 39, 46, 78);
  // front & rear bumper trim
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(x - 23, y - 39, 46, 5);
  ctx.fillRect(x - 23, y + 34, 46, 5);

  // front hood line & rear trunk line
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(x - 18, y - 32, 36, 2);
  ctx.fillRect(x - 18, y + 26, 36, 2);

  // side view mirrors
  ctx.fillStyle = color;
  ctx.fillRect(x - 26, y - 24, 4, 6);
  ctx.fillRect(x + 22, y - 24, 4, 6);

  // cabin roof base
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fillRect(x - 19, y - 28, 38, 54);

  // front windshield with diagonal glass reflection
  const gWinF = ctx.createLinearGradient(x - 17, y - 27, x + 17, y - 8);
  gWinF.addColorStop(0, 'rgba(180,225,255,.55)');
  gWinF.addColorStop(0.5, 'rgba(60,110,170,.35)');
  gWinF.addColorStop(1, 'rgba(20,30,55,.8)');
  ctx.fillStyle = gWinF;
  ctx.fillRect(x - 17, y - 27, 34, 18);

  // rear window with glass glare
  const gWinR = ctx.createLinearGradient(x - 17, y + 8, x + 17, y + 24);
  gWinR.addColorStop(0, 'rgba(20,30,55,.8)');
  gWinR.addColorStop(1, 'rgba(180,225,255,.45)');
  ctx.fillStyle = gWinR;
  ctx.fillRect(x - 17, y + 8, 34, 16);

  // roof panel
  ctx.fillStyle = color;
  ctx.fillRect(x - 18, y - 8, 36, 16);
  // sunroof or roof ribs
  if(type === 'sports' || isStolen){
    ctx.fillStyle = '#101424'; ctx.fillRect(x - 12, y - 6, 24, 12);
    // rear aerodynamic spoiler
    ctx.fillStyle = '#ff2e88'; ctx.fillRect(x - 23, y + 36, 46, 5);
  }

  // front headlights
  ctx.fillStyle = '#fff4cc';
  ctx.fillRect(x - 20, y - 39, 8, 4);
  ctx.fillRect(x + 12, y - 39, 8, 4);

  // rear red taillights with glow
  ctx.fillStyle = '#ff2e4d';
  ctx.fillRect(x - 20, y + 35, 9, 4);
  ctx.fillRect(x + 11, y + 35, 9, 4);

  // active vehicle headlight light cones (for player driving / police)
  if(S.driving && (isStolen || P.x === x)){
    const hg = ctx.createLinearGradient(x, y - 40, x, y - 180);
    hg.addColorStop(0, 'rgba(255,245,200,.35)');
    hg.addColorStop(1, 'rgba(255,245,200,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 39); ctx.lineTo(x - 60, y - 180);
    ctx.lineTo(x + 60, y - 180); ctx.lineTo(x + 16, y - 39);
    ctx.closePath(); ctx.fill();
  }

  // police lightbar & siren strobe
  if(isPolice){
    const blink = Math.sin(S.time * 12) > 0;
    // lightbar body
    ctx.fillStyle = '#121422'; ctx.fillRect(x - 18, y - 4, 36, 7);
    ctx.fillStyle = blink ? '#ff2e4d' : '#2979ff';
    ctx.fillRect(x - 16, y - 3, 14, 5);
    ctx.fillStyle = blink ? '#2979ff' : '#ff2e4d';
    ctx.fillRect(x + 2, y - 3, 14, 5);

    // radial emergency strobe glow
    const g = ctx.createRadialGradient(x, y, 2, x, y, 120);
    g.addColorStop(0, blink ? 'rgba(255,46,77,.3)' : 'rgba(41,121,255,.3)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 120, 0, 7); ctx.fill();
  }

  ctx.restore();
}

function drawAmbulance(x, y){
  ctx.save();
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(x + 2, y + 4, 62, 102);
  // body
  ctx.fillStyle = '#e8ebf7'; ctx.fillRect(x, y, 60, 100);
  // front windshield
  ctx.fillStyle = 'rgba(60,110,180,.6)'; ctx.fillRect(x + 8, y + 10, 44, 20);
  // red cross symbols
  ctx.fillStyle = '#ff3344';
  ctx.fillRect(x + 20, y + 50, 20, 6); ctx.fillRect(x + 27, y + 43, 6, 20);
  // rear double doors
  ctx.strokeStyle = '#323758'; ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 6, y + 74, 48, 22);
  ctx.beginPath(); ctx.moveTo(x + 30, y + 74); ctx.lineTo(x + 30, y + 96); ctx.stroke();

  // flashing top beacons
  const blink = Math.sin(S.time * 8) > 0;
  ctx.fillStyle = blink ? '#ff3344' : '#2979ff';
  ctx.fillRect(x + 12, y + 2, 36, 8);
  const g = ctx.createRadialGradient(x + 30, y + 6, 2, x + 30, y + 6, 130);
  g.addColorStop(0, blink ? 'rgba(255,51,68,.3)' : 'rgba(41,121,255,.3)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 30, y + 6, 130, 0, 7); ctx.fill();
  ctx.restore();
}

/* ============================================================
   CHARACTERS & NPCS
   ============================================================ */
function drawPlayer(){
  const spd = Math.hypot(P.vx, P.vy);
  // grounding contact shadow
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 13, 6, 0, 0, 7); ctx.fill();

  // dynamic neon locator ring
  ctx.strokeStyle = S.act === 3 ? 'rgba(160,172,215,.4)' : 'rgba(255,46,136,.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(P.x, P.y + 14, 16, 7, 0, 0, 7); ctx.stroke();

  const bob = Math.sin(P.walk * 6) * (1.5 + S.sprint);
  const lean = P.face * S.sprint * 3;
  ctx.save();
  ctx.translate(lean, 0);

  // legs with swinging animation
  const swing = Math.sin(P.walk * 6) * Math.min(6, spd * 0.035);
  ctx.fillStyle = '#1c2035';
  ctx.fillRect(P.x - 8, P.y + 8 + bob, 6, 6 + swing);
  ctx.fillRect(P.x + 2, P.y + 8 + bob, 6, 6 - swing);
  // shoes
  ctx.fillStyle = '#dfe3f5';
  ctx.fillRect(P.x - 9, P.y + 14 + bob + swing, 7, 3);
  ctx.fillRect(P.x + 2, P.y + 14 + bob - swing, 7, 3);

  // stylish jacket body
  ctx.fillStyle = S.act === 3 ? '#2a2f48' : '#1e2238';
  ctx.fillRect(P.x - 10, P.y - 18 + bob, 20, 27);
  ctx.strokeStyle = '#0e101c'; ctx.lineWidth = 2;
  ctx.strokeRect(P.x - 10, P.y - 18 + bob, 20, 27);

  // signature jacket interior band (neon pink / dark)
  ctx.fillStyle = S.act === 3 ? '#3d4468' : '#ff2e88';
  ctx.fillRect(P.x - 2, P.y - 16 + bob, 4, 25);

  // arms swinging in stride
  ctx.fillStyle = S.act === 3 ? '#2a2f48' : '#1e2238';
  ctx.fillRect(P.x - 12, P.y - 12 + bob - swing*0.8, 4, 14);
  ctx.fillRect(P.x + 8, P.y - 12 + bob + swing*0.8, 4, 14);
  ctx.fillStyle = '#ffd9b3';
  ctx.fillRect(P.x - 12, P.y + 2 + bob - swing*0.8, 4, 4); // left hand
  ctx.fillRect(P.x + 8, P.y + 2 + bob + swing*0.8, 4, 4);  // right hand

  // head with hair/cap
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath(); ctx.arc(P.x + P.face*1.5, P.y - 25 + bob, 8.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#141624'; // dark hair
  ctx.beginPath(); ctx.arc(P.x + P.face*1.2, P.y - 28 + bob, 8.5, Math.PI, 0); ctx.fill();

  ctx.restore();
}

function drawPerson(n, sitting){
  // drop shadow
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 12, 12, 5.5, 0, 0, 7); ctx.fill();

  if(n.state === 'crying' || n.state === 'distressed'){
    const shudder = Math.sin(S.time * 18) * 0.8;
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 9, n.y - 8 + shudder, 18, 20);
    ctx.beginPath(); ctx.arc(n.x, n.y - 13 + shudder, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd9b3'; ctx.fillRect(n.x - 6, n.y - 18 + shudder, 12, 6);
    return;
  }

  if(n.state === 'surrender'){
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 8, n.y - 14, 16, 24);
    ctx.beginPath(); ctx.arc(n.x, n.y - 21, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd9b3';
    ctx.fillRect(n.x - 13, n.y - 30, 4, 14); ctx.fillRect(n.x + 9, n.y - 30, 4, 14);
    return;
  }

  if(n.state === 'kneel'){
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 10, n.y - 4, 20, 16);
    ctx.beginPath(); ctx.arc(n.x, n.y - 11, 7.5, 0, 7); ctx.fill();
    return;
  }

  if(n.state === 'searching_shock'){
    const shakeHead = Math.sin(S.time * 6) * 2;
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 8, n.y - 14, 16, 24);
    ctx.beginPath(); ctx.arc(n.x + shakeHead, n.y - 21, 7.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe066'; ctx.fillRect(n.x + 14, n.y + 8, 5, 2);
    ctx.beginPath(); ctx.arc(n.x + 14, n.y + 9, 3, 0, 7); ctx.stroke();
    ctx.fillStyle = '#ffd9b3';
    ctx.fillRect(n.x - 12, n.y - 25, 4, 8); ctx.fillRect(n.x + 8, n.y - 25, 4, 8);
    return;
  }

  if(sitting){
    ctx.fillStyle = n.c;
    ctx.fillRect(n.x - 9, n.y - 6, 18, 18);
    ctx.beginPath(); ctx.arc(n.x, n.y - 14, 7.5, 0, 7); ctx.fill();
    return;
  }

  const bob = Math.sin((n.walk || 0) * 6) * 1.5;
  const lean = n.mode === 'flee' ? (n.face || 1) * 2.5 : 0;
  ctx.fillStyle = n.c;
  ctx.fillRect(n.x - 8 + lean, n.y - 14 + bob, 16, 24);
  ctx.beginPath(); ctx.arc(n.x + lean, n.y - 21 + bob, 7.5, 0, 7); ctx.fill();

  if(n.mode === 'flee'){
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.font = '700 16px "Anton", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', n.x, n.y - 34 + bob);
  } else if(S.act === 3 && n.avoiding > 0){
    ctx.fillStyle = 'rgba(200,210,245,.45)';
    ctx.beginPath(); ctx.arc(n.x, n.y - 34, 2.5, 0, 7); ctx.fill();
  }
}

function drawDown(n){
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath(); ctx.ellipse(n.x, n.y + 8, 20, 8, 0, 0, 7); ctx.fill();
  ctx.fillStyle = n.c;
  ctx.fillRect(n.x - 18, n.y - 4, 36, 14);
  ctx.beginPath(); ctx.arc(n.x - 22, n.y + 3, 7.5, 0, 7); ctx.fill();
}

/* ============================================================
   POLISHED OBJECTIVE MARKER & WAYPOINT
   ============================================================ */
function drawMarker(x, y){
  const t = (S.time * 1.8) % 1;
  const pulse = Math.sin(S.time * 3.5) * 0.5 + 0.5;
  const col = S.act === 1 ? '61,255,139' : (S.act === 2 ? '255,179,71' : '232,233,243');

  // 1. Holographic vertical light beam pillar
  const gBeam = ctx.createLinearGradient(x, y - 110, x, y);
  gBeam.addColorStop(0, 'rgba(' + col + ',0)');
  gBeam.addColorStop(0.7, 'rgba(' + col + ',' + (0.12 + pulse*0.08) + ')');
  gBeam.addColorStop(1, 'rgba(' + col + ',' + (0.35 + pulse*0.15) + ')');
  ctx.fillStyle = gBeam;
  ctx.fillRect(x - 14, y - 110, 28, 110);

  // 2. Expanding concentric ground pulse ring
  ctx.strokeStyle = 'rgba(' + col + ',' + (0.9 - t*0.9) + ')';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, y, 16 + t*34, 8 + t*17, 0, 0, 7); ctx.stroke();

  // 3. Solid inner glowing ground disc
  ctx.fillStyle = 'rgba(' + col + ',' + (0.2 + pulse*0.15) + ')';
  ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(' + col + ',.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(x, y, 18, 9, 0, 0, 7); ctx.stroke();

  // 4. Hovering glowing diamond beacon with gentle bob
  const hoverY = y - 48 + Math.sin(S.time * 4) * 4;
  ctx.save();
  ctx.translate(x, hoverY);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(' + col + ',.95)';
  ctx.shadowColor = 'rgba(' + col + ',1)';
  ctx.shadowBlur = 14;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
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
  ctx.globalAlpha = 0.88;
  ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(-10,9); ctx.lineTo(-10,-9); ctx.closePath(); ctx.fill();
  ctx.restore();
}
