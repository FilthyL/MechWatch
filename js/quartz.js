import { el, whenVisible } from './util.js';

export function init() {
  const svg = document.getElementById('quartzSvg');
  svg.innerHTML = `
  <defs>
    <linearGradient id="q-bat" x1="0" x2="1"><stop offset="0" stop-color="#7d838c"/><stop offset=".5" stop-color="#eef1f4"/><stop offset="1" stop-color="#7d838c"/></linearGradient>
    <linearGradient id="q-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#262a31"/><stop offset="1" stop-color="#0e1013"/></linearGradient>
    <linearGradient id="q-can" x1="0" x2="1"><stop offset="0" stop-color="#9aa1ab"/><stop offset=".5" stop-color="#f2f4f7"/><stop offset="1" stop-color="#8a919b"/></linearGradient>
    <linearGradient id="q-coil" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2a05e"/><stop offset=".5" stop-color="#ffd7a6"/><stop offset="1" stop-color="#a5602a"/></linearGradient>
    <filter id="q-glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  const g = el('g', {}, svg);
  const label = (x, y, t, sub) => { const n = el('text', { x, y, 'text-anchor': 'middle', fill: '#d4b06a', 'font-family': 'JetBrains Mono', 'font-size': 11, 'letter-spacing': 2 }, g); n.textContent = t; if (sub) { const s = el('text', { x, y: y + 16, 'text-anchor': 'middle', fill: '#8e9099', 'font-family': 'Inter', 'font-size': 11 }, g); s.textContent = sub; } };
  // traces
  const trace = (d) => el('path', { d, stroke: '#3b3424', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }, g);
  const pulse = (d) => el('path', { d, stroke: '#f3dca6', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', 'stroke-dasharray': '14 400', filter: 'url(#q-glow)' }, g);
  const paths = ['M110 210 H200', 'M330 150 V110 H420', 'M420 270 H330 V250', 'M530 210 H600', 'M760 210 H800 V280'];
  paths.forEach(trace); const pulses = paths.map(pulse);

  // battery
  el('circle', { cx: 70, cy: 210, r: 46, fill: 'url(#q-bat)', stroke: '#4c535d' }, g);
  el('circle', { cx: 70, cy: 210, r: 36, fill: 'none', stroke: '#5c636d', 'stroke-width': .8 }, g);
  el('text', { x: 70, y: 206, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 10, fill: '#333' }, g).textContent = 'SR626SW';
  el('text', { x: 70, y: 222, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 14, fill: '#222', 'font-weight': 600 }, g).textContent = '1.55V +';
  label(70, 300, 'BATTERY', 'silver-oxide cell');

  // IC
  el('rect', { x: 200, y: 150, width: 130, height: 120, rx: 6, fill: 'url(#q-chip)', stroke: '#3a3f48' }, g);
  for (let i = 0; i < 7; i++) { el('rect', { x: 210 + i * 16, y: 142, width: 6, height: 10, fill: '#c9a46a' }, g); el('rect', { x: 210 + i * 16, y: 268, width: 6, height: 10, fill: '#c9a46a' }, g); }
  el('text', { x: 265, y: 205, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 11, fill: '#c9a46a' }, g).textContent = 'CMOS IC';
  el('text', { x: 265, y: 222, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 9, fill: '#7d7a72' }, g).textContent = 'oscillator · ÷2¹⁵';
  const icLed = el('circle', { cx: 312, cy: 168, r: 4, fill: '#d02a4c' }, g);
  label(265, 300, 'INTEGRATED CIRCUIT', 'drives fork, divides, pulses motor');

  // quartz tuning fork in can
  el('rect', { x: 420, y: 80, width: 110, height: 220, rx: 50, fill: 'url(#q-can)', opacity: .25 }, g);
  el('rect', { x: 420, y: 80, width: 110, height: 220, rx: 50, fill: 'none', stroke: '#8a919b', 'stroke-dasharray': '3 4' }, g);
  const fork = el('g', {}, g);
  el('rect', { x: 455, y: 230, width: 40, height: 36, rx: 4, fill: '#dfeaf5', opacity: .9 }, fork);
  const tineL = el('path', { d: 'M458 232 L458 110 Q458 100 466 100 L470 100 Q474 100 474 110 L474 232Z', fill: '#e8f2ff', stroke: '#9fb6d8' }, fork);
  const tineR = el('path', { d: 'M476 232 L476 110 Q476 100 484 100 L488 100 Q492 100 492 110 L492 232Z', fill: '#e8f2ff', stroke: '#9fb6d8' }, fork);
  el('rect', { x: 461, y: 130, width: 10, height: 90, fill: '#c9a46a', opacity: .7 }, fork);
  el('rect', { x: 479, y: 130, width: 10, height: 90, fill: '#c9a46a', opacity: .7 }, fork);
  label(475, 330, 'QUARTZ TUNING FORK', '32,768 Hz · piezoelectric');
  const hzText = el('text', { x: 475, y: 60, 'text-anchor': 'middle', 'font-family': 'JetBrains Mono', 'font-size': 12, fill: '#f3dca6' }, g);

  // stepping motor
  el('rect', { x: 600, y: 170, width: 90, height: 80, rx: 4, fill: '#1b1d22', stroke: '#3a3f48' }, g);
  for (let i = 0; i < 18; i++) el('rect', { x: 604 + i * 4.7, y: 180, width: 3.4, height: 60, rx: 1.5, fill: 'url(#q-coil)' }, g);
  el('path', { d: 'M690 180 H720 Q760 180 760 210 Q760 240 720 240 H690', fill: 'none', stroke: '#9aa1ab', 'stroke-width': 10 }, g);
  const rotor = el('g', { transform: 'translate(745 210)' }, g);
  el('circle', { r: 14, fill: '#1c2230', stroke: '#9aa1ab' }, rotor);
  el('path', { d: 'M0 -14 A14 14 0 0 1 0 14 Z', fill: '#c2183b' }, rotor);
  el('text', { x: 6, y: 4, 'font-size': 9, fill: '#fff', 'font-family': 'JetBrains Mono' }, rotor).textContent = 'N';
  el('text', { x: -12, y: 4, 'font-size': 9, fill: '#fff', 'font-family': 'JetBrains Mono' }, rotor).textContent = 'S';
  label(680, 300, 'LAVET STEPPING MOTOR', 'coil + magnetised rotor');

  // gear & hand
  const gearG = el('g', { transform: 'translate(820 330)' }, g);
  let gd = ''; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, b = (i + .5) / 24 * Math.PI * 2; gd += `${i ? 'L' : 'M'}${30 * Math.cos(a)} ${30 * Math.sin(a)} L${26 * Math.cos(b)} ${26 * Math.sin(b)} `; }
  el('path', { d: gd + 'Z', fill: '#c9a46a', opacity: .85 }, gearG);
  el('circle', { r: 6, fill: '#111' }, gearG);
  const hand = el('g', { transform: 'translate(820 330)' }, g);
  el('line', { x1: 0, y1: 8, x2: 0, y2: -55, stroke: '#f3dca6', 'stroke-width': 2.4, 'stroke-linecap': 'round' }, hand);
  label(820, 405, 'SECONDS', '');

  // flip-flop row
  const ffRow = document.getElementById('ffRow');
  const ffs = [];
  for (let i = 1; i <= 15; i++) {
    const d = document.createElement('div'); d.className = 'ff' + (i === 15 ? ' last' : '');
    const hz = 32768 / 2 ** i;
    d.innerHTML = `${i}<small>${hz >= 1 ? (hz >= 1000 ? (hz / 1000).toFixed(hz >= 10000 ? 1 : 2) + 'k' : hz) : hz}Hz</small>`;
    ffRow.appendChild(d); ffs.push(d);
  }
  const slow = document.getElementById('quartzSlow'), read = document.getElementById('quartzReadout');
  let simT = 0, lastStep = -1, angle = 0, rotorA = 0, flash = 0;
  whenVisible(svg, (dt) => {
    // slider maps to time dilation: 1× .. 1/40000×
    const v = +slow.value / 100; const factor = Math.pow(10, -v * 4.6);
    simT += dt * factor;
    const cycles = simT * 32768;
    read.textContent = factor > .5 ? 'Real time — the fork is a blur' : `Slowed ${Math.round(1 / factor).toLocaleString('en-US')}× · ${Math.floor(cycles).toLocaleString('en-US')} oscillations`;
    hzText.textContent = `${(32768 * factor).toFixed(factor > .01 ? 0 : 2)} Hz apparent`;
    const amp = factor > .02 ? 1.8 * (Math.random() - .5) : 4 * Math.sin(cycles * Math.PI * 2);
    tineL.setAttribute('transform', `translate(${-amp} 0)`); tineR.setAttribute('transform', `translate(${amp} 0)`);
    const count = Math.floor(cycles * 2); // half-cycles toggle stage 1
    for (let i = 0; i < 15; i++) ffs[i].classList.toggle('on', ((count >> (i + 1)) & 1) === 1);
    const step = Math.floor(cycles / 32768);
    if (step !== lastStep) { if (lastStep >= 0) { angle += 6; rotorA += 180; flash = 1; } lastStep = step; }
    flash = Math.max(0, flash - dt * 2.5);
    icLed.setAttribute('opacity', .3 + flash * .7);
    rotor.setAttribute('transform', `translate(745 210) rotate(${rotorA})`);
    hand.setAttribute('transform', `translate(820 330) rotate(${angle})`);
    gearG.setAttribute('transform', `translate(820 330) rotate(${angle * .5})`);
    const tt = performance.now() / 1000;
    pulses.forEach((p, i) => {
      const len = p.getTotalLength ? p.getTotalLength() : 200;
      p.setAttribute('stroke-dashoffset', -((tt * 220 + i * 60) % (len + 400)) );
      p.setAttribute('opacity', i < 3 ? .9 : flash);
    });
  });
}
