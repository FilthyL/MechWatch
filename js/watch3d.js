// ═══════════════════════════════════════════════════════════════════════
//  watch3d — a procedural, physically-shaded wristwatch generator.
//  Units: millimetres. Dial faces +Z, 12 o'clock is +Y, crown at +X.
//  One function turns a spec (case shape, metal, dial, bezel, hands,
//  strap or bracelet…) into a fully labelled, explodable 3D watch.
// ═══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hex = c => typeof c === 'string' ? new THREE.Color(c) : new THREE.Color(c);
const lum = c => { const k = hex(c); return k.r * .299 + k.g * .587 + k.b * .114; };
const shade = (c, amt) => { const k = hex(c).convertLinearToSRGB(); const t = amt > 0 ? new THREE.Color(1, 1, 1) : new THREE.Color(0, 0, 0); k.lerp(t, Math.abs(amt)); return '#' + k.getHexString(); };
const cssHex = c => '#' + hex(c).getHexString();

/* ───────────────────────── studio lighting ───────────────────────── */
export function studioEnvironment(renderer, { fill = .3 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0a0705).multiplyScalar(1);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x161514).multiplyScalar(fill * 3), side: THREE.BackSide }));
  s.add(dome);
  const box = (w, h, pos, intensity, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(16, 11, [0, 16, 4], 2.3);                 // overhead softbox (daylight), broad and soft
  box(3.2, 16, [-15, 3, 6], 2.9);               // left strip
  box(3.2, 16, [15, 4, -4], 2.2, 0xfff4e8);     // right strip, a breath warmer than the left
  box(18, 3, [0, -4, 16], 1.3, 0xffffff);       // low front fill
  box(10, 2.4, [0, 8, -16], 1.6, 0xffcf96);     // a thin amber rim — the only warm note
  box(4, 4, [9, 12, 10], 2.2);                  // a gentle kicker: a glint, never a glare
  box(9, 7, [-5, 0, 17], 1.5);                  // front beauty light, brighter on the left…
  box(9, 7, [5, 0, 17], .55);                   // …so faceted hands show a lit and a shaded plane
  box(12, 8, [-3, 3, -17], 1.5);                // behind the watch: lights the caseback when it is turned over
  box(16, 3, [0, -6, -14], .8);                 // low rear fill
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, .02).texture; pm.dispose();
  return tex;
}

/* ───────────────────────── materials ───────────────────────── */
const METAL = {
  steel: 0xdfe3e8, white: 0xebe9e4, plat: 0xf0f2f4, gold: 0xf6c56c, rose: 0xf3b092,
  ti: 0xaeb2b8, tantalum: 0x93a0bb, carbon: 0x2c2d31, ceramic: 0x121315, black: 0x18191c,
};
const matCache = new Map();
export function metal(key = 'steel', finish = 'polished') {
  const k = key + finish; if (matCache.has(k)) return matCache.get(k);
  let m;
  if (key === 'ceramic' || key === 'black') m = new THREE.MeshPhysicalMaterial({ color: METAL[key], metalness: 0, roughness: finish === 'polished' ? .08 : .35, clearcoat: 1, clearcoatRoughness: .05 });
  else if (key === 'carbon') m = new THREE.MeshPhysicalMaterial({ color: METAL.carbon, metalness: .35, roughness: .42, clearcoat: .8, clearcoatRoughness: .2 });
  else m = new THREE.MeshPhysicalMaterial({ color: METAL[key] ?? METAL.steel, metalness: 1, roughness: finish === 'polished' ? .07 : finish === 'blasted' ? .5 : finish === 'satin' ? .5 : finish === 'semipolish' ? .17 : .26, anisotropy: finish === 'brushed' || finish === 'satin' ? .6 : 0 });
  m.side = THREE.DoubleSide;
  matCache.set(k, m); return m;
}
const LUME = new THREE.MeshStandardMaterial({ color: 0xe7f6df, emissive: 0x8fe3a8, emissiveIntensity: .32, roughness: .6 });
const BLACKH = new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: .7, roughness: .18 });
const handCache = new Map();
/** Hands sit between polish and satin so they read as metal from any angle. `blued` is heat-blued steel: near-black until it catches the light. */
function handMetal(key) {
  if (!handCache.has(key)) handCache.set(key, new THREE.MeshPhysicalMaterial({ color: key === 'blued' ? 0x15215a : METAL[key] ?? METAL.steel, metalness: 1, roughness: key === 'blued' ? .24 : .2, side: THREE.DoubleSide }));
  return handCache.get(key);
}
/** where a small-seconds sub-dial sits, in dial radii (x right, y up), from its clock position */
const subsecXY = sp => { const at = sp.subsecAt ?? 6; if (at === 6) return [0, -.48]; const a = at / 12 * TAU; return [Math.sin(a) * .46, Math.cos(a) * .46]; };
/** text set on an arc, centred on `mid` (radians clockwise from 12), reading clockwise */
function arcText(g, str, radius, mid, step) { [...str].forEach((ch, i) => { const a = mid + (i - (str.length - 1) / 2) * step; g.save(); g.rotate(a); g.fillText(ch, 0, -radius); g.restore(); }); }

const REDH = new THREE.MeshPhysicalMaterial({ color: 0xc8193a, metalness: .3, roughness: .25 });
const RUBY = new THREE.MeshPhysicalMaterial({ color: 0xd2123c, roughness: .05, clearcoat: 1, emissive: 0x3a0010, emissiveIntensity: .6 });
export function sapphire() {
  return new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transmission: 1, thickness: 1.2, ior: 1.77, transparent: true, opacity: 1,
    iridescence: .55, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 420], envMapIntensity: 1.6, specularIntensity: 1 });
}

/* ───────────────────────── canvas textures ───────────────────────── */
function canvasTex(w, h, draw, { srgb = true, repeat } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h, c);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.userData.canvas = c; t.userData.draw = draw;
  return t;
}
/* Leather, rubber and fabric with real relief: a colour map plus a height map drawn from the same pattern. */
export function strapMaterial(type = 'alligator', color = '#3a1d0e') {
  const W = 512, H = 1024, col = document.createElement('canvas'), hgt = document.createElement('canvas');
  col.width = hgt.width = W; col.height = hgt.height = H;
  const g = col.getContext('2d'), h = hgt.getContext('2d');
  const base = new THREE.Color(color), lift = k => '#' + base.clone().offsetHSL(0, 0, k).getHexString();
  g.fillStyle = color; g.fillRect(0, 0, W, H); h.fillStyle = '#808080'; h.fillRect(0, 0, W, H);
  if (type === 'alligator') {
    h.fillStyle = '#1a1a1a'; h.fillRect(0, 0, W, H); // grooves
    const cols = [.065, .095, .125, .155, .155, .125, .095, .065], margin = (1 - cols.reduce((a, b) => a + b, 0)) / 2 * W;
    let x = margin;
    cols.forEach((cw, ci) => {
      const ww = cw * W; let y = -Math.random() * 40;
      while (y < H) {
        const centre = ci > 1 && ci < 6, rh = ww * (centre ? .95 + Math.random() * .35 : .7 + Math.random() * .3);
        const gap = 2.4, r = Math.min(ww, rh) * .28;
        g.fillStyle = lift((Math.random() - .5) * .035); g.beginPath(); g.roundRect(x + gap, y + gap, ww - gap * 2, rh - gap * 2, r); g.fill();
        const rg = h.createRadialGradient(x + ww * .45, y + rh * .4, 1, x + ww / 2, y + rh / 2, Math.max(ww, rh) * .62);
        rg.addColorStop(0, '#f2f2f2'); rg.addColorStop(.7, '#a8a8a8'); rg.addColorStop(1, '#5a5a5a');
        h.fillStyle = rg; h.beginPath(); h.roundRect(x + gap, y + gap, ww - gap * 2, rh - gap * 2, r); h.fill();
        y += rh;
      }
      x += ww;
    });
    g.globalAlpha = .55; g.fillStyle = lift(-.08); for (let i = 0; i < 3; i++) g.fillRect(0, 0, 0, 0); g.globalAlpha = 1;
  } else if (type === 'rubber') {
    for (let i = 0; i < 14000; i++) { h.fillStyle = Math.random() > .5 ? '#888' : '#787878'; h.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    for (let y = 0; y < H; y += 64) { h.fillStyle = '#5c5c5c'; h.fillRect(W * .12, y, W * .76, 6); }
  } else if (type === 'nato') {
    for (let y = 0; y < H; y += 6) { h.fillStyle = y % 12 ? '#9a9a9a' : '#6a6a6a'; h.fillRect(0, y, W, 3); }
    for (let x = 0; x < W; x += 6) { h.fillStyle = 'rgba(0,0,0,.18)'; h.fillRect(x, 0, 2, H); }
    g.fillStyle = lift(-.06); g.fillRect(W * .3, 0, W * .08, H); g.fillRect(W * .62, 0, W * .08, H);
  } else { // calf
    for (let i = 0; i < 26000; i++) { const v = 110 + Math.random() * 40 | 0; h.fillStyle = `rgb(${v},${v},${v})`; h.fillRect(Math.random() * W, Math.random() * H, 2.2, 2.2); }
  }
  if (type !== 'rubber' && type !== 'nato') {
    // painted edges and a tone-on-tone saddle stitch
    const edge = '#' + base.clone().offsetHSL(0, -.1, -.12).getHexString();
    g.fillStyle = edge; g.fillRect(0, 0, W * .028, H); g.fillRect(W * .972, 0, W * .028, H);
    const thread = '#' + base.clone().offsetHSL(0, -.05, base.getHSL({}).l < .15 ? .12 : .18).getHexString();
    g.strokeStyle = thread; g.lineWidth = 6; g.lineCap = 'round'; g.setLineDash([13, 11]);
    h.strokeStyle = '#d8d8d8'; h.lineWidth = 6; h.lineCap = 'round'; h.setLineDash([13, 11]);
    [W * .06, W * .94].forEach(xx => { [g, h].forEach(c => { c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, H); c.stroke(); }); });
  }
  const map = new THREE.CanvasTexture(col); map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  const bump = new THREE.CanvasTexture(hgt); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.anisotropy = 8;
  const P = { alligator: { roughness: .36, clearcoat: .45, clearcoatRoughness: .3, bumpScale: 3.2 }, calf: { roughness: .58, clearcoat: .1, clearcoatRoughness: .6, bumpScale: 1.1 }, rubber: { roughness: .7, clearcoat: 0, bumpScale: .9 }, nato: { roughness: .9, clearcoat: 0, bumpScale: 2.2, sheen: .5, sheenColor: base.clone(), sheenRoughness: .8 } }[type] || {};
  return new THREE.MeshPhysicalMaterial({ map, bumpMap: bump, envMapIntensity: .85, ...P });
}
/* A bracelet as one continuous band whose links are carved into colour, roughness and relief maps:
   satin outer links, polished centres, crisp grooves between — no faceted "tiles". */
export function braceletMaterial(type = 'oyster', key = 'steel') {
  const W = 512, H = 1024, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cC = mk(), cR = mk(), cB = mk(), g = cC.getContext('2d'), r = cR.getContext('2d'), b = cB.getContext('2d');
  g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, W, H); r.fillStyle = '#ffffff'; r.fillRect(0, 0, W, H); b.fillStyle = '#202020'; b.fillRect(0, 0, W, H);
  // [u0, u1, links per tile, phase, polished]
  const cols = type === 'jubilee' ? [[0, .24, 8, 0, 0], [.255, .4, 8, .5, 1], [.43, .57, 8, 0, 1], [.6, .745, 8, .5, 1], [.76, 1, 8, 0, 0]]
    : type === 'integrated' ? [[0, .385, 7, 0, 0], [.405, .595, 7, .5, 1], [.615, 1, 7, 0, 0]]
    : [[0, .315, 6, 0, 0], [.335, .665, 6, 0, 1], [.685, 1, 6, 0, 0]];
  cols.forEach(([u0, u1, n, ph, pol]) => {
    const x0 = u0 * W, x1 = u1 * W, p = H / n;
    for (let k = -1; k <= n; k++) {
      const y0 = (k + ph) * p + 3, y1 = (k + ph + 1) * p - 3;
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      if (pol) { gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#d8d8d8'); } else { gr.addColorStop(0, '#cfcfcf'); gr.addColorStop(.5, '#f0f0f0'); gr.addColorStop(1, '#cfcfcf'); }
      g.fillStyle = gr; g.beginPath(); g.roundRect(x0 + 2, y0, x1 - x0 - 4, y1 - y0, 6); g.fill();
      if (!pol) for (let x = x0 + 4; x < x1 - 4; x += 2) { g.fillStyle = `rgba(0,0,0,${Math.random() * .05})`; g.fillRect(x, y0, 1, y1 - y0); }
      const v = pol ? 30 : 140; r.fillStyle = `rgb(${v},${v},${v})`; r.beginPath(); r.roundRect(x0 + 2, y0, x1 - x0 - 4, y1 - y0, 6); r.fill();
      const bg = b.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, '#9a9a9a'); bg.addColorStop(.12, '#e8e8e8'); bg.addColorStop(.88, '#e8e8e8'); bg.addColorStop(1, '#9a9a9a');
      b.fillStyle = bg; b.beginPath(); b.roundRect(x0 + 2, y0, x1 - x0 - 4, y1 - y0, 6); b.fill();
    }
  });
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  return new THREE.MeshPhysicalMaterial({ color: METAL[key] ?? METAL.steel, metalness: 1, roughness: 1, map: tex(cC, true), roughnessMap: tex(cR), bumpMap: tex(cB), bumpScale: 2.2, anisotropy: .35, envMapIntensity: 1.1 });
}


/* seven-segment for LCD dials */
const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', ' ': '' };
function seg(g, ch, x, y, w, h, on, off) {
  const t = w * .18, s = SEGS[ch] ?? '';
  const R = { a: [x + t, y, w - 2 * t, t], d: [x + t, y + h - t, w - 2 * t, t], g: [x + t, y + h / 2 - t / 2, w - 2 * t, t], f: [x, y + t * .7, t, h / 2 - t], b: [x + w - t, y + t * .7, t, h / 2 - t], e: [x, y + h / 2 + t * .3, t, h / 2 - t], c: [x + w - t, y + h / 2 + t * .3, t, h / 2 - t] };
  for (const k in R) { g.fillStyle = s.includes(k) ? on : off; g.save(); g.transform(1, 0, -.08, 1, h * .04, 0); g.fillRect(...R[k]); g.restore(); }
}

