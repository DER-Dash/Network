const {JSDOM}=require('jsdom');const html=require('fs').readFileSync(require('path').join(__dirname,'..','..','build','control-room.html'),'utf8');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let errs=[];
(async()=>{const d=new JSDOM(html,{url:'https://e.test/',runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){}});w.Element.prototype.scrollIntoView=function(){};w.onerror=(m,s,l,c)=>errs.push(m+' @'+l+':'+c);}});
 const w=d.window,doc=w.document;await wait(50);const G=w.__fc;
 doc.querySelector('[data-tut="play"]').click();await wait(100);
 const t0=Date.now();let last='';
 while(Date.now()-t0<200000){const c=doc.getElementById('coach');if(c.hidden){break;}
  const n=c.querySelector('.coach-n').textContent,h=c.querySelector('h3').textContent;
  if(n+h!==last){last=n+h;console.log(n,'|',h,'| game',doc.getElementById('clock').textContent);}
  const nx=c.querySelector('[data-tut="next"]'),sh=c.querySelector('[data-tut="show"]'),fin=c.querySelector('[data-tut="career"]');
  if(fin){console.log('final step reached; CI',G.S.cust.ci,'incidents',G.S.incidents,'sup',JSON.stringify(G.S.sup),'tx',G.S.tx.map(t=>t.out?'out':Math.round(t.L*100)+'%').join(' '),'bdis',G.S.manual.bdis,'chp',G.S.manual.chp,'dsr armed',G.S.armed.dsr,'lost',!!G.S.lost);fin.click();await wait(100);break;}
  if(nx)nx.click();else if(sh)sh.click();else if(!c.querySelector('.coach-st')||!/Crew|Operating/.test(c.querySelector('.coach-st').textContent))G.tutAct();  // do the step as the player would
  await wait(400);}
 console.log('overlay shown',!doc.getElementById('overlay').hidden,'mode career?',doc.querySelector('[data-mode="career"]').getAttribute('aria-pressed'),'secs',Math.round((Date.now()-t0)/1000));
 console.log('errors',errs.slice(0,5));process.exit(0);})();
