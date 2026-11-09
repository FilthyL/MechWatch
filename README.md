# MechWatch — The Anatomy of Time

### ▶ Live site: **https://filthyl.github.io/MechWatch/**

A cinematic, interactive atlas of horology — from quartz to grand complications — built as a static site and deployed with GitHub Pages.

## Chapters
| | Chapter | What's in it |
|---|---|---|
| — | **Opening titles** | Letterboxed title sequence, lens flare, a live chocolate-dial watch that steps 8× per second |
| I | **Prologue** | 500 years of milestones on a pinned, sideways-scrolling timeline |
| II | **Anatomy** | Labelled exterior of a dive watch |
| III | **Quartz** | Animated signal chain + live 15-stage binary divider (32,768 Hz → 1 Hz) |
| IV | **The Movement** | A 31-part automatic movement modelled in three.js. It pins and comes apart as you scroll; orbit it and click any part. Gears turn at true ratios; hands show your local time |
| V | **Escapement** | Swiss lever escapement in slow motion with its five phases, tick sound and a beat-rate lab |
| VI | **Blueprints** | Engineering-style general-arrangement drawings of 10 archetypes — front elevation, side elevation, section A–A, dimensions, numbered item balloons, parts list and title block |
| VII | **Complications** | Working chronograph, real moon phase, GMT, perpetual calendar, tourbillon, power reserve and an audible minute repeater |
| VIII | **Calibres** | 18 legendary movements, sortable |
| IX | **Digital** | LED, LCD (working buttons), Spring Drive glide dial, exploded LCD stack |
| X | **The Vault** | 36 haute-horlogerie references, each strapped on a display cushion under a glass cloche, with calibre specs and indicative prices; auction records; the houses |
| ✕ | **Smartwatches** | The garbage list. Filed under protest, with REJECTED stamps |

## Tech
No build step — hand-written HTML/CSS/JS. Vendored: three.js r170 (`vendor/three`), GSAP 3.13 with ScrollTrigger & SplitText (`vendor/gsap`). Everything else (watch faces, blueprints, dials, textures) is generated in code.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000.

## Deploy
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`.
If a first deploy fails, set **Settings → Pages → Source: GitHub Actions** once and re-run the workflow.

Brand and model names are used for identification and commentary only. All illustrations are original, generated renders. Prices are indicative and change often.