/* the dial: printed in a 2048 canvas, a different recipe per dial type */
function dialTexture(sp, W = 1, H = 1) {
  const S = sp.hiRes ? 2048 : 1536, cw = Math.round(S * (W >= H ? 1 : W / H)), ch = Math.round(S * (H >= W ? 1 : H / W));
  const draw = (g, w, h) => {
    const c = [w / 2, h / 2], R = Math.min(w, h) / 2, dark = lum(sp.dial) < .45, ink = dark ? '#f1ece0' : '#1b1a18';
    const base = cssHex(sp.dial);
    g.clearRect(0, 0, w, h);
    // base
    const rg = g.createRadialGradient(c[0] * .86, c[1] * .74, R * .05, c[0], c[1], R * 1.05);
    const fume = sp.dialType === 'fume' || sp.grad;
    rg.addColorStop(0, shade(base, fume ? .28 : .12)); rg.addColorStop(fume ? .5 : .65, base); rg.addColorStop(1, fume ? '#030303' : shade(base, -.28));
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
    g.save(); g.translate(...c);
    const T = sp.dialType;
    // finish
    if (T === 'tapisserie') { const p = R / 21; for (let y = -h / 2; y < h / 2; y += p) for (let x = -w / 2; x < w / 2; x += p) { const gr = g.createLinearGradient(x, y, x + p, y + p); gr.addColorStop(0, shade(base, .22)); gr.addColorStop(.5, base); gr.addColorStop(1, shade(base, -.3)); g.fillStyle = gr; g.fillRect(x + p * .12, y + p * .12, p * .76, p * .76); } }
    else if (T === 'horizontal') { for (let y = -h / 2; y < h / 2; y += R / 46) { g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-w / 2, y, w, R / 92); } }
    else if (T === 'snow') { for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(255,255,255,${.15 + Math.random() * .4})`; g.beginPath(); g.ellipse((Math.random() - .5) * w, (Math.random() - .5) * h, 2 + Math.random() * 7, 1.2, Math.random() * 3, 0, TAU); g.fill(); } }
    else if (T === 'birch') { for (let i = 0; i < 700; i++) { const x = (Math.random() - .5) * w; g.strokeStyle = `rgba(${Math.random() > .4 ? '255,255,255' : '120,120,120'},.35)`; g.lineWidth = Math.random() * 3; g.beginPath(); g.moveTo(x, -h / 2); g.bezierCurveTo(x + 8, -h / 6, x - 8, h / 6, x + 3, h / 2); g.stroke(); } }
    else if (T === 'guilloche') { for (let k = 0; k < 70; k++) { const r0 = R * .06 + k * R * .0122; g.beginPath(); for (let i = 0; i <= 360; i++) { const a = i / 360 * TAU, r = r0 + R * .012 * Math.sin(a * 18 + k * .32); i ? g.lineTo(r * Math.cos(a), r * Math.sin(a)) : g.moveTo(r * Math.cos(a), r * Math.sin(a)); } g.strokeStyle = 'rgba(255,214,160,.12)'; g.lineWidth = 2; g.stroke(); } }
    else if (T === 'enamel' || T === 'roman' && !dark) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(-w / 2, -h / 2, w, h); }
    else if (T === 'skeleton' || sp.skeleton) { g.fillStyle = 'rgba(8,8,10,.55)'; g.fillRect(-w / 2, -h / 2, w, h); }
    else if (T === 'lcd') {
      g.restore(); g.fillStyle = '#9fab8f'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const d = new Date(), t = String(d.getHours() % 12 || 12).padStart(2, ' ') + String(d.getMinutes()).padStart(2, '0'), s = String(d.getSeconds()).padStart(2, '0');
      const dw = w * .17, dh = h * .36, y0 = h * .38, on = '#1b2216', off = 'rgba(20,30,10,.07)';
      [0, 1].forEach(i => seg(g, t[i], w * .07 + i * dw * 1.12, y0, dw, dh, on, off));
      g.fillStyle = on; g.fillRect(w * .48, y0 + dh * .28, w * .022, w * .022); g.fillRect(w * .48, y0 + dh * .62, w * .022, w * .022);
      [2, 3].forEach(i => seg(g, t[i], w * .53 + (i - 2) * dw * 1.12, y0, dw, dh, on, off));
      [0, 1].forEach(i => seg(g, s[i], w * .78 + i * dw * .62, y0 + dh * .4, dw * .55, dh * .6, on, off));
      g.font = `600 ${h * .07}px "Jost", sans-serif`; g.fillStyle = on;
      g.fillText(d.getHours() >= 12 ? 'PM' : 'AM', w * .08, h * .22); g.fillText(['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()] + ' ' + d.getDate(), w * .62, h * .22);
      return;
    }
    else { // sunburst
      for (let i = 0; i < 900; i++) { g.rotate(TAU / 900); g.strokeStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '0,0,0'},${.02 + Math.random() * .05})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(R * 1.5, 0); g.stroke(); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.translate(...c);
    }
    const isRect = W !== H;
    // minute track
    if (!isRect && !['zeitwerk', 'lange1'].includes(T)) {
      const rail = ['roman', 'enamel', 'flieger', 'field', 'tourbillon', 'journe'].includes(T) && sp.track !== 'stars';
      if (sp.track === 'stars') { // a star for every minute, a lozenge at every fifth
        g.fillStyle = ink;
        for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * TAU); g.translate(0, -R * .945); g.beginPath();
          if (i % 5 === 0) { const a = R * .013, b = R * .024; g.moveTo(0, -b); g.lineTo(a, 0); g.lineTo(0, b); g.lineTo(-a, 0); }
          else for (let k = 0; k < 10; k++) { const rr = R * (k % 2 ? .0048 : .0115), an = k / 10 * TAU; k ? g.lineTo(rr * Math.sin(an), -rr * Math.cos(an)) : g.moveTo(0, -rr); }
          g.closePath(); g.fill(); g.restore(); }
      }
      else for (let i = 0; i < 60; i++) {
        const a = i / 60 * TAU, big = i % 5 === 0;
        const r1 = R * .975, r2 = R * (big ? .925 : .95);
        g.strokeStyle = ink; g.globalAlpha = big ? .95 : .6; g.lineWidth = big ? R * .009 : R * .004;
        g.beginPath(); g.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a)); g.lineTo(r2 * Math.sin(a), -r2 * Math.cos(a)); g.stroke();
      }
      g.globalAlpha = 1;
      if (rail) { g.lineWidth = R * .003; g.strokeStyle = ink; [R * .975, R * .95].forEach(r => { g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }); }
    }
    if (isRect) { // chemin de fer for rectangular dials
      const hw = w / 2 * .86, hh = h / 2 * .9; g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(-hw, -hh, hw * 2, hh * 2); g.strokeRect(-hw + 18, -hh + 18, hw * 2 - 36, hh * 2 - 36);
      for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, dx = Math.sin(a), dy = -Math.cos(a), k = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)); g.beginPath(); g.moveTo(dx * k, dy * k); g.lineTo(dx * (k - 18), dy * (k - 18)); g.lineWidth = 2; g.stroke(); }
      if (T === 'roman') { g.font = `400 ${R * .2}px "Libre Caslon Display", Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
        ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * TAU, dx = Math.sin(a), dy = -Math.cos(a), k = Math.min((hw - R * .2) / Math.abs(dx || 1e-6), (hh - R * .2) / Math.abs(dy || 1e-6)); g.save(); g.translate(dx * k, dy * k); g.rotate(a); g.scale(.62, 1.15); g.fillText(n, 0, 0); g.restore(); }); }
    }
    if (isRect && T !== 'roman' && T !== 'lcd') { // applied batons, following the rectangle
      const hw = w / 2 * .86 - 30, hh = h / 2 * .9 - 30; g.strokeStyle = dark ? '#f3f1ea' : '#2a2a2a'; g.lineCap = 'butt';
      for (let i = 0; i < 12; i++) { if (sp.subsec && i === 6) continue; const a = i / 12 * TAU, dx = Math.sin(a), dy = -Math.cos(a), k = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)), L = R * (i % 3 ? .15 : .2);
        g.lineWidth = R * (i % 3 ? .03 : .045); g.beginPath(); g.moveTo(dx * k, dy * k); g.lineTo(dx * (k - L), dy * (k - L)); g.stroke(); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
    const ring = (n, r, f, sz, font = '"Libre Caslon Display", Georgia, serif', skip = []) => { g.font = `400 ${R * sz}px ${font}`; for (let i = 0; i < n; i++) { if (skip.includes(i)) continue; const a = i / n * TAU; g.fillText(f(i), r * R * Math.sin(a), -r * R * Math.cos(a)); } };
    if (!isRect) {
      if (T === 'flieger') { ring(12, .76, i => i, .15, '"Jost", "Jost", sans-serif', [0]); g.beginPath(); g.moveTo(0, -R * .7); g.lineTo(-R * .07, -R * .86); g.lineTo(R * .07, -R * .86); g.closePath(); g.fill(); [-1, 1].forEach(s => { g.beginPath(); g.arc(s * R * .11, -R * .86, R * .018, 0, TAU); g.fill(); }); }
      if (T === 'field') { ring(12, .76, i => i || 12, .14, '"Jost", sans-serif'); ring(12, .56, i => i + 12, .06, '"Jost", sans-serif'); }
      if (T === 'roman' || T === 'tourbillon' || T === 'enamel') { const n = T === 'enamel' ? ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] : ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; g.font = `${T === 'enamel' ? 'italic ' : ''}400 ${R * .13}px "Libre Caslon Display", Georgia, serif`; n.forEach((t, i) => { if (T === 'tourbillon' && i >= 5 && i <= 7) return; if (sp.date && i === (sp.dateAt ?? 3) % 12) return; const a = i / 12 * TAU; g.save(); g.translate(.78 * R * Math.sin(a), -.78 * R * Math.cos(a)); if (T !== 'enamel') g.rotate(a); g.fillText(t, 0, 0); g.restore(); }); }
      if (T === 'journe') ring(12, .8, i => i || 12, .08, '"Jost", sans-serif');
      if (T === 'sandwich') { const taken = [sp.date ? (sp.dateAt ?? 3) : -1, sp.subsec ? (sp.subsecAt ?? 6) : -1]; g.fillStyle = '#e8ddb8';
        ring(12, .72, i => i % 3 === 0 && !taken.includes(i) ? (i || 12) : '', .2, '"Jost", sans-serif');
        for (let i = 0; i < 12; i++) { if (i % 3 === 0) continue; g.save(); g.rotate(i / 12 * TAU); g.fillRect(-R * .016, -R * .86, R * .032, R * .2); g.restore(); }
        g.fillStyle = ink; }
    }
    if (sp.openDial) { // open centre, leaving the seconds sub-dial as an enamel island
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(0, 0, R * openFrac(sp), 0, TAU); g.fill(); g.restore();
      if (sp.subsec && !sp.skeleton && (sp.subsecAt ?? 6) === 6) { const eg = g.createRadialGradient(-R * .05, R * .44, R * .02, 0, R * .48, R * .21); eg.addColorStop(0, shade(base, .1)); eg.addColorStop(1, base); g.fillStyle = eg; g.beginPath(); g.arc(0, R * .48, R * .208, 0, TAU); g.fill(); }
    }
    // sub-dials
    const sub = (x, y, r, labels, fill) => {
      g.save(); g.translate(x * R, y * R);
      const panda = sp.panda || !!fill;
      g.fillStyle = fill || (panda ? '#141416' : (dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)')); g.beginPath(); g.arc(0, 0, r * R, 0, TAU); g.fill();
      for (let k = 1; k < 16; k++) { g.strokeStyle = panda ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * R * k / 16, 0, TAU); g.stroke(); }
      const sInk = fill ? (lum(fill) > .5 ? '#1b1a18' : '#eee') : panda ? '#eee' : ink;
      g.strokeStyle = sInk; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r * R, 0, TAU); g.stroke();
      for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r1 = r * R * .97, r2 = r * R * (i % 5 ? .9 : .82); g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a)); g.lineTo(r2 * Math.sin(a), -r2 * Math.cos(a)); g.stroke(); }
      if (labels) { g.fillStyle = sInk; g.font = `500 ${R * .045}px "Jost", sans-serif`; labels.forEach((t, i) => { const a = i / labels.length * TAU; g.fillText(t, r * R * .62 * Math.sin(a), -r * R * .62 * Math.cos(a)); }); }
      g.restore();
    };
    const sf = sp.subFill || {};
    if (sp.subs === 3) { sub(-.42, 0, .21, ['60', '15', '30', '45'], sf[9]); sub(.42, 0, .21, ['30', '10', '20'], sf[3]); sub(0, .42, .21, ['12', '3', '6', '9'], sf[6]); }
    else if (sp.subs === 2) { sub(-.42, 0, .22, ['60', '20', '40'], sf[9]); sub(.42, 0, .22, ['30', '10', '20'], sf[3]); }
    if (sp.subsec && !isRect) { const [sx, sy] = subsecXY(sp); sub(sx, -sy, .2, ['60', '15', '30', '45']); }
    if (isRect && sp.subsec) sub(0, .42, .26, ['60', '15', '30', '45']);
    if (T === 'perpetual') { sub(-.42, 0, .2, ['MON', 'WED', 'FRI', 'SUN']); sub(.42, 0, .2, ['JAN', 'APR', 'JUL', 'OCT']); g.save(); g.translate(0, .42 * R); g.fillStyle = '#0d1a3a'; g.beginPath(); g.arc(0, 0, .2 * R, Math.PI, 0); g.fill(); g.fillStyle = '#f2cd7e'; g.beginPath(); g.arc(R * .05, -R * .07, R * .06, 0, TAU); g.fill(); g.restore(); }
    if (T === 'lange1') { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(-R * .16, -R * .06, R * .5, 0, TAU); g.stroke(); sub(.32, .44, .17); g.fillStyle = '#fff'; g.fillRect(R * .2, -R * .66, R * .2, R * .24); g.fillRect(R * .42, -R * .66, R * .2, R * .24); g.fillStyle = '#111'; g.font = `500 ${R * .18}px "Jost", sans-serif`; g.fillText(String(new Date().getDate()).padStart(2, '0')[0], R * .3, -R * .54); g.fillText(String(new Date().getDate()).padStart(2, '0')[1], R * .52, -R * .54); }
    if (T === 'zeitwerk') { g.fillStyle = '#f6f4ef'; g.fillRect(-R * .62, -R * .16, R * .52, R * .36); g.fillRect(R * .1, -R * .16, R * .52, R * .36); g.fillStyle = '#111'; g.font = `300 ${R * .3}px "Jost", sans-serif`; const d = new Date(); g.fillText(String(d.getHours()).padStart(2, '0'), -R * .36, R * .03); g.fillText(String(d.getMinutes()).padStart(2, '0'), R * .36, R * .03); g.strokeStyle = '#c9a35a'; g.lineWidth = R * .03; g.beginPath(); g.arc(0, R * .9, R * .82, -Math.PI * .78, -Math.PI * .22); g.stroke(); sub(0, -.58, .14); }
    if (T === 'tourbillon') { g.fillStyle = '#050506'; g.beginPath(); g.arc(0, .44 * R, .3 * R, 0, TAU); g.fill(); }
    if (sp.power) { g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(-R * .18, -R * .2, R * .3, -Math.PI * .95, -Math.PI * .55); g.stroke(); g.font = `500 ${R * .035}px "Jost"`; g.fillText('POWER RESERVE', -R * .32, -R * .36); }
    if (sp.date && (!(sp.subs && sp.subs >= 2) || sp.dateAt) && !isRect) {
      const da = (sp.dateAt ?? 3) / 12 * TAU, dx = Math.sin(da) * R * .665, dy = -Math.cos(da) * R * .665, dw = R * .17, dh = R * .14;
      g.fillStyle = sp.dateDark ? '#111214' : '#fbfaf6'; g.fillRect(dx - dw / 2, dy - dh / 2, dw, dh); g.strokeStyle = shade(base, -.4); g.lineWidth = 6; g.strokeRect(dx - dw / 2, dy - dh / 2, dw, dh);
      g.fillStyle = sp.dateDark ? '#f1ece0' : '#111'; g.font = `600 ${R * .1}px "Jost", sans-serif`; g.fillText(new Date().getDate(), dx, dy + R * .005);
    }
    if (sp.day && !isRect) { // the day of the week spelled out in an arc at 12
      const wa = .4; g.fillStyle = '#fbfaf6'; g.beginPath(); g.arc(0, 0, R * .84, -Math.PI / 2 - wa, -Math.PI / 2 + wa); g.arc(0, 0, R * .71, -Math.PI / 2 + wa, -Math.PI / 2 - wa, true); g.closePath(); g.fill();
      g.strokeStyle = shade(base, -.4); g.lineWidth = 5; g.stroke(); g.fillStyle = '#111'; g.font = `600 ${R * .085}px "Jost", sans-serif`;
      arcText(g, ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()], R * .77, 0, .082);
    }
    // signature: the brand, the lines beneath it, the model block lower down and the foot line
    if (!['zeitwerk', 'lange1'].includes(T) && (T !== 'fume' || sp.brandText) && (!sp.openDial || sp.skeleton)) {
      const lines = v => v == null ? [] : Array.isArray(v) ? v : [v], sans = '"Jost", sans-serif', serif = '"Libre Caslon Text", Georgia, serif';
      const put = (t, y) => { const red = t[0] === '!'; g.fillStyle = red ? '#c2183b' : (sp.textColor || ink); g.fillText(red ? t.slice(1) : t, 0, y); };
      const name = sp.brandText ?? (sp.brand || 'MECHWATCH').toUpperCase(), subs = lines(sp.sub), low = lines(sp.line ?? 'AUTOMATIC');
      let y = isRect ? -R * .5 : -R * (T === 'flieger' ? .42 : T === 'field' ? .3 : .44);
      g.font = sp.brandSans ? `500 ${R * .062}px ${sans}` : `400 ${R * .072}px ${serif}`;
      if (name) { put(name.length > 18 && sp.brandText == null ? name.split(' ').slice(0, 2).join(' ') : name, y); y += R * .068; }
      g.globalAlpha = .82; g.font = `400 ${R * .036}px ${sans}`;
      subs.forEach(t => { put(t, y); y += R * .05; });
      // the model block sits below the centre, unless a sub-dial lives there
      const crowded = !isRect && (sp.subs === 3 || (sp.subsec && (sp.subsecAt ?? 6) === 6) || T === 'tourbillon' || T === 'perpetual');
      let y2 = isRect ? R * .48 : crowded ? y + R * .008 : R * .3;
      low.forEach(t => { put(t, y2); y2 += R * .05; });
      g.fillStyle = sp.textColor || ink; g.globalAlpha = .7;
      const foot = sp.foot ?? 'SWISS MADE'; if (foot) g.fillText(foot, 0, isRect ? h / 2 - R * .06 : R * .9);
      g.globalAlpha = 1;
    }
    if (sp.secret) { // the secret signature: scratched into the dial, visible only in raking light
      g.globalAlpha = .075; g.fillStyle = ink; g.font = `italic 400 ${R * .06}px "Libre Caslon Text", Georgia, serif`; g.fillText(sp.secret, 0, R * .2); g.globalAlpha = 1;
    }
    g.restore();
  };
  return canvasTex(cw, ch, draw);
}

function movementTexture(maker = 'MECHWATCH', jewels = 25) {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#bfc4cb'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    for (let y = 0; y < w; y += 40) for (let x = 0; x < w; x += 40) { for (let r = 22; r > 2; r -= 3) { g.strokeStyle = `rgba(255,255,255,${.12 + .1 * Math.sin(r)})`; g.beginPath(); g.arc(x + (y / 40 % 2) * 20, y, r, 0, TAU); g.stroke(); } }
    const bridge = (pts) => { g.save(); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)); g.closePath(); g.clip(); for (let k = -w; k < w * 2; k += 46) { const gr = g.createLinearGradient(k, 0, k + 46, 0); gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(.5, '#f4f6f8'); gr.addColorStop(1, '#9aa0a8'); g.fillStyle = gr; g.save(); g.translate(c, c); g.rotate(-.5); g.fillRect(k - c * 1.5, -w, 46, w * 2); g.restore(); } g.restore(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)); g.closePath(); g.stroke(); };
    bridge([[.12, .4], [.5, .14], [.86, .3], [.78, .52], [.4, .5]]); bridge([[.18, .62], [.52, .58], [.84, .68], [.62, .9], [.3, .86]]);
    g.strokeStyle = '#e8b47a'; g.lineWidth = 12; g.beginPath(); g.arc(w * .26, w * .7, w * .11, 0, TAU); g.stroke();
    [[.5, .5], [.3, .32], [.66, .4], [.42, .72], [.7, .72], [.26, .7]].forEach(([x, y]) => { g.fillStyle = '#d4af6a'; g.beginPath(); g.arc(x * w, y * w, 20, 0, TAU); g.fill(); g.fillStyle = '#c2183b'; g.beginPath(); g.arc(x * w, y * w, 11, 0, TAU); g.fill(); });
    [[.2, .44], [.8, .38], [.55, .88], [.78, .62]].forEach(([x, y]) => { g.fillStyle = '#2246a8'; g.beginPath(); g.arc(x * w, y * w, 16, 0, TAU); g.fill(); g.strokeStyle = '#0b1640'; g.lineWidth = 4; g.beginPath(); g.moveTo(x * w - 12, y * w); g.lineTo(x * w + 12, y * w); g.stroke(); });
    g.fillStyle = '#b8913f'; g.font = '600 34px "Libre Caslon Text", serif'; g.textAlign = 'center'; g.fillText(`${maker} · ${jewels} JEWELS`, c, w * .2);
  });
}
function engineTurned() {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, w, w);
    // barleycorn: a rose-engine pattern of concentric waves cut by radial facets
    for (let k = 0; k < 120; k++) {
      const r0 = c * .26 + k * c * .0062; g.beginPath();
      for (let i = 0; i <= 720; i++) { const a = i / 720 * TAU, r = r0 + c * .006 * Math.sin(a * 48 + k * .9); i ? g.lineTo(c + r * Math.cos(a), c + r * Math.sin(a)) : g.moveTo(c + r * Math.cos(a), c + r * Math.sin(a)); }
      g.strokeStyle = k % 2 ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.55)'; g.lineWidth = 2.6; g.stroke();
    }
    // polished cartouche with an engraved monogram
    g.fillStyle = '#9a9a9a'; g.beginPath(); g.arc(c, c, c * .24, 0, TAU); g.fill();
    g.strokeStyle = '#cfcfcf'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, c * .24, 0, TAU); g.stroke();
    g.fillStyle = '#4a4a4a'; g.font = 'italic 400 150px "Libre Caslon Text", Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('MW', c, c + 8);
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; [c * .985, c * .955].forEach(r => { g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); });
  }, { srgb: false });
}
function engravedBack(text) {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let r = 10; r < c; r += 3) { g.strokeStyle = `rgba(${r % 6 ? 255 : 0},${r % 6 ? 255 : 0},${r % 6 ? 255 : 0},.12)`; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    g.fillStyle = '#2c2c2c'; g.font = '500 44px "Libre Caslon Text", serif'; g.textAlign = 'center';
    const R = c * .72;
    [...text].forEach((ch, i) => { const a = -Math.PI / 2 - .9 + i * (1.8 / text.length); g.save(); g.translate(c + R * Math.cos(a), c + R * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); });
    g.font = '400 60px "Libre Caslon Display", serif'; g.fillText('MW', c, c + 20);
  }, { srgb: false });
}

