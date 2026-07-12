// Jamlab engine core: mode state, pitch/scales, voices, key UI, backing schedulers, controls.
// Data lives in modes.js/i18n.js, the audio graph in audio.js, visuals in viz.js, recording in rec.js.
import { LANG, t, degName, setLangCode } from './i18n.js';
import { settings, saveSettings } from './settings.js';
import { MODES, NOTE_NAMES, HARMONY, HARM_OPTS, HARM_LADS, RHYTHM, RHY_OPTS,
         ARP, DREAMARP, GMPAT, DARBUKA, RIDE, DARING, QUAL, JAZZ_PROG,
         SYNTH_PROG, LOFI_PROG, LAB_PRESETS } from './modes.js';
import { actx, comp, leadBus, leadFilter, leadOut, accBus, busPerc, busBass, busChord, noiseBuf,
         initAudio, resumeAudio, accGain } from './audio.js';
import { viz, cssRgb } from './viz.js';
import { refreshRecLabel } from './rec.js';
import { isPro, modeLocked, showPaywall, onProChange, initBilling, KITCHEN } from './paywall.js';
import { initTutorial } from './tutorial.js';
import { track, trackOnce, sinceLaunch } from './analytics.js';

// true inside the native Capacitor app (vs the plain web build)
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const TOUCH = NATIVE || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
if(TOUCH) document.body.classList.add('touch');   // hide keyboard hints/labels on touch

/* ============ Native niceties (Capacitor bridge, no-ops on the web) ============ */
const NPLUG = (NATIVE && window.Capacitor.Plugins) ? window.Capacitor.Plugins : null;
if(NPLUG && NPLUG.KeepAwake){ try{ NPLUG.KeepAwake.keepAwake(); }catch(e){} }   // an instrument must not dim mid-jam
function tapHaptic(style){ if(NPLUG && NPLUG.Haptics){ try{ NPLUG.Haptics.impact({style}); }catch(e){} } }

/* ============ Mode state ============ */

let M = MODES.blues;
let SCALE = MODES.blues.scales.minor;
let SCALEDN = null;                                // descending variant of the scale (melodic-minor style), or null
let gyroV=0;                                       // current tilt value (0..1)
let currentIndex = 0;


/* ============ Web Audio ============ */
const activeVoices = new Map();
let kbBend=0;
let liteNote=false;                                // set around glissando noteOn: build a lightweight voice

function vizBeat(time,s){ if(settings.viz && actx) setTimeout(()=>viz.pulse(s), Math.max(0,(time-actx.currentTime)*1000)); }

/* ============ Gyroscope (phone tilt) ============ */
function applyGyro(x){
  if(settings.gyro==='volume'){ if(leadOut) leadOut.gain.value=0.12+x*0.9; }
  else if(settings.gyro==='tone'){ if(leadFilter) leadFilter.frequency.value=500+x*5500; }
  else if(settings.gyro==='vibrato'){ for(const v of activeVoices.values()) if(v.vibG) v.vibG.gain.value=(v.vibBase||4)+x*18; }
}
function resetGyroParams(){ if(leadOut) leadOut.gain.value=settings.volSolo; if(leadFilter) leadFilter.frequency.value=settings.tone;
  for(const v of activeVoices.values()) if(v.vibG) v.vibG.gain.value=v.vibBase; }
function onTilt(e){ if(settings.gyro==='off') return; const b=e.beta; if(b==null) return;
  gyroV=Math.max(0,Math.min(1,(b-15)/55)); applyGyro(gyroV); }
let gyroOn=false;
function enableGyro(){ if(gyroOn) return;
  const add=()=>{ window.addEventListener('deviceorientation',onTilt); gyroOn=true; };
  if(typeof DeviceOrientationEvent!=='undefined' && DeviceOrientationEvent.requestPermission)
    DeviceOrientationEvent.requestPermission().then(p=>{ if(p==='granted') add(); }).catch(()=>{});
  else add();
}

/* ============ Pitch (depends on mode) ============ */
function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }
function freqToMidi(f){ return 69+12*Math.log2(f/440); }
function midiToName(m){ m=Math.round(m); return NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1); }
let jazzRoot=57, jazzLabel="";                     // scale root in jazz (follows the chord) + "chord · scale" label
let curChord=null;                                 // {r:root pc, ivs} of the current chord (for 1/3/5/7 highlight) — jazz/blues
function leadRoot(){ return M.id==='jazz' ? jazzRoot : settings.rootMidi; }
function indexToMidi(i){ const len=SCALE.length,o=Math.floor(i/len),s=((i%len)+len)%len; return leadRoot()+12*o+SCALE[s]; }
// Overtone flute: the raw series is unplayable outside harmonics 8–15 (the "clarino" register,
// a near-major scale). Fold that chunk so every octave repeats it, transposed — just intonation kept.
const HSER=[8,9,10,11,12,13,14,15];
function harmFold(i){ const o=Math.floor(i/8), s=((i%8)+8)%8; return {o, h:HSER[s]}; }
function centScale(){ return M.centScales && M.centScales[settings.variant]; }   // non-tempered tuning (gamelan), else null
function pitchFreq(i){ if(M.kind==='harmonic'){ const {o,h}=harmFold(i); return midiToFreq(settings.rootMidi)*(h/8)*Math.pow(2,o); }
  const cs=centScale();
  if(cs){ const len=cs.length,o=Math.floor(i/len),s=((i%len)+len)%len; return midiToFreq(leadRoot())*Math.pow(2,(o*1200+cs[s])/1200); }
  return midiToFreq(indexToMidi(i)); }
function pitchLabel(i){
  if(M.kind==='harmonic'){ return {deg:harmFold(i).h, note:midiToName(freqToMidi(pitchFreq(i)))}; }
  const len=SCALE.length, s=((i%len)+len)%len;
  return {deg:s+1, note:midiToName(centScale()?freqToMidi(pitchFreq(i)):indexToMidi(i))};   // cent tunings: name = nearest tempered note
}

function indexRange(){
  const loF=midiToFreq(Math.min(settings.minMidi,settings.maxMidi)), hiF=midiToFreq(Math.max(settings.minMidi,settings.maxMidi));
  let a=null,b=null;
  for(let i=-64;i<=64;i++){ const f=pitchFreq(i); if(f>=loF-0.01&&f<=hiF+0.01){ if(a===null)a=i; b=i; } }
  if(a===null) a=b=0; return [a,b];
}
function clampIndex(i){ const [a,b]=indexRange(); return Math.max(a,Math.min(b,i)); }
function nearestIndex(targetFreq){
  const [a,b]=indexRange(); const tm=freqToMidi(targetFreq);
  let best=a, bestD=Infinity, bestM=-Infinity;
  for(let i=a;i<=b;i++){ const m=freqToMidi(pitchFreq(i)), d=Math.abs(m-tm);
    if(d<bestD || (d===bestD && m>bestM)){ best=i; bestD=d; bestM=m; } }
  return best;
}

/* ============ Bend targets ============ */
let liveChordPcs=null;
function currentChordPcs(){ if(accOn && liveChordPcs) return liveChordPcs;
  return settings.variant==='major' ? new Set([0,4,7,10]) : new Set([0,3,7,10]); }
function bendTargets(i){
  if(M.noBend) return {up:null,down:null};           // struck metallophones don't bend (gamelan)
  if(M.kind==='harmonic'){                          // bend to the neighbouring step of the folded series
    const f=pitchFreq(i);
    const up={amt:Math.min(2,12*Math.log2(pitchFreq(i+1)/f)), name:t('ord',{n:harmFold(i+1).h})};
    const down={amt:Math.min(2,12*Math.log2(f/pitchFreq(i-1))), name:t('ord',{n:harmFold(i-1).h})};
    return {up, down};
  }
  const len=SCALE.length, step=((i%len)+len)%len, pc=SCALE[step];
  // bend targets = scale tones ∪ current-chord tones. For blues this is essential: the signature
  // bends (4→♭5, ♭3→3) aim at blue notes that live in the scale but never in the chord.
  const chord = M.id==='blues' ? new Set([...SCALE, ...currentChordPcs()]) : new Set(SCALE);
  let up=null,down=null;
  for(const a of [1,2]){ const tp=(pc+a)%12;    if(chord.has(tp)){ up  ={amt:a,name:degName(tp)}; break; } }
  for(const a of [1,2]){ const tp=(pc-a+12)%12; if(chord.has(tp)){ down={amt:a,name:degName(tp)}; break; } }
  return {up,down};
}

/* ============ Voice (timbre depends on mode) ============ */
function makeVoice(freq,maxUp,maxDown,approach,when){
  const t0=when||actx.currentTime, g=actx.createGain();
  const v={g,baseFreq:freq,dragBend:0,maxUp:maxUp||0,maxDown:maxDown||0,freqNodes:[],stops:[]};
  const vib=actx.createOscillator(), vibG=actx.createGain();
  vib.frequency.value = (M.voice==='flute'?4.5:M.voice==='pad'?4.2:5.0);
  vibG.gain.value = (M.voice==='flute'?7:M.voice==='pad'?4:3.8);
  v.vibG=vibG; v.vibBase=vibG.gain.value;
  if(settings.gyro==='vibrato') vibG.gain.value = v.vibBase + gyroV*18;   // pick up the current tilt
  vib.connect(vibG); vib.start(t0); v.stops.push(vib);
  let vout=g;                                                  // per-voice output (a filter may sit before g)
  const addOsc=(type,mult,detune,gain,decay)=>{ const o=actx.createOscillator(); o.type=type; const target=freq*mult;
    if(approach){ o.frequency.setValueAtTime(target*Math.pow(2,approach/12),t0); o.frequency.exponentialRampToValueAtTime(target,t0+0.06); }  // chromatic lead-in
    else o.frequency.value=target;
    if(detune)o.detune.value=detune; vibG.connect(o.detune);
    const og=actx.createGain(); const gv=(gain==null?1:gain);
    if(decay){ og.gain.setValueAtTime(gv,t0); og.gain.exponentialRampToValueAtTime(Math.max(0.001,gv*0.04),t0+decay); }  // per-partial fade (strings: highs die first)
    else og.gain.value=gv;
    o.connect(og); og.connect(vout);
    o.start(t0); v.freqNodes.push({osc:o,mult}); v.stops.push(o); };
  const pluckNoise=(amp,dur,bpFreq,Q)=>{                       // attack transient: pick/mallet against the string/bar
    const nz=actx.createBufferSource(); nz.buffer=noiseBuf;
    const nf=actx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=bpFreq; nf.Q.value=Q;
    const ng=actx.createGain(); ng.gain.setValueAtTime(amp,t0); ng.gain.exponentialRampToValueAtTime(0.0006,t0+dur);
    nz.connect(nf); nf.connect(g); nz.start(t0); nz.stop(t0+dur+0.02); v.stops.push(nz); };
  if(M.voice==='saw'){
    addOsc('sawtooth',1,0,1); addOsc('sawtooth',1,8,1);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.30,t0+0.012); g.gain.exponentialRampToValueAtTime(.2,t0+0.3);
  } else if(M.voice==='pluck'){         // generic pluck (vostok/jazz/light/lab) — the original voice
    addOsc('triangle',1,0,1); addOsc('sine',2,6,0.4);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.42,t0+0.006); g.gain.exponentialRampToValueAtTime(.12,t0+1.4);
  } else if(M.voice==='koto' && liteNote){   // glissando passing note: 3 partials, no pick tick, soft attack —
    addOsc('triangle',1,0,1,1.2);            // the full 7-osc voice at ~20 notes/s starves the audio thread (crackle)
    addOsc('sine',2.003,0,0.5,0.7);
    addOsc('sine',3.008,0,0.25,0.45);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.38,t0+0.007); g.gain.exponentialRampToValueAtTime(.12,t0+1.2);
  } else if(M.voice==='koto'){          // koto: additive plucked string — per-partial decay (highs die first), slight inharmonic stretch, tsume pick tick
    addOsc('triangle',1,0,1,2.4);       // warm fundamental
    addOsc('sine',1,4,0.35,2.0);        // detuned double → gentle beating, like neighbouring strings ringing along
    addOsc('sine',2.003,0,0.62,1.0);
    addOsc('sine',3.008,0,0.38,0.6);
    addOsc('sine',4.014,0,0.22,0.42);
    addOsc('sine',5.022,0,0.13,0.30);
    addOsc('sine',7.05,0,0.07,0.18);
    pluckNoise(0.30,0.02,Math.min(8500,freq*6),1.5);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.46,t0+0.003); g.gain.exponentialRampToValueAtTime(.13,t0+2.0);
  } else if(M.voice==='metal'){         // metallophone (saron/gender): pure partials, gentle inharmonic shimmer, soft mallet
    const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.Q.value=0.5; lp.frequency.value=Math.min(8000,freq*7); lp.connect(g); vout=lp;
    addOsc('sine',1,0,1); addOsc('sine',2,0,0.34); addOsc('sine',3.01,0,0.11); addOsc('sine',5.9,0,0.045);
    pluckNoise(0.10,0.03,freq*4,1.2);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.34,t0+0.009); g.gain.exponentialRampToValueAtTime(.05,t0+2.0);
  } else if(M.voice==='keys'){          // soft e-piano (lo-fi)
    addOsc('sine',1,0,1); addOsc('sine',2,3,0.25); addOsc('triangle',3,0,0.05);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.38,t0+0.008); g.gain.exponentialRampToValueAtTime(.10,t0+1.1);
  } else if(M.voice==='pad'){           // soft sine pad (lydian "cosmos")
    addOsc('sine',1,0,1); addOsc('sine',2,0,0.22); addOsc('sine',3,0,0.08);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.30,t0+0.12);
  } else { // flute — sine + overtones + breath
    addOsc('sine',1,0,1); addOsc('sine',2,0,0.16); addOsc('triangle',3,0,0.05);
    const nz=actx.createBufferSource(); nz.buffer=noiseBuf; nz.loop=true;
    const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq*2.5; bp.Q.value=5;
    const ng=actx.createGain(); ng.gain.value=0.05; nz.connect(bp); bp.connect(ng); ng.connect(g);
    nz.start(t0); v.stops.push(nz);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.26,t0+0.06);
  }
  g.connect(leadBus);
  if(kbBend>0) applyBend(v);
  return v;
}
function applyBend(v){
  let b=v.dragBend; if(kbBend>0) b=Math.max(b,kbBend);
  const semis=Math.max(-v.maxDown,Math.min(v.maxUp,b)), r=Math.pow(2,semis/12), t0=actx.currentTime;
  for(const fn of v.freqNodes) fn.osc.frequency.setTargetAtTime(v.baseFreq*fn.mult*r,t0,0.025);
}
function stopVoice(id,rel){ const v=activeVoices.get(id); if(!v) return; activeVoices.delete(id);
  rel=rel||0.3;                                     // glissando uses a fast release so voices don't pile up
  const t0=actx.currentTime; v.g.gain.cancelScheduledValues(t0); v.g.gain.setValueAtTime(v.g.gain.value,t0);
  v.g.gain.exponentialRampToValueAtTime(.0008,t0+rel); for(const n of v.stops){ try{n.stop(t0+rel+0.04);}catch(e){} } }

