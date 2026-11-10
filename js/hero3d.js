// The opener: an 18k gold pocket chronometer, dial-on, hanging from its chain.
// It swings like a slow pendulum, follows your hand a little, and turns on the
// chain to show its engine-turned back as you scroll away.
import * as THREE from 'three';
import { buildWatch, createStage, POCKET, metal } from './watch3d.js';

const TAU = Math.PI * 2;

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

export function initHero() {
  const wrap = document.getElementById('heroWatchWrap');
  const canvas = document.createElement('canvas'); canvas.className = 'hero-canvas'; wrap.appendChild(canvas);
  let stage;
  try { stage = createStage(canvas, { bloom: false, shadows: false, exposure: 1.08 }); }
  catch (e) { canvas.remove(); return; }
  const spec = { ...POCKET, cheapGlass: true };
  const w = buildWatch(spec);
  const r = spec.D / 2, bowTop = r - .4 + 3.2 + 7.4 * Math.cos(.625) + 7.4 + 1.1;
  // the swing pivots far above the frame; the watch and its chain hang from it
  const PIV = 160;
  const pendulum = new THREE.Group(); pendulum.position.y = PIV; stage.scene.add(pendulum);
  const hang = new THREE.Group(); hang.position.y = -PIV; pendulum.add(hang);
  const turn = new THREE.Group(); hang.add(turn); turn.add(w.group);
  const ch = chain(bowTop - 1.6, PIV + 40); ch.position.z = -.15 * spec.T; turn.add(ch);
  stage.camera.fov = 22; stage.camera.position.set(0, 4, 222); stage.camera.lookAt(0, 4, 0);
  let mx = 0, my = 0, tx = 0, ty = 0, prog = 0, visible = true, first = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  new ResizeObserver(() => { stage.resize(); stage.camera.lookAt(0, 4, 0); }).observe(canvas);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
  window.MW_HERO = { setProgress(p) { prog = p; } };
  canvas.addEventListener('click', e => import('./inspector.js').then(m => m.openInspector([{ spec: POCKET, info: { brand: 'MechWatch', model: 'Pocket <em>Chronometer</em>', ref: 'Ref. MW-1801 · 18k yellow gold · hand-wound', specs: [['Case', '50 mm · 18k gold, bombé'], ['Dial', 'Grand feu enamel, Breguet numerals'], ['Hands', 'Breguet, thermally blued'], ['Seconds', 'Small seconds at 6'], ['Back', 'Engine-turned barleycorn'], ['Crystal', 'High-domed sapphire']] } }], 0, { x: e.clientX, y: e.clientY })));
  function loop(now) {
    if (!visible) return;
    requestAnimationFrame(loop);
    const t = now / 1000;
    mx += (tx - mx) * .04; my += (ty - my) * .04;
    // a slow pendulum (period ≈ 2.9 s), nudged by the hand
    pendulum.rotation.z = Math.sin(t * TAU / 2.9) * .018 + mx * .03;
    pendulum.rotation.x = my * .02;
    // dial-on; turns on its chain to the engine-turned back as you scroll
    const flip = THREE.MathUtils.smoothstep(prog, .05, .85) * Math.PI;
    turn.rotation.y = mx * .14 + Math.sin(t * .31) * .03 + flip;
    w.tick();
    stage.render();
    if (first) { first = false; wrap.classList.add('has3d'); }
  }
  requestAnimationFrame(loop);
}