/* ───────────────────────── open-worked movement ───────────────────────── */
// An inverted calibre seen through the dial's open centre: rhodium bridges with Côtes de
// Genève and polished bevels, a gilt going train, a Swiss lever escapement and a screw
// balance on its hairspring, all running in step with the hands at 4 Hz.
const OPEN = .64; // radius of the open centre, as a fraction of the dial
const openFrac = sp => sp.openDial === true ? OPEN : sp.openDial || 0;
function cotes() { // Côtes de Genève: rounded parallel stripes, as height and roughness
  const t = canvasTex(256, 256, (g, w) => { for (let x = 0; x < w; x++) { const v = Math.cos(((x % 128) / 128 - .5) * Math.PI), c = Math.round(70 + 170 * v * v); g.fillStyle = `rgb(${c},${c},${c})`; g.fillRect(x, 0, 1, w); } }, { srgb: false, repeat: [1 / 4.6, 1 / 4.6] });
  t.rotation = .5; return t;
}
function perlage() { // overlapping circular graining on the main plate
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let y = -64; y <= w + 64; y += 32) for (let x = -64; x <= w + 64; x += 32) {
      const gr = g.createRadialGradient(x - 6, y - 6, 2, x, y, 27); gr.addColorStop(0, '#dadada'); gr.addColorStop(.7, '#8a8a8a'); gr.addColorStop(1, '#585858');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, 27, 0, TAU); g.fill();
    }
  }, { srgb: false, repeat: [11, 11] });
}
/** gear outline: plain (`saw` for ratchet and escape teeth), with crossed-out spokes */
function wheelShape(R, teeth, { spokes = 5, depth = .07, saw = false, rim = .13, hub = .2 } = {}) {
  const s = new THREE.Shape(), Rb = R * (1 - depth), prof = saw ? [[Rb, 0], [R, .62], [R, .7], [Rb, .74]] : [[Rb, 0], [R, .22], [R, .46], [Rb, .68]];
  if (!teeth) s.absarc(0, 0, R, 0, TAU, false);
  for (let i = 0; i < teeth; i++) prof.forEach(([rr, f], k) => { const a = (i + f) / teeth * TAU, x = rr * Math.cos(a), y = rr * Math.sin(a); i || k ? s.lineTo(x, y) : s.moveTo(x, y); });
  const ro = Rb - R * rim, ri = R * hub, hw = R * .07;
  for (let k = 0; k < spokes; k++) {
    const a1 = k / spokes * TAU, a2 = (k + 1) / spokes * TAU, h = new THREE.Path();
    h.absarc(0, 0, ro, a1 + hw / ro, a2 - hw / ro, false); h.absarc(0, 0, ri, a2 - hw / ri, a1 + hw / ri, true); h.closePath(); s.holes.push(h);
  }
  return s;
}
/** a bar of width w along a polyline, with round ends */
function ribbon(pts, w) {
  const P = pts.map(p => new THREE.Vector2(...p)), n = P.length, hw = w / 2;
  const N = P.map((_, i) => { const d = P[Math.min(n - 1, i + 1)].clone().sub(P[Math.max(0, i - 1)]).normalize(); return new THREE.Vector2(-d.y, d.x); });
  const s = new THREE.Shape();
  P.forEach((p, i) => { const q = p.clone().addScaledVector(N[i], hw); i ? s.lineTo(q.x, q.y) : s.moveTo(q.x, q.y); });
  const aE = Math.atan2(N[n - 1].y, N[n - 1].x); s.absarc(P[n - 1].x, P[n - 1].y, hw, aE, aE - Math.PI, true);
  for (let i = n - 1; i >= 0; i--) { const q = P[i].clone().addScaledVector(N[i], -hw); s.lineTo(q.x, q.y); }
  const aS = Math.atan2(-N[0].y, -N[0].x); s.absarc(P[0].x, P[0].y, hw, aS, aS - Math.PI, true);
  return s;
}
/** an arm of width w from p1 that ends in a disc of radius rc at p2 (a balance cock) */
function keyhole(p1, p2, w, rc) {
  const d = new THREE.Vector2(p2[0] - p1[0], p2[1] - p1[1]).normalize(), nx = -d.y, ny = d.x, hw = w / 2;
  const phi = Math.atan2(-d.y, -d.x), al = Math.asin(Math.min(.99, hw / rc)), s = new THREE.Shape();
  s.moveTo(p1[0] + nx * hw, p1[1] + ny * hw);
  s.absarc(p2[0], p2[1], rc, phi - al, phi + al - TAU, true);
  s.lineTo(p1[0] - nx * hw, p1[1] - ny * hw);
  const aS = Math.atan2(-ny, -nx); s.absarc(p1[0], p1[1], hw, aS, aS - Math.PI, true);
  return s;
}
/** a smooth closed outline through control points (the first one should sit hidden under the dial) */
function blob(pts) { const s = new THREE.Shape(), v = pts.map(p => new THREE.Vector2(...p)); s.moveTo(v[0].x, v[0].y); s.splineThru([...v.slice(1), v[0]]); return s; }
function slab(shape, h, z, bevel = .04, seg = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: bevel > .06 ? 2 : 1, curveSegments: seg });
  g.translate(0, 0, z + bevel); return g;
}
function engraving(lines) {
  return canvasTex(640, 200, (g, w, h) => {
    g.fillStyle = '#e2bd72'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '400 96px "Libre Caslon Text", Georgia, serif'; g.fillText(lines[0], w / 2, h * .36);
    g.font = '500 40px "Jost", sans-serif'; g.fillText(lines[1], w / 2, h * .82);
  });
}

function openMovement(part, Rd, zD, { frac = OPEN, plateR = Rd + .1, maker = 'MECHWATCH' } = {}) {
  const k = Rd * frac / 14.5, P = (x, y) => [x * k, y * k], at = (o, x, y, z) => { o.position.set(x * k, y * k, z); return o; };
  const cs = cotes(), perl = perlage();
  const rhod = new THREE.MeshPhysicalMaterial({ color: 0xbfc3c9, metalness: 1, roughness: .4, roughnessMap: cs, bumpMap: cs, bumpScale: .4 });
  const bevel = new THREE.MeshPhysicalMaterial({ color: 0xe4e7eb, metalness: 1, roughness: .05 });
  const plateM = new THREE.MeshPhysicalMaterial({ color: 0xaeb2b8, metalness: 1, roughness: .55, roughnessMap: perl, bumpMap: perl, bumpScale: .6 });
  const gilt = metal('gold', 'semipolish'), gold = metal('gold', 'polished'), steel = metal('steel', 'polished'), dark = metal('black');
  // levels, bottom to top: wheels that overlap in plan never share a level
  const Z = { plate: zD - 3.65, barrel: zD - 3.6, esc: zD - 3.5, pallet: zD - 3.36, third: zD - 3.15, centre: zD - 2.8, balance: zD - 2.45, spring: zD - 1.95, bridge: zD - 1.85, top: zD - .85, ratchet: zD - .87 };
  const C = [0, 0], BA = [-4.4, 4.1], CW = [-.7, 9.07], TH = [5.02, -2.9], FO = [5.84, -7.53], ES = [9.41, -6.23], PA = [8.94, -2.86], BL = [8.2, 2.4];
  const wheel = (grp, c, R, teeth, z, h, mat, o = {}) => { const g = new THREE.Group(); at(g, c[0], c[1], 0); g.add(new THREE.Mesh(slab(wheelShape(R * k, teeth, o), h, z, .04, 12), mat)); grp.add(g); return g; };
  const pinion = (grp, c, z, h, r = .75) => grp.add(at(new THREE.Mesh(slab(wheelShape(r * k, 10, { spokes: 0, depth: .3 }), h, z, 0, 8), steel), c[0], c[1], 0));
  const cyl = (r, h, mat, seg = 24) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.rotation.x = Math.PI / 2; return m; };
  const screw = (grp, c, z) => { const s = at(new THREE.Group(), c[0], c[1], z); const head = cyl(.5 * k, .26, steel); head.position.z = .13; s.add(head); const slot = new THREE.Mesh(new THREE.BoxGeometry(.85 * k, .12 * k, .1), dark); slot.position.z = .27; slot.rotation.z = Math.atan2(c[1], c[0]) + 1; s.add(slot); grp.add(s); };
  const jewel = (grp, c, z) => {
    const j = at(new THREE.Group(), c[0], c[1], z); const ch = cyl(.78 * k, .2, gold, 32); ch.position.z = .1; j.add(ch);
    const ru = cyl(.42 * k, .14, RUBY, 24); ru.position.z = .25; j.add(ru);
    [Math.PI * .25, Math.PI * 1.25].forEach(a => { const s = cyl(.26 * k, .18, steel, 16); s.position.set(Math.cos(a) * 1.08 * k, Math.sin(a) * 1.08 * k, .1); j.add(s); });
    grp.add(j);
  };

  // main plate, frosted with perlage
  const plate = part('plate', 'Main plate', 'The foundation of the calibre, finished with perlage — overlapping circles of graining applied one by one with a rotating peg.', [0, 0, -2], [...P(-5.6, -4.8), Z.plate], [0, 0, 1]);
  const pl = new THREE.Mesh(new THREE.CircleGeometry(plateR, 96), plateM); pl.position.z = Z.plate; plate.add(pl);

  // going train
  const train = part('train', 'Barrel & going train', 'The mainspring in its toothed barrel drives the gilt centre, third and fourth wheels on steel pinions. The centre wheel carries the minute hand and turns once an hour.', [0, 0, 0], [...P(2.6, -3.6), Z.centre + .3], [0, 0, 1]);
  const barrel = wheel(train, BA, 5.2, 84, Z.barrel, .62, gilt, { spokes: 0, depth: .05 });
  const centre = wheel(train, C, 4.6, 72, Z.centre, .18, gilt); pinion(train, C, Z.barrel + .05, .72);
  const third = wheel(train, TH, 3.8, 64, Z.third, .18, gilt); pinion(train, TH, Z.third + .26, .4);
  const fourth = wheel(train, FO, 3.2, 60, Z.centre, .18, gilt); pinion(train, FO, Z.third, .35);
  const arbor = cyl(.55 * k, zD + .3 - Z.centre, steel); arbor.position.z = (Z.centre + zD + .3) / 2; train.add(arbor);

  // escapement: escape wheel and pallet fork with ruby pallets
  const escG = part('escapement', 'Escape wheel & pallet fork', 'The Swiss lever escapement. Each swing of the balance flicks the fork; its two ruby pallets let the steel escape wheel advance half a tooth per beat — the tick you hear.', [0, 0, .9], [...P(ES[0], ES[1] - 2.2), Z.esc + .3], [0, 0, 1]);
  const esc = wheel(escG, ES, 2.5, 15, Z.esc, .18, steel, { spokes: 4, saw: true, depth: .22, rim: .1, hub: .24 }); pinion(escG, ES, Z.esc + .26, .7, .55);
  const pal = at(new THREE.Group(), PA[0], PA[1], 0); escG.add(pal);
  {
    const v = (a, b) => new THREE.Vector2(b[0] - a[0], b[1] - a[1]), toB = v(PA, BL).normalize(), toE = v(PA, ES), aE = Math.atan2(-toE.y, -toE.x);
    const tip = toB.clone().multiplyScalar(3.4), side = new THREE.Vector2(-toB.y, toB.x).multiplyScalar(.42);
    const palPts = [aE - .62, aE + .62].map(a => [toE.x + 2.75 * Math.cos(a), toE.y + 2.75 * Math.sin(a)]);
    const lever = [ribbon([[0, 0], [tip.x, tip.y]], .5), ribbon([palPts[0], [0, 0], palPts[1]], .44), ribbon([[tip.x + side.x, tip.y + side.y], [tip.x + side.x + toB.x * .7, tip.y + side.y + toB.y * .7]], .26), ribbon([[tip.x - side.x, tip.y - side.y], [tip.x - side.x + toB.x * .7, tip.y - side.y + toB.y * .7]], .26)];
    lever.forEach(s => { const g = slab(s, .14, Z.pallet, .02, 12); g.scale(k, k, 1); pal.add(new THREE.Mesh(g, steel)); });
    palPts.forEach(([x, y]) => { const d = new THREE.Vector2(toE.x - x, toE.y - y).normalize(), st = new THREE.Mesh(new THREE.BoxGeometry(.32 * k, .8 * k, .22), RUBY); st.position.set((x + d.x * .3) * k, (y + d.y * .3) * k, Z.pallet + .05); st.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2; pal.add(st); });
  }

  // balance and hairspring
  const balG = part('balance', 'Balance & hairspring', 'The regulating organ: a gold screw balance breathing on a flat steel hairspring, 28,800 times an hour. The screws on its rim fine-tune its inertia.', [0, 0, 1.5], [...P(BL[0] - 3.5, BL[1] + 3.3), Z.balance + .45], [0, 0, 1]);
  const bal = wheel(balG, BL, 4.8, 0, Z.balance, .34, gold, { spokes: 3, rim: .11, hub: .13 });
  for (let i = 0; i < 18; i++) { const a = i / 18 * TAU, s = new THREE.Mesh(new THREE.CylinderGeometry(.2 * k, .2 * k, .55 * k, 12), gold); s.position.set(Math.cos(a) * 4.95 * k, Math.sin(a) * 4.95 * k, Z.balance + .21); s.rotation.z = a - Math.PI / 2; bal.add(s); }
  const staff = cyl(.22 * k, Z.bridge + .3 - Z.pallet, steel, 12); staff.position.z = (Z.pallet + Z.bridge + .3) / 2; bal.add(staff);
  const roller = cyl(.85 * k, .16, steel, 32); roller.position.z = Z.pallet + .07; bal.add(roller);
  const ipin = new THREE.Mesh(new THREE.BoxGeometry(.2 * k, .34 * k, .3), RUBY); ipin.position.set(0, -.62 * k, Z.pallet + .07); bal.add(ipin);
  const hs = at(new THREE.Group(), BL[0], BL[1], Z.spring); balG.add(hs);
  { const pts = []; for (let i = 0; i <= 720; i++) { const f = i / 720, a = f * 13 * TAU, r = (.7 + 2.6 * f) * k; pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), 0)); }
    hs.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 720, .045, 4), steel));
    const stud = new THREE.Mesh(new THREE.BoxGeometry(.5 * k, .5 * k, .14), steel); stud.position.set(3.3 * k, 0, 0); hs.add(stud); }

  // bridges, jewels and screws
  const brG = part('bridges', 'Bridges & jewels', 'Rhodium-plated German silver, striped with Côtes de Genève and bevelled by hand (anglage). Each pivot runs in a ruby jewel set in a gold chaton held by two screws.', [0, 0, 2.2], [...P(-10, 9.6), Z.top], [0, 0, 1]);
  const bridge = s => { const g = slab(s, .8, Z.bridge, .1, 32); g.scale(k, k, 1); brG.add(new THREE.Mesh(g, [rhod, bevel])); };
  bridge(blob([[-17.2, 1], [-15.8, 7.4], [-11.4, 12.9], [-4.4, 14.6], [1.6, 12.6], [2.4, 8.6], [.6, 4.4], [-1.9, .3], [-5.97, -.22], [-7.4, -3.6], [-9, -7.4], [-10.6, -10.4], [-13.2, -11], [-16.4, -5.2]]));
  bridge(keyhole([13.6, 10.6], BL, 3, 2.5));
  bridge(ribbon([[10.2, -13.7], FO, TH], 3));
  bridge(ribbon([[16.4, -5.8], ES], 2.4));
  bridge(ribbon([[16.95, -1.6], PA], 2));
  [TH, FO, ES, PA, BL].forEach(c => jewel(brG, c, Z.top - .1));
  [[-12, 5.2], [-10.9, -7.6], [-2, 12.2], [11.44, 7.32], [8.24, -10.92], [12.2, -6.06], [12.55, -2.29]].forEach(c => screw(brG, c, Z.top - .1));
  { const ix = new THREE.Vector2(BL[0] - 13.6, BL[1] - 10.6).normalize().rotateAround(new THREE.Vector2(), .55), g = slab(ribbon([BL, [BL[0] - ix.x * 3.8, BL[1] - ix.y * 3.8]], .34), .08, Z.top, 0); g.scale(k, k, 1); brG.add(new THREE.Mesh(g, steel)); }
  const eng = new THREE.Mesh(new THREE.PlaneGeometry(7.4 * k, 2.3 * k), new THREE.MeshStandardMaterial({ map: engraving([maker, '21 RUBIS · 4 Hz']), transparent: true, metalness: .9, roughness: .3, depthWrite: false }));
  at(eng, -11.1, -4.2, Z.top + .012).rotation.z = 1.16; brG.add(eng);

  // ratchet and crown wheels on top of the barrel bridge
  const rat = part('ratchet', 'Ratchet & crown wheels', 'Turning the crown spins the crown wheel, which winds the mainspring through the big ratchet wheel on the barrel arbor; a click stops it unwinding.', [0, 0, 3.2], [...P(BA[0] + 2.8, BA[1] + 2.8), Z.ratchet + .3], [0, 0, 1]);
  const soleil = metal('steel', 'brushed');
  wheel(rat, BA, 4, 48, Z.ratchet, .26, soleil, { spokes: 0, saw: true, depth: .06 });
  wheel(rat, CW, 2.2, 30, Z.ratchet, .26, soleil, { spokes: 0, depth: .1 });
  screw(rat, BA, Z.ratchet + .3); screw(rat, CW, Z.ratchet + .3);

  const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  return now => {
    const ms = now.getSeconds() * 1000 + now.getMilliseconds(), b = ms / 125, bi = Math.floor(b);
    bal.rotation.z = 1.6 * Math.sin(Math.PI * b);
    hs.rotation.z = bal.rotation.z * .22; hs.scale.set(1 + .028 * Math.sin(Math.PI * b), 1 + .028 * Math.sin(Math.PI * b), 1);
    esc.rotation.z = (bi + smooth((b - bi) / .2)) / 30 * TAU;
    pal.rotation.z = .09 * Math.tanh(6 * Math.sin(Math.PI * b));
    fourth.rotation.z = -bi / 480 * TAU;
    third.rotation.z = ((now.getMinutes() % 15) * 60 + ms / 1000) / 450 * TAU;
    centre.rotation.z = -(now.getMinutes() + ms / 60000) / 60 * TAU;
    barrel.rotation.z = ((now.getHours() % 8) * 60 + now.getMinutes()) / 480 * TAU;
  };
}