/* ============ Key press ============ */
// Jazz "bebop" phrasing: snap each step to a chord tone (3/5/7/root incl. guide tones) and lead in chromatically
function jazzChordMidis(){ if(!curChord) return [];
  const set=curChord.ivs.map(iv=>(curChord.r+iv)%12), arr=[];
  for(let m=settings.minMidi;m<=settings.maxMidi;m++){ if(set.includes(((m%12)+12)%12)) arr.push(m); }
  return arr; }
function snapJazz(midi,dir,prev){ const tones=jazzChordMidis(); if(!tones.length) return midi;
  let best=tones[0],bd=Infinity; for(const tn of tones){ const d=Math.abs(tn-midi); if(d<bd){bd=d;best=tn;} }
  if(prev!=null && best===prev && dir!==0){ const i=tones.indexOf(best); best=tones[Math.max(0,Math.min(tones.length-1,i+(dir>0?1:-1)))]; }  // always move on a step
  return best; }
let lastJazzMidi=null, jazzBeatRef=0, jazzBeatLen=0;
function jazzStrongBeat(cfg){ if(!jazzBeatLen||!cfg) return false;     // near an allowed beat (modulo bar, robust to lookahead)
  const bar=4*jazzBeatLen; let d=(actx.currentTime-jazzBeatRef)%bar; if(d<0)d+=bar;
  const p=d/jazzBeatLen, near=Math.round(p)%4;
  return Math.abs(p-Math.round(p))<cfg.win && cfg.beats.includes(near); }
function pocketOffsets(notesPerBeat){ const sw=0.16, sub=notesPerBeat/2, offs=[];   // subdivide each swung eighth evenly → chosen grid
  for(let b=0;b<4;b++){ const e0=b, e1=b+0.5+sw, e2=b+1;
    for(let s=0;s<sub;s++) offs.push(e0+(e1-e0)*s/sub);
    for(let s=0;s<sub;s++) offs.push(e1+(e2-e1)*s/sub); }
  return offs; }
function quantizeToPocket(now,notesPerBeat){ if(!jazzBeatLen) return now;   // snap onset to nearest grid point at the chosen resolution
  const bar=4*jazzBeatLen, offs=pocketOffsets(notesPerBeat), base=jazzBeatRef+Math.floor((now-jazzBeatRef)/bar)*bar;
  let best=now, bd=Infinity;
  for(let k=0;k<=1;k++) for(const o of offs){ const tg=base+k*bar+o*jazzBeatLen; if(tg>=now-0.05){ const s=Math.abs(tg-now); if(s<bd){bd=s;best=tg;} } }
  return Math.max(best,now); }
function glideVoice(v,tf){ v.baseFreq=tf; const t0=actx.currentTime; let b=v.dragBend; if(kbBend>0) b=Math.max(b,kbBend);
  const semis=Math.max(-v.maxDown,Math.min(v.maxUp,b)), r=Math.pow(2,semis/12);
  for(const fn of v.freqNodes) fn.osc.frequency.setTargetAtTime(tf*fn.mult*r,t0,0.09); }   // settle held note to a chord tone
const VOICE_CAP=6;                                 // voice stealing: a palm on the screen must not overload the audio thread
const heldNotes=new Map();                         // id → key offset label ("+2"), shown under the ring in recordings
function noteOn(id,offset,el){ initAudio(); resumeAudio(); if(activeVoices.has(id)) return null;
  if(activeVoices.size>=VOICE_CAP) stopVoice(activeVoices.keys().next().value);   // steal the oldest voice
  currentIndex=clampIndex(currentIndex+offset);
  const bt=bendTargets(currentIndex); let freq=pitchFreq(currentIndex), approach=0, playedMidi=null;
  if(M.id==='jazz' && curChord && settings.jazzPhrase!=='free'){
    const dir=offset>0?1:offset<0?-1:0, cfg=DARING[settings.jazzPhrase];
    if(jazzStrongBeat(cfg)){                                  // land on a chord tone, with a chromatic enclosure
      playedMidi=snapJazz(indexToMidi(currentIndex),dir,lastJazzMidi); approach=dir<0?1:-1;
    } else {                                                  // off the beat: let scale tensions / passing tones sing
      playedMidi=indexToMidi(currentIndex);
    }
    lastJazzMidi=playedMidi; freq=midiToFreq(playedMidi);
  } else lastJazzMidi=null;
  if(SCALEDN && offset<0 && M.kind==='scale'){               // melodic-minor style: stepping down uses the descending scale
    const len=SCALE.length, o=Math.floor(currentIndex/len), s=((currentIndex%len)+len)%len;
    freq=midiToFreq(leadRoot()+12*o+SCALEDN[s]);
  }
  const when=(M.id==='jazz' && settings.jazzTiming!=='free' && jazzBeatLen) ? quantizeToPocket(actx.currentTime, (+settings.jazzTiming)/4) : undefined;
  const v=makeVoice(freq, bt.up?bt.up.amt:0, bt.down?bt.down.amt:0, approach, when);
  activeVoices.set(id,v); el.classList.add("active");
  tapHaptic('LIGHT');
  heldNotes.set(id,(offset>0?'+':'')+offset); viz.keysHeld([...heldNotes.values()]);   // video: pressed keys + sounding note
  viz.liveNote(midiToName(Math.round(freqToMidi(freq))),0);
  if(settings.viz){ const r=el.getBoundingClientRect(); const cv=el.classList.contains('neg')?'--neg':el.classList.contains('pos')?'--pos':'--zero'; viz.note(r.left+r.width/2, r.top+10, cssRgb(cv));
    const mm=freqToMidi(freq), p01=Math.max(0,Math.min(1,(mm-settings.minMidi)/Math.max(1,settings.maxMidi-settings.minMidi))); viz.melody(p01); }
  updateDisplay();
  if(playedMidi!=null) elNote.textContent=midiToName(playedMidi);
  else if(SCALEDN && offset<0) elNote.textContent=midiToName(Math.round(freqToMidi(freq)));
  document.dispatchEvent(new CustomEvent('jl:note',{detail:{offset}}));   // tutorial listens
  trackOnce('first_note',{mode:M.id,tta:sinceLaunch()});                  // tta = seconds from launch to first sound
  return v; }
function noteOff(id,el,rel){ stopVoice(id,rel);
  heldNotes.delete(id); viz.keysHeld([...heldNotes.values()]);
  if(activeVoices.size===0){ viz.liveNote(null,0); elNote.classList.remove('bup','bdown'); }   // silence → no note in the video
  if(el){el.classList.remove("active","bending","bent","down"); el.style.setProperty("--bend",0);}
  refreshKeyLabels(); }                                                        // restore the per-key bend arrows
function shiftOctave(dir){ currentIndex=clampIndex(currentIndex+dir*(M.kind==='harmonic'?8:SCALE.length)); updateDisplay(); }
function resetToRoot(){ currentIndex = (M.kind==='harmonic') ? clampIndex(Math.round(currentIndex/8)*8) : nearestRootIndex(pitchFreq(currentIndex)); updateDisplay(); }

function setVariant(id){ if(M.kind!=='scale'||!M.scales||!M.scales[id]) return;
  const oldF=pitchFreq(currentIndex); SCALE=M.scales[id]; settings.variant=id;
  SCALEDN=(M.downScales&&M.downScales[id])||null;
  if(M.lab){ try{ localStorage.setItem('jamlab.labVariant',id); }catch(e){} updateModeSub(); }
  currentIndex=clampIndex(nearestIndex(oldF));
  [...ladHost.querySelectorAll('button')].forEach(b=>b.classList.toggle('active', b.dataset.v===id));
  buildKeys();
  updateDisplay(); }
function allowedVariants(){ return (M.id==='blues' && HARM_LADS[settings.harmony]) || M.variants.map(v=>v.id); }
function cycleVariant(dir){ const ids=allowedVariants(); if(ids.length<2) return false;
  let i=ids.indexOf(settings.variant); if(i<0)i=0; setVariant(ids[(i+dir+ids.length)%ids.length]); return true; }
function applyLadLock(){            // disable scales that don't fit the harmony; switch away from an incompatible one
  const allow=allowedVariants();
  for(const b of ladHost.querySelectorAll('button')) b.disabled = !allow.includes(b.dataset.v);
  if(allow.length && !allow.includes(settings.variant)) setVariant(allow[0]);
}

/* ============ Scale strip: "you are here" on the scale ladder ============ */
// The relational keyboard's state (current position) is invisible — this strip shows it.
// Dots = every reachable scale tone, big accent dots = roots, ring marker = where you stand.
const stripEl=document.getElementById('stepStrip');
let stripSig='', stripDots=[], stripMark=null;
function stripRender(){ if(!stripEl) return;
  if(M.kind==='harmonic'){ stripEl.innerHTML=''; stripSig=''; return; }   // overtone flute: no scale ladder
  const [a,b]=indexRange(), len=SCALE.length, sig=a+'|'+b+'|'+len+'|'+M.id;
  if(sig!==stripSig){ stripSig=sig; stripEl.innerHTML=''; stripDots=[];
    for(let i=a;i<=b;i++){ const d=document.createElement('span');
      d.className='sdot'+(((i%len)+len)%len===0?' root':''); stripEl.appendChild(d); stripDots.push({i,el:d}); }
    stripMark=document.createElement('span'); stripMark.className='smark'; stripEl.appendChild(stripMark); }
  for(const d of stripDots) d.el.classList.toggle('cur', d.i===currentIndex);
  const cur=stripDots.find(d=>d.i===currentIndex);
  if(cur && stripMark) stripMark.style.left=(cur.el.offsetLeft + cur.el.offsetWidth/2)+'px';
}
window.addEventListener('resize',()=>{ stripSig=''; stripRender(); });   // dot positions shift with the viewport

