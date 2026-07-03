# Jamlab — mobile build (Capacitor)

The app is a static vanilla-JS site (`index.html` + `style.css` + `app.js` +
`i18n.js`, Web Audio, ES modules, no build step). For the native iOS/Android
builds we wrap it with [Capacitor](https://capacitorjs.com/) — no rewrite, the
same web codebase runs inside a WebView.

- **Source of truth:** the repo root (also served by GitHub Pages).
- **Capacitor webDir:** `www/` — *generated* by `scripts/copy-web.mjs`
  (its `ASSETS` list names every file that ships).
  It is git-ignored; regenerate it with `npm run build:web`.
- **App id:** `app.gromozeka.jamlab` · **App name:** `Jamlab` (working title).
- Native projects (`android/`, `ios/`) are generated on demand via `cap add` and
  are git-ignored — run the commands below to recreate them on a fresh checkout.

## One-time setup

```bash
cd jamlab
npm install                 # installs Capacitor core + CLI + platform packages

npm run add:android         # builds www/ then `cap add android`
npm run assets              # generate app icon + splash from assets/logo.svg (run after add:android)
npm run add:ios             # macOS + Xcode only
```

## App icon & splash

- Source art lives in `assets/` — `logo.svg` (icon) and `splash.svg` / `splash-dark.svg`.
- `npm run assets` (via `@capacitor/assets`) rasterizes them into every Android
  density and writes the launcher icon + splash into the native project.
- Re-run `npm run assets` after editing the SVGs or after a fresh `cap add android`.
- To control splash behavior (duration/spinner) install `@capacitor/splash-screen`;
  the config block is already in `capacitor.config.json`.

## Day-to-day

```bash
npm run sync                # copy index.html -> www/ and `cap sync` to native
npm run open:android        # open Android Studio
npm run open:ios            # open Xcode
npm run run:android         # sync + build + run on device/emulator
```

After editing `index.html`, run `npm run sync` to push the change into the native
projects.

## Requirements

- Node 18+ (developed on Node 24).
- **Android:** Android Studio + JDK 17.
- **iOS:** macOS + Xcode + CocoaPods.

## Notes / roadmap hooks

- `@capacitor/haptics` is wired to key presses (light) and bend-lock (medium) via
  `window.Capacitor.Plugins` — no bundler needed; no-ops on the web build.
- `@capacitor-community/keep-awake` keeps the screen on while the app is open.
- The backing auto-pauses when the app is hidden (call / app switch) and resumes on return.
- `@capacitor/status-bar` overlays the WebView; `index.html` already uses
  `viewport-fit=cover` + `env(safe-area-inset-*)` so the UI respects the notch.
- Audio latency in the WebView measured ~21 ms on Android — acceptable, no native
  audio engine needed (see the 🔬 panel in Settings).
- The microphone latency test auto-hides in the native build (`NATIVE` flag in
  `index.html`), so the app needs **no permissions** — Data Safety = "no data".
- **Privacy policy** is published at https://gromozeka1980.github.io/jamlab/privacy.html
  (use this URL in the Play Console listing & Data Safety form).
- Capacitor pinned to `^7.0.0`; bump in `package.json` when upgrading.

## TODO before release

- Pro unlock via Google Play Billing (RevenueCat recommended).
- Verify the in-app clip **share** works in the WebView; if `navigator.share`
  is flaky on Android WebView, add the `@capacitor/share` plugin.
- `targetSdkVersion`/`compileSdkVersion` are set to **36** in `android/variables.gradle`
  (Play requires API 36 from 2026-08-31). NOTE: `android/` is git-ignored — after a fresh
  `cap add android` this must be re-applied by hand.
