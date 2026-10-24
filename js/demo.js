/* Demo data so the presentation can be previewed before the real results exist. */
(function (root) {
  'use strict';
  const KA = root.KA || (typeof require !== 'undefined' ? require('./analytics.js') : null);

  function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function build(seed = 7) {
    const rand = rng(seed);
    const R = [
      ['Persian Plate', 1, 18, 7.2, 6.5], ['Pardis Persian Cuisine', 2, 22, 8.4, 8.0], ['Turkish Kebab House', null, 0, 5, 4],
      ['Caspian Kebab', 3, 20, 6.4, 7.4], ['House of Kabob', 4, 17, 7.0, 6.2], ['Kabob Garden', 5, 15, 5.6, 6.8],
      ['Berekat Kebab House', null, 0, 5, 4], ['Bahar Kabab', null, 0, 5, 4], ['Kabob Land', 6, 14, 4.6, 5.0], ['Newruz Kabob House', 7, 19, 8.0, 5.8],
    ].map((r, i) => ({ id: 'r' + (i + 1), name: r[0], present: !!r[1], kabab: r[1], price: r[1] ? r[2] : null, hype: r[3], quality: r[4] }));

    const names = ['Sara', 'Ali', 'Reza', 'Nazanin', 'Kian', 'Mina', 'Arash', 'Leila', 'Dara', 'Shirin', 'Babak', 'Parisa', 'Omid', 'Yasaman', 'Farhad',
      'Niloofar', 'Amirabbas', 'بوز', 'Sina', 'Mahsa', 'Pouya', 'Taraneh', 'Hamed', 'Roya', 'Navid', 'Elham', 'Soheil'];
    const gauss = () => (rand() + rand() + rand() - 1.5) * 1.4;
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

    // organisers get a different plate numbering (private mapping)
    const served = R.filter((r) => r.present);
    const nos = served.map((r) => r.kabab);
    const perm = nos.slice().reverse().map((n, i, a) => a[(i + 2) % a.length]);
    const privateMap = Object.fromEntries(nos.map((n, i) => [n, perm[i]])); // their # -> our #
    const privNames = ['Amirabbas', 'Mina'];
    const raw1 = { restaurants: R.map((r) => r.name), rows: [] };
    const raw2 = { kababNos: [1, 2, 3, 4, 5, 6, 7], rows: [] };
    names.forEach((nm, pi) => {
      const taste = R.map((r) => ({ r, s: r.hype + gauss() * 2.2 })).sort((a, b) => b.s - a.s);
      const ratings = {};
      R.forEach((r) => { ratings[r.name] = rand() < 0.35 + r.hype / 25 ? clamp(Math.round(r.hype + gauss() * 2), 1, 10) : null; });
      raw1.rows.push({ name: nm, ts: pi, ranking: taste.map((t) => t.r.name), ratings });

      if (rand() < 0.92) {
        const k = {}; const priceBias = 0.7 + rand() * 0.8; const skill = rand();
        const isPriv = privNames.includes(nm);
        nos.forEach((no) => {
          const r = isPriv ? R.find((x) => x.kabab === privateMap[no]) : R.find((x) => x.kabab === no);
          let guess;
          const u = rand();
          if (u < 0.18 + skill * 0.3) guess = r.name;
          else if (u < 0.8) guess = R[Math.floor(rand() * R.length)].name;
          else guess = r.id === 'r9' ? 'Kabob Land' : (rand() < .5 ? 'Caspian Kabob' : 'Pardis Kabob Cuisine');
          const rating = rand() < 0.97 ? clamp(Math.round(r.quality + gauss() * 1.9), 1, 10) : null;
          const price = Math.max(1, Math.round(r.price * priceBias * (0.65 + rand() * 0.7)));
          k[no] = { guess, rating, price };
        });
        raw2.rows.push({ name: nm, ts: pi, k });
      }
    });
    const setup = { restaurants: R.map(({ id, name, present, kabab, price }) => ({ id, name, present, kabab, price })), nameAliases: {}, personLinks: {}, privateGuests: ['amirabbas', 'mina'], privateMap };
    // apply fuzzy aliases the way the app does
    const cands = setup.restaurants;
    const seen = new Set();
    raw2.rows.forEach((r) => Object.values(r.k).forEach((c) => {
      if (!c.guess) return; const n = KA.normRestaurant(c.guess);
      if (seen.has(n) || cands.some((x) => KA.normRestaurant(x.name) === n)) return; seen.add(n);
      const m = KA.bestMatch(c.guess, cands); if (m) setup.nameAliases[n] = m.id;
    }));
    return { raw1, raw2, setup };
  }

  KA.demo = build;
  if (typeof module !== 'undefined' && module.exports) module.exports = build;
})(typeof window !== 'undefined' ? window : globalThis);
