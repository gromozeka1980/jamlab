// Jamlab engine — audio, instruments, visualizer, recording, UI wiring.
// Runs as an ES module (own scope, strict mode — the old IIFE wrapper is gone).
import { I18N } from './i18n.js';

// true inside the native Capacitor app (vs the plain web build)
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const TOUCH = NATIVE || (window.matchMedia && matchMedia('(pointer:coarse)').matches);
if(TOUCH) document.body.classList.add('touch');   // hide keyboard hints/labels on touch

/* ============ I18N ============ */
// I18N dictionaries live in i18n.js
let LANG = (()=>{ try{ const s=localStorage.getItem('jamlab.lang'); if(s==='en'||s==='ru') return s; }catch(e){}
  return ((navigator.language||'en').toLowerCase().indexOf('ru')===0) ? 'ru' : 'en'; })();   // first run: follow the device language
function t(k,vars){
  let s = (I18N[LANG] && I18N[LANG][k]!=null) ? I18N[LANG][k] : (I18N.en[k]!=null ? I18N.en[k] : k);
  if(vars) for(const p in vars) s = s.split('{'+p+'}').join(vars[p]);
  return s;
}
function degName(pc){ return t('deg.'+pc); }

/* ============ MODE CONFIG ============ */
const MODES = {
  blues: {
    id:'blues', name:'mode.blues.name', sub:'mode.blues.sub', voice:'saw', back:'blues',
    theme:{bg1:'#18324f', accent:'#ffd43b', zero:'#2f9e44', neg:'#3b5bdb', pos:'#e8590c', blue:'#4dd0e1'},
    kind:'scale',
    scales:{minor:[0,3,5,6,7,10], major:[0,2,3,4,7,9]},
    variants:[{id:'minor',label:'variant.blues.minor'},{id:'major',label:'variant.blues.major'}], defVariant:'minor',
    backings:[{id:'shuffle',label:'backing.shuffle'},{id:'minor',label:'backing.minor'},{id:'rock',label:'backing.rock'},{id:'slow',label:'backing.slow'},{id:'country',label:'backing.country'},{id:'funk',label:'backing.funk'},{id:'rhumba',label:'backing.rhumba'},{id:'honky',label:'backing.honky'}], defBacking:'shuffle',
  },
  jazz: {
    id:'jazz', name:'mode.jazz.name', sub:'mode.jazz.sub', voice:'pluck', back:'jazz', defBpm:132,
    theme:{bg1:'#1a1a2e', accent:'#e0b974', zero:'#c44569', neg:'#5b6ee1', pos:'#d98c3a', blue:'#5ad1c8'},
    kind:'scale', variants:[],
    backings:[{id:'swing',label:'backing.swing'}], defBacking:'swing',
  },
  gamelan: {
    id:'gamelan', name:'mode.gamelan.name', sub:'mode.gamelan.sub', voice:'metal', back:'gamelan',
    theme:{bg1:'#3a2e10', accent:'#ffd43b', zero:'#e8a23a', neg:'#c98a2a', pos:'#e8c14a', blue:'#7fd1ff'},
    kind:'scale', scales:{pelog:[0,1,3,7,8], slendro:[0,2,5,7,10]},
    variants:[{id:'pelog',label:'variant.pelog'},{id:'slendro',label:'variant.slendro'}], defVariant:'pelog',
    backings:[{id:'gong',label:'backing.gong'},{id:'pattern',label:'backing.pattern'}], defBacking:'gong',
  },
  dream: {
    id:'dream', name:'mode.dream.name', sub:'mode.dream.sub', voice:'pad', back:'dream',
    theme:{bg1:'#243a66', accent:'#a5d8ff', zero:'#74c0fc', neg:'#748ffc', pos:'#b197fc', blue:'#99e9f2'},
    kind:'scale', scales:{whole:[0,2,4,6,8,10]}, variants:[], defVariant:'whole',
    backings:[{id:'drone',label:'backing.drone'},{id:'shimmer',label:'backing.shimmer'}], defBacking:'drone',
  },
  koto: {
    id:'koto', name:'mode.koto.name', sub:'mode.koto.sub', voice:'pluck', back:'koto', perc:'taiko',
    theme:{bg1:'#2a2150', accent:'#ffcf6b', zero:'#e23b3b', neg:'#4263eb', pos:'#e8590c', blue:'#4dd0e1'},
    kind:'scale',
    scales:{hira:[0,2,3,7,8], kumoi:[0,2,3,7,9], insen:[0,1,5,7,10], iwato:[0,1,5,6,10]},
    variants:[{id:'hira',label:'variant.hira'},{id:'kumoi',label:'variant.kumoi'},{id:'insen',label:'variant.insen'},{id:'iwato',label:'variant.iwato'}], defVariant:'hira',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'arp',label:'backing.arp',arp:1},{id:'both',label:'backing.both',pad:1,arp:1},{id:'padperc',label:'backing.koto.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.koto.arpperc',arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  vostok: {
    id:'vostok', name:'mode.vostok.name', sub:'mode.vostok.sub', voice:'pluck', back:'koto', perc:'darbuka', vamp:[0,1],
    theme:{bg1:'#3a2417', accent:'#e8b04b', zero:'#d6453b', neg:'#b5651d', pos:'#e8930c', blue:'#e8b04b'},
    kind:'scale',
    scales:{freygish:[0,1,4,5,7,8,10], hungarian:[0,2,3,6,7,8,11]},
    variants:[{id:'freygish',label:'variant.freygish'},{id:'hungarian',label:'variant.hungarian'}], defVariant:'freygish',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'padperc',label:'backing.vostok.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.vostok.arpperc',arp:1,perc:1,bass:1},{id:'vamp',label:'backing.vostok.vamp',vamp:1,arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  light: {
    id:'light', name:'mode.light.name', sub:'mode.light.sub', voice:'pluck', back:'koto', perc:'shaker',
    theme:{bg1:'#13405a', accent:'#ffe08a', zero:'#37b24d', neg:'#4dabf7', pos:'#ffa94d', blue:'#66d9e8'},
    kind:'scale',
    scales:{major:[0,2,4,7,9], minor:[0,3,5,7,10]},
    variants:[{id:'major',label:'variant.light.major'},{id:'minor',label:'variant.light.minor'}], defVariant:'major',
    backings:[{id:'drone',label:'backing.drone',pad:1},{id:'arp',label:'backing.arp',arp:1},{id:'padperc',label:'backing.light.padperc',pad:1,perc:1,bass:1},{id:'arpperc',label:'backing.light.arpperc',arp:1,perc:1,bass:1}], defBacking:'arpperc',
  },
  dorian: {
    id:'dorian', name:'mode.dorian.name', sub:'mode.dorian.sub', voice:'saw', back:'koto',
    theme:{bg1:'#13392b', accent:'#a9e34b', zero:'#37b24d', neg:'#3bc9db', pos:'#82c91e', blue:'#3bc9db'},
    kind:'scale',
    scales:{dorian:[0,2,3,5,7,9,10], aeolian:[0,2,3,5,7,8,10]},
    variants:[{id:'dorian',label:'variant.dorian'},{id:'aeolian',label:'variant.aeolian'}], defVariant:'dorian',
    backings:[{id:'drone',label:'backing.drone',pad:1}], defBacking:'drone',
  },
  cosmos: {
    id:'cosmos', name:'mode.cosmos.name', sub:'mode.cosmos.sub', voice:'pad', back:'flute',
    theme:{bg1:'#241a44', accent:'#b197fc', zero:'#9775fa', neg:'#5c7cfa', pos:'#da77f2', blue:'#66d9e8'},
    kind:'scale',
    scales:{lydian:[0,2,4,6,7,9,11], mixo:[0,2,4,5,7,9,10]},
    variants:[{id:'lydian',label:'variant.lydian'},{id:'mixo',label:'variant.mixo'}], defVariant:'lydian',
    backings:[{id:'drone',label:'backing.drone'}], defBacking:'drone',
  },
  flute: {
    id:'flute', name:'mode.flute.name', sub:'mode.flute.sub', voice:'flute', back:'flute',
    theme:{bg1:'#10302e', accent:'#9be7c4', zero:'#2f9e9e', neg:'#3b8bdb', pos:'#d6a24a', blue:'#7fd1ff'},
    kind:'harmonic', base:4,                 // index 0 -> 4th harmonic
    variants:[],
    backings:[{id:'drone',label:'backing.drone'}], defBacking:'drone',
  },
};
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

let M = MODES.blues;
let SCALE = MODES.blues.scales.minor;
const settings = { rootMidi:57, bpm:85, tone:2600, variant:'minor', backing:'major',
                   harmony:'major', rhythm:'shuffle', jazzColor:'calm', jazzLand:'line', jazzPhrase:'bebop', jazzTiming:'free',
                   volSolo:0.8, volAcc:0.55, bgDrums:1, bgBass:1, bgChord:1, minMidi:33, maxMidi:93, viz:true, gyro:'off' };
let gyroV=0;                                       // current tilt value (0..1)
let currentIndex = 0;

/* ============ Settings persistence ============ */
// only mode-independent user preferences (variant/backing/harmony/rhythm/bpm are reset per mode)
const PERSIST_KEYS=['tone','volSolo','volAcc','bgDrums','bgBass','bgChord','minMidi','maxMidi','viz','gyro','jazzColor','jazzLand','jazzPhrase','jazzTiming'];
function loadSettings(){ try{ const raw=localStorage.getItem('jamlab.settings'); if(!raw) return;
  const s=JSON.parse(raw); PERSIST_KEYS.forEach(k=>{ if(s[k]!=null) settings[k]=s[k]; });
  if(settings.jazzPhrase==='plain') settings.jazzPhrase='free';
  if(settings.jazzTiming==='pocket') settings.jazzTiming='8'; }catch(e){} }   // migrate old values
function saveSettings(){ try{ const o={}; PERSIST_KEYS.forEach(k=>o[k]=settings[k]); localStorage.setItem('jamlab.settings',JSON.stringify(o)); }catch(e){} }
loadSettings();

/* ============ Web Audio ============ */
let actx=null, master=null, comp=null, leadBus=null, leadFilter=null, shaper=null,
    leadOut=null, accBus=null, busPerc=null, busBass=null, busChord=null, reverb=null, noiseBuf=null, recDest=null, anl=null;
const activeVoices = new Map();
let kbBend=0;

function initAudio(){
  if (actx) return;
  const AC=window.AudioContext||window.webkitAudioContext;
  try{ actx=new AC({latencyHint:'balanced'}); }catch(e){ actx=new AC(); }   // bigger audio buffer → fewer underruns (anti-crackle)
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
  unlockAudio();
}
function resumeAudio(){ if(actx && actx.state==="suspended") actx.resume(); if(silentEl) silentEl.play().catch(()=>{}); }
function makeImpulse(sec,decay){ const rate=actx.sampleRate,n=rate*sec,b=actx.createBuffer(2,n,rate);
  for(let ch=0;ch<2;ch++){const d=b.getChannelData(ch); for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/n,decay);} return b; }
function makeDriveCurve(k){ const n=1024,c=new Float32Array(n); for(let i=0;i<n;i++){const x=i/(n-1)*2-1; c[i]=(1+k)*x/(1+k*Math.abs(x));} return c; }

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

/* ============ Visualizer ============ */
function hexToRgb(h){ h=(h||'').trim().replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h||'888888',16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function cssRgb(v){ return hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(v)); }
const viz=(()=>{
  const cv=document.getElementById('viz'), ctx=cv.getContext('2d'); let W=1,H=1,dpr=1;
  // recording renders on its own high-res canvas (~1080p portrait), independent of screen dpr
  const rec=document.createElement('canvas'), rctx=rec.getContext('2d'); let recording=false;
  let cssW=1,cssH=1,RS=1,RW=2,RH=2;
  const even=n=>Math.max(2,2*Math.round(n/2));
  function size(){ dpr=Math.min(1.5,window.devicePixelRatio||1); cssW=Math.max(1,innerWidth); cssH=Math.max(1,innerHeight);
    const w=Math.round(cssW*dpr), h=Math.round(cssH*dpr);
    if(w!==W||h!==H){ cv.width=W=w; cv.height=H=h; }
    if(!recording){ RS=Math.min(1.6,Math.max(1,1280/cssH));                 // don't resize mid-recording — encoders glitch
      const rw=even(cssW*RS), rh=even(cssH*RS);
      if(rec.width!==rw||rec.height!==rh){ rec.width=rw; rec.height=rh; } RW=rec.width; RH=rec.height; } }
  size(); addEventListener('resize',size);
  const P=[]; let beat=0;                                        // particles live in CSS px; scaled per-canvas at draw time
  function note(x,y,rgb){ if(P.length>70) return; P.push({x,y,r:8,vr:3.0,vy:-0.6,life:1,dl:0.018,rgb,ring:1}); }
  function spark(x,y,rgb){ if(P.length>100) return; P.push({x:x+(Math.random()*16-8),y,r:2.5,vr:0.4,vy:-2.6,life:1,dl:0.03,rgb,ring:0}); }
  function pulse(s){ if(s>beat) beat=s; }
  // melody ribbon: recent notes become a glowing scrolling polyline (the logo motif)
  const MEL=[]; let lastNoteAt=-1e9;
  function melody(p01){ const now=performance.now(); lastNoteAt=now;
    MEL.push({t:now,p:p01,hue:205-160*p01}); if(MEL.length>80) MEL.shift(); }
  function drawParticles(c,s){ c.globalCompositeOperation='lighter';
    for(let i=0;i<P.length;i++){ const p=P[i], al=(p.life*(p.ring?0.5:0.85)).toFixed(3), col='rgba('+p.rgb[0]+','+p.rgb[1]+','+p.rgb[2]+','+al+')';
      c.beginPath(); c.arc(p.x*s,p.y*s,p.r*s,0,6.2832);
      if(p.ring){ c.strokeStyle=col; c.lineWidth=2.5*s; c.stroke(); } else { c.fillStyle=col; c.fill(); } }
    c.globalCompositeOperation='source-over'; }
  function drawLive(){ ctx.clearRect(0,0,W,H);
    if(beat>0.02){ const g=ctx.createRadialGradient(W/2,H*1.05,0,W/2,H*1.05,H*0.9);
      g.addColorStop(0,'rgba(255,255,255,'+(beat*0.05).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
    drawParticles(ctx,dpr); }
  const fd=new Uint8Array(128);
  function drawRec(){ const c=rctx, s=RS, now=performance.now();
    // background gradient + vignette
    const bg1=cssRgb('--bg1'), bg0=cssRgb('--bg'), g=c.createLinearGradient(0,0,0,RH);
    g.addColorStop(0,'rgb('+bg1[0]+','+bg1[1]+','+bg1[2]+')'); g.addColorStop(1,'rgb('+bg0[0]+','+bg0[1]+','+bg0[2]+')');
    c.fillStyle=g; c.fillRect(0,0,RW,RH);
    const vg=c.createRadialGradient(RW/2,RH*0.42,RH*0.18,RW/2,RH*0.5,RH*0.78);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.30)'); c.fillStyle=vg; c.fillRect(0,0,RW,RH);
    if(beat>0.02){ const bp=c.createRadialGradient(RW/2,RH*1.05,0,RW/2,RH*1.05,RH*0.9);
      bp.addColorStop(0,'rgba(255,255,255,'+(beat*0.09).toFixed(3)+')'); bp.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=bp; c.fillRect(0,0,RW,RH); }
    c.globalCompositeOperation='lighter';
    // melody ribbon — scrolls right→left over ~7s
    const WIN=7000, xR=RW*0.88, span=RW*0.76, yTop=RH*0.50, yBot=RH*0.74, pts=[];
    for(let i=0;i<MEL.length;i++){ const m=MEL[i], ag=(now-m.t)/WIN; if(ag>1) continue;
      pts.push({x:xR-ag*span, y:yBot-(yBot-yTop)*m.p, hue:m.hue, al:1-ag}); }
    c.lineCap='round'; c.lineJoin='round';
    for(let i=1;i<pts.length;i++){ const q=pts[i-1], p=pts[i], al=Math.min(q.al,p.al);
      c.strokeStyle='hsla('+p.hue+',90%,62%,'+(al*0.20).toFixed(3)+')'; c.lineWidth=9*s;   // halo pass
      c.beginPath(); c.moveTo(q.x,q.y); c.lineTo(p.x,p.y); c.stroke();
      c.strokeStyle='hsla('+p.hue+',90%,68%,'+(al*0.75).toFixed(3)+')'; c.lineWidth=2.6*s; // core pass
      c.beginPath(); c.moveTo(q.x,q.y); c.lineTo(p.x,p.y); c.stroke(); }
    for(let i=0;i<pts.length;i++){ const p=pts[i];
      c.fillStyle='hsla('+p.hue+',90%,66%,'+(p.al*0.28).toFixed(3)+')';
      c.beginPath(); c.arc(p.x,p.y,8*s,0,6.2832); c.fill();
      c.fillStyle='hsla('+p.hue+',95%,74%,'+(p.al*0.95).toFixed(3)+')';
      c.beginPath(); c.arc(p.x,p.y,3.4*s,0,6.2832); c.fill(); }
    // touch splashes from the keys
    drawParticles(c,s); c.globalCompositeOperation='lighter';
    // audio-reactive ring around the note
    const cx=RW/2, cy=RH*0.30, R0=Math.min(RW,RH)*0.21;
    if(anl){ anl.getByteFrequencyData(fd);
      let lvl=0; for(let i=2;i<90;i++) lvl+=fd[i]; lvl/=(88*255);
      const glow=c.createRadialGradient(cx,cy,0,cx,cy,R0*2.1);
      glow.addColorStop(0,'rgba(255,212,59,'+(0.08+lvl*0.22).toFixed(3)+')'); glow.addColorStop(1,'rgba(255,212,59,0)');
      c.fillStyle=glow; c.beginPath(); c.arc(cx,cy,R0*2.1,0,6.2832); c.fill();
      const N=56, rot=now*0.00012; c.lineCap='round';
      for(let i=0;i<N;i++){ const ang=rot+i/N*6.2832, half=(i%(N/2))/(N/2);   // mirrored spectrum looks fuller
        const v=fd[2+Math.floor(Math.pow(half,1.5)*86)]/255, L=R0*(0.10+Math.pow(v,1.35)*(0.72+beat*0.5));
        c.strokeStyle='hsla('+(120+95*Math.sin(ang*2+now*0.0004)).toFixed(0)+',85%,62%,0.7)'; c.lineWidth=3.2*s;
        c.beginPath(); c.moveTo(cx+Math.cos(ang)*R0,cy+Math.sin(ang)*R0);
        c.lineTo(cx+Math.cos(ang)*(R0+L),cy+Math.sin(ang)*(R0+L)); c.stroke(); } }
    c.globalCompositeOperation='source-over';
    // note name with a pop on each hit
    const pop=1+0.22*Math.exp(-(now-lastNoteAt)/160);
    c.save(); c.translate(cx,cy); c.scale(pop,pop); c.textAlign='center'; c.textBaseline='middle';
    c.fillStyle='rgba(255,255,255,0.95)'; c.font='800 '+Math.round(40*s)+'px system-ui,sans-serif';
    c.fillText(document.getElementById('noteName').textContent||'',0,0); c.restore();
    // titles
    const acc=cssRgb('--accent'); c.textAlign='center'; c.textBaseline='alphabetic';
    c.fillStyle='rgba('+acc[0]+','+acc[1]+','+acc[2]+',0.92)'; c.font='600 '+Math.round(17*s)+'px system-ui,sans-serif';
    c.fillText(document.getElementById('h1name').textContent||'', RW/2, 30*s);
    c.fillStyle='rgba(230,232,245,0.55)'; c.font='400 '+Math.round(11*s)+'px system-ui,sans-serif';
    c.fillText((document.getElementById('h1sub').textContent||'').replace(/^·\s*/,''), RW/2, 48*s);
    // watermark: note logo + wordmark
    c.globalAlpha=0.78; c.font='700 '+Math.round(16*s)+'px system-ui,sans-serif'; c.textAlign='left'; c.textBaseline='middle';
    const wmTxt='Jamlab', tw=c.measureText(wmTxt).width, k=1.15*s, lw=13*k, gap=8*s, x0=(RW-(lw+gap+tw))/2, wmY=RH-24*s;
    const hx=x0+4.5*k, hy=wmY, stx=hx+4.3*k;
    const lg=c.createLinearGradient(stx,hy,stx+4*k,hy-16*k);
    lg.addColorStop(0,'#4dd0e1'); lg.addColorStop(0.6,'#69db7c'); lg.addColorStop(1,'#ffd43b');
    c.strokeStyle=lg; c.lineWidth=2.6*s; c.lineCap='round';
    c.beginPath(); c.moveTo(stx, hy-1*k); c.lineTo(stx, hy-15*k); c.stroke();
    c.beginPath(); c.moveTo(stx, hy-15*k); c.bezierCurveTo(stx+5.5*k, hy-13.2*k, stx+7*k, hy-9*k, stx+5.5*k, hy-4.5*k); c.stroke();
    c.fillStyle='#ffd43b'; c.beginPath(); c.ellipse(hx, hy, 5.2*k, 4*k, -0.35, 0, 6.2832); c.fill();
    c.fillStyle='#fff3bf'; c.globalAlpha=0.5; c.beginPath(); c.ellipse(hx-1.6*k, hy-1.4*k, 1.5*k, 1*k, -0.35, 0, 6.2832); c.fill();
    c.globalAlpha=0.78; c.fillStyle='#eceaf3'; c.fillText(wmTxt, x0+lw+gap, wmY-6*s);
    c.globalAlpha=1;
  }
  function frame(){ size();
    for(let i=P.length-1;i>=0;i--){ const p=P[i]; p.r+=p.vr; p.y+=p.vy; p.vy*=0.985; p.life-=p.dl; if(p.life<=0) P.splice(i,1); }
    drawLive();
    if(recording) drawRec();
    beat*=0.88;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {note,spark,pulse,melody, recCanvas:rec, startRec(){recording=true;}, stopRec(){recording=false;}};
})();
function vizBeat(time,s){ if(settings.viz && actx) setTimeout(()=>viz.pulse(s), Math.max(0,(time-actx.currentTime)*1000)); }

/* ============ Gyroscope (phone tilt) ============ */
function applyGyro(x){
  if(settings.gyro==='volume'){ if(leadOut) leadOut.gain.value=0.12+x*0.9; }
  else if(settings.gyro==='tone'){ if(leadFilter) leadFilter.frequency.value=500+x*5500; }
  else if(settings.gyro==='vibrato'){ for(const v of activeVoices.values()) if(v.vibG) v.vibG.gain.value=(v.vibBase||4)+x*18; }
}
function resetGyroParams(){ if(leadOut) leadOut.gain.value=settings.volSolo; if(leadFilter) leadFilter.frequency.value=settings.tone;
  for(const v of activeVoices.values()) if(v.vibG) v.vibG.gain.value=v.vibBase; }
function onTilt(e){ if(settings.gyro==='off') return; const b=e.beta; if(b==null) return;
  gyroV=Math.max(0,Math.min(1,(b-15)/55)); applyGyro(gyroV); }
let gyroOn=false;
function enableGyro(){ if(gyroOn) return;
  const add=()=>{ window.addEventListener('deviceorientation',onTilt); gyroOn=true; };
  if(typeof DeviceOrientationEvent!=='undefined' && DeviceOrientationEvent.requestPermission)
    DeviceOrientationEvent.requestPermission().then(p=>{ if(p==='granted') add(); }).catch(()=>{});
  else add();
}

/* ============ Pitch (depends on mode) ============ */
function midiToFreq(m){ return 440*Math.pow(2,(m-69)/12); }
function freqToMidi(f){ return 69+12*Math.log2(f/440); }
function midiToName(m){ m=Math.round(m); return NOTE_NAMES[((m%12)+12)%12]+(Math.floor(m/12)-1); }
let jazzRoot=57, jazzLabel="";                     // scale root in jazz (follows the chord) + "chord · scale" label
let curChord=null;                                 // {r:root pc, ivs} of the current chord (for 1/3/5/7 highlight) — jazz/blues
function leadRoot(){ return M.id==='jazz' ? jazzRoot : settings.rootMidi; }
function indexToMidi(i){ const len=SCALE.length,o=Math.floor(i/len),s=((i%len)+len)%len; return leadRoot()+12*o+SCALE[s]; }
function fluteHarmonic(i){ return Math.max(2, M.base+i); }
function f0freq(){ return midiToFreq(settings.rootMidi-24); }      // fundamental two octaves below the root
function pitchFreq(i){ return M.kind==='harmonic' ? f0freq()*fluteHarmonic(i) : midiToFreq(indexToMidi(i)); }
function pitchLabel(i){
  if(M.kind==='harmonic'){ const n=fluteHarmonic(i); return {deg:n, note:midiToName(freqToMidi(pitchFreq(i)))}; }
  const len=SCALE.length, s=((i%len)+len)%len; return {deg:s+1, note:midiToName(indexToMidi(i))};
}

function indexRange(){
  const loF=midiToFreq(Math.min(settings.minMidi,settings.maxMidi)), hiF=midiToFreq(Math.max(settings.minMidi,settings.maxMidi));
  let a=null,b=null;
  for(let i=-64;i<=64;i++){ const f=pitchFreq(i); if(f>=loF-0.01&&f<=hiF+0.01){ if(a===null)a=i; b=i; } }
  if(a===null) a=b=0; return [a,b];
}
function clampIndex(i){ const [a,b]=indexRange(); return Math.max(a,Math.min(b,i)); }
function nearestIndex(targetFreq){
  const [a,b]=indexRange(); const tm=freqToMidi(targetFreq);
  let best=a, bestD=Infinity, bestM=-Infinity;
  for(let i=a;i<=b;i++){ const m=freqToMidi(pitchFreq(i)), d=Math.abs(m-tm);
    if(d<bestD || (d===bestD && m>bestM)){ best=i; bestD=d; bestM=m; } }
  return best;
}

/* ============ Bend targets ============ */
let liveChordPcs=null;
function currentChordPcs(){ if(accOn && liveChordPcs) return liveChordPcs;
  return settings.variant==='major' ? new Set([0,4,7,10]) : new Set([0,3,7,10]); }
function bendTargets(i){
  if(M.kind==='harmonic'){
    const n=fluteHarmonic(i);
    const up={amt:Math.min(2,12*Math.log2((n+1)/n)), name:t('ord',{n:n+1})};
    const down = n-1>=2 ? {amt:Math.min(2,12*Math.log2(n/(n-1))), name:t('ord',{n:n-1})} : null;
    return {up, down};
  }
  const len=SCALE.length, step=((i%len)+len)%len, pc=SCALE[step];
  const chord = M.id==='blues' ? currentChordPcs() : new Set(SCALE);
  let up=null,down=null;
  for(const a of [1,2]){ const tp=(pc+a)%12;    if(chord.has(tp)){ up  ={amt:a,name:degName(tp)}; break; } }
  for(const a of [1,2]){ const tp=(pc-a+12)%12; if(chord.has(tp)){ down={amt:a,name:degName(tp)}; break; } }
  return {up,down};
}

/* ============ Voice (timbre depends on mode) ============ */
function makeVoice(freq,maxUp,maxDown,approach,when){
  const t0=when||actx.currentTime, g=actx.createGain();
  const v={g,baseFreq:freq,dragBend:0,maxUp:maxUp||0,maxDown:maxDown||0,freqNodes:[],stops:[]};
  const vib=actx.createOscillator(), vibG=actx.createGain();
  vib.frequency.value = (M.voice==='flute'?4.5:M.voice==='pad'?4.2:5.0);
  vibG.gain.value = (M.voice==='flute'?7:M.voice==='pad'?4:3.8);
  v.vibG=vibG; v.vibBase=vibG.gain.value;
  if(settings.gyro==='vibrato') vibG.gain.value = v.vibBase + gyroV*18;   // pick up the current tilt
  vib.connect(vibG); vib.start(t0); v.stops.push(vib);
  const addOsc=(type,mult,detune,gain)=>{ const o=actx.createOscillator(); o.type=type; const target=freq*mult;
    if(approach){ o.frequency.setValueAtTime(target*Math.pow(2,approach/12),t0); o.frequency.exponentialRampToValueAtTime(target,t0+0.06); }  // chromatic lead-in
    else o.frequency.value=target;
    if(detune)o.detune.value=detune; vibG.connect(o.detune);
    const og=actx.createGain(); og.gain.value=(gain==null?1:gain); o.connect(og); og.connect(g);
    o.start(t0); v.freqNodes.push({osc:o,mult}); v.stops.push(o); };
  if(M.voice==='saw'){
    addOsc('sawtooth',1,0,1); addOsc('sawtooth',1,8,1);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.30,t0+0.012); g.gain.exponentialRampToValueAtTime(.2,t0+0.3);
  } else if(M.voice==='pluck'){
    addOsc('triangle',1,0,1); addOsc('sine',2,6,0.4);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.42,t0+0.006); g.gain.exponentialRampToValueAtTime(.12,t0+1.4);
  } else if(M.voice==='metal'){         // metallophone/gamelan: inharmonic partials, bright decay
    addOsc('triangle',1,0,1); addOsc('sine',2.01,0,0.5); addOsc('sine',3.0,0,0.25); addOsc('sine',5.4,0,0.12);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.4,t0+0.003); g.gain.exponentialRampToValueAtTime(.08,t0+1.8);
  } else if(M.voice==='pad'){           // soft sine pad (lydian "cosmos")
    addOsc('sine',1,0,1); addOsc('sine',2,0,0.22); addOsc('sine',3,0,0.08);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.30,t0+0.12);
  } else { // flute — sine + overtones + breath
    addOsc('sine',1,0,1); addOsc('sine',2,0,0.16); addOsc('triangle',3,0,0.05);
    const nz=actx.createBufferSource(); nz.buffer=noiseBuf; nz.loop=true;
    const bp=actx.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=freq*2.5; bp.Q.value=5;
    const ng=actx.createGain(); ng.gain.value=0.05; nz.connect(bp); bp.connect(ng); ng.connect(g);
    nz.start(t0); v.stops.push(nz);
    g.gain.setValueAtTime(0,t0); g.gain.linearRampToValueAtTime(.26,t0+0.06);
  }
  g.connect(leadBus);
  if(kbBend>0) applyBend(v);
  return v;
}
function applyBend(v){
  let b=v.dragBend; if(kbBend>0) b=Math.max(b,kbBend);
  const semis=Math.max(-v.maxDown,Math.min(v.maxUp,b)), r=Math.pow(2,semis/12), t0=actx.currentTime;
  for(const fn of v.freqNodes) fn.osc.frequency.setTargetAtTime(v.baseFreq*fn.mult*r,t0,0.025);
}
function stopVoice(id){ const v=activeVoices.get(id); if(!v) return; activeVoices.delete(id);
  const t0=actx.currentTime; v.g.gain.cancelScheduledValues(t0); v.g.gain.setValueAtTime(v.g.gain.value,t0);
  v.g.gain.exponentialRampToValueAtTime(.0008,t0+0.3); for(const n of v.stops){ try{n.stop(t0+0.34);}catch(e){} } }

