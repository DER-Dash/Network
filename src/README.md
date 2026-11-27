# Losing Control: source

The game (control room and generation shifts, on one page) is built from the files in this folder.
**Edit these, not the built pages** — `control-room/index.html`, `generation/index.html` and the other
built pages are overwritten by every build.

| File | What it is |
|---|---|
| `game.js` | All game code: network, load flow, faults, switching, crews, scoring, career, tutorial, music. `GAME` is `'cr'` (control room shifts) or `'fc'` (generation shifts), picked when the page loads: `?mode=gen` gives the generation shifts. |
| `body.html` | Page layout: header, panels, dock, feedback form. |
| `game.css` | Styles added on top of the base styles. |
| `base-head.html` | Base `<head>`: fonts, colour tokens (light and dark) and core styles. |
| `pwa.html` | Install-as-an-app button and service worker registration. |
| `gen/` | The generation shifts at `/generation/`: `gen.html` (one file: page and code), built by `gen/build.py` with the Storm Day styles and fonts from `storm/`, so the two always look the same. |
| `storm/` | Storm Day, the exhibition edition at `/storm/`. |
| `build.py` | Builds everything. |
| `tests/` | Headless checks (jsdom). |

## Build

```
python3 src/build.py
```

This writes the GitHub Pages files and standalone copies in `build/`
(ignored by git) that keep the `window.__fc` test hook.

## Domain lock

The published pages live at `www.wattsupelectricity.co.uk` (the `CNAME` file) and only run
there and on `der-dash.github.io`
(and `localhost` for testing).
Anywhere else they show a "play the original" screen. `build.py` switches this on
(`SITE_LOCK`) for the GitHub Pages files only, so the copies in `build/` open anywhere,
including straight from disk. Links inside the published pages are relative, so the
same files work at `der-dash.github.io/Network/` and at the root of the custom domain. Scores carry the site name and the scoreboard rejects
other sites (see `scoreboard/README.md`, version 12).

## Generation shifts (`gen/`)

The three days are data in `DAYS` in `gen/gen.html`: demand, sun, wind, faults, risk windows, planned work and
curtailment allowances. They run 05:00–23:00 at 4 game minutes a second. Faults never overlap each other or planned
work, and are moved or cut short if the gas engine and demand response couldn't win them (as in Storm Day).
Career stars are kept in `fcg-career` (the old generation career). Scores go to the scoreboard as game `gn`
(version 25). `node tests/gen-shifts.test.js` plays each day with the demo bot; `node tests/gen-scoreboard.test.js`
checks the scoreboard. The old diagram version of the generation shifts is still in `game.js` (`GAME==='fc'`) for
the test copy `build/generation.html`, but the published page redirects `?mode=gen` to `/generation/`.

## Adding a shift

Shifts are data in `SCENARIOS` in `game.js`. `demand` is the curve; an optional
`surge:{start,peak,end,mw,seen}` adds a late peak on top that the look-ahead only sees
the fraction `seen` of (EV evening). `tips:{reason:text}` overrides the shift debrief's
tips for that shift. Add the key to `CR_DAYS` in `scoreboard/Code.gs` so its scores save,
and if it goes in the middle of `CAREER`, also add it to `CAREER_ADDED` so existing
careers keep their unlocks.

## Test

```
cd src/tests && npm install && npm test
node generation-bot.js      # longer: plays the generation game's days with a simple bot
```

## Other assets

`icons/`, `og-image.png`, `control-room/og-image.png`, the manifests and `sw.js`
are edited directly. If you change the icons or offline files, bump `CACHE` in
`sw.js` so installed apps pick them up.

## Scoreboard

`scoreboard/Code.gs` is the Google Apps Script web app behind the scoreboard and
feedback. After changing it, paste it into Apps Script and deploy a **New
version** of the existing deployment (same URL).

© 2026 Steve Backhouse. All rights reserved — see `../LICENSE`.
