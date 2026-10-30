/* Today: the selected shift at a glance (time, team, time clock in one card), one queue of what needs you now, and the service board (briefing, checklists, 86s, specials, arrivals, notes). Everything follows the date and service in the command bar. */
globalThis.createShiftHome=function(api){
 const B=Brigly,{e,dateLabel}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId);
 const paths={note:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',alert:'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',late:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',sick:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',swap:'M4 7h15l-4-4 M20 17H5l4 4',tips:'M12 3v18 M17 7c-1-3-10-3-10 1s10 3 10 7-9 4-10 1',add:'M12 4v16 M4 12h16',roster:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16',inbox:'M4 5h16v14H4z M4 13h5l2 3h2l2-3h5',team:'M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a6 6 0 0 1 12 0v3 M17 4a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5',cart:'M3 4h2l3 12h10l3-9H6 M9 20h.1 M18 20h.1',count:'M9 4h6v3H9z M6 6h12v15H6z M9 11h6 M9 15h4',brief:'M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h3',off:'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',earn:'M12 2v20 M18 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H5',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',truck:'M2 7h12v10H2z M14 10h4l4 4v3h-8 M6 20a2 2 0 1 0 0-.1 M18 20a2 2 0 1 0 0-.1',task:'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',check:'M5 12l5 5 9-10',todo:'M4 5h16v14H4z M8 12l3 3 5-6',chev:'M9 6l6 6-6 6',star:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',res:'M4 9h16v11H4z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8',pos:'M3 7h18v10H3z M3 11h18 M7 15h3',Floor:'M4 9h16 M6 9v11 M18 9v11 M8 5h8',Bar:'M5 4h14l-7 8z M12 12v8 M8 20h8',Kitchen:'M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4'};
 const icon=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.task}"/></svg>`;
 const tone=area=>area==='Bar'?'orange':area==='Kitchen'?'slate':'sage';
 const name=id=>B.person(id)?.name||'Team member',first=id=>name(id).split(' ')[0];
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
 const plural=(n,word,many=word+'s')=>n+' '+(n===1?word:many);
 const listing=names=>names.length<3?names.join(' and '):names.slice(0,-1).join(', ')+' and '+names.at(-1);
 const tag=(label,t='slate')=>`<span class="td-tag" data-tone="${t}">${e(label)}</span>`;
 const btn=(label,action,id='',style='',attrs='')=>`<button type="button" class="button small ${style}" data-action="${action}" data-id="${e(id)}" ${attrs}>${label}</button>`;
 const link=(label,action,id='',attrs='')=>`<button type="button" class="td-link" data-action="${action}" data-id="${e(id)}" ${attrs}>${label}<span aria-hidden="true">›</span></button>`;
 const card=(cls,title,body,{meta='',foot=''}={})=>`<section class="td-card ${cls}"><header class="td-card-head"><h2>${title}</h2>${meta?`<div class="td-card-meta">${meta}</div>`:''}</header>${body}${foot?`<footer class="td-card-foot">${foot}</footer>`:''}</section>`;
 const svcOf=name=>s().setup.services.find(x=>x.name===name);
 const at=(date,time)=>new Date(date+'T'+time+':00').getTime();
 const span=ms=>{const m=Math.max(1,Math.round(ms/60000)),h=Math.floor(m/60),r=m%60;return h?h+' h'+(r?' '+r+' min':''):r+' min';};
 const today=()=>B.dateString(new Date());
 const dayName=date=>date===today()?'Today':date===B.addDays(today(),1)?'Tomorrow':date===B.addDays(today(),-1)?'Yesterday':dateLabel(date,{weekday:'short',month:'short',day:'numeric'});
 const dayIn=date=>{const w=dayName(date);return /^(Today|Tomorrow|Yesterday)$/.test(w)?w.toLowerCase():w;};
 const ctxAttrs=()=>`data-date="${e(s().date)}" data-service="${e(s().service)}"`;
 // Briefing authors count as having read their own briefing.
 const hasRead=(b,id)=>b.acks.includes(id)||b.author===id;
 let homeList='',homeKey='';

 function entry(){
  const own=s().shifts.filter(x=>manager()||x.person===me()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  const now=Date.now(),starts=x=>at(x.date,x.start),ends=x=>starts(x)+B.duration(x)*60000;
  const chosen=own.find(x=>starts(x)<=now&&ends(x)>now)||own.find(x=>starts(x)>=now)||own.at(-1);
  if(chosen)api.focus(chosen.date,chosen.service);else api.focus(today(),s().service);
 }

 function render(){
  const st=s(),service=st.service,svc=svcOf(service)||{start:'00:00',end:'00:00'};
  const team=st.shifts.filter(x=>x.date===st.date&&x.service===service).sort((a,b)=>a.start.localeCompare(b.start));
  const shift=team.find(x=>x.person===me()),ctx=B.ops.context(st,st.date,service);
  const briefs=st.briefings.filter(b=>b.date===st.date&&b.service===service);
  const brief=briefing(st,team,briefs,service,!!shift);
  return `<div class="td" data-role="${e(st.role)}"><div class="td-main">${hero(st,team,shift,ctx,svc,briefs)}${actions(st,shift)}${brief}${queue(st,team,ctx,briefs,svc)}${checklist(st,svc)}${arrivals(st,ctx,service)}</div><aside class="td-rail" aria-label="Service board">${pos()}${eightySix(st,ctx,!!shift)}${specials(st,service)}${notes(st,ctx,team,service)}</aside></div>`;
 }
 // The POS card: sales for managers, tickets for the kitchen and bar. Servers have no POS card here.
 function pos(){
  let c=null;try{c=api.pos?.();}catch{c=null;}
  if(!c)return '';
  return card('td-pos',e(c.title),c.body,{meta:c.meta||'',foot:c.foot||''});
 }

 // The shift: when, where, who with, how far into it we are, and the time clock. One card, so nothing is said twice.
 function hero(st,team,shift,ctx,svc,briefs){
  const now=Date.now(),time=manager()?svc:shift,tc=api.clock?.();
  const punch=tc?`<div class="td-hero-tc" data-state="${e(tc.state)}"><div class="td-hero-tc-text"><small>${e(tc.label)}</small><span>${tc.detail}</span></div><div class="td-hero-tc-acts">${tc.acts}</div></div>`:'';
  if(!time){
   const mine=st.shifts.filter(x=>x.person===me()).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
   const other=mine.find(x=>x.date===st.date),next=mine.find(x=>at(x.date,x.start)+B.duration(x)*60000>now&&!(x.date===st.date&&x.service===st.service));
   const jump=x=>`<button type="button" class="td-hero-jump" data-action="ctx-pick" data-date="${e(x.date)}" data-service="${e(x.service)}">${other===x?'Switch to '+e(x.service):'Go to this shift'}<span aria-hidden="true">›</span></button>`;
   return `<section class="td-hero is-off"><div class="td-hero-top"><span class="td-hero-eyebrow">${e(dayName(st.date))} · ${e(st.service)}</span><span class="td-hero-status" data-tone="slate">${other?'Not on '+e(st.service):'Day off'}</span></div><h1 class="td-hero-time is-text">${other?'You’re on '+e(other.service):'You’re off'}</h1><p class="td-hero-sub">${other?e(other.start+'–'+other.end+' · '+other.area):next?'Next shift: '+e(dayName(next.date))+' · '+e(next.service)+' '+e(next.start):'No upcoming shifts on the roster yet.'}</p>${other?jump(other):next?jump(next):''}${punch}</section>`;
  }
  const [start,end]=[at(st.date,time.start),at(st.date,time.start)+B.duration(time)*60000],live=now>=start&&now<end,past=now>=end;
  const m=shift&&B.schedule.metrics(st,shift);
  const people=[...new Set(team.map(x=>x.person))],others=people.filter(id=>id!==me());
  const absent=team.filter(x=>B.schedule.metrics(st,x).absence).length,late=team.filter(x=>!B.schedule.metrics(st,x).absence&&B.schedule.metrics(st,x).late).length;
  const status=manager()?(absent?[plural(absent,'person','people')+' out','danger']:late?[late+' running late','amber']:people.length?['Full team','sage']:['No one scheduled','slate'])
   :m.absence?['Absent','danger']:tc?.state==='break'&&tc.matchesShift!==false?['On break','amber']:tc?.state==='on'&&tc.matchesShift!==false?['On the clock','sage']:m.late?['Late · '+m.late.minutes+' min','amber']:live?['On shift','sage']:past?['Done','slate']:['Scheduled','slate'];
  const guests=ctx.reservations.filter(r=>!['Cancelled','No-show'].includes(r.status)).reduce((n,r)=>n+r.guests,0),out86=ctx.alerts.filter(x=>x.status==='Approved').length;
  const posNet=B.pos&&st.pos?B.pos.sales(st,{from:st.date,to:st.date,service:st.service}).net:0;
  const sub=manager()?[plural(people.length,'person','people')+' on shift',plural(guests,'guest')+' booked',out86?plural(out86,'item')+' 86’d':'Full menu',...(posNet?[money(posNet)+' net so far']:[])].join(' · '):[shift.area,(m.workMinutes/60).toLocaleString('en-US',{maximumFractionDigits:1})+' h',money(m.wages)+' est.'].join(' · ');
  const eyebrow=live?'<span class="td-live"></span>Live now · '+e(st.service):e(dayName(st.date))+' · '+e(st.service)+(past?' · ended':'');
  const clock=live?`<div class="td-hero-clock"><span class="td-hero-bar"><span style="width:${Math.round((now-start)/(end-start)*100)}%"></span></span><small>${span(now-start)} in · ${span(end-now)} left</small></div>`:!past&&start-now<36*3600000?`<div class="td-hero-clock"><small>Starts in ${span(start-now)}</small></div>`:'';
  return `<section class="td-hero${live?' is-live':''}"><div class="td-hero-top"><span class="td-hero-eyebrow">${eyebrow}</span><span class="td-hero-status" data-tone="${status[1]}">${e(status[0])}</span></div><h1 class="td-hero-time">${e(time.start)}<span>–</span>${e(time.end)}${time.end<time.start?'<small>+1 day</small>':''}</h1><p class="td-hero-sub">${e(sub)}</p>${clock}${punch}${crew(st,team,briefs,people,others)}</section>`;
 }

 // The things people do most during a shift, one tap each.
 function actions(st,shift){
  const act=(label,key,toneKey,action,id='',attrs='')=>`<button type="button" class="td-action" data-tone="${toneKey}" data-action="${action}" data-id="${e(id)}" ${attrs}><span class="td-action-icon">${icon(key)}</span><span class="td-action-label">${e(label)}</span></button>`;
  const c=ctxAttrs(),may=key=>!B.permissions||B.permissions.can(st,key);let html;
  if(manager()){
   const brief=st.briefings.find(b=>b.date===st.date&&b.service===st.service);
   html=(brief?act('Briefing','brief','amber','edit',brief.id,'data-collection="briefings"'):act('Post briefing','brief','amber','ops-context-create','briefings',c))
    +act('Add note','note','sage','ops-note','',c)+act('86 an item','alert','danger','ops-alert','',c)+act('Order stock','cart','amber','stock-go','orders','data-stage="order"')
    +act('Assign count','count','sage','stock-assign','')+act('Add shift','add','orange','plan-add','')+act('Roster','roster','slate','app-screen','shifts')+(B.pos&&st.pos?act('POS','pos','orange','ps-go',''):act('Manage','team','slate','app-screen','manage'));
  }else if(shift){
   const m=B.schedule.metrics(st,shift);
   // With the POS running, tips come from paid checks, so the POS takes the tips tile for servers.
   html=(may('report86')?act('Report 86','alert','danger','ops-alert','',c):'')+(may('stockRequests')?act('Request stock','cart','amber','stock-go','items'):'')+(may('notes')?act('Add note','note','sage','ops-note','',c):'')+(B.pos&&st.pos&&may('pos')?act('POS','pos','orange','ps-go',''):act('Add tips','tips','sage','schedule-shift-tips',shift.id))
    +act(m.late?'Late reported':'Running late','late','amber','schedule-report-late',shift.id,m.absence||m.late?'disabled':'')+act(m.absence?'Absence reported':'I’m sick','sick','danger','schedule-report-sick',shift.id,m.absence?'disabled':'')
    +(may('swaps')?act('Swap shift','swap','slate','schedule-swap',shift.id,m.absence||m.late?'disabled':''):'')+(may('timeoff')?act('Time off','off','slate','schedule-timeoff',shift.id):'');
  }else html=act('My schedule','roster','slate','app-screen','shifts')+(may('timeoff')?act('Time off','off','slate','schedule-timeoff',''):'')+(may('stockRequests')?act('Request stock','cart','amber','stock-go','items'):'')+act('Earnings','earn','sage','app-screen','earnings');
  const items=html.match(/<button\b[\s\S]*?<\/button>/g)||[];
  const secondary=items.slice(4).join('');
  return `<nav class="td-actions" aria-label="${manager()?'Manager quick actions':'Shift actions'}">${items.slice(0,4).join('')}</nav>${secondary?`<details class="td-more-actions" data-key="shift-actions"><summary>${manager()?'More shift actions':'Attendance & time off'}</summary><nav class="td-actions" aria-label="More shift actions">${secondary}</nav></details>`:''}`;
 }

 // One prioritised list of what needs you: approvals, cut-offs, deliveries, counts, coverage, late lists, swaps and to-dos.
 function queue(st,team,ctx,briefs,svc){
  const items=[],push=(rank,toneKey,key,title,sub,acts)=>items.push({rank,toneKey,key,title,sub,acts});
  const now=Date.now(),day=today(),liveish=st.date>=B.addDays(day,-1)&&st.date<=B.addDays(day,1);
  const checks=st.checks[st.date+'|'+st.service]||{},mine=manager()?null:B.work.stations(st,st.date,st.service);
  const tasks=B.work.tasks(st,st.date,st.service).filter(t=>!mine||mine.includes(t.area));
  if(manager()){
   for(const x of team){const m=B.schedule.metrics(st,x);
    if(m.absence)push(0,'danger','sick',first(x.person)+' is out · '+x.area+' needs cover',x.start+'–'+x.end+' · '+(m.absence.kind==='sick'?'reported sick':'approved time off'),btn('Find cover','edit',x.id,'','data-collection="shifts"'));
    else if(m.late)push(1,'amber','late',first(x.person)+' is running '+m.late.minutes+' min late',x.area+' · due at '+x.start,btn('Review','app-screen','shifts','secondary'));}
   if(!briefs.length&&st.date>=day)push(1,'amber','brief','No pre-shift briefing yet','Post one so the '+st.service+' team can read and confirm it',btn('Post briefing','ops-context-create','briefings','',ctxAttrs()));
   for(const a of ctx.alerts.filter(x=>x.status==='Reported'))push(0,'danger','alert','86 report · '+a.name,first(a.author)+' · '+a.area+' · '+a.reason,btn('Approve','ops-approve-alert',a.id)+btn('Decline','ops-decline-alert',a.id,'secondary'));
   if(B.stock&&st.stock){
    for(const v of st.stock.vendors){
     const lines=st.orders.filter(o=>o.vendor===v.id&&o.status==='Approved'),next=lines.length&&B.stock.nextDelivery(v);if(!next)continue;
     const hrs=(next.orderBy.getTime()-now)/3600000;if(hrs>8)continue;
     push(hrs<3?0:1,hrs<3?'danger':'amber','clock','Place the '+v.name+' order · cut-off in '+span(hrs*3600000),plural(lines.length,'line')+' · '+money(lines.reduce((n,o)=>n+B.stock.lineTotal(o),0))+' · arrives '+dayIn(next.date),btn('Place order','stock-place',v.id)+btn('Review','stock-go','orders','secondary','data-stage="order"'));
    }
    const req=st.orders.filter(o=>o.status==='Requested');
    if(req.length)push(2,'orange','cart',plural(req.length,'stock request')+' from the crew',listing([...new Set(req.map(o=>o.name))].slice(0,3))+(req.length>3?' and more':'')+' · '+money(req.reduce((n,o)=>n+B.stock.lineTotal(o),0)),btn('Approve all','stock-approve-all','')+btn('Review','stock-go','orders','secondary','data-stage="review"'));
    const pos=[...st.orders.filter(o=>o.status==='Ordered'&&o.expected&&o.expected<=day).reduce((m,o)=>m.set(o.po||'vendor:'+o.vendor,[...(m.get(o.po||'vendor:'+o.vendor)||[]),o]),new Map())];
    for(const [po,lines] of pos){const v=st.stock.vendors.find(x=>x.id===lines[0].vendor),late=lines[0].expected<day;push(late?1:2,late?'amber':'sage','truck',(v?.name||'Delivery')+(late?' delivery is overdue':' delivery arrives today'),(po.startsWith('vendor:')?'':po+' · ')+plural(lines.length,'line')+' · check it in when it lands',btn('Check in','stock-receive',po));}
    // Scheduled counts due by tomorrow: overdue ones first, then today's and tomorrow's with how far along they are.
    for(const x of B.stock.assignedTo(st,me(),'manager').filter(x=>x.date<=B.addDays(day,1))){
     const open=st.stock.counts.find(c=>c.team===x.team&&c.status==='Open'),late=x.date<day,who=(x.assignee?first(x.assignee):'Whole '+x.team+' team')+(open?' · '+Object.keys(open.entries).length+' counted so far':'');
     push(late?1:x.date===day?3:4,late?'danger':'amber','count',x.team+' stock count '+(late?'is overdue':x.date===day?'is due today':'is due tomorrow'),who+(late?' · was due '+dayIn(x.date):''),btn(open?'Continue':'Open','stock-count-go',x.team,'secondary')+btn('Edit','stock-assign',x.id,'secondary'));
    }
    for(const t of st.setup.areas.filter(t=>B.stock.countDue(st,t)&&!st.stock.assignments.some(x=>x.status==='Open'&&x.team===t)&&!st.stock.counts.some(c=>c.team===t&&c.status==='Open')))push(3,'amber','count',t+' stock count is due','Nobody is assigned yet',btn('Assign','stock-assign','','secondary','data-team="'+e(t)+'"'));
    const busy=new Set(st.orders.filter(o=>['Requested','Approved','Ordered'].includes(o.status)).map(o=>o.item)),low=st.stock.items.filter(x=>x.active&&x.vendor&&x.onHand!==null&&x.onHand<x.par&&!busy.has(x.id));
    if(low.length)push(4,'slate','cart',plural(low.length,'item')+' below par, not on order',listing(low.slice(0,3).map(x=>x.name))+(low.length>3?' and more':''),btn('Add to order','stock-go','orders','secondary','data-stage="order"'));
   }
   // Payroll and time clock problems ride in the same list.
   for(const x of api.payroll?api.payroll():[])push(x.rank,x.tone,'clock',x.title,x.sub,x.acts);
   const reqs=st.scheduling.requests.filter(r=>r.status==='Pending').length;
   if(reqs)push(3,'orange','inbox',plural(reqs,'schedule request')+' waiting','Time off and shift swaps to approve on the roster',btn('Review','app-screen','shifts','secondary'));
  }else{
   if(B.permissions?.can(st,'stock'))for(const a of ctx.alerts.filter(x=>x.status==='Reported'&&x.author!==me()))push(0,'danger','alert','86 report · '+a.name,first(a.author)+' · '+a.area+' · '+a.reason,btn('Approve','ops-approve-alert',a.id)+btn('Decline','ops-decline-alert',a.id,'secondary'));
   for(const r of (st.business?.reviews||[]).filter(r=>r.person===me()&&r.status==='Shared'))push(0,'sage','note','Your '+r.kind.toLowerCase()+' is ready','Read it and add your thoughts',btn('Read','hr-review-view',r.id));
   for(const k of (st.business?.kudos||[]).filter(k=>k.person===me()&&k.at>=new Date(now-3*864e5).toISOString()))push(2,'sage','note','Kudos from '+first(k.by)+(k.value?' · '+k.value:''),'“'+k.text+'”',btn('View','hr-kudos-view',k.id,'secondary'));
   for(const w of (st.writeups||[]).filter(w=>w.person===me()&&w.status==='Issued'))push(0,'orange','note','A '+B.writeups.label(w).toLowerCase()+' was added to your file',w.title+' · read it and confirm you received it',btn('Read','wu-view',w.id));
   for(const r of st.scheduling.requests.filter(r=>r.kind==='swap'&&r.targetPerson===me()&&r.status==='Awaiting teammate'))push(1,'orange','swap',first(r.person)+' asked to swap a shift with you',B.schedule.requestSummary?.(r)||'Accept or decline in Requests',btn('Review','app-screen','requests'));
   if(B.stock?.assignedTo&&st.stock){
    for(const x of B.stock.assignedTo(st,me(),'crew').filter(x=>x.date<=B.addDays(day,1))){const open=st.stock.counts.find(c=>c.team===x.team&&c.status==='Open'),n=open?Object.keys(open.entries).length:0;
     push(x.date<day?0:2,x.date<day?'danger':'amber','count',x.team+' stock count '+(x.date<day?'is overdue':x.date===day?'is due today':'is due tomorrow'),(x.assignee===me()?'Assigned to you':'Anyone on '+x.team)+(open?' · '+n+' counted so far':'')+(x.note?' · '+x.note:''),btn(open?'Continue':'Start count','stock-count-go',x.team));}
   }
   for(const a of ctx.alerts.filter(x=>x.status==='Reported'&&x.author===me()))push(4,'slate','alert','Your 86 report: '+a.name,'Waiting for a manager to confirm',btn('View','navigate','eighty-six','secondary'));
   const since=new Date(now-2*864e5).toISOString();
   for(const o of st.orders.filter(o=>o.author===me()&&['Declined','Ordered','Received'].includes(o.status)&&(o.receivedAt||o.orderedAt||o.reviewedAt||'')>=since).slice(0,3)){const d=o.status==='Declined';push(d?2:4,d?'danger':'sage',d?'cart':'truck',o.name+(d?' request declined':o.status==='Ordered'?' is on order':' arrived'),d?(o.feedback||'Declined by your manager'):o.status==='Ordered'?'Arrives '+dayIn(o.expected||day):'Delivered and checked in',btn('My requests','stock-go','requests','secondary'));}
  }
  // Lists still open after they were due (opening after service started, closing an hour after close).
  if(liveish)for(const list of [...new Set(tasks.map(t=>t.list))]){
   const due=B.work.due?.(st,list),open=tasks.filter(t=>t.list===list&&!checks[t.id]);
   if(!due||!open.length||now<due.at||now-due.at>12*3600000)continue;
   const areas=[...new Set(open.map(t=>t.area))];
   push(1,'amber','task',list+' isn’t finished · '+plural(open.length,'task')+' open',(manager()?areas.join(', '):'Your station')+' · was due '+due.time,btn('Open list','checklist-go',areas[0]+'|'+list,'secondary'));
  }
  // Priority notes from a manager on tasks still open.
  const flagged=tasks.filter(t=>!checks[t.id]&&(B.work.notes?.(st,t.id)||[]).some(n=>n.important));
  if(flagged.length&&!manager())push(2,'orange','star',plural(flagged.length,'priority task')+' on your station',listing(flagged.slice(0,2).map(t=>t.title)),btn('View','checklist-task',flagged[0].id,'secondary','data-area="'+e(flagged[0].area)+'" data-list="'+e(flagged[0].list)+'"'));
  for(const m of B.chat?B.chat.todos(st).filter(x=>x.todo.for===me()):[]){const late=m.todo.due&&m.todo.due<day;push(late?1:3,late?'danger':'sage','todo',m.body,'To-do from '+first(m.author)+(m.todo.due?' · due '+dayIn(m.todo.due):''),btn('Done','chat-todo',m.id)+btn('Open','chat-open',m.thread,'secondary'));}
  items.sort((a,b)=>a.rank-b.rank);
  const row=x=>`<li class="td-q" data-tone="${x.toneKey}"><span class="td-q-icon">${icon(x.key)}</span><div class="td-q-text"><strong>${e(x.title)}</strong>${x.sub?`<small>${e(x.sub)}</small>`:''}</div><div class="td-q-act">${x.acts}</div></li>`;
  const shown=items.slice(0,5),more=items.slice(5);
  const body=items.length?`<ul class="td-q-list">${shown.map(row).join('')}</ul>${more.length?`<details class="td-more" data-key="home-queue-${e(st.date+st.service)}"><summary>Show ${more.length} more</summary><ul class="td-q-list">${more.map(row).join('')}</ul></details>`:''}`
   :`<div class="td-clear"><span>${icon('check')}</span><div><strong>You’re all caught up</strong><small>${manager()?'No approvals, cut-offs or gaps need you right now.':'Nothing is waiting on you right now.'}</small></div></div>`;
  return card('td-queue'+(items.some(x=>x.rank===0)?' is-urgent':''),manager()?'Needs your attention':'Up next for you',body,{meta:items.length?`<span class="td-count">${items.length}</span>`:''});
 }

 // Checklists: crew tick off their station's next tasks right here; managers see every station at a glance.
 function checklist(st,svc){
  const checks=st.checks[st.date+'|'+st.service]||{},all=B.work.tasks(st,st.date,st.service),notesOf=t=>B.work.notes?.(st,t.id)||[];
  const order=l=>l==='Opening'?0:l==='Event Setup'?1:/^Mid/.test(l)?2:l==='Closing'?4:3,byList=(a,b)=>order(a)-order(b);
  const isSpec=t=>B.work.isSpecific?.(t)??Boolean(t.specific),now=Date.now();
  const overdue=list=>{const d=B.work.due?.(st,list);return d&&now>d.at&&now-d.at<12*3600000;};
  if(manager()){
   const done=all.filter(t=>checks[t.id]).length;
   const rows=st.setup.areas.map(area=>{
    const items=all.filter(t=>t.area===area),n=items.filter(t=>checks[t.id]).length,lists=[...new Set(items.map(t=>t.list))].sort(byList),open=items.filter(t=>!checks[t.id]);
    const next=lists.find(l=>items.some(t=>t.list===l&&!checks[t.id]))||lists[0]||'Opening',late=lists.filter(l=>overdue(l)&&items.some(t=>t.list===l&&!checks[t.id]));
    const flagged=open.filter(t=>notesOf(t).some(x=>x.important)).length;
    const nextTask=open.sort((a,b)=>byList(a.list,b.list))[0];
    return `<button type="button" class="td-station" data-action="checklist-go" data-id="${e(area+'|'+next)}"><span class="td-station-icon" data-tone="${tone(area)}">${icon(area)}</span><span class="td-station-text"><strong>${e(area)}${late.length?tag(late[0]+' late','danger'):''}${flagged?tag(flagged+' priority','orange'):''}</strong><small>${items.length?(nextTask?'Next: '+e(nextTask.title):'All done'):'No tasks'}</small></span><span class="td-station-progress"><b>${n}<i>/${items.length}</i></b><span class="td-bar"><span style="width:${items.length?Math.round(n/items.length*100):0}%"></span></span></span></button>`;
   }).join('');
   const spec=all.filter(isSpec),specOpen=spec.filter(t=>!checks[t.id]);
   const tonight=spec.length?`<button type="button" class="td-tonight" data-action="checklist-task" data-id="${e((specOpen[0]||spec[0]).id)}" data-area="${e((specOpen[0]||spec[0]).area)}" data-list="${e((specOpen[0]||spec[0]).list)}">${icon('star')}<span><strong>${plural(spec.length,'tonight-only task')}</strong><small>${specOpen.length?specOpen.length+' still open · '+e(specOpen[0].title):'All done'}</small></span><span aria-hidden="true">›</span></button>`:'';
   return card('td-checklist','Checklists',all.length?`<div class="td-stations">${rows}</div>${tonight}`:`<p class="td-empty">No checklist tasks for ${e(st.service)} yet.</p>`,{meta:all.length?`<span class="td-count${done===all.length?' is-done':''}">${done}/${all.length}</span>`:'',foot:link('Open checklists','checklist-open','')+link('History','checklist-report-open','history')});
  }
  const stations=B.work.stations(st,st.date,st.service);
  if(!stations.length)return card('td-checklist','Your checklist',`<p class="td-empty">You’re not on a station for ${e(st.service)}. Checklists for every team are still open to view.</p>`,{foot:link('View checklists','checklist-open','')});
  const mine=all.filter(t=>stations.includes(t.area)),done=mine.filter(t=>checks[t.id]).length;
  const lists=[...new Set(mine.map(t=>t.list))].sort(byList);
  const key=me()+'|'+st.date+'|'+st.service;if(key!==homeKey){homeKey=key;homeList='';}
  if(!lists.includes(homeList))homeList=lists.find(l=>mine.some(t=>t.list===l&&!checks[t.id]&&!isSpec(t)))||lists.at(-1)||'';
  const prio=t=>notesOf(t).some(x=>x.important)?0:1;
  const task=t=>{const n=notesOf(t),imp=n.find(x=>x.important);return `<div class="td-task${checks[t.id]?' is-done':''}${imp?' is-priority':''}"><label class="td-check"><input type="checkbox" data-task="${e(t.id)}" ${checks[t.id]?'checked':''}><span class="td-box" aria-hidden="true">${icon('check')}</span><span class="td-task-text"><strong>${e(t.title)}</strong>${isSpec(t)||imp?`<small>${isSpec(t)?tag('Tonight only','orange'):''}${imp?tag('Priority','danger')+' '+e(imp.body.slice(0,70))+(imp.body.length>70?'…':''):''}</small>`:''}</span></label><button type="button" class="td-task-note${n.length?' has-notes':''}" data-action="checklist-note" data-id="${e(t.id)}" aria-label="${n.length?n.length+' notes':'Add a note'} for ${e(t.title)}">${icon('note')}${n.length?`<span>${n.length}</span>`:''}</button></div>`;};
  const spec=mine.filter(t=>isSpec(t)&&!checks[t.id]);
  const special=spec.length?`<div class="td-specific"><p class="td-subhead">${icon('star')}Tonight only · Shift-specific</p>${spec.slice(0,3).map(task).join('')}</div>`:'';
  const tabs=lists.length>1?`<div class="td-seg" role="tablist" aria-label="Checklist">${lists.map(l=>{const items=mine.filter(t=>t.list===l),n=items.filter(t=>checks[t.id]).length,full=n===items.length;return `<button type="button" role="tab" data-action="home-list" data-id="${e(l)}" aria-selected="${l===homeList}">${full?icon('check'):''}${e(l)}<em>${n}/${items.length}</em></button>`;}).join('')}</div>`:'';
  const items=mine.filter(t=>t.list===homeList&&!isSpec(t)),open=items.filter(t=>!checks[t.id]).sort((a,b)=>prio(a)-prio(b)),closed=items.filter(t=>checks[t.id]);
  const due=B.work.due?.(st,homeList),late=overdue(homeList)&&open.length;
  const lastDone=closed.map(t=>checks[t.id]).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0];
  const stamp=x=>{const d=new Date(x.at);return Number.isNaN(d.getTime())?'':' at '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});};
  const list=open.length?open.slice(0,4).map(task).join('')+(open.length>4?`<p class="td-more-note">+${open.length-4} more on the full list</p>`:'')
   :`<div class="td-clear is-small"><span>${icon('check')}</span><div><strong>${e(homeList)} is done</strong><small>${lastDone?'Last task by '+e(first(lastDone.by))+stamp(lastDone):'Nothing left on this list.'}</small></div></div>`;
  return card('td-checklist','Your checklist',`${special}${tabs}<div class="td-list-meta"><span>${e(stations.join(' · '))} · ${e(homeList)}</span>${due?(late?tag('Overdue · was due '+due.time,'danger'):`<span>${e(due.label)}</span>`):''}</div>${list}`,{meta:`<span class="td-count${done===mine.length?' is-done':''}">${done}/${mine.length}</span>`,foot:link('Open '+e(stations[0])+' checklist','checklist-go',stations[0]+'|'+homeList)});
 }

 function briefing(st,team,briefs,service,assigned){
  if(!briefs.length)return manager()||assigned?card('td-brief is-empty','Pre-shift briefing',`<p class="td-empty">${manager()?'Nothing posted for '+e(service)+' yet. Post the plan, the specials to push and anything the team should watch for, and everyone confirms they’ve read it.':'Nothing posted for '+e(service)+' yet. Leave a handover briefing if the team needs to know something.'}</p><button type="button" class="button${manager()?'':' secondary'}" data-action="ops-context-create" data-id="briefings" ${ctxAttrs()}>+ Post shift briefing</button>`):'';
  const people=[...new Set(team.map(x=>x.person))];
  return briefs.map(b=>{
   const tracked=[...new Set([...people,...b.acks])],read=tracked.filter(id=>hasRead(b,id)),waiting=tracked.filter(id=>!hasRead(b,id));
   const mineRead=hasRead(b,me()),needs=(assigned||manager())&&!mineRead,author=b.author===me();
   const approved=b.approved===true;
   const status=(approved?`<span class="td-tag is-pill" data-tone="sage">Approved</span>`:`<span class="td-card-sub">Not approved</span>`)+(manager()||author?`<span class="td-card-sub">${read.length}/${tracked.length} read</span>`:mineRead?`<span class="td-card-sub">Read</span>`:'');
   const long=b.body.length>320;
   const confirm=needs?`<div class="td-brief-confirm"><div><strong>Confirm you’ve read it</strong><small>Your manager sees who has.</small></div><div class="td-onboard-cta-group"><button type="button" class="button secondary" data-action="onboarding-open" data-id="${e(b.id)}">Shift onboarding</button><button type="button" class="button td-ack" data-action="ack" data-id="${e(b.id)}">${icon('check')}I’ve read it</button></div></div>`
    :mineRead&&!author?`<p class="td-brief-done">${icon('check')}You confirmed reading this · revision ${b.revision}</p>`:'';
   const receipts=(manager()||author)&&tracked.length?`<details class="td-receipts" data-key="home-acks-${e(b.id)}"><summary><span class="td-stack">${tracked.slice(0,8).map(id=>`<span class="${hasRead(b,id)?'is-read':'is-waiting'}">${e(B.person(id)?.initials||'TM')}</span>`).join('')}</span><span>${waiting.length?e(listing(waiting.map(first)))+(waiting.length===1?' hasn’t':' haven’t')+' read it yet':'Everyone on shift has read it'}</span></summary><ul>${tracked.map(id=>`<li class="${hasRead(b,id)?'is-read':''}"><span class="td-avatar" data-tone="${tone(team.find(x=>x.person===id)?.area||B.person(id)?.area)}">${e(B.person(id)?.initials||'TM')}</span><strong>${e(name(id))}</strong><small>${hasRead(b,id)?(id===b.author?'Posted it':'Read'):'Not yet'}</small></li>`).join('')}</ul></details>`:'';
   const tools=[`<button type="button" class="td-link" data-action="onboarding-open" data-id="${e(b.id)}">Shift onboarding<span aria-hidden="true">›</span></button>`,waiting.length&&(manager()||author)?`<button type="button" class="td-link" data-action="home-nudge" data-id="${e(b.id)}">Remind ${waiting.length===1?e(first(waiting[0])):waiting.length+' people'}<span aria-hidden="true">›</span></button>`:'',manager()&&!approved?`<button type="button" class="td-link" data-action="ops-approve-briefing" data-id="${e(b.id)}" data-approved="true">Approve<span aria-hidden="true">›</span></button>`:'',manager()||author?`<button type="button" class="td-link" data-action="edit" data-collection="briefings" data-id="${e(b.id)}">Edit<span aria-hidden="true">›</span></button>`:''].filter(Boolean).join('');
   return `<section class="td-card td-brief${needs?' is-unread needs-ack':' is-read'}" data-tone="${needs?'amber':'sage'}" aria-label="Pre-shift briefing"><header class="td-card-head"><h2>${e(b.title)}</h2><div class="td-card-meta">${status}</div></header><div class="td-brief-body${long?' is-clamped':''}" id="brief-body-${e(b.id)}">${e(b.body)}</div>${long?`<button type="button" class="td-readmore" data-action="home-expand" data-id="brief-body-${e(b.id)}">Read more</button>`:''}<p class="td-byline">${e(service)} · ${e(name(b.author))} · revision ${b.revision}</p>${confirm}${receipts}${tools?`<footer class="td-card-foot">${tools}</footer>`:''}</section>`;
  }).join('');
 }

 function eightySix(st,ctx,assigned){
  const live=ctx.alerts.filter(x=>x.status==='Approved'),reported=ctx.alerts.filter(x=>x.status==='Reported');
  const restock=a=>{const x=a.item&&st.stock?.items.find(i=>i.id===a.item);if(!x)return '';if(!x.vendor)return '<small class="td-86-stock">Made in house</small>';const open=B.stock.openLines(st,x.id),ord=open.find(o=>o.status==='Ordered');return ord?`<small class="td-86-stock is-good">${icon('truck')}Restock arrives ${e(dayIn(ord.expected||today()))}</small>`:open.length?`<small class="td-86-stock">${icon('clock')}Restock ${open.some(o=>o.status==='Approved')?'on the order sheet':'requested'}</small>`:'';};
  const hits=a=>a.item&&B.menu&&st.menu?B.menu.usedIn(st,a.item).map(i=>i.name).filter(n=>n.toLowerCase()!==a.name.toLowerCase()):[];
  const row=a=>`<div class="td-86-row${a.status==='Reported'?' is-reported':''}">${a.item?`<button type="button" class="td-86-name" data-action="stock-open" data-id="${e(a.item)}">${e(a.name)}</button>`:`<strong class="td-86-name">${e(a.name)}</strong>`}<span class="td-card-sub">${e(a.area)}</span><p>${e(a.reason)}</p>${hits(a).length?`<p>Affects ${e(hits(a).join(', '))}</p>`:''}${a.sub?`<p>Offer instead: <strong>${e(a.sub.name)}</strong></p>`:''}<div class="td-86-foot">${a.status==='Reported'?`<small class="td-86-stock">Unconfirmed · reported by ${e(first(a.author))}</small>`:restock(a)}${manager()&&a.status==='Approved'?`<button type="button" class="td-mini" data-action="ops-restore-alert" data-id="${e(a.id)}">Back in stock</button>`:''}</div></div>`;
  const body=(live.length?live.map(row).join(''):`<div class="td-clear is-small"><span>${icon('check')}</span><div><strong>Full menu available</strong><small>Nothing is 86’d for ${e(st.service)}.</small></div></div>`)
   +(reported.length?(manager()?`<button type="button" class="td-note-line" data-action="home-scroll" data-id="td-queue">${plural(reported.length,'86 report')} waiting for you above</button>`:reported.map(row).join('')):'');
  const write=manager()||assigned;
  return card('td-86','Before taking orders',body,{meta:tag(live.length?plural(live.length,'item')+' out':'All available',live.length?'danger':'sage'),foot:link('86 board','navigate','eighty-six')+(write?link(manager()?'86 an item':'Report 86','ops-alert','',ctxAttrs()):'')});
 }

 function specials(st,service){
  const list=st.specials.filter(x=>x.date===st.date&&x.service===service&&x.active);
  const body=list.length?list.map(x=>{
   const kindLabel=x.kind==='happy_hour'?'Happy Hour':x.kind==='event'?'Event':'Special';
   const priceStr=x.price>0?'$'+Number(x.price).toFixed(2):(x.kind==='event'?'Free / Included':'$0.00');
   const qCount=(x.questions||[]).length;
   return `<article class="td-special" data-kind="${e(x.kind||'special')}"><div class="td-special-header"><div class="td-special-tags"><strong>${e(x.name)}</strong><small class="td-special-time">${e([kindLabel!=='Special'?kindLabel:'',x.time].filter(Boolean).join(' · '))}</small></div><span class="td-price">${priceStr}</span></div>${x.description?`<p>${e(x.description)}</p>`:''}<div class="td-special-sub"><small><b>${x.kind==='happy_hour'?'Rules':x.kind==='event'?'Staging':'Allergens'}</b> ${e(x.allergens||'Confirm with kitchen/bar')}</small>${qCount?`<small>${plural(qCount,'question')}</small>`:''}</div></article>`;
  }).join(''):`<p class="td-empty">No happenings posted for ${e(service)}.</p>`;
  return card('td-specials','Happenings',body,{meta:list.length?`<span class="td-card-sub">${list.length}</span>`:'',foot:link(manager()?'Manage happenings':'All happenings & Q&A','navigate','specials')+(manager()?link('Add happening','edit','','data-collection="specials"'):'')});
 }

 function arrivals(st,ctx,service){
  const start=svcOf(service)?.start||'00:00',key=x=>(x.time<start?'1':'0')+x.time;
  const list=ctx.reservations.filter(x=>['Confirmed','Seated'].includes(x.status)).sort((a,b)=>key(a).localeCompare(key(b)));
  const table=t=>{const v=String(t||'').trim();return !v?'No table':/^\d+$/.test(v)?'Table '+v:v;};
  const rows=list.slice(0,5).map(x=>`<div class="td-arrival" data-status="${e(x.status)}"><span class="td-arrival-time">${e(x.time)}<small>${x.status==='Seated'?'Seated':'Arrival'}</small></span><div class="td-arrival-info"><strong>${e(x.name)}</strong><small><span class="td-guest-count">${plural(x.guests,'guest')}</span><span class="td-table-label">${e(table(x.table))}</span></small>${x.note?`<p>${e(x.note)}</p>`:''}</div>${btn(x.status==='Confirmed'?'Seat':'Done','reservation-status',x.id,'secondary','data-status="'+(x.status==='Confirmed'?'Seated':'Completed')+'"')}</div>`).join('');
  const guests=list.reduce((n,x)=>n+x.guests,0);
  return card('td-arrivals','Arrivals',list.length?rows+(list.length>5?`<p class="td-more-note">+${list.length-5} more bookings</p>`:''):`<p class="td-empty">No upcoming arrivals for ${e(service)}.</p>`,{meta:list.length?`<span class="td-card-sub">${plural(guests,'guest')} · ${plural(list.length,'booking')}</span>`:'',foot:link('All reservations','navigate','reservations')+link('Add booking','edit','','data-collection="reservations"')});
 }

 // Who is working, inside the hero: avatars and names on the row, the full list with status flags when you open it; tap anyone to message them.
 function crew(st,team,briefs,people,others){
  if(!people.length)return manager()?`<button type="button" class="td-hero-jump" data-action="app-screen" data-id="shifts">Open the roster<span aria-hidden="true">›</span></button>`:'';
  if(!manager()&&!others.length)return `<p class="td-hero-solo">Working solo</p>`;
  const avatars=(manager()?people:others).slice(0,5).map(id=>`<span data-tone="${tone(team.find(x=>x.person===id)?.area)}">${e(B.person(id)?.initials||'TM')}</span>`).join('');
  const who=manager()?people.slice(0,3).map(first).join(', ')+(people.length>3?' +'+(people.length-3):''):'With '+others.slice(0,2).map(first).join(', ')+(others.length>2?' +'+(others.length-2):'');
  const rows=team.map(x=>{const m=B.schedule.metrics(st,x),p=B.person(x.person),self=x.person===me(),unread=manager()&&briefs.some(b=>!hasRead(b,x.person));
   const flags=m.absence?tag('Out','danger'):m.late?tag('Late '+m.late.minutes+'m','amber'):unread?'<small class="td-card-sub">Briefing unread</small>':'';
   const inner=`<span class="td-avatar" data-tone="${tone(x.area)}">${e(p?.initials||'TM')}</span><span class="td-person"><strong>${e(self?'You':p?.name||'Team member')}</strong><small>${e(x.area)} · ${e(x.start)}–${e(x.end)}</small></span>${flags}`;
   return self?`<div class="td-member is-me">${inner}</div>`:`<button type="button" class="td-member" data-action="chat-dm" data-id="${e(x.person)}" aria-label="Message ${e(p?.name||'teammate')}">${inner}</button>`;}).join('');
  return `<details class="td-hero-team" data-key="home-team-${e(st.date+'|'+st.service)}"><summary><span class="td-stack">${avatars}</span><span class="td-hero-who">${e(who)}</span><span class="td-hero-count">${plural(people.length,'person','people')}</span>${icon('chev')}</summary><div class="td-hero-members">${rows}<p class="td-hint">Tap someone to message them.</p></div></details>`;
 }

 // Shift notes are managed in full here: add, edit and archive without leaving Today.
 function notes(st,ctx,team,service){
  const write=manager()||team.some(x=>x.person===me()),c=ctxAttrs();
  const item=x=>`<article class="td-note${x.priority==='manager'?' is-priority':''}"><small>${x.priority==='manager'?'<b>Manager priority</b> · ':''}${e(name(x.author))}</small><p>${e(x.body)}</p>${manager()||x.author===me()?`<div class="td-note-actions"><button type="button" data-action="ops-note" data-id="${e(x.id)}">Edit</button><button type="button" data-action="ops-archive-note" data-id="${e(x.id)}">Archive</button></div>`:''}</article>`;
  const more=ctx.notes.slice(3);
  const body=ctx.notes.length?ctx.notes.slice(0,3).map(item).join('')+(more.length?`<details class="td-more" data-key="home-notes-more-${e(st.date+'|'+service)}"><summary>Show ${more.length} more ${more.length===1?'note':'notes'}</summary>${more.map(item).join('')}</details>`:''):`<p class="td-empty">No shift notes yet.</p>`;
  return `<section class="td-card td-notes"><header class="td-card-head"><h2>Shift notes</h2>${ctx.notes.length?`<div class="td-card-meta"><span class="td-card-sub">${ctx.notes.length}</span></div>`:''}</header>${body}${write?`<footer class="td-card-foot"><button type="button" class="td-link" data-action="ops-note" data-id="" ${c}>${manager()?'Add priority note':'Add a shift note'}<span aria-hidden="true">+</span></button></footer>`:''}</section>`;
 }

 function handle(action,id){
  const doc=globalThis.document;
  if(action==='scroll'){const el=doc?.getElementById(id)||doc?.querySelector('.td .'+id);el?.scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(action==='list'){homeList=id;api.render();return;}
  if(action==='expand'){const el=doc?.getElementById(id);if(!el)return;el.classList.toggle('is-clamped');const b=doc.querySelector(`[data-action="home-expand"][data-id="${id}"]`);if(b)b.textContent=el.classList.contains('is-clamped')?'Read more':'Show less';return;}
  if(action==='nudge'){
   const st=s(),b=st.briefings.find(x=>x.id===id);if(!b)return;
   const team=[...new Set([...st.shifts.filter(x=>x.date===b.date&&x.service===b.service).map(x=>x.person),...b.acks])].filter(p=>!hasRead(b,p));if(!team.length)return;
   api.commit?.({type:'chat:send',id:crypto.randomUUID(),thread:'team',kind:'text',body:`Reminder for ${listing(team.map(first))}: please read and confirm the ${b.service} briefing “${b.title}” on Today before service.`},'Reminder sent in team chat.');return;
  }
  if(action==='choose'){const x=s().shifts.find(x=>x.id===id);if(x){api.focus(x.date,x.service);api.showHome?.();api.close();api.render();}return;}
  if(action==='picker'){api.openContext?.();return;}
 }
 return {entry,render,handle};
};
