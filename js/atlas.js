import { WATCHES, CATS, AUCTIONS, HOUSES } from './data.js';
import { usd } from './util.js';

const P = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];
const METAL = {
  steel: ['#f4f6f8', '#8d96a2', '#e3e7ec', '#5f6772'], white: ['#f7f7f4', '#a3a6a8', '#ecebe6', '#6e7174'], plat: ['#ffffff', '#b2b8c0', '#f1f3f6', '#7f8690'],
  gold: ['#fff0c4', '#c69a48', '#f6dc98', '#8a6326'], rose: ['#ffe2d2', '#c5826a', '#f4c4ad', '#8d4f3c'], ti: ['#c9ccd0', '#6c7178', '#b5b9bf', '#45494f'],
  tantalum: ['#c7cfe0', '#5d6a86', '#aab5cb', '#3c465c'], carbon: ['#4a4d53', '#18191c', '#3a3c41', '#0b0c0e'], ceramic: ['#3a3c40', '#0e0f11', '#2c2e32', '#060607'],
};
const light = hex => { const n = parseInt(hex.slice(1), 16); const r = n >> 16, g = n >> 8 & 255, b = n & 255; return (r * .299 + g * .587 + b * .114) > 150; };
const mix = (hex, amt) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255; const f = v => Math.max(0, Math.min(255, Math.round(amt > 0 ? v + (255 - v) * amt : v * (1 + amt)))); return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join(''); };

