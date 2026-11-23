// Phones: one substation at a time (tabs, dots, swipe) and the switch pop-up as a sheet along the bottom.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');
let errs=[],fails=0;const wait=ms=>new Promise(r=>setTimeout(r,ms));const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
(async()=>{const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=q=>({matches:/max-width: ?700px/.test(q),addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};w.scrollBy=()=>{};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
 await wait(30);const doc=d.window.document;doc.querySelector('[data-mode="free"]').click();doc.querySelector('[data-scn="grid"]').click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();
 {const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}const G=d.window.__fc,S=G.S;S.sched.length=0;G.run(2);S.paused=true;await wait(100);
 const svg=doc.getElementById('mimic'),vb=()=>svg.getAttribute('viewBox').split(' ').map(Number),chip=z=>doc.querySelector(`#zChips [data-zone="${z}"]`);
 const tabs=[...doc.querySelectorAll('#zChips [data-zone]')].map(b=>b.dataset.zone);
 ok(tabs[0]==='all'&&tabs[1]==='bc'&&tabs.includes('hw')&&tabs.includes('js'),'tabs: whole network, Blackout Canyon and each substation');
 chip('rv').click();await wait(50);let v=vb();
 ok(v[2]<420&&svg.classList.contains('subv')&&!svg.classList.contains('zoom'),'a substation tab crops the diagram to that substation ('+v.join(' ')+')');
 ok(chip('rv').getAttribute('aria-pressed')==='true'&&chip('hw').getAttribute('aria-pressed')==='false','the tab shows as chosen');
 chip('bc').click();await wait(50);ok(svg.classList.contains('zoom')&&vb()[1]===0,'Blackout Canyon is the wide grid view');
 chip('all').click();await wait(50);ok(vb()[2]===1200&&!svg.classList.contains('subv'),'Whole shows everything');
 // swipe
 chip('hw').click();await wait(50);const ms=doc.getElementById('mscroll');const T=(t,x,y)=>{const e=new d.window.Event(t,{bubbles:true});e[t==='touchstart'?'touches':'changedTouches']=[{clientX:x,clientY:y}];if(t==='touchstart')e.touches=[{clientX:x,clientY:y}];ms.dispatchEvent(e);};
 T('touchstart',300,400);T('touchend',150,410);await wait(50);
 ok(chip(tabs[tabs.indexOf('hw')+1]).getAttribute('aria-pressed')==='true','swiping left moves to the next substation');
 T('touchstart',100,400);T('touchend',260,405);await wait(50);ok(chip('hw').getAttribute('aria-pressed')==='true','swiping right moves back');
 // dots
 S.alarms.t1={id:'t1',ev:'trip',lvl:'trip',name:'Ohm Street',sel:'lf:rv0',since:S.t,L:0,ack:false};S.alarms['tie:js']={id:'tie:js',lvl:'high',name:'tie',sel:'tie:js',since:S.t,L:.85,ack:false};
 G.run(0);await wait(300);
 ok(chip('rv').classList.contains('red'),'a trip puts a red dot on its substation tab');
 ok(chip('js').classList.contains('amber')||chip('js').classList.contains('red'),'a high load puts a dot on its tab');
 ok(!chip('ml').classList.contains('red')&&!chip('ml').classList.contains('amber'),'quiet substations have no dot');
 // Go to from the alarm: opens the right tab with the bottom sheet
 doc.querySelector('.al-list [data-alsel="lf:rv0"]')?.click();await wait(250);const g=doc.querySelector('[data-goto="lf:rv0"]');ok(!!g,'the alarm offers Go to');
 if(g){g.click();await wait(300);}
 ok(chip('rv').getAttribute('aria-pressed')==='true','Go to opens that substation\'s tab');
 const qp=doc.getElementById('qp');ok(!qp.hidden&&qp.classList.contains('sheetm')&&qp.parentElement===doc.body,'the switch pop-up is a sheet along the bottom');
 ok(qp.querySelectorAll('.op-btn').length>=2,'with Open and Close buttons');
 qp.querySelector('.qp-x')?.click();await wait(250);ok(qp.hidden,'closing the sheet hides it');
 ok(!errs.length,'no script errors '+errs.join(' | '));process.exit(fails?1:0);})();
