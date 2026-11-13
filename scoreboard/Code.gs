/**
 * Losing Control scoreboard and feedback (Watts Up), version 7.
 * Version 18: accepts The morning after ('morning') and Black start ('black') control room shifts.
 * Version 17: careers also keep switching errors ('errs', 'errLog') and a generation number ('gen').
 *   Being sacked starts a new generation from nothing, and a newer generation replaces an older one.
 * Version 16: career sync also keeps a restarted career ('run': the shift it is on, where it
 *   restarted, its stars, and a time t). The newest run wins, and an ended run is kept as {end:true,t}.
 * Version 15: career sync can be asked only to load ({intent:'load'}): an unknown name
 *   then returns error 'none' instead of saving a new career under it.
 * Version 14: career sync. POST {type:'career', game, site, name, pin, career} saves a
 *   player's career on a 'Careers' tab under their name and a 4-digit PIN, merged with
 *   what is already saved there, and returns the merged career. See careerSync_.
 * Version 13: accepts the Christmas Day ('xmas') control room shift.
 * Version 12: accepts the EV evening ('ev') control room shift, and only accepts
 *   scores sent from the games at der-dash.github.io (the 'site' field).
 * Version 11: accepts the Quiet shift ('quiet') control room shift.
 * Version 10: accepts the Storm endurance ('endure') control room shift, which runs
 * 18 hours (06:00 to 24:00).
 * Version 9: accepts the Snow day ('snow') control room shift.
 * Version 8: accepts the Heatwave ('heat') and Grid emergency ('gsp') control room shifts.
 * Version 7: both games now send customers off (ens) and switching incidents,
 * and both scores include them.
 * Version 6 adds player feedback: POST {type:'feedback', game, message, name,
 * contact, context} is saved on a 'Feedback' tab and emailed to the account
 * that owns this script. Run sendTestFeedbackEmail once from the editor to
 * give the script permission to send email.
 * The control room game runs a 12-hour shift (08:00 to 20:00).
 * Each game keeps its scores on its own tab: 'Scores' for the generation
 * game and 'Control room scores' for the control room game.
 * Serves both games: the generation game (game 'fc', the default) and the
 * control room switching game (game 'cr', modes prefixed 'cr-').
 * Google Apps Script web app that stores scores in this spreadsheet.
 *
 * GET  ?day=may|jan|storm&mode=free|daily-YYYY-MM-DD
 *      -> each player's best score for that day and mode, top 50
 * POST {name, day, mode, result, survived, spend, faults, risk, grade}
 *      -> stores the score and returns the player's rank
 *
 * The score is recalculated here from the submitted figures, using the same
 * formula as the game, so the sheet never trusts a score sent by the browser.
 * Rows saved before version 2 have no mode and count as free play.
 */
const VERSION = 18;
// Scores are only accepted from the games on this site. Apps Script can't see the request's
// origin, so the games send their hostname; copies of the game hosted elsewhere send theirs.
const HOME_SITE = 'der-dash.github.io';
const FEEDBACK_SHEET_NAME = 'Feedback';
const FEEDBACK_HEADERS = ['Received', 'Game', 'Name', 'Reply to', 'Feedback', 'Context'];
const SHEET_NAME = 'Scores';
const CR_SHEET_NAME = 'Control room scores';
const sheetFor_ = game => game === 'cr' ? CR_SHEET_NAME : SHEET_NAME;
const DAYS = ['may', 'jan', 'storm'];
const CR_DAYS = ['quiet', 'jan', 'storm', 'grid', 'mesh', 'heat', 'gsp', 'snow', 'endure', 'ev', 'xmas', 'morning', 'black'];
const SHIFT_MINUTES = 1080; // generation game: 05:00 to 23:00
const CR_SHIFT_MINUTES = 720; // control room game: 08:00 to 20:00
const CR_SHIFT_BY_DAY = { endure: 1080 }; // control room shifts of a different length
const HEADERS = ['Submitted', 'Name', 'Day', 'Score', 'Result', 'Minutes on supply',
  'Spend (£)', 'Faults', 'Minutes at risk', 'Grade', 'Mode', 'Customers off (MW·min)', 'Switching incidents'];

