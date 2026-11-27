#!/usr/bin/env python3
"""Build Losing Control · Storm Day, the exhibition edition. Run by src/build.py; also on its own:

    python3 src/storm/build.py

Writes storm/index.html (published at /storm/) and build/storm-day-exhibition.html (the standalone copy to run
at a stand, offline included). Both are one self-contained file: the fonts (SIL Open Font License, see fonts/)
and the QR code are built in.
"""
import os,base64
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(HERE))
rd=lambda f:open(os.path.join(HERE,f),encoding='utf-8').read()
URL='https://www.wattsupelectricity.co.uk/storm/'
FONTS=[('Barlow',w,f'barlow-latin-{w}-normal.woff2') for w in (400,500,600,700)]+\
  [('Barlow Condensed',w,f'barlow-condensed-latin-{w}-normal.woff2') for w in (500,600,700)]+\
  [('JetBrains Mono',w,f'jetbrains-mono-latin-{w}-normal.woff2') for w in (500,600,700)]
def fonts():
    out=['/* Fonts built in (SIL Open Font License 1.1): Barlow and Barlow Condensed by Jeremy Tribby, JetBrains Mono by JetBrains */']
    for fam,w,f in FONTS:
        b=base64.b64encode(open(os.path.join(HERE,'fonts',f),'rb').read()).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{b}) format('woff2')}}")
    return '\n'.join(out)
LIVE_META=f'''<link rel="canonical" href="{URL}">
<meta name="description" content="Storm Day: keep Blackout Canyon inside its firm capacity through a storm, using batteries, a gas engine, demand response and curtailment. A Watts Up game.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watts Up">
<meta property="og:title" content="Losing Control · Storm Day">
<meta property="og:description" content="Keep it in the green: run Blackout Canyon through a storm with flexibility.">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="https://www.wattsupelectricity.co.uk/og-image.png">
<link rel="icon" href="../icons/cr-192.png">
<link rel="apple-touch-icon" href="../icons/cr-apple-180.png">
'''
def page(live):
    qr=rd('qr.svg').replace('<svg ','<svg aria-label="QR code for wattsupelectricity.co.uk" role="img" ',1)
    return rd('storm.html').replace('%%META%%',LIVE_META if live else '').replace('%%FONTS%%',fonts()).replace('%%QR%%',qr)
def wr(p,s):
    p=os.path.join(ROOT,p);os.makedirs(os.path.dirname(p),exist_ok=True);open(p,'w',encoding='utf-8').write(s);print('built',os.path.relpath(p,ROOT),len(s))
wr('storm/index.html',page(True))
wr('build/storm-day-exhibition.html',page(False))
