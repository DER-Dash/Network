// Generation shifts (generation/, src/gen): every day loads, runs to the end, and the demo bot can win it on most seeds.
// Run python3 src/build.py first.   node gen-shifts.test.js [seeds]
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../../build/generation-shifts.html'),'utf8');
const N=+process.argv[2]||12;let fails=0;const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}};
function open(q){const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://www.wattsupelectricity.co.uk/generation/'+(q||''),
  beforeParse(w){w.fetch=()=>Promise.reject(new Error('offline'));w.HTMLElement.prototype.getBoundingClientRect=()=>({width:900,height:500,top:0,left:0,right:900,bottom:500});
    Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 900;}});Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 500;}});w.confirm=()=>true;}});return dom.window;}
const res={};
for(const k of ['may','storm','jan','heat','ev']){res[k]=[];
  for(let s=1;s<=N;s++){const w=open('?seed='+(s*7919));const G=w.__gen;G.demo(k);const S0=G.S;
    ok(S0.faults.every((f,i)=>S0.faults.every((g,j)=>i===j||!(f.m<g.m+g.dur&&g.m<f.m+f.dur))),k+' faults overlap');
    ok(S0.faults.every(f=>!S0.planned.some(p=>f.m<p.end&&p.start<f.m+f.dur)),k+' fault during planned work');
    let guard=0;while(!G.S.ended&&guard++<2000){G.demoAct();G.step(1);}
    const S=G.S,tot=1080,fp=Math.round(S.min.firm/tot*100);ok(S.ended,k+' did not end');
    res[k].push({cov:S.min.cov,trips:S.trips||0,fp,over:!!S.over,score:G.score(),risk:S.min.risk,ov:S.min.over,spend:Math.round(Object.values(S.spend).reduce((a,v)=>a+v,0)),f:S.faults.length,al:Math.round(S.allow.solar)+'/'+Math.round(S.allow.wind)});
    w.close();}
  const r=res[k],avg=a=>Math.round(a.reduce((x,y)=>x+y,0)/a.length);
  console.log(k.padEnd(6),'firm% avg',avg(r.map(x=>x.fp)),'min',Math.min(...r.map(x=>x.fp)),'game overs',r.filter(x=>x.over).length,'score avg',avg(r.map(x=>x.score)),'spend avg',avg(r.map(x=>x.spend)));
  console.log('       ',r.map(x=>`${x.fp}%/${x.f}f/${x.trips}t/${x.cov}c/${x.al}`).join(' '));
  ok(r.filter(x=>x.over).length===0,k+': the demo bot lost a game');ok(avg(r.map(x=>x.fp))>=90,k+': the demo bot averages under 90% firm');}
// menu, career and results flow
{const w=open('');const d=w.document;ok(!d.getElementById('menu').hidden,'menu shows');ok(d.querySelectorAll('#days .day').length===5,'five days');
  ok(d.querySelector('#days .day[data-day="storm"]').disabled,'storm locked in a new career');
  const G=w.__gen;G.newGame('may','career');G.step(1100);ok(G.S.ended,'career shift ends');
  w.setTimeout(()=>{},0);}
// tutorial: every step can be completed by doing what it says, and it ends
{const w=open('');const G=w.__gen,d=w.document;G.newGame('may','tut');Object.assign(G.tut,{on:true,i:0,ok:0,shown:false});let g=0;
  while(G.tut.on&&g++<3000){G.tutTick();const i=G.tut.i;
    if(G.tut.shown&&!d.getElementById('coachNext').hidden){G.tutNext();continue;}
    if(G.tut.shown&&i===4){G.adjust('batt',-1);}
    if(G.tut.shown&&i===5&&!G.S.armed.solar){G.toggleArm('solar');}
    if(G.tut.shown&&i===7&&G.S.zone==='warn'){G.adjust('solar',-1);}
    if(!G.S.paused)G.step(1);}
  ok(!G.tut.on&&G.tut.i>=9,'tutorial completes ('+G.tut.i+' steps, '+g+' ticks)');ok(G.S.faults.length===0,'tutorial has no faults');}
// achievements and streak after a finished free play shift
{const w=open('');const G=w.__gen;G.demo('jan');G.S.demo=false;let g=0;while(!G.S.ended&&g++<2000){G.demoAct();G.step(1);}G.showResults();
  const c=G.career();ok(c.ach.first,'First shift awarded');ok(G.bumpStreak()===1,'streak starts at 1');
  const m=G.mergeCareer({stars:{may:1},ach:{first:1}},{stars:{may:3,heat:2},ach:{armed:1},errs:2});ok(m.stars.may===3&&m.stars.heat===2&&m.ach.first&&m.ach.armed&&m.errs===2,'career merge keeps the best of both');}
console.log(fails?fails+' failed':'gen-shifts ok');process.exit(fails?1:0);
