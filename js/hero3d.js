// The opener: an 18k gold pocket chronometer, dial-on, hanging from its chain.
// It swings like a slow pendulum and follows your hand a little. Scrolling moves
// the camera in on the dial: the canvas covers the whole hero, so the zoom is
// done by the lens (never by scaling pixels) and the watch is never cropped.
import * as THREE from 'three';
import { buildWatch, createStage, POCKET, metal } from './watch3d.js';

const TAU = Math.PI * 2, FOV = 22, TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
const lerp = THREE.MathUtils.lerp;

function chain(top, length, linkR = 1.45) {
  const pitch = linkR * 2 * 1.32 - .9, n = Math.ceil(length / pitch);
  const geo = new THREE.TorusGeometry(linkR, .36, 10, 28);
  const inst = new THREE.InstancedMesh(geo, metal('gold', 'polished'), n);
  const T = new THREE.Vector3(0, 1, 0), A = new THREE.Vector3(1, 0, 0), B = new THREE.Vector3(0, 0, 1), m = new THREE.Matrix4(), q = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const even = i % 2 === 1; // the first link interlocks the bow at right angles
    m.makeBasis(even ? A : B, T, even ? B : A).scale(new THREE.Vector3(1, 1.32, 1));
    m.setPosition(q.set(0, top + linkR * 1.1 + i * pitch, 0));
    inst.setMatrixAt(i, m);
  }
  return inst;
}

const INFO = { brand: 'MechWatch', model: 'Pocket <em>Chronometer</em>', ref: 'Ref. MW-1801 · 18k yellow gold · hand-wound', specs: [['Case', '50 mm · 18k gold, bombé'], ['Dial', 'Grand feu enamel, Breguet numerals'], ['Hands', 'Breguet, polished 18k gold'], ['Seconds', 'Small seconds at 6'], ['Back', 'Engine-turned barleycorn'], ['Crystal', 'High-domed sapphire']] };

export function initHero() {
  const hero = document.querySelector('.hero'), layer = document.getElementById('heroGL'), wrap = document.getElementById('heroWatchWrap');
  const canvas = document.createElement('canvas'); layer.appendChild(canvas);
  let stage;
  try { stage = createStage(canvas, { bloom: false, shadows: false, exposure: 1.08 }); }
  catch (e) { canvas.remove(); return; }
  const spec = { ...POCKET, cheapGlass: true };
  const w = buildWatch(spec);
  const r = spec.D / 2, bowTop = r - .4 + 3.2 + 7.4 * Math.cos(.625) + 7.4 + 1.1, CASE = spec.D + 3;
  // the swing pivots far above the frame; the watch and its chain hang from it
  const PIV = 160;
  const pendulum = new THREE.Group(); pendulum.position.y = PIV; stage.scene.add(pendulum);
  const hang = new THREE.Group(); hang.position.y = -PIV; pendulum.add(hang);
  const turn = new THREE.Group(); hang.add(turn); turn.add(w.group);
  const ch = chain(bowTop - 1.6, PIV + 40); ch.position.z = -.15 * spec.T; turn.add(ch);
  const cam = stage.camera; cam.fov = FOV;

  // Layout, in hero pixels. At rest the watch sits where the page puts its
  // placeholder (#heroWatchWrap). Zoomed, on wide screens it is centred and the
  // case fills most of the screen height; on narrow screens it grows in place.
  const wide = matchMedia('(min-width: 901px)');
  let L = null;
  function layout() {
    stage.resize();
    const W = canvas.clientWidth, H = canvas.clientHeight, inner = wrap.offsetParent;
    if (!W || !H || !inner) return;
    const wx = inner.offsetLeft + wrap.offsetLeft + wrap.offsetWidth / 2, wy = inner.offsetTop + wrap.offsetTop + wrap.offsetHeight / 2;
    const ppu0 = wrap.offsetHeight / 67, vh = Math.min(innerHeight, H); // pixels per mm at rest
    const ppu1 = wide.matches ? vh * .9 / CASE : ppu0 * 1.3;
    L = { W, H, ppu0, ppu1, x0: wx, y0: wy + 4 * ppu0, x1: wide.matches ? W / 2 : wx, y1: wide.matches ? vh * .53 : wy + 4 * ppu0 };
    layer.style.transformOrigin = `${L.x0}px ${L.y0}px`;
  }
  const at = new THREE.Vector3(), hit = { x: 0, y: 0, r: 0 };
  function frame(k) {
    if (!L) return;
    // follow the swing as the camera closes in, so the dial stays framed
    pendulum.updateMatrixWorld(true); w.group.getWorldPosition(at);
    const ppu = lerp(L.ppu0, L.ppu1, k), d = L.H / ppu / (2 * TAN);
    const cx = lerp(L.x0, L.x1, k), cy = lerp(L.y0, L.y1, k), fx = at.x * k;
    cam.position.set(fx, 0, d); cam.lookAt(fx, 0, 0);
    cam.setViewOffset(L.W, L.H, L.W / 2 - cx, L.H / 2 - cy, L.W, L.H);
    hit.x = cx + (at.x - fx) * ppu; hit.y = cy - at.y * ppu; hit.r = CASE / 2 * ppu;
  }

  let mx = 0, my = 0, tx = 0, ty = 0, prog = 0, zoom = 0, visible = true, first = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  const ro = new ResizeObserver(() => { layout(); frame(THREE.MathUtils.smoothstep(zoom, 0, 1)); });
  ro.observe(canvas); ro.observe(wrap);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
  window.MW_HERO = { setProgress(p) { prog = p; } };
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
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    // a slow pendulum (period ≈ 2.9 s), nudged by the hand
    pendulum.rotation.z = Math.sin(t * TAU / 2.9) * .018 + mx * .03;
    pendulum.rotation.x = my * .02;
    // always dial-on; only a slight turn towards the hand
    turn.rotation.y = mx * .14 + Math.sin(t * .31) * .03;
    zoom += (prog - zoom) * .12;
    frame(THREE.MathUtils.smoothstep(zoom, 0, 1));
    w.tick();
    stage.render();
    if (first) { first = false; wrap.classList.add('has3d'); }
  }
  layout();
  requestAnimationFrame(loop);
}
