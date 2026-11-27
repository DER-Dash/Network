#!/usr/bin/env python3
"""Build Losing Control's generation shifts (Sunny Sunday, Storm day, Cold Thursday). Run by src/build.py; also on its own:

    python3 src/gen/build.py

The generation shifts play on the Storm Day screen (src/storm/storm.html): this page takes its styles and fonts from
there, so the two always look the same. Writes generation/index.html (published at /generation/, where Losing
Control's Generation option and ?mode=gen go) and build/generation-shifts.html (a copy that opens anywhere, for testing).
"""
import os
HERE=os.path.dirname(os.path.abspath(__file__));SRC=os.path.dirname(HERE);ROOT=os.path.dirname(SRC)
rd=lambda *f:open(os.path.join(SRC,*f),encoding='utf-8').read()
URL='https://www.wattsupelectricity.co.uk/generation/'
storm=rd('storm','storm.html')
a=storm.index('%%FONTS%%\n')+len('%%FONTS%%\n');b=storm.index('</style>',a)
CSS=storm[a:b].replace('Losing Control · Storm Day, exhibition edition.','Shared with the generation shifts (src/gen):',1)
def fonts():
    import base64
    F=[('Barlow',w,f'barlow-latin-{w}-normal.woff2') for w in (400,500,600,700)]+\
      [('Barlow Condensed',w,f'barlow-condensed-latin-{w}-normal.woff2') for w in (500,600,700)]+\
      [('JetBrains Mono',w,f'jetbrains-mono-latin-{w}-normal.woff2') for w in (500,600,700)]
    out=['/* Fonts built in (SIL Open Font License 1.1): Barlow and Barlow Condensed by Jeremy Tribby, JetBrains Mono by JetBrains */']
    for fam,w,f in F:
        d=base64.b64encode(open(os.path.join(SRC,'storm','fonts',f),'rb').read()).decode()
        out.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;src:url(data:font/woff2;base64,{d}) format('woff2')}}")
    return '\n'.join(out)
LIVE_META=f'''<link rel="canonical" href="{URL}">
<meta name="description" content="Losing Control's generation shifts: keep Blackout Canyon inside its firm capacity on a sunny Sunday, a storm day and a cold Thursday, using batteries, a gas engine, demand response and curtailment. A Watts Up game.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watts Up">
<meta property="og:title" content="Losing Control · Generation">
<meta property="og:description" content="Keep it in the green: balance generation and flexibility to keep Blackout Canyon inside firm capacity.">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="https://www.wattsupelectricity.co.uk/og-image.png">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="../icons/gen-192.png">
<link rel="apple-touch-icon" href="../icons/gen-apple-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
'''
PWA='''<script>if('serviceWorker' in navigator&&/^https:/.test(location.protocol))addEventListener('load',function(){navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(function(){});});</script>'''
def page(live):
    s=rd('gen','gen.html')
    for k in ('%%META%%','%%FONTS%%','%%STORMCSS%%','%%PWA%%'):assert s.count(k)==1,k
    return s.replace('%%META%%',LIVE_META if live else '').replace('%%FONTS%%',fonts()).replace('%%STORMCSS%%',CSS).replace('%%PWA%%',PWA if live else '')
def wr(p,s):
    p=os.path.join(ROOT,p);os.makedirs(os.path.dirname(p),exist_ok=True);open(p,'w',encoding='utf-8').write(s);print('built',os.path.relpath(p,ROOT),len(s))
wr('generation/index.html',page(True))
wr('build/generation-shifts.html',page(False))
