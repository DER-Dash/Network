# Losing Control

A browser game about running an electricity distribution network:
https://www.wattsupelectricity.co.uk/control-room/

It has two kinds of shift, chosen on the start screen:

- **Control room**: switch, transfer and restore supply through faults and planned work.
- **Generation**: balance generation, batteries and flexibility to stay inside firm capacity
  (also at https://www.wattsupelectricity.co.uk/control-room/?mode=gen).

The main address (https://www.wattsupelectricity.co.uk/) and the old `/generation/` address
redirect to the game. Old links to https://der-dash.github.io/Network/ forward to the new domain.

© 2026 Steve Backhouse. All rights reserved. This repository is published so the
games can be hosted on GitHub Pages; it is **not** open source. You may play and
share links to the games, but copying, re-hosting or reusing the code or content
is not permitted without written permission. See [LICENSE](LICENSE).

## Making changes

The games are built from `src/` with `python3 src/build.py`. See [src/README.md](src/README.md).
