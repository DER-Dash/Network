// Substation names flash while an alarm at that substation is unacknowledged.
const {JSDOM}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');const wait=ms=>new Promise(r=>setTimeout(r,ms));let fails=0;const ok=(c,m)=>{console.log((c?'ok ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const d=new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};}});
 const w=d.window,doc=w.document;await wait(30);const G=w.__fc;doc.querySelector('[data-mode="free"]').click();doc.querySelector('[data-scn="quiet"]').click();doc.getElementById('ovTips').checked=false;doc.getElementById('ovPause').checked=false;doc.getElementById('startBtn').click();{const h=doc.getElementById('hoGo');if(h&&!doc.getElementById('hoOverlay').hidden)h.click();}
 const S=G.S;S.sched.length=0;G.run(3);const fl=()=>[...doc.querySelectorAll('.snm.flash')].map(e=>e.id).sort().join(',');
 ok(fl()==='','no names flash at the start');
 S.sched.push({k:'lv:hw0',m:S.t,dur:40,sec:1,tr:false,cause:'Cable joint failure',done:false});G.run(2);
 ok(fl()==='snm_hw','Hertz House flashes after its 11 kV feeder trips: '+fl());
 G.run(3);ok(fl()==='snm_hw','still flashing until acknowledged');
 doc.getElementById('ackBtn').click();ok(fl()==='','flashing stops on acknowledge');
 S.sched.push({k:'fd:js',m:S.t,dur:45,cause:'Cable joint failure',done:false});G.run(2);ok(fl()==='snm_js','Joule Street flashes after its 33 kV feeder fault: '+fl());
 doc.getElementById('ackBtn').click();ok(fl()==='','cleared again');
 process.exit(fails?1:0);})();
