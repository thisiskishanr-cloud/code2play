"use strict";
/* +500 — Mission logic and the three acts. Loaded after world/ui, before main. */

/* ---------- interactables ---------- */
function interactables(){
  const list = [];
  if(S.act === 1){
    if(S.mission === 1) list.push({x:markerDefs.store.x, y:markerDefs.store.y, label:'Rob the register', run:missionStore});
    if(S.mission === 2) list.push({x:markerDefs.alley.x, y:markerDefs.alley.y, label:'Send a message', run:missionFight});
    if(S.mission === 3) list.push({x:markerDefs.car.x, y:markerDefs.car.y, label:'Hotwire the car', run:missionCar});
    if(S.mission === 4) list.push({x:markerDefs.escape.x, y:markerDefs.escape.y, label:'Ditch the car', run:endChase});
    if(S.mission === 5) list.push({x:markerDefs.home.x, y:markerDefs.home.y, label:'Go inside', run:goHome});
  }
  if(S.act === 2){
    if(!S.seen.store) list.push({x:markerDefs.store.x, y:markerDefs.store.y, label:'Look', run:cbStore});
    if(!S.seen.fight) list.push({x:markerDefs.alley.x, y:markerDefs.alley.y, label:'Look', run:cbFight});
    if(!S.seen.car)   list.push({x:markerDefs.car.x,   y:markerDefs.car.y,   label:'Look', run:cbCar});
    if(S.seen.store && S.seen.fight && S.seen.car)
      list.push({x:markerDefs.offer.x, y:markerDefs.offer.y, label:'Take the job', run:revealSequence});
  }
  if(S.act === 3){
    if(S.mission === 10) list.push({x:markerDefs.final.x, y:markerDefs.final.y, label:'Go in', run:finalJob});
    if(S.mission === 11) list.push({x:markerDefs.end.x, y:markerDefs.end.y, label:'Stop', run:finalChoice});
  }
  return list;
}
function tryInteract(){
  const near = interactables().filter(i => dist(P.x,P.y,i.x,i.y) < 62)[0];
  if(near){ S.busy = true; hidePrompt(); near.run().then(()=>{ S.busy = false; }); }
}
function hidePrompt(){ $('prompt').classList.remove('on'); }

/* ---------- missions: ACT I ---------- */
async function missionStore(){
  banner('MISSION 01', 'QUICK CASH');
  focusOn(NPC.owner.x, NPC.owner.y - 20, 1.6);
  await wait(500);
  await say("Afternoon. Take whatever's in the drawer.", {who:'YOU'});
  await say("Okay. Okay — take it, just don't—", {who:'SHOP OWNER'});
  hideSay();

  // the grab: three quick beats, each with a hit of feedback
  for(let i=0;i<3;i++){
    sfxHit();
    S.shake = 12;
    burst(NPC.owner.x, NPC.owner.y - 14, '#ffb347', 12, 0.7);
    pop('+$' + [200,200,100][i], '');
    await wait(180);
  }
  hitStop(0.25, 300);
  NPC.owner.mode = 'stand';
  NPC.owner.shocked = true;
  alarm(P.x, P.y, 'flee');          // the street scatters — no explanation given
  burst(P.x, P.y - 10, '#3dff8b', 40, 1.4);
  reward({money:500, xp:120, rep:6});
  S.flags.robbedStore = true;
  await wait(700);
  NPC.owner.hidden = true;
  releaseCam();
  await wait(500);
  S.mission = 2;
  objective('Mission 02 — the one who says no. Alley behind the pawn shop.');
  banner('CLEAN GETAWAY', '+$500');
  await wait(400);
}