/* ============ Key press ============ */
// Jazz "bebop" phrasing: snap each step to a chord tone (3/5/7/root incl. guide tones) and lead in chromatically
function jazzChordMidis(){ if(!curChord) return [];
  const set=curChord.ivs.map(iv=>(curChord.r+iv)%12), arr=[];
  for(let m=settings.minMidi;m<=settings.maxMidi;m++){ if(set.includes(((m%12)+12)%12)) arr.push(m); }
  return arr; }
function snapJazz(midi,dir,prev){ const tones=jazzChordMidis(); if(!tones.length) return midi;
  let best=tones[0],bd=Infinity; for(const tn of tones){ const d=Math.abs(tn-midi); if(d<bd){bd=d;best=tn;} }
  if(prev!=null && best===prev && dir!==0){ const i=tones.indexOf(best); best=tones[Math.max(0,Math.min(tones.length-1,i+(dir>0?1:-1)))]; }  // always move on a step
  return best; }
let lastJazzMidi=null, jazzBeatRef=0, jazzBeatLen=0;
// daring levels: which beats snap to a chord tone, and how wide the window — inside (all beats) → outside (beat 1 only)
const DARING={ inside:{beats:[0,1,2,3],win:0.28}, bebop:{beats:[0,2],win:0.22}, outside:{beats:[0],win:0.16} };
function jazzStrongBeat(cfg){ if(!jazzBeatLen||!cfg) return false;     // near an allowed beat (modulo bar, robust to lookahead)
  const bar=4*jazzBeatLen; let d=(actx.currentTime-jazzBeatRef)%bar; if(d<0)d+=bar;
  const p=d/jazzBeatLen, near=Math.round(p)%4;
  return Math.abs(p-Math.round(p))<cfg.win && cfg.beats.includes(near); }
