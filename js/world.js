"use strict";
/* +500 — Static city geometry, props, entities, pedestrians, camera and crowd reactions. */

/* ---------- world geometry ---------- */
const B = (x,y,w,h,o)=> Object.assign({x,y,w,h,roof:'#242743',wall:'#171a2e'}, o||{});
const buildings = [
  B(160,180,300,230,{id:'store', roof:'#2c2140', sign:"MARIA'S", signColor:'#ff2e88', lit:true}),
  B(520,170,180,150,{roof:'#20233c'}),
  B(1000,170,190,170,{roof:'#212540'}),
  B(1270,170,230,170,{roof:'#1e2138', sign:'PAWN', signColor:'#ffb347', lit:true}),
  B(1580,180,220,160,{roof:'#22253f'}),
  B(230,790,260,200,{id:'house', roof:'#2a2440', sign:'', lit:true}),
  B(560,830,190,160,{roof:'#1f2239'}),
  B(1400,830,300,210,{id:'police', roof:'#1b2b45', sign:'POLICE', signColor:'#5ea9ff', lit:true}),
  B(1080,1080,260,140,{roof:'#1e2138'}),
  B(120,1080,300,140,{roof:'#20233a'})
];
const roads = [
  {x:0,y:470,w:WORLD.w,h:150},      // main street
  {x:0,y:1000,w:WORLD.w,h:60},      // lower road
  {x:800,y:0,w:130,h:WORLD.h},      // vertical avenue
  {x:1480,y:0,w:110,h:WORLD.h}
];
const park = {x:880,y:700,w:420,h:250};
const lot  = {x:1500,y:640,w:300,h:290};

/* street furniture — cheap rectangles, but they give the block density */
const props = [
  {t:'dumpster', x:1206, y:392}, {t:'dumpster', x:512, y:452},
  {t:'dumpster', x:1150, y:1050}, {t:'dumpster', x:1720, y:430},
  {t:'bench', x:960, y:760}, {t:'bench', x:1120, y:760}, {t:'bench', x:1040, y:920},
  {t:'bench', x:640, y:470}, {t:'bench', x:1660, y:470},
  {t:'hydrant', x:470, y:472}, {t:'hydrant', x:1340, y:472}, {t:'hydrant', x:760, y:1002},
  {t:'trash', x:700, y:472}, {t:'trash', x:1100, y:472}, {t:'trash', x:300, y:1002},
  {t:'planter', x:180, y:452}, {t:'planter', x:1560, y:452}, {t:'planter', x:900, y:1002},
  {t:'stop', x:1000, y:470}, {t:'stop', x:420, y:1000}
];
const crosswalks = [
  {x:690, y:470, w:60, h:150}, {x:1290, y:470, w:60, h:150},
  {x:420, y:1000, w:60, h:60}, {x:1240, y:1000, w:60, h:60}
];
const lampPosts = [[520,470],[900,470],[1300,470],[1700,470],[400,1000],[1100,1000],[1600,1000],[960,760]];

const markerDefs = {
  store:  {x:310, y:455},
  alley:  {x:1230, y:300},
  car:    {x:1620, y:720},
  escape: {x:180, y:1030},
  offer:  {x:980, y:560},
  final:  {x:400, y:540},
  home:   {x:360, y:1005},
  end:    {x:1080, y:830}
};

/* props */
const parkedCars = [
  {x:1540,y:690,w:46,h:78,c:'#3c4568'},
  {x:1620,y:690,w:46,h:78,c:'#6a3b52', stolen:true},
  {x:1700,y:690,w:46,h:78,c:'#39506b'},
  {x:1540,y:820,w:46,h:78,c:'#4a4560'},
  {x:1700,y:820,w:46,h:78,c:'#43405c'},
  {x:250,y:500,w:46,h:78,c:'#3a4260'},
  {x:1060,y:500,w:46,h:78,c:'#4c3f55'},
  {x:600,y:600,w:46,h:78,c:'#39455e'},
  {x:1400,y:600,w:46,h:78,c:'#46405e'},
  {x:980,y:1030,w:46,h:78,c:'#3d4360'}
];
let policeCars = [];