async function missionFight(){
  banner('MISSION 02', 'SEND A MESSAGE');
  focusOn(NPC.fighter.x, NPC.fighter.y - 20, 1.7);
  await wait(500);
  await say("You were told to pay. You didn't.", {who:'YOU'});
  hideSay();
  objective('Press E — three times', 'FINISH IT');
  const labels = ['HIT', 'HIT', 'FINISHER'];
  for(let hits = 0; hits < 3; hits++){
    await keypress();
    sfxHit();
    S.shake = 14 + hits*4;
    hitStop(0.2, 140 + hits*40);
    burst(NPC.fighter.x, NPC.fighter.y - 12, '#ff2e88', 18 + hits*8, 1 + hits*0.3);
    pop(labels[hits] + (hits ? '  x' + (hits+1) : ''), 'rep');
    S.xp += 60; S.rep += 2;
    NPC.fighter.x += 9; NPC.fighter.y += 4;
    await wait(220);
  }
  sfxThud();
  S.shake = 22;
  hitStop(0.15, 380);
  NPC.fighter.state = 'down';
  S.flags.npcInjured = true;
  burst(NPC.fighter.x, NPC.fighter.y, '#5a2740', 26, 0.8);
  alarm(NPC.fighter.x, NPC.fighter.y, 'gather');   // a small crowd forms around him
  reward({xp:300, rep:10});
  await wait(900);
  releaseCam();
  await wait(400);
  S.mission = 3;
  objective('Mission 03 — the lot on the east side. Something with keys in it.');
  banner('MESSAGE SENT', '+300 XP');
  await wait(400);
}

async function missionCar(){
  banner('MISSION 03', 'HOT RIDE');
  focusOn(1620, 700, 1.65);
  await wait(500);
  await say("Someone left it running. Practically a gift.", {who:'YOU'});
  hideSay();
  // hotwire: two sparks, then the alarm goes off and the lot empties
  for(let i=0;i<2;i++){
    sfxHit();
    S.shake = 10;
    burst(1620, 690, '#ffe066', 14, 0.8);
    await wait(240);
  }
  for(let i=0;i<3;i++){ tone(880, 0.12, 'square', 0.08); await wait(180); tone(660, 0.12, 'square', 0.08); await wait(180); }
  alarm(1620, 700, 'flee');
  S.shake = 16;
  releaseCam();
  S.driving = true;
  S.chase = true;
  S.flags.carStolen = true;
  P.x = 1640; P.y = 760;
  policeCars = [
    {x:1520, y:1050, vx:0, vy:0},
    {x:900,  y:1040, vx:0, vy:0}
  ];
  S.mission = 4;
  objective('Lose them — west side, under the overpass', 'CHASE');
  sfxSiren();
  burst(P.x, P.y, '#ffb347', 20);
}

async function endChase(){
  S.driving = false; S.chase = false; policeCars = [];
  S.shake = 14;
  hitStop(0.3, 300);
  reward({money:1000, xp:150, rep:12});
  S.flags.policeAttention += 2;
  banner('LOST THEM', '+$1,000');
  await wait(1600);
  await say('Three jobs. One afternoon. Nobody even has your name.', {who:'YOU'});
  hideSay();
  // short free roam — the player keeps control, the city is just slightly busier
  S.mission = 5;
  policeCars = [{x:1500, y:1030, vx:0, vy:0, patrol:true}];
  objective('Lie low — head back to the house', 'COOLDOWN');
  banner('DAY OVER', 'GO HOME');
}

async function goHome(){
  await say('You walk it off. The block looks the way it always does.', {quiet:true});
  hideSay();
  await act2Intro();
}

/* ---------- ACT II ---------- */
async function act2Intro(){
  await fadeOut(700);
  stopMusic();
  S.act = 2;
  S.mission = 0;
  S.rain = 0.45; S.dark = 0.35;
  NPC.owner.hidden = false; NPC.owner.x = 250; NPC.owner.y = 470; NPC.owner.state = 'sit';
  NPC.fighter.state = 'down';
  NPC.carOwn.x = 1600; NPC.carOwn.y = 760; NPC.carOwn.state = 'search';
  P.x = 700; P.y = 545;
  objective('Walk the block', 'LATER THAT WEEK');
  await actCard('ACT II', 'THE SAME STREETS', 1700);
  await fadeIn(700);
  startDrone();
  startAct2Music();
  await say('Same city. Nobody put a marker on anything.', {quiet:true});
  hideSay();
}

