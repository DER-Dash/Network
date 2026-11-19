/* ---------- Career: 30 hand-built teaching puzzles, one idea each, five ranks of six ----------
   Each puzzle is a seed plus overrides for makePuzzle (see its opt comment): the fault is placed and the
   indicators, manual switches and reclosers are set so the lesson is the thing that solves it.
   build.py puts this file into the page just after fl.js's 'use strict' line. Ids are stable: progress is kept
   under them, so never renumber; add new puzzles at the end of a rank or as a new rank. */
const RANKS=['Trainee','Assistant Control Engineer','Control Engineer','Authorised Control Engineer','Senior Control Engineer'];
const C1={dist:null,bangP:0,herring:0,manualP:0,spurManualP:0,nopManual:false},C2={...C1,showCand:false};
const CAREER=[
 // Trainee: trial closes and half-splitting
 {id:'c1',title:'Trial close',lv:'easy',seed:11,o:{L:{...C1,n:3,spurs:0},fpi:'..',fault:2},
  brief:'The basic test of fault finding. Open a switch, then close the breaker. If it holds, the fault is beyond the open switch. If it trips, the fault is before it. Find the fault, get everyone else back on, then tap the section and declare it.'},
 {id:'c2',title:'Isolate and restore',lv:'easy',seed:12,o:{L:{...C1,n:4,spurs:0},fpi:'FFF',fault:1},
  brief:'Fault passage indicators (FPIs) flag red when fault current passes through them, so the fault is just beyond the last red one. No test needed: open the switches either side of the faulted section, close the breaker for the sections before it, and the normally open point (NOP) for the ones beyond.'},
 {id:'c3',title:'Halve it',lv:'easy',seed:13,o:{L:{...C1,n:6,spurs:0},fpi:'.....',fault:4},
  brief:'No indicators this time. Test in the middle: whether the breaker trips or holds, you have halved what is left. The shaded sections are the ones still possible. Six sections takes three tests at most.'},
 {id:'c4',title:'Halve it again',lv:'easy',seed:14,o:{L:{...C1,n:8,spurs:0},fpi:'.......',fault:2},
  brief:'Eight sections. Make every test split the shaded sections as near half and half as you can. Testing one section at a time from the breaker end is the slow way.'},
 {id:'c5',title:'Spurs',lv:'easy',seed:15,o:{L:{...C1,n:5,spurs:1},tees:[2],fpi:'FFFF',spFpi:'F',fault:5},
  brief:'Spurs tee off the main line through their own spur switch, and the fault can be out on one. The spur switch has an indicator too. Open the spur switch and the rest of the feeder can go straight back on.'},
 {id:'c6',title:'Spur or main line?',lv:'easy',seed:16,o:{L:{...C1,n:6,spurs:1},tees:[3],fpi:'.....',spFpi:'.',fault:4},
  brief:'No indicators. A spur is one more place the fault could be. Open its spur switch to leave it out of a test, or leave it closed to test it along with the main line.'},
 // Assistant Control Engineer: indicators and clues
 {id:'c7',title:'Reading the indicators',lv:'easy',seed:21,o:{L:{...C2,n:7,spurs:0},fpi:'FFFFFF',fault:5},
  brief:'From now on the possible sections are not shaded: working that out is your job. Follow the red indicators out from the breaker. The fault is between the last one that flagged and the first one that did not.'},
 {id:'c8',title:'A silent indicator',lv:'easy',seed:22,o:{L:{...C2,n:7,spurs:0},fpi:'FFF?FF',fault:3},
  brief:'An indicator showing ? is not responding, so it tells you nothing either way. Work out which sections it leaves in doubt, and test just that gap.'},
 {id:'c9',title:'Gaps in the indicators',lv:'easy',seed:23,o:{L:{...C2,n:8,spurs:0},fpi:'F.F.F.F',fault:5},
  brief:'Only some switches have indicators. They narrow the fault down to a stretch between two of them. Test inside that stretch.'},
 {id:'c10',title:'Distance to fault',lv:'easy',seed:24,o:{L:{...C2,n:7,spurs:0,dist:.18},fpi:'......',fault:4},
  brief:'The relay at the primary measures the impedance to the fault and estimates how far away it is. Check the kilometre marks beside the switches: only sections in that range are possible. It is an estimate, so a section just outside it deserves a thought.'},
 {id:'c11',title:'Listen to the calls',lv:'medium',seed:25,o:{L:{...C2,n:6,spurs:0,bangP:1},fpi:'.....',man:'.....',fault:2},
  brief:'Customers ring in. Most just say they are off, but someone near the fault often heard or saw it. A good call tells you where to test first. It is not proof, so test before you declare.'},
 {id:'c12',title:'Not every bang',lv:'medium',seed:26,o:{L:{...C2,n:7,spurs:0,herring:1},fpi:'F..F..',man:'......',fault:5},
  brief:'Not every bang is the fault: fireworks, a car backfiring, a skip being dropped. When a call disagrees with a working indicator, believe the indicator.'},
 // Control Engineer: back-feeding and manual switching
 {id:'c13',title:'Back-feed from the far end',lv:'medium',seed:31,o:{L:{...C2,n:6,spurs:0},fpi:'FFFFF',man:'.....',fault:2},
  brief:'A fault near the primary leaves everyone beyond it off. Isolate it, then close the normally open point to feed them from the neighbouring feeder. Never close the NOP while those sections still connect back to your breaker: that parallels two primaries on different grid supplies.'},
 {id:'c14',title:'Back-feed as a test',lv:'medium',seed:32,o:{L:{...C2,n:6,spurs:0},fpi:'.....',man:'.....',fault:4},
  brief:'Closing the NOP tests the feeder from the other end. If it holds, those sections are healthy and back on. If it trips, the neighbour\'s breaker goes too and takes their customers off (−250), so it is riskier than a trial close from your own breaker.'},
 {id:'c15',title:'Manual switches',lv:'medium',seed:33,o:{L:{...C2,n:6,spurs:0},fpi:'.....',man:'.M.M.',fault:3},
  brief:'Round switches are manual: a crew drives out from the depot, which takes 15 minutes and counts as 2 steps. Plan your tests around the square remote switches where you can.'},
 {id:'c16',title:'Choose your switches',lv:'medium',seed:34,o:{L:{...C2,n:8,spurs:0},fpi:'F..F..F',man:'M.M.M.M',fault:6},
  brief:'Sometimes the best place to split is a manual switch. Weigh it up: one crew visit costs the same as two remote operations, and customers wait while the crew drives.'},
 {id:'c17',title:'Out on the spur',lv:'medium',seed:35,o:{L:{...C2,n:6,spurs:1},tees:[2],fpi:'FFFFF',spFpi:'.',spMan:'M',man:'.....',fault:2},
  brief:'The indicators put the fault in the section where the spur tees off, or out on the spur itself. The spur switch is manual and has no indicator. One crew visit can test it and isolate it.'},
 {id:'c18',title:'Every minute counts',lv:'medium',seed:36,o:{L:{...C2,n:7,spurs:1},tees:[1],fpi:'FFFFFF',spFpi:'F',man:'..M..M',fault:4},
  brief:'Customer minutes lost add up while people are off. Once you know where the fault is, use the remote switches first and get the biggest blocks of customers back on before you wait for a crew.'},
 // Authorised Control Engineer: auto-reclosers
 {id:'c19',title:'The recloser locked out',lv:'medium',seed:41,o:{L:{...C2,n:6,spurs:0},rec:[2],fpi:'.....',man:'.....',fault:4},
  brief:'Auto-reclosers (AR) are circuit breakers out on the line. They trip, reclose twice to clear passing faults like a branch brushing the line, then lock out. This one locked out and your breaker held, so the fault is beyond it and everyone before it is still on.'},
 {id:'c20',title:'Test with the recloser',lv:'medium',seed:42,o:{L:{...C2,n:7,spurs:0},rec:[1],fpi:'......',man:'......',fault:5},
  brief:'Closing onto the fault trips the recloser, not your breaker, so the sections before it stay on. Half-split beyond it: open a switch further out, then close the recloser.'},
 {id:'c21',title:'Recloser and indicators',lv:'medium',seed:43,o:{L:{...C2,n:7,spurs:0},rec:[3],fpi:'FFFFF.',man:'......',fault:6},
  brief:'Indicators still work beyond a recloser. Read them first: they may save you most of the tests.'},
 {id:'c22',title:'Two reclosers',lv:'medium',seed:44,o:{L:{...C2,n:9,spurs:0},rec:[2,5],fpi:'........',man:'........',fault:7},
  brief:'Two reclosers in a row. The one nearest the fault trips first, so which one locked out tells you which stretch to look in.'},
 {id:'c23',title:'Spur behind a recloser',lv:'medium',seed:45,o:{L:{...C2,n:7,spurs:1},rec:[2],tees:[4],fpi:'......',spFpi:'.',man:'......',spMan:'.',fault:7},
  brief:'A spur teed off beyond a recloser is protected by it too. The fault could be on the main line or out on the spur.'},
 {id:'c24',title:'Before the recloser',lv:'medium',seed:46,o:{L:{...C2,n:7,spurs:0},rec:[4],fpi:'......',man:'......',fault:1},
  brief:'This time your own breaker locked out and the recloser did not operate. If the fault were beyond the recloser, the recloser would have tripped first. So the fault is between the primary and the recloser.'},
 // Senior Control Engineer: everything at once
 {id:'c25',title:'Night shift',lv:'hard',seed:51,o:{L:{showCand:false},fault:6},
  brief:'A long feeder with spurs, few indicators, manual switches and no distance estimate. Everything you have learned, on a feeder like the ones on the real network.'},
 {id:'c26',title:'Unreliable indicators',lv:'medium',seed:52,o:{L:{...C2,n:8,spurs:1},tees:[5],fpi:'F?F.?FF',spFpi:'?',man:'.M..M..',fault:4},
  brief:'Two indicators on the main line are not responding and the spur\'s is dead too. Work out exactly what the working ones prove before you start switching.'},
 {id:'c27',title:'Cable feeder',lv:'medium',seed:53,o:{L:{...C2,n:8,spurs:1,dist:.25},oh:false,fpi:'.......',man:'..M..M.',fault:5},
  brief:'All underground cable. There is no auto-reclose and nobody sees a flash, but the relay distance estimate is still there. Use it, then test.'},
 {id:'c28',title:'Long rural feeder',lv:'hard',seed:54,o:{L:{showCand:false,n:9,spurs:2},oh:true,rec:[3],tees:[1,6],fault:8},
  brief:'A long overhead feeder across farmland with a recloser part way out. Every crew visit is a long drive from the depot.'},
 {id:'c29',title:'Storm night',lv:'hard',seed:55,o:{L:{showCand:false,herring:1,manualP:.7},oh:true,fault:4},
  brief:'A storm. Calls are coming in from everywhere, most switches are manual and the indicators are patchy. Stay calm and test.'},
 {id:'c30',title:'Senior authorisation',lv:'hard',seed:56,o:{L:{showCand:false,herring:1},rec:[2,6],fpi:'F?..F.?.',spFpi:'.?.',man:'.M.M..M.',fault:7},
  brief:'Your final assessment: two reclosers, three spurs, indicators you cannot all trust and a misleading call. Find it, isolate it and restore everyone else at par for three stars.'}];
const rankOf=n=>RANKS[Math.min(RANKS.length-1,Math.floor(n/6))];
