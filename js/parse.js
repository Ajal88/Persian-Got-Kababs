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

  root.KAParse = { readRows, parseSurvey1, parseSurvey2 };
})(window);
