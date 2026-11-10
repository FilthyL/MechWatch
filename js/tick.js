// A quiet escapement for the whole book: eight ticks a second (28,800 vph), landing on
// the same 125 ms marks as every seconds hand on the page. Off until you ask for it.
let ac = null, noise = null, timer = null, next = 0, beat = 0;

function voice(t, hi) {
  const src = ac.createBufferSource(); src.buffer = noise;
  const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hi ? 4300 : 3400; f.Q.value = 7;
  const g = ac.createGain(); g.gain.setValueAtTime(hi ? .2 : .14, t); g.gain.exponentialRampToValueAtTime(.0004, t + .028);
  src.connect(f).connect(g).connect(ac.destination); src.start(t); src.stop(t + .032);
}
function align() {
  const ms = Date.now(), wait = 125 - (ms % 125);
  next = ac.currentTime + wait / 1000; beat = Math.round((ms + wait) / 125);
}
function schedule() { while (next < ac.currentTime + .25) { voice(next, beat % 2 === 0); next += .125; beat++; } }

export function initTick(btn) {
  if (!btn || !(window.AudioContext || window.webkitAudioContext)) { btn && btn.remove(); return; }
  let on = false;
  const start = () => { ac.resume().then(() => { align(); clearInterval(timer); timer = setInterval(schedule, 60); schedule(); }); };
  btn.addEventListener('click', () => {
    on = !on; btn.setAttribute('aria-pressed', String(on)); btn.title = on ? 'Silence the escapement' : 'Hear the escapement';
    if (!on) { clearInterval(timer); if (ac) ac.suspend(); return; }
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      noise = ac.createBuffer(1, Math.round(ac.sampleRate * .03), ac.sampleRate);
      const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
    }
    start();
  });
  document.addEventListener('visibilitychange', () => { if (!on || !ac) return; if (document.hidden) { clearInterval(timer); ac.suspend(); } else start(); });
}
