import { el, polar, whenVisible, metalDefs } from './util.js';

const TAU = Math.PI * 2, R = d => d * Math.PI / 180;
const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export function init() {
  const cv = document.getElementById('escCanvas'), ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = 900 * dpr; cv.height = 640 * dpr; ctx.scale(dpr, dpr);
  const E = [230, 320], Rw = 178, Rr = 146, P = [470, 320], B = [772, 320];
  const speedEl = document.getElementById('escSpeed'), speedOut = document.getElementById('escSpeedOut');
  const phases = [...document.querySelectorAll('#escPhases .phase')];
  let speed = .12; speedEl.oninput = () => { speed = +speedEl.value / 100; speedOut.textContent = speed.toFixed(2) + '×'; };

  // audio
  let ac = null, sound = false;
  const sBtn = document.getElementById('escSound');
  sBtn.onclick = () => { sound = !sound; sBtn.textContent = `${sound ? '🔊' : '🔈'} Tick sound: ${sound ? 'on' : 'off'}`; if (sound && !ac) ac = new (window.AudioContext || window.webkitAudioContext)(); };
  const tick = hi => {
    if (!sound || !ac) return;
    const len = .03, buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 4200 : 3300; f.Q.value = 6;
    const gn = ac.createGain(); gn.gain.value = .6;
    src.connect(f).connect(gn).connect(ac.destination); src.start();
  };

  // precompute tooth polygon (club tooth) in wheel coords, angle 0 = +x
  const tooth = [];
  { const p = TAU / 15;
    const pts = [[Rr, 0], [Rr + 4, p * .12], [Rw - 4, p * .34], [Rw, p * .36], [Rw, p * .5], [Rw - 10, p * .56], [Rr + 6, p * .62], [Rr, p * .72]];
    tooth.push(...pts); }

  let beats = 0, lastN = 0, t0 = performance.now();
  const forkBank = R(8.5);
  function state(b) {
    const n = Math.round(b), d = b - n; // window centred on crossings
    const side = i => (((i % 2) + 2) % 2 ? 1 : -1);
    const s0 = side(n - 1), s1 = side(n);
    let forkK = 0, wheel = 0, phase = 0;
    const w = .14;
    if (d < -w) { forkK = 0; wheel = 0; phase = 0; }
    else if (d < -w * .35) { const u = ease((d + w) / (w * .65)); forkK = .22 * u; wheel = -.03 * u; phase = 1; }
    else if (d < w * .5) { const u = ease((d + w * .35) / (w * .85)); forkK = .22 + .78 * u; wheel = -.03 + .88 * u; phase = 2; }
    else if (d < w * .5 + .06) { const u = (d - w * .5) / .06; forkK = 1; wheel = .85 + .15 * u * u; phase = 3; }
    else if (d < w * .5 + .16) { forkK = 1 + .04 * Math.sin((d - w * .5 - .06) / .1 * Math.PI); wheel = 1; phase = 4; }
    else { forkK = 1; wheel = 1; phase = 0; }
    const fork = forkBank * (s0 + (s1 - s0) * forkK);
    const wheelA = (n - 1 + wheel) * R(12);
    const bal = R(210) * Math.sin(Math.PI * b);
    // after drop, the "current" phase relates to the next crossing: show locking when far from window
    return { fork, wheelA, bal, phase, n };
  }

  const gold = '#c9a35a', steel = '#c7ccd4';
  function drawWheel(a) {
    ctx.save(); ctx.translate(...E); ctx.rotate(-a);
    const gr = ctx.createRadialGradient(-40, -40, 10, 0, 0, Rw);
    gr.addColorStop(0, '#f2f4f7'); gr.addColorStop(.6, '#aeb4bd'); gr.addColorStop(1, '#6c737d');
    ctx.fillStyle = gr; ctx.strokeStyle = '#3a3f47'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 15; k++) {
      const base = k * TAU / 15;
      tooth.forEach(([r, aa], j) => { const x = r * Math.cos(base + aa), y = r * Math.sin(base + aa); (k === 0 && j === 0) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    }
    ctx.closePath();
    // spoke windows
    for (let k = 0; k < 5; k++) { const a0 = k * TAU / 5 + .16, a1 = (k + 1) * TAU / 5 - .16; ctx.moveTo(122 * Math.cos(a0), 122 * Math.sin(a0)); ctx.arc(0, 0, 122, a0, a1); ctx.arc(0, 0, 36, a1 - .12, a0 + .12, true); ctx.closePath(); }
    ctx.fill('evenodd'); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fillStyle = '#7a828c'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fillStyle = '#c2183b'; ctx.fill();
    ctx.restore();
  }
  function drawFork(f) {
    ctx.save(); ctx.translate(...P); ctx.rotate(f);
    const armLen = 124, sp = R(47.5);
    const grad = ctx.createLinearGradient(-130, -100, 260, 100); grad.addColorStop(0, '#e9ecf0'); grad.addColorStop(.5, '#9aa1ab'); grad.addColorStop(1, '#dfe3e8');
    ctx.fillStyle = grad; ctx.strokeStyle = '#353a42'; ctx.lineWidth = 1;
    // body: arms + lever
    ctx.beginPath();
    const ax = -armLen * Math.cos(sp), ay = armLen * Math.sin(sp);
    ctx.moveTo(0, -16); ctx.lineTo(ax + 12, -ay - 6); ctx.lineTo(ax - 4, -ay + 14); ctx.lineTo(-20, 0);
    ctx.lineTo(ax - 4, ay - 14); ctx.lineTo(ax + 12, ay + 6); ctx.lineTo(0, 16);
    ctx.lineTo(206, 7); ctx.lineTo(218, 18); ctx.lineTo(240, 16); ctx.lineTo(238, 7); ctx.lineTo(222, 6); ctx.lineTo(222, -6); ctx.lineTo(238, -7); ctx.lineTo(240, -16); ctx.lineTo(218, -18); ctx.lineTo(206, -7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // guard pin
    ctx.beginPath(); ctx.moveTo(206, 0); ctx.lineTo(230, 0); ctx.strokeStyle = '#555'; ctx.lineWidth = 2; ctx.stroke();
    // pallet stones
    const stone = (x, y, rot) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
      const rg = ctx.createLinearGradient(-8, -20, 8, 20); rg.addColorStop(0, '#ff6a86'); rg.addColorStop(.5, '#c2183b'); rg.addColorStop(1, '#6a0a1e');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(7, -26); ctx.lineTo(7, 18); ctx.lineTo(-7, 26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
    };
    stone(ax - 6, -ay + 6, R(-62)); stone(ax - 6, ay - 6, R(62 + 180));
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fillStyle = '#c2183b'; ctx.fill();
    ctx.restore();
    // banking pins (fixed)
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(P[0] + 120, P[1] + s * 36, 7, 0, TAU); ctx.fillStyle = '#9aa1ab'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke(); }
  }
  function drawBalance(a) {
    ctx.save(); ctx.translate(...B);
    // hairspring
    ctx.save(); ctx.rotate(a * .18);
    ctx.beginPath(); const turns = 11; for (let i = 0; i <= turns * 80; i++) { const t = i / (turns * 80), aa = t * turns * TAU, r = 16 + t * 72 * (1 + .03 * Math.sin(a)); const x = r * Math.cos(aa), y = r * Math.sin(aa); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = 'rgba(159,182,224,.75)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    ctx.rotate(a);
    // rim
    ctx.globalAlpha = .9;
    const rg = ctx.createRadialGradient(-30, -40, 20, 0, 0, 125); rg.addColorStop(0, '#ffe3b0'); rg.addColorStop(1, '#a8733a');
    ctx.beginPath(); ctx.arc(0, 0, 118, 0, TAU); ctx.arc(0, 0, 102, 0, TAU, true); ctx.fillStyle = rg; ctx.fill();
    for (let k = 0; k < 3; k++) { ctx.save(); ctx.rotate(k * TAU / 3 + .5); ctx.fillStyle = rg; ctx.fillRect(0, -5, 104, 10); ctx.restore(); }
    for (let k = 0; k < 4; k++) { ctx.save(); ctx.rotate(k * TAU / 4 + .2); ctx.fillStyle = '#f2cd7e'; ctx.fillRect(116, -7, 9, 14); ctx.restore(); }
    ctx.globalAlpha = 1;
    // roller + impulse jewel
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fillStyle = '#c7ccd4'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-30, 0, 6, 4.5, 0, 0, TAU); ctx.fillStyle = '#e0204a'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fillStyle = '#c2183b'; ctx.fill();
    ctx.restore();
  }
  function labels() {
    ctx.font = '500 11px Cinzel, serif'; ctx.fillStyle = gold; ctx.textAlign = 'center';
    const L = (t, x, y, lx, ly) => { ctx.strokeStyle = 'rgba(212,176,106,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lx, ly + (ly < y ? 6 : -14)); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 2.5, 0, TAU); ctx.fill(); ctx.fillText(t, lx, ly); };
    L('ESCAPE WHEEL · 15 TEETH', E[0] - 90, E[1] + 120, 150, 600);
    L('ENTRY PALLET', 380, 236, 370, 60);
    L('EXIT PALLET', 382, 404, 470, 596);
    L('PALLET FORK', 560, 320, 560, 160);
    L('BANKING PINS', P[0] + 120, P[1] - 36, 640, 110);
    L('IMPULSE JEWEL', B[0] - 30, B[1], 720, 520);
    L('BALANCE · 4 Hz', B[0] + 60, B[1] - 90, 800, 60);
    L('HAIRSPRING', B[0] + 35, B[1] + 50, 840, 560);
  }
  let lastPhase = -1;
  whenVisible(cv, dt => {
    beats += dt * 8 * speed;
    const s = state(beats);
    ctx.clearRect(0, 0, 900, 640);
    const bg = ctx.createRadialGradient(450, 320, 40, 450, 320, 520); bg.addColorStop(0, '#2c1c0f'); bg.addColorStop(1, '#100904');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 900, 640);
    ctx.strokeStyle = 'rgba(255,220,170,.045)'; ctx.lineWidth = 1;
    for (let x = 0; x < 900; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 640); ctx.stroke(); }
    for (let y = 0; y < 640; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(900, y); ctx.stroke(); }
    ctx.setLineDash([8, 4, 2, 4]); ctx.strokeStyle = 'rgba(212,176,106,.25)'; ctx.beginPath(); ctx.moveTo(20, 320); ctx.lineTo(880, 320); ctx.stroke(); ctx.setLineDash([]);
    drawBalance(s.bal);
    drawWheel(s.wheelA);
    drawFork(s.fork);
    labels();
    ctx.font = '400 12px JetBrains Mono'; ctx.fillStyle = '#8e9099'; ctx.textAlign = 'left';
    ctx.fillText(`BEAT ${Math.floor(beats).toString().padStart(5, '0')}   ·   ${['LOCK', 'UNLOCK', 'IMPULSE', 'DROP', 'DRAW'][s.phase]}`, 24, 34);
    if (s.phase !== lastPhase) { phases.forEach((p, i) => p.classList.toggle('on', i === s.phase)); if (s.phase === 3) tick(s.n % 2); lastPhase = s.phase; }
  });

  /* ───── beat lab ───── */
  const svg = document.getElementById('beatDial'); metalDefs(svg, 'bl');
  el('circle', { r: 104, fill: 'url(#bl-steel)' }, svg);
  el('circle', { r: 98, fill: '#0d0f13' }, svg);
  for (let i = 0; i < 60; i++) { const [x1, y1] = polar(94, i * 6), [x2, y2] = polar(i % 5 ? 89 : 82, i * 6); el('line', { x1, y1, x2, y2, stroke: '#e8e4da', 'stroke-width': i % 5 ? .7 : 1.8 }, svg); }
  const fine = el('g', {}, svg);
  const secH = el('g', {}, svg);
  el('line', { x1: 0, y1: 18, x2: 0, y2: -90, stroke: '#d4b06a', 'stroke-width': 1.6, 'stroke-linecap': 'round' }, secH);
  el('circle', { r: 4, fill: '#d4b06a' }, svg);
  const lbl = el('text', { y: 40, 'text-anchor': 'middle', fill: '#8e9099', 'font-family': 'JetBrains Mono', 'font-size': 8.5, 'letter-spacing': 1 }, svg);
  let vph = 28800;
  const info = document.getElementById('beatInfo');
  const examples = { 18000: 'Vintage & many hand-wound calibres — Lange Datograph, Omega 321, Unitas 6497. Lower wear, longer service intervals.', 21600: 'The 1960s–70s standard; Patek 240, Omega 3861, JLC Reverso. A smooth compromise between accuracy and wear.', 25200: 'Omega\'s Co-Axial choice (8500/8900): the co-axial escapement works best slightly slower than 4 Hz.', 28800: 'The modern default: ETA 2824, Rolex 3235, Valjoux 7750. 4 Hz resists shocks and position errors well.', 36000: 'High-beat 5 Hz: Zenith El Primero (1/10 s timing), Grand Seiko Hi-Beat 9S85/9SA5. Better stability, more wear and energy.' };
  function setVph(v) {
    vph = v; const hz = v / 7200, bps = v / 3600;
    document.querySelectorAll('#beatSeg button').forEach(b => b.classList.toggle('active', +b.dataset.vph === v));
    fine.innerHTML = ''; for (let i = 0; i < 60 * bps; i++) { const [x1, y1] = polar(94, i * 6 / bps), [x2, y2] = polar(91, i * 6 / bps); el('line', { x1, y1, x2, y2, stroke: '#d4b06a', 'stroke-width': .35, opacity: .6 }, fine); }
    lbl.textContent = `${v.toLocaleString('en-US')} A/h`;
    info.innerHTML = `<div><b>${hz} Hz</b><span>oscillation frequency</span></div><div><b>${bps}</b><span>beats per second</span></div><div><b>${(6 / bps).toFixed(2)}°</b><span>seconds-hand step</span></div><div><b>${(1000 / bps).toFixed(1)} ms</b><span>between ticks</span></div><div><b>${(v * 24).toLocaleString('en-US')}</b><span>beats per day</span></div><div><b>${(bps * 60 / 2).toFixed(0)}</b><span>escape teeth / min (15-tooth)</span></div><p>${examples[v]}</p>`;
  }
  document.querySelectorAll('#beatSeg button').forEach(b => b.onclick = () => setVph(+b.dataset.vph));
  setVph(28800);
  whenVisible(svg, () => {
    const bps = vph / 3600, t = performance.now() / 1000;
    const a = Math.floor(t * bps) / bps * 6;
    secH.setAttribute('transform', `rotate(${a % 360})`);
  });
}
