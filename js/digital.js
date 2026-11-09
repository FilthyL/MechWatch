import { sevenSeg, whenVisible, el, metalDefs, polar } from './util.js';

const p2 = n => String(n).padStart(2, '0');

export function init() {
  /* ── LED ── */
  const ledD = document.getElementById('ledDigits'), ledBtn = document.getElementById('ledBtn');
  let ledTimer = 0;
  const showLed = () => {
    const d = new Date(); const s = p2(d.getHours() % 12 || 12) + p2(d.getMinutes());
    ledD.innerHTML = [...s].map((c, i) => (i === 0 && c === '0' ? sevenSeg(' ', '#ff2a3a', 'rgba(255,40,60,.05)') : sevenSeg(c, '#ff2a3a', 'rgba(255,40,60,.06)')) + (i === 1 ? '<svg viewBox="0 0 10 70" style="width:8px"><circle cx="5" cy="24" r="3.6" fill="#ff2a3a"/><circle cx="5" cy="48" r="3.6" fill="#ff2a3a"/></svg>' : '')).join('');
    ledD.classList.add('on'); clearTimeout(ledTimer);
    ledTimer = setTimeout(() => { ledD.classList.remove('on'); }, 1600);
    // second press within window shows seconds
  };
  ledBtn.addEventListener('pointerdown', showLed);

  /* ── LCD ── */
  const main = document.getElementById('lcdMain'), small = document.getElementById('lcdSmall'), scr = document.getElementById('lcdScreen');
  const modeLbl = document.getElementById('lcdModeLabel');
  const ON = '#1b2116', OFF = 'rgba(20,30,10,.07)';
  const modes = ['TIME', 'STOPWATCH', 'DATE'];
  let mode = 0, sw = 0, swRun = false, swStart = 0, lastKey = '';
  const digit = (c, h = '100%') => `<span style="height:${h};display:inline-block">${sevenSeg(c, ON, OFF)}</span>`;
  const colon = `<svg viewBox="0 0 10 70" style="height:100%"><rect x="2" y="20" width="6" height="7" fill="${ON}"/><rect x="2" y="44" width="6" height="7" fill="${ON}"/></svg>`;
  function lcdRender() {
    const d = new Date();
    let big, sec, top;
    if (mode === 0) { const hh = d.getHours(); big = p2(hh % 12 || 12).replace(/^0/, ' ') + p2(d.getMinutes()); sec = p2(d.getSeconds()); top = [hh >= 12 ? 'PM' : 'AM', ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()] + ' ' + String(d.getDate()).padStart(2, ' ')]; }
    else if (mode === 1) { const e = sw + (swRun ? performance.now() - swStart : 0); const m = Math.floor(e / 60000) % 100, s = Math.floor(e / 1000) % 60, c = Math.floor(e / 10) % 100; big = p2(m) + p2(s); sec = p2(c); top = ['ST', swRun ? 'RUN' : 'STP']; }
    else { big = p2(d.getMonth() + 1) + p2(d.getDate()); sec = String(d.getFullYear()).slice(2); top = ['DT', ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d.getDay()]]; }
    const key = big + sec + top.join() + mode;
    if (key === lastKey) return; lastKey = key;
    main.innerHTML = digit(big[0]) + digit(big[1]) + colon + digit(big[2]) + digit(big[3]) + `<span style="height:62%;display:inline-flex;gap:2px;margin-left:4px">${digit(sec[0])}${digit(sec[1])}</span>`;
    small.innerHTML = `<span style="font:600 13px var(--mono);color:${ON};letter-spacing:.06em">${top[0]}</span><span style="font:600 13px var(--mono);color:${ON};letter-spacing:.06em">${top[1]}</span>`;
    modeLbl.textContent = modes[mode];
  }
  document.getElementById('lcdMode').onclick = () => { mode = (mode + 1) % 3; lastKey = ''; beep(); };
  document.getElementById('lcdStart').onclick = () => { if (mode !== 1) { mode = 1; lastKey = ''; } else if (swRun) { sw += performance.now() - swStart; swRun = false; } else { swStart = performance.now(); swRun = true; } beep(); };
  const light = () => { scr.classList.add('lit'); setTimeout(() => scr.classList.remove('lit'), 2200); };
  document.getElementById('lcdLight').onclick = light;
  let ac;
  const beep = () => { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = 4096; g.gain.value = .03; o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .05); } catch (e) { } };
  whenVisible(main, lcdRender);


  /* ── Spring Drive glide dial ── */
  {
    const g = document.getElementById('glideSvg'); metalDefs(g, 'sd');
    g.querySelector('defs').insertAdjacentHTML('beforeend', `<radialGradient id="sd-d" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe3e6"/></radialGradient>`);
    el('circle', { r: 116, fill: 'url(#sd-steel)' }, g); el('circle', { r: 104, fill: 'url(#sd-d)' }, g);
    for (let i = 0; i < 160; i++) { const a = Math.random() * 6.283, r = Math.random() * 100; el('ellipse', { cx: r * Math.cos(a), cy: r * Math.sin(a), rx: 2 + Math.random() * 4, ry: .8, fill: '#fff', opacity: .7, transform: `rotate(${Math.random() * 180} ${r * Math.cos(a)} ${r * Math.sin(a)})` }, g); }
    for (let i = 0; i < 60; i++) { const [x1, y1] = polar(101, i * 6), [x2, y2] = polar(i % 5 ? 97 : 90, i * 6); el('line', { x1, y1, x2, y2, stroke: '#333', 'stroke-width': i % 5 ? .5 : 1.4 }, g); }
    for (let i = 0; i < 12; i++) { const gg = el('g', { transform: `rotate(${i * 30})` }, g); el('rect', { x: i ? -2.2 : -4.6, y: -86, width: i ? 4.4 : 9.2, height: 16, fill: 'url(#sd-steel)', stroke: '#555', 'stroke-width': .4 }, gg); }
    const pr = el('path', { d: 'M-1 0 L0 -26 L1 0Z', fill: '#2b4fa8' }, g); el('circle', { cx: -44, cy: 0, r: 2, fill: '#2b4fa8' }, g);
    for (let i = 0; i <= 6; i++) { const [x1, y1] = polar(28, -120 + i * 40), [x2, y2] = polar(32, -120 + i * 40); el('line', { x1: x1 - 44, y1, x2: x2 - 44, y2, stroke: '#333', 'stroke-width': .6 }, g); }
    const t = (y, txt, sz, f = '#333', fam = 'Cinzel') => { const n = el('text', { x: 0, y, 'text-anchor': 'middle', 'font-size': sz, fill: f, 'font-family': fam }, g); n.textContent = txt; };
    t(-40, 'MECHWATCH', 8); t(36, 'SPRING DRIVE', 5, '#2b4fa8'); t(46, 'GLIDE · ±1 s / DAY', 4, '#777', 'JetBrains Mono');
    const H = el('path', { d: 'M-3 10 L-2.2 -48 L0 -56 L2.2 -48 L3 10Z', fill: 'url(#sd-steel)', stroke: '#444', 'stroke-width': .4 }, g);
    const M = el('path', { d: 'M-2.4 12 L-1.6 -82 L0 -90 L1.6 -82 L2.4 12Z', fill: 'url(#sd-steel)', stroke: '#444', 'stroke-width': .4 }, g);
    const S = el('path', { d: 'M-.6 22 L-.6 -96 L.6 -96 L.6 22Z', fill: '#2b4fa8' }, g); el('circle', { r: 3.4, fill: '#2b4fa8' }, g);
    whenVisible(g, () => { const d = new Date(), s2 = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s2 / 60, h = d.getHours() % 12 + m / 60;
      S.setAttribute('transform', `rotate(${s2 * 6})`); M.setAttribute('transform', `rotate(${m * 6})`); H.setAttribute('transform', `rotate(${h * 30})`); pr.setAttribute('transform', `translate(-44 0) rotate(${70})`); });
  }

  /* ── Smartwatch ── */
  const cv = document.getElementById('smartCanvas'), ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1); cv.width = 400 * dpr; cv.height = 480 * dpr; ctx.scale(dpr, dpr);
  const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  let hr = 68, hrT = 0;
  whenVisible(cv, (dt, t) => {
    ctx.clearRect(0, 0, 400, 480);
    // strap
    ctx.fillStyle = '#1c1d22'; rr(110, 0, 180, 480, 30); ctx.fill();
    // case
    const g = ctx.createLinearGradient(40, 40, 360, 440); g.addColorStop(0, '#d8dbe0'); g.addColorStop(.5, '#6c7079'); g.addColorStop(1, '#c4c8ce');
    ctx.fillStyle = g; rr(48, 52, 304, 376, 74); ctx.fill();
    ctx.fillStyle = '#000'; rr(58, 62, 284, 356, 66); ctx.fill();
    // crown & button
    ctx.fillStyle = '#9aa0a8'; rr(350, 150, 16, 58, 7); ctx.fill(); ctx.fillStyle = '#c2183b'; ctx.fillRect(362, 166, 3, 26);
    ctx.fillStyle = '#9aa0a8'; rr(350, 236, 10, 64, 5); ctx.fill();
    // screen content
    const d = new Date();
    ctx.save(); rr(70, 74, 260, 332, 56); ctx.clip();
    const cx = 200, cy = 196;
    const rings = [[86, '#ff2d55', .78 + .02 * Math.sin(t * .3)], [70, '#a8ff3e', .56], [54, '#3ee6ff', .9]];
    rings.forEach(([r, c, v]) => {
      ctx.lineWidth = 13; ctx.lineCap = 'round';
      ctx.strokeStyle = c + '33'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v); ctx.stroke(); ctx.shadowBlur = 0;
    });
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.font = '300 44px Inter'; ctx.fillText(`${p2(d.getHours())}:${p2(d.getMinutes())}`, cx, cy + 14);
    ctx.font = '500 13px JetBrains Mono'; ctx.fillStyle = '#ff9f0a'; ctx.fillText(d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }).toUpperCase(), cx, cy - 26);
    // seconds ticks
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2 - Math.PI / 2; const on = i <= d.getSeconds(); ctx.strokeStyle = on ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.15)'; ctx.lineWidth = i % 5 ? 1.2 : 2.2; ctx.beginPath(); ctx.moveTo(cx + 114 * Math.cos(a), cy + 114 * Math.sin(a)); ctx.lineTo(cx + 122 * Math.cos(a), cy + 122 * Math.sin(a)); ctx.stroke(); }
    // heart rate
    hrT += dt; if (hrT > 2) { hrT = 0; hr = Math.round(62 + Math.random() * 14); }
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * hr / 60)), 12);
    ctx.fillStyle = '#ff375f'; ctx.font = `${16 + beat * 4}px Inter`; ctx.fillText('♥', 120, 360);
    ctx.fillStyle = '#fff'; ctx.font = '500 20px Inter'; ctx.textAlign = 'left'; ctx.fillText(hr, 136, 362);
    ctx.fillStyle = '#8e9099'; ctx.font = '400 10px JetBrains Mono'; ctx.fillText('BPM', 136, 376);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = '500 20px Inter'; ctx.fillText((8000 + Math.floor((d.getHours() * 60 + d.getMinutes()) * 4.7)).toLocaleString('en-US'), 285, 362);
    ctx.fillStyle = '#8e9099'; ctx.font = '400 10px JetBrains Mono'; ctx.fillText('STEPS', 285, 376);
    // ECG trace
    ctx.strokeStyle = '#ff375f'; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x < 200; x++) { const ph = ((x / 200) * 3 - t * hr / 60) % 1; const p = ph < 0 ? ph + 1 : ph; const y = p > .45 && p < .5 ? -20 * Math.sin((p - .45) / .05 * Math.PI) : p > .5 && p < .55 ? 8 * Math.sin((p - .5) / .05 * Math.PI) : 0; x ? ctx.lineTo(100 + x, 320 + y) : ctx.moveTo(100 + x, 320 + y); }
    ctx.stroke();
    ctx.restore();
    // glass glare
    const gl = ctx.createLinearGradient(60, 60, 340, 420); gl.addColorStop(0, 'rgba(255,255,255,.12)'); gl.addColorStop(.35, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; rr(58, 62, 284, 356, 66); ctx.fill();
  });

  /* ── LCD layers ── */
  const svg = document.getElementById('lcdLayers');
  const layers = [['Front polariser', '#cfe3ff', .25, 'Passes only vertically polarised light'], ['Glass + ITO electrodes', '#e8f4ff', .18, 'Transparent conductive segment patterns'], ['Twisted-nematic LC', '#a7d6c0', .45, 'Rotates light 90° — unless voltage untwists it'], ['Glass + common electrode', '#e8f4ff', .18, 'Backplane; AC drive avoids electrolysis'], ['Rear polariser', '#cfe3ff', .25, 'Crossed at 90° to the front'], ['Reflector / EL panel', '#d4b06a', .55, 'Bounces ambient light back; glows for "Light"']];
  const x0 = 60, dx = 165, W = 120, Hh = 170, sk = 60;
  el('path', { d: `M20 200 L${x0 + dx * layers.length + 40} 200`, stroke: '#f3dca6', 'stroke-width': 2, 'stroke-dasharray': '6 6', opacity: .7 }, svg);
  layers.forEach(([n, c, o, d], i) => {
    const x = x0 + i * dx, y = 80;
    el('path', { d: `M${x} ${y + sk} L${x + W * .35} ${y} L${x + W * .35} ${y + Hh} L${x} ${y + Hh + sk} Z`, fill: c, 'fill-opacity': o, stroke: c, 'stroke-opacity': .8 }, svg);
    if (i === 1) for (let k = 0; k < 3; k++) el('path', { d: `M${x + 8} ${y + sk + 30 + k * 40} L${x + 34} ${y + sk - 4 + k * 40}`, stroke: '#3a7bd5', 'stroke-width': 3 }, svg);
    if (i === 2) for (let k = 0; k < 9; k++) { const yy = y + 60 + k * 15; el('line', { x1: x + 8, y1: yy + 12, x2: x + 34, y2: yy - 6, stroke: '#2a5a48', 'stroke-width': 2, 'stroke-linecap': 'round', transform: `rotate(${k * 10} ${x + 21} ${yy + 3})` }, svg); }
    if (i === 0 || i === 4) for (let k = 0; k < 8; k++) { const xx = x + 6 + k * 4; el('line', i === 0 ? { x1: xx, y1: y + sk - k * 6.8 + 20, x2: xx, y2: y + Hh + sk - k * 6.8 - 20, stroke: '#3a7bd5', opacity: .5 } : { x1: x + 4, y1: y + sk + 20 + k * 18, x2: x + 38, y2: y + sk + k * 18, stroke: '#3a7bd5', opacity: .5 }, svg); }
    const t = el('text', { x: x + 20, y: 300 + (i % 2) * 18, 'text-anchor': 'middle', fill: '#e8e4da', 'font-family': 'JetBrains Mono', 'font-size': 11 }, svg); t.textContent = n;
    const t2 = el('text', { x: x + 20, y: 40 - (i % 2) * 16, 'text-anchor': 'middle', fill: '#8e9099', 'font-family': 'Inter', 'font-size': 10.5 }, svg); t2.textContent = d;
  });
  el('text', { x: 18, y: 192, fill: '#f3dca6', 'font-family': 'JetBrains Mono', 'font-size': 10 }, svg).textContent = 'LIGHT →';
}
