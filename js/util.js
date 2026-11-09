// Shared helpers
export const NS = 'http://www.w3.org/2000/svg';
export const TAU = Math.PI * 2;
export const rad = d => d * Math.PI / 180;

export function el(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
export function h(tag, attrs = {}, html = '') {
  const e = document.createElement(tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (html) e.innerHTML = html;
  return e;
}
export const polar = (r, deg) => [r * Math.sin(rad(deg)), -r * Math.cos(rad(deg))];

/** Calls fn(dt, t) each frame while element is on-screen. */
export function whenVisible(node, fn) {
  let visible = false, raf = 0, last = performance.now();
  const loop = now => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    fn(dt, now / 1000);
    if (visible) raf = requestAnimationFrame(loop);
  };
  new IntersectionObserver(es => {
    const v = es[0].isIntersecting;
    if (v && !visible) { visible = true; last = performance.now(); raf = requestAnimationFrame(loop); }
    if (!v) { visible = false; cancelAnimationFrame(raf); }
  }, { rootMargin: '120px' }).observe(node);
}

/** Shared SVG defs for metallic gradients etc. */
export function metalDefs(svg, id = 'm') {
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
  <linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f4f6f8"/><stop offset=".28" stop-color="#9aa3ae"/>
    <stop offset=".5" stop-color="#e6e9ee"/><stop offset=".72" stop-color="#6d7580"/><stop offset="1" stop-color="#d4d9df"/>
  </linearGradient>
  <linearGradient id="${id}-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff0c4"/><stop offset=".3" stop-color="#c79a4a"/>
    <stop offset=".55" stop-color="#f5dc9a"/><stop offset=".8" stop-color="#8a6326"/><stop offset="1" stop-color="#e9c97f"/>
  </linearGradient>
  <linearGradient id="${id}-rose" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffe2d2"/><stop offset=".3" stop-color="#c5826a"/>
    <stop offset=".55" stop-color="#f4c4ad"/><stop offset=".8" stop-color="#8d4f3c"/><stop offset="1" stop-color="#e8b39c"/>
  </linearGradient>
  <linearGradient id="${id}-hand" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#8a6326"/><stop offset=".5" stop-color="#fff0c4"/><stop offset=".5" stop-color="#b48a3e"/><stop offset="1" stop-color="#e2c27a"/>
  </linearGradient>
  <linearGradient id="${id}-handS" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#6d7580"/><stop offset=".5" stop-color="#ffffff"/><stop offset=".5" stop-color="#9aa3ae"/><stop offset="1" stop-color="#e6e9ee"/>
  </linearGradient>
  <radialGradient id="${id}-crystal" cx=".35" cy=".25" r=".9">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".35" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <filter id="${id}-shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2" dy="4" stdDeviation="3" flood-opacity=".55"/></filter>
  <filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>`;
  return defs;
}

export const fmt = n => n.toLocaleString('en-US');
export const usd = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.0+$/, '') + 'M' : '$' + fmt(Math.round(n));

/** Seven-segment digit as SVG string. seg map: a b c d e f g */
const SEG = { 0:'abcdef',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgedc',7:'abc',8:'abcdefg',9:'abcdfg','-':'g',' ':'', A:'abcefg', L:'fed', P:'abefg', H:'bcefg', C:'adef', E:'adefg', S:'afgcd', T:'fged', U:'bcdef', R:'eg', O:'abcdef', N:'ceg', D:'bcdeg', M:'aceg', I:'bc', F:'aefg', W:'bdf' };
export function sevenSeg(ch, on = '#111', off = 'rgba(0,0,0,.06)', w = 40, hgt = 70) {
  const s = SEG[ch] ?? '';
  const t = 7, k = 3; // thickness, skew
  const W = w, H = hgt, m = H / 2;
  const segs = {
    a: `M${t+k} 1 L${W-t+k} 1 L${W-t*1.6+k} ${t+1} L${t*1.6+k} ${t+1}Z`,
    g: `M${t*.8+k/2} ${m} L${t*1.6+k/2} ${m-t/2} L${W-t*1.6+k/2} ${m-t/2} L${W-t*.8+k/2} ${m} L${W-t*1.6+k/2} ${m+t/2} L${t*1.6+k/2} ${m+t/2}Z`,
    d: `M${t*1.6} ${H-t-1} L${W-t*1.6} ${H-t-1} L${W-t} ${H-1} L${t} ${H-1}Z`,
    f: `M${k} ${t*.8} L${t+k} ${t*1.8} L${t+k/2} ${m-t*.8} L${k/2} ${m-t*.2} Z`,
    b: `M${W+k} ${t*.8} L${W-t+k} ${t*1.8} L${W-t+k/2} ${m-t*.8} L${W+k/2} ${m-t*.2} Z`,
    e: `M${k/2} ${m+t*.2} L${t+k/2} ${m+t*.8} L${t} ${H-t*1.8} L0 ${H-t*.8} Z`,
    c: `M${W+k/2} ${m+t*.2} L${W-t+k/2} ${m+t*.8} L${W-t} ${H-t*1.8} L${W} ${H-t*.8} Z`,
  };
  let out = `<svg viewBox="-2 -2 ${W + 8} ${H + 4}" xmlns="${NS}">`;
  for (const k2 of 'abcdefg') out += `<path d="${segs[k2]}" fill="${s.includes(k2) ? on : off}"/>`;
  return out + '</svg>';
}
