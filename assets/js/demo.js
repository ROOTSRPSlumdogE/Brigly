(function(){
  'use strict';
  const B=globalThis.Brigly,$=id=>document.getElementById(id);
  let storage;try{storage=localStorage;}catch{}
  let state=B.load(storage),week=B.monday(state.date),editing=null,toastTimer,externalDirty=false;
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titles={private:'Private notes & to-dos',schedules:'Team schedules',lists:'Checklists & station tasks',specials:'Specials','eighty-six':'86 board',onboarding:'Shift briefing',orders:'Station supplies',reservations:'Reservations'};
  const descriptions={private:'Direct 1-on-1 notes and personal tasks between managers and crew.',schedules:'The right people, in the right place. Plan a better week together.',lists:'Opening and closing tasks by station, inline handover notes, and historical completion reports.',specials:'Tonight’s dishes, pairings, and allergen notes for the whole floor and kitchen.','eighty-six':'Live kitchen and bar availability, crew 86 reports, and guest alternatives.',onboarding:'Pre-shift briefing, manager priority notes, and service alignment.',orders:'Track station supply requests from crew request to delivery.',reservations:'Guest arrivals, table assignments, and VIP seating notes.'};
  const paths={home:'m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',private:'M5 11h14v9H5z M8 11V7a4 4 0 0 1 8 0v4',earnings:'M12 2v20 M18 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H5',reports:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',team:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',schedules:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',lists:'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',specials:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z','eighty-six':'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',onboarding:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',orders:'M3 4h2l3 12h10l3-9H6 M9 20h.1 M18 20h.1',reservations:'M4 9h16v11H4z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8'};
  let notifFilter='all',readNotifs=new Set();
  try{const savedRead=JSON.parse(storage?.getItem('brigly-read-notifs')||'[]');if(Array.isArray(savedRead))readNotifs=new Set(savedRead);}catch{}
  const saveReadNotifs=()=>{try{storage?.setItem('brigly-read-notifs',JSON.stringify([...readNotifs].slice(-200)));}catch{}};
  const icon=view=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[view]||paths.schedules}"/></svg>`;
  const manager=()=>state.role==='manager', me=()=>B.actor(state.role,state.crewId,state.managerId);
  const current=collection=>state[collection].filter(x=>B.scoped(x,state.date,state.service));
  const dateLabel=(date,options={month:'short',day:'numeric'})=>new Date(date+'T12:00:00').toLocaleDateString('en-US',options);
  const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
  const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
  const editButton=(label,collection,id='',style='secondary')=>button(label,'edit',id,`data-collection="${collection}"`,style);
  const empty=(title,body)=>`<div class="empty"><strong>${e(title)}</strong>${e(body)}</div>`;
  const areaClass=area=>area==='Bar'?'bar':area==='Kitchen'?'kitchen':'';
  const checks=()=>state.checks[`${state.date}|${state.service}`]||{};
  function notify(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4000);}
  function persist(){const ok=B.save(storage,state);$('save-status').textContent=ok?'Saved on this browser.':'Storage unavailable. Changes last only while this page is open.';return ok;}
  function commit(action,message='Changes saved.'){try{state=B.change(state,action);const saved=persist();render();notify(saved?message:'Updated in memory. Browser storage is unavailable.');return true;}catch(err){notify(err.message);return false;}}
  function renderNotifAction(a,notifId){
    const extra=[`data-notif-id="${e(notifId)}"`,a.view?`data-view="${e(a.view)}"`:'',a.screen?`data-screen="${e(a.screen)}"`:'',a.area?`data-area="${e(a.area)}"`:'',a.list?`data-list="${e(a.list)}"`:'',a.task?`data-task="${e(a.task)}"`:''].filter(Boolean).join(' ');
    return `<button type="button" class="button ${a.style==='primary'?'':'secondary'} small" data-action="${e(a.action)}" data-id="${e(a.id||'')}" ${extra}>${e(a.label)}</button>`;
  }
  function renderNotifications(){
    const N=globalThis.BriglyNotifications;if(!N)return;
    const all=N.build(state,readNotifs),unread=all.filter(x=>x.unread),urgent=all.filter(x=>x.category==='urgent'&&x.unread);
    const topBadge=$('notif-badge'),sideBadge=$('sidebar-notif-badge'),sideSub=$('sidebar-notif-sub'),sub=$('notif-subtitle');
    if(topBadge){topBadge.textContent=String(unread.length);topBadge.hidden=!unread.length;topBadge.dataset.urgent=urgent.length?'true':'false';}
    if(sideBadge){sideBadge.textContent=String(unread.length||all.length);sideBadge.hidden=!all.length;sideBadge.dataset.urgent=urgent.length?'true':'false';}
    if(sideSub)sideSub.textContent=urgent.length?`${urgent.length} urgent · ${unread.length} unread`:unread.length?`${unread.length} unread update${unread.length===1?'':'s'}`:'All caught up';
    if(sub)sub.textContent=`${state.service} · ${dateLabel(state.date,{weekday:'short',month:'short',day:'numeric'})} · ${unread.length} unread update${unread.length===1?'':'s'}`;
    const filtersEl=$('notif-filters'),listEl=$('notif-list');if(!filtersEl||!listEl)return;
    const counts={all:all.length,urgent:all.filter(x=>x.category==='urgent').length,service:all.filter(x=>x.category==='service').length,team:all.filter(x=>x.category==='team').length};
    const tabs=[['all','All updates',counts.all],['urgent','Urgent',counts.urgent],['service','Live service',counts.service],['team','Team & schedule',counts.team]];
    filtersEl.innerHTML=tabs.map(([key,label,count])=>`<button type="button" class="notif-tab ${notifFilter===key?'selected':''}" data-action="notif-filter" data-id="${key}" aria-pressed="${notifFilter===key}"><span>${e(label)}</span><em>${count}</em></button>`).join('');
    const filtered=notifFilter==='all'?all:all.filter(x=>x.category===notifFilter);
    listEl.innerHTML=filtered.length?filtered.map(n=>`<article class="notif-card ${n.unread?'unread':'read'}" data-tone="${e(n.tone)}"><div class="notif-card-head"><div class="notif-meta"><span class="badge tone-${e(n.tone)}">${e(n.badge)}</span><small>${e(n.time)}</small></div>${n.unread?`<button type="button" class="notif-mark-read" data-action="notif-read" data-id="${e(n.id)}" title="Mark as read">Mark read</button>`:'<span class="notif-seen">Read</span>'}</div><h3>${e(n.title)}</h3><p>${e(n.body)}</p><div class="notif-actions">${(n.actions||[]).map(a=>renderNotifAction(a,n.id)).join('')}</div></article>`).join(''):empty('All clear in this view','Switch filter tabs or check another shift date.');
  }
  function pulsePreview(){
    const N=globalThis.BriglyNotifications;if(!N)return '';
    const all=N.build(state,readNotifs),unread=all.filter(x=>x.unread),featured=(unread.length?unread:all).slice(0,3);
    if(!featured.length)return '';
    const urgentCount=all.filter(x=>x.category==='urgent'&&x.unread).length;
    return `<section class="pulse-strip" aria-label="Shift pulse notifications"><div class="pulse-strip-head"><div class="pulse-title-wrap"><span class="pulse-live-dot ${urgentCount?'urgent':''}"></span><div><h2>Shift pulse & live alerts</h2><p>${unread.length?`${unread.length} unread operational update${unread.length===1?'':'s'} for ${e(state.service)}`:`All caught up for ${e(state.service)}`}</p></div></div><button type="button" class="button secondary small" data-action="notif-open">All notifications (${all.length}) ›</button></div><div class="pulse-cards">${featured.map(n=>`<article class="pulse-item ${n.unread?'unread':''}" data-tone="${e(n.tone)}"><div class="pulse-item-top"><span class="badge tone-${e(n.tone)}">${e(n.badge)}</span><small>${e(n.time)}</small></div><strong>${e(n.title)}</strong><p>${e(n.body)}</p><div class="pulse-item-actions">${(n.actions||[]).slice(0,2).map(a=>renderNotifAction(a,n.id)).join('')}</div></article>`).join('')}</div></section>`;
  }
  let resFilter='all';
  const tableLabel=t=>{const v=String(t||'').trim();return !v?'Unassigned':/^\d+$/.test(v)?'Table '+v:v;};
  function summary(){
    if(['private','reservations','lists'].includes(state.view)){$('summary').innerHTML='';return;}
    if(state.view==='schedules'){$('summary').innerHTML=scheduleUI.summary();return;}
    const assigned=new Set(current('shifts').map(s=>s.person)).size,done=Object.keys(checks()).length;
    const bookings=current('reservations').filter(r=>!['Cancelled','No-show'].includes(r.status));
    const stats=[['Team on shift',assigned,`${state.service} · ${dateLabel(state.date)}`,'schedules'],['Service checklist',`${done}/${B.work.tasks(state).length}`,'Opening & closing tasks','lists'],['Expected guests',bookings.reduce((n,r)=>n+r.guests,0),`${bookings.length} reservations this service`,'reservations'],['Unavailable items',current('unavailable').filter(x=>x.status==='Approved').length,'Check before taking orders','eighty-six']];
    const chosen=state.view==='orders'?[['Awaiting review',state.orders.filter(x=>x.status==='Requested').length,'Crew supply requests','orders'],['In progress',state.orders.filter(x=>['Approved','Ordered'].includes(x.status)).length,'Approved or ordered','orders']]:state.view==='specials'?[['On the menu',current('specials').filter(x=>x.active).length,'Specials for this service','specials'],stats[3]]:state.view==='eighty-six'?[stats[3],['Awaiting approval',current('unavailable').filter(x=>x.status==='Reported').length,'Reported by the crew','eighty-six']]:state.view==='lists'?[stats[1],stats[0]]:[stats[0],stats[2]];
    $('summary').innerHTML=chosen.map(([title,value,note,key])=>`<div class="stat ${key==='eighty-six'?'attention':''}"><span class="stat-icon">${icon(key)}</span><p>${title}</p><strong>${value}</strong><small>${note}</small></div>`).join('');
  }
  function roster(){
    const days=Array.from({length:7},(_,i)=>B.addDays(week,i));
    return `<section class="panel"><div class="panel-head"><div><h2>The week, together</h2><p>All services · ${state.shifts.filter(s=>days.includes(s.date)).length} scheduled shifts</p></div><div class="toolbar">${button('‹','week-prev','','aria-label="Previous week"') }<span class="week-label">${dateLabel(week)} – ${dateLabel(days[6],{month:'short',day:'numeric',year:'numeric'})}</span>${button('›','week-next','','aria-label="Next week"')}${manager()?editButton('+ Add shift','shifts','',''):''}</div></div>${mobileRoster()}<div class="table-scroll desktop-roster"><table class="schedule-table"><thead><tr><th>TEAM MEMBER <span class="table-detail">${B.crew.length} people</span></th>${days.map(d=>`<th class="${d===state.date?'today-col':''}">${dateLabel(d,{weekday:'short'})}<span class="day-number">${dateLabel(d,{day:'numeric'})}</span></th>`).join('')}</tr></thead><tbody>${B.crew.map(p=>`<tr><td><div class="crew-name"><span class="avatar">${e(p.initials)}</span><div>${e(p.name)}<small>${e(p.role)}${p.active?'':' · Archived'}</small></div></div></td>${days.map(d=>`<td class="${d===state.date?'today-col':''}">${state.shifts.filter(s=>s.person===p.id&&s.date===d).sort((a,b)=>a.start.localeCompare(b.start)).map(s=>`<button class="shift-block ${areaClass(s.area)}" data-action="edit" data-collection="shifts" data-id="${e(s.id)}" aria-label="${e(p.name+' '+d+' '+s.start+' to '+s.end)}"><strong>${e(s.start)} – ${e(s.end)}</strong>${e(s.area)} · ${e(s.service)}${B.schedule.absence(state,s)?'<span class="roster-alert">Absent · coverage needed</span>':B.schedule.metrics(state,s).late?'<span class="roster-alert late">Late · '+B.schedule.metrics(state,s).late.minutes+' min</span>':''}</button>`).join('')||'<span class="day-off">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="legend"><span><i></i>Floor</span><span><i class="bar"></i>Bar</span><span><i class="kitchen"></i>Kitchen</span><span>All times local · select a shift for details</span></div></section>`;
  }
  function mobileRoster(){
    const days=Array.from({length:7},(_,i)=>B.addDays(week,i));
    const shifts=state.shifts.filter(x=>x.date===state.date).sort((a,b)=>a.start.localeCompare(b.start));
    return '<div class="mobile-roster"><div class="day-strip">'+days.map(d=>'<button data-action="pick-day" data-id="'+d+'" aria-pressed="'+(d===state.date)+'" class="'+(d===state.date?'selected':'')+'"><small>'+dateLabel(d,{weekday:'short'})+'</small><strong>'+dateLabel(d,{day:'numeric'})+'</strong></button>').join('')+'</div><div class="mobile-shifts">'+(shifts.map(x=>'<button class="mobile-shift '+areaClass(x.area)+'" data-action="edit" data-collection="shifts" data-id="'+e(x.id)+'"><span class="avatar">'+e(B.person(x.person).initials)+'</span><span><strong>'+e(B.person(x.person).name)+'</strong><small>'+e(x.service)+' · '+e(x.area)+'</small></span><span class="shift-time">'+x.start+'<small>'+x.end+(x.end<x.start?' +1d':'')+'</small></span>'+(B.schedule.absence(state,x)?'<span class="badge red">Absent · needs cover</span>':B.schedule.metrics(state,x).late?'<span class="badge orange">Running late</span>':'')+'</button>').join('')||empty('No shifts today','Choose another day or add a shift.'))+'</div></div>';
  }
  function schedules(){return scheduleUI.render();}
  function lists(){return dutiesUI.lists();}
  function specials(){return `<div class="section-bar"><div><h2>On the menu for ${e(state.service.toLowerCase())}</h2><p>Menu notes for ${dateLabel(state.date)}. Confirm allergens and cross-contact with the kitchen.</p></div>${manager()?editButton('+ Add special','specials','',''):''}</div><div class="content-grid">${current('specials').map(s=>`<article class="panel"><div class="card-body"><div class="card-meta">${badge(s.active?'On the menu':'Paused',s.active?'':'gray')}<span class="price">$${s.price.toFixed(2)}</span></div><h3>${e(s.name)}</h3><p>${e(s.description)}</p><div class="notice" style="margin-top:20px;margin-bottom:0"><strong>Ingredient & allergy notes</strong><br>${e(s.allergens)||'Ask the kitchen before advising guests.'}</div>${manager()?`<div class="card-actions">${editButton('Edit special','specials',s.id)}${button(s.active?'Pause special':'Put on menu','toggle',s.id,'data-collection="specials"','quiet')}</div>`:''}</div></article>`).join('')||`<div class="panel full-width">${empty('No specials for this service','A manager can add a dish or drink for the crew to share.')}</div>`}</div>`;}
  function eightySix(){return operationsUI.alertPage();}
  function onboarding(){return operationsUI.briefingPage();}
  function orders(){return `<div class="section-bar"><div><h2>Small requests. Smooth service.</h2><p>Crew request supplies. Managers review, order and confirm receipt. Orders stay visible across shifts.</p></div>${editButton('+ Request supplies','orders','','')}</div><section class="panel"><div class="table-scroll"><table><thead><tr><th>SUPPLY REQUEST</th><th>QUANTITY</th><th>REQUESTED BY</th><th>STATUS</th><th>NEXT STEP</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td><strong>${e(o.name)}</strong><span class="table-detail">${e(o.area)} · ${e(o.note)}</span>${o.feedback?`<span class="table-detail">Manager: ${e(o.feedback)}</span>`:''}</td><td>${o.quantity} ${e(o.unit)}</td><td>${e(B.person(o.author).name)}</td><td>${badge(o.status,o.status==='Requested'?'orange':o.status==='Declined'?'red':'')}</td><td><div class="row-actions">${manager()&&o.status==='Requested'?button('Approve','order-status',o.id,'data-status="Approved"','quiet')+button('Decline','decline',o.id,'','danger'):''}${manager()&&o.status==='Approved'?button('Mark ordered','order-status',o.id,'data-status="Ordered"','quiet'):''}${manager()&&o.status==='Ordered'?button('Mark received','order-status',o.id,'data-status="Received"','quiet'):''}${o.status==='Requested'&&(manager()||o.author===me())?editButton('Edit','orders',o.id):''}${!manager()||['Received','Declined'].includes(o.status)?'<small>'+e(o.status==='Requested'?'Awaiting manager review':o.status==='Received'?'Complete':o.status==='Declined'?'Closed':'Manager is handling this')+'</small>':''}</div></td></tr>`).join('')}</tbody></table></div>${state.orders.length?'':empty('Nothing requested yet','The crew can add a supply request when stock runs low.')}</section>`;}
  function reservations(){
    const allRows=current('reservations').sort((a,b)=>a.time.localeCompare(b.time));
    const active=allRows.filter(r=>!['Cancelled','No-show'].includes(r.status));
    const counts={
      all:allRows.length,
      Confirmed:allRows.filter(r=>r.status==='Confirmed').length,
      Seated:allRows.filter(r=>r.status==='Seated').length,
      Completed:allRows.filter(r=>r.status==='Completed').length,
      closed:allRows.filter(r=>['Cancelled','No-show'].includes(r.status)).length
    };
    const filtered=resFilter==='all'?allRows:resFilter==='closed'?allRows.filter(r=>['Cancelled','No-show'].includes(r.status)):allRows.filter(r=>r.status===resFilter);
    const baseTables=['1','2','3','4','5','6','7','8'];
    for(const r of active){const t=String(r.table||'').trim();if(t&&!baseTables.includes(t))baseTables.push(t);}
    const tableCards=baseTables.map(t=>{
      const seated=active.find(r=>String(r.table||'').trim()===t&&r.status==='Seated');
      const next=active.find(r=>String(r.table||'').trim()===t&&r.status==='Confirmed');
      const tone=seated?'sage':next?'amber':'slate';
      const stateText=seated?'Seated now':next?`Next · ${next.time}`:'Open table';
      const guestText=seated?`${seated.name} · ${seated.guests}p`:next?`${next.name} · ${next.guests}p`:'Available';
      return `<div class="res-table-chip" data-tone="${tone}"><div class="res-table-top"><strong>${e(tableLabel(t))}</strong><span>${e(stateText)}</span></div><small>${e(guestText)}</small></div>`;
    }).join('');
    const filterTabs=[['all','All bookings',counts.all],['Confirmed','Upcoming',counts.Confirmed],['Seated','Seated now',counts.Seated],['Completed','Completed',counts.Completed],['closed','Cancelled / No-show',counts.closed]];
    const statusTone=st=>st==='Seated'?'tone-sage':st==='Confirmed'?'tone-amber':st==='Completed'?'tone-slate':'tone-danger';
    return `<div class="reservations-view"><div class="section-bar"><div><h2>Every guest, a warm welcome</h2><p>${dateLabel(state.date,{weekday:'short',month:'short',day:'numeric'})} · ${e(state.service)} · ${active.reduce((n,r)=>n+r.guests,0)} expected guests across ${active.length} active bookings</p></div>${editButton('+ Add reservation','reservations','','')}</div><div class="res-kpis"><div class="res-kpi"><small>EXPECTED COVERS</small><strong>${active.reduce((n,r)=>n+r.guests,0)} <span>guests</span></strong><p>${active.length} active reservations</p></div><div class="res-kpi"><small>UPCOMING ARRIVALS</small><strong>${counts.Confirmed} <span>tables</span></strong><p>${allRows.filter(r=>r.status==='Confirmed').reduce((n,r)=>n+r.guests,0)} guests to greet</p></div><div class="res-kpi"><small>SEATED IN DINING ROOM</small><strong>${counts.Seated} <span>tables</span></strong><p>${allRows.filter(r=>r.status==='Seated').reduce((n,r)=>n+r.guests,0)} guests currently dining</p></div><div class="res-kpi"><small>COMPLETED / TURNED</small><strong>${counts.Completed} <span>tables</span></strong><p>${counts.closed?counts.closed+' cancelled / no-show':'All tables on schedule'}</p></div></div><section class="panel res-floor-panel"><div class="res-floor-head"><div><h3>Live table status · ${e(state.service)}</h3><p>Two-hour booking window per table · tap any reservation below to seat or update</p></div><div class="res-floor-legend"><span class="badge tone-sage">Seated</span><span class="badge tone-amber">Reserved</span><span class="badge tone-slate">Open</span></div></div><div class="res-table-grid">${tableCards}</div></section><div class="res-filter-bar" role="tablist" aria-label="Filter reservations">${filterTabs.map(([key,label,cnt])=>`<button type="button" class="notif-tab ${resFilter===key?'selected':''}" data-action="res-filter" data-id="${key}" aria-pressed="${resFilter===key}"><span>${e(label)}</span><em>${cnt}</em></button>`).join('')}</div><div class="res-card-list">${filtered.length?filtered.map(r=>`<article class="res-card ${['Cancelled','No-show'].includes(r.status)?'is-closed':''}" data-status="${e(r.status)}"><div class="res-time-col"><strong class="res-time">${e(r.time)}</strong><span class="badge ${statusTone(r.status)}">${e(r.status)}</span></div><div class="res-main-col"><div class="res-guest-line"><h3>${e(r.name)}</h3><span class="arrival-pill">${r.guests} ${r.guests===1?'guest':'guests'}</span><span class="arrival-pill table-pill ${r.table?'':'unassigned'}">${e(tableLabel(r.table))}</span>${r.contact?`<span class="res-contact-pill">${e(r.contact)}</span>`:''}</div>${r.note?`<div class="res-note-callout"><strong>Guest note</strong><span>${e(r.note)}</span></div>`:'<p class="res-no-note">Standard seating · no special requests recorded</p>'}</div><div class="res-actions-col">${r.status==='Confirmed'?button('Seat guest','reservation-status',r.id,'data-status="Seated"','')+editButton('Edit','reservations',r.id)+button('No-show','reservation-status',r.id,'data-status="No-show"','secondary')+button('Cancel','reservation-status',r.id,'data-status="Cancelled"','danger'):''}${r.status==='Seated'?button('Complete visit','reservation-status',r.id,'data-status="Completed"','quiet')+editButton('Edit','reservations',r.id):''}${!['Confirmed','Seated'].includes(r.status)?`<span class="res-closed-tag">${e(r.status)}</span>`:''}</div></article>`).join(''):`<div class="panel">${empty('No reservations in this view','Switch filter tabs above or add a new reservation for this service.')}</div>`}</div></div>`;
  }
  const renderers={private:()=>dutiesUI.render(),schedules,lists,specials,'eighty-six':eightySix,onboarding,orders,reservations};
  function render(){
    const expanded=[...$('view').querySelectorAll('details[open][data-key]')].map(x=>x.dataset.key);
    B.configure(state);
    let viewer=state.team.find(p=>p.id===me());
    if(!viewer?.active)viewer=state.team.find(p=>p.active&&p.access==='crew')||state.team.find(p=>p.active);
    state.role=viewer.access;if(viewer.access==='manager')state.managerId=viewer.id;else state.crewId=viewer.id;
    $('role').innerHTML=state.team.filter(p=>p.active).map(p=>`<option value="${e(p.id)}">${e(p.name)} · ${p.access==='manager'?'Manager':'Crew'}</option>`).join('');
    $('service').innerHTML=state.setup.services.map(x=>`<option value="${e(x.name)}">${e(x.name)}${x.active?'':' (archived)'}</option>`).join('');
    $('role').value=me();$('service-date').value=state.date;$('service').value=state.service;
    $('user-avatar').textContent=B.person(me()).initials;$('page-title').textContent=titles[state.view];$('breadcrumb').textContent=titles[state.view];$('page-description').textContent=descriptions[state.view];document.title=titles[state.view]+' · Brigly';
    renderNotifications();
    summary();$('view').innerHTML=renderers[state.view]();
    const screen=state.view==='schedules'?scheduleUI.screen():state.view;
    const N=BriglyNavigation,groups=N.groups(manager()),serviceMode=N.service(screen),navBadges=N.badges?N.badges(state):{};
    const renderPill=id=>{const b=navBadges[id];return b?`<em class="nav-pill" data-tone="${e(b.tone)}">${e(b.text)}</em>`:'';};
    const navButton=([action,id,label,glyph,tone='slate'],kind='')=>`<button class="${kind} ${N.active(screen,id)?'active':''}" data-tone="${e(tone)}" data-action="${action}" data-id="${id}" ${N.active(screen,id)?'aria-current="page"':''}><span class="nav-icon">${icon(glyph)}</span><span class="nav-label">${e(label)}</span>${renderPill(id)}</button>`;
    $('app-nav').innerHTML=groups.map(group=>'<div class="nav-group"><p>'+group.label+'</p>'+group.items.map(item=>navButton(item)).join('')+'</div>').join('');
    $('bottom-nav').innerHTML=N.primary(manager()).map(([action,id,label,glyph,tone='slate'])=>'<button data-tone="'+e(tone)+'" data-action="'+action+'" data-id="'+id+'" '+(N.active(screen,id)||(id==='onboarding'&&serviceMode&&!['lists','eighty-six'].includes(screen))?'aria-current="page"':'')+'>'+icon(glyph)+'<span>'+label+'</span>'+renderPill(id)+'</button>').join('')+'<button data-tone="slate" data-action="app-menu" '+(['earnings','reports','setup','private','requests','specials','reservations','orders'].includes(screen)?'aria-current="page"':'')+'><span class="more-icon" aria-hidden="true">•••</span><span>More</span></button>';
    $('more-links').innerHTML=groups.map(group=>'<section class="explore-group"><h3>'+group.label+'</h3><div>'+group.items.map(item=>navButton(item,'menu-link')).join('')+'</div></section>').join('');
    const svcItems=N.serviceItems?N.serviceItems():groups[0].items.slice(1);
    $('service-nav').innerHTML=serviceMode?svcItems.map(item=>navButton(item,'service-tab')).join(''):'';
    $('service-nav').hidden=!serviceMode;
    $('sidebar-person').textContent=viewer.name;$('sidebar-access').textContent=manager()?'Manager workspace':'Crew workspace';$('sidebar-avatar').textContent=viewer.initials;
    $('app-menu-title').textContent=matchMedia('(max-width:760px)').matches?'Explore Brigly':'Profile & preferences';
    for(const table of $('view').querySelectorAll('table:not(.schedule-table)')){table.classList.add('responsive-table');const labels=[...table.querySelectorAll('thead th')].map(x=>x.textContent);for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>cell.dataset.label=labels[i]||'');}
    document.body.dataset.role=state.role;document.body.dataset.section=state.view==='schedules'?scheduleUI.screen():state.view;document.body.dataset.view=state.view;$('breadcrumb').textContent=screen==='home'?'Today':screen==='shifts'?(manager()?'Roster':'My schedule'):screen==='earnings'?(manager()?'Labor & pay':'Earnings'):screen==='requests'?(manager()?'Inbox & approvals':'Requests'):screen==='setup'?'Team & setup':screen==='reports'?'Reports':screen==='briefing'?'Shift briefing':titles[state.view];
    document.title=$('breadcrumb').textContent+' · Brigly';if(state.view==='schedules')$('page-title').textContent=$('breadcrumb').textContent;
    updateThemeLabels();
    for(const detail of $('view').querySelectorAll('details[data-key]'))if(expanded.includes(detail.dataset.key))detail.open=true;
  }
  const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
  const textarea=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" ${attrs.includes('maxlength=')?'':'maxlength="2000"'} ${attrs}>${e(value)}</textarea></label>`;
  const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [key,title]=Array.isArray(v)?v:[v,v];return `<option value="${e(key)}" ${key===value?'selected':''}>${e(title)}</option>`;}).join('')}</select></label>`;
  const area=value=>select('area','Station',state.setup.areas,value||state.setup.areas[0]);
  const serviceFields=item=>input('date','Date',item.date||state.date,'date','required')+select('service','Service',state.setup.services.filter(x=>x.active||x.name===item.service).map(x=>x.name),item.service||state.service);
  function showDialog(title,fields){externalDirty=false;$('editor-title').textContent=title;$('editor-fields').innerHTML=fields;for(const table of $('editor-fields').querySelectorAll('table')){table.classList.add('responsive-table');const headers=[...table.querySelectorAll('th')].map(x=>x.textContent);for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>cell.dataset.label=headers[i]||'');}$('form-error').textContent='';$('editor-form').querySelector('[type=submit]').hidden=false;$('editor').showModal();}
  function edit(collection,id,list,station){
    const old=state[collection]?.find(x=>x.id===id),item=old||(collection==='tasks'?{list:list||dutiesUI.listContext().list,area:station||dutiesUI.listContext().area}:{});
    const defaultPerson=state.team.find(p=>p.active&&p.access==='crew')?.id||me();
    const template=state.setup.services.find(x=>x.name===(item.service||state.service)&&(old||x.active))||state.setup.services.find(x=>x.active);
    editing={collection,id:id||crypto.randomUUID()};
    if(collection==='shifts'&&!manager()){
      showDialog('Shift details',`<p><strong>${e(B.person(item.person).name)}</strong><br>${dateLabel(item.date,{month:'long',day:'numeric',year:'numeric'})} · ${e(item.service)}<br>${e(item.start)} – ${e(item.end)} · ${e(item.area)}<br>Ask your manager to change this shift.</p>`);$('editor-form').querySelector('[type=submit]').hidden=true;return;
    }
    const forms={
      shifts:()=>select('person','Team member',B.crew.filter(p=>p.active||p.id===item.person).map(p=>[p.id,p.name]),item.person||defaultPerson)+serviceFields(item)+input('start','Start time',item.start||template.start,'time','required')+input('end','End time',item.end||template.end,'time','required')+area(item.area)+input('payRate','Hourly rate for this shift ($)',item.payRate??state.scheduling.defaults[item.person||defaultPerson].rate,'number','required min="0" max="100000" step="0.01"')+input('breakMinutes','Unpaid break (minutes)',item.breakMinutes??template.breakMinutes,'number','required min="0" max="1439" step="1"')+'<p>An end time earlier than the start finishes the next day. Overlapping assignments are blocked.</p>',
      tasks:()=>input('title','Task',item.title,'text','required maxlength="200"')+select('list','List',['Opening','Closing'],item.list||'Opening')+area(item.area)+'<p>This task is only for the selected date and service. Other shifts keep their own lists.</p>',
      specials:()=>serviceFields(item)+input('name','Special name',item.name,'text','required maxlength="100"')+textarea('description','Description',item.description)+input('price','Price ($)',item.price??'','number','required min="0" max="10000" step="0.01"')+textarea('allergens','Ingredient & allergy notes',item.allergens,'required')+select('active','Availability',[['true','On the menu'],['false','Paused']],String(item.active??true)),
      unavailable:()=>input('name','Unavailable item',item.name,'text','required maxlength="100"')+area(item.area)+textarea('reason','Reason, alternatives or expected return',item.reason,'required')+select('active','Availability',[['true','Unavailable'],['false','Available again']],String(item.active??true)),
      briefings:()=>serviceFields(item)+input('title','Briefing title',item.title,'text','required maxlength="150"')+textarea('body','What does the crew need to know?',item.body,'required')+(old?'<p>Saving a revision will ask everyone to acknowledge this briefing again.</p>':''),
      orders:()=>input('name','Supply item',item.name,'text','required maxlength="100"')+input('quantity','Quantity',item.quantity??1,'number','required min="1" max="10000" step="1"')+input('unit','Unit (boxes, packs, bottles…)',item.unit,'text','required maxlength="40"')+area(item.area)+textarea('note','Why is it needed?',item.note),
      reservations:()=>serviceFields(item)+input('name','Guest name',item.name,'text','required maxlength="100"')+input('guests','Party size',item.guests??2,'number','required min="1" max="20" step="1"')+input('time','Arrival time',item.time||'18:30','time','required')+input('table','Table (optional)',item.table,'text','maxlength="20"')+input('contact','Contact (optional)',item.contact,'text','maxlength="100"')+textarea('note','Guest notes',item.note)
    };
    if(!forms[collection])return;
    const names={shifts:'shift',tasks:'task',specials:'special',unavailable:'86 item',briefings:'briefing',orders:'supply request',reservations:'reservation'};
    showDialog(`${old?'Edit':'Add'} ${names[collection]}`,(old&&collection==='shifts'?'<details class="assignment-settings"><summary>Assignment · '+e(item.start)+'–'+e(item.end)+' · edit times & pay</summary><div>'+forms[collection]()+'</div></details>'+operationsUI.hub(item.date,item.service,true):forms[collection]())+((old&&manager()&&['shifts','tasks'].includes(collection))?button('Remove '+names[collection],'remove',id,`data-collection="${collection}"`,'danger'):''));
  }
  document.addEventListener('click',ev=>{
    const target=ev.target.closest('[data-action]');if(!target)return;
    const {action,id,collection,status}=target.dataset;
    if(target.dataset.notifId){readNotifs.add(target.dataset.notifId);saveReadNotifs();}
    if(action==='notif-open'){$('app-menu')?.close();renderNotifications();$('notif-dialog')?.showModal();return;}
    if(action==='notif-close'){$('notif-dialog')?.close();return;}
    if(action==='notif-filter'){notifFilter=id||'all';renderNotifications();return;}
    if(action==='res-filter'){resFilter=id||'all';render();return;}
    if(action==='notif-read'){if(id)readNotifs.add(id);saveReadNotifs();renderNotifications();render();return;}
    if(action==='notif-read-all'){for(const n of (globalThis.BriglyNotifications?.build(state,readNotifs)||[]))readNotifs.add(n.id);saveReadNotifs();renderNotifications();render();notify('All notifications marked as read.');return;}
    if(action==='notif-go'){
      $('notif-dialog')?.close();$('app-menu')?.close();
      if(target.dataset.screen){state.view='schedules';scheduleUI.show(target.dataset.screen);if(target.dataset.screen==='home')homeUI.entry();}
      else if(target.dataset.view)state.view=target.dataset.view;
      persist();render();window.scrollTo({top:0,behavior:'instant'});return;
    }
    if(action==='notif-task'){
      $('notif-dialog')?.close();$('app-menu')?.close();
      state.view='lists';persist();
      if(target.dataset.area)dutiesUI.listHandle('area',target.dataset.area,{});
      if(target.dataset.list)dutiesUI.listHandle('phase',target.dataset.list,{});
      render();window.scrollTo({top:0,behavior:'instant'});return;
    }
    if(action==='checklist-quick-note'){
      const form=$('editor-form'),box=form?.elements.namedItem('body'),imp=form?.elements.namedItem('important'),stock=form?.elements.namedItem('stockItem');
      if(box){const prefix=box.value&&!box.value.endsWith(' ')?box.value+' ':box.value;box.value=prefix+(target.dataset.text||'');box.focus();}
      if(imp&&target.dataset.important)imp.value=target.dataset.important;
      if(stock&&target.dataset.flag==='focus-86'&&box)box.setSelectionRange(box.value.length,box.value.length);
      return;
    }
    if(action.startsWith('checklist-')){if(['checklist-open','checklist-report-open'].includes(action)){$('notif-dialog')?.close();state.view='lists';persist();}try{dutiesUI.listHandle(action.slice(10),id,target.dataset);}catch(err){notify(err.message);}if(['checklist-open','checklist-report-open'].includes(action))window.scrollTo({top:0,behavior:'instant'});return;}
    if(action.startsWith('private-')){try{dutiesUI.handle(action.slice(8),id);}catch(err){notify(err.message);}return;}
    if(action.startsWith('home-')){homeUI.handle(action.slice(5),id);return;}
    if(action==='app-screen'){state.view='schedules';scheduleUI.show(id);if(id==='home')homeUI.entry();$('app-menu').close();$('notif-dialog')?.close();$('editor').close();persist();render();window.scrollTo({top:0,behavior:'instant'});return;}
    if(action.startsWith('plan-')){try{plannerUI.handle(action.slice(5),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('ops-')){try{operationsUI.handle(action.slice(4),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('schedule-')){scheduleUI.handle(action.slice(9),id);return;}
    if(action==='navigate'){state.view=id;$('notif-dialog')?.close();persist();render();}
    else if(action==='week-prev'||action==='week-next'){const offset=action==='week-prev'?-7:7;week=B.addDays(week,offset);state.date=B.addDays(state.date,offset);persist();render();}
    else if(action==='edit')edit(collection,id,target.dataset.list,target.dataset.station);
    else if(action==='work-create')commit({type:'checklist:create'},'Lists created for this shift.');
    else if(action==='work-empty'){const c=dutiesUI.listContext();editing={type:'checklist:empty',area:c.area,list:c.list};showDialog('Clear '+e(c.area)+' '+c.list.toLowerCase()+' list?','<p>This clears this station’s '+c.list.toLowerCase()+' tasks and completion records for '+e(state.service)+' on '+e(state.date)+'. Other teams and shifts keep their lists.</p>');}
    else if(action==='close')$('editor').close();
    else if(action==='remove'&&collection==='shifts'){plannerUI.handle('remove',id,{});}
    else if(action==='remove'){editing={type:'remove',collection,id};showDialog('Remove this '+(collection==='tasks'?'task':'shift')+'?',`<p>${collection==='tasks'?'This removes the task from this shift only. Other shifts keep their lists.':'This removes the assignment from the team schedule.'}</p>`);}
    else if(action==='toggle')commit({type:'toggle',collection,id},'Availability updated.');
    else if(action==='ack')commit({type:'ack',id},'Briefing acknowledged. You’re ready for service.');
    else if(action==='order-status')commit({type:'order-status',id,status},'Order updated.');
    else if(action==='decline'){editing={type:'decline',id};showDialog('Decline supply request',textarea('feedback','Reason for declining','','required'));}
    else if(action==='reservation-status'){
      if(['Cancelled','No-show'].includes(status)){editing={type:'reservation-status',id,status};showDialog(status==='Cancelled'?'Cancel this reservation?':'Mark this guest as a no-show?',`<p>${e(state.reservations.find(r=>r.id===id).name)} will be marked ${e(status.toLowerCase())} and the table will become available.</p>`);}
      else commit({type:'reservation-status',id,status},'Reservation updated.');
    }
  });
  const extract86=text=>{const m=String(text||'').match(/\b86(?:'d|ed)?\s+(?:on\s+)?([A-Za-z0-9][A-Za-z0-9\s'-]{1,36}?)(?=[.,;!?\n]|$|\s+(?:until|for|today|tonight|we|is|are|and|so|because|instead|in|at))/i);return m?m[1].trim():'';};
  $('editor-form').addEventListener('input',ev=>{
    if(editing?.type!=='checklist:note')return;
    const stock=$('editor-form').elements.namedItem('stockItem');
    if(ev.target.name==='stockItem'&&stock)stock.dataset.manual='true';
    if(ev.target.name==='body'&&stock&&!stock.dataset.manual)stock.value=extract86(ev.target.value);
  });
  document.addEventListener('change',ev=>{
    const t=ev.target;
    scheduleUI.onChange(t);operationsUI.onChange(t);dutiesUI.onChange(t);
    if(t.id==='role'){scheduleUI.show('home');const p=state.team.find(x=>x.id===t.value);state.role=p.access;if(p.access==='manager')state.managerId=p.id;else state.crewId=p.id;state.view='schedules';homeUI.entry();persist();render();}
    if(t.name==='service'&&editing?.collection==='shifts'){const template=state.setup.services.find(x=>x.name===t.value);for(const key of ['start','end','breakMinutes'])$('editor-form').elements.namedItem(key).value=template[key];}
    if(t.name==='person'&&editing?.collection==='shifts'){const rate=$('editor-form').elements.namedItem('payRate');if(rate)rate.value=state.scheduling.defaults[t.value].rate;}
    if(t.id==='service-date'){if(!B.isDate(t.value)){t.value=state.date;return;}state.date=t.value;week=B.monday(state.date);persist();render();}
    if(t.id==='service'){state.service=t.value;persist();render();}
    if(t.dataset.task)commit({type:'check',id:t.dataset.task,done:t.checked,at:new Date().toISOString()},t.checked?'Task completed.':'Task reopened.');
  });
  $('editor-form').addEventListener('submit',ev=>{
    ev.preventDefault();if(!editing||editing.type==='home')return;
    if(externalDirty){$('form-error').textContent='The workspace changed in another tab. Close this dialog and reopen it to review the latest details.';return;}
    const values=Object.fromEntries(new FormData(ev.target));for(const key of Object.keys(values))values[key]=values[key].trim();
    let action;
    if(editing.type==='private')action=dutiesUI.submit(values);
    else if(editing.type==='planner')action=plannerUI.submit(values);
    else if(editing.type==='operations')action=operationsUI.submit(values);
    else if(editing.type==='schedule')action=scheduleUI.submit(values);
    else if(editing.type==='checklist:note')action={type:'checklist:note',task:editing.task,date:editing.date,service:editing.service,id:crypto.randomUUID(),body:values.body,important:values.important==='true',stockItem:values.stockItem||extract86(values.body)};
    else if(editing.type==='checklist:add')action={...editing,titles:values.titles};
    else if(editing.type==='checklist:empty')action={...editing};
    else if(editing.type==='remove')action={...editing};
    else if(editing.type==='reservation-status')action={...editing};
    else if(editing.type==='decline')action={type:'order-status',id:editing.id,status:'Declined',feedback:values.feedback};
    else {
      const {collection,id}=editing,old=state[collection].find(x=>x.id===id);
      for(const key of ['price','quantity','guests','payRate','breakMinutes'])if(key in values)values[key]=Number(values[key]);
      if('active' in values)values.active=values.active==='true';
      action={type:'put',collection,item:{...old,...values,id}};
    }
    try{state=B.change(state,action);const saved=persist();$('editor').close();render();notify(saved?'Changes saved.':'Updated in memory. Browser storage is unavailable.');}catch(err){$('form-error').textContent=err.message;}
  });
  function updateThemeLabels(){const dark=document.documentElement.dataset.theme!=='light';for(const b of document.querySelectorAll('.theme-toggle')){b.setAttribute('aria-label','Switch to '+(dark?'light':'dark')+' mode');if(b.closest('dialog'))b.textContent='Switch to '+(dark?'light':'dark')+' mode';}document.querySelector('meta[name="theme-color"]').content=dark?'#0F1412':'#F6F4EF';}
  document.addEventListener('click',ev=>{const b=ev.target.closest('[data-action]');if(!b)return;
    if(b.dataset.action==='theme'){const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;try{localStorage.setItem('brigly-theme',next);}catch{}updateThemeLabels();}
    if(b.dataset.action==='app-menu')$('app-menu').showModal();
    if(b.dataset.action==='menu-close')$('app-menu').close();
    if(b.dataset.action==='navigate'){$('app-menu').close();window.scrollTo({top:0,behavior:'instant'});}
    if(b.dataset.action==='pick-day'){state.date=b.dataset.id;persist();render();}
  });
  const account=$('role').parentElement;
  $('mobile-account').append(account);
  matchMedia('(max-width:760px)').addEventListener('change',()=>{$('app-menu-title').textContent=matchMedia('(max-width:760px)').matches?'Explore Brigly':'Profile & preferences';});
  const operationsUI=createShiftOperationsUI({createInContext:(collection,date,service)=>{state.date=date;state.service=service;week=B.monday(date);persist();render();edit(collection);},reportScreen:()=>{scheduleUI.show('reports');render();},state:()=>state,e,button,badge,input,textarea,select,dateLabel,render,commit,open:(title,fields)=>{editing={type:'operations'};showDialog(title,fields);},navigate:(view,date,service)=>{scheduleUI.show('briefing');state.view=view;state.date=date;state.service=service;week=B.monday(date);persist();render();}});
  const plannerUI=createPlannerUI({close:()=>$('editor').close(),state:()=>state,week:()=>week,e,button,input,select,dateLabel,render,commit,notify,context:()=>'<div class="home-service-links"><button data-action="navigate" data-id="onboarding"><strong>Service details</strong><span>Notes and onboarding for this service</span><b>›</b></button></div>',serviceForm:()=>operationsUI.handle('service','',{}),open:(title,fields,save=true)=>{editing={type:'planner'};showDialog(title,fields);$('editor-form').querySelector('[type=submit]').hidden=!save;}});
  const dutiesUI=createDutiesUI({focusShift:(date,service)=>{state.date=date;state.service=service;week=B.monday(date);persist();},openTasks:(title,fields,c)=>{editing={type:c.type||'checklist:add',area:c.area,list:c.list,task:c.task,date:c.date,service:c.service};showDialog(title,fields);if(c.readOnly)$('editor-form').querySelector('[type=submit]').hidden=true;},state:()=>state,e,button,input,textarea,select,render,commit,open:(title,fields)=>{editing={type:'private'};showDialog(title,fields);}});
  const homeUI=createShiftHome({pulsePreview:()=>pulsePreview(),privatePreview:()=>dutiesUI.preview(),showHome:()=>{state.view='schedules';scheduleUI.show('home');},state:()=>state,e,dateLabel,render,focus:(date,service)=>{state.date=date;state.service=service;week=B.monday(date);},close:()=>$('editor').close(),open:(title,fields)=>{editing={type:'home'};showDialog(title,fields);$('editor-form').querySelector('[type=submit]').hidden=true;}});
  const scheduleUI=createScheduleUI({state:()=>state,week:()=>week,home:()=>homeUI.render(),e,button,badge,input,textarea,select,dateLabel,roster:()=>manager()?plannerUI.render():roster(),render,commit,extras:()=>operationsUI.extras(),section:key=>operationsUI.section(key),context:(date,service)=>operationsUI.hub(date,service,true),open:(title,fields)=>{editing={type:'schedule'};showDialog(title,fields);}});
  window.addEventListener('storage',event=>{if(event.key===B.KEY){const context={role:state.role,crewId:state.crewId,managerId:state.managerId,date:state.date,service:state.service,view:state.view};state={...B.load(storage),...context};if($('editor').open)externalDirty=true;render();notify('Workspace updated from another tab.');}});
  const aliases={shifts:'schedules',checklists:'lists',briefings:'onboarding',supply:'orders',dashboard:'schedules'};
  const requested=location.hash.slice(1);if(B.views.includes(requested))state.view=requested;else if(aliases[requested])state.view=aliases[requested];
  if(!requested){state.view='schedules';scheduleUI.show('home');homeUI.entry();}
  persist();render();if(!storage)$('save-status').textContent='Storage unavailable. Changes last only while this page is open.';
})();
