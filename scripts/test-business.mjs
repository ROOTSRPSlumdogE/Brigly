import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({crypto:globalThis.crypto});
for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','manage-state','payroll-state','writeups-state','business-state'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,Z=B.biz,P=B.payroll,today=P.stamp().slice(0,10);
const as=(st,id)=>{const p=st.team.find(x=>x.id===id);return {...st,role:p.access,crewId:p.access==='crew'?id:st.crewId,managerId:p.access==='manager'?id:st.managerId};};
const mgr=st=>({...st,role:'manager'});
let s=mgr(B.starter());

// Sales and prime cost.
const wk=B.monday(today),from=B.addDays(wk,-7),to=B.addDays(wk,-1),r=Z.pnl(s,from,to);
assert(r.sales>0&&r.labor>0,'demo sales and labor');assert.equal(r.laborPct,Math.round(r.labor/r.sales*1000)/10);
assert.equal(r.prime,Math.round((r.labor+r.purchases)*100)/100);assert(r.laborPct>15&&r.laborPct<45,'labor % is in a believable range');
const svc=s.shifts.find(x=>x.date===from).service;
s=B.change(s,{type:'sales:put',date:from,service:svc,amount:5000});s=B.change(s,{type:'sales:put',date:from,service:svc,amount:4000});
assert.equal(s.business.sales.filter(x=>x.date===from&&x.service===svc).length,1,'entering a service again replaces it');
assert.throws(()=>B.change(as(s,'alex'),{type:'sales:put',date:from,service:svc,amount:1}),/Only managers/);
s.business.sales=s.business.sales.filter(x=>!(x.date===from&&x.service===svc));
assert(Z.missingSales(s,from,to).some(x=>x.date===from&&x.service===svc),'a service that ran without sales is flagged');
console.log('PASS: sales, labor %, prime cost and missing sales.');

// Time off balances accrue from hours worked and respect contract eligibility.
const alex=Z.balance(s,'alex','sick');assert(alex.eligible&&alex.accrued===Math.floor(alex.hours/30)*1);
s=B.change(s,{type:'leave:adjust',person:'alex',kind:'sick',hours:2,note:'Carry-over'});
assert.equal(Z.balance(s,'alex','sick').balance,Math.min(40,alex.balance+2));
assert.throws(()=>B.change(s,{type:'leave:adjust',person:'alex',kind:'sick',hours:2,note:''}),/reason/);
const part=s.team.find(p=>p.active&&p.hr?.employmentType==='Part-time');assert.equal(Z.balance(s,part.id,'pto').eligible,false,'part-time contracts earn no PTO by default');
s=B.change(s,{type:'rules:set',ptoTypes:['Full-time','Part-time'],sickCap:10});
assert(Z.balance(s,part.id,'pto').eligible);assert(Z.balance(s,'alex','sick').balance<=10,'the cap holds');
console.log('PASS: time off accrual, adjustments, caps and eligibility.');

// Onboarding ticks itself off from the records.
assert.deepEqual([...Z.activeOnboarding(s)],['priya'],'the demo new hire is onboarding');
let o=Z.onboarding(s,'priya');assert(o.steps.find(x=>x.key==='w4').done&&!o.steps.find(x=>x.key==='handbook').done);
s=B.change(s,{type:'manage:hr',person:'priya',hr:{handbookDate:today,emergency:'Raj Shah · brother · 555-0100'}});
o=Z.onboarding(s,'priya');assert(o.steps.find(x=>x.key==='handbook').done&&o.steps.find(x=>x.key==='contact').done,'HR file updates tick onboarding steps');
assert.throws(()=>B.change(s,{type:'onboard:step',person:'priya',key:'w4',done:true}),/completes itself/);
s=B.change(s,{type:'onboard:step',person:'priya',key:'uniform',done:true});assert(Z.onboarding(s,'priya').steps.find(x=>x.key==='uniform').done);
s=B.change(s,{type:'skill:set',person:'priya',skill:'Server',level:2});assert(Z.onboarding(s,'priya').steps.find(x=>x.key==='skill').done,'the training matrix signs off the position');
s=B.change(s,{type:'ops:member',id:'newbie',name:'Sam Lee',role:'Host',area:'Floor',access:'crew',active:true,rate:16,joinedOn:today});
assert(Z.activeOnboarding(s).includes('newbie'),'adding a teammate starts onboarding');
console.log('PASS: onboarding steps from the HR file, skills and roster, manual steps and auto-start.');