function pocketOffsets(notesPerBeat){ const sw=0.16, sub=notesPerBeat/2, offs=[];   // subdivide each swung eighth evenly → chosen grid
  for(let b=0;b<4;b++){ const e0=b, e1=b+0.5+sw, e2=b+1;
    for(let s=0;s<sub;s++) offs.push(e0+(e1-e0)*s/sub);
    for(let s=0;s<sub;s++) offs.push(e1+(e2-e1)*s/sub); }
  return offs; }
function quantizeToPocket(now,notesPerBeat){ if(!jazzBeatLen) return now;   // snap onset to nearest grid point at the chosen resolution
  const bar=4*jazzBeatLen, offs=pocketOffsets(notesPerBeat), base=jazzBeatRef+Math.floor((now-jazzBeatRef)/bar)*bar;
  let best=now, bd=Infinity;
  for(let k=0;k<=1;k++) for(const o of offs){ const tg=base+k*bar+o*jazzBeatLen; if(tg>=now-0.05){ const s=Math.abs(tg-now); if(s<bd){bd=s;best=tg;} } }
  return Math.max(best,now); }
function glideVoice(v,tf){ v.baseFreq=tf; const t0=actx.currentTime; let b=v.dragBend; if(kbBend>0) b=Math.max(b,kbBend);
  const semis=Math.max(-v.maxDown,Math.min(v.maxUp,b)), r=Math.pow(2,semis/12);
  for(const fn of v.freqNodes) fn.osc.frequency.setTargetAtTime(tf*fn.mult*r,t0,0.09); }   // settle held note to a chord tone
function noteOn(id,offset,el){ initAudio(); resumeAudio(); if(activeVoices.has(id)) return null;
  currentIndex=clampIndex(currentIndex+offset);
  const bt=bendTargets(currentIndex); let freq=pitchFreq(currentIndex), approach=0, playedMidi=null;
  if(M.id==='jazz' && curChord && settings.jazzPhrase!=='free'){
    const dir=offset>0?1:offset<0?-1:0, cfg=DARING[settings.jazzPhrase];
    if(jazzStrongBeat(cfg)){                                  // land on a chord tone, with a chromatic enclosure
      playedMidi=snapJazz(indexToMidi(currentIndex),dir,lastJazzMidi); approach=dir<0?1:-1;
    } else {                                                  // off the beat: let scale tensions / passing tones sing
      playedMidi=indexToMidi(currentIndex);
    }
    lastJazzMidi=playedMidi; freq=midiToFreq(playedMidi);
  } else lastJazzMidi=null;
  const when=(M.id==='jazz' && settings.jazzTiming!=='free' && jazzBeatLen) ? quantizeToPocket(actx.currentTime, (+settings.jazzTiming)/4) : undefined;
  const v=makeVoice(freq, bt.up?bt.up.amt:0, bt.down?bt.down.amt:0, approach, when);
  activeVoices.set(id,v); el.classList.add("active"); el.classList.toggle("nobend", !(bt.up||bt.down));
  if(settings.viz){ const r=el.getBoundingClientRect(); const cv=el.classList.contains('neg')?'--neg':el.classList.contains('pos')?'--pos':'--zero'; viz.note(r.left+r.width/2, r.top+10, cssRgb(cv));
    const mm=freqToMidi(freq), p01=Math.max(0,Math.min(1,(mm-settings.minMidi)/Math.max(1,settings.maxMidi-settings.minMidi))); viz.melody(p01); }
  updateDisplay(); if(playedMidi!=null) elNote.textContent=midiToName(playedMidi); return v; }
