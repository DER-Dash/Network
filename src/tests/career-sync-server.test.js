// Career sync in scoreboard/Code.gs, run against an in-memory Apps Script stand-in.
const {makeAppsScript}=require('./appscript-mock');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'ok ':'FAIL ')+m);};
const A=makeAppsScript(),site='der-dash.github.io';
const sync=(name,pin,career,game)=>A.post({type:'career',site,game:game||'cr',name,pin,career});
const sheet=()=>A.sheets.Careers;

let r=sync('Sparky Sue','1234',{stars:{quiet:3,grid:2},ach:{first:1,clean:1},best:{}});
ok(r.ok&&r.created&&r.career.stars.quiet===3,'new name: career saved');
ok(sheet().rows.length===2&&sheet().rows[0][0]==='Name','Careers tab created with headers');
ok(!JSON.stringify(sheet().rows[1]).includes('1234'),'PIN is not stored in the sheet');
ok(/^h[0-9a-f]{64}$/.test(sheet().rows[1][1]),'only a scrambled PIN is stored');
ok(sheet().rows[1][5]===5,'control room star total shown in the sheet');

r=sync('sparky sue','1234',{stars:{grid:3,storm:1},ach:{mbb:1}});
ok(r.ok&&!r.created&&r.name==='Sparky Sue','same name in any case, right PIN: synced');
ok(r.career.stars.quiet===3&&r.career.stars.grid===3&&r.career.stars.storm===1,'stars merged, best of each kept');
ok(r.career.ach.first&&r.career.ach.clean&&r.career.ach.mbb,'achievements from both devices kept');
ok(sheet().rows.length===2,'still one row for the player');

r=sync('Sparky Sue','1234',{stars:{},ach:{}});ok(r.ok&&r.career.stars.quiet===3,'empty device loads the saved career');

r=sync('Sparky Sue','9999',{stars:{endure:3}});ok(!r.ok&&r.error==='pin'&&r.triesLeft===4,'wrong PIN refused');
ok(!JSON.parse(sheet().rows[1][3]).stars.endure,'wrong PIN changes nothing');
for(let i=0;i<3;i++)sync('Sparky Sue','9999',{});r=sync('Sparky Sue','9999',{});ok(r.error==='locked','locked after 5 wrong PINs');
r=sync('Sparky Sue','1234',{});ok(r.error==='locked','right PIN also waits out the lock');
A.clearCache();r=sync('Sparky Sue','1234',{});ok(r.ok,'works again after the lock expires');

r=sync('Sparky Sue','1234',{stars:{may:3,jan:2}},'fc');ok(r.ok&&r.career.stars.may===3&&!r.career.stars.quiet,'generation career kept separately under the same name and PIN');
ok(JSON.parse(sheet().rows[1][4]).stars.may===3&&JSON.parse(sheet().rows[1][3]).stars.quiet===3,'both careers in the one row');

r=sync('Bad','1234',{stars:{quiet:9,nope:3,grid:'2',xmas:1.4},ach:{'=HACK()':1,first:1,ok:0},best:{x:1}});
ok(r.ok&&r.career.stars.quiet===undefined&&r.career.stars.nope===undefined&&r.career.stars.grid===2&&r.career.stars.xmas===1,'nonsense stars dropped or tidied');
ok(r.career.ach.first&&!r.career.ach['=HACK()']&&!r.career.ach.ok,'only real-looking achievement ids kept');

ok(sync('A','1234',{}).error==='name','one-letter name refused');
ok(sync('Sue','12a4',{}).error==='pin_format'&&sync('Sue','123',{}).error==='pin_format','PIN must be 4 digits');
ok(sync('x'.repeat(5)+'shit','1234',{}).error==='name','rude names refused');
ok(A.post({type:'career',site:'evil.example',game:'cr',name:'Sue',pin:'1234',career:{}}).error==='site','other websites refused');
r=sync('0123','1111',{});ok(r.ok&&sync('0123','1111',{}).ok,'number-like names still match');

r=A.post({type:'career',site,game:'cr',name:'Nobody Here',pin:'1234',career:{stars:{quiet:3}},intent:'load'});
ok(!r.ok&&r.error==='none'&&!A.sheets.Careers.rows.some(x=>x[0]==='Nobody Here'),'load with an unknown name saves nothing');
r=A.post({type:'career',site,game:'cr',name:'Sparky Sue',pin:'1234',career:{},intent:'load'});ok(r.ok&&r.career.stars.quiet===3,'load with a known name and PIN works');
// scores and feedback still work as before
r=A.post({site,game:'cr',name:'Sparky Sue',day:'quiet',mode:'cr-free',result:'complete',survived:720,spend:0,faults:2,risk:0,grade:'A',ens:10,incidents:0});
ok(r.ok&&r.version===16&&r.rank===1,'scores still save (version 16)');
console.log(fails?fails+' failed':'all passed');process.exit(fails?1:0);
