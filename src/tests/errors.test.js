// Switching errors: a second in a shift ends it; in a career the third brings a warning letter, the fourth gets you
// sacked and wipes the career (with a newer generation so other devices follow).
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');const {makeAppsScript}=require('./appscript-mock');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
function mk(store,fetch){return new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};
  if(fetch)w.fetch=fetch;w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);Object.entries(store||{}).forEach(([k,v])=>w.localStorage.setItem(k,v));}});}
async function start(d,scn,md){const w=d.window,doc=w.document;await wait(30);doc.querySelector(`[data-mode="${md}"]`).click();const b=doc.querySelector(`[data-scn="${scn}"]`);if(b&&!b.disabled)b.click();
  doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}const G=w.__fc;G.S.sched.length=0;G.run(3);return G;}
// a switching incident: close the Watts This tie while Joule Street is still on Blackout Canyon (different grid supply)
const oops=G=>{const S=G.S;S.crews[0].at='tie:js';S.crews[0].x=S.crews[0].x;G.op('tie:js','close');let t=0;while(!S.tie.js.closed&&S.incidents===S._i&&t++<60&&!S.ended)G.run(1);};
// put Joule Street back on Blackout Canyon with the tie open, then close the tie out of phase
const reset=G=>{const S=G.S,f=S.fd.js;const go=(k,a,done)=>{if(done())return;G.op(k,a);let t=0;while(!done()&&t++<60&&!S.ended)G.run(1);};
  go('tie:js','open',()=>!S.tie.js.closed);go('bc:js','close',()=>f.brk);go('in:js','close',()=>f.inc);G.run(1);};
const inc=G=>{const S=G.S;reset(G);S._i=S.incidents;oops(G);G.run(2);};
const car=d=>JSON.parse(d.window.localStorage.getItem('fc4-career')||'{}');
(async()=>{
 // free play: one incident is allowed, the second ends the shift
 {const d=mk({});const G=await start(d,'quiet','free'),S=G.S;inc(G);ok(S.incidents===1&&!S.ended,'first incident: shift carries on');
  inc(G);ok(S.incidents===2&&S.ended&&S.lost&&S.lost.kind==='inc','second incident ends the shift');
  ok(/Stood down/.test(d.window.document.getElementById('sheet').textContent),'end screen says stood down');}
 // career: errors add up; the third shows the warning letter
 {const AS=makeAppsScript();const ff=async(u,o)=>{await wait(3);if(!o||o.method!=='POST')return{json:async()=>({ok:true,scores:[]})};const q=JSON.parse(o.body);q.site='der-dash.github.io';return{json:async()=>AS.post(q)};};
  const base={stars:{quiet:3,grid:2,storm:1},ach:{first:1},best:{},errs:2,errLog:[{k:'grid',m:600,t:'Closed the tie out of phase'},{k:'storm',m:700,t:'Closed onto a fault'}]};
  AS.post({type:'career',game:'cr',site:'der-dash.github.io',name:'Steve B',pin:'1234',career:base});
  const d=mk({'fc4-career':JSON.stringify(base),'fc-sync':JSON.stringify({name:'Steve B',pin:'1234',at:1})},ff),doc=d.window.document;await wait(80);
  const G=await start(d,'quiet','career'),S=G.S;inc(G);await wait(60);
  const L=doc.getElementById('letter');ok(car(d).errs===3&&L&&!L.hidden&&/Final written warning/.test(L.textContent),'third career error: warning letter shown');
  ok(/Watts\s*Up/.test(L.textContent)&&/Rhea Sistor/.test(L.textContent)&&/Closed the tie out of phase/.test(L.textContent),'letter has letterhead, signature and the errors');
  ok(S.paused,'game paused under the letter');doc.querySelector('[data-letter-ok]').click();ok(L.hidden&&!S.paused,'I understand closes it and carries on');
  // fourth error: sacked, career wiped with a new generation
  inc(G);await wait(120);const c=car(d);ok(S.ended&&S.lost&&S.lost.kind==='sacked','fourth career error: sacked and the shift ends');
  ok(!Object.keys(c.stars).length&&!Object.keys(c.ach).length&&c.errs===0&&c.gen===1,'career wiped: '+JSON.stringify(c));
  ok(!L.hidden&&/Notice of dismissal/.test(L.textContent),'dismissal letter shown');
  const sv=JSON.parse(AS.sheets.Careers.rows[1][3]);ok(sv.gen===1&&!Object.keys(sv.stars).length,'online career wiped too');
  // another device with the old career loads and follows the wipe
  const d2=mk({'fc4-career':JSON.stringify(base),'fc-sync':JSON.stringify({name:'Steve B',pin:'1234',at:1})},ff);await wait(250);const c2=car(d2);
  ok(c2.gen===1&&!Object.keys(c2.stars).length&&c2.errs===0,'other device follows the clean start');
  doc.querySelector('[data-letter-restart]').click();await wait(10);ok(L.hidden&&doc.querySelector('.hero-go[data-go="career"]')&&/Shift 1/.test(doc.querySelector('.hero-go[data-go="career"]').textContent),'start my new career: back at shift 1');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