// Name filter, kept in ROT13 so the word list isn't plain text in the code.
const r13_ = s => s.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 84) % 26 + 97));
const BAD_SUB = r13_('shpx,fuvg,phag,jnax,gjng,obyybpx,onfgneq,ovgpu,avtt,snttbg,ergneq,juber,fyhg,chffl,anmv,uvgyre,zbgures,nffubyr,nefrubyr,qvyqb,wvmm,fcnfgvp,oryyraq,abapr,cnrqb,crqb').split(',');
const BAD_TOK = r13_('qvpx,pbpx,cevpx,nefr,nff,gvgf,gvg,cvff,penc,xabo,abo,encr,snt,cnxv,pbba,puvax,xvxr,genaal,fcnm,phz,cbea,frk,nany,cbb,gheq').split(',');
function rude_(n) {
  const s = n.toLowerCase().replace(/[@4]/g, 'a').replace(/3/g, 'e').replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o').replace(/[5$]/g, 's').replace(/7/g, 't');
  const flat = s.replace(/[^a-z]/g, '').replace(/scunthorpe|snigger|shiitake|shitake|penistone/g, '');
  if (BAD_SUB.some(w => flat.indexOf(w) >= 0)) return true;
  return s.split(/[^a-z]+/).some(t => BAD_TOK.indexOf(t) >= 0);
}

function sheet_(name) {
  name = name || SHEET_NAME;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  }
  if (sh.getRange(1, HEADERS.length).getValue() !== HEADERS[HEADERS.length - 1]) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function rows_(name) {
  const sh = sheet_(name);
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
}

function modeOk_(mode, game) {
  const pre = game === 'cr' ? 'cr-' : '';
  if (mode.indexOf(pre) !== 0) return false;
  mode = mode.slice(pre.length);
  if (mode === 'free') return true;
  const m = /^daily-(\d{4})-(\d{2})-(\d{2})$/.exec(mode);
  if (!m) return false;
  const d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  return Math.abs(Date.now() - d) < 3 * 86400000;
}

function best_(rows, day, mode) {
  const best = {};
  rows.forEach(r => {
    if (r[2] !== day || String(r[10] || 'free') !== mode) return;
    const key = String(r[1]).toLowerCase();
    const at = r[0] instanceof Date ? r[0].toISOString() : String(r[0]);
    const entry = {
      name: String(r[1]), day: r[2], score: Number(r[3]), result: r[4],
      survived: Number(r[5]), spend: Number(r[6]), faults: Number(r[7]),
      risk: Number(r[8]), grade: String(r[9]), at: at
    };
    if (!best[key] || entry.score > best[key].score) best[key] = entry;
  });
  return Object.keys(best).map(k => best[k])
    .sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const day = String(p.day || 'may');
  const mode = String(p.mode || (p.game === 'cr' ? 'cr-free' : 'free'));
  // Control room rows saved before version 4 live on the main tab; the mode
  // filter in best_ keeps each game's scores apart.
  const rows = p.game === 'cr' ? rows_(CR_SHEET_NAME).concat(rows_(SHEET_NAME)) : rows_(SHEET_NAME);
  return json_({ ok: true, version: VERSION, scores: best_(rows, day, mode).slice(0, 50) });
}

/* ---------- Career sync (version 14) ----------
 * One row per player name. The PIN is never stored: only a salted SHA-256 of it, so nobody
 * reading the sheet can see it. Each game's career is a JSON column. Saving merges with
 * what is already there (best stars per shift, every achievement earned), so playing on
 * two devices never loses anything. Forgotten PIN: delete the player's row, and they can
 * save again under the same name with a new PIN.
 */
const CAREER_SHEET_NAME = 'Careers';
const CAREER_HEADERS = ['Name', 'PIN (scrambled)', 'Updated', 'Control room career', 'Generation career', 'Control room stars', 'Generation stars'];
const PIN_TRIES = 5, PIN_LOCK_SECONDS = 900;

function careerSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(CAREER_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(CAREER_SHEET_NAME);
    sh.getRange('A:A').setNumberFormat('@'); // names stay text, so "0123" isn't turned into 123
    sh.appendRow(CAREER_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, CAREER_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function pinSalt_() {
  const props = PropertiesService.getScriptProperties();
  let salt = props.getProperty('PIN_SALT');
  if (!salt) { salt = Utilities.getUuid(); props.setProperty('PIN_SALT', salt); }
  return salt;
}

function pinHash_(nameKey, pin) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pinSalt_() + '|' + nameKey + '|' + pin, Utilities.Charset.UTF_8);
  // the 'h' keeps Sheets from ever reading the hash as a number
  return 'h' + raw.map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
}

