// Paywall: free-tier gating + RevenueCat billing glue (via the Capacitor bridge, no bundler).
// Free tier: East fully + Blues in its canonical form (Major × Shuffle). Everything else is Pro.
// The web build stays fully open (it is the demo); add ?paywall to the URL to preview the locks in a browser.
import { t } from './i18n.js';

const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const RC = (NATIVE && window.Capacitor.Plugins) ? window.Capacitor.Plugins.Purchases : null;
const RC_API_KEY = '';                       // TODO: RevenueCat public Google key (goog_…) once the account is wired up
const ENTITLEMENT = 'pro';

export const FREE_MODES = new Set(['blues','vostok']);
export const FREE_BLUES = { harmony:new Set(['major']), rhythm:new Set(['shuffle']) };
const GATED = NATIVE || new URLSearchParams(location.search).has('paywall');

let pro=false; try{ pro = localStorage.getItem('jamlab.pro')==='1'; }catch(e){}
const listeners=[];
export function onProChange(fn){ listeners.push(fn); }
export function isPro(){ return pro || !GATED; }
export function modeLocked(id){ return !isPro() && !FREE_MODES.has(id); }
export function bluesLocked(kind,val){ return !isPro() && FREE_BLUES[kind] && !FREE_BLUES[kind].has(val); }
function setPro(v){ pro=!!v; try{ v?localStorage.setItem('jamlab.pro','1'):localStorage.removeItem('jamlab.pro'); }catch(e){}
  listeners.forEach(f=>{ try{f();}catch(e){} }); }

/* --- RevenueCat --- */
let pkgObj=null, priceStr='$4.99';
function applyCustomerInfo(res){ const ent=res && res.customerInfo && res.customerInfo.entitlements;
  const active=!!(ent && ent.active && ent.active[ENTITLEMENT]);
  if(active!==pro) setPro(active);
  return active; }
export async function initBilling(){
  if(!RC || !RC_API_KEY) return;
  try{
    await RC.configure({ apiKey: RC_API_KEY });
    applyCustomerInfo(await RC.getCustomerInfo());                       // promo codes / reinstalls pick Pro up here
    const off=await RC.getOfferings();
    const pkg=off && off.current && off.current.availablePackages && off.current.availablePackages[0];
    if(pkg){ pkgObj=pkg; const pr=pkg.product && pkg.product.priceString; if(pr) priceStr=pr; }
  }catch(e){}
}

/* --- sheet UI --- */
const pwEl=document.getElementById('paywall'), pwNote=document.getElementById('pwNote'), pwBuy=document.getElementById('pwBuy');
export function showPaywall(){
  pwBuy.textContent=t('pw.buy',{price:priceStr});
  pwNote.textContent = !NATIVE ? t('pw.webNote') : (!RC_API_KEY ? t('pw.soon') : '');
  pwEl.classList.remove('hidden');
}
function hidePaywall(){ pwEl.classList.add('hidden'); }
pwBuy.addEventListener('click', async ()=>{
  if(!NATIVE){ pwNote.textContent=t('pw.webNote'); return; }
  if(!RC || !RC_API_KEY || !pkgObj){ pwNote.textContent=t('pw.soon'); return; }
  try{
    const res=await RC.purchasePackage({ aPackage: pkgObj });
    if(applyCustomerInfo(res)){ pwNote.textContent=t('pw.thanks'); setTimeout(hidePaywall,900); }
  }catch(e){ if(!(e && e.userCancelled)) pwNote.textContent=t('pw.err'); }
});
document.getElementById('pwRestore').addEventListener('click', async ()=>{
  if(!NATIVE || !RC || !RC_API_KEY){ pwNote.textContent = !NATIVE ? t('pw.webNote') : t('pw.soon'); return; }
  try{
    const res=await RC.restorePurchases();
    pwNote.textContent = applyCustomerInfo(res) ? t('pw.thanks') : t('pw.restNo');
    if(isPro()) setTimeout(hidePaywall,900);
  }catch(e){ pwNote.textContent=t('pw.err'); }
});
document.getElementById('pwClose').addEventListener('click', hidePaywall);
