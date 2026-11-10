import { el, h, polar, metalDefs, TAU, rad } from './util.js';
import { TIMELINE, ANATOMY, GLOSSARY } from './data.js';
import { initCinema } from './cinema.js';

const $ = s => document.querySelector(s);
const T0 = performance.now();

/* (nav, reveal & choreography live in cinema.js) */

/* ═════════════ HERO WATCH ═════════════ */
export function buildDressWatch(svg, { scale = 1, strap = true, id = 'hw' } = {}) {
  metalDefs(svg, id);
  const defs = svg.querySelector('defs');
  defs.insertAdjacentHTML('beforeend', `
    <radialGradient id="${id}-dial" cx=".45" cy=".35" r=".75">
      <stop offset="0" stop-color="#6a4120"/><stop offset=".55" stop-color="#341d0c"/><stop offset="1" stop-color="#160b04"/>
    </radialGradient>
    <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#ffd59a" stop-opacity=".2"/><stop offset=".55" stop-color="#ffd59a" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-strap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#120804"/><stop offset=".5" stop-color="#2a1609"/><stop offset="1" stop-color="#120804"/>
    </linearGradient>
    <linearGradient id="${id}-fadeT" x1="0" y1="1" x2="0" y2="0"><stop offset=".3" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="${id}-strapMask"><rect x="-260" y="-260" width="520" height="520" fill="url(#${id}-fadeV)"/></mask>
    <linearGradient id="${id}-fadeV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".22" stop-color="#fff"/><stop offset=".78" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <clipPath id="${id}-dialClip"><circle r="172"/></clipPath>`);
  const g = el('g', { transform: `scale(${scale})` }, svg);
  const G = `url(#${id}-gold)`;
  if (strap) {
    const s = el('g', { mask: `url(#${id}-strapMask)` }, g);
    for (const dir of [-1, 1]) {
      el('path', { d: `M-78 ${dir * 150} L-70 ${dir * 260} L70 ${dir * 260} L78 ${dir * 150} Z`, fill: `url(#${id}-strap)` }, s);
      el('path', { d: `M-66 ${dir * 170} L-60 ${dir * 260} M66 ${dir * 170} L60 ${dir * 260}`, stroke: '#c9a46a', 'stroke-width': 1.2, 'stroke-dasharray': '5 4', opacity: .55 }, s);
      for (let i = 0; i < 8; i++) el('ellipse', { cx: -40 + (i % 4) * 26 + (i > 3 ? 13 : 0), cy: dir * (200 + (i > 3 ? 22 : 0)), rx: 9, ry: 6, fill: 'none', stroke: '#000', 'stroke-opacity': .28 }, s);
    }
  }
  // lugs
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    el('path', { d: `M${sx * 60} ${sy * 160} C${sx * 70} ${sy * 190} ${sx * 82} ${sy * 205} ${sx * 88} ${sy * 222} L${sx * 104} ${sy * 220} C${sx * 108} ${sy * 196} ${sx * 120} ${sy * 170} ${sx * 140} ${sy * 140} Z`, fill: G, stroke: '#5c4318', 'stroke-width': .6 }, g);
  }
  // crown
  const cr = el('g', {}, g);
  el('rect', { x: 196, y: -14, width: 14, height: 28, rx: 2, fill: G }, cr);
  el('rect', { x: 208, y: -24, width: 22, height: 48, rx: 5, fill: G, stroke: '#5c4318', 'stroke-width': .6 }, cr);
  for (let i = -20; i <= 20; i += 4) el('line', { x1: 209, x2: 229, y1: i, y2: i, stroke: '#6a4c1a', 'stroke-width': 1, opacity: .7 }, cr);
  el('circle', { cx: 231, cy: 0, r: 3, fill: '#2a4fa0' }, cr);
  // case
  el('circle', { r: 202, fill: G, stroke: '#4d3712', 'stroke-width': 1 }, g);
  el('circle', { r: 195, fill: 'none', stroke: '#fff4d0', 'stroke-opacity': .5, 'stroke-width': 1.2 }, g);
  el('circle', { r: 188, fill: `url(#${id}-gold)`, transform: 'rotate(180)' }, g);
  // fluted bezel
  const fl = el('g', { opacity: .35 }, g);
  for (let i = 0; i < 120; i++) { const [x1, y1] = polar(180, i * 3), [x2, y2] = polar(188, i * 3); el('line', { x1, y1, x2, y2, stroke: '#4d3712', 'stroke-width': 1 }, fl); }
  el('circle', { r: 178, fill: '#05070d' }, g);
  // dial
  const dial = el('g', { 'clip-path': `url(#${id}-dialClip)` }, g);
  el('circle', { r: 174, fill: `url(#${id}-dial)` }, dial);
  // rose-engine guilloché
  const gu = el('g', { fill: 'none', stroke: '#ffd9a0', 'stroke-opacity': .09, 'stroke-width': .8 }, dial);
  for (let k = 0; k < 46; k++) {
    const r0 = 14 + k * 2.75; let d = '';
    for (let i = 0; i <= 240; i++) {
      const a = i / 240 * TAU, r = r0 + 3.2 * Math.sin(a * 18 + k * .35);
      d += (i ? 'L' : 'M') + (r * Math.cos(a)).toFixed(1) + ' ' + (r * Math.sin(a)).toFixed(1);
    }
    el('path', { d }, gu);
  }
  el('rect', { x: -174, y: -174, width: 348, height: 348, fill: `url(#${id}-sheen)`, class: 'sheen' }, dial);
  // chapter ring
  el('circle', { r: 160, fill: 'none', stroke: '#d4b06a', 'stroke-opacity': .5, 'stroke-width': .7 }, dial);
  el('circle', { r: 148, fill: 'none', stroke: '#d4b06a', 'stroke-opacity': .5, 'stroke-width': .7 }, dial);
  for (let i = 0; i < 300; i++) {
    const big = i % 5 === 0; const [x1, y1] = polar(big ? 147 : 155, i * 1.2); const [x2, y2] = polar(160, i * 1.2);
    el('line', { x1, y1, x2, y2, stroke: '#e9d6a6', 'stroke-opacity': big ? .9 : .35, 'stroke-width': big ? 1.4 : .5 }, dial);
  }
  for (let i = 5; i <= 60; i += 5) {
    const [x, y] = polar(167, i * 6);
    el('text', { x, y: y + 3, 'font-size': 8.5, fill: '#e9d6a6', 'text-anchor': 'middle', 'font-family': 'Jost', opacity: .8 }, dial).textContent = String(i).padStart(2, '0');
  }
  // applied indices
  for (let i = 0; i < 12; i++) {
    if (i === 3) continue;
    const ig = el('g', { transform: `rotate(${i * 30})`, filter: `url(#${id}-shadow)` }, dial);
    const w = i === 0 ? 7 : 6.5, L = i % 3 === 0 ? 34 : 28;
    const offs = i === 0 ? [-6.5, 6.5] : [0];
    for (const o of offs) {
      el('rect', { x: o - w / 2, y: -142, width: w, height: L, fill: G, rx: 1 }, ig);
      el('rect', { x: o - 1, y: -138, width: 2, height: L - 8, fill: '#e8fff0', opacity: .85 }, ig);
    }
  }
  // brand
  const tx = (t, y, s, fam, ls, col = '#e9d6a6', op = 1) => { const n = el('text', { x: 0, y, 'font-size': s, fill: col, 'text-anchor': 'middle', 'font-family': fam, 'letter-spacing': ls, opacity: op }, dial); n.textContent = t; return n; };
  el('path', { d: 'M0 -102 l6 7 l-6 7 l-6 -7z', fill: G }, dial);
  tx('MECHWATCH', -64, 17, 'Libre Caslon Display', 5);
  tx('GENÈVE', -50, 6.5, 'Jost', 3, '#e9d6a6', .7);
  tx('AUTOMATIC', 56, 8, 'Jost', 3, '#e9d6a6', .85);
  tx('CHRONOMETER · 28 800 A/h', 68, 6, 'Jost', 1.6, '#e9d6a6', .6);
  tx('SWISS MADE', 171, 5, 'Jost', 2, '#e9d6a6', .55);
  // small seconds-style power reserve arc (decorative live reserve)
  // date window
  el('rect', { x: 102, y: -12, width: 34, height: 24, rx: 2, fill: G }, dial);
  el('rect', { x: 105, y: -9.5, width: 28, height: 19, rx: 1, fill: '#f4f1ea' }, dial);
  const date = tx(new Date().getDate(), 5.3, 14, 'Libre Caslon Display', 0, '#111');
  date.setAttribute('x', 119); date.setAttribute('font-weight', 600);
  // hands
  const mk = (len, w, tail, fill) => {
    const hg = el('g', { filter: `url(#${id}-shadow)` }, g);
    // faceted dauphine: two halves
    el('path', { d: `M0 ${tail} L-${w} 0 L0 -${len} Z`, fill: fill[0] }, hg);
    el('path', { d: `M0 ${tail} L${w} 0 L0 -${len} Z`, fill: fill[1] }, hg);
    el('path', { d: `M0 ${tail * .4} L-${w * .32} -${len * .1} L0 -${len * .72} L${w * .32} -${len * .1}Z`, fill: '#e8fff0', opacity: .85 }, hg);
    return hg;
  };
  const hourH = mk(100, 9, 18, ['#fbe7b2', '#a77b33']);
  const minH = mk(150, 7.5, 20, ['#fbe7b2', '#a77b33']);
  const secH = el('g', { filter: `url(#${id}-shadow)` }, g);
  el('rect', { x: -1, y: -162, width: 2, height: 210, fill: '#f0d690' }, secH);
  el('circle', { cy: 38, r: 7, fill: '#f0d690' }, secH);
  el('circle', { cy: 38, r: 3.2, fill: '#2a170a' }, secH);
  el('path', { d: 'M0 -162 l3 14 h-6z', fill: '#c2183b' }, secH);
  el('circle', { r: 7, fill: G }, g);
  el('circle', { r: 2.4, fill: '#7a5a22' }, g);
  // crystal glare
  el('circle', { r: 178, fill: `url(#${id}-crystal)`, 'pointer-events': 'none' }, g);
  el('path', { d: 'M-150 -60 A160 160 0 0 1 60 -158', stroke: '#fff', 'stroke-opacity': .18, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round', filter: `url(#${id}-soft)` }, g);

  const sheen = svg.querySelector('.sheen');
  return function tick(now = new Date()) {
    const ms = now.getMilliseconds(), s = now.getSeconds(), m = now.getMinutes(), hr = now.getHours() % 12;
    const steps = Math.floor(ms / 125); // 8 steps per second
    const sa = (s + steps / 8) * 6;
    const ma = (m + s / 60) * 6, ha = (hr + m / 60) * 30;
    secH.setAttribute('transform', `rotate(${sa})`);
    minH.setAttribute('transform', `rotate(${ma})`);
    hourH.setAttribute('transform', `rotate(${ha})`);
    if (sheen) sheen.setAttribute('transform', `rotate(${(performance.now() / 120) % 360})`);
  };
}
const heroTick = buildDressWatch($('#heroWatch'));
const footTick = buildDressWatch($('#footWatch'), { scale: .42, strap: false, id: 'fw' });
const beatEl = $('#heroBeat'), sinceEl = $('#heroSince');
(function heroLoop() {
  const d = new Date(); heroTick(d); footTick(d);
  const el2 = (performance.now() - T0) / 1000;
  beatEl.textContent = Math.floor(el2 * 8).toLocaleString('en-US');
  sinceEl.textContent = el2.toFixed(3) + ' s';
  requestAnimationFrame(heroLoop);
})();

/* hero background: meshing gear outlines with parallax */
(function heroBg() {
  const c = $('#heroCanvas'), ctx = c.getContext('2d');
  let W, H, mx = 0, my = 0, tmx = 0, tmy = 0; const dpr = Math.min(2, devicePixelRatio || 1);
  const resize = () => { W = c.clientWidth; H = c.clientHeight; c.width = W * dpr; c.height = H * dpr; };
  resize(); addEventListener('resize', resize);
  addEventListener('pointermove', e => { tmx = e.clientX / innerWidth - .5; tmy = e.clientY / innerHeight - .5; });
  const gear = (x, y, r, n, a, alpha, spokes = 5) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
    const tooth = TAU / n;
    for (let i = 0; i < n; i++) {
      const a0 = i * tooth;
      const pts = [[r * .92, a0], [r, a0 + tooth * .18], [r, a0 + tooth * .5], [r * .92, a0 + tooth * .68]];
      pts.forEach(([rr, aa], j) => (i === 0 && j === 0 ? ctx.moveTo : ctx.lineTo).call(ctx, rr * Math.cos(aa), rr * Math.sin(aa)));
    }
    ctx.closePath(); ctx.strokeStyle = `rgba(212,176,106,${alpha})`; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .78, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .16, 0, TAU); ctx.stroke();
    for (let i = 0; i < spokes; i++) { const aa = i * TAU / spokes; ctx.beginPath(); ctx.moveTo(r * .16 * Math.cos(aa), r * .16 * Math.sin(aa)); ctx.lineTo(r * .78 * Math.cos(aa), r * .78 * Math.sin(aa)); ctx.stroke(); }
    ctx.restore();
  };
  const loop = t => {
    if (scrollY < innerHeight * 1.2) {
      mx += (tmx - mx) * .04; my += (tmy - my) * .04;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const a = t / 9000, R = Math.max(W, H) * .32;
      const x1 = W * .78 + mx * 40, y1 = H * .5 + my * 40;
      gear(x1, y1, R, 80, a, .09, 6);
      const r2 = R * 30 / 80, d12 = (R + r2) * .96;
      gear(x1 + d12 * Math.cos(2.4), y1 + d12 * Math.sin(2.4), r2, 30, -a * 80 / 30 + .05, .08, 4);
      const r3 = R * 40 / 80, d13 = (R + r3) * .96;
      gear(x1 + d13 * Math.cos(-2.2), y1 + d13 * Math.sin(-2.2), r3, 40, -a * 2 + .03, .06, 5);
      gear(W * .08 - mx * 20, H * .9 - my * 20, R * .6, 48, a * .8, .045, 5);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();

/* ═════════════ TIMELINE ═════════════ */
(function timeline() {
  const tl = $('#timeline');
  TIMELINE.forEach((e, i) => {
    const card = h('article', { class: 'tl-item' }, `
      <svg class="tl-icon" viewBox="-22 -22 44 44"><circle r="20" fill="none" stroke="#d4b06a" stroke-opacity=".4"/>
      <circle r="14" fill="none" stroke="#d4b06a" stroke-opacity=".2" stroke-dasharray="1 2.2"/>
      <path d="M0 0 L${(Math.sin(i * 1.3) * 12).toFixed(1)} ${(-Math.cos(i * 1.3) * 12).toFixed(1)} M0 0 L${(Math.sin(i * .37) * 8).toFixed(1)} ${(-Math.cos(i * .37) * 8).toFixed(1)}" stroke="#f3dca6" stroke-width="1.4" stroke-linecap="round"/><circle r="1.6" fill="#f3dca6"/></svg>
      <span class="tl-era mono">${e.era}</span>
      <div class="tl-year">${e.y}</div><h4>${e.t}</h4><p>${e.d}</p>`);
    tl.appendChild(card);
  });
})();

/* ═════════════ ANATOMY ═════════════ */
(function anatomy() {
  const svg = $('#anatomySvg'); metalDefs(svg, 'an');
  const cx = 500, cy = 380;
  svg.querySelector('defs').insertAdjacentHTML('beforeend', `
    <linearGradient id="an-rub" x1="0" x2="1"><stop offset="0" stop-color="#0c0d10"/><stop offset=".5" stop-color="#23262c"/><stop offset="1" stop-color="#0c0d10"/></linearGradient>
    <linearGradient id="an-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset=".16" stop-color="#fff"/><stop offset=".84" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="an-mask"><rect width="1000" height="760" fill="url(#an-fade)"/></mask>
    <radialGradient id="an-cer" cx=".4" cy=".3"><stop offset="0" stop-color="#2c2f36"/><stop offset="1" stop-color="#0b0c0f"/></radialGradient>`);
  const W = el('g', {}, svg);
  // strap
  const st = el('g', { mask: 'url(#an-mask)' }, W);
  for (const dir of [-1, 1]) {
    const y0 = cy + dir * 150, y1 = dir < 0 ? 0 : 760;
    el('path', { d: `M${cx - 78} ${y0} L${cx - 72} ${y1} L${cx + 72} ${y1} L${cx + 78} ${y0}Z`, fill: 'url(#an-rub)' }, st);
    for (let k = 0; k < 9; k++) el('rect', { x: cx - 60, y: Math.min(y0, y1) + 20 + k * 22 + (dir > 0 ? 30 : 0), width: 120, height: 8, rx: 4, fill: '#000', opacity: .35 }, st);
  }
  // lugs
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
    el('path', { d: `M${cx + sx * 50} ${cy + sy * 165} L${cx + sx * 74} ${cy + sy * 222} L${cx + sx * 102} ${cy + sy * 218} L${cx + sx * 140} ${cy + sy * 120}Z`, fill: 'url(#an-steel)', stroke: '#444b55', 'stroke-width': .6 }, W);
  // crown guards + crown
  el('path', { d: `M${cx + 168} ${cy - 50} Q${cx + 200} ${cy - 40} ${cx + 198} ${cy - 22} L${cx + 198} ${cy + 22} Q${cx + 200} ${cy + 40} ${cx + 168} ${cy + 50}Z`, fill: 'url(#an-steel)', stroke: '#444b55', 'stroke-width': .6 }, W);
  el('rect', { x: cx + 192, y: cy - 21, width: 28, height: 42, rx: 5, fill: 'url(#an-steel)', stroke: '#444b55', 'stroke-width': .6 }, W);
  for (let i = -18; i <= 18; i += 4) el('line', { x1: cx + 194, x2: cx + 218, y1: cy + i, y2: cy + i, stroke: '#59606b', 'stroke-width': 1 }, W);
  // case + bezel
  el('circle', { cx, cy, r: 178, fill: 'url(#an-steel)', stroke: '#3a4049' }, W);
  el('circle', { cx, cy, r: 172, fill: '#0e0f12' }, W);
  for (let i = 0; i < 120; i++) { const [x1, y1] = polar(172, i * 3), [x2, y2] = polar(166, i * 3); el('line', { x1: cx + x1, y1: cy + y1, x2: cx + x2, y2: cy + y2, stroke: '#777', 'stroke-width': 1.2 }, W); }
  el('circle', { cx, cy, r: 164, fill: 'url(#an-cer)' }, W);
  for (let i = 0; i < 60; i++) {
    const first = i < 15; const big = i % 5 === 0;
    if (big && i) { const [x, y] = polar(152, i * 6); el('text', { x: cx + x, y: cy + y + 5, 'text-anchor': 'middle', 'font-size': 14, fill: '#e6e3dc', 'font-family': 'Jost', 'font-weight': 600, transform: `rotate(${i * 6} ${cx + x} ${cy + y})` }, W).textContent = i; }
    else if (first || i === 0) { const [x1, y1] = polar(160, i * 6), [x2, y2] = polar(first ? 146 : 152, i * 6); if (i) el('line', { x1: cx + x1, y1: cy + y1, x2: cx + x2, y2: cy + y2, stroke: '#e6e3dc', 'stroke-width': 1.6 }, W); }
  }
  el('path', { d: `M${cx} ${cy - 142} l-11 -16 h22z`, fill: '#e6e3dc' }, W);
  el('circle', { cx, cy: cy - 152, r: 3.6, fill: '#c9f7d3' }, W);
  // dial
  el('circle', { cx, cy, r: 140, fill: '#0b0c0e', stroke: '#000', 'stroke-width': 3 }, W);
  for (let i = 0; i < 60; i++) { const [x1, y1] = polar(138, i * 6), [x2, y2] = polar(i % 5 ? 133 : 130, i * 6); el('line', { x1: cx + x1, y1: cy + y1, x2: cx + x2, y2: cy + y2, stroke: '#ddd', 'stroke-width': i % 5 ? .8 : 1.6 }, W); }
  for (let i = 0; i < 12; i++) {
    const [x, y] = polar(112, i * 30);
    if (i === 3) continue;
    if (i === 0) el('path', { d: `M${cx} ${cy - 96} l-12 -22 h24z`, fill: '#c9f7d3', stroke: '#bbb', 'stroke-width': 1.5 }, W);
    else if (i % 3 === 0) el('rect', { x: cx + x - 6, y: cy + y - 14, width: 12, height: 28, fill: '#c9f7d3', stroke: '#bbb', 'stroke-width': 1.5, transform: `rotate(${i * 30} ${cx + x} ${cy + y})` }, W);
    else el('circle', { cx: cx + x, cy: cy + y, r: 9, fill: '#c9f7d3', stroke: '#bbb', 'stroke-width': 1.5 }, W);
  }
  el('rect', { x: cx + 88, y: cy - 12, width: 32, height: 24, fill: '#fff', stroke: '#bbb', 'stroke-width': 2 }, W);
  el('text', { x: cx + 104, y: cy + 7, 'text-anchor': 'middle', 'font-size': 17, 'font-family': 'Jost', 'font-weight': 600, fill: '#111' }, W).textContent = '24';
  el('text', { x: cx, y: cy - 50, 'text-anchor': 'middle', 'font-size': 13, fill: '#eee', 'font-family': 'Libre Caslon Display', 'letter-spacing': 3 }, W).textContent = 'MECHWATCH';
  el('text', { x: cx, y: cy + 50, 'text-anchor': 'middle', 'font-size': 7.5, fill: '#bbb', 'font-family': 'Jost', 'letter-spacing': 1.5 }, W).textContent = '300m · 1000ft';
  // hands at 10:09:36
  const hg = (deg, inner) => el('g', { transform: `rotate(${deg} ${cx} ${cy})`, filter: 'url(#an-shadow)' }, W).innerHTML = inner;
  hg(304.5, `<path d="M${cx - 5} ${cy + 18} L${cx - 5} ${cy - 40} L${cx + 5} ${cy - 40} L${cx + 5} ${cy + 18}Z" fill="#ddd"/><circle cx="${cx}" cy="${cy - 58}" r="18" fill="#c9f7d3" stroke="#ddd" stroke-width="3"/><path d="M${cx} ${cy - 76} l-6 0 l6 -10 l6 10z" fill="#ddd"/><path d="M${cx} ${cy - 58} l0 -18 M${cx} ${cy - 58} l-15 9 M${cx} ${cy - 58} l15 9" stroke="#ddd" stroke-width="3"/>`);
  hg(57.6, `<path d="M${cx - 4} ${cy + 20} L${cx - 6} ${cy - 30} L${cx} ${cy - 128} L${cx + 6} ${cy - 30} L${cx + 4} ${cy + 20}Z" fill="#ddd"/><path d="M${cx - 3} ${cy - 32} L${cx} ${cy - 118} L${cx + 3} ${cy - 32}Z" fill="#c9f7d3"/>`);
  hg(216, `<rect x="${cx - 1}" y="${cy - 136}" width="2" height="170" fill="#e43"/><circle cx="${cx}" cy="${cy - 100}" r="6" fill="#c9f7d3" stroke="#e43" stroke-width="2"/>`);
  el('circle', { cx, cy, r: 6, fill: '#ddd' }, W);
  el('circle', { cx: cx, cy: cy, r: 168, fill: 'url(#an-crystal)', 'pointer-events': 'none' }, W);

  const A = {
    crystal: [560, 280, 'R'], bezel: [380, 280, 'L'], pip: [500, 228, 'R'], dial: [578, 452, 'R'], indices: [398, 439, 'L'],
    track: [454, 507, 'L'], hour: [459, 352, 'L'], minute: [573, 327, 'R'], seconds: [441, 461, 'L'], date: [604, 380, 'R'],
    crown: [712, 380, 'R'], guard: [682, 340, 'R'], case: [376, 506, 'L'], lugs: [430, 590, 'L'], strap: [470, 705, 'L'],
  };
  const card = $('#anatomyCard');
  const groups = {};
  for (const side of ['L', 'R']) {
    const items = ANATOMY.filter(p => A[p.id][2] === side).sort((a, b) => A[a.id][1] - A[b.id][1]);
    items.forEach((p, i) => {
      const [ax, ay] = A[p.id];
      const ly = 70 + i * (620 / Math.max(1, items.length - 1));
      const lx = side === 'L' ? 30 : 970, ex = side === 'L' ? 190 : 810;
      const g = el('g', { class: 'pt', tabindex: 0 }, svg);
      el('polyline', { points: `${side === 'L' ? lx + 150 : lx - 150},${ly} ${ex},${ly} ${ax},${ay}` }, g);
      el('circle', { class: 'halo', cx: ax, cy: ay, r: 6 }, g);
      el('circle', { class: 'dot', cx: ax, cy: ay, r: 4 }, g);
      const t = el('text', { x: side === 'L' ? lx : lx, y: ly + 4, 'text-anchor': side === 'L' ? 'start' : 'end' }, g);
      t.textContent = p.n.toUpperCase();
      el('rect', { x: side === 'L' ? lx - 6 : lx - 160, y: ly - 14, width: 166, height: 28, fill: 'transparent' }, g);
      const show = () => {
        Object.values(groups).forEach(x => x.classList.remove('on')); g.classList.add('on');
        card.innerHTML = `<p class="mono tag">${String(ANATOMY.indexOf(p) + 1).padStart(2, '0')} / ${ANATOMY.length}</p><h3>${p.n}</h3><p>${p.d}</p><p class="look"><b>What to look for</b>${p.look}</p>`;
      };
      g.addEventListener('mouseenter', show); g.addEventListener('focus', show); g.addEventListener('click', show);
      groups[p.id] = g;
    });
  }
  groups.bezel.dispatchEvent(new Event('mouseenter'));
  const b3 = document.createElement('button'); b3.className = 'btn btn-brass anat-3d'; b3.innerHTML = '<span>Inspect this diver in 3D</span>';
  card.after(b3);
  b3.onclick = e => Promise.all([import('./inspector.js'), import('./watch3d.js')]).then(([I, W]) => I.openInspector([{ spec: W.ARCHETYPE_SPECS.diver, info: { brand: 'Anatomy', model: 'The dive <em>watch</em>', ref: 'Every exterior part, in three dimensions', specs: [['Case', '40 mm · 904L steel'], ['Bezel', 'Unidirectional, 120 clicks'], ['Crown', 'Screw-down, guarded'], ['Bracelet', 'Three-link, folding clasp'], ['Water resistance', '300 m']] } }], 0, { x: e.clientX, y: e.clientY }));
})();

/* ═════════════ GLOSSARY ═════════════ */
(function gloss() {
  const g = $('#gloss');
  g.innerHTML = GLOSSARY.map(([t, d]) => `<dl class="gl" data-k="${(t + ' ' + d).toLowerCase()}"><dt>${t}</dt><dd>${d}</dd></dl>`).join('');
  $('#glossSearch').addEventListener('input', e => { const q = e.target.value.toLowerCase().trim(); g.querySelectorAll('.gl').forEach(n => n.style.display = !q || n.dataset.k.includes(q) ? '' : 'none'); });
})();

/* ═════════════ LAZY MODULES ═════════════ */
const lazy = (sel, loader) => {
  const node = $(sel); let done = false;
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting && !done) { done = true; io.disconnect(); loader().catch(err => console.error(sel, err)); } }, { rootMargin: '1200px' });
  io.observe(node);
};
import('./hero3d.js').then(m => m.initHero()).catch(e => console.warn('hero3d', e));
lazy('#quartz', () => import('./quartz.js').then(m => m.init()));
lazy('#movement', () => import('./movement3d.js').then(m => m.init()));
lazy('#escapement', () => import('./escapement.js').then(m => m.init()));
lazy('#blueprints', () => import('./blueprints.js').then(m => m.init()));
lazy('#complications', () => import('./complications.js').then(m => m.init()));
lazy('#calibers', () => import('./calibers.js').then(m => m.init()));
lazy('#digital', () => import('./digital.js').then(m => m.init()));
lazy('#vault', () => import('./atlas.js').then(m => m.init()));

initCinema();
