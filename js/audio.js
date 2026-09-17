"use strict";
/* +500 — All sound is synthesised with the Web Audio API — there are no audio files. */

/* ---------- audio (synthesised, no assets) ---------- */
let AC = null, musicTimer = null, droneNode = null, bgAudio = null;
function audio(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(freq, dur, type, vol, when){
  const ac = audio(); if(!ac) return;
  const t = (when||ac.currentTime);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type||'square'; o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol||0.12, t+0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
  o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t+dur+0.05);
}
function sfxReward(){
  const ac = audio(); if(!ac) return; const t = ac.currentTime;
  [0,1,2,3].forEach((i)=> tone([660,880,1100,1320][i], 0.18, 'square', 0.09, t+i*0.055));
}
function sfxHit(){ tone(140+Math.random()*60, 0.12, 'sawtooth', 0.14); }
function sfxThud(){ tone(70, 0.3, 'sine', 0.2); }
function sfxSiren(){ tone(720, 0.35, 'sine', 0.05); tone(560, 0.35, 'sine', 0.05, (AC?AC.currentTime+0.35:0)); }
function sfxGlitch(){
  const ac = audio(); if(!ac) return;
  for(let i=0;i<10;i++) tone(120+Math.random()*1400, 0.05, 'square', 0.05, ac.currentTime+i*0.045);
}
function startMusic(){
  stopMusic();
  if (!bgAudio) {
    bgAudio = new Audio();
    bgAudio.loop = true;
    bgAudio.volume = 0.5;
  }
  bgAudio.src = 'assets/videoplayback.m4a';
  bgAudio.play().catch(e => console.log("Audio play failed:", e));
}
function startAct2Music(){
  stopMusic();
  if (!bgAudio) {
    bgAudio = new Audio();
    bgAudio.loop = true;
    bgAudio.volume = 0.5;
  }
  bgAudio.src = 'assets/suspense_soundridemusic.mp3';
  bgAudio.play().catch(e => console.log("Audio play failed:", e));
}
function startAct3Music(){
  stopMusic();
  if (!bgAudio) {
    bgAudio = new Audio();
    bgAudio.loop = true;
    bgAudio.volume = 0.5;
  }
  bgAudio.src = 'assets/last_cat.mp3';
  bgAudio.play().catch(e => console.log("Audio play failed:", e));
}
function stopMusic(){ 
  if(musicTimer){ clearInterval(musicTimer); musicTimer = null; } 
  if (bgAudio) {
    bgAudio.pause();
  }
}
function startDrone(){
  const ac = audio(); if(!ac || droneNode) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type='sine'; o.frequency.value = 48;
  g.gain.value = 0.05; o.connect(g); g.connect(ac.destination); o.start();
  droneNode = {o,g};
}
function stopDrone(){ if(droneNode){ try{droneNode.o.stop();}catch(e){} droneNode = null; } }
function sfxHeart(){ tone(58,0.16,'sine',0.22); setTimeout(()=>tone(52,0.2,'sine',0.18), 220); }
function sfxCctvSwitch(){
  const ac = audio(); if(!ac) return;
  const t = ac.currentTime;
  tone(1800, 0.04, 'square', 0.06, t);
  tone(90, 0.06, 'sawtooth', 0.12, t + 0.02);
  for(let i=0;i<4;i++) tone(200 + Math.random()*2400, 0.03, 'square', 0.04, t + 0.02 + i*0.015);
}
function sfxRewind(){
  const ac = audio(); if(!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(2400, t + 0.28);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.08, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + 0.3);
}
function sfxSubBassDrop(){
  const ac = audio(); if(!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(95, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 0.9);
  g.gain.setValueAtTime(0.001, t);
  g.gain.linearRampToValueAtTime(0.24, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  o.connect(g); g.connect(ac.destination);
  o.start(t); o.stop(t + 0.95);
}
function sfxGlitchHeavy(){
  const ac = audio(); if(!ac) return;
  const t = ac.currentTime;
  for(let i=0;i<14;i++){
    tone(80 + Math.random()*2200, 0.04 + Math.random()*0.03, i%2===0?'sawtooth':'square', 0.08, t + i*0.03);
  }
  tone(50, 0.4, 'sine', 0.18, t);
}
function sfxStamp(){
  tone(65, 0.35, 'sawtooth', 0.25);
  tone(120, 0.12, 'square', 0.15);
}

