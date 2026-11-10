import { el, polar, whenVisible, metalDefs, TAU } from './util.js';

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function shell(svg, id, dial = '#101318', opts = {}) {
  metalDefs(svg, id);
  svg.querySelector('defs').insertAdjacentHTML('beforeend', `<radialGradient id="${id}-d" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="${opts.dial2 || '#252a33'}"/><stop offset="1" stop-color="${dial}"/></radialGradient>`);
  el('circle', { r: 116, fill: `url(#${id}-${opts.metal || 'steel'})` }, svg);
  el('circle', { r: 109, fill: 'none', stroke: '#fff', 'stroke-opacity': .35 }, svg);
  el('circle', { r: 104, fill: `url(#${id}-d)` }, svg);
  if (!opts.noTrack) for (let i = 0; i < 60; i++) { const [x1, y1] = polar(101, i * 6), [x2, y2] = polar(i % 5 ? 97 : 92, i * 6); el('line', { x1, y1, x2, y2, stroke: '#e8e4da', 'stroke-opacity': i % 5 ? .45 : .9, 'stroke-width': i % 5 ? .6 : 1.6 }, svg); }
  return svg;
}
function hands(svg, id, { color = '#e9e4d8', sec = true, secColor = '#d4b06a', len = 1 } = {}) {
  const g = el('g', { filter: `url(#${id}-shadow)` }, svg);
  const H = el('path', { d: `M-3.2 10 L-2.4 ${-48 * len} L0 ${-56 * len} L2.4 ${-48 * len} L3.2 10 Z`, fill: color }, g);
  const M = el('path', { d: `M-2.6 12 L-1.8 ${-80 * len} L0 ${-88 * len} L1.8 ${-80 * len} L2.6 12 Z`, fill: color }, g);
  const S = sec ? el('path', { d: `M-.6 22 L-.6 ${-94 * len} L.6 ${-94 * len} L.6 22 Z`, fill: secColor }, g) : null;
  el('circle', { r: 4, fill: color }, g);
  return (h, m, s) => { H.setAttribute('transform', `rotate(${h})`); M.setAttribute('transform', `rotate(${m})`); if (S) S.setAttribute('transform', `rotate(${s})`); };
}
const timeAngles = d => { const s = d.getSeconds() + Math.floor(d.getMilliseconds() / 125) / 8, m = d.getMinutes() + s / 60, h = d.getHours() % 12 + m / 60; return [h * 30, m * 6, s * 6]; };
function sub(svg, cx, cy, r, n, labels, opts = {}) {
  const g = el('g', { transform: `translate(${cx} ${cy})` }, svg);
  el('circle', { r, fill: opts.fill || 'rgba(0,0,0,.35)', stroke: '#d4b06a', 'stroke-opacity': .45, 'stroke-width': .7 }, g);
  for (let i = 0; i < 3; i++) el('circle', { r: r - 2 - i * (r / 5), fill: 'none', stroke: '#fff', 'stroke-opacity': .04 }, g);
  for (let i = 0; i < n; i++) { const [x1, y1] = polar(r - 1, i * 360 / n), [x2, y2] = polar(r - (labels && i % (opts.every || 1) === 0 ? 5 : 3), i * 360 / n); el('line', { x1, y1, x2, y2, stroke: '#e8e4da', 'stroke-width': .6, 'stroke-opacity': .7 }, g); }
  if (labels) labels.forEach((t, i) => { if (t === '') return; const [x, y] = polar(r - (opts.lr || 10), i * 360 / labels.length); const n2 = el('text', { x, y: y + 2.4, 'text-anchor': 'middle', 'font-size': opts.fs || 6, fill: '#e8e4da', 'font-family': 'Jost' }, g); n2.textContent = t; });
  const hand = el('path', { d: `M-.9 4 L0 ${-(r - 3)} L.9 4 Z`, fill: opts.hand || '#d4b06a' }, g);
  el('circle', { r: 1.8, fill: opts.hand || '#d4b06a' }, g);
  return a => hand.setAttribute('transform', `rotate(${a})`);
}
const txt = (svg, x, y, t, size = 7, fill = '#e8e4da', fam = 'Jost', extra = {}) => { const n = el('text', { x, y, 'text-anchor': 'middle', 'font-size': size, fill, 'font-family': fam, ...extra }, svg); n.textContent = t; return n; };

