// Kitchen experiment: sampled General-MIDI instruments (FluidR3_GM, free/redistributable),
// loaded on demand from the gleitz/midi-js-soundfonts CDN and decoded through the app's AudioContext.
// Online only for now (each instrument ~2.6 MB) — fine for a kitchen experiment.
import { actx } from './audio.js';

const BASE='https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
// visible name key (i18n: instr.<id>) → GM slug
export const SAMPLER_INSTRUMENTS=[
  {id:'piano',   slug:'acoustic_grand_piano'},
  {id:'epiano',  slug:'electric_piano_1'},
  {id:'strings', slug:'string_ensemble_1'},
  {id:'marimba', slug:'marimba'},
  {id:'vibes',   slug:'vibraphone'},
  {id:'nylon',   slug:'acoustic_guitar_nylon'},
  {id:'flute',   slug:'flute'},
];
const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];   // gleitz keys use flats (Bb, not A#)
function midiName(m){ return FLAT[((m%12)+12)%12]+(Math.floor(m/12)-1); }

const cache={};             // slug → { buffers: Map<midi,AudioBuffer>, promise }
let current=null;           // the ready instrument's buffer map

export function samplerReady(){ return !!current; }
export function sampleBuffer(midi){ if(!current) return null;
  if(current.has(midi)) return current.get(midi);
  // fall back to the nearest decoded note (bend/rate handles the pitch gap)
  let best=null,bd=99; for(const k of current.keys()){ const d=Math.abs(k-midi); if(d<bd){bd=d;best=k;} }
  return best==null?null:current.get(best);
}
export function sampleBaseMidi(midi){ if(current&&current.has(midi)) return midi;
  let best=midi,bd=99; if(current) for(const k of current.keys()){ const d=Math.abs(k-midi); if(d<bd){bd=d;best=k;} } return best;
}

// load an instrument by id; decodes notes across lo..hi (the playable range). Resolves when ready.
export async function loadSampler(id, lo=36, hi=88){
  const inst=SAMPLER_INSTRUMENTS.find(x=>x.id===id)||SAMPLER_INSTRUMENTS[0];
  const slug=inst.slug;
  if(cache[slug] && cache[slug].done){ current=cache[slug].buffers; return true; }
  if(cache[slug] && cache[slug].promise){ await cache[slug].promise; current=cache[slug].buffers; return true; }
  const entry={buffers:new Map(), done:false};
  cache[slug]=entry;
  entry.promise=(async()=>{
    const txt=await fetch(BASE+slug+'-mp3.js').then(r=>r.text());
    (0,eval)(txt);                                   // defines window.MIDI.Soundfont[slug] = { "C4":"data:audio/mp3;base64,…" }
    const sf=window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[slug];
    if(!sf) throw new Error('soundfont parse failed: '+slug);
    const jobs=[];
    for(let m=lo;m<=hi;m++){ const uri=sf[midiName(m)]; if(!uri) continue;
      const b64=uri.split(',')[1], bin=atob(b64), u8=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
      jobs.push(actx.decodeAudioData(u8.buffer).then(buf=>entry.buffers.set(m,buf)).catch(()=>{}));
    }
    await Promise.all(jobs);
    entry.done=true;
  })();
  await entry.promise; current=entry.buffers; return true;
}
