#!/usr/bin/env python3
"""Build both Firm Capacity games from this folder.

    python3 src/build.py

Writes, relative to the repository root:
  control-room/index.html   control room game (GitHub Pages)
  generation/index.html     generation game, installable app address
  index.html                generation game at the main address (no app manifest)
  build/control-room.html   standalone copies with the test hook window.__fc,
  build/generation.html     used by the tests in src/tests and for previews

Edit game.js, body.html and game.css, never the built pages: the build
overwrites them. The control room and generation games share all the code;
GAME ('cr' or 'fc') switches between them.
"""
import os,re
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(HERE)
rd=lambda f:open(os.path.join(HERE,f),encoding='utf-8').read()
def wr(rel,txt):
    p=os.path.join(ROOT,rel);os.makedirs(os.path.dirname(p),exist_ok=True);open(p,'w',encoding='utf-8').write(txt);print('built',rel,len(txt))
base=rd('base-head.html');body=rd('body.html');js=rd('game.js');css=rd('game.css');pwa=rd('pwa.html')
assert js.count("const GAME='cr';")==1

def standalone(game):
    title='Firm Capacity Control Room' if game=='cr' else 'Firm Capacity'
    head=base.replace('<title>Firm Capacity</title>',f'<title>{title}</title>',1)
    b=body if game=='cr' else body.replace('<span class="mode-tag">Control room</span>','<span class="mode-tag">Generation</span>').replace(
        'href="https://der-dash.github.io/Network/" target="_top">Generation game →</a>','href="https://der-dash.github.io/Network/control-room/" target="_top">Control room game →</a>').replace(
        "var GAME='cr';","var GAME='fc';").replace('<b id="clock">08:00</b>','<b id="clock">05:00</b>').replace('<b id="dClock">08:00</b>','<b id="dClock">05:00</b>')
    j=js.replace("const GAME='cr';",f"const GAME='{game}';")
    if 'charset' not in head[:300]: head='<meta charset="utf-8">\n'+head
    return head+css+'</style>\n\n'+b+'\n<script>\n'+j+'</script>\n'

META={
 'cr':dict(desc="Watts Up control-room game: switch, transfer and restore supply across Blackout Canyon's substations through faults, planned work and peak demand.",
   url='https://der-dash.github.io/Network/control-room/',title='Firm Capacity: Control Room',
   alt='Firm Capacity Control Room by Watts Up: a network diagram with interconnectors to Ampy Place and Watts This',
   manifest='/Network/control-room/manifest.webmanifest',apple='/Network/icons/cr-apple-180.png'),
 'fc':dict(desc="Watts Up control-room game: keep Blackout Canyon's transformers inside firm capacity through faults, storms and swings in generation.",
   url='https://der-dash.github.io/Network/',title='Firm Capacity: keep Blackout Canyon switched on',
   alt='Firm Capacity by Watts Up: three transformers, one faulted, the others at 112%',
   manifest='/Network/manifest.webmanifest',apple='/Network/icons/gen-apple-180.png')}

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
    s=standalone(game);wr(f'build/{name}.html',s)
    out=page(game,s)
    if game=='cr':wr('control-room/index.html',out)
    else:
        out=out.replace('/Network/manifest.webmanifest','/Network/generation/manifest.webmanifest');wr('generation/index.html',out)
        # The main address stays the generation game for existing links but isn't itself an app
        # (its scope would contain the control room's), so its install button goes to /generation/.
        root=re.sub(r'<link rel="manifest"[^>]*>\n','',out,count=1);assert 'rel="manifest"' not in root;wr('index.html',root)
