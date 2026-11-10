import { WATCHES, CATS, AUCTIONS, HOUSES } from './data.js';
import { usd } from './util.js';
import { initGallery } from './winders.js';

export function init() {
  // trinity
  const tri = [['Patek Philippe', '1839 · Geneva', 'Calatrava, Nautilus, grand complications. The benchmark of the secondary market and keeper of the Patek Philippe Seal, stricter than the Geneva hallmark.'], ['Audemars Piguet', '1875 · Le Brassus', 'Founded in the Vallée de Joux by Jules-Louis Audemars and Edward-Auguste Piguet. Masters of complications; creators of the Royal Oak.'], ['Vacheron Constantin', '1755 · Geneva', 'The oldest manufacture in uninterrupted production. Les Cabinotiers makes unique pieces, including the most complicated watches ever built.']];
  document.getElementById('trinity').innerHTML = tri.map(([n, y, p], i) => `<div class="tri"><p class="tag">Holy Trinity · ${['I', 'II', 'III'][i]}</p><h3>${n}</h3><p class="yr">${y}</p><p>${p}</p></div>`).join('');

  const grid = document.getElementById('atlasGrid'), count = document.getElementById('atlasCount');
  const catEl = document.getElementById('atlasCat');
  catEl.innerHTML = CATS.map((c, i) => `<button data-c="${c}" class="${i ? '' : 'active'}">${c}</button>`).join('');
  let cat = 'All', q = '', sort = 'price-desc', gallery = null, current = [];
  const $g = id => document.getElementById(id);
  try {
    gallery = initGallery({ canvas: $g('galleryCanvas'), info: vaultInfo, ui: { root: $g('gallery'), brand: $g('galBrand'), model: $g('galModel'), ref: $g('galRef'), specs: $g('galSpecs'), price: $g('galPrice'), count: $g('galCount'), prev: $g('galPrev'), next: $g('galNext'), inspect: $g('galInspect'), plaque: $g('galPlaque') } });
  } catch (e) { console.warn('winder wall unavailable', e); $g('gallery').classList.add('no3d'); }
  function render() {
    let list = WATCHES.map((w, i) => ({ w, i })).filter(({ w }) => (cat === 'All' || w.cat.includes(cat)) && (!q || `${w.b} ${w.m} ${w.ref} ${w.cal} ${w.mat}`.toLowerCase().includes(q)));
    list.sort((A, B) => { const a = A.w, b = B.w; if (sort === 'year') return a.y - b.y; const pa = a.price ?? 1e12, pb = b.price ?? 1e12; return sort === 'price-asc' ? pa - pb : pb - pa; });
    const sum = list.filter(x => x.w.price).reduce((s, x) => s + x.w.price, 0);
    count.textContent = `${list.length} reference${list.length === 1 ? '' : 's'} in the wall · combined indicative retail ${usd(sum)}${list.some(x => !x.w.price) ? ' + price-on-request pieces' : ''}`;
    current = list.map(x => x.w);
    grid.innerHTML = list.map(({ w }, k) => `<li class="cat-row" data-k="${k}">
      <span class="cr-n">${String(k + 1).padStart(2, '0')}</span>
      <span class="cr-house">${w.b}</span>
      <span class="cr-model">${w.m}<small>Ref. ${w.ref} · ${w.size || w.dia + ' mm'} · Cal. ${w.cal}</small></span>
      <span class="cr-cat">${w.cat[0]}</span>
      <span class="cr-price">${w.price ? '≈ ' + usd(w.price) : 'On request'}</span>
      <span class="cr-go" aria-hidden="true"></span></li>`).join('') || `<li class="muted">No references match.</li>`;
    grid.querySelectorAll('.cat-row').forEach(row => row.addEventListener('click', e => {
      const k = +row.dataset.k;
      if (gallery) { $g('gallery').scrollIntoView({ behavior: 'smooth', block: 'center' }); gallery.focusTo(k); }
      else openVault(current, k, e);
    }));
    if (gallery) gallery.setList(current);
    window.mwRefresh?.();
  }
  catEl.onclick = e => { const b = e.target.closest('button'); if (!b) return; cat = b.dataset.c; catEl.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); render(); };
  document.getElementById('atlasSearch').oninput = e => { q = e.target.value.toLowerCase().trim(); clearTimeout(render.t); render.t = setTimeout(render, 250); };
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

// where each extra line of a reference's own sheet belongs
const SHEET_GROUP = { Caseband: 'Case', Lugs: 'Case', Bezel: 'Case', Crystal: 'Case', Dial: 'Dial', Numerals: 'Dial', Hands: 'Dial', Signature: 'Dial', Escapement: 'Movement', Rotor: 'Movement', Finishing: 'Movement' };
const freq = w => w.vph ? (w.vph / 7200).toFixed(1).replace('.0', '') + ' Hz · ' + w.vph.toLocaleString('en-US') + ' vph' : 'Spring Drive, glide motion';
const water = wr => typeof wr === 'number' ? `${wr} m · ${wr / 10} bar` : wr;

/** What the plaque and the Loupe say about a Vault reference: a short list, and the full technical sheet in groups. */
export function vaultInfo(w) {
  const size = w.size || w.dia + ' mm', price = w.price ? '≈ ' + usd(w.price) : 'On request', extra = g => Object.entries(w.sheet || {}).filter(([k]) => SHEET_GROUP[k] === g);
  const rows = list => list.filter(([, v]) => v != null && v !== '');
  const sheet = [
    ['Case', rows([['Material', w.mat], ['Size', size], ['Thickness', w.t + ' mm'], ...extra('Case'), ['Caseback', w.back], ['Water resistance', water(w.wr)]])],
    ['Dial', rows(extra('Dial'))],
    ['Movement', rows([['Calibre', w.cal], ['Winding', w.wind], ['Jewels', w.jw], ['Frequency', freq(w)], ['Power reserve', w.pr], ...extra('Movement')])],
    ['Functions', rows([['Indications', w.fn]])],
    ['Strap', rows([['Fitted with', w.band]])],
    ['Reference', rows([['Introduced', w.y], ['Indicative retail', price]])],
  ].filter(([, r]) => r.length);
  return { brand: w.b, model: w.m.replace(/(\S+)$/, '<em>$1</em>'), ref: `Ref. ${w.ref} · ${w.mat} · Cal. ${w.cal}`, sheet,
    specs: rows([['Size', size], ['Thickness', w.t + ' mm'], ['Calibre', w.cal], ['Power reserve', w.pr || freq(w)], ['Water resistance', typeof w.wr === 'number' ? w.wr + ' m' : 'Not rated'], ['Case', w.mat], ['Indicative retail', price]]) };
}
function openVault(ws, k, e) {
  Promise.all([import('./inspector.js'), import('./watch3d.js')]).then(([I, W]) => I.openInspector(ws.map(w => ({ spec: W.specFromVault(w), info: vaultInfo(w) })), k, { x: e.clientX, y: e.clientY }));
}
