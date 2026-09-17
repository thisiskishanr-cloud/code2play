"use strict";
/* +500 — Per-frame update and the requestAnimationFrame loop. Load last. */

/* ============================================================
   UPDATE
   ============================================================ */
let last = performance.now();
function update(dt){
  S.time += dt;

  // player movement — velocity is eased toward the input, so starts and stops
  // have weight without feeling laggy (reaches full speed in ~0.15s)
  let ix = 0, iy = 0;
  if(S.phase === 'play' && !S.busy){
    if(keys['a'] || keys['arrowleft'])  ix -= 1;
    if(keys['d'] || keys['arrowright']) ix += 1;
    if(keys['w'] || keys['arrowup'])    iy -= 1;
    if(keys['s'] || keys['arrowdown'])  iy += 1;
  }
  const sprinting = !!(keys['shift'] || keys['shiftleft'] || keys['shiftright']) && (ix||iy) && !S.driving;
  S.sprint += ((sprinting ? 1 : 0) - S.sprint) * Math.min(1, dt*6);
  const base = S.driving ? 320 : (S.act === 3 ? 124 : 158);
  const sp = base * (S.driving ? 1 : (1 + S.sprint * 0.62));
  const m = Math.hypot(ix, iy) || 1;
  const tvx = ix/m*sp, tvy = iy/m*sp;
  const ease = (ix||iy) ? 11 : 13;             // decelerate a touch faster than accelerate
  P.vx += (tvx - P.vx) * Math.min(1, dt*ease);
  P.vy += (tvy - P.vy) * Math.min(1, dt*ease);
  if(Math.abs(P.vx) < 2 && Math.abs(P.vy) < 2 && !ix && !iy){ P.vx = 0; P.vy = 0; }
  if(Math.abs(P.vx) > 6) P.face = P.vx > 0 ? 1 : -1;
  moveEnt(P, P.vx*dt, P.vy*dt, S.driving ? 20 : P.r);
  const speed = Math.hypot(P.vx, P.vy);
  P.walk += speed * dt * (S.driving ? 0 : 0.085);
  // footstep taps + sprint dust
  if(!S.driving && speed > 30){
    P.step = (P.step || 0) + speed * dt * 0.012;
    if(P.step > 1){
      P.step = 0;
      tone(90 + Math.random()*30, 0.05, 'triangle', 0.02 + S.sprint*0.02);
      if(S.sprint > 0.4) particles.push({x:P.x - P.vx*0.04, y:P.y + 11, vx:-P.vx*0.12, vy:-14,
                                         life:0.4, t:0, c:'#39406a', sz:3});
    }
  }
  if(S.driving && speed > 40 && Math.random() < 0.4)
    particles.push({x:P.x,y:P.y,vx:-P.vx*0.2,vy:-P.vy*0.2,life:0.4,t:0,c:'#4a5170',sz:3});

  // camera — leads the player slightly, pulls back when sprinting,
  // pushes in on whatever the current interaction is looking at
  const lead = S.driving ? 0.38 : 0.22;
  let tx2 = P.x + P.vx*lead, ty2 = P.y + P.vy*lead;
  let follow = 4.5;
  if(S.focus){ tx2 = (S.focus.x + P.x)/2; ty2 = (S.focus.y + P.y)/2; follow = 3.2; }
  if(!S.focus) cam.zTarget = 1 - S.sprint*0.05 - (S.driving?0.06:0);
  cam.z += (cam.zTarget - cam.z) * Math.min(1, dt*3.4);
  cam.x += (tx2 - cam.x) * Math.min(1, dt*follow);
  cam.y += (ty2 - cam.y) * Math.min(1, dt*follow);
  const hw = VW/(2*cam.z), hh = VH/(2*cam.z);
  cam.x = Math.max(hw, Math.min(WORLD.w - hw, cam.x));
  cam.y = Math.max(hh, Math.min(WORLD.h - hh, cam.y));
  if(S.sprint > 0.5) S.shake = Math.max(S.shake, 1.6);
  // a siren answers a crime a beat later, from somewhere you can't see
  if(S.sirens > 0){ S.sirens -= dt; if(S.sirens <= 0){ sfxSiren(); S.sirens = 0; } }

  // idle patrol car
  for(const pc of policeCars){
    if(!pc.patrol) continue;
    pc.dir = pc.dir || -1;
    pc.x += pc.dir * 70 * dt;
    if(pc.x < 250 || pc.x > 1700) pc.dir *= -1;
    if(Math.random() < dt*0.25) sfxSiren();
  }

  // chase
  if(S.chase){
    for(const pc of policeCars){
      const a = Math.atan2(P.y - pc.y, P.x - pc.x);
      pc.x += Math.cos(a) * 240 * dt;
      pc.y += Math.sin(a) * 240 * dt;
    }
    if(Math.random() < dt*1.2) sfxSiren();
  }

  // pedestrians: walk the loop, pause at corners, scatter from crimes,
  // gawk at an assault, and after the reveal, get out of your way
  for(const c of crowd){
    c.timer -= dt;
    let vx = 0, vy = 0;

    if(c.mode === 'flee'){
      const a = Math.atan2(c.y - c.gy, c.x - c.gx);
      vx = Math.cos(a) * 128; vy = Math.sin(a) * 128;
      if(c.timer <= 0) c.mode = c.route ? 'walk' : 'stand';
    } else if(c.mode === 'gather'){
      const d = dist(c.x, c.y, c.gx, c.gy);
      if(d > 74){ const a = Math.atan2(c.gy - c.y, c.gx - c.x); vx = Math.cos(a)*62; vy = Math.sin(a)*62; }
      if(c.timer <= 0) c.mode = c.route ? 'walk' : 'stand';
    } else if(c.mode === 'pause'){
      if(c.timer <= 0){ c.mode = 'walk'; }
    } else if(c.mode === 'stand'){
      const a = c.anchor || {x:c.x, y:c.y};
      const d = dist(c.x, c.y, a.x, a.y);
      if(d > 6){ const ang = Math.atan2(a.y - c.y, a.x - c.x); vx = Math.cos(ang)*40; vy = Math.sin(ang)*40; }
      else if(c.timer <= 0){ c.timer = 3 + (c.speed % 4); c.face *= -1; }
    } else if(c.route){
      const t = c.route[c.node];
      const d = dist(c.x, c.y, t[0], t[1]);
      if(d < 10){
        c.node = (c.node + 1) % c.route.length;
        if((c.node % 2) === 0){ c.mode = 'pause'; c.timer = 0.7 + (c.speed % 3) * 0.4; }
      } else {
        const a = Math.atan2(t[1] - c.y, t[0] - c.x);
        vx = Math.cos(a) * c.speed; vy = Math.sin(a) * c.speed;
      }
    }

    // after the reveal, people give the protagonist room
    if(S.act === 3 && c.mode !== 'flee'){
      const d = dist(c.x, c.y, P.x, P.y);
      if(d < 140){
        const a = Math.atan2(c.y - P.y, c.x - P.x);
        vx = Math.cos(a)*64; vy = Math.sin(a)*64;
        c.avoiding = 1;
      } else c.avoiding = Math.max(0, (c.avoiding||0) - dt);
    }

    if(vx) c.face = vx > 0 ? 1 : -1;
    c.walk = (c.walk || 0) + Math.hypot(vx,vy) * dt * 0.09;
    moveEnt(c, vx*dt, vy*dt, 9);
  }

  // searching car owner paces
  if(NPC.carOwn.state === 'search'){
    NPC.carOwn.x = 1600 + Math.sin(S.time*0.9) * 55;
  }

  // particles
  for(let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.t += dt;
    p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 260*dt;
    if(p.t > p.life) particles.splice(i,1);
  }

  // rain
  if(S.rain > 0){
    for(const d of rainDrops){
      d.y += (520 + d.s*60) * dt;
      d.x -= 120*dt;
      if(d.y > VH){ d.y = -20; d.x = Math.random()*VW + 120; }
      if(d.x < -30) d.x = VW + 20;
    }
  }

  if(S.shake > 0) S.shake = Math.max(0, S.shake - dt*40);
  if(S.flash > 0) S.flash = Math.max(0, S.flash - dt*1.8);

  // interaction prompt
  if(S.phase === 'play' && !S.busy){
    const near = interactables().filter(i => dist(P.x,P.y,i.x,i.y) < 62)[0];
    if(near){ $('promptText').textContent = near.label; $('prompt').classList.add('on'); }
    else hidePrompt();
  } else hidePrompt();

  // occasional heartbeat after the reveal
  if(S.act === 3 && Math.random() < dt*0.25) sfxHeart();
}

/* ---------- loop ---------- */
function loop(now){
  const raw = Math.min(0.05, (now - last)/1000);
  last = now;
  update(raw * S.timeScale);
  tickHUD(raw);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
