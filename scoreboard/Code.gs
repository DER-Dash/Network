/**
 * Losing Control scoreboard and feedback (Watts Up), version 7.
 * Version 24: Storm Day, the exhibition edition ('se') at /storm/. Arcade-style scores (three initials) go on a
 *   'Storm Day exhibition scores' tab, one board a day (mode 'se-daily-YYYY-MM-DD'); the score is worked out here from
 *   the minutes in each zone and the spend. Also accepted from the standalone file run at a stand. See sePost_.
 * Version 23: Gatekeeper ('gk'), the connections planning game. Career scores go on a 'Gatekeeper scores' tab
 *   (mode 'gk-free' or 'gk-week-YYYY-MM-DD' for the week's canyon, Monday's date): the score is worked out here from
 *   the ten yearly report cards. Career saves (the game in progress) go in two new columns on the Careers tab,
 *   under the same name and PIN as Losing Control. See gkPost_ and gkCareer_.
 * Version 22: Fault Lines daily puzzle ('fl'). Scores go on a 'Fault Lines scores' tab, mode
 *   'fl-daily-YYYY-MM-DD', day = the level set by that date's weekday. Each player's FIRST score of
 *   the day counts (it's one go a day). See flPost_.
 * Version 21: accepts the Busbar fault ('busbar') control room shift.
 * Version 20: accepts the Comms down ('comms') control room shift.
 * Version 19: also accepts scores and careers from www.wattsupelectricity.co.uk (the new domain).
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
const VERSION = 24;
// Scores are only accepted from the games on these sites. Apps Script can't see the request's
// origin, so the games send their hostname; copies of the game hosted elsewhere send theirs.
const HOME_SITES = ['der-dash.github.io', 'www.wattsupelectricity.co.uk', 'wattsupelectricity.co.uk'];
const FEEDBACK_SHEET_NAME = 'Feedback';
const FEEDBACK_HEADERS = ['Received', 'Game', 'Name', 'Reply to', 'Feedback', 'Context'];
const SHEET_NAME = 'Scores';
const CR_SHEET_NAME = 'Control room scores';
const sheetFor_ = game => game === 'cr' ? CR_SHEET_NAME : SHEET_NAME;
const DAYS = ['may', 'jan', 'storm'];
const CR_DAYS = ['quiet', 'jan', 'storm', 'grid', 'mesh', 'heat', 'gsp', 'snow', 'endure', 'ev', 'xmas', 'morning', 'black', 'comms', 'busbar'];
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

/* ---------- Fault Lines daily puzzle (version 22) ----------
 * One puzzle a day, the same for everyone. The level follows the weekday (Mon-Tue Easy, Wed-Thu
 * Medium, Fri-Sun Hard), so a score for the wrong level is refused. The score is recalculated here
 * with the game's formula. Par can't be worked out here, so the first score of the day fixes it and
 * later scores must agree. 'moves' is the result grid as letters: o open, h close that held,
 * c close with nothing new on, t tripped our breaker, n tripped the neighbour, i hint.
 */
const FL_SHEET_NAME = 'Fault Lines scores';
const FL_HEADERS = ['Submitted', 'Name', 'Level', 'Score', 'Grade', 'Steps', 'Par', 'Trips', 'Neighbour trips',
  'Hints', 'Customer minutes lost', 'Found it', 'Isolated', 'Healthy customers left off', 'Mode', 'Moves'];

function flLevelFor_(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const wd = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay();
  return wd === 1 || wd === 2 ? 'easy' : wd === 3 || wd === 4 ? 'medium' : 'hard';
}

function flScore_(x) {
  const d = x.steps - x.par;
  const pts = 1000 + (d < 0 ? -d * 50 : -d * 40) - x.trips * 100 - x.nbTrips * 250 - x.hints * 50 -
    Math.round(x.cml / 500) - (x.correct ? 0 : 400) - (x.iso ? 0 : 200) - Math.round(x.healthyOff / 2);
  return Math.max(0, pts);
}
const flGrade_ = p => p >= 900 ? 'A' : p >= 750 ? 'B' : p >= 600 ? 'C' : p >= 400 ? 'D' : 'E';

function flSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(FL_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(FL_SHEET_NAME);
    sh.appendRow(FL_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, FL_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function flRows_(mode) {
  const sh = flSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, FL_HEADERS.length).getValues()
    .filter(r => String(r[14]) === mode)
    .map(r => ({ name: String(r[1]), level: String(r[2]), score: Number(r[3]), grade: String(r[4]), steps: Number(r[5]),
      par: Number(r[6]), trips: Number(r[7]) + Number(r[8]), correct: r[11] === true || r[11] === 'TRUE' || r[11] === 'yes',
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]) }));
}

// one go a day: each player's earliest score counts
function flBoard_(rows) {
  const first = {};
  rows.forEach(x => { const k = x.name.toLowerCase(); if (!first[k] || x.at < first[k].at) first[k] = x; });
  return Object.keys(first).map(k => first[k]).sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
}

const flModeOk_ = mode => /^fl-daily-\d{4}-\d{2}-\d{2}$/.test(mode) && modeOk_(mode.slice(3), 'fc');

function flPost_(d, name) {
  const mode = String(d.mode || '');
  if (!name || !flModeOk_(mode)) return json_({ ok: false, error: 'Invalid score' });
  const int = (v, lo, hi) => { const n = Math.round(Number(v)); return isFinite(n) && n >= lo && n <= hi ? n : null; };
  const moves = String(d.moves || '');
  const x = { steps: int(d.steps, 0, 300), par: int(d.par, 1, 80), trips: int(d.trips, 0, 80), nbTrips: int(d.nbTrips, 0, 80),
    hints: int(d.hints, 0, 100), cml: int(d.cml, 0, 1e8), healthyOff: int(d.healthyOff, 0, 100000),
    correct: d.correct === true, iso: d.iso === true };
  const count = c => moves.split(c).length - 1, ops = moves.replace(/i/g, '').length;
  const valid = d.day === flLevelFor_(mode.slice(9)) && /^[ohctni]{1,300}$/.test(moves) &&
    ['steps', 'par', 'trips', 'nbTrips', 'hints', 'cml', 'healthyOff'].every(k => x[k] !== null) &&
    count('t') === x.trips && count('n') === x.nbTrips && count('i') === x.hints && x.steps >= ops && x.steps <= ops * 2;
  if (!valid) return json_({ ok: false, error: 'Invalid score' });
  const rows = flRows_(mode);
  if (rows.length && rows.some(r => r.par !== x.par)) return json_({ ok: false, error: 'Invalid score' });
  const score = flScore_(x), grade = flGrade_(score);
  flSheet_().appendRow([new Date(), name, d.day, score, grade, x.steps, x.par, x.trips, x.nbTrips, x.hints, x.cml,
    x.correct, x.iso, x.healthyOff, mode, moves]);
  const board = flBoard_(flRows_(mode)), i = board.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
  const mine = board[i];
  return json_({ ok: true, version: VERSION, name: name, score: mine.score, rank: i + 1, total: board.length,
    repeat: mine.score !== score || rows.some(r => r.name.toLowerCase() === name.toLowerCase()) });
}

/* ---------- Gatekeeper (version 23) ----------
 * A ten-year career, one year a round. The game sends the five scores (0-100) from each year's report card;
 * the average of a year sets its grade, and the career score is the sum of the yearly averages x 10 (up to 10,000).
 * The week's canyon is the same for everyone that week: its seed is a hash of the Monday, checked here.
 */
const GK_SHEET_NAME = 'Gatekeeper scores';
const GK_HEADERS = ['Submitted', 'Name', 'Mode', 'Score', 'Grade', 'Stars', 'Connections', 'Security', 'Curtailment',
  'Cost', 'Regulator', 'Yearly grades', 'Seed'];
