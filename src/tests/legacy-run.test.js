// A restart made before runs were time-stamped is kept through a sync and uploaded.
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');const {makeAppsScript}=require('./appscript-mock');const AS=makeAppsScript();
const CR=fs.readFileSync(path.join(__dirname,'..','..','build','control-room.html'),'utf8');const wait=ms=>new Promise(r=>setTimeout(r,ms));let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const ff=async(u,o)=>{await wait(5);if(!o||o.method!=='POST')return{json:async()=>({ok:true,scores:[]})};const d=JSON.parse(o.body);d.site='der-dash.github.io';const j=AS.post(d);return{json:async()=>j};};
AS.post({type:'career',game:'cr',site:'der-dash.github.io',name:'Steve B',pin:'1234',career:{stars:{quiet:2},ach:{}}});
const d=new JSDOM(CR,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.fetch=ff;
 w.localStorage.setItem('fc4-career',JSON.stringify({stars:{quiet:2,grid:1},ach:{},best:{},run:{at:'grid',from:'quiet',stars:{quiet:2}}}));w.localStorage.setItem('fc-sync',JSON.stringify({name:'Steve B',pin:'1234',at:1}));}});
(async()=>{await wait(300);const c=JSON.parse(d.window.localStorage.getItem('fc4-career'));const sv=JSON.parse(AS.sheets.Careers.rows[1][3]);
 ok(c.run&&c.run.at==='grid'&&c.run.t>0,'restart from before the fix kept on this device');ok(sv.run&&sv.run.at==='grid','and uploaded to the online career');process.exit(fails?1:0);})();
