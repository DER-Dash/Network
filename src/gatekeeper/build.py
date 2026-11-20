#!/usr/bin/env python3
"""Build Gatekeeper (the connections queue game). Run by src/build.py; also on its own:

    python3 src/gatekeeper/build.py

Writes gatekeeper/index.html (published at /gatekeeper/), build/gatekeeper.html (test copy,
sets window.__GK_TEST for the hook), build/gatekeeper-preview.html (links to the live site,
for previews elsewhere) and build/preview/ (Gatekeeper with copies of Losing Control beside it).
"""
import os
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(HERE))
rd=lambda f:open(os.path.join(HERE,f),encoding='utf-8').read()
URL='https://www.wattsupelectricity.co.uk/gatekeeper/'
LIVE_META=f'''<link rel="canonical" href="{URL}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Watts Up">
<meta property="og:title" content="Gatekeeper">
<meta property="og:description" content="Gatekeeper, a Watts Up planning game: decide who gets connected to Blackout Canyon's network, and on what terms, over a ten-year career.">
<meta property="og:url" content="{URL}">
<link rel="apple-touch-icon" href="../icons/cr-apple-180.png">
'''
SW='''<script>if('serviceWorker' in navigator&&/^https:/.test(location.protocol))addEventListener('load',function(){navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(function(){});});</script>\n'''
def page(test,live=False):
    body=rd('gk.html')
    if not test and not live:  # the preview lives outside the site, so link to the live games
        body=body.replace('href="../','href="https://www.wattsupelectricity.co.uk/')
    return f'''<!doctype html>
<!-- © 2026 Steve Backhouse. All rights reserved. Not open source: see https://github.com/DER-Dash/Network/blob/main/LICENSE -->
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Gatekeeper · Watts Up</title>
<meta name="description" content="Gatekeeper, a Watts Up planning game: decide who gets connected to Blackout Canyon's network, and on what terms, over a ten-year career.">
<meta name="theme-color" content="#0B1F3A">
{LIVE_META if live else ''}<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
{rd('base.css')}</style>
</head>
<body>
{body}
<script>{'window.__GK_TEST=true;' if test else ''}
{rd('gk.js')}</script>
{SW if live else ''}</body>
</html>
'''
os.makedirs(os.path.join(ROOT,'build'),exist_ok=True)
os.makedirs(os.path.join(ROOT,'gatekeeper'),exist_ok=True)
open(os.path.join(ROOT,'gatekeeper','index.html'),'w',encoding='utf-8').write(page(False,live=True));print('built gatekeeper/index.html')
for name,test in (('gatekeeper.html',True),('gatekeeper-preview.html',False)):
    p=os.path.join(ROOT,'build',name);open(p,'w',encoding='utf-8').write(page(test));print('built',p)

# Preview bundle (build/preview/): Gatekeeper at the top, with the test copies of Losing Control beside it in
# control-room/, so the hand-off works on one site before anything is published. Run python3 src/build.py first.
def bundle():
    P=os.path.join(ROOT,'build','preview');os.makedirs(os.path.join(P,'control-room'),exist_ok=True)
    g=page(False).replace("LC_URL='../control-room/#gk'","LC_URL='control-room/index.html#gk'")
    g=g.replace('href="https://www.wattsupelectricity.co.uk/control-room/"','href="control-room/index.html"')
    assert "LC_URL='control-room/index.html#gk'" in g
    open(os.path.join(P,'index.html'),'w',encoding='utf-8').write(g)
    for src,dst in (('control-room.html','index.html'),('generation.html','generation.html')):
        f=os.path.join(ROOT,'build',src)
        if not os.path.exists(f):print('skip',src,'(run src/build.py)');continue
        t=open(f,encoding='utf-8').read()
        old="const modeHref=g=>location.pathname+(g==='fc'?'?mode=gen':'');"
        assert old in t;t=t.replace(old,"const modeHref=g=>g==='fc'?'generation.html':'index.html';")
        t=t.replace("const GK_URL='../gatekeeper/';","const GK_URL='../index.html';").replace('href="../fault-lines/"','href="https://www.wattsupelectricity.co.uk/fault-lines/"')
        open(os.path.join(P,'control-room',dst),'w',encoding='utf-8').write(t)
    print('built',P)
bundle()