const GK_KEYS = ['conn', 'sec', 'curt', 'cost', 'reg'];
const gkGrade_ = x => x >= 85 ? 'A' : x >= 70 ? 'B' : x >= 55 ? 'C' : x >= 40 ? 'D' : 'E';
const gkStars_ = g => ({ A: 3, B: 2, C: 1 })[g] || 0;
function gkHash_(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const gkWeekSeed_ = monday => gkHash_('gatekeeper|week|' + monday);
function gkModeOk_(mode) {
  if (mode === 'gk-free') return true;
  const m = /^gk-week-(\d{4})-(\d{2})-(\d{2})$/.exec(mode);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  // a Monday, and recent: a career takes a while, so last week's canyon is still accepted
  return d.getUTCDay() === 1 && d.getTime() <= Date.now() + 86400000 && Date.now() - d.getTime() < 15 * 86400000;
}
function gkSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(GK_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(GK_SHEET_NAME);
    sh.appendRow(GK_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, GK_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}
function gkRows_(mode) {
  const sh = gkSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, GK_HEADERS.length).getValues()
    .filter(r => String(r[2]) === mode)
    .map(r => ({ name: String(r[1]), score: Number(r[3]), grade: String(r[4]), stars: Number(r[5]), years: String(r[11]),
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0]) }));
}
// each player's best career
function gkBoard_(rows) {
  const best = {};
  rows.forEach(x => { const k = x.name.toLowerCase(); if (!best[k] || x.score > best[k].score) best[k] = x; });
  return Object.keys(best).map(k => best[k]).sort((a, b) => b.score - a.score || a.at.localeCompare(b.at));
}
function gkPost_(d, name) {
  const mode = String(d.mode || '');
  if (!name || !gkModeOk_(mode)) return json_({ ok: false, error: 'Invalid score' });
  const seed = Math.round(Number(d.seed));
  if (mode !== 'gk-free' && seed !== gkWeekSeed_(mode.slice(8))) return json_({ ok: false, error: 'Invalid score' });
  const years = Array.isArray(d.years) ? d.years : [];
  if (years.length !== 10) return json_({ ok: false, error: 'Invalid score' });
  const sc = [];
  for (let i = 0; i < 10; i++) {
    const y = years[i] || {}, row = {};
    for (const k of GK_KEYS) { const v = Number(y[k]); if (!isFinite(v) || v < 0 || v > 100) return json_({ ok: false, error: 'Invalid score' }); row[k] = v; }
    sc.push(row);
  }
  const avgs = sc.map(y => GK_KEYS.reduce((t, k) => t + y[k], 0) / 5), grades = avgs.map(gkGrade_);
  const score = Math.round(avgs.reduce((a, b) => a + b, 0) * 10), grade = gkGrade_(avgs.reduce((a, b) => a + b, 0) / 10);
  const stars = grades.reduce((t, g) => t + gkStars_(g), 0);
  const mean = k => Math.round(sc.reduce((t, y) => t + y[k], 0) / 10);
  gkSheet_().appendRow([new Date(), name, mode, score, grade, stars, mean('conn'), mean('sec'), mean('curt'), mean('cost'), mean('reg'),
    grades.join(''), isFinite(seed) ? seed : '']);
  const board = gkBoard_(gkRows_(mode)), i = board.findIndex(r => r.name.toLowerCase() === name.toLowerCase());
  return json_({ ok: true, version: VERSION, name: name, score: score, grade: grade, stars: stars, best: board[i].score, rank: i + 1, total: board.length });
}

/* ---------- Storm Day, exhibition edition (version 24) ----------
 * One 15-hour shift (07:00 to 22:00, 900 minutes). The game sends the minutes spent in each zone and the spend;
 * the score is worked out here: 10 points a minute in the firm zone, -10 at risk, -20 overloaded, -50 in the dark,
 * less spend / 25, and -2,000 if all three transformers tripped (game over, which ends the shift early).
 * Every score counts (it's an arcade board: three initials, and people share them), but each one is sent
 * with an id, so a score the stand sends twice (a retry after the connection dropped) is only saved once.
 * The stand can run the game from a file with no website, so 'file' is accepted as its site.
 */
const SE_SHEET_NAME = 'Storm Day exhibition scores';
const SE_HEADERS = ['Submitted', 'Initials', 'Mode', 'Score', 'Grade', 'In firm zone %', 'Firm minutes', 'At risk minutes',
  'Overloaded minutes', 'Dark minutes', 'Spend (£)', 'Game over', 'Id', 'Played at', 'Site'];