function noteOff(id,el){ stopVoice(id); if(el){el.classList.remove("active","bending","bent","nobend","down"); el.style.setProperty("--bend",0); const a=el.querySelector(".arrow"); if(a)a.textContent="↑";} }
function shiftOctave(dir){ if(M.kind==='harmonic'){ settings.rootMidi+=dir*12; currentIndex=clampIndex(currentIndex); } else currentIndex=clampIndex(currentIndex+dir*SCALE.length); updateDisplay(); }
function resetToRoot(){ currentIndex = (M.kind==='harmonic') ? clampIndex(0) : nearestRootIndex(pitchFreq(currentIndex)); updateDisplay(); }

function setVariant(id){ if(M.kind!=='scale'||!M.scales||!M.scales[id]) return;
  const oldF=pitchFreq(currentIndex); SCALE=M.scales[id]; settings.variant=id;
  currentIndex=clampIndex(nearestIndex(oldF));
  [...ladHost.querySelectorAll('button')].forEach(b=>b.classList.toggle('active', b.dataset.v===id));
  buildKeys();
  updateDisplay(); }
function allowedVariants(){ return (M.id==='blues' && HARM_LADS[settings.harmony]) || M.variants.map(v=>v.id); }
function cycleVariant(dir){ const ids=allowedVariants(); if(ids.length<2) return false;
  let i=ids.indexOf(settings.variant); if(i<0)i=0; setVariant(ids[(i+dir+ids.length)%ids.length]); return true; }
function applyLadLock(){            // disable scales that don't fit the harmony; switch away from an incompatible one
  const allow=allowedVariants();
  for(const b of ladHost.querySelectorAll('button')) b.disabled = !allow.includes(b.dataset.v);
  if(allow.length && !allow.includes(settings.variant)) setVariant(allow[0]);
}

/* ============ Display ============ */
const elNote=document.getElementById("noteName"), elRole=document.getElementById("roleName"), elTip=document.getElementById("tip");
function updateDisplay(){
  const lab=pitchLabel(currentIndex); elNote.textContent=lab.note;
  let role;
  if(M.id==='jazz') role=jazzLabel;
  else if(M.kind==='harmonic') role=t('ord',{n:lab.deg})+" "+t('role.harmonicWord');
  else { const len=SCALE.length, step=((currentIndex%len)+len)%len, oct=Math.floor(currentIndex/len);
    role=degName(SCALE[step])+(oct? " · "+t('role.oct')+" "+(oct>0?"+":"")+oct : ""); }
  elRole.textContent=role;
  const bt=bendTargets(currentIndex), parts=[];
  if(bt.up) parts.push("↑ "+bt.up.name); if(bt.down) parts.push("↓ "+bt.down.name);
  elTip.textContent = parts.length ? t('tip.bend')+" "+parts.join("  ·  ") : "";
  refreshKeyLabels();
}
function refreshKeyLabels(){ const ct=curChord; for(const k of noteKeys){
    const idx=clampIndex(currentIndex+k.off), lab=pitchLabel(idx); k.lead.textContent=lab.deg+" ("+lab.note+")";
    let role=0;                                  // current-chord tone: 1/3/5/7
    if(ct){ const pc=((indexToMidi(idx)%12)+12)%12;
      if(pc===ct.r) role=1; else if(pc===(ct.r+ct.ivs[1])%12) role=3;
      else if(pc===(ct.r+ct.ivs[2])%12) role=5; else if(ct.ivs[3]!=null && pc===(ct.r+ct.ivs[3])%12) role=7; }
    k.el.classList.toggle('t1',role===1); k.el.classList.toggle('t3',role===3);
    k.el.classList.toggle('t5',role===5); k.el.classList.toggle('t7',role===7);
  } }

/* ============ Keys ============ */
// weight by distance from the current note: small steps big & central, octave leaps small at the edges
const KW={0:3.8,1:3.2,2:2.4,3:1.7,4:1.3,5:1.0,6:0.85,7:0.7};
const KEYS=[
  {off:-7,code:"KeyQ",lbl:"Q"},{off:-6,code:"KeyA",lbl:"A"},{off:-5,code:"KeyS",lbl:"S"},{off:-4,code:"KeyD",lbl:"D"},{off:-3,code:"KeyF",lbl:"F"},
  {off:-2,code:"KeyG",lbl:"G"},{off:-1,code:"KeyH",lbl:"H"},{off:0,code:"Space",lbl:"␣"},{off:1,code:"KeyJ",lbl:"J"},{off:2,code:"KeyK",lbl:"K"},
  {off:3,code:"KeyL",lbl:"L"},{off:4,code:"Semicolon",lbl:";"},{off:5,code:"Quote",lbl:"'"},{off:6,code:"KeyP",lbl:"P"},{off:7,code:"Backslash",lbl:"\\"}
];
const codeMap={}, noteKeys=[], noteCodes=[];
function buildRow(list,host){ list.forEach(k=>{ const el=document.createElement("div");
  el.className="key "+(k.off<0?"neg":k.off>0?"pos":"zero")+" canbend"; el.style.flexGrow=KW[Math.abs(k.off)];
  el.innerHTML=`<span class="kb">${k.lbl}</span><span class="off">${k.off>0?"+":""}${k.off}</span><span class="lead"></span><span class="dot"></span><span class="bendfill"></span><span class="arrow">↑</span>`;
  bindPointer(el,k.off); host.appendChild(el); codeMap[k.code]={el,off:k.off}; noteCodes.push(k.code);
  noteKeys.push({off:k.off, el, lead:el.querySelector(".lead")}); }); }
const rowTopEl=document.getElementById("rowTop"), rowBottomEl=document.getElementById("rowBottom");
// an octave = one scale length; cap the reach there (jazz scale length changes per chord, so fix it at 7)
function maxReach(){ return (M.kind==='harmonic'||M.id==='jazz') ? 7 : SCALE.length; }
function buildKeys(){
  const set=KEYS.filter(k=>Math.abs(k.off)<=maxReach());
  rowTopEl.innerHTML=""; rowBottomEl.innerHTML="";
  noteKeys.length=0; noteCodes.forEach(c=>delete codeMap[c]); noteCodes.length=0;
  buildRow(set.filter(k=>Math.abs(k.off)>=3),rowTopEl);     // rare leaps — small, top row
  buildRow(set.filter(k=>Math.abs(k.off)<=2),rowBottomEl);  // frequent steps — big, bottom row
}
buildKeys();

const EXTRA=[{key:'extra.octDown',code:"BracketLeft",act:()=>shiftOctave(-1)},
             {key:'extra.toRoot',code:"Backspace",act:resetToRoot},
             {key:'extra.octUp',code:"BracketRight",act:()=>shiftOctave(1)}];
const extraHost=document.getElementById("extra"), extraLabelEls=[];
EXTRA.forEach(k=>{ const el=document.createElement("div"); el.className="key zero";
  const sp=document.createElement('span'); sp.className='off'; sp.textContent=t(k.key); el.appendChild(sp);
  el.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();resumeAudio();k.act();el.classList.add("active");setTimeout(()=>el.classList.remove("active"),120);});
  extraHost.appendChild(el); codeMap[k.code]={el,act:k.act,momentary:true}; extraLabelEls.push({sp,key:k.key}); });
function setExtraLabels(){ extraLabelEls.forEach(o=>o.sp.textContent=t(o.key)); }

/* ============ Pointer + bend ============ */
const BEND_UP_PX=100, BEND_DOWN_PX=68; const pointers=new Map();   // down needs less travel: little room below the key
function bindPointer(el,off){ el.addEventListener("pointerdown",e=>{ e.preventDefault(); const id="p"+e.pointerId;
  const v=noteOn(id,off,el); if(v) pointers.set(e.pointerId,{id,startY:e.clientY,el,voice:v}); }); }
window.addEventListener("pointermove",e=>{ const p=pointers.get(e.pointerId); if(!p) return;
  const dy=p.startY-e.clientY;                                      // up = positive
  const raw=dy/(dy>=0?BEND_UP_PX:BEND_DOWN_PX)*2; p.voice.dragBend=raw; applyBend(p.voice);
  const down=raw<0, mb=down?p.voice.maxDown:p.voice.maxUp, mag=Math.abs(raw);
  const frac=mb>0?Math.min(mag,mb)/mb:0; p.el.style.setProperty("--bend",frac.toFixed(3));
  p.el.classList.toggle("down",down&&mb>0&&frac>0.06); p.el.classList.toggle("bending",frac>0.06); p.el.classList.toggle("bent",mb>0&&mag>=mb);
  const a=p.el.querySelector(".arrow"); if(a) a.textContent=down?"↓":"↑";
  if(settings.viz && frac>0.3 && Math.random()<0.45){ const r=p.el.getBoundingClientRect(); viz.spark(r.left+r.width/2, r.top+(down?r.height-12:12), down?cssRgb('--blue'):cssRgb('--accent')); } });
function endPointer(e){ const p=pointers.get(e.pointerId); if(!p) return; pointers.delete(e.pointerId); noteOff(p.id,p.el); }
window.addEventListener("pointerup",endPointer); window.addEventListener("pointercancel",endPointer);

/* ============ Keyboard ============ */
const held=new Set();
function setKbBend(s){ kbBend=s; for(const v of activeVoices.values()) applyBend(v); }
window.addEventListener("keydown",e=>{
  if(e.code==="ShiftLeft"||e.code==="ShiftRight"){ e.preventDefault(); setKbBend(2); return; }
  if(e.code==="ArrowUp"){ e.preventDefault(); if(!cycleVariant(1)) shiftOctave(1); return; }
  if(e.code==="ArrowDown"){ e.preventDefault(); if(!cycleVariant(-1)) shiftOctave(-1); return; }
  const m=codeMap[e.code]; if(!m) return; e.preventDefault();
  if(held.has(e.code)) return; held.add(e.code);
  if(m.momentary){ initAudio();resumeAudio(); m.act(); m.el.classList.add("active"); } else noteOn("k"+e.code,m.off,m.el); });
window.addEventListener("keyup",e=>{ if(e.code==="ShiftLeft"||e.code==="ShiftRight"){ setKbBend(0); return; }
  const m=codeMap[e.code]; if(!m) return; held.delete(e.code);
  if(m.momentary) m.el.classList.remove("active"); else noteOff("k"+e.code,m.el); });

/* ============ Backing ============ */
let accOn=false, schedTimer=null, padNodes=[], nextNoteTime=0, eighth=0, qStep=0, mStep=0;
const LOOKAHEAD=0.25;                               // schedule this far ahead → survives main-thread jank (anti-crackle)
const accGain=(l,bus)=>{const g=actx.createGain();g.gain.value=l;g.connect(bus||accBus);return g;};

// --- blues: 12 bars ---
const DOM7=[0,4,7,10], MIN7=[0,3,7,10], MAJ=[0,4,7];
const MAJ6=[0,4,7,9];
const dom12=[0,0,0,0,5,5,0,0,7,5,0,7].map(r=>({root:r,ivs:DOM7}));
const cnt12=[0,0,0,0,5,5,0,0,7,5,0,7].map(r=>({root:r,ivs:MAJ6}));
const min12=[{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:5,ivs:MIN7},{root:5,ivs:MIN7},
             {root:0,ivs:MIN7},{root:0,ivs:MIN7},{root:8,ivs:MAJ},{root:7,ivs:DOM7},{root:0,ivs:MIN7},{root:7,ivs:DOM7}];
// --- harmony: progression + chord quality ---
const HARMONY={ major:{bars:dom12}, minor:{bars:min12}, country:{bars:cnt12}, funk:{bars:[{root:0,ivs:DOM7}]} };
const HARM_OPTS=[['major','harm.major'],['minor','harm.minor'],['country','harm.country'],['funk','harm.funk']];
// which scale fits the harmony (guard against clashing combos)
const HARM_LADS={ major:['minor','major'], minor:['minor'], country:['major'], funk:['minor','major'] };
// --- rhythm: bass by "roles" (tones of the current chord), swing, drums, comping ---
const RHYTHM={
  shuffle:{bass:['R','3','5','6','b7','6','5','3'],              swing:0.16, drum:'shuffle', comp:'sustain'},
  rock:   {bass:['R','5','R','5','R','5','R','5'],              swing:0,    drum:'rock',    comp:'sustain'},
  slow:   {bass:['R',null,'5',null,'b7',null,'5',null],         swing:0.2,  drum:'slow',    comp:'sustain'},
  train:  {bass:['R',null,null,null,'5',null,null,null],        swing:0.12, drum:'train',   comp:'stab'},
  rhumba: {bass:['R',null,null,'5',null,null,'R',null],         swing:0,    drum:'rhumba',  comp:'offbeat'},
  honky:  {bass:['R',null,null,null,'5',null,null,null],        swing:0.16, drum:'shuffle', comp:'offbeat'},
  funk:   {bass:['R',null,'5',null,'R',null,null,'b7'],         swing:0,    drum:'funk',    comp:'stab'},
};
const RHY_OPTS=[['shuffle','rhy.shuffle'],['rock','rhy.rock'],['slow','rhy.slow'],['train','rhy.train'],['rhumba','rhy.rhumba'],['honky','rhy.honky'],['funk','rhy.funk']];
function bassRole(role,ivs){ if(role==='R')return 0; if(role==='5')return 7; if(role==='8')return 12;
  if(role==='b7')return 10; if(role==='6')return 9; if(role==='3')return ivs.includes(3)?3:4; return null; }
