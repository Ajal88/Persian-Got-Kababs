/* Parses the Microsoft-Forms-style Excel/CSV exports. Needs SheetJS (window.XLSX). */
(function (root) {
  'use strict';
  const KA = root.KA;

  function readRows(file) {
    return file.arrayBuffer().then((buf) => {
      const wb = root.XLSX.read(buf, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = root.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      return rows.filter((r) => r.some((c) => c !== null && String(c).trim() !== ''));
    });
  }

  const str = (v) => (v == null ? null : String(v).trim() || null);
  const tsOf = (v) => (v instanceof Date ? v.getTime() : (typeof v === 'number' ? v : 0));

  function findNameCol(header) {
    // Forms exports: ID, Start time, Completion time, Email, Name, <typed name>, ...
    const i = header.findIndex((h) => /^name$/i.test(String(h || '').trim()));
    return i >= 0 ? i + 1 : 5;
  }

  /** Survey 1: ranking + optional per-restaurant ratings. */
  function parseSurvey1(rows) {
    if (rows.length < 2) throw new Error('The file has no responses yet.');
    const header = rows[0].map((h) => String(h == null ? '' : h).trim());
    const nameCol = findNameCol(header);
    let rankCol = -1;
    for (let c = nameCol + 1; c < header.length && rankCol < 0; c++) {
      if (rows.slice(1).some((r) => typeof r[c] === 'string' && r[c].includes(';'))) rankCol = c;
    }
    if (rankCol < 0) rankCol = nameCol + 1;
    const restCols = [];
    for (let c = nameCol + 1; c < header.length; c++) if (c !== rankCol && header[c]) restCols.push(c);
    if (!restCols.length) throw new Error('Could not find restaurant columns. Is this the BEFORE-eating survey?');
    if (restCols.some((c) => /(\d+|[۰-۹]+)/.test(header[c]) && /قیمت|امتیاز|price/i.test(header[c]))) {
      throw new Error('This looks like the AFTER-eating survey. Upload it in the second box.');
    }
    const restaurants = restCols.map((c) => header[c]);
    const out = rows.slice(1).map((r) => ({
      name: str(r[nameCol]) || 'Anonymous', ts: tsOf(r[2]),
      ranking: String(r[rankCol] || '').split(/[;؛]/).map((s) => s.trim()).filter(Boolean),
      ratings: Object.fromEntries(restCols.map((c) => [header[c], KA.toNumber(r[c])])),
    }));
    // restaurants that appear only in rankings (not as columns) are added too
    out.forEach((o) => o.ranking.forEach((n) => { if (!restaurants.includes(n)) restaurants.push(n); }));
    return { restaurants, rows: out };
  }

  /** Survey 2: for each kabab number -> guess, rating, price (columns detected by header text). */
  function parseSurvey2(rows) {
    if (rows.length < 2) throw new Error('The file has no responses yet.');
    const header = rows[0].map((h) => String(h == null ? '' : h).trim());
    const nameCol = findNameCol(header);
    const cols = [];
    for (let c = nameCol + 1; c < header.length; c++) {
      const h = KA.latinDigits(header[c]);
      const m = h.match(/(\d+)/);
      if (!m) continue;
      let kind = 'guess';
      if (/قیمت|price|pay|cost|\$/i.test(h)) kind = 'price';
      else if (/امتیاز|rate|rating|score|1-10|۱-۱۰/i.test(h)) kind = 'rating';
      cols.push({ c, no: +m[1], kind });
    }
    if (!cols.length) throw new Error('Could not find kabab columns. Is this the AFTER-eating survey?');
    const kababNos = [...new Set(cols.map((x) => x.no))].sort((a, b) => a - b);
    const out = rows.slice(1).map((r) => {
      const k = {};
      kababNos.forEach((no) => { k[no] = { guess: null, rating: null, price: null }; });
      cols.forEach(({ c, no, kind }) => {
        if (kind === 'guess') {
          // allow ranked lists "A;B;C": first entry is the main guess
          const s = str(r[c]); k[no].guess = s ? s.split(/[;؛]/)[0].trim() || null : null;
        } else k[no][kind] = KA.toNumber(r[c]);
      });
      return { name: str(r[nameCol]) || 'Anonymous', ts: tsOf(r[2]), k };
    });
    return { kababNos, rows: out };
  }

  /** Key file: rows of  kabab number | restaurant | price  (header optional, columns found by type). */
  function parseKey(rows) {
    const out = [];
    rows.forEach((r) => {
      const cells = r.filter((c) => c !== null && String(c).trim() !== '');
      const no = cells.find((c) => KA.toNumber(c) != null && /^[\s#]*[0-9۰-۹٠-٩]+[\s.]*$/.test(String(c)));
      const nameCell = cells.find((c) => typeof c === 'string' && KA.toNumber(c) == null);
      if (no == null || !nameCell) return;
      const after = cells.slice(cells.indexOf(nameCell) + 1).find((c) => KA.toNumber(c) != null);
      const before = cells.slice(0, cells.indexOf(nameCell)).filter((c) => KA.toNumber(c) != null);
      const price = after != null ? KA.toNumber(after) : (before.length > 1 ? KA.toNumber(before[1]) : null);
      out.push({ no: KA.toNumber(no), name: String(nameCell).trim(), price });
    });
    if (!out.length) throw new Error('Could not read the key. Expected columns: kabab number, restaurant, price.');
    return out;
  }

  /** Two columns of integers: their number | our number. */
  function parseNumberPairs(rows) {
    const out = [];
    rows.forEach((r) => {
      const n = r.map((c) => (typeof c === 'number' ? c : (/^[\s#]*[0-9۰-۹٠-٩]+\s*$/.test(String(c == null ? '' : c)) ? KA.toNumber(c) : null))).filter((x) => x != null);
      if (n.length >= 2) out.push([n[0], n[1]]);
    });
    if (!out.length) throw new Error('Could not find number pairs. Expected two columns: your number, our number.');
    return out;
  }

  root.KAParse = { readRows, parseSurvey1, parseSurvey2, parseKey, parseNumberPairs };
})(window);
