// Career sync end to end: two "devices" (separate browsers) talking to scoreboard/Code.gs run in an
// Apps Script stand-in. Run python3 src/build.py first.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');const {makeAppsScript}=require('./appscript-mock');
const read=f=>fs.readFileSync(path.join(__dirname,'..','..','build',f),'utf8'),CR=read('control-room.html'),FC=read('generation.html');
let errs=[],fails=0,online=true;const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const AS=makeAppsScript();
// fetch goes to the Apps Script stand-in. The test pages run on e.test, so the site is set to the real one here.
const fakeFetch=async(url,opt)=>{await wait(5);if(!online)throw new Error('offline');
  if(!opt||opt.method!=='POST')return{json:async()=>({ok:true,scores:[]})};const d=JSON.parse(opt.body);d.site='der-dash.github.io';const j=AS.post(d);return{json:async()=>j};};
function device(html,store){const d=new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.fetch=fakeFetch;w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);
  if(store)Object.entries(store).forEach(([k,v])=>w.localStorage.setItem(k,v));}});return d;}
const $=(d,id)=>d.window.document.getElementById(id);
const click=(d,el)=>el.dispatchEvent(new d.window.MouseEvent('click',{bubbles:true}));
const careerMode=async d=>{await wait(40);click(d,d.window.document.querySelector('[data-mode="career"]'));await wait(20);};
const car=(d,pre)=>JSON.parse(d.window.localStorage.getItem((pre||'fc4-')+'career')||'{}');
const link=async(d,name,pin)=>{$(d,'syName').value=name;$(d,'syPin').value=pin;click(d,$(d,'syncBtn'));await wait(80);};
const msg=d=>($(d,'syncMsg')||{}).textContent||'';
(async()=>{
 // Phone: three shifts done, saves its career online
 const phone=device(CR,{'fc4-career':JSON.stringify({stars:{quiet:3,grid:2,storm:1},ach:{first:1,clean:1},best:{}})});await careerMode(phone);
 ok(!!$(phone,'syncBox')&&!!$(phone,'syncBtn'),'career screen offers to save the career online');
 await link(phone,'Sparky Sue','12a4');ok(/4 digits/.test(msg(phone)),'bad PIN caught before sending');
 await link(phone,'Sparky Sue','4321');
 ok(/Saved\. Your career is online as Sparky Sue/.test(msg(phone)),'saved online: '+msg(phone));
 ok(!!$(phone,'syncNow')&&/Saved online/.test($(phone,'syncBox').textContent),'now shows it is saved online');
 ok(JSON.parse(phone.window.localStorage.getItem('fc-sync')).name==='Sparky Sue','link remembered on the phone');

 // Laptop: brand new, loads the career with the same name and PIN
 const laptop=device(CR);await careerMode(laptop);
 ok(laptop.window.document.querySelector('[data-scn="storm"]').disabled,'laptop starts with only the first shift');
 await link(laptop,'Sparky Sue','9999');ok(/different PIN/.test(msg(laptop))&&/4 tries left/.test(msg(laptop)),'wrong PIN refused: '+msg(laptop));
 await link(laptop,'sparky sue','4321');
 ok(car(laptop).stars.storm===1&&car(laptop).ach.clean===1,'laptop now has the phone\'s stars and achievements');
 ok(/Welcome back, Sparky Sue/.test(msg(laptop)),'welcome back message');
 ok(!laptop.window.document.querySelector('[data-scn="heat"]').disabled,'shifts the phone unlocked are open on the laptop');

 // Laptop plays a career shift: synced straight after
 {const w=laptop.window,G=w.__fc;click(laptop,w.document.querySelector('[data-scn="heat"]'));w.document.getElementById('ovTips').checked=false;w.document.getElementById('ovPause').checked=false;
  click(laptop,$(laptop,'startBtn'));{const h=$(laptop,'hoGo');if(h&&!$(laptop,'hoOverlay').hidden)click(laptop,h);}
  G.S.sched.length=0;G.run(800);ok(G.S.ended,'laptop finishes the Heatwave');
  ok(/Saving your career online|Career saved online/.test(($(laptop,'endSync')||{}).textContent||''),'end screen says it is saving');
  await wait(120);ok(/Career saved online as Sparky Sue/.test(($(laptop,'endSync')||{}).textContent||''),'end screen confirms: '+(($(laptop,'endSync')||{}).textContent));
  ok((car(laptop).stars.heat||0)>=1,'heatwave stars on the laptop');}
 const heat=car(laptop).stars.heat;

 // Phone opens again: pulls the laptop's progress on its own
 const phone2=device(CR,{'fc4-career':phone.window.localStorage.getItem('fc4-career'),'fc-sync':phone.window.localStorage.getItem('fc-sync'),'fc4-mode':'career'});
 await wait(150);await careerMode(phone2);ok(car(phone2).stars.heat===heat,'phone picks up the laptop\'s Heatwave stars when it opens');
 ok(!phone2.window.document.querySelector('[data-scn="jan"]').disabled,'and the start screen shows the next shift unlocked');

 // Offline: nothing lost, clear message
 online=false;click(phone2,$(phone2,'syncNow'));await wait(80);ok(/couldn't reach the scoreboard/i.test(msg(phone2)),'offline: '+msg(phone2));ok(car(phone2).stars.heat===heat,'offline sync keeps the career');online=true;

 // Stop syncing on one device
 click(phone2,$(phone2,'syncOff'));await wait(20);ok(!phone2.window.localStorage.getItem('fc-sync')&&!!$(phone2,'syncBtn'),'stop syncing: link removed, form back');ok(car(phone2).stars.heat===heat,'career kept on the device');

 // Name freed up and taken by someone else: the old link stops cleanly
 AS.sheets.Careers.rows.splice(1,1);AS.post({type:'career',site:'der-dash.github.io',game:'cr',name:'Sparky Sue',pin:'0000',career:{}});
 const laptop2=device(CR,{'fc4-career':laptop.window.localStorage.getItem('fc4-career'),'fc-sync':laptop.window.localStorage.getItem('fc-sync'),'fc4-mode':'career'});await wait(150);await careerMode(laptop2);
 ok(!laptop2.window.localStorage.getItem('fc-sync')&&/stopped syncing/.test(msg(laptop2)),'PIN no longer matches: link dropped with a message');
 ok(car(laptop2).stars.heat===heat,'and the career is still there');

 // The generation game uses the same link but its own career
 const gen=device(FC,{'fc-sync':JSON.stringify({name:'Gen Gary',pin:'1111',at:1}),'fcg-career':JSON.stringify({stars:{may:3},ach:{first:1}}),'fcg-mode':'career'});
 await wait(150);const row=AS.sheets.Careers.rows.find(r=>r[0]==='Gen Gary');ok(row&&JSON.parse(row[4]).stars.may===3&&!row[3],'generation game career saved in its own column');
 ok(!errs.length,'no script errors '+errs.slice(0,4).join(' | '));
 console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);})();
