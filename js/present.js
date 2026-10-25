/* Presenter engine: scales the 1920x1080 stage, renders slides, steps, keyboard & touch navigation.
 * Used by the generated index.html (published slides) and by the setup page's preview.
 * Needs: #present, #stage, #slides, #confetti, #counter, #dots, #progress in the page. */
(function (root) {
  'use strict';
  const KA = root.KA, Slides = root.KASlides.slides;
  const $ = (s) => document.querySelector(s);
  let presEl, stage, slideHost, resolvedData = null, biOpen = false, wiOpen = false, wiExcluded = new Set(), deck = [], idx = 0, step = 0, analysis = null, ctx = null, hideTimer = null, active = false, onExit = null, bound = false;

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
    let box = stage.querySelector('.wi:not(.bi)');
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
    let box = stage.querySelector('.wi:not(.bi)');
    if (wiOpen) { wiRender(); box = stage.querySelector('.wi:not(.bi)'); requestAnimationFrame(() => box.classList.add('open')); }
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
  const wiStay = () => { const b = stage.querySelector('.wi:not(.bi)'); if (b) b.classList.add('open'); };

  /* ---------- backup page: prior-experience bias check (key B) ---------- */
  function biRender() {
    const K = root.KASlides, H = K.helpers, nm = K.nm, esc = K.esc;
    let box = stage.querySelector('.bi');
    if (!box) { box = document.createElement('div'); box.className = 'wi bi'; stage.appendChild(box); }
    const b = analysis.bias, fmt = (x, d = 2) => (x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(x).toFixed(d));
    const head = (extra) => `<div class="wi-head"><div><div class="eyebrow"><i></i>Backup page · not part of the show</div><h2>Bias <em>check</em></h2>
      <p class="sub">Did liking a restaurant <i>before</i> the party inflate the score of its blind kabab?</p></div>
      <button class="wi-close" data-bi="close">✕ Close <small>(B / Esc)</small></button></div>${extra || ''}`;
    if (!b) { box.innerHTML = head('<div class="nodata" style="margin-top:120px">Not enough guests who rated a restaurant before <i>and</i> its kabab.</div>'); return; }
    const h = H(analysis, ctx);
    // scatter: prior opinion (x) vs blind score (y)
    const W = 720, Hh = 350, L = 56, T = 16, R = 16, B = 52, X = (v) => L + ((v - 0.5) / 10) * (W - L - R), Y = (v) => Hh - B - ((v - 0.5) / 10) * (Hh - T - B);
    let grid = ''; for (let v = 2; v <= 10; v += 2) grid += `<line class="bi-grid" x1="${X(v)}" y1="${T}" x2="${X(v)}" y2="${Hh - B}"/><line class="bi-grid" x1="${L}" y1="${Y(v)}" x2="${W - R}" y2="${Y(v)}"/><text class="bi-tick" x="${X(v)}" y="${Hh - B + 22}" text-anchor="middle">${v}</text><text class="bi-tick" x="${L - 12}" y="${Y(v) + 6}" text-anchor="end">${v}</text>`;
    const pts = b.points.map((q, i) => { const jx = (((i * 37) % 11) - 5) / 24, jy = (((i * 53) % 13) - 6) / 28; return `<circle class="bi-pt ${q.rec ? 'rec' : ''}" cx="${X(q.pre + jx).toFixed(1)}" cy="${Y(q.post + jy).toFixed(1)}" r="${q.rec ? 9 : 7.5}"><title>${esc(q.name)}: before ${q.pre}, blind ${q.post}</title></circle>`; }).join('');
    const line = b.slope == null ? '' : `<line class="bi-fit" x1="${X(1)}" y1="${Y(b.intercept + b.slope * 1)}" x2="${X(10)}" y2="${Y(b.intercept + b.slope * 10)}"/>`;
    const plot = `<svg viewBox="0 0 ${W} ${Hh}" class="bi-svg">${grid}<line class="bi-diag" x1="${X(0.5)}" y1="${Y(0.5)}" x2="${X(10.5)}" y2="${Y(10.5)}"/>${line}${pts}
      <text class="bi-axis" x="${(L + W - R) / 2}" y="${Hh - 8}" text-anchor="middle">Rating of the restaurant BEFORE the party</text>
      <text class="bi-axis" transform="translate(16 ${(T + Hh - B) / 2}) rotate(-90)" text-anchor="middle">Blind rating of its kabab</text></svg>`;
    const lo = b.ci[0], hi = b.ci[1];
    const verdict = b.sig && b.beta > 0 ? `<b>Evidence of bias.</b> Guests scored kababs from restaurants they already liked higher.` : b.sig ? `<b>Reverse effect.</b> Guests scored kababs from restaurants they liked <i>lower</i>.` : `<b>No clear bias.</b> The confidence interval includes zero.`;
    const sub = (t, label) => (t.beta == null ? `${label} <b>n=${t.n}</b>: too few to estimate` : `${label} <b>n=${t.n}</b>: ${fmt(t.beta)}`);
    const cols = [['raw', 'As scored'], ['adj', 'Bias-adjusted'], ['naive', 'First-timers only']].map(([key, title]) => {
      const rows = b.table.filter((x) => x[key] != null).sort((x, y) => (x[key + 'Pos'] - y[key + 'Pos']) || (y[key] - x[key]));
      const li = rows.map((x) => { const d = key === 'raw' ? 0 : x.rawPos - x[key + 'Pos'];
        return `<li class="${x[key + 'Pos'] === 1 ? 'first' : ''}"><span class="bi-pos">${x[key + 'Pos']}</span><span class="bi-nm">${nm(x.name)}</span><span class="bi-sc">${x[key].toFixed(2)}${key === 'naive' ? `<small> n=${x.naiveN}</small>` : ''}</span><span class="bi-d ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲' + d : d < 0 ? '▼' + (-d) : '·'}</span></li>`; }).join('');
      return `<div class="bi-col"><div class="bi-col-t">${title}</div><ol>${li}</ol></div>`;
    }).join('');
    const hold = (ok, yes, no) => (ok == null ? '' : `<span class="${ok ? 'ok' : 'warn'}">${ok ? '✓' : '⚠'} ${ok ? yes : no}</span>`);
    box.innerHTML = head(`<div class="bi-body">
      <div class="bi-plotcard"><div class="kicker">Prior opinion vs blind score <small><b style="color:var(--teal)">●</b> recognised the plate · <b style="color:var(--ember)">●</b> did not · dashed = same score before and after</small></div>${plot}</div>
      <div class="bi-cards">
        <div class="bi-card"><div class="kicker">🔬 Bias strength</div><div class="bi-big">${fmt(b.beta)}<small> pts per +1 of prior opinion</small></div>
          <div class="bi-txt">95% CI <b>${fmt(lo)}</b> to <b>${fmt(hi)}</b> · ${b.n} pairs from ${b.nGuests} guests<br>${verdict}</div></div>
        <div class="bi-card"><div class="kicker">🧠 Is it “I knew it was my favorite”?</div><div class="bi-txt">${sub(b.rec, 'Recognised the plate')}<br>${sub(b.unrec, 'Did not recognise it')}<br><span class="bi-dim">Pure bias from knowing would be strongest when they recognised it.</span></div></div>
        <div class="bi-card"><div class="kicker">🛠 Correction applied</div><div class="bi-txt">${b.applied > 0 ? `Each score by a guest who had rated the restaurant before was reduced by <b>${b.applied.toFixed(2)} × (their prior − average prior)</b>.` : '<b>None needed</b> — no positive bias was found, so the adjusted table equals the raw one.'}</div></div>
      </div></div>
      <div class="bi-tables">${cols}</div>
      <div class="bi-foot">${hold(b.winnerHoldsAdj, 'Same winner after adjustment', 'The winner changes after adjustment')} ${hold(b.winnerHoldsNaive, 'Same winner among first-timers', 'Among first-timers only, the leader differs — but with very few tasters per restaurant this is noise, not evidence')}</div>
      <div class="bi-method">Method: blind score ~ prior opinion, with guest and restaurant fixed effects (removes personal generosity and true restaurant quality), 95% CI from 400 bootstrap resamples of guests. The adjustment subtracts the estimated effect (never below 0) from scores by guests who had rated the restaurant before; “first-timers” are guests who had not rated it before the party.</div>`);
  }
  function overlayToggle(kind, force) {
    const other = kind === 'wi' ? 'bi' : 'wi';
    if (other === 'bi' ? biOpen : wiOpen) overlayToggle(other, false);
    const open = force == null ? !(kind === 'wi' ? wiOpen : biOpen) : force;
    if (kind === 'wi') { wiToggle(open); return; }
    biOpen = open; let box = stage.querySelector('.bi');
    if (open) { biRender(); box = stage.querySelector('.bi'); requestAnimationFrame(() => box.classList.add('open')); } else if (box) box.classList.remove('open');
  }

  function bind() {
    if (bound) return; bound = true;
    addEventListener('resize', () => { if (active) fit(); });
    addEventListener('keydown', (e) => {
      if (!active || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key;
      if (k === 'x' || k === 'X') { overlayToggle('wi'); wakeUi(); return; }
      if (k === 'b' || k === 'B') { overlayToggle('bi'); wakeUi(); return; }
      if (wiOpen || biOpen) { if (k === 'Escape') { overlayToggle(wiOpen ? 'wi' : 'bi', false); } return; }
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
      if (e.target.closest('.bi')) { if (e.target.closest('[data-bi]')) overlayToggle('bi', false); return; }
      if (e.target.closest('.wi')) { wiClick(e); return; }
      const g = e.target.closest('[data-go]'); if (g) { show(+g.dataset.go); return; }
      const b = e.target.closest('[data-act]');
      if (b) { ({ next, prev, setup: exit, fs: toggleFs, whatif: () => overlayToggle('wi'), bias: () => overlayToggle('bi') })[b.dataset.act](); return; }
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
    resolvedData = opts.resolved; wiOpen = false; biOpen = false; const oldB = stage.querySelector('.bi'); if (oldB) oldB.remove(); wiExcluded = new Set(); const old = stage.querySelector('.wi:not(.bi)'); if (old) old.remove();
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
