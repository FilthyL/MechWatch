// ═══════════════════════════════════════════════════════════════
//  Cinema: opening titles, dust, loupe cursor, scroll choreography
// ═══════════════════════════════════════════════════════════════
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const G = window.gsap, ST = window.ScrollTrigger;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function navAndProgress() {
  const nav = $('#nav'), bar = $('#progressBar');
  const links = $$('.nav-links a');
  const sections = links.map(a => document.querySelector(a.getAttribute('href')));
  const onScroll = () => {
    const y = scrollY, H = document.documentElement.scrollHeight - innerHeight;
    nav.classList.toggle('scrolled', y > 30);
    bar.style.width = (y / Math.max(1, H) * 100) + '%';
    let cur = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === cur));
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#navBurger').onclick = () => $('#navLinks').classList.toggle('open');
  links.forEach(a => a.addEventListener('click', () => $('#navLinks').classList.remove('open')));
  const t = $('#navTime');
  setInterval(() => { t.textContent = new Date().toLocaleTimeString('en-GB'); }, 250);
}

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; }
const P = (r, deg) => [r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180)];

/* The page is a dial: twelve chapters are twelve hours. */
function navDial() {
  const host = $('#navdial'); if (!host) return;
  const secs = [['#top', 'Overture', 'XII'], ['#history', 'Prologue', 'I'], ['#anatomy', 'Anatomy', 'II'], ['#quartz', 'Quartz', 'III'], ['#movement', 'The Movement', 'IV'], ['#escapement', 'Escapement', 'V'], ['#blueprints', 'Blueprints', 'VI'], ['#complications', 'Complications', 'VII'], ['#calibers', 'Calibres', 'VIII'], ['#digital', 'Digital', 'IX'], ['#vault', 'The Vault', 'X'], ['#garbage', 'Smartwatches', 'XI']].map(([sel, n, r]) => ({ el: $(sel), n, r, sel })).filter(x => x.el);
  const svg = svgEl('svg', { viewBox: '-70 -70 140 140', role: 'img', 'aria-label': 'Chapter dial' }, host);
  svg.innerHTML = `<defs><linearGradient id="nd-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".3" stop-color="#c79a4a"/><stop offset=".55" stop-color="#f5dc9a"/><stop offset=".8" stop-color="#7a5520"/><stop offset="1" stop-color="#e9c97f"/></linearGradient>
    <radialGradient id="nd-d" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#4a2a14"/><stop offset=".7" stop-color="#22120a"/><stop offset="1" stop-color="#0d0704"/></radialGradient></defs>
    <circle r="66" fill="url(#nd-g)"/><circle r="61" fill="#0d0805"/><circle id="nd-prog" r="63.5" fill="none" stroke="#fff0c4" stroke-width="2.2" stroke-dasharray="0 400" transform="rotate(-90)" opacity=".9"/>
    <circle r="58" fill="url(#nd-d)"/>`;
  for (let i = 0; i < 60; i++) { const [x1, y1] = P(57, i * 6), [x2, y2] = P(i % 5 ? 54.5 : 51, i * 6); svgEl('line', { x1, y1, x2, y2, stroke: '#e9d6a6', 'stroke-width': i % 5 ? .4 : 1, opacity: i % 5 ? .45 : .9 }, svg); }
  const marks = secs.map((s, i) => { const g = svgEl('g', { class: 'nd-mark' }, svg); const [x, y] = P(42, i * 30); svgEl('circle', { cx: x, cy: y, r: 9 }, g); const t = svgEl('text', { x, y: y + 3.2, 'text-anchor': 'middle' }, g); t.textContent = s.r; g.addEventListener('click', () => s.el.scrollIntoView({ behavior: 'smooth' })); return g; });
  const crown = svgEl('g', { transform: 'translate(66 0)' }, svg);
  svgEl('rect', { x: 0, y: -7, width: 8, height: 14, rx: 2, fill: 'url(#nd-g)' }, crown);
  const knurl = svgEl('g', {}, crown); for (let k = 0; k < 6; k++) svgEl('line', { x1: 1, x2: 7, y1: -6 + k * 2.4, y2: -6 + k * 2.4, stroke: '#5a3f17', 'stroke-width': .7 }, knurl);
  const hand = (len, w, col) => { const g = svgEl('g', {}, svg); svgEl('path', { d: `M-${w} 6 L-${w * .6} -${len} L0 -${len + 3} L${w * .6} -${len} L${w} 6Z`, fill: col }, g); return g; };
  const H = hand(30, 2.6, 'url(#nd-g)'), M = hand(44, 1.8, 'url(#nd-g)');
  const S = svgEl('g', {}, svg); svgEl('line', { x1: 0, y1: 10, x2: 0, y2: -52, stroke: '#c2183b', 'stroke-width': .9 }, S);
  svgEl('circle', { r: 3, fill: 'url(#nd-g)' }, svg);
  const ul = document.createElement('ul'); ul.className = 'nd-list'; host.appendChild(ul);
  secs.forEach(s => { const li = document.createElement('li'); li.innerHTML = `<i>${s.r}</i>${s.n}`; li.onclick = () => s.el.scrollIntoView({ behavior: 'smooth' }); ul.appendChild(li); s.li = li; });
  const prog = svg.querySelector('#nd-prog'), C = 2 * Math.PI * 63.5;
  let cur = 0, frac = 0;
  const update = () => {
    const y = scrollY + innerHeight * .35, H2 = document.documentElement.scrollHeight - innerHeight;
    cur = 0; secs.forEach((s, i) => { if (s.el.getBoundingClientRect().top + scrollY <= y) cur = i; });
    const a = secs[cur].el.getBoundingClientRect().top + scrollY, b = secs[cur + 1] ? secs[cur + 1].el.getBoundingClientRect().top + scrollY : document.documentElement.scrollHeight;
    frac = Math.min(1, Math.max(0, (y - a) / Math.max(1, b - a)));
    prog.setAttribute('stroke-dasharray', `${(scrollY / Math.max(1, H2)) * C} ${C}`);
    marks.forEach((m, i) => m.classList.toggle('cur', i === cur)); secs.forEach((s, i) => s.li.classList.toggle('cur', i === cur));
    knurl.setAttribute('transform', `translate(0 ${((scrollY / 6) % 2.4).toFixed(2)})`);
    host.classList.toggle('on', scrollY > innerHeight * .6);
  };
  addEventListener('scroll', update, { passive: true }); update();
  const tick = () => {
    const ha = (cur + frac) * 30, ma = frac * 360, d = new Date(), sa = (d.getSeconds() + Math.floor(d.getMilliseconds() / 125) / 8) * 6;
    H.setAttribute('transform', `rotate(${ha})`); M.setAttribute('transform', `rotate(${ma})`); S.setAttribute('transform', `rotate(${sa})`);
    requestAnimationFrame(tick);
  };
  tick();
  // the top bar steps aside while you read, and returns when you scroll back
  let lastY = scrollY; const nav = $('#nav');
  addEventListener('scroll', () => { const y = scrollY; nav.classList.toggle('hide', y > lastY && y > innerHeight * .8 && !document.body.classList.contains('insp-open')); lastY = y; }, { passive: true });
}

