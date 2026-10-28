/**
 * Firm Capacity scoreboard (Shocking Steve Electricity).
 * Google Apps Script web app that stores scores in this spreadsheet.
 *
 * GET  ?day=may|jan|storm   -> top 50 scores for that day
 * POST {name, day, result, survived, spend, faults, risk, grade}
 *      -> stores the score and returns its rank
 *
 * The score is recalculated here from the submitted figures, using the same
 * formula as the game, so the sheet never trusts a score sent by the browser.
 */
const SHEET_NAME = 'Scores';
const DAYS = ['may', 'jan', 'storm'];
const SHIFT_MINUTES = 1080; // 05:00 to 23:00
const HEADERS = ['Submitted', 'Name', 'Day', 'Score', 'Result', 'Minutes on supply',
  'Spend (£)', 'Faults', 'Minutes at risk', 'Grade'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function rows_() {
  const sh = sheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
}

function doGet(e) {
  const day = String((e && e.parameter && e.parameter.day) || '');
  const scores = rows_()
    .filter(r => !day || r[2] === day)
    .map(r => ({
      name: String(r[1]), day: r[2], score: Number(r[3]), result: r[4],
      survived: Number(r[5]), spend: Number(r[6]), faults: Number(r[7]),
      risk: Number(r[8]), grade: String(r[9]),
      at: r[0] instanceof Date ? r[0].toISOString() : String(r[0])
    }))
    .sort((a, b) => b.score - a.score || a.at.localeCompare(b.at))
    .slice(0, 50);
  return json_({ ok: true, scores: scores });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    // Letters, numbers, spaces and a little punctuation only. This also stops
    // names starting with "=" being treated as spreadsheet formulas.
    const name = String(d.name || '').replace(/[^\p{L}\p{N} '_.-]/gu, '').trim().slice(0, 20);
    const day = DAYS.indexOf(d.day) >= 0 ? d.day : null;
    const survived = Math.round(Number(d.survived));
    const spend = Math.round(Number(d.spend));
    const faults = Math.round(Number(d.faults));
    const risk = Math.round(Number(d.risk));
    const complete = d.result === 'complete';
    const grade = complete ? (['A', 'B', 'C', 'D'].indexOf(d.grade) >= 0 ? d.grade : '') : 'Lost';

    const valid = name && day &&
      survived >= 0 && survived <= SHIFT_MINUTES &&
      (!complete || survived === SHIFT_MINUTES) &&
      risk >= 0 && risk <= survived &&
      spend >= 0 && spend < 10000000 &&
      faults >= 0 && faults <= 50 && grade !== '';
    if (!valid) return json_({ ok: false, error: 'Invalid score' });

    const score = Math.max(0, survived * 10 + (complete ? 5000 : 0) - risk * 20 - Math.round(spend / 10));
    sheet_().appendRow([new Date(), name, day, score, complete ? 'complete' : 'lost',
      survived, spend, faults, risk, grade]);

    const sameDay = rows_().filter(r => r[2] === day).map(r => Number(r[3]));
    const rank = sameDay.filter(v => v > score).length + 1;
    return json_({ ok: true, name: name, score: score, rank: rank, total: sameDay.length });
  } catch (err) {
    return json_({ ok: false, error: 'Could not save score' });
  } finally {
    lock.releaseLock();
  }
}