// The strip is playable: tap a dot to teleport there (sounds like pressing "0" at the new spot),
// slide the finger along it for a glissando over the scale. Snaps to the nearest dot — no precision needed.
let stripPtr=null;
// dot centers are cached for the whole gesture: measuring 30+ rects on every pointermove forces
// layout and starves the main thread — that jank was audible as crackle during fast glissandi
function stripCenters(){ return stripDots.map(d=>{ const r=d.el.getBoundingClientRect(); return {i:d.i, el:d.el, x:r.left+r.width/2}; }); }
function stripNearest(cs,x){ let best=null,bd=Infinity;
  for(const c of cs){ const d=Math.abs(x-c.x); if(d<bd){ bd=d; best=c; } } return best; }
const STRIP_MIN_MS=45;                               // ≤22 notes/s — faster only piles voices up
if(stripEl){
  stripEl.addEventListener('pointerdown',e=>{ e.preventDefault(); initAudio(); resumeAudio();
    const cs=stripCenters(), d=stripNearest(cs,e.clientX); if(!d) return;
    try{ stripEl.setPointerCapture(e.pointerId); }catch(err){}
    stripPtr={pid:e.pointerId, d, cs, last:performance.now()};
    noteOn('strip', d.i-currentIndex, d.el); tapHaptic('LIGHT');
    document.dispatchEvent(new Event('jl:strip')); });   // tutorial listens
  stripEl.addEventListener('pointermove',e=>{ if(!stripPtr || e.pointerId!==stripPtr.pid) return;
    const now=performance.now(); if(now-stripPtr.last<STRIP_MIN_MS) return;
    const d=stripNearest(stripPtr.cs,e.clientX); if(!d || d.i===stripPtr.d.i) return;
    noteOff('strip', stripPtr.d.el, 0.08);             // fast release: the next note takes over
    stripPtr.d=d; stripPtr.last=now;
    liteNote=true; try{ noteOn('strip', d.i-currentIndex, d.el); } finally{ liteNote=false; }
    document.dispatchEvent(new Event('jl:strip')); });
  const stripEnd=e=>{ if(!stripPtr || e.pointerId!==stripPtr.pid) return;
    noteOff('strip', stripPtr.d.el); stripPtr=null; };   // last note rings out naturally
  stripEl.addEventListener('pointerup',stripEnd); stripEl.addEventListener('pointercancel',stripEnd);
}

/* ============ Display ============ */
const elNote=document.getElementById("noteName"), elRole=document.getElementById("roleName");
function updateDisplay(){
  const lab=pitchLabel(currentIndex); elNote.textContent=lab.note;
  let role;
  if(M.id==='jazz') role=jazzLabel;
  else if(M.kind==='harmonic') role=t('ord',{n:lab.deg})+" "+t('role.harmonicWord');
  else { const len=SCALE.length, step=((currentIndex%len)+len)%len, oct=Math.floor(currentIndex/len);
    role=degName(SCALE[step])+(oct? " · "+t('role.oct')+" "+(oct>0?"+":"")+oct : ""); }
  elRole.textContent=role;
  refreshKeyLabels();
  stripRender();
  updateTopsum();
}
/* collapsed config summary: "A · 85 · Minor · Shuffle" — the one line phones see instead of the console */
const topsumEl=document.getElementById('topsum'), topsumTxt=document.getElementById('topsumTxt');
function updateTopsum(){ if(!topsumTxt) return;
  const parts=[NOTE_NAMES[((settings.rootMidi%12)+12)%12], settings.bpm];
  if(M.back==='blues'){ const h=HARM_OPTS.find(o=>o[0]===settings.harmony), r=RHY_OPTS.find(o=>o[0]===settings.rhythm);
    if(h) parts.push(t(h[1])); if(r) parts.push(t(r[1])); }
  else if(M.id==='jazz'){ parts.push(t('phrase.'+settings.jazzPhrase)); }
  else { const vr=M.variants && M.variants.find(v=>v.id===settings.variant);
    if(vr) parts.push(M.lab?labScaleName(settings.variant):t(vr.label));
    const bk=M.backings && M.backings.find(b=>b.id===settings.backing); if(bk) parts.push(t(bk.label)); }
  topsumTxt.textContent=parts.join(' · ');
}
function toggleCfg(){ const o=!document.body.classList.contains('cfgopen');
  document.body.classList.toggle('cfgopen',o); try{ localStorage.setItem('jamlab.cfgOpen',o?'1':'0'); }catch(e){} }
if(topsumEl){ let cfgOpen=false; try{ cfgOpen=localStorage.getItem('jamlab.cfgOpen')==='1'; }catch(e){}
  document.body.classList.toggle('cfgopen',cfgOpen);
  topsumEl.addEventListener('click',toggleCfg); }
// the title is a toggle too — active exactly when the collapsed-config chip is (touch layouts)
document.querySelector('header h1').addEventListener('click',()=>{
  if(topsumEl && getComputedStyle(topsumEl).display!=='none') toggleCfg(); });
function refreshKeyLabels(){ const ct=curChord; for(const k of noteKeys){
    if(k.el.classList.contains('active')) continue;   // freeze a held key: its label/arrows describe the sounding voice
    const idx=clampIndex(currentIndex+k.off), lab=pitchLabel(idx);
    k.lead.textContent = Math.abs(k.off)>=3 ? String(lab.deg) : lab.deg+" ("+lab.note+")";   // narrow top-row keys: degree only, no (note)
    const bt=bendTargets(idx);                                                  // per-key bend directions
    k.el.classList.toggle('canup',!!bt.up); k.el.classList.toggle('candn',!!bt.down);
    let role=0;                                  // current-chord tone: 1/3/5/7
    if(ct){ const pc=((indexToMidi(idx)%12)+12)%12;
      if(pc===ct.r) role=1; else if(pc===(ct.r+ct.ivs[1])%12) role=3;
      else if(pc===(ct.r+ct.ivs[2])%12) role=5; else if(ct.ivs[3]!=null && pc===(ct.r+ct.ivs[3])%12) role=7; }
    k.el.classList.toggle('t1',role===1); k.el.classList.toggle('t3',role===3);
    k.el.classList.toggle('t5',role===5); k.el.classList.toggle('t7',role===7);
  } }

/* ============ Keys ============ */
// weight by distance from the current note: small steps big & central, octave leaps small at the edges
const KW={0:3.8,1:3.2,2:2.4,3:1.7,4:1.3,5:1.0,6:0.85,7:0.7,8:0.62};
const KEYS=[
  {off:-8,code:"Digit1",lbl:"1"},
  {off:-7,code:"KeyQ",lbl:"Q"},{off:-6,code:"KeyA",lbl:"A"},{off:-5,code:"KeyS",lbl:"S"},{off:-4,code:"KeyD",lbl:"D"},{off:-3,code:"KeyF",lbl:"F"},
  {off:-2,code:"KeyG",lbl:"G"},{off:-1,code:"KeyH",lbl:"H"},{off:0,code:"Space",lbl:"␣"},{off:1,code:"KeyJ",lbl:"J"},{off:2,code:"KeyK",lbl:"K"},
  {off:3,code:"KeyL",lbl:"L"},{off:4,code:"Semicolon",lbl:";"},{off:5,code:"Quote",lbl:"'"},{off:6,code:"KeyP",lbl:"P"},{off:7,code:"Backslash",lbl:"\\"},
  {off:8,code:"Backquote",lbl:"`"}
];
const codeMap={}, noteKeys=[], noteCodes=[];
function buildRow(list,host){ list.forEach(k=>{ const el=document.createElement("div");
  el.className="key "+(k.off<0?"neg":k.off>0?"pos":"zero"); el.style.flexGrow=KW[Math.abs(k.off)];
  el.innerHTML=`<span class="kb">${k.lbl}</span><span class="arrow up">↑</span><span class="off">${k.off>0?"+":""}${k.off}</span><span class="lead"></span><span class="dot"></span><span class="bendfill"></span><span class="arrow dn">↓</span>`;
  bindPointer(el,k.off); host.appendChild(el); codeMap[k.code]={el,off:k.off}; noteCodes.push(k.code);
  noteKeys.push({off:k.off, el, lead:el.querySelector(".lead")}); }); }
const rowTopEl=document.getElementById("rowTop"), rowBottomEl=document.getElementById("rowBottom");
// an octave = one scale length; cap the reach there (jazz scale length changes per chord, so fix it at 7)
function maxReach(){ return (M.kind==='harmonic'||M.id==='jazz') ? 7 : SCALE.length; }
function buildKeys(){
  const set=KEYS.filter(k=>Math.abs(k.off)<=maxReach());
  rowTopEl.innerHTML=""; rowBottomEl.innerHTML="";
  noteKeys.length=0; noteCodes.forEach(c=>delete codeMap[c]); noteCodes.length=0;
  const top=set.filter(k=>Math.abs(k.off)>=3);
  buildRow(top,rowTopEl);                                    // rare leaps — small, top row
  buildRow(set.filter(k=>Math.abs(k.off)<=2),rowBottomEl);  // frequent steps — big, bottom row
  // adaptive font: the more leap keys in the top row, the narrower they are → shrink their labels to fit
  const n=top.length;
  const off = n>=12?'clamp(12px,3vw,20px)' : n>=10?'clamp(13px,3.3vw,23px)' : 'clamp(14px,3.6vw,26px)';
  const lead= n>=12?'clamp(7px,1.7vw,10px)' : n>=10?'clamp(8px,2vw,11px)' : 'clamp(8px,2.2vw,12px)';
  rowTopEl.style.setProperty('--topoff',off); rowTopEl.style.setProperty('--toplead',lead);
}
buildKeys();

const EXTRA=[{key:'extra.octDown',code:"BracketLeft",act:()=>shiftOctave(-1)},
             {key:'extra.toRoot',code:"Backspace",act:resetToRoot},
             {key:'extra.octUp',code:"BracketRight",act:()=>shiftOctave(1)}];
const extraHost=document.getElementById("extra"), extraLabelEls=[];
EXTRA.forEach(k=>{ const el=document.createElement("div"); el.className="key zero";
  const sp=document.createElement('span'); sp.className='off'; sp.textContent=t(k.key); el.appendChild(sp);
  el.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();resumeAudio();k.act();tapHaptic('LIGHT');el.classList.add("active");setTimeout(()=>el.classList.remove("active"),120);});
  extraHost.appendChild(el); codeMap[k.code]={el,act:k.act,momentary:true}; extraLabelEls.push({sp,key:k.key}); });
function setExtraLabels(){ extraLabelEls.forEach(o=>o.sp.textContent=t(o.key)); }

/* ============ Pointer + bend ============ */
const BEND_UP_PX=100, BEND_DOWN_PX=68; const pointers=new Map();   // down needs less travel: little room below the key
function bindPointer(el,off){ el.addEventListener("pointerdown",e=>{ e.preventDefault(); const id="p"+e.pointerId;
  const v=noteOn(id,off,el); if(v) pointers.set(e.pointerId,{id,startY:e.clientY,el,voice:v}); }); }