/* ───────────────────────── geometry helpers ───────────────────────── */
function ext(shape, depth, bevel = .3, seg = 48) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .85, bevelSegments: 4, curveSegments: seg });
}
function squircle(rx, ry, n = 4, seg = 160, barrel = 0) {
  const s = new THREE.Shape();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg * TAU, ct = Math.cos(t), st = Math.sin(t);
    let x = rx * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n), y = ry * Math.sign(st) * Math.pow(Math.abs(st), 2 / n);
    x *= 1 + barrel * (1 - (y / ry) ** 2);
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  return s;
}
function holePath(shape) { const p = new THREE.Path(); p.setFromPoints(shape.getPoints(160).reverse()); return p; }
function circlePath(r, cw = true) { const p = new THREE.Path(); p.absarc(0, 0, r, 0, TAU, cw); return p; }
function roundRect(w, h, r) { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }
/** a closed polygon through `v` with every corner rounded by `cr` */
function roundPoly(v, cr = 1.4) {
  const s = new THREE.Shape();
  v.forEach((p, i) => { const prev = v[(i + v.length - 1) % v.length], next = v[(i + 1) % v.length]; const toward = (q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [p[0] + dx / L * d, p[1] + dy / L * d]; }; const a = toward(prev, cr), b = toward(next, cr); i ? s.lineTo(...a) : s.moveTo(...a); s.quadraticCurveTo(p[0], p[1], ...b); });
  s.closePath(); return s;
}
function octagon(R, cr = 1.4) { return roundPoly(Array.from({ length: 8 }, (_, i) => { const a = (i + .5) / 8 * TAU; return [R * Math.cos(a), R * Math.sin(a)]; }), cr); }
/** lathe around the Z axis (profile given as [radius, z]); `displace(r, phi, z)` returns a new radius, or [radius, z] */
function latheZ(profile, seg = 160, displace) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  if (displace) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const r = Math.hypot(x, z), phi = Math.atan2(x, z); const d = displace(r, phi, y), nr = Array.isArray(d) ? d[0] : d; if (Array.isArray(d)) p.setY(i, d[1]); if (r > 1e-6) { p.setX(i, x / r * nr); p.setZ(i, z / r * nr); } } g.computeVertexNormals(); }
  g.rotateX(Math.PI / 2);
  return g;
}
function normalizeUV(geo) { geo.computeBoundingBox(); const b = geo.boundingBox, uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y)); uv.needsUpdate = true; return geo; }
/** A solid lofted along Y from cross-sections: `at(y)` gives [xInner, xOuter, zBottom, zTop]. The four faces and
 *  their chamfers keep crisp edges while staying smooth along the length; the far end is capped. */
