import { CALIBERS } from './data.js';

function movementIcon(c, i) {
  // small generative movement plan: plate, bridges, balance, rotor indication
  const auto = /Automatic|Spring|rotor/i.test(c.type), chrono = /chrono/i.test(c.type), quartz = /Quartz|Spring/i.test(c.type);
  const seed = i * 97.3; const rnd = k => (Math.sin(seed + k * 12.9898) * 43758.5453) % 1;
  const bal = [-20 + Math.abs(rnd(1)) * 6, 18];
  let s = `<svg viewBox="-48 -48 96 96"><defs><radialGradient id="cg${i}" cx=".35" cy=".3"><stop offset="0" stop-color="#e9edf2"/><stop offset="1" stop-color="#7c848f"/></radialGradient></defs>`;
  s += `<circle r="44" fill="url(#cg${i})" opacity=".9"/><circle r="44" fill="none" stroke="#d4b06a" stroke-opacity=".5"/>`;
  for (let k = -40; k < 40; k += 6) s += `<line x1="-44" y1="${k}" x2="44" y2="${k + 10}" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>`;
  s += `<path d="M-30 -24 Q0 -40 30 -22 L22 0 Q0 -10 -24 2 Z" fill="#cfd4da" stroke="#5c636d" stroke-width=".6"/>`;
  s += `<circle cx="${bal[0]}" cy="${bal[1]}" r="13" fill="none" stroke="#e8b47a" stroke-width="2.4"/><circle cx="${bal[0]}" cy="${bal[1]}" r="2" fill="#c2183b"/>`;
  [[10, 10], [22, 22], [-2, -16], [14, -30]].forEach(([x, y]) => s += `<circle cx="${x}" cy="${y}" r="1.8" fill="#c2183b"/>`);
  if (chrono) s += `<circle cx="22" cy="10" r="6" fill="none" stroke="#2246a8" stroke-width="2" stroke-dasharray="2 1.4"/>`;
  if (auto && !quartz) s += `<path d="M-40 6 A40 40 0 0 0 40 6 L28 6 A28 28 0 0 1 -28 6Z" fill="#d4b06a" opacity=".55"/>`;
  if (quartz) s += `<rect x="6" y="-6" width="16" height="5" rx="2.5" fill="#c9d6e6" stroke="#5c636d" stroke-width=".5"/>`;
  return s + `</svg>`;
}

export function init() {
  const wrap = document.getElementById('calTable');
  const maxPR = Math.max(...CALIBERS.map(c => c.pr));
  let key = 'year';
  function render() {
    const list = [...CALIBERS].sort((a, b) => key === 'year' ? a.year - b.year : (b[key] || (key === 'vph' ? (b.hz ? 1e9 : 0) : 0)) - (a[key] || (key === 'vph' ? (a.hz ? 1e9 : 0) : 0)));
    wrap.innerHTML = list.map((c, i) => {
      const freq = c.vph ? `${(c.vph / 7200).toFixed(c.vph % 7200 ? 2 : 0)} Hz` : '32 kHz';
      const meterW = key === 'pr' ? c.pr / maxPR * 100 : key === 'jewels' ? c.jewels / 47 * 100 : key === 'vph' ? (c.vph ? Math.log(c.vph / 15000) / Math.log(110000 / 15000) * 100 : 100) : (c.year - 1940) / 85 * 100;
      return `<article class="cal reveal in">
        ${movementIcon(c, CALIBERS.indexOf(c))}
        <div><span class="maker">${c.maker} · ${c.year}</span><h4>${c.name}</h4><p>${c.note}</p></div>
        <div class="spec">
          <div><b>${c.vph ? c.vph.toLocaleString('en-US') : 'Quartz'}</b><span>${c.vph ? 'vph · ' + freq : 'regulated'}</span></div>
          <div><b>${c.jewels}</b><span>jewels</span></div>
          <div><b>${c.pr ? c.pr + ' h' : '≈ 6 yr'}</b><span>${c.pr ? 'reserve' : 'battery'}</span></div>
          <div><b>${c.d} mm</b><span>${c.type.split(' ')[0]}</span></div>
        </div>
        <div class="meter"><i style="width:${Math.max(4, Math.min(100, meterW)).toFixed(1)}%"></i></div>
      </article>`;
    }).join('');
  }
  document.querySelectorAll('#calSort button').forEach(b => b.onclick = () => { key = b.dataset.k; document.querySelectorAll('#calSort button').forEach(x => x.classList.toggle('active', x === b)); render(); });
  render();
}