window.addEventListener("pointermove",e=>{ const p=pointers.get(e.pointerId); if(!p) return;
  const dy=p.startY-e.clientY;                                      // up = positive
  const raw=dy/(dy>=0?BEND_UP_PX:BEND_DOWN_PX)*2; p.voice.dragBend=raw; applyBend(p.voice);
  const down=raw<0, mb=down?p.voice.maxDown:p.voice.maxUp, mag=Math.abs(raw);
  const frac=mb>0?Math.min(mag,mb)/mb:0; p.el.style.setProperty("--bend",frac.toFixed(3));
  p.el.classList.toggle("down",down&&mb>0&&frac>0.06); p.el.classList.toggle("bending",frac>0.06); p.el.classList.toggle("bent",mb>0&&mag>=mb);
  const bentNow=mb>0&&mag>=mb;                                      // haptic tick when the bend locks onto its target
  if(bentNow && !p.bentH){ p.bentH=true; tapHaptic('MEDIUM'); } else if(!bentNow && (mb<=0||mag<mb*0.9)) p.bentH=false;
  if(frac>0.6 && !p.evBend){ p.evBend=true; document.dispatchEvent(new Event('jl:bend')); trackOnce('bend_used'); }   // tutorial: a real bend happened
  // live bent pitch: tint the on-screen note and feed the video (big note + ribbon point)
  const p01of=m=>Math.max(0,Math.min(1,(m-settings.minMidi)/Math.max(1,settings.maxMidi-settings.minMidi)));
  if(frac>0.06){
    const semis=Math.max(-p.voice.maxDown,Math.min(p.voice.maxUp,raw));
    const bm=freqToMidi(p.voice.baseFreq)+semis, bname=midiToName(Math.round(bm));
    elNote.textContent=bname; elNote.classList.toggle('bup',!down); elNote.classList.toggle('bdown',down);
    viz.liveNote(bname, down?-1:1); viz.melodyBend(p01of(bm));
  } else if(p.wasBending){
    const bm0=freqToMidi(p.voice.baseFreq), n0=midiToName(Math.round(bm0));
    elNote.textContent=n0; elNote.classList.remove('bup','bdown');
    viz.liveNote(n0,0); viz.melodyBend(p01of(bm0));
  }
  p.wasBending=frac>0.06;
  if(settings.viz && frac>0.3 && Math.random()<0.45){ const r=p.el.getBoundingClientRect(); viz.spark(r.left+r.width/2, r.top+(down?r.height-12:12), down?cssRgb('--blue'):cssRgb('--accent')); } });
function endPointer(e){ const p=pointers.get(e.pointerId); if(!p) return; pointers.delete(e.pointerId); noteOff(p.id,p.el); }
window.addEventListener("pointerup",endPointer); window.addEventListener("pointercancel",endPointer);

/* ============ Keyboard ============ */
const held=new Set();
function setKbBend(s){ kbBend=s; for(const v of activeVoices.values()) applyBend(v); }
window.addEventListener("keydown",e=>{
  if(e.code==="ShiftLeft"||e.code==="ShiftRight"){ e.preventDefault(); setKbBend(2); return; }
  if(e.code==="ArrowUp"){ e.preventDefault(); if(!cycleVariant(1)) shiftOctave(1); return; }
  if(e.code==="ArrowDown"){ e.preventDefault(); if(!cycleVariant(-1)) shiftOctave(-1); return; }
  const m=codeMap[e.code]; if(!m) return; e.preventDefault();
  if(held.has(e.code)) return; held.add(e.code);
  if(m.momentary){ initAudio();resumeAudio(); m.act(); m.el.classList.add("active"); } else noteOn("k"+e.code,m.off,m.el); });
window.addEventListener("keyup",e=>{ if(e.code==="ShiftLeft"||e.code==="ShiftRight"){ setKbBend(0); return; }
  const m=codeMap[e.code]; if(!m) return; held.delete(e.code);
  if(m.momentary) m.el.classList.remove("active"); else noteOff("k"+e.code,m.el); });

/* ============ Backing ============ */
let accOn=false, padNodes=[], nextNoteTime=0, eighth=0, qStep=0, mStep=0;
const LOOKAHEAD=0.25;                               // schedule this far ahead → survives main-thread jank (anti-crackle)
// Tick source for the schedulers: a Web Worker timer. Main-thread setInterval gets throttled
// to ≥1s on phones (dimmed screen / background) and the backing would stall; worker timers keep
// firing. Notes themselves are scheduled on the WebAudio clock — the tick only wakes the planner.
let tickFn=null, tickFallback=null;
const ticker=(()=>{ try{
  const url=URL.createObjectURL(new Blob(["let id=null;onmessage=e=>{clearInterval(id);id=null;if(e.data>0)id=setInterval(()=>postMessage(0),e.data);};"],{type:'application/javascript'}));
  const w=new Worker(url); w.onmessage=()=>{ if(tickFn) tickFn(); }; return w;
}catch(e){ return null; } })();                     // falls back to a main-thread interval if Workers are unavailable
function startTicks(fn,ms){ tickFn=fn; if(ticker) ticker.postMessage(ms); else tickFallback=setInterval(fn,ms); }
function stopTicks(){ tickFn=null; if(ticker) ticker.postMessage(0); if(tickFallback){ clearInterval(tickFallback); tickFallback=null; } }

// --- chord chip: current + next chord of the running progression ---
const CHORD_SFX={'0,4,7,10':'7','0,3,7,10':'m7','0,4,7':'','0,3,7':'m','0,4,7,9':'6','0,4,7,11':'maj7','0,3,6,10':'m7♭5'};
function chordName(rootSemi,ivs,sfx){ const pc=((settings.rootMidi+rootSemi)%12+12)%12;
  return NOTE_NAMES[pc]+(sfx!=null?sfx:(CHORD_SFX[ivs.join(',')]||'')); }
function setChordChip(now,next){
  document.getElementById('chordNow').textContent=now||'';
  document.getElementById('chordNext').textContent=next?('→ '+next):'';
  document.getElementById('chordBox').style.display=now?'':'none'; }

function bassRole(role,ivs){ if(role==='R')return 0; if(role==='5')return 7; if(role==='8')return 12;
  if(role==='b7')return 10; if(role==='6')return 9; if(role==='3')return ivs.includes(3)?3:4; return null; }
function bChord(rootSemi,time,dur,ivs,lvl){ const base=settings.rootMidi-12+rootSemi; lvl=lvl||0.1;   // plucky guitar/piano-style chord (not a sustained pad)
  ivs.forEach(iv=>{ const o=actx.createOscillator();o.type="sawtooth";o.frequency.value=midiToFreq(base+iv);
    const f=actx.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(2600,time);f.frequency.exponentialRampToValueAtTime(900,time+dur*0.6);
    const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(lvl,time+0.005);g.gain.exponentialRampToValueAtTime(.0008,time+dur);
    o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+dur+0.05); }); }
function bBass(rootSemi,time,off){                       // rounder bass with body (sine + triangle through a lowpass)
  const fr=midiToFreq(settings.rootMidi-24+rootSemi+off);
  const o=actx.createOscillator();o.type="sine";o.frequency.value=fr;
  const o2=actx.createOscillator();o2.type="triangle";o2.frequency.value=fr; const o2g=actx.createGain();o2g.gain.value=0.4;
  const beat=60/settings.bpm,dur=beat*0.5, lp=actx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=820;
  const g=actx.createGain(); g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.55,time+0.012);g.gain.exponentialRampToValueAtTime(.001,time+dur);
  o.connect(g);o2.connect(o2g);o2g.connect(g);g.connect(lp);lp.connect(busBass);
  o.start(time);o2.start(time);o.stop(time+dur+0.05);o2.stop(time+dur+0.05); }
function kick(time,vel){vizBeat(time,0.9*(vel||1));const o=actx.createOscillator();o.type="sine";const g=accGain(0,busPerc);o.frequency.setValueAtTime(150,time);o.frequency.exponentialRampToValueAtTime(48,time+0.12);g.gain.setValueAtTime(.9*(vel||1),time);g.gain.exponentialRampToValueAtTime(.001,time+0.18);o.connect(g);o.start(time);o.stop(time+0.2);}
function snare(time,vel){ vel=vel||1;   // tonal body + bright snap = a real backbeat snare
  const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type="highpass";f.frequency.value=1700;const g=accGain(0,busPerc);g.gain.setValueAtTime(.5*vel,time);g.gain.exponentialRampToValueAtTime(.001,time+0.15);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.17);
  const o=actx.createOscillator();o.type="triangle";o.frequency.setValueAtTime(190,time);o.frequency.exponentialRampToValueAtTime(140,time+0.08);const og=accGain(0,busPerc);og.gain.setValueAtTime(.3*vel,time);og.gain.exponentialRampToValueAtTime(.001,time+0.12);o.connect(og);o.start(time);o.stop(time+0.14);}
function hat(time,open,vel){const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type="highpass";f.frequency.value=7000;const g=accGain(0,busPerc);const dur=open?0.12:0.04;g.gain.setValueAtTime(.16*(vel||1),time);g.gain.exponentialRampToValueAtTime(.001,time+dur);n.connect(f);f.connect(g);n.start(time);n.stop(time+dur+0.02);}
function drumPat(style,step,t0){
  if(style==='shuffle'){ hat(t0,step%2); if(step===0||step===4)kick(t0); if(step===2||step===6)snare(t0); }
  else if(style==='rock'){ hat(t0,false,0.7); if(step===0||step===4)kick(t0); if(step===3)kick(t0,0.5); if(step===2||step===6)snare(t0); }
  else if(style==='slow'){ if(step===0)kick(t0); if(step===4)snare(t0); if(step%2)hat(t0,true,0.6); }
  else if(style==='train'){ if(step===0||step===4)kick(t0,0.9); snare(t0, step%2?0.4:0.18); }
  else if(style==='funk'){ hat(t0,false,0.7); if(step===0||step===3)kick(t0); if(step===2||step===6)snare(t0); }
  else if(style==='rhumba'){ hat(t0,false,0.5); if(step===0||step===3||step===6)kick(t0,0.9); if(step===2||step===5)snare(t0,0.3); }
}
function bluesScheduler(){ const H=HARMONY[settings.harmony]||HARMONY.major, R=RHYTHM[settings.rhythm]||RHYTHM.shuffle, nb=H.bars.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){ const beat=60/settings.bpm, step=eighth%8, off=step%2, t0=nextNoteTime+(off?beat*(R.swing||0):0);
    const chord=H.bars[Math.floor(eighth/8)%nb];
    drumPat(R.drum,step,t0);
    const role=R.bass[step], bo=role?bassRole(role,chord.ivs):null; if(bo!=null) bBass(chord.root,t0,bo);
    if(R.comp==='stab'){ if(step===2||step===6) bChord(chord.root,t0,beat*0.45,chord.ivs,0.12); }
    else if(R.comp==='offbeat'){ if(step%2===1) bChord(chord.root,t0,beat*0.4,chord.ivs,0.09); }     // shuffle "chuck" on the &s
    else { if(step===2||step===6) bChord(chord.root,t0,beat*0.7,chord.ivs,0.12);                     // backbeat chord chop (was a bar-long drone)
           else if(step===0) bChord(chord.root,nextNoteTime,beat*0.5,chord.ivs,0.05); }              // light downbeat for body
    if(step===0){ const pcs=new Set(chord.ivs.map(iv=>(chord.root+iv)%12)), cc={r:(settings.rootMidi+chord.root)%12, ivs:chord.ivs},
        nxt=H.bars[(Math.floor(eighth/8)+1)%nb];
      setTimeout(()=>{ if(!accOn||M.back!=='blues')return; liveChordPcs=pcs; curChord=cc;
        setChordChip(chordName(chord.root,chord.ivs), chordName(nxt.root,nxt.ivs)); updateDisplay();}, Math.max(0,(nextNoteTime-actx.currentTime)*1000)); }
    nextNoteTime+=beat/2; eighth++; } }

// --- modal backing: arpeggio + bass + percussion + vamp ---
function curBack(){ return M.backings.find(b=>b.id===settings.backing) || M.backings[0]; }
// the backing anchor tone: a perfect fifth when the scale has one, otherwise the nearest scale tone
// (iwato has b5 instead of 5 — droning a perfect fifth against it clashes)
function fifthOf(){ if(M.kind!=='scale') return 7;
  for(const c of [7,6,8,5,9]) if(SCALE.includes(c)) return c; return 12; }
function kotoPluck(off,time){ const m=settings.rootMidi+off;   // an octave above the drone
  const o=actx.createOscillator();o.type="triangle";o.frequency.value=midiToFreq(m);
  const f=actx.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(5200,time);f.frequency.exponentialRampToValueAtTime(1500,time+0.5);
  const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.22,time+0.004);g.gain.exponentialRampToValueAtTime(0.001,time+0.85);
  o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+0.95); }
function modalBass(off,time){ const o=actx.createOscillator();o.type="triangle";o.frequency.value=midiToFreq(settings.rootMidi-12+off);
  const dur=(60/settings.bpm)*0.9, g=accGain(0,busBass);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.34,time+0.02);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  o.connect(g);o.start(time);o.stop(time+dur+0.05); }
