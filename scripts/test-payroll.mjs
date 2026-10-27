import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const c=vm.createContext({crypto:globalThis.crypto});
for(const file of ['workspace-state','schedule-state','shift-operations-state','demo-history','restaurant-history','planner-state','duties-state','checklist-history','team-chat-state','stock-state','manage-state','payroll-state','writeups-state'])vm.runInContext(readFileSync(new URL('../assets/js/'+file+'.js',import.meta.url),'utf8'),c);
const B=c.Brigly,P=B.payroll,W=B.writeups;
const as=(st,id)=>{const p=st.team.find(x=>x.id===id);return {...st,role:p.access,crewId:p.access==='crew'?id:st.crewId,managerId:p.access==='manager'?id:st.managerId};};
const mgr=st=>({...st,role:'manager'});

// The demo starts on the clock: approved history, entries waiting for approval and earlier paid runs.
let s=B.starter();s.role='manager';
assert(s.timeclock.entries.length>20,'demo time entries');assert(s.payroll.runs.length>=3&&s.payroll.runs.every(r=>r.lines.length&&r.totals.gross>0));
const json=JSON.stringify(s);assert(json.length<4.5e6,'workspace stays inside browser storage');
console.log('PASS: seeded time clock and pay run history.');

// Pay periods.
assert.deepEqual({...P.period(s,'2026-10-26')},{from:'2026-10-26',to:'2026-11-08',payDate:'2026-11-13'});
assert.equal(P.period(s,'2026-11-08').from,'2026-10-26');assert.equal(P.period(s,'2026-10-25').from,'2026-10-12');
s.timeclock.entries=[];s.payroll.runs=[];
const week='2026-11-02',alex=s.team.find(p=>p.id==='alex'),rate=s.scheduling.defaults.alex.rate;
// Overtime: 6 × 7.5 h in one workweek is 45 h, so 5 h of overtime at 1.5×.
for(let i=0;i<6;i++){const d=B.addDays(week,i);s=B.change(s,{type:'clock:edit',id:'w'+i,person:'alex',in:d+'T15:00',out:d+'T22:30',breakMinutes:0,note:'Test'});}
let line=P.calc(s,week,B.addDays(week,6)).lines.find(l=>l.person==='alex');
assert.equal(line.minutes,2700);assert.equal(line.otMinutes,300);
assert.equal(line.gross,Math.round((40*rate+5*rate*1.5)*100)/100,'regular plus overtime at 1.5×');
s=B.change(s,{type:'payroll:settings',frequency:'biweekly',weeklyOvertime:40,dailyOvertime:7,multiplier:1.5,payDelay:5,employerTax:10,grace:5,provider:'Gusto'});
line=P.calc(s,week,B.addDays(week,6)).lines.find(l=>l.person==='alex');
assert.equal(line.otMinutes,180+Math.max(0,2700-180-2400),'daily overtime first, then weekly on the rest');
assert.throws(()=>B.change(s,{type:'payroll:settings',frequency:'monthly'}),/how often/);
s=B.change(s,{type:'payroll:settings',frequency:'biweekly',weeklyOvertime:40,dailyOvertime:0,multiplier:1.5,payDelay:5,employerTax:10,grace:5,provider:'Gusto'});
console.log('PASS: weekly and daily overtime, blended pay and pay settings.');

