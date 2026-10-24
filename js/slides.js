/* The 10 slides. Each slide: { id, section, steps, render(a, ctx) -> html }.
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
  const list = (arr, key = 'name') => arr.map((x) => nm(x[key])).join(' &amp; ');
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
    if (pos === 1) return '<span class="lock">🔒 revealed at the end</span>';
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
      if (!a.hypeOrder.length) return head('Before the bite', 'The Hype Ranking') + empty('No first-survey results yet.');
      const total = a.restaurants.length;
      const bestId = a.bestPerceived.map((x) => x.id), worstId = a.worstPerceived.map((x) => x.id);
      const rows = a.hypeOrder.map((x, i) => {
        const w = Math.max(6, ((total + 1 - x.avgRank) / total) * 100);
        const cls = bestId.includes(x.id) ? 'best' : worstId.includes(x.id) ? 'worst' : '';
        return `<div class="bar-row ${cls}" style="--i:${i}"><span class="rk">${i + 1}</span>${H.logo(x.id, 48)}<span class="bn">${nm(x.name)}</span>
          <span class="track"><span class="bar" style="--w:${w}%"></span></span><span class="bv">${x.avgRank.toFixed(1)}</span></div>`;
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
      if (!a.pre.length) return head('Before the bite', 'Popularity Contest') + empty('No first-survey results yet.');
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

  /* 4 — The blind test: accuracy & decoys */
  slides.push({
    id: 'blind', section: 'The blind test', steps: 3,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.totalGuesses) return head('The blind test', 'Detective Work') + empty('No second-survey results yet.');
      const acc = a.overallAccuracy, chance = a.chance;
      const circ = 2 * Math.PI * 150;
      const max = Math.max(...a.guessRows.map((x) => x.n), 1);
      const rows = a.guessRows.slice().sort((x, y) => y.n - x.n).map((x, i) => `
        <div class="bar-row ${x.present ? '' : 'decoy'}" style="--i:${i}">${H.logo(x.id, 44)}<span class="bn">${nm(x.name)}${x.present ? '' : '<em class="tag decoy-tag">DECOY</em>'}</span>
        <span class="track"><span class="bar" style="--w:${Math.max(2, (x.n / max) * 100)}%"></span></span><span class="bv">${x.n}</span></div>`).join('');
      const fooled = a.decoyFooled[0];
      return `${head('The blind test', 'Detective <em>Work</em>', `${plural(a.totalGuesses, 'guess', 'guesses')} from ${plural(a.nPost, 'guest')} on ${plural(a.present.length, 'unlabelled kabab')}`)}
      <div class="split blind">
        <div class="gauge-col">
          <div class="gauge">
            <svg viewBox="0 0 360 360"><circle class="g-bg" cx="180" cy="180" r="150"/>
              <circle class="g-fg" cx="180" cy="180" r="150" style="--c:${circ};--o:${circ * (1 - acc)}"/>
              <g transform="rotate(${chance * 360 - 90} 180 180)"><line class="g-mark" x1="318" y1="180" x2="348" y2="180"/></g></svg>
            <div class="g-txt"><b data-count="${Math.round(acc * 100)}" data-suffix="%">0%</b><span>identified correctly</span></div>
          </div>
          <div class="g-note">Random guessing would score <b>${pct(chance)}</b> <i class="mk"></i></div>
          <div class="chips">
            <div class="chip" data-step="2"><b>${pct(a.decoyShare)}</b> of guesses were for <b>decoys</b> that were never served</div>
            <div class="chip" data-step="3"><b>${a.crowdWisdomRight}/${a.present.length}</b> kababs were named correctly by majority vote</div>
          </div>
        </div>
        <div class="chart bars decoys-chart">
          <div class="chart-title">Who did guests <em>think</em> they were eating?</div>
          ${rows}
          <div class="callout" data-step="1">🕵️ ${a.decoys.length} of these ${a.restaurants.length} were <b>decoys</b>${fooled && fooled.n ? ` — <b>${nm(fooled.name)}</b> fooled the most people (${fooled.n}×)` : ''}</div>
        </div>
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

  /* 6 — Mistaken identity */
  slides.push({
    id: 'identity', section: 'The blind test', steps: 8,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.kabs.length) return head('The blind test', 'Mistaken Identity') + empty('No kabab data yet.');
      const K = a.kabs.length; const rowH = Math.min(84, Math.floor(540 / K));
      const rows = a.kabs.map((k, i) => `
        <div class="id-row" data-step="${i + 1}" style="--rh:${rowH}px">
          <span class="kno">#${k.kabab}</span>
          <span class="id-real">${H.logo(k.id, rowH - 24)}<span><small>It was</small>${nm(k.name)}</span></span>
          <span class="id-guess"><small>Crowd's top guess</small>${k.topGuess ? `<span class="gn">${nm(k.topGuess.name)} <em>${k.topGuess.n}×</em></span>` : '–'}</span>
          <span class="id-acc"><span class="track"><span class="bar" style="--w:${Math.max(2, (k.accuracy || 0) * 100)}%"></span></span><b>${pct(k.accuracy)}</b></span>
          <span class="id-mark ${k.crowdRight ? 'ok' : 'no'}">${k.crowdRight ? '✓' : '✗'}</span>
        </div>`).join('');
      const hd = a.hardest[0], ez = a.easiest[0], mx = a.biggestMixup;
      return `${head('The blind test', 'Mistaken <em>Identity</em>', 'The real restaurant behind each number — and how many guests spotted it')}
      <div class="id-table">${rows}</div>
      <div class="chips wide" data-step="${K + 1}">
        ${hd ? `<div class="chip"><span>🫥 Hardest to spot</span><b>${list(a.hardest.slice(0, 2))}</b><i>${pct(hd.accuracy)} got it</i></div>` : ''}
        ${ez ? `<div class="chip"><span>🎯 Easiest to spot</span><b>${list(a.easiest.slice(0, 2))}</b><i>${pct(ez.accuracy)} got it</i></div>` : ''}
        ${mx ? `<div class="chip"><span>🎭 Biggest mix-up</span><b>${plural(mx.n, 'guest')} thought #${mx.kabab} was ${nm(mx.guess)}</b><i>it was ${nm(mx.truth)}</i></div>` : ''}
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

  /* 8 — Expectation vs reality */
  slides.push({
    id: 'reality', section: 'The verdict', steps: 5,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      if (!a.exp.length || !a.blindOrder.length) return head('The verdict', 'Hype vs Reality') + empty('Needs both surveys.');
      const K = a.present.length;
      const journey = (e) => `<div class="journey"><span class="pill">Hype <b>#${e.hypePos}</b></span><span class="arrow">➜</span><span class="pill ${e.move > 0 ? 'up' : e.move < 0 ? 'down' : ''}">Blind <b>${finishLabel(e.blindPos, K)}</b></span></div>`;
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
      return `${head('The verdict', 'Hype vs <em>Reality</em>', 'Where each restaurant stood before the party compared with how its kabab did blind')}
      <div class="grid2">
        ${card('⭐ Most anticipated', a.mostAnticipated, 1, '', (e) => (e.postAvg != null ? `Blind average: <b>${f1(e.postAvg)}</b>${e.preAvg != null ? ` · fans said <b>${f1(e.preAvg)}</b>` : ''}` : ''))}
        ${card('📉 The underperformer', a.underperformer, 2, 'bad', (e) => `Slid <b>${Math.abs(e.move)}</b> ${Math.abs(e.move) === 1 ? 'place' : 'places'} from the hype`)}
        ${card('🐕 The underdog', a.underdog, 3, 'teal', (e) => `Climbed <b>${e.move}</b> ${e.move === 1 ? 'place' : 'places'} from the bottom half of the hype`)}
        ${card('📈 Most underrated', a.mostUnderrated, 4, 'gold', (e) => `Blind scores beat the reputation by <b>${sgn(e.gap)}</b> points${e.nPaired ? ` (${plural(e.nPaired, 'guest')} rated both)` : ''}`)}
      </div>
      <div class="strip" data-step="5">${strip.join('')}</div>`;
    },
  });

  /* 9 — Countdown */
  slides.push({
    id: 'countdown', section: 'The verdict', steps: null,
    stepCount: (a) => Math.max(0, a.blindOrder.length - 1),
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const N = a.blindOrder.length;
      if (!N) return head('The verdict', 'The Countdown') + empty('No ratings yet.');
      const rowH = Math.min(92, Math.floor(660 / N));
      const maxR = 10;
      const rows = a.blindOrder.slice(1).map((k, idx) => {
        const pos = idx + 2; const step = N - pos + 1;
        return `<div class="cd-row ${pos === 2 ? 'second' : ''}" data-step="${step}" style="--rh:${rowH}px">
          <span class="cd-pos">${pos}</span>${H.logo(k.id, rowH - 22)}
          <span class="cd-name">${nm(k.name)}<small>Kabab #${k.kabab} · ${plural(k.nRatings, 'rating')}</small></span>
          <span class="track"><span class="bar" style="--w:${(k.avgRating / maxR) * 100}%"></span></span>
          <span class="cd-score">${k.avgRating.toFixed(2)}</span>
          <span class="cd-price"><small>guessed / real</small>${H.money(k.avgPrice)} <i>/</i> ${H.money(k.actualPrice)}</span>
        </div>`;
      });
      const locked = `<div class="cd-row locked" style="--rh:${rowH}px"><span class="cd-pos">1</span><span class="logo mono q" style="--sz:${rowH - 22}px"><b>?</b></span>
        <span class="cd-name">The champion<small>Revealed on the next slide…</small></span></div>`;
      return `${head('The verdict', 'The <em>Countdown</em>', 'Average blind rating out of 10, from last place up')}
      <div class="countdown">${locked}${rows.join('')}</div>`;
    },
  });

  /* 10 — Winner */
  slides.push({
    id: 'winner', section: 'The verdict', steps: 2, finale: true,
    render(a, ctx) {
      const H = ctxHelpers(a, ctx);
      const w = a.winner;
      if (!w) return head('The verdict', 'The Winner') + empty('No ratings yet.');
      const photo = ctx.img('kabab-' + w.kabab) || ctx.img('group');
      const runner = a.blindOrder.find((k) => !a.winners.includes(k));
      const margin = runner ? w.avgRating - runner.avgRating : null;
      const names = a.winners.map((x) => nm(x.name)).join(' <span class="amp">&amp;</span> ');
      const best = a.valueKing.some((k) => k.id === w.id);
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
          <div class="win-foot">${w.topGuess && w.topGuess.id !== w.id ? `Most guests thought it was <b>${nm(w.topGuess.name)}</b>. ` : ''}${best ? 'Also the best value of the night. ' : ''}${(() => { const e = a.exp.find((x) => x.id === w.id); return e ? `Hype ranking before the party: <b>#${e.hypePos}</b> of ${a.present.length}.` : ''; })()}</div>
          ${photo ? `<img class="win-photo" src="${photo}" alt="">` : ''}
        </div>
      </div>`;
    },
  });

  root.KASlides = { slides, esc };
})(window);
