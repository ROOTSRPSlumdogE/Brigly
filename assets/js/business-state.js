/* The business side of the restaurant: sales and prime cost, time off balances, onboarding, reviews and recognition,
   skills and training, exits, pay history and labor rules. Each one reads from the roster, time clock, HR files and stock. */
(function(){
 'use strict';
 const B=Brigly,prev={change:B.change,starter:B.starter,load:B.load};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const round=n=>Math.round(n*100)/100;
 const today=()=>B.payroll.stamp().slice(0,10);
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const id=x=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x);
 const days=(a,b)=>Math.round((new Date(b+'T12:00:00')-new Date(a+'T12:00:00'))/864e5);
 const defaults={sickPer:30,sickHours:1,sickCap:40,ptoPer:40,ptoHours:1,ptoCap:80,ptoTypes:['Full-time'],mealAfter:6,mealMinutes:30,restHours:10,minorWeekly:18,minorLate:'22:00'};
 const rules=s=>({...defaults,...s.business?.rules});
 const person=(s,pid)=>s.team.find(p=>p.id===pid);

 // Sales and prime cost. Labor includes the employer tax estimate; purchases are deliveries received in Stock.
 const salesIn=(s,from,to)=>s.business.sales.filter(x=>x.date>=from&&x.date<=to);
 function pnl(s,from,to){
  const sales=round(salesIn(s,from,to).reduce((n,x)=>n+x.amount,0)),tax=(B.payroll?.settings(s).employerTax||0)/100;
  let wages=0,minutes=0;for(const x of s.shifts){if(x.date<from||x.date>to)continue;const m=B.schedule.metrics(s,x);wages+=m.wages;minutes+=m.workMinutes;}
  const labor=round(wages*(1+tax)),purchases=round(s.orders.filter(o=>o.status==='Received'&&(o.receivedAt||'').slice(0,10)>=from&&(o.receivedAt||'').slice(0,10)<=to).reduce((n,o)=>n+(o.receivedQty??o.quantity)*(o.cost||0),0));
  const covers=s.reservations.filter(r=>r.date>=from&&r.date<=to&&!['Cancelled','No-show'].includes(r.status)).reduce((n,r)=>n+r.guests,0);
  const pct=x=>sales?Math.round(x/sales*1000)/10:0;
  const closed=Object.entries(s.business.closes||{}).filter(([d])=>d>=from&&d<=to).map(([,c])=>c),closedSales=closed.reduce((n,c)=>n+(c.sales||0),0);
  const guests=closed.reduce((n,c)=>n+(c.guests||0),0),comps=round(closed.reduce((n,c)=>n+(c.comps||0),0)),cash=round(closed.reduce((n,c)=>n+(c.cash||0),0));
  return {guests,avgCheck:guests?round(closedSales/guests):0,comps,compsPct:closedSales?Math.round(comps/closedSales*1000)/10:0,cash,closedDays:closed.length,from,to,sales,labor,wages:round(wages),hours:minutes/60,purchases,prime:round(labor+purchases),laborPct:pct(labor),foodPct:pct(purchases),primePct:pct(labor+purchases),splh:minutes?round(sales/(minutes/60)):0,covers,days:new Set(salesIn(s,from,to).map(x=>x.date)).size};
 }
 // Services that ran but have no sales entered yet.
 function missingSales(s,from,to){
  const now=B.payroll.stamp(),have=new Set(s.business.sales.map(x=>x.date+'|'+x.service)),seen=new Set(),out=[];
  for(const x of s.shifts){if(x.date<from||x.date>to)continue;const k=x.date+'|'+x.service;if(seen.has(k)||have.has(k))continue;seen.add(k);const v=s.setup.services.find(y=>y.name===x.service);if(!v)continue;const end=(v.end<=v.start?B.addDays(x.date,1):x.date)+'T'+v.end;if(end<now)out.push({date:x.date,service:x.service});}
  return out.sort((a,b)=>(a.date+a.service).localeCompare(b.date+b.service));
 }

 function openDays(s,from,to){
  const now=B.payroll.stamp(),out=new Set();
  for(const x of s.shifts){if(x.date<from||x.date>to||s.business.closes?.[x.date])continue;const v=s.setup.services.find(y=>y.name===x.service);if(!v)continue;const end=(v.end<=v.start?B.addDays(x.date,1):x.date)+'T'+v.end;if(end<now)out.add(x.date);}
  return [...out].sort().reverse();
 }
 // Time off balances accrue from hours worked: clocked hours where the time clock ran, the roster before it.
 function worked(s,pid,from,to){
  const entries=s.timeclock?.entries||[],start=entries.reduce((m,e)=>!m||e.date<m?e.date:m,'')||B.addDays(to,1);let min=0;
  for(const x of s.shifts)if(x.person===pid&&x.date>=from&&x.date<=to&&x.date<start)min+=B.schedule.metrics(s,x).workMinutes;
  for(const e of entries)if(e.person===pid&&e.out&&e.date>=from&&e.date<=to&&e.date>=start)min+=B.payroll.worked(e);
  return min/60;
 }
 function balance(s,pid,kind){
  const r=rules(s),p=person(s,pid),year=today().slice(0,4)+'-01-01',from=p?.joinedOn&&p.joinedOn>year?p.joinedOn:year;
  if(kind==='pto'&&!r.ptoTypes.includes(p?.hr?.employmentType||'Full-time'))return {eligible:false};
  const per=kind==='sick'?r.sickPer:r.ptoPer,rate=kind==='sick'?r.sickHours:r.ptoHours,cap=kind==='sick'?r.sickCap:r.ptoCap;
  const hours=worked(s,pid,from,today()),accrued=round(Math.floor(hours/per)*rate);
  let used=0;for(const x of s.shifts){if(x.person!==pid||x.date<from||x.date>today())continue;const m=B.schedule.metrics(s,x);if(m.absence?.paid&&(kind==='sick'?m.absence.kind==='sick':m.absence.kind==='timeoff'))used+=m.paidAbsenceMinutes/60;}
  const adjusted=round(s.business.leave.filter(a=>a.person===pid&&a.kind===kind&&a.date>=from).reduce((n,a)=>n+a.hours,0));
  const raw=accrued+adjusted-used;
  return {eligible:true,hours:round(hours),accrued,used:round(used),adjusted,balance:round(cap?Math.min(cap,raw):raw),cap,per,rate};
 }

 // Onboarding: most steps tick themselves off from the records they depend on.
 const steps=[
  ['contact','Contact details and emergency contact','Paperwork','HR file',(s,p)=>!!(p.phone&&p.emergency)],
  ['w4','W-4 on file','Paperwork','HR file',(s,p)=>!!p.hr?.w4Date],
  ['i9','I-9 verified','Paperwork','HR file',(s,p)=>!!p.hr?.i9Date],
  ['pay','Payment details','Paperwork','HR file',(s,p)=>!!p.hr?.payMethod&&(p.hr.payMethod!=='Direct deposit'||!!p.hr.accountLast4)],
  ['handbook','Handbook acknowledged','Paperwork','HR file',(s,p)=>!!p.hr?.handbookDate],
  ['cert','Food handler card','Paperwork','HR file',(s,p)=>!!p.hr?.foodHandlerExpires&&p.hr.foodHandlerExpires>=today()],
  ['logins','Brigly and POS logins','Set-up','Manual',null],
  ['uniform','Uniform, apron and locker','Set-up','Manual',null],
  ['training','Training shifts on the roster','Training','the roster',(s,p)=>s.shifts.filter(x=>x.person===p.id).length>=2],
  ['skill','Signed off on their position','Training','the training matrix',(s,p)=>(s.business.skills.levels[p.id]?.[p.role]||0)>=2],
  ['clock','First shift clocked','First weeks','the time clock',(s,p)=>(s.timeclock?.entries||[]).some(e=>e.person===p.id&&e.out)],
  ['checklist','First checklist task done','First weeks','checklists',(s,p)=>Object.values(s.checks||{}).some(o=>Object.values(o||{}).some(c=>c?.by===p.id))],
  ['briefing','Read a shift briefing','First weeks','briefings',(s,p)=>s.briefings.some(b=>b.acks.includes(p.id))],
  ['checkin','30-day check-in','First weeks','reviews',(s,p)=>s.business.reviews.some(r=>r.person===p.id&&r.status!=='Draft')]
 ];
 function onboarding(s,pid){
  const p=person(s,pid),o=s.business.onboarding[pid];if(!p||!o)return null;
  const list=steps.map(([key,label,group,source,auto])=>{const done=auto?auto(s,p):!!o.manual?.[key];return {key,label,group,source,auto:!!auto,done,at:o.manual?.[key]||''};});
  return {person:pid,startedAt:o.startedAt,closedAt:o.closedAt||'',steps:list,done:list.filter(x=>x.done).length,pct:Math.round(list.filter(x=>x.done).length/list.length*100),day:p.joinedOn?days(p.joinedOn,today()):0};
 }
 const onboarding_active=s=>Object.keys(s.business.onboarding).filter(k=>!s.business.onboarding[k].closedAt&&person(s,k)?.active);

 // Performance: each review starts from the person's actual record for the period.
 function record(s,pid,from,to){
  const shifts=s.shifts.filter(x=>x.person===pid&&x.date>=from&&x.date<=to&&x.date<=today());
  const worked=shifts.filter(x=>!B.schedule.absence(s,x)),entries=(s.timeclock?.entries||[]).filter(e=>e.person===pid&&e.date>=from&&e.date<=to);
  const late=worked.filter(x=>{const e=entries.find(y=>y.shiftId===x.id);return e?B.payroll.flags(s,e).some(f=>f.kind==='late'):!!B.schedule.metrics(s,x).late;}).length;
  const sick=shifts.filter(x=>B.schedule.absence(s,x)?.kind==='sick').length;
  const tasks=Object.entries(s.checks||{}).reduce((n,[k,o])=>k.slice(0,10)>=from&&k.slice(0,10)<=to?n+Object.values(o||{}).filter(c=>c?.by===pid).length:n,0);
  const briefs=s.briefings.filter(b=>b.date>=from&&b.date<=to&&s.shifts.some(x=>x.person===pid&&x.date===b.date&&x.service===b.service));
  return {from,to,shifts:worked.length,hours:round(worked.reduce((n,x)=>n+B.schedule.metrics(s,x).workMinutes,0)/60),onTime:worked.length?Math.round((1-late/worked.length)*100):100,late,sick,tasks,
   briefings:briefs.length?Math.round(briefs.filter(b=>b.acks.includes(pid)).length/briefs.length*100):null,notes:(s.shiftNotes||[]).filter(n=>n.author===pid&&n.date>=from&&n.date<=to).length,
   reports86:s.unavailable.filter(u=>u.author===pid&&u.date>=from&&u.date<=to).length,kudos:s.business.kudos.filter(k=>k.person===pid&&k.at.slice(0,10)>=from&&k.at.slice(0,10)<=to).length,
   writeups:(s.writeups||[]).filter(w=>w.person===pid&&w.status!=='Draft'&&w.date>=from&&w.date<=to).length};
 }
 const ratings=[['reliability','Reliability','Shows up on time and ready'],['craft','Skill at their station','Quality, speed and knowledge'],['teamwork','Teamwork','Helps others and communicates'],['guests','Guest care','Warm, attentive and accurate']];
 const scale=['','Needs work','Developing','Meets expectations','Strong','Outstanding'];
 // Reviews that are due: a 30- and 90-day check-in for new hires, then once a year on their anniversary.
 function due(s){
  const t=today(),out=[];
  for(const p of s.team.filter(p=>p.active&&p.access==='crew'&&p.joinedOn)){
   const mine=s.business.reviews.filter(r=>r.person===p.id),has=kind=>mine.some(r=>r.kind===kind),last=mine.map(r=>r.date).sort().at(-1);
   const tenure=days(p.joinedOn,t);let kind=null,date=null;
   if(tenure>=16&&tenure<=60&&!has('30-day check-in')){kind='30-day check-in';date=B.addDays(p.joinedOn,30);}
   else if(tenure>=76&&tenure<=120&&!has('90-day review')){kind='90-day review';date=B.addDays(p.joinedOn,90);}
   else if(tenure<300){continue;}
   else{const anniversary=t.slice(0,4)+p.joinedOn.slice(4),next=anniversary<B.addDays(t,-30)?B.addDays(anniversary,365):anniversary;if(next!==p.joinedOn&&(!last||days(last,next)>300)){kind='Annual review';date=next;}}
   if(kind&&days(t,date)<=14)out.push({person:p.id,kind,date,overdue:date<t});
  }
  return out.sort((a,b)=>a.date.localeCompare(b.date));
 }
 // Draft wording from the record, for the manager to edit.
 function draft(s,pid,rec){
  const p=person(s,pid),first=p?.name.split(' ')[0]||'They',good=[],grow=[];
  if(rec.onTime>=95)good.push(`Reliable: on time for ${rec.onTime}% of ${rec.shifts} shifts.`);else if(rec.late)grow.push(`Punctuality: late for ${rec.late} of ${rec.shifts} shifts. Aim to be clocked in at the start time every shift.`);
  if(rec.tasks>=10)good.push(`Completed ${rec.tasks} checklist tasks, keeping the ${p?.area||'station'} set up and closed properly.`);else grow.push('Take more ownership of opening and closing checklists.');
  if(rec.briefings!==null)(rec.briefings>=90?good:grow).push(rec.briefings>=90?`Reads shift briefings: ${rec.briefings}% confirmed.`:`Read and confirm every pre-shift briefing (${rec.briefings}% so far).`);
  if(rec.kudos)good.push(`Recognized by the team ${rec.kudos} ${rec.kudos===1?'time':'times'}.`);
  if(rec.reports86)good.push(`Flagged ${rec.reports86} 86 ${rec.reports86===1?'item':'items'} early, which protects guests and the kitchen.`);
  if(rec.writeups)grow.push(`${rec.writeups} write-up${rec.writeups===1?'':'s'} in this period. Keep following the agreed expectations.`);
  const r=x=>Math.max(1,Math.min(5,x));
  return {ratings:{reliability:r(rec.onTime>=97?5:rec.onTime>=92?4:rec.onTime>=85?3:2),craft:3,teamwork:r(3+(rec.kudos?1:0)),guests:3},strengths:good.join('\n')||`[What ${first} does well, with examples.]`,improve:grow.join('\n')||`[One or two things ${first} can work on.]`,goals:`[Two or three goals for the next period, and the support ${first} will get.]`};
 }

 // Skills and training. Required skills must be on every service.
 const levels=['Not trained','In training','Trained','Trainer'];
 function coverage(s,from,to){
  const req=s.business.skills.required,out=[],seen=new Set();
  for(const x of s.shifts.filter(x=>x.date>=from&&x.date<=to).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))){
   const k=x.date+'|'+x.service;if(seen.has(k))continue;seen.add(k);
   const team=s.shifts.filter(y=>y.date===x.date&&y.service===x.service&&!B.schedule.absence(s,y)).map(y=>y.person);
   for(const skill of req)if(!team.some(pid=>(s.business.skills.levels[pid]?.[skill]||0)>=2))out.push({date:x.date,service:x.service,skill,team});
  }
  return out;
 }

 // Labor rules from the time clock and the roster.
 function laborIssues(s,from,to){
  const r=rules(s),out=[],P=B.payroll;
  for(const e of s.timeclock?.entries||[]){
   if(!e.out||e.date<from||e.date>to)continue;const w=P.worked(e),brk=typeof e.breakMinutes==='number'?e.breakMinutes:(e.breaks||[]).reduce((n,b)=>n+(b.end?P.between(b.start,b.end):0),0);
   if(w>r.mealAfter*60&&brk<r.mealMinutes)out.push({kind:'meal',person:e.person,date:e.date,text:`Worked ${Math.round(w/6)/10} h with ${brk?brk+' min':'no'} break`});
  }
  const until=B.addDays(to,14);
  for(const p of s.team.filter(p=>p.active)){
   const mine=s.shifts.filter(x=>x.person===p.id&&x.date>=from&&x.date<=until&&!B.schedule.absence(s,x)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
   for(let i=1;i<mine.length;i++){const a=P.shiftTimes(mine[i-1]),b=P.shiftTimes(mine[i]),gap=P.between(a.end,b.start)/60;if(gap>=0&&gap<r.restHours)out.push({kind:'rest',person:p.id,date:mine[i].date,text:`${Math.round(gap*10)/10} h between ${mine[i-1].service.toLowerCase()} and ${mine[i].service.toLowerCase()}`,upcoming:mine[i].date>=today()});}
   const born=p.hr?.birthDate;if(!born)continue;
   const minor=d=>days(born,d)<18*365.25;
   const weeks=new Map();for(const x of mine){if(!minor(x.date))continue;const t=P.shiftTimes(x);if(t.end.slice(11)>r.minorLate||t.end.slice(0,10)>x.date)out.push({kind:'minor',person:p.id,date:x.date,text:`Under 18, scheduled until ${x.end}`,upcoming:x.date>=today()});const w=B.monday(x.date);weeks.set(w,(weeks.get(w)||0)+B.schedule.metrics(s,x).scheduledMinutes);}
   for(const [w,m] of weeks)if(m>r.minorWeekly*60)out.push({kind:'minor',person:p.id,date:w,text:`Under 18, ${Math.round(m/60)} h scheduled the week of ${w}`});
  }
  return out;
 }

 // Team health: turnover, tenure and hires over the last 12 months.
 function health(s){
  const t=today(),year=B.addDays(t,-365),active=s.team.filter(p=>p.active),left=s.team.filter(p=>p.leftOn&&p.leftOn>=year&&p.leftOn<=t);
  const tenure=active.filter(p=>p.joinedOn).map(p=>days(p.joinedOn,t)),avg=tenure.length?tenure.reduce((n,x)=>n+x,0)/tenure.length:0;
  return {headcount:active.length,hires:active.filter(p=>p.joinedOn&&p.joinedOn>=B.addDays(t,-90)).length,left:left.length,turnover:active.length?Math.round(left.length/((active.length+left.length/2)||1)*100):0,tenureDays:Math.round(avg),reasons:s.business.exits.filter(x=>x.lastDay>=year).reduce((m,x)=>m.set(x.reason,(m.get(x.reason)||0)+1),new Map())};
 }

 function upgrade(state){
  const s=copy(state);s.business||={};const b=s.business;
  b.rules||={};b.sales||=[];b.closes||={};b.leave||=[];b.onboarding||={};b.reviews||=[];b.kudos||=[];b.exits||=[];b.payHistory||=[];
  b.skills||={list:[...new Set([...s.setup.roles,'Opening lead','Closing lead','Cash handling','Allergen trained'])],required:['Closing lead'],levels:{}};
  return s;
 }
 function change(state,a,role=state.role){
  const types=/^(sales|close|credit|leave|onboard|review|kudos|skill|hr|rules):/;
  if(!types.test(a.type)){
   const s0=state.business?state:upgrade(state),old=s0.team.find(p=>p.id===a.id),oldRate=a.type==='schedule:defaults'?s0.scheduling.defaults[a.person]?.rate:null;
   let s=prev.change(s0,a,role);
   const isNew=a.type==='ops:member'&&!old&&s.team.some(p=>p.id===a.id),raise=a.type==='schedule:defaults'&&oldRate!==null&&oldRate!==a.rate;
   if(!isNew&&!raise)return s.business?s:upgrade(s);
   s={...s,business:copy(s.business||upgrade(s).business)};
   // New teammates start onboarding; pay changes are kept as a history.
   if(isNew)s.business.onboarding[a.id]={startedAt:new Date().toISOString(),manual:{}};
   if(raise)s.business.payHistory.push({person:a.person,date:today(),from:oldRate,to:a.rate,by:B.actor(role,s.crewId,s.managerId)});
   return s;
  }
  const s=upgrade(state),me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',now=new Date().toISOString(),b=s.business;
  const needManager=()=>{if(!manager)throw Error('Only managers can make this change.');};
  const who=pid=>{const p=person(s,pid);if(!p)throw Error('Choose a team member.');return p;};
  if(a.type==='sales:put'){
   needManager();if(!B.isDate(a.date)||!s.setup.services.some(v=>v.name===a.service))throw Error('Choose a date and service.');
   const n=Number(a.amount);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Enter the net sales for the service.');
   b.sales=b.sales.filter(x=>!(x.date===a.date&&x.service===a.service));b.sales.push({date:a.date,service:a.service,amount:round(n),by:me,at:now});
  }else if(a.type==='close:save'){
   // The daily close: sales by service, guests, comps and discounts, cash over or short and the manager's notes.
   needManager();if(!B.isDate(a.date))throw Error('Choose the day to close.');
   const num=(v,min,max,label)=>{const n=Number(v);if(v===''||v===null||v===undefined)return 0;if(!Number.isFinite(n)||n<min||n>max)throw Error('Check '+label+'.');return round(n);};
   const entries=Object.entries(a.sales||{});if(!entries.length)throw Error('Enter sales for at least one service.');
   for(const [svc,v] of entries){if(!s.setup.services.some(x=>x.name===svc))throw Error('Unknown service.');const n=num(v,0,1000000,'the sales for '+svc);b.sales=b.sales.filter(x=>!(x.date===a.date&&x.service===svc));b.sales.push({date:a.date,service:svc,amount:n,by:me,at:now});}
   const total=round(b.sales.filter(x=>x.date===a.date).reduce((n,x)=>n+x.amount,0)),guests=num(a.guests,0,100000,'the guest count');
   if(!Number.isInteger(guests))throw Error('Guests must be a whole number.');if(!txt(a.notes||'',3000))throw Error('Keep the notes shorter.');
   const sold={};for(const [sid,v] of Object.entries(a.specials||{})){if(v===''||v===null||v===undefined)continue;const sp=s.specials.find(x=>x.id===sid&&x.date===a.date);if(!sp)throw Error('That special did not run that day.');const n=Number(v);if(!Number.isInteger(n)||n<0||n>100000)throw Error('Units sold must be whole numbers.');sold[sid]=n;}
   b.closes[a.date]={specials:sold,sales:total,guests,comps:num(a.comps,0,1000000,'comps and discounts'),cash:num(a.cash,-100000,100000,'cash over or short'),notes:(a.notes||'').trim(),closedBy:me,closedAt:now};
  }else if(a.type==='close:reopen'){
   needManager();if(!b.closes[a.date])throw Error('That day is not closed.');delete b.closes[a.date];
  }else if(a.type==='credit:claim'){
   needManager();const o=s.orders.find(x=>x.id===a.id);if(!o)throw Error('This delivery no longer exists.');b.credits||={};if(a.claimed===false)delete b.credits[o.id];else b.credits[o.id]=today();
  }else if(a.type==='rules:set'){
   needManager();const r={...rules(s)},num=(k,min,max)=>{if(a[k]===undefined)return;const v=Number(a[k]);if(!Number.isFinite(v)||v<min||v>max)throw Error('Check the policy numbers.');r[k]=v;};
   num('sickPer',1,200);num('sickHours',0,10);num('sickCap',0,500);num('ptoPer',1,200);num('ptoHours',0,10);num('ptoCap',0,1000);num('mealAfter',1,12);num('mealMinutes',0,120);num('restHours',0,16);num('minorWeekly',1,60);
   if(a.ptoTypes!==undefined){const list=[].concat(a.ptoTypes).filter(x=>B.hr.options.employmentType.includes(x));r.ptoTypes=list;}
   if(a.minorLate!==undefined){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(a.minorLate))throw Error('Choose a time.');r.minorLate=a.minorLate;}
   b.rules=r;
  }else if(a.type==='leave:adjust'){
   needManager();who(a.person);if(!['sick','pto'].includes(a.kind))throw Error('Choose sick leave or paid time off.');
   const h=Number(a.hours);if(!Number.isFinite(h)||!h||Math.abs(h)>500)throw Error('Enter the hours to add or remove.');
   if(!txt(a.note,200)||!a.note.trim())throw Error('Add a short reason.');
   b.leave.push({id:a.id||crypto.randomUUID(),person:a.person,kind:a.kind,hours:round(h),note:a.note.trim(),date:today(),by:me});
  }else if(a.type==='onboard:start'){
   needManager();who(a.person);b.onboarding[a.person]={startedAt:now,manual:{}};
  }else if(a.type==='onboard:step'){
   needManager();const o=b.onboarding[a.person];if(!o)throw Error('This person is not onboarding.');
   const step=steps.find(x=>x[0]===a.key);if(!step||step[4])throw Error('That step completes itself from the records.');
   o.manual||={};if(a.done)o.manual[a.key]=today();else delete o.manual[a.key];
  }else if(a.type==='onboard:close'){
   needManager();const o=b.onboarding[a.person];if(!o)throw Error('This person is not onboarding.');o.closedAt=now;
  }else if(a.type==='review:save'){
   needManager();const p=who(a.person);if(p.id===me)throw Error('Another manager must review you.');
   if(!id(a.id)||!B.isDate(a.date)||!txt(a.kind,40)||!B.isDate(a.from)||!B.isDate(a.to)||a.from>a.to)throw Error('Choose the review type and period.');
   const r={};for(const [k] of ratings){const v=Number(a.ratings?.[k]);if(!Number.isInteger(v)||v<1||v>5)throw Error('Rate every area from 1 to 5.');r[k]=v;}
   if(!txt(a.strengths,3000)||!txt(a.improve,3000)||!txt(a.goals,2000))throw Error('Keep each section shorter.');
   if(a.share&&/\[(What|One or two|Two or three)/.test(a.strengths+a.improve+a.goals))throw Error('Replace the bracketed placeholders before sharing.');
   const old=b.reviews.find(x=>x.id===a.id);if(old&&old.status!=='Draft')throw Error('Shared reviews cannot be changed.');
   const item={id:a.id,person:p.id,kind:a.kind,date:a.date,from:a.from,to:a.to,ratings:r,strengths:a.strengths.trim(),improve:a.improve.trim(),goals:a.goals.trim(),record:record(s,p.id,a.from,a.to),status:a.share?'Shared':'Draft',author:old?.author||me,...(a.share?{sharedAt:now}:{})};
   if(old)Object.assign(old,item);else b.reviews.push(item);
  }else if(a.type==='review:delete'){
   needManager();const r=b.reviews.find(x=>x.id===a.id);if(!r)throw Error('This review no longer exists.');if(r.status!=='Draft')throw Error('Shared reviews stay on file.');b.reviews=b.reviews.filter(x=>x!==r);
  }else if(a.type==='review:ack'){
   const r=b.reviews.find(x=>x.id===a.id);if(!r)throw Error('This review no longer exists.');if(r.person!==me)throw Error('Only the team member can acknowledge their review.');
   if(r.status!=='Shared')throw Error('This review was already acknowledged.');if(!txt(a.comment||'',1000))throw Error('Keep your comment shorter.');
   r.status='Acknowledged';r.ack={at:now,comment:(a.comment||'').trim()};
  }else if(a.type==='kudos:give'){
   const p=who(a.person);if(p.id===me)throw Error('Recognize a teammate, not yourself.');if(!p.active)throw Error('Choose a current teammate.');
   if(!txt(a.text,300)||!a.text.trim())throw Error('Say what they did, in a sentence or two.');
   b.kudos.push({id:a.id||crypto.randomUUID(),person:p.id,by:me,at:now,value:txt(a.value,40)?a.value:'',text:a.text.trim()});
  }else if(a.type==='skill:set'){
   needManager();who(a.person);if(!b.skills.list.includes(a.skill))throw Error('Choose a skill.');
   const v=Number(a.level);if(!Number.isInteger(v)||v<0||v>3)throw Error('Choose a training level.');
   b.skills.levels[a.person]={...b.skills.levels[a.person],[a.skill]:v};if(!v)delete b.skills.levels[a.person][a.skill];
  }else if(a.type==='skill:list'){
   needManager();const list=[...new Set([].concat(a.list||[]).map(x=>String(x).trim()).filter(Boolean))];
   if(!list.length||list.length>30||!list.every(x=>x.length<=40))throw Error('Add between 1 and 30 skills, each under 40 characters.');
   b.skills.list=list;b.skills.required=[].concat(a.required||[]).filter(x=>list.includes(x));
  }else if(a.type==='hr:offboard'){
   needManager();const p=who(a.person);if(p.id===me)throw Error('Another manager must offboard you.');
   if(!B.isDate(a.lastDay)||(p.joinedOn&&a.lastDay<p.joinedOn))throw Error('Choose a last working day after they joined.');
   if(!['Resigned','Let go','End of season','Other'].includes(a.reason))throw Error('Choose a reason.');
   if(a.finalPay&&!B.isDate(a.finalPay))throw Error('Choose the final paycheck date.');if(!txt(a.note||'',1000))throw Error('Keep the note shorter.');
   // Shifts after the last day are unassigned so the roster shows the gaps to fill.
   const ids=s.shifts.filter(x=>x.person===p.id&&x.date>a.lastDay).map(x=>x.id);
   let out=s;if(ids.length)out=upgrade(prev.change(s,{type:'plan:remove',id:'exit-'+p.id+'-'+Date.now(),ids},role));
   out.business.exits=out.business.exits.filter(x=>x.person!==p.id);
   out.business.exits.push({id:'exit-'+p.id,person:p.id,lastDay:a.lastDay,reason:a.reason,rehire:!!a.rehire,finalPay:a.finalPay||a.lastDay,note:(a.note||'').trim(),by:me,at:now,status:'Scheduled',removedShifts:ids.length,steps:{}});
   if(a.lastDay<=today())return complete(out,p.id,role);
   return out;
  }else if(a.type==='hr:exit-step'){
   needManager();const x=b.exits.find(e=>e.person===a.person);if(!x)throw Error('No exit on file.');if(!['pay','property','logins','interview'].includes(a.key))throw Error('Unknown step.');
   if(a.done)x.steps[a.key]=today();else delete x.steps[a.key];
  }else if(a.type==='hr:exit-complete'){
   needManager();return complete(s,a.person,role);
  }else throw Error('Unknown change.');
  return s;
 }
 // Finishing an exit archives the profile, which also removes their access.
 function complete(s,pid,role){
  const x=s.business.exits.find(e=>e.person===pid),p=person(s,pid);if(!x||!p)throw Error('No exit on file.');
  if(x.lastDay>today())throw Error('Complete the exit on or after their last day.');
  const out=upgrade(prev.change(s,{type:'ops:member',id:p.id,name:p.name,role:p.role,area:p.area,access:p.access,active:false,leftOn:x.lastDay},role));
  const e=out.business.exits.find(y=>y.person===pid);e.status='Completed';e.completedAt=new Date().toISOString();
  if(out.business.onboarding[pid])out.business.onboarding[pid].closedAt||=e.completedAt;
  return out;
 }

 // The demo restaurant: six months of sales, a new hire mid-onboarding, skills, reviews, kudos and a pay raise.
 function seed(state){
  const s=upgrade(state),b=s.business;
  if(b.seeded)return s;b.seeded=true;
  const t=today(),from=s.demoHistory?.from||B.addDays(t,-182),hash=x=>[...x].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7);
  const check={Lunch:21,Dinner:34,'Weekend brunch':26,'Private events':48,'Late service':22},walk={Lunch:28,Dinner:34,'Weekend brunch':40,'Private events':4,'Late service':16};
  const ran=new Set(s.shifts.filter(x=>x.date>=from&&x.date<t).map(x=>x.date+'|'+x.service));
  for(const k of ran){const [date,service]=k.split('|'),h=hash(k),covers=s.reservations.filter(r=>r.date===date&&r.service===service&&!['Cancelled','No-show'].includes(r.status)).reduce((n,r)=>n+r.guests,0),dow=new Date(date+'T12:00:00').getDay(),busy=dow===5||dow===6?1.35:dow===0?1.1:1;
   b.sales.push({date,service,amount:round((covers+(walk[service]||20)*busy)*(check[service]||30)*(0.9+h%21/100)),by:'demo',at:date+'T23:30:00.000Z'});}
  const manager=s.team.find(p=>p.active&&p.access==='manager');
  // Skills follow each person's role, with a few cross-trained people.
  for(const p of s.team.filter(p=>p.active)){
   const lv=b.skills.levels[p.id]={[p.role]:p.access==='manager'||/head/i.test(p.role)?3:2},h=hash(p.id);
   if(p.access==='manager'){lv['Opening lead']=3;lv['Closing lead']=3;lv['Cash handling']=3;}
   if(/head chef/i.test(p.role)){lv['Closing lead']=2;lv['Allergen trained']=3;}
   if(p.area==='Bar')lv['Cash handling']=2;if(p.area==='Kitchen')lv['Allergen trained']=lv['Allergen trained']||2;
   if(['Server','Bartender'].includes(p.role))lv['Closing lead']=h%4===0?1:2;
   if(p.role==='Server'&&h%2===0)lv['Allergen trained']=1;
   if(h%3===0)lv['Opening lead']=2;
   if(p.role==='Line cook'&&h%2===1)lv['Closing lead']=2;
  }
  // A new server joined nine days ago and is part-way through onboarding.
  if(!s.team.some(p=>p.id==='priya')){
   const joined=B.addDays(t,-9),rate=17.5;
   s.team.push({id:'priya',name:'Priya Shah',role:'Server',area:'Floor',initials:'PS',access:'crew',active:true,joinedOn:joined,leftOn:'',phone:'(312) 555-0187',email:'priya.shah@copperroom.example',hr:{legalName:'Priya Shah',employeeId:'CR-1013',employmentType:'Part-time',overtime:B.hr.options.overtime[0],payFrequency:'Every two weeks',workState:'IL',w4Date:joined,i9Date:joined,filingStatus:B.hr.options.filingStatus[0],reportsTo:manager?.id,probationEnds:B.addDays(joined,90)}});
   s.scheduling.defaults.priya={rate,sickPaid:false,timeoffPaid:false};
   const svc=s.setup.services.find(v=>v.name==='Dinner')||s.setup.services[0];
   [-3,2,4,6].forEach((d,i)=>{const date=B.addDays(t,d);s.shifts.push({id:'priya-'+i,date,service:svc.name,person:'priya',start:svc.start,end:svc.end,area:'Floor',breakMinutes:svc.breakMinutes||0,payRate:rate});});
   const past=s.shifts.find(x=>x.id==='priya-0');if(past&&s.timeclock){const T=B.payroll.shiftTimes(past);s.timeclock.entries.push({id:'tc-priya-0',person:'priya',date:past.date,shiftId:past.id,in:T.start,out:T.end,breaks:[],status:'Pending'});}
   b.onboarding.priya={startedAt:joined+'T09:00:00.000Z',manual:{logins:joined}};
   b.skills.levels.priya={Server:1};
   B.configure(s);
  }
  // Recognition and reviews already on file.
  const crew=s.team.filter(p=>p.active&&p.access==='crew'&&p.id!=='priya');
  const notes=[['Teamwork','Jumped on the pass during the Friday rush without being asked.'],['Guest care','Remembered a regular’s allergy and walked it back to the kitchen personally.'],['Above and beyond','Stayed to help close when the dish pit backed up.'],['Reliability','Covered a last-minute sick call on Saturday brunch.']];
  crew.slice(0,4).forEach((p,i)=>b.kudos.push({id:'kudos-'+i,person:p.id,by:manager?.id||s.managerId,at:new Date(Date.now()-(i*5+1)*864e5).toISOString(),value:notes[i][0],text:notes[i][1]}));
  const old=crew.find(p=>p.joinedOn&&days(p.joinedOn,t)>100);
  if(old&&manager){const f=p=>B.addDays(p.joinedOn,0),rec=record(s,old.id,f(old),B.addDays(old.joinedOn,90)),d=draft(s,old.id,rec);b.reviews.push({id:'review-'+old.id,person:old.id,kind:'90-day review',date:B.addDays(old.joinedOn,92),from:old.joinedOn,to:B.addDays(old.joinedOn,90),ratings:{...d.ratings,craft:4,guests:4},strengths:d.strengths,improve:d.improve.replace(/^\[.*\]$/,'Keep building wine knowledge for table recommendations.'),goals:'Lead one opening shift a week by next quarter. Complete the allergen training module.',record:rec,status:'Acknowledged',author:manager.id,sharedAt:B.addDays(old.joinedOn,92)+'T15:00:00.000Z',ack:{at:B.addDays(old.joinedOn,93)+'T12:00:00.000Z',comment:'Thanks, I’d love to learn the wine list.'}});
   b.payHistory.push({person:old.id,date:B.addDays(old.joinedOn,93),from:round(s.scheduling.defaults[old.id].rate-1),to:s.scheduling.defaults[old.id].rate,by:manager.id,note:'Raise after 90-day review'});}
  return s;
 }
 // History that builds on the sales, stock and specials above: price changes, closed days and what each feature sold.
 function later(s){
  const b=s.business;
  // Suppliers raised a few prices six weeks ago, so the price watch has something to show.
  if(!b.priceSeeded&&s.orders?.length){b.priceSeeded=true;const cut=B.addDays(today(),-42),counts=s.orders.filter(o=>o.status==='Received'&&o.item).reduce((m,o)=>m.set(o.item,(m.get(o.item)||0)+1),new Map());
   [...counts].sort((a,b)=>b[1]-a[1]).slice(0,6).forEach(([item],i)=>{const f=1-(0.05+i*0.02)*(i===4?-0.6:1);for(const o of s.orders)if(o.item===item&&o.status==='Received'&&(o.receivedAt||'')<cut)o.cost=round((o.cost||0)*f);});}
  if(!b.closesSeeded&&b.sales?.length){b.closesSeeded=true;b.closes||={};const check={Lunch:21,Dinner:34,'Weekend brunch':26,'Private events':48,'Late service':22},hsh=x=>[...x].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7),yesterday=B.addDays(today(),-1),boss=s.team.find(p=>p.active&&p.access==='manager')?.id;
   const notesFor=['Busy patio, ran out of the spritz garnish by 8.','Quiet first half, strong late rush.','Private party of 18 in the back room went smoothly.','Short one server; Noah covered two sections.','Walk-in cooler temperature checked twice, all good.'];
   const byDay=b.sales.reduce((m,x)=>m.set(x.date,[...(m.get(x.date)||[]),x]),new Map());
   for(const [date,list] of byDay){if(date>=yesterday)continue;const total=round(list.reduce((n,x)=>n+x.amount,0)),h=hsh(date);b.closes[date]={sales:total,guests:list.reduce((n,x)=>n+Math.round(x.amount/(check[x.service]||30)),0),comps:round(total*(0.012+h%18/1000)),cash:round(((h%41)-20)/2),notes:h%5===0?notesFor[h%notesFor.length]:'',closedBy:boss,closedAt:date+'T23:45:00.000Z'};}}
  // A weekly happy hour, a fortnightly pairing dinner and units sold for every feature, with the lift each brings.
  if(!b.menuSeeded&&b.closesSeeded){b.menuSeeded=true;const hsh=x=>[...x].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,7),y=B.addDays(today(),-1),from=s.demoHistory?.from||B.addDays(today(),-182);
   const lift=(date,svc,f)=>{const x=b.sales.find(z=>z.date===date&&z.service===svc);if(!x)return;const add=round(x.amount*(f-1));x.amount=round(x.amount+add);const c=b.closes[date];if(c){c.sales=round(c.sales+add);c.guests+=Math.round(add/34);}};
   for(let d=from;d<y;d=B.addDays(d,1)){
    const dow=new Date(d+'T12:00:00').getDay(),dinner=b.sales.some(x=>x.date===d&&x.service==='Dinner'),h=hsh(d);if(!dinner)continue;
    if((dow===4||dow===5)&&h%5>1){s.specials.push({id:'hh-'+d,date:d,service:'Dinner',kind:'happy_hour',name:dow===4?'Golden Hour Spritz':'Twilight Oyster & Spritz Hour',time:'16:00–18:00',description:dow===4?'$8 spritzes and half-price bar snacks at the bar.':'$2 local oysters, $8 house spritzes and draught lagers.',price:dow===4?8:9,allergens:'Alcohol · bar and high-top tables only.',active:true,questions:[]});lift(d,'Dinner',1.08+h%9/100);}
    if(dow===3&&Math.floor((new Date(d)-new Date(from))/864e5/7)%2===0){s.specials.push({id:'ev-'+d,date:d,service:'Dinner',kind:'event',name:h%2?'Winemaker Pairing Dinner':'Live Courtyard Jazz',time:'19:00–22:00',description:h%2?'Five courses paired with a visiting winemaker.':'Live jazz in the courtyard during dinner.',price:h%2?75:0,allergens:'',active:true,questions:[]});lift(d,'Dinner',1.18+h%12/100);}
   }
   for(const sp of s.specials){const c=b.closes[sp.date];if(!c||sp.date>=y||!sp.active)continue;const daySales=b.sales.filter(x=>x.date===sp.date),share=(daySales.find(x=>x.service===sp.service)?.amount||0)/(daySales.reduce((n,x)=>n+x.amount,0)||1),g=c.guests*share,h=hsh(sp.name+sp.date),rate=sp.kind==='happy_hour'?0.3+h%15/100:sp.kind==='event'?(sp.price?0.25+h%10/100:0):0.04+(hsh(sp.name)%9)/100;
    c.specials||={};c.specials[sp.id]=Math.round(g*rate);}}
  return s;
 }
 B.starter=(...args)=>later(seed(prev.starter(...args)));
 B.load=storage=>later(seed(prev.load(storage)));
 B.change=change;
 B.biz={rules,pnl,openDays,missingSales,balance,steps,onboarding,activeOnboarding:onboarding_active,record,ratings,scale,due,draft,levels,coverage,laborIssues,health};
})();