export function renderWatch(w, id) {
  const m = METAL[w.case] || METAL.steel;
  const ink = light(w.dial) ? '#1a1b1e' : '#ecebe6';
  const accent = w.case === 'gold' || w.case === 'rose' ? (w.case === 'rose' ? '#e3a88f' : '#e9c97f') : '#e8eaee';
  const handC = light(w.dial) ? (w.breguet || w.dialType === 'roman' ? '#2b4fa8' : '#1a1b1e') : accent;
  let s = `<svg viewBox="-120 -130 240 260" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m[0]}"/><stop offset=".3" stop-color="${m[1]}"/><stop offset=".55" stop-color="${m[2]}"/><stop offset=".8" stop-color="${m[3]}"/><stop offset="1" stop-color="${m[0]}"/></linearGradient>
  <radialGradient id="${id}d" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="${mix(w.dial, w.grad || w.dialType === 'fume' ? .28 : .12)}"/><stop offset="${w.dialType === 'fume' ? .55 : .7}" stop-color="${w.dial}"/><stop offset="1" stop-color="${w.dialType === 'fume' || w.grad ? '#020304' : mix(w.dial, -.25)}"/></radialGradient>
  <radialGradient id="${id}g" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".4" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}c"><circle r="64"/></clipPath>
  <pattern id="${id}t" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${w.dial}"/><rect x=".6" y=".6" width="3.8" height="3.8" fill="${mix(w.dial, .14)}"/><rect x="1.2" y="1.2" width="2.6" height="2.6" fill="${mix(w.dial, -.15)}"/></pattern>
  <pattern id="${id}cl" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="4" fill="${m[1]}"/><path d="M0 0 L2 2 L4 0 M0 4 L2 2 L4 4" stroke="${m[0]}" stroke-width=".7" fill="none"/></pattern>
  <pattern id="${id}h" width="4" height="2.2" patternUnits="userSpaceOnUse"><rect width="4" height="2.2" fill="${w.dial}"/><rect width="4" height=".8" fill="${mix(w.dial, -.25)}"/></pattern>
  </defs>`;
  const shape = w.shape;
  const bracelet = ['octagon', 'nautilus'].includes(shape) || /Daytona|Submariner|GMT|Day-Date|Overseas|222|Santos|Chronomaster|Aquanaut/.test(w.m);
  // strap / bracelet
  if (bracelet) {
    for (const sy of [-1, 1]) for (let k = 0; k < 4; k++) { const y = sy * (78 + k * 14), w0 = 44 - k * 1.6; s += `<rect x="${-w0}" y="${sy > 0 ? y : y - 13}" width="${w0 * 2}" height="13" rx="2" fill="url(#${id}m)" opacity="${1 - k * .16}"/><rect x="${-w0 * .36}" y="${sy > 0 ? y : y - 13}" width="${w0 * .72}" height="13" fill="${m[2]}" opacity="${.5 - k * .1}"/>`; }
  } else {
    const st = w.case === 'carbon' || w.case === 'ti' || /Fifty|Big Bang|Luminor|Black Bay|Navitimer/.test(w.m) ? '#141518' : '#3a2416';
    for (const sy of [-1, 1]) s += `<path d="M-38 ${sy * 70} L-34 ${sy * 132} L34 ${sy * 132} L38 ${sy * 70}Z" fill="${st}"/><path d="M-31 ${sy * 80} L-29 ${sy * 130} M31 ${sy * 80} L29 ${sy * 130}" stroke="${st === '#141518' ? '#333' : '#c9a46a'}" stroke-dasharray="3 3" stroke-width=".8" opacity=".6"/>`;
  }
  let dialR = 64, faceClip = `<circle r="64"/>`;
  // case
  if (shape === 'round' || shape === 'lug') {
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) s += `<path d="M${sx * 30} ${sy * 70} L${sx * 34} ${sy * 104} L${sx * 48} ${sy * 104} L${sx * 66} ${sy * 56}Z" fill="url(#${id}m)"/>`;
    s += `<rect x="84" y="-9" width="14" height="18" rx="3" fill="url(#${id}m)"/>`;
    if (w.subs) s += `<rect x="78" y="-46" width="11" height="12" rx="2" fill="url(#${id}m)" transform="rotate(-30 0 0) translate(0 0)"/><rect x="78" y="34" width="11" height="12" rx="2" fill="url(#${id}m)" transform="rotate(30 0 0)"/>`;
    s += `<circle r="86" fill="url(#${id}m)"/><circle r="84" fill="none" stroke="#fff" stroke-opacity=".35"/>`;
  } else if (shape === 'octagon') {
    s += `<path d="M-74 -46 Q-90 0 -74 46 L-52 80 H52 L74 46 Q90 0 74 -46 L52 -80 H-52Z" fill="url(#${id}m)"/><rect x="84" y="-8" width="12" height="16" rx="3" fill="url(#${id}m)"/>`;
    let d = ''; for (let i = 0; i < 8; i++) { const [x, y] = P(80, i * 45 + 22.5); d += (i ? 'L' : 'M') + x + ' ' + y; }
    s += `<path d="${d}Z" fill="url(#${id}m)" stroke="${m[3]}" stroke-width=".8"/>`;
    for (let i = 0; i < 8; i++) { const [x, y] = P(72, i * 45 + 22.5); s += `<circle cx="${x}" cy="${y}" r="3.6" fill="${m[2]}" stroke="${m[3]}" stroke-width=".6"/><path d="M${x - 2.6} ${y} H${x + 2.6}" stroke="${m[3]}" stroke-width="1" transform="rotate(${i * 45 + 60} ${x} ${y})"/>`; }
    dialR = 60;
  } else if (shape === 'nautilus') {
    s += `<path d="M-90 -14 Q-96 0 -90 14 L-70 14 L-70 -14Z M90 -14 Q96 0 90 14 L70 14 L70 -14Z" fill="url(#${id}m)"/>`;
    s += `<rect x="-78" y="-78" width="156" height="156" rx="48" fill="url(#${id}m)"/><rect x="-70" y="-70" width="140" height="140" rx="42" fill="none" stroke="${m[3]}" stroke-width="1.2"/>`;
    faceClip = `<rect x="-62" y="-62" width="124" height="124" rx="38"/>`; dialR = 62;
  } else if (shape === 'rect') {
    const reverso = /Reverso/.test(w.m);
    s += `<rect x="-58" y="-82" width="116" height="164" rx="${reverso ? 8 : 18}" fill="url(#${id}m)"/>`;
    if (!reverso) s += `<rect x="-58" y="-104" width="18" height="208" rx="9" fill="url(#${id}m)"/><rect x="40" y="-104" width="18" height="208" rx="9" fill="url(#${id}m)"/>`;
    else for (const y of [-88, 80]) s += `<rect x="-58" y="${y}" width="116" height="8" fill="url(#${id}m)"/>` + [0, 1, 2].map(k => `<line x1="-50" x2="50" y1="${y + (y < 0 ? 14 : -6) + k * 3 * (y < 0 ? 1 : -1)}" y2="${y + (y < 0 ? 14 : -6) + k * 3 * (y < 0 ? 1 : -1)}" stroke="${m[3]}" stroke-width=".6"/>`).join('');
    s += `<circle cx="62" cy="0" r="6" fill="url(#${id}m)"/>${reverso ? '' : `<circle cx="67" cy="0" r="4" fill="#2b4fa8"/>`}`;
    faceClip = `<rect x="-46" y="-68" width="92" height="136" rx="${reverso ? 4 : 6}"/>`; dialR = 46;
  } else if (shape === 'santos') {
    s += `<path d="M-30 -78 L-26 -106 H26 L30 -78 Z M-30 78 L-26 106 H26 L30 78Z" fill="url(#${id}m)"/><rect x="-76" y="-76" width="152" height="152" rx="30" fill="url(#${id}m)"/>`;
    s += `<rect x="-68" y="-68" width="136" height="136" rx="24" fill="none" stroke="${m[3]}"/>`;
    for (let i = 0; i < 8; i++) { const [x, y] = [[-58, -58], [0, -66], [58, -58], [66, 0], [58, 58], [0, 66], [-58, 58], [-66, 0]][i]; s += `<circle cx="${x}" cy="${y}" r="3.6" fill="${m[2]}" stroke="${m[3]}"/>`; }
    s += `<path d="M76 -8 h8 l6 8 l-6 8 h-8z" fill="url(#${id}m)"/><circle cx="89" cy="0" r="3" fill="#2b4fa8"/>`;
    faceClip = `<rect x="-58" y="-58" width="116" height="116" rx="18"/>`; dialR = 58;
  } else if (shape === 'cushion') {
    s += `<rect x="-86" y="-86" width="172" height="172" rx="56" fill="url(#${id}m)"/><path d="M80 -26 Q104 -20 104 0 Q104 20 80 26 Z" fill="url(#${id}m)"/><rect x="92" y="-8" width="14" height="16" rx="2" fill="${m[1]}"/>`;
    for (const sy of [-1, 1]) s += `<rect x="-38" y="${sy > 0 ? 80 : -92}" width="76" height="12" rx="3" fill="url(#${id}m)"/>`;
    s += `<circle r="78" fill="url(#${id}m)"/><circle r="70" fill="none" stroke="${m[3]}" stroke-width="1"/>`;
  } else if (shape === 'tonneau') {
    s += `<path d="M-62 -94 Q0 -108 62 -94 Q82 0 62 94 Q0 108 -62 94 Q-82 0 -62 -94Z" fill="url(#${id}m)"/>`;
    s += `<path d="M-52 -80 Q0 -92 52 -80 Q68 0 52 80 Q0 92 -52 80 Q-68 0 -52 -80Z" fill="none" stroke="${m[0]}" stroke-opacity=".25" stroke-width="5"/>`;
    for (const [x, y] of [[-46, -76], [0, -86], [46, -76], [-46, 76], [0, 86], [46, 76], [-60, 0], [60, 0]]) s += `<circle cx="${x}" cy="${y}" r="3" fill="#cfd4da"/><path d="M${x - 2} ${y} h4 M${x} ${y - 2} v4" stroke="#333" stroke-width=".8"/>`;
    s += `<rect x="64" y="-10" width="16" height="20" rx="4" fill="#25272b"/>`;
    faceClip = `<path d="M-46 -70 Q0 -80 46 -70 Q60 0 46 70 Q0 80 -46 70 Q-60 0 -46 -70Z"/>`; dialR = 58;
  }
  // bezels (round family)
  if (['round', 'lug', 'cushion'].includes(shape)) {
    const b = w.bezel;
    if (b === 'diver' || b === 'pepsi' || b === 'tachy' || b === 'tenth' || b === 'slide' || b === 'screws') {
      if (b === 'pepsi') s += `<path d="M-80 0 A80 80 0 0 1 80 0 L66 0 A66 66 0 0 0 -66 0Z" fill="#1d3f8f"/><path d="M-80 0 A80 80 0 0 0 80 0 L66 0 A66 66 0 0 1 -66 0Z" fill="#a61a2e"/>`;
      else s += `<circle r="80" fill="${b === 'tenth' ? '#16171a' : b === 'slide' ? m[2] : b === 'screws' ? '#1b1c1f' : '#101113'}"/><circle r="66" fill="#000" opacity=".2"/>`;
      const ink2 = b === 'slide' ? '#222' : '#e9e6df';
      if (b === 'diver' || b === 'pepsi') { for (let i = 0; i < 60; i++) { if (i % 10 === 0 && i) { const [x, y] = P(73, i * 6); s += `<text x="${x}" y="${y + 3.4}" font-size="9" font-family="Inter" font-weight="600" fill="${ink2}" text-anchor="middle" transform="rotate(${i * 6} ${x} ${y})">${b === 'pepsi' ? (i / 10 * 4) : i}</text>`; } else if (i % 5 === 0 || (i < 15 && b === 'diver')) { const [x1, y1] = P(78, i * 6), [x2, y2] = P(i % 5 ? 75 : 70, i * 6); if (i) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink2}" stroke-width="${i % 5 ? 1 : 2.2}"/>`; } } s += `<path d="M0 -67 l-7 -11 h14Z" fill="${ink2}"/><circle cy="-74" r="2.2" fill="#d9fbe4"/>`; }
      else if (b === 'tachy') { [500, 400, 300, 250, 200, 180, 160, 140, 120, 100, 90, 80, 70, 60].forEach(v => { const a = 3600 / v * 6; const [x, y] = P(73, a); s += `<text x="${x}" y="${y + 2.6}" font-size="6.2" font-family="Inter" font-weight="600" fill="${ink2}" text-anchor="middle" transform="rotate(${a} ${x} ${y})">${v}</text>`; }); s += `<text y="-70" font-size="5" fill="${ink2}" text-anchor="middle" font-family="Inter" font-weight="600">TACHYMETRE</text>`; }
      else if (b === 'tenth') { for (let i = 0; i < 100; i++) { const [x1, y1] = P(79, i * 3.6), [x2, y2] = P(i % 10 ? 76 : 71, i * 3.6); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e9e6df" stroke-width="${i % 10 ? .6 : 1.6}"/>`; } }
      else if (b === 'slide') { for (let i = 0; i < 120; i++) { const [x1, y1] = P(79, i * 3), [x2, y2] = P(i % 5 ? 76 : 72, i * 3); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#222" stroke-width=".6"/>`; } for (let i = 0; i < 40; i++) { const [x, y] = P(82, i * 9); s += `<circle cx="${x}" cy="${y}" r="2.2" fill="${m[1]}"/>`; } }
      else if (b === 'screws') { for (let i = 0; i < 6; i++) { const [x, y] = P(73, i * 60 + 30); s += `<circle cx="${x}" cy="${y}" r="4.6" fill="#cfd4da"/><path d="M${x - 2.4} ${y - 2.4} L${x + 2.4} ${y + 2.4} M${x - 2.4} ${y + 2.4} L${x + 2.4} ${y - 2.4}" stroke="#333" stroke-width="1"/>`; } }
      dialR = 64;
    } else if (b === 'fluted') { s += `<circle r="80" fill="url(#${id}m)"/>`; for (let i = 0; i < 90; i++) { const [x1, y1] = P(79, i * 4), [x2, y2] = P(67, i * 4); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${m[3]}" stroke-width="1.6" opacity=".55"/>`; } dialR = 64; }
    else if (b === 'clous') { s += `<circle r="80" fill="url(#${id}cl)"/><circle r="80" fill="url(#${id}m)" opacity=".35"/>`; dialR = 66; }
    else if (b === 'maltese') { let d = ''; for (let i = 0; i < 6; i++) { const a = i * 60; const [x1, y1] = P(80, a - 22), [x2, y2] = P(80, a + 22), [x3, y3] = P(73, a + 30); d += `${i ? 'L' : 'M'}${x1} ${y1} L${x2} ${y2} L${x3} ${y3}`; } s += `<path d="${d}Z" fill="url(#${id}m)" stroke="${m[3]}" stroke-width=".7"/>`; dialR = 64; }
    else { s += `<circle r="76" fill="url(#${id}m)"/><circle r="72" fill="none" stroke="#fff" stroke-opacity=".4"/>`; dialR = shape === 'cushion' ? 66 : 70; }
    faceClip = `<circle r="${dialR}"/>`;
  }
  s = s.replace(`<clipPath id="${id}c"><circle r="64"/></clipPath>`, `<clipPath id="${id}c">${faceClip}</clipPath>`);
  // ── dial
  const dt = w.dialType;
  let fillD = `url(#${id}d)`;
  if (dt === 'tapisserie') fillD = `url(#${id}t)`; if (dt === 'horizontal') fillD = `url(#${id}h)`;
  s += `<g clip-path="url(#${id}c)"><rect x="-90" y="-100" width="180" height="200" fill="${fillD}"/>`;
  if (dt === 'horizontal' || dt === 'tapisserie') s += `<rect x="-90" y="-100" width="180" height="200" fill="url(#${id}d)" opacity=".55"/>`;
  if (dt === 'snow') for (let i = 0; i < 260; i++) { const x = ((i * 73) % 180) - 90, y = ((i * 131) % 200) - 100; s += `<ellipse cx="${x}" cy="${y}" rx="${2 + (i % 5)}" ry="1.2" fill="#fff" opacity=".35" transform="rotate(${(i * 37) % 180} ${x} ${y})"/>`; }
  if (dt === 'birch') for (let i = 0; i < 70; i++) { const x = -70 + i * 2; s += `<path d="M${x} -80 Q${x + 2} 0 ${x - 1} 80" stroke="${i % 3 ? '#fff' : '#9aa1a8'}" stroke-width="${.4 + (i % 4) * .2}" opacity=".5" fill="none"/>`; }
  if (dt === 'skeleton' || w.skeleton) { s += `<rect x="-90" y="-100" width="180" height="200" fill="#0a0b0d" opacity=".75"/>`; for (const [x, y, r] of [[-22, -18, 20], [18, 22, 16], [26, -26, 12], [-20, 30, 13]]) { let g = ''; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; g += `${k ? 'L' : 'M'}${x + r * Math.cos(a)} ${y + r * Math.sin(a)} L${x + (r + 2.4) * Math.cos(a + .06)} ${y + (r + 2.4) * Math.sin(a + .06)} L${x + (r + 2.4) * Math.cos(a + .14)} ${y + (r + 2.4) * Math.sin(a + .14)} L${x + r * Math.cos(a + .2)} ${y + r * Math.sin(a + .2)}`; } s += `<path d="${g}Z" fill="none" stroke="#c9a46a" stroke-width="1"/><circle cx="${x}" cy="${y}" r="2" fill="#c2183b"/>`; } s += `<path d="M-50 -40 L50 40 M-50 40 L50 -40" stroke="${m[1]}" stroke-width="5" opacity=".7"/>`; }
  if (dt === 'enamel') s += `<circle r="${dialR}" fill="#f6f2e8"/>`;
  s += `</g>`;
  // indices
  const R = dialR;
  const idx = (fn) => { for (let i = 0; i < 12; i++) fn(i, i * 30); };
  const minTrack = (r = R - 3, c = ink) => { for (let i = 0; i < 60; i++) { if (shape === 'rect' || shape === 'santos' || shape === 'nautilus' || shape === 'tonneau') break; const [x1, y1] = P(r, i * 6), [x2, y2] = P(r - (i % 5 ? 2.4 : 4.4), i * 6); s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${i % 5 ? .45 : 1}" opacity=".8"/>`; } };
  const romanN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const br = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
  const batons = (len = 12, wd = 3, skip = []) => idx((i, a) => { if (skip.includes(i)) return; const [x, y] = P(R - 10 - len / 2, a); s += `<rect x="${x - wd / 2}" y="${y - len / 2}" width="${wd}" height="${len}" rx=".8" fill="${accent}" stroke="${mix(accent, -.4)}" stroke-width=".4" transform="rotate(${a} ${x} ${y})"/>`; if (i === 0) s += `<rect x="${x - wd * 1.9}" y="${y - len / 2}" width="${wd}" height="${len}" rx=".8" fill="${accent}" transform="rotate(0 ${x} ${y})"/>`; });
  const subdial = (cx, cy, r, c = light(w.dial) ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.06)', ring = ink) => { s += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}" stroke="${ring}" stroke-opacity=".4" stroke-width=".6"/>`; for (let i = 0; i < 12; i++) { const [x1, y1] = P(r - 1, i * 30), [x2, y2] = P(r - 3.4, i * 30); s += `<line x1="${cx + x1}" y1="${cy + y1}" x2="${cx + x2}" y2="${cy + y2}" stroke="${ring}" stroke-width=".5"/>`; } s += `<line x1="${cx}" y1="${cy}" x2="${cx + r * .7 * Math.sin(1.1)}" y2="${cy - r * .7 * Math.cos(1.1)}" stroke="${w.panda ? '#c2183b' : accent}" stroke-width="1"/>`; };

  if (dt === 'diver' || dt === 'snowflakehand') { minTrack(); idx((i, a) => { const [x, y] = P(R - 13, a); if (i === 0) s += `<path d="M0 ${-R + 5} l-7 12 h14Z" fill="#e3fbe9" stroke="${accent}" stroke-width=".7"/>`; else if (i === 3 && w.date) s += `<rect x="${R - 22}" y="-6" width="14" height="12" fill="#fff" stroke="${accent}"/><text x="${R - 15}" y="3.4" font-size="8" text-anchor="middle" font-family="Inter" font-weight="600" fill="#111">${new Date().getDate()}</text>`; else if (i % 3 === 0) s += `<rect x="${x - 2.6}" y="${y - 7}" width="5.2" height="14" fill="#e3fbe9" stroke="${accent}" stroke-width=".7" transform="rotate(${a} ${x} ${y})"/>`; else s += `<circle cx="${x}" cy="${y}" r="4.2" fill="#e3fbe9" stroke="${accent}" stroke-width=".7"/>`; }); }
  else if (dt === 'flieger') { minTrack(R - 3, '#eee'); s += `<path d="M0 ${-R + 6} l-6 11 h12Z" fill="#eee"/><circle cx="-9" cy="${-R + 8}" r="1.4" fill="#eee"/><circle cx="9" cy="${-R + 8}" r="1.4" fill="#eee"/>`; idx((i, a) => { if (!i) return; const [x, y] = P(R - 16, a); s += `<text x="${x}" y="${y + 4.6}" font-size="13" text-anchor="middle" font-family="Inter" fill="#eee">${i}</text>`; }); }
  else if (dt === 'roman' || dt === 'enamel' || dt === 'reverso') {
    if (shape === 'rect' || shape === 'santos') { const hw = shape === 'santos' ? 50 : 40, hh = shape === 'santos' ? 50 : 60; s += `<rect x="${-hw}" y="${-hh}" width="${hw * 2}" height="${hh * 2}" fill="none" stroke="${ink}" stroke-width=".5"/><rect x="${-hw + 4}" y="${-hh + 4}" width="${hw * 2 - 8}" height="${hh * 2 - 8}" fill="none" stroke="${ink}" stroke-width=".4"/>`; for (let i = 0; i < 60; i++) { const a = i * 6 * Math.PI / 180, dx = Math.sin(a), dy = -Math.cos(a), k = Math.min(hw / Math.abs(dx || 1e-6), hh / Math.abs(dy || 1e-6)); s += `<line x1="${dx * k}" y1="${dy * k}" x2="${dx * (k - 4)}" y2="${dy * (k - 4)}" stroke="${ink}" stroke-width=".4"/>`; } if (dt !== 'reverso') idx((i, a) => { const aa = a * Math.PI / 180, dx = Math.sin(aa), dy = -Math.cos(aa), k = Math.min((hw - 13) / Math.abs(dx || 1e-6), (hh - 13) / Math.abs(dy || 1e-6)); s += `<text x="${dx * k}" y="${dy * k + 4}" font-size="11" text-anchor="middle" font-family="Cormorant Garamond" fill="${ink}" transform="rotate(${a} ${dx * k} ${dy * k})">${romanN[i]}</text>`; }); else { idx((i, a) => { const aa = a * Math.PI / 180, dx = Math.sin(aa), dy = -Math.cos(aa), k = Math.min((hw - 10) / Math.abs(dx || 1e-6), (hh - 10) / Math.abs(dy || 1e-6)); s += `<rect x="${dx * k - 1}" y="${dy * k - 4}" width="2" height="8" fill="${accent}" transform="rotate(${a} ${dx * k} ${dy * k})"/>`; }); } }
    else { minTrack(R - 3, '#222'); idx((i, a) => { const [x, y] = P(R - 14, a); s += dt === 'enamel' ? `<text x="${x}" y="${y + 4.5}" font-size="12" text-anchor="middle" font-family="Cormorant Garamond" font-style="italic" fill="#1a1a1a">${br[i]}</text>` : `<text x="${x}" y="${y + 4}" font-size="11" text-anchor="middle" font-family="Cormorant Garamond" fill="${ink}" transform="rotate(${a} ${x} ${y})">${romanN[i]}</text>`; }); }
  }
  else if (dt === 'perpetual') { minTrack(); batons(9, 2.6, [3, 6, 9]); subdial(-30, 0, 15); subdial(30, 0, 15); s += `<circle cx="0" cy="30" r="16" fill="rgba(0,0,0,.15)" stroke="${ink}" stroke-opacity=".4"/><path d="M-12 30 A12 12 0 0 1 12 30Z" fill="#14264f"/><circle cx="3" cy="23" r="5" fill="#e9c97f"/>`; s += `<rect x="-12" y="-40" width="10" height="8" fill="#fff"/><rect x="2" y="-40" width="10" height="8" fill="#fff"/>`; }
  else if (dt === 'lange1') { s += `<circle cx="-12" cy="-6" r="36" fill="none" stroke="${ink}" stroke-width=".6"/>`; for (let i = 0; i < 12; i++) { const [x1, y1] = P(36, i * 30), [x2, y2] = P(30, i * 30); s += `<line x1="${x1 - 12}" y1="${y1 - 6}" x2="${x2 - 12}" y2="${y2 - 6}" stroke="${accent === '#e8eaee' ? '#333' : '#a2735d'}" stroke-width="2"/>`; } s += `<rect x="18" y="-42" width="14" height="16" fill="#fff" stroke="#333" stroke-width=".6"/><rect x="33" y="-42" width="14" height="16" fill="#fff" stroke="#333" stroke-width=".6"/><text x="25" y="-30" font-size="12" text-anchor="middle" font-family="Inter" fill="#111">2</text><text x="40" y="-30" font-size="12" text-anchor="middle" font-family="Inter" fill="#111">4</text>`; subdial(18, 30, 13); s += `<path d="M38 -6 L38 12" stroke="${ink}" stroke-width="2.4"/>`; }
  else if (dt === 'zeitwerk') { s += `<path d="M-44 -28 Q0 -44 44 -28" fill="none" stroke="${accent}" stroke-width="3"/><rect x="-46" y="-8" width="38" height="26" rx="2" fill="#f6f4ef"/><rect x="8" y="-8" width="38" height="26" rx="2" fill="#f6f4ef"/><text x="-27" y="13" font-size="22" text-anchor="middle" font-family="Inter" font-weight="300" fill="#111">10</text><text x="27" y="13" font-size="22" text-anchor="middle" font-family="Inter" font-weight="300" fill="#111">10</text><path d="M-40 34 Q0 52 40 34" fill="none" stroke="${accent}" stroke-width="3"/>`; subdial(0, -40, 9); }
  else if (dt === 'tourbillon') { minTrack(); idx((i, a) => { if (i >= 5 && i <= 7) return; const [x, y] = P(R - 13, a); s += `<text x="${x}" y="${y + 4}" font-size="10" text-anchor="middle" font-family="Cormorant Garamond" fill="${ink}">${romanN[i]}</text>`; }); s += `<circle cx="0" cy="28" r="20" fill="#06070a" stroke="${accent}" stroke-width="1.4"/><circle cx="0" cy="28" r="13" fill="none" stroke="#e8b47a" stroke-width="1.6"/><path d="M0 12 L0 44 M-14 28 L14 28" stroke="#dfe3ea" stroke-width="1.2"/>`; }
  else if (dt === 'sandwich') { minTrack(R - 3, '#8f8a7a'); for (const [i, t] of [[0, '12'], [3, '3'], [6, '6'], [9, '9']]) { const [x, y] = P(R - 16, i * 30); s += `<text x="${x}" y="${y + 7}" font-size="19" text-anchor="middle" font-family="Inter" font-weight="300" fill="#e7dcb8">${t}</text>`; } idx((i, a) => { if (i % 3 === 0) return; const [x, y] = P(R - 10, a); s += `<rect x="${x - 1.4}" y="${y - 6}" width="2.8" height="12" fill="#e7dcb8" transform="rotate(${a} ${x} ${y})"/>`; }); }
  else if (dt === 'journe') { s += `<circle cx="0" cy="0" r="${R - 4}" fill="none" stroke="${ink}" stroke-opacity=".3"/>`; idx((i, a) => { const [x, y] = P(R - 12, a); s += `<text x="${x}" y="${y + 4}" font-size="10" text-anchor="middle" font-family="Inter" font-weight="300" fill="${ink}">${i || 12}</text>`; }); }
  else if (dt === 'fume') { }
  else { minTrack(); batons(dt === 'tapisserie' ? 13 : 11, dt === 'tapisserie' ? 4 : 2.8, (w.subs || w.subsec || w.date) ? [3, 6, 9].filter(k => (w.subs ? true : (k === 6 && w.subsec) || (k === 3 && w.date))) : []); }
  if (w.subs && !['perpetual'].includes(dt)) { const c = w.panda ? '#1a1b1e' : undefined, ring = w.panda ? '#e9e6df' : ink; if (w.subs === 3) { subdial(-27, 0, 14, c, ring); subdial(27, 0, 14, c, ring); subdial(0, 27, 14, c, ring); } else { subdial(-26, 0, 14, c, ring); subdial(26, 0, 14, c, ring); } }
  if (w.subsec && !['dress', 'perpetual'].includes(dt)) subdial(0, R * .48, R * .24);
  if (w.date && !['diver', 'snowflakehand', 'roman'].includes(dt) && !w.subs) s += `<rect x="${R - 24}" y="-6" width="14" height="12" fill="#fff" stroke="${accent}"/><text x="${R - 17}" y="3.4" font-size="8" text-anchor="middle" font-family="Inter" font-weight="600" fill="#111">${new Date().getDate()}</text>`;
  if (w.power) s += `<path d="M-30 -24 A34 34 0 0 1 -6 -36" stroke="${ink}" stroke-width="2.2" fill="none" opacity=".6"/><line x1="-14" y1="-14" x2="-26" y2="-30" stroke="#c2183b" stroke-width="1.4"/>`;
  // brand
  if (!['zeitwerk', 'lange1'].includes(dt) && dt !== 'fume') s += `<text y="${-R * .42}" font-size="${shape === 'rect' ? 6 : 6.8}" text-anchor="middle" font-family="Cormorant Garamond" letter-spacing="1.2" fill="${ink}" opacity=".85">${w.b.toUpperCase().replace('A. LANGE & SÖHNE', 'A. LANGE & SÖHNE').slice(0, 20)}</text>`;
  // hands at 10:09
  if (dt !== 'zeitwerk') {
    const hl = shape === 'rect' ? 32 : R * .55, ml = shape === 'rect' ? 50 : R * .86;
    const hand = (a, L, wd) => w.breguet || dt === 'roman' || dt === 'enamel'
      ? `<g transform="rotate(${a})"><path d="M-1 6 L-1 ${-L * .6} M1 6 L1 ${-L * .6}" stroke="${handC}" stroke-width="1.4"/><circle cy="${-L * .66}" r="3.4" fill="none" stroke="${handC}" stroke-width="1.4"/><path d="M-1 ${-L * .72} L0 ${-L} L1 ${-L * .72}Z" fill="${handC}" stroke="${handC}"/></g>`
      : dt === 'snowflakehand' && L < R * .7 ? `<g transform="rotate(${a})"><rect x="-1.6" y="-${L * .55}" width="3.2" height="${L * .55 + 6}" fill="${handC}"/><rect x="-5" y="${-L * .78}" width="10" height="10" fill="#e3fbe9" stroke="${handC}" transform="rotate(45 0 ${-L * .73})"/><path d="M-1.6 ${-L * .86} L0 ${-L} L1.6 ${-L * .86}Z" fill="${handC}"/></g>`
      : `<g transform="rotate(${a})"><path d="M-${wd} 8 L-${wd * .8} ${-L * .9} L0 ${-L} L${wd * .8} ${-L * .9} L${wd} 8Z" fill="${handC}"/>${light(w.dial) ? '' : `<path d="M-${wd * .4} ${-L * .25} L0 ${-L * .9} L${wd * .4} ${-L * .25}Z" fill="#e3fbe9" opacity=".9"/>`}</g>`;
    s += `<g style="filter:drop-shadow(1px 2px 1.5px rgba(0,0,0,.5))">${hand(-55, hl, 2.6)}${hand(54, ml, 2)}`;
    if (w.gmt) s += `<g transform="rotate(160)"><line y1="0" y2="${-R * .82}" stroke="#c2183b" stroke-width="1"/><path d="M0 ${-R * .92} l-4 9 h8Z" fill="#c2183b"/></g>`;
    if (!w.subsec && !(w.subs && !w.panda && w.subs === 2)) s += `<g transform="rotate(180)"><line y1="12" y2="${-R * .92}" stroke="${w.subs ? '#c2183b' : handC}" stroke-width=".8"/></g>`;
    s += `<circle r="3" fill="${handC}"/></g>`;
  }
  s += `<g pointer-events="none">${faceClip.replace(/\/>$/, ` fill="url(#${id}g)"/>`)}</g>`;
  return s + `</svg>`;
}


// A glass cloche on a walnut plinth, the watch strapped around a leather display cushion.
export function renderVitrine(w, i) {
  const id = 'v' + i;
  const inner = renderWatch(w, 'w' + i).replace(/^<svg[^>]*>/, `<svg x="76" y="104" width="148" height="160" viewBox="-120 -130 240 260">`);
  const cushion = w.case === 'gold' || w.case === 'rose' ? ['#2a1a12', '#5a3a26', '#7a5236'] : w.case === 'carbon' || w.case === 'ti' ? ['#121212', '#2c2c2c', '#3c3c3c'] : ['#2a120d', '#5a2a1c', '#74402a'];
  return `<svg viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg"><defs>
    <radialGradient id="${id}bg" cx=".5" cy=".38" r=".75"><stop offset="0" stop-color="#4a1d14"/><stop offset=".6" stop-color="#22100b"/><stop offset="1" stop-color="#110705"/></radialGradient>
    <linearGradient id="${id}sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".32"/><stop offset=".7" stop-color="#ffd59a" stop-opacity=".06"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}fl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffd59a" stop-opacity=".45"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}cu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cushion[0]}"/><stop offset=".35" stop-color="${cushion[2]}"/><stop offset=".55" stop-color="${cushion[1]}"/><stop offset="1" stop-color="${cushion[0]}"/></linearGradient>
    <linearGradient id="${id}wrap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".85"/><stop offset=".13" stop-color="#000" stop-opacity="0"/><stop offset=".87" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient>
    <linearGradient id="${id}wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e110a"/><stop offset=".3" stop-color="#4a2c18"/><stop offset=".55" stop-color="#6a4224"/><stop offset=".8" stop-color="#3a2212"/><stop offset="1" stop-color="#1e110a"/></linearGradient>
    <linearGradient id="${id}br" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6b5022"/><stop offset=".45" stop-color="#f0d9a2"/><stop offset=".6" stop-color="#c9a35a"/><stop offset="1" stop-color="#6b5022"/></linearGradient>
    <linearGradient id="${id}gl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id}bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
    <clipPath id="${id}cc"><rect x="70" y="118" width="160" height="134" rx="26"/></clipPath>
    <clipPath id="${id}dc"><path d="M44 322 V96 Q44 34 150 30 Q256 34 256 96 V322 Z"/></clipPath>
  </defs>
  <rect width="300" height="380" fill="url(#${id}bg)"/>
  <g class="spot"><path d="M136 0 H164 L250 330 H50 Z" fill="url(#${id}sp)" filter="url(#${id}bl)"/><ellipse cx="150" cy="322" rx="120" ry="22" fill="url(#${id}fl)"/></g>
  <!-- plinth -->
  <path d="M36 322 V352 Q150 372 264 352 V322" fill="url(#${id}wd)"/>
  <ellipse cx="150" cy="322" rx="114" ry="14" fill="#3a2212"/>
  <ellipse cx="150" cy="321" rx="110" ry="12" fill="#2a170b" stroke="url(#${id}br)" stroke-width="1.4"/>
  <path d="M36 344 Q150 364 264 344" fill="none" stroke="url(#${id}br)" stroke-width="1.2" opacity=".8"/>
  <rect x="112" y="333" width="76" height="13" rx="1.5" fill="url(#${id}br)"/>
  <text x="150" y="342.5" text-anchor="middle" font-family="Cinzel, serif" font-size="6" letter-spacing="1.2" fill="#3a2810">${w.b.toUpperCase().slice(0, 22)}</text>
  <!-- stand -->
  <path d="M138 250 L134 320 H166 L162 250 Z" fill="url(#${id}br)"/>
  <ellipse cx="150" cy="320" rx="26" ry="5" fill="#2a170b" stroke="url(#${id}br)" stroke-width=".8"/>
  <!-- cushion (horizontal cylinder) -->
  <ellipse cx="150" cy="258" rx="66" ry="6" fill="#000" opacity=".45"/>
  <rect x="70" y="118" width="160" height="134" rx="26" fill="url(#${id}cu)"/>
  <path d="M84 124 Q150 116 216 124" stroke="#fff" stroke-opacity=".08" stroke-width="3" fill="none"/>
  <g class="piece"><g clip-path="url(#${id}cc)">${inner}<rect x="70" y="118" width="160" height="134" fill="url(#${id}wrap)"/></g></g>
  <!-- glass cloche -->
  <g class="dome">
    <path d="M44 322 V96 Q44 34 150 30 Q256 34 256 96 V322" fill="rgba(255,246,230,.035)" stroke="rgba(255,236,200,.42)" stroke-width="1.2"/>
    <path d="M58 300 V104 Q60 56 112 44" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="5" stroke-linecap="round"/>
    <path d="M242 290 V110" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2" stroke-linecap="round"/>
    <path d="M110 40 Q150 32 190 40" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2" stroke-linecap="round"/>
    <g clip-path="url(#${id}dc)"><rect class="glint" style="--gd:${(i % 7) * .9}s" x="-40" y="0" width="70" height="380" fill="url(#${id}gl)" transform="skewX(-18)"/></g>
    <ellipse cx="150" cy="322" rx="106" ry="9" fill="none" stroke="rgba(255,236,200,.35)"/>
    <circle cx="150" cy="22" r="8" fill="url(#${id}br)"/><rect x="146" y="28" width="8" height="5" fill="url(#${id}br)"/>
  </g>
</svg>`;
}

export function init() {
  // trinity
  const tri = [['Patek Philippe', '1839 · Geneva', 'Calatrava, Nautilus, grand complications. The benchmark of the secondary market and keeper of the Patek Philippe Seal, stricter than the Geneva hallmark.'], ['Audemars Piguet', '1875 · Le Brassus', 'Founded in the Vallée de Joux by Jules-Louis Audemars and Edward-Auguste Piguet. Masters of complications; creators of the Royal Oak.'], ['Vacheron Constantin', '1755 · Geneva', 'The oldest manufacture in uninterrupted production. Les Cabinotiers makes unique pieces, including the most complicated watches ever built.']];
  document.getElementById('trinity').innerHTML = tri.map(([n, y, p], i) => `<div class="tri"><p class="tag mono">Holy Trinity · ${['I', 'II', 'III'][i]}</p><h3>${n}</h3><p class="yr">${y}</p><p>${p}</p></div>`).join('');

  const grid = document.getElementById('atlasGrid'), count = document.getElementById('atlasCount');
  const catEl = document.getElementById('atlasCat');
  catEl.innerHTML = CATS.map((c, i) => `<button data-c="${c}" class="${i ? '' : 'active'}">${c}</button>`).join('');
  let cat = 'All', q = '', sort = 'price-desc';
  const svgs = WATCHES.map((w, i) => renderVitrine(w, i));
  let firstRender = true;
  function render() {
    let list = WATCHES.map((w, i) => ({ w, i })).filter(({ w }) => (cat === 'All' || w.cat.includes(cat)) && (!q || `${w.b} ${w.m} ${w.ref} ${w.cal} ${w.mat}`.toLowerCase().includes(q)));
    list.sort((A, B) => { const a = A.w, b = B.w; if (sort === 'year') return a.y - b.y; const pa = a.price ?? 1e12, pb = b.price ?? 1e12; return sort === 'price-asc' ? pa - pb : pb - pa; });
    const sum = list.filter(x => x.w.price).reduce((s, x) => s + x.w.price, 0);
    count.textContent = `${list.length} reference${list.length === 1 ? '' : 's'} · combined indicative retail ${usd(sum)}${list.some(x => !x.w.price) ? ' + price-on-request pieces' : ''}`;
    grid.innerHTML = list.map(({ w, i }) => `<article class="watch-card">
      <div class="vitrine">${svgs[i]}<span class="cat">${w.cat[0]} · ${w.y}</span><span class="inspect-chip"><i></i>Inspect in 3D</span></div>
      <div class="wc-body">
        <span class="wc-brand">${w.b}</span>
        <h4 class="wc-model">${w.m}</h4>
        <span class="wc-ref">Ref. ${w.ref}</span>
        <div class="wc-specs">
          <span>Ø <b>${w.dia} mm</b></span><span>H <b>${w.t} mm</b></span>
          <span>Cal. <b>${w.cal}</b></span><span>PR <b>${w.pr}</b></span>
          <span><b>${w.mat}</b></span><span><b>${w.vph ? (w.vph / 7200).toFixed(1).replace('.0', '') + ' Hz' : 'Spring Drive'}</b></span>
        </div>
        <p class="wc-note">${w.note}</p>
        <div class="wc-price"><b>${w.price ? '≈ ' + usd(w.price) : 'On request'}</b><span>${w.price ? 'Indicative retail' : 'Unique / bespoke'}</span></div>
      </div></article>`).join('') || `<p class="muted">No references match.</p>`;
    grid.querySelectorAll('.watch-card').forEach((card, k) => card.addEventListener('click', e => openVault(list.map(x => x.w), k, e)));
    if (firstRender) { firstRender = false; window.mwReveal?.(grid.children); }
    window.mwRefresh?.();
  }
  catEl.onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; catEl.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); render(); };
  document.getElementById('atlasSearch').oninput = e => { q = e.target.value.toLowerCase().trim(); render(); };
  document.querySelectorAll('#atlasSort button').forEach(b => b.onclick = () => { sort = b.dataset.s; document.querySelectorAll('#atlasSort button').forEach(x => x.classList.toggle('active', x === b)); render(); });
  render();

  // auctions
  const max = Math.max(...AUCTIONS.map(a => a.p));
  const ae = document.getElementById('auctions');
  ae.innerHTML = AUCTIONS.map(a => `<div class="auc"><span class="y">${a.y}</span><div><b>${a.t}</b><small>${a.s}</small></div><span class="p">$${a.p.toFixed(a.p < 10 ? 2 : 1)}M</span><div class="bar"><i data-w="${a.p / max * 100}"></i></div></div>`).join('');
  new IntersectionObserver((es, io) => { if (es[0].isIntersecting) { ae.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'); io.disconnect(); } }, { threshold: .2 }).observe(ae);
  // houses
  window.mwReveal?.(document.querySelectorAll('.tri'));
  document.getElementById('houseGrid').innerHTML = [...HOUSES].sort((a, b) => a.y - b.y).map(h => `<div class="house"><span class="m">${h.y} · ${h.c}</span><h5>${h.n}</h5><p>${h.p}</p></div>`).join('');
}

export function vaultInfo(w) {
  return { brand: w.b, model: w.m.replace(/(\S+)$/, '<em>$1</em>'), ref: `Ref. ${w.ref} · ${w.mat} · Cal. ${w.cal}`,
    specs: [['Diameter', w.dia + ' mm'], ['Thickness', w.t + ' mm'], ['Calibre', w.cal], ['Power reserve', w.pr], ['Frequency', w.vph ? (w.vph / 7200).toFixed(1).replace('.0', '') + ' Hz · ' + w.vph.toLocaleString('en-US') + ' vph' : 'Spring Drive'], ['Case', w.mat], ['Introduced', w.y], ['Indicative retail', w.price ? '≈ ' + usd(w.price) : 'On request']] };
}
function openVault(ws, k, e) {
  Promise.all([import('./inspector.js'), import('./watch3d.js')]).then(([I, W]) => I.openInspector(ws.map(w => ({ spec: W.specFromVault(w), info: vaultInfo(w) })), k, { x: e.clientX, y: e.clientY }));
}
