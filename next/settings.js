// User settings + persistence. No dependencies.
// note range is fixed: A1 … A6 (checked by ear on a phone speaker)
export const settings = { rootMidi:57, bpm:85, tone:1503, variant:'minor', backing:'major',
                          harmony:'major', rhythm:'shuffle', jazzColor:'hot', jazzLand:'line', jazzPhrase:'bebop', jazzTiming:'free',
                          volSolo:0.34, volAcc:1, bgDrums:0.87, bgBass:0.34, bgChord:0.28, minMidi:33, maxMidi:93, viz:true, gyro:'off', haptics:false };

// only mode-independent user preferences (variant/backing/harmony/rhythm/bpm are reset per mode)
const PERSIST_KEYS=['tone','volSolo','volAcc','bgDrums','bgBass','bgChord','viz','gyro','haptics','jazzColor','jazzLand','jazzPhrase','jazzTiming'];
function loadSettings(){ try{ const raw=localStorage.getItem('jamlab.settings');
  if(raw){ const s=JSON.parse(raw); PERSIST_KEYS.forEach(k=>{ if(s[k]!=null) settings[k]=s[k]; });
    if(settings.jazzPhrase==='plain') settings.jazzPhrase='free';
    if(settings.jazzTiming==='pocket') settings.jazzTiming='8'; }              // migrate old values
  // one-time: apply the curated jazz defaults (edgier · lead the line · bebop · timing off) over early testers' saved values
  if(localStorage.getItem('jamlab.jazzDefV')!=='1'){ settings.jazzColor='hot'; settings.jazzLand='line'; settings.jazzPhrase='bebop'; settings.jazzTiming='free';
    localStorage.setItem('jamlab.jazzDefV','1'); }
  // "Backing volume" master removed: fold it into the three components once, so old mixes sound the same
  if(localStorage.getItem('jamlab.volMigV')!=='1'){ const m=settings.volAcc;
    settings.bgDrums*=m; settings.bgBass*=m; settings.bgChord*=m; settings.volAcc=1;
    localStorage.setItem('jamlab.volMigV','1'); }
  // one-time: apply the calibrated mix defaults (2026-07-21) over earlier saved values, then persist
  if(localStorage.getItem('jamlab.mixDefV')!=='1'){ settings.volSolo=0.34; settings.bgDrums=0.87; settings.bgBass=0.34; settings.bgChord=0.28; settings.tone=1503;
    localStorage.setItem('jamlab.mixDefV','1'); saveSettings(); }
  }catch(e){} }
export function saveSettings(){ try{ const o={}; PERSIST_KEYS.forEach(k=>o[k]=settings[k]); localStorage.setItem('jamlab.settings',JSON.stringify(o)); }catch(e){} }
loadSettings();
