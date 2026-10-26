/* Per-service checklist overrides and recipient-only demo correspondence. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const clone=x=>JSON.parse(JSON.stringify(x));
 const key=(date,service)=>date+'|'+service;
 function upgrade(s){s=clone(s);s.checklistScopes??=[];s.privateItems??=[];return s;}
 function tasks(s,date=s.date,service=s.service){return s.tasks.filter(t=>s.checklistScopes?.includes(key(date,service))?t.date===date&&t.service===service:!t.date);}
 function stations(s,date=s.date,service=s.service,role=s.role){const id=B.actor(role,s.crewId,s.managerId);return [...new Set(s.shifts.filter(x=>x.person===id&&x.date===date&&x.service===service).map(x=>x.area))];}
 function visible(s,role=s.role){const id=B.actor(role,s.crewId,s.managerId);return (s.privateItems||[]).filter(x=>role==='manager'?x.author===id:x.recipient===id);}
 function valid(s){try{s=upgrade(s);return prev.valid(s)&&Array.isArray(s.checklistScopes)&&new Set(s.checklistScopes).size===s.checklistScopes.length&&s.checklistScopes.every(k=>B.isDate(k.slice(0,10))&&s.setup.services.some(v=>v.name===k.slice(11)))&&s.tasks.every(t=>!t.date||(B.isDate(t.date)&&s.setup.services.some(v=>v.name===t.service)))&&Array.isArray(s.privateItems)&&s.privateItems.length<=10000&&new Set(s.privateItems.map(x=>x.id)).size===s.privateItems.length&&s.privateItems.every(x=>typeof x.id==='string'&&x.id.length>0&&x.id.length<=100&&s.team.some(p=>p.id===x.author)&&s.team.some(p=>p.id===x.recipient)&&['note','todo'].includes(x.kind)&&typeof x.body==='string'&&x.body.trim()&&x.body.length<=2000&&(!x.due||B.isDate(x.due))&&typeof x.done==='boolean'&&typeof x.read==='boolean'&&typeof x.archived==='boolean'&&typeof x.created==='string');}catch{return false;}}
 function materialize(s){const k=key(s.date,s.service),map={};if(s.checklistScopes.includes(k))return map;const originals=tasks(s);const checks=s.checks[k]||{};s.checks[k]={};for(const [i,t] of originals.entries()){let n=s.tasks.length+i,id='shift-task-'+n;while(s.tasks.some(x=>x.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='shift-task-'+(++n);map[t.id]=id;s.tasks.push({...t,id,sourceTask:t.id,date:s.date,service:s.service});for(const records of [s.taskNotes||[],s.taskEvents||[]])for(const x of records)if(x.date===s.date&&x.service===s.service&&x.task===t.id){x.sourceTask=t.id;x.task=id;}if(checks[t.id])s.checks[k][id]=checks[t.id];}s.checklistScopes.push(k);return map;}
 function change(state,action,role=state.role){let s=upgrade(state),a=clone(action);const actor=B.actor(role,s.crewId,s.managerId),manager=role==='manager';
  if(!s.team.some(p=>p.id===actor&&p.active&&p.access===role))throw Error('Choose an active team member.');
  if(a.type==='checklist:add'){
   if(!manager)throw Error('Only managers can add tasks.');if(!s.setup.areas.includes(a.area)||!['Opening','Closing'].includes(a.list))throw Error('Choose a station and list.');
   const titles=typeof a.titles==='string'?a.titles.split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[];if(!titles.length||titles.length>50||titles.some(x=>x.length>200))throw Error('Enter up to 50 tasks, one per line (200 characters each).');
   materialize(s);for(const title of titles){if(tasks(s).some(t=>t.area===a.area&&t.list===a.list&&t.title.toLowerCase()===title.toLowerCase()))continue;let n=s.tasks.length,id='shift-task-'+n;while(s.tasks.some(t=>t.id===id)||(s.taskEvents||[]).some(x=>x.task===id)||(s.taskNotes||[]).some(x=>x.task===id))id='shift-task-'+(++n);s.tasks.push({id,title,area:a.area,list:a.list,date:s.date,service:s.service});}
  }else if(a.type==='checklist:create'||a.type==='checklist:empty'){
   if(!manager)throw Error('Only managers can create shift lists.');materialize(s);if(a.type==='checklist:empty'){if(a.area&&!s.setup.areas.includes(a.area))throw Error('Choose a valid station.');if(a.list&&!['Opening','Closing'].includes(a.list))throw Error('Choose a valid list.');const removed=tasks(s).filter(t=>(!a.area||t.area===a.area)&&(!a.list||t.list===a.list)).map(t=>t.id);s.tasks=s.tasks.filter(t=>!removed.includes(t.id));for(const id of removed)delete s.checks[key(s.date,s.service)][id];}
  }else if(a.type.startsWith('private:')){
   if(a.type==='private:send'){
    if(!manager)throw Error('Only managers can send private notes and to-dos.');
    if(!s.team.some(p=>p.id===a.recipient&&p.active&&p.access==='crew'))throw Error('Choose an active crew member.');
    if(s.privateItems.some(x=>x.id===a.id))throw Error('This message already exists.');
    s.privateItems.push({id:a.id,author:actor,recipient:a.recipient,kind:a.kind,body:a.body?.trim(),due:a.due||'',done:false,read:false,archived:false,created:new Date().toISOString()});
   }else{const item=s.privateItems.find(x=>x.id===a.id);if(!item)throw Error('Message not found.');
    if(a.type==='private:archive'){if(!manager||item.author!==actor)throw Error('Only the sending manager can archive this item.');item.archived=!item.archived;}
    else{if(role!=='crew'||item.recipient!==actor||item.archived)throw Error('Only the recipient can update this item.');if(a.type==='private:read')item.read=true;else if(a.type==='private:done'&&item.kind==='todo'){item.done=!item.done;item.read=true;}else throw Error('Invalid private item action.');}
   }
  }else{
   if((a.type==='put'||a.type==='remove')&&a.collection==='tasks'){
    if(!manager)throw Error('Only managers can edit shift lists.');
    const id=a.type==='put'?a.item.id:a.id,old=s.tasks.find(t=>t.id===id);
    if(old&&!tasks(s).some(t=>t.id===id))throw Error('This task belongs to a different shift.');
    const map=materialize(s);
    if(a.type==='put')a.item={...a.item,id:map[id]||id,date:s.date,service:s.service};else a.id=map[id]||id;
   }
   if(a.type==='check'){
    if(!tasks(s).some(t=>t.id===a.id))throw Error('This task is not on this shift’s list.');
    if(!manager&&!stations(s,s.date,s.service,role).includes(tasks(s).find(t=>t.id===a.id).area))throw Error('Only crew assigned to this station can complete its tasks.');
   }
   const oldService=a.type==='ops:service'?s.setup.services.find(x=>x.id===a.id)?.name:null;
   s=prev.change(s,a,role);
   if(oldService&&oldService!==a.name){s.checklistScopes=s.checklistScopes.map(k=>k.slice(11)===oldService?key(k.slice(0,10),a.name):k);s.tasks.forEach(t=>{if(t.service===oldService)t.service=a.name;});}
  }
  if(!valid(s))throw Error('Check the recipient, message and date.');return s;
 }
 B.work={tasks,visible,stations};B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{const s=upgrade(prev.load(storage));if(valid(s))return s;}catch{}return B.starter();};
})();