// drums
function taiko(time,vel){ vizBeat(time,0.85*vel); const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(95,time);o.frequency.exponentialRampToValueAtTime(48,time+0.18);
  const g=accGain(0,busPerc);g.gain.setValueAtTime(0.55*vel,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.28);o.connect(g);o.start(time);o.stop(time+0.3);
  const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;const ng=accGain(0,busPerc);
  ng.gain.setValueAtTime(0.22*vel,time);ng.gain.exponentialRampToValueAtTime(0.001,time+0.11);n.connect(f);f.connect(ng);n.start(time);n.stop(time+0.13); }
function doum(time){ vizBeat(time,0.8); const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(115,time);o.frequency.exponentialRampToValueAtTime(56,time+0.16);
  const g=accGain(0,busPerc);g.gain.setValueAtTime(0.6,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.22);o.connect(g);o.start(time);o.stop(time+0.24); }
function tek(time,vel){ const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=3200;const g=accGain(0,busPerc);
  g.gain.setValueAtTime(vel||0.3,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.05);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.07); }
function shaker(time,vel){ const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=6500;const g=accGain(0,busPerc);
  g.gain.setValueAtTime(vel,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.04);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.06); }
function percHit(type,step,time){
  if(!type) return;                                         // lab: percussion set to "None"
  if(type==='taiko'){ if(step===0) taiko(time,1.0); else if(step===4) taiko(time,0.6); else if(step===6) taiko(time,0.32); }
  else if(type==='darbuka'){ const x=DARBUKA[step]; if(x==='D') doum(time); else if(x==='t') tek(time,0.3); }
  else { shaker(time, step%2?0.18:0.1); }
}
function modalScheduler(){ const b=curBack(), beat=60/settings.bpm, vamp=M.vamp||[0];
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=mStep%8, bar=Math.floor(mStep/8), vroot = b.vamp ? (vamp[bar%vamp.length]||0) : 0;
    const f5=fifthOf();
    if(b.perc) percHit(M.perc, step, nextNoteTime);
    if(b.bass && (step===0||step===4)) modalBass(vroot + (step===4?f5:0), nextNoteTime);
    if(b.arp){ const AP=(M.arps&&M.arps[settings.variant])||[0,f5,12,f5], av=AP[mStep%AP.length];   // lab: per-scale custom arp with rests
      if(av!=null) kotoPluck(vroot+av, nextNoteTime); }
    nextNoteTime += beat/2; mStep++;
  } }

// --- pads ---
function stopPad(){ if(!actx){padNodes=[];return;} const t0=actx.currentTime;
  padNodes.forEach(p=>{ try{ p.g.gain.cancelScheduledValues(t0); p.g.gain.setValueAtTime(p.g.gain.value,t0); p.g.gain.linearRampToValueAtTime(0,t0+0.5); p.stops.forEach(n=>n.stop(t0+0.6)); }catch(e){} }); padNodes=[]; }
function startPadKoto(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.085],[settings.rootMidi-12+fifthOf(),0.05],[settings.rootMidi,0.05]].forEach(([m,vol],i)=>{
    const o1=actx.createOscillator(),o2=actx.createOscillator();o1.type=o2.type='sawtooth';o1.frequency.value=midiToFreq(m);o2.frequency.value=midiToFreq(m);o2.detune.value=6;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=850; const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+1.4);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.12+i*0.03;lg.gain.value=0.015;lfo.connect(lg);lg.connect(g.gain);
    o1.connect(f);o2.connect(f);f.connect(g);g.connect(busChord);o1.start(t0);o2.start(t0);lfo.start(t0); padNodes.push({g,stops:[o1,o2,lfo]}); }); }
// voiced up + a quiet sub: pure sines around 110 Hz vanish on phone speakers
function startPadFlute(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.045],[settings.rootMidi,0.06],[settings.rootMidi+7,0.038]].forEach(([m,vol],i)=>{
    const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(m); const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+2.0);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.1+i*0.03;lg.gain.value=0.012;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); });
  const nz=actx.createBufferSource();nz.buffer=noiseBuf;nz.loop=true; const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=midiToFreq(settings.rootMidi);bp.Q.value=3;
  const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.02,t0+2.0); nz.connect(bp);bp.connect(g);g.connect(busChord);nz.start(t0); padNodes.push({g,stops:[nz]}); }
// "Dream": augmented pad (root+third+aug.fifth — all from whole-tone) + optional shimmer
// voiced an octave up + a quiet sub: pure sines around 110 Hz vanish on phone speakers
function startPadDream(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.045],[settings.rootMidi,0.055],[settings.rootMidi+4,0.04],[settings.rootMidi+8,0.035]].forEach(([m,vol],i)=>{
    const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(m); const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+2.5);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.08+i*0.04;lg.gain.value=0.014;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); }); }
function dreamScheduler(){ const beat=60/settings.bpm; while(nextNoteTime<actx.currentTime+LOOKAHEAD){ kotoPluck(DREAMARP[qStep%DREAMARP.length],nextNoteTime); nextNoteTime+=beat; qStep++; } }
// "Gamelan": gong, bell pattern (metallophone), soft drone — tuned to the (non-tempered) scale, with ombak beats
function ombakMul(){ return Math.pow(2,(M.ombak||0)/1200); }   // detune factor for the paired "wave" resonator
function gong(time){ vizBeat(time,0.9); const f=midiToFreq(settings.rootMidi-12);   // an octave higher — phone speakers roll off below ~110 Hz
  [[1,0.34],[2.0,0.3],[2.76,0.24],[4.1,0.16],[5.4,0.09]].forEach(([mult,vol])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=f*mult;
    const g=accGain(0,busPerc); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+3.2); o.connect(g);o.start(time);o.stop(time+3.3); });
  const ob=actx.createOscillator();ob.type='sine';ob.frequency.value=f*ombakMul();   // detuned twin → slow beating
  const gb=accGain(0,busPerc); gb.gain.setValueAtTime(0.22,time); gb.gain.exponentialRampToValueAtTime(0.001,time+3.2); ob.connect(gb);ob.start(time);ob.stop(time+3.3); }
function bell(f,time){
  [[1,0.16],[2.76,0.05],[5.4,0.025]].forEach(([mult,vol])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=f*mult;
    const g=accGain(0,busChord); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+1.1); o.connect(g);o.start(time);o.stop(time+1.2); });
  const ob=actx.createOscillator();ob.type='sine';ob.frequency.value=f*ombakMul();
  const gb=accGain(0,busChord); gb.gain.setValueAtTime(0.10,time); gb.gain.exponentialRampToValueAtTime(0.001,time+1.1); ob.connect(gb);ob.start(time);ob.stop(time+1.2); }
function startGamelanDrone(){ stopPad(); const t0=actx.currentTime, mul=ombakMul();
  [[pitchFreq(0)/2,0.05,1],[pitchFreq(3)/2,0.035,mul]].forEach(([fr,vol,dt],i)=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=fr*dt;
    const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+1.5);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.1+i*0.03;lg.gain.value=0.01;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); }); }
function gamelanScheduler(){ const beat=60/settings.bpm, pat=(curBack().id==='pattern');
  while(nextNoteTime<actx.currentTime+LOOKAHEAD){ const s=qStep%16;
    if(s===0) gong(nextNoteTime);
    if(pat){ const idx=GMPAT[qStep%GMPAT.length]; bell(pitchFreq(idx)*2, nextNoteTime); }   // metallophone in the scale's true tuning, an octave up
    nextNoteTime+=beat/2; qStep++; } }

// --- synthwave: pumping bass arp, four-on-the-floor, gated pads over i–VI–III–VII ---
function synthBass(off,time){ const fr=midiToFreq(settings.rootMidi-24+off);
  const o=actx.createOscillator();o.type='sawtooth';o.frequency.value=fr;
  const lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(900,time);lp.frequency.exponentialRampToValueAtTime(300,time+0.18);
  const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.42,time+0.006);g.gain.exponentialRampToValueAtTime(0.001,time+0.2);
  o.connect(lp);lp.connect(g);g.connect(busBass);o.start(time);o.stop(time+0.25); }
function synthScheduler(){ const beat=60/settings.bpm, np=SYNTH_PROG.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=eighth%8, bar=Math.floor(eighth/8)%np, ch=SYNTH_PROG[bar];
    if(step%2===0) kick(nextNoteTime,0.9);                               // four on the floor
    if(step===2||step===6) snare(nextNoteTime,0.55);
    if(step%2===1) hat(nextNoteTime,false,0.5);                          // offbeat hats
    synthBass(ch.root + (step%2?12:0), nextNoteTime);                    // octave-pumping eighths
    if(step===0){ bChord(ch.root, nextNoteTime, beat*3.6, ch.ivs, 0.05); // gated pad once a bar
      const pcs=new Set(ch.ivs.map(iv=>(ch.root+iv)%12)), cc={r:(settings.rootMidi+ch.root)%12, ivs:ch.ivs}, nx=SYNTH_PROG[(bar+1)%np];
      setTimeout(()=>{ if(!accOn||M.back!=='synth')return; liveChordPcs=pcs; curChord=cc;
        setChordChip(chordName(ch.root,ch.ivs), chordName(nx.root,nx.ivs)); updateDisplay(); }, Math.max(0,(nextNoteTime-actx.currentTime)*1000)); }
    nextNoteTime+=beat/2; eighth++;
  } }

// --- lo-fi: lazy swung boom-bap, dusty ep chords, vinyl pops over im7→ivm7 ---
function lofiKeys(rootSemi,time,ivs,vel){ const base=settings.rootMidi-12+rootSemi, dur=(60/settings.bpm)*2.6;
  const tones=[ivs[1],ivs[2],ivs[3],14];                                 // rootless + 9th
  tones.forEach((iv,ix)=>{ const tt=time+ix*0.014;                       // light strum
    const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(base+iv);
    const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=midiToFreq(base+iv);const o2g=actx.createGain();o2g.gain.value=0.3;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(2200,tt);f.frequency.exponentialRampToValueAtTime(700,tt+dur*0.7);
    const g=actx.createGain();g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(vel,tt+0.01);g.gain.exponentialRampToValueAtTime(0.0008,tt+dur);
    o.connect(f);o2.connect(o2g);o2g.connect(f);f.connect(g);g.connect(busChord);
    o.start(tt);o2.start(tt);o.stop(tt+dur+0.05);o2.stop(tt+dur+0.05); }); }
function lofiBass(off,time){ const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(settings.rootMidi-24+off);
  const dur=(60/settings.bpm)*1.8, g=accGain(0,busBass);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.5,time+0.03);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  o.connect(g);o.start(time);o.stop(time+dur+0.05); }
function vinylPop(time){ const n=actx.createBufferSource();n.buffer=noiseBuf;
  const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=4000+Math.random()*3000;bp.Q.value=8;
  const g=accGain(0,busPerc);g.gain.setValueAtTime(0.10+Math.random()*0.08,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.03);
  n.connect(bp);bp.connect(g);n.start(time);n.stop(time+0.05); }
function lofiScheduler(){ const beat=60/settings.bpm, sw=0.24, np=LOFI_PROG.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=eighth%8, bar=Math.floor(eighth/8)%np, ch=LOFI_PROG[bar];
    const t0=nextNoteTime+(step%2?beat*sw:0);                            // lazy swing on the offbeats
    hat(t0,false, step%2?0.32:0.5);
    if(step===0) kick(t0,0.85); if(step===5) kick(t0,0.5);               // boom … ba-boom
    if(step===2||step===6) snare(t0,0.55);
    if(step===0){ lofiKeys(ch.root,t0,ch.ivs,0.11); lofiBass(ch.root,t0);
      const pcs=new Set(ch.ivs.map(iv=>(ch.root+iv)%12)), cc={r:(settings.rootMidi+ch.root)%12, ivs:ch.ivs}, nx=LOFI_PROG[(bar+1)%np];
      setTimeout(()=>{ if(!accOn||M.back!=='lofi')return; liveChordPcs=pcs; curChord=cc;
        setChordChip(chordName(ch.root,ch.ivs), chordName(nx.root,nx.ivs)); updateDisplay(); }, Math.max(0,(nextNoteTime-actx.currentTime)*1000)); }
    if(step===4) lofiBass(ch.root+7,t0);
    if(Math.random()<0.10) vinylPop(t0);                                 // vinyl crackle
    nextNoteTime+=beat/2; eighth++;
  } }