function loftY(ys, at) {
  const pos = [], uv = [], idx = [];
  const ring = y => { const [xi, xo, zb, zt] = at(y), w = xo - xi, h = zt - zb, c = Math.min(.3, w * .2, h * .2), c2 = Math.min(.6, w * .26, h * .3);
    return [[xi, zb + c], [xi + c, zb], [xo - c, zb], [xo, zb + c], [xo, zt - c2], [xo - c2, zt], [xi + c2, zt], [xi, zt - c2]]; };
  const rings = ys.map(ring);
  // texture coordinates run along the length and around the section (brushed finishes need them to find their grain)
  rings.forEach((rg, j) => { for (let k = 0; k < 8; k++) { const a = rg[k], b = rg[(k + 1) % 8]; pos.push(a[0], ys[j], a[1], b[0], ys[j], b[1]); uv.push(k / 8, ys[j] / 8, (k + 1) / 8, ys[j] / 8); } });
  for (let j = 0; j < ys.length - 1; j++) for (let k = 0; k < 8; k++) { const a = (j * 8 + k) * 2, b = a + 16; idx.push(a, a + 1, b + 1, a, b + 1, b); }
  const last = rings[rings.length - 1], n0 = pos.length / 3, yl = ys[ys.length - 1];
  last.forEach((q, k) => { pos.push(q[0], yl, q[1]); uv.push(q[0] / 8, q[1] / 8 + k * 1e-3); }); for (let k = 1; k < 7; k++) idx.push(n0, n0 + k, n0 + k + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** One lug (12 o'clock, crown side; the other three are mirrored). It grows out of the case flank on a fillet,
 *  tapers to a rounded tip and curves down towards the wrist. `welded` lugs are slim and straight, `sport` lugs broad. */
function lugGeometry({ r, Rd, T, zB, zT, LW, L2, style }) {
  const [w0, w1, round] = style === 'welded' ? [2.3, 2.3, 1] : style === 'sport' ? [5.4, 4.1, .4] : [4.3, 2.8, .75];
  const xi = LW / 2 + .05, xt = xi + w1, rc = r - .5;
  const Px = Math.min(xi + w0, rc * .92), Py = Math.sqrt(rc * rc - Px * Px), rt = w1 / 2 * round, yS = L2 - rt;
  const pw = clamp(Py / Px * (yS - Py) / Math.max(.25, Px - xt), 1.2, 4.5), yStart = Py - .9;
  const slim = style === 'welded';
  const at = y => {
    const u = clamp((y - Py) / (L2 - Py), 0, 1), sv = clamp((y - Py) / (yS - Py), 0, 1);
    let xo = y <= Py ? Px : xt + (Px - xt) * Math.pow(1 - sv, pw);
    let xin = Math.max(xi, Math.sqrt(Math.max(0, (Rd + .8) ** 2 - y * y))); if (xin > xo - .4) xin = xo - .4;
    let zt = THREE.MathUtils.lerp(zT - (slim ? 1.1 : .45), -T * .2, Math.pow(u, slim ? 1.35 : 1.7)), zb = THREE.MathUtils.lerp(zB + (slim ? 1.5 : .6), -T * .4, Math.pow(u, .9));
    if (y > yS) { const d = Math.min(1, (y - yS) / rt), inset = rt * (1 - Math.sqrt(Math.max(0, 1 - d * d))), k = Math.sqrt(1 - d * d * .55), mid = (zt + zb) / 2;
      xin += inset; xo -= inset; if (xo - xin < .08) { const m = (xo + xin) / 2; xin = m - .04; xo = m + .04; } zt = mid + (zt - mid) * k; zb = mid + (zb - mid) * k; }
    return [xin, xo, zb, zt];
  };
  const N = 30, ys = Array.from({ length: N + 1 }, (_, j) => yStart + (L2 - yStart) * (1 - Math.pow(1 - j / N, 1.9)));
  return loftY(ys, at);
}
const M4 = new THREE.Matrix4();
/** Swept band (strap) along points; width along X, thickness along the curve normal. */
export function bandGeometry(pts, { w0 = 20, w1 = 16, t0 = 3.6, t1 = 2.2, center = new THREE.Vector3(0, 0, -30), seg = 140, axis = new THREE.Vector3(1, 0, 0), tip = 0 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const P = curve.getSpacedPoints(seg), L = curve.getLength();
  // padded profile: flat underside, rounded edges, a gentle dome on top (edges ~60% of centre thickness)
  const prof = [];
  const top = x => -.5 + (.6 + .4 * Math.sqrt(Math.max(0, Math.cos(Math.PI * x))));
  prof.push([-.46, -.5], [.46, -.5]);
  for (let i = 1; i <= 3; i++) { const a = -Math.PI / 2 + i / 3 * Math.PI / 2; prof.push([.46 + .04 * Math.cos(a), -.46 + .04 * Math.sin(a)]); }
  for (let i = 0; i <= 18; i++) { const x = .5 - i / 18; prof.push([x, top(Math.max(-.499, Math.min(.499, x)))]); }
  for (let i = 0; i <= 3; i++) { const a = Math.PI + i / 3 * Math.PI / 2; prof.push([-.46 + .04 * Math.cos(a), -.46 + .04 * Math.sin(a)]); }
  const pos = [], uv = [], idx = [], np = prof.length;
  P.forEach((p, i) => {
    const t = i / seg, T = curve.getTangentAt(Math.min(.999, t)).normalize();
    const N = new THREE.Vector3().crossVectors(T, axis).normalize();
    const out = p.clone().sub(center); if (N.dot(out) < 0) N.negate();
    let w = w0 + (w1 - w0) * t; const th = t0 + (t1 - t0) * Math.min(1, t * 2.2);
    if (tip && t > 1 - tip) { const q = (t - (1 - tip)) / tip; w *= .3 + .7 * Math.sqrt(Math.max(0, 1 - q * q)); }
    prof.forEach(([px, py]) => { const v = p.clone().addScaledVector(axis, px * w).addScaledVector(N, py * th); pos.push(v.x, v.y, v.z); uv.push(px + .5, t * L / (w0 * 2.2)); });
  });
  for (let i = 0; i < seg; i++) for (let k = 0; k < np; k++) { const a = i * np + k, b = i * np + (k + 1) % np, c = a + np, d = b + np; idx.push(a, c, b, b, c, d); }
  // end caps
  [0, seg].forEach((s, e) => { const base = pos.length / 3; const cp = P[s]; pos.push(cp.x, cp.y, cp.z); uv.push(.5, .5); for (let k = 0; k < np; k++) { const a = s * np + k, b = s * np + (k + 1) % np; e ? idx.push(base, a, b) : idx.push(base, b, a); } });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  g.userData.curve = curve; return g;
}
function frameAt(curve, t, center, axis = new THREE.Vector3(1, 0, 0)) {
  const p = curve.getPointAt(t), T = curve.getTangentAt(t).normalize(), N = new THREE.Vector3().crossVectors(T, axis).normalize();
  if (N.dot(p.clone().sub(center)) < 0) N.negate();
  return { p, T, N, X: axis.clone() };
}

/* ───────────────────────── hands ───────────────────────── */
function handGroup(style, len, w, mat, lume, z) {
  const g = new THREE.Group(); g.position.z = z;
  const add = (shape, m = mat, d = .22, dz = 0) => { const mesh = new THREE.Mesh(ext(shape, d, .05, 12), m); mesh.position.z = dz; mesh.castShadow = true; g.add(mesh); return mesh; };
  const tail = len * .16, S = new THREE.Shape();
  if (style === 'dauphine') {
    [-1, 1].forEach(s => { const h = new THREE.Shape(); h.moveTo(0, -tail); h.lineTo(s * w / 2, len * .1); h.lineTo(0, len); h.closePath(); const m = add(h); m.rotation.y = s * .22; });
    if (lume) { const l = new THREE.Shape(); l.moveTo(0, len * .2); l.lineTo(-w * .16, len * .32); l.lineTo(0, len * .82); l.lineTo(w * .16, len * .32); l.closePath(); add(l, LUME, .05, .3); }
  } else if (style === 'sword' || style === 'mercedes-m') {
    S.moveTo(-w * .35, -tail); S.lineTo(-w / 2, len * .62); S.lineTo(0, len); S.lineTo(w / 2, len * .62); S.lineTo(w * .35, -tail); S.closePath(); add(S);
    if (lume) { const l = new THREE.Shape(); l.moveTo(-w * .2, len * .1); l.lineTo(-w * .28, len * .6); l.lineTo(0, len * .88); l.lineTo(w * .28, len * .6); l.lineTo(w * .2, len * .1); l.closePath(); add(l, LUME, .05, .3); }
  } else if (style === 'mercedes') {
    S.moveTo(-w * .3, -tail); S.lineTo(-w * .3, len * .55); S.lineTo(w * .3, len * .55); S.lineTo(w * .3, -tail); S.closePath(); add(S);
    const ring = new THREE.Shape(); ring.absarc(0, len * .72, len * .19, 0, TAU, false); ring.holes.push((() => { const p = new THREE.Path(); p.absarc(0, len * .72, len * .14, 0, TAU, true); return p; })()); add(ring);
    [0, 2.09, 4.19].forEach(a => { const sp = new THREE.Mesh(new THREE.BoxGeometry(w * .16, len * .15, .22), mat); sp.position.set(Math.sin(a) * len * .07, len * .72 + Math.cos(a) * len * .07, .11); sp.rotation.z = -a; g.add(sp); });
    const tip = new THREE.Shape(); tip.moveTo(-w * .3, len * .9); tip.lineTo(0, len * 1.04); tip.lineTo(w * .3, len * .9); tip.closePath(); add(tip);
    if (lume) { const l = new THREE.Shape(); l.absarc(0, len * .72, len * .14, 0, TAU, false); add(l, LUME, .05, .02); }
  } else if (style === 'breguet') {
    S.moveTo(-w * .14, -tail); S.lineTo(-w * .1, len * .6); S.lineTo(w * .1, len * .6); S.lineTo(w * .14, -tail); S.closePath(); add(S);
    const ring = new THREE.Shape(); ring.absarc(0, len * .68, len * .085, 0, TAU, false); ring.holes.push((() => { const p = new THREE.Path(); p.absarc(len * .012, len * .684, len * .056, 0, TAU, true); return p; })()); add(ring);
    const tip = new THREE.Shape(); tip.moveTo(-w * .1, len * .75); tip.lineTo(0, len); tip.lineTo(w * .1, len * .75); tip.closePath(); add(tip);
  } else if (style === 'snowflake') {
    S.moveTo(-w * .22, -tail); S.lineTo(-w * .22, len * .62); S.lineTo(w * .22, len * .62); S.lineTo(w * .22, -tail); S.closePath(); add(S);
    const d = new THREE.Shape(); d.moveTo(0, len * .58); d.lineTo(-w * .6, len * .74); d.lineTo(0, len * .9); d.lineTo(w * .6, len * .74); d.closePath(); add(d); if (lume) { const l = new THREE.Shape(); l.moveTo(0, len * .62); l.lineTo(-w * .42, len * .74); l.lineTo(0, len * .86); l.lineTo(w * .42, len * .74); l.closePath(); add(l, LUME, .05, .3); }
    const tip = new THREE.Shape(); tip.moveTo(-w * .22, len * .9); tip.lineTo(0, len); tip.lineTo(w * .22, len * .9); tip.closePath(); add(tip);
  } else if (style === 'leaf') { // feuille: a slender leaf, widest a third of the way out
    S.moveTo(0, -tail); S.quadraticCurveTo(-w * .3, -tail * .2, -w * .16, len * .06); S.quadraticCurveTo(-w * .7, len * .36, 0, len); S.quadraticCurveTo(w * .7, len * .36, w * .16, len * .06); S.quadraticCurveTo(w * .3, -tail * .2, 0, -tail); add(S);
  } else { // baton, or the slimmer stick
    S.moveTo(-w * .42, -tail); S.lineTo(-w * .3, len); S.lineTo(w * .3, len); S.lineTo(w * .42, -tail); S.closePath(); add(S);
    if (lume) { const l = new THREE.Shape(); l.moveTo(-w * .17, len * .25); l.lineTo(-w * .13, len * .94); l.lineTo(w * .13, len * .94); l.lineTo(w * .17, len * .25); l.closePath(); add(l, LUME, .05, .3); }
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(w * .45, w * .45, .4, 32), mat); hub.rotation.x = Math.PI / 2; hub.position.z = .1; g.add(hub);
  return g;
}

/* ───────────────────────── the watch ───────────────────────── */
export function buildWatch(sp) {
  sp = { D: 40, T: 12, shape: 'round', metal: 'steel', dial: '#121316', dialType: 'sunburst', bezel: 'plain', hands: 'baton', strap: 'alligator', strapColor: '#2a160c', LW: 20, ...sp };
  const root = new THREE.Group(); root.name = 'watch';
  const parts = [];
  const part = (id, name, desc, explode, anchor, normal) => { const g = new THREE.Group(); g.name = id; root.add(g); parts.push({ id, name, desc, group: g, explode: new THREE.Vector3(...explode), anchor: new THREE.Vector3(...anchor), normal: new THREE.Vector3(...normal).normalize() }); return g; };
  const shadowed = o => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

  const T = sp.T, shapeKind = sp.shape === 'lug' ? 'round' : sp.shape;
  const isRect = ['rect', 'digital'].includes(shapeKind), isRound = ['round', 'pocket'].includes(shapeKind);
  const W = sp.D, H = sp.H || (shapeKind === 'rect' ? sp.D * 1.34 : shapeKind === 'digital' ? sp.D * 1.1 : sp.D);
  const r = W / 2;
  const zB = -T * .42, zT = T * .12, zBz = T * .27, zDial = T * .02;
  const polish = metal(sp.metal, 'polished'), brush = metal(sp.metal, sp.metal === 'ti' ? 'blasted' : 'brushed');
  const darkDial = lum(sp.dial) < .45;
  const bezelInsert = ['diver', 'pepsi', 'tachy', 'gmt', 'tenth', 'slide'].includes(sp.bezel);
  const Rd = isRound ? r * (bezelInsert ? .76 : sp.bezel === 'fluted' ? .8 : sp.bezel === 'thin' ? .9 : sp.bezel === 'screws' ? .74 : .86)
    : shapeKind === 'octagon' ? r * .74 : shapeKind === 'nautilus' ? r * .78 : shapeKind === 'cushion' ? r * .74 : shapeKind === 'tonneau' ? r * .7 : shapeKind === 'santos' ? r * .78 : r * .8;

  // bezel outline and its opening, for every shape that is not round (the case is cut to the same opening)
  const reverso = /Reverso/i.test(sp.name || ''), rectIn = reverso ? [W - 4.6, H - 13.6, .7] : [W - 5.4, H - 6, 1.2]; // opening of a rectangular case
  const bezelShapes = () => {
    let outer, inner;
    if (shapeKind === 'octagon') { outer = octagon(r * 1.04, 2.2); inner = squircle(Rd, Rd, 2); }
    else if (shapeKind === 'nautilus') { outer = squircle(r * .94, r * .94, 4.6); inner = squircle(Rd, Rd, 4.6); }
    else if (shapeKind === 'santos') { outer = squircle(r * .96, r * .96, 7); inner = squircle(Rd, Rd, 7); }
    else if (shapeKind === 'cushion') { outer = (() => { const s = new THREE.Shape(); s.absarc(0, 0, r * .9, 0, TAU, false); return s; })(); inner = squircle(Rd, Rd, 2); }
    else if (shapeKind === 'tonneau') { outer = squircle(r * .82, r * 1.06, 2.7, 160, .09); inner = squircle(Rd * .82, Rd * 1.1, 2.6, 160, .08); }
    else if (shapeKind === 'digital') { outer = roundRect(W - 2, H - 2, 5); inner = roundRect(W - 9, H - 13, 3); }
    else { outer = roundRect(W - 1.6, H - 1.6, 2.2); inner = roundRect(...rectIn); }
    return [outer, inner];
  };
  /* ── case middle & lugs ── */
  const caseG = part('case', 'Case', sp.caseband === 'fluted' ? `The housing, in ${sp.metalName || sp.metal}. Its band is finely fluted all the way round — straight grooves cut cold, one by one — a Breguet signature for two centuries.` : `The housing, machined from ${sp.metalName || sp.metal}. Brushed flats, polished flanks and chamfers.`, [0, 0, 0], [r * .99, -r * .25, (zB + zT) / 2], [1, -.2, 0]);
  let caseShape;
  if (isRound) {
    const prof = sp.shape === 'pocket'
      ? [[r * .55, zB], [r - 2, zB], [r - .5, zB + 1.6], [r + .1, (zB + zT) / 2], [r - .4, zT - 1.3], [r - 1.4, zT], [Rd + .4, zT]]
      : sp.caseband === 'fluted' ? [[r * .55, zB], [r - 1, zB], [r - .25, zB + .7], [r, zB + 1.05], [r, (zB + zT) / 2], [r, zT - .95], [r - .25, zT - .6], [r - .8, zT], [Rd + .4, zT]]
      : [[r * .55, zB], [r - .9, zB], [r - .15, zB + .9], [r + .12, (zB + zT) / 2], [r - .1, zT - .7], [r - .7, zT], [Rd + .4, zT]];
    if (sp.caseband === 'fluted') { // fine straight flutes cut all round the band, between two polished fillets
      const nB = Math.round(TAU * r / .82), cg = latheZ(prof, nB * 2, (R, phi, z) => R > r - .05 && z > zB + 1 && z < zT - .9 && Math.round(phi / TAU * nB * 2) % 2 !== 0 ? R - .17 : R).toNonIndexed(); cg.computeVertexNormals();
      caseG.add(new THREE.Mesh(cg, polish));
    } else caseG.add(new THREE.Mesh(latheZ(prof, 200), brush));
  } else {
    caseShape = shapeKind === 'octagon' ? roundPoly([[r, -r * .42], [r, r * .42], [r * .68, r * 1.14], [-r * .68, r * 1.14], [-r, r * .42], [-r, -r * .42], [-r * .68, -r * 1.14], [r * .68, -r * 1.14]], 1.6) : shapeKind === 'nautilus' ? squircle(r, r, 4.2) : shapeKind === 'santos' ? squircle(r, r, 7) : shapeKind === 'cushion' ? squircle(r, r, 3.1) : shapeKind === 'tonneau' ? squircle(r * .86, r * 1.12, 2.7, 160, .09) : shapeKind === 'digital' ? roundRect(W, H, 6) : roundRect(W - 1, H, 2.6);
    // the case is a frame around the bezel opening, so the dial sits in it rather than under solid metal;
    // a plate closes the opening from behind
    const opening = bezelShapes()[1], caseMat = shapeKind === 'digital' ? metal('carbon') : brush;
    caseShape.holes.push(holePath(opening));
    const g = ext(caseShape, zT - zB - 1.2, .6, 96); g.translate(0, 0, zB + .6);
    caseG.add(new THREE.Mesh(g, caseMat));
    const seat = new THREE.Mesh(new THREE.ShapeGeometry(opening, 64), caseMat); seat.position.z = zB + .7; caseG.add(seat);
  }
  // attach geometry for straps
  let attach = { y: 0, z: -T * .16, w: sp.LW || 20 };
  if (isRound && sp.shape !== 'pocket') {
    const L2 = Math.max(r + 5, (sp.L2L || W * 1.2) / 2), LW = sp.LW || Math.round(W * .5), lugStyle = sp.lugs || 'classic';
    if (lugStyle === 'hooded') {
      // integrated construction: no horns, the bracelet flows out of a hood on the case
      const lugsG = part('lugs', 'Integrated attachment', 'No lugs at all: the case flanks run straight into a hood that carries the first link, so case and bracelet read as one piece.', [0, 0, 0], [LW / 2 - 1, L2 - 3, -T * .05], [.2, .6, .7]);
      const hw = LW / 2 + 2.4, y0 = Math.sqrt(Math.max(1, (r - .6) ** 2 - hw * hw)), yt = L2 - 1, ys = Array.from({ length: 17 }, (_, j) => y0 - .8 + (yt - y0 + .8) * j / 16);
      const hood = loftY(ys, y => { const u = clamp((y - y0) / (yt - y0), 0, 1), xo = THREE.MathUtils.lerp(hw, LW / 2 + .4, Math.pow(u, .9));
        return [-xo, xo, THREE.MathUtils.lerp(zB + .6, -T * .42, u), THREE.MathUtils.lerp(zT - .4, -T * .1, Math.pow(u, 1.4))]; });
      for (const sy of [1, -1]) { const m = new THREE.Mesh(hood, brush); m.scale.set(1, sy, 1); lugsG.add(m); }
    } else {
      const welded = lugStyle === 'welded';
      const lugsG = part('lugs', welded ? 'Welded lugs' : 'Lugs', welded ? `Slim, straight horns soldered to the case band one by one. The strap is held by screw-pin bars — their slotted heads show on the outside of each lug. ${LW} mm between them.` : `Horns that hold the strap on spring bars. They grow out of the case flank and curve down to the wrist. ${LW} mm between them; ${(L2 * 2).toFixed(0)} mm tip-to-tip decides how it wears.`, [0, 0, 0], [LW / 2 + 1.5, L2 - 1.5, -T * .12], [.3, .6, .6]);
      const lg = lugGeometry({ r, Rd, T, zB, zT, LW, L2, style: lugStyle });
      for (const sy of [1, -1]) for (const sx of [1, -1]) {
        const m = new THREE.Mesh(lg, brush); m.scale.set(sx, sy, 1); lugsG.add(m);
        if (welded) { // slotted screw head of the bar, on the outer flank
          const hd = new THREE.Group(); hd.position.set(sx * (LW / 2 + 2.38), sy * (L2 - 2.1), -T * .29); hd.rotation.y = sx * Math.PI / 2; lugsG.add(hd);
          const c = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .16, 24), polish); c.rotation.x = Math.PI / 2; hd.add(c);
          const sl = new THREE.Mesh(new THREE.BoxGeometry(1.0, .16, .1), metal('black')); sl.position.z = .06; sl.rotation.z = .5; hd.add(sl);
        }
      }
    }
    attach = { y: L2 - 2.1, z: -T * .2, w: LW };
  } else if (shapeKind === 'rect') {
    if (reverso) { // three gadroons above and below the dial: grooves cut across the case
      for (const sy of [1, -1]) for (let k = 0; k < 3; k++) { const gd = new THREE.Mesh(new THREE.BoxGeometry(W - 2.6, .42, .3), metal('black')); gd.position.set(0, sy * (H / 2 - 2.3 - k * 1.3), zBz - .06); caseG.add(gd); }
      attach = { y: H / 2 + 1.2, z: -T * .15, w: W * .66 }; }
    else { const lugsG = part('lugs', 'Brancards', 'The Tank\'s side rails — the "treads" — extend past the case to form integrated lugs.', [0, 0, 0], [W / 2 - 1.5, H / 2 + 2, zT], [.5, .5, .7]);
      for (const sx of [1, -1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(4.2, H + 10, T * .78, 4, 1.6), polish); b.position.set(sx * (W / 2 - 1.6), 0, (zB + zT) / 2 + .2); lugsG.add(b); }
      attach = { y: H / 2 + 3.4, z: -T * .12, w: sp.LW || W - 7 }; }
  } else if (shapeKind === 'santos') {
    const lugsG = part('lugs', 'Lugs', 'Short horns integrated into the square case, flowing into the bracelet.', [0, 0, 0], [6, r + 3, 0], [0, .6, .7]);
    { const yb = r * .7, yt = r + 6.6, ys = Array.from({ length: 15 }, (_, j) => yb + (yt - yb) * j / 14);
      const lg = loftY(ys, y => { const u = clamp((y - r * .9) / (yt - r * .9), 0, 1); return [10.6, THREE.MathUtils.lerp(r * .97, 14.2, Math.pow(u, .7)), THREE.MathUtils.lerp(zB + .6, -T * .4, u), THREE.MathUtils.lerp(zT - .3, -T * .16, Math.pow(u, 1.5))]; });
      for (const sy of [1, -1]) for (const sx of [1, -1]) { const m = new THREE.Mesh(lg, brush); m.scale.set(sx, sy, 1); lugsG.add(m); } }
    attach = { y: r + 5, z: -T * .16, w: 21 };
  } else if (shapeKind === 'cushion') {
    const lugsG = part('lugs', 'Lugs', 'Wire-style lugs grown out of the cushion case — a signature of 1930s Italian Navy instruments.', [0, 0, 0], [8, r + 4, 0], [0, .6, .7]);
    for (const sy of [1, -1]) for (const sx of [1, -1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(3, 9, T * .5, 3, .9), brush); b.position.set(sx * 11.5, sy * (r + 2.4), -T * .14); lugsG.add(b); }
    attach = { y: r + 4.8, z: -T * .18, w: 22 };
  } else if (shapeKind === 'tonneau') { attach = { y: r * 1.12 - .5, z: -T * .2, w: r * 1.15 }; }
  else if (shapeKind === 'digital') { attach = { y: H / 2 + .6, z: -T * .2, w: sp.LW || 18 }; }
  else if (shapeKind === 'octagon') { attach = { y: r * 1.1, z: -T * .2, w: r * 1.3 }; }
  else if (shapeKind === 'nautilus') {
    const ears = part('lugs', 'Hinges ("ears")', 'The porthole-inspired side hinges — functional on a ship\'s window, decorative and iconic here.', [0, 0, 0], [r + 2, 0, 0], [1, 0, .4]);
    for (const sx of [1, -1]) { const e = new THREE.Mesh(new RoundedBoxGeometry(5, 9, T * .7, 4, 1.8), polish); e.position.set(sx * (r + .6), 0, (zB + zT) / 2); ears.add(e); }
    attach = { y: r, z: -T * .2, w: r * 1.35 };
  }

  /* ── bezel ── */
  const bezelG = part('bezel', 'Bezel', bezelDesc(sp.bezel, shapeKind), [0, 0, 9], [-(Rd + (r - Rd) * .5) * .72, (Rd + (r - Rd) * .5) * .72, zBz], [-.3, .3, 1]);
  if (isRound) {
    const rr = r - .25;
    if (bezelInsert) {
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT], [rr, zT], [rr + .05, zT + 1.2], [rr - .5, zBz], [Rd + .3, zBz - .3]], 320, (R, phi, y) => R > rr - .3 ? R - .16 * (.5 - .5 * Math.cos(120 * phi)) : R), polish));
      const ins = new THREE.Mesh(new THREE.RingGeometry(Rd + .4, rr - .9, 160, 1), new THREE.MeshPhysicalMaterial({ map: bezelTexture(sp.bezel, sp), roughness: sp.bezel === 'tachy' && !sp.bezelColor ? .3 : .1, metalness: sp.bezel === 'tachy' && !sp.bezelColor ? .6 : 0, clearcoat: 1 }));
      ins.position.z = zBz + .06; bezelG.add(ins);
      if (sp.bezel === 'diver' || sp.bezel === 'pepsi') { const pip = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .3, 24), LUME); pip.rotation.x = Math.PI / 2; pip.position.set(0, (Rd + rr) / 2, zBz + .2); bezelG.add(pip); }
    } else if (sp.bezel === 'fluted') {
      // V-flutes run radially down the sloping face; one facet per side, shaded flat like cut metal
      const nF = sp.flutes || 72, span = sp.fluteSpan || 1, ri = rr - (rr - Rd - .95) * span, depth = sp.fluteDepth || .32;
      const fg = latheZ([[Rd, zT], [rr, zT], [rr, zT + .75], [(rr + ri) / 2, zT + .75 + (zBz - zT - .45) * (.5 * span + .06)], [ri, zT + .75 + (zBz - zT - .45) * span], ...(span < 1 ? [[Rd + .95, zBz + .3]] : []), [Rd + .45, zBz + .25], [Rd + .45, zBz - .2]], nF * 2, (R, phi, z) => {
        const t = clamp((R - ri) / (rr - ri), 0, 1), groove = Math.round(phi / TAU * nF * 2) % 2 !== 0;
        return groove && z > zT + .1 && t > 0 ? [R - .1 * t, z - depth * t] : R;
      }).toNonIndexed(); fg.computeVertexNormals();
      bezelG.add(new THREE.Mesh(fg, polish));
    } else if (sp.bezel === 'maltese') {
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT], [rr, zT], [rr, zT + .7], [rr - .6, zBz], [Rd + .4, zBz]], 360, (R, phi) => { const t = clamp((R - Rd) / (rr - Rd), 0, 1); return R - 1.4 * t * Math.pow(Math.max(0, Math.cos(3 * phi)), 40); }), brush));
    } else if (sp.bezel === 'clous') {
      const m = new THREE.MeshPhysicalMaterial({ color: METAL[sp.metal] || METAL.steel, metalness: 1, roughness: .2, bumpMap: canvasTex(512, 512, (g, w) => { g.fillStyle = '#777'; g.fillRect(0, 0, w, w); for (let y = 0; y < w; y += 16) for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, y, x + 16, y + 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.beginPath(); g.moveTo(x + 8, y); g.lineTo(x + 16, y + 8); g.lineTo(x + 8, y + 16); g.lineTo(x, y + 8); g.fill(); } }, { srgb: false, repeat: [20, 1] }), bumpScale: 1.5 });
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT], [rr, zT], [rr, zT + .5], [rr - .3, zBz], [Rd + .5, zBz + .1]], 200), m));
    } else if (sp.bezel === 'screws') {
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT], [rr, zT], [rr, zBz - .3], [rr - 1, zBz], [Rd + .3, zBz]], 160), metal(sp.metal === 'ti' ? 'ti' : 'ceramic', 'polished')));
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + TAU / 12, sc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .5, 32), metal('ti', 'polished')); sc.rotation.x = Math.PI / 2; sc.position.set(Math.cos(a) * (Rd + rr) / 2, Math.sin(a) * (Rd + rr) / 2, zBz + .1); bezelG.add(sc); const sl = new THREE.Mesh(new THREE.BoxGeometry(1.6, .3, .2), metal('black')); sl.position.copy(sc.position).add(new THREE.Vector3(0, 0, .3)); sl.rotation.z = a + .8; bezelG.add(sl); const sl2 = sl.clone(); sl2.rotation.z = a - .8; bezelG.add(sl2); }
    } else {
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT + (sp.bezel === 'thin' ? .4 : 0)], [rr, zT], [rr + .05, zT + .5], [rr - .5, zBz - (sp.bezel === 'thin' ? .6 : 0)], [Rd + .5, zBz - (sp.bezel === 'thin' ? .4 : 0)]], 200), polish));
    }
  } else {
    const [outer, inner] = bezelShapes();
    outer.holes.push(holePath(inner));
    const g = ext(outer, zBz - zT - .9, .45, 96); g.translate(0, 0, zT + .45);
    bezelG.add(new THREE.Mesh(g, shapeKind === 'digital' ? metal('carbon') : shapeKind === 'tonneau' ? metal('carbon') : polish));
    if (shapeKind === 'octagon') for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU, R2 = r * .9; const sc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, .6, 6), metal('white', 'polished')); sc.rotation.x = Math.PI / 2; sc.rotation.y = a; sc.position.set(R2 * Math.cos(a), R2 * Math.sin(a), zBz + .1); bezelG.add(sc); }
    if (shapeKind === 'santos' || shapeKind === 'tonneau') { const pts = shapeKind === 'santos' ? [[-1, -1], [0, -1.08], [1, -1], [1.08, 0], [1, 1], [0, 1.08], [-1, 1], [-1.08, 0]].map(([x, y]) => [x * r * .8, y * r * .8]) : [[-.62, -.95], [0, -1.03], [.62, -.95], [-.62, .95], [0, 1.03], [.62, .95], [-.82, 0], [.82, 0]].map(([x, y]) => [x * r, y * r]); pts.forEach(([x, y]) => { const sc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .5, 32), metal(shapeKind === 'tonneau' ? 'ti' : sp.metal, 'polished')); sc.rotation.x = Math.PI / 2; sc.position.set(x, y, zBz + .1); bezelG.add(sc); }); }
    if (shapeKind === 'cushion') { const g2 = latheZ([[Rd, zBz - .4], [r * .9, zBz - .4], [r * .9, zBz + .6], [Rd + .5, zBz + .8]], 160); bezelG.add(new THREE.Mesh(g2, polish)); }
  }

  /* ── dial & indices ── */
  const dialG = part('dial', 'Dial', dialDesc(sp), [0, 0, 3.5], [0, -Rd * .6, zDial], [0, 0, 1]);
  const dialTex = dialTexture(sp, isRect ? rectIn[0] + .4 : 1, isRect ? rectIn[1] + .4 : 1);
  let dialGeo;
  if (isRound || ['octagon', 'cushion'].includes(shapeKind)) dialGeo = new THREE.CircleGeometry(isRound ? Rd + .2 : Rd + .2, 128);
  else { const s = shapeKind === 'nautilus' ? squircle(Rd + .3, Rd + .3, 4.6) : shapeKind === 'santos' ? squircle(Rd + .3, Rd + .3, 7) : shapeKind === 'tonneau' ? squircle(Rd * .84, Rd * 1.12, 2.6, 128, .08) : roundRect(rectIn[0] + .4, rectIn[1] + .4, rectIn[2] + .2); dialGeo = normalizeUV(new THREE.ShapeGeometry(s, 64)); }
  const dialMesh = new THREE.Mesh(dialGeo, new THREE.MeshPhysicalMaterial({ map: dialTex, roughness: sp.dialType === 'enamel' ? .08 : .32, metalness: sp.dialType === 'enamel' || sp.dialType === 'lcd' ? 0 : .35, clearcoat: sp.dialType === 'enamel' ? 1 : .2 }));
  dialMesh.position.z = zDial; dialMesh.receiveShadow = true; dialG.add(dialMesh);
  let movementTick = null;
  if (sp.openDial && (isRound || shapeKind === 'tonneau')) {
    dialMesh.material.alphaTest = .5;
    const Rt = isRound ? Rd + .2 : Rd * .84, frac = openFrac(sp), maker = (sp.brand || 'MechWatch').toUpperCase();
    if (isRound) { // a polished bead finishes the cut edge: gold on enamel, the case metal on a skeleton
      const Ro = Rt * frac, S = .48 * Rt, rs = .208 * Rt, rim = sp.skeleton ? polish : metal('gold', 'polished'), isle = sp.subsec && !sp.skeleton && (sp.subsecAt ?? 6) === 6;
      const yx = isle ? (rs * rs - Ro * Ro - S * S) / (2 * S) : -Ro, xx = Math.sqrt(Math.max(0, Ro * Ro - yx * yx));
      const a0 = Math.atan2(yx, xx), b0 = Math.atan2(yx + S, xx);
      const bead = new THREE.Mesh(new THREE.TorusGeometry(Ro, .14, 10, 200, TAU - 2 * (a0 + Math.PI / 2)), rim); bead.rotation.z = a0; bead.position.z = zDial + .02; dialG.add(bead);
      if (isle) { const sb = new THREE.Mesh(new THREE.TorusGeometry(rs, .1, 8, 120, TAU - 2 * (b0 + Math.PI / 2)), rim); sb.rotation.z = b0; sb.position.set(0, -S, zDial + .02); dialG.add(sb); }
    }
    movementTick = openMovement(part, Rt, zDial, { frac, plateR: isRound ? Rt + .1 : Rd * 1.14, maker: maker.length > 14 ? maker.split(' ')[0] : maker });
  }
  // rehaut (inner flange)
  if (isRound) dialG.add(new THREE.Mesh(latheZ([[Rd + .2, zDial], [Rd + .2, zDial + .2], [Rd + .55, zBz - .4]], 128), new THREE.MeshStandardMaterial({ color: shade(cssHex(sp.dial), -.4), roughness: .5, metalness: .3, side: THREE.DoubleSide })));
  const idxMetal = sp.indexMetal ? metal(sp.indexMetal, 'polished') : (['gold', 'rose'].includes(sp.metal) ? polish : metal('white', 'polished'));
  const appliedTypes = { diver: 'dots', snowflakehand: 'dots', gmt: 'dots', tapisserie: 'wide', sunburst: 'batons', horizontal: 'batons', snow: 'batons', birch: 'batons', fume: 'none', perpetual: 'batons3', dress: 'dauphine', chrono: 'batons', guilloche: 'batons' };
  const app = sp.indices || appliedTypes[sp.dialType] || (['roman', 'enamel', 'flieger', 'field', 'journe', 'sandwich', 'tourbillon', 'lange1', 'zeitwerk', 'lcd', 'skeleton'].includes(sp.dialType) ? 'none' : 'batons');
  if (app !== 'none' && !isRect) {
    const iG = new THREE.Group(); dialG.add(iG);
    const RI = shapeKind === 'nautilus' || shapeKind === 'santos' ? Rd * .82 : Rd * .8;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, x = Math.sin(a) * RI, y = Math.cos(a) * RI;
      if ((sp.subs >= 2 && (i === 3 || i === 9)) || (sp.subs === 3 && i === 6) || (sp.subsec && Math.abs(i - (sp.subsecAt ?? 6)) < .6) || (app === 'batons3' && i % 3 === 0) || (sp.date && i === (sp.dateAt ?? 3) && (!sp.subs || sp.dateAt)) || (sp.day && i === 0) || (sp.dialType === 'tourbillon' && i === 6)) continue;
      const holder = new THREE.Group(); holder.position.set(x, y, zDial); holder.rotation.z = -a; iG.add(holder);
      if (app === 'dots') {
        if (i === 0) { const tri = new THREE.Shape(); tri.moveTo(0, -Rd * .1); tri.lineTo(-Rd * .085, Rd * .06); tri.lineTo(Rd * .085, Rd * .06); tri.closePath(); const m = new THREE.Mesh(ext(tri, .35, .08), idxMetal); holder.add(m); const l = new THREE.Mesh(ext(tri, .2, 0), LUME); l.scale.setScalar(.72); l.position.z = .4; holder.add(l); }
        else if (i % 3 === 0) { const b = new THREE.Mesh(new RoundedBoxGeometry(Rd * .07, Rd * .17, .7, 2, .2), idxMetal); holder.add(b); const l = new THREE.Mesh(new RoundedBoxGeometry(Rd * .05, Rd * .15, .3, 2, .1), LUME); l.position.z = .25; holder.add(l); }
        else { const c = new THREE.Mesh(new THREE.CylinderGeometry(Rd * .052, Rd * .052, .6, 32), idxMetal); c.rotation.x = Math.PI / 2; holder.add(c); const l = new THREE.Mesh(new THREE.CylinderGeometry(Rd * .04, Rd * .04, .3, 32), LUME); l.rotation.x = Math.PI / 2; l.position.z = .25; holder.add(l); }
      } else {
        const wide = app === 'wide', L = Rd * (i % 3 === 0 ? .17 : .13), wd = wide ? Rd * .055 : Rd * .03;
        for (const o of (i === 0 ? [-wd * .9, wd * .9] : [0])) { const b = new THREE.Mesh(new RoundedBoxGeometry(wd, L, .7, 2, wd * .3), idxMetal); b.position.x = o; holder.add(b); if (wide || darkDial) { const l = new THREE.Mesh(new RoundedBoxGeometry(wd * .35, L * .8, .2, 1, .05), LUME); l.position.set(o, 0, .34); holder.add(l); } }
      }
    }
  }
  /* ── hands ── */
  const handsG = part('hands', 'Hands', handsDesc(sp.hands, sp.handMetal), [0, 0, 6.5], [-Rd * .18, Rd * .22, zDial + 1.2], [0, 0, 1]);
  const caseGold = ['gold', 'rose'].includes(sp.metal), hm = sp.handMetal;
  const handMat = hm === 'black' ? BLACKH : hm ? handMetal(hm) : caseGold ? handMetal(sp.metal) : darkDial ? handMetal('white') : BLACKH;
  const lume = sp.lume ?? (darkDial && !['dauphine', 'breguet', 'leaf', 'stick'].includes(sp.hands));
  const accent = sp.accent === 'red' || sp.accent === 'sec' ? REDH : null, counter = sp.accent === 'red' ? REDH : handMat; // chronograph hands
  const slim = sp.hands === 'stick' ? .58 : sp.hands === 'leaf' ? 1.25 : 1;
  const hourStyle = sp.hands === 'mercedes' ? 'mercedes' : sp.hands, minStyle = sp.hands === 'mercedes' ? 'sword' : sp.hands;
  const hScale = isRect ? Math.min(W, H) / 2 * .85 : Rd;
  const HH = sp.hands !== 'none' && sp.dialType !== 'lcd' && sp.dialType !== 'zeitwerk' ? handGroup(hourStyle, hScale * .56, hScale * (sp.hands === 'dauphine' ? .13 : .095 * slim), handMat, lume, zDial + .5) : null;
  const MH = HH ? handGroup(minStyle, hScale * (isRect ? .95 : .86), hScale * (sp.hands === 'dauphine' ? .1 : .072 * slim), handMat, lume, zDial + .9) : null;
  let SH = null;
  if (HH) {
    handsG.add(HH, MH);
    if (!sp.subsec && sp.sec !== false && sp.dialType !== 'tourbillon' && sp.dialType !== 'lange1') {
      SH = new THREE.Group(); SH.position.z = zDial + 1.35;
      const sMat = sp.subs && accent ? accent : sp.secMetal ? handMetal(sp.secMetal) : handMat;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.2, hScale * 1.12, .12), sMat); bar.position.y = hScale * .38; SH.add(bar);
      const cw = new THREE.Mesh(new THREE.CylinderGeometry(hScale * .034, hScale * .034, .14, 24), sMat); cw.rotation.x = Math.PI / 2; cw.position.y = -hScale * .12; SH.add(cw);
      if (sp.bezel === 'diver' || sp.dialType === 'diver') { const lol = new THREE.Mesh(new THREE.CylinderGeometry(hScale * .045, hScale * .045, .2, 24), LUME); lol.rotation.x = Math.PI / 2; lol.position.y = hScale * .62; SH.add(lol); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .5, 24), sMat); cap.rotation.x = Math.PI / 2; SH.add(cap);
      handsG.add(SH);
    }
  }
  let GH = null;
  if (sp.gmt) { GH = new THREE.Group(); GH.position.z = zDial + .7; const b = new THREE.Mesh(new THREE.BoxGeometry(.3, Rd * .82, .12), REDH); b.position.y = Rd * .41; GH.add(b); const tip = new THREE.Shape(); tip.moveTo(-Rd * .06, Rd * .8); tip.lineTo(0, Rd * .96); tip.lineTo(Rd * .06, Rd * .8); tip.closePath(); GH.add(new THREE.Mesh(ext(tip, .12, 0), REDH)); handsG.add(GH); }
  // sub-dial hands
  const subHands = [];
  const subAt = (x, y, len, mat = handMat) => { const g = new THREE.Group(); g.position.set(x * Rd, y * Rd, zDial + .3); const b = new THREE.Mesh(new THREE.BoxGeometry(.3, len, .1), mat); b.position.y = len * .4; g.add(b); const c = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .3, 16), mat); c.rotation.x = Math.PI / 2; g.add(c); handsG.add(g); subHands.push(g); return g; };
  if (sp.subs === 3) { subAt(-.42, 0, Rd * .19); subAt(.42, 0, Rd * .19, counter); subAt(0, -.42, Rd * .19, counter); }
  else if (sp.subs === 2) { subAt(-.42, 0, Rd * .2); subAt(.42, 0, Rd * .2, counter); }
  const ssXY = isRect ? [0, -.42] : subsecXY(sp);
  const smallSec = sp.subsec ? subAt(ssXY[0], ssXY[1], Rd * .18) : sp.dialType === 'lange1' ? subAt(.32, -.44, Rd * .16) : null;
  if (sp.subs === 3) subHands[0].userData.sec = true; else if (sp.subs === 2) subHands[0].userData.sec = true;
  if (smallSec) smallSec.userData.sec = true;
  // tourbillon cage
  let cage = null, cageBal = null;
  if (sp.dialType === 'tourbillon') {
    cage = new THREE.Group(); cage.position.set(0, -.44 * Rd, zDial - .2); dialG.add(cage);
    const cr = .28 * Rd;
    const t = new THREE.Mesh(new THREE.TorusGeometry(cr, .25, 12, 64), metal('white', 'polished')); cage.add(t);
    for (let k = 0; k < 3; k++) { const a = new THREE.Mesh(new RoundedBoxGeometry(.6, cr, .4, 2, .15), metal('white', 'polished')); const ang = k / 3 * TAU; a.position.set(Math.sin(ang) * cr / 2, Math.cos(ang) * cr / 2, .3); a.rotation.z = -ang; cage.add(a); }
    cageBal = new THREE.Mesh(new THREE.TorusGeometry(cr * .55, .22, 10, 48), metal('rose', 'polished')); cageBal.position.z = .6; cage.add(cageBal);
    const jw = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, .3, 16), RUBY); jw.rotation.x = Math.PI / 2; jw.position.z = .9; cage.add(jw);
  }

  /* ── crystal ── */
  const crysG = part('crystal', 'Crystal', isRect && shapeKind === 'digital' ? 'Mineral glass over the liquid-crystal display.' : 'Synthetic sapphire (9 on the Mohs scale), domed, with an anti-reflective coating that glints blue-violet at an angle.', [0, 0, 14], [Rd * .45, Rd * .4, zBz + .9], [.2, .2, 1]);
  const sapp = sp.cheapGlass ? new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transparent: true, opacity: .1, depthWrite: false, envMapIntensity: 1.6, iridescence: .22, iridescenceIOR: 1.5, iridescenceThicknessRange: [220, 380] }) : sapphire();
  if (isRound || ['octagon', 'cushion'].includes(shapeKind)) {
    const R0 = isRound ? Rd + .5 : Rd + .4, sph = 60, th = Math.asin(R0 / sph);
    const dome = sp.shape === 'pocket' ? .38 : .2;
    const cap = new THREE.SphereGeometry(sph, 96, 12, 0, TAU, 0, th); cap.scale(1, dome, 1); cap.rotateX(Math.PI / 2); cap.translate(0, 0, zBz - sph * dome * Math.cos(th) + .2);
    crysG.add(new THREE.Mesh(cap, sapp));
    if (sp.cyclops && sp.date) { // the magnifying lens over the date
      const da = (sp.dateAt ?? 3) / 12 * TAU, lens = new THREE.Mesh(new THREE.SphereGeometry(Rd * .16, 32, 12, 0, TAU, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .02, transparent: true, opacity: .05, depthWrite: false, envMapIntensity: .9 }));
      lens.rotation.x = Math.PI / 2; lens.scale.set(1.12, .22, .9); lens.position.set(Math.sin(da) * Rd * .665, Math.cos(da) * Rd * .665, zBz + .5 - (Rd * .665) ** 2 / 120 * dome); crysG.add(lens);
    }
  } else {
    const s = shapeKind === 'nautilus' ? squircle(Rd + .5, Rd + .5, 4.6) : shapeKind === 'santos' ? squircle(Rd + .5, Rd + .5, 7) : shapeKind === 'tonneau' ? squircle(Rd * .84, Rd * 1.12, 2.6, 128, .08) : roundRect(rectIn[0] + .4, rectIn[1] + .4, rectIn[2] + .2);
    const g = ext(s, .6, .4, 64); g.translate(0, 0, zBz - .6); crysG.add(new THREE.Mesh(g, sapp));
  }

  /* ── crown, guards, pushers ── */
  const edgeX = isRect ? W / 2 : shapeKind === 'tonneau' ? r * .86 * 1.09 : r;
  const crownZ = (zB + zT) / 2;
  const crownG = part('crown', crownName(sp.crown), crownDesc(sp.crown), [11, 0, 0], [edgeX + 3.4, 0, crownZ + 1.4], [1, 0, .3]);
  if (sp.crown === 'buttons') {
    for (const [sx, sy] of [[1, .35], [1, -.35], [-1, .35], [-1, -.35]]) { const b = new THREE.Mesh(new RoundedBoxGeometry(3, 4, 2.6, 2, .6), metal('steel', 'polished')); b.position.set(sx * (W / 2 + 1), sy * H, crownZ); crownG.add(b); }
  } else {
    const cR = sp.crown === 'onion' ? 3.6 : sp.crown === 'guard' ? 3.1 : sp.crown === 'small' ? 2.2 : 2.7, cL = sp.crown === 'onion' ? 5 : 3.4;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(cR * .45, cR * .45, 2.2, 24), polish); tube.rotation.z = Math.PI / 2; tube.position.set(edgeX + .6, 0, crownZ); crownG.add(tube);
    let cg;
    if (sp.crown === 'onion') cg = new THREE.LatheGeometry([[0, 0], [cR * .7, 0], [cR, cL * .2], [cR * .8, cL * .4], [cR, cL * .6], [cR * .8, cL * .8], [cR * .55, cL], [0, cL]].map(([a, b]) => new THREE.Vector2(a, b)), 96);
    else { cg = new THREE.CylinderGeometry(cR, cR, cL, 120, 1); const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr2 = Math.hypot(x, z); if (Math.abs(rr2 - cR) < 1e-3) { const phi = Math.atan2(x, z), nr = cR - .16 * (.5 - .5 * Math.cos(30 * phi)); p.setX(i, x / rr2 * nr); p.setZ(i, z / rr2 * nr); } } cg.computeVertexNormals(); cg.translate(0, cL / 2, 0); }
    const cm = new THREE.Mesh(cg, polish); cm.rotation.z = -Math.PI / 2; cm.position.set(edgeX + 1.4, 0, crownZ); crownG.add(cm);
    if (sp.crown === 'cabochon') { const gem = new THREE.Mesh(new THREE.SphereGeometry(cR * .62, 32, 16), new THREE.MeshPhysicalMaterial({ color: 0x2a52c8, roughness: 0, transmission: .6, thickness: 1, ior: 1.77, clearcoat: 1 })); gem.position.set(edgeX + 1.4 + cL + .3, 0, crownZ); gem.scale.set(.6, 1, 1); crownG.add(gem); }
    if (sp.crown === 'guard') {
      for (const sy of [1, -1]) {
        const s = new THREE.Shape(), v = y => y * sy; s.moveTo(-1.8, v(7.4)); s.quadraticCurveTo(2.0, v(7.0), 2.9, v(5.0)); s.lineTo(2.8, v(3.75)); s.lineTo(-1.8, v(3.9)); s.closePath();
        const g = ext(s, (zT - zB) * .5, .45, 16); g.translate(edgeX, 0, zB + (zT - zB) * .25 - .45); crownG.add(new THREE.Mesh(g, brush));
      }
    }
    if (shapeKind === 'cushion') { const br = new THREE.Mesh(new RoundedBoxGeometry(5, 13, T * .55, 3, 1.4), brush); br.position.set(edgeX + 2.6, 0, crownZ); crownG.add(br); const lv = new THREE.Mesh(new RoundedBoxGeometry(2, 11, 1.4, 2, .5), polish); lv.position.set(edgeX + 5.3, 1, crownZ); lv.rotation.z = .12; crownG.add(lv); }
  }
  if (sp.subs || sp.pushers) {
    const push = part('pushers', 'Chronograph pushers', 'Start/stop at 2 o\'clock, reset at 4. Each push turns the column wheel one step.', [9, 0, 0], [Math.cos(.55) * (edgeX + 2.5), Math.sin(.55) * (edgeX + 2.5), crownZ + 1], [1, .5, .3]);
    for (const a of [.52, -.52]) { const g = new THREE.Group(); g.position.set(Math.cos(a) * edgeX, Math.sin(a) * edgeX, crownZ); g.rotation.z = a; push.add(g); const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 24), polish); stem.rotation.z = Math.PI / 2; stem.position.x = 1.2; g.add(stem); const head = new THREE.Mesh(new RoundedBoxGeometry(2.6, 4.4, 3.8, 3, .8), polish); head.position.x = 3.4; g.add(head); }
  }

  /* ── caseback ── */
  const exhib = !['solid', 'engine'].includes(sp.caseback);
  const backG = part('caseback', exhib ? 'Exhibition caseback' : sp.caseback === 'engine' ? 'Engine-turned caseback' : 'Screw-down caseback', exhib ? (sp.rotor === false ? 'A sapphire window onto the hand-wound movement: perlage, Côtes de Genève, jewels in their settings and blued screws, with no rotor in the way.' : sp.rotor === 'guilloche' ? 'A sapphire window onto the movement: Côtes de Genève, blued screws and an 18k gold rotor engine-turned by hand, which spins as you move.' : 'A sapphire window onto the movement: perlage, Côtes de Genève, blued screws and a gold-segment rotor that spins as you move.') : sp.caseback === 'engine' ? 'Hand-cut barleycorn guilloché on a rose engine, around a polished cartouche engraved with a monogram.' : 'Solid steel, screwed down against a gasket and engraved — for water resistance.', [0, 0, -11], [r * .3, -r * .3, zB - T * .1], [0, 0, -1]);
  const bOuter = isRound ? r * .9 : Math.min(W, H) * .42;
  const backRing = new THREE.Mesh(latheZ([[bOuter * (exhib ? .72 : .86), zB - T * .07], [bOuter, zB - T * .05], [bOuter + .5, zB + .2], [bOuter + .5, zB + .6]], 160), exhib ? polish : brush);
  if (!exhib) { const eg = sp.caseback === 'engine' ? engineTurned() : engravedBack('WATER RESISTANT · 300 M · STAINLESS STEEL · SAPHIR'); const disc = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .87, 96), new THREE.MeshPhysicalMaterial({ color: METAL[sp.metal] ?? METAL.steel, metalness: 1, roughness: .3, roughnessMap: eg, bumpMap: eg, bumpScale: sp.caseback === 'engine' ? 1.2 : 2 })); disc.rotation.y = Math.PI; disc.position.z = zB - T * .07; backG.add(disc); }
  backG.add(backRing);
  let rotor = null;
  if (exhib) {
    const mv = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .72, 96), new THREE.MeshPhysicalMaterial({ map: movementTexture((n => n.length > 16 ? n.split(' ')[0] : n)((sp.brand || 'MechWatch').toUpperCase()), sp.jewels || 25), metalness: .8, roughness: .3 })); mv.rotation.y = Math.PI; mv.position.z = zB + .3; backG.add(mv);
    if (sp.rotor !== false) {
    rotor = new THREE.Group(); rotor.position.z = zB - .2; backG.add(rotor);
    const rs = new THREE.Shape(); rs.absarc(0, 0, bOuter * .7, .05, Math.PI - .05, false); rs.absarc(0, 0, bOuter * .14, Math.PI - .05, .05 + TAU, true);
    let rotorMat = metal('gold', 'polished');
    if (sp.rotor === 'guilloche') { const gt = engineTurned(); gt.wrapS = gt.wrapT = THREE.ClampToEdgeWrapping; gt.repeat.set(.5 / (bOuter * .72), .5 / (bOuter * .72)); gt.offset.set(.5, .5); rotorMat = new THREE.MeshPhysicalMaterial({ color: METAL.gold, metalness: 1, roughness: .2, bumpMap: gt, bumpScale: 1.1 }); }
    const rg = ext(rs, .5, .12, 64); rg.translate(0, 0, -.25); const rm = new THREE.Mesh(rg, rotorMat); rotor.add(rm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(bOuter * .15, bOuter * .15, .9, 32), metal('white', 'polished')); hub.rotation.x = Math.PI / 2; rotor.add(hub);
    }
    const win = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .74, 96), sp.cheapGlass ? sapp : sapphire()); win.rotation.y = Math.PI; win.position.z = zB - T * .065; backG.add(win);
  }
  for (let i = 0; i < (sp.caseback === 'engine' ? 0 : 6); i++) { const a = i / 6 * TAU; const n = new THREE.Mesh(new THREE.BoxGeometry(2.2, .9, .6), metal('black')); n.position.set(Math.cos(a) * bOuter * .96, Math.sin(a) * bOuter * .96, zB - T * .05); n.rotation.z = a; backG.add(n); }

  /* ── strap or bracelet, wrapped around a wrist-shaped ellipse ── */
  const isPocket = sp.shape === 'pocket';
  let bowHinge = null;
  let strapParts = [];
  const wrist = { a: Math.max(32, attach.y + 9), b: 22.5 };
  wrist.zc = -T * .5 - wrist.b + 1.2;
  const C = new THREE.Vector3(0, 0, wrist.zc);
  const wristPts = (sgn, endAng, lift = 0, liftFrom = Infinity) => {
    const pts = [new THREE.Vector3(0, sgn * attach.y, attach.z), new THREE.Vector3(0, sgn * (attach.y + 3.6), attach.z - 1.4), new THREE.Vector3(0, sgn * (attach.y + 6.6), attach.z - 4.8)];
    const a0 = Math.asin(clamp((attach.y + 8.2) / wrist.a, -.98, .98)), n = Math.max(10, Math.round((endAng - a0) / .12));
    for (let k = 0; k <= n; k++) {
      const al = a0 + (endAng - a0) * k / n, u = clamp((al - liftFrom) / .16, 0, 1), up = lift * u * u * (3 - 2 * u);
      pts.push(new THREE.Vector3(0, sgn * (wrist.a + up) * Math.sin(al), wrist.zc + (wrist.b + up) * Math.cos(al)));
    }
    return pts;
  };
  if (!isPocket && !sp.headOnly) {
    const bracelet = sp.bracelet;
    if (bracelet) {
      const bm = metal(sp.metal, 'satin'), pm = metal(sp.metal, 'semipolish');
      const top = part('bracelet12', 'Bracelet — 12 o\'clock side', braceletDesc(bracelet), [0, 13, -5], [attach.w * .3, attach.y + 9, attach.z - 6], [0, .7, .5]);
      const bot = part('bracelet6', 'Bracelet — 6 o\'clock side', 'Solid links joined by pins or screws; removable links size it to the wrist.', [0, -13, -5], [-attach.w * .3, -attach.y - 9, attach.z - 6], [0, -.7, .5]);
      const bmat = braceletMaterial(bracelet, sp.metal);
      [[top, 1], [bot, -1]].forEach(([grp, sgn]) => {
        const pts = wristPts(sgn, Math.PI * .915);
        const band = new THREE.Mesh(bandGeometry(pts, { w0: attach.w - .3, w1: attach.w * (bracelet === 'integrated' ? .62 : .8), t0: 2.7, t1: 2.2, center: C, seg: 160 }), bmat);
        band.castShadow = true; grp.add(band);
        const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
        const f0 = frameAt(curve, .012, C);
        if (bracelet !== 'integrated') { const end = new THREE.Mesh(new RoundedBoxGeometry(attach.w - .2, 3, 4.2, 4, .8), bm); end.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f0.X, f0.N, f0.T)); end.position.copy(f0.p); grp.add(end); }
      });
      const clasp = part('clasp', 'Folding clasp', 'A deployant clasp with a safety catch and on-the-fly micro-adjustment — the bracelet\'s "buckle".', [0, 0, -12], [0, 0, wrist.zc - wrist.b - 2], [0, 0, -1]);
      const cz = wrist.zc - wrist.b - .6, cw = attach.w * .8;
      const cl = new THREE.Mesh(new RoundedBoxGeometry(cw, 2.6, 21, 4, .9), bm); cl.position.set(0, 0, cz); clasp.add(cl);
      for (const sx of [-1, 1]) { const rim = new THREE.Mesh(new RoundedBoxGeometry(.9, 2.8, 21.2, 3, .4), pm); rim.position.set(sx * (cw / 2 - .3), 0, cz); clasp.add(rim); }
      const crest = new THREE.Mesh(new RoundedBoxGeometry(cw * .26, 2.6, 5, 3, .6), bm); crest.position.set(0, 0, cz - .1); clasp.add(crest);
      clasp.children.forEach(m => m.rotation.x = Math.PI / 2);
      strapParts = ['bracelet12', 'bracelet6', 'clasp'];
    } else {
      const kind = sp.strap; const col = sp.strapColor;
      const smat = strapMaterial(kind, col);
      const sName = { alligator: 'Alligator strap', calf: 'Calfskin strap', rubber: 'Rubber strap', nato: 'NATO strap' }[kind] || 'Strap';
      const top = part('strap12', `${sName} — 12 o'clock`, strapDesc(kind) + ' This side carries the buckle.', [0, 13, -4], [0, attach.y + 9, attach.z - 6], [0, .7, .5]);
      const bot = part('strap6', `${sName} — 6 o'clock`, 'The long side with the adjustment holes, finished with a tapered tip that tucks into the keepers.', [0, -13, -4], [0, -attach.y - 9, attach.z - 6], [0, -.7, .5]);
      const wEnd = Math.max(14, attach.w * .8);
      const tA = kind === 'nato' ? 1.4 : 3.8, tB = kind === 'nato' ? 1.4 : 2.4, END12 = Math.PI * .935, END6 = Math.PI * 1.28, LIFT = tB + .3;
      top.add(new THREE.Mesh(bandGeometry(wristPts(1, END12), { w0: attach.w, w1: wEnd, t0: tA, t1: tB, center: C }), smat));
      const tailPts = wristPts(-1, END6, LIFT, Math.PI * .985);
      bot.add(new THREE.Mesh(bandGeometry(tailPts, { w0: attach.w, w1: wEnd * .96, t0: tA, t1: tB, center: C, seg: 180, tip: .07 }), smat));
      // adjustment holes on the tail, just past the keeper
      const tc = new THREE.CatmullRomCurve3(tailPts, false, 'centripetal'), holeMat = new THREE.MeshBasicMaterial({ color: 0x080503 });
      [.855, .88, .905].forEach(tt => { const f = frameAt(tc, tt, C); const h = new THREE.Mesh(new THREE.CircleGeometry(.72, 20), holeMat); h.position.copy(f.p).addScaledVector(f.N, tB / 2 + .03); h.lookAt(f.p.clone().addScaledVector(f.N, 10)); bot.add(h); });
      const buckle = part('buckle', kind === 'rubber' && sp.deployant ? 'Deployant buckle' : 'Pin buckle', 'Solid metal, matched to the case. The tail passes through the frame, the tongue through a hole, and the keeper holds the tail flat.', [0, 0, -12], [0, wrist.a * Math.sin(Math.PI * .935), wrist.zc + wrist.b * Math.cos(Math.PI * .935) - 2], [0, .2, -1]);
      const bc = new THREE.CatmullRomCurve3(wristPts(1, END12), false, 'centripetal'); const f = frameAt(bc, .985, C);
      const frame = new THREE.Group(); frame.matrixAutoUpdate = true; buckle.add(frame);
      const basis = new THREE.Matrix4().makeBasis(f.X, f.N, f.T); frame.quaternion.setFromRotationMatrix(basis); frame.position.copy(f.p);
      const bw = wEnd + 2.6;
      [[-bw / 2, 0], [bw / 2, 0]].forEach(([x]) => { const s2 = new THREE.Mesh(new RoundedBoxGeometry(1.3, 3.6, 9, 3, .5), polish); s2.position.set(x, 2.1, 1.5); frame.add(s2); });
      const front = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, bw + 1.2, 24), polish); front.rotation.z = Math.PI / 2; front.position.set(0, 2.4, 5.8); frame.add(front);
      const tongue = new THREE.Mesh(new RoundedBoxGeometry(.9, .8, 7, 2, .3), polish); tongue.position.set(0, 3.2, 2.4); frame.add(tongue);
      const kf = frameAt(bc, .9, C), keeper = new THREE.Group(); buckle.add(keeper);
      keeper.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(kf.X, kf.N, kf.T)); keeper.position.copy(kf.p);
      const kw = wEnd + 1.4, kt = .7, lo = -tB / 2 - .15 - kt / 2, hi = tB / 2 + LIFT + .15 + kt / 2;
      [lo, hi].forEach(y => { const b = new THREE.Mesh(new RoundedBoxGeometry(kw, kt, 3.2, 2, .25), smat); b.position.set(0, y, 0); keeper.add(b); });
      [-1, 1].forEach(sx => { const b = new THREE.Mesh(new RoundedBoxGeometry(kt, hi - lo + kt, 3.2, 2, .25), smat); b.position.set(sx * (kw / 2 - kt / 2), (hi + lo) / 2, 0); keeper.add(b); });
      strapParts = ['strap12', 'strap6', 'buckle'];
    }
    const bars = part('springbars', 'Spring bars', 'Spring-loaded pins that pass through the strap and click into holes inside the lugs.', [0, 0, 0], [attach.w * .3, attach.y, attach.z], [0, 1, 0]);
    for (const sy of [1, -1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, attach.w + 1.2, 16), metal('steel', 'polished')); b.rotation.z = Math.PI / 2; b.position.set(0, sy * attach.y, attach.z); bars.add(b); }
  } else if (isPocket) {
    // the pendant, a fluted crown, and a bow hinged on either side of the pendant
    crownG.clear(); crownG.rotation.set(0, 0, 0);
    const cp = parts.find(p => p.group === crownG); cp.anchor.set(3.4, r + 7, crownZ); cp.normal.set(.4, 1, .3).normalize(); cp.explode.set(0, 10, 0); cp.name = 'Pendant & crown'; cp.desc = 'The pendant carries the winding stem; the fluted crown winds and, pulled out, sets the hands.';
    const yT = r - .4;
    const neck = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [2.7, 0], [2.3, 1.4], [2.1, 3.2], [2.5, 4.4], [0, 4.4]].map(([a, b]) => new THREE.Vector2(a, b)), 64), polish); neck.position.set(0, yT, crownZ); crownG.add(neck);
    const cg = new THREE.CylinderGeometry(3.4, 3.4, 4.2, 120, 1); { const p = cg.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr2 = Math.hypot(x, z); if (Math.abs(rr2 - 3.4) < 1e-3) { const phi = Math.atan2(x, z), nr = 3.4 - .2 * (.5 - .5 * Math.cos(28 * phi)); p.setX(i, x / rr2 * nr); p.setZ(i, z / rr2 * nr); } } cg.computeVertexNormals(); }
    const crown = new THREE.Mesh(cg, polish); crown.position.set(0, yT + 6.5, crownZ); crownG.add(crown);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.9, 32, 12, 0, TAU, 0, Math.PI / 2), polish); cap.scale.set(1, .4, 1); cap.position.set(0, yT + 8.6, crownZ); crownG.add(cap);
    const bow = part('lugs', 'Bow', 'The ring the chain hangs from, hinged on pivots either side of the pendant so the watch can turn.', [0, 18, 0], [0, yT + 17.2, crownZ], [0, 1, .3]);
    const gap = 1.25, R = 7.4, lift = R * Math.cos(gap / 2);
    bowHinge = new THREE.Group(); bowHinge.position.set(0, yT + 3.2, crownZ); bow.add(bowHinge);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 1.15, 20, 96, TAU - gap), polish); ring.rotation.z = -Math.PI / 2 + gap / 2; ring.position.y = lift; bowHinge.add(ring);
    for (const sx of [-1, 1]) { const k = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 12), polish); k.position.x = sx * R * Math.sin(gap / 2); bowHinge.add(k); }
  }

  /* ── wrist cushion (display) ── */
  const cushion = new THREE.Group(); cushion.name = 'cushion';
  if (!isPocket && !sp.headOnly) {
    const L = sp.cushionLength || 62, hl = L / 2;
    const end = [[0, 0], [.55, .15], [.8, .7], [.93, 1.8], [.985, 3.4], [1, 5.6]]; // a padded end, from the centre of the face round to the barrel
    const prof = [...end.map(([x, y]) => [x, -hl + y]), [1.012, 0], ...end.slice().reverse().map(([x, y]) => [x, hl - y])].map(([x, y]) => new THREE.Vector2(x, y));
    const cg = new THREE.LatheGeometry(prof, 96); cg.rotateZ(-Math.PI / 2); cg.scale(1, wrist.a - (sp.bracelet ? 2.2 : 3.2), wrist.b - (sp.bracelet ? 2.2 : 3.2)); cg.translate(0, 0, wrist.zc);
    const cm = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: 0x24130b, roughness: 1, sheen: .8, sheenColor: new THREE.Color(0x6a4228), sheenRoughness: .6, bumpMap: canvasTex(256, 256, (g, w) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, w); for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() > .5 ? '#9a9a9a' : '#666'; g.fillRect(Math.random() * w, Math.random() * w, 1.5, 1.5); } }, { srgb: false, repeat: [6, 6] }), bumpScale: .6 }));
    cm.receiveShadow = true; cm.castShadow = true; cushion.add(cm);
    const ca = wrist.a - (sp.bracelet ? 2.2 : 3.2), cb = wrist.b - (sp.bracelet ? 2.2 : 3.2), pipeM = new THREE.MeshPhysicalMaterial({ color: 0x3a2112, roughness: .75, sheen: .5, sheenColor: new THREE.Color(0x8a5a36) });
    for (const sx of [-1, 1]) { const pg = new THREE.TorusGeometry(1, .028, 10, 96); pg.rotateY(Math.PI / 2); pg.scale(1, ca * .975, cb * .975); const pm = new THREE.Mesh(pg, pipeM); pm.position.set(sx * (hl - 2.3), 0, wrist.zc); cushion.add(pm); }
    root.add(cushion);
  }

  shadowed(root);
  root.traverse(o => { if (o.isMesh && o.material && o.material.transmission > 0) o.castShadow = false; });

  /* ── live behaviour ── */
  const lcd = sp.dialType === 'lcd' || sp.dialType === 'zeitwerk';
  let lastSec = -1;
  function tick(now = new Date(), t = performance.now() / 1000) {
    const ms = now.getMilliseconds(), s = now.getSeconds() + Math.floor(ms / 125) / 8, m = now.getMinutes() + s / 60, h = now.getHours() % 12 + m / 60;
    if (HH) { HH.rotation.z = -h / 12 * TAU; MH.rotation.z = -m / 60 * TAU; }
    if (SH) SH.rotation.z = -s / 60 * TAU;
    subHands.forEach(g => { if (g.userData.sec) g.rotation.z = -s / 60 * TAU; });
    if (GH) GH.rotation.z = -(now.getUTCHours() + now.getUTCMinutes() / 60) / 24 * TAU;
    if (rotor) rotor.rotation.z = Math.sin(t * .6) * 1.8 + Math.sin(t * 1.7) * .5;
    if (cage) { cage.rotation.z = -s / 60 * TAU; cageBal.rotation.z = Math.sin(t * TAU * 4) * 2.4; }
    if (movementTick) movementTick(now);
    if (lcd && now.getSeconds() !== lastSec) { lastSec = now.getSeconds(); if (sp.dialType === 'lcd' || now.getSeconds() === 0) { const c = dialTex.userData.canvas; dialTex.userData.draw(c.getContext('2d'), c.width, c.height); dialTex.needsUpdate = true; } }
  }
  function setExplode(e) { parts.forEach(p => { p.group.position.copy(p.explode).multiplyScalar(e); }); }
  function dispose() { root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (![LUME, BLACKH, REDH, RUBY].includes(m) && ![...matCache.values(), ...handCache.values()].includes(m)) { ['map', 'bumpMap', 'roughnessMap'].forEach(t => m[t] && m[t].dispose()); m.dispose(); } }); } }); }
  tick();
  return { group: root, parts, tick, setExplode, dispose, wrist, strapParts, cushion, bow: bowHinge };
}

