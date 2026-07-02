// Visualizer: live overlay (transparent, on top of the UI) + the opaque recording scene
// (spectrum ring, melody ribbon, watermark) rendered on an offscreen ~720p canvas.
import { anl } from './audio.js';   // live binding — assigned by initAudio()

export function hexToRgb(h){ h=(h||'').trim().replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h||'888888',16); return [(n>>16)&255,(n>>8)&255,n&255]; }
export function cssRgb(v){ return hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(v)); }

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