/* ============ Jazz: auto-scale over the golden sequence ============ */
function nearestRootIndex(targetFreq){      // root of the new scale in the octave closest to the last note
  const len=SCALE.length, tm=freqToMidi(targetFreq); let best=0,bestD=Infinity;
  for(let k=-6;k<=6;k++){ const i=k*len, m=indexToMidi(i); if(m<settings.minMidi||m>settings.maxMidi) continue;
    const d=Math.abs(m-tm); if(d<bestD){bestD=d;best=i;} }
  return clampIndex(best);
}
function applyJazzChord(ch){
  const pool=QUAL[ch.q][settings.jazzColor]||QUAL[ch.q].calm, pick=pool[Math.floor(Math.random()*pool.length)];
  const oldF=(SCALE&&actx)?pitchFreq(currentIndex):null;
  SCALE=pick[0]; jazzRoot=settings.rootMidi+ch.root;
  if(oldF!=null) currentIndex = (settings.jazzLand==='root') ? nearestRootIndex(oldF) : clampIndex(nearestIndex(oldF));
  jazzLabel=NOTE_NAMES[(settings.rootMidi+ch.root)%12]+ch.sfx+" · "+t(pick[1]);
  curChord={r:(settings.rootMidi+ch.root)%12, ivs:QUAL[ch.q].ivs};
  if(settings.jazzPhrase!=='free' && actx)               // resolve any held notes/bends to the new chord
    for(const v of activeVoices.values()) glideVoice(v, midiToFreq(snapJazz(Math.round(freqToMidi(v.baseFreq)),0,null)));
  updateDisplay();
}
function jazzBass(off,time){                       // upright-ish: round body, soft attack, sustained walking quarter
  const f=midiToFreq(settings.rootMidi-24+off);
  const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
  const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f; const o2g=actx.createGain();o2g.gain.value=0.3;
  const beat=60/settings.bpm,dur=beat*0.92, lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
  const g=actx.createGain();
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.38,time+0.025);g.gain.setValueAtTime(0.38,time+dur*0.55);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  o.connect(g);o2.connect(o2g);o2g.connect(g);g.connect(lp);lp.connect(busBass);
  o.start(time);o2.start(time);o.stop(time+dur+0.05);o2.stop(time+dur+0.05); }
// rootless mid-register piano comp: 3rd / 5th / 7th (+9th where safe), root omitted (the bass has it)
function jazzComp(rootSemi,time,ivs,vel,ext){
  const base=settings.rootMidi-12+rootSemi, dur=(60/settings.bpm)*1.4;
  const tones=[ivs[1],ivs[2],ivs[3]]; if(ext!=null) tones.push(ext);
  tones.forEach(iv=>{ const o=actx.createOscillator();o.type='triangle';o.frequency.value=midiToFreq(base+iv);
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(3200,time);f.frequency.exponentialRampToValueAtTime(1200,time+dur*0.6);
    const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vel,time+0.006);g.gain.exponentialRampToValueAtTime(0.0008,time+dur);
    o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+dur+0.05); }); }
function ride(time,vel,bell){                       // jazz ride: metallic wash + pitched ding, bell-accented on 1 & 3
  const n=actx.createBufferSource();n.buffer=noiseBuf;n.loop=true;
  const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=7200;bp.Q.value=0.7;
  const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vel*0.3,time+0.004);g.gain.exponentialRampToValueAtTime(0.0006,time+(bell?0.7:0.34));
  n.connect(bp);bp.connect(g);g.connect(busPerc);n.start(time);n.stop(time+(bell?0.8:0.45));
  const parts=bell?[[1,0.12],[2.76,0.06]]:[[1,0.06]];        // fewer partials = lighter
  parts.forEach(([m,v])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=(bell?700:920)*m;
    const og=actx.createGain();og.gain.setValueAtTime(0,time);og.gain.linearRampToValueAtTime(v*vel,time+0.003);og.gain.exponentialRampToValueAtTime(0.001,time+(bell?0.6:0.22));
    o.connect(og);og.connect(busPerc);o.start(time);o.stop(time+0.7); }); }
function hatFoot(time){                             // closed hi-hat "chick" on 2 & 4
  const n=actx.createBufferSource();n.buffer=noiseBuf;const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=9000;
  const g=actx.createGain();g.gain.setValueAtTime(0.13,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.06);
  n.connect(hp);hp.connect(g);g.connect(busPerc);n.start(time);n.stop(time+0.08); }
function jazzScheduler(){ const beat=60/settings.bpm, np=JAZZ_PROG.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=eighth%8, off=step%2, t0=nextNoteTime+(off?beat*0.16:0);
    const bar=Math.floor(eighth/8)%np, ch=JAZZ_PROG[bar], nx=JAZZ_PROG[(bar+1)%np], q=QUAL[ch.q];
    const ext=(ch.q==='m7'||ch.q==='dom'||ch.q==='maj7'||ch.q==='maj7iv')?14:null;   // add the 9th only where it won't clash
    if(step%2===0){ jazzBeatRef=nextNoteTime-(step/2)*beat; jazzBeatLen=beat; }       // anchor the beat grid for strong-beat detection
    if(step===0){ const c=ch, n2=nx, tt=nextNoteTime; setTimeout(()=>{ if(accOn&&M.id==='jazz'){ applyJazzChord(c);
        setChordChip(NOTE_NAMES[(settings.rootMidi+c.root)%12]+c.sfx, NOTE_NAMES[(settings.rootMidi+n2.root)%12]+n2.sfx); } },Math.max(0,(tt-actx.currentTime)*1000));
      jazzComp(ch.root,nextNoteTime,q.ivs,0.17,ext); }                // comp on beat 1
    if(step===3) jazzComp(ch.root,t0,q.ivs,0.14,ext);                  // Charleston: the "and" of 2
    // walking bass — quarter notes, smooth approach to the next root
    if(step===0) jazzBass(ch.root,t0);
    else if(step===2) jazzBass(ch.root+7,t0);
    else if(step===4) jazzBass(ch.root+q.ivs[1],t0);
    else if(step===6) jazzBass(nx.root+12-1,t0);
    if(RIDE[step]) ride(t0, (step===0||step===4)?0.9:(off?0.45:0.62), step===0||step===4);
    if(step===2||step===6) hatFoot(t0);                                // hi-hat foot on 2 & 4
    nextNoteTime+=beat/2; eighth++;
  } }

function startBacking(){ initAudio(); resumeAudio(); accOn=true;
  if(M.back==='jazz'){ eighth=0; nextNoteTime=actx.currentTime+0.1; applyJazzChord(JAZZ_PROG[0]); startTicks(jazzScheduler,25); }
  else if(M.back==='blues'){ eighth=0; nextNoteTime=actx.currentTime+0.1; startTicks(bluesScheduler,25); }
  else if(M.back==='synth'){ eighth=0; nextNoteTime=actx.currentTime+0.1; startTicks(synthScheduler,25); }
  else if(M.back==='lofi'){ eighth=0; nextNoteTime=actx.currentTime+0.1; startTicks(lofiScheduler,25); }
  else if(M.back==='koto'){
    const b=curBack();
    if(b.pad) startPadKoto();
    if(b.arp||b.perc||b.bass||b.vamp){ mStep=0; nextNoteTime=actx.currentTime+0.12; startTicks(modalScheduler,30); }
  }
  else if(M.back==='dream'){ startPadDream(); if(settings.backing==='shimmer'){ qStep=0; nextNoteTime=actx.currentTime+0.12; startTicks(dreamScheduler,40); } }
  else if(M.back==='gamelan'){ startGamelanDrone(); qStep=0; nextNoteTime=actx.currentTime+0.12; startTicks(gamelanScheduler,30); }
  else { startPadFlute(); }
  accBtn.classList.add("on"); accBtn.textContent=t('btn.bgStop');
  document.dispatchEvent(new Event('jl:backing'));     // tutorial listens
  trackOnce('backing_on',{mode:M.id}); }
function stopBacking(){ accOn=false; stopTicks(); stopPad(); liveChordPcs=null; curChord=null; jazzBeatLen=0; setChordChip('',''); refreshKeyLabels();
  accBtn.classList.remove("on"); accBtn.textContent=t('btn.bgStart'); }

/* ============ Theme and mode UI assembly ============ */
function applyTheme(th){ const s=document.documentElement.style; for(const k in th) s.setProperty('--'+k,th[k]); }
const ladHost=document.getElementById("ladHost"), backSel=document.getElementById("backSel"),
      accBtn=document.getElementById("accBtn");
function buildLadRow(){ ladHost.innerHTML="";
  if(M.lab) return;                                  // lab: scales are chosen inside the builder, not in the play-screen row
  if(M.variants.length<2) return;
  M.variants.forEach(vr=>{ const b=document.createElement("button"); b.className="ladbtn"+(vr.id===settings.variant?" active":"");
    b.dataset.v=vr.id; b.textContent=t(vr.label);
    b.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();resumeAudio();setVariant(vr.id);tapHaptic('LIGHT');}); ladHost.appendChild(b); }); }
function buildBackingOptions(){ backSel.innerHTML=""; M.backings.forEach(bk=>backSel.appendChild(new Option(t(bk.label),bk.id))); backSel.value=settings.backing; }
function setHint(){ document.getElementById("hint").innerHTML = t(TOUCH ? 'hint.touch' : (M.kind==='harmonic'?'hint.harmonic':'hint.scale')); }
// sub-title under the instrument name: in Lab it's the active scale's name, elsewhere the mode blurb
function updateModeSub(){ document.getElementById("h1sub").textContent = M.lab ? ('· '+labScaleName(settings.variant)) : t(M.sub); }

function setMode(id){ const was=accOn; if(actx) stopBacking();
  M=MODES[id]; applyTheme(M.theme);
  if(M.lab){ rebuildLabMode();                                 // lab: variants come from presets + saved custom scales
    try{ const lv=localStorage.getItem('jamlab.labVariant'); if(lv && M.scales[lv]) M.defVariant=lv;
      const lp=localStorage.getItem('jamlab.labPerc'); M.perc=(lp===null)?'taiko':lp; percSel.value=M.perc; }catch(e){} }
  if(M.kind==='scale' && M.scales){ settings.variant=M.defVariant; SCALE=M.scales[M.defVariant];
    SCALEDN=(M.downScales&&M.downScales[M.defVariant])||null; }
  if(M.id==='jazz'){ settings.rootMidi=60; document.getElementById("rootSel").value=60; applyJazzChord(JAZZ_PROG[0]); }
  settings.bpm = M.defBpm||85;                                  // mode's default tempo (jazz — 160)
  document.getElementById("bpm").value=settings.bpm; document.getElementById("bpmVal").textContent=settings.bpm;
  buildLadRow();
  const isBlues=(M.back==='blues'), isJazz=(M.id==='jazz');     // blues — Harmony×Rhythm, jazz — Scales×Approach, others — Backing
  document.getElementById("ctlBack").style.display   = (isBlues||isJazz)?'none':'';
  document.getElementById("ctlHarm").style.display   = isBlues?'':'none';
  document.getElementById("ctlRhythm").style.display = isBlues?'':'none';
  document.getElementById("ctlColor").style.display  = isJazz?'':'none';
  document.getElementById("ctlLand").style.display   = isJazz?'':'none';
  document.getElementById("ctlPhrase").style.display = isJazz?'':'none';
  document.getElementById("ctlTiming").style.display = isJazz?'':'none';
  document.getElementById("ctlJazzHelp").style.display = isJazz?'':'none';
  document.getElementById("ctlPerc").style.display = M.lab?'':'none';
  document.getElementById("ctlLab").style.display = M.lab?'':'none';
  if(isBlues){ settings.harmony='major'; settings.rhythm='shuffle'; harmSel.value='major'; rhythmSel.value='shuffle'; }
  else { settings.backing=M.defBacking; buildBackingOptions(); }
  if(isJazz){ colorSel.value=settings.jazzColor; landSel.value=settings.jazzLand; phraseSel.value=settings.jazzPhrase; timingSel.value=settings.jazzTiming; }
  if(isBlues){ const c=HARMONY[settings.harmony].bars[0]; curChord={r:(settings.rootMidi+c.root)%12, ivs:c.ivs}; }
  else if(!isJazz) curChord=null;                  // tone highlight — only in jazz/blues
  applyLadLock();
  buildKeys();
  currentIndex=clampIndex(0);
  document.getElementById("h1name").textContent=t(M.name);
  updateModeSub();
  setHint();
  updateDisplay();
  if(was && actx) startBacking(); }

