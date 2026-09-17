"use strict";
/* +500 — All sound is synthesised with the Web Audio API — there are no audio files. */

/* ---------- audio (synthesised, no assets) ---------- */
let AC = null, musicTimer = null, droneNode = null;
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
  const notes = [98, 98, 130.8, 110, 98, 98, 146.8, 130.8];
  let i = 0;
  musicTimer = setInterval(()=>{
    tone(notes[i%notes.length], 0.22, 'triangle', 0.05);
    if(i%2===0) tone(notes[i%notes.length]*4, 0.08, 'square', 0.02);
    i++;
  }, 250);
}
function stopMusic(){ if(musicTimer){ clearInterval(musicTimer); musicTimer = null; } }
function startDrone(){
  const ac = audio(); if(!ac || droneNode) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type='sine'; o.frequency.value = 48;
  g.gain.value = 0.05; o.connect(g); g.connect(ac.destination); o.start();
  droneNode = {o,g};
}
function stopDrone(){ if(droneNode){ try{droneNode.o.stop();}catch(e){} droneNode = null; } }
function sfxHeart(){ tone(58,0.16,'sine',0.22); setTimeout(()=>tone(52,0.2,'sine',0.18), 220); }
