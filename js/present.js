/* Presenter engine: scales the 1920x1080 stage, renders slides, steps, keyboard & touch navigation.
 * Used by the generated index.html (published slides) and by the setup page's preview.
 * Needs: #present, #stage, #slides, #confetti, #counter, #dots, #progress in the page. */
(function (root) {
  'use strict';
  const KA = root.KA, Slides = root.KASlides.slides;
  const $ = (s) => document.querySelector(s);
  let presEl, stage, slideHost, resolvedData = null, wiOpen = false, wiExcluded = new Set(), deck = [], idx = 0, step = 0, analysis = null, ctx = null, hideTimer = null, active = false, onExit = null, bound = false;

  function fit() { stage.style.setProperty('--s', Math.min(innerWidth / 1920, innerHeight / 1080)); }

  /* ---------- confetti ---------- */
  let parts = [], raf = 0;
  function confetti() {
    const cv = $('#confetti'), cx = cv.getContext('2d');
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

  function countUp(el) {
    el.querySelectorAll('[data-count]').forEach((n) => {
      const to = +n.dataset.count, suf = n.dataset.suffix || '', t0 = performance.now(), dur = 1400;
      (function f(t) { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); n.textContent = Math.round(to * e) + suf; if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }

  function applyStep() {
    const el = slideHost.firstElementChild; if (!el) return;
    el.querySelectorAll('[data-step]').forEach((n) => n.classList.toggle('on', step >= +n.dataset.step));
    el.querySelectorAll('[data-hide-from]').forEach((n) => n.classList.toggle('gone', step >= +n.dataset.hideFrom));
    for (let i = 1; i <= 16; i++) el.classList.toggle('st-' + i, step >= i);
    const d = deck[idx];
    if (d.finale && step === d.steps) confetti();
    $('#counter').textContent = `${idx + 1} / ${deck.length}` + (d.steps ? ` · ${step}/${d.steps}` : '');
  }

  function show(i, s = 0, dir = 1) {
    idx = Math.max(0, Math.min(deck.length - 1, i)); step = s;
    const d = deck[idx];
    const el = document.createElement('section');
    el.className = `slide s-${d.id} ${d.finale ? 'finale-slide' : ''}`;
    el.dataset.dir = dir;
    el.innerHTML = d.render(analysis, ctx) + `<footer class="slide-foot"><span>${root.KASlides.esc(ctx.cfg.title)}</span><span>${d.section}</span></footer>`;
    slideHost.innerHTML = ''; slideHost.appendChild(el);
    el.getBoundingClientRect();
    requestAnimationFrame(() => { el.classList.add('active'); countUp(el); });
    applyStep();
    [...$('#dots').children].forEach((b, k) => b.classList.toggle('cur', k === idx));
    $('#progress i').style.width = (idx / Math.max(1, deck.length - 1)) * 100 + '%';
    try { sessionStorage.setItem('ka-pos', idx); } catch (e) { /* ignore */ }
  }

  function next() { const d = deck[idx]; if (step < (d.steps || 0)) { step++; applyStep(); } else if (idx < deck.length - 1) show(idx + 1, 0, 1); }
  function prev() { if (step > 0) { step--; applyStep(); } else if (idx > 0) { const p = deck[idx - 1]; show(idx - 1, p.steps || 0, -1); } }
  function toggleFs() { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }
  function wakeUi() { presEl.classList.add('ui'); clearTimeout(hideTimer); hideTimer = setTimeout(() => presEl.classList.remove('ui'), 2500); }
  function exit() { if (!onExit) return; active = false; if (document.fullscreenElement) document.exitFullscreen(); onExit(); }

  /* ---------- interactive "What if…?" table ---------- */
  function wiRender() {
    const K = root.KASlides, H = K.helpers, nm = K.nm;
    let box = stage.querySelector('.wi');
    if (!box) { box = document.createElement('div'); box.className = 'wi'; stage.appendChild(box); }
    const all = resolvedData.s2;
    const keep = (p) => !wiExcluded.has(p.pid);
    const sub = Object.assign({}, resolvedData, { s1: resolvedData.s1.filter(keep), s2: all.filter(keep) });
    const a = KA.analyze(sub), base = analysis;
    const h = H(a, ctx);
    const basePos = Object.fromEntries(base.blindOrder.map((k) => [k.id, k.blindPos]));
    const winNow = a.winners.map((w) => w.id).join(), winBase = base.winners.map((w) => w.id).join();
    const chips = all.map((p) => `<button class="wi-chip ${wiExcluded.has(p.pid) ? 'off' : ''}" data-pid="${K.esc(p.pid)}"><i></i>${nm(p.name)}</button>`).join('');
    const rows = a.blindOrder.map((k) => {
      const d = (basePos[k.id] || 0) - k.blindPos;
      return `<div class="wi-row ${k.blindPos === 1 ? 'first' : ''}"><span class="cd-pos">${k.blindPos}${k.tied ? '=' : ''}</span>${h.logo(k.id, 54)}
        <span class="wi-name">${nm(k.name)}<small>Kabab #${k.kabab} · ${k.nRatings} ${k.nRatings === 1 ? 'rating' : 'ratings'}</small></span>
        <span class="track"><span class="bar" style="width:${(k.avgRating / 10) * 100}%"></span></span>
        <span class="cd-score">${k.avgRating.toFixed(2)}</span>
        <span class="wi-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '–'}</span>
        <span class="cd-price"><small>guessed / real</small>${h.money(k.avgPrice)} <i>/</i> ${h.money(k.actualPrice)}</span></div>`;
    }).join('');
    const nIn = all.length - wiExcluded.size;
    const verdict = !a.blindOrder.length ? 'Nobody left — tick someone back in.' : winNow === winBase ? `Same winner as with everyone: <b>${nm(a.winner.name)}</b>` : `The winner changes: <b>${nm(a.winner.name)}</b> instead of ${nm(base.winner.name)}`;
    box.innerHTML = `<div class="wi-head"><div><div class="eyebrow"><i></i>Interactive</div><h2>What <em>if</em>…?</h2>
        <p class="sub">Untick guests to see the final table without them · ${nIn} of ${all.length} guests counted</p></div>
        <button class="wi-close" data-wi="close">✕ Close <small>(X / Esc)</small></button></div>
      <div class="wi-body"><div class="wi-side"><div class="wi-tools"><button data-wi="all">Everyone</button><button data-wi="none">Nobody</button><button data-wi="invert">Invert</button></div><div class="wi-chips">${chips}</div></div>
        <div class="wi-main"><div class="wi-table">${rows || '<div class="nodata" style="margin-top:80px">No ratings</div>'}</div><div class="wi-verdict ${winNow === winBase ? '' : 'changed'}">${verdict}</div></div></div>`;
  }
  function wiToggle(force) {
    wiOpen = force == null ? !wiOpen : force;
    let box = stage.querySelector('.wi');
    if (wiOpen) { wiRender(); box = stage.querySelector('.wi'); requestAnimationFrame(() => box.classList.add('open')); }
    else if (box) box.classList.remove('open');
  }
  function wiClick(e) {
    const chip = e.target.closest('.wi-chip'), act = e.target.closest('[data-wi]');
    if (chip) { const id = chip.dataset.pid; if (wiExcluded.has(id)) wiExcluded.delete(id); else wiExcluded.add(id); wiRender(); wiStay(); }
    else if (act) {
      const k = act.dataset.wi, ids = resolvedData.s2.map((p) => p.pid);
      if (k === 'close') return wiToggle(false);
      if (k === 'all') wiExcluded = new Set(); if (k === 'none') wiExcluded = new Set(ids);
      if (k === 'invert') wiExcluded = new Set(ids.filter((x) => !wiExcluded.has(x)));
      wiRender(); wiStay();
    }
  }
  const wiStay = () => { const b = stage.querySelector('.wi'); if (b) b.classList.add('open'); };

  function bind() {
    if (bound) return; bound = true;
    addEventListener('resize', () => { if (active) fit(); });
    addEventListener('keydown', (e) => {
      if (!active || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'x' || k === 'X') { wiToggle(); wakeUi(); return; }
      if (wiOpen) { if (k === 'Escape') wiToggle(false); return; }
      if (['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter'].includes(k)) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); prev(); }
      else if (k === 'Home') show(0); else if (k === 'End') show(deck.length - 1);
      else if (k === 'f' || k === 'F') toggleFs();
      else if (k === 'e' || k === 'E') exit();
      else if (/^[0-9]$/.test(k)) show(Math.min(deck.length - 1, k === '0' ? 9 : +k - 1));
      wakeUi();
    });
    presEl.addEventListener('mousemove', wakeUi);
    presEl.addEventListener('click', (e) => {
      if (e.target.closest('.wi')) { wiClick(e); return; }
      const g = e.target.closest('[data-go]'); if (g) { show(+g.dataset.go); return; }
      const b = e.target.closest('[data-act]');
      if (b) { ({ next, prev, setup: exit, fs: toggleFs, whatif: () => wiToggle() })[b.dataset.act](); return; }
      if (e.target.closest('.ui-bar')) return;
      next();
    });
    let tx = null;
    presEl.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
    presEl.addEventListener('touchend', (e) => { if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null; if (Math.abs(dx) > 50) (dx < 0 ? next : prev)(); });
  }

  /** opts: { cfg, images, resolved, onExit } */
  function start(opts) {
    presEl = $('#present'); stage = $('#stage'); slideHost = $('#slides');
    onExit = opts.onExit || null;
    presEl.classList.toggle('no-exit', !onExit);
    resolvedData = opts.resolved; wiOpen = false; wiExcluded = new Set(); const old = stage.querySelector('.wi'); if (old) old.remove();
    analysis = KA.analyze(opts.resolved);
    const imgs = opts.images || {};
    ctx = { cfg: opts.cfg, img: (k) => imgs[k] || null };
    deck = Slides.map((s) => ({ ...s, steps: s.stepCount ? s.stepCount(analysis) : s.steps }));
    $('#dots').innerHTML = deck.map((s, i) => `<button data-go="${i}" title="${s.section}"></button>`).join('');
    bind(); active = true; presEl.hidden = false; document.body.classList.add('presenting');
    fit();
    let st = 0; try { st = +sessionStorage.getItem('ka-pos') || 0; } catch (e) { /* ignore */ }
    show(st < deck.length ? st : 0);
    wakeUi();
  }
  function stop() { active = false; presEl.hidden = true; document.body.classList.remove('presenting'); }

  root.KAPresent = { start, stop };
})(window);
