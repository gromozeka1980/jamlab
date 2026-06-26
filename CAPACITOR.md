# Jamlab — mobile build (Capacitor)

The app is a single static file (`index.html`, vanilla JS + Web Audio). For the
native iOS/Android builds we wrap it with [Capacitor](https://capacitorjs.com/)
— no rewrite, the same web codebase runs inside a WebView.

- **Source of truth:** `index.html` (also served by GitHub Pages).
- **Capacitor webDir:** `www/` — *generated* from `index.html` by `scripts/copy-web.mjs`.
  It is git-ignored; regenerate it with `npm run build:web`.
- **App id:** `app.gromozeka.jamlab` · **App name:** `Jamlab` (working title).
- Native projects (`android/`, `ios/`) are generated on demand via `cap add` and
  are git-ignored — run the commands below to recreate them on a fresh checkout.

## One-time setup

```bash
cd jamlab
npm install                 # installs Capacitor core + CLI + platform packages

npm run add:android         # builds www/ then `cap add android`
npm run add:ios             # macOS + Xcode only
```

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

- `@capacitor/haptics` is included for tactile feedback on key presses (wire up later).
- `@capacitor/status-bar` overlays the WebView; `index.html` already uses
  `viewport-fit=cover` + `env(safe-area-inset-*)` so the UI respects the notch.
- Audio latency in the WebView measured ~21 ms on Android — acceptable, no native
  audio engine needed (see the 🔬 panel in Settings).
- Capacitor pinned to `^7.0.0`; bump in `package.json` when upgrading.
