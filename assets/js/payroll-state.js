/* Time clock and payroll: clocked hours against the roster, timesheet approval, and pay runs calculated from approved hours. */
(function(){
 'use strict';
 const B=Brigly,prev={change:B.change,starter:B.starter,load:B.load};
 const copy=x=>globalThis.Brigly.clone(x);
 const pad=n=>String(n).padStart(2,'0');
 // Times are local wall-clock stamps (YYYY-MM-DDTHH:MM), like shift dates and times.
 const stamp=(d=new Date())=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
 const isStamp=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(x)&&B.isDate(x.slice(0,10));
 const at=x=>new Date(x+':00').getTime();
 const between=(a,b)=>Math.round((at(b)-at(a))/60000);
 const shiftBy=(a,mins)=>stamp(new Date(at(a)+mins*60000));
 const round=n=>Math.round(n*100)/100;
 const defaults={frequency:'biweekly',anchor:'2026-01-05',weeklyOvertime:40,dailyOvertime:0,multiplier:1.5,payDelay:5,employerTax:10,provider:'your payroll provider',grace:5};
 const settings=s=>({...defaults,...s.payroll?.settings});

 function period(s,date){
  const c=settings(s);
  if(c.frequency==='weekly'){const from=B.monday(date);return {from,to:B.addDays(from,6),payDate:B.addDays(from,6+c.payDelay)};}
  const k=Math.floor(Math.round((new Date(date+'T12:00:00')-new Date(c.anchor+'T12:00:00'))/864e5)/14),from=B.addDays(c.anchor,k*14);
  return {from,to:B.addDays(from,13),payDate:B.addDays(from,13+c.payDelay)};
 }
 const previousPeriod=(s,p)=>period(s,B.addDays(p.from,-1));
 function shiftTimes(x){return {start:x.date+'T'+x.start,end:(x.end<=x.start?B.addDays(x.date,1):x.date)+'T'+x.end};}
 // Worked minutes: clock-in to clock-out, less unpaid breaks. An open entry counts up to now.
 function worked(e,now=stamp()){
  const out=e.out||now,br=typeof e.breakMinutes==='number'?e.breakMinutes:(e.breaks||[]).reduce((n,b)=>n+Math.max(0,between(b.start,b.end||out)),0);
  return Math.max(0,between(e.in,out)-br);
 }
 const counted=(s,e,now=stamp())=>!e.out&&flags(s,e,now).some(f=>f.kind==='noout')?0:worked(e,now);
 const onBreak=e=>!e.out&&(e.breaks||[]).some(b=>!b.end);
 // How one entry compares with the shift it belongs to.
 function flags(s,e,now=stamp()){
  const c=settings(s),x=s.shifts.find(y=>y.id===e.shiftId),out=[];
  if(!x)out.push({kind:'unscheduled',label:'Not on the roster',tone:'amber'});
  const t=x&&shiftTimes(x);
  if(!e.out&&now>(t?shiftBy(t.end,120):shiftBy(e.in,14*60)))out.push({kind:'noout',label:'Missing clock-out',tone:'danger'});
  if(t){
   const late=between(t.start,e.in);if(late>c.grace)out.push({kind:'late',label:late+' min late',tone:'amber',minutes:late});
   if(e.out){const early=between(e.out,t.end);if(early>15)out.push({kind:'early',label:'Left '+early+' min early',tone:'amber',minutes:early});const over=between(t.end,e.out);if(over>30)out.push({kind:'over',label:'Stayed '+over+' min',tone:'slate',minutes:over});}
  }
  if(e.edits?.length)out.push({kind:'edited',label:'Edited',tone:'slate'});
  return out;
 }
 // Scheduled shifts that ended with no clock-in and no reported absence.
 function missing(s,from,to,now=stamp()){
  const clocked=new Set(s.timeclock.entries.map(e=>e.shiftId));
  return s.shifts.filter(x=>x.date>=from&&x.date<=to&&!clocked.has(x.id)&&shiftTimes(x).end<now&&!B.schedule.absence(s,x)&&B.person(x.person)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
 }
 const runFor=(s,from)=>s.payroll.runs.find(r=>r.from===from);
 const locked=(s,date)=>s.payroll.runs.some(r=>date>=r.from&&date<=r.to);
 const rateOf=(s,e)=>s.shifts.find(y=>y.id===e.shiftId)?.payRate??s.scheduling.defaults[e.person]?.rate??0;

 // Pay for a period. Overtime follows the workweek (Monday–Sunday) and, when set, a daily limit first.
 // Overtime is paid on the blended hourly rate when someone works shifts at different rates.
 function calc(s,from,to,source='clock'){
  const c=settings(s),work=[],leave=[];
  if(source==='clock'){for(const e of s.timeclock.entries)if(e.out&&e.date>=from&&e.date<=to)work.push({person:e.person,date:e.date,minutes:worked(e),rate:rateOf(s,e)});}
  for(const x of s.shifts){
   if(x.date<from||x.date>to)continue;const m=B.schedule.metrics(s,x);
   if(source==='roster'&&m.workMinutes)work.push({person:x.person,date:x.date,minutes:m.workMinutes,rate:x.payRate});
   if(m.paidAbsenceMinutes)leave.push({person:x.person,minutes:m.paidAbsenceMinutes,rate:x.payRate});
  }
  const people=[...new Set([...work,...leave].map(x=>x.person))];
  const lines=people.map(person=>{
   const mine=work.filter(x=>x.person===person),weeks=new Map();
   for(const x of mine){const w=B.monday(x.date),wk=weeks.get(w)||{total:0,days:new Map()};wk.total+=x.minutes;wk.days.set(x.date,(wk.days.get(x.date)||0)+x.minutes);weeks.set(w,wk);}
   let ot=0;
   for(const wk of weeks.values()){const daily=c.dailyOvertime?[...wk.days.values()].reduce((n,d)=>n+Math.max(0,d-c.dailyOvertime*60),0):0;ot+=daily+Math.max(0,wk.total-daily-c.weeklyOvertime*60);}
   const minutes=mine.reduce((n,x)=>n+x.minutes,0),straight=mine.reduce((n,x)=>n+x.minutes/60*x.rate,0),rate=minutes?straight/(minutes/60):(s.scheduling.defaults[person]?.rate||0);
   const leaveMinutes=leave.filter(x=>x.person===person).reduce((n,x)=>n+x.minutes,0),leavePay=round(leave.filter(x=>x.person===person).reduce((n,x)=>n+x.minutes/60*x.rate,0));
   const regularPay=round((minutes-ot)/60*rate),overtimePay=round(ot/60*rate*c.multiplier);
   const tips=round(s.scheduling.tips.filter(t=>t.person===person&&t.date>=from&&t.date<=to).reduce((n,t)=>n+t.amount,0));
   return {person,shifts:new Set(mine.map(x=>x.date)).size,minutes,regMinutes:minutes-ot,otMinutes:ot,leaveMinutes,rate:round(rate),regularPay,overtimePay,leavePay,gross:round(regularPay+overtimePay+leavePay),tips};
  }).sort((a,b)=>b.gross-a.gross);
  const sum=k=>lines.reduce((n,l)=>n+l[k],0),gross=round(sum('gross')),employerTax=round(gross*c.employerTax/100);
  return {from,to,lines,totals:{people:lines.length,minutes:sum('minutes'),otMinutes:sum('otMinutes'),leaveMinutes:sum('leaveMinutes'),gross,tips:round(sum('tips')),overtimePay:round(sum('overtimePay')),employerTax,cost:round(gross+employerTax)}};
 }
 // What stands between a period and an approved pay run.
 function readiness(s,from,to){
  const entries=s.timeclock.entries.filter(e=>e.date>=from&&e.date<=to);
  const paid=calc(s,from,to).lines.map(l=>s.team.find(p=>p.id===l.person)).filter(Boolean);
  return {open:entries.filter(e=>!e.out),pending:entries.filter(e=>e.out&&e.status!=='Approved'),missing:missing(s,from,to),
   payment:paid.filter(p=>!p.hr?.payMethod||(p.hr.payMethod==='Direct deposit'&&!p.hr.accountLast4)),w4:paid.filter(p=>!p.hr?.w4Date)};
 }
 function makeRun(s,from,to,source,status,by,now){
  const p=period(s,from),r=calc(s,from,to,source);
  return {id:'run-'+from,from,to,payDate:p.payDate,status,lines:r.lines,totals:r.totals,approvedBy:by,approvedAt:now,...(status==='Paid'?{exportedAt:now,paidAt:now}:{})};
 }

 function upgrade(state){
  const s=copy(state);
  s.timeclock||={entries:[]};s.payroll||={settings:{},runs:[]};s.payroll.settings||={};s.payroll.runs||=[];
  return s;
 }
 function change(state,a,role=state.role){
  if(!/^(clock|payroll):/.test(a.type))return prev.change(state,a,role);
  const s=upgrade(state),me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',now=isStamp(a.at)?a.at:stamp(),iso=new Date().toISOString();
  const needManager=()=>{if(!manager)throw Error('Only managers can change timesheets and payroll.');};
  const entry=id=>{const e=s.timeclock.entries.find(x=>x.id===id);if(!e)throw Error('This time entry no longer exists.');return e;};
  const open=s.timeclock.entries.find(e=>e.person===me&&!e.out);
  const unlocked=date=>{if(locked(s,date))throw Error('This pay period is approved. Reopen the pay run to change its hours.');};
  if(a.type==='clock:in'){
   if(open)throw Error('You are already clocked in.');
   if(typeof a.id!=='string'||!/^[\w-]{1,80}$/.test(a.id))throw Error('Clock-in could not be saved.');
   // Clock-ins attach to the shift that is about to start or under way.
   const x=s.shifts.filter(y=>y.person===me&&!B.schedule.absence(s,y)&&!s.timeclock.entries.some(e=>e.shiftId===y.id)).find(y=>{const t=shiftTimes(y);return now>=shiftBy(t.start,-90)&&now<=t.end;});
   const date=x?.date||now.slice(0,10);unlocked(date);
   s.timeclock.entries.push({id:a.id,person:me,date,shiftId:x?.id||'',in:now,out:'',breaks:[],status:'Open'});
  }else if(a.type==='clock:break'){
   if(!open)throw Error('Clock in first.');
   const b=open.breaks.find(x=>!x.end);if(b)b.end=now;else open.breaks.push({start:now,end:''});
  }else if(a.type==='clock:out'){
   if(!open)throw Error('You are not clocked in.');
   for(const b of open.breaks)if(!b.end)b.end=now;
   if(now<=open.in)throw Error('Clock-out must be after clock-in.');
   open.out=now;open.status='Pending';
  }else if(a.type==='clock:edit'){
   needManager();
   if(typeof a.note!=='string'||!a.note.trim()||a.note.length>300)throw Error('Add a short reason for the change.');
   if(!isStamp(a.in)||(a.out&&!isStamp(a.out)))throw Error('Enter a valid clock-in and clock-out.');
   if(a.out&&a.out<=a.in)throw Error('Clock-out must be after clock-in.');
   const brk=Number(a.breakMinutes||0);if(!Number.isInteger(brk)||brk<0||(a.out&&brk>=between(a.in,a.out)))throw Error('Breaks must be whole minutes and shorter than the time worked.');
   let e=s.timeclock.entries.find(x=>x.id===a.id);
   if(e){unlocked(e.date);}
   else{
    if(!s.team.some(p=>p.id===a.person))throw Error('Choose a team member.');
    if(typeof a.id!=='string'||!/^[\w-]{1,80}$/.test(a.id))throw Error('This entry could not be saved.');
    const x=s.shifts.find(y=>y.id===a.shiftId&&y.person===a.person);
    e={id:a.id,person:a.person,date:x?.date||a.in.slice(0,10),shiftId:x?.id||'',in:a.in,out:'',breaks:[],status:'Open',edits:[]};unlocked(e.date);s.timeclock.entries.push(e);
   }
   const before={in:e.in,out:e.out,breakMinutes:typeof e.breakMinutes==='number'?e.breakMinutes:(e.breaks||[]).reduce((n,b)=>n+(b.end?between(b.start,b.end):0),0)};
   // Fixing a forgotten clock-out is remembered, so repeated misses can be followed up.
   if(!e.out&&a.out&&flags(s,e,now).some(f=>f.kind==='noout'))e.missedOut=true;
   Object.assign(e,{in:a.in,out:a.out||'',breakMinutes:brk,status:a.out?'Approved':'Open',approvedBy:a.out?me:''});
   e.edits=[...(e.edits||[]),{by:me,at:iso,note:a.note.trim(),before}];
  }else if(a.type==='clock:approve'){
   needManager();
   for(const id of [].concat(a.ids||[])){const e=entry(id);if(!e.out)throw Error('Someone is still clocked in. Clock them out before approving.');unlocked(e.date);e.status='Approved';e.approvedBy=me;}
  }else if(a.type==='clock:delete'){
   needManager();const e=entry(a.id);unlocked(e.date);
   if(typeof a.note!=='string'||!a.note.trim())throw Error('Add a short reason for removing this entry.');
   s.timeclock.entries=s.timeclock.entries.filter(x=>x.id!==a.id);
  }else if(a.type==='payroll:settings'){
   needManager();const c={...settings(s)};
   if(!['weekly','biweekly'].includes(a.frequency))throw Error('Choose how often you pay.');
   const n=(v,min,max,label)=>{const x=Number(v);if(!Number.isFinite(x)||x<min||x>max)throw Error('Check '+label+'.');return x;};
   Object.assign(c,{frequency:a.frequency,weeklyOvertime:n(a.weeklyOvertime,1,80,'weekly overtime'),dailyOvertime:n(a.dailyOvertime||0,0,24,'daily overtime'),multiplier:n(a.multiplier,1,3,'the overtime rate'),payDelay:n(a.payDelay,0,14,'the pay date'),employerTax:n(a.employerTax,0,40,'employer taxes'),grace:n(a.grace,0,30,'the late grace period'),provider:String(a.provider||'').trim().slice(0,60)||defaults.provider});
   if(s.payroll.runs.some(r=>r.status!=='Paid')&&c.frequency!==settings(s).frequency)throw Error('Finish open pay runs before changing how often you pay.');
   s.payroll.settings=c;
  }else if(a.type==='payroll:approve'){
   needManager();const p=period(s,a.from);
   if(p.from!==a.from)throw Error('Choose a pay period.');if(runFor(s,p.from))throw Error('This pay period is already approved.');
   if(p.to>=now.slice(0,10))throw Error('Approve a pay period once it has ended.');
   const r=readiness(s,p.from,p.to);
   if(r.open.length)throw Error(`${r.open.length} time ${r.open.length===1?'entry is':'entries are'} still open. Clock them out first.`);
   if(r.pending.length&&!a.approveTimesheets)throw Error(`Approve ${r.pending.length} timesheet ${r.pending.length===1?'entry':'entries'} first.`);
   for(const e of r.pending){e.status='Approved';e.approvedBy=me;}
   s.payroll.runs.push(makeRun(s,p.from,p.to,'clock','Approved',me,iso));
  }else if(['payroll:export','payroll:paid','payroll:reopen'].includes(a.type)){
   needManager();const r=s.payroll.runs.find(x=>x.id===a.id);if(!r)throw Error('This pay run no longer exists.');
   if(a.type==='payroll:export'){if(r.status==='Paid')throw Error('This pay run is already paid.');r.status='Exported';r.exportedAt=iso;}
   if(a.type==='payroll:paid'){if(r.status!=='Exported')throw Error('Export the pay run before marking it paid.');r.status='Paid';r.paidAt=iso;}
   if(a.type==='payroll:reopen'){if(r.status==='Paid')throw Error('Paid runs cannot be reopened. Correct it in the next pay run.');s.payroll.runs=s.payroll.runs.filter(x=>x!==r);}
  }else throw Error('Unknown payroll change.');
  return s;
 }

 // The demo restaurant has been on the clock since the last pay period: a few late arrivals, one missed clock-out,
 // one shift with no clock-in, approved history and earlier pay runs already paid.
 function seed(state){
  const s=upgrade(state);if(s.timeclock.entries.length||s.payroll.runs.length)return s;
  const now=stamp(),today=now.slice(0,10),cur=period(s,today),last=previousPeriod(s,cur),manager=s.team.find(p=>p.active&&p.access==='manager')?.id||s.managerId;
  const hash=x=>[...x].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const crew=s.team.filter(p=>p.active&&p.access==='crew'),latecomer=(crew.find(p=>p.area==='Bar')||crew[0])?.id;
  const shifts=s.shifts.filter(x=>x.date>=last.from&&shiftTimes(x).start<=now&&!B.schedule.absence(s,x)&&s.team.find(p=>p.id===x.person)?.active).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  // Until the last period's pay date, its hours still wait for approval; after it, they were paid.
  const waiting=last.payDate>=today,pendingFrom=waiting?last.from:cur.from;
  let skipped=false,forgot=false;
  for(const x of shifts){
   const h=hash(x.id),t=shiftTimes(x),current=x.date>=pendingFrom,lateReq=B.schedule.metrics(s,x).late;
   if(current&&!skipped&&x.date<today&&x.person!==manager&&x.person!==latecomer&&h%5===0){skipped=true;continue;}
   const lateBy=lateReq?lateReq.minutes:x.person===latecomer&&h%3===0?9+h%12:h%19===0?6+h%5:-(h%7);
   const e={id:'tc-'+x.id,person:x.person,date:x.date,shiftId:x.id,in:shiftBy(t.start,lateBy),out:'',breaks:[],status:current&&x.date>=B.addDays(today,-4)?'Pending':'Approved',...(current&&x.date>=B.addDays(today,-4)?{}:{approvedBy:manager})};
   if(x.breakMinutes)e.breaks=[{start:shiftBy(t.start,180),end:shiftBy(t.start,180+x.breakMinutes)}];
   const outAt=shiftBy(t.end,h%23===0?40+h%40:(h%13)-4);
   if(outAt<=now){
    if(current&&!forgot&&x.date<today&&x.person!==manager&&h%4===1){forgot=true;e.status='Open';}
    else e.out=outAt;
   }else e.status='Open';
   s.timeclock.entries.push(e);
  }
  // Earlier periods were paid from the roster, before the time clock started.
  if(!waiting)s.payroll.runs.push(makeRun(s,last.from,last.to,'clock','Paid',manager,new Date(last.payDate+'T12:00:00').toISOString()));
  let p=previousPeriod(s,last);
  for(let i=0;i<6&&p.from>=(s.demoHistory?.from||B.addDays(today,-200));i++){s.payroll.runs.push(makeRun(s,p.from,p.to,'roster','Paid',manager,new Date(p.payDate+'T12:00:00').toISOString()));p=previousPeriod(s,p);}
  return s;
 }
 B.starter=(...args)=>seed(prev.starter(...args));
 B.load=storage=>seed(prev.load(storage));
 B.change=change;
 B.payroll={stamp,isStamp,between,shiftTimes,worked,counted,onBreak,flags,missing,period,previousPeriod,settings,calc,readiness,runFor,locked};
})();
