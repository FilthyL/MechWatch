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
export function studioEnvironment(renderer, { fill = .22 } = {}) {
  const s = new THREE.Scene();
  s.background = new THREE.Color(0x0a0705).multiplyScalar(1);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x2a1a10).multiplyScalar(fill * 3), side: THREE.BackSide }));
  s.add(dome);
  const box = (w, h, pos, intensity, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); s.add(m);
  };
  box(14, 10, [0, 16, 4], 3.2);                 // overhead softbox
  box(2.2, 16, [-15, 3, 6], 5.5);               // left strip
  box(2.2, 16, [15, 4, -4], 4.0, 0xffd3a0);     // warm right strip
  box(18, 3, [0, -4, 16], 1.1, 0xffe8cc);       // low front fill
  box(10, 2.4, [0, 8, -16], 3.0, 0xffb469);     // amber rim
  box(3, 3, [9, 12, 10], 6.0);                  // hot kicker for sparkle
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
  else m = new THREE.MeshPhysicalMaterial({ color: METAL[key] ?? METAL.steel, metalness: 1, roughness: finish === 'polished' ? .07 : finish === 'blasted' ? .5 : .26, anisotropy: finish === 'brushed' ? .55 : 0 });
  m.side = THREE.DoubleSide;
  matCache.set(k, m); return m;
}
const LUME = new THREE.MeshStandardMaterial({ color: 0xe7f6df, emissive: 0x8fe3a8, emissiveIntensity: .32, roughness: .6 });
const BLUED = new THREE.MeshPhysicalMaterial({ color: 0x2246b0, metalness: .9, roughness: .14, emissive: 0x050c33 });
const BLACKH = new THREE.MeshPhysicalMaterial({ color: 0x141416, metalness: .7, roughness: .18 });
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
export function strapTexture(type, color) {
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    if (type === 'alligator') {
      let y = 0;
      while (y < h) {
        const rh = 22 + Math.random() * 18; let x = 4; const cols = [.08, .11, .14, .17, .17, .14, .11, .08];
        cols.forEach(cw => {
          const ww = cw * (w - 8);
          const gr = g.createLinearGradient(x, y, x, y + rh);
          gr.addColorStop(0, shade(color, .1)); gr.addColorStop(.6, color); gr.addColorStop(1, shade(color, -.28));
          g.fillStyle = gr; g.beginPath(); g.roundRect(x + 1.5, y + 1.5, ww - 3, rh - 3, 6); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
          x += ww;
        });
        y += rh;
      }
    } else if (type === 'rubber') {
      for (let y = 0; y < h; y += 14) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, y, w, 3); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y + 3, w, 2); }
    } else if (type === 'nato') {
      const stripes = [color, shade(color, -.25), color];
      for (let x = 0; x < w; x += 4) { g.fillStyle = 'rgba(0,0,0,' + (x % 8 ? .12 : 0) + ')'; g.fillRect(x, 0, 2, h); }
      g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
      void stripes;
    } else {
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '0,0,0'},.05)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    }
    if (type !== 'rubber') { // stitching
      g.strokeStyle = type === 'nato' ? 'rgba(0,0,0,.3)' : 'rgba(236,220,190,.75)'; g.lineWidth = 5; g.setLineDash([16, 12]);
      [22, w - 22].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); });
    }
  }, { repeat: [1, 1] });
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
  const S = 1536, cw = Math.round(S * (W >= H ? 1 : W / H)), ch = Math.round(S * (H >= W ? 1 : H / W));
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
    else if (T === 'skeleton' || sp.skeleton) {
      g.fillStyle = 'rgba(8,8,10,.82)'; g.fillRect(-w / 2, -h / 2, w, h);
      [[-.32, -.25, .3], [.3, .28, .24], [.36, -.36, .16], [-.28, .42, .2]].forEach(([x, y, r]) => {
        g.save(); g.translate(x * R, y * R); g.beginPath(); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; g.lineTo(R * r * Math.cos(a), R * r * Math.sin(a)); g.lineTo(R * r * 1.08 * Math.cos(a + .05), R * r * 1.08 * Math.sin(a + .05)); g.lineTo(R * r * 1.08 * Math.cos(a + .12), R * r * 1.08 * Math.sin(a + .12)); g.lineTo(R * r * Math.cos(a + .17), R * r * Math.sin(a + .17)); }
        g.closePath(); g.strokeStyle = '#c9a35a'; g.lineWidth = 5; g.stroke(); g.beginPath(); g.arc(0, 0, R * .03, 0, TAU); g.fillStyle = '#c2183b'; g.fill(); g.restore();
      });
      g.strokeStyle = 'rgba(180,186,196,.8)'; g.lineWidth = R * .06; g.beginPath(); g.moveTo(-R * .8, -R * .55); g.lineTo(R * .8, R * .55); g.moveTo(-R * .8, R * .55); g.lineTo(R * .8, -R * .55); g.stroke();
    }
    else if (T === 'lcd') {
      g.restore(); g.fillStyle = '#9fab8f'; g.fillRect(0, 0, w, h);
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const d = new Date(), t = String(d.getHours() % 12 || 12).padStart(2, ' ') + String(d.getMinutes()).padStart(2, '0'), s = String(d.getSeconds()).padStart(2, '0');
      const dw = w * .17, dh = h * .36, y0 = h * .38, on = '#1b2216', off = 'rgba(20,30,10,.07)';
      [0, 1].forEach(i => seg(g, t[i], w * .07 + i * dw * 1.12, y0, dw, dh, on, off));
      g.fillStyle = on; g.fillRect(w * .48, y0 + dh * .28, w * .022, w * .022); g.fillRect(w * .48, y0 + dh * .62, w * .022, w * .022);
      [2, 3].forEach(i => seg(g, t[i], w * .53 + (i - 2) * dw * 1.12, y0, dw, dh, on, off));
      [0, 1].forEach(i => seg(g, s[i], w * .78 + i * dw * .62, y0 + dh * .4, dw * .55, dh * .6, on, off));
      g.font = `600 ${h * .07}px "JetBrains Mono", monospace`; g.fillStyle = on;
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
      const rail = ['roman', 'enamel', 'flieger', 'field', 'tourbillon', 'journe'].includes(T);
      for (let i = 0; i < 60; i++) {
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
      if (T === 'roman') { g.font = `400 ${R * .2}px "Bodoni Moda", "Cormorant Garamond", serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
        ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * TAU, dx = Math.sin(a), dy = -Math.cos(a), k = Math.min((hw - R * .2) / Math.abs(dx || 1e-6), (hh - R * .2) / Math.abs(dy || 1e-6)); g.save(); g.translate(dx * k, dy * k); g.rotate(a); g.scale(.62, 1.15); g.fillText(n, 0, 0); g.restore(); }); }
    }
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink;
    const ring = (n, r, f, sz, font = '"Bodoni Moda", "Cormorant Garamond", serif', skip = []) => { g.font = `400 ${R * sz}px ${font}`; for (let i = 0; i < n; i++) { if (skip.includes(i)) continue; const a = i / n * TAU; g.fillText(f(i), r * R * Math.sin(a), -r * R * Math.cos(a)); } };
    if (!isRect) {
      if (T === 'flieger') { ring(12, .76, i => i, .15, '"Inter", "JetBrains Mono", sans-serif', [0]); g.beginPath(); g.moveTo(0, -R * .7); g.lineTo(-R * .07, -R * .86); g.lineTo(R * .07, -R * .86); g.closePath(); g.fill(); [-1, 1].forEach(s => { g.beginPath(); g.arc(s * R * .11, -R * .86, R * .018, 0, TAU); g.fill(); }); }
      if (T === 'field') { ring(12, .76, i => i || 12, .14, '"Inter", sans-serif'); ring(12, .56, i => i + 12, .06, '"JetBrains Mono", monospace'); }
      if (T === 'roman' || T === 'tourbillon' || T === 'enamel') { const n = T === 'enamel' ? ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'] : ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; g.font = `${T === 'enamel' ? 'italic ' : ''}400 ${R * .13}px "Bodoni Moda", "Cormorant Garamond", serif`; n.forEach((t, i) => { if (T === 'tourbillon' && i >= 5 && i <= 7) return; const a = i / 12 * TAU; g.save(); g.translate(.78 * R * Math.sin(a), -.78 * R * Math.cos(a)); if (T !== 'enamel') g.rotate(a); g.fillText(t, 0, 0); g.restore(); }); }
      if (T === 'journe') ring(12, .8, i => i || 12, .08, '"Inter", sans-serif');
      if (T === 'sandwich') { g.fillStyle = '#e8ddb8'; ring(12, .74, i => [12, '', '', 3, '', '', 6, '', '', 9, '', ''][i], .17, '"Inter", sans-serif'); g.fillStyle = ink; }
    }
    // sub-dials
    const sub = (x, y, r, labels) => {
      g.save(); g.translate(x * R, y * R);
      const panda = sp.panda;
      g.fillStyle = panda ? '#141416' : (dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'); g.beginPath(); g.arc(0, 0, r * R, 0, TAU); g.fill();
      for (let k = 1; k < 16; k++) { g.strokeStyle = panda ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, r * R * k / 16, 0, TAU); g.stroke(); }
      const sInk = panda ? '#eee' : ink;
      g.strokeStyle = sInk; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, r * R, 0, TAU); g.stroke();
      for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r1 = r * R * .97, r2 = r * R * (i % 5 ? .9 : .82); g.lineWidth = i % 5 ? 1.5 : 3; g.beginPath(); g.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a)); g.lineTo(r2 * Math.sin(a), -r2 * Math.cos(a)); g.stroke(); }
      if (labels) { g.fillStyle = sInk; g.font = `500 ${R * .045}px "JetBrains Mono", monospace`; labels.forEach((t, i) => { const a = i / labels.length * TAU; g.fillText(t, r * R * .62 * Math.sin(a), -r * R * .62 * Math.cos(a)); }); }
      g.restore();
    };
    if (sp.subs === 3) { sub(-.42, 0, .21, ['60', '15', '30', '45']); sub(.42, 0, .21, ['30', '10', '20']); sub(0, .42, .21, ['12', '3', '6', '9']); }
    else if (sp.subs === 2) { sub(-.42, 0, .22, ['60', '20', '40']); sub(.42, 0, .22, ['30', '10', '20']); }
    if (sp.subsec && !isRect) sub(0, .48, .2, ['60', '15', '30', '45']);
    if (isRect && sp.subsec) sub(0, .42, .26, ['60', '15', '30', '45']);
    if (T === 'perpetual') { sub(-.42, 0, .2, ['MON', 'WED', 'FRI', 'SUN']); sub(.42, 0, .2, ['JAN', 'APR', 'JUL', 'OCT']); g.save(); g.translate(0, .42 * R); g.fillStyle = '#0d1a3a'; g.beginPath(); g.arc(0, 0, .2 * R, Math.PI, 0); g.fill(); g.fillStyle = '#f2cd7e'; g.beginPath(); g.arc(R * .05, -R * .07, R * .06, 0, TAU); g.fill(); g.restore(); }
    if (T === 'lange1') { g.strokeStyle = ink; g.lineWidth = 3; g.beginPath(); g.arc(-R * .16, -R * .06, R * .5, 0, TAU); g.stroke(); sub(.32, .44, .17); g.fillStyle = '#fff'; g.fillRect(R * .2, -R * .66, R * .2, R * .24); g.fillRect(R * .42, -R * .66, R * .2, R * .24); g.fillStyle = '#111'; g.font = `500 ${R * .18}px "Inter", sans-serif`; g.fillText(String(new Date().getDate()).padStart(2, '0')[0], R * .3, -R * .54); g.fillText(String(new Date().getDate()).padStart(2, '0')[1], R * .52, -R * .54); }
    if (T === 'zeitwerk') { g.fillStyle = '#f6f4ef'; g.fillRect(-R * .62, -R * .16, R * .52, R * .36); g.fillRect(R * .1, -R * .16, R * .52, R * .36); g.fillStyle = '#111'; g.font = `300 ${R * .3}px "Inter", sans-serif`; const d = new Date(); g.fillText(String(d.getHours()).padStart(2, '0'), -R * .36, R * .03); g.fillText(String(d.getMinutes()).padStart(2, '0'), R * .36, R * .03); g.strokeStyle = '#c9a35a'; g.lineWidth = R * .03; g.beginPath(); g.arc(0, R * .9, R * .82, -Math.PI * .78, -Math.PI * .22); g.stroke(); sub(0, -.58, .14); }
    if (T === 'tourbillon') { g.fillStyle = '#050506'; g.beginPath(); g.arc(0, .44 * R, .3 * R, 0, TAU); g.fill(); }
    if (sp.power) { g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(-R * .18, -R * .2, R * .3, -Math.PI * .95, -Math.PI * .55); g.stroke(); g.font = `500 ${R * .035}px "JetBrains Mono"`; g.fillText('POWER RESERVE', -R * .32, -R * .36); }
    if (sp.date && !(sp.subs && sp.subs >= 2) && !isRect) { g.fillStyle = '#fbfaf6'; g.fillRect(R * .58, -R * .07, R * .17, R * .14); g.strokeStyle = shade(base, -.4); g.lineWidth = 6; g.strokeRect(R * .58, -R * .07, R * .17, R * .14); g.fillStyle = '#111'; g.font = `600 ${R * .1}px "Inter", sans-serif`; g.fillText(new Date().getDate(), R * .665, R * .005); }
    // signature
    if (!['zeitwerk', 'lange1', 'fume', 'sandwich'].includes(T)) {
      g.fillStyle = ink; g.font = `400 ${R * .072}px "Cinzel", "Cormorant Garamond", serif`;
      const name = (sp.brand || 'MECHWATCH').toUpperCase(); const y = isRect ? -R * .5 : -R * (T === 'flieger' ? .42 : T === 'field' ? .3 : .44);
      g.fillText(name.length > 18 ? name.split(' ').slice(0, 2).join(' ') : name, 0, y);
      g.globalAlpha = .7; g.font = `400 ${R * .035}px "JetBrains Mono", monospace`;
      g.fillText(sp.line || 'AUTOMATIC', 0, isRect ? R * .48 : (sp.subs || sp.subsec || T === 'tourbillon' || T === 'perpetual') ? -R * .32 : R * .32);
      g.fillText('SWISS MADE', 0, isRect ? h / 2 - R * .06 : R * .9); g.globalAlpha = 1;
    }
    g.restore();
  };
  return canvasTex(cw, ch, draw);
}

function movementTexture() {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2;
    g.fillStyle = '#bfc4cb'; g.beginPath(); g.arc(c, c, c, 0, TAU); g.fill();
    for (let y = 0; y < w; y += 40) for (let x = 0; x < w; x += 40) { for (let r = 22; r > 2; r -= 3) { g.strokeStyle = `rgba(255,255,255,${.12 + .1 * Math.sin(r)})`; g.beginPath(); g.arc(x + (y / 40 % 2) * 20, y, r, 0, TAU); g.stroke(); } }
    const bridge = (pts) => { g.save(); g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)); g.closePath(); g.clip(); for (let k = -w; k < w * 2; k += 46) { const gr = g.createLinearGradient(k, 0, k + 46, 0); gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(.5, '#f4f6f8'); gr.addColorStop(1, '#9aa0a8'); g.fillStyle = gr; g.save(); g.translate(c, c); g.rotate(-.5); g.fillRect(k - c * 1.5, -w, 46, w * 2); g.restore(); } g.restore(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 4; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x * w, y * w) : g.moveTo(x * w, y * w)); g.closePath(); g.stroke(); };
    bridge([[.12, .4], [.5, .14], [.86, .3], [.78, .52], [.4, .5]]); bridge([[.18, .62], [.52, .58], [.84, .68], [.62, .9], [.3, .86]]);
    g.strokeStyle = '#e8b47a'; g.lineWidth = 12; g.beginPath(); g.arc(w * .26, w * .7, w * .11, 0, TAU); g.stroke();
    [[.5, .5], [.3, .32], [.66, .4], [.42, .72], [.7, .72], [.26, .7]].forEach(([x, y]) => { g.fillStyle = '#d4af6a'; g.beginPath(); g.arc(x * w, y * w, 20, 0, TAU); g.fill(); g.fillStyle = '#c2183b'; g.beginPath(); g.arc(x * w, y * w, 11, 0, TAU); g.fill(); });
    [[.2, .44], [.8, .38], [.55, .88], [.78, .62]].forEach(([x, y]) => { g.fillStyle = '#2246a8'; g.beginPath(); g.arc(x * w, y * w, 16, 0, TAU); g.fill(); g.strokeStyle = '#0b1640'; g.lineWidth = 4; g.beginPath(); g.moveTo(x * w - 12, y * w); g.lineTo(x * w + 12, y * w); g.stroke(); });
    g.fillStyle = '#b8913f'; g.font = '600 34px "Cinzel", serif'; g.textAlign = 'center'; g.fillText('MECHWATCH · 25 JEWELS', c, w * .2);
  });
}
function engravedBack(text) {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.fillStyle = '#808080'; g.fillRect(0, 0, w, w);
    for (let r = 10; r < c; r += 3) { g.strokeStyle = `rgba(${r % 6 ? 255 : 0},${r % 6 ? 255 : 0},${r % 6 ? 255 : 0},.12)`; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
    g.fillStyle = '#2c2c2c'; g.font = '500 44px "Cinzel", serif'; g.textAlign = 'center';
    const R = c * .72;
    [...text].forEach((ch, i) => { const a = -Math.PI / 2 - .9 + i * (1.8 / text.length); g.save(); g.translate(c + R * Math.cos(a), c + R * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); });
    g.font = '400 60px "Bodoni Moda", serif'; g.fillText('MW', c, c + 20);
  }, { srgb: false });
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
function octagon(R, cr = 1.4) { const s = new THREE.Shape(); const v = Array.from({ length: 8 }, (_, i) => { const a = (i + .5) / 8 * TAU; return [R * Math.cos(a), R * Math.sin(a)]; }); v.forEach((p, i) => { const prev = v[(i + 7) % 8], next = v[(i + 1) % 8]; const toward = (q, d) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy); return [p[0] + dx / L * d, p[1] + dy / L * d]; }; const a = toward(prev, cr), b = toward(next, cr); i ? s.lineTo(...a) : s.moveTo(...a); s.quadraticCurveTo(p[0], p[1], ...b); }); s.closePath(); return s; }
/** lathe around the Z axis (profile given as [radius, z]) */
function latheZ(profile, seg = 160, displace) {
  const g = new THREE.LatheGeometry(profile.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  if (displace) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const r = Math.hypot(x, z), phi = Math.atan2(x, z); const nr = displace(r, phi, y); if (r > 1e-6) { p.setX(i, x / r * nr); p.setZ(i, z / r * nr); } } g.computeVertexNormals(); }
  g.rotateX(Math.PI / 2);
  return g;
}
function normalizeUV(geo) { geo.computeBoundingBox(); const b = geo.boundingBox, uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y)); uv.needsUpdate = true; return geo; }
const M4 = new THREE.Matrix4();
/** Swept band (strap) along points; width along X, thickness along the curve normal. */
export function bandGeometry(pts, { w0 = 20, w1 = 16, t0 = 3.6, t1 = 2.2, center = new THREE.Vector3(0, 0, -30), seg = 140, axis = new THREE.Vector3(1, 0, 0) } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const P = curve.getSpacedPoints(seg), L = curve.getLength();
  const prof = []; const cr = .35, cs = 5;
  const corner = (cx, cy, a0) => { for (let i = 0; i <= cs; i++) { const a = a0 + i / cs * Math.PI / 2; prof.push([cx + cr * Math.cos(a), cy + cr * Math.sin(a)]); } };
  corner(.5 - cr, .5 - cr, 0); corner(-.5 + cr, .5 - cr, Math.PI / 2); corner(-.5 + cr, -.5 + cr, Math.PI); corner(.5 - cr, -.5 + cr, Math.PI * 1.5);
  const pos = [], uv = [], idx = [], np = prof.length;
  P.forEach((p, i) => {
    const t = i / seg, T = curve.getTangentAt(Math.min(.999, t)).normalize();
    const N = new THREE.Vector3().crossVectors(T, axis).normalize();
    const out = p.clone().sub(center); if (N.dot(out) < 0) N.negate();
    const w = w0 + (w1 - w0) * t, th = t0 + (t1 - t0) * Math.min(1, t * 2.2);
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
  } else { // baton
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
  const parts = []; const tickers = [];
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

  /* ── case middle & lugs ── */
  const caseG = part('case', 'Case', `The housing, machined from ${sp.metalName || sp.metal}. Brushed flats, polished flanks and chamfers.`, [0, 0, 0], [r * .99, -r * .25, (zB + zT) / 2], [1, -.2, 0]);
  let caseShape;
  if (isRound) {
    const prof = [[r * .55, zB], [r - .9, zB], [r - .15, zB + .9], [r + .12, (zB + zT) / 2], [r - .1, zT - .7], [r - .7, zT], [Rd + .4, zT]];
    caseG.add(new THREE.Mesh(latheZ(prof, 200), brush));
  } else {
    caseShape = shapeKind === 'octagon' ? squircle(r * 1.02, r * 1.08, 3.4, 160, .04) : shapeKind === 'nautilus' ? squircle(r, r, 4.2) : shapeKind === 'santos' ? squircle(r, r, 7) : shapeKind === 'cushion' ? squircle(r, r, 3.1) : shapeKind === 'tonneau' ? squircle(r * .86, r * 1.12, 2.7, 160, .09) : shapeKind === 'digital' ? roundRect(W, H, 6) : roundRect(W - 1, H, 2.6);
    const g = ext(caseShape, zT - zB - 1.2, .6, 96); g.translate(0, 0, zB + .6);
    caseG.add(new THREE.Mesh(g, shapeKind === 'digital' ? metal('carbon') : brush));
  }
  // attach geometry for straps
  let attach = { y: 0, z: -T * .16, w: sp.LW || 20 };
  if (isRound && sp.shape !== 'pocket') {
    const L2 = Math.max(r + 5, (sp.L2L || W * 1.2) / 2), LW = sp.LW || Math.round(W * .5);
    const lugsG = part('lugs', 'Lugs', `Horns that hold the strap on spring bars. ${LW} mm between them; ${(L2 * 2).toFixed(0)} mm tip-to-tip decides how it wears.`, [0, 0, 0], [LW / 2 + 1.3, L2 - 1.5, -T * .05], [.3, .6, .6]);
    for (const sy of [1, -1]) for (const sx of [1, -1]) {
      const s = new THREE.Shape(), u = v => v * sy, u0 = Math.sqrt(Math.max(0, (Rd + .8) ** 2 - (LW / 2) ** 2)) + .6;
      s.moveTo(u(u0), zB + .7); s.lineTo(u(L2 - 1.6), -T * .36); s.quadraticCurveTo(u(L2 + .2), -T * .36, u(L2 + .1), -T * .24);
      s.quadraticCurveTo(u(L2 - .2), -T * .1, u(L2 - 2.2), -T * .07); s.quadraticCurveTo(u(r * .98), zT - .2, u(u0), zT - .5); s.closePath();
      const g = ext(s, 1.7, .75, 24);
      g.applyMatrix4(M4.set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));
      const m = new THREE.Mesh(g, brush);
      m.position.x = sx > 0 ? LW / 2 + .75 : -LW / 2 - 1.7 - .75; lugsG.add(m);
    }
    attach = { y: L2 - 2.1, z: -T * .2, w: LW };
  } else if (shapeKind === 'rect') {
    if (/Reverso/i.test(sp.name || '')) { for (const sy of [1, -1]) for (let k = 0; k < 3; k++) { const gd = new THREE.Mesh(new THREE.BoxGeometry(W * .9, .35, .4), metal('black')); gd.position.set(0, sy * (H / 2 - 1.4 - k * 1.1), zT + .3); caseG.add(gd); } attach = { y: H / 2 + 1.2, z: -T * .15, w: W * .66 }; }
    else { const lugsG = part('lugs', 'Brancards', 'The Tank\'s side rails — the "treads" — extend past the case to form integrated lugs.', [0, 0, 0], [W / 2 - 1.5, H / 2 + 2, zT], [.5, .5, .7]);
      for (const sx of [1, -1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(4.2, H + 10, T * .78, 4, 1.6), polish); b.position.set(sx * (W / 2 - 1.6), 0, (zB + zT) / 2 + .2); lugsG.add(b); }
      attach = { y: H / 2 + 3.4, z: -T * .12, w: sp.LW || W - 7 }; }
  } else if (shapeKind === 'santos') {
    const lugsG = part('lugs', 'Lugs', 'Short horns integrated into the square case, flowing into the bracelet.', [0, 0, 0], [6, r + 3, 0], [0, .6, .7]);
    for (const sy of [1, -1]) { const s = new THREE.Shape(); s.moveTo(-9, 0); s.lineTo(-7, sy * 6); s.lineTo(7, sy * 6); s.lineTo(9, 0); s.closePath(); const g = ext(s, T * .45, .5); g.translate(0, sy * (r - .5), -T * .3); lugsG.add(new THREE.Mesh(g, polish)); }
    attach = { y: r + 5, z: -T * .16, w: 21 };
  } else if (shapeKind === 'cushion') {
    const lugsG = part('lugs', 'Lugs', 'Wire-style lugs grown out of the cushion case — a signature of 1930s Italian Navy instruments.', [0, 0, 0], [8, r + 4, 0], [0, .6, .7]);
    for (const sy of [1, -1]) for (const sx of [1, -1]) { const b = new THREE.Mesh(new RoundedBoxGeometry(3, 9, T * .5, 3, .9), brush); b.position.set(sx * 11.5, sy * (r + 2.4), -T * .14); lugsG.add(b); }
    attach = { y: r + 4.8, z: -T * .18, w: 22 };
  } else if (shapeKind === 'tonneau') { attach = { y: r * 1.12 - .5, z: -T * .2, w: r * 1.15 }; }
  else if (shapeKind === 'digital') { attach = { y: H / 2 + .6, z: -T * .2, w: sp.LW || 18 }; }
  else if (shapeKind === 'octagon') { attach = { y: r * 1.06, z: -T * .2, w: r * 1.3 }; }
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
      const ins = new THREE.Mesh(new THREE.RingGeometry(Rd + .4, rr - .9, 160, 1), new THREE.MeshPhysicalMaterial({ map: bezelTexture(sp.bezel, sp), roughness: sp.bezel === 'tachy' ? .3 : .1, metalness: sp.bezel === 'tachy' ? .6 : 0, clearcoat: 1 }));
      ins.position.z = zBz - .25; bezelG.add(ins);
      if (sp.bezel === 'diver' || sp.bezel === 'pepsi') { const pip = new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, .3, 24), LUME); pip.rotation.x = Math.PI / 2; pip.position.set(0, (Rd + rr) / 2, zBz - .05); bezelG.add(pip); }
    } else if (sp.bezel === 'fluted') {
      bezelG.add(new THREE.Mesh(latheZ([[Rd, zT], [rr, zT], [rr, zT + .6], [rr - .4, zBz], [Rd + .4, zBz + .2]], 480, (R, phi) => { const t = clamp((R - Rd) / (rr - Rd), 0, 1); return R - .55 * t * (.5 - .5 * Math.cos(64 * phi)); }), polish));
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
    let outer, inner;
    if (shapeKind === 'octagon') { outer = octagon(r * .93, 2.4); inner = squircle(Rd, Rd, 2); }
    else if (shapeKind === 'nautilus') { outer = squircle(r * .94, r * .94, 4.6); inner = squircle(Rd, Rd, 4.6); }
    else if (shapeKind === 'santos') { outer = squircle(r * .96, r * .96, 7); inner = squircle(Rd, Rd, 7); }
    else if (shapeKind === 'cushion') { outer = (() => { const s = new THREE.Shape(); s.absarc(0, 0, r * .9, 0, TAU, false); return s; })(); inner = squircle(Rd, Rd, 2); }
    else if (shapeKind === 'tonneau') { outer = squircle(r * .82, r * 1.06, 2.7, 160, .09); inner = squircle(Rd * .82, Rd * 1.1, 2.6, 160, .08); }
    else if (shapeKind === 'digital') { outer = roundRect(W - 2, H - 2, 5); inner = roundRect(W - 9, H - 13, 3); }
    else { outer = roundRect(W - 1.6, H - 1.6, 2.2); inner = roundRect(W - 5.4, H - 6, 1.2); }
    outer.holes.push(holePath(inner));
    const g = ext(outer, zBz - zT - .9, .45, 96); g.translate(0, 0, zT + .45);
    bezelG.add(new THREE.Mesh(g, shapeKind === 'digital' ? metal('carbon') : shapeKind === 'tonneau' ? metal('carbon') : polish));
    if (shapeKind === 'octagon') for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU, R2 = r * .83; const sc = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, .6, 6), metal('white', 'polished')); sc.rotation.x = Math.PI / 2; sc.rotation.y = a; sc.position.set(R2 * Math.cos(a), R2 * Math.sin(a), zBz + .1); bezelG.add(sc); }
    if (shapeKind === 'santos' || shapeKind === 'tonneau') { const pts = shapeKind === 'santos' ? [[-1, -1], [0, -1.08], [1, -1], [1.08, 0], [1, 1], [0, 1.08], [-1, 1], [-1.08, 0]].map(([x, y]) => [x * r * .8, y * r * .8]) : [[-.62, -.95], [0, -1.03], [.62, -.95], [-.62, .95], [0, 1.03], [.62, .95], [-.82, 0], [.82, 0]].map(([x, y]) => [x * r, y * r]); pts.forEach(([x, y]) => { const sc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, .5, 32), metal(shapeKind === 'tonneau' ? 'ti' : sp.metal, 'polished')); sc.rotation.x = Math.PI / 2; sc.position.set(x, y, zBz + .1); bezelG.add(sc); }); }
    if (shapeKind === 'cushion') { const g2 = latheZ([[Rd, zBz - .4], [r * .9, zBz - .4], [r * .9, zBz + .6], [Rd + .5, zBz + .8]], 160); bezelG.add(new THREE.Mesh(g2, polish)); }
  }

  /* ── dial & indices ── */
  const dialG = part('dial', 'Dial', dialDesc(sp), [0, 0, 3.5], [0, -Rd * .6, zDial], [0, 0, 1]);
  const dialTex = dialTexture(sp, isRect ? W : 1, isRect ? H : 1);
  let dialGeo;
  if (isRound || ['octagon', 'cushion'].includes(shapeKind)) dialGeo = new THREE.CircleGeometry(isRound ? Rd + .2 : Rd + .2, 128);
  else { const s = shapeKind === 'nautilus' ? squircle(Rd + .3, Rd + .3, 4.6) : shapeKind === 'santos' ? squircle(Rd + .3, Rd + .3, 7) : shapeKind === 'tonneau' ? squircle(Rd * .84, Rd * 1.12, 2.6, 128, .08) : roundRect(W - 5, H - 5.6, 1.4); dialGeo = normalizeUV(new THREE.ShapeGeometry(s, 64)); }
  const dialMesh = new THREE.Mesh(dialGeo, new THREE.MeshPhysicalMaterial({ map: dialTex, roughness: sp.dialType === 'enamel' ? .08 : .32, metalness: sp.dialType === 'enamel' || sp.dialType === 'lcd' ? 0 : .35, clearcoat: sp.dialType === 'enamel' ? 1 : .2 }));
  dialMesh.position.z = zDial; dialMesh.receiveShadow = true; dialG.add(dialMesh);
  // rehaut (inner flange)
  if (isRound) dialG.add(new THREE.Mesh(latheZ([[Rd + .2, zDial], [Rd + .2, zDial + .2], [Rd + .55, zBz - .4]], 128), new THREE.MeshStandardMaterial({ color: shade(cssHex(sp.dial), -.4), roughness: .5, metalness: .3, side: THREE.DoubleSide })));
  const idxMetal = sp.indexMetal ? metal(sp.indexMetal, 'polished') : (['gold', 'rose'].includes(sp.metal) ? polish : metal('white', 'polished'));
  const appliedTypes = { diver: 'dots', snowflakehand: 'dots', gmt: 'dots', tapisserie: 'wide', sunburst: 'batons', horizontal: 'batons', snow: 'batons', birch: 'batons', fume: 'none', perpetual: 'batons3', dress: 'dauphine', chrono: 'batons', guilloche: 'batons' };
  const app = appliedTypes[sp.dialType] || (['roman', 'enamel', 'flieger', 'field', 'journe', 'sandwich', 'tourbillon', 'lange1', 'zeitwerk', 'lcd', 'skeleton'].includes(sp.dialType) ? 'none' : 'batons');
  if (app !== 'none' && !isRect) {
    const iG = new THREE.Group(); dialG.add(iG);
    const RI = shapeKind === 'nautilus' || shapeKind === 'santos' ? Rd * .82 : Rd * .8;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, x = Math.sin(a) * RI, y = Math.cos(a) * RI;
      if ((sp.subs >= 2 && (i === 3 || i === 9)) || (sp.subs === 3 && i === 6) || (sp.subsec && i === 6) || (app === 'batons3' && i % 3 === 0) || (sp.date && i === 3 && !sp.subs) || (sp.dialType === 'tourbillon' && i === 6)) continue;
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
  const handsG = part('hands', 'Hands', handsDesc(sp.hands), [0, 0, 6.5], [-Rd * .18, Rd * .22, zDial + 1.2], [0, 0, 1]);
  const handMat = sp.handMetal === 'blued' ? BLUED : darkDial ? (['gold', 'rose'].includes(sp.metal) ? polish : metal('white', 'polished')) : (['breguet', 'sword'].includes(sp.hands) || ['roman', 'enamel'].includes(sp.dialType) ? BLUED : ['gold', 'rose'].includes(sp.metal) ? polish : BLACKH);
  const lume = darkDial && !['dauphine', 'breguet'].includes(sp.hands);
  const hourStyle = sp.hands === 'mercedes' ? 'mercedes' : sp.hands, minStyle = sp.hands === 'mercedes' ? 'sword' : sp.hands;
  const hScale = isRect ? Math.min(W, H) / 2 * .85 : Rd;
  const HH = sp.hands !== 'none' && sp.dialType !== 'lcd' && sp.dialType !== 'zeitwerk' ? handGroup(hourStyle, hScale * .56, hScale * .085, handMat, lume, zDial + .5) : null;
  const MH = HH ? handGroup(minStyle, hScale * (isRect ? .95 : .86), hScale * .065, handMat, lume, zDial + .9) : null;
  let SH = null;
  if (HH) {
    handsG.add(HH, MH);
    if (!sp.subsec && sp.dialType !== 'tourbillon' && sp.dialType !== 'lange1') {
      SH = new THREE.Group(); SH.position.z = zDial + 1.35;
      const sMat = sp.subs ? REDH : sp.dialType === 'snowflakehand' || sp.bezel === 'diver' ? handMat : handMat;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.2, hScale * 1.12, .12), sMat); bar.position.y = hScale * .38; SH.add(bar);
      const cw = new THREE.Mesh(new THREE.CylinderGeometry(hScale * .05, hScale * .05, .14, 24), sMat); cw.rotation.x = Math.PI / 2; cw.position.y = -hScale * .12; SH.add(cw);
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
  if (sp.subs === 3) { subAt(-.42, 0, Rd * .19); subAt(.42, 0, Rd * .19, REDH); subAt(0, -.42, Rd * .19, REDH); }
  else if (sp.subs === 2) { subAt(-.42, 0, Rd * .2); subAt(.42, 0, Rd * .2, REDH); }
  const smallSec = sp.subsec ? subAt(0, isRect ? -.42 : -.48, Rd * .18) : sp.dialType === 'lange1' ? subAt(.32, -.44, Rd * .16) : null;
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
  const sapp = sapphire();
  if (isRound || ['octagon', 'cushion'].includes(shapeKind)) {
    const R0 = isRound ? Rd + .5 : Rd + .4, sph = 60, th = Math.asin(R0 / sph);
    const cap = new THREE.SphereGeometry(sph, 96, 12, 0, TAU, 0, th); cap.scale(1, .2, 1); cap.rotateX(Math.PI / 2); cap.translate(0, 0, zBz - sph * .2 * Math.cos(th) + .2);
    crysG.add(new THREE.Mesh(cap, sapp));
  } else {
    const s = shapeKind === 'nautilus' ? squircle(Rd + .5, Rd + .5, 4.6) : shapeKind === 'santos' ? squircle(Rd + .5, Rd + .5, 7) : shapeKind === 'tonneau' ? squircle(Rd * .84, Rd * 1.12, 2.6, 128, .08) : roundRect(W - 5, H - 5.6, 1.4);
    const g = ext(s, .6, .4, 64); g.translate(0, 0, zBz - .6); crysG.add(new THREE.Mesh(g, sapp));
  }

  /* ── crown, guards, pushers ── */
  const edgeX = isRect ? W / 2 : shapeKind === 'tonneau' ? r * .86 * 1.09 : shapeKind === 'octagon' ? r * 1.02 : r;
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
        const s = new THREE.Shape(), v = y => y * sy; s.moveTo(-1.5, v(-8)); s.quadraticCurveTo(3.8, v(-7.2), 4.2, v(-3.6)); s.lineTo(2.6, v(-3.3)); s.quadraticCurveTo(1, v(-4.5), -1.5, v(-4.8)); s.closePath();
        const g = ext(s, (zT - zB) * .74, .5, 24); g.translate(edgeX, 0, zB + (zT - zB) * .13); crownG.add(new THREE.Mesh(g, brush));
      }
    }
    if (shapeKind === 'cushion') { const br = new THREE.Mesh(new RoundedBoxGeometry(5, 13, T * .55, 3, 1.4), brush); br.position.set(edgeX + 2.6, 0, crownZ); crownG.add(br); const lv = new THREE.Mesh(new RoundedBoxGeometry(2, 11, 1.4, 2, .5), polish); lv.position.set(edgeX + 5.3, 1, crownZ); lv.rotation.z = .12; crownG.add(lv); }
  }
  if (sp.subs) {
    const push = part('pushers', 'Chronograph pushers', 'Start/stop at 2 o\'clock, reset at 4. Each push turns the column wheel one step.', [9, 0, 0], [Math.cos(.55) * (edgeX + 2.5), Math.sin(.55) * (edgeX + 2.5), crownZ + 1], [1, .5, .3]);
    for (const a of [.52, -.52]) { const g = new THREE.Group(); g.position.set(Math.cos(a) * edgeX, Math.sin(a) * edgeX, crownZ); g.rotation.z = a; push.add(g); const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 24), polish); stem.rotation.z = Math.PI / 2; stem.position.x = 1.2; g.add(stem); const head = new THREE.Mesh(new RoundedBoxGeometry(2.6, 4.4, 3.8, 3, .8), polish); head.position.x = 3.4; g.add(head); }
  }

  /* ── caseback ── */
  const exhib = sp.caseback !== 'solid';
  const backG = part('caseback', exhib ? 'Exhibition caseback' : 'Screw-down caseback', exhib ? 'A sapphire window onto the movement: perlage, Côtes de Genève, blued screws and a gold-segment rotor that spins as you move.' : 'Solid steel, screwed down against a gasket and engraved — for water resistance.', [0, 0, -11], [r * .3, -r * .3, zB - T * .1], [0, 0, -1]);
  const bOuter = isRound ? r * .9 : Math.min(W, H) * .42;
  const backRing = new THREE.Mesh(latheZ([[bOuter * (exhib ? .72 : .86), zB - T * .07], [bOuter, zB - T * .05], [bOuter + .5, zB + .2], [bOuter + .5, zB + .6]], 160), exhib ? polish : brush);
  if (!exhib) { const eg = engravedBack('WATER RESISTANT · 300 M · STAINLESS STEEL · SAPHIR'); const disc = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .87, 96), new THREE.MeshPhysicalMaterial({ color: METAL[sp.metal] ?? METAL.steel, metalness: 1, roughness: .3, roughnessMap: eg, bumpMap: eg, bumpScale: 2 })); disc.rotation.y = Math.PI; disc.position.z = zB - T * .07; backG.add(disc); }
  backG.add(backRing);
  let rotor = null;
  if (exhib) {
    const mv = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .72, 96), new THREE.MeshPhysicalMaterial({ map: movementTexture(), metalness: .8, roughness: .3 })); mv.rotation.y = Math.PI; mv.position.z = zB + .3; backG.add(mv);
    rotor = new THREE.Group(); rotor.position.z = zB - .2; backG.add(rotor);
    const rs = new THREE.Shape(); rs.absarc(0, 0, bOuter * .7, .05, Math.PI - .05, false); rs.absarc(0, 0, bOuter * .14, Math.PI - .05, .05 + TAU, true);
    const rg = ext(rs, .5, .12, 64); rg.translate(0, 0, -.25); const rm = new THREE.Mesh(rg, metal('gold', 'polished')); rotor.add(rm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(bOuter * .15, bOuter * .15, .9, 32), metal('white', 'polished')); hub.rotation.x = Math.PI / 2; rotor.add(hub);
    const win = new THREE.Mesh(new THREE.CircleGeometry(bOuter * .74, 96), sapphire()); win.rotation.y = Math.PI; win.position.z = zB - T * .065; backG.add(win);
  }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const n = new THREE.Mesh(new THREE.BoxGeometry(2.2, .9, .6), metal('black')); n.position.set(Math.cos(a) * bOuter * .96, Math.sin(a) * bOuter * .96, zB - T * .05); n.rotation.z = a; backG.add(n); }

  /* ── strap or bracelet, wrapped around a wrist-shaped ellipse ── */
  const isPocket = sp.shape === 'pocket';
  let strapParts = [];
  const wrist = { a: Math.max(32, attach.y + 9), b: 22.5 };
  wrist.zc = -T * .5 - wrist.b + 1.2;
  const C = new THREE.Vector3(0, 0, wrist.zc);
  const wristPts = (sgn, endAng) => {
    const pts = [new THREE.Vector3(0, sgn * attach.y, attach.z), new THREE.Vector3(0, sgn * (attach.y + 3.6), attach.z - 1.4), new THREE.Vector3(0, sgn * (attach.y + 6.6), attach.z - 4.8)];
    const a0 = Math.asin(clamp((attach.y + 8.2) / wrist.a, -.98, .98));
    for (let k = 0; k <= 10; k++) { const al = a0 + (endAng - a0) * k / 10; pts.push(new THREE.Vector3(0, sgn * wrist.a * Math.sin(al), wrist.zc + wrist.b * Math.cos(al))); }
    return pts;
  };
  if (!isPocket) {
    const bracelet = sp.bracelet;
    if (bracelet) {
      const bm = metal(sp.metal, 'brushed'), pm = metal(sp.metal, 'polished');
      const top = part('bracelet12', 'Bracelet — 12 o\'clock side', braceletDesc(bracelet), [0, 13, -5], [attach.w * .3, attach.y + 9, attach.z - 6], [0, .7, .5]);
      const bot = part('bracelet6', 'Bracelet — 6 o\'clock side', 'Solid links joined by pins or screws; removable links size it to the wrist.', [0, -13, -5], [-attach.w * .3, -attach.y - 9, attach.z - 6], [0, -.7, .5]);
      [[top, 1], [bot, -1]].forEach(([grp, sgn]) => {
        const pts = wristPts(sgn, Math.PI * .86); const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal'); const L = curve.getLength();
        const pitch = bracelet === 'jubilee' ? 5.6 : bracelet === 'integrated' ? 6.2 : 7.2, n = Math.floor(L / pitch);
        const pieces = bracelet === 'jubilee' ? [[-.37, .25, bm, 1], [.37, .25, bm, 1], [-.12, .13, pm, .5], [.12, .13, pm, .5], [0, .1, pm, .5, .5]] : bracelet === 'integrated' ? [[-.3, .38, bm, 1], [.3, .38, bm, 1], [0, .17, pm, .55, .5]] : [[-.33, .3, bm, 1], [.33, .3, bm, 1], [0, .34, pm, 1]];
        pieces.forEach(([xo, wf, mat, lf, off = 0]) => {
          const inst = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 3, .22), mat, n); inst.castShadow = true;
          for (let i = 0; i < n; i++) {
            const t = clamp((i + .5 + off * .5) / n, 0, 1), f = frameAt(curve, Math.min(.999, t), C);
            const wNow = attach.w + (attach.w * (bracelet === 'integrated' ? .62 : .82) - attach.w) * t;
            const basis = new THREE.Matrix4().makeBasis(f.X, f.N, f.T);
            const m = basis.clone().scale(new THREE.Vector3(wNow * wf - .2, 2.3 - t * .4, pitch * lf * .975));
            m.setPosition(f.p.clone().addScaledVector(f.X, xo * wNow));
            inst.setMatrixAt(i, m);
          }
          grp.add(inst);
        });
      });
      const clasp = part('clasp', 'Folding clasp', 'A deployant clasp with a safety catch and on-the-fly micro-adjustment — the bracelet\'s "buckle".', [0, 0, -12], [0, 0, wrist.zc - wrist.b - 2], [0, 0, -1]);
      const cl = new THREE.Mesh(new RoundedBoxGeometry(attach.w * .82, 3, 26, 4, 1.2), pm); cl.position.set(0, 0, wrist.zc - wrist.b - .5); clasp.add(cl);
      const crest = new THREE.Mesh(new RoundedBoxGeometry(attach.w * .3, 3.3, 10, 3, .8), bm); crest.position.set(0, 0, wrist.zc - wrist.b - .5); clasp.add(crest);
      clasp.children.forEach(m => m.rotation.x = Math.PI / 2);
      strapParts = ['bracelet12', 'bracelet6', 'clasp'];
    } else {
      const kind = sp.strap; const col = sp.strapColor;
      const smat = new THREE.MeshPhysicalMaterial({ map: strapTexture(kind, col), roughness: kind === 'rubber' ? .6 : kind === 'alligator' ? .52 : .78, clearcoat: kind === 'alligator' ? .18 : 0, clearcoatRoughness: .5, envMapIntensity: .45, sheen: kind === 'nato' || kind === 'calf' ? .5 : .2, sheenColor: new THREE.Color(col).multiplyScalar(1.6), sheenRoughness: .7 });
      const sName = { alligator: 'Alligator strap', calf: 'Calfskin strap', rubber: 'Rubber strap', nato: 'NATO strap' }[kind] || 'Strap';
      const top = part('strap12', `${sName} — 12 o'clock`, strapDesc(kind) + ' This side carries the buckle.', [0, 13, -4], [0, attach.y + 9, attach.z - 6], [0, .7, .5]);
      const bot = part('strap6', `${sName} — 6 o'clock`, 'The long side with the adjustment holes, finished with a tapered tip that tucks into the keepers.', [0, -13, -4], [0, -attach.y - 9, attach.z - 6], [0, -.7, .5]);
      const wEnd = Math.max(14, attach.w * .8);
      top.add(new THREE.Mesh(bandGeometry(wristPts(1, Math.PI * .9), { w0: attach.w, w1: wEnd, t0: kind === 'nato' ? 1.4 : 3.8, t1: kind === 'nato' ? 1.4 : 2.4, center: C }), smat));
      bot.add(new THREE.Mesh(bandGeometry(wristPts(-1, Math.PI * .97), { w0: attach.w, w1: wEnd, t0: kind === 'nato' ? 1.4 : 3.8, t1: kind === 'nato' ? 1.4 : 2.4, center: C }), smat));
      const buckle = part('buckle', kind === 'rubber' && sp.deployant ? 'Deployant buckle' : 'Pin buckle', 'Solid metal, matched to the case. The tongue passes through a hole; the keepers hold the tail.', [0, 0, -12], [0, wrist.a * Math.sin(Math.PI * .9), wrist.zc + wrist.b * Math.cos(Math.PI * .9) - 2], [0, .2, -1]);
      const bc = new THREE.CatmullRomCurve3(wristPts(1, Math.PI * .9), false, 'centripetal'); const f = frameAt(bc, .985, C);
      const frame = new THREE.Group(); frame.matrixAutoUpdate = true; buckle.add(frame);
      const basis = new THREE.Matrix4().makeBasis(f.X, f.N, f.T); frame.quaternion.setFromRotationMatrix(basis); frame.position.copy(f.p);
      const bw = wEnd + 2.6;
      [[-bw / 2, 0], [bw / 2, 0]].forEach(([x]) => { const s2 = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.6, 9, 3, .5), polish); s2.position.set(x, 1.2, 1.5); frame.add(s2); });
      const front = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, bw + 1.2, 24), polish); front.rotation.z = Math.PI / 2; front.position.set(0, 1.4, 5.8); frame.add(front);
      const tongue = new THREE.Mesh(new RoundedBoxGeometry(.9, .8, 7, 2, .3), polish); tongue.position.set(0, 2.2, 2.4); frame.add(tongue);
      const keeper = new THREE.Mesh(new THREE.TorusGeometry(1, .5, 8, 4), smat); keeper.scale.set(wEnd / 2 + .6, 2.4, 1); keeper.position.set(0, .4, -4); keeper.rotation.z = Math.PI / 4; frame.add(keeper);
      strapParts = ['strap12', 'strap6', 'buckle'];
    }
    const bars = part('springbars', 'Spring bars', 'Spring-loaded pins that pass through the strap and click into holes inside the lugs.', [0, 0, 0], [attach.w * .3, attach.y, attach.z], [0, 1, 0]);
    for (const sy of [1, -1]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.85, .85, attach.w + 1.2, 16), metal('steel', 'polished')); b.rotation.z = Math.PI / 2; b.position.set(0, sy * attach.y, attach.z); bars.add(b); }
  } else {
    const bow = part('lugs', 'Bow & pendant', 'A pocket watch hangs from a bow on its pendant, with the crown at 12.', [0, 10, 0], [0, r + 8, crownZ], [0, 1, .3]);
    const t = new THREE.Mesh(new THREE.TorusGeometry(7, 1.1, 16, 48), polish); t.position.set(0, r + 9, crownZ); bow.add(t);
    crownG.rotation.z = Math.PI / 2;
  }

  /* ── wrist cushion (display) ── */
  const cushion = new THREE.Group(); cushion.name = 'cushion';
  if (!isPocket) {
    const prof = [[0, -31], [.8, -31], [.97, -30.2], [1, -28.8], [1, 28.8], [.97, 30.2], [.8, 31], [0, 31]].map(([x, y]) => new THREE.Vector2(x, y));
    const cg = new THREE.LatheGeometry(prof, 96); cg.rotateZ(-Math.PI / 2); cg.scale(1, wrist.a - (sp.bracelet ? 2.2 : 3.2), wrist.b - (sp.bracelet ? 2.2 : 3.2)); cg.translate(0, 0, wrist.zc);
    const cm = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ color: 0x24130b, roughness: 1, sheen: .8, sheenColor: new THREE.Color(0x6a4228), sheenRoughness: .6, bumpMap: canvasTex(256, 256, (g, w) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, w); for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() > .5 ? '#9a9a9a' : '#666'; g.fillRect(Math.random() * w, Math.random() * w, 1.5, 1.5); } }, { srgb: false, repeat: [6, 6] }), bumpScale: .6 }));
    cm.receiveShadow = true; cm.castShadow = true; cushion.add(cm);
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
    if (lcd && now.getSeconds() !== lastSec) { lastSec = now.getSeconds(); if (sp.dialType === 'lcd' || now.getSeconds() === 0) { const c = dialTex.userData.canvas; dialTex.userData.draw(c.getContext('2d'), c.width, c.height); dialTex.needsUpdate = true; } }
  }
  function setExplode(e) { parts.forEach(p => { p.group.position.copy(p.explode).multiplyScalar(e); }); }
  function dispose() { root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (![LUME, BLUED, BLACKH, REDH, RUBY].includes(m) && ![...matCache.values()].includes(m)) { m.map && m.map.dispose(); m.dispose(); } }); } }); }
  tick();
  return { group: root, parts, tick, setExplode, dispose, wrist, strapParts, cushion };
}

