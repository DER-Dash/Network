// Fault Lines today's puzzle: same puzzle for everyone, level by weekday, one go a day that survives a reload,
// a result grid that doesn't give the answer away, and scores on the shared scoreboard (scoreboard/Code.gs, run in a mock).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');const {makeAppsScript}=require('./appscript-mock');
const HTML=fs.readFileSync(path.join(__dirname,'..','..','build','fault-lines.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const A=makeAppsScript();
async function load(store,host){
  const d=new JSDOM(HTML,{url:`https://${host||'www.wattsupelectricity.co.uk'}/fault-lines/`,runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.FL_FAST=true;
    w.matchMedia=()=>({matches:false,addEventListener(){}});w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
    Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));
    w.fetch=async(url,opt)=>{const body=opt&&opt.method==='POST'?A.post(JSON.parse(opt.body)):A.get(Object.fromEntries(new URL(url).searchParams));return{json:async()=>body};};}});
  await wait(30);return d.window;}
const dump=w=>Object.fromEntries(Object.keys(w.localStorage).map(k=>[k,w.localStorage.getItem(k)]));
const click=(w,sel)=>w.document.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
(async()=>{
 const w1=await load(),G=w1.__fl,today=G.todayUK();
 ok(G.mode==='daily'&&G.P.daily===today&&G.P.level===G.dailyLevel(today),`opens on today's puzzle (${today}, #${G.P.no}, ${G.P.level})`);
 ok(G.dailyLevel('2026-11-23')==='easy'&&G.dailyLevel('2026-11-24')==='easy'&&G.dailyLevel('2026-11-25')==='medium'&&G.dailyLevel('2026-11-26')==='medium'&&
   G.dailyLevel('2026-11-27')==='hard'&&G.dailyLevel('2026-11-29')==='hard','level by weekday: Mon-Tue Easy, Wed-Thu Medium, Fri-Sun Hard');
 ok(G.dayNo('2026-11-19')===1&&G.dayNo('2026-11-20')===2&&G.dayNo('2027-03-01')===103,'puzzle numbers count from 19 November 2026 (across the clock change)');
 const P1=G.P;
 {const w2=await load(),Q=w2.__fl.P;ok(Q.fault===P1.fault&&Q.par===P1.par&&Q.secs.map(x=>x.name).join()===P1.secs.map(x=>x.name).join()&&Q.calls.length===P1.calls.length,'everyone gets the same puzzle today');}
 // play part-way with the expert, then reload: it picks up where it left off
 {const s=G.st;let m,n=0;while(n++<3&&(m=G.nextMove(s)).declare==null)G.act(m.k,m.act);G.hint();
  const w3=await load(dump(w1)),H=w3.__fl;
  ok(H.mode==='daily'&&H.st.steps===s.steps&&H.st.moves===s.moves&&H.st.hints===1&&H.st.cml===s.cml&&H.st.log.length===s.log.length&&!H.st.ended,`a reload mid-puzzle resumes it (${s.moves})`);}
 // practice keeps its own puzzle, and switching back keeps today's moves
 {const mv=G.st.moves;click(w1,'[data-mode="practice"]');ok(G.mode==='practice'&&!G.P.daily,'Practice tab starts a random puzzle');const pf=G.P;
  click(w1,'[data-mode="daily"]');ok(G.mode==='daily'&&G.st.moves===mv,'back to today: moves kept');
  click(w1,'[data-mode="practice"]');ok(G.P===pf,'and practice kept its puzzle too');click(w1,'[data-mode="daily"]');}
 // finish it, with a trip on the way so the grid has a red square
 {const s=G.st;let m,n=0;while(n++<80&&(m=G.nextMove(s)).declare==null)G.act(m.k,m.act);
  const before=s.moves;G.declare(m.declare);const doc=w1.document;
  ok(s.ended&&s.result.correct&&!doc.getElementById('endOv').hidden,'declaring ends today\'s puzzle');
  const grid=doc.querySelector('.grid').textContent;ok(grid.replace(/\n/g,'')===G.gridRows(s).join('')&&/✅$/.test(grid),'end card shows the result grid ending in ✅');
  const t=G.shareText();console.log('   '+t.replace(/\n/g,'\n   '));
  ok(t.startsWith(`Fault Lines #${G.P.no} · `)&&/wattsupelectricity\.co\.uk\/fault-lines\/$/.test(t)&&!G.P.secs.some(x=>t.includes(x.name))&&!t.includes(G.P.primary),'share text: number, level, grid, steps and link, and no section names');
  ok([...before].length+1===[...G.gridRows(s).join('')].length-(s.moves.length-before.length),'one square per operation and hint, plus the declaration');
  ok(G.act('cb','close')===null,'no more moves once declared');
  click(w1,'#shareBtn');await wait(10);ok(doc.getElementById('shareTxt')&&doc.getElementById('shareTxt').value===t,'share falls back to text to copy when the phone can\'t share');
  await wait(10);ok(/No scores yet today/.test(doc.getElementById('board').textContent),'board loads: empty to start with');
  doc.getElementById('pName').value='Sparky';click(w1,'#submitBtn');await wait(20);
  ok(/#1 of 1/.test(doc.getElementById('subMsg').textContent)&&/Sparky/.test(doc.getElementById('board').textContent)&&!!doc.querySelector('.board-t tr.me'),'score added: #1 of 1, highlighted on the board');
  const row=A.sheets['Fault Lines scores'].rows[1];ok(row[3]===s.result.pts&&row[4]===s.result.grade&&row[15]===s.moves,`the scoreboard recalculates the same score (${row[3]}, ${row[4]})`);}
 // reload after finishing: opens on practice, today's tab says done, and tapping it shows the same result
 {const w4=await load(dump(w1)),H=w4.__fl;
  ok(H.mode==='practice'&&/done ✓/.test(w4.document.getElementById('dailyTag').textContent),'next visit today opens practice, with today marked done');
  click(w4,'[data-mode="daily"]');ok(H.st.ended&&H.st.result.pts===G.st.result.pts&&!w4.document.getElementById('endOv').hidden&&/Submitted as Sparky/.test(w4.document.getElementById('endBody').textContent),'today\'s tab shows the finished result and the submission');
  ok(w4.localStorage.getItem('fl-played')===w1.localStorage.getItem('fl-played'),'a replayed finish isn\'t counted twice');}
 // streak
 {const y=new Date(Date.parse(today+'T00:00Z')-864e5).toISOString().slice(0,10),st0={'fl-streak':JSON.stringify({last:y,n:3,best:5})};
  const w5=await load(st0),H=w5.__fl;let m,n=0;while(n++<80&&(m=H.nextMove(H.st)).declare==null)H.act(m.k,m.act);H.declare(m.declare);
  const k=JSON.parse(w5.localStorage.getItem('fl-streak'));ok(k.n===4&&k.best===5&&k.last===today,'streak carries on from yesterday');}
 // the page's grid: a trip shows red
 {const w6=await load(),H=w6.__fl;H.act('cb','close');ok(H.st.moves==='t'&&H.gridRows({...H.st,result:{correct:false}})[0]==='🟥⬛','closing onto the fault is a red square; a wrong declaration black');}
 // the scoreboard's checks
 {const mode='fl-daily-'+today,lv=G.dailyLevel(today),base={game:'fl',site:'www.wattsupelectricity.co.uk',name:'Volt',day:lv,mode,steps:6,par:G.P.par,trips:1,nbTrips:0,hints:0,cml:5000,correct:true,iso:true,healthyOff:0,moves:'ohtohh'};
  let r=A.post(base);ok(r.ok&&r.rank>=1&&r.total===2,'a second player is added');
  const s1=r.score;r=A.post({...base,moves:'ohhohh',trips:0});ok(r.ok&&r.score===s1&&r.repeat,'one go a day: a second score from the same name doesn\'t replace the first');
  ok(!A.post({...base,name:'Amp',day:lv==='easy'?'hard':'easy'}).ok,'wrong level for the day refused');
  ok(!A.post({...base,name:'Amp',trips:0}).ok,'trips that don\'t match the grid refused');
  ok(!A.post({...base,name:'Amp',par:G.P.par+3}).ok,'a par that disagrees with today\'s refused');
  ok(!A.post({...base,name:'Amp',steps:30}).ok,'more steps than the moves allow refused');
  ok(!A.post({...base,name:'Amp',mode:'fl-daily-2020-01-01',day:G.dailyLevel('2020-01-01')}).ok,'an old day refused');
  ok(A.post({...base,site:'copy.example'}).error==='site','copies of the game on other sites refused');
  const b=A.get({game:'fl',mode});ok(b.ok&&b.version>=22&&b.scores.length===2&&b.scores[0].score>=b.scores[1].score,'board lists each player once, best first');
  ok(A.get({day:'may',mode:'free'}).ok&&A.post({game:'cr',site:'www.wattsupelectricity.co.uk',name:'Volt',day:'quiet',mode:'cr-free',result:'lost',survived:10,spend:0,faults:0,risk:0,grade:'Lost',ens:0,incidents:0}).ok,'Losing Control scores still work');}
 // a copy of the page elsewhere can still play, but the board says so
 {const w7=await load({},'copy.example'),H=w7.__fl;let m,n=0;while(n++<80&&(m=H.nextMove(H.st)).declare==null)H.act(m.k,m.act);H.declare(m.declare);
  w7.document.getElementById('pName').value='Copycat';click(w7,'#submitBtn');await wait(20);ok(/original game/.test(w7.document.getElementById('subMsg').textContent),'copies elsewhere: score not saved, and it says why');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
