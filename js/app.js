/* Presenter: scales the 1920x1080 stage, runs slides, steps, keyboard & touch navigation. */
(function () {
  'use strict';
  const KA = window.KA, Setup = window.KASetup, Slides = window.KASlides.slides;
  const $ = (s) => document.querySelector(s);
  const setupEl = $('#setup'), presEl = $('#present'), stage = $('#stage'), slideHost = $('#slides');
  let deck = [], idx = 0, step = 0, analysis = null, ctx = null, hideTimer = null;

  /* ---------- scale stage ---------- */
  function fit() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.setProperty('--s', s);
  }
  addEventListener('resize', fit);

  /* ---------- confetti ---------- */
  const cv = $('#confetti'), cx = cv.getContext('2d'); let parts = [], raf = 0;
  function confetti() {
    cv.width = 1920; cv.height = 1080; parts = [];
    const cols = ['#ff7a1a', '#f6c453', '#ff3d5a', '#2dd4bf', '#fff4e0'];
    for (let i = 0; i < 260; i++) parts.push({ x: 960 + (Math.random() - .5) * 300, y: 640, vx: (Math.random() - .5) * 34, vy: -Math.random() * 36 - 8, g: .55 + Math.random() * .3, r: 6 + Math.random() * 10, c: cols[i % cols.length], a: Math.random() * 6, va: (Math.random() - .5) * .4, life: 260 + Math.random() * 120 });
    cancelAnimationFrame(raf);
    (function tick() {
      cx.clearRect(0, 0, 1920, 1080);
      parts.forEach((p) => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .992; p.a += p.va; p.life--; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.globalAlpha = Math.max(0, Math.min(1, p.life / 60)); cx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); cx.restore(); });
      parts = parts.filter((p) => p.life > 0 && p.y < 1200);
      if (parts.length) raf = requestAnimationFrame(tick); else cx.clearRect(0, 0, 1920, 1080);
    })();
  }

  /* ---------- deck ---------- */
  function buildDeck() {
    const resolved = Setup.resolved();
    analysis = KA.analyze(resolved);
    const imgs = Setup.state.images;
    ctx = { cfg: Setup.state.cfg, img: (k) => imgs[k] || null };
    deck = Slides.map((s) => ({ ...s, steps: s.stepCount ? s.stepCount(analysis) : s.steps }));
    const dots = $('#dots');
    dots.innerHTML = deck.map((s, i) => `<button data-go="${i}" title="${s.section}"></button>`).join('');
  }

  function countUp(root) {
    root.querySelectorAll('[data-count]').forEach((el) => {
      const to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1400;
      (function f(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }

  function applyStep() {
    const el = slideHost.firstElementChild; if (!el) return;
    el.querySelectorAll('[data-step]').forEach((n) => n.classList.toggle('on', step >= +n.dataset.step));
    el.querySelectorAll('[data-hide-from]').forEach((n) => n.classList.toggle('gone', step >= +n.dataset.hideFrom));
    for (let i = 1; i <= 12; i++) el.classList.toggle('st-' + i, step >= i);
    const d = deck[idx];
    if (d.finale && step === 2) confetti();
    $('#counter').textContent = `${idx + 1} / ${deck.length}` + (d.steps ? ` · ${step}/${d.steps}` : '');
  }

  function show(i, s = 0, dir = 1) {
    idx = Math.max(0, Math.min(deck.length - 1, i)); step = s;
    const d = deck[idx];
    const el = document.createElement('section');
    el.className = `slide s-${d.id} ${d.finale ? 'finale-slide' : ''}`;
    el.dataset.dir = dir;
    el.innerHTML = d.render(analysis, ctx) + `<footer class="slide-foot"><span>${window.KASlides.esc(ctx.cfg.title)}</span><span>${d.section}</span></footer>`;
    slideHost.innerHTML = ''; slideHost.appendChild(el);
    el.getBoundingClientRect();
    requestAnimationFrame(() => { el.classList.add('active'); countUp(el); });
    applyStep();
    [...$('#dots').children].forEach((b, k) => b.classList.toggle('cur', k === idx));
    $('#progress i').style.width = ((idx) / (deck.length - 1)) * 100 + '%';
    try { sessionStorage.setItem('ka-pos', idx); } catch (e) { /* ignore */ }
  }

  function next() {
    const d = deck[idx];
    if (step < (d.steps || 0)) { step++; applyStep(); } else if (idx < deck.length - 1) show(idx + 1, 0, 1);
  }
  function prev() {
    if (step > 0) { step--; applyStep(); } else if (idx > 0) { const p = deck[idx - 1]; show(idx - 1, p.steps || 0, -1); }
  }

  /* ---------- views ---------- */
  function openPresent() {
    try { buildDeck(); } catch (e) { console.error(e); alert('Something went wrong building the slides: ' + e.message); return; }
    setupEl.hidden = true; presEl.hidden = false; document.body.classList.add('presenting');
    fit();
    let start = 0; try { start = +sessionStorage.getItem('ka-pos') || 0; } catch (e) { /* ignore */ }
    show(start < deck.length ? start : 0);
    location.hash = 'present'; wakeUi();
  }
  function openSetup() {
    presEl.hidden = true; setupEl.hidden = false; document.body.classList.remove('presenting');
    if (document.fullscreenElement) document.exitFullscreen();
    Setup.render(); location.hash = '';
    window.scrollTo(0, 0);
  }
  function openFriend() {
    const st = Setup.state;
    const friendEl = $('#friend');
    setupEl.hidden = true; setupEl.innerHTML = ''; // nothing of the setup stays in the page
    friendEl.hidden = false; window.scrollTo(0, 0);
    const nos = st.raw2.kababNos;
    window.KAFriend.open(friendEl, st.restaurants.map((r) => ({ id: r.id, name: r.name })), nos, (res) => {
      if (res && res !== true) { st.privateMap = res; Setup.save(); }
      if (res === true) { friendEl.hidden = true; friendEl.innerHTML = ''; setupEl.hidden = false; Setup.render(); window.scrollTo(0, 0); }
    });
  }
  function toggleFs() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
  function wakeUi() { presEl.classList.add('ui'); clearTimeout(hideTimer); hideTimer = setTimeout(() => presEl.classList.remove('ui'), 2500); }

  addEventListener('keydown', (e) => {
    if (presEl.hidden || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const k = e.key;
    if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0); else if (k === 'End') show(deck.length - 1);
    else if (k === 'f' || k === 'F') toggleFs();
    else if (k === 'e' || k === 'E') openSetup();
    else if (/^[0-9]$/.test(k)) show(k === '0' ? 9 : +k - 1);
    wakeUi();
  });
  presEl.addEventListener('mousemove', wakeUi);
  presEl.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]'); if (g) { show(+g.dataset.go); return; }
    const b = e.target.closest('[data-act]');
    if (b) { ({ next, prev, setup: openSetup, fs: toggleFs })[b.dataset.act](); return; }
    if (e.target.closest('.ui-bar')) return;
    next();
  });
  let tx = null;
  presEl.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  presEl.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); });

  Setup.init(setupEl, openPresent, openFriend).then(() => {
    if (location.hash === '#present' && Setup.validate().errors.length === 0) openPresent();
    document.body.classList.add('ready');
  });
})();
