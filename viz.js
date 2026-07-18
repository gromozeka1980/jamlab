// Visualizer: live overlay (transparent, on top of the UI) + the opaque recording scene
// (sounding note, melody ribbon, watermark) rendered on an offscreen ~720p canvas.
import { t } from './i18n.js';

export function hexToRgb(h){ h=(h||'').trim().replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h||'888888',16); return [(n>>16)&255,(n>>8)&255,n&255]; }
export function cssRgb(v){ return hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(v)); }

// Test-tube-note brand mark for the recording watermark — same geometry as the app-icon logo
// (logo.svg local space, bbox ~x[368..660] y[179..723], centre ~(500,451)), scaled to unit k.
const LOGO_BUB=[[509,185,6],[515,216,13],[528,260,23],[513,311,16],[538,338,10],[523,375,23],[507,417,11],[538,414,9],[566,280,8],[562,313,16],[595,304,5],[603,345,19],[635,357,4],[629,385,15],[628,419,5],[651,413,9],[648,444,12],[644,474,10],[628,495,6],[611,519,4]];
const LOGO_BHL=[[521,252,7,0.9],[516,367,7,0.85],[597,339,6,0.8],[624,380,5,0.75],[644,440,4,0.7],[557,308,5,0.75]];
function rrp(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function _rr(c,x,y,w,h,r){ rrp(c,x,y,w,h,r); c.fill(); }
export function drawTubeNote(c, cx, cy, k){
  const S=k*0.033, X=lx=>cx+(lx-500)*S, Y=ly=>cy+(ly-451)*S, R=r=>r*S;
  c.fillStyle='#8f6fff';
  for(const [x,y,r] of LOGO_BUB){ c.beginPath(); c.arc(X(x),Y(y),R(r),0,6.2832); c.fill(); }
  for(const [x,y,r,a] of LOGO_BHL){ c.globalAlpha=a; c.fillStyle='#e4dcff'; c.beginPath(); c.arc(X(x),Y(y),R(r),0,6.2832); c.fill(); }
  c.globalAlpha=1;
  c.fillStyle='#6d4aff'; _rr(c, X(489),Y(482),R(54),R(186),R(12));      // tube
  c.fillStyle='#7c5cff'; _rr(c, X(492),Y(512),R(48),R(148),R(12));      // liquid
  c.globalAlpha=0.55; c.fillStyle='#d9d0ff'; _rr(c, X(495),Y(492),R(8),R(160),R(4)); c.globalAlpha=1;   // glass sheen
  c.fillStyle='#7c5cff'; _rr(c, X(480),Y(466),R(72),R(24),R(11));       // rim
  c.fillStyle='#a78bfa'; _rr(c, X(480),Y(466),R(72),R(11),R(5));
  c.save(); c.translate(X(456),Y(661)); c.rotate(-0.279);               // note head (rotated -16°)
  c.fillStyle='#6d4aff'; c.beginPath(); c.ellipse(0,0,R(88),R(62),0,0,6.2832); c.fill();
  c.globalAlpha=0.75; c.fillStyle='#cabdff'; c.beginPath(); c.ellipse(R(-32),R(-24),R(30),R(16),0,0,6.2832); c.fill(); c.globalAlpha=1;
  c.restore();
}

export const viz=(()=>{
  const cv=document.getElementById('viz'), ctx=cv.getContext('2d'); let W=1,H=1,dpr=1;
  // recording renders on its own high-res canvas, independent of screen dpr
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
  function melodyBend(p01){ if(MEL.length){ const m=MEL[MEL.length-1]; m.p=p01; m.hue=205-160*p01; } }   // bend drags the last ribbon point
  // live performance state fed by the app — drawn only in the recording scene
  let liveTxt=null, liveBend=0, heldKeys=[];
  function liveNote(txt,bend){ liveTxt=txt; liveBend=bend||0; }
  function keysHeld(a){ heldKeys=a||[]; }
  // keyboard mirror: the video draws the real key grid and lights up taps
  let keymap=null, keymapProvider=null, activeOffs=new Set(); const tapAt={};
  function setKeymapProvider(fn){ keymapProvider=fn; }
  function keysActive(offs){ const s=new Set(offs);                    // new presses since last call → start a tap pulse
    for(const o of s) if(!activeOffs.has(o)) tapAt[o]=performance.now();
    activeOffs=s; }
  function drawParticles(c,s){ c.globalCompositeOperation='lighter';
    for(let i=0;i<P.length;i++){ const p=P[i], al=(p.life*(p.ring?0.5:0.85)).toFixed(3), col='rgba('+p.rgb[0]+','+p.rgb[1]+','+p.rgb[2]+','+al+')';
      c.beginPath(); c.arc(p.x*s,p.y*s,p.r*s,0,6.2832);
      if(p.ring){ c.strokeStyle=col; c.lineWidth=2.5*s; c.stroke(); } else { c.fillStyle=col; c.fill(); } }
    c.globalCompositeOperation='source-over'; }
  function drawLive(){ ctx.clearRect(0,0,W,H);
    if(beat>0.02){ const g=ctx.createRadialGradient(W/2,H*1.05,0,W/2,H*1.05,H*0.9);
      g.addColorStop(0,'rgba(255,255,255,'+(beat*0.05).toFixed(3)+')'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
    drawParticles(ctx,dpr); }
  function drawRec(){ const c=rctx, s=RS, now=performance.now();
    // background gradient + vignette
    const bg1=cssRgb('--bg1'), bg0=cssRgb('--bg'), g=c.createLinearGradient(0,0,0,RH);
    g.addColorStop(0,'rgb('+bg1[0]+','+bg1[1]+','+bg1[2]+')'); g.addColorStop(1,'rgb('+bg0[0]+','+bg0[1]+','+bg0[2]+')');
    c.fillStyle=g; c.fillRect(0,0,RW,RH);
    const vg=c.createRadialGradient(RW/2,RH*0.42,RH*0.18,RW/2,RH*0.5,RH*0.78);
    vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.30)'); c.fillStyle=vg; c.fillRect(0,0,RW,RH);
    if(beat>0.02){ const bp=c.createRadialGradient(RW/2,RH*1.05,0,RW/2,RH*1.05,RH*0.9);
      bp.addColorStop(0,'rgba(255,255,255,'+(beat*0.09).toFixed(3)+')'); bp.addColorStop(1,'rgba(255,255,255,0)'); c.fillStyle=bp; c.fillRect(0,0,RW,RH); }
    const acc=cssRgb('--accent');
    // where the mirrored keyboard starts (from the snapshot); the ribbon + note live in the band above it
    const km = keymap && keymap.keys && keymap.keys.length ? keymap.keys : null;
    let kTop=RH*0.52; if(km){ kTop=RH; for(const k of km) kTop=Math.min(kTop,k.y*RH); }
    // title
    c.textAlign='center'; c.textBaseline='alphabetic';
    c.fillStyle='rgba('+acc[0]+','+acc[1]+','+acc[2]+',0.92)'; c.font='600 '+Math.round(17*s)+'px system-ui,sans-serif';
    c.fillText(document.getElementById('h1name').textContent||'', RW/2, 30*s);
    c.fillStyle='rgba(230,232,245,0.55)'; c.font='400 '+Math.round(11*s)+'px system-ui,sans-serif';
    c.fillText((document.getElementById('h1sub').textContent||'').replace(/^·\s*/,''), RW/2, 48*s);
    // melody ribbon — scrolls right→left over ~7s, in the band above the keys
    const WIN=7000, xR=RW*0.88, span=RW*0.76, yBot=kTop-30*s, yTop=Math.max(RH*0.16, kTop-Math.min(kTop*0.5, RH*0.26)), pts=[];
    for(let i=0;i<MEL.length;i++){ const m=MEL[i], ag=(now-m.t)/WIN; if(ag>1) continue;
      pts.push({x:xR-ag*span, y:yBot-(yBot-yTop)*m.p, hue:m.hue, al:1-ag}); }
    c.globalCompositeOperation='lighter'; c.lineCap='round'; c.lineJoin='round';
    for(let i=1;i<pts.length;i++){ const q=pts[i-1], p=pts[i], al=Math.min(q.al,p.al);
      c.strokeStyle='hsla('+p.hue+',90%,62%,'+(al*0.20).toFixed(3)+')'; c.lineWidth=9*s;
      c.beginPath(); c.moveTo(q.x,q.y); c.lineTo(p.x,p.y); c.stroke();
      c.strokeStyle='hsla('+p.hue+',90%,68%,'+(al*0.75).toFixed(3)+')'; c.lineWidth=2.6*s;
      c.beginPath(); c.moveTo(q.x,q.y); c.lineTo(p.x,p.y); c.stroke(); }
    for(let i=0;i<pts.length;i++){ const p=pts[i];
      c.fillStyle='hsla('+p.hue+',90%,66%,'+(p.al*0.28).toFixed(3)+')'; c.beginPath(); c.arc(p.x,p.y,8*s,0,6.2832); c.fill();
      c.fillStyle='hsla('+p.hue+',95%,74%,'+(p.al*0.95).toFixed(3)+')'; c.beginPath(); c.arc(p.x,p.y,3.4*s,0,6.2832); c.fill(); }
    c.globalCompositeOperation='source-over';
    // sounding note name, centred in the band above the keys; bends tint it (up=accent, down=cyan)
    if(liveTxt){ const pop=1+0.22*Math.exp(-(now-lastNoteAt)/160);
      c.save(); c.translate(RW/2,(yTop+yBot)/2); c.scale(pop,pop); c.textAlign='center'; c.textBaseline='middle';
      c.fillStyle= liveBend>0?'#ffd43b':liveBend<0?'#4dd0e1':'rgba(255,255,255,0.95)';
      c.font='800 '+Math.round(46*s)+'px system-ui,sans-serif'; c.fillText(liveTxt,0,0); c.restore(); }
    // the keyboard, mirrored from the app, lighting up the keys you tap
    if(km){ c.textBaseline='middle';
      for(const k of km){ const x=k.x*RW,y=k.y*RH,w=k.w*RW,h=k.h*RH, r=Math.min(15*s,w*0.16);
        const on=activeOffs.has(k.off), tp=tapAt[k.off]?Math.exp(-(now-tapAt[k.off])/240):0, lit=Math.max(on?1:0,tp);
        const base = k.cls==='neg'?[77,120,235]: k.cls==='pos'?[235,110,40]:[150,155,180];
        c.fillStyle='rgba('+base[0]+','+base[1]+','+base[2]+','+(0.10+0.30*lit).toFixed(3)+')'; rrp(c,x,y,w,h,r); c.fill();
        if(lit>0.02){ c.save(); c.globalCompositeOperation='lighter';
          c.fillStyle='rgba('+base[0]+','+base[1]+','+base[2]+','+(0.45*lit).toFixed(3)+')'; rrp(c,x,y,w,h,r); c.fill(); c.restore(); }
        let ol=base; if(on&&liveBend>0)ol=[255,212,59]; else if(on&&liveBend<0)ol=[77,208,225];
        c.strokeStyle='rgba('+ol[0]+','+ol[1]+','+ol[2]+','+(0.30+0.6*lit).toFixed(3)+')'; c.lineWidth=(1.5+1.5*lit)*s; rrp(c,x,y,w,h,r); c.stroke();
        c.fillStyle= lit>0.4?'#fff':'rgba(236,234,243,0.88)'; c.textAlign='center';
        c.font='800 '+Math.round(Math.min(h*0.30,30*s))+'px system-ui,sans-serif'; c.fillText(k.offTxt||'', x+w/2, y+h*0.40);
        if(k.lead){ c.fillStyle='rgba(236,234,243,0.5)'; c.font='600 '+Math.round(Math.min(h*0.15,13*s))+'px system-ui,sans-serif'; c.fillText(k.lead, x+w/2, y+h*0.66); } }
    }
    // touch splashes (emitted at the real key positions on tap)
    drawParticles(c,s);
    // watermark at the very bottom
    const bottomSafe=Math.max(46*s, RH*0.11), domY=RH-bottomSafe, tag=t('wm.tag');
    if(tag){ c.globalAlpha=0.72; c.textAlign='center'; c.textBaseline='middle'; c.font='600 '+Math.round(12.5*s)+'px system-ui,sans-serif';
      c.fillStyle='rgb('+acc[0]+','+acc[1]+','+acc[2]+')'; c.fillText(tag, RW/2, domY-22*s); }
    c.globalAlpha=0.85; c.font='700 '+Math.round(16*s)+'px system-ui,sans-serif'; c.textAlign='left'; c.textBaseline='middle';
    const wmTxt='jambrew.app', tw=c.measureText(wmTxt).width, k2=1.25*s, lw=11*k2, gap=9*s, x0=(RW-(lw+gap+tw))/2;
    drawTubeNote(c, x0+lw*0.5, domY, k2); c.fillStyle='#eceaf3'; c.fillText(wmTxt, x0+lw+gap, domY); c.globalAlpha=1;
  }
  function frame(){ size();
    for(let i=P.length-1;i>=0;i--){ const p=P[i]; p.r+=p.vr; p.y+=p.vy; p.vy*=0.985; p.life-=p.dl; if(p.life<=0) P.splice(i,1); }
    drawLive();
    if(recording) drawRec();
    beat*=0.88;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {note,spark,pulse,melody,melodyBend,liveNote,keysHeld,setKeymapProvider,keysActive, recCanvas:rec,
    startRec(){ keymap = keymapProvider ? keymapProvider() : null; activeOffs=new Set(); recording=true; },   // snapshot the key layout while it's stable
    stopRec(){ recording=false; }};
})();
