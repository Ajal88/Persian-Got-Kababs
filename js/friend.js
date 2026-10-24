/* "Friend mode": a clean screen where a friend enters the private kabab numbering.
 * It only ever shows kabab numbers: no restaurant names, prices, results or the organiser's setup.
 * Mapping = "number on THEIR plate" -> "number on OUR (the other guests') plate". */
(function (root) {
  'use strict';

  function open(el, nos, onDone) {
    const choice = {}; let stage = 'form', note = '';

    function draw() {
      if (stage === 'done') {
        el.innerHTML = `<div class="friend-wrap center"><div class="skewer"><i></i><i></i><i></i><i></i></div>
          <h1>Locked in <em>🔒</em></h1><p class="lead">Thank you! The numbering is saved and hidden.<br>Please hand the computer back.</p>
          <button class="btn primary big" id="fDone">Return to the studio</button></div>`;
        el.querySelector('#fDone').onclick = () => onDone(true);
        return;
      }
      const used = new Set(Object.values(choice).filter((x) => x != null));
      const complete = nos.every((n) => choice[n] != null) && used.size === nos.length;
      if (stage === 'confirm') {
        el.innerHTML = `<div class="friend-wrap"><h1>Check it once more</h1><p class="lead">Once you submit, nobody can read this back.</p>
          <div class="friend-confirm">${nos.map((n) => `<div><b>#${n}</b><span>is our <b class="o">#${choice[n]}</b></span></div>`).join('')}</div>
          <div class="friend-actions"><button class="btn ghost" id="fBack">← Edit</button><button class="btn primary big" id="fOk">Lock it in</button></div></div>`;
        el.querySelector('#fBack').onclick = () => { stage = 'form'; draw(); };
        el.querySelector('#fOk').onclick = () => { stage = 'done'; onDone(Object.assign({}, choice)); draw(); };
        return;
      }
      el.innerHTML = `<div class="friend-wrap">
        <div class="skewer small"><i></i><i></i><i></i><i></i></div>
        <h1>Private kabab <em>numbering</em></h1>
        <p class="lead">Two guests are taking part without knowing the real numbers. For each number printed on <b>their</b> plates, choose the number <b>the other guests</b> got for the same kabab. Use each number once.</p>
        <div class="friend-up"><label class="btn ghost small">⬆ Upload a file instead<input type="file" accept=".xlsx,.xls,.csv,.txt" id="fFile" hidden></label>
          <small>Two columns: their number · our number</small><div class="msg err" id="fMsg">${note}</div></div>
        <div class="friend-rows">${nos.map((n) => `<label class="friend-row"><span class="kno">#${n}</span><span class="arr">→ our</span>
          <select data-n="${n}"><option value="">Choose…</option>${nos.map((m) => `<option value="${m}" ${choice[n] === m ? 'selected' : ''} ${used.has(m) && choice[n] !== m ? 'disabled' : ''}>#${m}${used.has(m) && choice[n] !== m ? ' (already used)' : ''}</option>`).join('')}</select></label>`).join('')}</div>
        <div class="friend-actions"><button class="btn primary big" id="fNext" ${complete ? '' : 'disabled'}>Review</button></div>
      </div>`;
      el.querySelectorAll('select').forEach((sel) => { sel.onchange = () => { choice[sel.dataset.n] = sel.value ? +sel.value : null; note = ''; draw(); }; });
      el.querySelector('#fNext').onclick = () => { stage = 'confirm'; draw(); };
      el.querySelector('#fFile').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const rows = root.KAParse.parseNumberPairs(await root.KAParse.readRows(f));
          const m = {}; rows.forEach(([a, b]) => { if (nos.includes(a)) m[a] = b; });
          const vals = Object.values(m);
          if (Object.keys(m).length !== nos.length || vals.some((x) => !nos.includes(x)) || new Set(vals).size !== vals.length) throw new Error(`The file must map each of the numbers ${nos.join(', ')} to a different number from the same set.`);
          Object.keys(choice).forEach((k) => delete choice[k]); Object.assign(choice, m); note = '';
        } catch (err) { note = '⚠ ' + (err.message || err); }
        draw();
      };
    }
    draw();
  }
  root.KAFriend = { open };
})(window);
