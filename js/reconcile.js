/* Shared by the setup page and build.js: tidy restaurant/guest names after (re)loading survey files. */
(function (root) {
  'use strict';
  const KA = root.KA || (typeof require !== 'undefined' ? require('./analytics.js') : null);
  let uid = 1;
  const newId = () => 'x' + Date.now().toString(36) + (uid++);

  function syncRestaurants(s) {
    if (!s.raw1) return;
    const have = new Map(s.restaurants.map((r) => [KA.normRestaurant(r.name), r]));
    s.raw1.restaurants.forEach((name) => {
      if (!have.has(KA.normRestaurant(name))) {
        const r = { id: newId(), name, present: false, kabab: null, price: null };
        s.restaurants.push(r); have.set(KA.normRestaurant(name), r);
      }
    });
  }

  /** Map spelling variants in survey 2 guesses to restaurants; unknown names become new decoys. */
  function reconcileGuesses(s) {
    if (!s.raw2) return;
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

  function linkPeople(s) {
    if (!s.raw1 || !s.raw2) return;
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

  /** Drop links / aliases left over from earlier uploads (or the demo) that the current files do not use. */
  function prune(s) {
    if (s.raw1 && s.raw2) {
      const n1 = new Set(s.raw1.rows.map((r) => KA.normName(r.name))), n2 = new Set(s.raw2.rows.map((r) => KA.normName(r.name)));
      Object.keys(s.personLinks).forEach((k) => { if (!n2.has(k) || n1.has(k) || (s.personLinks[k] && !n1.has(s.personLinks[k]))) delete s.personLinks[k]; });
    }
    if (s.raw2) {
      const used = new Set(); s.raw2.rows.forEach((row) => Object.values(row.k).forEach((c) => { if (c.guess) used.add(KA.normRestaurant(c.guess)); }));
      Object.keys(s.nameAliases).forEach((k) => { if (!used.has(k)) delete s.nameAliases[k]; });
    }
  }

  /* The private numbering is stored "sealed" (base64, not encryption) in saved setup files, just so it is not readable at a glance. */
  const b64 = (str) => (typeof btoa === 'function' ? btoa(str) : Buffer.from(str).toString('base64'));
  const unb64 = (str) => (typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString());
  const seal = (map) => (map && Object.keys(map).length ? b64(JSON.stringify(map)) : null);
  const unseal = (str) => { try { return str ? JSON.parse(unb64(str)) : null; } catch (e) { return null; } };

  const R = { newId, syncRestaurants, reconcileGuesses, linkPeople, prune, seal, unseal };
  if (typeof module !== 'undefined' && module.exports) module.exports = R; else root.KAReconcile = R;
})(typeof window !== 'undefined' ? window : globalThis);
