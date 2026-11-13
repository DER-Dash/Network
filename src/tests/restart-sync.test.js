// A restarted career follows you between devices: restart on one, finish a shift, load on another and carry on.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');const {makeAppsScript}=require('./appscript-mock');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const AS=makeAppsScript();
const fakeFetch=async(url,opt)=>{await wait(5);if(!opt||opt.method!=='POST')return{json:async()=>({ok:true,scores:[]})};const d=JSON.parse(opt.body);d.site='der-dash.github.io';const j=AS.post(d);return{json:async()=>j};};
function device(store){return new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.fetch=fakeFetch;w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
const $=(d,id)=>d.window.document.getElementById(id),click=(d,el)=>el.dispatchEvent(new d.window.MouseEvent('click',{bubbles:true}));
const car=d=>JSON.parse(d.window.localStorage.getItem('fc4-career')||'{}');
const ALL=['quiet','grid','storm','heat','jan','ev','snow','xmas','morning','gsp','mesh','comms','endure','black'],full={stars:Object.fromEntries(ALL.map(k=>[k,2])),ach:{first:1},best:{}};
const careerMode=async d=>{await wait(40);click(d,d.window.document.querySelector('[data-mode="career"]'));await wait(20);};
const link=async(d,tab)=>{click(d,d.window.document.querySelector(`[data-sytab="${tab}"]`));await wait(5);$(d,'syName').value='Steve B';$(d,'syPin').value='1234';click(d,$(d,'syncBtn'));await wait(120);};
(async()=>{
 // device A: complete career, saved online
 const A=device({'fc4-career':JSON.stringify(full)});await careerMode(A);await link(A,'save');
 ok(AS.sheets.Careers&&AS.sheets.Careers.rows.length===2,'career saved online');
 // restart from shift 1 and finish it
 click(A,A.window.document.querySelector('.hero-go[data-restart]')||$(A,'restartBtn'));await wait(60);
 const G=A.window.__fc;ok(G.S.key==='quiet','device A restarted at shift 1');G.S.sched.length=0;let t=0;while(!G.S.ended&&t++<2000)G.run(5);await wait(150);
 ok(car(A).run&&car(A).run.at==='grid','device A now on shift 2');
 const saved=JSON.parse(AS.sheets.Careers.rows[1][3]);ok(saved.run&&saved.run.at==='grid'&&saved.run.stars.quiet>=1,'online career has the restarted run on shift 2');
 // device B: completed career from before, loads Steve B
 const B=device({'fc4-career':JSON.stringify(full)});await careerMode(B);await link(B,'load');
 ok(car(B).run&&car(B).run.at==='grid','device B picks up the restart on shift 2');
 const mb=B.window.document.querySelector('.hero-go[data-go="career"]');ok(mb&&/Shift 2/.test(mb.textContent)&&/restarted/i.test(mb.textContent),'device B main button: '+(mb&&mb.textContent));
 // device B restarts from shift 5: newer, so it wins on A too
 const sel=$(B,'restartFrom');sel.value='jan';click(B,$(B,'restartBtn'));await wait(150);
 ok(JSON.parse(AS.sheets.Careers.rows[1][3]).run.at==='jan','newer restart on device B saved online');
 // device A syncs (as it does on the next page load)
 const A2=device({'fc4-career':A.window.localStorage.getItem('fc4-career'),'fc-sync':A.window.localStorage.getItem('fc-sync')});await wait(250);
 ok(car(A2).run&&car(A2).run.at==='jan','device A follows the newer restart after syncing');
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