function bChord(rootSemi,time,dur,ivs,lvl){ const base=settings.rootMidi-12+rootSemi; lvl=lvl||0.1;   // plucky guitar/piano-style chord (not a sustained pad)
  ivs.forEach(iv=>{ const o=actx.createOscillator();o.type="sawtooth";o.frequency.value=midiToFreq(base+iv);
    const f=actx.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(2600,time);f.frequency.exponentialRampToValueAtTime(900,time+dur*0.6);
    const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(lvl,time+0.005);g.gain.exponentialRampToValueAtTime(.0008,time+dur);
    o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+dur+0.05); }); }
function bBass(rootSemi,time,off){                       // rounder bass with body (sine + triangle through a lowpass)
  const fr=midiToFreq(settings.rootMidi-24+rootSemi+off);
  const o=actx.createOscillator();o.type="sine";o.frequency.value=fr;
  const o2=actx.createOscillator();o2.type="triangle";o2.frequency.value=fr; const o2g=actx.createGain();o2g.gain.value=0.4;
  const beat=60/settings.bpm,dur=beat*0.5, lp=actx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=820;
  const g=actx.createGain(); g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.55,time+0.012);g.gain.exponentialRampToValueAtTime(.001,time+dur);
  o.connect(g);o2.connect(o2g);o2g.connect(g);g.connect(lp);lp.connect(busBass);
  o.start(time);o2.start(time);o.stop(time+dur+0.05);o2.stop(time+dur+0.05); }
function kick(time,vel){vizBeat(time,0.9*(vel||1));const o=actx.createOscillator();o.type="sine";const g=accGain(0,busPerc);o.frequency.setValueAtTime(150,time);o.frequency.exponentialRampToValueAtTime(48,time+0.12);g.gain.setValueAtTime(.9*(vel||1),time);g.gain.exponentialRampToValueAtTime(.001,time+0.18);o.connect(g);o.start(time);o.stop(time+0.2);}
function snare(time,vel){ vel=vel||1;   // tonal body + bright snap = a real backbeat snare
  const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type="highpass";f.frequency.value=1700;const g=accGain(0,busPerc);g.gain.setValueAtTime(.5*vel,time);g.gain.exponentialRampToValueAtTime(.001,time+0.15);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.17);
  const o=actx.createOscillator();o.type="triangle";o.frequency.setValueAtTime(190,time);o.frequency.exponentialRampToValueAtTime(140,time+0.08);const og=accGain(0,busPerc);og.gain.setValueAtTime(.3*vel,time);og.gain.exponentialRampToValueAtTime(.001,time+0.12);o.connect(og);o.start(time);o.stop(time+0.14);}
function hat(time,open,vel){const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type="highpass";f.frequency.value=7000;const g=accGain(0,busPerc);const dur=open?0.12:0.04;g.gain.setValueAtTime(.16*(vel||1),time);g.gain.exponentialRampToValueAtTime(.001,time+dur);n.connect(f);f.connect(g);n.start(time);n.stop(time+dur+0.02);}
function drumPat(style,step,t0){
  if(style==='shuffle'){ hat(t0,step%2); if(step===0||step===4)kick(t0); if(step===2||step===6)snare(t0); }
  else if(style==='rock'){ hat(t0,false,0.7); if(step===0||step===4)kick(t0); if(step===3)kick(t0,0.5); if(step===2||step===6)snare(t0); }
  else if(style==='slow'){ if(step===0)kick(t0); if(step===4)snare(t0); if(step%2)hat(t0,true,0.6); }
  else if(style==='train'){ if(step===0||step===4)kick(t0,0.9); snare(t0, step%2?0.4:0.18); }
  else if(style==='funk'){ hat(t0,false,0.7); if(step===0||step===3)kick(t0); if(step===2||step===6)snare(t0); }
  else if(style==='rhumba'){ hat(t0,false,0.5); if(step===0||step===3||step===6)kick(t0,0.9); if(step===2||step===5)snare(t0,0.3); }
}
function bluesScheduler(){ const H=HARMONY[settings.harmony]||HARMONY.major, R=RHYTHM[settings.rhythm]||RHYTHM.shuffle, nb=H.bars.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){ const beat=60/settings.bpm, step=eighth%8, off=step%2, t0=nextNoteTime+(off?beat*(R.swing||0):0);
    const chord=H.bars[Math.floor(eighth/8)%nb];
    drumPat(R.drum,step,t0);
    const role=R.bass[step], bo=role?bassRole(role,chord.ivs):null; if(bo!=null) bBass(chord.root,t0,bo);
    if(R.comp==='stab'){ if(step===2||step===6) bChord(chord.root,t0,beat*0.45,chord.ivs,0.12); }
    else if(R.comp==='offbeat'){ if(step%2===1) bChord(chord.root,t0,beat*0.4,chord.ivs,0.09); }     // shuffle "chuck" on the &s
    else { if(step===2||step===6) bChord(chord.root,t0,beat*0.7,chord.ivs,0.12);                     // backbeat chord chop (was a bar-long drone)
           else if(step===0) bChord(chord.root,nextNoteTime,beat*0.5,chord.ivs,0.05); }              // light downbeat for body
    if(step===0){ const pcs=new Set(chord.ivs.map(iv=>(chord.root+iv)%12)), cc={r:(settings.rootMidi+chord.root)%12, ivs:chord.ivs}; setTimeout(()=>{ if(!accOn||M.back!=='blues')return; liveChordPcs=pcs; curChord=cc; updateDisplay();}, Math.max(0,(nextNoteTime-actx.currentTime)*1000)); }
    nextNoteTime+=beat/2; eighth++; } }

// --- modal backing: arpeggio + bass + percussion + vamp ---
const ARP=[0,7,12,7];           // root-fifth-octave (consonant in any scale)
function curBack(){ return M.backings.find(b=>b.id===settings.backing) || M.backings[0]; }
function kotoPluck(off,time){ const m=settings.rootMidi+off;   // an octave above the drone
  const o=actx.createOscillator();o.type="triangle";o.frequency.value=midiToFreq(m);
  const f=actx.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(5200,time);f.frequency.exponentialRampToValueAtTime(1500,time+0.5);
  const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.22,time+0.004);g.gain.exponentialRampToValueAtTime(0.001,time+0.85);
  o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+0.95); }
function modalBass(off,time){ const o=actx.createOscillator();o.type="triangle";o.frequency.value=midiToFreq(settings.rootMidi-12+off);
  const dur=(60/settings.bpm)*0.9, g=accGain(0,busBass);
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.34,time+0.02);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  o.connect(g);o.start(time);o.stop(time+dur+0.05); }
// drums
function taiko(time,vel){ vizBeat(time,0.85*vel); const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(95,time);o.frequency.exponentialRampToValueAtTime(48,time+0.18);
  const g=accGain(0,busPerc);g.gain.setValueAtTime(0.55*vel,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.28);o.connect(g);o.start(time);o.stop(time+0.3);
  const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=380;const ng=accGain(0,busPerc);
  ng.gain.setValueAtTime(0.22*vel,time);ng.gain.exponentialRampToValueAtTime(0.001,time+0.11);n.connect(f);f.connect(ng);n.start(time);n.stop(time+0.13); }
function doum(time){ vizBeat(time,0.8); const o=actx.createOscillator();o.type='sine';o.frequency.setValueAtTime(115,time);o.frequency.exponentialRampToValueAtTime(56,time+0.16);
  const g=accGain(0,busPerc);g.gain.setValueAtTime(0.6,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.22);o.connect(g);o.start(time);o.stop(time+0.24); }
function tek(time,vel){ const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=3200;const g=accGain(0,busPerc);
  g.gain.setValueAtTime(vel||0.3,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.05);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.07); }
function shaker(time,vel){ const n=actx.createBufferSource();n.buffer=noiseBuf;const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=6500;const g=accGain(0,busPerc);
  g.gain.setValueAtTime(vel,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.04);n.connect(f);f.connect(g);n.start(time);n.stop(time+0.06); }
const DARBUKA=['D','.','t','.','D','t','.','t'];  // baladi-ish pattern over eighths
function percHit(type,step,time){
  if(type==='taiko'){ if(step===0) taiko(time,1.0); else if(step===4) taiko(time,0.6); else if(step===6) taiko(time,0.32); }
  else if(type==='darbuka'){ const x=DARBUKA[step]; if(x==='D') doum(time); else if(x==='t') tek(time,0.3); }
  else { shaker(time, step%2?0.18:0.1); }
}
function modalScheduler(){ const b=curBack(), beat=60/settings.bpm, vamp=M.vamp||[0];
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=mStep%8, bar=Math.floor(mStep/8), vroot = b.vamp ? (vamp[bar%vamp.length]||0) : 0;
    if(b.perc) percHit(M.perc, step, nextNoteTime);
    if(b.bass && (step===0||step===4)) modalBass(vroot + (step===4?7:0), nextNoteTime);
    if(b.arp) kotoPluck(vroot + ARP[mStep%ARP.length], nextNoteTime);
    nextNoteTime += beat/2; mStep++;
  } }

// --- pads ---
function stopPad(){ if(!actx){padNodes=[];return;} const t0=actx.currentTime;
  padNodes.forEach(p=>{ try{ p.g.gain.cancelScheduledValues(t0); p.g.gain.setValueAtTime(p.g.gain.value,t0); p.g.gain.linearRampToValueAtTime(0,t0+0.5); p.stops.forEach(n=>n.stop(t0+0.6)); }catch(e){} }); padNodes=[]; }
function startPadKoto(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.085],[settings.rootMidi-5,0.05],[settings.rootMidi,0.05]].forEach(([m,vol],i)=>{
    const o1=actx.createOscillator(),o2=actx.createOscillator();o1.type=o2.type='sawtooth';o1.frequency.value=midiToFreq(m);o2.frequency.value=midiToFreq(m);o2.detune.value=6;
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.value=850; const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+1.4);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.12+i*0.03;lg.gain.value=0.015;lfo.connect(lg);lg.connect(g.gain);
    o1.connect(f);o2.connect(f);f.connect(g);g.connect(busChord);o1.start(t0);o2.start(t0);lfo.start(t0); padNodes.push({g,stops:[o1,o2,lfo]}); }); }
function startPadFlute(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.06],[settings.rootMidi-5,0.04]].forEach(([m,vol],i)=>{
    const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(m); const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+2.0);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.1+i*0.03;lg.gain.value=0.012;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); });
  const nz=actx.createBufferSource();nz.buffer=noiseBuf;nz.loop=true; const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=midiToFreq(settings.rootMidi);bp.Q.value=3;
  const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(0.02,t0+2.0); nz.connect(bp);bp.connect(g);g.connect(busChord);nz.start(t0); padNodes.push({g,stops:[nz]}); }
// "Dream": augmented pad (root+third+aug.fifth — all from whole-tone) + optional shimmer
function startPadDream(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.06],[settings.rootMidi-12+4,0.04],[settings.rootMidi-12+8,0.035]].forEach(([m,vol],i)=>{
    const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(m); const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+2.5);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.08+i*0.04;lg.gain.value=0.014;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); }); }
