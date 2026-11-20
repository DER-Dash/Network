// Gatekeeper online: scoreboard (Code.gs version 23 'gk'), saving a game under a name and PIN, the week's canyon,
// the first-year tutorial and the hand-off to Losing Control. Run python3 src/gatekeeper/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom'),{makeAppsScript}=require('./appscript-mock');
const html=fs.readFileSync(path.join(__dirname,'../../build/gatekeeper.html'),'utf8');
let fails=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
const A=makeAppsScript(),SITE='www.wattsupelectricity.co.uk';
let n=0;
function boot(host,store){const dom=new JSDOM(html,{runScripts:'dangerously',url:`https://${host||SITE}/gatekeeper/`,pretendToBeVisual:true,
  beforeParse(w){w.__GK_FAST=true;w.fetch=async(url,opt)=>{const body=opt&&opt.method==='POST'?A.post(JSON.parse(opt.body)):A.get(Object.fromEntries(new URL(url).searchParams));return{json:async()=>body};};
    if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});return dom.window;}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function playCareer(G){for(let y=1;y<=10;y++){G.S.queue.forEach(a=>{const L=G.offers(a).list;a.choice=(L.find(x=>x.type==='firm'&&x.avail&&x.cls==='green')||L.find(x=>x.type==='flex'&&x.avail)||{type:'hold'}).type;});G.sendOffers();G.runYear();if(y<10)G.startYear();}}
(async()=>{
  // ---- Code.gs: scores ----
  const yrs=Array.from({length:10},(_,i)=>({conn:80,sec:90,curt:100,cost:100,reg:i<5?100:70}));
  let r=A.post({game:'gk',site:SITE,name:'Volt',mode:'gk-free',seed:123,years:yrs});
  ok(r.ok&&r.score===Math.round(yrs.reduce((t,y)=>t+(y.conn+y.sec+y.curt+y.cost+y.reg)/5,0)*10)&&r.rank===1,'career score worked out by the scoreboard');
  ok(r.grade==='A'&&r.stars===30,'grades and stars from the yearly report cards');
  ok(!A.post({game:'gk',site:SITE,name:'Volt',mode:'gk-free',seed:1,years:yrs.slice(0,9)}).ok,'nine years refused');
  ok(!A.post({game:'gk',site:SITE,name:'Volt',mode:'gk-free',seed:1,years:yrs.map(y=>({...y,sec:140}))}).ok,'a score over 100 refused');
  const today=new Date(),wd=(today.getUTCDay()+6)%7,mon=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-wd)).toISOString().slice(0,10);
  const w0=boot('gk-a.test'),G0=w0.__gk;await wait(50);
  ok(!A.post({game:'gk',site:SITE,name:'Amp',mode:'gk-week-'+mon,seed:999,years:yrs}).ok,"the week's canyon with the wrong seed refused");
  ok(A.post({game:'gk',site:SITE,name:'Amp',mode:'gk-week-'+mon,seed:G0.weekSeed(mon),years:yrs}).ok,"the week's canyon with its seed accepted (the game and scoreboard agree on the seed)");
  ok(!A.post({game:'gk',site:SITE,name:'Amp',mode:'gk-week-2020-01-06',seed:G0.weekSeed('2020-01-06'),years:yrs}).ok,'an old week refused');
  ok(A.post({game:'gk',site:'copy.example',name:'Amp',mode:'gk-free',seed:1,years:yrs}).error==='site','copies on other sites refused');
  A.post({game:'gk',site:SITE,name:'volt',mode:'gk-free',seed:5,years:yrs.map(y=>({...y,conn:20}))});
  let b=A.get({game:'gk',mode:'gk-free'});ok(b.ok&&b.version===23&&b.scores.length===1&&b.scores[0].name==='Volt','board: each player once, their best career');
  ok(A.get({day:'may',mode:'free'}).ok&&A.get({game:'fl',mode:'fl-daily-'+mon}).ok,'Losing Control and Fault Lines boards still work');
  // ---- the game: week's canyon by default, play a career, submit ----
  const w=boot(),d=w.document,G=w.__gk;await wait(80);
  ok(G.S.mode==='week'&&G.S.week===G.mondayOf(G.S.week)&&G.S.seed===G.weekSeed(G.S.week),"a first visit starts the week's canyon");
  const w2=boot('gk-b.test'),G2=w2.__gk;await wait(50);
  ok(JSON.stringify(G2.S.queue.map(a=>[a.kind,a.mw,a.prim]))===JSON.stringify(G.S.queue.map(a=>[a.kind,a.mw,a.prim])),"everyone gets the same applications in the week's canyon");
  d.getElementById('hGo').click();
  ok(!d.getElementById('coach').hidden&&/applications/.test(d.getElementById('coach').textContent),'tutorial starts on the queue');
  d.querySelector('.app').click();ok(G.tutI===1&&!d.getElementById('coach').hidden,'tutorial: opening an application moves it on');
  d.querySelector('.off:not([disabled])').click();ok(G.tutI>=2,'tutorial: making an offer moves it on');
  G.S.queue.forEach(a=>{if(!a.choice)a.choice='hold';});G.render();
  while(G.tutI<4&&d.getElementById('tOk')){d.getElementById('tOk').click();}
  if(G.tutI===2){G.S.queue.find(a=>a.choice).choice='flex';G.render();}
  d.getElementById('goBtn').click();ok(G.S.phase==='plan','offers sent');
  d.getElementById('rOk').click();d.getElementById('goBtn').click();await wait(150);d.getElementById('pSkip').click();
  ok(!!d.querySelector('.res'),'report shows');
  // ---- Losing Control hand-off ----
  const lc=d.getElementById('repLC');ok(lc&&/control-room/.test(lc.getAttribute('href')),'report links to Losing Control');
  lc.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  const X=JSON.parse(w.localStorage.getItem('gk-export')||'null');
  ok(X&&X.v===1&&X.year===1&&X.kD>0.8&&X.kD<1.5&&X.E>=0&&X.dsr&&X.batt&&X.solar,'network exported for Losing Control: '+JSON.stringify(X&&{kD:X.kD,E:X.E,dsr:X.dsr.mw,batt:X.batt.mw,solar:X.solar.mw}));
  const bs=G.gspPeaks(G.baseState());ok(bs.D>.5&&bs.D<1&&bs.E>=0,'baseline grid supply point loading '+bs.D.toFixed(2)+'/'+bs.E.toFixed(2));
  d.getElementById('repGo').click();
  // ---- saving online ----
  G.showMenu();d.getElementById('syName').value='Sparky';d.getElementById('syPin').value='1234';d.getElementById('syGo').click();await wait(50);
  ok(JSON.parse(w.localStorage.getItem('fc-sync')).name==='Sparky','saved online: the link is shared with Losing Control');
  const row=A.sheets.Careers.rows.find(r=>r[0]==='Sparky');ok(row&&row[7]&&JSON.parse(row[7]).save.length>1000&&row[3]==='','game saved in the Gatekeeper column, Losing Control columns untouched');
  const len=JSON.parse(row[7]).save.length;
  // another device loads it
  const w3=boot('wattsupelectricity.co.uk'),d3=w3.document,G3=w3.__gk;await wait(50);
  G3.showMenu();d3.querySelector('[data-sy="load"]').click();d3.getElementById('syName').value='sparky';d3.getElementById('syPin').value='1234';d3.getElementById('syGo').click();await wait(50);
  ok(G3.S.year===2&&G3.S.seed===G.S.seed,'another device loads the game');
  G3.showMenu();d3.querySelector('[data-sy="save"]');
  // wrong PIN
  const w4=boot('der-dash.github.io'),G4=w4.__gk;await wait(50);
  const r4=await G4.syncGame('Sparky','9999','load');ok(!r4.ok&&r4.error==='pin','wrong PIN refused');
  // Losing Control careers still sync on the same row
  const lcr=A.post({type:'career',game:'cr',site:SITE,name:'Sparky',pin:'1234',career:{stars:{quiet:2},ach:{}}});
  ok(lcr.ok&&lcr.career.stars.quiet===2&&JSON.parse(A.sheets.Careers.rows.find(r=>r[0]==='Sparky')[7]).save.length===len,'Losing Control career saves on the same row without touching Gatekeeper');
  // a full career: size of the save and submitting
  const w5=boot(),d5=w5.document,G5=w5.__gk;await wait(50);G5.newCareer(77);playCareer(G5);
  const sz=G5.saveData().length;ok(sz<45000,'a ten-year save fits a spreadsheet cell: '+sz+' characters');
  G5.render();d5.getElementById('goBtn').click();
  ok(d5.getElementById('pName')&&d5.getElementById('eLC'),'the end screen has the scoreboard and Losing Control');
  d5.getElementById('pName').value='Ohmer';d5.getElementById('subBtn').click();await wait(50);
  ok(/Submitted/.test(d5.getElementById('subMsg').textContent),'career submitted: '+d5.getElementById('subMsg').textContent);
  const brd=A.get({game:'gk',mode:'gk-free'});ok(brd.scores.some(x=>x.name==='Ohmer'&&x.score===G5.careerScore()),'the board shows the same score as the game');
  await G5.showBoard('gk-free');await wait(30);ok(d5.querySelectorAll('.board-t tr').length>=3,'scoreboard renders in the game');
  // the preview (not on the site): no crash, a clear message
  const w6=boot('claude.example'),G6=w6.__gk;await wait(50);w6.fetch=async()=>{throw new Error('blocked');};
  await G6.showBoard('gk-free');await wait(20);ok(/wattsupelectricity/.test(w6.document.getElementById('boardBody').textContent),'off the site, the scoreboard says where it works');
  console.log(fails?`${fails} FAILED`:'all passed');process.exitCode=fails?1:0;
})();
