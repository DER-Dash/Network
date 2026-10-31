/**
 * Firm Capacity scoreboard (Shocking Steve Electricity), version 4.
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
const VERSION = 4;
const SHEET_NAME = 'Scores';
const CR_SHEET_NAME = 'Control room scores';
const sheetFor_ = game => game === 'cr' ? CR_SHEET_NAME : SHEET_NAME;
const DAYS = ['may', 'jan', 'storm'];
const CR_DAYS = ['jan', 'storm', 'grid', 'mesh'];
const SHIFT_MINUTES = 1080; // 05:00 to 23:00
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

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    // Letters, numbers, spaces and a little punctuation only. This also stops
    // names starting with "=" being treated as spreadsheet formulas.
    const name = String(d.name || '').replace(/[^\p{L}\p{N} '_.-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 20);
    if (name && rude_(name)) return json_({ ok: false, error: 'name' });
    const game = d.game === 'cr' ? 'cr' : 'fc';
    const day = (game === 'cr' ? CR_DAYS : DAYS).indexOf(d.day) >= 0 ? d.day : null;
    const rawMode = String(d.mode || (game === 'cr' ? 'cr-free' : 'free'));
    const mode = modeOk_(rawMode, game) ? rawMode : null;
    const ens = game === 'cr' ? Math.round(Number(d.ens)) : 0;
    const incidents = game === 'cr' ? Math.round(Number(d.incidents)) : 0;
    const survived = Math.round(Number(d.survived));
    const spend = Math.round(Number(d.spend));
    const faults = Math.round(Number(d.faults));
    const risk = Math.round(Number(d.risk));
    const complete = d.result === 'complete';
    const grade = complete ? (['A', 'B', 'C', 'D'].indexOf(d.grade) >= 0 ? d.grade : '') : 'Lost';

    const valid = name && day && mode &&
      survived >= 0 && survived <= SHIFT_MINUTES &&
      (!complete || survived === SHIFT_MINUTES) &&
      risk >= 0 && risk <= survived &&
      spend >= 0 && spend < 10000000 &&
      faults >= 0 && faults <= 50 && grade !== '' &&
      ens >= 0 && ens < 1000000 && incidents >= 0 && incidents <= 50;
    if (!valid) return json_({ ok: false, error: 'Invalid score' });

    const score = Math.max(0, survived * 10 + (complete ? 5000 : 0) - risk * 20 - Math.round(spend / 10) - ens - incidents * 500);
    sheet_(sheetFor_(game)).appendRow([new Date(), name, day, score, complete ? 'complete' : 'lost',
      survived, spend, faults, risk, grade, mode, game === 'cr' ? ens : '', game === 'cr' ? incidents : '']);

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
