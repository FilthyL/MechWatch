// The opener: an 18k gold pocket chronometer with an open-worked movement, dial-on,
// hanging from its chain by a spring ring. It swings like a slow pendulum and follows
// your hand a little. Scroll, and the spring ring opens: the chain lifts away, the watch
// comes to rest and its bow drops back on its hinge.
import * as THREE from 'three';
import { buildWatch, createStage, POCKET, metal } from './watch3d.js';

const TAU = Math.PI * 2, FOV = 22, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const ss = THREE.MathUtils.smoothstep;
const backOut = x => { const c = 1.4; return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2; };

/** a curb chain rising from `top`, its links alternating flat and edge-on */
function chain(top, length, linkR = 1.45) {
  const pitch = linkR * 2 * 1.32 - .9, n = Math.ceil(length / pitch);
  const inst = new THREE.InstancedMesh(new THREE.TorusGeometry(linkR, .36, 10, 28), metal('gold', 'polished'), n);
  const T = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(1, 0, 0), B = new THREE.Vector3(0, 0, 1), m = new THREE.Matrix4(), q = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const flat = i % 2 === 0; // the first link lies flat, through the spring ring
    m.makeBasis(flat ? A : B, T, flat ? B : A).scale(new THREE.Vector3(1, 1.32, 1));
    m.setPosition(q.set(0, top + linkR * 1.1 + i * pitch, 0));
    inst.setMatrixAt(i, m);
  }
  return inst;
}
/** the spring ring that clips the chain to the bow, with a gate that swings open */
function springRing(R = 2.8, tube = .42, gap = 1.4) {
  const g = new THREE.Group(), gold = metal('gold', 'polished');
  const ring = new THREE.TorusGeometry(R, tube, 14, 56, TAU - gap); ring.rotateZ(-Math.PI / 2 + gap / 2); g.add(new THREE.Mesh(ring, gold));
  const pv = new THREE.Vector2(R * Math.sin(gap / 2), -R * Math.cos(gap / 2));
  const gate = new THREE.TorusGeometry(R, tube * .86, 12, 14, gap); gate.rotateZ(-Math.PI / 2 - gap / 2); gate.translate(-pv.x, -pv.y, 0);
  const hinge = new THREE.Group(); hinge.position.set(pv.x, pv.y, 0); hinge.add(new THREE.Mesh(gate, gold)); g.add(hinge);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(tube * 1.15, 16, 8), gold); knob.position.set(-R * .96, -R * .3, 0); g.add(knob);
  return { group: g, gate: hinge };
}

const INFO = { brand: 'MechWatch', model: 'Pocket <em>Chronometer</em>', ref: 'Ref. MW-1801 · 18k yellow gold · hand-wound, open-worked', specs: [['Case', '50 mm · 18k gold, bombé'], ['Dial', 'Grand feu enamel chapter ring, open centre'], ['Movement', 'Inverted, open-worked · 21 jewels · 4 Hz'], ['Finish', 'Côtes de Genève, perlage, hand-bevelled bridges'], ['Hands', 'Breguet, polished 18k gold'], ['Back', 'Engine-turned barleycorn']] };

