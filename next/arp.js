// Sampled arpeggio/ostinato pluck for the backing — GeneralUser GS from the bundled waf/ pack
// (offline, no CDN), via the sampler's shared GU loader. One instrument at a time — per style.
import { actx } from './audio.js';
import { loadGuBacking } from './sampler.js';

// trim on top of the loader's peak normalization (~0.8) — matches the synth pluck the callers were
// balanced against (they pass vel = the synth pluck's peak). Tune by ear per instrument if needed.
const TRIM={ koto:1.5, dulcimer:1.5, orchestral_harp:1.6, acoustic_guitar_nylon:1.5, celesta:1.2 };

let cur=null, curSlug=null;
export function arpReady(){ return !!cur; }
export function loadArp(slug, lo=36, hi=84){
  return loadGuBacking(slug,lo,hi).then(e=>{ if(e){ cur=e; curSlug=slug; } return true; }).catch(()=>true);
}
export function playArpNote(midi,time,dur,vel,dest){ if(!cur) return false;
  let e=cur.map.get(midi);
  if(!e){ let bd=1e9; for(const [k,v] of cur.map){ const d=Math.abs(k-midi); if(d<bd){bd=d;e=v;} } if(!e) return false; }
  const src=actx.createBufferSource(); src.buffer=e.buf; src.playbackRate.value=Math.pow(2,(midi-e.base)/12);
  const lvl=(vel==null?0.22:vel)*cur.gain*(TRIM[curSlug]||1.4);
  const g=actx.createGain();
  g.gain.setValueAtTime(0,time); g.gain.linearRampToValueAtTime(lvl,time+0.005);
  g.gain.exponentialRampToValueAtTime(0.001,time+dur);   // let the pluck ring and fade (plucked samples decay anyway)
  src.connect(g); g.connect(dest); src.start(time); src.stop(time+dur+0.1); return true; }
