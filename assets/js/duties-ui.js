/* Checklists: every station and list in one navigator, the selected list with big tap targets, due times and per-task notes, manager editing in place, service templates, and a history view for audits. */
globalThis.createDutiesUI=function(api){
 const B=Brigly,{e,button,input,textarea,select}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId);

 let historyMode=false,historyFrom='',historyTo='',historyService='',historyArea='',historyPerson='',historyFilter='',historyLimit=14,historySyncedDate='';
 const paths={Floor:'M4 9h16 M6 9v11 M18 9v11 M8 5h8',Bar:'M5 4h14l-7 8z M12 12v8 M8 20h8',Kitchen:'M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4',station:'M4 6h16v12H4z M8 10h8 M8 14h5',note:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',edit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',add:'M12 4v16 M4 12h16',template:'M4 4h16v6H4z M4 14h7v6H4z M14 14h6v6h-6z',report:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',back:'M15 5l-7 7 7 7',check:'M6 12.5l4 4 8-9',clear:'M5 7h14 M9 7V4h6v3 M7 7l1 13h8l1-13',save:'M5 4h11l3 3v13H5z M8 4v5h7 M8 14h8',download:'M12 4v11 M7 10l5 5 5-5 M5 20h14',filter:'M4 5h16l-6 8v6l-4-2v-4z',star:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',count:'M9 4h6v3H9z M6 6h12v15H6z M9 11h6 M9 15h4',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',lock:'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3'};
 const icon=key=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(paths[key]||paths.station)+'"/></svg>';
 const tone=area=>area==='Bar'?'orange':area==='Kitchen'?'slate':'sage';
 const pct=(done,total)=>total?Math.round(done/total*100):0;
 const bar=(done,total)=>'<span class="cl-bar" aria-hidden="true"><span style="width:'+pct(done,total)+'%"></span></span>';
 const chip=(label,action,id,pressed,extra='')=>'<button type="button" class="cl-chip" data-action="'+action+'" data-id="'+e(id)+'" aria-pressed="'+pressed+'">'+label+extra+'</button>';
 const tag=(label,toneKey)=>'<span class="cl-tag" data-tone="'+toneKey+'">'+label+'</span>';
 const stamp=(value,day='')=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return e(value||'Time not recorded');const time=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});return e(day&&B.dateString(d)===day?time:d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' · '+time);};
 const humanDate=date=>{const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?date:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});};
 const initials=p=>e(p?.initials||(p?.name||'TM').split(' ').map(x=>x[0]).join('').slice(0,2));
 const first=id=>(B.person(id)?.name||'Team member').split(' ')[0];
 const order=l=>l==='Opening'?0:l==='Event Setup'?1:/^Mid/.test(l)?2:l==='Closing'?4:3;
 const noteCard=(n,day='')=>{const author=B.person(n.by),roleLabel=author?.access==='manager'?'Manager':author?.role||'Crew';return '<article class="task-note cl-note'+(n.important?' important':'')+'"><span class="cl-note-avatar">'+initials(author)+'</span><div><div class="task-note-head"><small>'+(n.important?'<strong>Priority</strong> · ':'')+e(author?.name||'Team member')+' · '+e(roleLabel)+' · '+stamp(n.at,day)+'</small>'+(n.stockItem?'<span class="badge tone-danger">86 · '+e(n.stockItem)+'</span>':'')+'</div><p>'+e(n.body)+'</p></div></article>';};

 function syncHistoryDates(){
  const cur=s().date;
  if(!historyFrom||!historyTo){historyFrom=cur;historyTo=cur;historySyncedDate=cur;}
  else if(historySyncedDate&&historySyncedDate!==cur&&historyFrom===historyTo){historyFrom=cur;historyTo=cur;historySyncedDate=cur;}
 }

 // History: who completed every task, when, and every note, for any day or range. Totals and trends live in Reports.
 function historyPanel(){
  syncHistoryDates();
  let groups=[],error='';
  try{groups=B.work.history(s(),historyFrom,historyTo,historyService,historyArea,{person:historyPerson,filter:historyFilter});}catch(err){error=err.message;}
  const rows=groups.flatMap(g=>g.rows).filter(t=>!t.removed),done=rows.filter(t=>t.check).length,missed=rows.length-done;
  const cur=s().date,isSingleDay=historyFrom===historyTo,isToday=isSingleDay&&historyFrom===cur;
  const isLast7=historyTo===cur&&historyFrom===B.addDays(cur,-6),isLast30=historyTo===cur&&historyFrom===B.addDays(cur,-29),isAll=historyFrom===(s().demoHistory?.from||B.addDays(cur,-180))&&historyTo===cur;
  const presets='<div class="cl-chips cl-presets">'+chip('‹','checklist-range','prev-day',false,'<span class="sr-only">Previous day</span>')+chip('Selected date','checklist-range','day',isToday)+chip('›','checklist-range','next-day',false,'<span class="sr-only">Next day</span>')+chip('7 days','checklist-range','7',isLast7)+chip('30 days','checklist-range','30',isLast30)+chip('6 months','checklist-range','all',isAll)+'</div>';
  const active=[historyService,historyArea,historyPerson,historyFilter].filter(Boolean).length;
  const filters='<details class="cl-filters"'+(active?' open':'')+'><summary>'+icon('filter')+'<span>Filters'+(active?' · '+active+' active':'')+'</span></summary><div class="history-filters">'+
   input('historyFrom','From',historyFrom,'date')+input('historyTo','Through',historyTo,'date')+
   select('historyService','Service',[['','All services'],...s().setup.services.map(v=>[v.name,v.name])],historyService)+
   select('historyArea','Station',[['','All stations'],...s().setup.areas.map(v=>[v,v])],historyArea)+
   select('historyPerson','Completed or noted by',[['','Everyone'],...s().team.map(p=>[p.id,p.name+(p.active?'':' (former)')])],historyPerson)+
   select('historyFilter','Show',[['','All tasks'],['incomplete','Incomplete tasks'],['completed','Completed tasks'],['notes','Tasks with notes'],['important','Manager priority notes']],historyFilter)+
  '</div></details>';
  const summary=error?'':'<p class="cl-history-sum"><strong>'+done+' of '+rows.length+'</strong> tasks completed'+(missed?' · <span class="is-missed">'+missed+' not done</span>':'')+' · '+groups.length+' '+(groups.length===1?'service':'services')+'</p>';
  const groupCard=(g,idx)=>{
   const gRows=g.rows.filter(t=>!t.removed),gDone=gRows.filter(t=>t.check).length,complete=gRows.length&&gDone===gRows.length;
   const phases=[...new Set(gRows.map(t=>t.list))].map(list=>{const l=gRows.filter(t=>t.list===list);return e(list)+' '+l.filter(t=>t.check).length+'/'+l.length;}).join(' · ');
   const contribText=(g.contributors||[]).map(c=>e(c.name.split(' ')[0])+' ('+c.count+')').join(', ')||'None recorded yet';
   const teamText=(g.team||[]).map(p=>e(p.name.split(' ')[0])+' · '+e(p.area)).join(', ')||'No shifts scheduled';
   const row=t=>'<li class="cl-report-row'+(t.removed?' is-removed':t.check?' is-done':' is-missed')+'"><span class="cl-report-dot" aria-hidden="true">'+(t.check?icon('check'):'')+'</span><div class="cl-report-main"><strong>'+e(t.title)+'</strong><small>'+e(t.area)+' · '+e(t.list)+' · '+(t.removed?'Removed from list':t.check?'Completed by '+e(B.person(t.check.by)?.name||'Team member')+' · '+stamp(t.check.at,g.date):'Not completed'+(t.assigned?.length?' · on station: '+e(t.assigned.join(', ')):''))+'</small>'+(t.notes.length?'<div class="report-task-notes">'+t.notes.map(n=>noteCard(n,g.date)).join('')+'</div>':'')+'<div class="report-note-actions"><button type="button" class="cl-link" data-action="checklist-note" data-id="'+e(t.id)+'" data-date="'+e(g.date)+'" data-service="'+e(g.service)+'">'+(t.notes.length?'Notes · '+t.notes.length:'+ Leave note')+'</button>'+(t.events.length>1?'<details><summary>Activity · '+t.events.length+'</summary><ol class="task-activity">'+t.events.map(x=>'<li>'+e(x.kind)+' · '+e(B.person(x.by)?.name||'Team member')+'<small>'+stamp(x.at,g.date)+'</small></li>').join('')+'</ol></details>':'')+'</div></div></li>';
   return '<details class="history-service cl-report-card" '+((groups.length<=3||idx===0)?'open ':'')+'data-key="history-'+e(g.date+'-'+g.service)+'"><summary><div class="history-service-title"><strong>'+e(humanDate(g.date))+' · '+e(g.service)+'</strong><small class="history-service-sub">'+phases+(g.noteCount?' · '+g.noteCount+' note'+(g.noteCount===1?'':'s'):'')+'</small>'+bar(gDone,gRows.length)+'</div><span class="cl-count'+(complete?' is-complete':'')+'">'+gDone+'/'+gRows.length+'</span></summary><div class="history-shift-bar"><small><strong>Completed by:</strong> '+contribText+'</small><small><strong>On shift:</strong> '+teamText+'</small><button type="button" class="button secondary" data-action="checklist-jump" data-id="'+e(g.date+'|'+g.service)+'">Open this checklist</button></div><ul class="cl-report-rows">'+g.rows.map(row).join('')+'</ul></details>';
  };
  return '<div class="checklist-report cl-history"><div class="cl-history-side">'+
   '<div class="cl-report-head"><button type="button" class="cl-back" data-action="checklist-view" data-id="shift">'+icon('back')+'<span>Checklists</span></button><p class="eyebrow">CHECKLIST HISTORY</p><h2>'+(isSingleDay?e(humanDate(historyFrom)):e(humanDate(historyFrom))+' – '+e(humanDate(historyTo)))+'</h2><p>Who completed every task, when, and every note your team left. Trends and totals are in Reports.</p></div>'+
   presets+filters+summary+
   '<div class="cl-report-actions"><button type="button" class="button secondary" data-action="checklist-export" data-id="">'+icon('download')+' Download CSV</button><button type="button" class="button quiet" data-action="checklist-report-open" data-id="history">Open in Reports ›</button></div>'+
   '</div><div class="cl-history-main">'+(error?'<p class="history-summary">'+e(error)+'</p>':'')+
   groups.slice(0,historyLimit).map(groupCard).join('')+
   (!groups.length&&!error?'<div class="cl-empty"><strong>No checklist records match these filters</strong><p>Pick another range, clear a filter, or choose “6 months”.</p></div>':'')+
   (groups.length>historyLimit?'<button type="button" class="button secondary cl-more" data-action="checklist-more" data-id="">Show '+Math.min(14,groups.length-historyLimit)+' more services</button>':'')+
  '</div></div>';
 }

 function onChange(t){
  if(['historyFrom','historyTo','historyService','historyArea','historyPerson','historyFilter'].includes(t.name)){
   if(t.name==='historyFrom'){historyFrom=t.value;historySyncedDate='';}
   if(t.name==='historyTo'){historyTo=t.value;historySyncedDate='';}
   if(t.name==='historyService')historyService=t.value;
   if(t.name==='historyArea')historyArea=t.value;
   if(t.name==='historyPerson')historyPerson=t.value;
   if(t.name==='historyFilter')historyFilter=t.value;
   historyLimit=14;api.render();
  }
 }

 let checklistArea='',checklistPhase='Opening',checklistEditing=false,checklistKey='';
 let defaultsMode=false,defaultsService='';
 function listContext(){
  const state=s(),activeSvc=defaultsMode?(defaultsService||state.service):state.service;
  const k=state.role+'|'+me()+'|'+state.date+'|'+state.service+'|'+(defaultsMode?'def:'+activeSvc:'shift');
  const own=B.work.stations(state);
  const availLists=B.work.lists?B.work.lists(state,state.date,activeSvc):['Opening','Closing'];
  if(k!==checklistKey||!state.setup.areas.includes(checklistArea)||!availLists.includes(checklistPhase)){
   const fresh=k!==checklistKey;checklistKey=k;
   if(!state.setup.areas.includes(checklistArea)||(fresh&&!manager()&&own.length))checklistArea=own[0]||state.setup.areas[0];
   if(fresh||!availLists.includes(checklistPhase)){
    // Land on the first list at this station that still has open work, in service order.
    const all=defaultsMode?B.work.defaultTasks(state,activeSvc):B.work.tasks(state,state.date,state.service),checks=defaultsMode?{}:(state.checks[state.date+'|'+state.service]||{});
    const mine=availLists.filter(l=>all.some(t=>t.area===checklistArea&&t.list===l)).sort((a,b)=>order(a)-order(b));
    checklistPhase=mine.find(l=>all.some(t=>t.area===checklistArea&&t.list===l&&!checks[t.id]))||mine.at(-1)||(availLists.includes(checklistPhase)?checklistPhase:availLists[0]||'Opening');
   }
   if(fresh)checklistEditing=false;
  }
  return {area:checklistArea,list:checklistPhase,own,editable:manager()||(!defaultsMode&&own.includes(checklistArea)),defaultsMode,service:activeSvc};
 }

 function lists(){
  if(manager()&&historyMode)return historyPanel();
  const state=s(),c=listContext(),activeSvc=c.service,day=state.date,editing=manager()&&(checklistEditing||defaultsMode);
  const all=defaultsMode?B.work.defaultTasks(state,activeSvc):B.work.tasks(state,state.date,state.service);
  const checks=defaultsMode?{}:(state.checks[state.date+'|'+state.service]||{});
  const isSpec=t=>B.work.isSpecific?B.work.isSpecific(t):Boolean(t&&t.specific);
  const notesFor=t=>defaultsMode?[]:(B.work.notes?.(state,t.id)||[]);
  const availLists=[...new Set(['Opening','Closing',...all.map(t=>t.list)])].sort((a,b)=>order(a)-order(b));
  const listsAt=area=>availLists.filter(l=>all.some(t=>t.area===area&&t.list===l)||(area===c.area&&(l===c.list||editing)));
  const rows=all.filter(t=>t.area===c.area&&t.list===c.list),done=rows.filter(t=>checks[t.id]).length;
  const shiftTeam=defaultsMode?[]:state.shifts.filter(x=>x.date===state.date&&x.service===state.service);
  const stationPeople=[...new Set(shiftTeam.filter(x=>x.area===c.area).map(x=>x.person))].map(id=>B.person(id)).filter(Boolean);
  const now=Date.now(),dueOf=list=>defaultsMode?null:B.work.due?.(state,list);
  const late=(list,items)=>{const d=dueOf(list);return d&&now>d.at&&now-d.at<12*3600000&&items.some(t=>!checks[t.id]);};
  const totalDone=all.filter(t=>checks[t.id]).length;

  // Navigator: every station with its lists, progress and due times. A column on wide screens; compact switchers on phones.
  const listButton=(area,list,cls)=>{const items=all.filter(t=>t.area===area&&t.list===list),n=items.filter(t=>checks[t.id]).length,full=!defaultsMode&&items.length&&n===items.length,d=dueOf(list),isLate=late(list,items);
   return '<button type="button" class="'+cls+(isLate?' is-late':'')+'" data-action="checklist-go" data-id="'+e(area+'|'+list)+'" '+(area===c.area&&list===c.list?'aria-current="true"':'')+'><span class="cl-nav-name">'+(full?icon('check'):'')+e(list)+'</span>'+(cls==='cl-nav-list'&&d?'<small>'+(isLate?'Overdue':e(d.short))+'</small>':'')+'<b>'+(defaultsMode?items.length:n+'/'+items.length)+'</b></button>';};
  // One header for the whole screen: what you're looking at, how far along it is, and the manager's tools in plain sight.
  const humanDay=humanDate(state.date);
  const modes=manager()?'<div class="cl-mode" role="group" aria-label="Checklist mode"><button type="button" data-action="checklist-mode" data-id="shift" aria-pressed="'+!defaultsMode+'">'+icon('check')+'This shift</button><button type="button" data-action="checklist-mode" data-id="defaults" aria-pressed="'+defaultsMode+'">'+icon('template')+'Templates</button></div>':'';
  const tools=manager()?'<div class="cl-top-tools">'+modes+'<button type="button" class="button secondary small" data-action="checklist-new-list" data-id=""'+(defaultsMode?' data-default="true"':'')+'>'+icon('add')+'New list</button><button type="button" class="button secondary small" data-action="checklist-view" data-id="history">'+icon('report')+'History</button></div>':'';
  const top=defaultsMode
   ?'<header class="cl-top is-template service-default-banner"><div class="cl-top-sum"><p class="cl-eyebrow">Default service template</p><h2>Default checklists for '+e(activeSvc)+'</h2><p class="cl-top-note">These lists appear on every '+e(activeSvc)+' shift. Shifts that already have their own list keep it.</p><div class="cl-chips service-default-tabs" aria-label="Service template">'+state.setup.services.filter(v=>v.active!==false).map(v=>chip(e(v.name),'checklist-default-svc',v.name,v.name===activeSvc)).join('')+'</div></div>'+tools+'</header>'
   :'<header class="cl-top"><div class="cl-top-sum"><p class="cl-eyebrow">'+e(state.service)+' · '+e(humanDay)+'</p><h2>'+totalDone+'<span> of '+all.length+' tasks done</span></h2>'+bar(totalDone,all.length)+'</div>'+tools+'</header>';
  const nav='<aside class="cl-nav" aria-label="Stations and lists">'+
   state.setup.areas.map(area=>{const items=all.filter(t=>t.area===area),n=items.filter(t=>checks[t.id]).length,you=c.own.includes(area)&&!manager()&&!defaultsMode;
    return '<section class="cl-nav-group'+(area===c.area?' is-current':'')+'"><button type="button" class="cl-station" data-tone="'+tone(area)+'" data-action="checklist-area" data-id="'+e(area)+'" aria-pressed="'+(c.area===area)+'"><span class="cl-station-icon">'+icon(area)+'</span><strong>'+e(area)+'</strong>'+(you?'<em>You</em>':'')+'<small>'+(defaultsMode?items.length+' tasks':n+'/'+items.length)+'</small></button><div class="cl-nav-lists">'+listsAt(area).filter(l=>all.some(t=>t.area===area&&t.list===l)||area===c.area).map(l=>listButton(area,l,'cl-nav-list')).join('')+'</div></section>';}).join('')+
  '</aside>';
  // Phones and tablets: one bar under the command bar, stations as icon tabs (badge = tasks still open) and the lists beneath, the same pattern as Stock.
  const switcher='<nav class="cl-switch" aria-label="Stations and lists"><div class="cl-seg" role="group" aria-label="Station">'+state.setup.areas.map(area=>{const items=all.filter(t=>t.area===area),n=items.filter(t=>checks[t.id]).length,left=items.length-n,you=c.own.includes(area)&&!manager()&&!defaultsMode;return '<button type="button" data-tone="'+tone(area)+'" data-action="checklist-area" data-id="'+e(area)+'" aria-pressed="'+(c.area===area)+'" aria-label="'+e(area)+(defaultsMode?', '+items.length+' tasks':left?', '+left+' open':', all done')+(you?', your station':'')+'"><span class="cl-seg-icon">'+icon(area)+(defaultsMode?'':left?'<em>'+left+'</em>':items.length?'<em class="is-done">'+icon('check')+'</em>':'')+'</span><span class="cl-seg-text"><strong>'+e(area)+(you?'<i aria-hidden="true"></i>':'')+'</strong></span></button>';}).join('')+'</div><div class="cl-tabs" role="group" aria-label="Checklist">'+listsAt(c.area).map(l=>listButton(c.area,l,'cl-tab')).join('')+'</div></nav>';

  // The selected list.
  const due=dueOf(c.list),isLate=late(c.list,rows);
  const head='<header class="cl-pane-head"><div><p class="cl-eyebrow">'+e(c.area)+' · '+e(defaultsMode?activeSvc+' template':state.service)+'</p><h2>'+e(c.list)+'</h2><p class="cl-pane-sub">'+[defaultsMode?'Repeats every '+e(activeSvc)+' shift':'',due?(isLate?'<span class="is-late">Overdue · was due '+e(due.time)+'</span>':e(due.label)):'',!defaultsMode?(stationPeople.length?'On station: '+e(stationPeople.map(p=>p.name.split(' ')[0]).join(', ')):'No one on this station'):''].filter(Boolean).join(' · ')+'</p></div>'+
   (manager()&&!defaultsMode?'<button type="button" class="button '+(checklistEditing?'':'secondary ')+'small cl-edit-toggle" data-action="checklist-manage" data-id="" aria-pressed="'+checklistEditing+'">'+icon(checklistEditing?'check':'edit')+(checklistEditing?'Done editing':'Edit list')+'</button>':'')+'</header>';
  const progress=defaultsMode?'':'<div class="cl-progress">'+bar(done,rows.length)+'<span>'+(rows.length?done+' of '+rows.length+' done':'No tasks yet')+'</span></div>';

  // Stock counts this station owes show up where the crew already is.
  let linked='';
  if(!defaultsMode&&B.stock&&state.stock&&state.date===B.dateString(new Date())&&(manager()||B.stock.teams(state,me()).includes(c.area))){
   const open=state.stock.counts.find(x=>x.team===c.area&&x.status==='Open'),asg=(state.stock.assignments||[]).filter(x=>x.status==='Open'&&x.team===c.area&&x.date<=B.addDays(day,1)).sort((a,b)=>a.date.localeCompare(b.date))[0];
   if(open||asg){const overdue=asg&&asg.date<day,n=open?Object.keys(open.entries).length:0;
    linked='<div class="cl-linked'+(overdue?' is-late':'')+'"><span class="cl-linked-icon">'+icon('count')+'</span><span><strong>'+e(c.area)+' stock count'+(open?' in progress':overdue?' is overdue':asg.date===day?' is due today':' is due tomorrow')+'</strong><small>'+(open?n+' counted so far · started by '+e(first(open.startedBy)):asg.assignee?(asg.assignee===me()?'Assigned to you':'Assigned to '+e(first(asg.assignee))):'Anyone on '+e(c.area))+(asg?.note?' · '+e(asg.note):'')+'</small></span><button type="button" class="button small'+(open||overdue||asg?.date===day?'':' secondary')+'" data-action="stock-count-go" data-id="'+e(c.area)+'">'+(open?'Continue':'Start count')+'</button></div>';}
  }

  const row=t=>{
   const check=checks[t.id],notes=notesFor(t),important=notes.some(n=>n.important)&&!check;
   const meta=[check?'Done by '+e(first(check.by))+' · '+stamp(check.at,day):'',isSpec(t)?tag('Tonight only','orange'):'',important?tag('Priority','danger'):''].filter(Boolean).join(' ');
   const box=defaultsMode?'<span class="cl-bullet" aria-hidden="true"></span>':'<input type="checkbox" data-task="'+e(t.id)+'" '+(check?'checked ':'')+(!c.editable?'disabled':'')+'><span class="cl-box" aria-hidden="true">'+icon('check')+'</span>';
   return '<div class="cl-task'+(check?' is-done':'')+(important?' has-important':'')+'" data-task-row="'+e(t.id)+'"><div class="cl-task-row"><label class="cl-check'+(defaultsMode?' is-template':'')+'">'+box+'<span class="cl-task-text"><strong>'+e(t.title)+'</strong>'+(meta?'<small>'+meta+'</small>':'')+'</span></label>'+
    (!defaultsMode?'<button type="button" class="cl-note-btn'+(notes.length?' has-notes':'')+(important?' is-important':'')+'" data-action="checklist-note" data-id="'+e(t.id)+'" aria-label="'+(notes.length?notes.length+' notes':'Add note')+' for '+e(t.title)+'">'+icon('note')+(notes.length?'<span>'+notes.length+'</span>':'')+'</button>':'')+
    (editing?'<button type="button" class="cl-note-btn" data-action="edit" data-id="'+e(t.id)+'" data-collection="tasks"'+(defaultsMode?' data-default="true"':'')+' aria-label="Edit '+e(t.title)+'">'+icon('edit')+'</button>':'')+
    '</div>'+(notes.length?'<div class="task-discussion cl-notes">'+notes.slice(0,2).map(n=>noteCard(n,day)).join('')+(notes.length>2?'<button type="button" class="cl-link" data-action="checklist-note" data-id="'+e(t.id)+'">View all '+notes.length+' notes ›</button>':'')+'</div>':'')+'</div>';
  };
  const group=(items,cls,label,sub)=>{
   const open=items.filter(t=>!checks[t.id]).sort((a,b)=>Number(notesFor(b).some(n=>n.important))-Number(notesFor(a).some(n=>n.important))),closed=items.filter(t=>checks[t.id]);
   const last=closed.map(t=>checks[t.id]).sort((a,b)=>String(b.at).localeCompare(String(a.at)))[0],key=e(cls+'-'+c.area+'-'+c.list);
   const done=!defaultsMode&&items.length&&!open.length&&!editing,doneLine=last?'Done · last by '+e(first(last.by))+' at '+stamp(last.at,day):'All done';
   // A finished group folds into one line; open it to see who did what.
   if(done)return '<details class="cl-group is-done '+cls+'" data-key="group-'+key+'"><summary class="cl-group-head"><span class="cl-done-mark" aria-hidden="true">'+icon('check')+'</span><span class="cl-group-title">'+(label||'<strong>'+e(c.list)+' tasks</strong>')+'<small>'+doneLine+'</small></span><span class="cl-count is-complete">'+closed.length+'/'+items.length+'</span></summary>'+closed.map(row).join('')+'</details>';
   return '<section class="cl-group '+cls+'">'+(label?'<header class="cl-group-head"><span class="cl-group-title">'+label+(sub?'<small>'+sub+'</small>':'')+'</span><span class="cl-count">'+(defaultsMode?items.length:closed.length+'/'+items.length)+'</span></header>':'')+
    (open.map(row).join('')||'<div class="cl-empty"><strong>No tasks on this list</strong><p>'+(manager()?(editing?'Add the first task below.':'Tap Edit list to add tasks.'):'Your manager hasn’t added tasks here yet.')+'</p></div>')+
    (closed.length?'<details class="cl-completed" data-key="completed-'+key+'"><summary>Completed · '+closed.length+'</summary>'+closed.map(row).join('')+'</details>':'')+'</section>';
  };
  const specificRows=defaultsMode?[]:rows.filter(isSpec),defaultRows=defaultsMode?rows:rows.filter(t=>!isSpec(t));
  const list=specificRows.length
   ?group(specificRows,'specific-tasks-panel','<strong>Special &amp; event tasks '+tag('Shift-specific','orange')+'</strong>','Only for '+e(state.service)+' on '+e(humanDate(state.date)))+group(defaultRows,'default-tasks-panel','<strong>Standard '+e(c.list.toLowerCase())+' routine</strong>','')
   :group(defaultRows,'','','');

  const editTools=editing?'<div class="cl-edit"><form class="cl-quickadd" data-cl-quickadd><label class="sr-only" for="cl-quick-title">New task</label><input id="cl-quick-title" name="clQuickTitle" maxlength="200" autocomplete="off" placeholder="Add a task to '+e(c.area)+' · '+e(c.list)+'" required>'+(defaultsMode?'':'<select name="clQuickScope" aria-label="How often"><option value="shift">Tonight only</option><option value="default">Every '+e(state.service)+'</option></select>')+'<button type="submit" class="button">'+icon('add')+'Add tasks</button></form><div class="cl-edit-links"><button type="button" class="cl-link" data-action="checklist-add" data-id=""'+(defaultsMode?' data-default="true"':'')+'>Add several at once</button>'+(defaultsMode?'':'<button type="button" class="cl-link" data-action="checklist-save-defaults" data-id="'+e(state.service)+'">'+icon('save')+'Save as the '+e(state.service)+' default</button>')+'<button type="button" class="cl-link is-danger" data-action="work-empty" data-id=""'+(defaultsMode?' data-default="true"':'')+'>'+icon('clear')+'Clear list</button></div><small>Editing '+(defaultsMode?'the '+e(activeSvc)+' template':'this shift only')+' · '+e(c.area)+' · '+e(c.list)+'</small></div>':'';
  const readonly=!c.editable&&!defaultsMode?'<p class="cl-readonly">'+icon('lock')+'<span>'+(c.own.length?'Viewing another team’s list. Only its assigned crew and managers can check off tasks or leave notes here.':'You’re not working '+e(state.service)+', so this list is view-only. Crew on shift and managers can check off tasks.')+'</span></p>':'';

  return '<div class="cl station-checklists'+(defaultsMode?' is-template':'')+'">'+top+switcher+nav+'<section class="cl-pane" aria-label="'+e(c.area+' '+c.list)+'">'+head+progress+linked+readonly+list+editTools+'</section></div>';
 }

 function flash(id){
  const doc=globalThis.document,run=()=>{const el=doc?.querySelector('[data-task-row="'+(globalThis.CSS?.escape?CSS.escape(id):id)+'"]');if(!el)return;el.closest('details')?.setAttribute('open','');el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('is-flash');setTimeout(()=>el.classList.remove('is-flash'),2200);};
  if(globalThis.requestAnimationFrame)requestAnimationFrame(run);else run();
 }
 function listHandle(a,id,data={}){
  if(a==='view'){
   historyMode=id==='history';
   if(historyMode){historyFrom=s().date;historyTo=s().date;historySyncedDate=s().date;}
   api.render();return;
  }
  if(a==='mode'){
   defaultsMode=id==='defaults';historyMode=false;
   if(defaultsMode&&!defaultsService)defaultsService=s().service;
   checklistEditing=false;
   api.render();return;
  }
  if(a==='default-svc'){
   defaultsService=id;checklistPhase='Opening';checklistEditing=false;api.render();return;
  }
  // Jump straight to a station's list, or to one task on it.
  if(a==='go'||a==='task'){
   historyMode=false;if(a==='task')defaultsMode=false;listContext();
   const [area,list]=a==='go'?String(id).split('|'):[data.area,data.list];
   if(area&&s().setup.areas.includes(area))checklistArea=area;if(list)checklistPhase=list;
   api.render();if(a==='task')flash(id);return;
  }
  if(a==='new-list'){
   const c=listContext();
   const activeSvc=defaultsMode?(defaultsService||s().service):s().service;
   api.openTasks(
    'Create new checklist',
    input('customList','Checklist name','','text','required maxlength="80" placeholder="e.g. Event Setup, Mid-shift, Deep Clean, Patio Open"')+
    select('area','Station',s().setup.areas.map(a=>[a,a]),c.area)+
    select('targetScope','Checklist scope',[
     ['shift','Shift-specific (only for '+s().date+' · '+s().service+')'],
     ['default','Default checklist for '+activeSvc+' (repeats every day)']
    ],defaultsMode?'default':'shift')+
    textarea('titles','Tasks (one per line)','','required placeholder="Enter tasks, one per line"')+
    '<p>Opening and Closing are the standard checklists. You can create custom checklists for events, mid-shift prep, or special routines.</p>',
    {type:'checklist:new-list',area:c.area,isDefault:defaultsMode,service:activeSvc}
   );
   return;
  }
  if(a==='save-defaults'){
   const svc=id||(defaultsMode?defaultsService||s().service:s().service);
   api.commit({type:'checklist:save-defaults',service:svc},'Checklist saved as default for '+svc+'.');
   return;
  }
  if(a==='day-report'||a==='report-open'){
   historyMode=true;historyFrom=s().date;historyTo=s().date;historyService='';historyArea='';historyPerson='';historyFilter='';historySyncedDate=s().date;
   api.render();return;
  }
  if(a==='range'){
   const cur=s().date;
   if(id==='prev-day'){const base=historyFrom||cur;historyFrom=historyTo=B.addDays(base,-1);historySyncedDate='';}
   else if(id==='next-day'){const base=historyFrom||cur;historyFrom=historyTo=B.addDays(base,1);historySyncedDate='';}
   else if(id==='day'){historyFrom=historyTo=cur;historySyncedDate=cur;}
   else if(id==='7'){historyTo=cur;historyFrom=B.addDays(cur,-6);historySyncedDate='';}
   else if(id==='30'){historyTo=cur;historyFrom=B.addDays(cur,-29);historySyncedDate='';}
   else if(id==='all'){historyTo=cur;historyFrom=s().demoHistory?.from||B.addDays(cur,-180);historySyncedDate='';}
   historyLimit=14;api.render();return;
  }
  if(a==='jump'){
   const [d,svc]=String(id).split('|');
   if(B.isDate(d)&&svc){api.focusShift?.(d,svc);historyMode=false;defaultsMode=false;api.render();}
   return;
  }
  if(a==='export'){
   if(!manager())throw Error('Only managers can export checklist reports.');
   syncHistoryDates();
   const csv=B.work.historyCSV(s(),historyFrom,historyTo,historyService,historyArea,{person:historyPerson,filter:historyFilter});
   const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=`brigly-checklist-report-${historyFrom}-${historyTo}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   return;
  }
  if(a==='more'){historyLimit+=14;api.render();return;}
  if(a==='note'){
   const noteDate=data.date||s().date,noteService=data.service||s().service;
   const task=B.work.tasks(s(),noteDate,noteService).find(t=>t.id===id);if(!task)return;
   const writable=manager()||B.work.stations(s(),noteDate,noteService).includes(task.area);
   const existing=B.work.notes(s(),id,noteDate,noteService);
   const chips=manager()
    ?[['Super important today, please do not forget: ','true',''],['Please double-check before service: ','true',''],['Let manager know once completed','false','']]
    :[['Couldn’t restock — we are 86 ','false','focus-86'],['Running low on stock: ','false',''],['Completed and checked for service','false','']];
   const chipHtml=writable?'<div class="note-quick-chips"><small>Quick phrases (tap to insert):</small><div>'+chips.map(([text,imp,flag])=>'<button type="button" class="button quiet note-chip" data-action="checklist-quick-note" data-text="'+e(text)+'" data-important="'+imp+'" data-flag="'+flag+'">'+e(text.trim())+'</button>').join('')+'</div></div>':'';
   const placeholder=manager()?'placeholder="e.g. Super important today, please do not forget…"':'placeholder="e.g. Couldn’t restock beer, we are 86 Miller Lite…"';
   // Running low is a stock problem: one tap goes to this station's stock list to request it.
   const stockLink=writable&&B.stock?'<button type="button" class="cl-link cl-stock-link" data-action="stock-go" data-id="items" data-team="'+e(task.area)+'">'+icon('count')+'Running low? Request stock for '+e(task.area)+' ›</button>':'';
   api.openTasks(
    'Task notes · '+task.area,
    '<div class="task-dialog-meta"><strong>'+e(task.title)+'</strong><small>'+e(task.area)+' · '+e(task.list)+' · '+e(noteDate)+' · '+e(noteService)+'</small></div>'+
    '<div class="task-thread">'+(existing.map(n=>noteCard(n)).join('')||'<p class="task-thread-empty">No notes on this task yet. Leave an instruction or shift update below.</p>')+'</div>'+
    (writable
     ? chipHtml+
       textarea('body',manager()?'Leave a note for the crew':'Leave a note for your manager & team','','required maxlength="2000" '+placeholder)+
       (manager()?select('important','Priority',[['true','Important for today — highlight on checklist'],['false','Normal task note']],'true'):'')+
       input('stockItem','86 / unavailable item (optional)','','text','maxlength="100" placeholder="e.g. Miller Lite — automatically posts to 86 board"')+
       '<p class="stock-note-hint">'+(manager()?'Entering an item here also adds an approved 86 alert for this shift.':'If you couldn’t restock or complete something because an item is 86, enter it here (or write “86 Item” in your note) to send an 86 report for manager approval.')+'</p>'+stockLink
     : '<p>Only this station’s assigned crew and managers can add notes.</p>'),
    {type:'checklist:note',task:id,date:noteDate,service:noteService,readOnly:!writable}
   );
   return;
  }
  if(a==='open'){historyMode=false;defaultsMode=false;listContext();if(id)checklistPhase=id;}
  if(a==='add'){
   const c=listContext();
   const activeSvc=defaultsMode?(defaultsService||s().service):s().service;
   const isDefaultTarget=defaultsMode||data.default==='true';
   api.openTasks(
    (isDefaultTarget?'Add default ':'Add ')+c.area+' '+c.list.toLowerCase()+' tasks',
    select('targetScope','Checklist scope',[
     ['shift','Shift-specific (only for '+s().date+' · '+s().service+')'],
     ['default','Default checklist for '+activeSvc+' (repeats every day)']
    ],isDefaultTarget?'default':'shift')+
    textarea('titles','One task per line','','required')+
    '<p>'+e(c.area)+' · '+e(c.list)+' · '+(isDefaultTarget?'Default template for '+e(activeSvc):e(s().date)+' · '+e(s().service))+'</p>',
    {...c,target:isDefaultTarget?'default':'shift',isDefault:isDefaultTarget,service:activeSvc}
   );
   return;
  }
  if(a==='area'){listContext();checklistArea=id;}
  if(a==='phase'){listContext();checklistPhase=id;}
  if(a==='manage'){listContext();checklistEditing=!checklistEditing;}
  api.render();
 }
 // Quick add while editing: type a task, press Enter, keep typing.
 globalThis.document?.addEventListener('submit',ev=>{
  const form=ev.target;if(!form.matches?.('[data-cl-quickadd]'))return;ev.preventDefault();
  const title=form.elements.clQuickTitle.value.trim();if(!title)return;
  const c=listContext(),scope=defaultsMode?'default':form.elements.clQuickScope?.value||'shift';
  const ok=api.commit(scope==='default'?{type:'checklist:add-default',area:c.area,list:c.list,titles:title,service:c.service,alsoShift:!defaultsMode}:{type:'checklist:add',area:c.area,list:c.list,titles:title,specific:true},scope==='default'?'Added to every '+c.service+' shift.':'Added for tonight.');
  if(ok)requestAnimationFrame(()=>{const box=document.getElementById('cl-quick-title');box?.focus();const sel=document.querySelector('[data-cl-quickadd] select');if(sel)sel.value=scope;});
 });
 return {onChange,lists,listContext,listHandle};
};
