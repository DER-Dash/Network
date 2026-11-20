# Gatekeeper: handover notes

The Connections Queue game from the design doc (https://claude.ai/artifact/LvPxqBPXWNhEChRyBuwEu9).
You're the connections and planning engineer for Blackout Canyon for ten years, one year per round.
Kept separate for testing: preview at https://claude.ai/artifact/LB7GasFesHAc81mSNRqCCW. Not yet in src/build.py or at /gatekeeper/.

## Files
- `gk.js` all logic: time model (12 months x 3 day types x 24 h = 864 weighted points), profiles per customer type,
  `plan()` firm headroom (worst-case profiles, every contracted firm/timed customer, built or not), `simulate()` the
  year (actual profiles, ANM curtails flexible customers last in first off at the primary then the GSP, storms),
  `assess()`/`offers()`/`reinfFor()`/`flexEst()`, `sendOffers()`, `runYear()` scoring, UI.
- `gk.html` page body, `base.css` Fault Lines styles plus Gatekeeper's (gauges are `.gbar`: `.bar` is the header).
- `build.py` writes `build/gatekeeper.html` (test hook `window.__gk`) and `build/gatekeeper-preview.html` (live-site links).
- `../tests/gatekeeper.test.js` plays five ten-year careers with a simple bot, plus a UI smoke test.

## Rules modelled (artistic licence)
- Year 1-2 first come, first served; inherited queue has speculative "zombie" projects holding headroom.
- Year 3 Gate 2: generation/storage need land rights + planning for a confirmed date (else Gate 1 waiting list);
  contracted projects past their connection year can be removed. Year 6: same for demand (data centres arrive).
- Flexible: ANM, LIFO, curtailment limit = estimate + 2 points (min 3%); compensation £100/MWh above it.
- Firm after reinforcement: generation pays a share (min(half the cost, £0.1m/MW)); demand pays nothing.
- Events: Y2 cold winter, Y3 Gate 2, Y4 landowner objection, Y5 flexible by default, Y6 demand reform,
  Y7 big customer cancels, Y8 two storms, Y9 cold winter, Y10 net zero year.
- Scores: connections, security, curtailment, cost (£8m a year), regulator. Grades A-E, stars, Ofgem verdict.

## Online (scoreboard version 23)
- **Scoreboard**: whole careers. The game sends the five scores from each year's report card; `Code.gs` (`gkPost_`)
  works out the grades, stars and career score (sum of yearly averages × 10, up to 10,000). Boards: `gk-free` and
  `gk-week-<Monday>` (the week's canyon: seed `hashStr('gatekeeper|week|'+Monday)`, checked by the script).
  A first visit starts the week's canyon; Menu → New career offers either.
- **Saving online**: the same name and PIN as Losing Control (shared `fc-sync` link). `type:'career', game:'gk'`
  stores `{save, t, best}` in two new Careers columns; the newest save wins; Load always takes the online game.
  A ten-year save is about 17,000 characters (limit 45,000).
- Off the site (the claude.ai preview) fetch is blocked: the scoreboard and saving say they work at the site.

## First-year tutorial
Seven coach steps in year 1 (`TUT`): open an application, make an offer, flexible connections, the inherited
queue, send offers, reinforce and run the year, the report. Skippable; Menu → Replay the tutorial.

## Into Losing Control (build plan step 7)
`exportNet()` writes `localStorage['gk-export']` (same site): `kD` (grid supply point peak loading compared with the
inherited network), `E` (worst export as a share of the limit), and the flexible demand, batteries and solar the
player connected. Losing Control's generation start screen then shows **Run your network**: Cold Thursday with
demand × kD (or Sunny Sunday if E ≥ 0.55), and its demand response, battery and solar curtailment allowance set by
what was connected (`sc.svc`, `applySvc`). Not on the scoreboard. Links: report, end screen and menu → `../control-room/?mode=gen#gk`.

## Next steps
- Wire into `src/build.py` and publish at `/gatekeeper/`, link it from Losing Control and Fault Lines.
- Redeploy `Code.gs` as a new version (version 23).
- Balance tuning after playtesting.