/* ============ Controls ============ */
const rootSel=document.getElementById("rootSel");
[["A",57],["A#",58],["B",59],["C",60],["C#",61],["D",62],["D#",63],["E",64],["F",53],["F#",54],["G",55],["G#",56]]
  .forEach(([nm,mid])=>rootSel.appendChild(new Option(nm,mid)));
rootSel.value=57;
rootSel.addEventListener("change",()=>{ settings.rootMidi=+rootSel.value; resetToRoot(); if(accOn){stopBacking();startBacking();} });
backSel.addEventListener("change",()=>{ settings.backing=backSel.value; updateTopsum(); if(accOn){stopBacking();startBacking();} });

const harmSel=document.getElementById("harmSel"), rhythmSel=document.getElementById("rhythmSel");
function populateHarmRhythm(){
  const hv=harmSel.value, rv=rhythmSel.value;
  harmSel.innerHTML=""; HARM_OPTS.forEach(([v,k])=>harmSel.appendChild(new Option(t(k),v)));
  rhythmSel.innerHTML=""; RHY_OPTS.forEach(([v,k])=>rhythmSel.appendChild(new Option(t(k),v)));
  if(hv) harmSel.value=hv; if(rv) rhythmSel.value=rv;
}
harmSel.addEventListener("change",()=>{ settings.harmony=harmSel.value; applyLadLock(); updateTopsum(); if(accOn){stopBacking();startBacking();} });  // scale locked to the harmony, restart from bar I
rhythmSel.addEventListener("change",()=>{ settings.rhythm=rhythmSel.value; updateTopsum(); });   // rhythm changes on the fly

const colorSel=document.getElementById("colorSel"), landSel=document.getElementById("landSel"), phraseSel=document.getElementById("phraseSel"), timingSel=document.getElementById("timingSel");
colorSel.addEventListener("change",()=>{ settings.jazzColor=colorSel.value; saveSettings(); });   // scales apply from the next chord
landSel.addEventListener("change",()=>{ settings.jazzLand=landSel.value; saveSettings(); });
phraseSel.addEventListener("change",()=>{ settings.jazzPhrase=phraseSel.value; saveSettings(); updateTopsum(); });
timingSel.addEventListener("change",()=>{ settings.jazzTiming=timingSel.value; saveSettings(); });

const bpm=document.getElementById("bpm"), bpmVal=document.getElementById("bpmVal");
bpm.addEventListener("input",()=>{settings.bpm=+bpm.value; bpmVal.textContent=bpm.value; updateTopsum();});
const setVal=(id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent=txt; };
const tone=document.getElementById("tone"); tone.addEventListener("input",()=>{settings.tone=+tone.value; if(leadFilter) leadFilter.frequency.value=settings.tone; setVal('toneVal',tone.value); saveSettings();});
const volSolo=document.getElementById("volSolo"); volSolo.addEventListener("input",()=>{settings.volSolo=volSolo.value/100; if(leadOut) leadOut.gain.value=settings.volSolo; setVal('volSoloVal',volSolo.value+'%'); saveSettings();});
const volAcc=document.getElementById("volAcc"); volAcc.addEventListener("input",()=>{settings.volAcc=volAcc.value/100; if(accBus) accBus.gain.value=settings.volAcc; setVal('volAccVal',volAcc.value+'%'); saveSettings();});
const bgDrums=document.getElementById("bgDrums"); bgDrums.addEventListener("input",()=>{settings.bgDrums=bgDrums.value/100; if(busPerc) busPerc.gain.value=settings.bgDrums; setVal('bgDrumsVal',bgDrums.value+'%'); saveSettings();});
const bgBass=document.getElementById("bgBass"); bgBass.addEventListener("input",()=>{settings.bgBass=bgBass.value/100; if(busBass) busBass.gain.value=settings.bgBass; setVal('bgBassVal',bgBass.value+'%'); saveSettings();});
const bgChord=document.getElementById("bgChord"); bgChord.addEventListener("input",()=>{settings.bgChord=bgChord.value/100; if(busChord) busChord.gain.value=settings.bgChord; setVal('bgChordVal',bgChord.value+'%'); saveSettings();});
const vizSel=document.getElementById("vizSel"); vizSel.addEventListener("change",()=>{ settings.viz=vizSel.value==='on'; saveSettings(); });
const gyroSel=document.getElementById("gyroSel"); gyroSel.addEventListener("change",()=>{ resetGyroParams(); settings.gyro=gyroSel.value; if(settings.gyro!=='off') enableGyro(); saveSettings(); });
if(!TOUCH) document.getElementById("ctlGyro").style.display="none";   // tilt lives in the top bar; pointless on desktop
function applyPrefsToControls(){
  tone.value=settings.tone;
  volSolo.value=Math.round(settings.volSolo*100); volAcc.value=Math.round(settings.volAcc*100);
  bgDrums.value=Math.round(settings.bgDrums*100); bgBass.value=Math.round(settings.bgBass*100); bgChord.value=Math.round(settings.bgChord*100);
  setVal('toneVal',Math.round(settings.tone)); setVal('volSoloVal',Math.round(settings.volSolo*100)+'%'); setVal('volAccVal',Math.round(settings.volAcc*100)+'%');
  setVal('bgDrumsVal',Math.round(settings.bgDrums*100)+'%'); setVal('bgBassVal',Math.round(settings.bgBass*100)+'%'); setVal('bgChordVal',Math.round(settings.bgChord*100)+'%');
  vizSel.value=settings.viz?'on':'off'; gyroSel.value=settings.gyro;
  colorSel.value=settings.jazzColor; landSel.value=settings.jazzLand; phraseSel.value=settings.jazzPhrase; timingSel.value=settings.jazzTiming;
}
const settingsEl=document.getElementById("settings");
document.getElementById("settingsBtn").addEventListener("click",()=>settingsEl.classList.remove("hidden"));
document.getElementById("closeSettings").addEventListener("click",()=>settingsEl.classList.add("hidden"));
const helpEl=document.getElementById("help");
function showHelp(withMain,withJazz){
  document.getElementById("helpMain").style.display=withMain?'block':'none';
  document.getElementById("helpJazz").style.display=withJazz?'block':'none';
  helpEl.classList.remove("hidden"); }
document.getElementById("helpBtn").addEventListener("click",()=>showHelp(true,false));      // general help lives on the start screen
document.getElementById("jazzHelpBtn").addEventListener("click",()=>showHelp(false,true));  // jazz help shows only the jazz part
document.getElementById("closeHelp").addEventListener("click",()=>helpEl.classList.add("hidden"));
accBtn.addEventListener("click",()=> accOn?stopBacking():startBacking());
// close any open sheet with Escape or a tap on the backdrop
const SHEETS=["settings","help","recov","paywall","labov","howit","tutov"];
document.addEventListener("keydown",e=>{ if(e.key!=="Escape") return;
  let closed=false;
  SHEETS.forEach(id=>{ const el=document.getElementById(id); if(!el.classList.contains("hidden")){ el.classList.add("hidden"); closed=true; } });
  if(!closed && overlay.style.display==='none') goHome(); });   // Esc with nothing open → back to the picker
SHEETS.forEach(id=>{ const el=document.getElementById(id); el.addEventListener("pointerdown",e=>{ if(e.target===el) el.classList.add("hidden"); }); });
// pause the backing while the recording preview is open — it clashes with the clip's own audio;
// watching the class covers every close path (button, Escape, backdrop tap)
// same for the scale builder: silence the backing while editing (so auditions don't overlap it),
// then restart it on close — now under whatever scale/arp OK selected
[['recov'],['labov']].forEach(([id])=>{ let held=false; const el=document.getElementById(id);
  new MutationObserver(()=>{ const open=!el.classList.contains('hidden');
    if(open && accOn){ held=true; stopBacking(); }
    else if(!open && held){ held=false; startBacking(); }
  }).observe(el,{attributes:true,attributeFilter:['class']}); });

/* ============ Language ============ */
function applyStaticI18n(){
  document.title=t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.getAttribute('data-i18n')); });
}
function refreshLabels(){
  applyStaticI18n();
  populateHarmRhythm();
  document.getElementById("h1name").textContent=t(M.name);
  updateModeSub();
  buildLadRow(); applyLadLock();
  if(!(M.back==='blues'||M.id==='jazz')) buildBackingOptions();
  setHint(); setExtraLabels();
  accBtn.textContent=t(accOn?'btn.bgStop':'btn.bgStart');
  refreshRecLabel();
  updateDisplay();
}
function setLang(l){ const v=setLangCode(l); document.documentElement.lang=v; refreshLabels(); }
const langSel=document.getElementById("langSel"); langSel.value=LANG;
langSel.addEventListener("change",()=>setLang(langSel.value));

/* ============ Lab: custom scale builder ============ */
const DEG12=['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'];
let labScales=[]; try{ labScales=JSON.parse(localStorage.getItem('jamlab.labScales')||'[]')||[]; }catch(e){ labScales=[]; }
function saveLabStore(){ try{ localStorage.setItem('jamlab.labScales',JSON.stringify(labScales)); }catch(e){} }
function rebuildLabMode(){ const m=MODES.lab; m.scales={}; m.downScales={}; m.arps={}; m.variants=[];
  for(const p of LAB_PRESETS){ m.scales[p.id]=p.pcs; if(p.down) m.downScales[p.id]=p.down; if(p.arp) m.arps[p.id]=p.arp; m.variants.push({id:p.id,label:p.label}); }
  for(const c of labScales){ m.scales[c.id]=c.pcs; if(c.down) m.downScales[c.id]=c.down; if(c.arp) m.arps[c.id]=c.arp; m.variants.push({id:c.id,label:c.name}); }
  if(!m.scales[m.defVariant]) m.defVariant='p_harm';
}
rebuildLabMode();
const percSel=document.getElementById('percSel');
percSel.addEventListener('change',()=>{ if(M.lab){ M.perc=percSel.value; try{ localStorage.setItem('jamlab.labPerc',percSel.value); }catch(e){} } });
const labov=document.getElementById('labov'), labPcs=document.getElementById('labPcs'), labPcsDn=document.getElementById('labPcsDn'),
      labDownSel=document.getElementById('labDownSel'), labArpEl=document.getElementById('labArp'),
      labName=document.getElementById('labName'), labCount=document.getElementById('labCount');
let labSel=new Set([0]), labSelDn=new Set([0]), labArp=[0,7,12,7,0,7,12,7];   // 8 steps = one bar of the modal scheduler
function labArpChoices(){ return [null, ...[...labSel].sort((a,b)=>a-b), 12]; }   // rest → scale degrees → octave
function labArpLabel(v){ return v==null?'·':(v===12?'1↑':DEG12[v]); }
function labSanitizeArp(){ const ok=[...labSel,12];
  labArp=labArp.map(v=>{ if(v==null||ok.includes(v)) return v;
    let best=0,bd=99; for(const c of ok){ const d=Math.abs(c-v); if(d<bd){bd=d;best=c;} } return best; }); }   // dropped notes fall to the nearest scale tone
function labPing(off){ if(actx) kotoPluck(off, actx.currentTime); }   // audition a single tone
function labGrid(host,set){ host.innerHTML='';
  for(let pc=0;pc<12;pc++){ const b=document.createElement('button'); b.className='pcbtn'+(set.has(pc)?' on':''); b.textContent=DEG12[pc]; b.disabled=(pc===0);
    b.addEventListener('click',()=>{ if(set.has(pc)) set.delete(pc); else { if(set.size>=8) return; set.add(pc); tapHaptic('LIGHT'); labPing(pc); } labRender(); });
    host.appendChild(b); } }
