# MechWatch — The Anatomy of Time

### ▶ Live site: **https://filthyl.github.io/MechWatch/**

A cinematic, interactive atlas of horology — from quartz to grand complications — built as a static site and deployed with GitHub Pages.

## Chapters
| | Chapter | What's in it |
|---|---|---|
| — | **Opening titles** | A winding loader (crown turns, power reserve fills to 42 h), letterboxed title card and lens flare |
| — | **Overture** | A live 3D 18k gold pocket chronometer — grand feu enamel dial, Breguet numerals and blued hands — hanging dial-on from its chain like a slow pendulum; scrolling zooms in on the dial, and the Loupe shows its engine-turned back |
| I | **Prologue** | 500 years of milestones on a pinned, sideways-scrolling timeline |
| II | **Anatomy** | Labelled exterior of a dive watch |
| III | **Quartz** | Animated signal chain + live 15-stage binary divider (32,768 Hz → 1 Hz) |
| IV | **The Movement** | A 31-part automatic movement modelled in three.js. It pins and comes apart as you scroll; orbit it and click any part. Gears turn at true ratios; hands show your local time |
| V | **Escapement** | Swiss lever escapement in slow motion with its five phases, tick sound and a beat-rate lab |
| VI | **Blueprints** | Engineering-style general-arrangement drawings of 10 archetypes — front elevation, side elevation, section A–A, dimensions, numbered item balloons, parts list and title block |
| VII | **Complications** | Working chronograph, real moon phase, GMT, perpetual calendar, tourbillon, power reserve and an audible minute repeater |
| VIII | **Calibres** | 18 legendary movements, sortable |
| IX | **Digital** | LED, LCD (working buttons), Spring Drive glide dial, exploded LCD stack |
| X | **The Vault** | **The Winder Wall** — 37 haute-horlogerie references, each turning in its own 3D glass watch winder (walnut, brass, suede-lined drum, LED ring, engraved plaque; two turns, pause, two turns back). Pick one: the door swings open, the winder slides aside and the watch floats out into the 3D Loupe. Plus a catalogue index, auction records and the houses |
| ✕ | **Smartwatches** | The garbage list. Filed under protest, with REJECTED stamps |

## The Loupe — every watch in 3D
Every Vault reference, every blueprint archetype, the anatomy diver and the hero watch open in a full-screen 3D inspector, generated procedurally from their specifications (`js/watch3d.js`):
- case shapes: round, octagonal integrated, porthole, rectangular Tank/Reverso, square Santos, cushion, tonneau, digital, pocket
- bezels (diver insert with coin edge, two-tone GMT, tachymeter, fluted, hobnail, Maltese, screwed), applied indices, faceted hands, sub-dials, tourbillon cage
- sapphire crystals with anti-reflective iridescence, exhibition casebacks with a spinning rotor
- **straps and bracelets** — alligator, calf, rubber, NATO, Oyster, Jubilee and integrated links — with pin buckles, folding clasps and spring bars, all labelled
- orbit, zoom, a ×4 loupe view, a disassemble slider and numbered part hotspots

## Watch-native interface
- **Type** — Libre Caslon Display & Text for an engraved, printed-catalogue voice; Jost (a Futura cut, the typeface of countless dials) for small print and numerals.
- **Controls that are watch parts** — primary actions are knurled crowns that turn on hover, small actions are chronograph pushers, toggles are bezels with a pip marking the active setting.
- **The dial navigator** — the page is a dial: twelve chapters are twelve hours. The hour hand shows your chapter, the minute hand your progress within it, the bezel the whole page, and the crown turns as you scroll.
- Rotating dive-bezel rings behind every chapter title, iris "aperture" reveals between worlds.

## Tech
No build step — hand-written HTML/CSS/JS. Vendored: three.js r170 with OrbitControls, RoundedBoxGeometry and the bloom post-processing chain (`vendor/three`), GSAP 3.13 with ScrollTrigger & SplitText (`vendor/gsap`). Everything else (watch faces, blueprints, dials, textures) is generated in code.

## Run locally
```
python3 -m http.server 8000
```
then open http://localhost:8000.

## Deploy
`.github/workflows/pages.yml` publishes the site to GitHub Pages on every push to `main`.
If a first deploy fails, set **Settings → Pages → Source: GitHub Actions** once and re-run the workflow.

Brand and model names are used for identification and commentary only. All illustrations are original, generated renders. Prices are indicative and change often.
