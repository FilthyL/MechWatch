import { el, polar } from './util.js';
import { BLUEPRINTS } from './data.js';

const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

export function init() {
  const svg = document.getElementById('bpSvg');
  const tabs = document.getElementById('bpTabs');
  const notes = document.getElementById('bpNotes');
  BLUEPRINTS.forEach((b, i) => {
    const t = document.createElement('button'); t.innerHTML = `<small>${String(i + 1).padStart(2, '0')}</small>${b.name}`;
    t.onclick = () => draw(i); tabs.appendChild(t);
  });
  let current = -1;
  function draw(i) {
    if (i === current) return; current = i;
    [...tabs.children].forEach((t, k) => t.classList.toggle('active', k === i));
    const b = BLUEPRINTS[i];
    svg.innerHTML = '';
    build(svg, b);
    notes.innerHTML = `
      <div class="bp-3d"><button class="btn btn-brass" id="bp3d"><span>Inspect this archetype in 3D</span></button><p class="small muted">Built from the same dimensions as the drawing — orbit it, take it apart, flip it to the caseback.</p></div>
      <div><p class="tag mono">Drawing ${b.ref}</p><h4>${b.name}</h4><p>${b.text}</p></div>
      <div><p class="tag mono">Defining dimensions</p><ul>
        <li><span>Case diameter / width</span><span>${b.D.toFixed(1)} mm</span></li>
        ${b.H ? `<li><span>Case height</span><span>${b.H.toFixed(1)} mm</span></li>` : ''}
        <li><span>Lug-to-lug</span><span>${b.L2L.toFixed(1)} mm</span></li>
        <li><span>Thickness</span><span>${b.T.toFixed(1)} mm</span></li>
        <li><span>Lug width</span><span>${b.LW ? b.LW + ' mm' : 'Integrated'}</span></li>
        <li><span>Archetype established</span><span>${b.era}</span></li></ul></div>
      <div><p class="tag mono">Genre markers</p><ul>${b.specs.map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`).join('')}</ul>
      <p style="margin-top:10px;font-size:.78rem;opacity:.75">Reference lineage: ${b.arche}</p></div>`;
    notes.querySelector('#bp3d').onclick = e => Promise.all([import('./inspector.js'), import('./watch3d.js')]).then(([I, W]) => I.openInspector(BLUEPRINTS.map(x => ({ spec: W.ARCHETYPE_SPECS[x.id], info: { brand: 'Archetype · ' + x.era, model: x.name.replace(/(\S+)$/, '<em>$1</em>'), ref: x.arche, specs: x.specs } })), i, { x: e.clientX, y: e.clientY }));
    // stroke-draw animation
    let k = 0;
    svg.querySelectorAll('.draw').forEach(p => {
      let len = 400; try { len = Math.ceil(p.getTotalLength()) + 2; } catch (e) { }
      p.style.setProperty('--len', len); p.style.setProperty('--d', (Math.min(k++, 160) * .008).toFixed(3) + 's');
    });
  }
  // draw first when visible
  const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { draw(0); io.disconnect(); } }, { threshold: .1 });
  io.observe(svg);
}

function build(svg, b) {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#cfe3ff" stroke-width="1" opacity=".7"/></pattern>
  <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1 L10 5 L0 9 z" fill="#9fc6ff"/></marker>
  <clipPath id="dialclip"><circle cx="0" cy="0" r="1"/></clipPath>`;
  const S = Math.min(10.5, 520 / b.L2L, 470 / (b.D + 14));
  const W = 1400, H = 880;
  const root = el('g', {}, svg);
  // ── sheet frame & zones
  const frame = el('g', {}, root);
  el('rect', { x: 14, y: 14, width: W - 28, height: H - 28, class: 'ln thin draw' }, frame);
  el('rect', { x: 32, y: 32, width: W - 64, height: H - 64, class: 'ln draw' }, frame);
  for (let i = 0; i < 8; i++) {
    const x = 32 + (W - 64) / 8 * (i + .5);
    el('text', { x, y: 27, class: 'tb fade', 'text-anchor': 'middle' }, frame).textContent = i + 1;
    el('text', { x, y: H - 19, class: 'tb fade', 'text-anchor': 'middle' }, frame).textContent = i + 1;
    if (i) { el('line', { x1: 32 + (W - 64) / 8 * i, y1: 14, x2: 32 + (W - 64) / 8 * i, y2: 32, class: 'ln hair' }, frame); el('line', { x1: 32 + (W - 64) / 8 * i, y1: H - 32, x2: 32 + (W - 64) / 8 * i, y2: H - 14, class: 'ln hair' }, frame); }
  }
  'ABCDE'.split('').forEach((c, i) => { const y = 32 + (H - 64) / 5 * (i + .5); el('text', { x: 23, y: y + 4, class: 'tb fade', 'text-anchor': 'middle' }, frame).textContent = c; el('text', { x: W - 23, y: y + 4, class: 'tb fade', 'text-anchor': 'middle' }, frame).textContent = c; });

  // ── title
  el('text', { x: 60, y: 84, class: 'title fade', style: '--d:.2s' }, root).textContent = b.name;
  el('text', { x: 62, y: 106, class: 'lbltxt fade', style: '--d:.3s' }, root).textContent = `FRONT ELEVATION  ·  SCALE ${(S / 4.5).toFixed(1)}:1  ·  ALL DIMENSIONS IN MM`;

  // ── front elevation
  const cx = 440, cy = 478;
  const F = el('g', { transform: `translate(${cx} ${cy})` }, root);
  const r = b.D / 2 * S;
  const ln = (d, cls = 'ln draw') => el('path', { d, class: cls }, F);
  const circ = (rr, cls = 'ln draw', x = 0, y = 0) => el('circle', { cx: x, cy: y, r: rr, class: cls }, F);
  // center lines
  ln(`M${-r - 70} 0 H${r + 70}`, 'ln center'); ln(`M0 ${-b.L2L / 2 * S - 40} V${b.L2L / 2 * S + 40}`, 'ln center');

  const lugW = (b.LW || 20) * S, L2 = b.L2L / 2 * S;
  if (b.shape === 'round') {
    // lugs
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) {
      const xi = sx * lugW / 2, xo = sx * (lugW / 2 + 2.4 * S);
      ln(`M${xi} ${sy * r * .86} L${xi} ${sy * L2} L${xo} ${sy * L2} Q${xo + sx * 2} ${sy * (L2 - 20)} ${sx * r * .78} ${sy * r * .66}`);
      circ(.6 * S, 'ln thin draw', (xi + xo) / 2, sy * (L2 - 3 * S));
    }
    // strap (phantom)
    for (const sy of [-1, 1]) ln(`M${-lugW / 2 + 2} ${sy * L2} L${-lugW / 2 + 6} ${sy * (L2 + 60)} M${lugW / 2 - 2} ${sy * L2} L${lugW / 2 - 6} ${sy * (L2 + 60)}`, 'ln hidden');
    circ(r); circ(r - .6 * S, 'ln thin draw');
  } else if (b.shape === 'octagon') {
    // tonneau case + integrated bracelet
    ln(`M${-r} ${-r * .55} Q${-r * 1.08} 0 ${-r} ${r * .55} L${-r * .78} ${r * 1.02} H${r * .78} L${r} ${r * .55} Q${r * 1.08} 0 ${r} ${-r * .55} L${r * .78} ${-r * 1.02} H${-r * .78} Z`);
    for (const sy of [-1, 1]) for (let k = 0; k < 3; k++) { const y0 = sy * (r * 1.02 + k * 34), y1 = sy * (r * 1.02 + (k + 1) * 34); const w0 = r * .78 - k * 8, w1 = r * .78 - (k + 1) * 8; ln(`M${-w0} ${y0} L${-w1} ${y1} H${w1} L${w0} ${y0}`, k ? 'ln thin draw' : 'ln draw'); ln(`M${-w0 * .38} ${y0} L${-w1 * .38} ${y1} M${w0 * .38} ${y0} L${w1 * .38} ${y1}`, 'ln hair'); }
  } else if (b.shape === 'rect') {
    const w = b.D / 2 * S, h = b.H / 2 * S;
    // brancards
    for (const sx of [-1, 1]) ln(`M${sx * w * .78} ${-h} Q${sx * w * 1.02} ${-h * .98} ${sx * w} ${-h * .82} V${h * .82} Q${sx * w * 1.02} ${h * .98} ${sx * w * .78} ${h}`);
    ln(`M${-w * .78} ${-h} H${w * .78} M${-w * .78} ${h} H${w * .78}`);
    ln(`M${-w * .76} ${-h * .8} H${w * .76} V${h * .8} H${-w * .76} Z`, 'ln thin draw');
    for (const sy of [-1, 1]) ln(`M${-w * .76} ${sy * h} L${-w * .7} ${sy * (h + 70)} M${w * .76} ${sy * h} L${w * .7} ${sy * (h + 70)}`, 'ln hidden');
  } else if (b.shape === 'digital') {
    const w = b.D / 2 * S, h = b.H / 2 * S;
    ln(`M${-w} ${-h * .7} Q${-w} ${-h} ${-w * .7} ${-h} H${w * .7} Q${w} ${-h} ${w} ${-h * .7} V${h * .7} Q${w} ${h} ${w * .7} ${h} H${-w * .7} Q${-w} ${h} ${-w} ${h * .7} Z`);
    ln(`M${-w * .88} ${-h * .62} Q${-w * .88} ${-h * .88} ${-w * .6} ${-h * .88} H${w * .6} Q${w * .88} ${-h * .88} ${w * .88} ${-h * .62} V${h * .62} Q${w * .88} ${h * .88} ${w * .6} ${h * .88} H${-w * .6} Q${-w * .88} ${h * .88} ${-w * .88} ${h * .62} Z`, 'ln thin draw');
    for (const sy of [-1, 1]) ln(`M${-w * .6} ${sy * h} L${-w * .62} ${sy * (h + 80)} M${w * .6} ${sy * h} L${w * .62} ${sy * (h + 80)}`, 'ln hidden');
    // buttons
    for (const [sx, sy] of [[-1, -.45], [-1, .45], [1, -.45], [1, .45]]) ln(`M${sx * w} ${sy * h - 14} h${sx * 16} v28 h${-sx * 16}`);
  }

  // bezel
  if (b.bezel === 'diver' || b.bezel === 'gmt' || b.bezel === 'tachy') {
    const ri = r - 6.5 * S * (b.D / 40); circ(r - .8 * S); circ(ri);
    const rr = (r - .8 * S + ri) / 2;
    if (b.bezel === 'diver') {
      for (let i = 0; i < 60; i++) { if (i % 10 === 0 && i) { const [x, y] = polar(rr, i * 6); el('text', { x, y: y + 4, class: 'lbltxt fade', 'text-anchor': 'middle', transform: `rotate(${i * 6} ${x} ${y})`, 'font-size': 14 }, F).textContent = i; } else if (i < 15 || i % 5 === 0) { const [x1, y1] = polar(rr + 8, i * 6), [x2, y2] = polar(rr - (i % 5 ? 2 : 8), i * 6); if (i) ln(`M${x1} ${y1} L${x2} ${y2}`, 'ln thin draw'); } }
      ln(`M0 ${-ri - 2} l-11 -${rr - ri + 4} h22 Z`);
      circ(3, 'ln draw', 0, -(rr + 2));
    } else if (b.bezel === 'gmt') {
      for (let i = 0; i < 24; i++) { const [x, y] = polar(rr, i * 15); if (i % 2 === 0 && i) el('text', { x, y: y + 4, class: 'lbltxt fade', 'text-anchor': 'middle', transform: `rotate(${i * 15} ${x} ${y})`, 'font-size': 13 }, F).textContent = i; else if (i) { const [x1, y1] = polar(rr - 6, i * 15), [x2, y2] = polar(rr + 6, i * 15); ln(`M${x1} ${y1} L${x2} ${y2}`, 'ln thin draw'); } }
      ln(`M0 ${-ri - 2} l-10 -${rr - ri + 2} h20 Z`);
      el('path', { d: `M${-(r - .8 * S)} 0 A${r - .8 * S} ${r - .8 * S} 0 0 0 ${r - .8 * S} 0 L${ri} 0 A${ri} ${ri} 0 0 1 ${-ri} 0 Z`, fill: 'url(#hatch)', stroke: 'none', class: 'fade', opacity: .45 }, F);
    } else {
      const marks = [500, 300, 250, 200, 180, 160, 140, 120, 110, 100, 90, 80, 75, 70, 65, 60];
      marks.forEach(v => { const sec = 3600 / v; const a = sec * 6; const [x, y] = polar(rr, a); el('text', { x, y: y + 4, class: 'lbltxt fade', 'text-anchor': 'middle', transform: `rotate(${a} ${x} ${y})`, 'font-size': 11 }, F).textContent = v; });
    }
    var dialR = ri - .6 * S;
  } else if (b.bezel === 'octagon') {
    const R0 = r * .86; let d = '';
    for (let i = 0; i < 8; i++) { const a = (i + .5) * 45; const [x, y] = polar(R0, a); d += (i ? 'L' : 'M') + x + ' ' + y; } ln(d + 'Z');
    let d2 = ''; for (let i = 0; i < 8; i++) { const a = (i + .5) * 45; const [x, y] = polar(R0 * .86, a); d2 += (i ? 'L' : 'M') + x + ' ' + y; } ln(d2 + 'Z', 'ln thin draw');
    for (let i = 0; i < 8; i++) { const [x, y] = polar(R0 * .93, i * 45 + 22.5); circ(6, 'ln draw', x, y); ln(`M${x - 4} ${y - 2} L${x + 4} ${y + 2}`, 'ln thin draw'); }
    var dialR = R0 * .78;
  } else if (b.shape === 'rect' || b.shape === 'digital') {
    var dialR = 0;
  } else {
    circ(r - 1.2 * S, 'ln thin draw');
    var dialR = r - (b.bezel === 'thin' ? 1.6 : 2.4) * S;
    circ(dialR);
  }

  // crown & pushers
  const crownY = 0;
  const crownAt = (b.shape === 'rect') ? b.D / 2 * S : r;
  if (b.crown === 'guard') {
    ln(`M${crownAt - 2} ${-7 * S * .9} Q${crownAt + 3.4 * S} ${-5.6 * S} ${crownAt + 3 * S} ${-2.6 * S} M${crownAt - 2} ${7 * S * .9} Q${crownAt + 3.4 * S} ${5.6 * S} ${crownAt + 3 * S} ${2.6 * S}`);
    ln(`M${crownAt} ${-2.6 * S} h${3.8 * S} q${1.2 * S} 0 ${1.2 * S} ${1.2 * S} v${2.8 * S} q0 ${1.2 * S} ${-1.2 * S} ${1.2 * S} h${-3.8 * S}`);
    for (let k = -2; k <= 2; k++) ln(`M${crownAt + 2.2 * S} ${k * S * .9} h${2.4 * S}`, 'ln hair');
  } else if (b.crown === 'onion') {
    ln(`M${crownAt} ${-1.6 * S} h${1.2 * S} M${crownAt} ${1.6 * S} h${1.2 * S}`);
    ln(`M${crownAt + 1.2 * S} ${-1.6 * S} C${crownAt + 1.2 * S} ${-4.6 * S} ${crownAt + 6 * S} ${-3.6 * S} ${crownAt + 6.4 * S} 0 C${crownAt + 6 * S} ${3.6 * S} ${crownAt + 1.2 * S} ${4.6 * S} ${crownAt + 1.2 * S} ${1.6 * S}`);
    for (let k = 1; k <= 4; k++) ln(`M${crownAt + (1.2 + k) * S} ${-3.6 * S + Math.abs(k - 2.6) * .6 * S} V${3.6 * S - Math.abs(k - 2.6) * .6 * S}`, 'ln hair');
  } else if (b.crown === 'pushers') {
    ln(`M${crownAt} ${-2.2 * S} h${3.4 * S} v${4.4 * S} h${-3.4 * S}`);
    for (const a of [60, 120]) { const [x, y] = polar(r, a); const [x2, y2] = polar(r + 3.6 * S, a); ln(`M${x} ${y} L${x2} ${y2}`, 'ln draw'); const [px, py] = polar(r + 4.2 * S, a); circ(1.4 * S, 'ln draw', px, py); }
  } else if (b.crown === 'small' || b.crown === 'cabochon') {
    ln(`M${crownAt} ${-1.5 * S} h${2.6 * S} v${3 * S} h${-2.6 * S}`);
    if (b.crown === 'cabochon') { el('ellipse', { cx: crownAt + 3.4 * S, cy: 0, rx: 1 * S, ry: 1.5 * S, class: 'ln draw' }, F); }
  }

  // ── dial furniture
  const dial = el('g', {}, F);
  const T = (x, y, t, size = 12, extra = {}) => { const n = el('text', { x, y, class: 'lbltxt fade', 'text-anchor': 'middle', 'font-size': size, ...extra }, dial); n.textContent = t; return n; };
  const L = d => el('path', { d, class: 'ln thin draw' }, dial);
  const minuteTrack = (rr, rail = false) => { for (let i = 0; i < 60; i++) { const [x1, y1] = polar(rr, i * 6), [x2, y2] = polar(rr - (i % 5 ? 6 : 12), i * 6); L(`M${x1} ${y1} L${x2} ${y2}`); } if (rail) { circ(rr, 'ln hair'); circ(rr - 6, 'ln hair'); } };
  const DR = dialR;
  if (b.dial === 'diver' || b.dial === 'gmt') {
    minuteTrack(DR, false);
    for (let i = 0; i < 12; i++) {
      const [x, y] = polar(DR * .8, i * 30);
      if (i === 0) L(`M0 ${-DR * .92} l-14 26 h28 Z`);
      else if (i === 3 && b.dial === 'gmt') L(`M${DR * .72} -12 h34 v24 h-34 Z`);
      else if (i === 6) el('rect', { x: x - 7, y: y - 16, width: 14, height: 32, class: 'ln draw' }, dial);
      else if (i % 3 === 0) el('rect', { x: x - 16, y: y - 7, width: 32, height: 14, class: 'ln draw' }, dial);
      else el('circle', { cx: x, cy: y, r: 9, class: 'ln draw' }, dial);
    }
  } else if (b.dial === 'flieger') {
    minuteTrack(DR, true);
    L(`M0 ${-DR * .78} l-15 -26 h30 Z`); el('circle', { cx: -24, cy: -DR * .86, r: 3, class: 'fillc fade' }, dial); el('circle', { cx: 24, cy: -DR * .86, r: 3, class: 'fillc fade' }, dial);
    for (let i = 1; i < 12; i++) { const [x, y] = polar(DR * .72, i * 30); T(x, y + 10, i, 30, { 'font-family': 'Inter', 'font-weight': 300 }); }
  } else if (b.dial === 'chrono') {
    minuteTrack(DR, true);
    for (let i = 0; i < 12; i++) { const [x1, y1] = polar(DR * .9, i * 30), [x2, y2] = polar(DR * .72, i * 30); if (i % 3) L(`M${x1} ${y1} L${x2} ${y2}`); }
    for (const [sx, sy, lab] of [[-DR * .48, 0, 'SEC'], [DR * .48, 0, '30 MIN'], [0, DR * .48, '12 H']]) {
      el('circle', { cx: sx, cy: sy, r: DR * .25, class: 'ln draw' }, dial); for (let i = 0; i < 30; i++) { const [a1, b1] = polar(DR * .25, i * 12), [a2, b2] = polar(DR * .25 - (i % 5 ? 4 : 8), i * 12); L(`M${sx + a1} ${sy + b1} L${sx + a2} ${sy + b2}`); }
      T(sx, sy + DR * .12, lab, 9); L(`M${sx} ${sy} L${sx} ${sy - DR * .2}`);
    }
  } else if (b.dial === 'dress') {
    minuteTrack(DR, false);
    for (let i = 0; i < 12; i++) { if (i === 6) continue; const g = el('g', { transform: `rotate(${i * 30})` }, dial); el('path', { d: `M-3 ${-DR * .9} L3 ${-DR * .9} L3 ${-DR * .68} L0 ${-DR * .64} L-3 ${-DR * .68} Z`, class: 'ln draw' }, g); }
    const sy = DR * .52; el('circle', { cx: 0, cy: sy, r: DR * .24, class: 'ln draw' }, dial);
    for (let i = 0; i < 60; i++) { const [a1, b1] = polar(DR * .24, i * 6), [a2, b2] = polar(DR * .24 - (i % 5 ? 3 : 7), i * 6); L(`M${a1} ${sy + b1} L${a2} ${sy + b2}`); }
    L(`M0 ${sy + 6} L0 ${sy - DR * .2}`);
  } else if (b.dial === 'field') {
    minuteTrack(DR, true);
    for (let i = 0; i < 12; i++) { const [x, y] = polar(DR * .72, i * 30); T(x, y + 10, i || 12, 28, { 'font-family': 'Inter', 'font-weight': 500 }); const [x2, y2] = polar(DR * .56, i * 30); T(x2, y2 + 4, i + 12 === 12 ? 24 : i + 12, 10); }
  } else if (b.dial === 'tapisserie') {
    const g = el('g', { opacity: .6 }, dial);
    const n = 14, st = DR * 2 / n; let d = '';
    for (let i = 0; i <= n; i++) { d += `M${-DR + i * st} ${-DR} V${DR} M${-DR} ${-DR + i * st} H${DR}`; }
    el('circle', { r: DR * .92 }, el('clipPath', { id: 'tapclip' }, defs));
    el('path', { d, class: 'ln hair', 'clip-path': 'url(#tapclip)' }, g);
    for (let i = 0; i < 12; i++) { const g2 = el('g', { transform: `rotate(${i * 30})` }, dial); el('rect', { x: -4, y: -DR * .94, width: 8, height: DR * .2, class: 'ln draw', fill: '#0b2f66' }, g2); }
    circ(DR * .98, 'ln hair');
  } else if (b.dial === 'roman') {
    const w = b.D / 2 * S * .72, h = b.H / 2 * S * .76;
    el('rect', { x: -w, y: -h, width: w * 2, height: h * 2, class: 'ln thin draw' }, dial); el('rect', { x: -w + 8, y: -h + 8, width: w * 2 - 16, height: h * 2 - 16, class: 'ln hair' }, dial);
    for (let i = 0; i < 60; i++) { const a = i * 6 * Math.PI / 180; const dx = Math.sin(a), dy = -Math.cos(a); const k = Math.min(w / Math.abs(dx || 1e-6), h / Math.abs(dy || 1e-6)); L(`M${dx * k} ${dy * k} L${dx * (k - 8)} ${dy * (k - 8)}`); }
    for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180; const dx = Math.sin(a), dy = -Math.cos(a); const k = Math.min((w - 34) / Math.abs(dx || 1e-6), (h - 34) / Math.abs(dy || 1e-6)); T(dx * k, dy * k + 7, roman[i], 21, { 'font-family': 'Cormorant Garamond', transform: `rotate(${i * 30} ${dx * k} ${dy * k})` }); }
  } else if (b.dial === 'lcd') {
    const w = b.D / 2 * S * .7, h = b.H / 2 * S * .44;
    el('rect', { x: -w, y: -h, width: w * 2, height: h * 2, rx: 6, class: 'ln draw' }, dial);
    const seg = (x0, y0, sc, segs) => { const s = sc; const P = { a: `M${x0 + 4 * s} ${y0} h${12 * s}`, b: `M${x0 + 18 * s} ${y0 + 2 * s} v${12 * s}`, c: `M${x0 + 18 * s} ${y0 + 18 * s} v${12 * s}`, d: `M${x0 + 4 * s} ${y0 + 32 * s} h${12 * s}`, e: `M${x0 + 2 * s} ${y0 + 18 * s} v${12 * s}`, f: `M${x0 + 2 * s} ${y0 + 2 * s} v${12 * s}`, g: `M${x0 + 4 * s} ${y0 + 16 * s} h${12 * s}` }; for (const k of 'abcdefg') el('path', { d: P[k], class: segs.includes(k) ? 'ln draw' : 'ln hair', 'stroke-width': segs.includes(k) ? 3 : .6, opacity: segs.includes(k) ? 1 : .35 }, dial); };
    const digits = ['bc', 'abged', 'bc', 'abcdefg']; // 12:18
    digits.forEach((dg, k) => seg(-w + 22 + k * (w * 2 - 50) / 4 + (k > 1 ? 14 : 0), -h + 34, 2.1, dg));
    el('circle', { cx: 0, cy: -h + 60, r: 3, class: 'fillc fade' }, dial); el('circle', { cx: 0, cy: -h + 86, r: 3, class: 'fillc fade' }, dial);
    T(-w + 40, -h + 22, 'PM', 10); T(w - 50, -h + 22, 'MO 9', 10);
  } else if (b.dial === 'tourbillon') {
    minuteTrack(DR, false);
    for (let i = 0; i < 12; i++) { if (i >= 5 && i <= 7) continue; const [x, y] = polar(DR * .78, i * 30); T(x, y + 8, ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'][i], 20, { 'font-family': 'Cormorant Garamond' }); }
    const ty = DR * .46, tr = DR * .34;
    el('circle', { cx: 0, cy: ty, r: tr, class: 'ln draw' }, dial); el('circle', { cx: 0, cy: ty, r: tr - 6, class: 'ln hair' }, dial);
    for (let k = 0; k < 3; k++) { const a = k * 120; const [x, y] = polar(tr * .85, a); L(`M0 ${ty} L${x} ${ty + y}`); }
    el('circle', { cx: 0, cy: ty, r: tr * .55, class: 'ln draw' }, dial);
    for (let i = 0; i < 15; i++) { const [x1, y1] = polar(tr * .3, i * 24), [x2, y2] = polar(tr * .38, i * 24 + 8); L(`M${x1} ${ty + y1} L${x2} ${ty + y2}`); }
  }
  // brand plate
  if (DR) T(0, -DR * (b.dial === 'field' ? .26 : .4), 'MECHWATCH', 13, { 'font-family': 'Cormorant Garamond', 'letter-spacing': 3 });

  // ── hands at 10:10
  if (b.hands !== 'none') {
    const hg = el('g', {}, F);
    const handR = DR || b.D / 2 * S * .7;
    const hand = (deg, len, style) => {
      const g = el('g', { transform: `rotate(${deg})` }, hg);
      let d;
      if (style === 'mercedes' && len < handR * .7) d = `M-3 12 L-3 ${-len * .55} M3 12 L3 ${-len * .55} M0 ${-len * .72} m-${len * .17} 0 a${len * .17} ${len * .17} 0 1 0 ${len * .34} 0 a${len * .17} ${len * .17} 0 1 0 ${-len * .34} 0 M0 ${-len * .89} L0 ${-len} M0 ${-len * .72} L${-len * .15} ${-len * .64} M0 ${-len * .72} L${len * .15} ${-len * .64}`;
      else if (style === 'sword' || style === 'mercedes') d = `M0 16 L-6 0 L0 ${-len} L6 0 Z M0 0 L0 ${-len * .8}`;
      else if (style === 'dauphine') d = `M0 14 L-6 0 L0 ${-len} L6 0 Z M0 14 L0 ${-len}`;
      else if (style === 'breguet') d = `M-2 10 L-2 ${-len * .58} M2 10 L2 ${-len * .58} M0 ${-len * .66} m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 m3 0 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0 M-1.5 ${-len * .74} L0 ${-len} L1.5 ${-len * .74}`;
      else d = `M-4 14 L-4 ${-len} L4 ${-len} L4 14 Z`;
      el('path', { d, class: 'ln draw', fill: '#0b2f66' }, g);
    };
    hand(-60, handR * .58, b.hands); hand(60, handR * .86, b.hands);
    el('path', { d: `M0 26 L0 ${-handR * .92}`, class: 'ln thin draw', transform: 'rotate(150)' }, hg);
    if (b.dial === 'gmt') el('path', { d: `M0 0 L0 ${-handR * .82} M0 ${-handR * .9} l-8 14 h16 Z`, class: 'ln draw', transform: 'rotate(250)' }, hg);
    el('circle', { r: 5, class: 'ln draw', fill: '#0b2f66' }, hg);
  }

  // ── dimensions (front)
  const D = el('g', {}, root);
  const dimH = (x1, x2, y, txt, ext1, ext2) => {
    el('path', { d: `M${x1} ${ext1} V${y + 6} M${x2} ${ext2} V${y + 6}`, class: 'dim draw' }, D);
    el('path', { d: `M${x1} ${y} H${x2}`, class: 'dim draw', 'marker-start': 'url(#arr)', 'marker-end': 'url(#arr)' }, D);
    el('rect', { x: (x1 + x2) / 2 - 34, y: y - 9, width: 68, height: 16, fill: '#0b2f66', class: 'fade' }, D);
    el('text', { x: (x1 + x2) / 2, y: y + 4, class: 'dimtxt fade', 'text-anchor': 'middle' }, D).textContent = txt;
  };
  const dimV = (y1, y2, x, txt, ext1, ext2) => {
    el('path', { d: `M${ext1} ${y1} H${x + 6} M${ext2} ${y2} H${x + 6}`, class: 'dim draw' }, D);
    el('path', { d: `M${x} ${y1} V${y2}`, class: 'dim draw', 'marker-start': 'url(#arr)', 'marker-end': 'url(#arr)' }, D);
    const ty = (y1 + y2) / 2; el('rect', { x: x - 9, y: ty - 30, width: 18, height: 60, fill: '#0b2f66', class: 'fade' }, D);
    el('text', { x: x + 4, y: ty, class: 'dimtxt fade', 'text-anchor': 'middle', transform: `rotate(-90 ${x + 4} ${ty})` }, D).textContent = txt;
  };
  const halfW = b.shape === 'rect' || b.shape === 'digital' ? b.D / 2 * S : r;
  dimH(cx - halfW, cx + halfW, cy + L2 + 60, (b.shape === 'round' || b.shape === 'octagon' ? 'Ø ' : '') + b.D.toFixed(1), cy + 10, cy + 10);
  dimV(cy - L2, cy + L2, cx - (b.shape === 'rect' || b.shape === 'digital' ? halfW : r) - 84, b.L2L.toFixed(1), cx - lugW / 2 - 10, cx - lugW / 2 - 10);
  if (b.LW) { const y = cy - L2 - 28; el('path', { d: `M${cx - lugW / 2} ${y} H${cx + lugW / 2}`, class: 'dim draw', 'marker-start': 'url(#arr)', 'marker-end': 'url(#arr)' }, D); el('path', { d: `M${cx - lugW / 2} ${cy - L2} V${y - 6} M${cx + lugW / 2} ${cy - L2} V${y - 6}`, class: 'dim draw' }, D); el('text', { x: cx, y: y - 6, class: 'dimtxt fade', 'text-anchor': 'middle' }, D).textContent = `LUG ${b.LW}`; }

  // ── item balloons (front) — engineering-style callouts, keyed to the parts list
  const BR = b.shape === 'rect' || b.shape === 'digital' ? halfW : r;
  const DRr = DR || BR * .7;
  const items = partsList(b);
  const xL = cx - BR - 40, xR = cx + BR + 64;
  const balloon = (n, bx, by, fx, fy) => {
    const ang = Math.atan2(fy - by, fx - bx);
    el('path', { d: `M${fx} ${fy} L${bx + 11 * Math.cos(ang)} ${by + 11 * Math.sin(ang)}`, class: 'dim draw' }, D);
    el('circle', { cx: fx, cy: fy, r: 2.2, fill: '#9fc6ff', class: 'fade' }, D);
    const g = el('g', { class: 'balloon fade' }, D);
    el('circle', { cx: bx, cy: by, r: 11 }, g);
    el('text', { x: bx, y: by + 4, 'text-anchor': 'middle' }, g).textContent = n;
  };
  const pol = (rr, deg) => { const [x, y] = polar(rr, deg); return [cx + x, cy + y]; };
  // left column (top → bottom): crystal, hands/display, dial, bezel
  { const y = -.62 * BR; balloon(1, xL, cy + y, cx - .18 * BR, cy + y); }
  { const [fx, fy] = b.hands === 'none' ? [cx - BR * .3, cy - BR * .12] : pol(DRr * .36, -60); balloon(2, xL, cy - .22 * BR, fx, fy); }
  { const [fx, fy] = pol(DRr * .8, 250); balloon(3, xL, cy + .22 * BR, fx, fy); }
  { const [fx, fy] = pol((BR + DRr) / 2 * (b.shape === 'rect' || b.shape === 'digital' ? .9 : 1), 215); balloon(4, xL, cy + .62 * BR, fx, fy); }
  // right column: crown, case, lugs/bracelet
  { const crownX = (b.shape === 'rect' ? b.D / 2 * S : r) + 2 * S; balloon(5, xR, cy - .3 * BR, b.crown === 'buttons' ? cx + BR + 8 : cx + crownX, b.crown === 'buttons' ? cy - (b.H || b.D) / 2 * S * .45 : cy - 1.4 * S); }
  { const [fx, fy] = b.shape === 'round' ? pol(r - .3 * S, 104) : [cx + BR * .99, cy + .26 * BR]; balloon(6, xR, cy + .3 * BR, fx, fy); }
  { const ly = cy + L2 - 3 * S; const fx = b.shape === 'octagon' ? cx + r * .7 : b.shape === 'rect' || b.shape === 'digital' ? cx + BR * .66 : cx + lugW / 2 + 1.2 * S; const fy = b.shape === 'octagon' ? cy + r * 1.1 : b.shape === 'rect' || b.shape === 'digital' ? cy + (b.H || b.D) / 2 * S + 30 : ly; balloon(7, xR, Math.max(cy + .62 * BR, fy), fx, fy); }

  // ── right column: side elevation + section
  const S2 = Math.min(7, 360 / b.L2L);
  const sx = 1110, sy1 = 238, sy2 = 425;
  el('text', { x: sx, y: 140, class: 'lbltxt fade', 'text-anchor': 'middle' }, root).textContent = 'SIDE ELEVATION — VIEW FROM 3 O\'CLOCK';
  el('text', { x: sx, y: 350, class: 'lbltxt fade', 'text-anchor': 'middle' }, root).textContent = 'SECTION A–A';
  const side = (g, section) => {
    const hw = b.D / 2 * S2, hl = b.L2L / 2 * S2, t = b.T * S2;
    const yTop = -t * .55, yBot = t * .45; // dial up
    const p = el('path', { d: `M${-hw} ${yTop + t * .18} Q${-hw - 4} ${(yTop + yBot) / 2} ${-hw + 4} ${yBot - t * .12} L${-hw * .7} ${yBot} H${hw * .7} L${hw - 4} ${yBot - t * .12} Q${hw + 4} ${(yTop + yBot) / 2} ${hw} ${yTop + t * .18} Z`, class: section ? 'hatch fade' : 'ln draw' }, g);
    if (b.shape !== 'digital' && b.shape !== 'octagon') {
      for (const s of [-1, 1]) el('path', { d: `M${s * hw * .9} ${yTop + t * .25} Q${s * (hl - 6)} ${yTop + t * .2} ${s * hl} ${yTop + t * .55} L${s * (hl - 4)} ${yTop + t * .7} Q${s * hw} ${yTop + t * .6} ${s * hw * .9} ${yBot - t * .2}`, class: 'ln draw' }, g);
    } else {
      for (const s of [-1, 1]) el('path', { d: `M${s * hw} ${yTop + t * .3} L${s * (hl + 10)} ${yTop + t * .42} V${yTop + t * .72} L${s * hw} ${yBot - t * .1}`, class: 'ln thin draw' }, g);
    }
    // bezel + crystal
    el('path', { d: `M${-hw * .98} ${yTop + t * .18} L${-hw * .95} ${yTop + t * .02} H${hw * .95} L${hw * .98} ${yTop + t * .18}`, class: 'ln draw' }, g);
    el('path', { d: `M${-hw * .82} ${yTop + t * .02} Q0 ${yTop - t * .16} ${hw * .82} ${yTop + t * .02}`, class: 'ln draw' }, g);
    // caseback
    el('path', { d: `M${-hw * .7} ${yBot} Q0 ${yBot + t * .14} ${hw * .7} ${yBot}`, class: 'ln draw' }, g);
    if (section) {
      // interior: cavity, movement block, dial line, gaskets
      el('rect', { x: -hw * .78, y: yTop + t * .2, width: hw * 1.56, height: t * .64, fill: '#0b2f66', class: 'fade' }, g);
      el('rect', { x: -hw * .66, y: yTop + t * .38, width: hw * 1.32, height: t * .42, class: 'ln thin draw' }, g);
      el('text', { x: 0, y: yTop + t * .64, class: 'dimtxt fade', 'text-anchor': 'middle', 'font-size': 9 }, g).textContent = 'MOVEMENT';
      el('path', { d: `M${-hw * .74} ${yTop + t * .3} H${hw * .74}`, class: 'ln draw' }, g);
      el('path', { d: `M${-hw * .82} ${yTop + t * .06} Q0 ${yTop - t * .12} ${hw * .82} ${yTop + t * .06}`, class: 'ln thin draw' }, g);
      for (const s of [-1, 1]) { el('circle', { cx: s * hw * .8, cy: yTop + t * .16, r: 2.4, class: 'fillc fade' }, g); el('circle', { cx: s * hw * .72, cy: yBot - 3, r: 2.4, class: 'fillc fade' }, g); }
      el('path', { d: `M0 ${yTop + t * .3} V${yTop + t * .1}`, class: 'ln draw' }, g);
    } else {
      // crown seen end-on
      if (b.crown !== 'buttons' && b.crown !== 'none') { el('circle', { cx: 0, cy: (yTop + yBot) / 2, r: 2.6 * S2, class: 'ln draw' }, g); el('circle', { cx: 0, cy: (yTop + yBot) / 2, r: 1.5 * S2, class: 'ln thin draw' }, g); }
    }
    el('path', { d: `M${-hl - 20} ${(yTop + yBot) / 2} H${hl + 20}`, class: 'ln center' }, g);
    return { hw, hl, yTop: yTop - t * .1, yBot: yBot + t * .14 };
  };
  const g1 = el('g', { transform: `translate(${sx} ${sy1})` }, root); const m1 = side(g1, false);
  const g2 = el('g', { transform: `translate(${sx} ${sy2})` }, root); side(g2, true);
  // thickness dim
  dimV(sy1 + m1.yTop, sy1 + m1.yBot, sx + m1.hl + 50, b.T.toFixed(1), sx + m1.hw, sx + m1.hw);
  // section indicator on front view
  el('path', { d: `M${cx} ${cy - L2 - 54} v-18 h14 M${cx} ${cy + L2 + 78} v16 h14`, class: 'ln draw' }, root);
  el('text', { x: cx + 20, y: cy - L2 - 66, class: 'lbltxt fade' }, root).textContent = 'A';
  el('text', { x: cx + 20, y: cy + L2 + 98, class: 'lbltxt fade' }, root).textContent = 'A';

  // ── title block
  const tb = el('g', { transform: `translate(${W - 32 - 470} ${H - 32 - 150})` }, root);
  el('rect', { width: 470, height: 150, class: 'ln draw', fill: 'rgba(11,47,102,.6)' }, tb);
  const rows = [[0, 40], [40, 80], [80, 115], [115, 150]];
  rows.slice(1).forEach(([y]) => el('path', { d: `M0 ${y} H470`, class: 'ln thin draw' }, tb));
  el('path', { d: 'M300 0 V150 M150 80 V150 M380 80 V150', class: 'ln thin draw' }, tb);
  const cell = (x, y, k, v) => { el('text', { x: x + 8, y: y + 13, class: 'tb fade' }, tb).textContent = k; el('text', { x: x + 8, y: y + 30, class: 'tbv fade' }, tb).textContent = v; };
  cell(0, 0, 'TITLE · GENERAL ARRANGEMENT', b.name.toUpperCase());
  cell(300, 0, 'DRAWING NO.', b.ref);
  cell(0, 40, 'ARCHETYPE', b.arche.length > 38 ? b.arche.slice(0, 37) + '…' : b.arche);
  cell(300, 40, 'ESTABLISHED', b.era);
  cell(0, 80, 'SCALE', `${(S / 4.5).toFixed(1)} : 1`);
  cell(150, 80, 'PROJECTION', '1ST ANGLE');
  cell(300, 80, 'SHEET', '1 / 1');
  cell(380, 80, 'REV', 'C');
  cell(0, 115, 'DRAWN', 'MECHWATCH DRAFTING OFFICE');
  cell(300, 115, 'TOLERANCE', '± 0.05');
  // projection symbol
  const ps = el('g', { transform: `translate(${W - 32 - 470 - 70} ${H - 32 - 40})` }, root);
  el('circle', { r: 12, class: 'ln draw' }, ps); el('circle', { r: 5, class: 'ln draw' }, ps); el('path', { d: 'M-50 -12 L-22 -6 V6 L-50 12 Z', class: 'ln draw' }, ps);
  // parts list (bill of materials) above the title block
  const pl = el('g', { transform: `translate(${W - 32 - 470} 512)` }, root);
  el('rect', { width: 470, height: 20 + items.length * 20, class: 'ln draw', fill: 'rgba(8,35,80,.55)' }, pl);
  el('path', { d: `M0 20 H470 M44 0 V${20 + items.length * 20} M330 0 V${20 + items.length * 20}`, class: 'ln thin draw' }, pl);
  [['ITEM', 8], ['DESCRIPTION', 52], ['MATERIAL / FINISH', 338]].forEach(([t, x]) => { el('text', { x, y: 14, class: 'tb fade' }, pl).textContent = t; });
  items.forEach(([name, desc, mat], k) => {
    const y = 20 + k * 20;
    if (k) el('path', { d: `M0 ${y} H470`, class: 'ln hair draw' }, pl);
    el('text', { x: 22, y: y + 14, class: 'tbv fade', 'text-anchor': 'middle' }, pl).textContent = k + 1;
    el('text', { x: 52, y: y + 14, class: 'lbltxt fade' }, pl).textContent = `${name} — ${desc}`.toUpperCase().slice(0, 46);
    el('text', { x: 338, y: y + 14, class: 'lbltxt fade' }, pl).textContent = mat.toUpperCase().slice(0, 20);
  });
  el('text', { x: 0, y: -8, class: 'tb fade' }, pl).textContent = 'PARTS LIST';
}


function partsList(b) {
  const metal = { diver: '904L steel', pilot: '316L steel', chrono: '316L steel', dress: '18k gold', gmt: '904L steel', field: 'Bead-blasted steel', octagon: '316L steel', tank: '18k gold', digital: 'Resin', tourbillon: 'Platinum' }[b.id] || '316L steel';
  const bezel = { diver: 'Uni-dir. 120 clicks', gmt: 'Bi-dir. 24 h insert', tachy: 'Tachymeter scale', octagon: '8 visible screws', thin: 'Polished, thin', plain: 'Fixed, smooth', none: 'Integrated' }[b.bezel] || 'Fixed';
  const crown = { guard: 'Screw-down, guarded', onion: 'Onion, oversized', pushers: 'Crown + 2 pushers', small: 'Push-pull', cabochon: 'Sapphire cabochon', buttons: '4 push buttons' }[b.crown] || 'Push-pull';
  const hands = { mercedes: 'Mercedes / sword, lume', sword: 'Thermally blued sword', baton: 'Baton, luminous', dauphine: 'Faceted dauphine', breguet: 'Breguet, blued', none: 'TN-LCD 7-segment' }[b.hands] || 'Baton';
  const dial = { diver: 'Lume plots, 3-6-9 bars', flieger: 'Triangle & dots at 12', chrono: '3 registers, tri-compax', dress: 'Applied indices, sub-sec', gmt: '24 h hand, date at 3', field: '1–12 + 13–24 numerals', tapisserie: 'Tapisserie guilloché', roman: 'Roman, chemin de fer', lcd: 'Polariser stack', tourbillon: 'Aperture at 6' }[b.dial] || 'Applied indices';
  const lug = b.shape === 'octagon' ? ['Bracelet', 'Integrated, tapering', 'Brushed / polished'] : b.shape === 'rect' ? ['Brancards', `Integrated lugs, ${b.LW} mm`, metal] : b.shape === 'digital' ? ['Strap', `Resin, ${b.LW} mm`, 'Polyurethane'] : ['Lugs', `Drilled, ${b.LW} mm`, metal];
  return [
    ['Crystal', b.shape === 'digital' ? 'Flat, mineral' : b.id === 'dress' ? 'Box sapphire' : 'Sapphire, AR inner', b.shape === 'digital' ? 'Acrylic' : 'Sapphire'],
    [b.hands === 'none' ? 'Display' : 'Hands', hands, b.hands === 'none' ? 'Liquid crystal' : b.hands === 'sword' || b.hands === 'breguet' ? 'Blued steel' : 'Rhodium / lume'],
    ['Dial', dial, b.shape === 'digital' ? 'Glass / ITO' : 'Brass, lacquered'],
    ['Bezel', bezel, b.bezel === 'diver' || b.bezel === 'gmt' ? 'Ceramic insert' : metal],
    ['Crown', crown, b.crown === 'buttons' ? 'Stainless steel' : metal],
    ['Case', `Ø ${b.D} × ${b.T} mm`, metal],
    lug,
  ];
}