export function init() {
  /* ── Chronograph ── */
  {
    const svg = shell(document.getElementById('chronoSvg'), 'ch', '#e9e6df', { dial2: '#ffffff' });
    // tachymeter on rehaut
    [500, 300, 200, 150, 120, 100, 90, 80, 70, 60].forEach(v => { const a = 3600 / v * 6; const [x, y] = polar(86, a); txt(svg, x, y + 2, v, 5, '#333', 'Jost', { transform: `rotate(${a} ${x} ${y})` }); });
    el('circle', { r: 82, fill: 'none', stroke: '#222', 'stroke-opacity': .3 }, svg);
    for (let i = 0; i < 240; i++) { const [x1, y1] = polar(81, i * 1.5), [x2, y2] = polar(i % 4 ? 79 : 76, i * 1.5); el('line', { x1, y1, x2, y2, stroke: '#111', 'stroke-width': .4 }, svg); }
    for (let i = 0; i < 12; i++) { if (i === 3 || i === 9 || i === 6) continue; const g = el('g', { transform: `rotate(${i * 30})` }, svg); el('rect', { x: -2, y: -74, width: 4, height: 14, fill: '#1c1e22' }, g); }
    const min30 = sub(svg, 40, 0, 22, 30, ['30', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '15'].concat(Array(14).fill('')), { fill: '#1c1e22', hand: '#c2183b', every: 5 });
    const runS = sub(svg, -40, 0, 22, 60, ['60', '15', '30', '45'], { fill: '#1c1e22', every: 15, hand: '#e8e4da' });
    txt(svg, 0, -40, 'MECHWATCH', 8, '#111', 'Libre Caslon Display', { 'letter-spacing': 2 });
    txt(svg, 0, -31, 'CHRONOGRAPH', 4.5, '#444');
    const readout = txt(svg, 0, 44, '00:00.000', 8.5, '#111');
    const setT = hands(svg, 'ch', { color: '#1a1c20', sec: false });
    const chronoHand = el('g', {}, svg);
    el('path', { d: 'M-.6 24 L-.6 -96 L.6 -96 L.6 24 Z', fill: '#c2183b' }, chronoHand);
    el('rect', { x: -2, y: 16, width: 4, height: 10, fill: '#c2183b' }, chronoHand);
    el('circle', { r: 2.6, fill: '#c2183b' }, svg);
    let running = false, acc = 0, start = 0;
    const elapsed = () => acc + (running ? performance.now() - start : 0);
    document.getElementById('chronoStart').onclick = () => { if (running) { acc += performance.now() - start; running = false; } else { start = performance.now(); running = true; } };
    document.getElementById('chronoReset').onclick = () => { if (!running) acc = 0; };
    whenVisible(svg, () => {
      const d = new Date(); const [h, m, s] = timeAngles(d); setT(h, m); runS(s);
      const e = elapsed() / 1000, steps = Math.floor(e * 8) / 8;
      chronoHand.setAttribute('transform', `rotate(${steps * 6})`);
      min30((Math.floor(e / 60) % 30) * 12);
      const mm = Math.floor(e / 60), ss = e - mm * 60;
      readout.textContent = `${String(mm).padStart(2, '0')}:${ss.toFixed(3).padStart(6, '0')}`;
    });
  }

  /* ── Moon phase ── */
  {
    const svg = shell(document.getElementById('moonSvg'), 'mo', '#0a1a3a', { dial2: '#1d3a73', metal: 'rose' });
    const defs = svg.querySelector('defs');
    defs.insertAdjacentHTML('beforeend', `<mask id="mo-ap"><rect x="-120" y="-120" width="240" height="240" fill="#000"/><path d="M-62 30 A62 62 0 0 1 62 30 Z" fill="#fff"/><circle cx="-44" cy="30" r="20.5" fill="#000"/><circle cx="44" cy="30" r="20.5" fill="#000"/></mask>
      <radialGradient id="mo-moon" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff3c8"/><stop offset=".7" stop-color="#e2bd6a"/><stop offset="1" stop-color="#a77d32"/></radialGradient>
      <radialGradient id="mo-sky" cx=".5" cy=".3" r=".8"><stop offset="0" stop-color="#21408a"/><stop offset="1" stop-color="#07112c"/></radialGradient>`);
    const ap = el('g', { mask: 'url(#mo-ap)' }, svg);
    const disc = el('g', { transform: 'translate(0 30)' }, ap);
    el('circle', { r: 70, fill: 'url(#mo-sky)' }, disc);
    for (let i = 0; i < 70; i++) { const a = Math.random() * TAU, r = 10 + Math.random() * 58; el('circle', { cx: r * Math.cos(a), cy: r * Math.sin(a), r: Math.random() * .9 + .2, fill: '#f3dca6', opacity: Math.random() * .8 + .2 }, disc); }
    for (const sgn of [-1, 1]) {
      const mg = el('g', { transform: `translate(0 ${sgn * 45})` }, disc);
      el('circle', { r: 19, fill: 'url(#mo-moon)' }, mg);
      [[-6, -5, 3.4], [5, 3, 2.6], [-2, 8, 2], [7, -7, 1.6]].forEach(([x, y, r]) => el('circle', { cx: x, cy: y, r, fill: '#b98d3e', opacity: .35 }, mg));
    }
    el('path', { d: 'M-62 30 A62 62 0 0 1 62 30', fill: 'none', stroke: '#e2bd6a', 'stroke-width': 1.6 }, svg);
    for (const sx of [-44, 44]) el('path', { d: `M${sx - 20.5} 30 A20.5 20.5 0 0 1 ${sx + 20.5} 30`, fill: 'none', stroke: '#e2bd6a', 'stroke-width': 1 }, svg);
    el('line', { x1: -62, y1: 30, x2: 62, y2: 30, stroke: '#e2bd6a', 'stroke-width': 1 }, svg);
    // age scale
    for (let d = 0; d <= 29; d++) { const a = -90 + d / 29.53 * 180; const [x1, y1] = polar(66, a), [x2, y2] = polar(d % 5 ? 69 : 72, a); el('line', { x1, y1: y1 + 30, x2, y2: y2 + 30, stroke: '#e2bd6a', 'stroke-width': .6 }, svg); if (d % 5 === 0 && d) { const [x, y] = polar(78, a); txt(svg, x, y + 32, d, 5, '#e2bd6a'); } }
    const ageTxt = txt(svg, 0, 54, '', 7.5, '#f3dca6');
    const illTxt = txt(svg, 0, 66, '', 6, '#9fb6e0');
    const nextTxt = txt(svg, 0, 78, '', 5.2, '#8e9099');
    txt(svg, 0, -70, 'PHASES DE LUNE', 5.5, '#e2bd6a', 'Jost', { 'letter-spacing': 1.5 });
    const ageEl = document.getElementById('moonAge');
    const SYN = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14) ;
    whenVisible(svg, () => {
      const now = Date.now(); const age = (((now - ref) / 86400000) % SYN + SYN) % SYN;
      disc.setAttribute('transform', `translate(0 30) rotate(${-90 + age / SYN * 180})`);
      const ill = (1 - Math.cos(age / SYN * TAU)) / 2;
      ageTxt.textContent = `${age.toFixed(2)} days`;
      illTxt.textContent = `${(ill * 100).toFixed(1)}% illuminated · ${age < SYN / 2 ? 'waxing' : 'waning'}`;
      const toFull = ((SYN / 2 - age) % SYN + SYN) % SYN; const nf = new Date(now + toFull * 86400000);
      nextTxt.textContent = `next full moon ${nf.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
      ageEl.textContent = `${age.toFixed(1)} d`;
    });
  }

  /* ── GMT ── */
  {
    const svgEl = document.getElementById('gmtSvg'); metalDefs(svgEl, 'gm');
    const svg = svgEl;
    el('circle', { r: 116, fill: 'url(#gm-steel)' }, svg);
    // two-tone 24h bezel
    el('path', { d: 'M-112 0 A112 112 0 0 1 112 0 L92 0 A92 92 0 0 0 -92 0 Z', fill: '#1c3f8f' }, svg);
    el('path', { d: 'M-112 0 A112 112 0 0 0 112 0 L92 0 A92 92 0 0 1 -92 0 Z', fill: '#a61a2e' }, svg);
    // top half = night? Convention: day (red) 6→18. Rotate so 12 at bottom? keep 24 at top = midnight in blue.
    for (let i = 0; i < 24; i++) { const [x, y] = polar(102, i * 15); if (i % 2 === 0) txt(svg, x, y + 3, i === 0 ? '▼' : i, i === 0 ? 7 : 8, '#f3f0e8', 'Jost', { transform: `rotate(${i * 15} ${x} ${y})`, 'font-weight': 600 }); else el('circle', { cx: x, cy: y, r: 1.4, fill: '#f3f0e8' }, svg); }
    el('circle', { r: 91, fill: '#0e0f12' }, svg);
    for (let i = 0; i < 60; i++) { const [x1, y1] = polar(89, i * 6), [x2, y2] = polar(i % 5 ? 85 : 81, i * 6); el('line', { x1, y1, x2, y2, stroke: '#ddd', 'stroke-width': i % 5 ? .5 : 1.4 }, svg); }
    for (let i = 0; i < 12; i++) { const [x, y] = polar(70, i * 30); if (i === 0) el('path', { d: 'M0 -62 l-7 -14 h14z', fill: '#d9fbe4' }, svg); else if (i === 3) { el('rect', { x: 56, y: -7, width: 18, height: 14, fill: '#fff' }, svg); } else if (i % 3 === 0) el('rect', { x: x - 3, y: y - 8, width: 6, height: 16, fill: '#d9fbe4', transform: `rotate(${i * 30} ${x} ${y})` }, svg); else el('circle', { cx: x, cy: y, r: 4.6, fill: '#d9fbe4' }, svg); }
    const dateT = txt(svg, 65, 4, new Date().getDate(), 10, '#111', 'Jost', { 'font-weight': 600 });
    txt(svg, 0, -30, 'MECHWATCH', 8, '#eee', 'Libre Caslon Display', { 'letter-spacing': 2 });
    txt(svg, 0, 34, 'GMT · 24H', 5.5, '#c2183b');
    const gmtH = el('g', {}, svg);
    el('path', { d: 'M-.8 0 L-.8 -76 L.8 -76 L.8 0Z', fill: '#c2183b' }, gmtH); el('path', { d: 'M0 -90 l-6 14 h12z', fill: '#c2183b' }, gmtH);
    const setT = hands(svg, 'gm', { color: '#e8e8ea', secColor: '#e8e8ea', len: .92 });
    const lab = document.getElementById('gmtLabel');
    whenVisible(svg, () => {
      const d = new Date(); const [h, m, s] = timeAngles(d); setT(h, m, s);
      const utcH = d.getUTCHours() + d.getUTCMinutes() / 60;
      gmtH.setAttribute('transform', `rotate(${utcH * 15})`);
      const off = -d.getTimezoneOffset() / 60;
      lab.textContent = `UTC ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} · local ${off >= 0 ? '+' : ''}${off}h`;
      dateT.textContent = d.getDate();
    });
  }

  /* ── Perpetual calendar ── */
  {
    const svg = shell(document.getElementById('perpSvg'), 'pp', '#f1ece2', { dial2: '#fffdf7', metal: 'gold' });
    svg.querySelectorAll('line').forEach(l => l.setAttribute('stroke', '#5a4a2a'));
    const day = sub(svg, -44, 0, 25, 7, DAYS, { fill: '#e8e1d2', fs: 4.8, lr: 9, hand: '#2a2118' });
    const month = sub(svg, 44, 0, 25, 12, MONTHS, { fill: '#e8e1d2', fs: 4, lr: 9, hand: '#2a2118' });
    const dates = Array.from({ length: 31 }, (_, i) => (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '');
    const date = sub(svg, 0, 44, 27, 31, dates, { fill: '#e8e1d2', fs: 4.6, lr: 9, hand: '#2a2118' });
    // leap-year mini dial inside month
    const leapG = el('g', { transform: 'translate(44 0)' }, svg);
    el('circle', { r: 8, fill: '#f8f4ea', stroke: '#5a4a2a', 'stroke-width': .5 }, leapG);
    ['L', '1', '2', '3'].forEach((t, i) => { const [x, y] = polar(5, i * 90); txt(leapG, x, y + 1.6, t, 3.6, '#5a4a2a'); });
    const leapHand = el('path', { d: 'M-.5 1 L0 -7 L.5 1Z', fill: '#c2183b' }, leapG);
    txt(svg, 0, -46, 'PERPETUAL CALENDAR', 5, '#5a4a2a', 'Jost', { 'letter-spacing': 1.2 });
    txt(svg, 0, -58, 'MECHWATCH', 8, '#2d2414', 'Libre Caslon Display', { 'letter-spacing': 2 });
    for (let i = 0; i < 12; i++) { if (i % 3 === 0) continue; const g = el('g', { transform: `rotate(${i * 30})` }, svg); el('rect', { x: -1.5, y: -90, width: 3, height: 10, fill: '#a77b33' }, g); }
    const setT = hands(svg, 'pp', { color: '#1d3f9e', secColor: '#1d3f9e', len: .95 });
    const leapLabel = document.getElementById('perpLeap');
    whenVisible(svg, () => {
      const d = new Date(); const [h, m, s] = timeAngles(d); setT(h, m, s);
      day(d.getDay() * 360 / 7); month(d.getMonth() * 30 + (d.getDate() - 1) / 31 * 30); date((d.getDate() - 1) * 360 / 31);
      const y = d.getFullYear(); const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; const k = y % 4;
      leapHand.setAttribute('transform', `rotate(${k * 90})`);
      leapLabel.textContent = isLeap ? `${y} · leap year` : `${y} · year ${k} after leap`;
    });
  }

  /* ── Tourbillon ── */
  {
    const svg = shell(document.getElementById('tourbSvg'), 'tb', '#121417', { dial2: '#2c3038' });
    for (let i = 0; i < 12; i++) { if (i >= 5 && i <= 7) continue; const [x, y] = polar(80, i * 30); txt(svg, x, y + 4, ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i], 10, '#e9e4d8', 'Libre Caslon Display'); }
    const cy = 42;
    el('circle', { cx: 0, cy, r: 38, fill: '#06070a', stroke: '#d4b06a', 'stroke-width': 1.6 }, svg);
    // fixed fourth wheel teeth
    for (let i = 0; i < 72; i++) { const [x1, y1] = polar(36, i * 5), [x2, y2] = polar(33.5, i * 5 + 2.5); el('line', { x1, y1: y1 + cy, x2, y2: y2 + cy, stroke: '#a68545', 'stroke-width': .8 }, svg); }
    const cage = el('g', {}, svg);
    // cage frame (lyre)
    const frame = 'M0 -30 C10 -22 10 -10 4 -4 L-4 -4 C-10 -10 -10 -22 0 -30Z';
    for (let k = 0; k < 3; k++) el('path', { d: frame, fill: 'none', stroke: '#dfe3ea', 'stroke-width': 1.6, transform: `rotate(${k * 120})` }, cage);
    el('circle', { r: 30, fill: 'none', stroke: '#dfe3ea', 'stroke-width': 1.2 }, cage);
    // escape wheel + pallet inside cage
    const esc = el('g', { transform: 'translate(-12 12)' }, cage);
    let d = ''; for (let i = 0; i < 15; i++) { const a = i / 15 * TAU; d += `${i ? 'L' : 'M'}${7 * Math.cos(a)} ${7 * Math.sin(a)} L${9 * Math.cos(a + .2)} ${9 * Math.sin(a + .2)} L${7 * Math.cos(a + .4)} ${7 * Math.sin(a + .4)}`; }
    el('path', { d: d + 'Z', fill: '#c7ccd4' }, esc);
    el('path', { d: 'M-5 -8 L6 -2 L-4 6', stroke: '#c7ccd4', 'stroke-width': 1.4, fill: 'none' }, cage);
    // balance
    const bal = el('g', {}, cage);
    el('circle', { r: 17, fill: 'none', stroke: '#e8b47a', 'stroke-width': 2.4 }, bal);
    for (let k = 0; k < 3; k++) el('line', { x1: 0, y1: 0, x2: 17 * Math.cos(k * TAU / 3), y2: 17 * Math.sin(k * TAU / 3), stroke: '#e8b47a', 'stroke-width': 1.2 }, bal);
    let sp = ''; for (let i = 0; i <= 400; i++) { const t = i / 400, a = t * 9 * TAU, r = 2 + t * 11; sp += `${i ? 'L' : 'M'}${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; }
    el('path', { d: sp, stroke: '#9fb6e0', 'stroke-width': .35, fill: 'none' }, cage);
    el('circle', { r: 2.4, fill: '#c2183b' }, cage);
    el('path', { d: `M-38 ${cy} A38 38 0 0 1 38 ${cy}`, fill: 'none', stroke: '#fff', 'stroke-opacity': .1, 'stroke-width': 6 }, svg);
    txt(svg, 0, -36, 'MECHWATCH', 8, '#e9e4d8', 'Libre Caslon Display', { 'letter-spacing': 2 });
    txt(svg, 0, -27, 'TOURBILLON', 4.5, '#d4b06a');
    const setT = hands(svg, 'tb', { sec: false });
    whenVisible(svg, () => {
      const d = new Date(), [h, m] = timeAngles(d); setT(h, m);
      const sec = d.getSeconds() + d.getMilliseconds() / 1000;
      cage.setAttribute('transform', `translate(0 ${cy}) rotate(${Math.floor(sec * 8) / 8 * 6})`);
      const t = performance.now() / 1000;
      bal.setAttribute('transform', `rotate(${200 * Math.sin(t * 4 * TAU)})`);
      esc.setAttribute('transform', `translate(-12 12) rotate(${Math.floor(t * 8) * 12})`);
    });
  }

  /* ── Power reserve ── */
  {
    const svg = shell(document.getElementById('powerSvg'), 'pr', '#0c1f1a', { dial2: '#1f4a3e' });
    const MAX = 42;
    const arc = (r, a0, a1) => { const [x0, y0] = polar(r, a0), [x1, y1] = polar(r, a1); return `M${x0} ${y0 - 24} A${r} ${r} 0 0 1 ${x1} ${y1 - 24}`; };
    el('path', { d: arc(54, -60, 60), fill: 'none', stroke: '#e8e4da', 'stroke-opacity': .15, 'stroke-width': 10 }, svg);
    const fill = el('path', { d: arc(54, -60, 60), fill: 'none', stroke: 'url(#pr-gold)', 'stroke-width': 10, 'stroke-linecap': 'butt' }, svg);
    for (let hh = 0; hh <= MAX; hh += 6) { const a = -60 + hh / MAX * 120; const [x1, y1] = polar(62, a), [x2, y2] = polar(66, a); el('line', { x1, y1: y1 - 24, x2, y2: y2 - 24, stroke: '#e8e4da', 'stroke-width': .8 }, svg); const [x, y] = polar(73, a); txt(svg, x, y - 22, hh, 5.5); }
    txt(svg, 0, -6, 'RÉSERVE DE MARCHE', 5, '#d4b06a', 'Jost', { 'letter-spacing': 1 });
    const prHand = el('path', { d: 'M-1 0 L0 -50 L1 0Z', fill: '#d4b06a' }, svg);
    el('circle', { cx: 0, cy: -24, r: 3, fill: '#d4b06a' }, svg);
    // small seconds that stops when empty
    const ss = sub(svg, 0, 48, 24, 60, ['60', '15', '30', '45'], { every: 15, fill: 'rgba(0,0,0,.3)' });
    const out = document.getElementById('prLabel');
    let reserve = 31, stoppedAt = 0, frozen = false, secA = 0, crownSpin = 0;
    document.getElementById('windBtn').onclick = () => { reserve = Math.min(MAX, reserve + 6); frozen = false; crownSpin = 1; };
    whenVisible(svg, dt => {
      reserve = Math.max(0, reserve - dt * .55); // accelerated: ~1 h per 1.8 s
      if (reserve <= 0) frozen = true;
      if (!frozen) { const d = new Date(); secA = (d.getSeconds() + Math.floor(d.getMilliseconds() / 125) / 8) * 6; }
      ss(secA);
      const a = -60 + reserve / MAX * 120;
      prHand.setAttribute('transform', `translate(0 -24) rotate(${a})`);
      fill.setAttribute('stroke-dasharray', `${(reserve / MAX) * 113} 400`);
      out.textContent = frozen ? 'STOPPED — wind me' : `${reserve.toFixed(1)} h left (time ×2000)`;
    });
  }

  /* ── Minute repeater ── */
  {
    const svg = shell(document.getElementById('repSvg'), 'rp', '#f3efe6', { dial2: '#ffffff', metal: 'gold' });
    svg.querySelectorAll('line').forEach(l => l.setAttribute('stroke', '#2d2414'));
    const gong = el('circle', { r: 108, fill: 'none', stroke: '#f3dca6', 'stroke-width': 2, opacity: 0 }, svg);
    for (let i = 0; i < 12; i++) { const [x, y] = polar(78, i * 30); txt(svg, x, y + 5, ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i], 12, '#1a1408', 'Libre Caslon Display'); }
    txt(svg, 0, -38, 'MECHWATCH', 8, '#1a1408', 'Libre Caslon Display', { 'letter-spacing': 2 });
    txt(svg, 0, -29, 'RÉPÉTITION MINUTES', 4.5, '#7a5a22');
    const hamL = el('path', { d: 'M-70 60 l14 -10 l3 4 l-14 10 z', fill: '#4a5262' }, svg);
    const hamR = el('path', { d: 'M70 60 l-14 -10 l-3 4 l14 10 z', fill: '#4a5262' }, svg);
    const count = txt(svg, 0, 46, '', 8, '#7a5a22');
    const setT = hands(svg, 'rp', { color: '#1d3f9e', secColor: '#1d3f9e', len: .95 });
    whenVisible(svg, () => { const [h, m, s] = timeAngles(new Date()); setT(h, m, s); });
    let ac = null, busy = false;
    const bell = (freq, when, dur = 1.6, vol = .5) => {
      const o = ac.createGain(); o.gain.setValueAtTime(0, when); o.gain.linearRampToValueAtTime(vol, when + .004); o.gain.exponentialRampToValueAtTime(.0008, when + dur); o.connect(ac.destination);
      [[1, 1], [2.76, .45], [5.4, .25], [8.9, .12]].forEach(([mul, g]) => { const osc = ac.createOscillator(); osc.frequency.value = freq * mul; const gg = ac.createGain(); gg.gain.value = g; osc.connect(gg).connect(o); osc.start(when); osc.stop(when + dur); });
    };
    const flash = (side, at) => setTimeout(() => {
      const ham = side ? hamR : hamL; ham.setAttribute('transform', `translate(${side ? -3 : 3} 3)`); gong.setAttribute('opacity', .9); gong.setAttribute('stroke', side ? '#ffffff' : '#f3dca6');
      setTimeout(() => { ham.removeAttribute('transform'); gong.setAttribute('opacity', 0); }, 120);
    }, at * 1000);
    document.getElementById('repBtn').onclick = () => {
      if (busy) return; busy = true;
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const d = new Date(); const hr = d.getHours() % 12 || 12, q = Math.floor(d.getMinutes() / 15), mn = d.getMinutes() % 15;
      const LOW = 392, HIGH = 784; let t = .15; const t0 = ac.currentTime + .05;
      const seq = [];
      for (let i = 0; i < hr; i++) { bell(LOW, t0 + t); seq.push([0, t, `${i + 1} hour${i ? 's' : ''}`]); t += .62; }
      t += .45;
      for (let i = 0; i < q; i++) { bell(HIGH, t0 + t, 1.2, .4); bell(LOW, t0 + t + .2); seq.push([1, t, `${i + 1} quarter${i ? 's' : ''}`]); seq.push([0, t + .2, null]); t += .75; }
      if (q) t += .35;
      for (let i = 0; i < mn; i++) { bell(HIGH, t0 + t, 1.2, .45); seq.push([1, t, `${i + 1} minute${i ? 's' : ''}`]); t += .42; }
      seq.forEach(([side, at, label]) => { flash(side, at); if (label) setTimeout(() => count.textContent = label, at * 1000); });
      const out = document.getElementById('repOut');
      out.textContent = `Striking ${hr} hour${hr > 1 ? 's' : ''}, ${q} quarter${q !== 1 ? 's' : ''}, ${mn} minute${mn !== 1 ? 's' : ''} → ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
      setTimeout(() => { busy = false; count.textContent = ''; }, (t + 1.2) * 1000);
    };
  }

  /* ── hierarchy ── */
  const H = [['Date', 1, '≈ 15 parts'], ['Power reserve', 2, 'differential'], ['GMT / dual time', 2.5, '24 h wheel'], ['Moon phase', 3, '59-tooth disc'], ['Annual calendar', 5, '1 correction / yr'], ['Chronograph', 6, '+ 100–250 parts'], ['Flyback', 6.5, 'reset-on-the-fly'], ['Tourbillon', 7.5, '≈ 70-part cage'], ['Perpetual calendar', 8, '48-month cam'], ['Split-seconds (rattrapante)', 8.5, 'isolator'], ['Minute repeater', 9.5, 'gongs + governor'], ['Grande sonnerie', 10, 'strikes itself']];
  const hier = document.getElementById('hier');
  hier.innerHTML = H.map(([n, v, note]) => `<div class="hier-row"><span>${n} <span class="muted small mono">· ${note}</span></span><div class="bar"><i data-w="${v * 10}"></i></div><span class="n">${v.toFixed(1)}</span></div>`).join('');
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { hier.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'); io.disconnect(); } }, { threshold: .3 }).observe(hier);
}
