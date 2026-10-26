/* Checklist comments, realistic demo history, and append-only completion reporting. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const copy=x=>JSON.parse(JSON.stringify(x)),scope=(x,d,v)=>x.date===d&&x.service===v;
 const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const pad=n=>String(n).padStart(2,'0');
 const stampAt=(date,hm)=>{const [h,m]=hm.split(':').map(Number);return `${date}T${pad(h%24)}:${pad(m%60)}:00.000Z`;};
 function seedDemo(s){
  if(!s.restaurantHistory?.fictional||s.checklistDemoEnriched)return;
  const services=Object.fromEntries((s.setup?.services||[]).map(v=>[v.name,v]));
  const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||s.managerId||'jamie';
  for(const [key,checks] of Object.entries(s.checks||{})){
   const date=key.slice(0,10),svc=key.slice(11),shifts=s.shifts.filter(x=>scope(x,date,svc)),tmpl=services[svc];
   const startH=tmpl?Number(tmpl.start.slice(0,2)):16,endH=tmpl?Number(tmpl.end.slice(0,2)):22;
   const openBase=startH<6?18:startH,closeBase=endH<=startH?23:Math.max(openBase+2,endH-1);
   let idx=0;
   for(const [taskId,c] of Object.entries(checks)){
    idx++;
    if(c.at!==date+'T22:00:00.000Z'&&c.at!==date+'T22:30:00.000Z')continue;
    const t=s.tasks.find(x=>x.id===taskId);if(!t)continue;
    const areaTeam=shifts.filter(x=>x.area===t.area);
    const pool=areaTeam.length?areaTeam:shifts;
    if(pool.length)c.by=pool[hash(key+'|'+taskId)%pool.length].person;
    const mins=12+(hash(taskId+key)%36);
    c.at=stampAt(date,`${t.list==='Opening'?openBase:closeBase}:${pad(mins)}`);
   }
  }
  const hasSeed=id=>s.taskNotes.some(n=>n.id===id);
  const addNote=(id,date,service,task,by,important,body,at,stockItem='')=>{
   if(!hasSeed(id)&&s.team.some(p=>p.id===by)&&s.tasks.some(t=>t.id===task))s.taskNotes.push({id,date,service,task,body,by,important,at,stockItem});
  };
  const d0=s.date,svc0=s.service||'Dinner';
  const crewFor=area=>s.shifts.find(x=>scope(x,d0,svc0)&&x.area===area&&x.person!==manager)?.person||s.team.find(p=>p.active&&p.access==='crew'&&p.area===area)?.id||'alex';
  addNote('seed-note-floor-mgr',d0,svc0,'task-0',manager,true,'Super important today, please do not forget: Table 4 (Bennett party) is celebrating an anniversary — check all stemware and set the quiet corner before 6:00 PM.',`${d0}T14:15:00.000Z`);
  addNote('seed-note-floor-crew',d0,svc0,'task-0',crewFor('Floor'),false,'All wine glasses polished and Table 4 is set with anniversary menus.',`${d0}T15:40:00.000Z`);
  addNote('seed-note-bar-mgr',d0,svc0,'task-2',manager,true,'Super important today, please do not forget to check the backup kegs and chill extra coupe glasses before first seating.',`${d0}T14:20:00.000Z`);
  addNote('seed-note-bar-crew',d0,svc0,'task-2',crewFor('Bar'),false,'Couldn’t restock beer — we are 86 Draught pale ale until tomorrow’s delivery. Stocked extra bottled lager instead.',`${d0}T15:50:00.000Z`,'Draught pale ale');
  addNote('seed-note-kit-mgr',d0,svc0,'task-3',manager,true,'Super important today: review the roasted squash risotto dairy allergy notes with every server before line-up.',`${d0}T14:25:00.000Z`);
  addNote('seed-note-kit-crew',d0,svc0,'task-3',crewFor('Kitchen'),false,'Confirmed with kitchen & floor — burrata is 86 tonight, offering roasted beet salad as the substitute.',`${d0}T15:45:00.000Z`,'Burrata');
  const mgrNotes=[
   ['task-0','Super important today, please do not forget: VIP window tables need fresh linens and candle holders checked before opening.'],
   ['task-2','Super important today, please do not forget to flush the tap lines and verify garnish trays before 4:30 PM.'],
   ['task-3','Super important today: please confirm all allergy prep labels with the line before the first ticket.'],
   ['task-4','Please do not forget to wipe down all check presenters and reset the host stand for tomorrow’s lunch.']
  ];
  const crewNotes=[
   ['task-2','Couldn’t restock Miller Lite — we are 86 Miller Lite, stocked bottled lager and pale ale in the front reach-in.','Miller Lite'],
   ['task-6','Counted bar inventory — running low on Fever-Tree tonic and Angostura bitters for the weekend.',''],
   ['task-5','Walk-in shelves labeled and dated. Day-dot labels restocked on the prep table.',''],
   ['task-1','Seated chart updated with the two large party bookings; high chairs staged by station 2.','']
  ];
  const pastKeys=Object.keys(s.checks||{}).filter(k=>k.slice(0,10)<d0).sort().reverse();
  for(const [idx,key] of pastKeys.entries()){
   if(idx>7&&hash(key)%5!==0)continue;
   const date=key.slice(0,10),svc=key.slice(11),n=hash(key);
   const [mTask,mBody]=mgrNotes[n%mgrNotes.length];
   addNote(`seed-hist-mgr-${date}-${svc}`,date,svc,mTask,manager,true,mBody,`${date}T13:30:00.000Z`);
   if(idx<5||n%2===0){
    const [cTask,cBody,cStock]=crewNotes[(n>>>3)%crewNotes.length];
    const tObj=s.tasks.find(x=>x.id===cTask);
    const by=s.shifts.find(x=>scope(x,date,svc)&&x.area===tObj?.area)?.person||s.checks[key]?.[cTask]?.by||manager;
    addNote(`seed-hist-crew-${date}-${svc}`,date,svc,cTask,by,false,cBody,`${date}T16:45:00.000Z`,cStock);
   }
  }
  s.checklistDemoEnriched=true;
 }
 function upgrade(state){
  const s=copy(state);s.taskNotes??=[];s.taskEvents??=[];
  if(s.taskEvents.length>500&&s.taskEvents.some(x=>x.legacy))s.taskEvents=s.taskEvents.filter(x=>!x.legacy);
  seedDemo(s);
  return s;
 }
 function valid(s){try{if(!prev.valid(s))return false;return (!s.taskNotes||Array.isArray(s.taskNotes)&&s.taskNotes.every(n=>typeof n.id==='string'&&B.isDate(n.date)&&typeof n.service==='string'&&typeof n.task==='string'&&typeof n.body==='string'&&n.body.trim()&&n.body.length<=2000&&s.team.some(p=>p.id===n.by)&&typeof n.important==='boolean'&&typeof n.at==='string'))&&(!s.taskEvents||Array.isArray(s.taskEvents)&&s.taskEvents.every(x=>B.isDate(x.date)&&typeof x.task==='string'&&typeof x.title==='string'&&typeof x.at==='string'&&s.team.some(p=>p.id===x.by)&&['completed','reopened','added','edited','removed'].includes(x.kind)));}catch{return false;}}
 const notes=(s,id,date=s.date,service=s.service)=>(s.taskNotes||[]).filter(n=>n.task===id&&scope(n,date,service)).sort((a,b)=>Number(b.important)-Number(a.important)||a.at.localeCompare(b.at));
 function change(state,a,role=state.role){let s=upgrade(state);const actor=B.actor(role,s.crewId,s.managerId),manager=role==='manager';const now=new Date().toISOString();
  if(a.type==='checklist:note'){
   const date=a.date||s.date,service=a.service||s.service;
   const task=B.work.tasks(s,date,service).find(t=>t.id===a.task);if(!task)throw Error('This task is no longer on the shift.');
   if(!s.team.some(p=>p.id===actor&&p.active&&p.access===role)||(!manager&&!B.work.stations(s,date,service,role).includes(task.area)))throw Error('Only this station’s assigned crew or managers can add notes.');
   if(typeof a.body!=='string'||!a.body.trim()||a.body.length>2000)throw Error('Write a note of up to 2,000 characters.');
   if(a.important&&!manager)throw Error('Only managers can mark a note important.');
   if(typeof a.id!=='string'||!a.id||s.taskNotes.some(n=>n.id===a.id))throw Error('Invalid or duplicate note.');
   if(a.stockItem?.trim())s=prev.change(s,{type:'ops:alert',id:'stock-'+a.id,date,service,name:a.stockItem.trim(),reason:a.body.trim().slice(0,500),area:task.area},role);
   s.taskNotes.push({id:a.id,date,service,task:task.id,body:a.body.trim(),by:actor,important:manager&&!!a.important,at:now,stockItem:a.stockItem?.trim()||''});
  }else{
   const key=s.date+'|'+s.service,oldChecks=s.checks[key]||{};
   const before=B.work.tasks(s).map(t=>({...t})),wasScoped=s.checklistScopes.includes(key);
   const ensureLegacyEvent=t=>{const c=oldChecks[t.id];if(c&&!s.taskEvents.some(x=>scope(x,s.date,s.service)&&x.task===t.id&&x.kind==='completed'))s.taskEvents.push({id:'legacy-'+s.date+'-'+s.service+'-'+t.id,date:s.date,service:s.service,task:t.id,title:t.title,area:t.area,list:t.list,kind:'completed',by:c.by,at:c.at,legacy:true});};
   if(a.type==='check'){const t=before.find(x=>x.id===a.id);if(t)ensureLegacyEvent(t);}
   if((['put','remove'].includes(a.type)&&a.collection==='tasks')||['checklist:add','checklist:empty'].includes(a.type))before.forEach(ensureLegacyEvent);
   s=prev.change(s,a,role);
   const after=B.work.tasks(s),becameScoped=!wasScoped&&s.checklistScopes.includes(key);
   const resolve=t=>after.find(x=>x.id===t.id)||(becameScoped?after.find(x=>x.sourceTask===t.id):null);
   const event=(t,kind)=>s.taskEvents.push({id:'event-'+now+'-'+s.taskEvents.length,date:s.date,service:s.service,task:t.id,title:t.title,area:t.area,list:t.list,kind,by:actor,at:now,legacy:false});
   if(a.type==='check'){const t=after.find(t=>t.id===a.id);const old=oldChecks[a.id];if(t&&!!old!==!!a.done)event(t,a.done?'completed':'reopened');}
   if((['put','remove'].includes(a.type)&&a.collection==='tasks')||['checklist:add','checklist:empty'].includes(a.type)){
    for(const t of before){const current=resolve(t);if(!current){const alias=[...s.taskNotes,...s.taskEvents].find(x=>scope(x,s.date,s.service)&&x.sourceTask===t.id);event(alias?{...t,id:alias.task}:t,'removed');}else if(t.title!==current.title||t.area!==current.area||t.list!==current.list)event(current,'edited');}
    for(const t of after)if(!before.some(x=>resolve(x)?.id===t.id))event(t,'added');
   }
   if(a.type==='ops:service'){const old=state.setup.services.find(x=>x.id===a.id)?.name;if(old&&old!==a.name)for(const list of [s.taskEvents,s.taskNotes])for(const x of list)if(x.service===old)x.service=a.name;}
  }
  if(!valid(s))throw Error('The checklist update could not be saved.');return s;
 }
 function history(s,from,to,service='',area='',options={}){
  if(s.role!=='manager')throw Error('Only managers can view checklist reports.');if(!B.isDate(from)||!B.isDate(to)||from>to)throw Error('Choose a valid date range.');
  const {person='',filter=''}=options;
  const keys=new Set([...s.shifts.map(x=>x.date+'|'+x.service),...Object.keys(s.checks),...s.checklistScopes,...(s.taskEvents||[]).map(x=>x.date+'|'+x.service),...(s.taskNotes||[]).map(x=>x.date+'|'+x.service)]);
  return [...keys].filter(k=>k.slice(0,10)>=from&&k.slice(0,10)<=to&&(!service||k.slice(11)===service)).sort().reverse().map(k=>{
   const date=k.slice(0,10),svc=k.slice(11),checks=s.checks[k]||{},current=B.work.tasks(s,date,svc),events=(s.taskEvents||[]).filter(x=>scope(x,date,svc));
   const shifts=s.shifts.filter(x=>scope(x,date,svc));
   const team=[...new Set(shifts.map(x=>x.person))].map(id=>{const p=B.person(id);return {id,name:p?.name||'Team member',role:p?.role||'',area:shifts.find(x=>x.person===id)?.area||p?.area||''};});
   const removed=events.filter(x=>x.kind==='removed'&&!current.some(t=>t.id===x.task)).filter((x,i,arr)=>arr.findIndex(y=>y.task===x.task)===i).map(x=>({id:x.task,title:x.title,area:x.area,list:x.list,removed:true}));
   const allRows=[...current,...removed].sort((a,b)=>(a.list===b.list?0:a.list==='Opening'?-1:1)||a.area.localeCompare(b.area)||a.title.localeCompare(b.title)).filter(t=>!area||t.area===area).map(t=>{
    const check=checks[t.id],rowNotes=notes(s,t.id,date,svc),rowEvents=events.filter(x=>x.task===t.id).slice();
    if(check&&!rowEvents.some(x=>x.kind==='completed'))rowEvents.unshift({id:'legacy-'+date+'-'+svc+'-'+t.id,date,service:svc,task:t.id,title:t.title,area:t.area,list:t.list,kind:'completed',by:check.by,at:check.at,legacy:true});
    const assigned=[...new Set(shifts.filter(x=>x.area===t.area).map(x=>B.person(x.person)?.name).filter(Boolean))];
    return {...t,check,assigned,notes:rowNotes,events:rowEvents};
   });
   const rows=allRows.filter(t=>{
    if(person&&t.check?.by!==person&&!t.notes.some(n=>n.by===person))return false;
    if(filter==='incomplete')return !t.removed&&!t.check;
    if(filter==='completed')return !t.removed&&!!t.check;
    if(filter==='notes')return t.notes.length>0;
    if(filter==='important')return t.notes.some(n=>n.important);
    return true;
   });
   const activeRows=rows.filter(t=>!t.removed);
   const byCounts={};
   for(const r of activeRows)if(r.check?.by)byCounts[r.check.by]=(byCounts[r.check.by]||0)+1;
   const contributors=Object.entries(byCounts).map(([id,count])=>({id,name:B.person(id)?.name||'Team member',role:B.person(id)?.role||'',count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
   return {
    date,service:svc,rows,team,contributors,
    totalCount:activeRows.length,
    completedCount:activeRows.filter(t=>t.check).length,
    openingTotal:activeRows.filter(t=>t.list==='Opening').length,
    openingDone:activeRows.filter(t=>t.list==='Opening'&&t.check).length,
    closingTotal:activeRows.filter(t=>t.list==='Closing').length,
    closingDone:activeRows.filter(t=>t.list==='Closing'&&t.check).length,
    noteCount:rows.reduce((sum,t)=>sum+t.notes.length,0),
    importantCount:rows.reduce((sum,t)=>sum+t.notes.filter(n=>n.important).length,0)
   };
  }).filter(x=>x.rows.length);
 }
 const csvCell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
 function historyCSV(s,from,to,service='',area='',options={}){
  const groups=history(s,from,to,service,area,options);
  const rows=[
   ['Brigly checklist completion & notes report'],
   ['From',from,'Through',to,'Service',service||'All services','Station',area||'All stations'],
   ['Generated',new Date().toISOString()],
   [],
   ['Date','Service','Station','Phase','Task','Status','Completed by','Completed at','Assigned station crew','Important notes','All task notes']
  ];
  for(const g of groups)for(const t of g.rows){
   const status=t.removed?'Removed from list':t.check?'Completed':'Incomplete';
   const who=t.check?(B.person(t.check.by)?.name||t.check.by):'';
   const when=t.check?.at||'';
   const imp=t.notes.filter(n=>n.important).map(n=>`${B.person(n.by)?.name||n.by}: ${n.body}`).join(' | ');
   const allNotes=t.notes.map(n=>`${n.important?'[Important] ':''}${B.person(n.by)?.name||n.by}: ${n.body}${n.stockItem?' (86: '+n.stockItem+')':''}`).join(' | ');
   rows.push([g.date,g.service,t.area,t.list,t.title,status,who,when,(t.assigned||[]).join(', '),imp,allNotes]);
  }
  return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
 }
 B.work.notes=notes;B.work.history=history;B.work.historyCSV=historyCSV;B.starter=(...args)=>upgrade(prev.starter(...args));B.load=storage=>upgrade(prev.load(storage));B.change=change;B.validState=valid;
})();
