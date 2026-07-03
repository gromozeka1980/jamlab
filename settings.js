// User settings + persistence. No dependencies.
// note range is fixed: A2 (110 Hz — still audible on phone speakers) … G6 (bright but not piercing)
export const settings = { rootMidi:57, bpm:85, tone:2600, variant:'minor', backing:'major',
                          harmony:'major', rhythm:'shuffle', jazzColor:'calm', jazzLand:'line', jazzPhrase:'bebop', jazzTiming:'free',
                          volSolo:0.8, volAcc:0.55, bgDrums:1, bgBass:1, bgChord:1, minMidi:45, maxMidi:91, viz:true, gyro:'off' };

// only mode-independent user preferences (variant/backing/harmony/rhythm/bpm are reset per mode)
const PERSIST_KEYS=['tone','volSolo','volAcc','bgDrums','bgBass','bgChord','viz','gyro','jazzColor','jazzLand','jazzPhrase','jazzTiming'];
function loadSettings(){ try{ const raw=localStorage.getItem('jamlab.settings'); if(!raw) return;
  const s=JSON.parse(raw); PERSIST_KEYS.forEach(k=>{ if(s[k]!=null) settings[k]=s[k]; });
  if(settings.jazzPhrase==='plain') settings.jazzPhrase='free';
  if(settings.jazzTiming==='pocket') settings.jazzTiming='8'; }catch(e){} }   // migrate old values
export function saveSettings(){ try{ const o={}; PERSIST_KEYS.forEach(k=>o[k]=settings[k]); localStorage.setItem('jamlab.settings',JSON.stringify(o)); }catch(e){} }
loadSettings();
