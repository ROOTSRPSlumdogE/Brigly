/* Shared destinations: daily restaurant operation navigation, semantic color tones, and live shift notifications. */
globalThis.BriglyNavigation={
 groups(manager){return [
  {label:'Live service',items:[
   ['app-screen','home','Today','home','orange'],
   ['navigate','lists','Checklists','lists','sage'],
   ['navigate','onboarding','Shift briefing','onboarding','amber'],
   ['navigate','eighty-six','86 board','eighty-six','danger'],
   ['navigate','reservations','Reservations','reservations','slate'],
   ['navigate','specials','Specials','specials','amber'],
   ['navigate','orders','Supplies','orders','slate']
  ]},
  {label:manager?'Team & operations':'My schedule & pay',items:[
   ['app-screen','shifts',manager?'Roster':'My schedule','schedules','slate'],
   ['app-screen','requests',manager?'Inbox & approvals':'Requests','onboarding','orange'],
   ['navigate','private','Private notes','private','sage'],
   ['app-screen','earnings',manager?'Labor & pay':'Earnings','earnings','sage'],
   ...(manager?[['app-screen','reports','Reports','reports','slate'],['app-screen','setup','Team & setup','team','slate']]:[])
  ]}
 ];},
 serviceItems(){return [
  ['navigate','onboarding','Shift briefing','onboarding','amber'],
  ['navigate','lists','Checklists','lists','sage'],
  ['navigate','eighty-six','86 board','eighty-six','danger'],
  ['navigate','specials','Specials','specials','amber'],
  ['navigate','reservations','Reservations','reservations','slate'],
  ['navigate','orders','Supplies','orders','slate']
 ];},
 active(screen,id){return screen===id||(screen==='briefing'&&id==='onboarding');},
 service(screen){return ['briefing','onboarding','lists','eighty-six','specials','reservations','orders'].includes(screen);},
 primary(manager){return manager?[
  ['app-screen','home','Today','home','orange'],
  ['navigate','lists','Checklists','lists','sage'],
  ['navigate','eighty-six','86 board','eighty-six','danger'],
  ['app-screen','shifts','Roster','schedules','slate']
 ]:[
  ['app-screen','home','Today','home','orange'],
  ['navigate','lists','Checklists','lists','sage'],
  ['navigate','onboarding','Briefing','onboarding','amber'],
  ['app-screen','shifts','Schedule','schedules','slate']
 ];},
 badges(state){
  const B=globalThis.Brigly;if(!B||!state)return {};
  const manager=state.role==='manager',me=B.actor(state.role,state.crewId,state.managerId);
  const scoped=x=>B.scoped(x,state.date,state.service);
  const tasks=(B.work?B.work.tasks(state,state.date,state.service):state.tasks).filter(x=>manager||(B.work?B.work.stations(state,state.date,state.service).includes(x.area):true));
  const checks=state.checks[`${state.date}|${state.service}`]||{};
  const openTasks=tasks.filter(x=>!checks[x.id]).length;
  const alerts=state.unavailable.filter(scoped),reported86=alerts.filter(x=>x.status==='Reported').length,approved86=alerts.filter(x=>x.status==='Approved').length;
  const unreadBriefings=state.briefings.filter(x=>scoped(x)&&!x.acks.includes(me)).length;
  const openRequests=state.scheduling.requests.filter(r=>manager?['Reported','Pending'].includes(r.status):(r.person===me||r.targetPerson===me)&&['Reported','Pending','Awaiting teammate'].includes(r.status)).length;
  const unreadPrivate=(state.privateNotes||[]).filter(n=>n.recipient===me&&!n.readAt).length+(state.personalTasks||[]).filter(t=>t.assignee===me&&!t.done).length;
  const openOrders=state.orders.filter(o=>o.status==='Requested').length;
  const activeRes=state.reservations.filter(r=>scoped(r)&&['Confirmed','Seated'].includes(r.status)).length;
  const activeSpecials=state.specials.filter(s=>scoped(s)&&s.active).length;
  return {
   lists:tasks.length?(openTasks?{text:String(openTasks),tone:'sage'}:{text:'✓',tone:'sage'}):null,
   onboarding:unreadBriefings?{text:String(unreadBriefings),tone:'amber'}:null,
   'eighty-six':reported86?{text:String(reported86)+' new',tone:'danger'}:approved86?{text:String(approved86),tone:'danger'}:null,
   reservations:activeRes?{text:String(activeRes),tone:'slate'}:null,
   specials:activeSpecials?{text:String(activeSpecials),tone:'amber'}:null,
   orders:openOrders?{text:String(openOrders),tone:manager?'amber':'slate'}:null,
   requests:openRequests?{text:String(openRequests),tone:'orange'}:null,
   private:unreadPrivate?{text:String(unreadPrivate),tone:'sage'}:null
  };
 }
};

