// ═══════════════════════════════════════════════════════════════
//  The Loupe — a full-screen 3D inspector for any watch spec.
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { buildWatch, createStage } from './watch3d.js';

let opts = {}, ui = null, stage = null, controls = null, current = null, list = [], idx = 0, running = false, explode = 0, explodeT = 0, selected = null, labelsOn = true, cushionOn = true;
const views = { front: [0, 8, 158], three: [70, 26, 140], profile: [160, 10, -8], back: [-10, 14, -170], loupe: [0, 2, 58], top: [0, 165, 20] };
let camTo = null, tgtTo = null;
const fit = () => { const a = stage.camera.aspect || 1; return a < 1.15 ? Math.min(2.6, 1.2 / a) : 1; };
const V = k => new THREE.Vector3(...views[k]).multiplyScalar(k === 'loupe' ? Math.min(1.6, fit()) : fit());

function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

function buildUI() {
  ui = el(`<div class="insp" id="insp" role="dialog" aria-modal="true" aria-label="3D watch inspector" hidden>
    <div class="insp-bg"></div>
    <canvas class="insp-canvas"></canvas>
    <div class="insp-hot"></div>
    <header class="insp-head"><p class="tag insp-brand"></p><h2 class="display insp-model"></h2><p class="insp-ref"></p></header>
    <div class="insp-top"><div class="insp-pager"><button class="btn-mini" data-k="prev" aria-label="Previous watch">‹</button><span class="insp-count num"></span><button class="btn-mini" data-k="next" aria-label="Next watch">›</button></div><button class="insp-close" aria-label="Close">✕</button></div>
    <aside class="insp-panel">
      <div class="insp-sel"><p class="tag">Select a part</p><h3>—</h3><p></p></div>
      <ol class="insp-parts"></ol>
      <dl class="insp-specs"></dl>
    </aside>
    <div class="insp-ctl">
      <div class="seg insp-views">
        <button data-v="three" class="active">¾</button><button data-v="front">Dial</button><button data-v="profile">Crown side</button><button data-v="back">Caseback</button><button data-v="top">Above</button><button data-v="loupe">Loupe ×4</button>
      </div>
      <label class="insp-explode"><span>Assembled</span><input type="range" min="0" max="1000" value="0" aria-label="Disassemble"><span>Exploded</span></label>
      <div class="seg"><button data-t="labels" class="active">Labels</button><button data-t="spin" class="active">Turntable</button><button data-t="cushion" class="active">Cushion</button></div>
    </div>
    <p class="insp-hint">Drag to orbit · scroll or pinch to zoom · click a number</p>
  </div>`);
  document.body.appendChild(ui);
  const canvas = ui.querySelector('.insp-canvas');
  stage = createStage(canvas, { bloom: matchMedia('(min-width: 861px)').matches, shadows: true, floorY: -36, exposure: 1.05 });
  // warm studio backdrop rendered inside the scene (bloom output is opaque)
  const bgc = document.createElement('canvas'); bgc.width = bgc.height = 1024; const g = bgc.getContext('2d');
  const rg = g.createRadialGradient(512, 470, 30, 512, 512, 720); rg.addColorStop(0, '#4a2c17'); rg.addColorStop(.45, '#1d1009'); rg.addColorStop(1, '#050302'); g.fillStyle = rg; g.fillRect(0, 0, 1024, 1024);
  for (let r = 40; r < 720; r += 18) { g.strokeStyle = 'rgba(201,163,90,.035)'; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
  const bgt = new THREE.CanvasTexture(bgc); bgt.colorSpace = THREE.SRGBColorSpace; stage.scene.background = bgt;
  controls = new OrbitControls(stage.camera, canvas);
  Object.assign(controls, { enableDamping: true, dampingFactor: .07, minDistance: 34, maxDistance: 480, autoRotate: true, autoRotateSpeed: .7, enablePan: false });
  controls.addEventListener('start', () => { camTo = null; tgtTo = null; });
  new ResizeObserver(() => stage.resize()).observe(canvas);
  ui.querySelector('.insp-close').onclick = close;
  ui.querySelector('[data-k=prev]').onclick = () => go(-1);
  ui.querySelector('[data-k=next]').onclick = () => go(1);
  ui.querySelectorAll('[data-v]').forEach(b => b.onclick = () => view(b.dataset.v));
  const sl = ui.querySelector('.insp-explode input'); sl.oninput = () => { explodeT = sl.value / 1000; };
  ui.querySelector('[data-t=labels]').onclick = e => { labelsOn = !labelsOn; e.currentTarget.classList.toggle('active', labelsOn); ui.classList.toggle('no-labels', !labelsOn); };
  ui.querySelector('[data-t=cushion]').onclick = e => { cushionOn = !cushionOn; e.currentTarget.classList.toggle('active', cushionOn); };
  ui.querySelector('[data-t=spin]').onclick = e => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('active', controls.autoRotate); };
  addEventListener('keydown', e => { if (ui.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); });
}