/* ───────────────────────── descriptions ───────────────────────── */
function bezelTexture(kind, sp) {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.translate(c, c);
    const colA = kind === 'pepsi' ? '#22408f' : sp.bezelColor || (kind === 'tachy' ? (lum(sp.dial) > .5 ? '#d7dade' : '#141416') : '#0e0f11'), colB = kind === 'pepsi' ? '#a8192f' : colA;
    g.fillStyle = colA; g.beginPath(); g.arc(0, 0, c, Math.PI, TAU); g.fill(); g.fillStyle = colB; g.beginPath(); g.arc(0, 0, c, 0, Math.PI); g.fill();
    const ink = lum(colA) > .5 ? '#111' : '#f1ece0'; g.fillStyle = ink; g.strokeStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    const R = c * .885;
    if (kind === 'tachy') { g.font = `600 ${c * .07}px "Jost", sans-serif`; [500, 300, 200, 150, 120, 100, 90, 80, 70, 60].forEach(v => { const a = 3600 / v * 6 * Math.PI / 180; g.save(); g.rotate(a); g.fillText(v, 0, -R); g.restore(); }); g.font = `500 ${c * .04}px "Jost", sans-serif`; arcText(g, 'TACHYMÈTRE', R, .37, .052); }
    else if (kind === 'pepsi' || kind === 'gmt') { g.font = `600 ${c * .09}px "Jost", sans-serif`; for (let i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * TAU); if (i % 2 === 0 && i) g.fillText(i, 0, -R); else if (!i) { g.beginPath(); g.moveTo(0, -R + c * .05); g.lineTo(-c * .05, -R - c * .04); g.lineTo(c * .05, -R - c * .04); g.fill(); } else g.fillRect(-c * .008, -R - c * .03, c * .016, c * .06); g.restore(); } }
    else if (kind === 'slide') { // logarithmic scale: one turn is a factor of ten
      g.font = `600 ${c * .05}px "Jost", sans-serif`;
      for (let v = 10; v < 100; v++) { const a = Math.log10(v / 10) * TAU, big = v < 25 || v % 5 === 0; g.save(); g.rotate(a); g.fillRect(-c * .003, -c * .985, c * .006, big ? c * .05 : c * .03); if (v < 25 || v % 5 === 0) g.fillText(v, 0, -c * .885); g.restore(); }
    }
    else if (kind === 'tenth') { for (let i = 0; i < 100; i++) { g.save(); g.rotate(i / 100 * TAU); g.fillRect(-c * .004, -c * .96, c * .008, i % 10 ? c * .05 : c * .1); g.restore(); } }
    else { g.font = `600 ${c * .1}px "Jost", sans-serif`; for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * TAU); if (i % 10 === 0 && i) g.fillText(i, 0, -R); else if (i === 0) { } else if (i < 15 || i % 5 === 0) g.fillRect(-c * .007, -R - c * .04, c * .014, i % 5 ? c * .06 : c * .08); g.restore(); } }
  });
}
function bezelDesc(b, s) { return ({ diver: 'Unidirectional diving bezel, 120 clicks, ceramic insert with a luminous pip at 12 — it can only shorten your remaining dive time if knocked.', pepsi: 'Bidirectional 24-hour bezel in two tones (day/night) for reading a third time zone.', tachy: 'Tachymeter scale: time a known distance with the chronograph and read off the speed.', fluted: 'Fluted bezel — once functional for screwing the case shut, now pure light play.', clous: 'Clous de Paris hobnail guilloché — hundreds of tiny pyramids cut by hand.', maltese: 'Bezel cut in a half Maltese cross, emblem of its house.', tenth: 'Ceramic bezel graduated in 1/10 s for the high-beat chronograph.', slide: 'Circular slide rule for fuel, speed and unit conversions.', screws: 'Six visible H-screws clamp a "sandwich" of case materials.', thin: 'Slim polished bezel to let the dial breathe.', octagon: 'Octagonal bezel fixed by eight hexagonal screws.' }[s === 'octagon' ? 'octagon' : b] || 'Polished bezel ring holding the crystal and its gasket.'); }
function dialDesc(sp) { if (sp.skeleton) return 'No dial to speak of: a dark flange carries the minute track, and everything else is printed on sapphire above the open-worked movement.'; if (sp.openDial) return 'A grand feu enamel chapter ring around an open centre: the movement itself is on show, running in time with the hands.'; return ({ diver: 'High-contrast dive dial with applied, luminous indices.', tapisserie: '"Tapisserie" guilloché — a grid of tiny pyramids, each catching light.', horizontal: 'Horizontally embossed dial, gradated from light to dark.', snow: 'Textured to evoke wind-blown snow.', birch: 'Vertically textured like birch bark.', enamel: 'Grand feu enamel: fired at 800 °C, layer by layer, with Breguet numerals.', flieger: 'Observation-watch dial: triangle and dots at 12, maximal legibility.', field: 'Arabic numerals with a 24-hour inner track.', roman: 'Roman numerals and a chemin de fer minute track.', perpetual: 'Day, month with leap-year cycle, and moon phase.', zeitwerk: 'Jumping digital hours and minutes — mechanically.', lange1: 'Off-centre dial, Outsize Date and small seconds, laid out on the golden ratio.', tourbillon: 'An aperture at 6 reveals the tourbillon cage turning once a minute.', fume: 'Fumé sunburst fading to black at the edge.', skeleton: 'Skeletonised: the movement itself becomes the dial.', lcd: 'Twisted-nematic liquid crystal display.', sandwich: 'Sandwich dial: cut-out numerals over a luminous lower plate.' }[sp.dialType] || 'Sunburst-brushed dial with applied indices.'); }
function handsDesc(h, m) { if (h === 'breguet' && m === 'gold') return 'Breguet "pomme" hands in polished 18k gold.'; return ({ mercedes: 'Mercedes hour hand and sword minute hand, filled with lume.', sword: 'Sword hands, made for legibility.', dauphine: 'Faceted dauphine hands — two planes meeting in a sharp ridge.', breguet: 'Breguet "pomme" hands, each with a hollow moon near the tip.', snowflake: 'Snowflake hour hand, a 1960s military signature.' }[h] || 'Baton hands, polished, with luminous inserts.'); }
function crownName(c) { return ({ guard: 'Screw-down crown & guards', onion: 'Onion crown', cabochon: 'Crown with sapphire cabochon', buttons: 'Push buttons', small: 'Crown' }[c] || 'Crown'); }
function crownDesc(c) { return ({ guard: 'Screws down onto a triple gasket; the case shoulders guard it from knocks.', onion: 'Oversized and fluted so a pilot can wind it wearing gloves.', cabochon: 'A cut sapphire set into the crown — a jeweller\'s detail.', buttons: 'Light, mode, start/stop and reset.' }[c] || 'Winds the mainspring and sets the hands. Pull out to set.'); }
function strapDesc(k) { return ({ alligator: 'Hand-stitched alligator, the scales graded from the belly.', calf: 'Calfskin with contrast stitching.', rubber: 'Vulcanised rubber, waterproof and supple.', nato: 'Woven nylon, threaded under the case so the watch can\'t fall if a bar fails.' }[k] || 'Leather strap.'); }
function braceletDesc(b) { return ({ oyster: 'Three-piece links: brushed outer links, polished centre.', jubilee: 'Five-piece links, small polished centres — dressier and more fluid.', integrated: 'Integrated bracelet, flowing directly from the case, tapering link by link.' }[b] || 'Metal bracelet.'); }