// Keep only what a career can hold: stars 1-3 for this game's shifts, short achievement ids.
function cleanCareer_(c, game) {
  const days = game === 'cr' ? CR_DAYS : DAYS, out = { stars: {}, ach: {}, best: {} };
  if (!c || typeof c !== 'object') return out;
  const stars = c.stars && typeof c.stars === 'object' ? c.stars : {};
  days.forEach(k => { const v = Math.round(Number(stars[k]) || 0); if (v >= 1 && v <= 3) out.stars[k] = v; });
  const ach = c.ach && typeof c.ach === 'object' ? c.ach : {};
  Object.keys(ach).filter(k => /^[a-z]{1,16}$/.test(k) && ach[k]).slice(0, 40).forEach(k => { out.ach[k] = 1; });
  out.gen = Math.max(0, Math.min(1e6, Math.round(Number(c.gen) || 0)));
  out.errs = Math.max(0, Math.min(99, Math.round(Number(c.errs) || 0)));
  out.errLog = (Array.isArray(c.errLog) ? c.errLog : []).slice(-6).filter(e => e && days.indexOf(e.k) >= 0)
    .map(e => ({ k: e.k, m: Math.round(Number(e.m) || 0), t: String(e.t || '').replace(/[<>]/g, '').slice(0, 200) }));
  const run = c.run && typeof c.run === 'object' ? c.run : null, t = run ? Math.round(Number(run.t) || 0) : 0;
  if (run && t > 0) {
    if (run.end) out.run = { end: true, t: t };
    else if (days.indexOf(run.at) >= 0 && days.indexOf(run.from) >= 0) {
      const rs = {}, s = run.stars && typeof run.stars === 'object' ? run.stars : {};
      days.forEach(k => { const v = Math.round(Number(s[k]) || 0); if (v >= 1 && v <= 3) rs[k] = v; });
      out.run = { at: run.at, from: run.from, stars: rs, t: t };
    }
  }
  return out;
}

function mergeCareer_(a, b) {
  // a newer career generation (after being sacked) replaces the older one completely
  if ((a.gen || 0) !== (b.gen || 0)) return (a.gen || 0) > (b.gen || 0) ? a : b;
  const out = { stars: {}, ach: {}, best: {}, gen: a.gen || 0, errs: Math.max(a.errs || 0, b.errs || 0),
    errLog: ((b.errLog || []).length > (a.errLog || []).length ? b.errLog : a.errLog) || [] };
  [a, b].forEach(c => {
    Object.keys(c.stars).forEach(k => { out.stars[k] = Math.max(out.stars[k] || 0, c.stars[k]); });
    Object.keys(c.ach).forEach(k => { out.ach[k] = 1; });
    if (c.run && (!out.run || c.run.t > out.run.t)) out.run = c.run;  // the newest restarted career wins
  });
  return out;
}

const starTotal_ = c => Object.keys(c.stars).reduce((a, k) => a + c.stars[k], 0);

function careerSync_(d) {
  const name = String(d.name || '').replace(/[^\p{L}\p{N} '_.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
  if (name.length < 2 || rude_(name)) return json_({ ok: false, error: 'name' });
  const pin = String(d.pin || '');
  if (!/^\d{4}$/.test(pin)) return json_({ ok: false, error: 'pin_format' });
  const game = d.game === 'cr' ? 'cr' : 'fc', col = game === 'cr' ? 4 : 5;
  const key = name.toLowerCase(), cache = CacheService.getScriptCache(), failKey = 'pinFail:' + key;
  if (Number(cache.get(failKey) || 0) >= PIN_TRIES) return json_({ ok: false, error: 'locked' });
  const sh = careerSheet_(), last = sh.getLastRow();
  const names = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase()) : [];
  const i = names.indexOf(key), hash = pinHash_(key, pin), mine = cleanCareer_(d.career, game);
  if (i < 0) {
    if (d.intent === 'load') return json_({ ok: false, error: 'none' });
    const row = [name, hash, new Date(), '', '', '', ''];
    row[col - 1] = JSON.stringify(mine); row[col + 1] = starTotal_(mine);
    sh.appendRow(row);
    return json_({ ok: true, version: VERSION, created: true, name: name, career: mine });
  }
  const r = i + 2, vals = sh.getRange(r, 1, 1, CAREER_HEADERS.length).getValues()[0];
  if (String(vals[1]) !== hash) {
    const n = Number(cache.get(failKey) || 0) + 1;
    cache.put(failKey, String(n), PIN_LOCK_SECONDS);
    return json_({ ok: false, error: n >= PIN_TRIES ? 'locked' : 'pin', triesLeft: Math.max(0, PIN_TRIES - n) });
  }
  cache.remove(failKey);
  let saved = {};
  try { saved = JSON.parse(String(vals[col - 1] || '{}')); } catch (err) { saved = {}; }
  const merged = mergeCareer_(cleanCareer_(saved, game), mine);
  sh.getRange(r, 3).setValue(new Date());
  sh.getRange(r, col).setValue(JSON.stringify(merged));
  sh.getRange(r, col + 2).setValue(starTotal_(merged));
  return json_({ ok: true, version: VERSION, created: false, name: String(vals[0]), career: merged });
}

function feedbackTo_() {
  return Session.getEffectiveUser().getEmail();
}

function clean_(v, max) {
  return String(v || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, max);
}

function feedback_(d) {
  if (d.hp) return json_({ ok: true }); // hidden field filled in: a bot
  const message = clean_(d.message, 2000);
  if (message.length < 3) return json_({ ok: false, error: 'empty' });
  // At most 20 feedback messages in any 10 minutes, to protect the email quota.
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('fbCount') || 0);
  if (count >= 20) return json_({ ok: false, error: 'busy' });
  cache.put('fbCount', String(count + 1), 600);
  const game = d.game === 'cr' ? 'Control room game' : 'Generation game';
  const name = clean_(d.name, 60), contact = clean_(d.contact, 100), context = clean_(d.context, 300);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FEEDBACK_SHEET_NAME);
  if (!sh) { sh = ss.insertSheet(FEEDBACK_SHEET_NAME); sh.appendRow(FEEDBACK_HEADERS); sh.setFrozenRows(1); sh.getRange(1, 1, 1, FEEDBACK_HEADERS.length).setFontWeight('bold'); }
  // A leading apostrophe stops text starting with = being run as a formula.
  const safe = v => /^[=+\-@]/.test(v) ? "'" + v : v;
  sh.appendRow([new Date(), game, safe(name), safe(contact), safe(message), safe(context)]);
  const body = message + '\n\n---\nGame: ' + game + '\nFrom: ' + (name || 'not given') +
    '\nReply to: ' + (contact || 'not given') + '\nContext: ' + (context || '-') + '\nSheet: ' + ss.getUrl();
  const opts = { name: 'Losing Control feedback' };
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) opts.replyTo = contact;
  MailApp.sendEmail(feedbackTo_(), 'Losing Control feedback: ' + game + (name ? ' from ' + name : ''), body, opts);
  return json_({ ok: true, version: VERSION });
}

