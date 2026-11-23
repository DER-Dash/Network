// Gatekeeper: Gate 2 queue order and "needed", milestones that slip, pro rata curtailment, and the fairer scores.
// Run python3 src/build.py first.
const fs=require('fs'),path=require('path'),{JSDOM}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'../../build/gatekeeper.html'),'utf8');
let fails=0,n=0;const ok=(c,m)=>{if(!c){fails++;console.error('FAIL',m);}else console.log('ok',m);};
const boot=()=>new JSDOM(html,{runScripts:'dangerously',url:`http://r${++n}.test/`,pretendToBeVisual:true,beforeParse(w){w.__GK_FAST=true;}}).window;
const hold=G=>{G.S.queue.forEach(a=>a.choice='hold');G.sendOffers();G.runYear();G.startYear();};
(async()=>{await new Promise(r=>setTimeout(r,50));
 // ---- Gate 2: needed, and ready-and-needed projects first ----
 {const w=boot(),G=w.__gk;let found=false;
  for(const seed of [1,2,3,4,5,6,7,8,9,10]){G.newCareer(seed);hold(G);hold(G);const Q=G.S.queue;
    ok(G.S.reform&&Q.every((a,i)=>i===0||!(G.gate2(Q[i-1])===false&&G.g2Applies(Q[i-1])&&G.gate2(a))),`seed ${seed}: after the reform, no Gate 2 project sits behind a Gate 1 one`);
    if(Q.some(a=>a.app>Q.indexOf(a)+1))found=true;}
  ok(found,'some Gate 2 projects move up the queue past earlier applications');
  const sol={kind:'solar',prim:'ml',land:true,planning:true},sol2={...sol,prim:'rv'},dc={kind:'dc',prim:'js',land:true,planning:true};
  ok(!G.gate2(sol)&&G.gate2(sol2),'solar at Shocking Place is not needed; at Ohm No it is');
  ok(!G.gate2(dc)&&G.gate2({...dc,prim:'hw'}),'data centres are needed only in the Hertz House growth zone');
  G.newCareer(3);hold(G);hold(G);w.document.getElementById('ov').hidden=true;G.render();
  ok(/Needed/.test(w.document.getElementById('queue').textContent)&&w.document.querySelector('.qpos'),'cards show Needed and the queue position');}
 // ---- milestones: real projects that slip, speculative ones that never come ----
 {const w=boot(),G=w.__gk;await new Promise(r=>setTimeout(r,50));G.newCareer(21);let real=0,slip=0;
  for(let y=1;y<=4;y++){G.S.queue.forEach(a=>{const L=G.offers(a).list;a.choice=(L.find(x=>x.type==='firm'&&x.avail)||L.find(x=>x.type==='flex'&&x.avail)||{type:'hold'}).type;});G.sendOffers();G.runYear();G.startYear();}
  G.S.cust.filter(c=>!c.existing&&!c.spec).forEach(c=>{real++;if(c.slip)slip++;});
  ok(real>5&&slip>=1&&slip<real/2,`some real projects run late (${slip} of ${real})`);
  const late=G.S.cust.filter(c=>!c.gone&&!c.built&&!c.existing&&G.S.year>c.conn);
  ok(late.every(c=>typeof G.devNote(c)==='string'&&G.devNote(c).length>5),'every missed milestone has a developer note');
  const notes=c=>G.devNote(c)!=='No reply to our letters.';
  // statistics of the notes over many made-up projects
  let rs=0,ss=0;for(let i=0;i<200;i++){if(notes({name:'R'+i,spec:false}))rs++;if(notes({name:'S'+i,spec:true}))ss++;}
  ok(rs>140&&ss<90,`real projects usually explain (${rs}/200), speculative ones mostly don't (${ss}/200)`);
  const g=late.find(c=>!c.spec);
  if(g){G.S.reform=true;const b=G.S.yr.complaints;w.document.getElementById('ov').hidden=true;G.render();const btn=w.document.querySelector(`[data-rm="${g.id}"]`);btn&&btn.click();
    ok(g.gone&&G.S.yr.complaints===b+1,'removing a real late project draws a complaint');}
  const sl=G.S.cust.find(c=>c.slip&&!c.built&&!c.gone);if(sl){const was=G.S.year;ok(sl.conn+sl.slip>was||sl.built,'a late real project still builds, just later');}}
 // ---- pro rata curtailment ----
 {const w=boot(),G=w.__gk;G.newCareer(5);const S=G.S;
  const mkc=(id,seq,mw)=>({id,seq,name:'F'+id,kind:'solar',mw,prim:'ml',offer:'flex',built:true,land:true,planning:true,limit:5});
  S.cust.push(mkc(901,50,15),mkc(902,60,15),mkc(903,70,15));
  S.anm='lifo';let R=G.simulate(S);const lifo=[901,902,903].map(i=>R.cut[i]/R.pot[i]*100);
  S.anm='pro';R=G.simulate(S);const pro=[901,902,903].map(i=>R.cut[i]/R.pot[i]*100);
  ok(lifo[2]>lifo[0]+1,`last in, first off: the newest is curtailed most (${lifo.map(x=>x.toFixed(1)).join(' / ')}%)`);
  ok(Math.abs(pro[0]-pro[2])<0.5&&pro[0]>0,`pro rata: equal shares (${pro.map(x=>x.toFixed(1)).join(' / ')}%)`);
  const tot=a=>a.reduce((x,y)=>x+y,0);ok(Math.abs(tot(lifo)-tot(pro))/tot(lifo)<.05,'the same total is curtailed either way');
  S.queue.unshift({id:999,name:'Test Solar',kind:'solar',mw:10,prim:'ml',land:true,planning:true,tol:8,pat:2,spec:false});
  const fo=G.offers(S.queue[0]).list.find(x=>x.type==='flex');ok(/pro rata/.test(fo.line)&&/already here go from/.test(fo.line),'pro rata offers say what it does to existing flexible customers');}
 // ---- scores: connections against what was viable, cost penalises underspend while customers wait ----
 {const w=boot(),G=w.__gk;G.newCareer(8);for(let i=0;i<5;i++)hold(G);
  G.S.queue.forEach(a=>a.choice='refuse');G.sendOffers();const r=G.runYear();
  ok(r.viaMW<=r.genMW&&r.sc.conn<60,`refusing everything scores badly on connections (${Math.round(r.sc.conn)}), judged on ${r.viaMW.toFixed(0)} of ${r.genMW.toFixed(0)} MW`);
  ok(r.waitMW>0&&r.spend<8&&r.sc.cost<100,`an unspent allowance while ${r.waitMW.toFixed(0)} MW waited costs points (${Math.round(r.sc.cost)})`);
  w.document.getElementById('ov').hidden=true;}
 console.log(fails?`${fails} FAILED`:'all passed');process.exit(fails?1:0);})();
