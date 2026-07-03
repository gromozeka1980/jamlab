// Recording → shareable video: capture the viz recording scene + master audio,
// fix mp4 metadata for messenger players, preview overlay, share/download.
import { t } from './i18n.js';
import { viz } from './viz.js';
import { actx, comp, recDest, initAudio, resumeAudio } from './audio.js';

const REC_MAX_MS=5*60*1000;
let mediaRec=null, recChunks=[], recStart=0, recTimer=null, recTracks=null;
let tapDest=null;                                   // local fallback tap if the shared recDest feed died
const recBtn=document.getElementById("recBtn");
export function isRecording(){ return !!(mediaRec && mediaRec.state==='recording'); }
export function refreshRecLabel(){ if(!isRecording()) recBtn.textContent=t('btn.rec'); }

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
  const dest = tapDest || recDest;
  let atr = dest ? dest.stream.getAudioTracks() : [];
  if(!atr.length && actx){ try{ tapDest=actx.createMediaStreamDestination(); comp.connect(tapDest); atr=tapDest.stream.getAudioTracks(); }catch(e){} }   // re-tap if the audio feed died
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
  recTimer=setInterval(()=>{ const ms=Date.now()-recStart;
    if(ms>=REC_MAX_MS){ stopRecording(); return; }  // chunks live in memory — cap the clip length
    const s=Math.floor(ms/1000); recBtn.textContent=t('btn.recStop')+Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); },250);
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
recBtn.addEventListener('click',()=>{ if(isRecording()) stopRecording(); else startRecording(); });
