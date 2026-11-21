// The alarm list: load alarms show as load alarms and stay acknowledged; trip and auto-reclose events clear on acknowledge.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
(async()=>{const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
 await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector('[data-scn="grid"]').click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
 {const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}const G=d.window.__fc,S=G.S;S.sched.length=0;G.run(2);
 const body=()=>doc.getElementById('alBody');const render=()=>wait(200);S.paused=true;
 S.alarms['tie:hw']={id:'tie:hw',lvl:'high',name:'Hertz House – Ampy Place tie',sel:'tie:hw',since:S.t,L:.85,ack:false};
 S.alarms.ev1={id:'ev1',ev:'ar',lvl:'ar',name:'Joule Street 33 kV feeder',sel:'bc:js',note:'held in',since:S.t,L:0,ack:false};await render();
 const t=body().textContent;ok(/High load/.test(t)&&/Auto-reclose/.test(t),'a load alarm reads High load and an auto-reclose reads Auto-reclose');
 ok(body().querySelectorAll('li.al.unack').length===2,'both unacknowledged');
 doc.getElementById('ackBtn').click();await render();
 ok(!S.alarms.ev1&&S.alarms['tie:hw']&&S.alarms['tie:hw'].ack,'acknowledge clears the auto-reclose and acknowledges the load alarm');
 ok(body().querySelectorAll('li.al.unack').length===0&&!/Auto-reclose/.test(body().textContent),'nothing left showing as unacknowledged or as an auto-reclose');
 for(let k=0;k<5;k++)S.alarms['x'+k]={id:'x'+k,ev:'trip',lvl:'trip',name:'Trip '+k,sel:k%2?'lf:hw0':'tx:0',since:S.t,L:0,ack:false};await render();
 ok(body().querySelectorAll('.al-grp').length>=2,'four or more alarms are grouped by site');
 // a new 11 kV fault: the alert banner offers Find it yourself, and the button goes once the fault is found
 {S.paused=false;S.rngC=()=>0.99;S.sched.push({k:'lv:hw1',m:S.t,dur:200,sec:1,tr:false,cause:'Tree contact on the overhead line',done:false});G.run(1);await wait(250);
  ok(!!doc.querySelector('#bannerMsg [data-find="hw1"]'),'fault banner offers Find it yourself in Fault Lines');
  S.lff.hw[1].found=true;S.lff.hw[1].until=S.t+100;await wait(250);
  ok(!doc.querySelector('#bannerMsg [data-find]'),'the button goes once the fault is found');}
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
