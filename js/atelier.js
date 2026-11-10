// ═══════════════════════════════════════════════════════════════
//  The Atelier — commission your own watch, built live in 3D from
//  the same generator as every other watch in the book.
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { buildWatch, createStage } from './watch3d.js';
import { usd } from './util.js';

const OPT = {
  shape: ['Case', [['round', 'Round'], ['cushion', 'Cushion'], ['tonneau', 'Tonneau'], ['octagon', 'Octagon'], ['rect', 'Tank'], ['pocket', 'Pocket']]],
  metal: ['Metal', [['steel', 'Steel'], ['gold', 'Yellow gold'], ['rose', 'Rose gold'], ['plat', 'Platinum'], ['ti', 'Titanium']]],
  dial: ['Dial', [['enamel', 'Grand feu'], ['sunburst', 'Sunburst'], ['guilloche', 'Guilloché'], ['tapisserie', 'Tapisserie'], ['fume', 'Fumé'], ['open', 'Open-worked']]],
  colour: ['Dial colour', [['ivory', 'Ivory', '#f3eee2'], ['silver', 'Silver', '#d6d8da'], ['salmon', 'Salmon', '#e2ad92'], ['slate', 'Slate', '#3a3e44'], ['green', 'Racing green', '#1d3a2a'], ['choc', 'Chocolate', '#3b2416'], ['black', 'Black', '#121214']]],
  hands: ['Hands', [['breguet', 'Breguet'], ['dauphine', 'Dauphine'], ['sword', 'Sword'], ['baton', 'Baton'], ['mercedes', 'Mercedes']]],
  bezel: ['Bezel', [['plain', 'Plain'], ['thin', 'Thin'], ['fluted', 'Fluted'], ['diver', 'Diver']]],
  comps: ['Complications', [['subsec', 'Small seconds'], ['date', 'Date'], ['chrono', 'Chronograph'], ['gmt', 'GMT'], ['power', 'Power reserve']]],
  strap: ['Strap', [['alligator', 'Alligator'], ['calf', 'Calf'], ['rubber', 'Rubber'], ['nato', 'NATO'], ['oyster', 'Oyster'], ['jubilee', 'Jubilee'], ['integrated', 'Integrated']]],
  leather: ['Strap colour', [['havana', 'Havana', '#4e2c15'], ['cognac', 'Cognac', '#8a4a1e'], ['black', 'Black', '#141012'], ['grey', 'Grey', '#4b4a48'], ['olive', 'Olive', '#4a5031']]],
  back: ['Caseback', [['exhibition', 'Sapphire'], ['solid', 'Solid'], ['engine', 'Engine-turned']]],
};
const KEYS = { shape: 's', metal: 'm', size: 'z', dial: 'd', colour: 'k', hands: 'h', bezel: 'b', comps: 'c', strap: 't', leather: 'l', back: 'v' };
const METAL_NAME = { steel: 'Stainless steel', gold: '18k yellow gold', rose: '18k rose gold', plat: 'Platinum 950', ti: 'Grade 5 titanium' };
const DEFAULT = { shape: 'round', metal: 'gold', size: 39, dial: 'enamel', colour: 'ivory', hands: 'breguet', bezel: 'thin', comps: ['subsec'], strap: 'alligator', leather: 'havana', back: 'exhibition' };
const BRACELETS = ['oyster', 'jubilee', 'integrated'];
// complications that share the same place on the dial replace each other
const CONFLICT = { chrono: ['subsec', 'power'], subsec: ['chrono'], power: ['chrono'] };
const label = (k, v) => (OPT[k][1].find(o => o[0] === v) || [])[1];
const sizeRange = c => c.shape === 'pocket' ? [44, 54] : c.shape === 'rect' ? [24, 34] : [34, 46];

/** What a configuration allows: every option that would not build properly is switched off. */
function allowed(c) {
  const pocket = c.shape === 'pocket', round = c.shape === 'round' || pocket, open = c.dial === 'open';
  const no = { dial: [], bezel: [], comps: [], strap: [], leather: [], colour: [] };
  if (!round) no.dial.push('open');
  if (!round) no.bezel.push('plain', 'thin', 'fluted', 'diver'); else if (pocket) no.bezel.push('diver');
  if (open) no.comps.push('date', 'chrono', 'power');
  if (c.shape === 'rect') no.comps.push('date', 'chrono', 'power');
  if (pocket) { no.strap = OPT.strap[1].map(o => o[0]); no.leather = OPT.leather[1].map(o => o[0]); }
  if (c.shape !== 'octagon') no.strap.push('integrated');
  if (c.strap === 'rubber' || BRACELETS.includes(c.strap)) no.leather = OPT.leather[1].map(o => o[0]);
  return no;
}
function settle(c) {
  const [lo, hi] = sizeRange(c); c.size = Math.min(hi, Math.max(lo, c.size));
  c.comps = c.comps.filter((x, i) => c.comps.indexOf(x) === i && !c.comps.slice(i + 1).some(y => (CONFLICT[y] || []).includes(x)));
  for (let pass = 0; pass < 3; pass++) {
    const no = allowed(c);
    for (const k of ['dial', 'bezel', 'strap', 'leather']) if (no[k].includes(c[k])) { const ok = OPT[k][1].find(o => !no[k].includes(o[0])); if (ok) c[k] = ok[0]; }
    c.comps = c.comps.filter(x => !no.comps.includes(x));
  }
  return c;
}