/* ───────────────────────── specs from data ───────────────────────── */
export function specFromVault(w) {
  const name = w.m;
  const bracelet = ['octagon', 'nautilus'].includes(w.shape) ? 'integrated' : /GMT/.test(name) ? 'jubilee' : /Daytona|Submariner|Day-Date|Overseas|222|Santos|Chronomaster/.test(name) ? 'oyster' : null;
  const rubber = /Big Bang|RM|Fifty|Luminor/.test(name) && !bracelet;
  const pocket = w.dia > 60;
  const sp = {
    name, brand: w.b, D: pocket ? 52 : w.dia, T: clamp(w.t, 6, 16), shape: pocket ? 'pocket' : w.shape, metal: w.case, metalName: w.mat, dial: w.dial, grad: w.grad, panda: w.panda,
    dialType: w.dialType || (w.skeleton ? 'skeleton' : 'sunburst'), openDial: w.skeleton ? .8 : undefined, jewels: w.jw, bezel: w.bezel || (w.shape === 'round' || w.shape === 'lug' ? 'plain' : 'none'), subs: w.subs || 0, subsec: !!w.subsec, date: !!w.date, gmt: !!w.gmt, power: !!w.power, skeleton: !!w.skeleton,
    crown: w.crown || (w.bezel === 'diver' || w.bezel === 'pepsi' ? 'guard' : /Tank|Santos/.test(name) ? 'cabochon' : 'std'),
    hands: w.breguet || ['roman', 'enamel', 'tourbillon'].includes(w.dialType) ? 'breguet' : w.dialType === 'diver' && w.bezel === 'pepsi' ? 'mercedes' : w.dialType === 'diver' ? 'mercedes' : w.dialType === 'snowflakehand' ? 'snowflake' : w.dialType === 'flieger' ? 'sword' : ['dress', 'lange1'].includes(w.dialType) || /Calatrava|Patrimony/.test(name) ? 'dauphine' : 'baton',
    bracelet, strap: rubber ? 'rubber' : 'alligator', strapColor: rubber ? '#121212' : (w.case === 'gold' || w.case === 'rose') ? '#3a1d0e' : '#141012',
    LW: Math.round(w.dia * .5), L2L: w.dia * 1.2, line: [],
    caseback: w.dialType === 'diver' || /Submariner|GMT/.test(name) ? 'solid' : 'exhibition',
  };
  if (w.shape === 'rect') sp.H = w.dia * (/Reverso/.test(name) ? 1.66 : 1.32);
  if (sp.dialType === 'dress') sp.subsec = true;
  if (/hand-wound|peripheral/i.test(w.wind || '')) sp.rotor = false;
  return Object.assign(sp, w.look);
}
export const ARCHETYPE_SPECS = {
  diver: { name: 'Diver archetype', brand: 'MechWatch', D: 40, T: 12.5, L2L: 48, LW: 20, metal: 'steel', dial: '#0e0f11', dialType: 'diver', bezel: 'diver', crown: 'guard', hands: 'mercedes', date: true, bracelet: 'oyster', caseback: 'solid', line: 'SUBMERSIBLE 300 M' },
  pilot: { name: 'Pilot archetype', brand: 'MechWatch', D: 44, T: 13, L2L: 54, LW: 22, metal: 'steel', dial: '#131416', dialType: 'flieger', bezel: 'plain', crown: 'onion', hands: 'sword', strap: 'calf', strapColor: '#5a3820', line: 'B-UHR' },
  chrono: { name: 'Chronograph archetype', brand: 'MechWatch', D: 42, T: 13.2, L2L: 48, LW: 20, metal: 'steel', dial: '#131416', dialType: 'sunburst', bezel: 'tachy', subs: 3, accent: 'red', hands: 'baton', bracelet: 'oyster', line: 'CHRONOGRAPH' },
  dress: { name: 'Dress archetype', brand: 'MechWatch', D: 36, T: 8.5, L2L: 44, LW: 18, metal: 'gold', dial: '#efe8d8', dialType: 'dress', bezel: 'thin', hands: 'dauphine', subsec: true, strap: 'alligator', strapColor: '#1b120e', crown: 'small', line: 'HAND-WOUND' },
  gmt: { name: 'GMT archetype', brand: 'MechWatch', D: 40, T: 12, L2L: 48, LW: 20, metal: 'steel', dial: '#0e0f11', dialType: 'diver', bezel: 'pepsi', crown: 'guard', hands: 'mercedes', gmt: true, date: true, bracelet: 'jubilee', caseback: 'solid', line: 'GMT · 24 H' },
  field: { name: 'Field archetype', brand: 'MechWatch', D: 38, T: 10.5, L2L: 46, LW: 20, metal: 'ti', dial: '#1b1d17', dialType: 'field', bezel: 'plain', crown: 'small', hands: 'baton', strap: 'nato', strapColor: '#4d5236', caseback: 'solid', line: 'HACKING' },
  octagon: { name: 'Integrated sports archetype', brand: 'MechWatch', shape: 'octagon', D: 39, T: 8.1, metal: 'steel', dial: '#1e3f70', dialType: 'tapisserie', hands: 'baton', bracelet: 'integrated', line: 'AUTOMATIC' },
  tank: { name: 'Tank archetype', brand: 'MechWatch', shape: 'rect', D: 25.5, H: 33.7, T: 6.5, LW: 18, metal: 'gold', dial: '#f2ede3', dialType: 'roman', hands: 'breguet', strap: 'alligator', strapColor: '#2a140c', crown: 'cabochon', line: 'HAND-WOUND' },
  digital: { name: 'Digital LCD archetype', brand: 'MechWatch', shape: 'digital', D: 35, H: 38, T: 8.5, LW: 18, metal: 'carbon', dial: '#9fab8f', dialType: 'lcd', hands: 'none', strap: 'rubber', strapColor: '#151515', crown: 'buttons', caseback: 'solid' },
  tourbillon: { name: 'Tourbillon archetype', brand: 'MechWatch', D: 41, T: 11.5, L2L: 49, LW: 21, metal: 'plat', dial: '#2a2c31', dialType: 'tourbillon', bezel: 'thin', hands: 'breguet', strap: 'alligator', strapColor: '#151012', line: 'TOURBILLON' },
};
export const POCKET = { name: 'MechWatch Pocket Chronometer', brand: 'MechWatch', shape: 'pocket', D: 50, T: 13.5, metal: 'gold', dial: '#f6f1e6', dialType: 'enamel', bezel: 'thin', hands: 'breguet', handMetal: 'gold', subsec: true, openDial: true, caseback: 'engine', line: 'CHRONOMÈTRE' };
export const SIGNATURE = { name: 'MechWatch Signature', brand: 'MechWatch', D: 40, T: 10.5, L2L: 47, LW: 20, metal: 'rose', dial: '#4a2a14', dialType: 'guilloche', bezel: 'thin', hands: 'dauphine', date: true, strap: 'alligator', strapColor: '#2a1509', crown: 'std', line: 'CHRONOMÈTRE · 28 800 A/h' };

