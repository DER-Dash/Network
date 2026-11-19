# Fault Lines: handover notes

Fault Lines is a Watts Up puzzle game: an 11 kV feeder has tripped and locked out, and the player finds the
faulted section with as few switching operations as possible, isolates it and restores everyone else.
Live at https://www.wattsupelectricity.co.uk/fault-lines/ (GitHub Pages, repo DER-Dash/Network, branch main).
Design doc (with Steve's answers to the open questions): https://claude.ai/artifact/LvPxqBPXWNhEChRyBuwEu9

## Status (19 November 2026)

Build plan step 1, **practice mode**, is done:

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

## Next steps (from the build plan)

2. Daily puzzle (same seed for everyone each day) with a shareable result grid, on the scoreboard
   (scoreboard/Code.gs, Apps Script; Steve redeploys it as a new version after changes).
3. Career: about 30 hand-built teaching puzzles (half-splitting, using FPIs, back-feeding, auto-reclosers).
4. "Find it yourself" link from Losing Control when an 11 kV feeder locks out.

## Files

- `src/fault-lines/fl.js`: all game logic. Puzzle generator `makePuzzle`, switching model `operate`
  (devices `cb`, `nop`, `'0'..` main switches, `'p0'..` spur switches; spur j is section n+j),
  `candidates` (sections consistent with every clue and test), the expert `nextMove` / `solvePar`
  (used for hints and par), drawing `svg()` with `layout()`, crew animation `actUI`.
- `src/fault-lines/fl.html`: page body. `src/fault-lines/fl.css`: styles (Watts Up tokens, light and dark).
- `src/build.py` builds `fault-lines/index.html` (published) and `build/fault-lines.html` (test copy with the
  `window.__fl` hook). Never edit the built pages.
- `src/tests/faultlines.test.js`: jsdom tests, including the expert solving 900 random puzzles at par.

## Working conventions

- Build: `python3 src/build.py`. Tests: `cd src/tests && npm test` (all games, a few minutes) or
  `node faultlines.test.js` for just this game.
- Bump `CACHE` in `sw.js` on every push so phones pick up the new version.
- Commit as Steve: `git -c user.name="Steve Backhouse" -c user.email="stevebackhouse@gmail.com" commit`,
  push with `git push origin HEAD:main`.
- Check layout on a phone-size screenshot (Playwright, iPhone 13) before pushing.