/* ---------- entities ---------- */
function person(x,y,c,name){ return {x,y,c,name,vx:0,vy:0,t:Math.random()*10,state:'idle',hidden:false,face:1}; }
const P = { x:700, y:545, vx:0, vy:0, r:11, face:1, walk:0 };
const NPC = {
  owner:  person(300, 470, '#ffd9a0', 'Maria'),
  fighter:person(1235, 300, '#c9d2ff', 'Deniz'),
  carOwn: person(1660, 800, '#ffb9d3', 'Sam'),
  kid:    person(330, 1000,'#b7ffd9', 'Ana'),
  cop:    person(1520, 1060,'#9fd0ff', 'Officer')
};
const crowd = [];
/* Pedestrians walk fixed loops. Deterministic routes keep the demo repeatable —
   no random wandering that can strand an NPC inside a wall mid-pitch. */
const ROUTES = [
  [[210,452],[700,452],[700,632],[210,632]],          // west block, both sidewalks
  [[960,452],[1460,452],[1460,632],[960,632]],        // east block
  [[862,240],[862,960],[862,1210]],                   // the avenue, north to south
  [[300,1002],[1000,1002],[1000,1040],[300,1040]],    // lower road
  [[1120,1002],[1760,1002]],                          // lower road east
  [[950,762],[1250,762],[1250,900],[950,900]],        // park loop
  [[700,452],[700,632]],                              // crossing the street
  [[1300,452],[1300,632]]                             // crossing the street
];
const SKIN = ['#8f98c4','#a79ec0','#93a8bd','#bfa9a0','#a3b0d6','#c0a5b4'];
for(let i=0;i<20;i++){
  const rt = ROUTES[i % ROUTES.length];
  const idx = i % rt.length;
  const n = person(rt[idx][0], rt[idx][1], SKIN[i % SKIN.length], '');
  n.route = rt; n.node = (idx+1) % rt.length;
  n.speed = 34 + (i % 5) * 7;
  n.mode = 'walk'; n.timer = (i % 7) * 0.6;
  n.walk = 0;
  crowd.push(n);
}
/* a few people who just stand somewhere — outside the shop, by the park bench */
[[392,452],[248,452],[1000,700],[1226,452],[556,1002]].forEach((p,i)=>{
  const n = person(p[0], p[1], SKIN[(i+2) % SKIN.length], '');
  n.route = null; n.mode = 'stand'; n.timer = i; n.speed = 26; n.walk = 0;
  n.anchor = {x:p[0], y:p[1]};
  crowd.push(n);
});
const particles = [];
const rainDrops = [];
for(let i=0;i<220;i++) rainDrops.push({x:Math.random()*VW, y:Math.random()*VH, s:3+Math.random()*5, l:8+Math.random()*12});

/* ---------- camera ---------- */
const cam = {x:P.x, y:P.y, z:1, zTarget:1};
function focusOn(x, y, zoom){ S.focus = {x, y}; cam.zTarget = zoom || 1.55; }
function releaseCam(){ S.focus = null; cam.zTarget = 1; }
function hitStop(scale, ms){
  S.timeScale = scale;
  setTimeout(()=>{ S.timeScale = 1; }, ms);
}
/* a crime makes the block react — panic, gawking, a siren somewhere else */
function alarm(x, y, kind){
  for(const n of crowd){
    const d = dist(n.x, n.y, x, y);
    if(d > 420) continue;
    if(kind === 'gather' && d > 120 && d < 340){ n.mode = 'gather'; n.timer = 7; n.gx = x; n.gy = y; }
    else { n.mode = 'flee'; n.timer = 2.6 + (d/420)*1.4; n.gx = x; n.gy = y; }
  }
  S.sirens = 1.6;
  S.flags.policeAttention += 1;
}