// Reviews start from the record; sharing needs real words; the team member acknowledges.
const rec=Z.record(s,'alex',B.addDays(today,-60),today);assert(rec.shifts>0&&rec.onTime<=100);
const d=Z.draft(s,'alex',rec);assert(d.strengths.length>10&&d.ratings.reliability>=1);
const review={type:'review:save',id:'rv1',person:'alex',kind:'Check-in',date:today,from:B.addDays(today,-60),to:today,ratings:d.ratings,strengths:d.strengths,improve:'Keep learning the wine list.',goals:'[Two or three goals for the next period, and the support Alex will get.]',share:true};
assert.throws(()=>B.change(s,review),/placeholders/);
s=B.change(s,{...review,goals:'Lead one opening shift a week.'});assert.equal(s.business.reviews.find(x=>x.id==='rv1').status,'Shared');
assert.equal(s.business.reviews.find(x=>x.id==='rv1').record.shifts,rec.shifts,'the record is kept with the review');
assert.throws(()=>B.change(as(s,'alex'),{...review,id:'rv2'}),/Only managers/);
s=mgr(B.change(as(s,'alex'),{type:'review:ack',id:'rv1',comment:'Sounds good.'}));assert.equal(s.business.reviews.find(x=>x.id==='rv1').status,'Acknowledged');
s=mgr(B.change(as(s,'alex'),{type:'kudos:give',person:'mia',value:'Teamwork',text:'Covered my section.'}));
assert(s.business.kudos.some(k=>k.by==='alex'&&k.person==='mia'),'crew can recognize each other');
assert.throws(()=>B.change(as(s,'alex'),{type:'kudos:give',person:'alex',text:'Me'}),/not yourself/);
assert(Z.due(s).every(x=>x.person!=='alex'||x.kind!=='Check-in'));
console.log('PASS: reviews from the record, sharing, acknowledgment and peer kudos.');

// Skills coverage on the roster.
const gaps=Z.coverage(s,today,B.addDays(today,13));
if(gaps.length){const g=gaps[0],pid=g.team[0];if(pid){s=B.change(s,{type:'skill:set',person:pid,skill:g.skill,level:2});assert(!Z.coverage(s,today,B.addDays(today,13)).some(x=>x.date===g.date&&x.service===g.service&&x.skill===g.skill),'training someone on shift closes the gap');}}
s=B.change(s,{type:'skill:list',list:['Server','Closing lead','Wine'],required:['Wine']});assert.deepEqual([...s.business.skills.required],['Wine']);
assert(Z.coverage(s,today,B.addDays(today,6)).every(x=>x.skill==='Wine'));
console.log('PASS: training matrix and required-skill coverage.');

// Exits: shifts after the last day are unassigned; completing archives the profile.
const leaver=s.team.find(p=>p.active&&p.access==='crew'&&p.id!=='priya'&&p.id!=='newbie'&&s.shifts.some(x=>x.person===p.id&&x.date>B.addDays(today,2)));
const later=s.shifts.filter(x=>x.person===leaver.id&&x.date>B.addDays(today,2)).length;
s=B.change(s,{type:'hr:offboard',person:leaver.id,lastDay:B.addDays(today,2),reason:'Resigned',rehire:true,finalPay:B.addDays(today,2),note:'Two weeks notice'});
assert(!s.shifts.some(x=>x.person===leaver.id&&x.date>B.addDays(today,2)),'later shifts are unassigned');assert.equal(s.business.exits[0].removedShifts,later);
assert(s.team.find(p=>p.id===leaver.id).active,'still active until their last day');
assert.throws(()=>B.change(s,{type:'hr:exit-complete',person:leaver.id}),/on or after/);
const gone=s.team.find(p=>p.active&&p.access==='crew'&&![leaver.id,'priya','newbie'].includes(p.id));
s=B.change(s,{type:'hr:offboard',person:gone.id,lastDay:today,reason:'Let go',rehire:false});
assert.equal(s.team.find(p=>p.id===gone.id).active,false);assert.equal(s.team.find(p=>p.id===gone.id).leftOn,today);assert.equal(s.business.exits.find(x=>x.person===gone.id).status,'Completed');
assert.throws(()=>B.change(s,{type:'hr:offboard',person:s.managerId,lastDay:today,reason:'Resigned'}),/Another manager/);
console.log('PASS: offboarding unassigns shifts, schedules future exits and archives on the last day.');

