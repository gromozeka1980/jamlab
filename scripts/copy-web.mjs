// Copies the web app into the Capacitor webDir (www/).
// The source of truth is the repo root (also served as-is by GitHub Pages).
// www/ is generated, not committed — run `npm run build:web` before `cap sync`.
import { mkdir, copyFile, readdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const www = resolve(root, 'www');

// Static assets to ship inside the native bundle.
// Add new entries here (icons, audio packs, etc.) as they appear.
const ASSETS = ['index.html', 'style.css', 'app.js', 'i18n.js', 'settings.js', 'modes.js', 'audio.js', 'viz.js', 'rec.js', 'paywall.js', 'tutorial.js', 'analytics.js'];

await rm(www, { recursive: true, force: true });
await mkdir(www, { recursive: true });
for (const name of ASSETS) {
  await copyFile(resolve(root, name), resolve(www, name));
  console.log(`copied ${name} -> www/${name}`);
}
console.log(`web assets ready in ${www}`);