// The crew clock in against their shift, take a break and clock out.
s.timeclock.entries=[];
const shift=s.shifts.find(x=>x.person==='alex'&&x.date>='2026-10-12'&&x.date<='2026-10-25'&&!B.schedule.absence(s,x)),t=P.shiftTimes(shift);
const shiftOf=(start,m)=>{const d=new Date(start+':00');d.setMinutes(d.getMinutes()+m);return P.stamp(d);};
let crew=B.change(as(s,'alex'),{type:'clock:in',id:'c1',at:shiftOf(t.start,12)});
let e=crew.timeclock.entries.find(x=>x.id==='c1');assert.equal(e.shiftId,shift.id,'clock-in attaches to the shift');
assert(P.flags(crew,e,shiftOf(t.start,60)).some(f=>f.kind==='late'&&f.minutes===12));
assert.throws(()=>B.change(crew,{type:'clock:in',id:'c2',at:shiftOf(t.start,20)}),/already clocked in/);
crew=B.change(crew,{type:'clock:break',at:shiftOf(t.start,120)});crew=B.change(crew,{type:'clock:break',at:shiftOf(t.start,150)});
crew=B.change(crew,{type:'clock:out',at:t.end});e=crew.timeclock.entries.find(x=>x.id==='c1');
assert.equal(e.status,'Pending');assert.equal(P.worked(e),P.between(e.in,e.out)-30,'unpaid break comes off');
assert.throws(()=>B.change(crew,{type:'clock:approve',ids:['c1']}),/Only managers/);
assert.throws(()=>B.change(crew,{type:'payroll:approve',from:'2026-10-12'}),/Only managers/);
s=mgr(crew);
console.log('PASS: clock in against the shift, breaks, clock out and crew limits.');

// Pay run: blocked by open time and unapproved entries, then approve, lock, export, pay.
s=B.change(as(s,'mia'),{type:'clock:in',id:'open1',at:'2026-10-20T16:00'});s=mgr(s);
assert.throws(()=>B.change(s,{type:'payroll:approve',from:'2026-10-12'}),/still open/);
assert(P.flags(s,s.timeclock.entries.find(x=>x.id==='open1'),'2026-10-27T10:00').some(f=>f.kind==='noout'));
assert.equal(P.counted(s,s.timeclock.entries.find(x=>x.id==='open1'),'2026-10-27T10:00'),0,'a forgotten clock-out counts nothing until fixed');
assert.throws(()=>B.change(s,{type:'clock:edit',id:'open1',in:'2026-10-20T16:00',out:'2026-10-20T23:00',breakMinutes:0,note:''}),/reason/);
s=B.change(s,{type:'clock:edit',id:'open1',in:'2026-10-20T16:00',out:'2026-10-20T23:00',breakMinutes:0,note:'Forgot to clock out'});
const fixed=s.timeclock.entries.find(x=>x.id==='open1');assert(fixed.missedOut&&fixed.edits.length===1&&fixed.status==='Approved');
assert.throws(()=>B.change(s,{type:'payroll:approve',from:'2026-10-12'}),/Approve 1 timesheet/);
s=B.change(s,{type:'payroll:approve',from:'2026-10-12',approveTimesheets:true});
let run=P.runFor(s,'2026-10-12');assert.equal(run.status,'Approved');assert(run.lines.some(l=>l.person==='mia'&&l.minutes===420));
assert(s.timeclock.entries.every(x=>x.date<'2026-10-12'||x.date>'2026-10-25'||x.status==='Approved'));
assert.throws(()=>B.change(s,{type:'clock:edit',id:'open1',in:'2026-10-20T16:00',out:'2026-10-20T22:00',breakMinutes:0,note:'Change'}),/approved/);
assert.throws(()=>B.change(s,{type:'payroll:paid',id:run.id}),/Export/);
s=B.change(s,{type:'payroll:reopen',id:run.id});assert(!P.runFor(s,'2026-10-12'));
s=B.change(s,{type:'payroll:approve',from:'2026-10-12'});run=P.runFor(s,'2026-10-12');
s=B.change(s,{type:'payroll:export',id:run.id});s=B.change(s,{type:'payroll:paid',id:run.id});
assert.equal(P.runFor(s,'2026-10-12').status,'Paid');assert.throws(()=>B.change(s,{type:'payroll:reopen',id:run.id}),/cannot be reopened/);
assert.throws(()=>B.change(s,{type:'payroll:approve',from:P.period(s,P.stamp().slice(0,10)).from}),/once it has ended/);
console.log('PASS: pay run readiness, approval locks hours, reopen, export and paid.');

