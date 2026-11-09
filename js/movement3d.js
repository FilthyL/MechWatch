// ═══════════════════════════════════════════════════════════════
//  3D exploded automatic movement — procedurally modelled in three.js
//  Units: millimetres. Movement axis = Y (dial side up). 12 o'clock = −Z, 3 o'clock = +X.
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { PARTS3D_INFO } from './data.js';

const TAU = Math.PI * 2;
const GAP = 2.6, CENTER = 10.4;

/* ───────────── canvas textures ───────────── */
function canvasTex(size, draw, { repeat = [1, 1], offset = [0, 0], wrap = true, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); draw(g, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat); t.offset.set(...offset); t.anisotropy = 8;
  return t;
}
const cotes = () => canvasTex(256, (g, s) => {
  // one Geneva stripe per tile: a cylindrical reflection band
  const gr = g.createLinearGradient(0, 0, s, 0);
  [[0, '#8f949b'], [.18, '#d9dde2'], [.42, '#f6f8fa'], [.5, '#ffffff'], [.62, '#c9cdd3'], [.86, '#a3a8af'], [1, '#8f949b']].forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.globalAlpha = .07; for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() > .5 ? '#000' : '#fff'; g.fillRect(Math.random() * s, 0, 1, s); }
}, { repeat: [1 / 3.2, 1 / 3.2] });
const perlage = () => canvasTex(256, (g, s) => {
  g.fillStyle = '#b9bec5'; g.fillRect(0, 0, s, s);
  const R = s / 3.2; const pts = [];
  for (let y = -1; y <= 4; y++) for (let x = -1; x <= 4; x++) pts.push([x * s / 3 + (y % 2 ? s / 6 : 0), y * s / 3.6]);
  for (const [cx, cy] of pts) {
    for (let r = R; r > 2; r -= 2.2) {
      g.beginPath(); g.arc(cx, cy, r, 0, TAU);
      const l = 175 + 60 * Math.sin(r * .55);
      g.strokeStyle = `rgb(${l},${l + 3},${l + 7})`; g.lineWidth = 2.4; g.stroke();
    }
  }
}, { repeat: [1 / 2.6, 1 / 2.6] });
const sunray = r => canvasTex(512, (g, s) => {
  g.fillStyle = '#c6cbd2'; g.fillRect(0, 0, s, s);
  g.translate(s / 2, s / 2);
  for (let i = 0; i < 720; i++) { g.rotate(TAU / 720); const l = 150 + Math.random() * 105; g.strokeStyle = `rgb(${l},${l + 2},${l + 6})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, 0); g.stroke(); }
}, { repeat: [1 / (2 * r), 1 / (2 * r)], offset: [.5, .5], wrap: false });
const rotorTex = () => canvasTex(1024, (g, s) => {
  const c = s / 2;
  g.fillStyle = '#c9ced5'; g.fillRect(0, 0, s, s);
  for (let r = 4; r < c; r += 3) { const l = 170 + 70 * Math.sin(r / 9); g.strokeStyle = `rgb(${l},${l + 3},${l + 7})`; g.lineWidth = 3.2; g.beginPath(); g.arc(c, c, r, 0, TAU); g.stroke(); }
  // engraved gilt text along the arc
  g.fillStyle = '#b8913f'; g.font = '600 38px "Cormorant Garamond", Georgia, serif';
  const txt = 'MECHWATCH  ·  AUTOMATIC  ·  25 JEWELS  ·  SWISS';
  const R = c * .62, span = Math.PI * .86, start = -Math.PI / 2 - span / 2;
  for (let i = 0; i < txt.length; i++) {
    const a = start + span * (i / (txt.length - 1));
    g.save(); g.translate(c + R * Math.cos(a), c + R * Math.sin(a)); g.rotate(a + Math.PI / 2); g.fillText(txt[i], -10, 0); g.restore();
  }
  g.font = '400 22px "JetBrains Mono", monospace'; g.fillStyle = '#7d6531'; g.textAlign = 'center';
  g.fillText('CAL. MW-28 · 28 800 A/h', c, c - R * .55);
}, { repeat: [1 / 25.4, 1 / 25.4], offset: [.5, .5], wrap: false });
const dialTex = () => canvasTex(1024, (g, s) => {
  const c = s / 2;
  const rg = g.createRadialGradient(c * .9, c * .8, 10, c, c, c);
  rg.addColorStop(0, '#2a4f93'); rg.addColorStop(.6, '#12295a'); rg.addColorStop(1, '#071330');
  g.fillStyle = rg; g.fillRect(0, 0, s, s);
  g.save(); g.translate(c, c);
  for (let i = 0; i < 900; i++) { g.rotate(TAU / 900); g.strokeStyle = `rgba(${Math.random() > .5 ? '255,255,255' : '0,0,0'},${.02 + Math.random() * .05})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(c, 0); g.stroke(); }
  g.restore();
  g.save(); g.translate(c, c);
  for (let i = 0; i < 240; i++) {
    const big = i % 4 === 0; const r1 = c * .955, r2 = c * (big ? .905 : .93);
    const a = i / 240 * TAU; g.strokeStyle = big ? '#efe0b5' : 'rgba(239,224,181,.55)'; g.lineWidth = big ? 3 : 1.4;
    g.beginPath(); g.moveTo(r1 * Math.sin(a), -r1 * Math.cos(a)); g.lineTo(r2 * Math.sin(a), -r2 * Math.cos(a)); g.stroke();
  }
  g.restore();
  g.fillStyle = '#efe0b5'; g.textAlign = 'center';
  g.font = '500 54px "Cormorant Garamond", Georgia, serif'; g.fillText('M E C H W A T C H', c, c - 175);
  g.font = '400 20px "JetBrains Mono", monospace'; g.fillText('A U T O M A T I C', c, c + 170);
  g.globalAlpha = .7; g.font = '400 15px "JetBrains Mono", monospace'; g.fillText('CHRONOMETER  ·  28 800 A/h', c, c + 200);
  g.fillText('SWISS MADE', c, s - 30);
}, { wrap: false });

