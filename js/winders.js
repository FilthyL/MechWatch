// ═══════════════════════════════════════════════════════════════
//  The Winder Wall — every Vault watch turning in its own glass
//  winder. Pick one: the door swings open, the winder slides aside,
//  the watch floats out and into the Loupe.
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { buildWatch, createStage, specFromVault } from './watch3d.js';

const TAU = Math.PI * 2, SP = 126, W = 100, H = 106, D = 76;
const G = () => window.gsap;

function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const walnut = () => canvasTex(512, 1024, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a1508'); gr.addColorStop(.5, '#3d2010'); gr.addColorStop(1, '#2a1508'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 340; i++) {
    const x = Math.random() * w, a = .04 + Math.random() * .12, wob = 6 + Math.random() * 30;
    g.strokeStyle = Math.random() > .5 ? `rgba(18,8,2,${a})` : `rgba(120,70,34,${a * .7})`; g.lineWidth = .6 + Math.random() * 2.4;
    g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 140 + i) * wob, y); g.stroke();
  }
  for (let k = 0; k < 6; k++) { const cx = Math.random() * w, cy = Math.random() * h; for (let r = 4; r < 60; r += 4) { g.strokeStyle = 'rgba(20,9,3,.08)'; g.beginPath(); g.ellipse(cx, cy, r * .5, r * 2.2, 0, 0, TAU); g.stroke(); } }
}, [1, 1]);
const suede = () => canvasTex(256, 256, (g, w) => { g.fillStyle = '#2a170d'; g.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > .5 ? '90,56,34' : '10,5,2'},.25)`; g.fillRect(Math.random() * w, Math.random() * w, 1.4, 1.4); } }, [4, 4]);
const fluting = () => canvasTex(256, 64, (g, w, h) => { for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#120a05'); gr.addColorStop(.5, '#2a170c'); gr.addColorStop(1, '#0d0704'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); } }, [120, 1]);
function plaqueTex(w) {
  return canvasTex(1024, 128, (g, cw, ch) => {
    const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#f1d9a2'); gr.addColorStop(.45, '#c49a52'); gr.addColorStop(.55, '#a77d3a'); gr.addColorStop(1, '#d9b56f'); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    for (let x = 0; x < cw; x += 2) { g.fillStyle = `rgba(255,255,255,${Math.random() * .06})`; g.fillRect(x, 0, 1, ch); }
    g.fillStyle = '#3b2708'; g.textBaseline = 'middle';
    g.font = '400 44px "Libre Caslon Display", Georgia, serif'; g.fillText(w.b.toUpperCase(), 34, 52);
    g.font = 'italic 400 30px "Libre Caslon Text", Georgia, serif'; g.fillText(w.m.length > 34 ? w.m.slice(0, 33) + '…' : w.m, 34, 96);
    g.textAlign = 'right'; g.font = '500 24px "Jost", sans-serif'; g.fillText(`TPD 650 · ${w.y}`, cw - 70, 64);
  });
}

function shared() {
  const wood = new THREE.MeshPhysicalMaterial({ map: walnut(), roughness: .32, clearcoat: 1, clearcoatRoughness: .12, envMapIntensity: .8 });
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xd2a75c, metalness: 1, roughness: .22 });
  const brassBrushed = new THREE.MeshPhysicalMaterial({ color: 0xc89c52, metalness: 1, roughness: .38, anisotropy: .6 });
  const lining = new THREE.MeshPhysicalMaterial({ map: suede(), color: 0xffffff, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0x8a5634), sheenRoughness: .5 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: .02, transparent: true, opacity: .1, depthWrite: false, envMapIntensity: 2.6, iridescence: .25, iridescenceIOR: 1.4, side: THREE.DoubleSide });
  const geo = {
    back: new RoundedBoxGeometry(W, H, 4, 3, 1.5), side: new RoundedBoxGeometry(5, H, D, 3, 2), top: new RoundedBoxGeometry(W, 5, D, 3, 2), base: new RoundedBoxGeometry(W, 14, D, 3, 2.5),
    liner: new THREE.PlaneGeometry(W - 10, H - 18), door: new RoundedBoxGeometry(W - 12, H - 22, 1.2, 2, .5),
    handle: new THREE.CylinderGeometry(1.1, 1.1, 22, 16), plaque: new THREE.PlaneGeometry(64, 8),
    led: new THREE.TorusGeometry(45.5, .6, 10, 160), status: new THREE.SphereGeometry(.9, 16, 8),
    cup: new THREE.LatheGeometry([[40, -58], [44, -58], [44, 1], [45.5, 2.4], [42, 2.4]].map(([x, y]) => new THREE.Vector2(x, y)), 128).rotateX(Math.PI / 2),
    cupBack: new THREE.CircleGeometry(44, 96), dot: new THREE.SphereGeometry(1.1, 16, 8),
  };
  const frameShape = (() => { const s = rr(W, H, 7, 0, 0); s.holes.push(rr(W - 14, H - 26, 5, 0, 5, true)); return s; })();
  geo.frame = new THREE.ExtrudeGeometry(frameShape, { depth: 2.4, bevelEnabled: true, bevelThickness: .7, bevelSize: .6, bevelSegments: 3, curveSegments: 24 });
  return { wood, brass, brassBrushed, lining, glass, geo };
}
function rr(w, h, r, cx, cy, hole) { const s = hole ? new THREE.Path() : new THREE.Shape(), x = cx - w / 2, y = cy - h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; }

export function initGallery({ canvas, ui, info }) {
  const desktop = matchMedia('(min-width: 861px)').matches;
  const stage = createStage(canvas, { bloom: desktop, shadows: false, exposure: 1.05, alpha: false });
  const { scene, camera } = stage;
  scene.background = new THREE.Color(0x070403); scene.fog = new THREE.Fog(0x070403, 360, 820);
  camera.fov = 30; camera.near = 5; camera.far = 2000;
  scene.add(new THREE.HemisphereLight(0xffe2bf, 0x150a05, .35));
  const spot = new THREE.SpotLight(0xffe0b0, 9000, 0, .32, .75, 1.6); spot.position.set(0, 160, 150); scene.add(spot, spot.target);
  const S = shared();
  // the room: fluted wall, walnut shelf with brass nosing
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9000, 700), new THREE.MeshStandardMaterial({ map: fluting(), roughness: .8 })); wall.position.set(0, 60, -72); scene.add(wall);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(9000, 12, 120), S.wood); shelf.position.set(0, -H / 2 - 6, -18); scene.add(shelf);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(9000, 2, 2), S.brass); nose.position.set(0, -H / 2 - 1, 42); scene.add(nose);
  const nose2 = nose.clone(); nose2.position.y = -H / 2 - 11; scene.add(nose2);

  // a volumetric beam with drifting dust over the focused winder
  const beamTex = canvasTex(64, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.7, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(7, 78, 300, 48, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: 0xffd7a0, transparent: true, opacity: .11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.set(0, 96, -6); scene.add(beam);
  const NM = 360, mpos = new Float32Array(NM * 3), mseed = new Float32Array(NM);
  for (let k = 0; k < NM; k++) { const r = Math.sqrt(Math.random()) * 60, a = Math.random() * TAU; mpos[k * 3] = Math.cos(a) * r; mpos[k * 3 + 1] = -50 + Math.random() * 240; mpos[k * 3 + 2] = Math.sin(a) * r * .6 + 10; mseed[k] = Math.random() * 10; }
  const mgeo = new THREE.BufferGeometry(); mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
  const motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ color: 0xffe2b0, size: 1.3, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); scene.add(motes);
  let winders = [], focus = 0, camX = 0, drag = 0, state = 'idle', visible = false, paused = false, mx = 0, tmx = 0;
  const queue = [];

  function makeWinder(w, i) {
    const root = new THREE.Group(); root.position.x = i * SP; scene.add(root);
    const box = new THREE.Group(); root.add(box);
    const add = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); box.add(m); return m; };
    add(S.geo.back, S.wood, 0, 0, -D + 14); add(S.geo.side, S.wood, -W / 2 + 2.5, 0, -D / 2 + 14); add(S.geo.side, S.wood, W / 2 - 2.5, 0, -D / 2 + 14);
    add(S.geo.top, S.wood, 0, H / 2 - 2.5, -D / 2 + 14); add(S.geo.base, S.wood, 0, -H / 2 + 7, -D / 2 + 14);
    add(S.geo.liner, S.lining, 0, 5, -D + 16.2);
    const fr = add(S.geo.frame, S.brass, 0, 0, 12.4);
    const plaque = add(S.geo.plaque, new THREE.MeshPhysicalMaterial({ map: plaqueTex(w), metalness: .9, roughness: .3 }), -6, -H / 2 + 7, 15.4);
    const statusMat = new THREE.MeshStandardMaterial({ color: 0x3aff8a, emissive: 0x3aff8a, emissiveIntensity: 2 });
    add(S.geo.status, statusMat, W / 2 - 12, -H / 2 + 7, 15.2);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xffd9a8, emissive: 0xffc27a, emissiveIntensity: 1.4 });
    add(S.geo.led, ledMat, 0, 5, 3.4);
    const drum = new THREE.Group(); drum.position.set(0, 5, 0); box.add(drum);
    drum.add(new THREE.Mesh(S.geo.cup, S.brassBrushed));
    const cb = new THREE.Mesh(S.geo.cupBack, S.lining); cb.position.z = -57.8; drum.add(cb);
    const dot = new THREE.Mesh(S.geo.dot, S.brass); dot.position.set(0, 44.6, 2.6); drum.add(dot);
    // glass door, hinged on the left
    const door = new THREE.Group(); door.position.set(-W / 2 + 6, 5, 15.4); box.add(door);
    const glass = new THREE.Mesh(S.geo.door, S.glass); glass.position.x = (W - 12) / 2; door.add(glass);
    const handle = new THREE.Mesh(S.geo.handle, S.brass); handle.position.set(W - 16, 0, 2.2); door.add(handle);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, H - 24, 12), S.brass); door.add(hinge);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshBasicMaterial({ visible: false })); hit.position.z = -D / 2 + 14; box.add(hit); hit.userData.idx = i;
    void fr;
    return { w, i, root, box, drum, door, ledMat, statusMat, plaque, hit, watch: null, spinning: true, phase: Math.random() * 16, angle: 0 };
  }
  function buildWatchFor(wd) {
    if (wd.watch || wd.building) return; wd.building = true;
    queue.push(wd);
  }
  function pump() {
    if (!queue.length) return;
    queue.sort((a, b) => Math.abs(a.i - focus) - Math.abs(b.i - focus));
    const wd = queue.shift();
    if (Math.abs(wd.i - focus) > 4) { wd.building = false; return; }
    const spec = { ...specFromVault(wd.w), cheapGlass: true, cushionLength: 44 };
    if (spec.shape === 'pocket') { spec.D = 40; }
    const wt = buildWatch(spec);
    wd.watch = wt; wd.drum.add(wt.group); wd.building = false;
    wt.group.scale.setScalar(.001); G() ? G().to(wt.group.scale, { x: 1, y: 1, z: 1, duration: .9, ease: 'expo.out' }) : wt.group.scale.setScalar(1);
  }
  function retire() {
    winders.forEach(wd => { if (wd.watch && Math.abs(wd.i - focus) > 5 && state === 'idle') { wd.drum.remove(wd.watch.group); wd.watch.dispose(); wd.watch = null; } });
  }

  function setList(ws) {
    if (state !== 'idle') return;
    winders.forEach(wd => { scene.remove(wd.root); if (wd.watch) wd.watch.dispose(); wd.plaque.material.map.dispose(); });
    winders = ws.map((w, i) => makeWinder(w, i)); queue.length = 0;
    focusTo(0, true);
  }
  function focusTo(i, instant) {
    if (!winders.length) return;
    focus = Math.max(0, Math.min(winders.length - 1, i)); drag = 0;
    if (instant) camX = focus * SP;
    for (let k = focus - 3; k <= focus + 3; k++) if (winders[k]) buildWatchFor(winders[k]);
    winders.forEach(wd => G() ? G().to(wd.ledMat, { emissiveIntensity: wd.i === focus ? 3.2 : 1.1, duration: .6 }) : (wd.ledMat.emissiveIntensity = wd.i === focus ? 3.2 : 1.1));
    const w = winders[focus].w, inf = info(w);
    ui.brand.textContent = w.b; ui.model.innerHTML = inf.model; ui.ref.textContent = inf.ref;
    ui.specs.innerHTML = inf.specs.slice(0, 6).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
    ui.price.textContent = inf.specs.find(s => s[0] === 'Indicative retail')?.[1] || '';
    ui.count.textContent = `${String(focus + 1).padStart(2, '0')} / ${String(winders.length).padStart(2, '0')}`;
    ui.plaque.classList.remove('swap'); void ui.plaque.offsetWidth; ui.plaque.classList.add('swap');
    retire();
  }

  // pick → open the door, slide the winder aside, float the watch out, hand it to the Loupe
  function pick(i = focus) {
    const wd = winders[i]; if (!wd || !wd.watch || state !== 'idle' || !G()) return;
    if (i !== focus) { focusTo(i); return; }
    state = 'picking'; wd.spinning = false; ui.root.classList.add('picking');
    const g = G(), tl = g.timeline();
    const up = Math.round(wd.drum.rotation.z / TAU) * TAU;
    tl.to(wd.drum.rotation, { z: up, duration: .7, ease: 'power2.out' })
      .to(wd.door.rotation, { y: -1.95, duration: .9, ease: 'power3.inOut' }, '<')
      .to(wd.ledMat, { emissiveIntensity: 6, duration: .5 }, '<')
      .add(() => { wd.drum.attach(wd.watch.cushion); scene.attach(wd.watch.group); })
      .to(wd.watch.group.position, { z: '+=84', y: '+=6', duration: 1.15, ease: 'power3.inOut' })
      .to(wd.watch.group.rotation, { y: '+=' + TAU, duration: 1.15, ease: 'power2.inOut' }, '<')
      .to(wd.root.position, { x: '+=' + (SP * 1.6), duration: 1.2, ease: 'power3.inOut' }, '<.15')
      .to(wd.root.rotation, { y: -.5, duration: 1.2, ease: 'power3.inOut' }, '<')
      .to(camera.position, { z: '-=60', duration: 1.2, ease: 'power3.inOut' }, '<')
      .add(() => {
        const r = canvas.getBoundingClientRect();
        paused = true;
        Promise.all([import('./inspector.js')]).then(([I]) => I.openInspector(winders.map(x => ({ spec: specFromVault(x.w), info: info(x.w) })), i, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, { onClose: j => giveBack(i, j) }));
      });
  }
  function giveBack(i, j) {
    const wd = winders[i]; paused = false; if (visible) requestAnimationFrame(loop);
    const g = G(), tl = g.timeline({ onComplete: () => { wd.watch.group.attach(wd.watch.cushion); wd.spinning = true; state = 'idle'; ui.root.classList.remove('picking'); if (j != null && j !== i) focusTo(j); } });
    wd.drum.attach(wd.watch.group);
    tl.to(wd.root.position, { x: i * SP, duration: 1.1, ease: 'power3.inOut' })
      .to(wd.root.rotation, { y: 0, duration: 1.1, ease: 'power3.inOut' }, '<')
      .to(camera.position, { z: '+=60', duration: 1.1, ease: 'power3.inOut' }, '<')
      .to(wd.watch.group.position, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power3.inOut' }, '<')
      .to(wd.watch.group.rotation, { x: 0, y: 0, z: 0, duration: 1.1, ease: 'power3.inOut' }, '<')
      .to(wd.door.rotation, { y: 0, duration: .8, ease: 'power3.inOut' })
      .to(wd.ledMat, { emissiveIntensity: 3.2, duration: .5 }, '<');
  }

  /* ── interaction ── */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const hitAt = e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); const h = ray.intersectObjects(winders.map(w => w.hit), false)[0]; return h ? h.object.userData.idx : null; };
  let downX = null, downT = 0;
  canvas.addEventListener('pointerdown', e => { downX = e.clientX; downT = performance.now(); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    tmx = (e.clientX / innerWidth - .5);
    if (downX !== null && state === 'idle') drag = -(e.clientX - downX) * (SP * 1.4 / canvas.clientWidth) * 2.2;
    else if (e.pointerType === 'mouse') { const i = hitAt(e); canvas.style.cursor = i === null ? 'grab' : i === focus ? 'zoom-in' : 'pointer'; }
  });
  canvas.addEventListener('pointerup', e => {
    const dx = e.clientX - (downX ?? e.clientX); downX = null;
    if (Math.abs(dx) > 6) { focusTo(Math.round((camX + drag) / SP)); return; }
    drag = 0; const i = hitAt(e); if (i !== null && performance.now() - downT < 600) pick(i);
  });
  canvas.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && state === 'idle') { e.preventDefault(); wheelAcc += e.deltaX; if (Math.abs(wheelAcc) > 60) { focusTo(focus + Math.sign(wheelAcc)); wheelAcc = 0; } } }, { passive: false });
  let wheelAcc = 0;
  ui.prev.onclick = () => state === 'idle' && focusTo(focus - 1);
  ui.next.onclick = () => state === 'idle' && focusTo(focus + 1);
  ui.inspect.onclick = () => pick(focus);
  addEventListener('keydown', e => { if (!visible || state !== 'idle' || document.body.classList.contains('insp-open')) return; if (e.key === 'ArrowRight') focusTo(focus + 1); if (e.key === 'ArrowLeft') focusTo(focus - 1); });

  /* ── loop ── */
  new ResizeObserver(() => stage.resize()).observe(canvas);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !paused) requestAnimationFrame(loop); }, { threshold: .02 }).observe(canvas);
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let last = performance.now();
  function loop(now) {
    if (!visible || paused) return;
    requestAnimationFrame(loop);
    const dt = Math.min(.05, (now - last) / 1000); last = now; const t = now / 1000;
    pump();
    // camera
    const a = camera.aspect || 1.6, Wv = a > 1.2 ? 330 : 150, dist = Wv / (2 * Math.tan(15 * Math.PI / 180) * a);
    if (state === 'idle') { camX += (focus * SP + drag - camX) * Math.min(1, dt * 5); mx += (tmx - mx) * .05; camera.position.set(camX + mx * 18, 26, dist); camera.lookAt(camX, 2, -22); }
    spot.position.set(focus * SP, 170, 140); spot.target.position.set(focus * SP, 0, -20);
    beam.position.x += (focus * SP - beam.position.x) * Math.min(1, dt * 4); motes.position.x = beam.position.x;
    beam.material.opacity = state === 'idle' ? .11 + Math.sin(t * .7) * .015 : .04;
    for (let k = 0; k < NM; k++) { mpos[k * 3 + 1] += dt * (1.5 + (mseed[k] % 1) * 2.5); mpos[k * 3] += Math.sin(t * .4 + mseed[k]) * dt * 1.2; if (mpos[k * 3 + 1] > 190) mpos[k * 3 + 1] = -50; }
    mgeo.attributes.position.needsUpdate = true;
    // winders: the classic winding program — two turns, pause, two turns back, pause
    winders.forEach(wd => {
      if (Math.abs(wd.root.position.x - camX) > SP * 4.5) { wd.root.visible = false; return; }
      wd.root.visible = true;
      if (state === 'idle') wd.root.position.z += ((wd.i === focus ? 10 : 0) - wd.root.position.z) * Math.min(1, dt * 4);
      if (wd.spinning) {
        const ph = (t + wd.phase) % 16;
        const ang = ph < 6 ? ease(ph / 6) * 2 * TAU : ph < 8 ? 2 * TAU : ph < 14 ? 2 * TAU - ease((ph - 8) / 6) * 2 * TAU : 0;
        wd.drum.rotation.z = -ang;
        wd.statusMat.emissiveIntensity = (ph < 6 || (ph > 8 && ph < 14)) ? 1.2 + Math.sin(t * 6) * .9 : .5;
      }
      if (wd.watch && Math.abs(wd.i - focus) <= 2) wd.watch.tick();
    });
    stage.render();
  }

  return { setList, focusTo, pick };
}
