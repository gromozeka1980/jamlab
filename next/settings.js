// User settings + persistence. No dependencies.
// note range is fixed: A1 … A6 (checked by ear on a phone speaker)
export const settings = { rootMidi:57, bpm:85, tone:2600, variant:'minor', backing:'major',
                          harmony:'major', rhythm:'shuffle', jazzColor:'hot', jazzLand:'line', jazzPhrase:'bebop', jazzTiming:'free',
                          volSolo:0.8, volAcc:1, bgDrums:0.55, bgBass:0.55, bgChord:0.55, minMidi:33, maxMidi:93, viz:true, gyro:'off' };

// only mode-independent user preferences (variant/backing/harmony/rhythm/bpm are reset per mode)
const PERSIST_KEYS=['tone','volSolo','volAcc','bgDrums','bgBass','bgChord','viz','gyro','jazzColor','jazzLand','jazzPhrase','jazzTiming'];
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
  }catch(e){} }
export function saveSettings(){ try{ const o={}; PERSIST_KEYS.forEach(k=>o[k]=settings[k]); localStorage.setItem('jamlab.settings',JSON.stringify(o)); }catch(e){} }
loadSettings();