function toSpec(c) {
  const pocket = c.shape === 'pocket', round = c.shape === 'round' || pocket, chrono = c.comps.includes('chrono'), open = c.dial === 'open';
  const has = k => c.comps.includes(k);
  const sp = {
    name: nameOf(c, true), brand: 'MechWatch', D: c.size, T: pocket ? 13.5 : chrono ? 13.6 : open ? 11.4 : c.shape === 'rect' ? 7.2 : 10.6,
    shape: c.shape, metal: c.metal, metalName: METAL_NAME[c.metal], dial: OPT.colour[1].find(o => o[0] === c.colour)[2],
    dialType: open ? 'enamel' : c.dial, openDial: open, hands: c.hands, bezel: round ? c.bezel : 'plain',
    subs: chrono ? 3 : 0, subsec: has('subsec'), date: has('date'), gmt: has('gmt'), power: has('power'),
    caseback: c.back, crown: c.bezel === 'diver' && round ? 'guard' : 'std',
    line: chrono ? 'CHRONOGRAPHE' : open ? 'SQUELETTE' : pocket ? 'CHRONOMÈTRE' : 'AUTOMATIC',
    LW: Math.round(c.size * (c.shape === 'rect' ? .7 : .5)), L2L: c.size * 1.2,
  };
  if (c.metal === 'gold' || c.metal === 'rose') sp.handMetal = 'gold';
  if (!pocket) {
    if (BRACELETS.includes(c.strap)) sp.bracelet = c.strap;
    else { sp.strap = c.strap; sp.strapColor = c.strap === 'rubber' ? '#121212' : OPT.leather[1].find(o => o[0] === c.leather)[2]; }
  }
  return sp;
}
function nameOf(c, plain = false) {
  const has = k => c.comps.includes(k);
  const family = c.shape === 'pocket' ? 'Lépine' : { round: '', cushion: 'Coussin', tonneau: 'Tonneau', octagon: 'Octo', rect: 'Rectangle' }[c.shape];
  const kind = has('chrono') ? 'Chronographe' : c.dial === 'open' ? 'Squelette' : has('gmt') ? 'Voyageur' : c.bezel === 'diver' && c.shape === 'round' ? 'Marine' : has('power') ? 'Réserve de Marche' : c.shape === 'pocket' ? 'de Poche' : 'Classique';
  return plain ? [family, kind].filter(Boolean).join(' ') : `${family ? family + ' ' : ''}<em>${kind}</em>`;
}
function estimate(c) {
  const base = { steel: 5800, ti: 6900, gold: 21500, rose: 22500, plat: 34000 }[c.metal];
  let p = base * (1 + (c.size - 38) * .02) * ({ tonneau: 1.15, octagon: 1.1, cushion: 1.05, pocket: 1.2 }[c.shape] || 1);
  p += { enamel: 5200, guilloche: 3200, tapisserie: 900, fume: 600, sunburst: 0, open: 16000 }[c.dial];
  p += c.comps.reduce((s, k) => s + { subsec: 600, date: 450, chrono: 7800, gmt: 2400, power: 3100 }[k], 0);
  p += { engine: 1800, exhibition: 500, solid: 0 }[c.back];
  if (BRACELETS.includes(c.strap) && c.shape !== 'pocket') p += ['gold', 'rose'].includes(c.metal) ? 12000 : c.metal === 'plat' ? 18000 : 1500;
  else if (c.strap === 'alligator') p += 600;
  return Math.round(p / 100) * 100;
}
function sheet(c) {
  const has = k => c.comps.includes(k), pocket = c.shape === 'pocket';
  const comps = c.comps.map(k => label('comps', k)).join(', ') || 'Hours and minutes';
  const movement = has('chrono') ? 'Automatic chronograph, column wheel' : c.dial === 'open' ? 'Open-worked, inverted · 21 jewels' : pocket ? 'Hand-wound · 4 Hz' : 'Automatic · 4 Hz · 50 h';
  const wear = pocket ? 'Open face, bow and chain' : BRACELETS.includes(c.strap) ? `${label('strap', c.strap)} bracelet` : c.strap === 'rubber' ? 'Rubber strap' : `${label('strap', c.strap)}, ${label('leather', c.leather).toLowerCase()}`;
  return [['Case', `${c.size} mm · ${METAL_NAME[c.metal]}`], ['Dial', `${label('dial', c.dial)}, ${label('colour', c.colour).toLowerCase()}`], ['Hands', label('hands', c.hands)], ['Complications', comps], ['Movement', movement], [pocket ? 'Carry' : 'Strap', wear]];
}
const encode = c => Object.entries(KEYS).map(([k, s]) => `${s}=${k === 'comps' ? c.comps.join('.') : c[k]}`).join('&');
function decode(str) {
  const q = new URLSearchParams(str), c = { ...DEFAULT, comps: [...DEFAULT.comps] };
  Object.entries(KEYS).forEach(([k, s]) => {
    const v = q.get(s); if (v == null) return;
    if (k === 'comps') c.comps = v.split('.').filter(x => OPT.comps[1].some(o => o[0] === x));
    else if (k === 'size') c.size = +v || c.size;
    else if (OPT[k][1].some(o => o[0] === v)) c[k] = v;
  });
  return settle(c);
}
const refOf = code => { let h = 2166136261; for (const ch of code) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return 'MW-' + (1000 + ((h >>> 0) % 9000)); };

