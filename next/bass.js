// Sampled bass for the backing — GeneralUser GS from the bundled waf/ pack (offline, no CDN),
// loaded through the sampler's shared GU loader. One instrument at a time — chosen per style.
import { actx } from './audio.js';
import { loadGuBacking } from './sampler.js';

// trim on top of the loader's peak normalization (~0.8) so the sampled bass sits at the level the
// synth bass did (callers pass vel = the synth voice's peak). Tune by ear per instrument if needed.
const TRIM={ acoustic_bass:2.0, synth_bass_1:1.5, electric_bass_finger:1.9 };

let cur=null, curSlug=null;
export function bassReady(){ return !!cur; }
export function loadBass(slug, lo=24, hi=64){
  return loadGuBacking(slug,lo,hi).then(e=>{ if(e){ cur=e; curSlug=slug; } return true; }).catch(()=>true);
}
// play one bass note; gated to the note length so it doesn't ring into the next (matches the synth envelope)
export function playBassNote(midi,time,dur,vel,dest){ if(!cur) return false;
  let e=cur.map.get(midi);
  if(!e){ let bd=1e9; for(const [k,v] of cur.map){ const d=Math.abs(k-midi); if(d<bd){bd=d;e=v;} } if(!e) return false; }
  const src=actx.createBufferSource(); src.buffer=e.buf; src.playbackRate.value=Math.pow(2,(midi-e.base)/12);
  if(e.loopS!=null && e.loopE>e.loopS){ src.loop=true; src.loopStart=e.loopS; src.loopEnd=e.loopE; }   // GU loop points: short samples can sustain the whole note
  const lvl=(vel==null?0.5:vel)*cur.gain*(TRIM[curSlug]||1.8);
  const g=actx.createGain();
  g.gain.setValueAtTime(0,time); g.gain.linearRampToValueAtTime(lvl,time+0.006);   // sample has its own attack; a hair of ramp kills clicks
  g.gain.setValueAtTime(lvl,time+Math.max(0.03,dur*0.6)); g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  src.connect(g); g.connect(dest); src.start(time); src.stop(time+dur+0.1); return true; }