const DREAMARP=[0,4,8,12,8,4];
function dreamScheduler(){ const beat=60/settings.bpm; while(nextNoteTime<actx.currentTime+LOOKAHEAD){ kotoPluck(DREAMARP[qStep%DREAMARP.length],nextNoteTime); nextNoteTime+=beat; qStep++; } }
// "Gamelan": gong, bell pattern (metallophone), soft drone
function gong(time){ vizBeat(time,0.9); const f=midiToFreq(settings.rootMidi-12);   // an octave higher — phone speakers roll off below ~110 Hz
  [[1,0.34],[2.0,0.3],[2.76,0.24],[4.1,0.16],[5.4,0.09]].forEach(([mult,vol])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=f*mult;
    const g=accGain(0,busPerc); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+3.2); o.connect(g);o.start(time);o.stop(time+3.3); }); }
function bell(midi,time){ const f=midiToFreq(midi);
  [[1,0.16],[2.76,0.05],[5.4,0.025]].forEach(([mult,vol])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=f*mult;
    const g=accGain(0,busChord); g.gain.setValueAtTime(vol,time); g.gain.exponentialRampToValueAtTime(0.001,time+1.1); o.connect(g);o.start(time);o.stop(time+1.2); }); }
function startGamelanDrone(){ stopPad(); const t0=actx.currentTime;
  [[settings.rootMidi-12,0.05],[settings.rootMidi-5,0.035]].forEach(([m,vol],i)=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=midiToFreq(m);
    const g=actx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+1.5);
    const lfo=actx.createOscillator(),lg=actx.createGain();lfo.frequency.value=0.1+i*0.03;lg.gain.value=0.01;lfo.connect(lg);lg.connect(g.gain);
    o.connect(g);g.connect(busChord);o.start(t0);lfo.start(t0); padNodes.push({g,stops:[o,lfo]}); }); }
const GMPAT=[0,1,2,3,4,2,3,4];
function gamelanScheduler(){ const beat=60/settings.bpm, pat=(curBack().id==='pattern');
  while(nextNoteTime<actx.currentTime+LOOKAHEAD){ const s=qStep%16;
    if(s===0) gong(nextNoteTime);
    if(pat){ const idx=GMPAT[qStep%GMPAT.length]; bell(settings.rootMidi+(SCALE[idx%SCALE.length]||0)+12, nextNoteTime); }
    nextNoteTime+=beat/2; qStep++; } }

/* ============ Jazz: auto-scale over the golden sequence ============ */
const IONIAN=[0,2,4,5,7,9,11],LYDIAN=[0,2,4,6,7,9,11],MIXO=[0,2,4,5,7,9,10],
      DORIAN=[0,2,3,5,7,9,10],AEOL=[0,2,3,5,7,8,10],LOCR2=[0,2,3,5,6,8,10],LOCR=[0,1,3,5,6,8,10],
      PHRDOM=[0,1,4,5,7,8,10],LYDDOM=[0,2,4,6,7,9,10],ALT=[0,1,3,4,6,8,10],WHOLE=[0,2,4,6,8,10],HW=[0,1,3,4,6,7,9,10];
const QUAL={                                       // ivs — comping; calm — diatonic; hot — with alterations
  m7:    {ivs:[0,3,7,10], calm:[[DORIAN,'scale.dorian']], hot:[[DORIAN,'scale.dorian'],[AEOL,'scale.aeolian']]},
  dom:   {ivs:[0,4,7,10], calm:[[MIXO,'scale.mixo']], hot:[[LYDDOM,'scale.lyddom'],[ALT,'scale.alt'],[WHOLE,'scale.whole']]},
  maj7:  {ivs:[0,4,7,11], calm:[[IONIAN,'scale.ionian']], hot:[[LYDIAN,'scale.lydian']]},
  maj7iv:{ivs:[0,4,7,11], calm:[[LYDIAN,'scale.lydian']], hot:[[LYDIAN,'scale.lydian']]},
  m7b5:  {ivs:[0,3,6,10], calm:[[LOCR2,'scale.locr2']], hot:[[LOCR,'scale.locr']]},
  domV:  {ivs:[0,4,7,10], calm:[[PHRDOM,'scale.phrdom']], hot:[[ALT,'scale.alt'],[HW,'scale.hw']]},   // dominant into minor
};
// golden sequence in C/Am, A7 — turnaround back to Dm7
const JAZZ_PROG=[
  {root:2, sfx:'m7',  q:'m7'},  {root:7, sfx:'7',  q:'dom'},
  {root:0, sfx:'maj7',q:'maj7'},{root:5, sfx:'maj7',q:'maj7iv'},
  {root:11,sfx:'m7♭5',q:'m7b5'},{root:4, sfx:'7',  q:'domV'},
  {root:9, sfx:'m7',  q:'m7'},  {root:9, sfx:'7',  q:'domV'},
];
function nearestRootIndex(targetFreq){      // root of the new scale in the octave closest to the last note
  const len=SCALE.length, tm=freqToMidi(targetFreq); let best=0,bestD=Infinity;
  for(let k=-6;k<=6;k++){ const i=k*len, m=indexToMidi(i); if(m<settings.minMidi||m>settings.maxMidi) continue;
    const d=Math.abs(m-tm); if(d<bestD){bestD=d;best=i;} }
  return clampIndex(best);
}
function applyJazzChord(ch){
  const pool=QUAL[ch.q][settings.jazzColor]||QUAL[ch.q].calm, pick=pool[Math.floor(Math.random()*pool.length)];
  const oldF=(SCALE&&actx)?pitchFreq(currentIndex):null;
  SCALE=pick[0]; jazzRoot=settings.rootMidi+ch.root;
  if(oldF!=null) currentIndex = (settings.jazzLand==='root') ? nearestRootIndex(oldF) : clampIndex(nearestIndex(oldF));
  jazzLabel=NOTE_NAMES[(settings.rootMidi+ch.root)%12]+ch.sfx+" · "+t(pick[1]);
  curChord={r:(settings.rootMidi+ch.root)%12, ivs:QUAL[ch.q].ivs};
  if(settings.jazzPhrase!=='free' && actx)               // resolve any held notes/bends to the new chord
    for(const v of activeVoices.values()) glideVoice(v, midiToFreq(snapJazz(Math.round(freqToMidi(v.baseFreq)),0,null)));
  updateDisplay();
}
function jazzBass(off,time){                       // upright-ish: round body, soft attack, sustained walking quarter
  const f=midiToFreq(settings.rootMidi-24+off);
  const o=actx.createOscillator();o.type='sine';o.frequency.value=f;
  const o2=actx.createOscillator();o2.type='triangle';o2.frequency.value=f; const o2g=actx.createGain();o2g.gain.value=0.3;
  const beat=60/settings.bpm,dur=beat*0.92, lp=actx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;
  const g=actx.createGain();
  g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(0.38,time+0.025);g.gain.setValueAtTime(0.38,time+dur*0.55);g.gain.exponentialRampToValueAtTime(0.001,time+dur);
  o.connect(g);o2.connect(o2g);o2g.connect(g);g.connect(lp);lp.connect(busBass);
  o.start(time);o2.start(time);o.stop(time+dur+0.05);o2.stop(time+dur+0.05); }
// rootless mid-register piano comp: 3rd / 5th / 7th (+9th where safe), root omitted (the bass has it)
function jazzComp(rootSemi,time,ivs,vel,ext){
  const base=settings.rootMidi-12+rootSemi, dur=(60/settings.bpm)*1.4;
  const tones=[ivs[1],ivs[2],ivs[3]]; if(ext!=null) tones.push(ext);
  tones.forEach(iv=>{ const o=actx.createOscillator();o.type='triangle';o.frequency.value=midiToFreq(base+iv);
    const f=actx.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(3200,time);f.frequency.exponentialRampToValueAtTime(1200,time+dur*0.6);
    const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vel,time+0.006);g.gain.exponentialRampToValueAtTime(0.0008,time+dur);
    o.connect(f);f.connect(g);g.connect(busChord);o.start(time);o.stop(time+dur+0.05); }); }
function ride(time,vel,bell){                       // jazz ride: metallic wash + pitched ding, bell-accented on 1 & 3
  const n=actx.createBufferSource();n.buffer=noiseBuf;n.loop=true;
  const bp=actx.createBiquadFilter();bp.type='bandpass';bp.frequency.value=7200;bp.Q.value=0.7;
  const g=actx.createGain();g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(vel*0.3,time+0.004);g.gain.exponentialRampToValueAtTime(0.0006,time+(bell?0.7:0.34));
  n.connect(bp);bp.connect(g);g.connect(busPerc);n.start(time);n.stop(time+(bell?0.8:0.45));
  const parts=bell?[[1,0.12],[2.76,0.06]]:[[1,0.06]];        // fewer partials = lighter
  parts.forEach(([m,v])=>{ const o=actx.createOscillator();o.type='sine';o.frequency.value=(bell?700:920)*m;
    const og=actx.createGain();og.gain.setValueAtTime(0,time);og.gain.linearRampToValueAtTime(v*vel,time+0.003);og.gain.exponentialRampToValueAtTime(0.001,time+(bell?0.6:0.22));
    o.connect(og);og.connect(busPerc);o.start(time);o.stop(time+0.7); }); }
function hatFoot(time){                             // closed hi-hat "chick" on 2 & 4
  const n=actx.createBufferSource();n.buffer=noiseBuf;const hp=actx.createBiquadFilter();hp.type='highpass';hp.frequency.value=9000;
  const g=actx.createGain();g.gain.setValueAtTime(0.13,time);g.gain.exponentialRampToValueAtTime(0.001,time+0.06);
  n.connect(hp);hp.connect(g);g.connect(busPerc);n.start(time);n.stop(time+0.08); }
const RIDE=[1,0,1,1,1,0,1,1];                      // spang-a-lang over eighths
function jazzScheduler(){ const beat=60/settings.bpm, np=JAZZ_PROG.length;
  while(nextNoteTime < actx.currentTime+LOOKAHEAD){
    const step=eighth%8, off=step%2, t0=nextNoteTime+(off?beat*0.16:0);
    const bar=Math.floor(eighth/8)%np, ch=JAZZ_PROG[bar], nx=JAZZ_PROG[(bar+1)%np], q=QUAL[ch.q];
    const ext=(ch.q==='m7'||ch.q==='dom'||ch.q==='maj7'||ch.q==='maj7iv')?14:null;   // add the 9th only where it won't clash
    if(step%2===0){ jazzBeatRef=nextNoteTime-(step/2)*beat; jazzBeatLen=beat; }       // anchor the beat grid for strong-beat detection
    if(step===0){ const c=ch, tt=nextNoteTime; setTimeout(()=>{ if(accOn&&M.id==='jazz') applyJazzChord(c); },Math.max(0,(tt-actx.currentTime)*1000));
      jazzComp(ch.root,nextNoteTime,q.ivs,0.17,ext); }                // comp on beat 1
    if(step===3) jazzComp(ch.root,t0,q.ivs,0.14,ext);                  // Charleston: the "and" of 2
    // walking bass — quarter notes, smooth approach to the next root
    if(step===0) jazzBass(ch.root,t0);
    else if(step===2) jazzBass(ch.root+7,t0);
    else if(step===4) jazzBass(ch.root+q.ivs[1],t0);
    else if(step===6) jazzBass(nx.root+12-1,t0);
    if(RIDE[step]) ride(t0, (step===0||step===4)?0.9:(off?0.45:0.62), step===0||step===4);
    if(step===2||step===6) hatFoot(t0);                                // hi-hat foot on 2 & 4
    nextNoteTime+=beat/2; eighth++;
  } }

function startBacking(){ initAudio(); resumeAudio(); accOn=true;
  if(M.back==='jazz'){ eighth=0; nextNoteTime=actx.currentTime+0.1; applyJazzChord(JAZZ_PROG[0]); schedTimer=setInterval(jazzScheduler,25); }
  else if(M.back==='blues'){ eighth=0; nextNoteTime=actx.currentTime+0.1; schedTimer=setInterval(bluesScheduler,25); }
  else if(M.back==='koto'){
    const b=curBack();
    if(b.pad) startPadKoto();
    if(b.arp||b.perc||b.bass||b.vamp){ mStep=0; nextNoteTime=actx.currentTime+0.12; schedTimer=setInterval(modalScheduler,30); }
  }
  else if(M.back==='dream'){ startPadDream(); if(settings.backing==='shimmer'){ qStep=0; nextNoteTime=actx.currentTime+0.12; schedTimer=setInterval(dreamScheduler,40); } }
  else if(M.back==='gamelan'){ startGamelanDrone(); qStep=0; nextNoteTime=actx.currentTime+0.12; schedTimer=setInterval(gamelanScheduler,30); }
  else { startPadFlute(); }
  accBtn.classList.add("on"); accBtn.textContent=t('btn.bgStop'); }
