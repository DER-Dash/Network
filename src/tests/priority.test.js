// Priority customers: hospital, care homes and PSR customers on some 11 kV feeders (control room).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
const gen=fs.readFileSync(path.join(__dirname,'..','..','build','generation.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
function mk(src){return new JSDOM(src,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});}
async function start(src,scn){const d=mk(src),w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();return{w,doc,G,S:G.S};}
(async()=>{
 {const {doc,G,S}=await start(html,'quiet');S.sched.length=0;G.run(3);
  ok(doc.getElementById('pri_hw1')&&doc.getElementById('pri_js2')&&!doc.getElementById('pri_hw0'),'badges drawn on the tagged feeders only');
  ok(!doc.getElementById('pri_kc1'),'no Kilowatt Close badge without Kilowatt Close');
  // open two feeders of the same size: one with the hospital, one without, and compare the cost
  const p0=S.cust.pri,l0=(S.loss||[]).reduce((a,e)=>a+e.pts,0);
  G.op('lf:hw1','open');G.run(10);
  const hosp=(S.loss||[]).reduce((a,e)=>a+e.pts,0)-l0;
  ok(S.cust.pri-p0>=25*9&&S.cust.pmin.hw1>=9,`hospital adds 25 points a minute (${S.cust.pri-p0} over ${S.cust.pmin.hw1} min)`);
  ok(/off/.test(doc.getElementById('pri_hw1').getAttribute('class')),'hospital badge shows off supply');
  ok(S.log.some(x=>/Kings Hill Hospital is off supply/.test(x.text)),'alarm logged when the hospital goes off');
  G.select('as:load_hw');ok(/Priority customers/.test(doc.getElementById('inspBody').textContent)&&/Kings Hill Hospital/.test(doc.getElementById('inspBody').textContent),'substation panel lists the hospital');
  G.op('lf:hw1','close');G.run(2);ok(S.log.some(x=>/Kings Hill Hospital back on supply/.test(x.text)),'restore logged');
  ok(!/off/.test(doc.getElementById('pri_hw1').getAttribute('class')),'badge clears once restored');
  const l1=(S.loss||[]).reduce((a,e)=>a+e.pts,0);G.op('lf:hw2','open');G.run(10);const plain=(S.loss||[]).reduce((a,e)=>a+e.pts,0)-l1;G.op('lf:hw2','close');G.run(2);
  ok(hosp>plain*2,`hospital feeder costs far more to leave off (${Math.round(hosp)} vs ${Math.round(plain)})`);
  // mid-point split: hospital is on the second half, so opening the mid-point leaves it off
  G.select('none');
  let n=0;while(!S.ended&&n<800){G.run(1);n++;}
  const tr=[...doc.querySelectorAll('table.sum tr')].find(r=>/Priority customers off/.test(r.textContent));
  ok(tr&&/Kings Hill Hospital/.test(tr.textContent),'score table has a priority customers row');
  const lost=(S.loss||[]).reduce((a,e)=>a+e.pts,0),P=S.final.parts,ded=-(P.ens+P.risk+P.inc+P.trial+P.spend+P.prio);
  ok(Math.abs(lost-ded)<=6,`debrief still adds up (${lost.toFixed(0)} vs ${ded})`);}
 {const {doc,G,S}=await start(html,'mesh');G.run(2);ok(doc.getElementById('pri_kc1'),'Kilowatt Close PSR badge on the mesh shift');}
 {const {doc,G,S}=await start(gen,'may');G.run(2);ok(!doc.querySelector('.pri')&&S.cust.pri===0,'generation game has no priority customers');}
 ok(!errs.length,'no script errors '+errs.join(' | '));
 process.exit(fails?1:0);})();
