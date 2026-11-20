// Losing Control: the "Your network" generation shift built from Gatekeeper's export (localStorage 'gk-export').
// Run python3 src/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const gen=fs.readFileSync(path.join(__dirname,'../../build/generation.html'),'utf8'),cr=fs.readFileSync(path.join(__dirname,'../../build/control-room.html'),'utf8');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
let n=0;
function boot(html,X,hash){const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:`https://lc${++n}.test/control-room/${hash||''}`,
  beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};if(X)w.localStorage.setItem('gk-export',JSON.stringify(X));w.localStorage.setItem('fcg-played','1');w.localStorage.setItem('fc4-played','1');
    }});return dom.window;}
const X={v:1,at:Date.now(),year:6,grade:'B',mode:'free',kD:1.2,E:.2,gspF:150,sgt:false,dsr:{mw:12,names:['Byte Me Data Centre','Charge Ahead Hub'],n:2},batt:{mw:18,names:['Volt Vault'],n:1},solar:{mw:20,names:['Photon Farm'],n:1},flexBuy:0};
(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));
  {const w=boot(gen,null),d=w.document;ok(!d.querySelector('[data-go="gk"]'),'no Gatekeeper button without an export');
   await wait(30);const before=JSON.stringify(w.__fc.S.sc.demand);ok(!!before,'normal shifts unchanged');}
  {const w=boot(gen,X),d=w.document;await wait(30);const F=w.__fc;
   const b=d.querySelector('[data-go="gk"]');ok(b&&/year 6/.test(b.textContent),'generation start screen offers your Gatekeeper network');
   b.click();const S=F.S;
   ok(S.key==='gk'&&S.sc.title==='Your network'&&S.running,'it starts the Your network shift');
   ok(Math.abs(Math.max(...S.sc.demand.map(x=>x[1]))-150*1.2)<1,'winter peak scaled by how loaded the grid supply point is ('+Math.max(...S.sc.demand.map(x=>x[1]))+' MW)');
   ok(/Byte Me Data Centre and 1 more/.test(S.sc.blurb)&&/18 MW of battery/.test(S.sc.blurb),'the blurb lists the flexibility you connected');
   F.run(600);ok(S.act.bdis<=18.001&&S.act.dsr<=12.001,'battery and demand response limited to what you connected');
   F.run(2000);ok(S.ended,'the shift runs to the end');
   ok(d.querySelector('.gk-end')&&!d.getElementById('pName'),'end screen: back to Gatekeeper, no scoreboard entry');}
  {const X0={...X,dsr:{mw:0,names:[],n:0},batt:{mw:0,names:[],n:0},solar:{mw:0,names:[],n:0},kD:.9};
   const w=boot(gen,X0,'#gk');await wait(30);const S=w.__fc.S;ok(S.key==='gk','#gk opens straight on your network');
   w.document.getElementById('startBtn').click();w.__fc.run(900);ok(S.act.bdis===0&&S.act.bchg===0&&S.act.dsr===0,'no flexible customers: no battery or demand response to call');
   ok(/none, so it/.test(S.sc.blurb),'blurb says there is no flexibility');}
  {const w=boot(gen,{...X,E:.8});await wait(30);w.document.querySelector('[data-go="gk"]').click();
   ok(w.__fc.S.sc.focus==='Your network on a sunny day'&&w.__fc.S.sc.solar.peak===172,'export-heavy networks get a sunny day');}
  {const w=boot(cr,X);await wait(30);const a=w.document.querySelector('a.gk-go');ok(a&&/mode=gen#gk/.test(a.getAttribute('href')),'control room start screen links across to it');}
  {const w=boot(gen,X),d=w.document;await wait(30);d.querySelector('[data-go="gk"]').click();w.__fc.run(100);
   d.getElementById('startBtn')||0;const b=d.querySelector('[data-scn="jan"]');
   w.eval("void 0");}
  console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0);})();