function stopBacking(){ accOn=false; if(schedTimer){clearInterval(schedTimer);schedTimer=null;} stopPad(); liveChordPcs=null; curChord=null; jazzBeatLen=0; refreshKeyLabels();
  accBtn.classList.remove("on"); accBtn.textContent=t('btn.bgStart'); }

/* ============ Theme and mode UI assembly ============ */
function applyTheme(th){ const s=document.documentElement.style; for(const k in th) s.setProperty('--'+k,th[k]); }
const ladHost=document.getElementById("ladHost"), backSel=document.getElementById("backSel"),
      accBtn=document.getElementById("accBtn");
function buildLadRow(){ ladHost.innerHTML="";
  if(M.variants.length<2) return;
  M.variants.forEach(vr=>{ const b=document.createElement("button"); b.className="ladbtn"+(vr.id===settings.variant?" active":"");
    b.dataset.v=vr.id; b.textContent=t(vr.label);
    b.addEventListener("pointerdown",e=>{e.preventDefault();initAudio();resumeAudio();setVariant(vr.id);}); ladHost.appendChild(b); }); }
function buildBackingOptions(){ backSel.innerHTML=""; M.backings.forEach(bk=>backSel.appendChild(new Option(t(bk.label),bk.id))); backSel.value=settings.backing; }
function setHint(){ document.getElementById("hint").innerHTML = t(TOUCH ? 'hint.touch' : (M.kind==='harmonic'?'hint.harmonic':'hint.scale')); }

function setMode(id){ const was=accOn; if(actx) stopBacking();
  M=MODES[id]; applyTheme(M.theme);
  if(M.kind==='scale' && M.scales){ settings.variant=M.defVariant; SCALE=M.scales[M.defVariant]; }
  if(M.id==='jazz'){ settings.rootMidi=60; document.getElementById("rootSel").value=60; applyJazzChord(JAZZ_PROG[0]); }
  settings.bpm = M.defBpm||85;                                  // mode's default tempo (jazz — 160)
  document.getElementById("bpm").value=settings.bpm; document.getElementById("bpmVal").textContent=settings.bpm;
  buildLadRow();
  const isBlues=(M.back==='blues'), isJazz=(M.id==='jazz');     // blues — Harmony×Rhythm, jazz — Scales×Approach, others — Backing
  document.getElementById("ctlBack").style.display   = (isBlues||isJazz)?'none':'';
  document.getElementById("ctlHarm").style.display   = isBlues?'':'none';
  document.getElementById("ctlRhythm").style.display = isBlues?'':'none';
  document.getElementById("ctlColor").style.display  = isJazz?'':'none';
  document.getElementById("ctlLand").style.display   = isJazz?'':'none';
  document.getElementById("ctlPhrase").style.display = isJazz?'':'none';
  document.getElementById("ctlTiming").style.display = isJazz?'':'none';
  if(isBlues){ settings.harmony='major'; settings.rhythm='shuffle'; harmSel.value='major'; rhythmSel.value='shuffle'; }
  else { settings.backing=M.defBacking; buildBackingOptions(); }
  if(isJazz){ colorSel.value=settings.jazzColor; landSel.value=settings.jazzLand; phraseSel.value=settings.jazzPhrase; timingSel.value=settings.jazzTiming; }
  if(isBlues){ const c=HARMONY[settings.harmony].bars[0]; curChord={r:(settings.rootMidi+c.root)%12, ivs:c.ivs}; }
  else if(!isJazz) curChord=null;                  // tone highlight — only in jazz/blues
  applyLadLock();
  buildKeys();
  currentIndex=clampIndex(0);
  document.getElementById("h1name").textContent=t(M.name);
  document.getElementById("h1sub").textContent=t(M.sub);
  setHint();
  updateDisplay();
  if(was && actx) startBacking(); }

/* ============ Controls ============ */
const rootSel=document.getElementById("rootSel");
[["A",57],["A#",58],["B",59],["C",60],["C#",61],["D",62],["D#",63],["E",64],["F",53],["F#",54],["G",55],["G#",56]]
  .forEach(([nm,mid])=>rootSel.appendChild(new Option(nm,mid)));
rootSel.value=57;
rootSel.addEventListener("change",()=>{ settings.rootMidi=+rootSel.value; resetToRoot(); if(accOn){stopBacking();startBacking();} });
backSel.addEventListener("change",()=>{ settings.backing=backSel.value; if(accOn){stopBacking();startBacking();} });

const harmSel=document.getElementById("harmSel"), rhythmSel=document.getElementById("rhythmSel");
function populateHarmRhythm(){
  const hv=harmSel.value, rv=rhythmSel.value;
  harmSel.innerHTML=""; HARM_OPTS.forEach(([v,k])=>harmSel.appendChild(new Option(t(k),v)));
  rhythmSel.innerHTML=""; RHY_OPTS.forEach(([v,k])=>rhythmSel.appendChild(new Option(t(k),v)));
  if(hv) harmSel.value=hv; if(rv) rhythmSel.value=rv;
}
harmSel.addEventListener("change",()=>{ settings.harmony=harmSel.value; applyLadLock(); if(accOn){stopBacking();startBacking();} });  // scale locked to the harmony, restart from bar I
rhythmSel.addEventListener("change",()=>{ settings.rhythm=rhythmSel.value; });   // rhythm changes on the fly

const colorSel=document.getElementById("colorSel"), landSel=document.getElementById("landSel"), phraseSel=document.getElementById("phraseSel"), timingSel=document.getElementById("timingSel");
colorSel.addEventListener("change",()=>{ settings.jazzColor=colorSel.value; saveSettings(); });   // scales apply from the next chord
landSel.addEventListener("change",()=>{ settings.jazzLand=landSel.value; saveSettings(); });
phraseSel.addEventListener("change",()=>{ settings.jazzPhrase=phraseSel.value; saveSettings(); });
timingSel.addEventListener("change",()=>{ settings.jazzTiming=timingSel.value; saveSettings(); });

const loSel=document.getElementById("loSel"), hiSel=document.getElementById("hiSel");
for(let m=24;m<=96;m++){ loSel.appendChild(new Option(midiToName(m),m)); hiSel.appendChild(new Option(midiToName(m),m)); }
loSel.value=settings.minMidi; hiSel.value=settings.maxMidi;
loSel.addEventListener("change",()=>{ settings.minMidi=+loSel.value; currentIndex=clampIndex(currentIndex); updateDisplay(); saveSettings(); });
hiSel.addEventListener("change",()=>{ settings.maxMidi=+hiSel.value; currentIndex=clampIndex(currentIndex); updateDisplay(); saveSettings(); });
const bpm=document.getElementById("bpm"), bpmVal=document.getElementById("bpmVal");
bpm.addEventListener("input",()=>{settings.bpm=+bpm.value; bpmVal.textContent=bpm.value;});
const setVal=(id,txt)=>{ const e=document.getElementById(id); if(e) e.textContent=txt; };
const tone=document.getElementById("tone"); tone.addEventListener("input",()=>{settings.tone=+tone.value; if(leadFilter) leadFilter.frequency.value=settings.tone; setVal('toneVal',tone.value); saveSettings();});
const volSolo=document.getElementById("volSolo"); volSolo.addEventListener("input",()=>{settings.volSolo=volSolo.value/100; if(leadOut) leadOut.gain.value=settings.volSolo; setVal('volSoloVal',volSolo.value+'%'); saveSettings();});
const volAcc=document.getElementById("volAcc"); volAcc.addEventListener("input",()=>{settings.volAcc=volAcc.value/100; if(accBus) accBus.gain.value=settings.volAcc; setVal('volAccVal',volAcc.value+'%'); saveSettings();});
const bgDrums=document.getElementById("bgDrums"); bgDrums.addEventListener("input",()=>{settings.bgDrums=bgDrums.value/100; if(busPerc) busPerc.gain.value=settings.bgDrums; setVal('bgDrumsVal',bgDrums.value+'%'); saveSettings();});
const bgBass=document.getElementById("bgBass"); bgBass.addEventListener("input",()=>{settings.bgBass=bgBass.value/100; if(busBass) busBass.gain.value=settings.bgBass; setVal('bgBassVal',bgBass.value+'%'); saveSettings();});
const bgChord=document.getElementById("bgChord"); bgChord.addEventListener("input",()=>{settings.bgChord=bgChord.value/100; if(busChord) busChord.gain.value=settings.bgChord; setVal('bgChordVal',bgChord.value+'%'); saveSettings();});
const vizSel=document.getElementById("vizSel"); vizSel.addEventListener("change",()=>{ settings.viz=vizSel.value==='on'; saveSettings(); });
const gyroSel=document.getElementById("gyroSel"); gyroSel.addEventListener("change",()=>{ resetGyroParams(); settings.gyro=gyroSel.value; if(settings.gyro!=='off') enableGyro(); saveSettings(); });
function applyPrefsToControls(){
  loSel.value=settings.minMidi; hiSel.value=settings.maxMidi;
  tone.value=settings.tone;
  volSolo.value=Math.round(settings.volSolo*100); volAcc.value=Math.round(settings.volAcc*100);
  bgDrums.value=Math.round(settings.bgDrums*100); bgBass.value=Math.round(settings.bgBass*100); bgChord.value=Math.round(settings.bgChord*100);
  setVal('toneVal',Math.round(settings.tone)); setVal('volSoloVal',Math.round(settings.volSolo*100)+'%'); setVal('volAccVal',Math.round(settings.volAcc*100)+'%');
  setVal('bgDrumsVal',Math.round(settings.bgDrums*100)+'%'); setVal('bgBassVal',Math.round(settings.bgBass*100)+'%'); setVal('bgChordVal',Math.round(settings.bgChord*100)+'%');
  vizSel.value=settings.viz?'on':'off'; gyroSel.value=settings.gyro;
  colorSel.value=settings.jazzColor; landSel.value=settings.jazzLand; phraseSel.value=settings.jazzPhrase; timingSel.value=settings.jazzTiming;
}
const settingsEl=document.getElementById("settings");
document.getElementById("settingsBtn").addEventListener("click",()=>settingsEl.classList.remove("hidden"));
document.getElementById("closeSettings").addEventListener("click",()=>settingsEl.classList.add("hidden"));
const helpEl=document.getElementById("help");
document.getElementById("helpBtn").addEventListener("click",()=>{ document.getElementById("helpJazz").style.display=(M.id==='jazz')?'block':'none'; helpEl.classList.remove("hidden"); });
document.getElementById("closeHelp").addEventListener("click",()=>helpEl.classList.add("hidden"));
accBtn.addEventListener("click",()=> accOn?stopBacking():startBacking());
// close any open sheet with Escape or a tap on the backdrop
const SHEETS=["settings","help","latov","recov"];
document.addEventListener("keydown",e=>{ if(e.key==="Escape") SHEETS.forEach(id=>document.getElementById(id).classList.add("hidden")); });
SHEETS.forEach(id=>{ const el=document.getElementById(id); el.addEventListener("pointerdown",e=>{ if(e.target===el) el.classList.add("hidden"); }); });

/* ============ Language ============ */
function applyStaticI18n(){
  document.title=t('app.title');
  document.querySelectorAll('[data-i18n]').forEach(el=>{ el.textContent=t(el.getAttribute('data-i18n')); });
}
function refreshLabels(){
  applyStaticI18n();
  populateHarmRhythm();
  document.getElementById("h1name").textContent=t(M.name);
  document.getElementById("h1sub").textContent=t(M.sub);
  buildLadRow(); applyLadLock();
  if(!(M.back==='blues'||M.id==='jazz')) buildBackingOptions();
  setHint(); setExtraLabels();
  accBtn.textContent=t(accOn?'btn.bgStop':'btn.bgStart');
  if(!(mediaRec && mediaRec.state==='recording')) recBtn.textContent=t('btn.rec');
  updateDisplay();
}
function setLang(l){ if(!I18N[l]) l='en'; LANG=l; try{localStorage.setItem('jamlab.lang',l);}catch(e){} document.documentElement.lang=l; refreshLabels(); }
const langSel=document.getElementById("langSel"); langSel.value=LANG;
langSel.addEventListener("change",()=>setLang(langSel.value));

