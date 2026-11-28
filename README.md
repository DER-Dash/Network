# Losing Control

A browser game about running an electricity distribution network:
https://www.wattsupelectricity.co.uk/control-room/

It has two kinds of shift, chosen on the start screen:

- **Control room**: switch, transfer and restore supply through faults and planned work.
- **Generation**: balance generation, batteries and flexibility to stay inside firm capacity, on five days
  (Sunny Sunday, Storm day, Cold Thursday, Heatwave, EV evening). Since Nov 2026 these play on the Storm Day screen, on their own page at
  https://www.wattsupelectricity.co.uk/generation/ (`?mode=gen` on the game still goes there).

Also on the site, built from the same `src/` folder:

- **Fault Lines** (https://www.wattsupelectricity.co.uk/fault-lines/): a daily fault-finding puzzle.
- **Gatekeeper** (https://www.wattsupelectricity.co.uk/gatekeeper/): a ten-year connections planning game. The
  network you build there can be played as a Losing Control generation shift ("Run your network").

The main address (https://www.wattsupelectricity.co.uk/) is the Watts Up games home page. Old links to https://der-dash.github.io/Network/ forward to the new domain.

© 2026 Steve Backhouse. All rights reserved. This repository is published so the
games can be hosted on GitHub Pages; it is **not** open source. You may play and
share links to the games, but copying, re-hosting or reusing the code or content
is not permitted without written permission. See [LICENSE](LICENSE).

## Making changes

The games are built from `src/` with `python3 src/build.py`. See [src/README.md](src/README.md).