async function cbStore(){
  S.seen.store = true;
  await say('The shutter is down. A sheet of paper taped inside the glass: CLOSED.', {quiet:true});
  await say("I'm sorry. There's nothing left in there.", {who:'MARIA'});
  hideSay();
  checkCallbacks();
}
async function cbFight(){
  S.seen.fight = true;
  await say('An ambulance is folding its doors shut at the mouth of the alley.', {quiet:true});
  await say("He's my brother. He wouldn't say who did it.", {who:'WOMAN AT THE ALLEY'});
  hideSay();
  checkCallbacks();
}
async function cbCar(){
  S.seen.car = true;
  await say('Someone is standing in the empty space where a car used to be, checking the same spot again.', {quiet:true});
  await say("It was there. I know it was there. I have work at six.", {who:'SAM'});
  hideSay();
  checkCallbacks();
}
function checkCallbacks(){
  const n = (S.seen.store?1:0) + (S.seen.fight?1:0) + (S.seen.car?1:0);
  if(n === 3){ objective('One more job — meet the contact on the main street', 'NEW JOB'); }
  else objective('Walk the block  ·  ' + n + '/3', 'LATER THAT WEEK');
}

/* ---------- THE REVEAL ---------- */
async function revealSequence(){
  banner('NEW JOB', 'ONE MORE JOB');
  await wait(900);
  await say('Easy one. Same as the others. You know the place.', {who:'CONTACT'});
  await say("Wait — you're the one who did Maria's shop.", {who:'CONTACT'});
  hideSay();

  // freeze + heavy glitch
  stopDrone();
  sfxGlitchHeavy();
  $('hud').classList.add('glitch');
  S.shake = 22;
  await wait(550);
  $('hud').classList.remove('glitch');
  setHUD(false);
  S.phase = 'cine';

  // ===== CINEMATIC CCTV FLASHBACK 1: MARIA'S STORE =====
  sfxCctvSwitch();
  cam.x = 300; cam.y = 470; cam.z = 1.9; cam.zTarget = 2.4;
  P.hidden = false; P.x = 280; P.y = 470; P.face = 1; P.vx = 0; P.vy = 0;
  NPC.owner.hidden = false; NPC.owner.x = 320; NPC.owner.y = 470; NPC.owner.state = 'surrender';
  setCctvCam('CAM 01 // STORE REGISTER', '14:22:05:18', 'cam-store', 'TRACKING: SUSPECT', {top:'48%', left:'45%', width:'130px', height:'130px'});
  showCctvGlitch(200);

  // the grab
  sfxHit(); S.shake = 12;
  burst(NPC.owner.x, NPC.owner.y - 14, '#ffb347', 16, 0.8);
  $('cctvReward').textContent = '+$500';
  $('cctvReward').className = 'cctv-reward';
  $('cctvReward').style.display = 'block';
  sfxReward();
  await wait(950);

  // the cost
  sfxSubBassDrop(); sfxGlitch();
  $('cctvReward').classList.add('glitch-out');
  $('cctvTrackbox').classList.add('alert');
  $('cctvTrackTag').textContent = 'VICTIM: MARIA';
  $('cctvVictimName').innerHTML = 'MARIA, 54 <span style="font-size:14px;color:#ff2e88;letter-spacing:.2em">OWNER</span>';
  $('cctvVictimDesc').textContent = 'Ran the corner shop alone for nine years. Business closed. Her income stopped.';
  $('cctvVictim').classList.add('show');
  NPC.owner.state = 'crying';
  P.x = 240;
  showCctvStamp('BUSINESS CLOSED');
  sfxHeart();
  await wait(2500);

  // ===== CINEMATIC CCTV FLASHBACK 2: ALLEYWAY ASSAULT =====
  sfxCctvSwitch(); showCctvGlitch(200);
  cam.x = 1235; cam.y = 310; cam.z = 2.0; cam.zTarget = 2.5;
  P.hidden = false; P.x = 1210; P.y = 300; P.face = 1;
  NPC.fighter.hidden = false; NPC.fighter.x = 1245; NPC.fighter.y = 300; NPC.fighter.state = 'idle';
  NPC.witness.hidden = false; NPC.witness.x = 1285; NPC.witness.y = 390; NPC.witness.state = 'idle';
  setCctvCam('CAM 04 // ALLEYWAY REAR', '16:48:12:04', 'cam-fight', 'TRACKING: TARGET', {top:'48%', left:'52%', width:'140px', height:'140px'});

  // the hit
  sfxHit(); S.shake = 16;
  burst(NPC.fighter.x, NPC.fighter.y - 12, '#ff2e88', 22, 1.2);
  $('cctvReward').textContent = '+300 XP';
  $('cctvReward').className = 'cctv-reward';
  $('cctvReward').style.color = 'var(--sodium)';
  $('cctvReward').style.display = 'block';
  await wait(850);

  // the cost
  sfxThud(); sfxSubBassDrop(); sfxGlitch();
  NPC.fighter.state = 'down';
  NPC.witness.x = 1260; NPC.witness.y = 315; NPC.witness.state = 'kneel';
  $('cctvReward').classList.add('glitch-out');
  $('cctvTrackbox').classList.add('alert');
  $('cctvTrackTag').textContent = 'CASUALTY: DENIZ';
  $('cctvVictimName').innerHTML = 'DENIZ, 31 <span style="font-size:14px;color:#ff2e88;letter-spacing:.2em">HOSPITALISED</span>';
  $('cctvVictimDesc').textContent = 'Two fractures. Out of work for six months. His family covering his medical costs.';
  $('cctvVictim').classList.add('show');
  showCctvStamp('HOSPITALISED');
  sfxHeart();
  await wait(2500);
  NPC.witness.hidden = true;

  // ===== CINEMATIC CCTV FLASHBACK 3: EAST LOT GRAND THEFT =====
  sfxCctvSwitch(); showCctvGlitch(200);
  cam.x = 1620; cam.y = 730; cam.z = 1.8; cam.zTarget = 2.2;
  P.hidden = true;
  setCctvCam('CAM 09 // EAST LOT B', '17:35:40:29', 'cam-car', 'TRACKING: VEHICLE', {top:'48%', left:'49%', width:'160px', height:'160px'});

  // hotwire & tire peel
  sfxHit(); burst(1620, 690, '#ffe066', 18, 1);
  skidMarks.push({x1:1620, y1:690, x2:1620, y2:820});
  skidMarks.push({x1:1620, y1:820, x2:1500, y2:840});
  $('cctvReward').textContent = '+$1,000';
  $('cctvReward').className = 'cctv-reward';
  $('cctvReward').style.color = 'var(--money)';
  $('cctvReward').style.display = 'block';
  sfxReward();
  await wait(950);

  // the cost - time skip & owner discovery
  sfxRewind(); showCctvGlitch(260);
  NPC.carOwn.hidden = false; NPC.carOwn.x = 1620; NPC.carOwn.y = 710; NPC.carOwn.state = 'searching_shock';
  sfxSubBassDrop(); sfxGlitch();
  $('cctvReward').classList.add('glitch-out');
  $('cctvTrackbox').classList.add('alert');
  $('cctvTrackTag').textContent = 'VICTIM: SAM';
  $('cctvVictimName').innerHTML = 'SAM, 26 <span style="font-size:14px;color:#ff2e88;letter-spacing:.2em">NIGHT SHIFT</span>';
  $('cctvVictimDesc').textContent = 'Night shift forty minutes away. Late every night now. Lost her job the next week.';
  $('cctvVictim').classList.add('show');
  showCctvStamp('REPORTED STOLEN');
  sfxHeart();
  await wait(2700);

  // ===== TRANSITION TO CONSEQUENCE LEDGER =====
  hideCctvOverlay();
  P.hidden = false; P.x = 700; P.y = 545;
  NPC.owner.x = 250; NPC.owner.y = 470; NPC.owner.state = 'sit';
  NPC.fighter.x = 1235; NPC.fighter.y = 300; NPC.fighter.state = 'down';
  NPC.carOwn.x = 1600; NPC.carOwn.y = 760; NPC.carOwn.state = 'search';
  NPC.witness.hidden = true;
  cam.zTarget = 1; cam.x = 960; cam.y = 650;

  // ledger
  const rows = [
    ['Robbed the store', 'Business closed. Her income stopped.'],
    ['Attacked the man in the alley', 'Hospitalised. His family is covering for him.'],
    ['Stole the car', 'Reported. She is late every night now.']
  ];
  const table = $('ledgerTable');
  table.innerHTML = '';
  showOverlay('ledger', true);
  $('ledgerLine').textContent = '';
  for(let i=0;i<rows.length;i++){
    const tr = document.createElement('tr');
    tr.style.animationDelay = (i*0.18) + 's';
    tr.innerHTML = '<td class="a">' + rows[i][0] + '</td><td class="b">' + rows[i][1] + '</td>';
    table.appendChild(tr);
    sfxHit();
    await wait(500);
  }
  await wait(600);
  $('ledgerLine').textContent = 'You thought the game was counting your rewards. It was counting what they cost.';
  startDrone();
  await wait(3600);
  showOverlay('ledger', false);
  await act3Intro();
}