/* ============ Latency measurement ============ */
const latov=document.getElementById("latov");
function showLatInfo(){
  const sr=actx.sampleRate, bl=(actx.baseLatency||0)*1000, ol=(actx.outputLatency!=null?actx.outputLatency*1000:NaN);
  document.getElementById("latInfo").innerHTML =
    t('lat.sampleRate')+": <b>"+sr+"</b> "+t('lat.hz')+"<br>baseLatency: <b>"+bl.toFixed(1)+"</b> "+t('lat.ms')+
    "<br>outputLatency: <b>"+(isNaN(ol)?t('lat.na'):ol.toFixed(1)+" "+t('lat.ms'))+"</b>"+
    "<br><span style='color:var(--muted);font-size:12px'>"+t('lat.outNote')+"</span>";
}
document.getElementById("latBtn").addEventListener("click",()=>{ initAudio(); resumeAudio(); showLatInfo(); document.getElementById("latResult").textContent=""; latov.classList.remove("hidden"); });
document.getElementById("latClose").addEventListener("click",()=>latov.classList.add("hidden"));
if(NATIVE) document.getElementById("latMic").style.display="none";   // no microphone use in the store app (avoids the RECORD_AUDIO permission)
document.getElementById("latMic").addEventListener("click",async()=>{
  const res=document.getElementById("latResult"); res.textContent=t('lat.measuring');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const src=actx.createMediaStreamSource(stream), bs=256, sp=actx.createScriptProcessor(bs,1,1), sink=actx.createGain();
    sink.gain.value=0; src.connect(sp); sp.connect(sink); sink.connect(actx.destination);
    let clickAt=null, armed=false; const results=[];
    sp.onaudioprocess=(e)=>{ const inp=e.inputBuffer.getChannelData(0), bufStart=actx.currentTime - bs/actx.sampleRate;
      if(armed && clickAt!=null){ for(let i=0;i<inp.length;i++){ if(Math.abs(inp[i])>0.15){ const lat=(bufStart+i/actx.sampleRate-clickAt)*1000; if(lat>2&&lat<400) results.push(lat); armed=false; break; } } } };
    for(let k=0;k<10;k++){ clickAt=actx.currentTime+0.06; const o=actx.createOscillator(),g=actx.createGain();
      o.type="square"; o.frequency.value=2000; g.gain.setValueAtTime(0,clickAt); g.gain.linearRampToValueAtTime(0.9,clickAt+0.001); g.gain.exponentialRampToValueAtTime(0.001,clickAt+0.02);
      o.connect(g); g.connect(actx.destination); o.start(clickAt); o.stop(clickAt+0.03); armed=true; await new Promise(r=>setTimeout(r,380)); }
    src.disconnect(); sp.disconnect(); stream.getTracks().forEach(t=>t.stop());
    results.sort((a,b)=>a-b); const med=results.length?results[Math.floor(results.length/2)]:null;
    res.innerHTML = med!=null
      ? t('lat.rtt',{med:med.toFixed(0),n:results.length})+"<br><span style='color:var(--muted);font-size:12px'>"+t('lat.rttNote')+"</span>"
      : t('lat.noClick');
  }catch(err){ res.textContent=t('lat.micErr')+(err&&err.message||err); }
});

/* ============ Recording → video ============ */
let mediaRec=null, recChunks=[], recStart=0, recTimer=null, recTracks=null;
const recBtn=document.getElementById("recBtn");
function pickMime(){ const arr=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4;codecs=h264,aac','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(const m of arr) if(window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m; return ''; }
// MediaRecorder writes fragmented mp4 with duration=0 in moov — some players (Telegram) refuse such files.
// Patch mvhd/tkhd/mdhd durations in place (fixed-size fields, no bytes are moved, so offsets stay valid).
function patchMp4Duration(ab, durMs){
  try{
    const dv=new DataView(ab), u8=new Uint8Array(ab);
    const rd32=o=>dv.getUint32(o), typ=o=>String.fromCharCode(u8[o+4],u8[o+5],u8[o+6],u8[o+7]);
    function children(start,end,cb){ let o=start;
      while(o+8<=end){ let sz=rd32(o); const t=typ(o);
        if(sz===1) sz=Number(dv.getBigUint64(o+8)); else if(sz===0) sz=end-o;
        if(sz<8||o+sz>end) break; cb(t,o,o+sz); o+=sz; } }
    let moovS=-1,moovE=-1;
    children(0,ab.byteLength,(t,s,e)=>{ if(t==='moov'){moovS=s;moovE=e;} });
    if(moovS<0) return false;
    let movTs=0; const patches=[];
    children(moovS+8,moovE,(t,s,e)=>{
      if(t==='mvhd'){ const v=u8[s+8];
        if(v===1){ movTs=rd32(s+28); patches.push({off:s+32,big:true,mov:true}); }
        else{ movTs=rd32(s+20); patches.push({off:s+24,big:false,mov:true}); } }
      if(t==='trak') children(s+8,e,(t2,s2,e2)=>{
        if(t2==='tkhd'){ const v=u8[s2+8];
          patches.push(v===1?{off:s2+36,big:true,mov:true}:{off:s2+28,big:false,mov:true}); }
        if(t2==='mdia') children(s2+8,e2,(t3,s3)=>{
          if(t3==='mdhd'){ const v=u8[s3+8];
            if(v===1) patches.push({off:s3+32,big:true,ts:rd32(s3+28)});
            else      patches.push({off:s3+24,big:false,ts:rd32(s3+20)}); } }); }); });
    if(!movTs) return false;
    for(const p of patches){ const ticks=Math.round(durMs/1000*(p.mov?movTs:p.ts));
      if(p.big) dv.setBigUint64(p.off,BigInt(ticks)); else dv.setUint32(p.off,Math.min(ticks,0xffffffff)); }
    return true;
  }catch(e){ return false; }
}
function startRecording(){
  initAudio(); resumeAudio();
  if(!window.MediaRecorder){ alert(t('rec.noSupport')); return; }
  const vtr = viz.recCanvas.captureStream ? viz.recCanvas.captureStream(30).getVideoTracks() : [];
  let atr = recDest ? recDest.stream.getAudioTracks() : [];
  if(!atr.length && actx){ try{ recDest=actx.createMediaStreamDestination(); comp.connect(recDest); atr=recDest.stream.getAudioTracks(); }catch(e){} }   // re-tap if the audio feed died
  const stream = new MediaStream([...vtr, ...atr]);
  viz.startRec();
  const mime=pickMime();
  const opts={videoBitsPerSecond:3000000}; if(mime) opts.mimeType=mime;   // ~720p, small share-friendly files; audio bitrate left to the encoder default
  try{ mediaRec = new MediaRecorder(stream, opts); }
  catch(e){ try{ mediaRec = new MediaRecorder(stream, mime?{mimeType:mime}:undefined); }             // some WebViews reject bitrate opts
    catch(e2){ alert(t('rec.unavailable')+e2.message); viz.stopRec(); return; } }
  recTracks={a:stream.getAudioTracks().length, v:stream.getVideoTracks().length};
  recChunks=[];
  mediaRec.ondataavailable=e=>{ if(e.data && e.data.size) recChunks.push(e.data); };
  mediaRec.onstop=()=>{ viz.stopRec(); const durMs=Date.now()-recStart;
    const blob=new Blob(recChunks,{type:mediaRec.mimeType||'video/webm'});
    if((blob.type||'').indexOf('mp4')>=0 && blob.arrayBuffer)
      blob.arrayBuffer().then(ab=>finishRecording(patchMp4Duration(ab,durMs)?new Blob([ab],{type:blob.type}):blob))
        .catch(()=>finishRecording(blob));
    else finishRecording(blob);
  };
  mediaRec.start(500);                              // timeslice — data is collected as it goes
  recStart=Date.now(); recBtn.classList.add('rec');
  recTimer=setInterval(()=>{ const s=Math.floor((Date.now()-recStart)/1000); recBtn.textContent=t('btn.recStop')+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); },250);
}
function stopRecording(){ if(mediaRec && mediaRec.state!=='inactive') mediaRec.stop(); clearInterval(recTimer); recBtn.classList.remove('rec'); recBtn.textContent=t('btn.rec'); }
let lastBlob=null, lastFile=null, lastUrl=null;
function finishRecording(blob){
  lastBlob=blob;
  const ext=(mediaRec && mediaRec.mimeType && mediaRec.mimeType.indexOf('mp4')>=0)?'mp4':'webm';
  const base = ext==='mp4'?'video/mp4':'video/webm';     // clean MIME without codecs — otherwise share() may complain
  lastFile=new File([blob],'jam.'+ext,{type:base});
  if(lastUrl) URL.revokeObjectURL(lastUrl); lastUrl=URL.createObjectURL(blob);
  const v=document.getElementById('recVid'); v.src=lastUrl;
  document.getElementById('recInfo').textContent = (blob.size
    ? t('rec.size',{kb:(blob.size/1024).toFixed(0),type:(blob.type||'').split(';')[0]})
    : t('rec.empty'))
    + (recTracks ? ' · A'+recTracks.a+'/V'+recTracks.v : '')
    + (recTracks && !recTracks.a ? ' ⚠ no audio track' : '');   // diagnostics: track counts straight in the info line
  const sh=document.getElementById('recShare');
  sh.style.display = (navigator.canShare && navigator.canShare({files:[lastFile]})) ? '' : 'none';
  document.getElementById('recov').classList.remove('hidden');
}
const SHARE_URL='https://gromozeka1980.github.io/jamlab/';   // TODO: swap for the Play Store link after release
const SHARE_TEXT="My jam in Jamlab — an instrument where you can't hit a wrong note 🎶 "+SHARE_URL;
document.getElementById('recShare').addEventListener('click',()=>{   // strictly synchronous call inside the gesture
  if(!lastFile) return;
  const info=document.getElementById('recInfo');
  if(!(navigator.canShare && navigator.canShare({files:[lastFile]}))){ info.textContent=t('rec.shareUnsupported'); return; }
  navigator.share({files:[lastFile], title:'Jamlab', text:SHARE_TEXT}).catch(e=>{ if(e && e.name!=='AbortError')
    info.textContent = (e.name==='NotAllowedError')
      ? t('rec.shareDenied')
      : t('rec.shareErr',{name:e.name||'',msg:e.message||''}); });
});
document.getElementById('recSave').addEventListener('click',()=>{ if(!lastBlob) return; const a=document.createElement('a'); a.href=lastUrl; a.download=lastFile.name; document.body.appendChild(a); a.click(); a.remove(); });
document.getElementById('recClose').addEventListener('click',()=>{ const v=document.getElementById('recVid'); v.pause(); document.getElementById('recov').classList.add('hidden'); });
recBtn.addEventListener('click',()=>{ if(mediaRec && mediaRec.state==='recording') stopRecording(); else startRecording(); });

/* ============ Instrument picker and start ============ */
const overlay=document.getElementById("overlay");
document.querySelectorAll(".pick").forEach(p=>p.addEventListener("click",()=>{
  initAudio(); resumeAudio();
  if(settings.gyro!=='off') enableGyro();   // restored gyro pref needs a user gesture to attach
  if(accOn) stopBacking();              // so the backing doesn't double up on a repeat pick
  setMode(p.dataset.mode);
  overlay.style.display="none";
  updateDisplay(); startBacking();
  try{ if(!localStorage.getItem('jamlab.helpSeen')){ localStorage.setItem('jamlab.helpSeen','1'); helpEl.classList.remove('hidden'); } }catch(e){}  // first-run tutorial
}));
// back to the style-picker start screen
document.getElementById("homeBtn").addEventListener("click",()=>{ if(accOn) stopBacking(); overlay.style.display="flex"; });

// initial build (under the overlay)
applyPrefsToControls();
populateHarmRhythm();
setMode('blues');
refreshLabels();
document.addEventListener("gesturestart",e=>e.preventDefault());
document.addEventListener("contextmenu",e=>e.preventDefault());
document.addEventListener("touchend",resumeAudio,{passive:true});
document.addEventListener("visibilitychange",()=>{ if(!document.hidden) resumeAudio(); });
