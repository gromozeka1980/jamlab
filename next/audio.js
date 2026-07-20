// Web Audio graph: context, master chain, buses, reverb, recording/analyser taps.
// Node variables are exported as live bindings — they are assigned once in initAudio().
import { settings } from './settings.js';

export let actx=null, master=null, comp=null, leadBus=null, leadFilter=null, shaper=null,
           leadOut=null, accBus=null, busPerc=null, busBass=null, busChord=null, reverb=null, noiseBuf=null, recDest=null, anl=null;

function openCtx(){ const AC=window.AudioContext||window.webkitAudioContext;
  try{ actx=new AC({latencyHint:'balanced'}); }catch(e){ actx=new AC(); } }   // bigger audio buffer → fewer underruns (anti-crackle)
export function initAudio(){ if(actx) return; openCtx(); buildGraph(); unlockAudio(); }
// Some WebViews hand the audio hardware to another app and never give it back — resume() then reports
// 'running' but no sound flows. On return from background we rebuild the whole context + graph so audio
// is guaranteed live again. AudioBuffers are context-agnostic, so cached samples keep working.
export function recreateAudio(){ try{ if(actx) actx.close(); }catch(e){} actx=null; openCtx(); buildGraph(); unlockAudio(); }
function buildGraph(){
  comp = actx.createDynamicsCompressor(); comp.threshold.value=-12; comp.ratio.value=3; comp.release.value=.25;
  master = actx.createGain(); master.gain.value=1; master.connect(comp); comp.connect(actx.destination);
  try{ recDest=actx.createMediaStreamDestination(); comp.connect(recDest); }catch(e){}   // tap for recording
  try{ anl=actx.createAnalyser(); anl.fftSize=256; anl.smoothingTimeConstant=.82; comp.connect(anl); }catch(e){}   // drives the recording scene
  // cheap feedback-delay reverb (replaces a 2.8s convolution that overloaded the audio thread on phones)
  reverb = actx.createGain();                        // send target
  const revWet=actx.createGain(); revWet.gain.value=.22;
  [0.0233,0.0297,0.0371,0.0431].forEach(dt=>{ const d=actx.createDelay(0.1); d.delayTime.value=dt;
    const fb=actx.createGain(); fb.gain.value=.6; const lp=actx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3000;
    reverb.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); d.connect(revWet); });
  revWet.connect(master);
  leadBus = actx.createGain(); leadBus.gain.value=.9;
  leadFilter = actx.createBiquadFilter(); leadFilter.type="lowpass"; leadFilter.frequency.value=settings.tone; leadFilter.Q.value=.7;
  shaper = actx.createWaveShaper(); shaper.curve=makeDriveCurve(1.0); shaper.oversample="none";
  leadOut = actx.createGain(); leadOut.gain.value=settings.volSolo;
  leadBus.connect(leadFilter); leadFilter.connect(shaper); shaper.connect(leadOut);
  leadOut.connect(master); leadOut.connect(reverb);
  accBus = actx.createGain(); accBus.gain.value=settings.volAcc; accBus.connect(master); accBus.connect(reverb);
  busPerc = actx.createGain(); busPerc.gain.value=settings.bgDrums; busPerc.connect(accBus);   // per-component backing mixer
  busBass = actx.createGain(); busBass.gain.value=settings.bgBass; busBass.connect(accBus);
  busChord= actx.createGain(); busChord.gain.value=settings.bgChord; busChord.connect(accBus);
  const len=actx.sampleRate*1; noiseBuf=actx.createBuffer(1,len,actx.sampleRate);
  const d=noiseBuf.getChannelData(0); for(let i=0;i<len;i++) d[i]=Math.random()*2-1;
}
export function resumeAudio(){ if(!actx) return;
  try{ actx.resume(); }catch(e){}                                                                    // resume regardless of exact state — some WebViews don't report 'suspended' after losing audio focus
  try{ const s=actx.createBufferSource(); s.buffer=actx.createBuffer(1,1,22050); s.connect(actx.destination); s.start(0); }catch(e){}   // nudge the output stream awake
  if(silentEl) silentEl.play().catch(()=>{});                                                        // replay the silent element to reclaim the audio session the other app took
}
export function makeImpulse(sec,decay){ const rate=actx.sampleRate,n=rate*sec,b=actx.createBuffer(2,n,rate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);} return b; }
export function makeDriveCurve(k){ const n=1024,c=new Float32Array(n); for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x));} return c; }
export const accGain=(l,bus)=>{const g=actx.createGain();g.gain.value=l;g.connect(bus||accBus);return g;};

/* iOS unlock */
let silentEl=null;
function buildSilentWavUrl(){ const rate=8000,n=rate,buf=new ArrayBuffer(44+n*2),dv=new DataView(buf);
  const w=(o,s)=>{for(let i=0;i<s.length;i++) dv.setUint8(o+i,s.charCodeAt(i));};
  w(0,'RIFF');dv.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
  dv.setUint32(24,rate,true);dv.setUint32(28,rate*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);w(36,'data');dv.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([buf],{type:'audio/wav'})); }
function unlockAudio(){ try{const b=actx.createBuffer(1,1,22050),s=actx.createBufferSource();s.buffer=b;s.connect(actx.destination);s.start(0);}catch(e){}
  if(!silentEl){ try{ silentEl=document.createElement('audio'); silentEl.src=buildSilentWavUrl(); silentEl.loop=true; silentEl.volume=0.0001;
    silentEl.setAttribute('playsinline','');silentEl.setAttribute('webkit-playsinline',''); document.body.appendChild(silentEl); silentEl.play().catch(()=>{}); }catch(e){} } }
