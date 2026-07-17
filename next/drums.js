// Sampled drum one-shots (FluidR3 GM kit via webaudiofont), for a "real" backing kit.
// Loaded on demand; until then the app's synthesized hits play (graceful fallback, and offline-safe).
import { actx } from './audio.js';

const WAF='https://surikov.github.io/webaudiofontdata/sound/';
const KIT={ kick:36, snare:38, hatClosed:42, hatOpen:46,   // name → GM drum note
  taiko:41, doum:64, tek:62, shaker:70 };                  // ethnic perc: low floor tom, low conga, mute hi conga, maracas
// tuned by measurement to match the loudness of the synth voices the mix was balanced around
// (sampled one-shots are full-scale recordings — raw they were several× too loud)
const LEVEL={ kick:0.34, snare:0.5, hatClosed:0.12, hatOpen:0.12,
  taiko:0.17, doum:0.38, tek:0.5, shaker:0.57 };
const bufs={};
let done=false, loading=null;

export function drumsReady(){ return done; }
function b64ToBuf(b64){ const bin=atob(b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return actx.decodeAudioData(u8.buffer); }

export function loadDrums(){
  if(done) return Promise.resolve(true);
  if(loading) return loading;
  loading=Promise.all(Object.entries(KIT).map(async([name,note])=>{
    const fn='128'+note+'_0_FluidR3_GM_sf2_file';
    try{ const txt=await fetch(WAF+fn+'.js').then(r=>{ if(!r.ok) throw 0; return r.text(); });
      (0,eval)(txt);
      const tone=window['_drum_'+note+'_0_FluidR3_GM_sf2_file'], z=tone&&tone.zones&&tone.zones[0];
      const b64=z&&(z.file||z.sample); if(b64) bufs[name]=await b64ToBuf(b64);
    }catch(e){}
  })).then(()=>{ done=Object.keys(bufs).length>0; return done; });
  return loading;
}
// play a kit piece; returns false if that sample isn't available (caller falls back to synth)
export function playDrum(name,time,vel,dest){ const buf=bufs[name]; if(!buf) return false;
  const s=actx.createBufferSource(); s.buffer=buf;
  const g=actx.createGain(); g.gain.value=(vel==null?1:vel)*(LEVEL[name]||1);
  s.connect(g); g.connect(dest); s.start(time); s.stop(time+buf.duration+0.05);
  return true; }
