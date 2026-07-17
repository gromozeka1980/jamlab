// Sampled instruments for the relational keyboard — the full 128 General-MIDI set, streamed on demand.
// Two interchangeable "sound banks", both base64 audio decoded through the app's AudioContext:
//   fluid — gleitz/midi-js-soundfonts FluidR3_GM: one mp3 PER NOTE (our original source, free/redistributable)
//   gu    — surikov/webaudiofont GeneralUser GS: a few ZONES per instrument (root pitch + key range)
// Both normalize into `current`: Map<midi, {buf, base}>  where base = the sample's own pitch (MIDI number).
import { actx } from './audio.js';

const FLUID='https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';   // streamed (big; ~2.5 MB/instrument)
const WAF_LOCAL='./waf/';                                                // GeneralUser GS is bundled in the app → offline
const WAF='https://surikov.github.io/webaudiofontdata/sound/';          // CDN fallback (web, or a missing file)
// GU webaudiofont file: bundled copy first, CDN only if that's missing
async function fetchWaf(fn){
  try{ const r=await fetch(WAF_LOCAL+fn+'.js'); if(r.ok) return r.text(); }catch(e){}
  const r=await fetch(WAF+fn+'.js'); if(!r.ok) throw new Error('waf '+r.status); return r.text();
}

// the 128 GM programs in order — slug = gleitz filename, index = GM program number
export const GM=[
  'acoustic_grand_piano','bright_acoustic_piano','electric_grand_piano','honkytonk_piano','electric_piano_1','electric_piano_2','harpsichord','clavinet',
  'celesta','glockenspiel','music_box','vibraphone','marimba','xylophone','tubular_bells','dulcimer',
  'drawbar_organ','percussive_organ','rock_organ','church_organ','reed_organ','accordion','harmonica','tango_accordion',
  'acoustic_guitar_nylon','acoustic_guitar_steel','electric_guitar_jazz','electric_guitar_clean','electric_guitar_muted','overdriven_guitar','distortion_guitar','guitar_harmonics',
  'acoustic_bass','electric_bass_finger','electric_bass_pick','fretless_bass','slap_bass_1','slap_bass_2','synth_bass_1','synth_bass_2',
  'violin','viola','cello','contrabass','tremolo_strings','pizzicato_strings','orchestral_harp','timpani',
  'string_ensemble_1','string_ensemble_2','synth_strings_1','synth_strings_2','choir_aahs','voice_oohs','synth_choir','orchestra_hit',
  'trumpet','trombone','tuba','muted_trumpet','french_horn','brass_section','synth_brass_1','synth_brass_2',
  'soprano_sax','alto_sax','tenor_sax','baritone_sax','oboe','english_horn','bassoon','clarinet',
  'piccolo','flute','recorder','pan_flute','blown_bottle','shakuhachi','whistle','ocarina',
  'lead_1_square','lead_2_sawtooth','lead_3_calliope','lead_4_chiff','lead_5_charang','lead_6_voice','lead_7_fifths','lead_8_bass__lead',
  'pad_1_new_age','pad_2_warm','pad_3_polysynth','pad_4_choir','pad_5_bowed','pad_6_metallic','pad_7_halo','pad_8_sweep',
  'fx_1_rain','fx_2_soundtrack','fx_3_crystal','fx_4_atmosphere','fx_5_brightness','fx_6_goblins','fx_7_echoes','fx_8_scifi',
  'sitar','banjo','shamisen','koto','kalimba','bagpipe','fiddle','shanai',
  'tinkle_bell','agogo','steel_drums','woodblock','taiko_drum','melodic_tom','synth_drum','reverse_cymbal',
  'guitar_fret_noise','breath_noise','seashore','bird_tweet','telephone_ring','helicopter','applause','gunshot',
];

// 16 GM families (8 programs each). key → i18n label grp.<key>; the picker groups by these
export const FAMILIES=[
  {key:'piano'},{key:'mallet'},{key:'organ'},{key:'guitar'},
  {key:'bass'},{key:'strings'},{key:'ensemble'},{key:'brass'},
  {key:'reed'},{key:'pipe'},{key:'lead'},{key:'pad'},
  {key:'synthfx'},{key:'world'},{key:'perc'},{key:'fx'},
];
export function familyOf(slug){ const p=GM.indexOf(slug); return p<0?-1:Math.min(15,p>>3); }
// families you can actually play a melody on — excludes Percussion (14) and Sound Effects (15)
export const PICK_FAMILIES=FAMILIES.map((f,i)=>i).filter(i=>i<14);
// instruments of a family, sorted alphabetically by display name
export function familyItems(fi){ const lo=fi*8, arr=[];
  for(let p=lo;p<lo+8 && p<128;p++) arr.push(GM[p]);
  return arr.sort((a,b)=>displayName(a).localeCompare(displayName(b))); }
