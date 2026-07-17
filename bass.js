// Sampled bass (per-note, FluidR3 GM via gleitz), one instrument at a time — chosen per style.
// A tiny dedicated sampler so the backing's bass line can be a real instrument, independent of the lead.
import { actx } from './audio.js';

const FLUID='https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const midiName=m=>FLAT[((m%12)+12)%12]+(Math.floor(m/12)-1);
const b64ToU8=b64=>{ const bin=atob(b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return u8; };

// loudness calibration per bass sound — raw sample peak → matches a synth bass of the same nominal gain
// (measured; the callers pass vel = the synth voice's own peak, so this makes them line up)
const GAIN={ acoustic_bass:7.15, synth_bass_1:4.24, electric_bass_finger:6.5 };

const cache={};                 // slug → { map:Map<midi,AudioBuffer>, done, promise }
let cur=null, curSlug=null;
export function bassReady(){ return !!cur; }

export function loadBass(slug, lo=24, hi=64){
  if(cache[slug] && cache[slug].done){ cur=cache[slug].map; curSlug=slug; return Promise.resolve(true); }
  if(cache[slug] && cache[slug].promise) return cache[slug].promise.then(()=>{ if(cache[slug].done){ cur=cache[slug].map; curSlug=slug; } return true; });
  const entry={map:new Map(), done:false}; cache[slug]=entry;
  entry.promise=(async()=>{
    const txt=await fetch(FLUID+slug+'-mp3.js').then(r=>{ if(!r.ok) throw 0; return r.text(); });
    (0,eval)(txt);
    const sf=window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[slug]; if(!sf) throw 0;
    const jobs=[]; for(let m=lo;m<=hi;m++){ const uri=sf[midiName(m)]; if(!uri) continue;
      jobs.push(actx.decodeAudioData(b64ToU8(uri.split(',')[1]).buffer).then(b=>entry.map.set(m,b)).catch(()=>{})); }
    await Promise.all(jobs); entry.done=entry.map.size>0;
  })().then(()=>{ if(entry.done){ cur=entry.map; curSlug=slug; } }).catch(()=>{});
  return entry.promise.then(()=>true);
}
// play one bass note; gated to the note length so it doesn't ring into the next (matches the synth envelope)
export function playBassNote(midi,time,dur,vel,dest){ if(!cur) return false;
  let base=null,bd=1e9; for(const k of cur.keys()){ const d=Math.abs(k-midi); if(d<bd){ bd=d; base=k; } }
  if(base==null) return false;
  const src=actx.createBufferSource(); src.buffer=cur.get(base); src.playbackRate.value=Math.pow(2,(midi-base)/12);
  const lvl=(vel==null?0.5:vel)*(GAIN[curSlug]||1);
  const g=actx.createGain();
  g.gain.setValueAtTime(0,time); g.gain.linearRampToValueAtTime(lvl,time+0.006);   // sample has its own attack; a hair of ramp kills clicks
  g.gain.setValueAtTime(lvl,time+Math.max(0.03,dur*0.6)); g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  src.connect(g); g.connect(dest); src.start(time); src.stop(time+dur+0.1); return true; }