function labRender(){
  labGrid(labPcs,labSel);
  const dn=labDownSel.value==='on';
  labPcsDn.style.display=dn?'':'none';
  if(dn) labGrid(labPcsDn,labSelDn);
  labSanitizeArp();
  labArpEl.innerHTML='';
  labArp.forEach((v,i)=>{ const b=document.createElement('button'); b.className='pcbtn'+(v!=null?' on':''); b.textContent=labArpLabel(v);
    b.addEventListener('click',()=>{ const ch=labArpChoices(), idx=ch.findIndex(x=>x===v); labArp[i]=ch[(idx+1)%ch.length];
      if(labArp[i]!=null) labPing(labArp[i]); labRender(); });
    labArpEl.appendChild(b); });
  labCount.style.color='var(--muted)';
  labCount.textContent=t('lab.count',{n:labSel.size}) + (dn? '  ·  ↓ '+t('lab.count',{n:labSelDn.size}) : ''); }
const labScaleSel=document.getElementById('labScaleSel');
let labOrigSig='';
function labScaleName(id){ const p=LAB_PRESETS.find(x=>x.id===id); if(p) return t(p.label);
  const c=labScales.find(x=>x.id===id); return c?c.name:''; }
function labSig(pcs,down,arp){ return pcs.join(',')+'|'+(down?down.join(','):'')+'|'+arp.join(','); }
function labFillSelect(){ labScaleSel.innerHTML='';
  LAB_PRESETS.forEach(p=>labScaleSel.appendChild(new Option(t(p.label),p.id)));
  labScales.forEach(c=>labScaleSel.appendChild(new Option(c.name,c.id)));
  labScaleSel.appendChild(new Option(t('lab.newScale'),'__new')); }
function labLoad(id){
  if(id==='__new'){ labSel=new Set([0]); labSelDn=new Set([0]); labDownSel.value='off';
    labArp=[0,7,12,7,0,7,12,7]; labName.value=''; labName.placeholder=t('lab.newName'); }
  else { const src=LAB_PRESETS.find(p=>p.id===id)||labScales.find(c=>c.id===id)||LAB_PRESETS[0];
    labSel=new Set(src.pcs); labSel.add(0);
    labSelDn=new Set(src.down||src.pcs); labSelDn.add(0);
    labDownSel.value=src.down?'on':'off';
    const base=(src.arp&&src.arp.length)?src.arp:[0,7,12,7];
    labArp=[]; while(labArp.length<8) labArp=labArp.concat(base); labArp=labArp.slice(0,8);
    const own=labScales.find(c=>c.id===id);
    labName.value=own?own.name:''; labName.placeholder=own?'':labScaleName(id); }
  document.getElementById('labDelete').style.display = labScales.some(c=>c.id===id) ? '' : 'none';
  labRender();
  labOrigSig=labSig([...labSel].sort((a,b)=>a-b), labDownSel.value==='on'?[...labSelDn].sort((a,b)=>a-b):null, labArp);
}
document.getElementById('labBtn').addEventListener('click',()=>{
  labFillSelect();
  const cur=M.scales[settings.variant]?settings.variant:'p_harm';
  labScaleSel.value=cur; labLoad(cur);
  labov.classList.remove('hidden'); });
labScaleSel.addEventListener('change',()=>labLoad(labScaleSel.value));
labDownSel.addEventListener('change',()=>{ if(labDownSel.value==='on'&&labSelDn.size<=1) labSelDn=new Set(labSel); labRender(); });
// audition: play the edited scale up (and back down via the descending row) or two bars of the arp pattern
let labPrevUntil=0;
function labPrevOk(){ initAudio(); resumeAudio(); return actx.currentTime>=labPrevUntil; }
document.getElementById('labPlayScale').addEventListener('click',()=>{
  if(!labPrevOk()) return;
  const up=[...labSel].sort((a,b)=>a-b).concat([12]);
  const dnSet=labDownSel.value==='on'?labSelDn:labSel;
  const down=[...dnSet].filter(v=>v!==0).sort((a,b)=>b-a).concat([0]);
  const dt=0.22; let t=actx.currentTime+0.05, i=0;
  for(const pc of up) kotoPluck(pc, t+(i++)*dt);
  for(const pc of down) kotoPluck(pc, t+(i++)*dt);
  labPrevUntil=t+i*dt+0.3; });
document.getElementById('labPlayArp').addEventListener('click',()=>{
  if(!labPrevOk()) return;
  labSanitizeArp();
  const step=(60/settings.bpm)/2; const t=actx.currentTime+0.05;
  for(let r=0;r<2;r++) labArp.forEach((v,i)=>{ if(v!=null) kotoPluck(v, t+(r*8+i)*step); });
  labPrevUntil=t+16*step+0.3; });
document.getElementById('labClose').addEventListener('click',()=>labov.classList.add('hidden'));
document.getElementById('labOk').addEventListener('click',()=>{
  const pcs=[...labSel].sort((a,b)=>a-b);
  const useDown=labDownSel.value==='on';
  const down=useDown?[...labSelDn].sort((a,b)=>a-b):null;
  if(useDown && down.length!==pcs.length){ labCount.textContent=t('lab.eqErr'); labCount.style.color='#ff8787'; return; }
  labSanitizeArp();
  const sel=labScaleSel.value;
  if(sel!=='__new' && labSig(pcs,down,labArp)===labOrigSig){ setVariant(sel); labov.classList.add('hidden'); return; }   // pick an existing scale unchanged
  const name=labName.value.trim();
  if(!name){ labCount.textContent=t('lab.needName'); labCount.style.color='#ff8787'; labName.focus(); return; }   // a saved scale must be named
  const own=labScales.find(c=>c.id===sel);      // editing one's own custom scale → overwrite; a preset/new → create
  let id;
  if(own){ own.pcs=pcs; own.name=name; own.down=down||undefined; own.arp=labArp.slice(); id=own.id; }
  else { id='c'+Date.now().toString(36); labScales.push({id,name,pcs,down:down||undefined,arp:labArp.slice()}); }
  saveLabStore(); rebuildLabMode(); setVariant(id);
  labov.classList.add('hidden'); });
document.getElementById('labDelete').addEventListener('click',()=>{
  const i=labScales.findIndex(c=>c.id===labScaleSel.value);
  if(i>=0){ labScales.splice(i,1); saveLabStore(); rebuildLabMode(); if(settings.variant===labScaleSel.value) setVariant('p_harm'); }
  labov.classList.add('hidden'); });

/* ============ Instrument picker and start ============ */
const overlay=document.getElementById("overlay");
function refreshLocks(){ document.querySelectorAll('.pick').forEach(p=>p.classList.toggle('locked', modeLocked(p.dataset.mode))); }
onProChange(refreshLocks);   // a purchase unlocks everything in place
function goHome(){ if(accOn) stopBacking(); clearTaste(); overlay.style.display="flex"; }
function enterPlay(id){
  initAudio(); resumeAudio();
  if(settings.gyro!=='off') enableGyro();   // restored gyro pref needs a user gesture to attach
  if(accOn) stopBacking();              // so the backing doesn't double up on a repeat pick
  setMode(id);
  overlay.style.display="none";
  if(!NATIVE) history.pushState({jam:1},'');   // browser Back mirrors the Android back gesture
  updateDisplay(); startBacking();
  try{                                          // jazz extras on first jazz entry (the general intro is the interactive tutorial now)
    const firstJazz=id==='jazz' && !localStorage.getItem('jamlab.jazzHelpSeen');
    if(firstJazz){ localStorage.setItem('jamlab.jazzHelpSeen','1'); showHelp(false,true); }
  }catch(e){}
}
document.querySelectorAll(".pick").forEach(p=>p.addEventListener("click",()=>{
  const id=p.dataset.mode;
  if(modeLocked(id)){                       // locked: taste it for real first, wall only on the rerun
    if(!KITCHEN.has(id) && tasteAvailable(id)) startTaste(id); else showPaywall();   // the kitchen doesn't do tastings
    return;
  }
  track('mode_picked',{mode:id});
  enterPlay(id);
}));

/* ============ Tasting paywall: a locked instrument gives 60s of real play, then a soft offer ============ */
const TASTE_MS=((+new URLSearchParams(location.search).get('taste'))||60)*1000;   // ?taste=5 → 5s, for QA
const TASTE_COOLDOWN=24*3600*1000;                   // one taste per instrument per day
function tasteAvailable(id){ try{ return Date.now()-(+localStorage.getItem('jamlab.taste.'+id)||0)>TASTE_COOLDOWN; }catch(e){ return true; } }
const tasteBar=document.createElement('div'); tasteBar.id='tastebar';
tasteBar.innerHTML='<span class="tlabel"></span><span class="tleft"></span><i></i>';
document.body.appendChild(tasteBar);
let tasteState=null, tasteAfterPaywall=false;
function tasteHUD(on){ tasteBar.classList.toggle('on',!!on);
  const rb=document.getElementById('recBtn'); if(rb) rb.disabled=!!on; }   // recording is the pro perk — off during a taste
function startTaste(id){
  try{ localStorage.setItem('jamlab.taste.'+id, String(Date.now())); }catch(e){}   // marked at start: no restart-loops
  track('taste_start',{mode:id});
  enterPlay(id);
  tasteBar.querySelector('.tlabel').textContent=t('taste.label');
  tasteState={ mode:id, end:Date.now()+TASTE_MS,
    timer:setTimeout(endTaste,TASTE_MS),
    tick:setInterval(()=>{ if(!tasteState) return; const left=Math.max(0,tasteState.end-Date.now());
      tasteBar.querySelector('.tleft').textContent=Math.floor(left/60000)+':'+String(Math.floor(left/1000)%60).padStart(2,'0');
      tasteBar.querySelector('i').style.width=(left/TASTE_MS*100)+'%'; },250) };
  tasteHUD(true);
}
function clearTaste(){ if(!tasteState) return; clearTimeout(tasteState.timer); clearInterval(tasteState.tick); tasteState=null; tasteHUD(false); }
function endTaste(){ if(!tasteState) return;
  const name=t(MODES[tasteState.mode].name);
  track('taste_end',{mode:tasteState.mode});
  clearTaste();
  if(accOn) stopBacking();
  tasteAfterPaywall=true; showPaywall(name);
}
// when the post-taste offer is dismissed without buying → back to the picker
new MutationObserver(()=>{ const pw=document.getElementById('paywall');
  if(tasteAfterPaywall && pw.classList.contains('hidden')){ tasteAfterPaywall=false; if(!isPro()) goHome(); }
}).observe(document.getElementById('paywall'),{attributes:true,attributeFilter:['class']});
// Android back button: open sheet → close it (recording preview acts like Cancel);
// play screen → style picker; style picker → leave the app
function closeTopSheet(){
  const sheet=SHEETS.map(id=>document.getElementById(id)).find(el=>!el.classList.contains('hidden'));
  if(!sheet) return false;
  if(sheet.id==='recov') document.getElementById('recVid').pause();
  sheet.classList.add('hidden'); return true;
}
if(NPLUG && NPLUG.App){
  NPLUG.App.addListener('backButton', ()=>{
    if(closeTopSheet()) return;
    if(overlay.style.display==='none'){ goHome(); return; }
    NPLUG.App.exitApp();
  });
}
window.addEventListener('popstate',()=>{ if(!NATIVE && overlay.style.display==='none'){ closeTopSheet(); goHome(); } });

// initial build (under the overlay)
applyPrefsToControls();
populateHarmRhythm();
setMode('blues');
refreshLabels();
refreshLocks();
initBilling();
// tutorial entry: like a picker tap, but no auto-backing (the tutorial's last step turns the band on)
// and no lock check — a guided taste of koto/bright is deliberate
initTutorial({ enterMode:(id)=>{ initAudio(); resumeAudio(); if(accOn) stopBacking();
  track('mode_picked',{mode:id,via:'tutorial'});
  setMode(id); overlay.style.display='none'; if(!NATIVE) history.pushState({jam:1},'');
  updateDisplay(); } });
track('app_open');
document.addEventListener("gesturestart",e=>e.preventDefault());
document.addEventListener("dblclick",e=>e.preventDefault());   // belt-and-suspenders vs iOS double-tap zoom
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("touchend",resumeAudio,{passive:true});
// interruptions (call, app switch, screen lock): hold the backing while hidden, resume on return
let backingHeldBg=false;
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){ if(accOn){ backingHeldBg=true; stopBacking(); } }
  else { resumeAudio(); if(backingHeldBg){ backingHeldBg=false; startBacking(); } }
});