export function init() {
  const root = document.getElementById('atelierRoot'), panel = document.getElementById('atPanel'), canvas = document.getElementById('atelierCanvas');
  const $ = id => document.getElementById(id);
  const fromLink = location.hash.startsWith('#atelier?');
  let cfg = fromLink ? decode(location.hash.slice(9)) : settle({ ...DEFAULT, comps: [...DEFAULT.comps] });

  // the bench: options as dial-pip toggles, swatches and a crown-thumb slider
  panel.innerHTML = Object.entries(OPT).map(([k, [name, items]]) => {
    const sw = k === 'colour' || k === 'leather';
    const body = items.map(([v, l, hex]) => sw ? `<button type="button" class="at-sw" data-k="${k}" data-v="${v}" style="--c:${hex}" aria-label="${l}" title="${l}"></button>` : `<button type="button" data-k="${k}" data-v="${v}">${l}</button>`).join('');
    const row = `<div class="at-row" data-row="${k}"><p class="at-label">${name}${sw ? ' · <span class="at-sw-name"></span>' : ''}</p><div class="${sw ? 'at-swatches' : 'seg'}">${body}</div></div>`;
    return k === 'metal' ? row + `<div class="at-row" data-row="size"><p class="at-label">Diameter · <span class="num" id="atSizeVal"></span></p><input type="range" id="atSize" aria-label="Case diameter in millimetres"></div>` : row;
  }).join('');
  const sizeIn = $('atSize');

  // the stage
  let stage, controls, cur = null, visible = false, pop = 1, idle = null;
  try {
    stage = createStage(canvas, { bloom: false, shadows: true, floorY: -36, exposure: 1.05, alpha: true });
  } catch (e) { root.classList.add('no3d'); }
  if (stage) {
    controls = new OrbitControls(stage.camera, canvas);
    Object.assign(controls, { enableDamping: true, dampingFactor: .08, enablePan: false, enableZoom: false, autoRotate: true, autoRotateSpeed: .8, minPolarAngle: .45, maxPolarAngle: 1.95 });
    canvas.style.touchAction = 'pan-y'; // let the page scroll on touch; sideways drags turn the watch
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    controls.addEventListener('end', () => { clearTimeout(idle); idle = setTimeout(() => { controls.autoRotate = true; }, 3500); });
    stage.camera.position.set(62, 26, 150);
    new ResizeObserver(() => { stage.resize(); frame(); }).observe(canvas);
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }, { rootMargin: '200px' }).observe(canvas);
  }
  // keep the watch clear of the plaque: on wide stages it sits right of centre
  function frame() {
    if (!stage) return;
    const W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    const wide = W > 760;
    stage.camera.setViewOffset(W, H, wide ? -W * .18 : 0, wide ? H * .02 : H * .04, W, H);
  }
  function loop() {
    if (!visible) return;
    requestAnimationFrame(loop);
    if (cur) { pop += (1 - pop) * .14; cur.group.scale.setScalar(pop); cur.tick(); }
    controls.update(); stage.render();
  }

  function build() {
    if (!stage) return;
    const w = buildWatch({ ...toSpec(cfg), cheapGlass: true });
    w.group.rotation.x = -.08;
    if (cur) { stage.scene.remove(cur.group); cur.dispose(); }
    cur = w; stage.scene.add(w.group); pop = .94;
    const pocket = cfg.shape === 'pocket';
    if (stage.floor) stage.floor.position.y = pocket ? -cfg.size / 2 - 6 : -(w.wrist?.a ?? 30) - 3;
    // frame the head and its strap: farther for big pocket watches, closer for a small Tank
    const reach = pocket ? cfg.size * 2.2 : Math.max(98, cfg.size * 2.5);
    const dir = stage.camera.position.clone().sub(controls.target).normalize();
    controls.target.set(0, pocket ? 8 : 0, -6);
    stage.camera.position.copy(controls.target).addScaledVector(dir, reach / Math.tan(THREE.MathUtils.degToRad(stage.camera.fov / 2)) / 2);
  }

  let tBuild = null;
  function sync({ rebuild = true } = {}) {
    settle(cfg);
    const no = allowed(cfg);
    panel.querySelectorAll('button[data-k]').forEach(b => {
      const k = b.dataset.k, v = b.dataset.v;
      b.classList.toggle('active', k === 'comps' ? cfg.comps.includes(v) : cfg[k] === v);
      b.disabled = (no[k] || []).includes(v);
    });
    panel.querySelectorAll('[data-row]').forEach(r => { const k = r.dataset.row; r.classList.toggle('off', !!no[k] && OPT[k] && OPT[k][1].every(o => no[k].includes(o[0]))); });
    panel.querySelectorAll('.at-row').forEach(r => { const n = r.querySelector('.at-sw-name'); if (n) n.textContent = label(r.dataset.row, cfg[r.dataset.row]); });
    const [lo, hi] = sizeRange(cfg); Object.assign(sizeIn, { min: lo, max: hi, step: 1 }); sizeIn.value = cfg.size; $('atSizeVal').textContent = cfg.size + ' mm';
    const code = encode(cfg);
    $('atName').innerHTML = nameOf(cfg); $('atRef').textContent = `Ref. ${refOf(code)} · made to order`;
    $('atSpecs').innerHTML = sheet(cfg).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    $('atPrice').textContent = '≈ ' + usd(estimate(cfg));
    const plaque = $('atPlaque'); plaque.classList.remove('swap'); void plaque.offsetWidth; plaque.classList.add('swap');
    if (rebuild) { clearTimeout(tBuild); tBuild = setTimeout(build, 30); }
  }

  panel.addEventListener('click', e => {
    const b = e.target.closest('button[data-k]'); if (!b || b.disabled) return;
    const k = b.dataset.k, v = b.dataset.v;
    if (k === 'comps') cfg.comps = cfg.comps.includes(v) ? cfg.comps.filter(x => x !== v) : [...cfg.comps.filter(x => !(CONFLICT[v] || []).includes(x)), v];
    else { if (k === 'shape' && v !== cfg.shape) cfg.size = { pocket: 50, rect: 29 }[v] || (cfg.shape === 'pocket' || cfg.shape === 'rect' ? 39 : cfg.size); cfg[k] = v; }
    sync();
  });
  let tSize = null;
  sizeIn.addEventListener('input', () => { cfg.size = +sizeIn.value; $('atSizeVal').textContent = cfg.size + ' mm'; clearTimeout(tSize); tSize = setTimeout(() => sync(), 160); });

  $('atLoupe').addEventListener('click', e => import('./inspector.js').then(m => m.openInspector([{ spec: toSpec(cfg), info: { brand: 'MechWatch · Atelier', model: nameOf(cfg), ref: `Ref. ${refOf(encode(cfg))} · ${METAL_NAME[cfg.metal]} · made to order`, specs: sheet(cfg) } }], 0, { x: e.clientX, y: e.clientY })));
  $('atRandom').addEventListener('click', () => {
    const pick = k => { const it = OPT[k][1]; return it[Math.floor(Math.random() * it.length)][0]; };
    cfg = { shape: pick('shape'), metal: pick('metal'), size: 0, dial: pick('dial'), colour: pick('colour'), hands: pick('hands'), bezel: pick('bezel'), comps: OPT.comps[1].map(o => o[0]).filter(() => Math.random() < .3), strap: pick('strap'), leather: pick('leather'), back: pick('back') };
    const [lo, hi] = sizeRange(cfg); cfg.size = Math.round(lo + (hi - lo) * (.3 + Math.random() * .4));
    sync();
  });
  $('atShare').addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}#atelier?${encode(cfg)}`, btn = $('atShare'), done = t => { btn.textContent = t; setTimeout(() => { btn.textContent = 'Copy link'; }, 2200); };
    history.replaceState(null, '', url);
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => done('Link copied'), () => done('Link is in the address bar'));
  });

  sync();
  if (fromLink) { const go = () => document.getElementById('atelier').scrollIntoView(); window.mwReady ? go() : addEventListener('mw-ready', go, { once: true }); }
}
