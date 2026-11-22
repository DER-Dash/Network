# Fault Lines: handover notes

Fault Lines is a Watts Up puzzle game: an 11 kV feeder has tripped and locked out, and the player finds the
faulted section with as few switching operations as possible, isolates it and restores everyone else.
Live at https://www.wattsupelectricity.co.uk/fault-lines/ (GitHub Pages, repo DER-Dash/Network, branch main).
Design doc (with Steve's answers to the open questions): https://claude.ai/artifact/LvPxqBPXWNhEChRyBuwEu9

## Status (19 November 2026)

Build plan steps 1 to 4 are done.

**Career** (step 3):

- 30 hand-built puzzles in `career.js`, five ranks of six: Trainee (trial closes, half-splitting, spurs), Assistant
  Control Engineer (FPIs, failed FPIs, distance, calls, misleading calls), Control Engineer (back-feeding, manual
  switches), Authorised Control Engineer (auto-reclosers), Senior Control Engineer (everything at once).
- Each is a seed plus overrides for `makePuzzle` (`opt`: fault, tees, fpi/man strings per switch, rec, oh, ...).
  Ids `c1`..`c30` are stable: progress is saved under them (`fl-career`), so never renumber.
- A briefing card before each puzzle. Stars: ★★★ at or under par with no hints, isolated and everyone else
  restored; ★★ found, isolated and restored; ★ found it. Finding it unlocks the next. Promotion message on rank-up.
  Progress is on the device only (no career sync yet).
- **Auto-reclosers** (new): main switches with `rec`, drawn as AR. The nearest closed recloser upstream of the
  fault trips instead of the breaker, so everything before it stays on. A puzzle with reclosers starts either
  with the recloser locked out and the breaker holding (fault beyond it) or the breaker locked out and the
  recloser untouched (fault before it). The expert and par handle them; random feeders with reclosers are tested.

**Find it yourself** (step 4):

- Losing Control shows a **Find it yourself** button on an 11 kV feeder whose fault hasn't been found yet (the
  feeder's pop-up and the substation's demand panel). It pauses the shift and opens `../fault-lines/?lc=...` in a
  full-screen frame: that feeder and primary, its customers, overhead or cable, the shift clock, and the fault in
  the same half as in Losing Control (near half = first three main sections and their spurs).
- Fault Lines posts `{type:'fl-lc',k,t,done,correct,quick}` back (same origin only). Found: located now, so the
  repair starts; quick (within 2 steps of par): a quarter off the repair, at least 15 minutes left. Wrong: patrol
  carries on. The player still switches the healthy half back on in Losing Control.
- These puzzles don't count towards practice bests or the daily streak.
- The far end matches Losing Control: `nb` in the `lc` data is the feeder's real back-feed (Volt Face, or an 11 kV link
  to a live neighbour, with the label to draw), or 0 for none, which draws "End of feeder: no back-feed" with no NOP.
- Switching comes back: every operation posts `{type:'fl-lc-sw',k,t,sw}` and the result carries `sw` too, so even
  Losing Control's own Back button keeps it. `sw` = first half on from the breaker, second half on from the back-feed,
  mid-point switch (after section 3) closed. `findCopy` in game.js applies what a two-half feeder can show: the
  healthy half back on, the mid-point open, and a log line; customers restored inside the faulted half stay off.

**Today's puzzle** (step 2):

- One puzzle a day, the same for everyone: seed `hashStr('fault-lines|'+date)`, date in UK time, puzzle #1 was
  19 November 2026. Level by weekday: Mon–Tue Easy, Wed–Thu Medium, Fri–Sun Hard (the scoreboard checks it).
- One go a day. Moves are saved in localStorage (`fl-day-DATE`: ops and the declared section) and replayed on
  reload, so a half-done puzzle resumes and a finished one shows its result. The page opens on today's puzzle,
  or on practice once today's is done. Practice and today's puzzle each keep their own puzzle when you switch tabs.
- Result grid, one square per operation: ⬜ open (or a close that put nothing new on), 🟩 close that held,
  🟥 tripped our breaker, 🟧 tripped the neighbour, 💡 hint, then ✅ found or ⬛ wrong. "Share result" uses the
  phone's share sheet, else the clipboard, else a text box to copy. No section names in it.