/* ───────────── geometry helpers ───────────── */
function gearShape(n, rTip, rRoot, o = {}) {
  const s = new THREE.Shape(), p = TAU / n;
  for (let i = 0; i < n; i++) {
    const a = i * p; let pts;
    if (o.saw) pts = [[rRoot, a], [rTip, a + p * .78], [rRoot, a + p * .82]];
    else if (o.club) pts = [[rRoot, a], [rTip * .96, a + p * .52], [rTip, a + p * .6], [rTip, a + p * .7], [rRoot * 1.05, a + p * .74]];
    else pts = [[rRoot, a], [rRoot, a + p * .12], [rTip, a + p * .3], [rTip, a + p * .52], [rRoot, a + p * .7]];
    pts.forEach(([r, aa], j) => (i === 0 && j === 0) ? s.moveTo(r * Math.cos(aa), r * Math.sin(aa)) : s.lineTo(r * Math.cos(aa), r * Math.sin(aa)));
  }
  s.closePath();
  addHoles(s, o);
  return s;
}
function addHoles(s, { spokes = 0, hub = .6, rim = 0, spokeW = .5, bore = 0, curved = false } = {}) {
  if (spokes) {
    const step = TAU / spokes;
    for (let k = 0; k < spokes; k++) {
      const h = new THREE.Path();
      const a0 = k * step, a1 = (k + 1) * step;
      const dO = spokeW / 2 / rim, dI = spokeW / 2 / hub;
      const tw = curved ? .25 : 0;
      h.moveTo(rim * Math.cos(a0 + dO + tw), rim * Math.sin(a0 + dO + tw));
      h.absarc(0, 0, rim, a0 + dO + tw, a1 - dO + tw, false);
      h.lineTo(hub * Math.cos(a1 - dI), hub * Math.sin(a1 - dI));
      h.absarc(0, 0, hub, a1 - dI, a0 + dI, true);
      h.closePath();
      s.holes.push(h);
    }
  }
  if (bore) { const h = new THREE.Path(); h.absarc(0, 0, bore, 0, TAU, true); s.holes.push(h); }
}
const ringShape = (rO, rI) => { const s = new THREE.Shape(); s.absarc(0, 0, rO, 0, TAU, false); const h = new THREE.Path(); h.absarc(0, 0, rI, 0, TAU, true); s.holes.push(h); return s; };
const circleShape = (r, o = {}) => { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, TAU, false); addHoles(s, o); return s; };
function hullShape(circles, seg = 40) {
  const pts = [];
  for (const [x, z, r] of circles) for (let i = 0; i < seg; i++) { const a = i / seg * TAU; pts.push([x + r * Math.cos(a), -z + r * Math.sin(a)]); }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const hull = lo.slice(0, -1).concat(up.slice(0, -1));
  const s = new THREE.Shape(); hull.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
  return s;
}
function extrude(shape, depth, mat, { bevel = .03, seg = 24 } = {}) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * .8, bevelSegments: 2, curveSegments: seg });
  g.rotateX(-Math.PI / 2); g.translate(0, -depth / 2, 0);
  return new THREE.Mesh(g, mat);
}
const cyl = (r, h, mat, seg = 32, rT = r) => new THREE.Mesh(new THREE.CylinderGeometry(rT, r, h, seg), mat);
function spiralTube(r0, r1, turns, tubeR, mat, yScale = 1) {
  const pts = []; const N = Math.round(turns * 64);
  for (let i = 0; i <= N; i++) { const t = i / N, a = t * turns * TAU, r = r0 + (r1 - r0) * t; pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, tubeR, 6, false);
  g.scale(1, yScale, 1);
  return new THREE.Mesh(g, mat);
}

/* ───────────── layout (plan coordinates x,z) ───────────── */
const P = {
  center: [0, 0], barrel: [2.12, -5.83], third: [2.75, 4.76], fourth: [-1.23, 8.1], escape: [-5.56, 7.34],
  pallet: [-6.78, 5.12], balance: [-7.99, 2.9], minutewheel: [-2.19, 2.19], crownwheel: [7.22, -4.43],
};