// "acoustic_grand_piano" → "Acoustic Grand Piano" (names are conventionally English, like a DAW)
export function displayName(slug){ return slug.replace(/_+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase()); }

// ---- Timbre facts MIDI/GM and the mp3 packs don't carry — by family, with per-instrument overrides ----
// bend: realistic pitch-bend range in semitones (0 = struck/plucked-keyboard, don't glide the pitch)
// sustain: true = tone holds while the key is down (needs a synth tail under the one-shot sample)
const FAM_META=[
  {bend:0,sustain:false}, // piano
  {bend:0,sustain:false}, // mallet (chromatic percussion)
  {bend:0,sustain:true},  // organ
  {bend:2,sustain:false}, // guitar
  {bend:2,sustain:false}, // bass
  {bend:2,sustain:true},  // strings (bowed)
  {bend:1,sustain:true},  // ensemble / choir
  {bend:2,sustain:true},  // brass
  {bend:2,sustain:true},  // reed
  {bend:2,sustain:true},  // pipe (flutes)
  {bend:2,sustain:true},  // synth lead
  {bend:1,sustain:true},  // synth pad
  {bend:1,sustain:true},  // synth fx
  {bend:2,sustain:false}, // world (mostly plucked)
  {bend:0,sustain:false}, // percussive
  {bend:0,sustain:false}, // sound effects
];
const META_OVERRIDE={
  harmonica:{bend:2,sustain:true},          // in the organ family, but a blues harp bends and holds
  orchestral_harp:{bend:0,sustain:false},   // in strings, but plucked → decays, no bend
  pizzicato_strings:{bend:0,sustain:false},
  tremolo_strings:{bend:1,sustain:true},
  timpani:{bend:0,sustain:false},
  orchestra_hit:{bend:0,sustain:false},     // one-shot stab
  guitar_harmonics:{bend:2,sustain:false},
  sitar:{bend:4,sustain:false},             // deep signature bends, plucked
  shakuhachi:{bend:3,sustain:true},
  bagpipe:{bend:1,sustain:true},            // world, but sustained
  fiddle:{bend:2,sustain:true},
  shanai:{bend:2,sustain:true},
};
export function instrMeta(slug){ const fi=familyOf(slug);
  return Object.assign({}, fi<0?{bend:2,sustain:false}:FAM_META[fi], META_OVERRIDE[slug]||{}); }

// ---- sound banks ----
export const BANKS=[{id:'fluid',name:'FluidR3'},{id:'gu',name:'GeneralUser GS'}];
let bank='fluid';                                    // active bank; chosen per style by app.js (leadBankMap)
export function currentBank(){ return bank; }
export function setBank(id){ if(id!==bank && BANKS.some(b=>b.id===id)){ bank=id; current=null; } }

const FLAT=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];   // gleitz keys use flats (Bb, not A#)
function midiName(m){ return FLAT[((m%12)+12)%12]+(Math.floor(m/12)-1); }
function b64ToU8(b64){ const bin=atob(b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i); return u8; }

const cache={};             // (bank+'/'+slug) → { map:Map<midi,{buf,base}>, done, promise }
let current=null;           // the ready instrument's note→sample map

export function samplerReady(){ return !!current; }
export function sampleAt(midi){ if(!current) return null;
  if(current.has(midi)) return current.get(midi);
  let best=null,bd=1e9; for(const [k,v] of current){ const d=Math.abs(k-midi); if(d<bd){bd=d;best=v;} }   // nearest note; rate covers the gap
  return best; }
export function sampleRange(){ if(!current||!current.size) return null;
  let lo=999,hi=-1; for(const k of current.keys()){ if(k<lo)lo=k; if(k>hi)hi=k; } return {lo,hi}; }