- Streak of consecutive days (`fl-streak`). Name shared with Losing Control (`fc-name`).
- Scoreboard: Code.gs version 22, game `fl`, its own **Fault Lines scores** tab. Each player's first score of
  the day counts. The server recalculates the score, checks the grid letters against trips and hints, and the
  first score of the day fixes par. **Steve: redeploy Code.gs as a new version** (scoreboard/README.md);
  until then the board says "coming soon" and the puzzle still plays.

**Practice mode** (step 1):

- Random radial feeders at three levels: Easy (5 sections, 1 spur, all remote, all FPIs working, possible
  sections shaded), Medium (7 sections, 2 spurs, some manual switches, some failed FPIs), Hard (9 sections,
  3 spurs, few FPIs, no distance estimate, misleading calls).
- Clues: protection flags, fault passage indicators (flagged, not flagged, "?" for no reading), relay
  distance estimate, customer calls.
- Spurs tee off main sections through their own spur switch; faults can be on spurs.
- Manual switches: a crew van drives from the depot, operates the switch, then stands beside it.
- Scoring: steps against par (par set by the built-in expert), trips onto the fault, neighbour trips,
  customer minutes lost, isolation, healthy customers left off, hints (−50 each). Grades A to E.
- Closing the NOP onto a live feeder is refused (it would parallel two primaries on different grid supplies).
- Linked from the Losing Control footer ("New: Fault Lines puzzle").

Steve's decisions: punchier name in the Losing Control style (chose "Fault Lines"), its own page,
phone-first layout.

**Graphics pass** (20 November 2026): call bubbles on the sections that rang in (tap a section to read its
calls), the relay distance as a band on the line, poles on overhead line and dotted cable, a pulse of power along
sections a close puts back on, a spark where protection trips, the faulted section lighting up for a moment before
the result card (`FL_FAST` skips that in tests), bolder flagged FPIs, quiet "off" labels, softer switches in dark
mode, a slimmer header on phones, and the depot label clear of the van.

## Next steps

The build plan's Fault Finder steps are all done. Ideas for what's next:

- Career sync across devices through the scoreboard's Careers tab (name + PIN), like Losing Control.
- Design-doc extras not built yet: the Sunday ring with two NOPs and the two-fault storm day; a patrol tool
  (a crew walks one section, 5 steps); weather and recent-work clues.
- A "Today's Fault Lines" link next to the Losing Control daily challenge.
- Then Connections Queue (build plan steps 5 to 7).

## Files

- `src/fault-lines/career.js`: the 30 career puzzles and the ranks. build.py puts it at the top of the script.
- `src/fault-lines/fl.js`: all game logic. Puzzle generator `makePuzzle`, switching model `operate`
  (devices `cb`, `nop`, `'0'..` main switches, `'p0'..` spur switches; spur j is section n+j),
  `candidates` (sections consistent with every clue and test), the expert `nextMove` / `solvePar`
  (used for hints and par), drawing `svg()` with `layout()`, crew animation `actUI`.
- `src/fault-lines/fl.html`: page body. `src/fault-lines/fl.css`: styles (Watts Up tokens, light and dark).
- `src/build.py` builds `fault-lines/index.html` (published) and `build/fault-lines.html` (test copy with the
  `window.__fl` hook). Never edit the built pages.
- `src/tests/faultlines.test.js`: jsdom tests, including the expert solving 900 random puzzles at par.
- `src/tests/faultlines-daily.test.js`: today's puzzle, resume, share grid, and the Code.gs `fl` branch run
  in `appscript-mock.js` (which now has `get` for doGet too).
- `src/tests/faultlines-career.test.js`: all 30 career puzzles at par for three stars, unlocks, ranks, reclosers,
  and a fingerprint of the puzzle generator: **if it fails, a change has altered published daily puzzles**. Put
  new random draws behind `opt` (as `t0r`, `cu`, `so` do) so plain puzzles come out the same.
- `src/tests/findit.test.js`: Find it yourself, both sides (Losing Control in `game.js`, Fault Lines `?lc=`).

## Working conventions

- Build: `python3 src/build.py`. Tests: `cd src/tests && npm test` (all games, a few minutes) or
  `node faultlines.test.js && node faultlines-daily.test.js && node faultlines-career.test.js && node findit.test.js` for just this game.
- Bump `CACHE` in `sw.js` on every push so phones pick up the new version.
- Commit as Steve: `git -c user.name="Steve Backhouse" -c user.email="stevebackhouse@gmail.com" commit`,
  push with `git push origin HEAD:main`.
- Check layout on a phone-size screenshot (Playwright, iPhone 13) before pushing.