/* A rotating dive-bezel behind every chapter title. */
function bezelRings() {
  $$('.chapter-head').forEach(head => {
    const roman = head.querySelector('.roman'); if (!roman) return;
    const ring = document.createElement('div'); ring.className = 'bezel-ring'; ring.setAttribute('aria-hidden', 'true');
    const isBin = roman.classList.contains('roman-bin'), col = isBin ? 'rgba(179,32,63,.5)' : 'rgba(201,163,90,.5)';
    let s = `<svg viewBox="-200 -200 400 400"><circle r="196" fill="none" stroke="${col}" stroke-width=".8"/><circle r="186" fill="none" stroke="${col}" stroke-width=".5"/><circle r="150" fill="none" stroke="${col}" stroke-width=".8"/><circle r="146" fill="none" stroke="${col}" stroke-width=".3" stroke-dasharray="1 3"/><g class="rot">`;
    for (let i = 0; i < 60; i++) { const [x1, y1] = P(186, i * 6), [x2, y2] = P(i % 5 ? 178 : i < 15 ? 160 : 170, i * 6); if (i) s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${i % 5 ? .6 : 1.4}"/>`; }
    for (let i = 10; i < 60; i += 10) { const [x, y] = P(166, i * 6); s += `<text x="${x}" y="${y + 6}" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="18" fill="${col}" transform="rotate(${i * 6} ${x} ${y})">${i}</text>`; }
    s += `<path d="M0 -150 l-12 -22 h24z" fill="${col}"/></g><text y="44" text-anchor="middle" font-family="Bodoni Moda, serif" font-size="128" font-style="italic" fill="none" stroke="${col}" stroke-width=".9">${roman.textContent}</text></svg>`;
    ring.innerHTML = s; head.appendChild(ring); head.classList.add('has-ring');
  });
}

function dust() {
  const c = $('#dust'), ctx = c.getContext('2d');
  let W, H; const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
  resize(); addEventListener('resize', resize);
  const P = Array.from({ length: 80 }, (_, i) => ({ x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75, r: .4 + Math.random() * 1.6, ph: Math.random() * 6.3, bokeh: i < 7 }));
  P.filter(p => p.bokeh).forEach(p => { p.r = 18 + Math.random() * 40; p.z = .15 + Math.random() * .2; });
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!document.hidden && !reduce) {
      ctx.clearRect(0, 0, W, H);
      const sy = scrollY;
      for (const p of P) {
        p.y -= dt * .012 * p.z; p.x += dt * .006 * Math.sin(now / 4000 + p.ph) * p.z;
        if (p.y < -.05) p.y += 1.1; if (p.x < -.05) p.x += 1.1; if (p.x > 1.05) p.x -= 1.1;
        const x = p.x * W, y = ((p.y * H - sy * .15 * p.z) % H + H) % H;
        const tw = .5 + .5 * Math.sin(now / 900 + p.ph * 3);
        if (p.bokeh) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
          g.addColorStop(0, `rgba(255,200,120,${.05 * tw + .02})`); g.addColorStop(1, 'rgba(255,200,120,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(255,222,170,${(.25 + .55 * tw) * p.z})`;
          ctx.beginPath(); ctx.arc(x, y, p.r * p.z, 0, 6.283); ctx.fill();
        }
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function cursor() {
  if (matchMedia('(hover: none), (pointer: coarse)').matches) return;
  const c = $('#cursor'); let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; c.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => c.classList.remove('on'));
  document.addEventListener('pointerover', e => c.classList.toggle('hot', !!e.target.closest('a,button,input,.lbl,.pt,.watch-card,#movementCanvas,.tl-item,.bp-tabs')));
  const loop = () => { x += (tx - x) * .22; y += (ty - y) * .22; c.style.transform = `translate(${x}px,${y}px)`; requestAnimationFrame(loop); };
  loop();
}

function splitLines(h) {
  if (h.dataset.split) return h.querySelectorAll('.li');
  h.dataset.split = 1;
  h.innerHTML = h.innerHTML.split(/<br\s*\/?>/i).map(p => `<span class="lm"><span class="li">${p.trim()}</span></span>`).join('');
  return h.querySelectorAll('.li');
}

function fallbackReveal() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .1 });
  window.mwReveal = nodes => [...nodes].forEach(n => { n.classList.add('reveal'); io.observe(n); });
  window.mwReveal($$('.chapter-head, .frame, .fact, .flow li, .tech-strip > div, .reject, .gl'));
  $$('.reject').forEach(r => r.classList.add('stamped'));
}

