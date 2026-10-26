/* Shared shift checklists, per-task manager/crew notes, and multi-day checklist reporting UI. */
globalThis.createDutiesUI=function(api){
 const B=Brigly,{e,button,input,textarea,select}=api,s=()=>api.state(),manager=()=>s().role==='manager';
 let mode='active';
 const action=(label,a,id='',style='secondary')=>button(label,'private-'+a,id,'',style);
 function cards(items){return items.map(x=>'<article class="private-card"><div class="request-heading"><strong>'+e(B.person(manager()?x.recipient:x.author)?.name||'Team member')+'</strong><span class="badge">'+(x.kind==='todo'?'Private to-do':'Private note')+'</span></div><p class="text-block">'+e(x.body)+'</p><small>'+(x.due?'Due '+e(x.due)+' · ':'')+(x.kind==='todo'?(x.done?'Completed':'To do'):(x.read?'Read':'Unread'))+'</small><div class="card-actions">'+(manager()?action(x.archived?'Restore':'Archive','archive',x.id,'quiet'):x.archived?'':x.kind==='todo'?action(x.done?'Reopen task':'Mark complete','done',x.id):!x.read?action('Mark read','read',x.id):'')+'</div></article>').join('');}
 function render(){const items=B.work.visible(s()).filter(x=>mode==='archive'?x.archived:!x.archived);return '<div class="section-bar"><div><h2>'+(manager()?'Private notes & to-dos':'Just for you')+'</h2><p>'+(manager()?'Send an individual instruction. Only you and the recipient see it in the app.':'Notes and tasks from your manager. Other crew members do not see these.')+'</p></div>'+(manager()?action('+ Send privately','compose','',''):'')+'</div><div class="toolbar private-filters">'+action('Active','filter','active',mode==='active'?'':'secondary')+action('Archived','filter','archive',mode==='archive'?'':'secondary')+'</div><div class="private-grid">'+(cards(items)||'<div class="panel empty-state"><h3>Nothing here yet</h3><p>'+(manager()?'Send a note or assign a to-do to one crew member.':'Your manager’s private notes and to-dos will appear here.')+'</p></div>')+'</div>';}
 function preview(){const items=B.work.visible(s()).filter(x=>!x.archived&&(x.kind==='todo'?!x.done:!x.read));return '<section class="private-preview"><div class="request-heading"><div><h2>'+(manager()?'Private follow-ups':'Just for you')+'</h2><small>'+items.length+' '+(manager()?'open sent items':'unread notes or open tasks')+'</small></div>'+button(manager()?'Send privately':'View all',manager()?'private-compose':'navigate','private','','secondary')+'</div>'+(!manager()?cards(items.slice(0,2)):'')+'</section>';}
 function handle(a,id){if(a==='filter'){mode=id;api.render();return;}if(a==='compose'){api.open('Send a private note or to-do',select('recipient','Crew member',s().team.filter(p=>p.active&&p.access==='crew').map(p=>[p.id,p.name]))+select('kind','Type',[['note','Private note'],['todo','Private to-do']],'note')+textarea('body','Message','','required maxlength="2000"')+input('due','Due date (optional)','','date')+'<p>Visible to you and this crew member in the app.</p>');return;}api.commit({type:'private:'+a,id},'Private item updated.');}

 let historyMode=false,historyFrom='',historyTo='',historyService='',historyArea='',historyPerson='',historyFilter='',historyLimit=14,historySyncedDate='';
 const stamp=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?e(value||'Time not recorded'):e(d.toLocaleString('en-US',{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}));};
 const humanDate=date=>{const d=new Date(date+'T12:00:00');return Number.isNaN(d.getTime())?date:d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});};
 const noteCard=n=>{const author=B.person(n.by),roleLabel=author?.access==='manager'?'Manager':author?.role||'Crew';return '<article class="task-note '+(n.important?'important':'')+'"><div class="task-note-head"><small>'+(n.important?'<strong>Important · Do not forget</strong> · ':'')+e(author?.name||'Team member')+' ('+e(roleLabel)+') · '+stamp(n.at)+'</small>'+(n.stockItem?'<span class="badge orange">86: '+e(n.stockItem)+'</span>':'')+'</div><p>'+e(n.body)+'</p>'+(n.stockItem?'<small class="task-note-stock">86 item logged: '+e(n.stockItem)+' · see the 86 board for current status</small>':'')+'</article>';};

 function syncHistoryDates(){
  const cur=s().date;
  if(!historyFrom||!historyTo){historyFrom=cur;historyTo=cur;historySyncedDate=cur;}
  else if(historySyncedDate&&historySyncedDate!==cur&&historyFrom===historyTo){historyFrom=cur;historyTo=cur;historySyncedDate=cur;}
 }

 function historyPanel(){
  syncHistoryDates();
  let groups=[],error='';
  try{groups=B.work.history(s(),historyFrom,historyTo,historyService,historyArea,{person:historyPerson,filter:historyFilter});}catch(err){error=err.message;}
  const rows=groups.flatMap(g=>g.rows).filter(t=>!t.removed),done=rows.filter(t=>t.check).length,incompleteCount=rows.length-done;
  const totalNotes=groups.reduce((sum,g)=>sum+g.noteCount,0),importantNotes=groups.reduce((sum,g)=>sum+g.importantCount,0);
  const contributors=new Map();
  for(const g of groups)for(const c of g.contributors||[])contributors.set(c.id,(contributors.get(c.id)||0)+c.count);
  const topPeople=[...contributors.entries()].map(([id,count])=>({name:B.person(id)?.name||id,count})).sort((a,b)=>b.count-a.count);
  const isSingleDay=historyFrom===historyTo;
  const isLast7=historyTo===s().date&&historyFrom===B.addDays(s().date,-6);
  const isLast30=historyTo===s().date&&historyFrom===B.addDays(s().date,-29);
  const isAll=historyFrom===(s().demoHistory?.from||B.addDays(s().date,-180))&&historyTo===s().date;
  const presets='<div class="report-presets checklist-presets">'+
   button('‹ Prev day','checklist-range','prev-day','','secondary')+
   button(isSingleDay&&historyFrom===s().date?'Selected date ('+s().date+')':'Selected date','checklist-range','day','aria-pressed="'+(isSingleDay&&historyFrom===s().date)+'"',isSingleDay&&historyFrom===s().date?'':'secondary')+
   button('Next day ›','checklist-range','next-day','','secondary')+
   button('Last 7 days','checklist-range','7','aria-pressed="'+isLast7+'"',isLast7?'':'secondary')+
   button('Last 30 days','checklist-range','30','aria-pressed="'+isLast30+'"',isLast30?'':'secondary')+
   button('All 6 months','checklist-range','all','aria-pressed="'+isAll+'"',isAll?'':'secondary')+
  '</div>';
  const filters='<div class="history-filters">'+
   input('historyFrom','From date',historyFrom,'date')+
   input('historyTo','Through date',historyTo,'date')+
   select('historyService','Service',[['','All services'],...s().setup.services.map(v=>[v.name,v.name])],historyService)+
   select('historyArea','Station',[['','All stations'],...s().setup.areas.map(v=>[v,v])],historyArea)+
   select('historyPerson','Completed or noted by',[['','Everyone'],...s().team.map(p=>[p.id,p.name+(p.active?'':' (former)')])],historyPerson)+
   select('historyFilter','Task filter',[['','All tasks'],['incomplete','Incomplete tasks'],['completed','Completed tasks'],['notes','Tasks with notes'],['important','Manager important notes']],historyFilter)+
  '</div>';
  const kpis=error?'':'<div class="report-stats checklist-kpis">'+
   '<div><small>Checklist completion</small><strong>'+(rows.length?Math.round(done/rows.length*100)+'%':'0%')+'</strong><small>'+done+' of '+rows.length+' tasks done</small></div>'+
   '<div><small>Incomplete tasks</small><strong>'+incompleteCount+'</strong><small>Across '+groups.length+' '+(groups.length===1?'service':'services')+'</small></div>'+
   '<div><small>Task notes left</small><strong>'+totalNotes+'</strong><small>'+importantNotes+' manager important</small></div>'+
   '<div><small>Completed by</small><strong>'+topPeople.length+' '+(topPeople.length===1?'person':'people')+'</strong><small>'+(topPeople.slice(0,2).map(p=>e(p.name.split(' ')[0])+' ('+p.count+')').join(', ')||'No completions in range')+'</small></div>'+
  '</div>';
  return '<div class="checklist-report"><div class="section-bar"><div><p class="eyebrow">MANAGER CHECKLIST REPORTING</p><h2>'+(isSingleDay?e(humanDate(historyFrom)):e(humanDate(historyFrom))+' – '+e(humanDate(historyTo)))+'</h2><p>Go back to any date or range to see how opening and closing checklists were completed, who completed each task, and every manager or crew note.</p></div><div class="toolbar">'+button('Download CSV','checklist-export','','','secondary')+button('Team & labor reports','app-screen','reports','','quiet')+'</div></div>'+presets+filters+kpis+'<p class="history-summary">'+(error?e(error):done+' of '+rows.length+' current tasks completed · '+groups.length+' '+(groups.length===1?'service':'services'))+'</p><p class="history-hint">Every completion records who checked the task off and when. Manager priority notes and crew handover/86 notes stay attached to that date’s shift. Times shown in Chicago time.</p>'+groups.slice(0,historyLimit).map((g,idx)=>{
   const gRows=g.rows.filter(t=>!t.removed),gDone=gRows.filter(t=>t.check).length;
   const contribText=(g.contributors||[]).map(c=>e(c.name)+' ('+c.count+')').join(', ')||'None recorded yet';
   const teamText=(g.team||[]).map(p=>e(p.name)+' ('+e(p.area)+')').join(', ')||'No shifts scheduled';
   const openAttr=(groups.length<=4||idx===0)?'open ':'';
   return '<details class="history-service" '+openAttr+'data-key="history-'+e(g.date+'-'+g.service)+'"><summary><div class="history-service-title"><strong>'+e(g.date)+' · '+e(g.service)+' <small>'+e(humanDate(g.date))+'</small></strong><small class="history-service-sub">Opening '+g.openingDone+'/'+g.openingTotal+' · Closing '+g.closingDone+'/'+g.closingTotal+(g.noteCount?' · '+g.noteCount+' note'+(g.noteCount===1?'':'s'):'')+(g.importantCount?' ('+g.importantCount+' important)':'')+'</small></div><span class="badge '+(gDone===gRows.length&&gRows.length?'':'orange')+'">'+gDone+'/'+gRows.length+' complete</span></summary><div class="history-shift-bar"><div><small><strong>Completed by:</strong> '+contribText+'</small><small><strong>Team on shift:</strong> '+teamText+'</small></div>'+button('Open this checklist','checklist-jump',g.date+'|'+g.service,'','secondary')+'</div><div class="table-scroll"><table><thead><tr><th>Task / station</th><th>Status / completed by</th><th>Notes & activity</th></tr></thead><tbody>'+g.rows.map(t=>'<tr><td><strong>'+e(t.title)+'</strong><small class="table-detail">'+e(t.area)+' · '+t.list+'</small></td><td>'+(t.removed?'<span class="badge gray">Removed from list</span>':t.check?'<strong>Completed by '+e(B.person(t.check.by)?.name||'Team member')+'</strong><small class="table-detail">'+e(B.person(t.check.by)?.role||'Team member')+' · '+stamp(t.check.at)+'</small>':'<span class="badge orange">Not completed</span>'+(t.assigned?.length?'<small class="table-detail">Assigned station crew: '+e(t.assigned.join(', '))+'</small>':''))+'</td><td><div class="report-task-notes">'+t.notes.map(noteCard).join('')+'</div><div class="report-note-actions">'+button(t.notes.length?'+ Add / view notes ('+t.notes.length+')':'+ Leave note','checklist-note',t.id,'data-date="'+e(g.date)+'" data-service="'+e(g.service)+'"','quiet')+(t.events.length?'<details><summary>Activity · '+t.events.length+'</summary><ol class="task-activity">'+t.events.map(x=>'<li>'+e(x.kind)+' · '+e(B.person(x.by)?.name||'Team member')+'<small>'+stamp(x.at)+(x.legacy?' · recorded completion':'')+'</small></li>').join('')+'</ol></details>':'<small>No recorded activity</small>')+'</div></td></tr>').join('')+'</tbody></table></div></details>';
  }).join('')+(!groups.length&&!error?'<div class="panel station-empty"><strong>No checklist records match these filters</strong><p>Try choosing another date range, clearing the station/person filter, or selecting “All 6 months”.</p></div>':'')+(groups.length>historyLimit?button('Show more services ('+(groups.length-historyLimit)+' remaining)','checklist-more','','','secondary'):'')+'</div>';
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
 function listContext(){
  const state=s(),k=state.role+'|'+B.actor(state.role,state.crewId,state.managerId)+'|'+state.date+'|'+state.service;
  const own=B.work.stations(state);
  if(k!==checklistKey||!state.setup.areas.includes(checklistArea)){checklistKey=k;checklistArea=own[0]||state.setup.areas[0];checklistPhase='Opening';checklistEditing=false;}
  return {area:checklistArea,list:checklistPhase,own,editable:manager()||own.includes(checklistArea)};
 }

 function lists(){
  const switcher=manager()?'<div class="checklist-mode">'+button('Shift tasks','checklist-view','tasks','aria-pressed="'+!historyMode+'"',historyMode?'secondary':'')+button('History & reports','checklist-view','history','aria-pressed="'+historyMode+'"',historyMode?'':'secondary')+'</div>':'';
  if(manager()&&historyMode)return switcher+historyPanel();
  const state=s(),c=listContext(),all=B.work.tasks(state),checks=state.checks[state.date+'|'+state.service]||{},rows=all.filter(t=>t.area===c.area&&t.list===c.list),done=rows.filter(t=>checks[t.id]).length;
  const allDone=all.filter(t=>checks[t.id]).length,allNotes=all.reduce((sum,t)=>sum+(B.work.notes?.(state,t.id)?.length||0),0);
  const teammates=[...new Set(state.shifts.filter(x=>x.date===state.date&&x.service===state.service&&x.area===c.area).map(x=>x.person))].map(id=>B.person(id)?.name).filter(Boolean);
  const stationTabs=state.setup.areas.map(area=>{const items=all.filter(t=>t.area===area),count=items.filter(t=>checks[t.id]).length;return button(area+' · '+count+'/'+items.length+(c.own.includes(area)&&!manager()?' · Yours':''),'checklist-area',area,'aria-pressed="'+(c.area===area)+'"',c.area===area?'':'secondary');}).join('');
  const phaseTabs=['Opening','Closing'].map(list=>{const items=all.filter(t=>t.area===c.area&&t.list===list),count=items.filter(t=>checks[t.id]).length;return button(list+' · '+count+'/'+items.length,'checklist-phase',list,'aria-pressed="'+(c.list===list)+'"',c.list===list?'':'secondary');}).join('');
  const row=t=>{
   const check=checks[t.id],notes=B.work.notes?.(state,t.id)||[],hasImportant=notes.some(n=>n.important);
   const noteBtnLabel=notes.length?(hasImportant?'! Notes · '+notes.length:'Notes · '+notes.length):'+ Add note';
   return '<div class="task-item-block '+(hasImportant&&!check?'has-important':'')+'"><div class="station-task '+(check?'done':'')+'"><label><input type="checkbox" data-task="'+e(t.id)+'" '+(check?'checked ':'')+(!c.editable?'disabled':'')+'><span><strong>'+e(t.title)+(hasImportant&&!check?' <span class="badge orange">Important today</span>':'')+'</strong>'+(check?'<small>Completed by '+e(B.person(check.by)?.name||'Team member')+' · '+stamp(check.at)+'</small>':'')+'</span></label><div class="task-row-actions">'+button(noteBtnLabel,'checklist-note',t.id,'',notes.length?'secondary':'quiet')+(manager()&&checklistEditing?button('Edit','edit',t.id,'data-collection="tasks"','quiet'):'')+'</div></div>'+(notes.length?'<div class="task-discussion">'+notes.map(noteCard).join('')+'</div>':'')+'</div>';
  };
  const incomplete=rows.filter(t=>!checks[t.id]),complete=rows.filter(t=>checks[t.id]);
  const openCompleted=incomplete.length===0||complete.some(t=>(B.work.notes?.(state,t.id)||[]).length>0);
  const managerDayBanner=manager()?'<div class="shift-report-banner"><div><strong>'+e(humanDate(state.date))+' · '+e(state.service)+'</strong><small>'+allDone+' of '+all.length+' tasks completed across all stations · '+allNotes+' task '+(allNotes===1?'note':'notes')+'</small></div>'+button('Inspect full day report ›','checklist-day-report','','','secondary')+'</div>':'';
  return switcher+'<div class="station-checklists"><div class="section-bar"><div><h2>'+(manager()?'Team checklists':'Your team’s checklist')+'</h2><p>'+(manager()?'Leave priority notes on any task, track live station progress, or inspect any past date.':'Check off tasks as you go and leave notes for your manager or teammates (like 86 items or stock updates).')+'</p></div>'+(manager()?button(checklistEditing?'Done editing':'Edit list','checklist-manage','','aria-pressed="'+checklistEditing+'"','secondary'):'')+'</div>'+managerDayBanner+'<nav class="station-switch" aria-label="Checklist station">'+stationTabs+'</nav><div class="station-list-heading"><div><h2>'+e(c.area)+'</h2><p>'+(teammates.length?'On '+e(c.area)+' this shift: '+e(teammates.join(', ')):'No crew assigned to this station')+'</p></div><span class="station-progress">'+done+'/'+rows.length+' done</span></div><div class="phase-switch" aria-label="Opening or closing">'+phaseTabs+'</div>'+(!c.editable?'<p class="station-readonly">Viewing another team’s list. Only its assigned crew and managers can check off tasks or leave notes here.</p>':'')+(manager()&&checklistEditing?'<div class="station-edit-tools">'+button('+ Add tasks','checklist-add','','','')+button('Clear this list','work-empty','','','quiet')+'<small>'+e(c.area)+' · '+c.list+' · '+e(state.date)+' · '+e(state.service)+'</small></div>':'')+'<section class="panel station-task-list"><div class="progress-track"><span style="width:'+(rows.length?done/rows.length*100:0)+'%"></span></div>'+(incomplete.map(row).join('')||'<div class="station-empty"><strong>'+(rows.length?'All done for '+c.list.toLowerCase()+'!':'No tasks yet')+'</strong><p>'+(rows.length?'Every '+c.list.toLowerCase()+' task for '+e(c.area)+' is complete. See who completed each task below.':manager()?'Choose Edit list to add tasks for this station.':'Your manager hasn’t added tasks to this list.')+'</p></div>')+(complete.length?'<details class="station-completed" '+(openCompleted?'open ':'')+'data-key="completed-'+e(c.area)+'-'+c.list+'"><summary>Completed · '+complete.length+'</summary>'+complete.map(row).join('')+'</details>':'')+'</section></div>';
 }

 function listHandle(a,id,data={}){
  if(a==='view'){
   historyMode=id==='history';
   if(historyMode){historyFrom=s().date;historyTo=s().date;historySyncedDate=s().date;}
   api.render();return;
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
   if(B.isDate(d)&&svc){api.focusShift?.(d,svc);historyMode=false;api.render();}
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
   api.openTasks(
    'Task notes · '+task.area,
    '<div class="task-dialog-meta"><strong>'+e(task.title)+'</strong><small>'+e(task.area)+' · '+e(task.list)+' · '+e(noteDate)+' · '+e(noteService)+'</small></div>'+
    '<div class="task-thread">'+(existing.map(noteCard).join('')||'<p class="task-thread-empty">No notes on this task yet. Leave an instruction or shift update below.</p>')+'</div>'+
    (writable
     ? chipHtml+
       textarea('body',manager()?'Leave a note for the crew':'Leave a note for your manager & team','','required maxlength="2000" '+placeholder)+
       (manager()?select('important','Priority',[['true','Important for today — highlight on checklist'],['false','Normal task note']],'true'):'')+
       input('stockItem','86 / unavailable item (optional)','','text','maxlength="100" placeholder="e.g. Miller Lite — automatically posts to 86 board"')+
       '<p class="stock-note-hint">'+(manager()?'Entering an item here also adds an approved 86 alert for this shift.':'If you couldn’t restock or complete something because an item is 86, enter it here (or write “86 Item” in your note) to send an 86 report for manager approval.')+'</p>'
     : '<p>Only this station’s assigned crew and managers can add notes.</p>'),
    {type:'checklist:note',task:id,date:noteDate,service:noteService,readOnly:!writable}
   );
   return;
  }
  if(a==='open'){historyMode=false;listContext();checklistPhase=['Opening','Closing'].includes(id)?id:'Opening';}
  if(a==='add'){const c=listContext();api.openTasks('Add '+c.area+' '+c.list.toLowerCase()+' tasks',textarea('titles','One task per line','','required')+'<p>'+e(c.area)+' · '+c.list+' · '+e(s().date)+' · '+e(s().service)+'</p>',c);return;}
  if(a==='area'){listContext();checklistArea=id;checklistEditing=false;}
  if(a==='phase'){listContext();checklistPhase=id;}
  if(a==='manage')checklistEditing=!checklistEditing;
  api.render();
 }
 return {onChange,lists,listContext,listHandle,render,preview,handle,submit:v=>({type:'private:send',id:crypto.randomUUID(),...v})};
};
