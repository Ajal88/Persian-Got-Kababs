/* Setup screen: upload surveys, describe the restaurants, add pictures. */
(function (root) {
  'use strict';
  const KA = root.KA, P = root.KAParse, Store = root.KAStore;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const Setup = { state: null, onStart: null, el: null };
  let uid = 1;
  const newId = () => 'x' + Date.now().toString(36) + (uid++);

  function blank() {
    return {
      cfg: { title: 'Persian Kabab Showdown', subtitle: 'Ten restaurants. Seven kababs. No labels. Zero mercy.', date: '', currency: '$' },
      raw1: null, raw2: null, file1: '', file2: '',
      restaurants: [], nameAliases: {}, personLinks: {}, images: {},
      privateGuests: null, privateMap: null,
    };
  }

  let saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => Store.set('state', Setup.state), 250); }

  /* ----- derived info ----- */
  function kababNos() { return Setup.state.raw2 ? Setup.state.raw2.kababNos : []; }

  function validate() {
    const s = Setup.state, errors = [], warns = [];
    if (!s.raw1) errors.push('Upload the BEFORE-eating survey results.');
    if (!s.raw2) errors.push('Upload the AFTER-eating survey results.');
    if (s.raw1 && s.raw2) {
      const nos = kababNos();
      const pres = s.restaurants.filter((r) => r.present);
      nos.forEach((n) => {
        const who = pres.filter((r) => r.kabab === n);
        if (!who.length) errors.push(`Kabab #${n} has no restaurant assigned. Tick "Served" and pick its number in the table below.`);
        if (who.length > 1) errors.push(`Kabab #${n} is assigned to more than one restaurant.`);
      });
      pres.forEach((r) => { if (r.kabab == null) errors.push(`${r.name} is marked as served but has no kabab number.`); else if (!nos.includes(r.kabab)) errors.push(`${r.name} has kabab #${r.kabab}, which is not in the survey.`); });
      pres.forEach((r) => { if (r.price == null) warns.push(`${r.name} has no price — price slides will be incomplete.`); });
      const pg = s.privateGuests || [];
      if (pg.length) {
        const m = s.privateMap;
        if (!m || !Object.keys(m).length) errors.push('The private kabab numbering has not been entered yet. Use the "Private numbering" section to hand the computer to your friend.');
        else {
          const ids = nos.map((n) => m[n]);
          const served = new Set(pres.map((r) => r.id));
          if (ids.some((x) => !x) || new Set(ids).size !== ids.length || ids.some((x) => !served.has(x)) || ids.length !== served.size) {
            errors.push('The private numbering does not match the restaurants marked as served. Replace it (your friend must pick the same restaurants that are switched on above).');
          }
        }
      }
    }
    return { errors, warns };
  }

  /* ----- reconcile names after upload ----- */
  function syncRestaurants() {
    const s = Setup.state; if (!s.raw1) return;
    const have = new Map(s.restaurants.map((r) => [KA.normRestaurant(r.name), r]));
    s.raw1.restaurants.forEach((name) => {
      if (!have.has(KA.normRestaurant(name))) {
        const r = { id: newId(), name, present: false, kabab: null, price: null };
        s.restaurants.push(r); have.set(KA.normRestaurant(name), r);
      }
    });
  }

  function reconcileGuesses() {
    const s = Setup.state; if (!s.raw2) return;
    const exact = new Set(s.restaurants.map((r) => KA.normRestaurant(r.name)));
    const seen = new Map();
    s.raw2.rows.forEach((row) => Object.values(row.k).forEach((c) => {
      if (!c.guess) return; const n = KA.normRestaurant(c.guess);
      if (!seen.has(n)) seen.set(n, { raw: c.guess, n: 0 }); seen.get(n).n++;
    }));
    seen.forEach((v, n) => {
      if (exact.has(n) || s.nameAliases[n]) return;
      const m = KA.bestMatch(v.raw, s.restaurants);
      if (m) s.nameAliases[n] = m.id;
      else { const r = { id: newId(), name: v.raw, present: false, kabab: null, price: null }; s.restaurants.push(r); s.nameAliases[n] = r.id; exact.add(n); }
    });
  }

  function suggestPrivate() {
    const s = Setup.state; if (!s.raw2 || s.privateGuests) return;
    const names = [...new Set(s.raw2.rows.map((r) => KA.normName(r.name)))];
    s.privateGuests = names.filter((n) => /^(amir ?abbas|amirabas|mina|امیر ?عباس|مینا)\b/.test(n));
  }

  function linkPeople() {
    const s = Setup.state; if (!s.raw1 || !s.raw2) return;
    const s1 = new Map(); s.raw1.rows.forEach((r) => s1.set(KA.normName(r.name), r.name));
    s.raw2.rows.forEach((r) => {
      const n = KA.normName(r.name);
      if (s1.has(n) || s.personLinks[n] !== undefined) return;
      let best = null, bd = 99;
      s1.forEach((_, k) => { const d = KA.levenshtein(n, k); if (d < bd) { bd = d; best = k; } });
      if (best && bd <= Math.max(1, Math.floor(Math.min(n.length, best.length) / 5))) s.personLinks[n] = best;
      else s.personLinks[n] = null;
    });
  }

  function autoAssign() {
    const s = Setup.state; if (!s.raw2) return;
    // prefer guessing-based hints: nothing. Just keep what the user set.
  }

  /* ----- actions ----- */
  async function loadSurvey(which, file) {
    const msg = Setup.el.querySelector(`#msg${which}`);
    try {
      const rows = await P.readRows(file);
      const s = Setup.state;
      if (which === 1) { s.raw1 = P.parseSurvey1(rows); s.file1 = file.name; syncRestaurants(); }
      else { s.raw2 = P.parseSurvey2(rows); s.file2 = file.name; }
      reconcileGuesses(); linkPeople(); suggestPrivate(); save(); render();
    } catch (e) {
      if (msg) { msg.textContent = '⚠ ' + (e.message || e); msg.className = 'msg err'; }
    }
  }

  async function setImage(key, file) {
    try { Setup.state.images[key] = await Store.image(file, key.startsWith('logo-') ? 500 : 1600); save(); render(); } catch (e) { alert('Could not read that image.'); }
  }

  function loadDemo() {
    const { raw1, raw2, setup } = KA.demo(7);
    const s = Setup.state;
    s.raw1 = raw1; s.raw2 = raw2; s.file1 = 'demo data'; s.file2 = 'demo data';
    s.restaurants = setup.restaurants.map((r) => ({ ...r })); s.nameAliases = {}; s.personLinks = {};
    s.privateGuests = setup.privateGuests; s.privateMap = setup.privateMap;
    reconcileGuesses(); linkPeople(); save(); render();
  }

  /* ----- rendering ----- */
  function drop(id, label, hint, file, accept) {
    return `<label class="drop ${file ? 'filled' : ''}" data-drop="${id}">
      <input type="file" accept="${accept}" data-file="${id}" hidden>
      <span class="drop-ico">${file ? '✓' : '⬆'}</span>
      <span class="drop-t">${esc(label)}</span>
      <span class="drop-h">${file ? esc(file) : esc(hint)}</span></label>`;
  }

  function imgBox(key, label, hint) {
    const src = Setup.state.images[key];
    return `<div class="imgbox ${src ? 'filled' : ''}">
      <label class="imgbox-drop" data-drop="img:${key}"><input type="file" accept="image/*" data-img="${key}" hidden>
        ${src ? `<img src="${src}" alt="">` : '<span class="plus">+</span>'}</label>
      <div class="imgbox-t"><b>${esc(label)}</b><small>${esc(hint || '')}</small>${src ? `<button class="link" data-rmimg="${key}">remove</button>` : ''}</div></div>`;
  }

  function privateSection() {
    const s = Setup.state;
    const people = [...new Map(s.raw2.rows.map((r) => [KA.normName(r.name), r.name])).entries()];
    const sel = new Set(s.privateGuests || []);
    const has = s.privateMap && Object.keys(s.privateMap).length;
    return `<section class="card">
      <h3><span class="n">5</span> Private numbering <small>(for guests who must not know the real numbers)</small></h3>
      <p class="help">The organisers can take part fairly: a friend gives them a <b>different</b> kabab numbering. Tick who uses it, then hand the computer to your friend. The next screen shows nothing you entered, and what your friend submits stays hidden here. Those guests' answers are then checked against <i>their</i> numbering.</p>
      <div class="chk-grid">${people.map(([n, name]) => `<label class="chk"><input type="checkbox" data-priv="${esc(n)}" ${sel.has(n) ? 'checked' : ''}> ${esc(name)}</label>`).join('')}</div>
      <div class="priv-row">
        ${sel.size ? `<span class="pill ${has ? 'ok' : 'warn'}">${has ? '✓ Private numbering received (hidden)' : 'Waiting for your friend'}</span>
        <button class="btn ${has ? 'ghost' : 'primary'} small" id="friendBtn">${has ? 'Replace it' : '🙈 Hand over to your friend'}</button>` : '<span class="help">Nobody selected — everyone uses the main numbering.</span>'}
      </div>
    </section>`;
  }

  function render() {
    const s = Setup.state, el = Setup.el;
    const { errors, warns } = validate();
    const nos = kababNos();
    const taken = new Map(s.restaurants.filter((r) => r.present && r.kabab != null).map((r) => [r.kabab, r.id]));

    const restRows = s.restaurants.map((r) => `
      <tr data-rid="${r.id}" class="${r.present ? 'on' : ''}">
        <td><label class="mini-logo" data-drop="img:logo-${r.id}"><input type="file" accept="image/*" data-img="logo-${r.id}" hidden>${s.images['logo-' + r.id] ? `<img src="${s.images['logo-' + r.id]}" alt="">` : '<span>+</span>'}</label></td>
        <td><input class="txt" data-f="name" value="${esc(r.name)}"></td>
        <td class="c"><label class="switch"><input type="checkbox" data-f="present" ${r.present ? 'checked' : ''}><i></i></label><small>${r.present ? 'served' : 'decoy'}</small></td>
        <td class="c"><select data-f="kabab" ${r.present ? '' : 'disabled'}><option value="">—</option>${nos.map((n) => `<option value="${n}" ${r.kabab === n ? 'selected' : ''}>#${n}${taken.has(n) && taken.get(n) !== r.id ? ' (taken)' : ''}</option>`).join('')}</select></td>
        <td class="c"><span class="cur">${esc(s.cfg.currency)}</span><input class="num" type="number" min="0" step="0.5" data-f="price" value="${r.price == null ? '' : r.price}" ${r.present ? '' : 'disabled'}></td>
        <td class="c"><button class="icon-btn" data-rm="${r.id}" title="Remove">✕</button></td>
      </tr>`).join('');

    // name clean-up
    const exact = new Set(s.restaurants.map((r) => KA.normRestaurant(r.name)));
    const alias = Object.entries(s.nameAliases).filter(([n]) => !exact.has(n));
    const rawByNorm = {}; const cnt = {};
    if (s.raw2) s.raw2.rows.forEach((row) => Object.values(row.k).forEach((c) => { if (c.guess) { const n = KA.normRestaurant(c.guess); rawByNorm[n] = c.guess; cnt[n] = (cnt[n] || 0) + 1; } }));
    const aliasRows = alias.filter(([n]) => rawByNorm[n]).map(([n, id]) => `<tr><td>“${esc(rawByNorm[n])}” <small>×${cnt[n]}</small></td><td>→</td><td><select data-alias="${esc(n)}">${s.restaurants.map((r) => `<option value="${r.id}" ${r.id === id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td></tr>`).join('');

    const s1names = s.raw1 ? new Map(s.raw1.rows.map((r) => [KA.normName(r.name), r.name])) : new Map();
    const unlinked = s.raw2 ? [...new Map(s.raw2.rows.map((r) => [KA.normName(r.name), r.name])).entries()].filter(([n]) => !s1names.has(n)) : [];
    const personRows = unlinked.map(([n, name]) => `<tr><td>${esc(name)}</td><td>→</td><td><select data-person="${esc(n)}"><option value="">no match (that’s fine)</option>${[...s1names.entries()].map(([k, v]) => `<option value="${esc(k)}" ${s.personLinks[n] === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></td></tr>`).join('');

    const nPre = s.raw1 ? s.raw1.rows.length : 0, nPost = s.raw2 ? s.raw2.rows.length : 0;
    const matched = s.raw1 && s.raw2 ? s.raw2.rows.filter((r) => { const n = KA.normName(r.name); return s1names.has(n) || s.personLinks[n]; }).length : 0;

    el.innerHTML = `
    <div class="setup-wrap">
      <header class="setup-hero">
        <div class="skewer small"><i></i><i></i><i></i><i></i></div>
        <h1>Kabab Showdown <em>Studio</em></h1>
        <p>Drop in your survey results, tell us which restaurants were served, add a few pictures — and your 10-slide reveal is ready.</p>
        <div class="hero-actions"><button class="btn ghost" id="demo">✨ Preview with demo data</button></div>
      </header>

      <section class="card">
        <h3><span class="n">1</span> The event</h3>
        <div class="form-grid">
          <label>Presentation title<input class="txt" data-cfg="title" value="${esc(s.cfg.title)}"></label>
          <label>Tagline<input class="txt" data-cfg="subtitle" value="${esc(s.cfg.subtitle)}"></label>
          <label>Date / place (optional)<input class="txt" data-cfg="date" value="${esc(s.cfg.date)}" placeholder="e.g. Saturday 23 October · Our place"></label>
          <label>Currency symbol<input class="txt short" data-cfg="currency" value="${esc(s.cfg.currency)}" maxlength="4"></label>
        </div>
        <div class="imgrow">
          ${imgBox('event-logo', 'Event logo', 'Title slide · transparent PNG looks best')}
          ${imgBox('hero', 'Title background photo', 'Optional · wide photo of the party or the food')}
          ${imgBox('group', 'Group / party photo', 'Optional · shown on the winner slide if the winning kabab has no photo')}
        </div>
      </section>

      <section class="card">
        <h3><span class="n">2</span> The survey results</h3>
        <div class="drops">
          ${drop(1, 'Survey 1 · BEFORE eating', 'Drop the .xlsx / .csv here or click', s.file1, '.xlsx,.xls,.csv')}
          ${drop(2, 'Survey 2 · AFTER eating', 'Drop the .xlsx / .csv here or click', s.file2, '.xlsx,.xls,.csv')}
        </div>
        <div id="msg1" class="msg"></div><div id="msg2" class="msg"></div>
        ${s.raw1 || s.raw2 ? `<div class="pills">
          ${s.raw1 ? `<span class="pill ok">${nPre} guests in survey 1</span><span class="pill">${s.raw1.restaurants.length} restaurants found</span>` : ''}
          ${s.raw2 ? `<span class="pill ok">${nPost} guests in survey 2</span><span class="pill">${nos.length} kababs found</span>` : ''}
          ${s.raw1 && s.raw2 ? `<span class="pill ${matched === nPost ? 'ok' : 'warn'}">${matched}/${nPost} guests matched across surveys</span>` : ''}
        </div>` : ''}
        <p class="help">Duplicate submissions from the same name are merged (the latest one wins). Guests are matched between the two surveys by the name they typed.</p>
      </section>

      ${s.restaurants.length ? `<section class="card">
        <h3><span class="n">3</span> Which restaurants were served?</h3>
        <p class="help">Switch on the restaurants that were actually served, choose which kabab <b>number</b> each one was, and enter the price of its kabab. Anything switched off is a <b>decoy</b>. Click the “+” square to add a logo.</p>
        <table class="rest-table"><thead><tr><th></th><th>Restaurant</th><th>Served?</th><th>Kabab #</th><th>Price</th><th></th></tr></thead><tbody>${restRows}</tbody></table>
        <button class="btn ghost small" id="addRest">+ Add a restaurant</button>
      </section>` : ''}

      ${aliasRows || personRows ? `<section class="card">
        <h3><span class="n">4</span> Tidy-up <small>(auto-detected — fix if wrong)</small></h3>
        ${aliasRows ? `<h4>Restaurant names spelled differently in survey 2</h4><table class="map">${aliasRows}</table>` : ''}
        ${personRows ? `<h4>Guests in survey 2 whose name was not found in survey 1</h4><table class="map">${personRows}</table>` : ''}
      </section>` : ''}

      ${s.raw2 && s.restaurants.length ? privateSection() : ''}

      ${nos.length ? `<section class="card">
        <h3><span class="n">6</span> Kabab pictures <small>(optional, for the winner reveal)</small></h3>
        <div class="imgrow wrap">${nos.map((n) => imgBox('kabab-' + n, 'Kabab #' + n, 'Photo of this plate')).join('')}</div>
      </section>` : ''}

      <footer class="launch">
        ${errors.length ? `<ul class="issues err">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
        ${warns.length ? `<ul class="issues warn">${warns.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>` : ''}
        <div class="launch-row">
          <button class="btn primary big" id="start" ${errors.length ? 'disabled' : ''}>🔥 Start the presentation</button>
          <div class="launch-aux">
            <button class="btn ghost small" id="export">Save setup file</button>
            <label class="btn ghost small">Load setup file<input type="file" accept=".json" id="import" hidden></label>
            <button class="btn ghost small danger" id="reset">Reset everything</button>
          </div>
        </div>
      </footer>
    </div>`;
  }

  /* ----- events (delegated, bound once) ----- */
  function bind() {
    const el = Setup.el;
    el.addEventListener('change', (e) => {
      const t = e.target, s = Setup.state;
      if (t.dataset.file) { if (t.files[0]) loadSurvey(+t.dataset.file, t.files[0]); return; }
      if (t.dataset.img) { if (t.files[0]) setImage(t.dataset.img, t.files[0]); return; }
      if (t.dataset.cfg) { s.cfg[t.dataset.cfg] = t.value; save(); if (t.dataset.cfg === 'currency') render(); return; }
      if (t.dataset.priv) { const set = new Set(s.privateGuests || []); if (t.checked) set.add(t.dataset.priv); else set.delete(t.dataset.priv); s.privateGuests = [...set]; save(); render(); return; }
      if (t.dataset.alias) { s.nameAliases[t.dataset.alias] = t.value; save(); return; }
      if (t.dataset.person) { s.personLinks[t.dataset.person] = t.value || null; save(); render(); return; }
      if (t.id === 'import') { importSetup(t.files[0]); return; }
      const tr = t.closest('tr[data-rid]'); if (!tr) return;
      const r = s.restaurants.find((x) => x.id === tr.dataset.rid); if (!r) return;
      const f = t.dataset.f;
      if (f === 'name') r.name = t.value.trim() || r.name;
      if (f === 'present') {
        r.present = t.checked;
        if (r.present && r.kabab == null) { const used = new Set(s.restaurants.filter((x) => x.present).map((x) => x.kabab)); r.kabab = kababNos().find((n) => !used.has(n)) ?? null; }
        if (!r.present) { r.kabab = null; }
      }
      if (f === 'kabab') r.kabab = t.value === '' ? null : +t.value;
      if (f === 'price') r.price = KA.toNumber(t.value);
      save(); render();
    });
    el.addEventListener('click', (e) => {
      const t = e.target.closest('button, label[data-drop]'); if (!t) return;
      const s = Setup.state;
      if (t.id === 'start' && !t.disabled) { save(); Setup.onStart(); }
      else if (t.id === 'demo') loadDemo();
      else if (t.id === 'friendBtn') { save(); Setup.onFriend(); }
      else if (t.id === 'addRest') { s.restaurants.push({ id: newId(), name: 'New restaurant', present: false, kabab: null, price: null }); save(); render(); }
      else if (t.dataset.rm) { s.restaurants = s.restaurants.filter((r) => r.id !== t.dataset.rm); save(); render(); }
      else if (t.dataset.rmimg) { delete s.images[t.dataset.rmimg]; save(); render(); e.preventDefault(); }
      else if (t.id === 'export') exportSetup();
      else if (t.id === 'reset') { if (confirm('Delete all uploaded results, settings and pictures?')) { Store.clear().then(() => { Setup.state = blank(); render(); }); } }
    });
    // drag & drop on any labelled drop zone
    ['dragover', 'dragenter'].forEach((ev) => el.addEventListener(ev, (e) => { const z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('over'); } }));
    ['dragleave', 'drop'].forEach((ev) => el.addEventListener(ev, (e) => { const z = e.target.closest('[data-drop]'); if (z) z.classList.remove('over'); }));
    el.addEventListener('drop', (e) => {
      const z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault();
      const f = e.dataTransfer.files[0]; if (!f) return;
      const id = z.dataset.drop;
      if (id.startsWith('img:')) setImage(id.slice(4), f); else loadSurvey(+id, f);
    });
  }

  function exportSetup() {
    const copy = Object.assign({}, Setup.state, { privateMap: null }); // keep the private numbering secret
    const blob = new Blob([JSON.stringify(copy)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kabab-showdown-setup.json'; a.click();
  }
  function importSetup(file) {
    if (!file) return;
    file.text().then((t) => { try { Setup.state = Object.assign(blank(), JSON.parse(t), { privateMap: Setup.state.privateMap }); save(); render(); } catch (e) { alert('That file is not a valid setup file.'); } });
  }

  Setup.init = async function (el, onStart, onFriend) {
    Setup.el = el; Setup.onStart = onStart; Setup.onFriend = onFriend;
    const saved = await Store.get('state');
    Setup.state = Object.assign(blank(), saved || {});
    Setup.state.cfg = Object.assign(blank().cfg, Setup.state.cfg);
    bind(); render();
  };
  Setup.render = render;
  Setup.save = () => Store.set('state', Setup.state);
  Setup.validate = validate;
  Setup.resolved = () => { const s = Setup.state; return KA.resolve(s.raw1, s.raw2, s); };
  root.KASetup = Setup;
})(window);
