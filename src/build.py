#!/usr/bin/env python3
"""Build Losing Control from this folder.

    python3 src/build.py

Writes, relative to the repository root:
  control-room/index.html   the game (GitHub Pages): control room shifts, and the
                            generation shifts at control-room/?mode=gen
  index.html                redirect: the main address opens the game
  generation/index.html     redirect: old generation links and installed apps open
                            the generation shifts
  build/control-room.html   standalone copies with the test hook window.__fc,
  build/generation.html     used by the tests in src/tests and for previews

Edit game.js, body.html and game.css, never the built pages: the build
overwrites them. One page runs both kinds of shift; GAME ('cr' or 'fc') is
chosen when the page loads, from ?mode=gen.
"""
import os,re
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(HERE)
rd=lambda f:open(os.path.join(HERE,f),encoding='utf-8').read()
def wr(rel,txt):
    p=os.path.join(ROOT,rel);os.makedirs(os.path.dirname(p),exist_ok=True);open(p,'w',encoding='utf-8').write(txt);print('built',rel,len(txt))
base=rd('base-head.html');body=rd('body.html');js=rd('game.js');css=rd('game.css');pwa=rd('pwa.html')
assert js.count("const FORCE_GAME='';")==1

def standalone(game=None):
    """The page. game=None picks the kind of shift from the address (the published page);
    'cr' or 'fc' fixes it (the test copies)."""
    head=base
    b=body
    j=js if game is None else js.replace("const FORCE_GAME='';",f"const FORCE_GAME='{game}';")
    if 'charset' not in head[:300]: head='<meta charset="utf-8">\n'+head
    return head+css+'</style>\n\n'+b+'\n<script>\n'+j+'</script>\n'

META={
 'cr':dict(desc="Losing Control, a Watts Up control-room game: switch, transfer and restore supply across Blackout Canyon's substations through faults, planned work and peak demand, or balance generation and flexibility to keep its transformers inside firm capacity.",
   url='https://www.wattsupelectricity.co.uk/control-room/',title='Losing Control',
   alt='Losing Control by Watts Up: a network diagram with interconnectors to Ampy Place and Watts This',
   manifest='manifest.webmanifest',apple='../icons/cr-apple-180.png'),
 'fc':dict(desc="Watts Up control-room game: keep Blackout Canyon's transformers inside firm capacity through faults, storms and swings in generation.",
   url='https://www.wattsupelectricity.co.uk/',title='Firm Capacity: keep Blackout Canyon switched on',
   alt='Firm Capacity by Watts Up: three transformers, one faulted, the others at 112%',
   manifest='manifest.webmanifest',apple='../icons/gen-apple-180.png')}

def page(game,s):
    m=META[game];desc,url=m['desc'],m['url']
    s,n=re.subn(r"window\.__fc=\{.*?select\};\n","",s,flags=re.S)
    assert s.count('SITE_LOCK=false;')==1;s=s.replace('SITE_LOCK=false;','SITE_LOCK=true;')  # domain lock on for GitHub Pages
    assert n==1 and '__fc' not in s
    s=s.replace('<meta charset="utf-8">\n','',1)
    i=s.index('<style>');j=s.index('</style>')+len('</style>')
    out=f'''<!doctype html>
<!-- © 2026 Steve Backhouse. All rights reserved. Not open source: see https://github.com/DER-Dash/Network/blob/main/LICENSE -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watts Up">
<meta property="og:title" content="{m["title"]}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{url}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{m["alt"]}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{m["title"]}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{url}og-image.png">
<meta name="theme-color" content="#0B1F3A">
<link rel="manifest" href="{m["manifest"]}">
<link rel="apple-touch-icon" href="{m["apple"]}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<script>window.FC_GA='G-HXW96SRTWL';</script>
{s[:i].strip()}
<style>
:root{{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}
body{{margin:0;font:14px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif}}
img{{max-width:100%}}
[hidden]{{display:none!important}}
</style>
{s[j - len(s[i:j]):j]}
</head>
<body>
{s[j:].strip()}
{pwa}
</body>
</html>
'''
    return out