/* ---------- ACT III ---------- */
async function act3Intro(){
  await fadeOut(600);
  stopMusic();
  S.act = 3;
  S.mission = 10;
  S.rain = 1; S.dark = 0.68;
  S.flags.policeAttention += 2;
  P.x = 700; P.y = 545;
  NPC.cop.x = 1450; NPC.cop.y = 900;
  policeCars = [{x:1500,y:520,vx:0,vy:0,parked:true},{x:300,y:1030,vx:0,vy:0,parked:true}];
  setHUD(true);
  refreshHUD();
  objective('One last job — the corner shop on the west side', 'OFFER: +$5,000');
  await actCard('ACT III', 'LIVING WITH IT', 1900);
  await fadeIn(700);
  await say('The job is still there. The money is still real. Nothing has been taken away from you.', {quiet:true});
  hideSay();
}

async function finalJob(){
  banner('ONE LAST JOB', '+$5,000');
  await wait(900);
  stopDrone();
  await say('The man behind the counter looks up and stops moving.', {quiet:true});
  await say("Please. Not again.", {who:'SHOPKEEPER'});
  hideSay();
  const pick = await choices([
    {label:'TAKE THE MONEY', note:'+$5,000'},
    {label:'STEP BACK', note:'nothing'}
  ]);
  if(pick === 0){
    S.flags.finalChoice = 'rob';
    // reward language, stripped of its sound
    reward({money:5000, xp:400, silent:true});
    await say('The money goes in the bag. No sound plays.', {quiet:true});
  } else {
    S.flags.finalChoice = 'walk';
    S.flags.walkedAway = true;
    await say('You put your hands where he can see them and back out of the door.', {quiet:true});
    pop('+0', 'mute');
  }
  hideSay();
  startDrone();
  S.mission = 11;
  objective('Walk home', '');
  $('objtag').textContent = '';
  await wait(600);
  await say('Walk home. The city is on the way.', {quiet:true});
  hideSay();
}

