/* Shared shift context and manager-owned team/service configuration. */
(function(){
  'use strict';
  const B=globalThis.Brigly,previous={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
  const copy=x=>JSON.parse(JSON.stringify(x));
  const txt=(x,max=500)=>typeof x==='string'&&x.length<=max;
  const label=x=>txt(x,80)&&x.trim().length>0&&!x.includes('|');
  const identifier=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
  const time=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
  const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const unique=items=>new Set(items.map(x=>x.toLowerCase())).size===items.length;
  const same=(x,date,service)=>x.date===date&&x.service===service;
  function upgrade(state){
    const s=copy(state);
    if(!s.setup){
      B.configure(s);
      s.team=B.crew.map(p=>({...p,active:true,access:p.id==='jamie'?'manager':'crew'}));
      s.managerId='jamie';
      s.setup={version:1,roles:[...new Set(s.team.map(p=>p.role))],areas:['Floor','Bar','Kitchen'],services:[{id:'lunch',name:'Lunch',start:'10:00',end:'16:00',breakMinutes:0,active:true},{id:'dinner',name:'Dinner',start:'16:00',end:'23:00',breakMinutes:0,active:true}]};
      s.shiftNotes=[];
      s.unavailable=s.unavailable.map(x=>({...x,date:s.date,service:s.service,status:x.active?'Approved':'Restored',reviewer:'jamie',feedback:''}));
    }
    for(const item of s.unavailable)if(item.feedback==='Migrated from the earlier shared 86 list.')item.feedback='';
    B.configure(s);return s;
  }
  function valid(s){try{
    if(!s?.setup||s.setup.version!==1||!Array.isArray(s.team)||!s.team.length||!Array.isArray(s.setup.roles)||!s.setup.roles.length||!Array.isArray(s.setup.areas)||!s.setup.areas.length||!Array.isArray(s.setup.services)||!s.setup.services.length)return false;
    if(!s.setup.roles.every(label)||!unique(s.setup.roles)||!s.setup.areas.every(label)||!unique(s.setup.areas)||!unique(s.setup.services.map(x=>x.name)))return false;
    if(!s.setup.services.every(x=>identifier(x.id)&&label(x.name)&&time(x.start)&&time(x.end)&&x.start!==x.end&&Number.isInteger(x.breakMinutes)&&x.breakMinutes>=0&&x.breakMinutes<B.duration(x)&&typeof x.active==='boolean'))return false;
    if(!s.setup.services.some(x=>x.active)||new Set(s.setup.services.map(x=>x.id)).size!==s.setup.services.length)return false;
    if(new Set(s.team.map(p=>p.id)).size!==s.team.length||!s.team.every(p=>identifier(p.id)&&label(p.name)&&s.setup.roles.includes(p.role)&&s.setup.areas.includes(p.area)&&['manager','crew'].includes(p.access)&&typeof p.active==='boolean'&&txt(p.initials,4)))return false;
    if(!s.team.some(p=>p.active&&p.access==='manager')||!s.team.some(p=>p.id===s.managerId))return false;
    B.configure(s);if(!previous.valid(s))return false;
    const scope=x=>B.isDate(x.date)&&s.setup.services.some(v=>v.name===x.service);
    if(!Array.isArray(s.shiftNotes)||new Set(s.shiftNotes.map(x=>x.id)).size!==s.shiftNotes.length||!s.shiftNotes.every(x=>identifier(x.id)&&scope(x)&&B.person(x.author)&&txt(x.body,2000)&&x.body.trim()&&['manager','crew'].includes(x.priority)&&typeof x.archived==='boolean'&&txt(x.updated,100)))return false;
    return s.unavailable.every(x=>scope(x)&&['Reported','Approved','Declined','Restored'].includes(x.status)&&x.active===(x.status==='Approved')&&txt(x.feedback,500)&&(!x.reviewer||B.person(x.reviewer)));
  }catch{return false;}}
  function change(state,action,role=state.role){
    let s=upgrade(state);const me=B.actor(role,s.crewId,s.managerId),viewer=s.team.find(p=>p.id===me);
    if(!viewer?.active||viewer.access!==role)throw Error('This preview identity no longer has that access. Choose an active team member.');
    const manager=role==='manager',needManager=()=>{if(!manager)throw Error('Only managers can make this change.');};
    const serviceExists=service=>s.setup.services.some(x=>x.name===service);
    const writable=(date,service)=>{if(!B.isDate(date)||!serviceExists(service))throw Error('Choose a valid date and service.');if(!manager&&!s.shifts.some(x=>same(x,date,service)&&x.person===me))throw Error('You can only post to a shift you are assigned to.');};
    const lookup=(list,id)=>{const item=list.find(x=>x.id===id);if(!item)throw Error('This record no longer exists.');return item;};
    const initials=name=>name.trim().split(/\s+/).map(x=>Array.from(x)[0]).slice(0,2).join('').toUpperCase();
    if(!action.type.startsWith('ops:')){
      if(['put','toggle'].includes(action.type)&&action.collection==='unavailable')throw Error('Use the shift 86 report and approval workflow.');
      if(action.type==='put'&&action.collection==='shifts'){
        const item=action.item,old=s.shifts.find(x=>x.id===item.id);
        if(!s.team.find(p=>p.id===item.person)?.active&&(!old||old.person!==item.person))throw Error('Choose an active team member.');
        if(!s.setup.services.find(x=>x.name===item.service)?.active&&(!old||old.service!==item.service))throw Error('Choose an active service.');
      }
      if(action.type==='put'&&['briefings'].includes(action.collection))writable(action.item.date,action.item.service);
      s=previous.change(s,action,role);
    }else if(action.type==='ops:note'){
      writable(action.date,action.service);if(!txt(action.body,2000)||!action.body.trim())throw Error('Write a note of up to 2,000 characters.');
      const old=s.shiftNotes.find(x=>x.id===action.id);
      if(old&&!manager&&old.author!==me)throw Error('You can only edit your own notes.');
      if(old&&(old.date!==action.date||old.service!==action.service))throw Error('A note must stay with its original shift.');
      const item={id:action.id,date:action.date,service:action.service,body:action.body.trim(),author:old?.author||me,priority:old?.priority||(manager?'manager':'crew'),archived:false,updated:new Date().toISOString()};
      if(old)Object.assign(old,item);else s.shiftNotes.push(item);
    }else if(action.type==='ops:archive-note'){
      const item=lookup(s.shiftNotes,action.id);if(!manager&&item.author!==me)throw Error('You can only archive your own note.');item.archived=true;
    }else if(action.type==='ops:special-question'){
      const item=lookup(s.specials,action.id);
      if(!txt(action.text,500)||!action.text.trim())throw Error('Write a question of up to 500 characters.');
      item.questions=item.questions||[];
      item.questions.push({id:'q-'+crypto.randomUUID().slice(0,8),author:me,text:action.text.trim(),at:new Date().toISOString()});
    }else if(action.type==='ops:special-answer'){
      const item=lookup(s.specials,action.id);
      const q=(item.questions||[]).find(x=>x.id===action.questionId);
      if(!q)throw Error('This question no longer exists.');
      if(!txt(action.text,500)||!action.text.trim())throw Error('Write an answer of up to 500 characters.');
      q.answer={author:me,text:action.text.trim(),at:new Date().toISOString()};
    }else if(action.type==='ops:approve-briefing'){
      needManager();
      const item=lookup(s.briefings,action.id);
      const status=action.status||'Approved';
      item.approvalStatus=status;
      if(status==='Pending'){
        delete item.approvedBy;
        delete item.approvedAt;
      }else{
        item.approvedBy=me;
        item.approvedAt=new Date().toISOString();
      }
    }else if(action.type==='ops:alert'){
      writable(action.date,action.service);
      if(!label(action.name)||!txt(action.reason,500)||!action.reason.trim()||!s.setup.areas.includes(action.area))throw Error('Add an item, station and reason (up to 500 characters).');
      const old=s.unavailable.find(x=>x.id===action.id);
      if(old&&!manager&&(old.author!==me||old.status!=='Reported'))throw Error('Only your pending 86 reports can be edited.');
      if(old&&(old.date!==action.date||old.service!==action.service))throw Error('An 86 report must stay with its original shift.');
      const item={id:action.id,date:action.date,service:action.service,name:action.name.trim(),reason:action.reason.trim(),area:action.area,author:old?.author||me,status:old?.status||(manager?'Approved':'Reported'),active:old?.active??manager,reviewer:old?.reviewer||(manager?me:''),feedback:old?.feedback||''};
      if(old)Object.assign(old,item);else s.unavailable.push(item);
    }else if(action.type==='ops:review-alert'){
      needManager();const item=lookup(s.unavailable,action.id),allowed={Reported:['Approved','Declined'],Approved:['Restored'],Restored:['Approved'],Declined:['Approved']};
      if(!allowed[item.status]?.includes(action.status))throw Error('That 86 status change is no longer available.');
      if(!txt(action.feedback||'',500)||(action.status==='Declined'&&!action.feedback?.trim()))throw Error('Add a short reason when declining an 86 report.');
      item.status=action.status;item.active=action.status==='Approved';item.reviewer=me;item.feedback=action.feedback||'';
    }else if(action.type==='ops:member'){
      needManager();const old=s.team.find(x=>x.id===action.id);
      if(!label(action.name)||!s.setup.roles.includes(action.role)||!s.setup.areas.includes(action.area)||!['manager','crew'].includes(action.access)||typeof action.active!=='boolean')throw Error('Check the team member’s name, role, station and access.');
      if(old?.id===me&&(!action.active||action.access!=='manager'))throw Error('Another manager must change your access or archive your profile.');
      const item={id:action.id,name:action.name.trim(),role:action.role,area:action.area,access:action.access,active:action.active,initials:initials(action.name)};
      if(old)Object.assign(old,item);else{
        if(!Number.isFinite(action.rate)||action.rate<0||action.rate>100000||B.schedule.round(action.rate)!==action.rate)throw Error('Enter a valid default hourly rate.');
        s.team.push(item);s.scheduling.defaults[item.id]={rate:action.rate,sickPaid:false,timeoffPaid:false};
      }
    }else if(action.type==='ops:catalog'){
      needManager();if(!['roles','areas'].includes(action.catalog)||!label(action.name))throw Error('Enter a valid role or station name.');
      const list=s.setup[action.catalog],old=action.oldName;
      if(list.some(x=>x.toLowerCase()===action.name.toLowerCase()&&x!==old))throw Error('That name already exists.');
      if(old&&!list.includes(old))throw Error('The original name no longer exists.');
      if(old){list[list.indexOf(old)]=action.name;s.team.forEach(p=>{const key=action.catalog==='roles'?'role':'area';if(p[key]===old)p[key]=action.name;});
        if(action.catalog==='areas')for(const c of ['shifts','tasks','orders','unavailable'])s[c].forEach(x=>{if(x.area===old)x.area=action.name;});
      }else list.push(action.name);
    }else if(action.type==='ops:remove-catalog'){
      needManager();if(!['roles','areas'].includes(action.catalog))throw Error('Unknown setup list.');
      const list=s.setup[action.catalog];if(list.length===1)throw Error('Keep at least one option.');
      if(s.team.some(p=>p[action.catalog==='roles'?'role':'area']===action.name)||(action.catalog==='areas'&&['shifts','tasks','orders','unavailable'].some(c=>s[c].some(x=>x.area===action.name))))throw Error('This option is in use. Rename it or reassign its records first.');
      s.setup[action.catalog]=list.filter(x=>x!==action.name);
    }else if(action.type==='ops:service'){
      needManager();const old=s.setup.services.find(x=>x.id===action.id),oldName=old?.name;
      if(!label(action.name)||!time(action.start)||!time(action.end)||action.start===action.end||!Number.isInteger(action.breakMinutes)||action.breakMinutes<0||action.breakMinutes>=B.duration(action)||typeof action.active!=='boolean')throw Error('Use different start/end times and a break shorter than the service.');
      if(s.setup.services.some(x=>x.id!==action.id&&x.name.toLowerCase()===action.name.toLowerCase()))throw Error('A service already has that name.');
      const item={id:action.id,name:action.name.trim(),start:action.start,end:action.end,breakMinutes:action.breakMinutes,active:action.active};
      if(old)Object.assign(old,item);else s.setup.services.push(item);
      if(!s.setup.services.some(x=>x.active))throw Error('Keep at least one active service.');
      if(oldName&&oldName!==item.name){
        for(const c of ['shifts','specials','briefings','reservations','unavailable','shiftNotes'])s[c].forEach(x=>{if(x.service===oldName)x.service=item.name;});
        for(const key of Object.keys(s.checks))if(key.slice(11)===oldName){s.checks[key.slice(0,11)+item.name]=s.checks[key];delete s.checks[key];}
        if(s.service===oldName)s.service=item.name;
      }
      B.configure(s);
      if(action.applyFrom){
        if(!B.isDate(action.applyFrom))throw Error('Choose an effective date.');
        const ids=s.shifts.filter(x=>x.service===item.name&&x.date>=action.applyFrom).map(x=>x.id);
        for(const id of ids){const shift=s.shifts.find(x=>x.id===id);s=previous.change(s,{type:'put',collection:'shifts',item:{...shift,start:item.start,end:item.end,breakMinutes:item.breakMinutes}},role);}
      }
    }else throw Error('Unknown shift operation.');
    // Catalog edits can invalidate a swap even when no assignment was directly edited.
    for(const r of s.scheduling.requests.filter(x=>x.kind==='swap'&&['Awaiting teammate','Pending'].includes(x.status))){
      const a=s.shifts.find(x=>x.id===r.shiftId),b=s.shifts.find(x=>x.id===r.targetId);
      if(!a||!b||B.schedule.signature(a)!==r.sourceSignature||B.schedule.signature(b)!==r.targetSignature){r.status='Obsolete';r.feedback='Shift details changed. Submit a new exchange request.';}
    }
    B.configure(s);if(!valid(s))throw Error('Check these settings. The workspace could not save the change.');return s;
  }
  function context(s,date,service){
    return {notes:s.shiftNotes.filter(x=>same(x,date,service)&&!x.archived).sort((a,b)=>(a.priority==='manager'?0:1)-(b.priority==='manager'?0:1)||b.updated.localeCompare(a.updated)),alerts:s.unavailable.filter(x=>same(x,date,service)),reservations:s.reservations.filter(x=>same(x,date,service)).sort((a,b)=>a.time.localeCompare(b.time))};
  }
  function report(s,person,from,to,role=s.role){
    if(role!=='manager')throw Error('Only managers can view team reports.');
    if(!B.isDate(from)||!B.isDate(to)||from>to)throw Error('Choose a valid report date range.');
    B.configure(s);if(!B.person(person))throw Error('Choose a team member.');
    const shifts=s.shifts.filter(x=>x.person===person&&x.date>=from&&x.date<=to).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    const rows=shifts.map(x=>{const m=B.schedule.metrics(s,x);return {id:x.id,date:x.date,service:x.service,station:x.area,start:x.start,end:x.end,rate:x.payRate,scheduledMinutes:m.scheduledMinutes,expectedMinutes:m.workMinutes,paidAbsenceMinutes:m.paidAbsenceMinutes,unpaidAbsenceMinutes:m.absence&&!m.absence.paid?m.scheduledMinutes:0,wageCost:m.wages,attendance:m.absence?(m.absence.kind==='sick'?'Sickness':'Approved time off'):m.late?'Late':'No attendance report',review:m.absence?.status||m.late?.status||'Not recorded',lateMinutes:m.late?.minutes||0};});
    const requests=s.scheduling.requests.filter(r=>r.person===person&&(r.kind==='timeoff'?r.from<=to&&r.to>=from:r.date>=from&&r.date<=to));
    const result={person,from,to,rows,shiftCount:rows.length,scheduledMinutes:0,expectedMinutes:0,paidAbsenceMinutes:0,unpaidAbsenceMinutes:0,wageCost:0,sickShifts:rows.filter(r=>r.attendance==='Sickness').length,timeOffShifts:rows.filter(r=>r.attendance==='Approved time off').length,lateShifts:rows.filter(r=>r.attendance==='Late').length,confirmedLateShifts:rows.filter(r=>r.attendance==='Late'&&r.review==='Reviewed').length,lateMinutes:0,pendingRequests:requests.filter(r=>['Pending','Reported','Awaiting teammate'].includes(r.status)).length,approvedSwaps:requests.filter(r=>r.kind==='swap'&&r.status==='Approved').length,notes:s.shiftNotes.filter(n=>n.author===person&&!n.archived&&n.date>=from&&n.date<=to).length,reported86:s.unavailable.filter(a=>a.author===person&&a.date>=from&&a.date<=to).length};
    for(const row of rows)for(const key of ['scheduledMinutes','expectedMinutes','paidAbsenceMinutes','unpaidAbsenceMinutes','wageCost','lateMinutes'])result[key]+=row[key];
    result.wageCost=B.schedule.round(result.wageCost);result.tips=B.schedule.round(s.scheduling.tips.filter(t=>t.person===person&&t.date>=from&&t.date<=to).reduce((sum,t)=>sum+t.amount,0));return result;
  }
  const csvCell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  function reportCSV(s,person,from,to){
    const r=report(s,person,from,to),p=s.team.find(x=>x.id===person);
    const rows=[['Brigly schedule report','Estimates only; no clocked hours or confirmed payroll'],['Member',p.name],['Role',p.role],['Employment status',p.active?'Current team':'Former team'],['Joined on',p.joinedOn||'Not recorded'],['Last working day',p.leftOn||'Not recorded'],['From',from,'To',to],['Generated',new Date().toISOString()],['Scheduled shifts',r.shiftCount],['Estimated wage cost',r.wageCost],['Crew tips (not employer wage cost)',r.tips],['Pending reviews',r.pendingRequests],[],['Date','Service','Station','Start','End','Hourly rate','Scheduled hours','Expected working hours','Paid absence hours','Unpaid absence hours','Estimated wage cost','Attendance','Review status','Late minutes'],...r.rows.map(x=>[x.date,x.service,x.station,x.start,x.end,x.rate,B.schedule.round(x.scheduledMinutes/60),B.schedule.round(x.expectedMinutes/60),B.schedule.round(x.paidAbsenceMinutes/60),B.schedule.round(x.unpaidAbsenceMinutes/60),x.wageCost,x.attendance,x.review,x.lateMinutes])];
    return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
  }
  B.starter=date=>upgrade(previous.starter(date));B.validState=valid;
  B.load=storage=>{try{const raw=JSON.parse(storage.getItem(B.KEY));if(previous.valid(raw)){const s=upgrade(raw);if(valid(s))return s;}else if(!raw?.scheduling){const s=upgrade(previous.load(storage));if(valid(s))return s;}}catch{}return B.starter();};
  B.change=change;B.ops={context,report,reportCSV};
})();
