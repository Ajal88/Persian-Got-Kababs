#!/usr/bin/env node
/* Regenerates index.html (the published slides) from the saved setup.
 *
 *   node build.js              reads kabab-showdown-setup.json (+ the survey files in data/ it names)
 *   node build.js --inline     embeds the pictures inside index.html instead of writing assets/
 *   node build.js my-setup.json
 *
 * If the survey files named in the setup (file1 / file2) exist in data/, they are re-read, so replacing
 * an .xlsx and re-running this script is enough to update the slides.
 * Requires only Node 16+; no npm install. */
'use strict';
const fs = require('fs');
const path = require('path');
global.window = global;
const KA = require('./js/analytics.js'); global.KA = KA;
const RC = require('./js/reconcile.js');
const KAE = require('./js/export.js');
global.XLSX = require('./vendor/xlsx.full.min.js');
require('./js/parse.js');
const P = global.KAParse;

const args = process.argv.slice(2);
const inline = args.includes('--inline');
const setupFile = args.find((a) => !a.startsWith('--')) || 'kabab-showdown-setup.json';
const root = __dirname;
const fail = (m) => { console.error('✗ ' + m); process.exit(1); };

if (!fs.existsSync(path.resolve(root, setupFile))) fail(`${setupFile} not found. Save your setup from setup.html and put the file here.`);
const state = JSON.parse(fs.readFileSync(path.resolve(root, setupFile), 'utf8'));
state.nameAliases = state.nameAliases || {}; state.personLinks = state.personLinks || {}; state.images = state.images || {};
if (!state.privateMap && state.privateSealed) state.privateMap = RC.unseal(state.privateSealed);

function rowsOf(file) {
  const wb = global.XLSX.read(fs.readFileSync(file), { type: 'buffer', cellDates: true });
  return global.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null })
    .filter((r) => r.some((c) => c !== null && String(c).trim() !== ''));
}
function reread(key, name, parser) {
  const f = name && path.join(root, 'data', name);
  if (!f || !fs.existsSync(f)) return console.log(`• ${name || key}: not in data/, using the copy saved in the setup`);
  state[key] = parser(rowsOf(f)); console.log(`• ${name}: read ${state[key].rows.length} responses`);
}
reread('raw1', state.file1, P.parseSurvey1);
reread('raw2', state.file2, P.parseSurvey2);
if (!state.raw1 || !state.raw2) fail('Both surveys are needed.');

RC.syncRestaurants(state); RC.reconcileGuesses(state); RC.linkPeople(state); RC.prune(state);

// validate the key
const nos = state.raw2.kababNos, served = state.restaurants.filter((r) => r.present);
nos.forEach((n) => { if (served.filter((r) => r.kabab === n).length !== 1) fail(`Kabab #${n} must be assigned to exactly one served restaurant (check the setup).`); });
served.forEach((r) => { if (r.price == null) console.warn(`! ${r.name} has no price`); });
const pg = state.privateGuests || [];
if (pg.length) {
  const vals = nos.map((n) => (state.privateMap || {})[n]);
  if (vals.some((v) => v == null) || new Set(vals).size !== vals.length) fail('Private guests are selected but the private numbering is missing or invalid.');
  console.log(`• private numbering applied to: ${pg.join(', ')}`);
}

// pictures: write to assets/ (or keep inline)
const images = {};
if (!inline) fs.rmSync(path.join(root, 'assets'), { recursive: true, force: true });
Object.entries(state.images).forEach(([key, url]) => {
  const m = /^data:image\/(\w+);base64,(.*)$/s.exec(url || '');
  if (inline || !m) { images[key] = url; return; }
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(root, 'assets', `${key}.${ext}`), Buffer.from(m[2], 'base64'));
  images[key] = `assets/${key}.${ext}`;
});

const resolved = KA.resolve(state.raw1, state.raw2, state);
const html = KAE.buildIndex({ cfg: state.cfg, resolved, images });
fs.writeFileSync(path.join(root, 'index.html'), html);
const a = KA.analyze(resolved);
console.log(`✓ index.html written (${(html.length / 1024).toFixed(0)} KB) · ${a.nPre} guests before, ${a.nPost} after, ${a.present.length} kababs`);
