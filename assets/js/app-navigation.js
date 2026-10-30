/* Shared destinations: daily restaurant operation navigation, semantic color tones, and live shift notifications. */
globalThis.BriglyNavigation={
 groups(manager){return [
  // Labels are the names the website uses; ids and routes stay (shifts = Scheduling, specials = Specials & events, manage = Team & payroll).
  {label:'Service',items:[
   ['app-screen','home','Today','home','orange'],
   ['navigate','lists','Checklists','lists','sage'],
   ['navigate','stock','Stock & 86s','stock','danger'],
   ['navigate','menu','Menu & allergens','menu','amber'],
   ['navigate','pos','POS','pos','orange'],
   ['navigate','reservations','Reservations','reservations','slate'],
   ['navigate','specials','Specials & events','specials','amber']
  ]},
  manager?{label:'Team',items:[
   ['app-screen','shifts','Scheduling','schedules','slate'],
   ['app-screen','manage','Team & payroll','team','slate'],
   ['app-screen','training','Training','training','amber'],
   ['app-screen','reports','Reports','reports','slate']
  ]}:{label:'Me',items:[
   // Crew get one hub: schedule, requests, earnings, training and their file live inside My space.
   ['app-screen','me','My space','me','orange'],
   ['app-screen','training','Training','training','amber']
  ]}
 ];},
 serviceItems(){return [
  ['navigate','lists','Checklists','lists','sage'],
  ['navigate','stock','Stock & 86s','stock','danger'],
  ['navigate','pos','POS','pos','orange'],
  ['navigate','menu','Menu & allergens','menu','amber'],
  ['navigate','specials','Specials & events','specials','amber'],
  ['navigate','reservations','Reservations','reservations','slate']
 ];},
 hub:['me','shifts','earnings','requests','myfile'],
 active(screen,id){return screen===id||(screen==='briefing'&&id==='home')||(id==='me'&&this.hub.includes(screen));},
 service(screen){return ['lists','stock','specials','reservations','pos','menu'].includes(screen);},
 // Phone dock: Today and the two screens everyone uses during service; demo.js adds Chat and More, everything else lives in the More sheet.
 primary(){return [
  ['app-screen','home','Today','home','orange'],
  ['navigate','lists','Checklists','lists','sage'],
  ['navigate','stock','Stock','stock','danger']
 ];},
 badges(state){
  const B=globalThis.Brigly;if(!B||!state)return {};
  const manager=state.role==='manager',me=B.actor(state.role,state.crewId,state.managerId);
  const scoped=x=>B.scoped(x,state.date,state.service);
  const tasks=(B.work?B.work.tasks(state,state.date,state.service):state.tasks).filter(x=>manager||(B.work?B.work.stations(state,state.date,state.service).includes(x.area):true));
  const checks=state.checks[`${state.date}|${state.service}`]||{};
  const openTasks=tasks.filter(x=>!checks[x.id]).length;
  const alerts=state.unavailable.filter(scoped),reported86=alerts.filter(x=>x.status==='Reported').length,approved86=alerts.filter(x=>x.status==='Approved').length;
  const unreadBriefings=state.briefings.filter(x=>scoped(x)&&!x.acks.includes(me)&&x.author!==me).length;
  const openRequests=state.scheduling.requests.filter(r=>manager?['Reported','Pending'].includes(r.status):(r.person===me||r.targetPerson===me)&&['Reported','Pending','Awaiting teammate'].includes(r.status)).length;
  const openOrders=state.orders.filter(o=>o.status==='Requested').length;
  const activeRes=state.reservations.filter(r=>scoped(r)&&['Confirmed','Seated'].includes(r.status)).length;
  const activeSpecials=state.specials.filter(s=>scoped(s)&&s.active).length;
  return {
   lists:tasks.length?(openTasks?{text:String(openTasks),tone:'sage'}:{text:'✓',tone:'sage'}):null,
   // The briefing lives on Today, so its unread count rides on the Today tab.
   home:unreadBriefings?{text:String(unreadBriefings),tone:'amber'}:null,
   // Stock carries what needs a decision first: new 86 reports, then crew supply requests, then live 86s.
   stock:reported86?{text:String(reported86)+' new',tone:'danger'}:manager&&openOrders?{text:String(openOrders),tone:'amber'}:approved86?{text:String(approved86),tone:'danger'}:null,
   reservations:activeRes?{text:String(activeRes),tone:'slate'}:null,
   specials:activeSpecials?{text:String(activeSpecials),tone:'amber'}:null,
   // POS: open checks (yours for crew); Menu: dishes off right now.
   pos:(()=>{if(!B.pos||!state.pos)return null;const open=B.pos.openChecks(state,state.date,state.service).filter(c=>manager||c.server===me);const late=B.pos.tickets(state,state.date,state.service).filter(t=>t.late).length;if(late&&(manager||['Kitchen','Bar'].includes(B.person(me)?.area)))return {text:late+' late',tone:'danger'};return open.length?{text:String(open.length),tone:'orange'}:null;})(),
   menu:(()=>{if(!B.menu||!state.menu)return null;const o=B.menu.outs(state,state.date,state.service);return o.off.length?{text:String(o.off.length),tone:'danger'}:o.reported.length?{text:String(o.reported.length),tone:'amber'}:null;})(),
   myfile:(state.writeups||[]).some(w=>w.person===me&&w.status==='Issued')||(state.business?.reviews||[]).some(r=>r.person===me&&r.status==='Shared')?{text:'New',tone:'orange'}:null,
   // Training: sign-offs waiting for an approver first, then overdue courses, then required courses still to do.
   training:(()=>{const T=B.training;if(!T||!state.training)return null;const pend=T.pending(state,me).length;if(pend)return {text:String(pend),tone:'orange'};const rows=T.pathFor(state,me).map(c=>[c,T.progress(state,me,c.id)]);const over=rows.filter(([,p])=>p.overdue).length;if(over)return {text:String(over),tone:'danger'};const req=rows.filter(([c,p])=>c.required&&p.status!=='Completed').length;return req?{text:String(req),tone:'amber'}:null;})(),
   [manager?'shifts':'requests']:openRequests?{text:String(openRequests),tone:'orange'}:null,
   // The crew hub carries whatever needs them first: requests, then records to read, then training.
   me:(()=>{if(manager)return null;if(openRequests)return {text:String(openRequests),tone:'orange'};const file=(state.writeups||[]).some(w=>w.person===me&&w.status==='Issued')||(state.business?.reviews||[]).some(r=>r.person===me&&r.status==='Shared');if(file)return {text:'New',tone:'orange'};const T=B.training;if(!T||!state.training)return null;const rows=T.pathFor(state,me).map(c=>T.progress(state,me,c.id)),over=rows.filter(p=>p.overdue).length;return over?{text:String(over),tone:'danger'}:null;})()
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
      body:`${s.area} station for ${state.service} on ${state.date}. ${m.absence?'Reassign or cover this shift in Scheduling.':'Confirm arrival time when they check in.'}`,
      actions:[{label:'Open Scheduling',action:'notif-go',screen:'shifts',style:'primary'}]
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
     badge:'86 to approve',
     time:`${a.area} · Reported by ${personName(a.author)}`,
     title:`86 report: ${a.name}`,
     body:(a.reason||'Reported unavailable by the crew. Approve to alert the whole floor and kitchen.')+(a.sub?' Offer '+a.sub.name+' instead.':''),
     actions:[
      {label:'Approve',action:'ops-approve-alert',id:a.id,style:'primary'},
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
    body:approved.map(x=>`${x.name} (${x.area}): ${x.reason}${x.sub?' Offer '+x.sub.name+' instead.':''}`).join(' · '),
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
   const acked=b.acks.includes(me)||b.author===me;
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
      {label:'Mark as read',action:'ack',id:b.id,style:'primary'},
      {label:'Open briefing',action:'notif-go',screen:'home',style:'secondary'}
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
      actions:[{label:'View briefing',action:'notif-go',screen:'home',style:'secondary'}]
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
    actions:[{label:manager?'Open Scheduling':'Open requests',action:'notif-go',screen:manager?'shifts':'requests',style:'primary'}]
   });
  }

  // 6. Chat to-dos assigned to this person (messages themselves are counted on the chat button)
  for(const m of B.chat?B.chat.todos(state).filter(x=>x.todo.for===me):[]){
   const overdue=m.todo.due&&m.todo.due<B.dateString(new Date());
   push({
    id:`chat-todo-${m.id}`,
    category:overdue?'urgent':'team',
    tone:overdue?'danger':'sage',
    badge:overdue?'Overdue to-do':'To-do for you',
    time:`From ${personName(m.author)}${m.todo.due?' · due '+m.todo.due:''}`,
    title:m.body,
    body:'Sent in team chat. Check it off when it’s done.',
    actions:[
     {label:'Mark done',action:'chat-todo',id:m.id,style:'primary'},
     {label:'Open conversation',action:'chat-open',id:m.thread,style:'secondary'}
    ]
   });
  }

  // 6b. Write-ups waiting for the team member to read and acknowledge.
  for(const w of (state.writeups||[]).filter(w=>w.person===me&&w.status==='Issued')){
   push({id:'wu-'+w.id,category:'urgent',tone:'orange',badge:(B.writeups?B.writeups.label(w):'Record')+' to read',time:new Date(w.issuedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · from '+personName(w.issuedBy),title:w.title,body:'Your manager added this to your file. Read it and confirm you received it. You can add your side.',actions:[{label:'Read write-up',action:'wu-view',id:w.id,style:'primary'}]});
  }
  // 6b2. Reviews to read and recent kudos.
  for(const r of (state.business?.reviews||[]).filter(r=>r.person===me&&r.status==='Shared'))push({id:'rev-'+r.id,category:'team',tone:'sage',badge:'Review ready',time:'Performance · from '+personName(r.author),title:'Your '+r.kind.toLowerCase(),body:'Your manager shared your review. Read it and add your thoughts.',actions:[{label:'Read review',action:'hr-review-view',id:r.id,style:'primary'}]});
  for(const k of (state.business?.kudos||[]).filter(k=>k.person===me&&k.at>=new Date(Date.now()-7*864e5).toISOString()))push({id:'kudos-'+k.id,category:'team',tone:'sage',badge:'Kudos'+(k.value?' · '+k.value:''),time:'From '+personName(k.by),title:k.text,body:'Recognition from your team. It counts toward your next review.',actions:[{label:'View',action:'hr-kudos-view',id:k.id,style:'secondary'}]});
  // 6b3. Training: practicals waiting for an approver, courses due or overdue, returned practicals and new courses on the path.
  if(B.training&&state.training){
   const T=B.training,t=B.dateString(new Date());
   for(const x of T.pending(state,me)){const c=T.course(state,x.course);push({id:'tr-signoff-'+x.person+'-'+x.course+'-'+x.requestedAt,category:'team',tone:'orange',badge:'Sign-off requested',time:'Training · '+(c?.practical?.title||'practical'),title:personName(x.person)+' is ready for '+(c?.title||'a course'),body:x.note||'Check the practical with them on shift, then sign it off in Training.',actions:[{label:'Open sign-offs',action:'tr-go-tab',id:'signoffs',style:'primary'}]});}
   for(const c of T.pathFor(state,me)){
    const p=T.progress(state,me,c.id);if(p.status==='Completed')continue;
    if(p.due&&(p.overdue||p.due<=B.addDays(t,3)))push({id:'tr-due-'+c.id+'-'+p.due,category:p.overdue?'urgent':'team',tone:p.overdue?'danger':'amber',badge:p.overdue?'Training overdue':'Training due soon',time:'Due '+p.due+' · '+c.minutes+' min',title:c.emoji+' '+c.title,body:p.pct?p.pct+'% done. Finish it to earn '+c.xp+' XP.':'Not started yet. '+c.description,actions:[{label:p.pct?'Continue':'Start',action:'tr-go',id:c.id,style:'primary'}]});
    else if(p.status==='Returned')push({id:'tr-returned-'+c.id+'-'+(p.practical?.at||''),category:'team',tone:'amber',badge:'Practical returned',time:'From '+personName(p.practical?.by),title:c.emoji+' '+c.title,body:p.practical?.feedback||'Practise and request a sign-off again.',actions:[{label:'Open course',action:'tr-go',id:c.id,style:'primary'}]});
    else if(c.updatedAt&&c.updatedAt.slice(0,10)>=B.addDays(t,-7)&&p.status==='Not started')push({id:'tr-new-'+c.id+'-'+c.updatedAt.slice(0,10),category:'team',tone:'sage',badge:'New course',time:c.minutes+' min · '+c.xp+' XP',title:c.emoji+' '+c.title,body:c.description,actions:[{label:'Start',action:'tr-go',id:c.id,style:'secondary'}]});
   }
  }
  // 6c. Time entries nobody clocked out of.
  if(manager&&B.payroll)for(const x of (state.timeclock?.entries||[]).filter(x=>!x.out&&B.payroll.flags(state,x).some(f=>f.kind==='noout'))){
   push({id:'noout-'+x.id,category:'urgent',tone:'danger',badge:'Missing clock-out',time:'Time clock · '+x.date,title:personName(x.person)+' never clocked out',body:'Fix the clock-out so their hours and pay are right.',actions:[{label:'Fix time',action:'fin-edit',id:x.id,style:'primary'}]});
  }

  // 7. Supply requests awaiting manager review
  const reqOrders=state.orders.filter(o=>o.status==='Requested');
  if(manager&&reqOrders.length){
   push({
    id:`orders-req-${reqOrders.map(x=>x.id).join(',')}`,
    category:'service',
    tone:'amber',
    badge:`${reqOrders.length} stock request${reqOrders.length===1?'':'s'}`,
    time:`Stock · order sheet`,
    title:`Stock requests to review: ${reqOrders.map(x=>x.name).join(', ')}`,
    body:reqOrders.map(x=>`${x.quantity} ${x.unit} ${x.name} (${x.area})`).join(' · '),
    actions:[{label:'Review requests',action:'notif-go',view:'orders',style:'secondary'}]
   });
  }
  // 7b. Vendor cut-offs coming up with approved lines still on the order sheet.
  if(manager&&B.stock){
   for(const v of state.stock.vendors){
    const lines=state.orders.filter(o=>o.vendor===v.id&&o.status==='Approved'),next=lines.length&&B.stock.nextDelivery(v);if(!next)continue;
    const hrs=(next.orderBy.getTime()-Date.now())/3600000;if(hrs>8)continue;
    push({id:`cutoff-${v.id}-${next.date}`,category:'urgent',tone:hrs<3?'danger':'amber',badge:'Order cut-off',time:`${v.name} · ${next.orderBy.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'})}`,title:`Place the ${v.name} order in ${hrs<1?Math.max(1,Math.round(hrs*60))+' min':Math.round(hrs)+' h'}`,body:`${lines.length} approved line${lines.length===1?'':'s'} for delivery on ${next.date}: ${lines.map(o=>o.quantity+' '+o.unit+' '+o.name).join(', ')}.`,actions:[{label:'Open order sheet',action:'notif-go',view:'orders',style:'primary'}]});
   }
  }
  // 7b2. Inventory: a team's weekly count is due, or one is in progress.
  if(B.stock&&state.stock?.counts){
   const scheduled=new Set(team.map(x=>x.area));
   for(const area of manager?state.setup.areas:B.stock.teams(state,me)){
    const open=state.stock.counts.find(c=>c.team===area&&c.status==='Open'),last=B.stock.lastCount(state,area);
    if(open){const n=Object.keys(open.entries).length;push({id:`count-open-${open.id}`,category:'service',tone:'sage',badge:'Count in progress',time:`${area} · started by ${personName(open.startedBy)}`,title:`${area} stock count: ${n} item${n===1?'':'s'} counted so far`,body:'Finish the count to update on-hand levels and order suggestions.',actions:[{label:'Open count',action:'notif-go',view:'inventory',style:'primary'}]});}
    else if(B.stock.countDue(state,area)&&(manager||scheduled.has(area))&&!state.stock.assignments?.some(x=>x.status==='Open'&&x.team===area)){const days=last?Math.floor((Date.now()-new Date(last.submittedAt).getTime())/864e5):null;push({id:`count-due-${area}-${state.date}`,category:'team',tone:'amber',badge:'Count due',time:`${area} · weekly stock count`,title:`${area} stock count is due`,body:last?`Last counted ${days} days ago by ${personName(last.submittedBy)}. Counts keep par suggestions accurate.`:'This team has never been counted.',actions:[{label:'Start count',action:'notif-go',view:'inventory',style:'primary'}]});}
   }
  }
  // 7b3. Assigned counts: the counter hears the day before, on the day and when overdue; managers hear about overdue ones.
  if(B.stock?.assignedTo&&state.stock?.assignments){
   const today=B.dateString(new Date());
   for(const x of B.stock.assignedTo(state,me,state.role).filter(x=>x.date<=B.addDays(today,1))){
    const overdue=x.date<today,mine=!manager||x.assignee===me;if(!mine&&!overdue)continue;
    const who=x.assignee?(x.assignee===me?'you':personName(x.assignee)):'the whole '+x.team+' team';
    push({id:`count-assign-${x.id}-${overdue?'late':x.date}`,category:overdue||x.date===today?'urgent':'team',tone:overdue?'danger':'amber',badge:overdue?'Count overdue':x.date===today?'Count due today':'Count due tomorrow',time:`${x.team} · assigned to ${who}`,title:mine?`${x.team} stock count ${overdue?'is overdue':x.date===today?'is due today':'is due tomorrow'}`:`${x.team} count overdue · ${who}`,body:x.note||'Count shelf to sheet in Stock → Count. Finishing it completes this assignment.',actions:[{label:'Open count',action:'notif-go',view:'inventory',style:'primary'}]});
   }
  }
  // 7c. Crew: what happened to my supply requests in the last two days.
  if(!manager){
   const since=new Date(Date.now()-2*864e5).toISOString();
   for(const o of state.orders.filter(o=>o.author===me&&['Approved','Declined','Ordered','Received'].includes(o.status)&&(o.receivedAt||o.orderedAt||o.reviewedAt||'')>=since)){
    const declined=o.status==='Declined';
    push({id:`order-${o.id}-${o.status}`,category:'team',tone:declined?'danger':'sage',badge:declined?'Request declined':'Request '+o.status.toLowerCase(),time:'Stock · '+(o.area||''),title:`${o.quantity} ${o.unit} ${o.name}`,body:declined?(o.feedback||'Declined by your manager.'):o.status==='Ordered'?`Ordered${o.expected?' · arrives '+o.expected:''}.`:o.status==='Received'?'Delivered and checked in.':'Approved and on the order sheet.',actions:[{label:'My requests',action:'notif-go',view:'orders',style:'secondary'}]});
   }
  }

  // 7d. POS: tickets running late for the kitchen and bar, and checks still open after a service has ended.
  if(B.pos&&state.pos){
   const area=B.person(me)?.area,late=B.pos.tickets(state,state.date,state.service).filter(t=>t.late&&(manager||t.lines.some(l=>l.station===area)));
   if(late.length)push({id:`pos-late-${state.date}-${state.service}-${late.map(t=>t.check.id).join(',')}`,category:'urgent',tone:'danger',badge:`${late.length} late ticket${late.length===1?'':'s'}`,time:`${state.service} · kitchen & bar`,title:`${late.length===1?'A ticket has':late.length+' tickets have'} waited over 15 minutes`,body:late.map(t=>'#'+t.check.number+(t.check.tables.length?' · Table '+t.check.tables.join('+'):'')+' · '+t.lines.map(l=>l.qty+'× '+l.name).join(', ')).join(' · '),actions:[{label:'Open tickets',action:'ps-go',id:'',tab:'tickets',style:'primary'}]});
   if(manager){const {end}=B.floor.serviceWindow(state,state.service),ended=state.date<B.dateString(new Date())||(state.date===B.dateString(new Date())&&B.floor.nowMinutes()>=end),open=B.pos.openChecks(state,state.date,state.service);
    if(ended&&open.length)push({id:`pos-open-${state.date}-${state.service}-${open.length}`,category:'service',tone:'amber',badge:`${open.length} open check${open.length===1?'':'s'}`,time:`${state.service} has ended`,title:`Close ${open.length===1?'the last check':open.length+' checks'} before the close-out`,body:open.map(c=>'#'+c.number+' · '+(c.tables.length?'Table '+c.tables.join('+'):'Tab')+' · '+personName(c.server)).join(' · '),actions:[{label:'Open POS',action:'ps-go',id:'',tab:'checks',style:'primary'}]});}
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

