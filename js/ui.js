"use strict";
/* +500 — HUD, banners, reward pops, dialogue, choices, overlays, particles. */

/* ---------- ui helpers ---------- */
const $ = id => document.getElementById(id);
function setHUD(on){ $('hud').classList.toggle('on', !!on); }
const shown = {money:0, xp:0, rep:0};
function refreshHUD(){ $('repbar').style.width = Math.min(100, S.rep) + '%'; }
function tickHUD(dt){
  let dirty = false;
  for(const k of ['money','xp','rep']){
    if(Math.abs(shown[k] - S[k]) > 0.5){
      shown[k] += (S[k] - shown[k]) * Math.min(1, dt * 5.5);
      if(Math.abs(shown[k] - S[k]) < 1) shown[k] = S[k];
      dirty = true;
    } else if(shown[k] !== S[k]){ shown[k] = S[k]; dirty = true; }
  }
  if(!dirty) return;
  $('cash').textContent = '$' + Math.round(shown.money).toLocaleString();
  $('xp').textContent = Math.round(shown.xp);
  $('repn').textContent = Math.round(shown.rep);
  $('repbar').style.width = Math.min(100, shown.rep) + '%';
  $('cash').style.transform = 'scale(' + (1 + Math.min(0.12, Math.abs(S.money - shown.money)/9000)) + ')';
}
function objective(text, tag){ S.objective = text; $('objtxt').textContent = text; $('objtag').textContent = tag||'OBJECTIVE'; }
function banner(k, v){
  $('bk').textContent = k; $('bv').textContent = v;
  const b = $('banner'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function pop(text, kind){
  const el = document.createElement('div');
  el.className = 'pop ' + (kind||'');
  el.textContent = text;
  $('pops').appendChild(el);
  setTimeout(()=>el.remove(), 1600);
}
function reward({money=0, xp=0, rep=0, silent=false}){
  if(money){ S.money += money; pop('+$' + money.toLocaleString(), silent?'mute':''); }
  if(xp){ S.xp += xp; pop('+' + xp + ' XP', silent?'mute':'xp'); }
  if(rep){ S.rep += rep; pop('+' + rep + ' REP', silent?'mute':'rep'); }
  refreshHUD();
  if(!silent){
    sfxReward();
    S.flash = 0.5;
    burst(P.x, P.y - 6, '#3dff8b', 30, 1.2);
    burst(P.x, P.y - 6, '#ffb347', 12, 0.8);
    cam.zTarget = Math.min(1.5, cam.z + 0.12);
    setTimeout(()=>{ if(!S.focus) cam.zTarget = 1; }, 420);
  }
  S.shake = Math.max(S.shake, silent?2:13);
}
function wait(ms){ return new Promise(r=>setTimeout(r, ms)); }
function keypress(){ return new Promise(r=>{ pressResolve = r; }); }

let dialogueTimer = null;
function say(text, opts){
  opts = opts || {};
  const d = $('dialogue');
  $('dwho').textContent = opts.who || '';
  $('dline').textContent = text;
  d.classList.toggle('quiet', !!opts.quiet);
  d.classList.add('on');
  const ms = opts.ms || Math.min(6000, 1400 + text.length * 42);
  return new Promise(res=>{
    let done = false;
    const finish = ()=>{ if(done) return; done = true; clearTimeout(dialogueTimer); pressResolve = null; res(); };
    dialogueTimer = setTimeout(finish, ms);
    pressResolve = finish;
  });
}
function hideSay(){ $('dialogue').classList.remove('on'); }

function choices(list){
  const box = $('choices');
  box.innerHTML = '';
  box.classList.add('on');
  return new Promise(res=>{
    list.forEach((c,i)=>{
      const b = document.createElement('button');
      b.className = 'choice';
      b.innerHTML = c.label + (c.note ? '<small>' + c.note + '</small>' : '');
      b.onclick = ()=>{ box.classList.remove('on'); box.innerHTML=''; res(i); };
      box.appendChild(b);
    });
    box.firstChild.focus();
  });
}

function showOverlay(id, on){ $(id).classList.toggle('on', !!on); }
async function fadeOut(ms){ $('fade').style.transition = 'opacity ' + (ms/1000) + 's'; $('fade').style.opacity = 1; await wait(ms); }
async function fadeIn(ms){ $('fade').style.transition = 'opacity ' + (ms/1000) + 's'; $('fade').style.opacity = 0; await wait(ms); }

async function actCard(num, name, hold){
  $('actnum').textContent = num; $('actname').textContent = name;
  showOverlay('act', true);
  await wait(hold||1900);
  showOverlay('act', false);
}

/* ---------- CCTV UI helpers ---------- */
let cctvClockInterval = null;
let cctvBaseSeconds = 0;
function startCctvClock(baseTimeStr){
  stopCctvClock();
  const parts = baseTimeStr.split(':').map(Number);
  cctvBaseSeconds = (parts[0]*3600 + parts[1]*60 + parts[2]);
  let frames = parts[3] || 0;
  const startTime = performance.now();
  cctvClockInterval = setInterval(()=>{
    const elapsed = (performance.now() - startTime) / 1000;
    const cur = cctvBaseSeconds + elapsed;
    const h = String(Math.floor(cur / 3600) % 24).padStart(2, '0');
    const m = String(Math.floor((cur % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(cur % 60)).padStart(2, '0');
    const f = String(Math.floor((elapsed * 30) % 30)).padStart(2, '0');
    const el = $('cctvTime');
    if(el) el.textContent = `${h}:${m}:${s}:${f}`;
  }, 33);
}
function stopCctvClock(){
  if(cctvClockInterval){ clearInterval(cctvClockInterval); cctvClockInterval = null; }
}

function setCctvCam(camText, timeStr, gradeClass, trackTag, trackBoxStyle){
  const overlay = $('cctvOverlay');
  overlay.className = 'overlay on ' + (gradeClass || '');
  $('cctvCam').textContent = camText;
  startCctvClock(timeStr);
  const track = $('cctvTrackbox');
  const tag = $('cctvTrackTag');
  if(trackTag) tag.textContent = trackTag;
  if(trackBoxStyle){
    Object.assign(track.style, trackBoxStyle);
    track.style.display = 'block';
  } else {
    track.style.display = 'none';
  }
  $('cctvStamp').className = 'cctv-stamp';
  $('cctvStamp').textContent = '';
  $('cctvReward').className = 'cctv-reward';
  $('cctvReward').style.display = 'none';
  $('cctvVictim').classList.remove('show');
}

function showCctvGlitch(ms){
  const g = $('cctvGlitch');
  g.classList.add('active');
  sfxGlitch();
  setTimeout(()=>{ g.classList.remove('active'); }, ms||250);
}

function showCctvStamp(text){
  const stamp = $('cctvStamp');
  stamp.textContent = text;
  stamp.className = 'cctv-stamp show';
  sfxStamp();
}

function hideCctvOverlay(){
  stopCctvClock();
  showOverlay('cctvOverlay', false);
  const overlay = $('cctvOverlay');
  overlay.className = 'overlay';
  $('cctvStamp').className = 'cctv-stamp';
  $('cctvVictim').classList.remove('show');
}


/* ---------- particles ---------- */
function burst(x, y, color, n, speed){
  for(let i=0;i<(n||16);i++){
    const a = Math.random()*Math.PI*2, s = (speed||1) * (40 + Math.random()*150);
    particles.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 40, life:0.6+Math.random()*0.5, t:0, c:color, sz:2+Math.random()*3});
  }
}
