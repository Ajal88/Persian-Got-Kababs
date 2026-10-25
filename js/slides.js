/* The slides. Each slide: { id, section, steps, render(a, ctx) -> html }.
 * Elements with data-step="n" appear when the presenter reaches step n of that slide. */
(function (root) {
  'use strict';
  const KA = root.KA;

  /* ---------- helpers ---------- */
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const f1 = (x) => (x == null ? '–' : (Math.round(x * 10) / 10).toString());
  const f2 = (x) => (x == null ? '–' : (Math.round(x * 100) / 100).toString());
  const pct = (x) => (x == null ? '–' : Math.round(x * 100) + '%');
  const sgn = (x, d = 1) => (x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + Math.abs(Math.round(x * 10 ** d) / 10 ** d));
  const plural = (n, w, ws) => `${n} ${n === 1 ? w : (ws || w + 's')}`;
  const nm = (s) => `<bdi>${esc(s)}</bdi>`;
  const list = (arr, key = 'name') => (arr.length > 3 ? arr.slice(0, 2).map((x) => nm(x[key])).join(' &amp; ') + ` &amp; ${arr.length - 2} more` : arr.map((x) => nm(x[key])).join(' &amp; '));
  const hue = (s) => { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

  function ctxHelpers(a, ctx) {
    const cfg = ctx.cfg;
    const money = (v) => (v == null ? '–' : cfg.currency + (Math.abs(v - Math.round(v)) < 0.05 ? Math.round(v) : (Math.round(v * 10) / 10).toFixed(1)));
    const rest = (id) => a.restaurants.find((r) => r.id === id);
    const logo = (id, size = 90) => {
      const r = rest(id); const src = ctx.img('logo-' + id);
      if (src) return `<span class="logo" style="--sz:${size}px"><img src="${src}" alt=""></span>`;
      const w = String(r ? r.name : '?').split(/\s+/).filter((x) => !/^(of|the|house)$/i.test(x));
      const ini = ((w[0] || '?')[0] + ((w[1] || '')[0] || '')).toUpperCase();
      const h = hue(r ? r.name : '?');
      return `<span class="logo mono" style="--sz:${size}px;--h:${h}"><b>${esc(ini)}</b></span>`;
    };
    return { money, rest, logo };
  }

  const eyebrow = (t, n) => `<div class="eyebrow"><i></i>${esc(t)}${n ? `<span>${n}</span>` : ''}</div>`;
  const head = (eb, title, sub) => `<header class="hdr">${eyebrow(eb)}<h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}</header>`;
  const empty = (msg) => `<div class="nodata">${esc(msg)}</div>`;

  /** award card: kicker, logo, big name, stat lines */
  function award(H, { kicker, items, stat, note, step, tone = '', who }) {
    if (!items || !items.length) {
      return `<div class="award ${tone} none" ${step ? `data-step="${step}"` : ''}><div class="kicker">${kicker}</div><div class="none-msg">Nobody qualified for this one.</div></div>`;
    }
    const first = items[0];
    const title = who || list(items);
    return `<div class="award ${tone}" ${step ? `data-step="${step}"` : ''}>
      <div class="kicker">${kicker}</div>
      <div class="award-body">${first.id && H.rest(first.id) ? H.logo(first.id, 96) : ''}<div class="award-txt"><div class="award-name">${title}</div>${stat ? `<div class="award-stat">${stat}</div>` : ''}</div></div>
      ${note ? `<div class="award-note">${note}</div>` : ''}
    </div>`;
  }

  function personAward(H, { kicker, items, stat, note, step, tone = '', icon = '' }) {
    if (!items || !items.length) {
      return `<div class="award ${tone} none" ${step ? `data-step="${step}"` : ''}><div class="kicker">${kicker}</div><div class="none-msg">Not enough data yet.</div></div>`;
    }
    const n = items[0].name;
    return `<div class="award ${tone}" ${step ? `data-step="${step}"` : ''}>
      <div class="kicker">${kicker}</div>
      <div class="award-body"><span class="avatar" style="--h:${hue(n)}">${esc(String(n).trim().slice(0, 1).toUpperCase())}</span>
      <div class="award-txt"><div class="award-name">${list(items)}</div>${stat ? `<div class="award-stat">${stat}</div>` : ''}</div></div>
      ${note ? `<div class="award-note">${note}</div>` : ''}${icon ? `<div class="award-icon">${icon}</div>` : ''}
    </div>`;
  }

  function finishLabel(pos, total) {
    if (pos == null) return '–';
    if (pos <= 3) return '<span class="lock">🔒 revealed at the end</span>';
    return `#${pos}<small> of ${total}</small>`;
  }

  /* ---------- slides ---------- */
  const slides = [];

  /* 1 — Title */
  slides.push({
    id: 'title', section: 'Welcome', steps: 0,
    render(a, ctx) {
      const cfg = ctx.cfg; const logo = ctx.img('event-logo'); const hero = ctx.img('hero');
      return `<div class="title-slide ${hero ? 'has-hero' : ''}">
        ${hero ? `<div class="hero-img" style="background-image:url(${hero})"></div><div class="hero-shade"></div>` : ''}
        <div class="title-inner">
          ${logo ? `<img class="event-logo" src="${logo}" alt="">` : '<div class="skewer"><i></i><i></i><i></i><i></i></div>'}
          <div class="eyebrow center"><i></i>${esc(cfg.date || 'Blind Taste Test')}<i></i></div>
          <h1>${esc(cfg.title || 'Persian Kabab Showdown')}</h1>
          <p class="tagline">${esc(cfg.subtitle || 'Ten restaurants. Seven kababs. No labels. Zero mercy.')}</p>
          <div class="stat-row">
            <div class="stat"><b data-count="${a.nPre}">0</b><span>guests voted before</span></div>
            <div class="stat"><b data-count="${a.restaurants.length}">0</b><span>restaurants in the ring</span></div>
            <div class="stat"><b data-count="${a.present.length}">0</b><span>blind kababs</span></div>
            <div class="stat"><b data-count="${a.nRatingsAll + a.nPre1Ratings}">0</b><span>ratings cast</span></div>
          </div>
          <div class="hint">Press <kbd>→</kbd> or <kbd>Space</kbd> to begin</div>
        </div>
      </div>`;
    },
  });

  /* 2 — Hype ranking */
  slides.push({
    id: 'hype', section: 'Before the bite', steps: 2,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.hypeOrder.length || a.hypeOrder.every((x) => x.avgRank == null)) return head('Before the bite', 'The Hype Ranking') + empty('No first-survey results yet.');
      const total = a.restaurants.length;
      const bestId = a.bestPerceived.map((x) => x.id), worstId = a.worstPerceived.map((x) => x.id);
      const rows = a.hypeOrder.map((x, i) => {
        const w = Math.max(6, ((total + 1 - x.avgRank) / total) * 100);
        const cls = bestId.includes(x.id) ? 'best' : worstId.includes(x.id) ? 'worst' : '';
        return `<div class="bar-row ${cls}" style="--i:${i}"><span class="rk">${i + 1}</span>${H.logo(x.id, 48)}<span class="bn">${nm(x.name)}</span>
          <span class="track"><span class="bar" style="--w:${w}%"></span></span><span class="bv">${(x.avgRank == null ? '–' : x.avgRank.toFixed(1))}</span></div>`;
      }).join('');
      const b = a.bestPerceived[0], w = a.worstPerceived[0];
      return `${head('Before the bite', 'The <em>Hype</em> Ranking', 'Average position when guests ranked every restaurant (1 = best)')}
      <div class="split hype">
        <div class="col-awards">
          ${award(H, { kicker: '👎 Worst perceived', items: a.worstPerceived, tone: 'bad', step: 1,
            stat: `Average position <b>${f1(w.avgRank)}</b> of ${total}`, note: w.lasts ? `Ranked dead last by <b>${plural(w.lasts, 'guest')}</b>` : '' })}
          ${award(H, { kicker: '👑 Best perceived', items: a.bestPerceived, tone: 'gold', step: 2,
            stat: `Average position <b>${f1(b.avgRank)}</b> of ${total}`, note: b.firsts ? `Ranked #1 by <b>${plural(b.firsts, 'guest')}</b>` : '' })}
        </div>
        <div class="chart bars">${rows}</div>
      </div>`;
    },
  });

  /* 3 — Popularity */
  slides.push({
    id: 'popularity', section: 'Before the bite', steps: 6,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.nPre || !a.mostDivisive.length || !a.mostFirstVotes.length) return head('Before the bite', 'Popularity Contest') + empty('No first-survey results yet.');
      const one = (arr) => arr[0];
      const fam = a.familiarity[0];
      const lp = one(a.leastPopular), mp = one(a.mostPopular);
      return `${head('Before the bite', 'The <em>Popularity</em> Contest', 'Who has actually been there? Every score a guest gave is proof they have eaten there.')}
      <div class="grid3">
        ${award(H, { kicker: '🦗 Least popular', items: a.leastPopular, step: 1, tone: 'bad', stat: `Only <b>${plural(lp.nRatings, 'guest')}</b> rated it` })}
        ${award(H, { kicker: '🔥 Most popular', items: a.mostPopular, step: 2, stat: `<b>${plural(mp.nRatings, 'guest')}</b> have been there` })}
        ${award(H, { kicker: '⚡ Most divisive', items: a.mostDivisive, step: 3, tone: 'spicy', stat: `Ranks swing by <b>±${f1(one(a.mostDivisive).rankStd)}</b> places`, note: 'Love it or hate it' })}
        ${award(H, { kicker: '💎 Cult favorite', items: a.cultFavorite, step: 4, tone: 'teal', stat: `Avg score <b>${f1(a.cultFavorite[0] && a.cultFavorite[0].avgRating)}</b> from just ${a.cultFavorite[0] ? plural(a.cultFavorite[0].nRatings, 'fan') : '–'}`, note: 'Small crowd, big love' })}
        ${award(H, { kicker: '🥇 Most #1 votes', items: a.mostFirstVotes, step: 5, stat: `<b>${plural(one(a.mostFirstVotes).firsts, 'first-place vote')}</b>` })}
        ${award(H, { kicker: '🏆 Crowd favorite', items: a.crowdFavorite, step: 6, tone: 'gold', stat: `Avg score <b>${f1(a.crowdFavorite[0] && a.crowdFavorite[0].avgRating)}</b> from <b>${a.crowdFavorite[0] ? plural(a.crowdFavorite[0].nRatings, 'guest') : '–'}</b>`, note: 'Best-rated among the well-known' })}
      </div>
      ${fam ? `<div class="fine" data-step="6">🧠 Familiarity effect: guests who had tried <b>${nm(fam.name)}</b> ranked it <b>#${f1(fam.avgRankRaters)}</b>, everyone else <b>#${f1(fam.avgRankNon)}</b>.</div>` : ''}`;
    },
  });

  /* 4 — The blind test: accuracy, decoys & mistaken identity */
  slides.push({
    id: 'blind', section: 'The blind test', steps: null,
    stepCount: (a) => a.kabs.length + 2,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.totalGuesses || !a.kabs.length) return head('The blind test', 'Mistaken Identity') + empty('No second-survey results yet.');
      const K = a.kabs.length; const rowH = Math.min(78, Math.floor(480 / K));
      const acc = a.overallAccuracy, chance = a.chance, circ = 2 * Math.PI * 150;
      const rows = a.kabs.map((k, i) => `
        <div class="id-row" data-step="${i + 1}" style="--rh:${rowH}px">
          <span class="kno">#${k.kabab}</span>
          <span class="id-real">${H.logo(k.id, rowH - 20)}<span><small>It was</small>${nm(k.name)}</span></span>
          <span class="id-guess"><small>Crowd's top guess</small>${k.topGuess ? `<span class="gn">${nm(k.topGuess.name)} <em>${k.topGuess.n}×</em></span>` : '–'}</span>
          <span class="id-acc"><span class="track"><span class="bar" style="--w:${Math.max(2, (k.accuracy || 0) * 100)}%"></span></span><b>${pct(k.accuracy)}</b></span>
          <span class="id-mark ${k.crowdRight ? 'ok' : 'no'}">${k.crowdRight ? '✓' : '✗'}</span>
        </div>`).join('');
      const hd = a.hardest[0], ez = a.easiest[0], mx = a.biggestMixup, fooled = a.decoyFooled[0];
      return `${head('The blind test', 'Mistaken <em>Identity</em>', `${plural(a.totalGuesses, 'guess', 'guesses')} from ${plural(a.nPost, 'guest')} — the real restaurant behind each number`)}
      <div class="split ident">
        <div class="id-table">${rows}</div>
        <div class="gauge-col">
          <div class="gauge sm">
            <svg viewBox="0 0 360 360"><circle class="g-bg" cx="180" cy="180" r="150"/>
              <circle class="g-fg" cx="180" cy="180" r="150" style="--c:${circ};--o:${circ * (1 - acc)}"/>
              <g transform="rotate(${chance * 360 - 90} 180 180)"><line class="g-mark" x1="318" y1="180" x2="348" y2="180"/></g></svg>
            <div class="g-txt"><b data-count="${Math.round(acc * 100)}" data-suffix="%">0%</b><span>identified correctly</span></div>
          </div>
          <div class="g-note">Random guessing: <b>${pct(chance)}</b> <i class="mk"></i></div>
          <div class="chips" data-step="${K + 1}">
            <div class="chip">🕵️ <b>${pct(a.decoyShare)}</b> of guesses named a <b>decoy</b>${fooled && fooled.n ? ` — <b>${nm(fooled.name)}</b> fooled ${fooled.n}×` : ''}</div>
            <div class="chip">🧠 Majority vote named <b>${a.crowdWisdomRight}/${a.present.length}</b> kababs correctly</div>
          </div>
        </div>
      </div>
      <div class="chips wide" data-step="${K + 2}">
        ${hd ? `<div class="chip"><span>🫥 Hardest to spot</span><b>${list(a.hardest.slice(0, 2))}</b><i>${pct(hd.accuracy)} got it</i></div>` : ''}
        ${ez ? `<div class="chip"><span>🎯 Easiest to spot</span><b>${list(a.easiest.slice(0, 2))}</b><i>${pct(ez.accuracy)} got it</i></div>` : ''}
        ${mx ? `<div class="chip"><span>🎭 Biggest mix-up</span><b>${plural(mx.n, 'guest')} thought #${mx.kabab} was ${nm(mx.guess)}</b><i>it was ${nm(mx.truth)}</i></div>` : ''}
      </div>`;
    },
  });

  /* 5 — People awards */
  slides.push({
    id: 'people', section: 'The blind test', steps: 6,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.accuracyBoard.length) return head('The blind test', 'The Taste Detectives') + empty('No second-survey results yet.');
      const board = a.accuracyBoard.slice(0, 3);
      const med = ['🥉', '🥈', '🥇'];
      const stepFor = (i) => 4 - i; // 3rd place first
      const pod = [1, 0, 2].filter((i) => board[i]).map((i) => {
        const p = board[i];
        return `<div class="pod pod-${i + 1}" data-step="${stepFor(i) + 2}">
          <span class="avatar big" style="--h:${hue(p.name)}">${esc(String(p.name).trim().slice(0, 1).toUpperCase())}</span>
          <div class="pod-name">${nm(p.name)}</div><div class="pod-score"><b>${p.correct}</b>/${p.nGuess} correct</div>
          <div class="pod-block"><span>${med[2 - i]}</span><em>${i + 1}</em></div></div>`;
      }).join('');
      const sf = a.superfans;
      const hardest = a.leastAccurate[0];
      return `${head('The blind test', 'The Taste <em>Detectives</em>', 'Who actually knew their kababs?')}
      <div class="split people">
        <div class="col-awards tight">
          ${personAward(H, { kicker: '🥄 Wooden spoon', items: a.leastAccurate.slice(0, 2), step: 1, tone: 'bad', stat: `<b>${hardest ? hardest.correct : 0}</b>/${hardest ? hardest.nGuess : 0} correct` })}
          ${sf.n ? `<div class="award teal" data-step="2"><div class="kicker">❤️ Loyalty test</div><div class="award-big"><b>${sf.recognised}</b> of <b>${sf.n}</b></div><div class="award-note">guests who scored a restaurant ${sf.threshold}+ before the party recognised its kabab blind</div></div>`
            : `<div class="award teal none" data-step="2"><div class="kicker">❤️ Loyalty test</div><div class="none-msg">Needs matching names in both surveys.</div></div>`}
          ${personAward(H, { kicker: '🔪 Harshest critic', items: a.harshest.slice(0, 2), step: 3, tone: 'spicy', stat: `Average score <b>${f1(a.harshest[0] && a.harshest[0].avgRating)}</b>` })}
          ${personAward(H, { kicker: '🤗 Most generous', items: a.mostGenerous.slice(0, 2), step: 4, tone: 'teal', stat: `Average score <b>${f1(a.mostGenerous[0] && a.mostGenerous[0].avgRating)}</b>` })}
        </div>
        <div class="podium-wrap">
          <div class="podium-title" data-step="3">🎯 Most accurate guests</div>
          <div class="podium">${pod}</div>
        </div>
      </div>`;
    },
  });

  /* ---- shared bits for the new slides ---- */
  function rankRows(arr, keyFn, tol = 1e-9) {
    let last = null, pos = 0;
    return arr.map((x, i) => { const k = keyFn(x); if (last === null || Math.abs(k - last) > tol) { pos = i + 1; last = k; } return { x, pos }; });
  }
  const avatar = (name, size) => `<span class="avatar" style="--h:${hue(name)};width:${size}px;height:${size}px;font-size:${Math.round(size * .45)}px">${esc(String(name).trim().slice(0, 1).toUpperCase())}</span>`;

  /* 6 — Guest leaderboards */
  slides.push({
    id: 'boards', section: 'The blind test', steps: 3,
    render(a) {
      const b = a.boards;
      if (!b || !b.detective.length) return head('The blind test', 'Guest Leaderboards') + empty('No second-survey results yet.');
      const n = Math.max(b.detective.length, b.price.length, b.taste.length);
      const rh = Math.min(54, Math.floor(600 / Math.max(1, n)));
      const col = (title, sub, rows, step, fmt, medals) => {
        const li = rows.map(({ x, pos }) => `<li class="${medals && pos === 1 ? 'first' : ''}"><span class="lb-pos">${medals && pos <= 3 ? ['🥇', '🥈', '🥉'][pos - 1] : pos}</span>${avatar(x.name, rh - 14)}<span class="lb-name">${nm(x.name)}</span><span class="lb-val">${fmt(x)}</span></li>`).join('');
        return `<div class="lb" data-step="${step}" style="--rh:${rh}px"><div class="lb-head"><b>${title}</b><small>${sub}</small></div><ol>${li || '<li class="empty">Not enough data</li>'}</ol></div>`;
      };
      return `${head('The blind test', 'Guest <em>Leaderboards</em>', 'Three ways to rank the room')}
      <div class="lb-grid">
        ${col('🕵️ Best detectives', 'kababs identified', rankRows(b.detective, (p) => p.correct), 1, (p) => `<b>${p.correct}</b>/${p.nGuess}`, true)}
        ${col('🎯 Best price guessers', 'average miss', rankRows(b.price, (p) => p.mape, 0.0005), 2, (p) => `±${pct(p.mape)}`, true)}
        ${col('🌡️ Harshest → most generous', 'average score given', rankRows(b.taste, (p) => p.avgRating, 0.005), 3, (p) => `<b>${p.avgRating.toFixed(1)}</b>`, false)}
      </div>`;
    },
  });

  /* 7 — The price is right */
  slides.push({
    id: 'price', section: 'The blind test', steps: 5,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const ks = a.kabs.filter((k) => k.avgPrice != null);
      if (!ks.length) return head('The blind test', 'The Price is Right') + empty('No price guesses yet.');
      const max = Math.max(...ks.map((k) => Math.max(k.avgPrice, k.actualPrice || 0))) * 1.12;
      const rows = ks.slice().sort((x, y) => (y.actualPrice || 0) - (x.actualPrice || 0)).map((k, i) => {
        const diff = k.priceDiffPct;
        return `<div class="bar-row price" style="--i:${i}">${H.logo(k.id, 48)}<span class="bn">${nm(k.name)}<small>#${k.kabab}</small></span>
          <span class="track"><span class="bar" style="--w:${(k.avgPrice / max) * 100}%"></span>
          ${k.actualPrice != null ? `<span class="actual" data-step="1" style="left:${(k.actualPrice / max) * 100}%"><em>${H.money(k.actualPrice)}</em></span>` : ''}</span>
          <span class="bv">${H.money(k.avgPrice)}${diff != null ? `<small data-step="1" class="${diff >= 0 ? 'up' : 'down'}">${sgn(diff * 100, 0)}%</small>` : ''}</span></div>`;
      }).join('');
      const s = a.bargain[0], o = a.overpriced[0];
      return `${head('The blind test', 'The Price <em>is Right</em>', 'What guests would pay for each kabab <i class="mk gold"></i> vs what it really costs <i class="mk white"></i>')}
      <div class="split price">
        <div class="chart bars price-chart">${rows}<div class="legend" data-step="1"><span><i class="sw bar"></i> avg. guess</span><span><i class="sw mk"></i> real price</span></div></div>
        <div class="col-awards tight">
          ${personAward(H, { kicker: '🎯 Best price guesser', items: a.bestPriceGuesser.slice(0, 2), step: 2, tone: 'gold', stat: `Off by only <b>${pct(a.bestPriceGuesser[0] && a.bestPriceGuesser[0].mape)}</b> on average` })}
          ${award(H, { kicker: '🎁 Steal of the night', items: a.bargain, step: 3, tone: 'teal', stat: `Guests would pay <b>${s ? sgn(s.priceDiffPct * 100, 0) : ''}%</b> more than the ${s ? H.money(s.actualPrice) : ''} price` })}
          ${award(H, { kicker: '💸 Sticker shock', items: a.overpriced, step: 4, tone: 'bad', stat: `Guests valued it <b>${o ? sgn(o.priceDiffPct * 100, 0) : ''}%</b> vs its ${o ? H.money(o.actualPrice) : ''} price` })}
          ${personAward(H, { kicker: '🤑 Big spender', items: a.bigSpender.slice(0, 2), step: 5, tone: 'spicy', stat: `Averaged <b>${H.money(a.bigSpender[0] && a.bigSpender[0].avgPrice)}</b> per kabab` })}
        </div>
      </div>`;
    },
  });

  /* 8 — Plot twists */
  slides.push({
    id: 'twists', section: 'The blind test', steps: 6,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.totalGuesses) return head('The blind test', 'Plot Twists') + empty('No second-survey results yet.');
      const card = (step, tone, kicker, big, text, note) => `<div class="twist ${tone}" data-step="${step}"><div class="kicker">${kicker}</div><div class="twist-big">${big}</div><div class="twist-txt">${text}</div>${note ? `<div class="twist-note">${note}</div>` : ''}</div>`;
      const h = a.halo, ex = a.experience, tw = a.twins, op = a.opposites, cp = a.crowdPrice, mt = a.moneyTalks;
      const mag = a.guessMagnet[0], inv = a.invisible[0];
      const cards = [];
      cards.push(h && h.diff != null
        ? card(1, 'gold', '🎭 The halo effect', `${sgn(h.diff)}<small> pts</small>`, `Kababs guests <b>believed</b> came from a top-hyped restaurant scored <b>${f1(h.hyped)}</b>, versus <b>${f1(h.unhyped)}</b> for those they thought were from the least-hyped ones.`, 'Belief changes taste — a little.')
        : card(1, 'gold', '🎭 The halo effect', '–', 'Not enough guesses to compare.'));
      cards.push(ex && ex.known != null && ex.unknown != null
        ? card(2, 'teal', '📍 Does experience help?', `${pct(ex.known)}<small> vs ${pct(ex.unknown)}</small>`, `Guests recognised a restaurant they had <b>already rated</b> ${pct(ex.known)} of the time, versus ${pct(ex.unknown)} for places they had not tried.`, Math.abs(ex.known - ex.unknown) < 0.08 ? 'Having been there made almost no difference.' : ex.known > ex.unknown ? 'Having been there helps.' : 'Having been there did not help at all.')
        : card(2, 'teal', '📍 Does experience help?', '–', 'Not enough data to compare.'));
      cards.push(tw
        ? card(3, '', '👯 Taste twins', `${nm(tw.a)} &amp; ${nm(tw.b)}`, `Scored the kababs almost identically (correlation <b>${f2(tw.r)}</b> over ${tw.n} kababs).`, op ? `Taste opposites: <b>${nm(op.a)}</b> &amp; <b>${nm(op.b)}</b> (${f2(op.r)})` : '')
        : card(3, '', '👯 Taste twins', '–', 'Not enough data.'));
      cards.push(cp
        ? card(4, 'teal', '🧠 Wisdom of the crowd', `${cp.beat}<small> of ${cp.of}</small>`, `The group's <b>average</b> price guess missed by ${pct(cp.crowd)}, beating <b>${plural(cp.beat, 'individual')}</b> out of ${cp.of} (typical guest missed by ${pct(cp.avgIndividual)}).`, cp.beat >= cp.of / 2 ? 'Crowds beat most people.' : '')
        : card(4, 'teal', '🧠 Wisdom of the crowd', '–', 'Not enough price guesses.'));
      cards.push(mt && mt.r != null
        ? card(5, 'spicy', '💸 Money talks', f2(mt.r), mt.r > 0.25 ? 'Guests offered <b>more money</b> for kababs they scored higher — taste really did drive willingness to pay.' : mt.r < -0.25 ? 'Weirdly, guests offered <b>less</b> for kababs they scored higher.' : 'Price guesses had <b>almost nothing to do</b> with how good the kabab tasted.', `correlation over ${mt.n} ratings`)
        : card(5, 'spicy', '💸 Money talks', '–', 'Not enough data.'));
      cards.push(mag
        ? card(6, 'bad', '🕵️ The usual suspect', `${nm(mag.name)}`, `Named <b>${plural(mag.n, 'time')}</b> — more than any other restaurant${mag.present ? '' : ', even though it was a <b>decoy</b>'}.`, inv ? `Least suspected of the served ones: <b>${nm(inv.name)}</b> (${plural(inv.n, 'guess', 'guesses')}).` : '')
        : card(6, 'bad', '🕵️ The usual suspect', '–', 'Not enough guesses.'));
      return `${head('The blind test', 'Plot <em>Twists</em>', 'What the numbers say about us')}<div class="twist-grid">${cards.join('')}</div>`;
    },
  });

  /* 9 — Expectation vs reality (placements 1–3 stay hidden) */
  slides.push({
    id: 'reality', section: 'The verdict', steps: 5,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.exp.length || !a.blindOrder.length) return head('The verdict', 'Hype vs Reality') + empty('Needs both surveys.');
      const K = a.present.length;
      const journey = (e) => `<div class="journey"><span class="pill">Hype <b>#${e.hypePos}</b></span><span class="arrow">➜</span><span class="pill ${e.blindPos <= 3 ? '' : e.move > 0 ? 'up' : e.move < 0 ? 'down' : ''}">Blind <b>${finishLabel(e.blindPos, K)}</b></span></div>`;
      const card = (kicker, arr, step, tone, note) => {
        if (!arr.length) return `<div class="award ${tone} none" data-step="${step}"><div class="kicker">${kicker}</div><div class="none-msg">Nobody qualified.</div></div>`;
        const e = arr[0];
        return `<div class="award ${tone}" data-step="${step}"><div class="kicker">${kicker}</div>
          <div class="award-body">${H.logo(e.id, 96)}<div class="award-txt"><div class="award-name">${list(arr)}</div>${journey(e)}</div></div>
          <div class="award-note">${note(e)}</div></div>`;
      };
      const strip = [];
      if (a.hypeCorrelation != null) {
        const c = a.hypeCorrelation;
        const txt = Math.abs(c) < 0.25 ? 'Hype and taste were basically <b>unrelated</b>.' : c > 0 ? 'Hype was a <b>decent predictor</b> of taste.' : 'Hype and taste were <b>opposites</b>.';
        strip.push(`<div class="strip-item">🔮 ${txt} <small>(correlation ${f2(c)})</small></div>`);
      }
      const hb = a.heartbreaks[0], su = a.surprises[0];
      if (hb) strip.push(`<div class="strip-item">💔 <b>${nm(hb.name)}</b> rated ${nm(hb.restaurant)} a <b>${hb.pre}</b> before… then gave its kabab a <b>${hb.post}</b>${hb.recognised ? '' : ' without knowing it'}.</div>`);
      if (su) strip.push(`<div class="strip-item">😍 <b>${nm(su.name)}</b> went from a <b>${su.pre}</b> to a <b>${su.post}</b> for ${nm(su.restaurant)}.</div>`);
      const hidden = (e) => e.blindPos <= 3;
      return `${head('The verdict', 'Hype vs <em>Reality</em>', 'Where each restaurant stood before the party compared with how its kabab did blind')}
      <div class="grid2">
        ${card('⭐ Most anticipated', a.mostAnticipated, 1, '', (e) => (hidden(e) ? 'How it really did? <b>Revealed at the end.</b>' : `Blind average: <b>${f1(e.postAvg)}</b>${e.preAvg != null ? ` · fans said <b>${f1(e.preAvg)}</b>` : ''}`))}
        ${card('📉 The underperformer', a.underperformer, 2, 'bad', (e) => (hidden(e) ? 'Fell short of the hype — the exact place is revealed at the end.' : `Slid <b>${Math.abs(e.move)}</b> ${Math.abs(e.move) === 1 ? 'place' : 'places'} from the hype`))}
        ${card('🐕 The underdog', a.underdog, 3, 'teal', (e) => (hidden(e) ? 'Beat the hype from the bottom half — the exact place is revealed at the end.' : `Climbed <b>${e.move}</b> ${e.move === 1 ? 'place' : 'places'} from the bottom half of the hype`))}
        ${card('📈 Most underrated', a.mostUnderrated, 4, 'gold', (e) => `Blind scores beat the reputation by <b>${sgn(e.gap)}</b> points${e.nPaired ? ` (${plural(e.nPaired, 'guest')} rated both)` : ''}`)}
      </div>
      <div class="strip" data-step="5">${strip.join('')}</div>`;
    },
  });

  /* 10 — Bang for the buck */
  slides.push({
    id: 'value', section: 'The verdict', steps: 3,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const vs = a.valueOrder;
      if (vs.length < 2) return head('The verdict', 'Bang for the Buck') + empty('Needs prices and ratings.');
      const max = vs[0].value;
      const bestId = a.valueKing.map((k) => k.id), worstId = a.valueWorst.map((k) => k.id);
      const rows = vs.map((k, i) => `<div class="bar-row val ${bestId.includes(k.id) ? 'best' : worstId.includes(k.id) ? 'worst' : ''}" style="--i:${i}">
        <span class="rk">${i + 1}</span>${H.logo(k.id, 48)}<span class="bn">${nm(k.name)}</span><span class="pricetag">${H.money(k.actualPrice)}</span>
        <span class="track"><span class="bar" style="--w:${Math.max(5, (k.value / max) * 100)}%"></span></span>
        <span class="bv">${k.value.toFixed(2)}<small>pts per ${esc(ctx.cfg.currency)}</small></span></div>`).join('');
      const b = a.valueKing[0], w = a.valueWorst[0];
      const c = a.priceRatingCorr;
      const link = c == null ? '' : Math.abs(c) < 0.3 ? 'barely related' : c > 0 ? 'linked: you mostly <b>got what you paid for</b>' : 'inversely linked: <b>the pricier the kabab, the lower the score</b>';
      const vcard = (kicker, items, tone, step) => {
        const k = items[0];
        return award(H, { kicker, items, tone, step, stat: `<b>${k.value.toFixed(2)}</b> points per ${esc(ctx.cfg.currency)}`, note: `${H.money(k.actualPrice)} a kabab · <b>${H.money(k.actualPrice / (k.avgRating || 1))}</b> for every taste point` });
      };
      return `${head('The verdict', 'Bang for the <em>Buck</em>', 'Taste points earned per dollar of menu price (higher = better value)')}
      <div class="split value">
        <div class="col-awards">
          ${vcard('🪙 Worst bang for the buck', a.valueWorst, 'bad', 1)}
          ${vcard('💰 Best bang for the buck', a.valueKing, 'gold', 2)}
        </div>
        <div class="chart bars value-chart">${rows}
          ${link ? `<div class="fine" data-step="3">💸 Price tag vs. taste score: ${link} <small>(correlation ${f2(c)})</small></div>` : ''}</div>
      </div>`;
    },
  });

  /* 11 — Everyone's favourite */
  slides.push({
    id: 'favorites', section: 'The verdict', steps: 1,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.favs.length) return head('The verdict', 'Everyone’s Favorite') + empty('No ratings yet.');
      const n = a.favs.length, cols = n <= 8 ? 4 : n <= 12 ? 4 : 5, rows = Math.ceil(n / cols);
      const ch = Math.min(170, Math.floor(640 / rows) - 14);
      const cards = a.favs.map((f, i) => {
        const bests = f.best.slice(0, 2);
        const ent = bests.map((b) => `<span class="fav-r">${H.logo(b.id, 40)}<span>${nm(b.name)}</span></span>`).join('');
        return `<div class="fav" style="--i:${i};--ch:${ch}px"><div class="fav-who">${avatar(f.name, 46)}<b>${nm(f.name)}</b><span class="fav-score">${f.best[0].rating}<small>/10</small></span></div>${ent}</div>`;
      }).join('');
      const ties = a.favs.filter((f) => f.best.length > 1).length;
      return `${head('The verdict', 'Everyone’s <em>Favorite</em>', 'The highest-scored kabab of each guest')}
      <div class="fav-grid" style="--cols:${cols}">${cards}</div>
      ${ties ? `<div class="fine" data-step="1">🤝 ${plural(ties, 'guest')} could not pick just one (a tie at the top).</div>` : ''}`;
    },
  });

  /* 12 — The popular vote */
  slides.push({
    id: 'votes', section: 'The verdict', steps: 2,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.favs.length) return head('The verdict', 'The Popular Vote') + empty('No ratings yet.');
      const chart = (arr, tone) => {
        const max = Math.max(1, ...arr.map((x) => x.n));
        return arr.map((x, i) => { return `<div class="bar-row vote ${tone}" style="--i:${i}">${H.logo(x.id, 44)}<span class="bn">${nm(x.name)}</span><span class="track"><span class="bar" style="--w:${Math.max(x.n ? 4 : 0, (x.n / max) * 100)}%"></span></span><span class="bv">${x.n}</span></div>`; }).join('');
      };
      const nGuests = a.favs.length;
      return `${head('The verdict', 'The Popular <em>Vote</em>', `How many of the ${nGuests} guests ranked each kabab as their favorite — and as their least favorite`)}
      <div class="vote-cols">
        <div class="vote-col" data-step="1"><div class="chart-title">👍 Picked as <em>favorite</em></div><div class="chart bars">${chart(a.topPicks, 'good')}</div></div>
        <div class="vote-col" data-step="2"><div class="chart-title">👎 Picked as <em>least favorite</em></div><div class="chart bars">${chart(a.lastPicks, 'badv')}</div></div>
      </div>`;
    },
  });

  /* 13 — Taste similarity */
  slides.push({
    id: 'similarity', section: 'The verdict', steps: 4,
    render(a) {
      const m = a.sim;
      if (!m || m.names.length < 3 || !m.map) return head('The verdict', 'Taste Similarity') + empty('Needs a few more guests.');
      const n = m.names.length, cell = Math.min(40, Math.floor(520 / n));
      const col = (r) => (r == null ? 'rgba(255,244,224,.05)' : r >= 0 ? `rgba(45,212,191,${(0.12 + 0.88 * r).toFixed(2)})` : `rgba(255,77,109,${(0.12 + 0.88 * -r).toFixed(2)})`);
      const cells = m.r.map((row, i) => `<span class="sim-name" style="--i:${i}">${nm(m.names[i])}</span>` + row.map((r, j) => (i === j
        ? '<span class="sim-c self"></span>'
        : `<span class="sim-c" style="background:${col(r)};--i:${i}" title="${esc(m.names[i])} / ${esc(m.names[j])}: ${r == null ? 'n/a' : r.toFixed(2)}"></span>`)).join('')).join('');
      const heads = m.names.map((x) => `<span class="sim-col"><em>${nm(x)}</em></span>`).join('');
      // taste map (SVG)
      const W = 780, Hh = 290, px = (x) => W / 2 + x * (W / 2 - 70), py = (y) => Hh / 2 + y * (Hh / 2 - 44);
      const pts = m.map.map((q) => ({ name: q.name, x: px(q.x), y: py(q.y) }));
      for (let it = 0; it < 120; it++) { // gently push overlapping dots apart so every name stays readable
        for (let a1 = 0; a1 < pts.length; a1++) for (let b1 = a1 + 1; b1 < pts.length; b1++) {
          let dx = pts[b1].x - pts[a1].x, dy = pts[b1].y - pts[a1].y, d = Math.hypot(dx, dy);
          if (d < 62) { if (d < 0.01) { dx = 1; dy = (a1 % 2) - 0.5; d = 1; } const k = (62 - d) / 2 / d; pts[a1].x -= dx * k; pts[a1].y -= dy * k; pts[b1].x += dx * k; pts[b1].y += dy * k; }
        }
        pts.forEach((q) => { q.x = Math.max(44, Math.min(W - 44, q.x)); q.y = Math.max(46, Math.min(Hh - 40, q.y)); });
      }
      const pos = Object.fromEntries(pts.map((q) => [q.name, q]));
      const link = (p, cls) => (p && pos[p.a] && pos[p.b] ? `<line class="${cls}" x1="${pos[p.a].x.toFixed(1)}" y1="${pos[p.a].y.toFixed(1)}" x2="${pos[p.b].x.toFixed(1)}" y2="${pos[p.b].y.toFixed(1)}"/>` : '');
      // place each name where it overlaps nothing else (above, below, right or left of its dot)
      const placed = [];
      const boxOf = (q, o) => { const w = String(q.name).length * 9.5 + 10; return o === 'a' ? [q.x - w / 2, q.y - 46, w, 22] : o === 'b' ? [q.x - w / 2, q.y + 22, w, 22] : o === 'r' ? [q.x + 22, q.y - 11, w, 22] : [q.x - 22 - w, q.y - 11, w, 22]; };
      const hit = (A, B) => Math.max(0, Math.min(A[0] + A[2], B[0] + B[2]) - Math.max(A[0], B[0])) * Math.max(0, Math.min(A[1] + A[3], B[1] + B[3]) - Math.max(A[1], B[1]));
      pts.forEach((q) => {
        let best = null;
        ['a', 'b', 'r', 'l'].forEach((o) => {
          const bx = boxOf(q, o);
          let cost = placed.reduce((acc, r) => acc + hit(bx, r), 0) + pts.reduce((acc, d) => acc + (d === q ? 0 : hit(bx, [d.x - 18, d.y - 18, 36, 36])), 0);
          if (bx[0] < 4 || bx[0] + bx[2] > W - 4) cost += 1e4;
          if (!best || cost < best.cost) best = { o, cost, bx };
        });
        q.lo = best.o; placed.push(best.bx);
      });
      const lblAttr = (q) => (q.lo === 'a' ? 'x="0" y="-26" text-anchor="middle"' : q.lo === 'b' ? 'x="0" y="38" text-anchor="middle"' : q.lo === 'r' ? 'x="26" y="6" text-anchor="start"' : 'x="-26" y="6" text-anchor="end"');
      const dots = pts.map((q, i) => `<g class="tm-dot" style="--i:${i}" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})"><circle r="17" style="fill:hsl(${hue(q.name)} 70% 52%)"/><text y="6" text-anchor="middle" class="tm-ini">${esc(String(q.name).trim().slice(0, 1).toUpperCase())}</text><text ${lblAttr(q)} class="tm-lbl">${esc(q.name)}</text></g>`).join('');
      const map = `<svg viewBox="0 0 ${W} ${Hh}" class="taste-map"><circle class="tm-ring" cx="${W / 2}" cy="${Hh / 2}" r="${Hh / 2 - 22}"/><circle class="tm-ring" cx="${W / 2}" cy="${Hh / 2}" r="${(Hh / 2 - 22) / 2}"/>${link(a.twins, 'tm-link twin')}${dots}</svg>`;
      const pair = (kicker, p, tone, text) => (p
        ? `<div class="award ${tone}"><div class="kicker">${kicker}</div><div class="award-body">${avatar(p.a, 54)}${avatar(p.b, 54)}<div class="award-txt"><div class="award-name">${nm(p.a)} &amp; ${nm(p.b)}</div><div class="award-stat">${text(p)}</div></div></div></div>`
        : `<div class="award ${tone} none"><div class="kicker">${kicker}</div><div class="none-msg">Not enough shared ratings.</div></div>`);
      const one = (kicker, p, tone, text) => (p
        ? `<div class="award ${tone}"><div class="kicker">${kicker}</div><div class="award-body">${avatar(p.name, 54)}<div class="award-txt"><div class="award-name">${nm(p.name)}</div><div class="award-stat">${text(p)}</div></div></div></div>`
        : `<div class="award ${tone} none"><div class="kicker">${kicker}</div><div class="none-msg">Not enough data.</div></div>`);
      const mood = m.avg == null ? '' : m.avg > 0.35 ? 'The room has <b>a shared palate</b>' : m.avg > 0.1 ? 'Tastes <b>overlap a little</b>' : 'Everyone has <b>their own palate</b>';
      return `${head('The verdict', 'Taste <em>Similarity</em>', 'Do we like the same kababs? Correlation of each pair’s ratings — teal = alike, red = opposite')}
      <div class="split sim-split">
        <div class="sim-wrap" style="--n:${n};--cell:${cell}px">
          <div class="sim-grid"><span></span>${heads}${cells}</div>
          <div class="sim-legend"><span>opposite taste</span><i></i><span>same taste</span></div>
        </div>
        <div class="sim-right">
          <div class="taste-map-card" data-step="1"><div class="kicker">🧭 The taste map <small>closer together = more similar taste</small></div>${map}</div>
          <div class="sim-cards">
            <div data-step="2">${pair('👯 Taste twins', a.twins, 'teal', (p) => `correlation <b>${f2(p.r)}</b>`)}</div>
            <div data-step="2">${pair('⚔️ Taste opposites', a.opposites, 'bad', (p) => `correlation <b>${f2(p.r)}</b>`)}</div>
            <div data-step="3">${one('🎯 In tune with the crowd', a.inTune, 'gold', (p) => `agreement with the room <b>${f2(p.r)}</b>`)}</div>
            <div data-step="3">${one('🦄 The contrarian', a.contrarian, 'spicy', (p) => `agreement with the room <b>${f2(p.r)}</b>`)}</div>
          </div>
          <div class="strip sim-strip" data-step="4">
            <div class="strip-item">🌍 ${mood} <small>(average pair correlation ${f2(m.avg)})</small></div>
            <div class="strip-item">💞 <b>${m.kindred}</b> of ${m.pairs} pairs are kindred spirits (0.5+)</div>
            <div class="strip-item">💥 <b>${m.clash}</b> of ${m.pairs} pairs clash (−0.3 or lower)</div>
          </div>
        </div>
      </div>`;
    },
  });

  /* 14 — The table (top 3 revealed one by one; #1 stays locked) */
  slides.push({
    id: 'countdown', section: 'The verdict', steps: null,
    stepCount: (a) => Math.max(0, a.blindOrder.length - 1),
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const N = a.blindOrder.length;
      if (!N) return head('The verdict', 'The Table') + empty('No ratings yet.');
      const rowH = Math.min(92, Math.floor(650 / N));
      const rows = a.blindOrder.map((k, idx) => {
        const label = `${k.blindPos}${k.tied ? '=' : ''}`;
        const step = N - idx; // last place first
        const champ = idx === 0;
        const ph = `<div class="cd-ph ${champ ? 'champ' : ''} ${k.blindPos <= 3 ? 'top3' : ''}" ${champ ? '' : `data-hide-from="${step}"`}><span class="cd-pos">${label}</span><span class="cd-q">${champ ? '🔒 The champion — revealed on the final slide' : k.blindPos <= 3 ? '🔒 Top 3' : '?'}</span></div>`;
        if (champ) return `<div class="cd-slot" style="--rh:${rowH}px">${ph}</div>`;
        return `<div class="cd-slot" style="--rh:${rowH}px">${ph}
          <div class="cd-row ${k.blindPos <= 3 ? 'top3' : ''}" data-step="${step}"><span class="cd-pos">${label}</span>${H.logo(k.id, rowH - 22)}
            <span class="cd-name">${nm(k.name)}<small>Kabab #${k.kabab} · ${plural(k.nRatings, 'rating')}</small></span>
            <span class="track"><span class="bar" style="--w:${(k.avgRating / 10) * 100}%"></span></span>
            <span class="cd-score">${k.avgRating.toFixed(2)}</span>
            <span class="cd-price"><small>guessed / real</small>${H.money(k.avgPrice)} <i>/</i> ${H.money(k.actualPrice)}</span></div></div>`;
      });
      return `${head('The verdict', 'The <em>Table</em>', 'Average blind rating out of 10 — from last place up. The top 3 stay hidden until their turn.')}
      <div class="countdown">${rows.join('')}</div>
      ${a.bias ? '<div class="bias-note" data-step="' + Math.max(1, N - 1) + '">🔬 Checked for prior-experience bias — backup page on <kbd>B</kbd></div>' : ''}`;
    },
  });

  /* 15 — Winner */
  slides.push({
    id: 'winner', section: 'The verdict', steps: 2, finale: true,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const w = a.winner;
      if (!w) return head('The verdict', 'The Winner') + empty('No ratings yet.');
      const kPhoto = ctx.img('kabab-' + w.kabab), gPhoto = ctx.img('group');
      const runner = a.blindOrder.find((k) => !a.winners.includes(k));
      const margin = runner ? w.avgRating - runner.avgRating : null;
      const names = a.winners.map((x) => nm(x.name)).join(' <span class="amp">&amp;</span> ');
      const best = a.valueKing.some((k) => k.id === w.id);
      const votes = (a.topPicks.find((x) => x.id === w.id) || {}).n;
      const e = a.exp.find((x) => x.id === w.id);
      const foot = [
        w.topGuess && w.topGuess.id !== w.id ? `Most guests thought it was <b>${nm(w.topGuess.name)}</b>.` : '',
        votes ? `It was the favorite of <b>${votes}</b> of ${a.favs.length} guests.` : '',
        best ? 'Also the best value of the night.' : '',
        e ? `Hype ranking before the party: <b>#${e.hypePos}</b> of ${a.present.length}.` : '',
      ].filter(Boolean).join(' ');
      return `<div class="finale">
        <div class="drum" data-hide-from="1"><div class="eyebrow center"><i></i>The moment you've been waiting for<i></i></div>
          <h1 class="drum-h">And the best kabab<br>of the night is…</h1><div class="beat"><i></i><i></i><i></i></div></div>
        <div class="reveal-no" data-step="1"><span>KABAB</span><b>#${w.kabab}</b></div>
        <div class="reveal" data-step="2">
          ${a.tie ? '<div class="tie">It\'s a tie!</div>' : ''}
          <div class="crown">👑</div>
          <div class="win-logo">${H.logo(w.id, 220)}</div>
          <h1 class="win-name">${names}</h1>
          <div class="win-stats">
            <div><b>${f2(w.avgRating)}</b><span>average blind score</span></div>
            <div><b>${H.money(w.actualPrice)}</b><span>real price${w.avgPrice != null ? ` · guests guessed ${H.money(w.avgPrice)}` : ''}</span></div>
            <div><b>${pct(w.accuracy)}</b><span>of guests recognised it</span></div>
            ${margin != null && margin > 0 ? `<div><b>${sgn(margin, 2)}</b><span>ahead of ${nm(runner.name)}</span></div>` : ''}
          </div>
          <div class="win-foot">${foot}</div>
          ${kPhoto ? `<img class="win-photo k" src="${kPhoto}" alt="">` : ''}
          ${gPhoto ? `<img class="win-photo g" src="${gPhoto}" alt="">` : ''}
        </div>
      </div>`;
    },
  });

  root.KASlides = { slides, esc, helpers: ctxHelpers, nm, pct, f2, hue };
})(window);
