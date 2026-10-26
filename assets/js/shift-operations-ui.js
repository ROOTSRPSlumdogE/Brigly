/* Shared service context, configuration forms and factual manager reports. */
globalThis.createShiftOperationsUI=function(api){
  'use strict';
  const B=globalThis.Brigly,{e,button,badge,input,textarea,select,dateLabel}=api;
  const state=()=>api.state(),manager=()=>state().role==='manager',me=()=>B.actor(state().role,state().crewId,state().managerId);
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const hours=n=>(n/60).toLocaleString('en-US',{maximumFractionDigits:2});
  const name=id=>B.person(id)?.name||'Archived member';
  const tableLabel=t=>{const v=String(t||'').trim();return !v?'Unassigned':/^\d+$/.test(v)?'Table '+v:v;};
  const stationTone=area=>area==='Bar'?'tone-orange':area==='Kitchen'?'tone-slate':'tone-sage';
  const csvCell=x=>'"'+String(x??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';
  const downloadCSV=(filename,rows)=>{
    const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const stamp=iso=>iso?new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Chicago'}):'';
  let panel='briefing',form=null,reportTab='overview',reportPerson='alex',from='',to='',reportService='',reportArea='',reportStatus='',checklistFilter='',checklistPerson='',checklistLimit=14,teamFilter='active';
  const act=(text,action,id='',style='secondary',attrs='')=>button(text,'ops-'+action,id,attrs,style);
  const contextAttrs=(date,service)=>`data-date="${e(date)}" data-service="${e(service)}"`;
  const canWrite=(date,service)=>manager()||state().shifts.some(x=>x.person===me()&&x.date===date&&x.service===service);
  function open(title,fields,details){form=details;api.open(title,fields);}
  function noteCards(date,service){
    const notes=B.ops.context(state(),date,service).notes;
    return notes.map(n=>`<article class="shift-note-card ${n.priority==='manager'?'manager-note':''}"><div class="request-heading">${badge(n.priority==='manager'?'Manager priority':'Crew note',n.priority==='manager'?'orange':'gray')}<small>${e(name(n.author))}</small></div><p class="text-block">${e(n.body)}</p>${manager()||n.author===me()?`<div class="card-actions">${act('Edit note','note',n.id)}${act('Archive note','archive-note',n.id,'quiet')}</div>`:''}</article>`).join('')||'<p class="context-empty">No notes yet. Share what the team needs to know.</p>';
  }
  function alertCards(date,service){
    const alerts=B.ops.context(state(),date,service).alerts;
    const cards=rows=>rows.map(a=>`<article class="alert-item"><div class="request-heading"><strong>${e(a.name)}</strong>${badge(a.status,a.status==='Reported'?'orange':a.status==='Approved'?'red':'gray')}</div><p>${e(a.reason)}</p><small><span class="badge ${stationTone(a.area)}">${e(a.area)}</span> · ${e(name(a.author))}${a.reviewer?' · Reviewed by '+e(name(a.reviewer)):''}</small>${a.feedback?`<p class="request-feedback">${e(a.feedback)}</p>`:''}<div class="card-actions">${manager()&&a.status==='Reported'?act('Approve 86','approve-alert',a.id,'')+act('Decline report','decline-alert',a.id,'danger'):''}${manager()&&a.status==='Approved'?act('Mark available','restore-alert',a.id,'quiet'):''}${manager()&&['Restored','Declined'].includes(a.status)?act('Make unavailable','approve-alert',a.id):''}${manager()||(a.status==='Reported'&&a.author===me())?act('Edit item','alert',a.id):''}</div></article>`).join('');
    return `<div class="context-columns"><div><h3>Approved unavailable <span>${alerts.filter(x=>x.status==='Approved').length}</span></h3>${cards(alerts.filter(x=>x.status==='Approved'))||'<p class="context-empty">No approved 86 items.</p>'}</div><div><h3>Reported · awaiting manager <span>${alerts.filter(x=>x.status==='Reported').length}</span></h3><p class="context-hint">Unconfirmed reports. Check with the manager before advising guests.</p>${cards(alerts.filter(x=>x.status==='Reported'))||'<p class="context-empty">No reports waiting.</p>'}</div></div>${alerts.some(x=>['Restored','Declined'].includes(x.status))?`<details class="request-history" open><summary>Resolved items</summary>${cards(alerts.filter(x=>['Restored','Declined'].includes(x.status)))}</details>`:''}`;
  }
  function reservations(date,service){
    const all=B.ops.context(state(),date,service).reservations,active=all.filter(x=>!['Cancelled','No-show'].includes(x.status));
    return `<div class="reservation-summary"><strong>${active.length} bookings · ${active.reduce((n,x)=>n+x.guests,0)} guests</strong><span>${active.filter(x=>x.status==='Seated').length} seated · ${active.filter(x=>x.status==='Confirmed').length} expected</span></div>${all.length?`<div class="table-scroll"><table><thead><tr><th>ARRIVAL</th><th>GUEST / NOTES</th><th>PARTY</th><th>TABLE</th><th>STATUS / ACTIONS</th></tr></thead><tbody>${all.map(r=>`<tr><td><strong>${e(r.time)}</strong></td><td><strong>${e(r.name)}</strong><small class="table-detail">${e(r.note)}</small></td><td>${r.guests} guests</td><td><span class="badge ${r.table?'tone-slate':'tone-amber'}">${e(tableLabel(r.table))}</span></td><td>${badge(r.status,['Cancelled','No-show'].includes(r.status)?'gray':r.status==='Confirmed'?'orange':'')}<div class="row-actions">${r.status==='Confirmed'?button('Seat','reservation-status',r.id,'data-status="Seated"','quiet'):r.status==='Seated'?button('Complete','reservation-status',r.id,'data-status="Completed"','quiet'):''}${button('Edit reservation','edit',r.id,'data-collection="reservations"')}</div></td></tr>`).join('')}</tbody></table></div>`:'<p class="context-empty">No reservations for this service.</p>'}${act('+ Reservation','context-create','reservations','secondary',contextAttrs(date,service))}`;
  }
  function onboardingCards(date,service){
    const s=state(),ctx=B.ops.context(s,date,service),attrs=contextAttrs(date,service),write=canWrite(date,service);
    const briefings=s.briefings.filter(x=>x.date===date&&x.service===service);
    const team=s.shifts.filter(x=>x.date===date&&x.service===service);
    const shiftPeople=[...new Set(team.map(x=>x.person))];
    const activeSpecials=s.specials.filter(x=>x.date===date&&x.service===service&&x.active);
    const approved86=ctx.alerts.filter(x=>x.status==='Approved');
    if(!briefings.length){
      return `<div class="onboarding-empty-card"><p class="context-empty">No onboarding posted for ${e(service)} on ${e(date)} yet.</p>${write?act('+ Post service onboarding','context-create','briefings','',attrs):''}</div>`;
    }
    return briefings.map(x=>{
      const allTracked=[...new Set([...shiftPeople,...x.acks])];
      const ackedIds=allTracked.filter(id=>x.acks.includes(id));
      const pendingIds=shiftPeople.filter(id=>!x.acks.includes(id));
      const ackedByMe=x.acks.includes(me());
      const confirmBox=!ackedByMe
        ?`<div class="onboarding-confirm-bar is-pending"><div class="onboarding-confirm-text"><strong>Please confirm you have read this shift briefing</strong><span>Includes today’s service plan, ${activeSpecials.length} ${activeSpecials.length===1?'special':'specials'}, and ${approved86.length} confirmed 86 ${approved86.length===1?'item':'items'}. Your manager sees who confirms.</span></div>${`<button type="button" class="button onboarding-ack-cta" data-action="ack" data-id="${e(x.id)}">✓ I’ve read this briefing</button>`}</div>`
        :`<div class="onboarding-confirm-bar is-confirmed"><div class="onboarding-confirm-text"><strong>✓ Read & confirmed by ${e(name(me()))}</strong><span>Acknowledged revision ${x.revision} · Recorded on the shift roster below</span></div>${badge('Acknowledged','tone-sage')}</div>`;
      const tracker=allTracked.length?`<div class="onboarding-read-tracker"><div class="onboarding-tracker-head"><strong>Team read confirmations (${ackedIds.length} of ${allTracked.length} confirmed)</strong><span>${pendingIds.length?pendingIds.length+' crew still need to press “I’ve read this”':'All scheduled crew have confirmed reading!'}</span></div><div class="onboarding-ack-grid">${allTracked.map(id=>{const p=B.person(id),isAcked=x.acks.includes(id),st=team.find(sh=>sh.person===id)?.area||p?.area||'';return `<div class="ack-member-chip ${isAcked?'acked':'pending'}"><span class="ack-avatar">${e(p?.initials||'TM')}</span><div class="ack-meta"><strong>${e(name(id))}</strong><small>${e(st)} · ${isAcked?'✓ Pressed “I’ve read this”':'Awaiting confirmation'}</small></div><span class="ack-state-pill">${isAcked?'✓ Read':'Pending'}</span></div>`;}).join('')}</div></div>`:'';
      return `<article class="onboarding-spotlight ${!ackedByMe?'needs-ack':'is-acked'}"><div class="onboarding-head"><div><p class="eyebrow">SHIFT BRIEFING & ONBOARDING · REV ${x.revision}</p><h3>${e(x.title)}</h3><small class="onboarding-byline">Posted by ${e(name(x.author))} · ${ackedIds.length} acknowledged</small></div><div class="onboarding-head-right">${badge(pendingIds.length?`${ackedIds.length}/${allTracked.length||1} confirmed`:'All confirmed',pendingIds.length?'orange':'')}${manager()||x.author===me()?button('Edit onboarding','edit',x.id,'data-collection="briefings"'):''}</div></div><p class="onboarding-body">${e(x.body)}</p>${confirmBox}${tracker}</article>`;
    }).join('');
  }
  function hub(date=state().date,service=state().service,compact=false,focus='all'){
    const attrs=contextAttrs(date,service),write=canWrite(date,service);
    let content=`<div class="shift-context"><div class="context-heading"><div><p class="eyebrow">SERVICE ESSENTIALS & ONBOARDING</p><h2>${e(service)} · ${dateLabel(date,{month:'short',day:'numeric',year:'numeric'})}</h2></div><div class="toolbar">${write?act('+ Onboarding','context-create','briefings','secondary',attrs)+act('+ Shift note','note','','',attrs)+act(manager()?'+ Add approved 86':'+ Report 86','alert','','secondary',attrs):''}${manager()?act('Briefing reports ›','report-tab','specials','quiet'):''}</div></div><section class="context-section"><h3>Service onboarding</h3>${onboardingCards(date,service)}</section><section class="context-section"><h3>Shift notes</h3>${noteCards(date,service)}</section><section class="context-section"><h3>Menu availability</h3>${alertCards(date,service)}</section><section class="context-section"><h3>Specials</h3>${manager()?act('+ Special','context-create','specials','secondary',attrs):''}<div class="special-digest-list">${state().specials.filter(x=>x.date===date&&x.service===service&&x.active).map(x=>'<article class="special-digest-card"><div class="special-digest-top"><strong>'+e(x.name)+'</strong><span class="special-price-pill">'+money(x.price)+'</span></div><p>'+e(x.description)+'</p><div class="special-allergen-pill"><strong>Allergens & prep:</strong> <span>'+e(x.allergens)+'</span></div>'+(manager()?'<div class="card-actions" style="margin-top:8px">'+button('Edit special','edit',x.id,'data-collection="specials"')+'</div>':'')+'</article>').join('')||'<p class="context-empty">No specials for this service.</p>'}</div></section><section class="context-section"><h3>Reservations for this service</h3>${reservations(date,service)}</section></div>`;
    if(focus==='briefing')content=content.replace(/<section class="context-section"><h3>(Menu availability|Specials|Reservations for this service)<\/h3>[\s\S]*?<\/section>/g,'');
    if(!compact||manager())return content;
    return content.replace(/<div class="toolbar">[\s\S]*?<\/div><\/div><section/, '<\/div><section');
  }
  function teamSetup(){
    const s=state();
    return `<div class="setup-section"><div class="section-bar"><div><h2>Your team</h2><p>Role titles and manager access are separate. Joining and leaving dates preserve each person’s history and control roster eligibility.</p></div>${act('+ Add teammate','member','','')}</div><div class="report-presets">${[['active','Current team'],['former','Former team'],['all','Everyone']].map(([id,label])=>act(label,'team-filter',id,teamFilter===id?'':'secondary',`aria-pressed="${teamFilter===id}"`)).join('')}</div><div class="table-scroll"><table><thead><tr><th>NAME</th><th>ROLE / STATION</th><th>ACCESS</th><th>STATUS</th><th></th></tr></thead><tbody>${s.team.filter(p=>teamFilter==='all'||(teamFilter==='active'?p.active:!p.active)).map(p=>`<tr><td><strong>${e(p.name)}</strong><small class="table-detail">Joined ${e(p.joinedOn||'Not recorded')}${p.leftOn?' · Left '+e(p.leftOn):''}</small></td><td>${e(p.role)}<small class="table-detail">${e(p.area)}</small></td><td>${e(p.access)}</td><td>${badge(p.active?'Active':'Archived',p.active?'':'gray')}</td><td>${act('Edit profile','member',p.id)}${act('View statistics','member-report',p.id)}</td></tr>`).join('')}</tbody></table></div></div><div class="setup-section"><div class="section-bar"><div><h2>Services & default shift times</h2><p>New assignments inherit these times and breaks. Existing shifts can be edited individually.</p></div>${act('+ Add service','service','','')}</div><div class="setup-cards">${s.setup.services.map(v=>`<article><h3>${e(v.name)}</h3><p>${v.start} – ${v.end} · ${v.breakMinutes} min unpaid break</p>${badge(v.active?'Active':'Archived',v.active?'':'gray')}${act('Edit service','service',v.id)}</article>`).join('')}</div></div><div class="context-columns setup-section">${[['roles','Team roles'],['areas','Stations']].map(([key,title])=>`<section><div class="section-bar"><h2>${title}</h2>${act('+ Add','catalog','','secondary',`data-catalog="${key}"`)}</div>${s.setup[key].map(item=>`<div class="mini-row"><strong>${e(item)}</strong><div class="row-actions">${act('Rename','catalog',item,'secondary',`data-catalog="${key}"`)}${act('Remove','remove-catalog',item,'quiet',`data-catalog="${key}"`)}</div></div>`).join('')}</section>`).join('')}</div>`;
  }

  function computeAnalytics(s){
    const inRange=d=>d>=from&&d<=to;
    const matchSvc=x=>!reportService||x.service===reportService;
    const matchArea=x=>!reportArea||x.area===reportArea;
    const shifts=s.shifts.filter(x=>inRange(x.date)&&matchSvc(x)&&matchArea(x));
    const memberRows=s.team.map(p=>{
      const mr=B.ops.report(s,p.id,from,to,'manager');
      const filteredRows=mr.rows.filter(r=>(!reportService||r.service===reportService)&&(!reportArea||r.station===reportArea));
      const completedTasks=Object.entries(s.checks||{}).reduce((cnt,[k,obj])=>{
        const d=k.slice(0,10),svc=k.slice(11);
        if(!inRange(d)||(reportService&&svc!==reportService))return cnt;
        return cnt+Object.values(obj||{}).filter(c=>c.by===p.id).length;
      },0);
      return {person:p,report:mr,filteredRows,completedTasks};
    });
    const totalWageCost=B.schedule.round(memberRows.reduce((sum,m)=>sum+m.report.wageCost,0));
    const totalTips=B.schedule.round(memberRows.reduce((sum,m)=>sum+m.report.tips,0));
    const totalWorkMins=memberRows.reduce((sum,m)=>sum+m.report.expectedMinutes,0);
    const totalScheduledMins=memberRows.reduce((sum,m)=>sum+m.report.scheduledMinutes,0);
    const totalSick=memberRows.reduce((sum,m)=>sum+m.report.sickShifts,0);
    const totalLate=memberRows.reduce((sum,m)=>sum+m.report.lateShifts,0);
    const totalLateMins=memberRows.reduce((sum,m)=>sum+m.report.lateMinutes,0);

    const reservations=s.reservations.filter(x=>inRange(x.date)&&matchSvc(x)).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
    const activeRes=reservations.filter(r=>!['Cancelled','No-show'].includes(r.status));
    const totalCovers=activeRes.reduce((n,r)=>n+r.guests,0);
    const seatedOrDoneRes=reservations.filter(r=>['Seated','Completed'].includes(r.status));
    const closedRes=reservations.filter(r=>['Cancelled','No-show'].includes(r.status));

    const alerts=s.unavailable.filter(x=>inRange(x.date)&&matchSvc(x)&&matchArea(x)).sort((a,b)=>b.date.localeCompare(a.date));
    const specials=s.specials.filter(x=>inRange(x.date)&&matchSvc(x)).sort((a,b)=>b.date.localeCompare(a.date));
    const briefings=s.briefings.filter(x=>inRange(x.date)&&matchSvc(x)).sort((a,b)=>b.date.localeCompare(a.date));
    const shiftNotes=s.shiftNotes.filter(x=>inRange(x.date)&&matchSvc(x)&&!x.archived).sort((a,b)=>b.date.localeCompare(a.date));
    const orderDate=o=>(o.receivedAt||o.orderedAt||o.at||'').slice(0,10);
    const orders=s.orders.filter(x=>matchArea(x)&&(!orderDate(x)||inRange(orderDate(x))));

    let allChecklistGroups=[],checklistGroups=[];
    try{
      if(B.work?.history){
        allChecklistGroups=B.work.history(s,from,to,reportService,reportArea,{});
        checklistGroups=(checklistPerson||checklistFilter)?B.work.history(s,from,to,reportService,reportArea,{person:checklistPerson,filter:checklistFilter}):allChecklistGroups;
      }
    }catch{}
    const checklistRows=allChecklistGroups.flatMap(g=>g.rows).filter(t=>!t.removed);
    const checklistDone=checklistRows.filter(t=>t.check).length;
    const checklistNotes=allChecklistGroups.reduce((sum,g)=>sum+g.noteCount,0);
    const checklistImportant=allChecklistGroups.reduce((sum,g)=>sum+g.importantCount,0);

    let briefExpected=0,briefAcked=0;
    const briefRows=briefings.map(b=>{
      const shiftCrew=[...new Set(s.shifts.filter(x=>x.date===b.date&&x.service===b.service).map(x=>x.person))];
      const tracked=[...new Set([...shiftCrew,...b.acks])];
      const acked=tracked.filter(id=>b.acks.includes(id));
      const pending=shiftCrew.filter(id=>!b.acks.includes(id));
      briefExpected+=tracked.length||1;
      briefAcked+=acked.length;
      return {briefing:b,tracked,acked,pending};
    });

    // Summarized orders by item + unit + area
    const orderGroupsMap=new Map();
    for(const o of orders){
      const key=o.item||`${o.name.toLowerCase().trim()}|${o.unit.toLowerCase().trim()}|${o.area}`;
      if(!orderGroupsMap.has(key))orderGroupsMap.set(key,{name:o.name,unit:o.unit,area:o.area,vendor:s.stock?.vendors.find(v=>v.id===o.vendor)?.name||'No vendor',category:s.stock?.items.find(i=>i.id===o.item)?.category||'Other',totalQty:0,requestedQty:0,approvedQty:0,orderedQty:0,receivedQty:0,declinedQty:0,spend:0,shortQty:0,count:0,authors:new Set(),items:[]});
      const g=orderGroupsMap.get(key);
      g.totalQty+=o.quantity;g.count++;g.authors.add(name(o.author));g.items.push(o);
      if(o.status==='Requested')g.requestedQty+=o.quantity;
      else if(o.status==='Approved')g.approvedQty+=o.quantity;
      else if(o.status==='Ordered')g.orderedQty+=o.quantity;
      else if(o.status==='Received'){g.receivedQty+=o.receivedQty??o.quantity;g.spend+=(o.receivedQty??o.quantity)*(o.cost||0);g.shortQty+=Math.max(0,o.quantity-(o.receivedQty??o.quantity));}
      else if(['Declined','Cancelled'].includes(o.status))g.declinedQty+=o.quantity;
    }
    const orderSummaries=[...orderGroupsMap.values()].sort((a,b)=>b.requestedQty-a.requestedQty||b.spend-a.spend||b.totalQty-a.totalQty);

    // Top recurring 86 items
    const item86Map=new Map();
    for(const a of alerts){
      const key=a.name.toLowerCase().trim();
      if(!item86Map.has(key))item86Map.set(key,{name:a.name,area:a.area,count:0,approved:0,restored:0,reported:0,latestReason:a.reason,latestDate:a.date});
      const g=item86Map.get(key);g.count++;
      if(a.status==='Approved')g.approved++;else if(a.status==='Restored')g.restored++;else if(a.status==='Reported')g.reported++;
      if(a.date>=g.latestDate){g.latestDate=a.date;g.latestReason=a.reason;}
    }
    const top86=[...item86Map.values()].sort((a,b)=>b.count-a.count);

    // Featured specials summary
    const specialMap=new Map();
    for(const sp of specials){
      const key=sp.name.toLowerCase().trim();
      if(!specialMap.has(key))specialMap.set(key,{name:sp.name,price:sp.price,allergens:sp.allergens,description:sp.description,count:0,activeCount:0,latestDate:sp.date});
      const g=specialMap.get(key);g.count++;if(sp.active)g.activeCount++;
      if(sp.date>=g.latestDate){g.latestDate=sp.date;g.price=sp.price;}
    }
    const topSpecials=[...specialMap.values()].sort((a,b)=>b.count-a.count);

    return {shifts,memberRows,totalWageCost,totalTips,totalWorkMins,totalScheduledMins,totalSick,totalLate,totalLateMins,reservations,activeRes,totalCovers,seatedOrDoneRes,closedRes,alerts,top86,specials,topSpecials,briefings,briefRows,briefExpected,briefAcked,shiftNotes,orders,orderSummaries,checklistGroups,allChecklistGroups,checklistRows,checklistDone,checklistNotes,checklistImportant};
  }

  function reports(){
    const s=state();from||=s.demoHistory?.from||s.date.slice(0,7)+'-01';to||=s.demoHistory?.to||s.date;
    if(!s.team.some(p=>p.id===reportPerson))reportPerson=s.team[0].id;
    const isToday=from===s.date&&to===s.date;
    const is7=to===s.date&&from===B.addDays(s.date,-6);
    const isMonth=from===(s.demoHistory?.to||s.date).slice(0,7)+'-01'&&to===(s.demoHistory?.to||s.date);
    const is30=to===(s.demoHistory?.to||s.date)&&from===B.addDays(to,-29);
    const isSix=from===(s.demoHistory?.from||B.addDays(s.date,-182))&&to===(s.demoHistory?.to||s.date);
    const activePresetLabel=isToday?'Selected day':is7?'Last 7 days':isMonth?'This month':is30?'Last 30 days':isSix?'All 6 months':'Custom range';
    const presets=`<div class="report-presets">${[['today','Selected day',isToday],['7','Last 7 days',is7],['month','This month',isMonth],['30','Last 30 days',is30],['six','All 6 months',isSix]].map(([id,label,active])=>act(label,'report-range',id,active?'':'secondary',`aria-pressed="${active}" class="report-preset-chip ${active?'active':''}"`)).join('')}</div>`;
    const tabSpecificFilters=reportTab==='checklists'
      ?`${select('checklistFilter','Task filter',[['','All tasks'],['incomplete','Incomplete tasks'],['completed','Completed tasks'],['notes','Tasks with notes'],['important','Manager priority notes']],checklistFilter)}${select('checklistPerson','Completed by',[['','Everyone on team'],...s.team.map(p=>[p.id,p.name+(p.active?'':' (former)')])],checklistPerson)}`
      :reportTab==='reservations'
        ?`${select('reportStatus','Reservation status',[['','All statuses'],['Confirmed','Confirmed'],['Seated','Seated'],['Completed','Completed'],['closed','Cancelled / No-show']],reportStatus)}`
        :'';
    const globalFilters=`<div class="report-filters report-global-filters">${input('reportFrom','From date',from,'date','required')}${input('reportTo','Through date',to,'date','required')}${select('reportService','Service',[['','All services'],...s.setup.services.map(v=>[v.name,v.name])],reportService)}${select('reportArea','Station',[['','All stations'],...s.setup.areas.map(v=>[v,v])],reportArea)}${tabSpecificFilters}<button type="button" class="button report-csv-btn" data-action="ops-export-report"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span>Download CSV</span></button></div>`;
    if(!B.isDate(from)||!B.isDate(to)||from>to)return presets+globalFilters+'<p class="form-error">Choose a valid report date range.</p>';

    const A=computeAnalytics(s);
    const checklistPct=A.checklistRows.length?Math.round(A.checklistDone/A.checklistRows.length*100):0;
    const briefPct=A.briefExpected?Math.round(A.briefAcked/A.briefExpected*100):100;
    const tabIcons={
      chart:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M18 17l-5-5-4 4-4-5"/></svg>`,
      users:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      checklists:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
      orders:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      reservations:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      'eighty-six':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
      specials:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
    };
    const tabs=[
      ['overview','Executive overview',`${A.shifts.length} shifts`,'slate','chart'],
      ['members','Team & labor',money(A.totalWageCost),'sage','users'],
      ['checklists','Checklists & notes',`${checklistPct}%`,'orange','checklists'],
      ['orders','Purchasing',money(A.orders.filter(o=>o.status==='Received').reduce((n,o)=>n+(o.receivedQty??o.quantity)*(o.cost||0),0)),'amber','orders'],
      ['reservations','Reservations & covers',`${A.totalCovers} guests`,'slate','reservations'],
      ['eighty-six','86 & stockouts',`${A.alerts.length} logs`,'danger','eighty-six'],
      ['specials','Specials & briefings',`${A.specials.length} specials`,'amber','specials']
    ];
    const hubNav=`<div class="report-hub-nav" role="tablist" aria-label="Manager report categories">${tabs.map(([id,label,meta,tone,iconKey])=>`<button type="button" class="report-hub-tab ${reportTab===id?'selected':''}" data-tone="${tone}" data-action="ops-report-tab" data-id="${id}" aria-pressed="${reportTab===id}"><span class="report-tab-icon">${tabIcons[iconKey]||''}</span><div class="report-tab-text"><strong>${e(label)}</strong><span class="report-tab-pill">${e(meta)}</span></div></button>`).join('')}</div>`;

    let body='';
    if(reportTab==='overview'){
      const kpis=[
        ['Total covers & bookings',`${A.totalCovers.toLocaleString('en-US')} guests`,`${A.activeRes.length} active bookings · ${A.closedRes.length} cancelled/no-show`,'reservations','slate'],
        ['Estimated labor expense',money(A.totalWageCost),`${hours(A.totalWorkMins)} expected hrs · ${money(A.totalTips)} crew tips (separate)`,'members','sage'],
        ['Checklist completion',`${checklistPct}%`,`${A.checklistDone}/${A.checklistRows.length} tasks · ${A.checklistNotes} notes (${A.checklistImportant} priority)`,'checklists','sage'],
        ['Briefing read rate',`${briefPct}%`,`${A.briefAcked}/${A.briefExpected} crew read confirmations · ${A.shiftNotes.length} shift notes`,'specials','amber'],
        ['86 & stockout incidents',`${A.alerts.length} records`,`${A.alerts.filter(x=>x.status==='Approved').length} active 86 · ${A.alerts.filter(x=>x.status==='Restored').length} restored`,'eighty-six','danger'],
        ['Specials featured',`${A.specials.filter(x=>x.active).length} active`,`${A.topSpecials.length} distinct dishes/drinks · avg ${A.specials.length?money(A.specials.reduce((n,x)=>n+x.price,0)/A.specials.length):'$0.00'}`,'specials','amber'],
        ['Purchasing queue',`${A.orders.filter(x=>x.status==='Requested').length} awaiting review`,`${A.orderSummaries.length} distinct items · ${A.orders.filter(x=>x.status==='Received').length} received`,'orders','orange'],
        ['Attendance & reliability',`${A.totalSick} sick · ${A.totalLate} late`,`${A.totalLateMins} total late mins across ${A.shifts.length} shifts`,'members','slate']
      ];
      const kpiGrid=`<div class="report-exec-kpis">${kpis.map(([title,val,sub,target,tone])=>`<article class="report-exec-card" data-tone="${tone}"><div class="report-exec-top"><small>${e(title.toUpperCase())}</small><button type="button" class="report-drill-link" data-action="ops-report-tab" data-id="${target}">Open report ›</button></div><strong>${e(val)}</strong><p>${e(sub)}</p></article>`).join('')}</div>`;

      // Service breakdown
      const svcSummary=s.setup.services.map(svc=>{
        const svcShifts=A.shifts.filter(x=>x.service===svc.name);
        const svcRes=A.activeRes.filter(x=>x.service===svc.name);
        const svc86=A.alerts.filter(x=>x.service===svc.name);
        const svcSpec=A.specials.filter(x=>x.service===svc.name&&x.active);
        return `<tr><td><strong>${e(svc.name)}</strong><small class="table-detail">${svc.start}–${svc.end}</small></td><td>${svcShifts.length} shifts</td><td><strong>${svcRes.reduce((n,r)=>n+r.guests,0)} guests</strong><small class="table-detail">${svcRes.length} bookings</small></td><td>${svcSpec.length} specials</td><td>${svc86.length} 86 logs</td></tr>`;
      }).join('');

      const orderPreview=A.orderSummaries.slice(0,5).map(g=>`<div class="report-mini-row"><div><strong>${e(g.name)}</strong><small><span class="badge ${stationTone(g.area)}">${e(g.area)}</span> · ${e(g.vendor||'')}</small></div><div class="report-mini-right"><strong>${g.totalQty} ${e(g.unit)}</strong><small>${g.requestedQty?g.requestedQty+' pending review':g.receivedQty?'Received':'In progress'}</small></div></div>`).join('')||'<p class="context-empty">No supply orders in this filter.</p>';
      const top86Preview=A.top86.slice(0,5).map(g=>`<div class="report-mini-row"><div><strong>${e(g.name)}</strong><small><span class="badge ${stationTone(g.area)}">${e(g.area)}</span> · ${e(g.latestReason)}</small></div><div class="report-mini-right"><span class="badge tone-danger">${g.count}× 86’d</span></div></div>`).join('')||'<p class="context-empty">No 86 records in this range.</p>';
      const topSpecialsPreview=A.topSpecials.slice(0,5).map(g=>`<div class="report-mini-row"><div><strong>${e(g.name)}</strong><small>${e(g.allergens)}</small></div><div class="report-mini-right"><strong>${money(g.price)}</strong><small>${g.count} services</small></div></div>`).join('')||'<p class="context-empty">No specials in this range.</p>';
      const topMembersPreview=A.memberRows.filter(m=>m.report.shiftCount>0).sort((a,b)=>b.report.wageCost-a.report.wageCost).slice(0,5).map(m=>`<div class="report-mini-row"><div><strong>${e(m.person.name)}</strong><small>${e(m.person.role)} · ${e(m.person.area)} · ${m.completedTasks} checklist tasks done</small></div><div class="report-mini-right"><strong>${money(m.report.wageCost)}</strong><small>${m.report.shiftCount} shifts · ${hours(m.report.expectedMinutes)} hrs</small></div></div>`).join('');

      body=`${kpiGrid}<div class="report-overview-grid"><section class="panel report-module-card"><div class="panel-head"><div><h3>Team & member labor summary</h3><p>Wage expense, hours, and checklist tasks by team member</p></div>${act('Full member reports ›','report-tab','members','secondary')}</div>${topMembersPreview}</section><section class="panel report-module-card"><div class="panel-head"><div><h3>Purchasing by item</h3><p>Consolidated quantities by stock item and vendor</p></div>${act('Purchasing report ›','report-tab','orders','secondary')}</div>${orderPreview}</section><section class="panel report-module-card"><div class="panel-head"><div><h3>Top recurring 86 items</h3><p>Most frequent menu stockouts across services</p></div>${act('Full 86 report ›','report-tab','eighty-six','secondary')}</div>${top86Preview}</section><section class="panel report-module-card"><div class="panel-head"><div><h3>Featured specials & pricing</h3><p>Top dishes and drinks run in selected period</p></div>${act('Specials & briefings report ›','report-tab','specials','secondary')}</div>${topSpecialsPreview}</section></div><section class="panel" style="margin-top:18px"><div class="panel-head"><div><h3>Service-by-service comparison</h3><p>${e(from)} through ${e(to)}</p></div>${act('Reservations report ›','report-tab','reservations','secondary')}</div><div class="table-scroll"><table><thead><tr><th>SERVICE</th><th>SCHEDULED SHIFTS</th><th>COVERS / BOOKINGS</th><th>SPECIALS RUN</th><th>86 INCIDENTS</th></tr></thead><tbody>${svcSummary}</tbody></table></div></section>`;
    }else if(reportTab==='members'){
      const r=B.ops.report(s,reportPerson,from,to),person=s.team.find(x=>x.id===reportPerson);
      const months=Object.values(r.rows.reduce((out,x)=>{const key=x.date.slice(0,7);out[key]||={date:key+'-01',cost:0,count:0};out[key].cost+=x.wageCost;out[key].count++;return out;},{})).sort((a,b)=>a.date.localeCompare(b.date));
      const maxCost=Math.max(1,...months.map(m=>m.cost));
      const trend='<div class="report-trend"><h3>Monthly wage expense · '+e(person.name)+'</h3>'+months.map(m=>'<div class="trend-row"><span>'+dateLabel(m.date,{month:'short',year:'2-digit'})+'</span><div><i style="width:'+Math.max(2,m.cost/maxCost*100)+'%"></i></div><strong>'+money(m.cost)+'</strong><small>'+m.count+' shifts</small></div>').join('')+'</div>';
      const stats=[['Scheduled shifts',r.shiftCount],['Roster hours',hours(r.scheduledMinutes)],['Expected work hours',hours(r.expectedMinutes)],['Estimated wage cost',money(r.wageCost)],['Paid absence hours',hours(r.paidAbsenceMinutes)],['Unpaid absence hours',hours(r.unpaidAbsenceMinutes)],['Sickness shifts',r.sickShifts],['Time-off shifts',r.timeOffShifts],['Late shifts',r.lateShifts],['Confirmed late shifts',r.confirmedLateShifts],['Late minutes',r.lateMinutes],['Pending reviews',r.pendingRequests]];
      const allTeamTable=`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>All team members comparison</h3><p>Select any team member below to inspect their shift-by-shift labor and attendance audit.</p></div></div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>SHIFTS</th><th>EXPECTED HRS</th><th>ABSENCES / LATE</th><th>TASKS DONE</th><th>REPORTED TIPS</th><th>EST. WAGE COST</th><th></th></tr></thead><tbody>${A.memberRows.map(m=>`<tr class="${m.person.id===reportPerson?'selected-row':''}"><td><strong>${e(m.person.name)}</strong><small class="table-detail">${e(m.person.role)} · ${e(m.person.area)}${m.person.active?'':' · Former'}</small></td><td>${m.report.shiftCount}</td><td>${hours(m.report.expectedMinutes)} hrs</td><td>${m.report.sickShifts+m.report.timeOffShifts} abs · ${m.report.lateShifts} late</td><td>${m.completedTasks} tasks</td><td>${money(m.report.tips)}</td><td><strong>${money(m.report.wageCost)}</strong></td><td>${act(m.person.id===reportPerson?'Viewing':'Inspect ›','select-report-person',m.person.id,m.person.id===reportPerson?'':'secondary')}</td></tr>`).join('')}</tbody></table></div></section>`;
      body=`${allTeamTable}<div class="report-member-detail"><div class="report-heading"><div><p class="eyebrow">AUTOMATIC SHIFT REPORT · INDIVIDUAL MEMBER</p><h2>${e(person.name)}</h2><p>${e(person.role)} · ${e(person.area)} · ${person.active?'Current team':'Former team'} · Joined ${e(person.joinedOn||'Not recorded')}${person.leftOn?' · Left '+e(person.leftOn):''}</p></div><div class="report-person-picker">${select('reportPerson','Inspect team member',s.team.map(p=>[p.id,p.name+(p.active?'':' (archived)')]),reportPerson)}</div></div><div class="notice">Calculated from the current records in your selected date range. Hours and cost are estimates, not clocked work or finalized payroll. No attendance report means “not recorded,” not “on time.”</div><div class="report-stats">${stats.map(([k,v])=>`<div><small>${k}</small><strong>${v}</strong></div>`).join('')}</div><div class="report-secondary"><span>Reported crew tips <strong>${money(r.tips)}</strong> · separate from employer wage cost</span><span>${r.approvedSwaps} approved swap requests · ${r.notes} shift notes · ${r.reported86} 86 reports</span></div>${trend}<details class="report-records" open><summary>Per-shift records · ${r.rows.length} shifts</summary><div class="table-scroll"><table><thead><tr><th>DATE / SERVICE</th><th>HOURS · ROSTER / EXPECTED</th><th>ABSENCE · PAID / UNPAID</th><th>ATTENDANCE</th><th>REVIEW</th><th>WAGE COST</th></tr></thead><tbody>${r.rows.map(x=>`<tr><td><strong>${e(x.date)} · ${e(x.service)}</strong><small class="table-detail">${x.start}–${x.end} · ${e(x.station)}</small></td><td>${hours(x.scheduledMinutes)} / ${hours(x.expectedMinutes)}</td><td>${hours(x.paidAbsenceMinutes)} / ${hours(x.unpaidAbsenceMinutes)}</td><td>${e(x.attendance)}${x.lateMinutes?' · '+x.lateMinutes+' min':''}</td><td>${badge(x.review,x.review==='Reported'?'orange':'gray')}</td><td>${money(x.wageCost)}</td></tr>`).join('')||'<tr><td colspan="6">No shifts in this date range.</td></tr>'}</tbody></table></div></details></div>`;
    }else if(reportTab==='orders'){
      const received=A.orders.filter(o=>o.status==='Received'),spendOf=o=>(o.receivedQty??o.quantity)*(o.cost||0),spend=received.reduce((n,o)=>n+spendOf(o),0);
      const pos=new Set(received.map(o=>o.po||o.id)),shortLines=received.filter(o=>(o.receivedQty??o.quantity)<o.quantity);
      const open=A.orders.filter(o=>['Requested','Approved','Ordered'].includes(o.status));
      const roll=key=>[...received.reduce((m,o)=>{const k=key(o),g=m.get(k)||{name:k,spend:0,lines:0,pos:new Set(),short:0};g.spend+=spendOf(o);g.lines++;g.pos.add(o.po||o.id);if((o.receivedQty??o.quantity)<o.quantity)g.short++;return m.set(k,g);},new Map()).values()].sort((a,b)=>b.spend-a.spend);
      const vendorName=o=>s.stock?.vendors.find(v=>v.id===o.vendor)?.name||'No vendor',catName=o=>s.stock?.items.find(i=>i.id===o.item)?.category||'Other';
      const share=g=>`<div class="report-share-bar-cell"><div class="report-share-bar"><i style="width:${spend?Math.round(g.spend/spend*100):0}%"></i></div><span>${spend?Math.round(g.spend/spend*100):0}%</span></div>`;
      const kpis=`<div class="res-kpis"><div class="res-kpi"><small>RECEIVED SPEND</small><strong>${money(spend)}</strong><p>${pos.size} deliveries · ${received.length} lines</p></div><div class="res-kpi"><small>OPEN PIPELINE</small><strong>${open.length} <span>lines</span></strong><p>${open.filter(o=>o.status==='Requested').length} to review · ${open.filter(o=>o.status==='Approved').length} to order · ${open.filter(o=>o.status==='Ordered').length} arriving</p></div><div class="res-kpi"><small>AVERAGE DELIVERY</small><strong>${money(pos.size?spend/pos.size:0)}</strong><p>${roll(vendorName).length} vendors used</p></div><div class="res-kpi"><small>SHORT DELIVERIES</small><strong>${shortLines.length} <span>lines</span></strong><p>${received.length?Math.round(shortLines.length/received.length*1000)/10:0}% of lines · chase credits</p></div></div>`;
      const table=(title,sub,label,rows)=>`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>${title}</h3><p>${sub}</p></div></div><div class="table-scroll"><table><thead><tr><th>${label}</th><th>RECEIVED SPEND</th><th>SHARE</th><th>DELIVERIES</th><th>LINES</th><th>SHORT LINES</th></tr></thead><tbody>${rows.map(g=>`<tr><td><strong>${e(g.name)}</strong></td><td><strong>${money(g.spend)}</strong></td><td>${share(g)}</td><td>${g.pos.size}</td><td>${g.lines}</td><td>${g.short?`<span class="badge tone-danger">${g.short}</span>`:'0'}</td></tr>`).join('')||'<tr><td colspan="6">No deliveries received in this range.</td></tr>'}</tbody></table></div></section>`;
      const items=`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Items ordered (consolidated)</h3><p>Every stock item in range with its vendor, team and spend. Use it to tune par levels.</p></div>${button('Open order sheet ›','navigate','orders','','secondary')}</div><div class="table-scroll"><table><thead><tr><th>ITEM</th><th>VENDOR / CATEGORY</th><th>TEAM</th><th>RECEIVED</th><th>SPEND</th><th>OPEN / DECLINED</th></tr></thead><tbody>${A.orderSummaries.map(g=>`<tr><td><strong>${e(g.name)}</strong><small class="table-detail">${g.count} line${g.count===1?'':'s'} · ${e([...g.authors].slice(0,3).join(', '))}</small></td><td>${e(g.vendor)}<small class="table-detail">${e(g.category)}</small></td><td><span class="badge ${stationTone(g.area)}">${e(g.area)}</span></td><td><strong>${g.receivedQty} ${e(g.unit)}</strong>${g.shortQty?`<small class="table-detail">${g.shortQty} short</small>`:''}</td><td><strong>${money(g.spend)}</strong></td><td>${g.requestedQty+g.approvedQty+g.orderedQty?`<span class="badge tone-amber">${g.requestedQty+g.approvedQty+g.orderedQty} open</span> `:''}${g.declinedQty?`<span class="badge tone-danger">${g.declinedQty} declined</span>`:''}</td></tr>`).join('')||'<tr><td colspan="6">No orders match these filters.</td></tr>'}</tbody></table></div></section>`;
      body=kpis+table('Spend by vendor','Received value per vendor, and how often deliveries came in short.','VENDOR',roll(vendorName))+table('Spend by category','Where purchasing money goes.','CATEGORY',roll(catName))+table('Spend by team','The station each line was ordered for.','TEAM',roll(o=>o.area))+items;
    }else if(reportTab==='reservations'){
      const avgParty=A.activeRes.length?(A.totalCovers/A.activeRes.length).toFixed(1):'0.0';
      const completionRate=A.reservations.length?Math.round(A.seatedOrDoneRes.length/A.reservations.length*100):0;
      const cancelRate=A.reservations.length?Math.round(A.closedRes.length/A.reservations.length*100):0;
      const kpis=`<div class="res-kpis"><div class="res-kpi"><small>TOTAL COVERS</small><strong>${A.totalCovers.toLocaleString('en-US')} <span>guests</span></strong><p>Avg party size: ${avgParty} guests</p></div><div class="res-kpi"><small>ACTIVE BOOKINGS</small><strong>${A.activeRes.length} <span>bookings</span></strong><p>${A.reservations.filter(r=>r.status==='Confirmed').length} confirmed · ${A.reservations.filter(r=>r.status==='Seated').length} seated</p></div><div class="res-kpi"><small>SEATED / COMPLETED</small><strong>${A.seatedOrDoneRes.length} <span>tables (${completionRate}%)</span></strong><p>Honored bookings in period</p></div><div class="res-kpi"><small>CANCELLED / NO-SHOW</small><strong>${A.closedRes.length} <span>bookings (${cancelRate}%)</span></strong><p>${A.reservations.filter(r=>r.status==='No-show').length} no-shows · ${A.reservations.filter(r=>r.status==='Cancelled').length} cancelled</p></div></div>`;
      // Table utilization
      const tableStats=new Map();
      for(const r of A.activeRes){
        const t=tableLabel(r.table);
        if(!tableStats.has(t))tableStats.set(t,{table:t,bookings:0,guests:0});
        const g=tableStats.get(t);g.bookings++;g.guests+=r.guests;
      }
      const tableGrid=[...tableStats.values()].sort((a,b)=>b.guests-a.guests).map(t=>`<div class="res-table-chip" data-tone="sage"><div class="res-table-top"><strong>${e(t.table)}</strong><span>${t.bookings} bookings</span></div><small>${t.guests} total guests · avg ${(t.guests/t.bookings).toFixed(1)}p</small></div>`).join('');
      const filteredRes=reportStatus?A.reservations.filter(r=>reportStatus==='closed'?['Cancelled','No-show'].includes(r.status):r.status===reportStatus):A.reservations;
      body=`${kpis}<section class="panel res-floor-panel"><div class="panel-head"><div><h3>Table utilization & demand</h3><p>Total bookings and covers served per table across the selected date range</p></div></div><div class="res-table-grid">${tableGrid||'<p class="context-empty">No table assignments in this range.</p>'}</div></section><section class="panel"><div class="panel-head"><div><h3>Reservation history & guest notes (${filteredRes.length} shown)</h3><p>Showing up to 150 most recent bookings in range. Export CSV for full raw dataset.</p></div><div class="report-presets">${[['','All'],['Confirmed','Confirmed'],['Seated','Seated'],['Completed','Completed'],['closed','Cancelled / No-show']].map(([k,lbl])=>act(lbl,'report-status',k,reportStatus===k?'':'secondary')).join('')}</div></div><div class="table-scroll"><table><thead><tr><th>DATE / SERVICE</th><th>TIME</th><th>GUEST & NOTES</th><th>PARTY</th><th>TABLE</th><th>STATUS</th></tr></thead><tbody>${filteredRes.slice(0,150).map(r=>`<tr><td><strong>${e(r.date)}</strong><small class="table-detail">${e(r.service)}</small></td><td><strong>${e(r.time)}</strong></td><td><strong>${e(r.name)}</strong>${r.note?`<small class="table-detail">${e(r.note)}</small>`:''}</td><td>${r.guests} guests</td><td><span class="badge ${r.table?'tone-slate':'tone-amber'}">${e(tableLabel(r.table))}</span></td><td>${badge(r.status,['Cancelled','No-show'].includes(r.status)?'gray':r.status==='Confirmed'?'orange':'')}</td></tr>`).join('')||'<tr><td colspan="6">No reservations match these filters.</td></tr>'}</tbody></table></div></section>`;
    }else if(reportTab==='eighty-six'){
      const appCount=A.alerts.filter(x=>x.status==='Approved').length;
      const restCount=A.alerts.filter(x=>x.status==='Restored').length;
      const repCount=A.alerts.filter(x=>x.status==='Reported').length;
      const kpis=`<div class="res-kpis"><div class="res-kpi"><small>TOTAL 86 INCIDENTS</small><strong>${A.alerts.length} <span>records</span></strong><p>${A.top86.length} distinct menu items affected</p></div><div class="res-kpi"><small>APPROVED / ACTIVE 86</small><strong>${appCount} <span>unavailable</span></strong><p>Confirmed unavailable on shifts</p></div><div class="res-kpi"><small>RESTORED TO MENU</small><strong>${restCount} <span>restocked</span></strong><p>Resolved after restock/prep</p></div><div class="res-kpi"><small>AWAITING REVIEW</small><strong>${repCount} <span>pending</span></strong><p>${A.alerts.filter(x=>x.status==='Declined').length} declined reports</p></div></div>`;
      const topTable=`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Most frequently 86’d items (recurring stockouts)</h3><p>Identify dishes, ingredients, and drinks that run out repeatedly so you can adjust par levels.</p></div></div><div class="table-scroll"><table><thead><tr><th>MENU ITEM</th><th>STATION</th><th>TIMES 86’D</th><th>STATUS BREAKDOWN</th><th>LATEST REASON / SUBSTITUTE</th></tr></thead><tbody>${A.top86.map(g=>`<tr><td><strong>${e(g.name)}</strong><small class="table-detail">Last logged ${e(g.latestDate)}</small></td><td><span class="badge ${stationTone(g.area)}">${e(g.area)}</span></td><td><span class="badge tone-danger">${g.count}×</span></td><td>${g.approved} approved · ${g.restored} restored${g.reported?' · '+g.reported+' pending':''}</td><td>${e(g.latestReason)}</td></tr>`).join('')||'<tr><td colspan="5">No 86 records in this date range.</td></tr>'}</tbody></table></div></section>`;
      const logTable=`<section class="panel"><div class="panel-head"><div><h3>Complete 86 audit log (${A.alerts.length} entries)</h3><p>Every crew report and manager 86 update in the selected date range.</p></div></div><div class="table-scroll"><table><thead><tr><th>DATE / SERVICE</th><th>ITEM</th><th>STATION</th><th>REASON / ALTERNATIVE</th><th>REPORTED / REVIEWED BY</th><th>STATUS / ACTION</th></tr></thead><tbody>${A.alerts.slice(0,150).map(a=>`<tr><td><strong>${e(a.date)}</strong><small class="table-detail">${e(a.service)}</small></td><td><strong>${e(a.name)}</strong></td><td><span class="badge ${stationTone(a.area)}">${e(a.area)}</span></td><td>${e(a.reason)}${a.feedback?`<small class="table-detail">Note: ${e(a.feedback)}</small>`:''}</td><td>${e(name(a.author))}${a.reviewer?`<small class="table-detail">Reviewed by ${e(name(a.reviewer))}</small>`:''}</td><td>${badge(a.status,a.status==='Reported'?'orange':a.status==='Approved'?'red':'gray')}${a.status==='Reported'?`<div class="row-actions" style="margin-top:6px">${act('Approve','approve-alert',a.id,'')+act('Decline','decline-alert',a.id,'danger')}</div>`:''}</td></tr>`).join('')||'<tr><td colspan="6">No 86 records in this date range.</td></tr>'}</tbody></table></div></section>`;
      body=kpis+topTable+logTable;
    }else if(reportTab==='specials'){
      const avgPrice=A.specials.length?money(A.specials.reduce((n,x)=>n+x.price,0)/A.specials.length):'$0.00';
      const prices=A.specials.map(x=>x.price);
      const priceSpan=prices.length?`${money(Math.min(...prices))} – ${money(Math.max(...prices))}`:'$0.00';
      const kpis=`<div class="res-kpis"><div class="res-kpi"><small>SPECIALS FEATURED</small><strong>${A.specials.length} <span>service features</span></strong><p>${A.topSpecials.length} unique dishes & drinks</p></div><div class="res-kpi"><small>AVERAGE PRICE</small><strong>${avgPrice}</strong><p>Range: ${priceSpan}</p></div><div class="res-kpi"><small>BRIEFINGS POSTED</small><strong>${A.briefings.length} <span>shift briefings</span></strong><p>${A.shiftNotes.length} shift handover notes</p></div><div class="res-kpi"><small>ONBOARDING READ RATE</small><strong>${briefPct}% <span>confirmed</span></strong><p>${A.briefAcked} of ${A.briefExpected} crew confirmations</p></div></div>`;
      const specialsTable=`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Specials catalog & service frequency</h3><p>All dishes and drinks featured across services in the selected period, with pricing and allergen notes.</p></div>${button('+ Add special','edit','','data-collection="specials"','secondary')}</div><div class="table-scroll"><table><thead><tr><th>SPECIAL DISH / DRINK</th><th>PRICE</th><th>SERVICES FEATURED</th><th>DESCRIPTION</th><th>ALLERGEN & PREP NOTES</th></tr></thead><tbody>${A.topSpecials.map(g=>`<tr><td><strong>${e(g.name)}</strong><small class="table-detail">Latest: ${e(g.latestDate)}</small></td><td><strong>${money(g.price)}</strong></td><td><span class="badge tone-amber">${g.count} ${g.count===1?'service':'services'}</span></td><td>${e(g.description)}</td><td>${e(g.allergens)}</td></tr>`).join('')||'<tr><td colspan="5">No specials recorded in this date range.</td></tr>'}</tbody></table></div></section>`;
      const briefingTable=`<section class="panel"><div class="panel-head"><div><h3>Shift briefings & “I have read this” confirmation log</h3><p>Verify which crew members confirmed reading each shift’s onboarding briefing.</p></div></div><div class="table-scroll"><table><thead><tr><th>DATE / SERVICE</th><th>BRIEFING & AUTHOR</th><th>READ RATE</th><th>CONFIRMED BY (“I HAVE READ THIS”)</th><th>AWAITING CONFIRMATION</th></tr></thead><tbody>${A.briefRows.slice(0,100).map(({briefing:b,tracked,acked,pending})=>`<tr><td><strong>${e(b.date)}</strong><small class="table-detail">${e(b.service)} · Rev ${b.revision}</small></td><td><strong>${e(b.title)}</strong><small class="table-detail">By ${e(name(b.author))}</small></td><td><span class="badge ${pending.length?'tone-amber':'tone-sage'}">${acked.length}/${tracked.length||1} read</span></td><td>${acked.length?acked.map(id=>`<span class="badge tone-sage" style="margin:2px">✓ ${e(name(id))}</span>`).join(''):'<small class="table-detail">No confirmations yet</small>'}</td><td>${pending.length?pending.map(id=>`<span class="badge tone-amber" style="margin:2px">${e(name(id))}</span>`).join(''):'<span class="badge tone-sage">All confirmed</span>'}</td></tr>`).join('')||'<tr><td colspan="5">No briefings in this date range.</td></tr>'}</tbody></table></div></section>`;
      body=kpis+specialsTable+briefingTable;
    }else if(reportTab==='checklists'){
      const filteredGroups=A.checklistGroups;
      const fRows=filteredGroups.flatMap(g=>g.rows).filter(t=>!t.removed);
      const fDone=fRows.filter(t=>t.check).length;
      const fIncomplete=fRows.filter(t=>!t.check).length;
      const fPct=fRows.length?Math.round(fDone/fRows.length*100):0;
      const fOpen=fRows.filter(t=>t.list==='Opening'),fOpenDone=fOpen.filter(t=>t.check).length;
      const fClose=fRows.filter(t=>t.list==='Closing'),fCloseDone=fClose.filter(t=>t.check).length;
      const fNotes=filteredGroups.reduce((sum,g)=>sum+g.noteCount,0);
      const fImportant=filteredGroups.reduce((sum,g)=>sum+g.importantCount,0);
      const f86=fRows.reduce((sum,t)=>sum+t.notes.filter(n=>n.stockItem).length,0);

      const kpis=`<div class="res-kpis"><div class="res-kpi"><small>OVERALL COMPLETION</small><strong>${fPct}%</strong><p>${fDone} of ${fRows.length} tasks verified done · ${fIncomplete} incomplete</p></div><div class="res-kpi"><small>OPENING CHECKLISTS</small><strong>${fOpen.length?Math.round(fOpenDone/fOpen.length*100):0}%</strong><p>${fOpenDone} of ${fOpen.length} opening duties done</p></div><div class="res-kpi"><small>CLOSING CHECKLISTS</small><strong>${fClose.length?Math.round(fCloseDone/fClose.length*100):0}%</strong><p>${fCloseDone} of ${fClose.length} wrap-up duties done</p></div><div class="res-kpi"><small>TASK NOTES &amp; 86 LOGS</small><strong>${fNotes} <span>notes</span></strong><p>${fImportant} manager priority · ${f86} 86 stockout notes</p></div></div>`;

      const contribMap=new Map();
      for(const g of filteredGroups)for(const c of g.contributors||[])contribMap.set(c.id,(contribMap.get(c.id)||0)+c.count);
      const leaderboard=[...contribMap.entries()].map(([id,count])=>({id,name:name(id),role:B.person(id)?.role||'Crew',area:B.person(id)?.area||'Floor',count})).sort((a,b)=>b.count-a.count);
      const leaderHtml=`<section class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Team checklist completion leaderboard</h3><p>Tasks checked off by each team member across ${filteredGroups.length} ${filteredGroups.length===1?'service':'services'}.</p></div>${act('Inspect team labor reports ›','report-tab','members','secondary')}</div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>ROLE / DEFAULT STATION</th><th>TASKS COMPLETED</th><th>SHARE OF COMPLETIONS</th><th></th></tr></thead><tbody>${leaderboard.map(c=>`<tr><td><strong>${e(c.name)}</strong></td><td>${e(c.role)} · <span class="badge ${stationTone(c.area)}">${e(c.area)}</span></td><td><strong>${c.count} tasks</strong></td><td><div class="report-share-bar-cell"><div class="report-share-bar"><i style="width:${fDone?Math.min(100,Math.round(c.count/fDone*100)):0}%"></i></div><span>${fDone?Math.round(c.count/fDone*100):0}%</span></div></td><td>${act('Inspect labor ›','select-report-person',c.id,'secondary')}</td></tr>`).join('')||'<tr><td colspan="5">No completed tasks in this filter.</td></tr>'}</tbody></table></div></section>`;

      const serviceCards=filteredGroups.slice(0,checklistLimit).map((g,idx)=>{
        const gRows=g.rows.filter(t=>!t.removed),gDone=gRows.filter(t=>t.check).length;
        const contribText=(g.contributors||[]).map(c=>e(c.name)+' ('+c.count+')').join(', ')||'None recorded yet';
        const teamText=(g.team||[]).map(p=>e(p.name)+' ('+e(p.area)+')').join(', ')||'No shifts scheduled';
        const openAttr=(filteredGroups.length<=3||idx===0)?'open ':'';
        return `<details class="history-service" ${openAttr}data-key="rep-hist-${e(g.date+'-'+g.service)}"><summary><div class="history-service-title"><strong>${e(g.date)} · ${e(g.service)} <small>${dateLabel(g.date,{weekday:'short',month:'short',day:'numeric'})}</small></strong><small class="history-service-sub">Opening ${g.openingDone}/${g.openingTotal} · Closing ${g.closingDone}/${g.closingTotal}${g.noteCount?' · '+g.noteCount+' note'+(g.noteCount===1?'':'s'):''}${g.importantCount?' ('+g.importantCount+' priority)':''}</small></div><span class="badge ${gDone===gRows.length&&gRows.length?'tone-sage':'tone-amber'}">${gDone}/${gRows.length} complete</span></summary><div class="history-shift-bar"><div><small><strong>Completed by:</strong> ${contribText}</small><small><strong>Team on shift:</strong> ${teamText}</small></div>${button('Open this checklist in tasks ›','checklist-jump',g.date+'|'+g.service,'','secondary')}</div><div class="table-scroll"><table><thead><tr><th>TASK / STATION</th><th>STATUS / COMPLETED BY</th><th>NOTES &amp; ACTIVITY</th></tr></thead><tbody>${g.rows.map(t=>`<tr><td><strong>${e(t.title)}</strong><small class="table-detail"><span class="badge ${stationTone(t.area)}">${e(t.area)}</span> · ${e(t.list)}</small></td><td>${t.removed?'<span class="badge gray">Removed from list</span>':t.check?`<strong>Completed by ${e(name(t.check.by))}</strong><small class="table-detail">${e(B.person(t.check.by)?.role||'Crew')} · ${stamp(t.check.at)}</small>`:`<span class="badge tone-amber">Incomplete</span>${t.assigned?.length?`<small class="table-detail">Assigned: ${e(t.assigned.join(', '))}</small>`:''}`}</td><td><div class="report-task-notes">${t.notes.map(n=>`<div class="task-note ${n.important?'important':''}"><small>${n.important?'Important · ':''}${e(name(n.by))}${n.stockItem?' · 86: '+e(n.stockItem):''}</small><p>${e(n.body)}</p></div>`).join('')||'<small class="table-detail">No notes posted</small>'}</div><div class="report-note-actions">${button(t.notes.length?'+ Add / view notes ('+t.notes.length+')':'+ Leave note','checklist-note',t.id,`data-date="${e(g.date)}" data-service="${e(g.service)}" data-title="${e(t.title)}" data-station="${e(t.area)}" data-list="${e(t.list)}" data-source="${e(t.sourceTask||t.id)}" data-scope="${e(g.date+'|'+g.service)}" data-collection="tasks"`,'quiet')}${t.events.length?`<details><summary>Activity · ${t.events.length}</summary><ol class="task-activity">${t.events.map(x=>`<li>${e(x.kind)} · ${e(name(x.by))}<small>${stamp(x.at)}${x.legacy?' · recorded completion':''}</small></li>`).join('')}</ol></details>`:''}</div></td></tr>`).join('')}</tbody></table></div></details>`;
      }).join('');
      const moreBtn=filteredGroups.length>checklistLimit?button('Show more services ('+(filteredGroups.length-checklistLimit)+' remaining)','checklist-more','','','secondary'):'';
      const emptyState=(!filteredGroups.length)?'<div class="panel station-empty"><strong>No checklist records match these filters</strong><p>Try choosing another date range, clearing the station or person filter, or selecting “All 6 months”.</p></div>':'';
      body=kpis+leaderHtml+serviceCards+moreBtn+emptyState;
    }

    const scopeBar=`<div class="report-scope-badge"><div class="scope-badge-top"><span class="report-scope-dot"></span><span class="scope-preset-name">${activePresetLabel}</span><span class="scope-dates-tag">${from} to ${to}</span></div><div class="scope-badge-stats"><span><strong>${A.shifts.length}</strong> shifts</span><span>·</span><span><strong>${A.totalCovers.toLocaleString('en-US')}</strong> covers</span><span>·</span><span><strong>${A.allChecklistGroups.length}</strong> services</span></div></div>`;
    const controlsPanel=`<section class="report-controls-panel"><div class="report-controls-top"><span class="report-controls-label">TIME HORIZON PRESETS</span>${presets}</div>${globalFilters}</section>`;
    return `<div class="manager-reports-hub"><div class="report-hub-header"><div class="report-hub-titles"><p class="eyebrow">BRIGLY OPERATIONAL INTELLIGENCE &amp; AUDIT</p><h2>Restaurant Reports &amp; Analytics</h2><p>Comprehensive multi-day operations audit: labor, checklists, purchasing, reservations, 86s, and specials.</p></div>${scopeBar}</div>${controlsPanel}${hubNav}${body}</div>`;
  }
  function extras(){
    if(!manager())return '';
    const pending=state().unavailable.filter(a=>a.status==='Reported');
    return `<section class="panel operations-panel"><div class="ops-tabs">${[['briefing','Shift briefing'],['setup','Team & schedule setup'],['reports','Team reports'],['approvals',`86 review (${pending.length})`]].map(([key,title])=>act(title,'panel',key,panel===key?'':'secondary',`aria-pressed="${panel===key}"`)).join('')}</div>${panel==='briefing'?hub():panel==='setup'?teamSetup():panel==='reports'?reports():`<div class="setup-section"><h2>86 reports awaiting review · all dates</h2>${pending.length?[...new Set(pending.map(a=>a.date+'|'+a.service))].map(key=>`<div class="context-section"><h3>${e(key.replace('|',' · '))}</h3>${alertCards(key.slice(0,10),key.slice(11))}</div>`).join(''):'<p class="context-empty">No pending reports.</p>'}</div>`}</section>`;
  }
  function handle(action,id,data){
    const s=state(),date=data.date||s.date,service=data.service||s.service;
    if(action==='context-create'){api.createInContext(id,date,service);return;}
    if(action==='team-filter'){teamFilter=id;api.render();return;}
    if(action==='report-tab'){panel='reports';reportTab=id||'overview';api.reportScreen();return;}
    if(action==='select-report-person'){reportPerson=id;api.render();return;}
    if(action==='report-status'){reportStatus=id||'';api.render();return;}
    if(action==='member-report'){reportPerson=id;reportTab='members';from=s.demoHistory?.from||s.date.slice(0,7)+'-01';to=s.demoHistory?.to||s.date;api.reportScreen();return;}
    if(action==='report-range'){
      if(id==='today'){from=s.date;to=s.date;}
      else if(id==='7'){to=s.date;from=B.addDays(s.date,-6);}
      else{to=s.demoHistory?.to||s.date;from=id==='month'?to.slice(0,7)+'-01':id==='30'?B.addDays(to,-29):s.demoHistory?.from||B.addDays(to,-182);}
      api.render();return;
    }
    if(action==='panel'){panel=id;api.render();return;}
    if(action==='open-briefing'){panel='briefing';document.getElementById('editor').close();api.navigate('schedules',date,service);return;}
    if(action==='reservations'){api.navigate('reservations',date,service);return;}
    if(action==='checklist-more'){checklistLimit+=14;api.render();return;}
    if(action==='checklist-filter'){checklistFilter=id||'';checklistLimit=14;api.render();return;}
    if(action==='checklist-person'){checklistPerson=id||'';checklistLimit=14;api.render();return;}
    if(action==='export-report'){
      if(!manager())throw Error('Only managers can export team reports.');
      if(reportTab==='members'){
        const blob=new Blob([B.ops.reportCSV(s,reportPerson,from,to)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=`brigly-shift-report-${reportPerson}-${from}-${to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      if(reportTab==='checklists'&&B.work?.historyCSV){
        const csv=B.work.historyCSV(s,from,to,reportService,reportArea,{person:checklistPerson,filter:checklistFilter});
        const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=`brigly-checklist-report-${from}-${to}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
      }
      const A=computeAnalytics(s);
      if(reportTab==='orders'){
        downloadCSV(`brigly-purchasing-${from}-${to}.csv`,[['Brigly Purchasing Report'],['From',from,'Through',to,'Station',reportArea||'All stations'],[],['Date','PO','Vendor','Category','Item','Team','Quantity','Received','Unit','Unit cost','Received value','Status','Requested by','Delivery note'],...A.orders.map(o=>[(o.receivedAt||o.orderedAt||o.at||'').slice(0,10),o.po||'',s.stock?.vendors.find(v=>v.id===o.vendor)?.name||'',s.stock?.items.find(i=>i.id===o.item)?.category||'',o.name,o.area,o.quantity,o.status==='Received'?(o.receivedQty??o.quantity):'',o.unit,o.cost??'',o.status==='Received'?Math.round((o.receivedQty??o.quantity)*(o.cost||0)*100)/100:'',o.status,name(o.author),o.deliveryNote||''])]);return;
      }
      if(reportTab==='reservations'){
        downloadCSV(`brigly-reservations-report-${from}-${to}.csv`,[['Brigly Reservations & Covers Report'],['From',from,'Through',to,'Service',reportService||'All services'],[],['Date','Service','Time','Guest','Party Size','Table','Status','Notes'],...A.reservations.map(r=>[r.date,r.service,r.time,r.name,r.guests,tableLabel(r.table),r.status,r.note])]);return;
      }
      if(reportTab==='eighty-six'){
        downloadCSV(`brigly-86-report-${from}-${to}.csv`,[['Brigly 86 Menu Availability Report'],['From',from,'Through',to],['Date','Service','Item','Station','Status','Reported By','Reviewed By','Reason'],...A.alerts.map(a=>[a.date,a.service,a.name,a.area,a.status,name(a.author),a.reviewer?name(a.reviewer):'',a.reason])]);return;
      }
      if(reportTab==='specials'){
        downloadCSV(`brigly-specials-briefings-report-${from}-${to}.csv`,[['Brigly Specials & Shift Briefings Report'],['From',from,'Through',to],[],['Date','Service','Special Name','Price','Active','Allergens','Description'],...A.specials.map(sp=>[sp.date,sp.service,sp.name,sp.price,sp.active?'Yes':'No',sp.allergens,sp.description])]);return;
      }
      // Default Executive Overview CSV
      downloadCSV(`brigly-executive-report-${from}-${to}.csv`,[['Brigly Executive Operations Report'],['From',from,'Through',to,'Service',reportService||'All','Station',reportArea||'All'],[],['Metric','Value'],['Scheduled Shifts',A.shifts.length],['Expected Work Hours',hours(A.totalWorkMins)],['Estimated Wage Cost',A.totalWageCost],['Reported Crew Tips',A.totalTips],['Active Reservations',A.activeRes.length],['Total Guests / Covers',A.totalCovers],['Checklist Tasks Completed',`${A.checklistDone}/${A.checklistRows.length}`],['Shift Briefing Confirmations',`${A.briefAcked}/${A.briefExpected}`],['86 Incidents',A.alerts.length],['Specials Featured',A.specials.length],['Supply Requests',A.orders.length]]);return;
    }
    if(action==='note'){
      const old=s.shiftNotes.find(x=>x.id===id);open(old?'Edit shift note':manager()?'Add manager priority note':'Add a crew shift note',`<p>${e(old?.service||service)} · ${e(old?.date||date)} · visible to the team on this service.</p>`+textarea('body','Shift note',old?.body||'','required maxlength="2000"'),{type:'note',id:old?.id||crypto.randomUUID(),date:old?.date||date,service:old?.service||service});
    }
    if(action==='archive-note')open('Archive this note?','<p>The note will leave the shift briefing. Its record is retained.</p>',{type:'archive-note',id});
    // 86s are picked from the team's stock list when the Stock screen is available.
    if(action==='alert'&&api.stockAlert){api.stockAlert(date,service,id);return;}
    if(action==='alert'){
      const old=s.unavailable.find(x=>x.id===id);open(old?'Edit 86 item':manager()?'Add an approved 86 item':'Report an 86 item',`<p>${e(old?.service||service)} · ${e(old?.date||date)}. ${manager()?'New manager entries are approved immediately.':'Your report is visible as unconfirmed until a manager approves it.'}</p>`+input('name','Item',old?.name||'','text','required maxlength="80"')+select('area','Station',s.setup.areas,old?.area||B.person(me()).area)+textarea('reason','Reason and alternatives',old?.reason||'','required maxlength="500"'),{type:'alert',id:old?.id||crypto.randomUUID(),date:old?.date||date,service:old?.service||service});
    }
    if(['approve-alert','restore-alert'].includes(action)){api.commit({type:'ops:review-alert',id,status:action==='approve-alert'?'Approved':'Restored'},'Shift menu availability updated.');return;}
    if(action==='decline-alert')open('Decline this 86 report',textarea('feedback','Reason for the crew','','required maxlength="500"'),{type:'review-alert',id,status:'Declined'});
    if(action==='member'){
      const p=s.team.find(x=>x.id===id);open(p?'Edit team profile':'Add a teammate',input('name','Name',p?.name||'','text','required maxlength="80"')+select('role','Role title',s.setup.roles,p?.role||s.team.find(p=>p.access==='crew')?.role||s.setup.roles[0])+select('area','Default station',s.setup.areas,p?.area||s.setup.areas[0])+select('access','Workspace access',[['crew','Crew'],['manager','Manager']],p?.access||'crew')+select('active','Profile status',[['true','Active'],['false','Archived']],String(p?.active??true))+input('joinedOn','Joined on',p?.joinedOn||'','date')+input('leftOn','Last working day (former team)',p?.leftOn||'','date')+'<p>To record a departure, choose Archived and a last working day. Reassign shifts after that date first. Reports remain available.</p>'+(!p?input('rate','Default hourly rate ($)',18,'number','required min="0" max="100000" step="0.01"'):'<p>Use Pay & absence defaults below to change new-shift rates. Existing assignments and reports stay attached to this profile.</p>'),{type:'member',id:p?.id||crypto.randomUUID()});
    }
    if(action==='catalog')open(id?'Rename '+id:'Add '+(data.catalog==='roles'?'role':'station'),input('name','Name',id||'','text','required maxlength="80"')+(id?'<p>Renaming updates all existing references. Records remain connected.</p>':''),{type:'catalog',catalog:data.catalog,oldName:id});
    if(action==='remove-catalog')open('Remove '+id+'?','<p>Only unused options can be removed. Options attached to records must be renamed or reassigned.</p>',{type:'remove-catalog',catalog:data.catalog,name:id});
    if(action==='service'){
      const x=s.setup.services.find(x=>x.id===id);open(x?'Edit service & shift defaults':'Add a service',input('name','Service name',x?.name||'','text','required maxlength="80"')+input('start','Default start',x?.start||'16:00','time','required')+input('end','Default end',x?.end||'23:00','time','required')+input('breakMinutes','Unpaid break (minutes)',x?.breakMinutes??0,'number','required min="0" max="1439" step="1"')+select('active','Availability',[['true','Active'],['false','Archived']],String(x?.active??true))+(x?select('apply','Apply time changes',[['defaults','New assignments only'],['existing','Also update existing assignments from date']],'defaults')+input('applyFrom','Effective date',s.date,'date','required'):'')+'<p>An earlier end time finishes the following day. Names update everywhere, including notes and reservations. Archived services keep their history. Updating existing times is blocked if it creates a schedule conflict.</p>',{type:'service',id:x?.id||crypto.randomUUID()});
    }
  }
  function submit(v){
    if(!form)throw Error('Reopen the form.');const a={...form,type:'ops:'+form.type};
    if(form.type==='note')a.body=v.body;
    if(form.type==='alert')Object.assign(a,{name:v.name,area:v.area,reason:v.reason});
    if(form.type==='review-alert')a.feedback=v.feedback;
    if(form.type==='member')Object.assign(a,{name:v.name,role:v.role,area:v.area,access:v.access,active:v.active==='true',rate:Number(v.rate),joinedOn:v.joinedOn,leftOn:v.leftOn});
    if(form.type==='catalog')a.name=v.name;
    if(form.type==='service')Object.assign(a,{name:v.name,start:v.start,end:v.end,breakMinutes:Number(v.breakMinutes),active:v.active==='true',applyFrom:v.apply==='existing'?v.applyFrom:''});
    return a;
  }
  function onChange(t){
    if(['reportPerson','reportFrom','reportTo','reportService','reportArea','reportStatus','checklistFilter','checklistPerson'].includes(t.name)){
      if(t.name==='reportPerson')reportPerson=t.value;
      if(t.name==='reportFrom')from=t.value;
      if(t.name==='reportTo')to=t.value;
      if(t.name==='reportService')reportService=t.value;
      if(t.name==='reportArea')reportArea=t.value;
      if(t.name==='reportStatus')reportStatus=t.value;
      if(t.name==='checklistFilter')checklistFilter=t.value;
      if(t.name==='checklistPerson')checklistPerson=t.value;
      checklistLimit=14;
      api.render();
    }
  }
  return {hub,extras,section:(key)=>{panel=key;return extras();},handle,submit,onChange,alertPage:()=>`<section class="panel"><div class="context-heading"><div><h2>86 list · ${e(state().service)}</h2><p class="context-hint">${dateLabel(state().date)} · Reported items require manager approval.</p></div><div class="toolbar">${canWrite(state().date,state().service)?act(manager()?'+ Add approved 86':'+ Report 86','alert','','',contextAttrs(state().date,state().service)):''}${manager()?act('86 history & reports ›','report-tab','eighty-six','secondary'):''}</div></div><div class="context-section">${alertCards(state().date,state().service)}</div></section>`};
};
