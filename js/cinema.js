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
  const pre = $('.intro-pre');
  pre.innerHTML = [...pre.textContent].map(ch => `<span style="display:inline-block">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');
  G.ticker.lagSmoothing(0);
  const tl = G.timeline({ onComplete: () => { G.ticker.lagSmoothing(500, 33); finish(); }, defaults: { ease: 'power2.out' } });
  if (seen) tl.timeScale(1.8);
  tl.from(pre.children, { opacity: 0, filter: 'blur(10px)', y: 10, stagger: .05, duration: 1.1 })
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
    nodes = [...nodes].filter(n => !n.dataset.rv); if (!nodes.length) return;
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
  G.to('#heroWatchWrap', { scale: 1.3, yPercent: 16, rotate: 10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.hero-copy', { yPercent: -28, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  G.to('.beam', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '80% top', scrub: true } });

  // chapter title cards
  $$('.chapter-head').forEach(head => {
    const lines = splitLines(head.querySelector('h2'));
    const tl = G.timeline({ scrollTrigger: { trigger: head, start: 'top 80%' } });
    tl.from(head.querySelector('.chapter-no'), { opacity: 0, x: -40, duration: 1, ease: 'expo.out' })
      .from(lines, { yPercent: 118, rotate: 3, duration: 1.4, stagger: .13, ease: 'expo.out' }, '<.05')
      .from(head.querySelector('.chapter-intro'), { opacity: 0, y: 26, duration: 1.1, ease: 'power3.out' }, '<.45')
      .from(head.querySelectorAll('.complexity i'), { scale: 0, rotate: -180, stagger: .07, duration: .7, ease: 'back.out(3)' }, '<.25');
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
  dust();
  cursor();
  if (!G || !ST) { $('#intro')?.remove(); document.body.classList.remove('is-intro'); fallbackReveal(); return; }
  intro(() => { choreograph(); ST.refresh(); });
}
