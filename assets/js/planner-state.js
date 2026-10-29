/* Atomic, reusable roster planning and employment dates. */
(function(){
 const B=globalThis.Brigly,prev={starter:B.starter,load:B.load,change:B.change,valid:B.validState},clone=x=>globalThis.Brigly.clone(x);
 const upgrade=s=>{s=clone(s);s.planning||={version:1,templates:[]};for(const p of s.team){p.joinedOn??='';p.leftOn??='';}return s;};
 const employed=(p,date)=>p&&(!p.joinedOn||date>=p.joinedOn)&&(!p.leftOn||date<=p.leftOn)&&(p.active||!!p.leftOn);
 function check(s,x,ignore=''){
  const p=s.team.find(p=>p.id===x.person);
  if(!employed(p,x.date))throw Error((p?.name||'Member')+' is not employed on '+x.date+'.');
  if(!s.setup.services.some(v=>v.active&&v.name===x.service))throw Error('This service is archived or missing.');
  if(s.shifts.some(y=>y.id!==ignore&&y.person===x.person&&B.overlaps(x,y)))throw Error(p.name+' already has an overlapping shift on '+x.date+'.');
  if(s.scheduling.requests.some(r=>r.kind==='timeoff'&&r.person===x.person&&r.status==='Approved'&&x.date>=r.from&&x.date<=r.to))throw Error(p.name+' has approved time off on '+x.date+'.');
 }
 function preview(state,template,week){
  if(!B.isDate(week))throw Error('Choose a target week.');const s=upgrade(state),items=[],conflicts=[];let skipped=0;
  for(const [i,row] of template.entries.entries()){
   const x={...row,id:'plan-preview-'+i,date:B.addDays(B.monday(week),row.day),payRate:s.scheduling.defaults[row.person]?.rate};delete x.day;
   if(s.shifts.some(y=>['date','person','service','start','end','area','breakMinutes'].every(k=>y[k]===x[k]))){skipped++;continue;}
   try{check(s,x);s.shifts.push(x);items.push(x);}catch(err){conflicts.push(err.message);}
  }
  return {items,conflicts,skipped};
 }
 function change(state,a,role=state.role){let s=upgrade(state);
  if(a.type.startsWith('plan:')){
   if(role!=='manager')throw Error('Only managers can plan schedules.');
   if(a.type==='plan:remove'){
    const ids=[...new Set(a.ids||[])];if(!ids.length)throw Error('Select a shift to remove.');
    const records=ids.map(id=>{const x=s.shifts.find(x=>x.id===id);if(!x)throw Error('A selected shift no longer exists.');return clone(x);});
    for(const x of records)if(B.schedule.absence(s,x))throw Error('Review or withdraw the absence before deleting this shift.');
    const swaps=clone(s.scheduling.requests.filter(r=>r.kind==='swap'&&['Pending','Awaiting teammate'].includes(r.status)&&(ids.includes(r.shiftId)||ids.includes(r.targetId))));
    for(const id of ids)s=prev.change(s,{type:'remove',collection:'shifts',id},role);
    s.planning.removed||=[];s.planning.removed.push({id:a.id,shifts:records,swaps,at:new Date().toISOString()});
   }else if(a.type==='plan:restore'){
    const batch=s.planning.removed?.find(x=>x.id===a.id);if(!batch)throw Error('These shifts have already been restored.');
    for(const x of batch.shifts){if(s.shifts.some(y=>y.id===x.id))throw Error('This assignment already exists.');check(s,x);s.shifts.push(x);}
    for(const old of batch.swaps||[]){const r=s.scheduling.requests.find(r=>r.id===old.id),a=s.shifts.find(x=>x.id===old.shiftId),b=s.shifts.find(x=>x.id===old.targetId);if(r?.status==='Obsolete'&&a&&b&&B.schedule.signature(a)===old.sourceSignature&&B.schedule.signature(b)===old.targetSignature)Object.assign(r,old);}
    s.planning.removed=s.planning.removed.filter(x=>x.id!==a.id);
   }else if(a.type==='plan:save'){

    if(typeof a.name!=='string'||!a.name.trim()||a.name.length>80)throw Error('Name this schedule template.');
    const week=B.monday(a.week),rows=s.shifts.filter(x=>x.date>=week&&x.date<=B.addDays(week,6));if(!rows.length)throw Error('This week has no shifts to save.');
    if(s.planning.templates.length>=30)throw Error('Remove an unused template first (maximum 30).');
    s.planning.templates.push({id:a.id,name:a.name.trim(),entries:rows.map(x=>({day:Math.round((new Date(x.date+'T12:00:00Z')-new Date(week+'T12:00:00Z'))/86400000),person:x.person,service:x.service,start:x.start,end:x.end,area:x.area,breakMinutes:x.breakMinutes}))});
   }else if(a.type==='plan:delete'){s.planning.templates=s.planning.templates.filter(t=>t.id!==a.id);
   }else if(a.type==='plan:apply'){
    const t=a.sourceWeek?{entries:s.shifts.filter(x=>x.date>=B.monday(a.sourceWeek)&&x.date<=B.addDays(B.monday(a.sourceWeek),6)).map(x=>({day:Math.round((new Date(x.date+'T12:00:00Z')-new Date(B.monday(a.sourceWeek)+'T12:00:00Z'))/86400000),person:x.person,service:x.service,start:x.start,end:x.end,area:x.area,breakMinutes:x.breakMinutes}))}:s.planning.templates.find(t=>t.id===a.templateId);
    if(!t||!t.entries.length)throw Error('Choose a populated template or week.');const p=preview(s,t,a.week);if(p.conflicts.length)throw Error(p.conflicts.join(' '));
    for(const [i,x] of p.items.entries())s=prev.change(s,{type:'put',collection:'shifts',item:{...x,id:a.id+'-'+i}},role);
   }else if(a.type==='plan:place'){
    const old=a.shiftId?s.shifts.find(x=>x.id===a.shiftId):null;if(a.shiftId&&!old)throw Error('This shift no longer exists.');
    if(old&&B.schedule.absence(s,old))throw Error('Review the absence before moving this assignment.');
    if(old&&s.scheduling.requests.some(r=>(r.shiftId===old.id||r.targetId===old.id)&&!['Declined','Withdrawn','Obsolete'].includes(r.status)))throw Error('This shift has an attendance or swap record. Review it before moving the assignment.');
    const preset=s.setup.services.find(x=>x.id===a.presetId);if(!old&&!preset)throw Error('Choose a shift template.');
    const person=s.team.find(p=>p.id===a.person);const x=old?{...old,person:a.person,date:a.date,payRate:old.person===a.person?old.payRate:s.scheduling.defaults[a.person]?.rate}:{id:a.id,date:a.date,person:a.person,service:preset.name,start:preset.start,end:preset.end,breakMinutes:preset.breakMinutes,area:person?.area,payRate:s.scheduling.defaults[a.person]?.rate};
    check(s,x,old?.id);s=prev.change(s,{type:'put',collection:'shifts',item:x},role);
   }else throw Error('Unknown planning action.');
  }else{
   if(a.type==='ops:member'){
    const old=s.team.find(p=>p.id===a.id),joined=a.joinedOn??old?.joinedOn??'',left=a.leftOn??old?.leftOn??'';
    if((joined&&!B.isDate(joined))||(left&&!B.isDate(left))||(joined&&left&&joined>left))throw Error('Check employment dates: last day must follow joining date.');
    if(a.active&&left)throw Error('Clear the leaving date to mark this person active.');
    if(s.shifts.some(x=>x.person===a.id&&((joined&&x.date<joined)||(left&&x.date>left))))throw Error('Employment dates exclude existing shifts. Reassign those shifts first.');
    s=prev.change(s,a,role);Object.assign(s.team.find(p=>p.id===a.id),{joinedOn:joined,leftOn:left});
   }else{const oldService=a.type==='ops:service'?s.setup.services.find(x=>x.id===a.id)?.name:null;const oldCatalog=a.type==='ops:catalog'?a.oldName:null;if(a.type==='put'&&a.collection==='shifts'&&!employed(s.team.find(p=>p.id===a.item.person),a.item.date))throw Error('Shift falls outside this member’s employment dates.');s=prev.change(s,a,role);if(oldService&&oldService!==a.name)for(const t of s.planning.templates)for(const row of t.entries)if(row.service===oldService)row.service=a.name;if(oldService)for(const batch of s.planning.removed||[])for(const row of batch.shifts)if(row.service===oldService)row.service=a.name;if(oldCatalog&&a.catalog==='areas')for(const t of s.planning.templates)for(const row of t.entries)if(row.area===oldCatalog)row.area=a.name;if(oldCatalog&&a.catalog==='areas')for(const batch of s.planning.removed||[])for(const row of batch.shifts)if(row.area===oldCatalog)row.area=a.name;}
  }
  if(!valid(s))throw Error('Invalid planning data.');return s;
 }
 function valid(s){return prev.valid(s)&&(!s.planning||(s.planning.version===1&&Array.isArray(s.planning.templates)&&s.planning.templates.length<=30&&new Set(s.planning.templates.map(x=>x.id)).size===s.planning.templates.length&&s.planning.templates.every(t=>typeof t.id==='string'&&typeof t.name==='string'&&t.name.trim()&&Array.isArray(t.entries)&&t.entries.length<=500&&t.entries.every(x=>Number.isInteger(x.day)&&x.day>=0&&x.day<=6&&s.team.some(p=>p.id===x.person)&&typeof x.service==='string'&&/^\d\d:\d\d$/.test(x.start)&&/^\d\d:\d\d$/.test(x.end)&&typeof x.area==='string'&&Number.isInteger(x.breakMinutes)))) )&&s.team.every(p=>(!p.joinedOn||B.isDate(p.joinedOn))&&(!p.leftOn||B.isDate(p.leftOn))&&(!p.joinedOn||!p.leftOn||p.joinedOn<=p.leftOn));}
 B.planner={upgrade,employed,preview};B.starter=d=>upgrade(prev.starter(d));B.load=storage=>upgrade(prev.load(storage));B.change=change;B.validState=valid;
})();