export function init() {
  const canvas = document.getElementById('movementCanvas');
  const viewer = document.getElementById('viewer');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(30, 1, .5, 800);
  camera.position.set(78, 30, 132);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.enablePan = false; controls.enableZoom = false;
  controls.rotateSpeed = .7; controls.target.set(0, 0, 0);
  canvas.style.touchAction = 'pan-y';

  // lights
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1410, .55));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(40, 80, 50); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9cc0ff, 1.4); rim.position.set(-60, 10, -40); scene.add(rim);
  const under = new THREE.DirectionalLight(0xffd8a0, .7); under.position.set(10, -60, 30); scene.add(under);

  // materials
  const M = {
    brass: new THREE.MeshStandardMaterial({ color: 0xe0b56a, metalness: 1, roughness: .28 }),
    pinkgold: new THREE.MeshStandardMaterial({ color: 0xf2c79a, metalness: 1, roughness: .22 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2cd7e, metalness: 1, roughness: .16 }),
    rhod: new THREE.MeshStandardMaterial({ color: 0xffffff, map: cotes(), metalness: 1, roughness: .3 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xffffff, map: perlage(), metalness: 1, roughness: .36 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xeef0f4, metalness: 1, roughness: .14 }),
    brushed: new THREE.MeshStandardMaterial({ color: 0xd8dce2, metalness: 1, roughness: .38 }),
    caseSteel: new THREE.MeshStandardMaterial({ color: 0xe9ecf0, metalness: 1, roughness: .17 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2246a8, metalness: .85, roughness: .22, emissive: 0x050d30 }),
    ruby: new THREE.MeshPhysicalMaterial({ color: 0xd2123c, metalness: .05, roughness: .06, clearcoat: 1, clearcoatRoughness: .05, emissive: 0x3a0010, emissiveIntensity: .8 }),
    sapph: new THREE.MeshPhysicalMaterial({ color: 0xe6f2ff, metalness: 0, roughness: 0, transparent: true, opacity: .18, depthWrite: false, envMapIntensity: 2.5, side: THREE.DoubleSide }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x141414, roughness: .7, metalness: 0 }),
    lume: new THREE.MeshStandardMaterial({ color: 0xe3fbe9, emissive: 0x7fe3aa, emissiveIntensity: .25, roughness: .6 }),
    spring: new THREE.MeshStandardMaterial({ color: 0x9fb6e0, metalness: 1, roughness: .2 }),
    mainspring: new THREE.MeshStandardMaterial({ color: 0x8e96a6, metalness: 1, roughness: .3 }),
    glucydur: new THREE.MeshStandardMaterial({ color: 0xe8b47a, metalness: 1, roughness: .2 }),
    dial: new THREE.MeshStandardMaterial({ map: dialTex(), metalness: .35, roughness: .38 }),
    red: new THREE.MeshStandardMaterial({ color: 0xc2183b, metalness: .4, roughness: .3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1a1c20, metalness: .6, roughness: .5 }),
  };
  M.ratchetSun = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sunray(3.4), metalness: 1, roughness: .22 });
  M.crownSun = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sunray(1.9), metalness: 1, roughness: .22 });
  M.rotor = new THREE.MeshStandardMaterial({ color: 0xffffff, map: rotorTex(), metalness: 1, roughness: .26 });

  const root = new THREE.Group(); scene.add(root);
  const parts = {}; const order = [];
  function part(id, layer, y0, x = 0, z = 0, anchor = [0, 0, 0]) {
    const g = new THREE.Group(); g.position.set(x, y0, z);
    g.userData = { id, layer, y0, x, z };
    root.add(g);
    parts[id] = { id, g, layer, y0, x, z, anchor: new THREE.Vector3(...anchor), info: PARTS3D_INFO[id] };
    order.push(id);
    return g;
  }
  const add = (g, mesh, x = 0, y = 0, z = 0) => { mesh.position.set(x, y, z); g.add(mesh); return mesh; };
  const screw = (g, x, y, z, r = .55) => {
    const s = new THREE.Group();
    add(s, cyl(r, .32, M.blue, 28));
    add(s, cyl(r * .55, .5, M.blue, 16), 0, -.3, 0);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(r * 2.05, .12, .14), M.dark); add(s, slot, 0, -.13, 0); slot.rotation.y = Math.random() * Math.PI;
    s.position.set(x, y, z); g.add(s); return s;
  };
  const jewel = (g, x, y, z, r = .42) => { add(g, cyl(r, .22, M.ruby, 24), x, y, z); add(g, new THREE.Mesh(new THREE.TorusGeometry(r * .3, r * .12, 8, 20), M.dark), x, y - .12, z).rotation.x = Math.PI / 2; };
  const pinion = (leaves, r, h, mat = M.steel) => extrude(gearShape(leaves, r, r * .7), h, mat, { bevel: .02, seg: 8 });

  /* ── L0 crystal ── */
  {
    const g = part('crystal', 0, 7.4, 0, 0, [-17, .4, 0]);
    const cap = new THREE.SphereGeometry(60, 96, 12, 0, TAU, 0, Math.asin(17 / 60)); cap.scale(1, .42, 1); cap.translate(0, -60 * .42 + 1.2, 0);
    add(g, new THREE.Mesh(cap, M.sapph));
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(17, 17, .9, 96, 1, true), M.sapph), 0, -.25, 0);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(17, 96), M.sapph); disc.rotation.x = -Math.PI / 2; add(g, disc, 0, -.7, 0);
  }
  /* ── L1 bezel ── */
  {
    const g = part('bezel', 1, 6.7, 0, 0, [19.8, 0, 0]);
    const prof = [[16.6, -.6], [19.6, -.6], [19.95, 0], [19.5, .75], [17.4, 1.05], [16.6, .7]].map(([r, y]) => new THREE.Vector2(r, y));
    add(g, new THREE.Mesh(new THREE.LatheGeometry(prof, 160), M.caseSteel));
    const flute = new THREE.Group();
    for (let i = 0; i < 90; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.22, .5, .6), M.caseSteel); const a = i / 90 * TAU; b.position.set(19.75 * Math.cos(a), .05, 19.75 * Math.sin(a)); b.rotation.y = -a; flute.add(b); }
    g.add(flute);
  }
  {
    const g = part('gasket', 1.75, 6.2, 0, 0, [-16.9, 0, 0]);
    const t = new THREE.Mesh(new THREE.TorusGeometry(16.9, .28, 12, 120), M.rubber); t.rotation.x = Math.PI / 2; add(g, t);
  }
  /* ── hands ── */
  const handMesh = (len, w, tail, mat, lume = true) => {
    const s = new THREE.Shape(); s.moveTo(0, -tail); s.lineTo(-w, 0); s.lineTo(-w * .15, len * .97); s.lineTo(0, len); s.lineTo(w * .15, len * .97); s.lineTo(w, 0); s.closePath();
    const grp = new THREE.Group();
    // faceted: two halves at slight angle
    const m = extrude(s, .12, mat, { bevel: .03, seg: 4 }); grp.add(m);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(.06, .05, len * .98), M.steel); ridge.position.set(0, .1, -len / 2 + tail * .1); grp.add(ridge);
    if (lume) { const ls = new THREE.Shape(); ls.moveTo(0, len * .2); ls.lineTo(-w * .4, len * .3); ls.lineTo(0, len * .82); ls.lineTo(w * .4, len * .3); ls.closePath(); const l = extrude(ls, .06, M.lume, { bevel: 0, seg: 2 }); l.position.y = .09; grp.add(l); }
    grp.add(cyl(w * .9, .18, mat, 24));
    return grp;
  };
  {
    const g = part('seconds', 2, 5.55, 0, 0, [0, 0, -14.2]);
    const s = new THREE.Shape(); s.moveTo(-.09, -4.2); s.lineTo(-.09, 14.5); s.lineTo(.09, 14.5); s.lineTo(.09, -4.2); s.closePath();
    add(g, extrude(s, .07, M.gold, { bevel: .015, seg: 2 }));
    const cw = extrude(circleShape(.7, { bore: .32 }), .08, M.gold, { bevel: .02 }); cw.position.set(0, 0, 3.3); g.add(cw);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(.24, .1, 2.2), M.red); tip.position.set(0, .03, -13.4); g.add(tip);
    add(g, cyl(.45, .3, M.gold, 24));
  }
  { const g = part('minute', 3, 5.15, 0, 0, [0, 0, -13]); g.add(handMesh(13.4, .9, 1.6, M.gold)); }
  { const g = part('hour', 4, 4.85, 0, 0, [0, 0, -8.6]); g.add(handMesh(8.8, 1.1, 1.4, M.gold)); }
  /* ── L5 dial ── */
  {
    const g = part('dial', 5, 4.2, 0, 0, [15.6, 0, 0]);
    const face = new THREE.Mesh(new THREE.CircleGeometry(15.6, 128), M.dial); face.rotation.x = -Math.PI / 2; add(g, face, 0, .2, 0);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(15.6, 15.6, .4, 128, 1, true), M.brass));
    const back = new THREE.Mesh(new THREE.CircleGeometry(15.6, 64), M.brass); back.rotation.x = Math.PI / 2; add(g, back, 0, -.2, 0);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU; const offs = i === 0 ? [-.55, .55] : [0];
      for (const o of offs) {
        const ig = new THREE.Group(); ig.rotation.y = -a;
        const L = i % 3 === 0 ? 2.8 : 2.2;
        const bar = new THREE.Mesh(new THREE.BoxGeometry(.75, .35, L), M.gold); bar.position.set(o, .38, -12.2 + L / 2); ig.add(bar);
        const lu = new THREE.Mesh(new THREE.BoxGeometry(.28, .06, L * .75), M.lume); lu.position.set(o, .57, -12.2 + L / 2); ig.add(lu);
        g.add(ig);
      }
    }
  }
  /* ── motion works ── */
  {
    const g = part('hourwheel', 5.9, 3.75, 0, 0, [2.6, 0, 0]);
    add(g, extrude(gearShape(32, 2.6, 2.42, { spokes: 0, bore: .75 }), .2, M.brass));
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(.75, .75, 1, 32, 1, true), M.brass), 0, .5, 0);
  }
  {
    const g = part('cannon', 6.6, 3.5, 0, 0, [.95, 0, 0]);
    add(g, cyl(.5, 2.1, M.steel, 24), 0, .5, 0);
    add(g, pinion(10, .95, .45));
  }
  {
    const [x, z] = P.minutewheel; const g = part('minutewheel', 6.25, 3.5, x, z, [-2.2, 0, 0]);
    add(g, extrude(gearShape(30, 2.15, 1.98, { spokes: 4, hub: .45, rim: 1.6, spokeW: .35 }), .18, M.brass));
    add(g, pinion(8, .7, .5), 0, .3, 0); add(g, cyl(.18, 1.2, M.steel, 12));
  }
  /* ── keyless works & stem ── */
  {
    const g = part('keyless', 7.1, 3.35, 0, 0, [10.5, 0, -2.6]);
    add(g, extrude(hullShape([[6.2, -1.2, .7], [10.6, -2.8, .9], [9.2, -4.6, .55]]), .3, M.brushed));
    add(g, extrude(hullShape([[7.0, 2.4, .55], [11.2, 1.0, .75]]), .3, M.brushed), 0, .02, 0);
    screw(g, 10.6, .25, -2.8, .42); screw(g, 11.2, .25, 1.0, .38);
    const spring = new THREE.Mesh(new THREE.TorusGeometry(1.4, .07, 6, 40, Math.PI * .8), M.blue); spring.rotation.x = Math.PI / 2; spring.position.set(8.5, .1, 3.2); g.add(spring);
  }
  {
    const g = part('stem', 7.6, 2.4, 0, 0, [23.4, 0, 0]);
    const st = cyl(.42, 13, M.steel, 20); st.rotation.z = Math.PI / 2; add(g, st, 13.2, 0, 0);
    const wp = pinion(14, .9, .9); wp.rotation.z = Math.PI / 2; add(g, wp, 9, 0, 0);
    const cp = pinion(10, .8, 1.1); cp.rotation.z = Math.PI / 2; add(g, cp, 10.6, 0, 0);
    const crownG = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 3.2, 30, 1), new THREE.MeshStandardMaterial({ color: 0xe9ecf0, metalness: 1, roughness: .2, flatShading: true }));
    crownG.rotation.z = Math.PI / 2; add(g, crownG, 22, 0, 0);
    const cap = cyl(2.2, .3, M.caseSteel, 48); cap.rotation.z = Math.PI / 2; add(g, cap, 23.65, 0, 0);
    const logo = cyl(.9, .12, M.blue, 32); logo.rotation.z = Math.PI / 2; add(g, logo, 23.85, 0, 0);
  }
  /* ── mainplate ── */
  {
    const g = part('mainplate', 8.2, 2.5, 0, 0, [-13, 0, 0]);
    const sh = circleShape(13);
    for (const [x, z, r] of [[-7.99, 2.9, 1.2], [6.5, 6.5, 1.1], [-9, -5.5, .9]]) { const h = new THREE.Path(); h.absarc(x, -z, r, 0, TAU, true); sh.holes.push(h); }
    const h2 = new THREE.Path(); h2.absarc(0, 0, .6, 0, TAU, true); sh.holes.push(h2);
    add(g, extrude(sh, 1.2, M.plate, { bevel: .08, seg: 64 }));
    // stepped recess ring
    add(g, extrude(ringShape(13.05, 12.2), .2, M.brushed, { bevel: 0, seg: 96 }), 0, -.6, 0);
    for (const k of ['center', 'third', 'fourth', 'escape', 'pallet', 'balance']) { const [x, z] = P[k]; jewel(g, x, .66, z, .34); }
  }
  /* ── barrel & mainspring ── */
  {
    const [x, z] = P.barrel; const g = part('barrel', 9.1, 1.0, x, z, [5.2, 0, 0]);
    add(g, extrude(gearShape(84, 5.2, 4.98, { bore: 4.3 }), .32, M.brass, { bevel: .02, seg: 8 }), 0, .62, 0);
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 1.5, 96, 1, true), M.brass));
    add(g, new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 1.5, 96, 1, true), M.brushed));
    add(g, extrude(circleShape(4.65, { spokes: 0 }), .14, M.brushed), 0, -.72, 0);
    add(g, cyl(.95, 2.0, M.steel, 24));
    add(g, pinion(3, 1.1, .3), 0, .9, 0);
  }
  {
    const [x, z] = P.barrel; const g = part('mainspring', 8.75, 1.0, x, z, [-4.3, 0, 0]);
    add(g, spiralTube(1.05, 4.2, 11, .05, M.mainspring, 13));
  }
  /* ── going train ── */
  {
    const g = part('center', 10, 1.2, 0, 0, [4.6, 0, 0]);
    add(g, extrude(gearShape(80, 4.6, 4.42, { spokes: 4, hub: .9, rim: 3.9, spokeW: .55 }), .22, M.brass, { bevel: .02, seg: 10 }));
    add(g, pinion(12, 1.0, .7), 0, .6, 0); add(g, cyl(.22, 3.0, M.steel, 12));
  }
  {
    const [x, z] = P.third; const g = part('third', 10.75, .9, x, z, [4.4, 0, 0]);
    add(g, extrude(gearShape(75, 4.4, 4.22, { spokes: 5, hub: .7, rim: 3.7, spokeW: .45, curved: true }), .2, M.brass, { bevel: .02, seg: 10 }));
    add(g, pinion(10, .9, .7), 0, .5, 0); add(g, cyl(.18, 2.6, M.steel, 12));
  }
  {
    const [x, z] = P.fourth; const g = part('fourth', 11.5, .6, x, z, [-3.8, 0, 0]);
    add(g, extrude(gearShape(80, 3.8, 3.64, { spokes: 4, hub: .6, rim: 3.15, spokeW: .4 }), .18, M.brass, { bevel: .02, seg: 10 }));
    add(g, pinion(10, .8, .6), 0, .45, 0); add(g, cyl(.16, 2.4, M.steel, 12));
  }
  {
    const [x, z] = P.escape; const g = part('escape', 12.25, .35, x, z, [-2.25, 0, 0]);
    add(g, extrude(gearShape(15, 2.25, 1.6, { club: true, spokes: 3, hub: .45, rim: 1.25, spokeW: .3 }), .16, M.steel, { bevel: .015, seg: 10 }));
    add(g, pinion(8, .6, .55), 0, .4, 0); add(g, cyl(.14, 2.2, M.steel, 12));
  }
  // pallet fork — local +X points to balance
  const palletDir = Math.atan2(-(P.balance[1] - P.pallet[1]), P.balance[0] - P.pallet[0]);
  {
    const [x, z] = P.pallet; const g = part('pallet', 12.85, .45, x, z, [0, 0, 1.6]);
    const inner = new THREE.Group(); inner.rotation.y = palletDir; g.add(inner); g.userData.inner = inner;
    const body = new THREE.Group(); inner.add(body);
    const ext = s => extrude(s, .2, M.steel, { bevel: .02, seg: 12 });
    // hull in local coords: hullShape expects (x, z) -> shape (x, -z)
    body.add(ext(hullShape([[0, 0, .42], [2.3, 0, .22]])));
    body.add(ext(hullShape([[0, 0, .38], [-1.15, 1.45, .24]])));
    body.add(ext(hullShape([[0, 0, .38], [-1.15, -1.45, .24]])));
    body.add(ext(hullShape([[2.3, .32, .13], [2.75, .38, .1]])));
    body.add(ext(hullShape([[2.3, -.32, .13], [2.75, -.38, .1]])));
    for (const s of [1, -1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.3, .26, .55), M.ruby); st.position.set(-1.35, 0, s * 1.62); st.rotation.y = s * .5; body.add(st); }
    body.add(cyl(.12, 1.8, M.steel, 12));
  }
  /* ── balance & hairspring ── */
  {
    const [x, z] = P.balance; const g = part('balance', 13.5, .15, x, z, [-4.05, 0, 0]);
    const wheel = new THREE.Group(); g.add(wheel); g.userData.inner = wheel;
    wheel.add(extrude(circleShape(4.05, { spokes: 3, hub: .45, rim: 3.6, spokeW: .45 }), .42, M.glucydur, { bevel: .03, seg: 64 }));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + .4; const w = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .9), M.gold); w.position.set(4.25 * Math.cos(a), 0, 4.25 * Math.sin(a)); w.rotation.y = -a; wheel.add(w); }
    wheel.add(cyl(.12, 2.6, M.steel, 12));
    add(wheel, cyl(.72, .12, M.steel, 32), 0, .55, 0);
    add(wheel, cyl(.09, .45, M.ruby, 10), .55, .75, 0);
  }
  {
    const [x, z] = P.balance; const g = part('hairspring', 14.1, -.32, x, z, [2.9, 0, 0]);
    const sp = new THREE.Group(); g.add(sp); g.userData.inner = sp;
    sp.add(spiralTube(.45, 2.85, 13, .032, M.spring, 6));
    sp.add(cyl(.38, .3, M.steel, 20));
    add(g, new THREE.Mesh(new THREE.BoxGeometry(.4, .5, .4), M.steel), 2.95, 0, 0);
  }
  /* ── bridges ── */
  const ex = (s, d, m) => extrude(s, d, m, { bevel: .1, seg: 48 });
  {
    const [bx, bz] = P.balance; const len = Math.hypot(bx, bz); const ox = bx / len * 11.6, oz = bz / len * 11.6;
    const g = part('cock', 14.8, -.85, 0, 0, [ox - 1, 0, oz]);
    add(g, ex(hullShape([[bx, bz, 1.5], [ox, oz, 2.2]]), .55, M.rhod));
    add(g, ex(hullShape([[bx, bz, .95], [bx + (ox - bx) * .1, bz + (oz - bz) * .1, 1.0]]), .25, M.rhod), 0, -.38, 0);
    add(g, cyl(.6, .2, M.gold, 24), bx, -.55, bz); jewel(g, bx, -.62, bz, .38);
    screw(g, ox, -.4, oz, .6);
    // regulator index
    const idx = extrude(hullShape([[bx, bz, .5], [bx + 3.2, bz - 1.6, .16]]), .1, M.steel, { bevel: .01, seg: 12 }); add(g, idx, 0, -.6, 0);
  }
  {
    const g = part('trainbridge', 14.8, -.7, 0, 0, [7.5, 0, 6.5]);
    add(g, ex(hullShape([[P.third[0], P.third[1], 1.7], [P.fourth[0], P.fourth[1], 1.6], [P.escape[0], P.escape[1], 1.2], [5.2, 9.4, 1.5]]), .6, M.rhod));
    add(g, ex(hullShape([[P.pallet[0], P.pallet[1], .8], [-9.8, 7.2, 1.0]]), .5, M.rhod), 0, -.05, 0);
    for (const k of ['third', 'fourth', 'escape']) { const [x, z] = P[k]; add(g, cyl(.62, .1, M.gold, 24), x, -.35, z); }
    screw(g, 5.2, -.35, 9.4); screw(g, -9.8, -.35, 7.2, .45); screw(g, .4, -.35, 6.4, .5);
  }
  {
    const g = part('barrelbridge', 14.8, -.7, 0, 0, [-6.6, 0, -6]);
    add(g, ex(hullShape([[P.barrel[0], P.barrel[1], 5.4], [0, 0, 1.7], [-5.2, -7.4, 1.6], [9.6, -3.0, 1.5]]), .6, M.rhod));
    add(g, cyl(.62, .1, M.gold, 24), 0, -.35, 0);
    screw(g, -5.2, -.35, -7.4); screw(g, 9.6, -.35, -3.0); screw(g, -1.4, -.35, -3.2, .48);
  }
  {
    const g = part('jewels', 15.55, -1.15, 0, 0, [P.fourth[0] - .5, 0, P.fourth[1]]);
    for (const k of ['center', 'third', 'fourth', 'escape', 'pallet']) { const [x, z] = P[k]; jewel(g, x, 0, z, .4); }
    jewel(g, P.barrel[0] + 1.5, 0, P.barrel[1] - 1.2, .45);
  }
  {
    const g = part('screws', 16.05, -1.3, 0, 0, [-9.2, 0, 1]);
    for (const [x, z] of [[-11, 1.5], [11.6, 3.5], [-2, -12.2], [4.5, 11.8]]) screw(g, x, 0, z, .62);
  }
  {
    const [x, z] = P.barrel; const g = part('ratchet', 16.6, -1.35, 0, 0, [x - 3.4, 0, z]);
    const rw = extrude(gearShape(40, 3.4, 3.0, { saw: true }), .4, M.ratchetSun, { bevel: .03, seg: 8 }); add(g, rw, x, 0, z); g.userData.inner = rw;
    screw(g, x, -.35, z, .8);
    const [cx, cz] = P.crownwheel; const cw = extrude(gearShape(28, 1.9, 1.7), .35, M.crownSun, { bevel: .03, seg: 8 }); add(g, cw, cx, 0, cz); g.userData.inner2 = cw;
    screw(g, cx, -.3, cz, .45);
    // click
    add(g, extrude(hullShape([[x + 3.9, z + 1.8, .35], [x + 2.6, z + 3.6, .2]]), .25, M.steel, { bevel: .02, seg: 10 }));
  }
  /* ── rotor ── */
  {
    const g = part('rotor', 17.6, -2.35, 0, 0, [0, 0, -12.6]);
    const r = new THREE.Group(); g.add(r); g.userData.inner = r;
    const plate = new THREE.Shape(); plate.absarc(0, 0, 11.2, Math.PI * .04, Math.PI * .96, false); plate.absarc(0, 0, 1.6, Math.PI * .96, Math.PI * .04 + TAU, true);
    plate.closePath();
    // skeleton windows
    for (const [a0, a1] of [[.22, .44], [.56, .78]]) { const h = new THREE.Path(); h.absarc(0, 0, 9.2, Math.PI * a1, Math.PI * a0, true); h.absarc(0, 0, 4.2, Math.PI * a0, Math.PI * a1, false); h.closePath(); plate.holes.push(h); }
    r.add(extrude(plate, .35, M.rotor, { bevel: .05, seg: 64 }));
    const rimS = new THREE.Shape(); rimS.absarc(0, 0, 12.6, 0, Math.PI, false); rimS.absarc(0, 0, 10.9, Math.PI, 0, true); rimS.closePath();
    add(r, extrude(rimS, 1.0, M.gold, { bevel: .08, seg: 64 }), 0, -.25, 0);
    add(r, cyl(1.7, .9, M.steel, 40));
    const race = new THREE.Mesh(new THREE.TorusGeometry(1.25, .14, 10, 40), M.dark); race.rotation.x = Math.PI / 2; add(r, race, 0, -.46, 0);
    screw(r, 0, -.5, 0, .7);
  }
  /* ── case & caseback ── */
  {
    const g = part('case', 21.9, .9, 0, 0, [-19.8, 0, 0]);
    const prof = [[16.3, -3.5], [18.8, -3.5], [19.5, -2.6], [19.8, 0], [19.5, 2.6], [18.9, 3.4], [16.6, 3.4], [16.3, 2.8]].map(([r, y]) => new THREE.Vector2(r, y));
    add(g, new THREE.Mesh(new THREE.LatheGeometry(prof, 180), M.caseSteel));
    const lugS = new THREE.Shape(); lugS.moveTo(16.5, -2.9); lugS.lineTo(23.2, -2.0); lugS.quadraticCurveTo(24.1, -1.6, 23.9, .4); lugS.quadraticCurveTo(20, 2.9, 16.5, 3.2); lugS.closePath();
    const lugG = new THREE.ExtrudeGeometry(lugS, { depth: 2.5, bevelEnabled: true, bevelThickness: .25, bevelSize: .2, bevelSegments: 3, curveSegments: 16 });
    lugG.rotateY(-Math.PI / 2);
    for (const rot of [0, Math.PI]) for (const xo of [12.75, -10.25]) { const m = new THREE.Mesh(lugG, M.caseSteel); m.position.x = xo; const w = new THREE.Group(); w.add(m); w.rotation.y = rot; g.add(w); }
    const tube = cyl(1.4, 2.2, M.caseSteel, 32); tube.rotation.z = Math.PI / 2; add(g, tube, 20.4, 1.5, 0);
    for (const s of [1, -1]) { const bar = cyl(.35, 20, M.steel, 12); bar.rotation.z = Math.PI / 2; add(g, bar, 0, 0, s * 21.6); }
  }
  {
    const g = part('caseback', 23.1, -3.8, 0, 0, [18.6, 0, 0]);
    const prof = [[12.4, -.8], [18.2, -.8], [18.9, -.2], [18.9, .5], [16.3, .7], [12.4, .5]].map(([r, y]) => new THREE.Vector2(r, y));
    add(g, new THREE.Mesh(new THREE.LatheGeometry(prof, 160), M.caseSteel));
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const n = new THREE.Mesh(new THREE.BoxGeometry(2.2, .4, .8), M.dark); n.position.set(18.2 * Math.cos(a), -.6, 18.2 * Math.sin(a)); n.rotation.y = -a; g.add(n); }
    const win = new THREE.Mesh(new THREE.CylinderGeometry(12.6, 12.6, .9, 96), M.sapph); add(g, win, 0, 0, 0);
  }

  /* ───── per-part material clones (for isolation fades) ───── */
  const meshesOf = {};
  for (const id of order) {
    meshesOf[id] = [];
    parts[id].g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.userData.baseOpacity = o.material.opacity; o.material.userData.baseTransparent = o.material.transparent; o.userData.part = id; meshesOf[id].push(o); } });
  }
  const pickables = order.flatMap(id => meshesOf[id]);

  /* ───── labels & leaders ───── */
  const labelsEl = document.getElementById('labels'), leadersEl = document.getElementById('leaders');
  const ns = 'http://www.w3.org/2000/svg';
  const sorted = [...order].sort((a, b) => parts[a].layer - parts[b].layer);
  sorted.forEach((id, i) => {
    const p = parts[id]; p.no = i + 1;
    const d = document.createElement('div'); d.className = 'lbl'; d.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span class="nm">${p.info.n}</span>`; d.title = p.info.n;
    d.addEventListener('click', () => select(id)); d.addEventListener('mouseenter', () => hover(id)); d.addEventListener('mouseleave', () => hover(null));
    labelsEl.appendChild(d); p.lbl = d;
    const gg = document.createElementNS(ns, 'g'); const path = document.createElementNS(ns, 'path'); const dot = document.createElementNS(ns, 'circle'); dot.setAttribute('r', 2.2);
    gg.append(path, dot); leadersEl.appendChild(gg); p.leader = { gg, path, dot };
  });

  /* ───── interaction ───── */
  const card = { idx: document.getElementById('pcIndex'), name: document.getElementById('pcName'), desc: document.getElementById('pcDesc'), specs: document.getElementById('pcSpecs') };
  let selected = null, hovered = null;
  function hover(id) { hovered = id; for (const k of order) { const on = k === id || k === selected; parts[k].lbl.classList.toggle('hl', on); parts[k].leader.gg.classList.toggle('hl', on); } canvas.style.cursor = id ? 'pointer' : 'grab'; }
  function select(id) {
    selected = selected === id ? null : id;
    for (const k of order) {
      const fade = selected && k !== selected;
      for (const m of meshesOf[k]) { m.material.transparent = fade || m.material.userData.baseTransparent; m.material.opacity = fade ? Math.min(.1, m.material.userData.baseOpacity) : m.material.userData.baseOpacity; m.material.depthWrite = !fade && !m.material.userData.baseTransparent; m.material.needsUpdate = true; }
      parts[k].lbl.style.opacity = fade ? .28 : 1;
    }
    document.getElementById('partCard').classList.toggle('show', !!selected);
    if (selected) {
      const p = parts[selected];
      card.idx.textContent = `${String(p.no).padStart(2, '0')} / ${order.length}`;
      card.name.textContent = p.info.n; card.desc.textContent = p.info.d;
      card.specs.innerHTML = Object.entries(p.info.s || {}).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    } else {
      card.idx.textContent = `— / ${order.length}`; card.name.textContent = 'Click a part';
      card.desc.textContent = 'Each pointer names a component. Click a label or the part itself to isolate it and read what it does. Click again to restore.';
      card.specs.innerHTML = '';
    }
    hover(hovered);
  }
  const step = d => { const i = selected ? sorted.indexOf(selected) : (d > 0 ? -1 : 0); const n = sorted[(i + d + sorted.length) % sorted.length]; selected = null; select(n); };
  document.getElementById('pcNext').onclick = () => step(1);
  document.getElementById('pcPrev').onclick = () => step(-1);

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  const pick = e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(pickables, false).find(h => !selected || h.object.userData.part === selected || h.object.material.opacity > .5); return hit ? hit.object.userData.part : null; };
  let downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', e => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5) { const id = pick(e); if (id) select(id); else if (selected) select(selected); } downAt = null; });
  let lastMove = 0;
  canvas.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || e.buttons) return; const now = performance.now(); if (now - lastMove < 60) return; lastMove = now; const id = pick(e); if (id !== hovered) hover(id); });

  // explode
  const slider = document.getElementById('explode');
  let explode = 0, explodeTarget = +slider.value / 1000, intro = true;
  slider.addEventListener('input', () => { explodeTarget = +slider.value / 1000; intro = false; });
  // view presets
  const views = { hero: [78, 30, 132], side: [0, 6, 156], top: [0, 150, 16], back: [8, -144, 40] };
  let camTarget = null;
  document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === b));
    camTarget = new THREE.Vector3(...views[b.dataset.view]);
  }));
  controls.addEventListener('start', () => { camTarget = null; });
  let showLabels = true, running = true;
  document.getElementById('toggleLabels').onclick = e => { showLabels = !showLabels; e.currentTarget.classList.toggle('active', showLabels); labelsEl.classList.toggle('off', !showLabels); leadersEl.classList.toggle('off', !showLabels); };
  document.getElementById('toggleRun').onclick = e => { running = !running; e.currentTarget.classList.toggle('active', running); };

  /* ───── sizing ───── */
  let W = 1, H = 1, narrow = false;
  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight; narrow = W < 860;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    camera.fov = narrow ? 42 : 30; camera.updateProjectionMatrix();
    leadersEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
  }
  new ResizeObserver(resize).observe(canvas); resize();

  /* ───── animation state ───── */
  let beats = 0; const SLOW = .125; // 8× slow motion so the escapement is legible
  const v = new THREE.Vector3(), center = new THREE.Vector3();
  function layout() {
    for (const id of order) {
      const p = parts[id];
      p.g.position.y = p.y0 + (CENTER - p.layer) * GAP * explode;
      if (id === 'stem') p.g.position.x = explode * 6;
    }
  }
  function animate(dt) {
    if (running) beats += dt * 8 * SLOW;
    // balance: passes through its rest position at each integer beat; amplitude 280°
    const bal = rad(280) * Math.sin(Math.PI * beats);
    parts.balance.g.userData.inner.rotation.y = bal;
    parts.hairspring.g.userData.inner.rotation.y = bal * .2;
    parts.hairspring.g.userData.inner.scale.setScalar(1 + .035 * Math.sin(Math.PI * beats));
    // escapement: unlock + impulse happen in a short window around each crossing
    const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
    const n = Math.round(beats), p = ease((beats - n + .12) / .24);
    const side = i => (((i % 2) + 2) % 2 ? 1 : -1);
    const forkA = rad(9) * (side(n - 1) + (side(n) - side(n - 1)) * p);
    parts.pallet.g.userData.inner.rotation.y = palletDir + forkA;
    const escAngle = (n - 1 + p) * rad(12);
    parts.escape.g.rotation.y = -escAngle;
    parts.fourth.g.rotation.y = escAngle / 16 * 1;
    parts.third.g.rotation.y = -escAngle / 16 / 7.5;
    parts.center.g.rotation.y = escAngle / 16 / 7.5 / 8;
    parts.barrel.g.rotation.y = -escAngle / 16 / 7.5 / 8 / 7;
    parts.mainspring.g.rotation.y = parts.barrel.g.rotation.y;
    // rotor: wrist motion
    const t = performance.now() / 1000;
    const rotA = 1.4 * Math.sin(t * .55) + .5 * Math.sin(t * 1.7 + 1);
    parts.rotor.g.userData.inner.rotation.y = rotA;
    parts.ratchet.g.userData.inner.rotation.y = rotA * .08;
    parts.ratchet.g.userData.inner2.rotation.y = -rotA * .14;
    // hands — real time
    const now = new Date(), ms = now.getMilliseconds(), s = now.getSeconds() + Math.floor(ms / 125) / 8, m = now.getMinutes() + s / 60, h = now.getHours() % 12 + m / 60;
    parts.seconds.g.rotation.y = -s / 60 * TAU;
    parts.minute.g.rotation.y = -m / 60 * TAU;
    parts.hour.g.rotation.y = -h / 12 * TAU;
    parts.hourwheel.g.rotation.y = parts.hour.g.rotation.y;
    parts.cannon.g.rotation.y = parts.minute.g.rotation.y;
    parts.minutewheel.g.rotation.y = -parts.minute.g.rotation.y * (10 / 30);
  }
  function rad(d) { return d * Math.PI / 180; }

  function updateLabels() {
    if (!showLabels) return;
    center.set(0, 0, 0).project(camera);
    const cxScr = (center.x + 1) / 2 * W;
    const items = order.map(id => {
      const p = parts[id];
      v.copy(p.anchor); p.g.localToWorld(v); v.project(camera);
      return { id, x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H, behind: v.z > 1 };
    });
    const spread = narrow ? W / 2 - 34 : Math.min(W * .34, 470, W / 2 - 110);
    const colL = cxScr - spread, colR = narrow ? cxScr + spread : Math.min(cxScr + spread, W - 245);
    const top = narrow ? 64 : 70, bot = H - (narrow ? 70 : 90);
    for (const side of ['L', 'R']) {
      const list = items.filter(it => (it.x < cxScr) === (side === 'L')).sort((a, b) => a.y - b.y);
      const gap = Math.min(narrow ? 17 : 26, (bot - top) / Math.max(1, list.length));
      list.forEach(it => it.ly = Math.max(top, Math.min(bot, it.y)));
      for (let i = 1; i < list.length; i++) if (list[i].ly < list[i - 1].ly + gap) list[i].ly = list[i - 1].ly + gap;
      if (list.length && list[list.length - 1].ly > bot) { list[list.length - 1].ly = bot; for (let i = list.length - 2; i >= 0; i--) if (list[i].ly > list[i + 1].ly - gap) list[i].ly = list[i + 1].ly - gap; }
      for (const it of list) {
        const p = parts[it.id]; const lx = side === 'L' ? colL : colR;
        p.lbl.className = 'lbl ' + (side === 'L' ? 'left' : 'right') + (p.lbl.classList.contains('hl') ? ' hl' : '');
        p.lbl.style.left = lx + 'px'; p.lbl.style.top = it.ly + 'px';
        const ex2 = side === 'L' ? lx + 8 : lx - 8, elbow = side === 'L' ? lx + 28 : lx - 28;
        p.leader.path.setAttribute('d', `M${ex2} ${it.ly} H${elbow} L${it.x.toFixed(1)} ${it.y.toFixed(1)}`);
        p.leader.dot.setAttribute('cx', it.x.toFixed(1)); p.leader.dot.setAttribute('cy', it.y.toFixed(1));
      }
    }
  }

  /* ───── loop ───── */
  let visible = false, last = performance.now(), introT = 0, first = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) { last = performance.now(); requestAnimationFrame(loop); } }, { threshold: .05 }).observe(viewer);
  function loop(now) {
    if (!visible) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (intro) { introT += dt; const t = Math.min(1, introT / 2.6); explode = explodeTarget * (1 - Math.pow(1 - t, 3)); if (t >= 1) intro = false; }
    else explode += (explodeTarget - explode) * Math.min(1, dt * 8);
    if (camTarget) { camera.position.lerp(camTarget, Math.min(1, dt * 3.2)); if (camera.position.distanceTo(camTarget) < .3) camTarget = null; }
    controls.update();
    layout(); animate(dt);
    root.position.y = narrow ? 0 : 0;
    renderer.render(scene, camera);
    updateLabels();
    if (first) { first = false; document.getElementById('viewerLoading').classList.add('done'); }
    requestAnimationFrame(loop);
  }
  document.getElementById('viewerLoading').textContent = `Assembling ${order.length} components…`;
}