globalThis.BriglyNotifications={
 build(state,readSet=new Set()){
  const B=globalThis.Brigly;if(!B||!state)return [];
  const manager=state.role==='manager',me=B.actor(state.role,state.crewId,state.managerId),personName=id=>B.person(id)?.name||'Team member';
  const scoped=x=>B.scoped(x,state.date,state.service),items=[];
  const push=item=>{const unread=!readSet.has(item.id);items.push({...item,unread});};

  // 1. Urgent attendance alerts (sick / late) on selected date or open reported requests
  const team=state.shifts.filter(x=>x.date===state.date&&x.service===state.service);
  if(manager){
   for(const s of team){
    const m=B.schedule.metrics(state,s);
    if(m.absence||m.late){
     push({
      id:`att-${s.id}-${m.absence?'abs':'late'}`,
      category:'urgent',
      tone:m.absence?'danger':'amber',
      badge:m.absence?'Coverage needed':'Running late',
      time:`${state.service} · ${s.start}–${s.end}`,
      title:`${personName(s.person)} · ${m.absence?'Reported absent':'Reported '+m.late.minutes+' min late'}`,
      body:`${s.area} station for ${state.service} on ${state.date}. ${m.absence?'Reassign or cover this shift on the roster.':'Confirm arrival time when they check in.'}`,
      actions:[
       {label:'Review in Inbox',action:'notif-go',screen:'requests',style:'primary'},
       {label:'Open roster',action:'notif-go',screen:'shifts',style:'secondary'}
      ]
     });
    }
   }
  }

  // 2. 86 reports awaiting manager approval & confirmed 86 alerts
  const alerts=state.unavailable.filter(scoped),reported=alerts.filter(x=>x.status==='Reported'),approved=alerts.filter(x=>x.status==='Approved');
  for(const a of reported){
   if(manager){
    push({
     id:`86-rep-${a.id}`,
     category:'urgent',
     tone:'danger',
     badge:'86 approval needed',
     time:`${a.area} · Reported by ${personName(a.author)}`,
     title:`86 report: ${a.name}`,
     body:a.reason||'Reported unavailable by the crew. Approve to alert the whole floor and kitchen.',
     actions:[
      {label:'Approve 86',action:'ops-approve-alert',id:a.id,style:'primary'},
      {label:'Open 86 board',action:'notif-go',view:'eighty-six',style:'secondary'}
     ]
    });
   }else{
    push({
     id:`86-pending-${a.id}`,
     category:'service',
     tone:'amber',
     badge:'Awaiting manager',
     time:`${a.area} · ${state.service}`,
     title:`Unconfirmed 86: ${a.name}`,
     body:`${a.reason} — Reported by ${personName(a.author)}, waiting for manager confirmation.`,
     actions:[{label:'View 86 board',action:'notif-go',view:'eighty-six',style:'secondary'}]
    });
   }
  }
  if(approved.length){
   push({
    id:`86-active-${state.date}-${state.service}-${approved.map(x=>x.id).join(',')}`,
    category:'service',
    tone:'danger',
    badge:`${approved.length} confirmed 86`,
    time:`${state.service} · Live menu`,
    title:`Unavailable this service: ${approved.map(x=>x.name).join(', ')}`,
    body:approved.map(x=>`${x.name} (${x.area}): ${x.reason}`).join(' · '),
    actions:[{label:'Open 86 board',action:'notif-go',view:'eighty-six',style:'secondary'}]
   });
  }

  // 3. Task notes on checklists (Manager priority notes + Crew 86/handover notes)
  const tasks=B.work?B.work.tasks(state,state.date,state.service):[];
  const checks=state.checks[`${state.date}|${state.service}`]||{};
  const myStations=B.work?B.work.stations(state,state.date,state.service):state.setup.areas;
  for(const t of tasks){
   if(!manager&&!myStations.includes(t.area))continue;
   const notes=B.work?.notes?.(state,t.id)||[];
   for(const n of notes){
    const isPriority=!!n.important,has86=!!n.stockItem;
    const tone=has86?'danger':isPriority?'orange':'sage';
    const category=isPriority||has86?'urgent':'service';
    push({
     id:`tasknote-${n.id||t.id+'-'+n.at}`,
     category,
     tone,
     badge:has86?`Task 86 · ${n.stockItem}`:isPriority?'Manager priority note':'Crew task note',
     time:`${t.area} · ${t.list} checklist · ${checks[t.id]?'Completed':'Open task'}`,
     title:`${t.title}`,
     body:`${personName(n.by)}: "${n.body}"`,
     actions:[
      {label:`Open ${t.area} checklist`,action:'notif-task',area:t.area,list:t.list,task:t.id,style:isPriority||has86?'primary':'secondary'}
     ]
    });
   }
  }

  // 4. Unread shift briefings
  const briefings=state.briefings.filter(scoped);
  for(const b of briefings){
   const acked=b.acks.includes(me);
   if(!manager&&!acked){
    push({
     id:`brief-${b.id}`,
     category:'urgent',
     tone:'amber',
     badge:'Unread briefing',
     time:`${state.service} · Pre-shift`,
     title:b.title,
     body:b.body,
     actions:[
      {label:'I’ve read this',action:'ack',id:b.id,style:'primary'},
      {label:'Open briefing',action:'notif-go',view:'onboarding',style:'secondary'}
     ]
    });
   }else if(manager){
    const expected=new Set(team.map(x=>x.person)).size||state.team.filter(x=>x.active&&x.access==='crew').length;
    if(b.acks.length<expected){
     push({
      id:`brief-mgr-${b.id}-${b.acks.length}`,
      category:'service',
      tone:'amber',
      badge:`${b.acks.length}/${expected} read`,
      time:`${state.service} briefing`,
      title:`Briefing acknowledgements: ${b.title}`,
      body:`${b.acks.length} of ${expected} team members have confirmed reading today’s shift briefing.`,
      actions:[{label:'View briefing',action:'notif-go',view:'onboarding',style:'secondary'}]
     });
    }
   }
  }

  // 5. Pending schedule requests & swap invites
  const openReqs=state.scheduling.requests.filter(r=>manager?['Reported','Pending'].includes(r.status):(r.targetPerson===me&&r.status==='Awaiting teammate')||(r.person===me&&['Pending','Reported'].includes(r.status)));
  for(const r of openReqs){
   if(manager&&r.status==='Reported')continue; // already covered in urgent attendance if today, or add if another date
   const isSwapInvite=!manager&&r.kind==='swap'&&r.targetPerson===me&&r.status==='Awaiting teammate';
   push({
    id:`req-${r.id}-${r.status}`,
    category:isSwapInvite?'urgent':'team',
    tone:'orange',
    badge:isSwapInvite?'Swap invitation':r.status,
    time:`Schedule · ${r.date||r.from||state.date}`,
    title:isSwapInvite?`${personName(r.person)} asked to swap a shift with you`:`${personName(r.person)} · ${r.kind==='timeoff'?'Time-off request':r.kind==='swap'?'Shift swap request':'Attendance report'}`,
    body:r.note||B.schedule.requestSummary(r),
    actions:[{label:manager?'Review request':'Open requests',action:'notif-go',screen:'requests',style:'primary'}]
   });
  }

  // 6. Unread private notes & open personal tasks
  const unreadNotes=(state.privateNotes||[]).filter(n=>n.recipient===me&&!n.readAt);
  for(const n of unreadNotes){
   push({
    id:`priv-note-${n.id}`,
    category:'team',
    tone:'sage',
    badge:'Private note',
    time:`From ${personName(n.author)}`,
    title:n.title||'New private note from your manager',
    body:n.body,
    actions:[{label:'Read note',action:'notif-go',view:'private',style:'primary'}]
   });
  }
  const openTodos=(state.personalTasks||[]).filter(t=>t.assignee===me&&!t.done);
  if(openTodos.length){
   push({
    id:`priv-todo-${me}-${openTodos.length}`,
    category:'team',
    tone:'sage',
    badge:`${openTodos.length} personal task${openTodos.length===1?'':'s'}`,
    time:`Assigned to you`,
    title:`${openTodos.length} open personal to-do${openTodos.length===1?'':'s'}: ${openTodos.map(x=>x.title).slice(0,2).join(', ')}`,
    body:`Assigned for your role. Check off when completed.`,
    actions:[{label:'Open private tasks',action:'notif-go',view:'private',style:'secondary'}]
   });
  }

  // 7. Supply requests awaiting manager review
  const reqOrders=state.orders.filter(o=>o.status==='Requested');
  if(manager&&reqOrders.length){
   push({
    id:`orders-req-${reqOrders.map(x=>x.id).join(',')}`,
    category:'service',
    tone:'amber',
    badge:`${reqOrders.length} supply request${reqOrders.length===1?'':'s'}`,
    time:`Station supplies`,
    title:`Supplies requested: ${reqOrders.map(x=>x.name).join(', ')}`,
    body:reqOrders.map(x=>`${x.quantity} ${x.unit} ${x.name} (${x.area})`).join(' · '),
    actions:[{label:'Review supplies',action:'notif-go',view:'orders',style:'secondary'}]
   });
  }

  // 8. Checklist progress pulse
  const scopedTasks=tasks.filter(x=>manager||myStations.includes(x.area));
  if(scopedTasks.length){
   const done=scopedTasks.filter(x=>checks[x.id]).length;
   push({
    id:`check-pulse-${state.date}-${state.service}-${done}`,
    category:'service',
    tone:'sage',
    badge:`${done}/${scopedTasks.length} tasks done`,
    time:`${state.service} · ${state.date}`,
    title:done===scopedTasks.length?`All ${scopedTasks.length} checklist tasks complete!`:`${scopedTasks.length-done} checklist task${scopedTasks.length-done===1?'':'s'} remaining for ${state.service}`,
    body:manager?`Track station progress across Floor, Bar, and Kitchen or review historical completion reports.`:`Your station (${myStations.join(', ')}) has ${scopedTasks.length-done} open task${scopedTasks.length-done===1?'':'s'}.`,
    actions:[
     {label:'Open checklists',action:'notif-go',view:'lists',style:'secondary'},
     ...(manager?[{label:'Checklist reports',action:'checklist-report-open',id:'history',style:'secondary'}]:[])
    ]
   });
  }

  return items;
 }
};

