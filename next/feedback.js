// Feedback plumbing: opens a prefilled email to hello@jambrew.app (with app version + device baked in,
// so every report is actionable) and the Telegram group. Used from Settings and from the paywall's
// "something wrong? write us" line. mailto is handled natively by the Android WebView (mail intent);
// Telegram opens externally via window.open(_blank).
import { t } from './i18n.js';

const CAP = window.Capacitor;
const NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const APP = (NATIVE && CAP.Plugins) ? CAP.Plugins.App : null;

export const FEEDBACK_EMAIL = 'hello@jambrew.app';
export const TELEGRAM_URL = 'https://t.me/jambrew';   // the real JamBrew community group

async function versionStr(){
  try{ if(APP){ const i = await APP.getInfo(); return i.version + ' (' + i.build + ')'; } }catch(e){}
  return NATIVE ? 'native' : 'web';
}

// kind: 'problem' (from the paywall) or 'feedback' (from Settings) — only tweaks the subject.
export async function openFeedback(kind){
  const v = await versionStr();
  const subject = 'JamBrew — ' + (kind === 'problem' ? t('feedback.subjProblem') : t('feedback.subjFeedback'));
  const body = '\n\n\n————————\n' + t('feedback.bodyPrompt')
    + '\nversion: ' + v
    + '\ndevice: ' + (navigator.userAgent || '');
  const href = 'mailto:' + FEEDBACK_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const a = document.createElement('a'); a.href = href; document.body.appendChild(a); a.click(); a.remove();
}

export function openTelegram(){ try{ window.open(TELEGRAM_URL, '_blank'); }catch(e){} }
