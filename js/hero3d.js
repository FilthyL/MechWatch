// The hero: a live, physically-shaded signature watch that follows your hand
// and turns over to show its movement as you scroll away.
import * as THREE from 'three';
import { buildWatch, createStage, SIGNATURE } from './watch3d.js';

export function initHero() {
  const wrap = document.getElementById('heroWatchWrap');
  const canvas = document.createElement('canvas'); canvas.className = 'hero-canvas'; wrap.appendChild(canvas);
  let stage;
  try { stage = createStage(canvas, { bloom: false, shadows: false, exposure: 1.12 }); }
  catch (e) { canvas.remove(); return; }
  const w = buildWatch({ ...SIGNATURE, headOnly: true });
  const pivot = new THREE.Group(); pivot.add(w.group); w.group.position.z = 2; stage.scene.add(pivot);
  stage.camera.fov = 22; stage.camera.position.set(0, 1, 150); stage.camera.lookAt(0, 0, 0);
  let mx = 0, my = 0, tx = 0, ty = 0, prog = 0, visible = true, first = true;
  addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; }, { passive: true });
  new ResizeObserver(() => { stage.resize(); stage.camera.lookAt(0, 0, 0); }).observe(canvas);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(loop); }).observe(canvas);
  window.MW_HERO = { setProgress(p) { prog = p; } };
  canvas.addEventListener('click', e => import('./inspector.js').then(m => m.openInspector([{ spec: { ...SIGNATURE, headOnly: true }, info: { brand: 'MechWatch', model: 'Signature <em>Chronomètre</em>', ref: 'Ref. MW-01 · 18k rose gold · Cal. MW-28', specs: [['Case', '40 mm · 18k rose gold'], ['Dial', 'Chocolate rose-engine guilloché'], ['Movement', 'Automatic, 28,800 vph'], ['Reserve', '42 h'], ['Glass', 'Sapphire, AR-coated']] } }], 0, { x: e.clientX, y: e.clientY })));
  function loop(now) {
    if (!visible) return;
    requestAnimationFrame(loop);
    const t = now / 1000;
    mx += (tx - mx) * .05; my += (ty - my) * .05;
    const flip = THREE.MathUtils.smoothstep(prog, .05, .85) * Math.PI;
    pivot.rotation.y = -.5 + mx * .6 + flip + Math.sin(t * .35) * .12;
    pivot.rotation.x = .16 + my * .32 + Math.sin(t * .5) * .05;
    pivot.rotation.z = Math.sin(t * .27) * .04;
    pivot.position.y = Math.sin(t * .8) * .9;
    w.tick();
    stage.render();
    if (first) { first = false; wrap.classList.add('has3d'); }
  }
  requestAnimationFrame(loop);
}
