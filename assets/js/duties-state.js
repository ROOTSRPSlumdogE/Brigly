/* Per-service checklist overrides, service-specific defaults and custom checklists. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const key=(date,service)=>date+'|'+service;
 function upgrade(s){s=clone(s);s.checklistScopes??=[];return s;}
 function defaultTasks(s,service=s.service){const svc=s.tasks.filter(t=>!t.date&&t.service===service);if(svc.length)return svc;return s.tasks.filter(t=>!t.date&&(!t.service||t.service===service));}
 function tasks(s,date=s.date,service=s.service){return s.checklistScopes?.includes(key(date,service))?s.tasks.filter(t=>t.date===date&&t.service===service):defaultTasks(s,service);}
 function isSpecific(t){return Boolean(t&&(t.specific||(t.date&&!t.sourceTask&&!t.isDefault)));}
 function lists(s,date=s.date,service=s.service){return [...new Set(['Opening','Closing',...tasks(s,date,service).map(t=>t.list)])];}
 function stations(s,date=s.date,service=s.service,role=s.role){const id=B.actor(role,s.crewId,s.managerId);return [...new Set(s.shifts.filter(x=>x.person===id&&x.date===date&&x.service===service).map(x=>x.area))];}
 // When a list should be finished, from the service times: opening and set-up lists by the start, mid-shift lists halfway through, closing lists an hour after the end.
 function due(s,list,date=s.date,service=s.service){
  const v=s.setup.services.find(x=>x.name===service),l=String(list||'').toLowerCase();if(!v||!B.isDate(date))return null;
  const start=new Date(date+'T'+v.start+':00').getTime(),len=B.duration(v)*60000,close=/^clos/.test(l);
  const when=/^(open|pre)|set ?-?up/.test(l)?start:/^mid/.test(l)?start+len/2:close?start+len+3600000:null;if(when===null)return null;
  const d=new Date(when),time=String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
  return {at:when,time,short:close?'Close':time,label:close?'After close · by '+time:'Due '+time};
 }
 function valid(s){try{s=upgrade(s);return prev.valid(s)&&Array.isArray(s.checklistScopes)&&new Set(s.checklistScopes).size===s.checklistScopes.length&&s.checklistScopes.every(k=>B.isDate(k.slice(0,10))&&s.setup.services.some(v=>v.name===k.slice(11)))&&s.tasks.every(t=>(!t.date||(B.isDate(t.date)&&s.setup.services.some(v=>v.name===t.service)))&&(!t.service||s.setup.services.some(v=>v.name===t.service)));}catch{return false;}}
 function materialize(s){const k=key(s.date,s.service),map={};if(s.checklistScopes.includes(k))return map;const originals=tasks(s);const checks=s.checks[k]||{};s.checks[k]={};for(const [i,t] of originals.entries()){let n=s.tasks.length+i,id='shift-task-'+n;while(s.tasks.some(x=>x.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='shift-task-'+(++n);map[t.id]=id;s.tasks.push({...t,id,sourceTask:t.id,date:s.date,service:s.service,specific:false,isDefault:true});for(const records of [s.taskNotes||[],s.taskEvents||[]])for(const x of records)if(x.date===s.date&&x.service===s.service&&x.task===t.id){x.sourceTask=t.id;x.task=id;}if(checks[t.id])s.checks[k][id]=checks[t.id];}s.checklistScopes.push(k);return map;}
 function change(state,action,role=state.role){let s=upgrade(state),a=clone(action);const actor=B.actor(role,s.crewId,s.managerId),manager=role==='manager';
  if(!s.team.some(p=>p.id===actor&&p.active&&p.access===role))throw Error('Choose an active team member.');
  if(a.type==='checklist:add'||a.type==='checklist:add-default'){
   if(!manager)throw Error('Only managers can add tasks.');if(!s.setup.areas.includes(a.area)||typeof a.list!=='string'||!a.list.trim()||a.list.length>80)throw Error('Choose a station and list.');
   const titles=typeof a.titles==='string'?a.titles.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];if(!titles.length||titles.length>50||titles.some(x=>x.length>200))throw Error('Enter up to 50 tasks, one per line (200 characters each).');
   const isDef=a.type==='checklist:add-default'||a.target==='default'||a.isDefault;
   if(isDef){
    const svc=a.service||s.service;if(!s.setup.services.some(v=>v.name===svc))throw Error('Choose a valid service.');
    for(const title of titles){if(s.tasks.some(t=>!t.date&&t.service===svc&&t.area===a.area&&t.list===a.list&&t.title.toLowerCase()===title.toLowerCase()))continue;let n=s.tasks.length,id='default-task-'+n;while(s.tasks.some(t=>t.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='default-task-'+(++n);s.tasks.push({id,title,area:a.area,list:a.list,service:svc,specific:false,isDefault:true});}
    // Added from a shift that already has its own list: put it on tonight's list too, as part of the routine.
    if(a.alsoShift&&svc===s.service&&s.checklistScopes.includes(key(s.date,s.service)))for(const title of titles){if(tasks(s).some(t=>t.area===a.area&&t.list===a.list&&t.title.toLowerCase()===title.toLowerCase()))continue;let n=s.tasks.length,id='shift-task-'+n;while(s.tasks.some(t=>t.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='shift-task-'+(++n);s.tasks.push({id,title,area:a.area,list:a.list,date:s.date,service:s.service,specific:false,isDefault:true});}
   }else{
    materialize(s);for(const title of titles){if(tasks(s).some(t=>t.area===a.area&&t.list===a.list&&t.title.toLowerCase()===title.toLowerCase()))continue;let n=s.tasks.length,id='shift-task-'+n;while(s.tasks.some(t=>t.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='shift-task-'+(++n);s.tasks.push({id,title,area:a.area,list:a.list,date:s.date,service:s.service,specific:a.specific!==false});}
   }
  }else if(a.type==='checklist:save-defaults'){
   if(!manager)throw Error('Only managers can set default checklists.');const svc=a.service||s.service;if(!s.setup.services.some(v=>v.name===svc))throw Error('Choose a valid service.');
   const cur=tasks(s,s.date,s.service);s.tasks=s.tasks.filter(t=>t.date||!t.service||t.service!==svc);
   for(const [i,t] of cur.entries()){let n=s.tasks.length+i,id='default-'+svc.toLowerCase()+'-'+n;while(s.tasks.some(x=>x.id===id))id='default-'+svc.toLowerCase()+'-'+(++n);s.tasks.push({id,title:t.title,area:t.area,list:t.list,service:svc,specific:false,isDefault:true});}
  }else if(a.type==='checklist:create'||a.type==='checklist:empty'||a.type==='checklist:empty-default'){
   if(!manager)throw Error('Only managers can create shift lists.');
   const isDef=a.type==='checklist:empty-default'||a.target==='default'||a.isDefault;
   if(isDef){
    const svc=a.service||s.service;if(a.area&&!s.setup.areas.includes(a.area))throw Error('Choose a valid station.');if(a.list&&(typeof a.list!=='string'||!a.list.trim()))throw Error('Choose a valid list.');
    if(!s.tasks.some(t=>!t.date&&t.service===svc)){
     const defs=defaultTasks(s,svc);
     for(const [i,t] of defs.filter(t=>(a.area&&t.area!==a.area)||(a.list&&t.list!==a.list)).entries()){
      let n=s.tasks.length+i,id='default-'+svc.toLowerCase()+'-'+n;while(s.tasks.some(x=>x.id===id))id='default-'+svc.toLowerCase()+'-'+(++n);
      s.tasks.push({id,title:t.title,area:t.area,list:t.list,service:svc,specific:false,isDefault:true});
     }
    }else{
     s.tasks=s.tasks.filter(t=>t.date||!t.service||t.service!==svc||(a.area&&t.area!==a.area)||(a.list&&t.list!==a.list));
    }
   }else{
    materialize(s);if(a.type==='checklist:empty'){if(a.area&&!s.setup.areas.includes(a.area))throw Error('Choose a valid station.');if(a.list&&(typeof a.list!=='string'||!a.list.trim()))throw Error('Choose a valid list.');const removed=tasks(s).filter(t=>(!a.area||t.area===a.area)&&(!a.list||t.list===a.list)).map(t=>t.id);s.tasks=s.tasks.filter(t=>!removed.includes(t.id));for(const id of removed)delete s.checks[key(s.date,s.service)][id];}
   }
  }else{
   if((a.type==='put'||a.type==='remove')&&a.collection==='tasks'){
    if(!manager)throw Error('Only managers can edit shift lists.');
    const id=a.type==='put'?a.item.id:a.id,old=s.tasks.find(t=>t.id===id);
    const isDef=a.target==='default'||a.isDefault||(!old?.date&&a.editDefault);
    if(isDef){
     if(a.type==='remove')s.tasks=s.tasks.filter(t=>t.id!==id);
     else if(old)s.tasks[s.tasks.indexOf(old)]={...old,...a.item,service:a.item.service||old.service||s.service,specific:false,isDefault:true};
     else s.tasks.push({...a.item,service:a.item.service||s.service,specific:false,isDefault:true});
    }else{
     if(old&&!tasks(s).some(t=>t.id===id))throw Error('This task belongs to a different shift.');
     const map=materialize(s);
     if(a.type==='put'){const isSpec=a.item.specific!==undefined?a.item.specific:(old?.specific!==undefined?old.specific:true);a.item={...a.item,id:map[id]||id,date:s.date,service:s.service,specific:isSpec};}else a.id=map[id]||id;
    }
   }
   if(a.type==='check'){
    if(!tasks(s).some(t=>t.id===a.id))throw Error('This task is not on this shift’s list.');
    if(!manager&&!stations(s,s.date,s.service,role).includes(tasks(s).find(t=>t.id===a.id).area))throw Error('Only crew assigned to this station can complete its tasks.');
   }
   const oldService=a.type==='ops:service'?s.setup.services.find(x=>x.id===a.id)?.name:null;
   s=prev.change(s,a,role);
   if(oldService&&oldService!==a.name){s.checklistScopes=s.checklistScopes.map(k=>k.slice(11)===oldService?key(k.slice(0,10),a.name):k);s.tasks.forEach(t=>{if(t.service===oldService)t.service=a.name;});}
  }
  if(!valid(s))throw Error('Check the checklist details.');return s;
 }
 B.work={tasks,defaultTasks,isSpecific,lists,stations,due};B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{const s=upgrade(prev.load(storage));if(valid(s))return s;}catch{}return B.starter();};
})();