/* ───────────────────────── a reusable studio stage ───────────────────────── */
export function createStage(canvas, { bloom = true, shadows = true, floorY = null, exposure = 1.0, alpha = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
  const key = new THREE.DirectionalLight(0xfff6ee, 1.2); key.position.set(40, 90, 70); key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 400 }); key.shadow.bias = -.0004; key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd6ae, .7); rim.position.set(-60, 30, -80); scene.add(rim);
  let floor = null;
  if (floorY !== null) { floor = new THREE.Mesh(new THREE.CircleGeometry(300, 64), new THREE.ShadowMaterial({ opacity: .45 })); floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true; scene.add(floor); }
  let composer = null, bloomPass = null;
  if (bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), .1, .3, .93); // only the faintest halo on true highlights composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); composer && composer.setSize(w, h); }
  // adaptive quality: if frames are slow, drop bloom and resolution automatically
  let frames = 0, acc = 0, last = 0, degraded = false;
  function render() {
    const now = performance.now(); if (last) { acc += Math.min(200, now - last); frames++; } last = now;
    if (!degraded && frames >= 50) { if (acc / frames > 42) { degraded = true; composer = null; renderer.setPixelRatio(1); resize(); } frames = 0; acc = 0; }
    composer ? composer.render() : renderer.render(scene, camera);
  }
  return { renderer, scene, camera, get composer() { return composer; }, render, resize, key, floor, bloomPass };
}