async function finalChoice(){
  stopDrone();
  await say('A woman with a bag of shopping sees you, stops, and waits for you to pass.', {quiet:true});
  hideSay();
  const pick = await choices([
    {label:'ROB AGAIN', note:'you know how'},
    {label:'WALK AWAY', note:'nothing changes'},
    {label:'HELP', note:'she may say no'}
  ]);
  const ends = [
    {t:'ROB AGAIN', p:'You do it well. It takes eleven seconds. You know exactly how much it is worth now, and you do it anyway — that is the part you will keep.'},
    {t:'WALK AWAY', p:'You keep walking. The street closes behind you the way it always did. Nothing is repaired and nothing is added; the city simply carries what you left in it.'},
    {t:'HELP',      p:'You pick up the bag. She takes it back without looking at you. It does not undo anything, and it was still worth doing — those two facts sit next to each other.'}
  ];
  await finale(ends[pick]);
}

async function finale(end){
  await fadeOut(900);
  setHUD(false);
  showOverlay('endcard', false);
  await wait(400);

  // the reward HUD returns one last time
  const el = document.createElement('div');
  el.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;font-family:var(--display);' +
                     'font-size:140px;color:#3dff8b;text-shadow:0 0 60px rgba(61,255,139,.5);z-index:9;opacity:0;transition:opacity .5s';
  el.textContent = '+500';
  stage.appendChild(el);
  $('fade').style.opacity = 1;
  requestAnimationFrame(()=>{ el.style.opacity = 1; });
  sfxReward();
  await wait(1400);
  el.style.transition = 'opacity 2.4s';
  el.style.opacity = 0;
  await wait(2500);
  el.remove();

  $('endTitle').textContent = end.t;
  $('endText').innerHTML = end.p +
    '<br><br><span style="color:#fff">You can\'t undo what you\'ve done. But you can decide what you do next.</span>';
  showOverlay('endcard', true);
  S.phase = 'end';
}

