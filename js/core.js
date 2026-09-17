"use strict";
/* +500 — Bootstrap: canvas sizing, game state, input, collision helpers. */

/* ---------- scaling ---------- */
const stage = document.getElementById('stage');
function fit(){
  const s = Math.min(window.innerWidth/960, window.innerHeight/600);
  stage.style.transform = 'scale(' + s + ')';
}
window.addEventListener('resize', fit); fit();

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const VW = 960, VH = 600;
const WORLD = {w:1900, h:1300};

/* ---------- state ---------- */
const S = {
  phase:'title',          // title | play | cine | end
  act:1,
  busy:false,
  money:0, xp:0, rep:0,
  flags:{ robbedStore:false, npcInjured:false, carStolen:false, policeAttention:0, finalChoice:null, walkedAway:false },
  seen:{ store:false, fight:false, car:false },
  mission:0,
  objective:'',
  objTag:'OBJECTIVE',
  driving:false,
  chase:false,
  rain:0,          // 0..1
  dark:0,          // 0..1 global cool darkening
  shake:0,
  time:0,
  timeScale:1,     // brief slow-motion on impact beats
  focus:null,      // {x,y} camera focus during an interaction
  sprint:0,        // 0..1 sprint blend, drives fov + trail
  flash:0,         // white/green screen pop on a payout
  sirens:0,        // seconds until a distant siren answers a crime
  target:null      // {x,y,label,id} current waypoint
};

/* ---------- input ---------- */
const keys = {};
let pressResolve = null;
addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  keys[k] = true;
  if(k === 'e' || k === ' ' || k === 'enter'){
    e.preventDefault();
    if(pressResolve){ const r = pressResolve; pressResolve = null; r(); }
    else if(S.phase === 'play' && !S.busy) tryInteract();
  }
  if(k === 'r'){ location.reload(); }
  if(k === '1' && S.phase !== 'title') jumpToAct(1);
  if(k === '2' && S.phase !== 'title') jumpToAct(2);
  if(k === '3' && S.phase !== 'title') jumpToAct(3);
});
addEventListener('keyup', e=>{ keys[e.key.toLowerCase()] = false; });


/* ---------- collision ---------- */

function blocked(x, y, r){
  for(const b of buildings){
    if(x > b.x - r && x < b.x + b.w + r && y > b.y - r && y < b.y + b.h + r) return true;
  }
  return x < r || y < r || x > WORLD.w - r || y > WORLD.h - r;
}
function moveEnt(e, dx, dy, r){
  if(!blocked(e.x + dx, e.y, r)) e.x += dx;
  if(!blocked(e.x, e.y + dy, r)) e.y += dy;
}
const dist = (a,b,x,y)=> Math.hypot(a-x, b-y);