/* ───────────────────────── descriptions ───────────────────────── */
function bezelTexture(kind, sp) {
  return canvasTex(1024, 1024, (g, w) => {
    const c = w / 2; g.translate(c, c);
    const colA = kind === 'pepsi' ? '#22408f' : kind === 'tachy' ? (lum(sp.dial) > .5 ? '#d7dade' : '#141416') : '#0e0f11', colB = kind === 'pepsi' ? '#a8192f' : colA;
    g.fillStyle = colA; g.beginPath(); g.arc(0, 0, c, Math.PI, TAU); g.fill(); g.fillStyle = colB; g.beginPath(); g.arc(0, 0, c, 0, Math.PI); g.fill();
    const ink = kind === 'tachy' && lum(sp.dial) > .5 ? '#111' : '#f1ece0'; g.fillStyle = ink; g.strokeStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle';
    const R = c * .885;
    if (kind === 'tachy') { g.font = `600 ${c * .07}px "Inter", sans-serif`; [500, 300, 200, 150, 120, 100, 90, 80, 70, 60].forEach(v => { const a = 3600 / v * 6 * Math.PI / 180; g.save(); g.rotate(a); g.fillText(v, 0, -R); g.restore(); }); g.font = `500 ${c * .045}px "Inter"`; g.save(); g.rotate(Math.PI); g.fillText('TACHYMETRE', 0, -R); g.restore(); }
    else if (kind === 'pepsi' || kind === 'gmt') { g.font = `600 ${c * .09}px "Inter", sans-serif`; for (let i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * TAU); if (i % 2 === 0 && i) g.fillText(i, 0, -R); else if (!i) { g.beginPath(); g.moveTo(0, -R + c * .05); g.lineTo(-c * .05, -R - c * .04); g.lineTo(c * .05, -R - c * .04); g.fill(); } else g.fillRect(-c * .008, -R - c * .03, c * .016, c * .06); g.restore(); } }
    else if (kind === 'tenth') { for (let i = 0; i < 100; i++) { g.save(); g.rotate(i / 100 * TAU); g.fillRect(-c * .004, -c * .96, c * .008, i % 10 ? c * .05 : c * .1); g.restore(); } }
    else { g.font = `600 ${c * .1}px "Inter", sans-serif`; for (let i = 0; i < 60; i++) { g.save(); g.rotate(i / 60 * TAU); if (i % 10 === 0 && i) g.fillText(i, 0, -R); else if (i === 0) { } else if (i < 15 || i % 5 === 0) g.fillRect(-c * .007, -R - c * .04, c * .014, i % 5 ? c * .06 : c * .08); g.restore(); } }
  });
}
function bezelDesc(b, s) { return ({ diver: 'Unidirectional diving bezel, 120 clicks, ceramic insert with a luminous pip at 12 — it can only shorten your remaining dive time if knocked.', pepsi: 'Bidirectional 24-hour bezel in two tones (day/night) for reading a third time zone.', tachy: 'Tachymeter scale: time a known distance with the chronograph and read off the speed.', fluted: 'Fluted bezel — once functional for screwing the case shut, now pure light play.', clous: 'Clous de Paris hobnail guilloché — hundreds of tiny pyramids cut by hand.', maltese: 'Bezel cut in a half Maltese cross, emblem of its house.', tenth: 'Ceramic bezel graduated in 1/10 s for the high-beat chronograph.', slide: 'Circular slide rule for fuel, speed and unit conversions.', screws: 'Six visible H-screws clamp a "sandwich" of case materials.', thin: 'Slim polished bezel to let the dial breathe.', octagon: 'Octagonal bezel fixed by eight hexagonal screws.' }[s === 'octagon' ? 'octagon' : b] || 'Polished bezel ring holding the crystal and its gasket.'); }
function dialDesc(sp) { return ({ diver: 'High-contrast dive dial with applied, luminous indices.', tapisserie: '"Tapisserie" guilloché — a grid of tiny pyramids, each catching light.', horizontal: 'Horizontally embossed dial, gradated from light to dark.', snow: 'Textured to evoke wind-blown snow.', birch: 'Vertically textured like birch bark.', enamel: 'Grand feu enamel: fired at 800 °C, layer by layer, with Breguet numerals.', flieger: 'Observation-watch dial: triangle and dots at 12, maximal legibility.', field: 'Arabic numerals with a 24-hour inner track.', roman: 'Roman numerals and a chemin de fer minute track.', perpetual: 'Day, month with leap-year cycle, and moon phase.', zeitwerk: 'Jumping digital hours and minutes — mechanically.', lange1: 'Off-centre dial, Outsize Date and small seconds, laid out on the golden ratio.', tourbillon: 'An aperture at 6 reveals the tourbillon cage turning once a minute.', fume: 'Fumé sunburst fading to black at the edge.', skeleton: 'Skeletonised: the movement itself becomes the dial.', lcd: 'Twisted-nematic liquid crystal display.', sandwich: 'Sandwich dial: cut-out numerals over a luminous lower plate.' }[sp.dialType] || 'Sunburst-brushed dial with applied indices.'); }
function handsDesc(h) { return ({ mercedes: 'Mercedes hour hand and sword minute hand, filled with lume.', sword: 'Sword hands, made for legibility.', dauphine: 'Faceted dauphine hands — two planes meeting in a sharp ridge.', breguet: 'Breguet "pomme" hands in thermally blued steel.', snowflake: 'Snowflake hour hand, a 1960s military signature.' }[h] || 'Baton hands, polished, with luminous inserts.'); }
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
    dialType: w.dialType || (w.skeleton ? 'skeleton' : 'sunburst'), bezel: w.bezel || (w.shape === 'round' || w.shape === 'lug' ? 'plain' : 'none'), subs: w.subs || 0, subsec: !!w.subsec, date: !!w.date, gmt: !!w.gmt, power: !!w.power, skeleton: !!w.skeleton,
    crown: w.crown || (w.bezel === 'diver' || w.bezel === 'pepsi' ? 'guard' : /Tank|Santos/.test(name) ? 'cabochon' : 'std'),
    hands: w.breguet || ['roman', 'enamel', 'tourbillon'].includes(w.dialType) ? 'breguet' : w.dialType === 'diver' && w.bezel === 'pepsi' ? 'mercedes' : w.dialType === 'diver' ? 'mercedes' : w.dialType === 'snowflakehand' ? 'snowflake' : w.dialType === 'flieger' ? 'sword' : ['dress', 'lange1'].includes(w.dialType) || /Calatrava|Patrimony/.test(name) ? 'dauphine' : 'baton',
    bracelet, strap: rubber ? 'rubber' : 'alligator', strapColor: rubber ? '#121212' : (w.case === 'gold' || w.case === 'rose') ? '#3a1d0e' : '#141012',
    LW: Math.round(w.dia * .5), L2L: w.dia * 1.2, line: w.cal ? 'CAL. ' + w.cal.toUpperCase().slice(0, 18) : 'AUTOMATIC',
    caseback: w.dialType === 'diver' || /Submariner|GMT/.test(name) ? 'solid' : 'exhibition',
  };
  if (w.shape === 'rect') sp.H = w.dia * (/Reverso/.test(name) ? 1.66 : 1.32);
  if (sp.dialType === 'dress') sp.subsec = true;
  return sp;
}
export const ARCHETYPE_SPECS = {
  diver: { name: 'Diver archetype', brand: 'MechWatch', D: 40, T: 12.5, L2L: 48, LW: 20, metal: 'steel', dial: '#0e0f11', dialType: 'diver', bezel: 'diver', crown: 'guard', hands: 'mercedes', date: true, bracelet: 'oyster', caseback: 'solid', line: 'SUBMERSIBLE 300 M' },
  pilot: { name: 'Pilot archetype', brand: 'MechWatch', D: 44, T: 13, L2L: 54, LW: 22, metal: 'steel', dial: '#131416', dialType: 'flieger', bezel: 'plain', crown: 'onion', hands: 'sword', strap: 'calf', strapColor: '#5a3820', line: 'B-UHR' },
  chrono: { name: 'Chronograph archetype', brand: 'MechWatch', D: 42, T: 13.2, L2L: 48, LW: 20, metal: 'steel', dial: '#131416', dialType: 'sunburst', bezel: 'tachy', subs: 3, hands: 'baton', bracelet: 'oyster', line: 'CHRONOGRAPH' },
  dress: { name: 'Dress archetype', brand: 'MechWatch', D: 36, T: 8.5, L2L: 44, LW: 18, metal: 'gold', dial: '#efe8d8', dialType: 'dress', bezel: 'thin', hands: 'dauphine', subsec: true, strap: 'alligator', strapColor: '#1b120e', crown: 'small', line: 'HAND-WOUND' },
  gmt: { name: 'GMT archetype', brand: 'MechWatch', D: 40, T: 12, L2L: 48, LW: 20, metal: 'steel', dial: '#0e0f11', dialType: 'diver', bezel: 'pepsi', crown: 'guard', hands: 'mercedes', gmt: true, date: true, bracelet: 'jubilee', caseback: 'solid', line: 'GMT · 24 H' },
  field: { name: 'Field archetype', brand: 'MechWatch', D: 38, T: 10.5, L2L: 46, LW: 20, metal: 'ti', dial: '#1b1d17', dialType: 'field', bezel: 'plain', crown: 'small', hands: 'baton', strap: 'nato', strapColor: '#4d5236', caseback: 'solid', line: 'HACKING' },
  octagon: { name: 'Integrated sports archetype', brand: 'MechWatch', shape: 'octagon', D: 39, T: 8.1, metal: 'steel', dial: '#1e3f70', dialType: 'tapisserie', hands: 'baton', bracelet: 'integrated', line: 'AUTOMATIC' },
  tank: { name: 'Tank archetype', brand: 'MechWatch', shape: 'rect', D: 25.5, H: 33.7, T: 6.5, LW: 18, metal: 'gold', dial: '#f2ede3', dialType: 'roman', hands: 'breguet', strap: 'alligator', strapColor: '#2a140c', crown: 'cabochon', line: 'HAND-WOUND' },
  digital: { name: 'Digital LCD archetype', brand: 'MechWatch', shape: 'digital', D: 35, H: 38, T: 8.5, LW: 18, metal: 'carbon', dial: '#9fab8f', dialType: 'lcd', hands: 'none', strap: 'rubber', strapColor: '#151515', crown: 'buttons', caseback: 'solid' },
  tourbillon: { name: 'Tourbillon archetype', brand: 'MechWatch', D: 41, T: 11.5, L2L: 49, LW: 21, metal: 'plat', dial: '#2a2c31', dialType: 'tourbillon', bezel: 'thin', hands: 'breguet', strap: 'alligator', strapColor: '#151012', line: 'TOURBILLON' },
};
export const SIGNATURE = { name: 'MechWatch Signature', brand: 'MechWatch', D: 40, T: 10.5, L2L: 47, LW: 20, metal: 'rose', dial: '#4a2a14', dialType: 'guilloche', bezel: 'thin', hands: 'dauphine', date: true, strap: 'alligator', strapColor: '#2a1509', crown: 'std', line: 'CHRONOMÈTRE · 28 800 A/h' };

/* ───────────────────────── a reusable studio stage ───────────────────────── */
export function createStage(canvas, { bloom = true, shadows = true, floorY = null, exposure = 1.0, alpha = true } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  const camera = new THREE.PerspectiveCamera(26, 1, 1, 2000);
  const key = new THREE.DirectionalLight(0xffe4c0, 1.6); key.position.set(40, 90, 70); key.castShadow = shadows;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 400 }); key.shadow.bias = -.0004; key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffa860, 1.2); rim.position.set(-60, 30, -80); scene.add(rim);
  let floor = null;
  if (floorY !== null) { floor = new THREE.Mesh(new THREE.CircleGeometry(300, 64), new THREE.ShadowMaterial({ opacity: .45 })); floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; floor.receiveShadow = true; scene.add(floor); }
  let composer = null, bloomPass = null;
  if (bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), .32, .5, .82); composer.addPass(bloomPass);
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