// Warnings and write-ups: written by the manager, templates, issuing, acknowledgment and migration of older records.
s=B.starter();s.role='manager';
assert(!('suggest' in W)&&!('generate' in W),'no suggestions or generated wording');
assert(s.writeupMeta.templates.length>=3,'starter templates');
const crewId=s.team.find(p=>p.active&&p.access==='crew').id,tpl=s.writeupMeta.templates.find(t=>t.id==='tpl-late');
const filled=W.fill(tpl.details,s.team.find(p=>p.id===crewId),'2026-10-20');assert(filled.includes(s.team.find(p=>p.id===crewId).name.split(' ')[0])&&filled.includes('October 20, 2026')&&!filled.includes('{'));
const wuShift=s.shifts.find(x=>x.person===crewId&&x.date<=s.date);
const base={type:'writeup:save',id:'w1',kind:'warning',person:crewId,category:'Punctuality',date:wuShift.date,shiftId:wuShift.id,title:'Late arrival',details:filled,expectations:'Be on time.',nextStep:'A write-up',templateId:'tpl-late',issue:false};
s=B.change(s,base);assert.equal(s.writeups[0].status,'Draft');assert.equal(W.label(s.writeups[0]),'Warning');
assert.throws(()=>B.change(s,{...base,id:'w2',shiftId:s.shifts.find(x=>x.person!==crewId).id}),/one of their shifts/);
assert.throws(()=>B.change(s,{...base,id:'w3',details:'Short by $[amount].',issue:true}),/bracketed/);
assert.throws(()=>B.change(as(s,crewId),{...base,id:'w4'}),/Only managers/);
assert.throws(()=>B.change(s,{...base,id:'w5',person:s.managerId}),/Another manager/);
s=B.change(s,{...base,issue:true});assert.equal(s.writeups[0].status,'Issued');
assert.throws(()=>B.change(s,{...base,title:'Changed'}),/cannot be changed/);assert.throws(()=>B.change(s,{type:'writeup:delete',id:'w1'}),/stay on file/);
s=B.change(s,{...base,id:'w6',kind:'writeup',final:true,category:'Attendance',title:'No-call no-show',details:'Did not come in.',issue:true});
assert.equal(W.label(s.writeups.find(w=>w.id==='w6')),'Final write-up');assert.equal(W.history(s,crewId).length,2);
assert.throws(()=>B.change(as(s,s.team.find(p=>p.access==='crew'&&p.id!==crewId).id),{type:'writeup:ack',id:'w1'}),/Only the team member/);
s=mgr(B.change(as(s,crewId),{type:'writeup:ack',id:'w1',comment:'Understood.'}));assert.equal(s.writeups.find(w=>w.id==='w1').status,'Acknowledged');
s=B.change(s,{type:'writeup:template-save',id:'tpl-new',name:'Uniform',kind:'warning',category:'Policy',title:'Uniform',details:'On {date}, {first} was out of uniform.',expectations:'Wear the full uniform.',nextStep:'A write-up'});
assert(s.writeupMeta.templates.some(t=>t.id==='tpl-new'));assert.throws(()=>B.change(s,{type:'writeup:template-save',id:'tpl-x',name:'uniform',kind:'warning',category:'Policy'}),/already has that name/);
s=B.change(s,{type:'writeup:template-delete',id:'tpl-new'});assert(!s.writeupMeta.templates.some(t=>t.id==='tpl-new'));
// Records written before the split become warnings or write-ups.
const old={...B.starter(),writeups:[{id:'o1',person:crewId,type:'late',level:'Verbal warning',date:'2026-09-01',summary:'Late three times.',expectations:'',consequences:'Next step',status:'Issued',author:'jamie',createdAt:'2026-09-01T00:00:00Z',incidents:[]},{id:'o2',person:crewId,type:'conduct',level:'Final warning',date:'2026-09-10',summary:'Rude to a guest.',expectations:'',consequences:'',status:'Issued',author:'jamie',createdAt:'2026-09-10T00:00:00Z'}]};
const box={getItem:()=>JSON.stringify(old),setItem(){}};const loaded=B.load(box);
const o1=loaded.writeups.find(w=>w.id==='o1'),o2=loaded.writeups.find(w=>w.id==='o2');
assert(o1&&o2,"older records survive loading");{assert.equal(o1.kind,'warning');assert.equal(o1.category,'Punctuality');assert.equal(o1.details,'Late three times.');assert(!('level' in o1));}
{assert.equal(o2.kind,'writeup');assert(o2.final);}
console.log('PASS: manual warnings and write-ups, templates, final write-ups, acknowledgment and migration.');