/* ---------- presenter jumps ---------- */
async function jumpToAct(n){
  if(S.busy) return;
  S.busy = true;
  hideSay(); $('choices').classList.remove('on'); pressResolve = null;
  hideCctvOverlay();
  showOverlay('flash', false); showOverlay('ledger', false); showOverlay('endcard', false);
  P.hidden = false; NPC.witness.hidden = true; releaseCam();
  S.driving = false; S.chase = false; policeCars = [];
  if(n === 1){
    S.act = 1; S.mission = 1; S.money = 0; S.xp = 0; S.rep = 0;
    S.rain = 0; S.dark = 0; S.seen = {store:false,fight:false,car:false};
    NPC.owner.hidden = false; NPC.owner.state = 'idle'; NPC.fighter.state = 'idle';
    NPC.fighter.x = 1235; NPC.fighter.y = 300; NPC.carOwn.state = 'idle';
    P.x = 700; P.y = 545;
    setHUD(true); refreshHUD(); startMusic(); stopDrone();
    objective('Mission 01 — the corner store on the west side');
    await fadeIn(300);
  }
  if(n === 2){
    S.act = 1; S.mission = 4; S.money = 1500; S.xp = 570; S.rep = 28;
    S.flags.robbedStore = S.flags.npcInjured = S.flags.carStolen = true;
    S.seen = {store:false,fight:false,car:false};
    refreshHUD(); setHUD(true); await act2Intro();
  }
  if(n === 3){
    S.act = 2; S.money = 1500; S.xp = 570; S.rep = 28;
    S.flags.robbedStore = S.flags.npcInjured = S.flags.carStolen = true;
    S.seen = {store:true,fight:true,car:true};
    refreshHUD(); await act3Intro();
  }
  S.phase = 'play';
  S.busy = false;
}

/* ---------- start ---------- */
$('startBtn').onclick = async ()=>{
  audio();
  showOverlay('title', false);
  S.phase = 'play';
  S.act = 1; S.mission = 1;
  setHUD(true); refreshHUD(); startMusic();
  await actCard('ACT I', 'THE FANTASY', 1600);
  objective('Mission 01 — the corner store on the west side');
  banner('WELCOME BACK', 'GET PAID');
};
$('againBtn').onclick = ()=> location.reload();
