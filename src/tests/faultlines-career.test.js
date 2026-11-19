// Fault Lines career: 30 teaching puzzles that the expert solves at par for three stars, unlocking one by one, ranks,
// and the auto-recloser. Also guards the puzzle generator: daily puzzles must never change once published.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path'),crypto=require('crypto');
const HTML=fs.readFileSync(path.join(__dirname,'..','..','build','fault-lines.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
async function load(store){const w=new JSDOM(HTML,{url:'https://www.wattsupelectricity.co.uk/fault-lines/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);w.fetch=async()=>({json:async()=>({ok:true,version:22,scores:[]})});
  w.localStorage.setItem('fl-seen','1');Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}}).window;await wait(30);return w;}
const solve=G=>{let m,n=0;while(n++<80&&(m=G.nextMove(G.st)).declare==null)G.act(m.k,m.act);G.declare(m.declare);return G.st.result;};
const click=(w,sel)=>w.document.querySelector(sel).dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
(async()=>{
 // daily puzzles never change: the same fingerprint as when the daily puzzle launched (19 November 2026)
 {const w=await load(),G=w.__fl,o=[];for(const lv of ['easy','medium','hard'])for(let k=0;k<200;k++){G.newPuzzle(lv,k*7919);const P=G.P;o.push(JSON.stringify({s:P.secs,w:P.sw,p:P.sp,f:P.fault,d:P.dist,c:P.calls,par:P.par,pr:P.prot,n:[P.primary,P.feeder,P.neighbour]}));}
  ok(crypto.createHash('sha1').update(o.join('|')).digest('hex')==='8041ca2a6910d2c6c3504197312c18381e8e7b59','puzzle generator unchanged: published daily puzzles stay the same');}
 const w=await load(),G=w.__fl,doc=w.document,C=G.CAREER;
 ok(C.length===30&&new Set(C.map(c=>c.id)).size===30&&C.every(c=>c.title&&c.brief.length>60),'30 career puzzles, unique ids, each with a lesson');
 // the Career tab starts puzzle 1 with its lesson; the rest are locked
 click(w,'[data-mode="career"]');ok(G.mode==='career'&&G.P.career===0&&!doc.getElementById('carOv').hidden&&/Trial close/.test(doc.getElementById('carCard').textContent),'Career tab opens puzzle 1 with its briefing');
 click(w,'[data-carclose]');ok(doc.getElementById('carOv').hidden,'Start closes the briefing');
 G.startCareer(1);ok(G.P.career===0,'puzzle 2 is locked until puzzle 1 is passed');
 click(w,'#newBtn');ok(doc.querySelectorAll('.car-item').length===30&&doc.querySelectorAll('.car-item:disabled').length===29,'Puzzles list: 30, all but the first locked');click(w,'[data-carclose]');
 // a wrong answer: no stars, nothing unlocked
 G.declare((G.P.fault+1)%G.P.N);ok(G.st.result.car.stars===0&&/Try again/.test(doc.getElementById('endNext').textContent),'wrong section: no stars, Try again');
 click(w,'#endNext');ok(G.P.career===0&&!G.st.ended,'Try again restarts it');
 // hints cost the third star
 G.hint();ok(solve(G).car.stars===2,'solved with a hint: two stars');
 click(w,'#endNext');ok(G.P.career===1&&!doc.getElementById('carOv').hidden,'Next puzzle opens puzzle 2 with its briefing');click(w,'[data-carclose]');
 // every puzzle: the expert finds, isolates and restores at par, for three stars, and the next unlocks
 let all=true,promos=[];for(let i=1;i<30;i++){G.startCareer(i);const P=G.P,r=solve(G);if(P.career!==i||!(r.correct&&r.iso&&!r.healthyOff&&G.st.steps===P.par&&r.car.stars===3)){all=false;console.log('   puzzle',i+1,'failed',P.career,r);}
  if(r.car.promo)promos.push(r.car.promo);}
 ok(all,'expert gets three stars on all 30 at par');
 ok(promos.join()==='Assistant Control Engineer,Control Engineer,Authorised Control Engineer,Senior Control Engineer','promoted through every rank');
 {const sv=JSON.parse(w.localStorage.getItem('fl-career')).s;ok(sv.c1===2&&sv.c2===3&&sv.c30===3,'stars saved per puzzle');
  G.startCareer(0);G.hint();solve(G);ok(JSON.parse(w.localStorage.getItem('fl-career')).s.c1===2,'a worse go never lowers your best');
  G.startCareer(0);solve(G);ok(JSON.parse(w.localStorage.getItem('fl-career')).s.c1===3,'a better go raises it');}
 {const w2=await load({'fl-career':w.localStorage.getItem('fl-career')});click(w2,'[data-mode="career"]');
  ok(/Senior Control Engineer · 90★/.test(w2.document.getElementById('carTag').textContent),'progress kept on the next visit: '+w2.document.getElementById('carTag').textContent);}
 // auto-reclosers
 {G.startCareer(18);const P=G.P,s=G.st;ok(P.lock===2&&s.cb&&!s.sw[2]&&G.fedA(s).has(0)&&G.fedA(s).has(2)&&!G.fedA(s).has(3),'recloser locked out: breaker held, sections before it still on');
  ok(G.candidates(s).every(f=>f>2),'the fault is known to be beyond the recloser');
  ok(doc.querySelectorAll('text.ar').length===1&&!doc.getElementById('legAr').hidden,'recloser drawn as AR, with a legend');
  G.act('2','close');ok(!s.sw[2]&&s.cb&&s.trips===1&&G.fedA(s).has(1),'closing the recloser onto the fault trips the recloser, not the breaker');
  G.act('3','open');G.act('2','close');const c=G.candidates(s);ok(s.sw[2]&&G.fedA(s).has(3)&&c.every(f=>f>3),'with the next switch open it holds: fault further out');}
 {G.startCareer(23);const P=G.P,s=G.st;ok(P.lock===null&&!s.cb&&G.candidates(s).every(f=>f<=4)&&/didn't operate/.test(P.prot),'breaker locked out and the recloser didn\'t operate: fault before the recloser');}
 {let good=0;for(let k=0;k<200;k++){const lv=['medium','hard'][k%2];G.custom(lv,9000+k,{rec:k%3?[1+k%4]:[1,5],L:{n:lv==='medium'?7:9}});const P=G.P,r=solve(G);if(r.correct&&r.iso&&!r.healthyOff&&G.st.steps===P.par)good++;}
  ok(good===200,`random feeders with reclosers: the expert solves every one at par (${good}/200)`);}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
