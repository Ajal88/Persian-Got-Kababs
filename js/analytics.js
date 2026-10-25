/* Kabab Showdown — analytics.
 * Pure functions (no DOM). Works in the browser (window.KA) and in Node (module.exports) for testing.
 *
 * Resolved data shape (names already mapped to restaurant ids):
 *   restaurants: [{ id, name, present, kabab, price }]
 *   s1: [{ pid, name, rank: { rid: position(1=best) }, rating: { rid: number } }]
 *   s2: [{ pid, name, k: { kababNo: { guess: rid|null, rating: number|null, price: number|null } } }]
 */
(function (root) {
  'use strict';

  /* ---------- text helpers ---------- */
  const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

  function latinDigits(s) {
    return String(s).replace(/[۰-۹]/g, (d) => PERSIAN_DIGITS.indexOf(d)).replace(/[٠-٩]/g, (d) => ARABIC_DIGITS.indexOf(d));
  }

  function toNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    const s = latinDigits(v).replace(/٫/g, '.').replace(/[,،٬]/g, '').replace(/[^0-9.\-]/g, '');
    if (!s || s === '.' || s === '-') return null;
    const n = parseFloat(s);
    return isFinite(n) ? n : null;
  }

  /** Normalise a person's name so tiny typing differences still match. */
  function normName(s) {
    return String(s == null ? '' : s)
      .replace(/[‌‏‎]/g, ' ')
      .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
      .normalize('NFKC').toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  }

  function normRestaurant(s) {
    return String(s == null ? '' : s).toLowerCase()
      .replace(/\b(kabob|kebab|kabab|kebap|kabub|kabop)s?\b/g, 'kabab')
      .replace(/[^a-z0-9؀-ۿ\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    a = normRestaurant(a); b = normRestaurant(b);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const ta = new Set(a.split(' ')), tb = new Set(b.split(' '));
    let inter = 0; ta.forEach((t) => { if (tb.has(t)) inter++; });
    const jac = inter / (ta.size + tb.size - inter);
    const lev = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
    return Math.max(jac, lev);
  }

  /** Best matching candidate from list (strings) or null. */
  function bestMatch(name, candidates, threshold) {
    let best = null, bestScore = 0, second = 0;
    candidates.forEach((c) => {
      const sc = similarity(name, c.name);
      if (sc > bestScore) { second = bestScore; bestScore = sc; best = c; } else if (sc > second) second = sc;
    });
    if (best && bestScore >= (threshold || 0.5) && bestScore - second > 0.04) return best;
    return null;
  }

  /* ---------- stats helpers ---------- */
  const nums = (a) => a.filter((x) => typeof x === 'number' && isFinite(x));
  const mean = (a) => { a = nums(a); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
  const sum = (a) => nums(a).reduce((s, x) => s + x, 0);
  const median = (a) => {
    a = nums(a).sort((x, y) => x - y); if (!a.length) return null;
    const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
  };
  const stdev = (a) => {
    a = nums(a); if (a.length < 2) return a.length ? 0 : null;
    const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length);
  };
  function pearson(xs, ys) {
    const n = Math.min(xs.length, ys.length); if (n < 3) return null;
    const mx = mean(xs), my = mean(ys); let num = 0, dx = 0, dy = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); dx += (xs[i] - mx) ** 2; dy += (ys[i] - my) ** 2; }
    return dx && dy ? num / Math.sqrt(dx * dy) : null;
  }
  const round = (x, d = 1) => (x == null ? null : Math.round(x * 10 ** d) / 10 ** d);

  /** Items with the best value of fn (max by default), keeping ties. */
  function extremes(items, fn, dir = 'max') {
    const list = items.filter((x) => fn(x) != null && isFinite(fn(x)));
    if (!list.length) return [];
    const best = list.reduce((b, x) => (dir === 'max' ? Math.max(b, fn(x)) : Math.min(b, fn(x))), dir === 'max' ? -Infinity : Infinity);
    return list.filter((x) => Math.abs(fn(x) - best) < 1e-9);
  }
  function sortBy(items, fn, dir = 'desc') {
    return items.slice().sort((a, b) => {
      const x = fn(a), y = fn(b);
      if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return dir === 'desc' ? y - x : x - y;
    });
  }

  /* ---------- the big one ---------- */
  function analyze(d) {
    const R = d.restaurants;
    const byId = Object.fromEntries(R.map((r) => [r.id, r]));
    const present = R.filter((r) => r.present && r.kabab != null).sort((a, b) => a.kabab - b.kabab);
    const decoys = R.filter((r) => !present.includes(r));
    const out = { restaurants: R, present, decoys, nPre: d.s1.length, nPost: d.s2.length };
    const kabByNo = Object.fromEntries(present.map((r) => [r.kabab, r]));
    // Guests with a private plate numbering (e.g. the organisers) see different kabab numbers.
    const priv = d.priv && d.priv.map ? d.priv.map : null;
    const truthIdFor = (p, no) => (p.priv && priv ? priv[no] || null : (kabByNo[no] ? kabByNo[no].id : null));
    const kabNoFor = (p, rid) => {
      if (p.priv && priv) { const k = Object.keys(priv).find((x) => priv[x] === rid); return k == null ? null : +k; }
      return byId[rid] ? byId[rid].kabab : null;
    };

    /* ===== PRE-EVENT ===== */
    const pre = R.map((r) => {
      const ranks = [], ratings = [], raterRanks = [], nonRaterRanks = [];
      let firsts = 0, lasts = 0;
      d.s1.forEach((p) => {
        const pos = p.rank[r.id];
        const has = p.rating[r.id] != null;
        if (pos != null) {
          ranks.push(pos);
          (has ? raterRanks : nonRaterRanks).push(pos);
          if (pos === 1) firsts++;
          const maxPos = Math.max(...Object.values(p.rank));
          if (pos === maxPos) lasts++;
        }
        if (has) ratings.push(p.rating[r.id]);
      });
      return {
        id: r.id, name: r.name, present: r.present,
        avgRank: mean(ranks), rankStd: stdev(ranks), firsts, lasts,
        nRatings: ratings.length, avgRating: mean(ratings), ratings,
        avgRankRaters: mean(raterRanks), avgRankNon: mean(nonRaterRanks),
        nRaterRank: raterRanks.length, nNonRank: nonRaterRanks.length,
      };
    });
    const preById = Object.fromEntries(pre.map((x) => [x.id, x]));
    const hypeOrder = sortBy(pre, (x) => x.avgRank, 'asc');
    hypeOrder.forEach((x, i) => { x.hypePos = i + 1; });
    out.pre = pre; out.hypeOrder = hypeOrder;
    out.bestPerceived = extremes(pre, (x) => x.avgRank, 'min');
    out.worstPerceived = extremes(pre, (x) => x.avgRank, 'max');
    out.mostPopular = extremes(pre, (x) => x.nRatings, 'max');
    out.leastPopular = extremes(pre, (x) => x.nRatings, 'min');
    const medN = median(pre.map((x) => x.nRatings));
    const popular = pre.filter((x) => x.nRatings >= medN && x.avgRating != null);
    const niche = pre.filter((x) => x.nRatings < medN && x.avgRating != null);
    out.crowdFavorite = extremes(popular, (x) => x.avgRating, 'max');
    out.cultFavorite = extremes(niche.length ? niche : pre.filter((x) => x.avgRating != null), (x) => x.avgRating, 'max');
    out.bestRated = extremes(pre, (x) => x.avgRating, 'max');
    out.worstRated = extremes(pre, (x) => x.avgRating, 'min');
    out.mostDivisive = extremes(pre, (x) => x.rankStd, 'max');
    out.mostUnanimous = extremes(pre, (x) => x.rankStd, 'min');
    out.mostFirstVotes = extremes(pre, (x) => x.firsts, 'max');
    out.mostLastVotes = extremes(pre, (x) => x.lasts, 'max');
    out.familiarity = extremes(pre.filter((x) => x.avgRankRaters != null && x.avgRankNon != null && x.nRaterRank >= 2 && x.nNonRank >= 2),
      (x) => Math.abs(x.avgRankRaters - x.avgRankNon), 'max');
    out.medianRatings = medN;

    /* ===== BLIND TEST ===== */
    const cells = []; // each (person, kabab) response
    d.s2.forEach((p) => {
      Object.keys(p.k).forEach((no) => {
        const c = p.k[no]; const tid = truthIdFor(p, no); const truth = tid ? byId[tid] : null;
        cells.push({ pid: p.pid, name: p.name, kabab: +no, truth: truth ? truth.id : null, guess: c.guess, rating: c.rating, price: c.price,
          correct: truth && c.guess ? c.guess === truth.id : null });
      });
    });
    out.cells = cells;

    const kabs = present.map((r) => {
      const cs = cells.filter((c) => c.truth === r.id);
      const guessed = cs.filter((c) => c.guess);
      const counts = {};
      guessed.forEach((c) => { counts[c.guess] = (counts[c.guess] || 0) + 1; });
      const guessList = Object.entries(counts).map(([id, n]) => ({ id, name: byId[id] ? byId[id].name : id, n })).sort((a, b) => b.n - a.n);
      const wrong = guessList.filter((g) => g.id !== r.id);
      const ratings = nums(cs.map((c) => c.rating)), prices = nums(cs.map((c) => c.price));
      const correct = counts[r.id] || 0;
      return {
        id: r.id, name: r.name, kabab: r.kabab, actualPrice: r.price,
        n: cs.length, nGuess: guessed.length, correct, accuracy: guessed.length ? correct / guessed.length : null,
        guessList, topGuess: guessList[0] || null, topWrong: wrong[0] || null,
        crowdRight: guessList.length ? guessList[0].id === r.id && (!guessList[1] || guessList[1].n < guessList[0].n) : null,
        avgRating: mean(ratings), nRatings: ratings.length, ratingStd: stdev(ratings), ratings,
        avgPrice: mean(prices), medPrice: median(prices), nPrices: prices.length, prices,
        priceDiff: r.price != null && prices.length ? mean(prices) - r.price : null,
        priceDiffPct: r.price ? (prices.length ? (mean(prices) - r.price) / r.price : null) : null,
        value: r.price && mean(ratings) != null ? mean(ratings) / r.price : null,
      };
    });
    out.kabs = kabs;
    const kById = Object.fromEntries(kabs.map((k) => [k.id, k]));
    out.kabById = kById;

    const gs = cells.filter((c) => c.guess && c.truth);
    out.totalGuesses = gs.length;
    out.totalCorrect = gs.filter((c) => c.correct).length;
    out.overallAccuracy = gs.length ? out.totalCorrect / gs.length : null;
    out.chance = R.length ? 1 / R.length : null;
    out.chanceAmongPresent = present.length ? 1 / present.length : null;
    out.hardest = extremes(kabs.filter((k) => k.accuracy != null), (k) => k.accuracy, 'min');
    out.easiest = extremes(kabs.filter((k) => k.accuracy != null), (k) => k.accuracy, 'max');
    out.crowdWisdomRight = kabs.filter((k) => k.crowdRight).length;

    // guess popularity (all restaurants incl. decoys)
    const guessCount = {};
    R.forEach((r) => { guessCount[r.id] = 0; });
    gs.forEach((c) => { guessCount[c.guess]++; });
    const guessRows = R.map((r) => ({ id: r.id, name: r.name, present: r.present, n: guessCount[r.id] }));
    out.guessRows = guessRows;
    const decoyRows = guessRows.filter((x) => !x.present);
    out.decoyGuesses = sum(decoyRows.map((x) => x.n));
    out.decoyShare = gs.length ? out.decoyGuesses / gs.length : null;
    out.decoyFooled = extremes(decoyRows, (x) => x.n, 'max');
    out.guessMagnet = extremes(guessRows, (x) => x.n, 'max');
    out.neverGuessed = guessRows.filter((x) => x.n === 0);

    // biggest single mix-up
    let mix = null;
    kabs.forEach((k) => k.guessList.forEach((g) => {
      if (g.id !== k.id && (!mix || g.n > mix.n)) mix = { kabab: k.kabab, truth: k.name, truthId: k.id, guess: g.name, guessId: g.id, n: g.n, guessIsDecoy: !byId[g.id].present };
    }));
    out.biggestMixup = mix;

    /* ----- people ----- */
    const people = d.s2.map((p) => {
      const cs = cells.filter((c) => c.pid === p.pid);
      const g = cs.filter((c) => c.guess && c.truth);
      const correct = g.filter((c) => c.correct).length;
      const pr = cs.filter((c) => c.price != null && c.truth && byId[c.truth].price);
      const mape = mean(pr.map((c) => Math.abs(c.price - byId[c.truth].price) / byId[c.truth].price));
      const bias = mean(pr.map((c) => (c.price - byId[c.truth].price) / byId[c.truth].price));
      return {
        pid: p.pid, name: p.name, correct, nGuess: g.length, accuracy: g.length ? correct / g.length : null,
        avgRating: mean(cs.map((c) => c.rating)), nRatings: nums(cs.map((c) => c.rating)).length,
        avgPrice: mean(cs.map((c) => c.price)), nPrices: pr.length, mape, bias,
        correctKababs: g.filter((c) => c.correct).map((c) => c.kabab), priv: !!p.priv,
      };
    });
    out.people = people;
    const scored = people.filter((p) => p.nGuess > 0);
    out.accuracyBoard = scored.slice().sort((a, b) => (b.correct - a.correct) || ((a.mape ?? 9) - (b.mape ?? 9)) || a.name.localeCompare(b.name));
    out.mostAccurate = out.accuracyBoard.length ? scored.filter((p) => p.correct === out.accuracyBoard[0].correct) : [];
    const minC = scored.length ? Math.min(...scored.map((p) => p.correct)) : 0;
    out.leastAccurate = scored.filter((p) => p.correct === minC);
    out.noCorrect = scored.filter((p) => p.correct === 0).length;
    const w3 = people.filter((p) => p.nRatings >= 3);
    out.harshest = extremes(w3, (p) => p.avgRating, 'min');
    out.mostGenerous = extremes(w3, (p) => p.avgRating, 'max');
    const p3 = people.filter((p) => p.nPrices >= 3);
    out.bestPriceGuesser = extremes(p3, (p) => p.mape, 'min');
    out.worstPriceGuesser = extremes(p3, (p) => p.mape, 'max');
    out.bigSpender = extremes(people.filter((p) => p.avgPrice != null), (p) => p.avgPrice, 'max');
    out.cheapskate = extremes(people.filter((p) => p.avgPrice != null), (p) => p.avgPrice, 'min');

    /* ----- price ----- */
    out.bargain = extremes(kabs, (k) => k.priceDiffPct, 'max');       // people would pay far more than it costs
    out.overpriced = extremes(kabs, (k) => k.priceDiffPct, 'min');    // people think it is cheaper than it costs
    out.priceSpot = extremes(kabs.filter((k) => k.priceDiffPct != null), (k) => Math.abs(k.priceDiffPct), 'min');
    out.mostWilling = extremes(kabs, (k) => k.avgPrice, 'max');
    out.leastWilling = extremes(kabs, (k) => k.avgPrice, 'min');
    out.actualPriciest = extremes(kabs, (k) => k.actualPrice, 'max');
    out.actualCheapest = extremes(kabs, (k) => k.actualPrice, 'min');
    out.priceAvgError = mean(people.map((p) => p.mape));
    out.priceCorrelation = pearson(kabs.filter((k) => k.avgPrice != null && k.avgRating != null).map((k) => k.avgPrice),
      kabs.filter((k) => k.avgPrice != null && k.avgRating != null).map((k) => k.avgRating));
    out.priceVsActualCorr = pearson(kabs.filter((k) => k.avgPrice != null && k.actualPrice != null).map((k) => k.avgPrice),
      kabs.filter((k) => k.avgPrice != null && k.actualPrice != null).map((k) => k.actualPrice));
    out.totalActual = sum(present.map((r) => r.price));

    /* ----- expectations vs reality ----- */
    const post = kabs.filter((k) => k.avgRating != null).sort((x, y) => (y.avgRating - x.avgRating) || ((y.avgPrice || 0) - (x.avgPrice || 0)) || x.name.localeCompare(y.name));
    post.forEach((k, i) => {
      const prev = post[i - 1];
      k.blindPos = prev && Math.abs(prev.avgRating - k.avgRating) < 1e-9 ? prev.blindPos : i + 1; // ties share a place
      k.tied = post.some((o) => o !== k && Math.abs(o.avgRating - k.avgRating) < 1e-9);
    });
    out.top3Ids = post.filter((k) => k.blindPos <= 3).map((k) => k.id);
    out.blindOrder = post;
    const preP = sortBy(present.map((r) => preById[r.id]), (x) => x.avgRank, 'asc');
    preP.forEach((x, i) => { x.hypePosPresent = i + 1; });
    const exp = kabs.map((k) => {
      const p = preById[k.id];
      const paired = [];
      d.s1.forEach((s1) => {
        const pre1 = s1.rating[k.id]; if (pre1 == null) return;
        d.s2.forEach((s2) => {
          if (s2.pid !== s1.pid) return;
          const c = s2.k[kabNoFor(s2, k.id)]; if (c && c.rating != null) paired.push({ name: s1.name, pre: pre1, post: c.rating, diff: c.rating - pre1 });
        });
      });
      const gap = paired.length ? mean(paired.map((x) => x.diff)) : (p.avgRating != null && k.avgRating != null ? k.avgRating - p.avgRating : null);
      return {
        id: k.id, name: k.name, kabab: k.kabab, hypePos: p.hypePosPresent, blindPos: k.blindPos || null,
        move: k.blindPos ? p.hypePosPresent - k.blindPos : null, // + = climbed
        preAvg: p.avgRating, postAvg: k.avgRating, gap, nPaired: paired.length,
      };
    });
    out.exp = exp;
    out.mostAnticipated = exp.filter((e) => e.hypePos === 1);
    out.underperformer = extremes(exp.filter((e) => e.move != null && e.move < 0), (e) => e.move, 'min');
    const half = Math.ceil(present.length / 2);
    const dogPool = exp.filter((e) => e.move != null && e.move > 0 && e.hypePos > half);
    out.underdog = extremes(dogPool, (e) => e.move, 'max');
    const up = exp.filter((e) => e.gap != null && e.gap > 0 && !out.underdog.some((u) => u.id === e.id));
    out.mostUnderrated = extremes(up.length ? up : exp.filter((e) => e.gap != null && e.gap > 0), (e) => e.gap, 'max');
    out.mostOverrated = extremes(exp.filter((e) => e.gap != null && e.gap < 0), (e) => e.gap, 'min');
    out.hypeCorrelation = pearson(exp.filter((e) => e.blindPos).map((e) => e.hypePos), exp.filter((e) => e.blindPos).map((e) => e.blindPos));
    out.hypeLeaderFinish = out.mostAnticipated.length && out.mostAnticipated[0].blindPos ? out.mostAnticipated[0].blindPos : null;

    // person-level heartbreak / pleasant surprise
    const pairs = [];
    exp.forEach((e) => {
      d.s1.forEach((s1) => {
        const pre1 = s1.rating[e.id]; if (pre1 == null) return;
        const s2 = d.s2.find((x) => x.pid === s1.pid); if (!s2) return;
        const c = s2.k[kabNoFor(s2, e.id)]; if (!c || c.rating == null) return;
        pairs.push({ name: s1.name, restaurant: e.name, kabab: e.kabab, pre: pre1, post: c.rating, diff: c.rating - pre1, recognised: c.guess === e.id });
      });
    });
    out.pairs = pairs;
    out.heartbreaks = sortBy(pairs.filter((x) => x.diff < 0), (x) => x.diff, 'asc').slice(0, 3);
    out.surprises = sortBy(pairs.filter((x) => x.diff > 0), (x) => x.diff, 'desc').slice(0, 3);

    // superfans: gave 8+ before the party — did they recognise it blind?
    let fans = pairs.filter((x) => x.pre >= 8);
    out.superfans = { n: fans.length, recognised: fans.filter((x) => x.recognised).length, threshold: 8 };
    if (!fans.length) {
      fans = pairs.filter((x) => x.pre >= 7);
      out.superfans = { n: fans.length, recognised: fans.filter((x) => x.recognised).length, threshold: 7 };
    }

    // halo: do kababs people *believed* were from a hyped place score higher?
    const third = Math.max(1, Math.floor(R.length / 3));
    const hyped = new Set(hypeOrder.slice(0, third).map((x) => x.id));
    const unhyped = new Set(hypeOrder.slice(-third).map((x) => x.id));
    const hi = nums(cells.filter((c) => c.guess && hyped.has(c.guess)).map((c) => c.rating));
    const lo = nums(cells.filter((c) => c.guess && unhyped.has(c.guess)).map((c) => c.rating));
    out.halo = { hyped: mean(hi), unhyped: mean(lo), nHyped: hi.length, nUnhyped: lo.length,
      diff: hi.length && lo.length ? mean(hi) - mean(lo) : null,
      hypedNames: hypeOrder.slice(0, third).map((x) => x.name), unhypedNames: hypeOrder.slice(-third).map((x) => x.name) };
    // does being right make it taste better?
    const rr = nums(cells.filter((c) => c.correct === true).map((c) => c.rating));
    const ww = nums(cells.filter((c) => c.correct === false).map((c) => c.rating));
    out.rightVsWrong = { right: mean(rr), wrong: mean(ww), nRight: rr.length, nWrong: ww.length };

    /* ----- final ranking ----- */
    out.winners = [];
    if (post.length) {
      const top = post[0].avgRating;
      out.winners = post.filter((k) => Math.abs(k.avgRating - top) < 1e-9);
      if (out.winners.length > 1) { // tie-break: crowd would pay more
        out.winners = sortBy(out.winners, (k) => k.avgPrice, 'desc');
        out.tie = true;
      }
    }
    out.winner = out.winners[0] || null;
    out.last = post.length ? post[post.length - 1] : null;
    out.priceRatingCorr = pearson(kabs.filter((k) => k.actualPrice != null && k.avgRating != null).map((k) => k.actualPrice), kabs.filter((k) => k.actualPrice != null && k.avgRating != null).map((k) => k.avgRating));
    out.valueOrder = sortBy(kabs.filter((k) => k.value != null), (k) => k.value, 'desc');
    out.valueKing = extremes(kabs, (k) => k.value, 'max');
    out.valueWorst = extremes(kabs, (k) => k.value, 'min');
    out.avgRatingAll = mean(cells.map((c) => c.rating));
    out.nRatingsAll = nums(cells.map((c) => c.rating)).length;
    out.nPre1Ratings = sum(pre.map((x) => x.nRatings));
    /* ===== extra insight ===== */
    const s1ByPid = Object.fromEntries(d.s1.map((p) => [p.pid, p]));
    // guest leaderboards
    out.boards = {
      detective: out.accuracyBoard,
      price: people.filter((p) => p.nPrices >= 3 && p.mape != null).sort((a, b) => a.mape - b.mape),
      taste: people.filter((p) => p.nRatings >= 3).sort((a, b) => a.avgRating - b.avgRating), // harshest first
    };
    // individual favourites / least favourites (restaurants, using each guest's own numbering)
    const favs = [];
    d.s2.forEach((p) => {
      const cs = cells.filter((c) => c.pid === p.pid && c.rating != null && c.truth && byId[c.truth] && byId[c.truth].present);
      if (cs.length < 2) return;
      const hi = Math.max(...cs.map((c) => c.rating)), lo = Math.min(...cs.map((c) => c.rating));
      const pick = (v) => cs.filter((c) => c.rating === v).map((c) => ({ id: c.truth, name: byId[c.truth].name, rating: c.rating }));
      favs.push({ pid: p.pid, name: p.name, best: pick(hi), worst: hi === lo ? [] : pick(lo), avg: mean(cs.map((c) => c.rating)) });
    });
    out.favs = favs;
    const voteBy = (key) => present.map((r) => ({ id: r.id, name: r.name, n: favs.filter((f) => f[key].some((x) => x.id === r.id)).length }));
    out.topPicks = voteBy('best').sort((a, b) => b.n - a.n);
    out.lastPicks = voteBy('worst').sort((a, b) => b.n - a.n);
    // taste twins / opposites
    const vec = {};
    d.s2.forEach((p) => { const v = {}; cells.filter((c) => c.pid === p.pid && c.rating != null && c.truth).forEach((c) => { v[c.truth] = c.rating; }); vec[p.pid] = v; });
    const pairsT = [];
    for (let i = 0; i < d.s2.length; i++) for (let j = i + 1; j < d.s2.length; j++) {
      const a = vec[d.s2[i].pid], b = vec[d.s2[j].pid];
      const keys = Object.keys(a).filter((k) => b[k] != null);
      if (keys.length < 5) continue;
      const r = pearson(keys.map((k) => a[k]), keys.map((k) => b[k]));
      if (r != null) pairsT.push({ a: d.s2[i].name, b: d.s2[j].name, r, n: keys.length });
    }
    out.twins = sortBy(pairsT, (x) => x.r, 'desc')[0] || null;
    out.opposites = sortBy(pairsT, (x) => x.r, 'asc')[0] || null;
    // does having been there help? (guest had rated the restaurant before the party)
    let fa = [0, 0], fn = [0, 0];
    cells.forEach((c) => {
      if (!c.guess || !c.truth) return;
      const known = s1ByPid[c.pid] && s1ByPid[c.pid].rating[c.truth] != null;
      const t = known ? fa : fn; t[1]++; if (c.correct) t[0]++;
    });
    out.experience = { known: fa[1] ? fa[0] / fa[1] : null, nKnown: fa[1], unknown: fn[1] ? fn[0] / fn[1] : null, nUnknown: fn[1] };
    // wisdom of the crowd on prices
    const crowdErr = mean(kabs.filter((k) => k.avgPrice != null && k.actualPrice).map((k) => Math.abs(k.avgPrice - k.actualPrice) / k.actualPrice));
    const indiv = people.filter((p) => p.mape != null);
    out.crowdPrice = crowdErr == null || !indiv.length ? null : { crowd: crowdErr, avgIndividual: mean(indiv.map((p) => p.mape)), beat: indiv.filter((p) => p.mape > crowdErr).length, of: indiv.length };
    // money talks: do tastier kababs get higher price guesses (relative to their real price)?
    const mc = cells.filter((c) => c.rating != null && c.price != null && c.truth && byId[c.truth].price);
    out.moneyTalks = mc.length >= 6 ? { r: pearson(mc.map((c) => c.rating), mc.map((c) => c.price / byId[c.truth].price)), n: mc.length } : null;
    // polarising / unanimous kabab (spread of ratings; no ranking info)
    out.polarising = extremes(kabs.filter((k) => k.ratingStd != null), (k) => k.ratingStd, 'max');
    out.unanimous = extremes(kabs.filter((k) => k.ratingStd != null), (k) => k.ratingStd, 'min');
    out.invisible = extremes(guessRows.filter((x) => x.present), (x) => x.n, 'min');
    out.matchedPeople = d.s2.filter((p) => d.s1.some((q) => q.pid === p.pid)).length;
    return out;
  }

  /* ---------- resolve raw parsed surveys into ids ---------- */
  /**
   * raw1: { restaurants:[names], rows:[{name, ts, ranking:[names], ratings:{name:number|null}}] }
   * raw2: { kababNos:[...], rows:[{name, ts, k:{no:{guess:string|null, rating, price}}}] }
   * setup: { restaurants:[{id,name,present,kabab,price}], nameAliases:{normGuess: rid}, personLinks:{normS2Name: normS1Name} }
   */
  function resolve(raw1, raw2, setup) {
    const R = setup.restaurants;
    const idByNorm = {};
    R.forEach((r) => { idByNorm[normRestaurant(r.name)] = r.id; });
    const alias = setup.nameAliases || {};
    const toId = (name) => {
      if (name == null) return null;
      const n = normRestaurant(name); if (!n) return null;
      return alias[n] || idByNorm[n] || null;
    };
    const dedupe = (rows) => {
      const m = new Map();
      rows.forEach((r) => {
        const key = normName(r.name) || ('row' + m.size);
        const old = m.get(key);
        if (!old || (r.ts || 0) >= (old.ts || 0)) m.set(key, r);
      });
      return [...m.values()];
    };
    const s1 = raw1 ? dedupe(raw1.rows).map((row) => {
      const rank = {}; let pos = 0;
      row.ranking.forEach((nm) => { const id = toId(nm); if (id && rank[id] == null) rank[id] = ++pos; });
      const rating = {};
      Object.entries(row.ratings).forEach(([nm, v]) => { const id = toId(nm); if (id && v != null) rating[id] = v; });
      return { pid: normName(row.name), name: String(row.name || '').trim(), rank, rating };
    }) : [];
    const links = setup.personLinks || {};
    const privSet = new Set(setup.privateGuests || []);
    const s2 = raw2 ? dedupe(raw2.rows).map((row) => {
      const k = {};
      Object.entries(row.k).forEach(([no, c]) => {
        k[no] = { guess: toId(c.guess), rating: c.rating, price: c.price };
      });
      const n = normName(row.name);
      return { pid: links[n] || n, name: String(row.name || '').trim(), k, priv: privSet.has(n) };
    }) : [];
    // private map is "their number -> our number"; turn it into "their number -> restaurant id"
    let priv = null;
    if (setup.privateMap && Object.keys(setup.privateMap).length && privSet.size) {
      const byNo = {}; R.forEach((r) => { if (r.present && r.kabab != null) byNo[r.kabab] = r.id; });
      const map = {}; Object.keys(setup.privateMap).forEach((k) => { map[k] = byNo[setup.privateMap[k]] || null; });
      priv = { map };
    }
    return { restaurants: R, s1, s2, priv };
  }

  const KA = { latinDigits, toNumber, normName, normRestaurant, similarity, bestMatch, levenshtein, mean, median, stdev, pearson, round, analyze, resolve, sortBy, extremes };
  if (typeof module !== 'undefined' && module.exports) module.exports = KA; else root.KA = KA;
})(typeof window !== 'undefined' ? window : globalThis);