// FluidR3: one mp3 per note → base = that note
async function loadFluid(slug,lo,hi,entry){
  const txt=await fetch(FLUID+slug+'-mp3.js').then(r=>{ if(!r.ok) throw new Error('fluid '+r.status); return r.text(); });
  (0,eval)(txt);                                       // window.MIDI.Soundfont[slug] = { "C4":"data:audio/mp3;base64,…" }
  const sf=window.MIDI && window.MIDI.Soundfont && window.MIDI.Soundfont[slug];
  if(!sf) throw new Error('fluid parse '+slug);
  const jobs=[];
  for(let m=lo;m<=hi;m++){ const uri=sf[midiName(m)]; if(!uri) continue;
    jobs.push(actx.decodeAudioData(b64ToU8(uri.split(',')[1]).buffer).then(buf=>entry.map.set(m,{buf,base:m})).catch(()=>{}));
  }
  await Promise.all(jobs);
  if(!entry.map.size) throw new Error('fluid empty '+slug);
}
// autocorrelation pitch of a decoded sample → MIDI (float), or null if it isn't clearly pitched.
// The GeneralUser GS pack has unreliable tuning metadata (dropped pitch-correction on some instruments,
// per-zone fineTune on others) — measuring the sample's real pitch fixes both.
function detectMidi(buf){
  const sr=buf.sampleRate, d=buf.getChannelData(0);
  const maxLag=Math.floor(sr/55), minLag=Math.floor(sr/1600);   // 55 Hz … 1600 Hz
  let N=8192, off=Math.floor(sr*0.06);
  if(off+N+maxLag>=d.length){ off=0; N=d.length-maxLag-1; }
  if(N<1024) return null;
  let norm=0; for(let i=0;i<N;i++) norm+=d[off+i]*d[off+i];
  if(norm<1e-4) return null;                                   // silence
  let best=0,bestLag=-1;
  for(let lag=minLag;lag<=maxLag;lag++){ let s=0; for(let i=0;i<N;i++) s+=d[off+i]*d[off+i+lag]; if(s>best){best=s;bestLag=lag;} }
  if(bestLag<1 || best/norm<0.55) return null;                 // not clearly pitched (percussion/fx/pads) → trust metadata
  return 69+12*Math.log2((sr/bestLag)/440);
}
// GeneralUser GS (webaudiofont): a few zones, each with a root pitch + key range → map every note to its zone
async function loadWAF(slug,lo,hi,entry){
  const prog=GM.indexOf(slug); if(prog<0) throw new Error('no prog '+slug);
  const fn=String(prog).padStart(3,'0')+'0_GeneralUserGS_sf2_file';
  const txt=await fetchWaf(fn);
  (0,eval)(txt);
  const tone=window['_tone_'+fn], zones=tone&&tone.zones;
  if(!zones || !zones.length) throw new Error('waf empty '+slug);
  const bufs=await Promise.all(zones.map(z=>{ const b64=z.file||z.sample; if(!b64) return Promise.resolve(null);
    return actx.decodeAudioData(b64ToU8(b64).buffer).then(b=>b).catch(()=>null); }));
  // true root per zone: metadata (originalPitch + coarse/fine), overridden by the measured pitch when the sample is
  // clearly pitched and within a semitone of the metadata (fixes GU's mistuned sitar/fiddle/etc; safe on drums/pads)
  const metaRoot=z=>((z.originalPitch!=null?z.originalPitch:6000) - 100*(z.coarseTune||0) - (z.fineTune||0))/100;
  const roots=zones.map((z,i)=>{ const meta=metaRoot(z), b=bufs[i]; if(!b) return meta;
    const det=detectMidi(b); return (det!=null && Math.abs(det-meta)<=1.2) ? det : meta; });
  for(let m=lo;m<=hi;m++){
    let zi=zones.findIndex(z=>m>=(z.keyRangeLow!=null?z.keyRangeLow:0) && m<=(z.keyRangeHigh!=null?z.keyRangeHigh:127));
    if(zi<0){ let bd=1e9; for(let i=0;i<zones.length;i++){ const d=Math.abs(roots[i]-m); if(d<bd){bd=d;zi=i;} } }
    const buf=bufs[zi]; if(buf) entry.map.set(m,{buf,base:roots[zi]});
  }
  if(!entry.map.size) throw new Error('waf nomap '+slug);
}
// load an instrument by slug for the active bank; GU falling back to FluidR3 if a program is missing there
export async function loadSampler(slug, lo=36, hi=88){
  const key=bank+'/'+slug;
  if(cache[key] && cache[key].done){ current=cache[key].map; return true; }
  if(cache[key] && cache[key].promise){ try{ await cache[key].promise; }catch(e){} if(cache[key].done) current=cache[key].map; return true; }
  const entry={map:new Map(), done:false, bank}; cache[key]=entry;
  entry.promise=(bank==='gu'?loadWAF(slug,lo,hi,entry):loadFluid(slug,lo,hi,entry))
    .catch(async e=>{ if(entry.bank==='gu'){ await loadFluid(slug,lo,hi,entry); return; } throw e; })  // GU gap → FluidR3
    .then(()=>{ entry.done=true; });
  await entry.promise; if(entry.done) current=entry.map; return true;
}