// Pay history, labor rules and team health.
const rate=s.scheduling.defaults.alex.rate;s=B.change(s,{type:'schedule:defaults',person:'alex',rate:rate+1,sickPaid:false,timeoffPaid:false});
assert(s.business.payHistory.some(h=>h.person==='alex'&&h.from===rate&&h.to===rate+1),'raises are recorded');
const w=s.team.find(p=>p.active&&p.access==='crew'&&p.id!=='newbie').id;
s.timeclock.entries.push({id:'long',person:w,date:B.addDays(today,-1),shiftId:'',in:B.addDays(today,-1)+'T10:00',out:B.addDays(today,-1)+'T18:00',breaks:[],status:'Approved'});
assert(Z.laborIssues(s,B.addDays(today,-2),today).some(x=>x.kind==='meal'&&x.person===w),'8 hours with no break is flagged');
s.shifts.push({id:'clopen-a',date:B.addDays(today,20),service:'Dinner',person:w,start:'16:00',end:'23:30',area:'Floor',breakMinutes:0,payRate:17},{id:'clopen-b',date:B.addDays(today,21),service:'Lunch',person:w,start:'07:00',end:'12:00',area:'Floor',breakMinutes:0,payRate:17});
assert(Z.laborIssues(s,B.addDays(today,7),B.addDays(today,14)).some(x=>x.kind==='rest'&&x.person===w),'a close followed by an early open is flagged');
const h=Z.health(s);assert(h.headcount>0&&h.turnover>=0&&h.tenureDays>0);
console.log('PASS: pay history, meal breaks, rest between shifts and team health.');

// The daily close: sales by service, guests, comps and cash; the reports read average check and comps from it.
let st=mgr(B.starter());
const open=Z.openDays(st,B.addDays(today,-7),today);assert(open.length>=1,'yesterday waits to be closed');
const dayToClose=open[0],ran=[...new Set(st.shifts.filter(x=>x.date===dayToClose).map(x=>x.service))];
assert.throws(()=>B.change(as(st,'alex'),{type:'close:save',date:dayToClose,sales:{[ran[0]]:100},guests:10}),/Only managers/);
assert.throws(()=>B.change(st,{type:'close:save',date:dayToClose,sales:{[ran[0]]:100},guests:2.5}),/whole number/);
const feature=st.specials.find(x=>x.date===dayToClose&&x.active);
if(feature)assert.throws(()=>B.change(st,{type:'close:save',date:dayToClose,sales:{[ran[0]]:1},guests:1,specials:{[feature.id]:1.5}}),/whole numbers/);
st=B.change(st,{type:'close:save',date:dayToClose,sales:Object.fromEntries(ran.map(v=>[v,1000])),guests:80,comps:40,cash:-5,notes:'Busy night.',specials:feature?{[feature.id]:12}:{}});
if(feature)assert.equal(st.business.closes[dayToClose].specials[feature.id],12,'units sold are kept with the close');
assert(st.specials.filter(x=>x.kind==='happy_hour').length>20&&Object.values(st.business.closes).some(c=>Object.keys(c.specials||{}).length),'demo happy hours and units sold');
const closed=st.business.closes[dayToClose];assert.equal(closed.sales,1000*ran.length);assert.equal(closed.guests,80);
assert(!Z.openDays(st,B.addDays(today,-7),today).includes(dayToClose),'closed days leave the list');
const day=Z.pnl(st,dayToClose,dayToClose);assert.equal(day.avgCheck,Math.round(1000*ran.length/80*100)/100);assert.equal(day.compsPct,Math.round(40/(1000*ran.length)*1000)/10);assert.equal(day.cash,-5);
st=B.change(st,{type:'close:reopen',date:dayToClose});assert(!st.business.closes[dayToClose]);
const short=st.orders.find(o=>o.status==='Received'&&(o.receivedQty??o.quantity)<o.quantity);if(short){st=B.change(st,{type:'credit:claim',id:short.id});assert(st.business.credits[short.id]);}
console.log('PASS: daily close, average check, comps and cash, reopening and claimed credits.');