const SE_SHIFT = 900;
const SE_SITES = HOME_SITES.concat(['file', 'localhost']);
const seGrade_ = (pct, over) => over ? 'E' : pct >= 97 ? 'A' : pct >= 90 ? 'B' : pct >= 80 ? 'C' : pct >= 65 ? 'D' : 'E';
const seModeOk_ = mode => /^se-daily-\d{4}-\d{2}-\d{2}$/.test(mode) && modeOk_(mode.slice(3), 'fc');
function seSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SE_SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SE_SHEET_NAME);
    sh.appendRow(SE_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, SE_HEADERS.length).setFontWeight('bold');
  }
  return sh;
}
function seRows_(mode) {
  const sh = seSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, SE_HEADERS.length).getValues()
    .filter(r => String(r[2]) === mode)
    .map(r => ({ id: String(r[12]), name: String(r[1]), score: Number(r[3]), grade: String(r[4]), firm: Number(r[5]),
      t: Number(r[13]) || (r[0] instanceof Date ? r[0].getTime() : 0) }));
}
const seBoard_ = rows => rows.slice().sort((a, b) => b.score - a.score || a.t - b.t);
function sePost_(d) {
  if (SE_SITES.indexOf(String(d.site || '').toLowerCase()) < 0) return json_({ ok: false, error: 'site' });
  const name = String(d.name || '').toUpperCase();
  const mode = String(d.mode || ''), id = String(d.id || '');
  if (!/^[A-Z]{3}$/.test(name) || rude_(name) || !seModeOk_(mode) || !/^[a-z0-9]{6,20}$/.test(id)) return json_({ ok: false, error: 'Invalid score' });
  const int = v => { const n = Math.round(Number(v)); return isFinite(n) && n >= 0 ? n : -1; };
  const firm = int(d.firm), risk = int(d.risk), over = int(d.over), dark = int(d.dark), spend = int(d.spend), go = d.gameover === true;
  const mins = firm + risk + over + dark;
  const valid = [firm, risk, over, dark, spend].every(n => n >= 0) && spend < 1000000 &&
    (go ? mins > 0 && mins <= SE_SHIFT : mins === SE_SHIFT);
  if (!valid) return json_({ ok: false, error: 'Invalid score' });
  const rows = seRows_(mode), dup = rows.find(r => r.id === id);
  const score = dup ? dup.score : Math.max(0, Math.round(firm * 10 - risk * 10 - over * 20 - dark * 50 - spend / 25 - (go ? 2000 : 0)));
  const pct = Math.round(firm / (go ? SE_SHIFT : mins) * 100), t = Math.round(Number(d.t)) || Date.now();
  if (!dup) seSheet_().appendRow([new Date(), name, mode, score, seGrade_(pct, go), pct, firm, risk, over, dark, spend, go ? 'yes' : 'no', id, t,
    String(d.site || '').toLowerCase()]);
  const board = seBoard_(dup ? rows : rows.concat([{ id, score, t }])), rank = board.findIndex(r => r.id === id) + 1;
  return json_({ ok: true, version: VERSION, name: name, score: score, rank: rank, total: board.length, repeat: !!dup });
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.game === 'se') {
    const mode = String(p.mode || '');
    if (!/^se-daily-\d{4}-\d{2}-\d{2}$/.test(mode)) return json_({ ok: false, error: 'mode' });
    return json_({ ok: true, version: VERSION, scores: seBoard_(seRows_(mode)).slice(0, 50) });
  }
  if (p.game === 'gk') {
    const mode = String(p.mode || 'gk-free');
    if (!/^gk-(free|week-\d{4}-\d{2}-\d{2})$/.test(mode)) return json_({ ok: false, error: 'mode' });
    return json_({ ok: true, version: VERSION, scores: gkBoard_(gkRows_(mode)).slice(0, 50) });
  }
  if (p.game === 'fl') {
    const mode = String(p.mode || '');
    if (!/^fl-daily-\d{4}-\d{2}-\d{2}$/.test(mode)) return json_({ ok: false, error: 'mode' });
    return json_({ ok: true, version: VERSION, scores: flBoard_(flRows_(mode)).slice(0, 50) });
  }
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
const CAREER_HEADERS = ['Name', 'PIN (scrambled)', 'Updated', 'Control room career', 'Generation career', 'Control room stars', 'Generation stars',
  'Gatekeeper game', 'Gatekeeper best score'];
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
  // sheets made before version 23 have seven columns: add the Gatekeeper ones
  if (sh.getRange(1, 8).getValue() !== CAREER_HEADERS[7]) sh.getRange(1, 8, 1, 2).setValues([CAREER_HEADERS.slice(7)]);
  return sh;
}

