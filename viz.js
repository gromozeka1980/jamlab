// Visualizer: live overlay (transparent, on top of the UI) + the opaque recording scene
// (sounding note, melody ribbon, watermark) rendered on an offscreen ~720p canvas.

export function hexToRgb(h){ h=(h||'').trim().replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h||'888888',16); return [(n>>16)&255,(n>>8)&255,n&255]; }
export function cssRgb(v){ return hexToRgb(getComputedStyle(document.documentElement).getPropertyValue(v)); }

// Compact test-tube-note brand mark, centred on (cx,cy), unit k (~14k tall). Used by the watermark.
export function drawTubeNote(c, cx, cy, k){
  const sx=cx+1.2*k;                                   // tube centre x
  // bubbles rising & arcing (the note flag)
  c.fillStyle='#b39dff';
  [[0.2,-6.2,1.5],[1.8,-8.0,1.1],[3.1,-9.2,0.8],[-0.4,-7.6,0.7]].forEach(([dx,dy,r])=>{
    c.beginPath(); c.arc(sx+dx*k, cy+dy*k, r*k, 0, 6.2832); c.fill(); });
  // tube (stem)
  c.strokeStyle='#6d4aff'; c.lineWidth=2.4*k; c.lineCap='round';
  c.beginPath(); c.moveTo(sx, cy+4.4*k); c.lineTo(sx, cy-4.6*k); c.stroke();
  c.strokeStyle='#a98fff'; c.lineWidth=2.4*k;           // lighter rim at the mouth
  c.beginPath(); c.moveTo(sx-1.3*k, cy-4.6*k); c.lineTo(sx+1.3*k, cy-4.6*k); c.stroke();
  // note head
  c.save(); c.translate(cx-1.6*k, cy+4.8*k); c.rotate(-0.32);
  c.fillStyle='#7c5cff'; c.beginPath(); c.ellipse(0,0,3.6*k,2.7*k,0,0,6.2832); c.fill();
  c.fillStyle='#cabdff'; c.globalAlpha=0.75; c.beginPath(); c.ellipse(-1.1*k,-0.9*k,1.1*k,0.7*k,0,0,6.2832); c.fill(); c.globalAlpha=1;
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
    drawParticles(c,s);
    const cx=RW/2, cy=RH*0.30;
    // sounding note (nothing while silent); bends tint it — up=accent, down=cyan
    if(liveTxt){
      const pop=1+0.22*Math.exp(-(now-lastNoteAt)/160);
      c.save(); c.translate(cx,cy); c.scale(pop,pop); c.textAlign='center'; c.textBaseline='middle';
      c.fillStyle= liveBend>0?'#ffd43b':liveBend<0?'#4dd0e1':'rgba(255,255,255,0.95)';
      c.font='800 '+Math.round(40*s)+'px system-ui,sans-serif';
      c.fillText(liveTxt,0,0); c.restore();
    }
    // held key offsets under the note (+1  −2 …)
    if(heldKeys.length){ c.textAlign='center'; c.textBaseline='middle';
      c.fillStyle='rgba(230,232,245,0.75)'; c.font='800 '+Math.round(26*s)+'px system-ui,sans-serif';
      c.fillText(heldKeys.join('   '), cx, cy+52*s); }
    // titles
    const acc=cssRgb('--accent'); c.textAlign='center'; c.textBaseline='alphabetic';
    c.fillStyle='rgba('+acc[0]+','+acc[1]+','+acc[2]+',0.92)'; c.font='600 '+Math.round(17*s)+'px system-ui,sans-serif';
    c.fillText(document.getElementById('h1name').textContent||'', RW/2, 30*s);
    c.fillStyle='rgba(230,232,245,0.55)'; c.font='400 '+Math.round(11*s)+'px system-ui,sans-serif';
    c.fillText((document.getElementById('h1sub').textContent||'').replace(/^·\s*/,''), RW/2, 48*s);
    // watermark: test-tube note logo + wordmark
    c.globalAlpha=0.82; c.font='700 '+Math.round(16*s)+'px system-ui,sans-serif'; c.textAlign='left'; c.textBaseline='middle';
    const wmTxt='Jamlab', tw=c.measureText(wmTxt).width, k=1.25*s, lw=11*k, gap=9*s, x0=(RW-(lw+gap+tw))/2, wmY=RH-24*s;
    drawTubeNote(c, x0+lw*0.5, wmY-4*s, k);
    c.globalAlpha=0.82; c.fillStyle='#eceaf3'; c.fillText(wmTxt, x0+lw+gap, wmY-4*s);
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
  return {note,spark,pulse,melody,melodyBend,liveNote,keysHeld, recCanvas:rec, startRec(){recording=true;}, stopRec(){recording=false;}};
})();