for game,name in [('cr','control-room'),('fc','generation')]:
    wr(f'build/{name}.html',standalone(game))
wr('control-room/index.html',page('cr',standalone()))

def redirect(target,title):
    return f'''<!doctype html>
<!-- © 2026 Steve Backhouse. All rights reserved. Not open source: see https://github.com/DER-Dash/Network/blob/main/LICENSE -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="canonical" href="https://www.wattsupelectricity.co.uk/control-room/">
<meta http-equiv="refresh" content="0; url={target}">
<script>location.replace({target!r}+(location.hash||''));</script>
<style>body{{font:16px/1.5 system-ui,sans-serif;background:#0B1F3A;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px;box-sizing:border-box;text-align:center}}a{{color:#FFD23F}}</style>
</head>
<body><p>Losing Control has moved. <a href="{target}">Open the game →</a></p></body>
</html>
'''
# The generation game used to live at the main address and at /generation/. Both now open the one game.
# The main address: the Watts Up games home page (src/home/home.html). Old links with a #hash or ?mode= still go to Losing Control.
wr('index.html',rd(os.path.join('home','home.html')))
# The demo to send to people: /demo/ opens Losing Control's demo once (?watch), then the Fault Lines and Gatekeeper slides
wr('demo/index.html',rd(os.path.join('home','demo.html')))
wr('generation/index.html',redirect('../control-room/?mode=gen','Losing Control · Generation'))

# ---- Fault Lines: the fault-finding puzzle, its own page at /fault-lines/ (sources in src/fault-lines) ----
def fault_lines(test):
    d=lambda f:rd(os.path.join('fault-lines',f))
    js,css,body=d('fl.js'),d('fl.css'),d('fl.html')
    # career.js (the 30 career puzzles) goes in just after fl.js's 'use strict' line, before any code runs
    assert js.startswith("'use strict';\n");js="'use strict';\n"+d('career.js')+js[len("'use strict';\n"):]
    if not test:
        js,n=re.subn(r"\nwindow\.__fl=\{.*?\};\n","\n",js,flags=re.S);assert n==1 and '__fl' not in js
    desc="Fault Lines, a Watts Up puzzle: an 11 kV feeder has tripped. Use the clues and as few switching operations as you can to find the faulted section, isolate it and restore everyone else."
    url='https://www.wattsupelectricity.co.uk/fault-lines/'
    sw='' if test else '''<script>if('serviceWorker' in navigator&&/^https:/.test(location.protocol))addEventListener('load',function(){navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(function(){});});</script>\n'''
    return f'''<!doctype html>
<!-- © 2026 Steve Backhouse. All rights reserved. Not open source: see https://github.com/DER-Dash/Network/blob/main/LICENSE -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Fault Lines</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watts Up">
<meta property="og:title" content="Fault Lines">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta name="theme-color" content="#0B1F3A">
<link rel="apple-touch-icon" href="../icons/cr-apple-180.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
{css}[hidden]{{display:none!important}}
</style>
</head>
<body>
{body}
<script>
{js}</script>
{sw}</body>
</html>
'''
wr('build/fault-lines.html',fault_lines(True))
wr('fault-lines/index.html',fault_lines(False))

# ---- Gatekeeper: the connections planning game, its own page at /gatekeeper/ (sources in src/gatekeeper) ----
exec(compile(open(os.path.join(HERE,'gatekeeper','build.py'),encoding='utf-8').read(),os.path.join(HERE,'gatekeeper','build.py'),'exec'),{'__file__':os.path.join(HERE,'gatekeeper','build.py'),'__name__':'gk_build'})

# ---- Storm Day, exhibition edition: its own page at /storm/ (sources in src/storm) ----
exec(compile(open(os.path.join(HERE,'storm','build.py'),encoding='utf-8').read(),os.path.join(HERE,'storm','build.py'),'exec'),{'__file__':os.path.join(HERE,'storm','build.py'),'__name__':'storm_build'})