function intro(onDone) {
  const el = $('#intro');
  const finish = () => { if (!el.isConnected) return; el.remove(); document.body.classList.remove('is-intro'); onDone(); };
  if (!G || reduce) { G && G.set('#heroWatchWrap', { clearProps: 'all' }); finish(); return; }
  let seen = false; try { seen = sessionStorage.getItem('mw-intro') === '1'; sessionStorage.setItem('mw-intro', '1'); } catch (e) { }
  const wsvg = $('#introWindSvg');
  if (wsvg) {
    let g = `<defs><linearGradient id="iw-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0c4"/><stop offset=".35" stop-color="#c79a4a"/><stop offset=".6" stop-color="#f5dc9a"/><stop offset="1" stop-color="#7a5520"/></linearGradient></defs>`;
    g += `<circle r="118" fill="none" stroke="rgba(201,163,90,.25)"/><circle r="104" fill="none" stroke="rgba(201,163,90,.15)" stroke-dasharray="1 4"/>`;
    for (let i = 0; i <= 42; i += 6) { const a = -120 + i / 42 * 240, [x1, y1] = P(96, a), [x2, y2] = P(86, a), [tx, ty] = P(74, a); g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c9a35a" stroke-width="1.2"/><text x="${tx}" y="${ty + 4}" text-anchor="middle" font-family="JetBrains Mono" font-size="10" fill="#8a6a32">${i}</text>`; }
    g += `<path id="iwArc" d="M${P(108, -120).join(' ')} A108 108 0 1 1 ${P(108, 120).join(' ')}" fill="none" stroke="url(#iw-g)" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="0 1"/>`;
    g += `<g id="iwHand"><path d="M-2 10 L0 -84 L2 10Z" fill="url(#iw-g)"/></g><circle r="5" fill="url(#iw-g)"/>`;
    g += `<g id="iwCrown" transform="translate(0 -128)"><rect x="-9" y="-10" width="18" height="12" rx="3" fill="url(#iw-g)"/><g id="iwKnurl">${Array.from({ length: 7 }, (_, k) => `<line x1="${-8 + k * 2.6}" y1="-9" x2="${-8 + k * 2.6}" y2="1" stroke="#5a3f17" stroke-width=".8"/>`).join('')}</g></g>`;
    wsvg.innerHTML = g;
  }
  const pre = $('.intro-pre');
  pre.innerHTML = [...pre.textContent].map(ch => `<span style="display:inline-block">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  G.ticker.lagSmoothing(0);
  const tl = G.timeline({ onComplete: () => { G.ticker.lagSmoothing(500, 33); finish(); }, defaults: { ease: 'power2.out' } });
  if (seen) tl.timeScale(1.8);
  const wind = { v: 0 };
  G.set('.intro-card', { opacity: 0 });
  tl.from('#introWind', { opacity: 0, scale: .9, duration: .6 })
    .to(wind, { v: 1, duration: 1.7, ease: 'power2.inOut', onUpdate: () => { const a = $('#iwArc'); a && a.setAttribute('stroke-dasharray', `${wind.v} 1`); const h = $('#iwHand'); h && h.setAttribute('transform', `rotate(${-120 + wind.v * 240})`); const k = $('#iwKnurl'); k && k.setAttribute('transform', `translate(${(wind.v * 140) % 2.6} 0)`); const t = $('#iwPct'); if (t) t.textContent = Math.round(wind.v * 42) + ' h'; } }, '<.1')
    .to('.iw-cap span', { duration: .01, onComplete: () => { const c = $('.iw-cap span'); if (c) c.textContent = 'Fully wound'; } })
    .to('#introWind', { opacity: 0, scale: 1.25, filter: 'blur(10px)', duration: .7, ease: 'power2.in' }, '+=.25')
    .set('.intro-card', { opacity: 1 })
    .from(pre.children, { opacity: 0, filter: 'blur(10px)', y: 10, stagger: .045, duration: 1 })
    .from('.intro-sub', { opacity: 0, y: 12, duration: 1 }, '-=.5')
    .to('.intro-card', { opacity: 0, scale: 1.08, filter: 'blur(8px)', duration: .9, ease: 'power2.in' }, '+=.5')
    .fromTo('#flare', { opacity: 0, scaleX: .1, xPercent: -30 }, { opacity: 1, scaleX: 1, xPercent: 0, duration: .45, ease: 'power3.in' }, '-=.35')
    .to('#flare', { opacity: 0, xPercent: 30, scaleY: 6, duration: .7, ease: 'power2.out' })
    .to(el, { backgroundColor: 'rgba(5,3,2,0)', duration: 1.6, ease: 'power2.inOut' }, '-=.8')
    .to('.intro .bar-t', { yPercent: -100, duration: 1.6, ease: 'expo.inOut' }, '<')
    .to('.intro .bar-b', { yPercent: 100, duration: 1.6, ease: 'expo.inOut' }, '<')
    .from('#heroWatchWrap', { scale: 2.1, rotate: -24, filter: 'blur(8px) brightness(.25)', opacity: 0, duration: 2.6, ease: 'expo.out', clearProps: 'filter,transform,opacity' }, '<-.3')
    .from(splitLines($('#heroTitle')), { yPercent: 115, duration: 1.5, stagger: .16, ease: 'expo.out' }, '<+.55')
    .from('.eyebrow', { opacity: 0, letterSpacing: '1.2em', duration: 1.6, ease: 'expo.out' }, '<')
    .from(['#heroLede', '#heroCta', '#heroStats'], { opacity: 0, y: 34, stagger: .14, duration: 1.2, ease: 'power3.out' }, '<+.4')
    .from('#nav', { yPercent: -100, opacity: 0, duration: 1.1, ease: 'expo.out' }, '<')
    .from('.scroll-cue', { opacity: 0, duration: 1 }, '<+.4');
  const skip = () => { if (tl.progress() < 1) tl.progress(1); };
  $('#introSkip').addEventListener('click', skip);
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, skip, { once: true, passive: true }));
}

function choreograph() {
  G.registerPlugin(ST);
  const mm = G.matchMedia();

  // dynamic reveal helper used by lazy modules
  window.mwReveal = nodes => {
    nodes = [...nodes].filter(n => n && !n.dataset.rv); if (!nodes.length) return;
    nodes.forEach(n => n.dataset.rv = 1);
    G.set(nodes, { opacity: 0, y: 60 });
    ST.batch(nodes, {
      start: 'top 94%', once: true,
      onEnter: b => {
        G.to(b, { opacity: 1, y: 0, stagger: .09, duration: 1.2, ease: 'expo.out', overwrite: true });
        b.forEach(card => { const spot = card.querySelector('.spot'); if (spot) G.fromTo(spot, { opacity: 0 }, { keyframes: { opacity: [0, .8, .1, .55, .2, .7, .6] }, duration: 1.3, delay: .3, onComplete: () => G.set(spot, { clearProps: 'opacity' }) }); });
      },
    });
  };

  // hero push-in as you leave
  G.to('#heroWatchWrap', { scale: 1.12, yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true, onUpdate: self => window.MW_HERO && window.MW_HERO.setProgress(self.progress) } });
  G.to('.hero-copy', { yPercent: -28, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.beam', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '80% top', scrub: true } });

  // chapter title cards
  $$('.chapter-head').forEach(head => {
    const lines = splitLines(head.querySelector('h2'));
    const tl = G.timeline({ scrollTrigger: { trigger: head, start: 'top 80%' } });
    tl.from(head.querySelector('.chapter-no'), { opacity: 0, x: -40, duration: 1, ease: 'expo.out' })
      .from(lines, { yPercent: 118, rotate: 3, filter: 'blur(6px)', duration: 1.5, stagger: .13, ease: 'expo.out' }, '<.05')
      .from(head.querySelector('.chapter-intro'), { opacity: 0, y: 26, duration: 1.1, ease: 'power3.out' }, '<.45');
    const ci = head.querySelectorAll('.complexity i'); if (ci.length) tl.from(ci, { scale: 0, rotate: -180, stagger: .07, duration: .7, ease: 'back.out(3)' }, '<.25');
    const roman = head.querySelector('.roman');
    if (roman) G.fromTo(roman, { yPercent: 40, opacity: 0 }, { yPercent: -30, opacity: 1, ease: 'none', scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  window.mwReveal($$('.anatomy-card, #anatomySvg, .quartz-stage, .divider, .fact, .flow li, .esc-stage, .phase, .beat-lab, .comp, .hierarchy, .dig-card, .lcd-layers, .tech-strip > div, .auctions, .reject, .gl, .bp-notes'));

  mm.add('(min-width: 861px)', () => {
    // prologue: horizontal pinned travel
    const track = $('#timeline'), pin = $('#timelinePin');
    const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth + 120);
    const tw = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'center 55%', end: () => '+=' + dist() * 1.1, pin: true, scrub: 1, invalidateOnRefresh: true } });
    track.querySelectorAll('.tl-item').forEach(it => G.from(it, { opacity: .12, y: 50, rotateY: -28, transformPerspective: 900, ease: 'none', scrollTrigger: { trigger: it, containerAnimation: tw, start: 'left 100%', end: 'left 62%', scrub: true } }));

    // the movement comes apart under your thumb
    ST.create({
      trigger: '#viewerPin', start: 'top 64px', end: '+=1500', pin: true, anticipatePin: 1,
      onUpdate: self => { window.MW3D_progress = self.progress; window.MW3D && window.MW3D.scrub(self.progress); },
    });
  });

  // rotating chapter bezels
  $$('.bezel-ring .rot').forEach(r => G.fromTo(r, { rotate: -60, svgOrigin: '0 0' }, { rotate: 90, svgOrigin: '0 0', ease: 'none', scrollTrigger: { trigger: r.closest('.chapter-head'), start: 'top bottom', end: 'bottom top', scrub: true } }));
  $$('.bezel-ring').forEach(r => G.from(r, { opacity: 0, scale: .7, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: r.closest('.chapter-head'), start: 'top 85%' } }));
  // aperture: whole worlds open like an iris as you arrive
  $$('.chapter-blueprint, .chapter-lux, .chapter-bin, .chapter-digital, .chapter-rich').forEach(sec => {
    G.fromTo(sec, { clipPath: 'circle(6% at 50% 18%)' }, { clipPath: 'circle(150% at 50% 18%)', ease: 'none', scrollTrigger: { trigger: sec, start: 'top 98%', end: 'top 8%', scrub: true } });
  });
  // blueprint sheet lands on the drafting table
  G.fromTo('.bp-sheet', { rotateX: 34, y: 90, scale: .9, opacity: .35 }, { rotateX: 0, y: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.bp-table', start: 'top 100%', end: 'top 25%', scrub: true } });

  // REJECTED stamps
  $$('.reject').forEach(r => ST.create({ trigger: r, start: 'top 72%', once: true, onEnter: () => { setTimeout(() => { r.classList.add('stamped'); G.fromTo(r, { x: -4, y: 2 }, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.3)', delay: .32 }); }, 250); } }));

  // end credits
  G.from('.fin, .credit, .col-watch, .footer-title, .credits .small', { opacity: 0, y: 70, filter: 'blur(6px)', stagger: .16, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.credits', start: 'top 65%' } });

  // refresh when lazy content changes layout
  let rt; window.mwRefresh = () => { clearTimeout(rt); rt = setTimeout(() => ST.refresh(), 200); };
  addEventListener('load', () => ST.refresh());
}

export function initCinema() {
  navAndProgress();
  navDial();
  bezelRings();
  dust();
  cursor();
  if (!G || !ST) { $('#intro')?.remove(); document.body.classList.remove('is-intro'); fallbackReveal(); return; }
  intro(() => { choreograph(); ST.refresh(); });
}
