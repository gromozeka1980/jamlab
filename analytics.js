// Privacy-light event analytics (Aptabase-compatible wire format).
// Until APTABASE_KEY is set (TODO, like RC_API_KEY in paywall.js) nothing leaves the device —
// events are only echoed to the console on localhost so the funnel can be eyeballed in dev.
// No user ids, no fingerprinting: a per-launch random session id, event name, coarse props.

export const APTABASE_KEY = '';            // TODO: A-EU-... / A-US-... once the Aptabase app is created
const HOST = 'https://eu.aptabase.com';    // switch to us.aptabase.com if the app is registered there

const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const t0 = Date.now();
export function sinceLaunch(){ return Math.round((Date.now() - t0) / 1000); }   // seconds, for time-to-first-note

const seen = new Set();
export function track(name, props){
  try{
    if(!APTABASE_KEY){
      if(location.hostname === 'localhost') console.debug('[jamlab ev]', name, props || {});
      return;
    }
    fetch(HOST + '/api/v0/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'App-Key': APTABASE_KEY },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        sessionId: sid,
        eventName: name,
        systemProps: { isDebug: false, locale: (navigator.language || 'en'), appVersion: '1.0.0', osName: NATIVE ? 'Android' : 'Web' },
        props: props || {},
      }),
    }).catch(() => {});
  }catch(e){}
}
// fire an event only once per session (activation-style metrics: first_note, bend_used, ...)
export function trackOnce(name, props){ if(seen.has(name)) return; seen.add(name); track(name, props); }
