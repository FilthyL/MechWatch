# MechWatch — The Anatomy of Time

An interactive, static atlas of horology: from quartz to grand complications.

**Chapters**
1. **History** — 500 years of watchmaking milestones (drag/scroll timeline)
2. **Anatomy** — labelled exterior of a dive watch
3. **Quartz** — animated signal chain + live 15-stage binary divider (32,768 Hz → 1 Hz)
4. **Movement 3D** — a procedurally modelled, 31-part automatic movement in three.js; explode it, orbit it, click any part. Gears turn at true relative ratios; hands show your local time.
5. **Escapement** — Swiss lever escapement in slow motion with its five phases, tick sound and a beat-rate lab
6. **Blueprints** — parametric technical drawings of 10 archetypes (diver, flieger, chronograph, dress, GMT, field, integrated sports, tank, digital LCD, tourbillon)
7. **Complications** — working chronograph, real moon phase, GMT, perpetual calendar, tourbillon, power reserve and an audible minute repeater
8. **Calibres** — 18 legendary movements, sortable
9. **Digital** — LED, LCD (working buttons) and smartwatch, plus an exploded LCD stack
10. **Luxury Index** — 36 references from 20+ houses with calibre specs and indicative retail prices, auction records

No build step. Everything is hand-written HTML/CSS/JS; three.js r170 is vendored in `vendor/`.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000.

## Deploy
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`
(Settings → Pages → Source: **GitHub Actions**).

Brand and model names are used for identification and commentary only. All illustrations are original, generated renders. Prices are indicative and change often.