export function initHero() {
  const hero = document.querySelector('.hero'), layer = document.getElementById('heroGL'), wrap = document.getElementById('heroWatchWrap');
  const canvas = document.createElement('canvas'); layer.appendChild(canvas);
  let stage;
  try { stage = createStage(canvas, { bloom: false, shadows: false, exposure: 1.08 }); }
  catch (e) { canvas.remove(); return; }
  const spec = { ...POCKET, cheapGlass: true };
  const w = buildWatch(spec);
  const r = spec.D / 2, bowTube = r - .4 + 3.2 + 7.4 * Math.cos(.625) + 7.4, CASE = spec.D + 3;
  // the swing pivots far above the frame; the watch hangs from it by its chain
  const PIV = 160;
  const pendulum = new THREE.Group(); pendulum.position.y = PIV; stage.scene.add(pendulum);
  const hang = new THREE.Group(); hang.position.y = -PIV; pendulum.add(hang);
  const turn = new THREE.Group(); hang.add(turn); turn.add(w.group);
  // the spring ring hooks the top of the bow; the chain runs up from the spring ring
  const tether = new THREE.Group(); tether.position.z = -.15 * spec.T; turn.add(tether);
  const sr = springRing(), yRing = bowTube + 1.1;
  sr.group.position.y = yRing; sr.group.rotation.y = Math.PI / 2 - .6; tether.add(sr.group);
  tether.add(chain(yRing + 2.6, PIV + 40));
  const cam = stage.camera; cam.fov = FOV;

  // Layout, in hero pixels: the watch sits where the page puts its placeholder
  // (#heroWatchWrap), drawn through a shifted lens so it stays dial-on.
  let L = null;
  function layout() {
    stage.resize();
    const W = canvas.clientWidth, H = canvas.clientHeight, inner = wrap.offsetParent;
    if (!W || !H || !inner) return;
    const ppu = wrap.offsetHeight / 67; // pixels per mm
    L = { W, H, ppu, x: inner.offsetLeft + wrap.offsetLeft + wrap.offsetWidth / 2, y: inner.offsetTop + wrap.offsetTop + wrap.offsetHeight / 2 + 4 * ppu };
    cam.position.set(0, 0, H / ppu / (2 * TAN)); cam.lookAt(0, 0, 0);
    cam.setViewOffset(W, H, W / 2 - L.x, H / 2 - L.y, W, H);
    layer.style.transformOrigin = `${L.x}px ${L.y}px`;
  }
  const at = new THREE.Vector3(), hit = { x: 0, y: 0, r: 0 };

  let mx = 0, my = 0, tx = 0, ty = 0, prog = 0, p = 0, visible = true, first = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  const ro = new ResizeObserver(layout); ro.observe(canvas); ro.observe(wrap);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
  window.MW_HERO = { setProgress(v) { prog = v; } };
  // click the watch (case or bow) to open it in the Loupe
  const onWatch = e => {
    const b = hero.getBoundingClientRect(), x = e.clientX - b.left - hit.x, y = e.clientY - b.top - hit.y;
    return Math.hypot(x, y) < hit.r * 1.06 || (Math.abs(x) < hit.r * .4 && y < 0 && y > -hit.r * 1.75);
  };
  hero.addEventListener('pointermove', e => hero.classList.toggle('on-watch', !e.target.closest('a,button') && onWatch(e)), { passive: true });
  hero.addEventListener('click', e => {
    if (e.target.closest('a,button') || !onWatch(e)) return;
    import('./inspector.js').then(m => m.openInspector([{ spec: POCKET, info: INFO }], 0, { x: e.clientX, y: e.clientY }));
  });

  function loop(now) {
    if (!visible) return;
    requestAnimationFrame(loop);
    const t = now / 1000;
    mx += (tx - mx) * .04; my += (ty - my) * .04; p += (prog - p) * .14;
    // unchaining, driven by scroll: the gate opens, the chain lifts away, the bow drops
    const free = ss(p, .1, .32), rise = ss(p, .12, .8);
    sr.gate.rotation.z = -1.25 * ss(p, .03, .14);
    tether.position.y = 170 * rise * rise; tether.position.x = 4 * rise * rise; tether.rotation.z = .06 * rise;
    if (w.bow) w.bow.rotation.x = -1.45 * backOut(ss(p, .16, .5));
    // a slow pendulum (period ≈ 2.9 s) while it hangs, nudged by the hand; still once free
    pendulum.rotation.z = (Math.sin(t * TAU / 2.9) * .018 + mx * .03) * (1 - free) + mx * .012 * free;
    pendulum.rotation.x = my * .02 * (1 - free * .5);
    // always dial-on; only a slight turn towards the hand
    turn.rotation.y = mx * .14 + Math.sin(t * .31) * .03;
    if (L) { pendulum.updateMatrixWorld(true); w.group.getWorldPosition(at); hit.x = L.x + at.x * L.ppu; hit.y = L.y - at.y * L.ppu; hit.r = CASE / 2 * L.ppu; }
    w.tick();
    stage.render();
    if (first) { first = false; wrap.classList.add('has3d'); }
  }
  layout();
  requestAnimationFrame(loop);
}