/** Run this once from the Apps Script editor to allow email and check it arrives. */
function sendTestFeedbackEmail() {
  MailApp.sendEmail(feedbackTo_(), 'Losing Control feedback: test', 'Feedback emails from the games will arrive like this.');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (d.type === 'feedback') return feedback_(d);
    if (String(d.site || '').toLowerCase() !== HOME_SITE) return json_({ ok: false, error: 'site' });
    if (d.type === 'career') return careerSync_(d);
    // Letters, numbers, spaces and a little punctuation only. This also stops
    // names starting with "=" being treated as spreadsheet formulas.
    const name = String(d.name || '').replace(/[^\p{L}\p{N} '_.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name && rude_(name)) return json_({ ok: false, error: 'name' });
    const game = d.game === 'cr' ? 'cr' : 'fc';
    const day = (game === 'cr' ? CR_DAYS : DAYS).indexOf(d.day) >= 0 ? d.day : null;
    const rawMode = String(d.mode || (game === 'cr' ? 'cr-free' : 'free'));
    const mode = modeOk_(rawMode, game) ? rawMode : null;
    const ens = Math.round(Number(d.ens) || 0);
    const incidents = Math.round(Number(d.incidents) || 0);
    const survived = Math.round(Number(d.survived));
    const spend = Math.round(Number(d.spend));
    const faults = Math.round(Number(d.faults));
    const risk = Math.round(Number(d.risk));
    const complete = d.result === 'complete';
    const grade = complete ? (['A', 'B', 'C', 'D'].indexOf(d.grade) >= 0 ? d.grade : '') : 'Lost';

    const shift = game === 'cr' ? (CR_SHIFT_BY_DAY[day] || CR_SHIFT_MINUTES) : SHIFT_MINUTES;
    const valid = name && day && mode &&
      survived >= 0 && survived <= shift &&
      (!complete || survived === shift) &&
      risk >= 0 && risk <= survived &&
      spend >= 0 && spend < 10000000 &&
      faults >= 0 && faults <= 50 && grade !== '' &&
      ens >= 0 && ens < 1000000 && incidents >= 0 && incidents <= 50;
    if (!valid) return json_({ ok: false, error: 'Invalid score' });

    const score = Math.max(0, survived * 10 + (complete ? 5000 : 0) - risk * 20 - Math.round(spend / 10) - ens - incidents * 500);
    sheet_(sheetFor_(game)).appendRow([new Date(), name, day, score, complete ? 'complete' : 'lost',
      survived, spend, faults, risk, grade, mode, ens, incidents]);

    const board = best_(game === 'cr' ? rows_(CR_SHEET_NAME).concat(rows_(SHEET_NAME)) : rows_(SHEET_NAME), day, mode);
    const others = board.filter(x => x.name.toLowerCase() !== name.toLowerCase());
    const rank = others.filter(x => x.score > score).length + 1;
    return json_({ ok: true, version: VERSION, name: name, score: score, rank: rank, total: others.length + 1 });
  } catch (err) {
    return json_({ ok: false, error: 'Could not save score' });
  } finally {
    lock.releaseLock();
  }
}
