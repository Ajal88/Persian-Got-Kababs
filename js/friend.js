/* "Friend mode": a clean screen where a friend enters the private kabab numbering.
 * It deliberately shows nothing from the organiser's setup except the list of restaurant names. */
(function (root) {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** names: [{id,name}] shuffled-free alphabetical list; nos: kabab numbers; onDone(map|null) */
  function open(el, names, nos, onDone) {
    const list = names.slice().sort((a, b) => a.name.localeCompare(b.name));
    const choice = {}; let stage = 'form';

    function draw() {
      if (stage === 'done') {
        el.innerHTML = `<div class="friend-wrap center"><div class="skewer"><i></i><i></i><i></i><i></i></div>
          <h1>Locked in <em>🔒</em></h1><p class="lead">Thank you! The numbering is saved and hidden.<br>Please hand the computer back.</p>
          <button class="btn primary big" id="fDone">Return to the studio</button></div>`;
        el.querySelector('#fDone').onclick = () => onDone(true);
        return;
      }
      const used = new Set(Object.values(choice).filter(Boolean));
      const complete = nos.every((n) => choice[n]) && used.size === nos.length;
      if (stage === 'confirm') {
        el.innerHTML = `<div class="friend-wrap"><h1>Check it once more</h1><p class="lead">Once you submit, nobody can read this back.</p>
          <div class="friend-confirm">${nos.map((n) => `<div><b>#${n}</b><span>${esc(list.find((x) => x.id === choice[n]).name)}</span></div>`).join('')}</div>
          <div class="friend-actions"><button class="btn ghost" id="fBack">← Edit</button><button class="btn primary big" id="fOk">Lock it in</button></div></div>`;
        el.querySelector('#fBack').onclick = () => { stage = 'form'; draw(); };
        el.querySelector('#fOk').onclick = () => { stage = 'done'; onDone(Object.assign({}, choice)); draw(); };
        return;
      }
      el.innerHTML = `<div class="friend-wrap">
        <div class="skewer small"><i></i><i></i><i></i><i></i></div>
        <h1>Private kabab <em>numbering</em></h1>
        <p class="lead">Two guests are taking part without knowing the real numbers. For each kabab number <b>they</b> were given, choose the restaurant it came from. Use each restaurant once.</p>
        <div class="friend-rows">${nos.map((n) => `<label class="friend-row"><span class="kno">#${n}</span>
          <select data-n="${n}"><option value="">Choose a restaurant…</option>${list.map((r) => `<option value="${r.id}" ${choice[n] === r.id ? 'selected' : ''} ${used.has(r.id) && choice[n] !== r.id ? 'disabled' : ''}>${esc(r.name)}${used.has(r.id) && choice[n] !== r.id ? ' (already used)' : ''}</option>`).join('')}</select></label>`).join('')}</div>
        <div class="friend-actions"><button class="btn primary big" id="fNext" ${complete ? '' : 'disabled'}>Review</button></div>
      </div>`;
      el.querySelectorAll('select').forEach((sel) => { sel.onchange = () => { choice[sel.dataset.n] = sel.value || null; draw(); }; });
      el.querySelector('#fNext').onclick = () => { stage = 'confirm'; draw(); };
    }
    draw();
  }
  root.KAFriend = { open };
})(window);
