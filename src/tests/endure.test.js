// Storm endurance: an 18-hour control room shift (06:00 to 24:00).
const {JSDOM}=require('jsdom');const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{if(!c){fails++;console.log('FAIL',m);}else console.log('ok',m);};
function mk(){return new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function open(md){const d=mk(),w=d.window,doc=w.document;await wait(30);doc.querySelector(`[data-mode="${md||'free'}"]`).click();return{w,doc,G:w.__fc};}
(async()=>{
 {const {doc,G}=await open('free');doc.querySelector('[data-scn="endure"]').click();
  ok(doc.getElementById('startBtn').textContent==='Start shift at 06:00','start button shows 06:00');
  ok(/06:00–24:00, about 12 minutes/.test(doc.getElementById('runTxt').textContent),'run text: '+doc.getElementById('runTxt').textContent);
  doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}
  const S=G.S;ok(S.key==='endure'&&S.t===360,'shift starts at 06:00');
  ok(S.risk.filter(r=>r.label==='Severe gale').length===3,'three severe gale bands');
  ok(S.risk.every(r=>r.end<=1440),'weather inside the shift');
  ok(S.sched.every(f=>f.m>=380&&f.m<1440),'faults inside the shift ('+S.sched.length+')');
  // a quiet run: no faults, so we can check the clock reaches midnight
  S.sched.length=0;let n=0;while(!S.ended&&n<1200){G.run(1);n++;}
  ok(S.ended&&!S.lost,'shift ends at midnight, not lost');ok(S.final.surv===1080,'1,080 minutes on supply: '+S.final.surv);
  ok(['A','B','C','D'].includes(S.final.grade),'graded '+S.final.grade);
  ok(!/NaN/.test(doc.getElementById('sheet').innerHTML),'end sheet has no NaN');}
 // switching back to a 12-hour shift restores 08:00–20:00
 {const {doc,G}=await open('free');doc.querySelector('[data-scn="endure"]').click();doc.querySelector('[data-scn="storm"]').click();
  ok(doc.getElementById('startBtn').textContent==='Start shift at 08:00','back to 08:00 on Storm day');doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}ok(G.S.t===480,'Storm day starts at 08:00');}
 // career: it's the last shift and locked to begin with
 {const {doc}=await open('career');const b=doc.querySelector('[data-scn="endure"]');ok(b&&b.disabled,'locked in a new career');ok(/Shift 12/.test(b.textContent),'career shift 12');}
 ok(!errs.length,'no script errors '+errs.slice(0,3).join(' | '));
 console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);})();
