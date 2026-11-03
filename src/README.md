# Firm Capacity: source

Both games (generation and control room) are built from the files in this folder.
**Edit these, not the built pages** — `index.html`, `generation/index.html` and
`control-room/index.html` are overwritten by every build.

| File | What it is |
|---|---|
| `game.js` | All game code: network, load flow, faults, switching, crews, scoring, career, tutorial, music. `GAME` is `'cr'` (control room) or `'fc'` (generation); the build makes one page of each. |
| `body.html` | Page layout: header, panels, dock, feedback form. |
| `game.css` | Styles added on top of the base styles. |
| `base-head.html` | Base `<head>`: fonts, colour tokens (light and dark) and core styles. |
| `pwa.html` | Install-as-an-app button and service worker registration. |
| `build.py` | Builds everything. |
| `tests/` | Headless checks (jsdom). |

## Build

```
python3 src/build.py
```

This writes the three GitHub Pages files and standalone copies in `build/`
(ignored by git) that keep the `window.__fc` test hook.

## Domain lock

The published pages only run on `der-dash.github.io` (and `localhost` for testing).
Anywhere else they show a "play the original" screen. `build.py` switches this on
(`SITE_LOCK`) for the GitHub Pages files only, so the copies in `build/` open anywhere,
including straight from disk. Scores carry the site name and the scoreboard rejects
other sites (see `scoreboard/README.md`, version 12).

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