function view(v) {
  ui.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('active', b.dataset.v === v));
  camTo = V(v); tgtTo = v === 'loupe' ? new THREE.Vector3(0, 0, 4) : new THREE.Vector3(0, 0, -10);
  controls.autoRotate = false; ui.querySelector('[data-t=spin]').classList.remove('active');
}

function load(i) {
  idx = (i + list.length) % list.length;
  const item = list[idx];
  if (current) { stage.scene.remove(current.group); current.dispose(); }
  current = buildWatch({ ...item.spec, cheapGlass: true, hiRes: true });
  current.group.rotation.x = -.08;
  ui.querySelector('[data-t=cushion]').style.display = current.cushion.children.length ? '' : 'none'; // a pocket watch has none
  stage.scene.add(current.group);
  if (stage.floor) stage.floor.position.y = -(current.wrist?.a ?? 30) - 3;
  ui.querySelector('.insp-brand').textContent = item.info.brand;
  ui.querySelector('.insp-model').innerHTML = item.info.model;
  ui.querySelector('.insp-ref').textContent = item.info.ref || '';
  ui.querySelector('.insp-count').textContent = list.length > 1 ? `${String(idx + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}` : '';
  ui.querySelector('.insp-pager').style.visibility = list.length > 1 ? 'visible' : 'hidden';
  // a full technical sheet in groups when there is one, otherwise the short list
  ui.querySelector('.insp-specs').innerHTML = item.info.sheet
    ? item.info.sheet.map(([grp, rows]) => `<dt class="grp">${grp}</dt>` + rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')).join('')
    : (item.info.specs || []).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  // hotspots + part list
  const hot = ui.querySelector('.insp-hot'), ol = ui.querySelector('.insp-parts');
  hot.innerHTML = ''; ol.innerHTML = '';
  current.parts.forEach((p, k) => {
    const n = String(k + 1).padStart(2, '0');
    const b = document.createElement('button'); b.className = 'hs'; b.innerHTML = `<i>${n}</i><span>${p.name}</span>`; b.onclick = () => select(p); hot.appendChild(b); p.hs = b;
    const li = document.createElement('li'); li.innerHTML = `<b>${n}</b>${p.name}`; li.onclick = () => select(p); li.onmouseenter = () => b.classList.add('hl'); li.onmouseleave = () => b.classList.remove('hl'); ol.appendChild(li); p.li = li;
  });
  selected = null; select(null);
}

function select(p) {
  selected = selected === p ? null : p;
  current.parts.forEach(q => { q.hs.classList.toggle('on', q === selected); q.li.classList.toggle('on', q === selected); });
  const box = ui.querySelector('.insp-sel');
  if (selected) { box.innerHTML = `<p class="tag">Part ${String(current.parts.indexOf(selected) + 1).padStart(2, '0')}</p><h3>${selected.name}</h3><p>${selected.desc}</p>`; }
  else box.innerHTML = `<p class="tag">${current.parts.length} labelled parts</p><h3>Inspect</h3><p>Orbit the watch, take it apart with the slider, or click any number to lift that part out and read about it.</p>`;
}

function go(d) { load(idx + d); }

const v = new THREE.Vector3(), n = new THREE.Vector3(), camDir = new THREE.Vector3();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _i = new THREE.Quaternion();
function loop() {
  if (!running) return;
  requestAnimationFrame(loop);
  explode += (explodeT - explode) * .1;
  if (current) {
    current.parts.forEach(p => { const e = p === selected ? Math.max(explode, .55) : explode; p.group.position.copy(p.explode).multiplyScalar(e); });
    current.tick();
    // the watch sits on its display cushion; the cushion steps aside when the watch is taken apart, a part is lifted out,
    // or you go round the back, so nothing hides the caseback
    current.cushion.visible = cushionOn && explode < .03 && !selected && stage.camera.position.z > 8;
    // seen from behind, the closed strap would cover the caseback: it parts like a curtain while you look
    const behind = stage.camera.position.z < -20;
    current.parts.forEach(p => { if (current.strapParts.includes(p.id)) { p.group.visible = !behind || p === selected; p.hs.classList.toggle('gone', !p.group.visible); } });
  }
  if (camTo) { // swing round the watch on an arc, never through it
    controls.target.lerp(tgtTo, .07);
    const from = _a.copy(stage.camera.position).sub(controls.target), to = _b.copy(camTo).sub(tgtTo), l0 = from.length(), l1 = to.length();
    _q.setFromUnitVectors(from.normalize(), to.normalize()); from.applyQuaternion(_i.identity().slerp(_q, .08)).multiplyScalar(l0 + (l1 - l0) * .08);
    stage.camera.position.copy(controls.target).add(from);
    if (stage.camera.position.distanceTo(camTo) < .6) camTo = null;
  }
  controls.update();
  stage.render();
  // project hotspots
  if (current) {
    const W = stage.renderer.domElement.clientWidth, H = stage.renderer.domElement.clientHeight;
    current.parts.forEach(p => {
      v.copy(p.anchor); p.group.localToWorld(v);
      n.copy(p.normal).transformDirection(current.group.matrixWorld);
      camDir.copy(stage.camera.position).sub(v).normalize();
      const facing = n.dot(camDir);
      v.project(stage.camera);
      const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H;
      p.hs.style.transform = `translate(${x}px, ${y}px)`;
      p.hs.classList.toggle('back', facing < -.05);
      p.hs.style.display = v.z > 1 || p.hs.classList.contains('gone') ? 'none' : '';
    });
  }
}

export function openInspector(items, startIndex = 0, origin, options = {}) {
  opts = options;
  if (!ui) buildUI();
  list = items; ui.hidden = false; document.body.classList.add('insp-open');
  const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight / 2;
  ui.style.setProperty('--ox', ox + 'px'); ui.style.setProperty('--oy', oy + 'px');
  stage.resize();
  stage.camera.position.copy(V('three')).multiplyScalar(1.6); controls.target.set(0, 0, -10);
  camTo = V('three'); tgtTo = new THREE.Vector3(0, 0, -10);
  ui.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('active', b.dataset.v === 'three'));
  controls.autoRotate = true; ui.querySelector('[data-t=spin]').classList.add('active');
  explodeT = explode = 0; ui.querySelector('.insp-explode input').value = 0;
  load(startIndex);
  requestAnimationFrame(() => ui.classList.add('open'));
  if (!running) { running = true; loop(); }
}

function close() {
  if (opts.onClose) { const f = opts.onClose; opts = {}; f(idx); }
  ui.classList.remove('open');
  document.body.classList.remove('insp-open');
  setTimeout(() => { ui.hidden = true; running = false; if (current) { stage.scene.remove(current.group); current.dispose(); current = null; } }, 800);
}
