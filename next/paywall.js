// Paywall: free-tier gating + RevenueCat billing glue (via the Capacitor bridge, no bundler).
// Free tier: Bright and Koto — the friendly daily playground (decision 2026-07-12: the crown jewels
// moved behind the wall because the 60s taste took over the shop-window job). Everything else is Pro,
// playable as a taste (see app.js) — except the KITCHEN: Jazz & Lab are the insider experiments,
// pitched as "keys to the lab", no window-licking.
// The open web build is a temporary private preview, NOT a public demo (the product ships as a paid app);
// add ?paywall to the URL to preview the locks in a browser.
// RC is the source of truth: initBilling() re-checks the entitlement on every start, localStorage only caches it.
import { t } from './i18n.js';
import { track } from './analytics.js';

const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const RC = (NATIVE && window.Capacitor.Plugins) ? window.Capacitor.Plugins.Purchases : null;
const RC_API_KEY = 'goog_JbBQSnxeHEiPhmMwPoFugVoUCYO';   // RevenueCat public Play key (safe to ship in the client)
const ENTITLEMENT = 'Jambrew Pro';           // matches the entitlement identifier created in the RC dashboard

export const FREE_MODES = new Set(['light','koto']);
export const KITCHEN = new Set(['jazz','lab','lofi']);      // pro-only experiments: no taste, straight to the offer
const GATED = NATIVE || new URLSearchParams(location.search).has('paywall');

let pro=false; try{ pro = localStorage.getItem('jamlab.pro')==='1'; }catch(e){}
const listeners=[];
export function onProChange(fn){ listeners.push(fn); }
export function isPro(){ return pro || !GATED; }
export function modeLocked(id){ return !isPro() && !FREE_MODES.has(id); }
function setPro(v){ pro=!!v; try{ v?localStorage.setItem('jamlab.pro','1'):localStorage.removeItem('jamlab.pro'); }catch(e){}
  listeners.forEach(f=>{ try{f();}catch(e){} }); }

/* --- RevenueCat --- */
let pkgObj=null, priceStr='$4';   // placeholder only — the real price comes from RevenueCat/Play once billing is live
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
export function showPaywall(tasteName){ track('paywall_view', tasteName?{via:'taste'}:undefined);
  // after a taste the offer is personal: "Enjoying Gamelan?" instead of the generic title
  pwEl.querySelector('h3').textContent = tasteName ? t('pw.tasteT',{name:tasteName}) : t('pw.title');
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
    if(applyCustomerInfo(res)){ track('purchase_done'); pwNote.textContent=t('pw.thanks'); setTimeout(hidePaywall,900); }
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