// Gatekeeper's save: the game in progress (the newest wins, by its time t) and the best finished career.
const GK_SAVE_MAX = 45000;
function gkClean_(c) {
  const out = { save: '', t: 0, best: null };
  if (!c || typeof c !== 'object') return out;
  const save = typeof c.save === 'string' ? c.save : '';
  if (save && save.length <= GK_SAVE_MAX) {
    try { const g = JSON.parse(save); if (g && typeof g === 'object' && g.year >= 1 && g.year <= 10) { out.save = save; out.t = Math.max(0, Math.round(Number(c.t) || 0)); } } catch (err) { }
  }
  const b = c.best && typeof c.best === 'object' ? c.best : null;
  if (b) { const sc = Math.round(Number(b.score)); if (isFinite(sc) && sc >= 0 && sc <= 10000) out.best = { score: sc, grade: gkGrade_(sc / 100), stars: Math.max(0, Math.min(30, Math.round(Number(b.stars) || 0))) }; }
  return out;
}
function gkMerge_(a, b) {
  const n = b.t > a.t ? b : a, out = { save: n.save, t: n.t, best: a.best };
  if (b.best && (!out.best || b.best.score > out.best.score)) out.best = b.best;
  return out;
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
  const game = d.game === 'cr' ? 'cr' : d.game === 'gk' ? 'gk' : 'fc', col = { cr: 4, fc: 5, gk: 8 }[game];
  if (game === 'gk' && d.career && typeof d.career.save === 'string' && d.career.save.length > GK_SAVE_MAX) return json_({ ok: false, error: 'big' });
  const clean = c => game === 'gk' ? gkClean_(c) : cleanCareer_(c, game), merge = game === 'gk' ? gkMerge_ : mergeCareer_;
  const total = c => game === 'gk' ? (c.best ? c.best.score : '') : starTotal_(c), totalCol = game === 'gk' ? 9 : col + 2;
  const key = name.toLowerCase(), cache = CacheService.getScriptCache(), failKey = 'pinFail:' + key;
  if (Number(cache.get(failKey) || 0) >= PIN_TRIES) return json_({ ok: false, error: 'locked' });
  const sh = careerSheet_(), last = sh.getLastRow();
  const names = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).toLowerCase()) : [];
  const i = names.indexOf(key), hash = pinHash_(key, pin), mine = clean(d.career);
  if (i < 0) {
    if (d.intent === 'load') return json_({ ok: false, error: 'none' });
    const row = [name, hash, new Date(), '', '', '', '', '', ''];
    row[col - 1] = JSON.stringify(mine); row[totalCol - 1] = total(mine);
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
  const merged = merge(clean(saved), mine);
  sh.getRange(r, 3).setValue(new Date());
  sh.getRange(r, col).setValue(JSON.stringify(merged));
  sh.getRange(r, totalCol).setValue(total(merged));
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
  const game = d.game === 'cr' ? 'Control room game' : d.game === 'gk' ? 'Gatekeeper' : d.game === 'fl' ? 'Fault Lines' : 'Generation game';
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
    if (d.game === 'se') return sePost_(d);
    if (HOME_SITES.indexOf(String(d.site || '').toLowerCase()) < 0) return json_({ ok: false, error: 'site' });
    if (d.type === 'career') return careerSync_(d);
    // Letters, numbers, spaces and a little punctuation only. This also stops
    // names starting with "=" being treated as spreadsheet formulas.
    const name = String(d.name || '').replace(/[^\p{L}\p{N} '_.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name && rude_(name)) return json_({ ok: false, error: 'name' });
    if (d.game === 'fl') return flPost_(d, name);
    if (d.game === 'gk') return gkPost_(d, name);
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
