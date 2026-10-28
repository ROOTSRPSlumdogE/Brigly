(function(){
  'use strict';
  const B=globalThis.Brigly,$=id=>document.getElementById(id);
  let storage;try{storage=localStorage;}catch{}
  let state=B.load(storage),week=B.monday(state.date),editing=null,toastTimer,externalDirty=false;
  const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const titles={schedules:'Team schedules',lists:'Checklists',specials:'Happenings','eighty-six':'86 board',onboarding:'Shift briefing',orders:'Station supplies',reservations:'Reservations',stock:'Stock',menu:'Menu',pos:'POS'};
  const paths={menu:'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',pos:'M3 7h18v10H3z M3 11h18 M7 15h3',home:'m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',earnings:'M12 2v20 M18 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H5',reports:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',team:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',schedules:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2',lists:'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',specials:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z','eighty-six':'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',onboarding:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',orders:'M3 4h2l3 12h10l3-9H6 M9 20h.1 M18 20h.1',stock:'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',reservations:'M4 9h16v11H4z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8',training:'M12 4 2 9l10 5 10-5-10-5z M6 11.5v4.5c0 1.5 3 3 6 3s6-1.5 6-3v-4.5 M22 9v6',me:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2'};
  let notifFilter='all',readNotifs=new Set(),focusBriefing=false;
  try{const savedRead=JSON.parse(storage?.getItem('brigly-read-notifs')||'[]');if(Array.isArray(savedRead))readNotifs=new Set(savedRead);}catch{}
  const saveReadNotifs=()=>{try{storage?.setItem('brigly-read-notifs',JSON.stringify([...readNotifs].slice(-200)));}catch{}};
  const icon=view=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[view]||paths.schedules}"/></svg>`;
  const manager=()=>state.role==='manager', me=()=>B.actor(state.role,state.crewId,state.managerId);
  // Lead permissions open one part of the back office to a crew member.
  const lead=key=>manager()||!!B.permissions?.can(state,key);
  const current=collection=>state[collection].filter(x=>B.scoped(x,state.date,state.service));
  const dateLabel=(date,options={month:'short',day:'numeric'})=>new Date(date+'T12:00:00').toLocaleDateString('en-US',options);
  const badge=(label,tone='')=>`<span class="badge ${tone}">${e(label)}</span>`;
  const button=(label,action,id='',extra='',style='secondary')=>`<button type="button" class="button ${style}" data-action="${action}" data-id="${e(id)}" ${extra}>${e(label)}</button>`;
  const editButton=(label,collection,id='',style='secondary')=>button(label,'edit',id,`data-collection="${collection}"`,style);
  const empty=(title,body)=>`<div class="empty"><strong>${e(title)}</strong>${e(body)}</div>`;
  const areaClass=area=>area==='Bar'?'bar':area==='Kitchen'?'kitchen':'';
  const checks=()=>state.checks[`${state.date}|${state.service}`]||{};
  // Toasts can carry one Undo so a mis-tap on the floor costs a second, not a correction.
  let toastUndo=null;
  function notify(text,undo){$('toast-text').textContent=text;toastUndo=typeof undo==='function'?undo:null;$('toast-action').hidden=!toastUndo;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('toast').hidden=true;toastUndo=null;},toastUndo?6000:4000);}
  $('toast-action').addEventListener('click',()=>{const undo=toastUndo;toastUndo=null;$('toast').hidden=true;undo?.();});
  function persist(){const ok=B.save(storage,state);$('save-status').textContent=ok?'Saved on this browser.':'Storage unavailable. Changes last only while this page is open.';return ok;}
  function commit(action,message='Changes saved.'){try{state=B.change(state,action);const saved=persist();render();if(message!==null||!saved)notify(saved?message:'Updated in memory. Browser storage is unavailable.');return true;}catch(err){notify(err.message);return false;}}
  function renderNotifAction(a,notifId){
    const extra=[`data-notif-id="${e(notifId)}"`,a.view?`data-view="${e(a.view)}"`:'',a.screen?`data-screen="${e(a.screen)}"`:'',a.area?`data-area="${e(a.area)}"`:'',a.list?`data-list="${e(a.list)}"`:'',a.task?`data-task="${e(a.task)}"`:'',a.tab?`data-tab="${e(a.tab)}"`:''].filter(Boolean).join(' ');
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
  let resFilter='all',specialFilter='all';
  const tableLabel=t=>{const v=String(t||'').trim();if(!v)return 'Unassigned';const parts=v.split('+').map(x=>x.trim()).filter(Boolean);return (parts.length>1?'Tables ':'Table ')+parts.join(' + ');};
  const stationTone=area=>area==='Bar'?'tone-orange':area==='Kitchen'?'tone-slate':'tone-sage';
  function summary(){
    if(['reservations','lists','specials','stock','menu','pos'].includes(state.view)){$('summary').innerHTML='';return;}
    if(state.view==='schedules'){
      if(!manager()||['manage','reports','briefing','home','myfile','training'].includes(scheduleUI.screen())){$('summary').innerHTML='';return;}
      $('summary').innerHTML=scheduleUI.summary();return;
    }
    const assigned=new Set(current('shifts').map(s=>s.person)).size,done=Object.keys(checks()).length;
    const bookings=current('reservations').filter(r=>!['Cancelled','No-show'].includes(r.status));
    const stats=[['Team on shift',assigned,`${state.service} · ${dateLabel(state.date)}`,'schedules'],['Service checklist',`${done}/${B.work.tasks(state).length}`,'Opening & closing tasks','lists'],['Expected guests',bookings.reduce((n,r)=>n+r.guests,0),`${bookings.length} reservations this service`,'reservations'],['Unavailable items',current('unavailable').filter(x=>x.status==='Approved').length,'Check before taking orders','eighty-six']];
    const chosen=state.view==='orders'?[['Awaiting review',state.orders.filter(x=>x.status==='Requested').length,'Crew supply requests','orders'],['In progress',state.orders.filter(x=>['Approved','Ordered'].includes(x.status)).length,'Approved or ordered','orders']]:state.view==='eighty-six'?[stats[3],['Awaiting approval',current('unavailable').filter(x=>x.status==='Reported').length,'Reported by the crew','eighty-six']]:[stats[0],stats[2]];
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
  function specials(){
    const all=current('specials'),active=all.filter(x=>x.active),paused=all.filter(x=>!x.active);
    const specCount=all.filter(x=>!x.kind||x.kind==='special').length;
    const hhCount=all.filter(x=>x.kind==='happy_hour').length;
    const evCount=all.filter(x=>x.kind==='event').length;
    const totalQ=all.reduce((n,x)=>n+(x.questions||[]).length,0);
    const allergenCount=all.filter(x=>x.allergens&&x.allergens.trim()).length;
    const filtered=specialFilter==='active'?active:specialFilter==='paused'?paused:specialFilter==='specials'?all.filter(x=>!x.kind||x.kind==='special'):specialFilter==='happy_hour'?all.filter(x=>x.kind==='happy_hour'):specialFilter==='event'?all.filter(x=>x.kind==='event'):all;
    const tabs=[['all','All happenings',all.length],['specials','Specials',specCount],['happy_hour','Happy Hours',hhCount],['event','Events',evCount],['active','On the menu',active.length],['paused','Paused',paused.length]];
    const approved86=current('unavailable').filter(x=>x.status==='Approved');
    return `<div class="specials-view"><div class="section-bar"><div><p class="eyebrow">DAILY HAPPENINGS &amp; SERVICE HIGHLIGHTS</p><h2>Happenings for ${e(state.service.toLowerCase())}</h2><p>${dateLabel(state.date,{weekday:'short',month:'short',day:'numeric'})} · Confirm ingredients, allergens, and cross-contact with the kitchen and bar before advising guests.</p></div><div class="toolbar">${manager()?button('Specials report & history ›','ops-report-tab','specials','','secondary'):''}${lead('happenings')?editButton('+ Add happening','specials','',''):''}</div></div><div class="res-kpis"><div class="res-kpi"><small>TOTAL HAPPENINGS</small><strong>${active.length} <span>active</span></strong><p>${paused.length?paused.length+' paused for this service':'All live for service'}</p></div><div class="res-kpi"><small>HAPPY HOUR &amp; EVENTS</small><strong>${hhCount+evCount} <span>scheduled</span></strong><p>${hhCount} happy hour · ${evCount} event</p></div><div class="res-kpi"><small>ALLERGY GUIDANCE</small><strong>${allergenCount}/${all.length} <span>documented</span></strong><p>Always verify cross-contact with kitchen</p></div><div class="res-kpi"><small>CREW QUESTIONS</small><strong>${totalQ} <span>asked</span></strong><p>Ask &amp; answer questions before service</p></div></div><div class="res-filter-bar" role="tablist" aria-label="Filter specials">${tabs.map(([key,label,cnt])=>`<button type="button" class="notif-tab ${specialFilter===key?'selected':''}" data-action="special-filter" data-id="${key}" aria-pressed="${specialFilter===key}"><span>${e(label)}</span><em>${cnt}</em></button>`).join('')}</div><div class="special-feature-grid">${filtered.length?filtered.map(s=>{
      const kTag=s.kind==='happy_hour'?'Happy Hour':s.kind==='event'?'Event':'Special';
      const priceStr=s.price>0?'$'+Number(s.price).toFixed(2):(s.kind==='event'?'Free entry':'$0.00');
      const qs=s.questions||[];
      return `<article class="special-feature-card ${s.active?'is-active':'is-paused'}" data-kind="${e(s.kind||'special')}"><div class="special-card-head"><div class="special-card-badges"><span class="td-tag" data-tone="${s.kind==='happy_hour'?'orange':s.kind==='event'?'sage':'amber'}">${kTag}</span>${badge(s.active?'On the menu':'Paused',s.active?'tone-sage':'tone-slate')}<span class="arrival-pill">${e(state.service)} · ${dateLabel(state.date)}</span>${s.time?`<span class="arrival-pill happening-time-badge">⏰ ${e(s.time)}</span>`:''}</div><span class="special-price-tag td-price">${priceStr}</span></div><h3>${e(s.name)}</h3><p class="special-desc">${e(s.description||'Ask the kitchen or bar for tasting notes.')}</p><div class="special-allergen-callout"><div class="special-allergen-label"><span>!</span><strong>${s.kind==='happy_hour'?'Happy hour terms & seating':s.kind==='event'?'Event staging & timetable':'Ingredient & allergy guidance'}</strong></div><p>${e(s.allergens)||'Ask the kitchen directly before advising guests on allergens.'}</p></div><div class="happening-qa-section" id="qa-sec-${s.id}"><div class="happening-qa-header"><strong>💬 Crew Q&amp;A (${qs.length})</strong><button type="button" class="button quiet small qa-ask-toggle-btn" data-action="qa-toggle-ask" data-id="${s.id}">+ Ask a question</button></div><form class="happening-qa-form is-hidden" id="qa-form-${s.id}" data-action="qa-submit-question" data-id="${s.id}"><div class="qa-form-row"><input type="text" name="qaText" placeholder="Ask about ingredients, timing, tables..." required maxlength="500"><button type="submit" class="button small">Ask</button><button type="button" class="button secondary small" data-action="qa-toggle-ask" data-id="${s.id}">Cancel</button></div></form><div class="happening-qa-list">${qs.length?qs.map(q=>`<div class="qa-item"><div class="qa-q-row"><span class="avatar">${e(B.person(q.author)?.initials||'TM')}</span><div class="qa-q-content"><div class="qa-author-stamp"><strong>${e(B.person(q.author)?.name||'Team member')}</strong><small>${q.at?new Date(q.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):''}</small></div><p>${e(q.text)}</p></div></div>${q.answer?`<div class="qa-a-row"><span class="avatar is-mgr">${e(B.person(q.answer.author)?.initials||'M')}</span><div class="qa-a-content"><div class="qa-author-stamp"><strong>${e(B.person(q.answer.author)?.name||'Manager / Chef')}</strong><span class="badge tone-sage">✓ Answer</span><small>${q.answer.at?new Date(q.answer.at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):''}</small></div><p>${e(q.answer.text)}</p></div></div>`:`<div class="qa-reply-row"><span class="badge orange">Awaiting answer</span><button type="button" class="button quiet small" data-action="qa-toggle-reply" data-special-id="${s.id}" data-id="${q.id}">Reply / Answer</button></div><form class="qa-reply-form is-hidden" id="qa-reply-${s.id}-${q.id}" data-action="qa-submit-reply" data-special-id="${s.id}" data-id="${q.id}"><div class="qa-form-row"><input type="text" name="replyText" placeholder="Write answer for the team..." required maxlength="500"><button type="submit" class="button small">Answer</button><button type="button" class="button secondary small" data-action="qa-toggle-reply" data-special-id="${s.id}" data-id="${q.id}">Cancel</button></div></form>`}</div>`).join(''):'<p class="qa-empty">No questions yet. Any team member can ask about ingredients, prep, or table policies.</p>'}</div></div>${lead('happenings')?`<div class="card-actions special-card-actions">${editButton('Edit happening','specials',s.id)}${button(s.active?'Pause happening':'Put on menu','toggle',s.id,'data-collection="specials"',s.active?'quiet':'')}</div>`:''}</article>`;
    }).join(''):`<div class="panel full-width">${empty('No specials in this view','Switch filter tabs above or add a dish or drink for the team to share.')}</div>`}</div></div>`;
  }
  // The reservations screen (floor map, bookings, guests, layout editor) lives in floor-ui.js; the list below stays as a fallback when it is not loaded.
  function reservations(){
    if(floorUI)return floorUI.render();
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
    return `<div class="reservations-view"><div class="section-bar"><div><h2>Every guest, a warm welcome</h2><p>${dateLabel(state.date,{weekday:'short',month:'short',day:'numeric'})} · ${e(state.service)} · ${active.reduce((n,r)=>n+r.guests,0)} expected guests across ${active.length} active bookings</p></div><div class="toolbar">${manager()?button('Reservations report ›','ops-report-tab','reservations','','secondary'):''}${(B.permissions.can(state,'reservations')?editButton('+ Add reservation','reservations','',''):'')}</div></div><div class="res-kpis"><div class="res-kpi"><small>EXPECTED COVERS</small><strong>${active.reduce((n,r)=>n+r.guests,0)} <span>guests</span></strong><p>${active.length} active reservations</p></div><div class="res-kpi"><small>UPCOMING ARRIVALS</small><strong>${counts.Confirmed} <span>tables</span></strong><p>${allRows.filter(r=>r.status==='Confirmed').reduce((n,r)=>n+r.guests,0)} guests to greet</p></div><div class="res-kpi"><small>SEATED IN DINING ROOM</small><strong>${counts.Seated} <span>tables</span></strong><p>${allRows.filter(r=>r.status==='Seated').reduce((n,r)=>n+r.guests,0)} guests currently dining</p></div><div class="res-kpi"><small>COMPLETED / TURNED</small><strong>${counts.Completed} <span>tables</span></strong><p>${counts.closed?counts.closed+' cancelled / no-show':'All tables on schedule'}</p></div></div><section class="panel res-floor-panel"><div class="res-floor-head"><div><h3>Live table status · ${e(state.service)}</h3><p>Two-hour booking window per table · tap any reservation below to seat or update</p></div><div class="res-floor-legend"><span class="badge tone-sage">Seated</span><span class="badge tone-amber">Reserved</span><span class="badge tone-slate">Open</span></div></div><div class="res-table-grid">${tableCards}</div></section><div class="res-filter-bar" role="tablist" aria-label="Filter reservations">${filterTabs.map(([key,label,cnt])=>`<button type="button" class="notif-tab ${resFilter===key?'selected':''}" data-action="res-filter" data-id="${key}" aria-pressed="${resFilter===key}"><span>${e(label)}</span><em>${cnt}</em></button>`).join('')}</div><div class="res-card-list">${filtered.length?filtered.map(r=>`<article class="res-card ${['Cancelled','No-show'].includes(r.status)?'is-closed':''}" data-status="${e(r.status)}"><div class="res-time-col"><strong class="res-time">${e(r.time)}</strong><span class="badge ${statusTone(r.status)}">${e(r.status)}</span></div><div class="res-main-col"><div class="res-guest-line"><h3>${e(r.name)}</h3><span class="arrival-pill">${r.guests} ${r.guests===1?'guest':'guests'}</span><span class="arrival-pill table-pill ${r.table?'':'unassigned'}">${e(tableLabel(r.table))}</span>${r.contact?`<span class="res-contact-pill">${e(r.contact)}</span>`:''}</div>${r.note?`<div class="res-note-callout"><strong>Guest note</strong><span>${e(r.note)}</span></div>`:'<p class="res-no-note">Standard seating · no special requests recorded</p>'}</div><div class="res-actions-col">${r.status==='Confirmed'?button('Seat guest','reservation-status',r.id,'data-status="Seated"','')+editButton('Edit','reservations',r.id)+button('No-show','reservation-status',r.id,'data-status="No-show"','secondary')+button('Cancel','reservation-status',r.id,'data-status="Cancelled"','danger'):''}${r.status==='Seated'?button('Complete visit','reservation-status',r.id,'data-status="Completed"','quiet')+editButton('Edit','reservations',r.id):''}${!['Confirmed','Seated'].includes(r.status)?`<span class="res-closed-tag">${e(r.status)}</span>`:''}</div></article>`).join(''):`<div class="panel">${empty('No reservations in this view','Switch filter tabs above or add a new reservation for this service.')}</div>`}</div></div>`;
  }
  const renderers={schedules,lists,specials,reservations,stock:()=>stockUI.render(),menu:()=>menuUI.render(),pos:()=>posUI.render()};
  // The command bar always shows which shift you are working on; service screens follow it, roster and pay follow its date.
  const serviceOf=name=>state.setup.services.find(x=>x.name===name);
  function liveNow(date,service){const v=serviceOf(service);if(!v)return false;const start=new Date(date+'T'+v.start+':00').getTime(),now=Date.now();return now>=start&&now<start+B.duration(v)*60000;}
  function dayWord(date){const t=B.dateString(new Date());return date===t?'Today':date===B.addDays(t,1)?'Tomorrow':date===B.addDays(t,-1)?'Yesterday':'';}
  function paintContext(screen){
    // The manager roster has its own week switcher, so the bar stays out of its way there.
    const mode=['home','briefing','lists','stock','specials','reservations','menu','pos'].includes(screen)?'service':screen==='earnings'||(screen==='shifts'&&!manager())?'date':'';
    document.body.dataset.ctx=mode||'none';$('tb-context').hidden=!mode;if(!mode)return;
    const word=dayWord(state.date),day=word?word+', '+dateLabel(state.date):dateLabel(state.date,{weekday:'short',month:'short',day:'numeric'});
    $('tb-ctx-label').textContent=mode==='service'?day+' · '+state.service:screen==='shifts'?'Week of '+dateLabel(B.monday(state.date)):day;
    const live=mode==='service'&&liveNow(state.date,state.service);$('tb-live').hidden=!live;
    $('tb-ctx').setAttribute('aria-label','Working on '+$('tb-ctx-label').textContent+(live?', live now':'')+'. Change');
    for(const b of document.querySelectorAll('.tb-step'))b.setAttribute('aria-label',(b.dataset.step==='-1'?'Previous ':'Next ')+(screen==='shifts'?'week':'day'));
  }
  function paintShiftPicker(){
    const mode=document.body.dataset.ctx,today=B.dateString(new Date()),seen=new Set();
    $('ctx-dialog').dataset.mode=mode;$('service-date').value=state.date;
    $('ctx-services').innerHTML=mode==='service'?'<p class="ctx-label">Service</p><div class="ctx-svc-grid">'+state.setup.services.filter(x=>x.active||x.name===state.service).map(x=>`<button type="button" class="ctx-svc" data-action="ctx-service" data-id="${e(x.name)}" aria-pressed="${x.name===state.service}"><strong>${e(x.name)}</strong><small>${e(x.start)}–${e(x.end)}</small>${liveNow(state.date,x.name)?'<em class="ctx-live">Live</em>':''}</button>`).join('')+'</div>':'';
    const list=state.shifts.filter(x=>(manager()||x.person===me())&&(x.date>=today||(x.date===B.addDays(today,-1)&&liveNow(x.date,x.service)))&&x.date<=B.addDays(today,13)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).filter(x=>{const k=x.date+'|'+x.service;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,8);
    $('ctx-shifts').innerHTML=mode!=='service'?'':(list.length?`<p class="ctx-label">${manager()?'Coming up':'Your shifts'}</p>`+list.map(x=>{const cur=x.date===state.date&&x.service===state.service,live=liveNow(x.date,x.service),v=serviceOf(x.service);return `<button type="button" class="ctx-shift" data-action="ctx-pick" data-date="${e(x.date)}" data-service="${e(x.service)}" aria-current="${cur}"><span class="ctx-shift-day"><strong>${e(dateLabel(x.date,{day:'numeric'}))}</strong><small>${e(dateLabel(x.date,{weekday:'short'}))}</small></span><span class="ctx-shift-text"><strong>${e(dayWord(x.date)||dateLabel(x.date,{weekday:'long'}))} · ${e(x.service)}</strong><small>${manager()?e((v?.start||x.start)+'–'+(v?.end||x.end)):e(x.start+'–'+x.end+' · '+x.area)}</small></span>${live?'<em class="ctx-live">Live</em>':cur?'<em>Selected</em>':''}</button>`;}).join(''):'')+`<button type="button" class="ctx-more" data-action="app-screen" data-id="shifts">${manager()?'Open the roster':'Open my full schedule'}<span aria-hidden="true">›</span></button>`;
  }
  function openShiftPicker(){paintShiftPicker();if(!$('ctx-dialog').open)$('ctx-dialog').showModal();($('ctx-services').querySelector('[aria-pressed="true"]')||$('service-date')).focus({preventScroll:true});}
  function openOnboardingModal(briefId){
    const b=state.briefings.find(x=>x.id===briefId)||state.briefings.find(x=>x.date===state.date&&x.service===state.service);
    const team=state.shifts.filter(x=>x.date===state.date&&x.service===state.service);
    const shift=team.find(x=>x.person===me());
    const isMgr=manager();
    const ackedByMe=b?(b.acks.includes(me())||b.author===me()):false;
    const happenings=state.specials.filter(x=>x.date===state.date&&x.service===state.service&&x.active);
    const alerts=state.unavailable.filter(x=>x.date===state.date&&x.service===state.service&&x.status==='Approved');

    // Approval status calculation
    const authorIsMgr=state.team.find(p=>p.id===b?.author)?.access==='manager';
    const appStatus=b?.approvalStatus||(authorIsMgr?'Approved':'Pending');
    const approverName=b?.approvedBy?(state.team.find(p=>p.id===b.approvedBy)?.name||'Manager'):(authorIsMgr?(state.team.find(p=>p.id===b.author)?.name||'Manager'):'');
    const appTime=b?.approvedAt?new Date(b.approvedAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'15:30';
    const appTone=appStatus==='Approved'?'sage':appStatus==='Late approved'?'amber':'orange';
    const appBadge=appStatus==='Approved'?'✓ Manager Approved · On-Time':appStatus==='Late approved'?'⚠️ Late Approved':'⏳ Awaiting Manager Approval';

    // 1. Identify previous shift
    const activeServices=state.setup.services.filter(x=>x.active);
    const sIdx=activeServices.findIndex(x=>x.name===state.service);
    let prevDate=state.date,prevService='';
    if(sIdx>0){
      prevService=activeServices[sIdx-1].name;
    }else if(activeServices.length){
      prevService=activeServices[activeServices.length-1].name;
      prevDate=B.addDays(state.date,-1);
    }

    // Previous shift tasks, checks, notes & alerts
    const prevTasks=(B.work&&prevService)?B.work.tasks(state,prevDate,prevService):[];
    const prevChecks=state.checks[`${prevDate}|${prevService}`]||{};
    const uncompletedRolloverTasks=prevTasks.filter(t=>t.rollover&&!prevChecks[t.id]);
    const uncompletedNonRolloverTasks=prevTasks.filter(t=>!t.rollover&&!prevChecks[t.id]);
    const uncompletedPrevTasks=uncompletedRolloverTasks;
    const prevNotes=(state.shiftNotes||[]).filter(n=>n.date===prevDate&&n.service===prevService&&!n.archived);
    const prevAlerts=(state.unavailable||[]).filter(a=>a.date===prevDate&&a.service===prevService&&a.active);

    // Current shift directives, notes & to-dos
    const curNotes=(state.shiftNotes||[]).filter(n=>n.date===state.date&&n.service===state.service&&!n.archived);
    const allTodos=B.chat?B.chat.todos(state):[];
    const myTodos=allTodos.filter(t=>isMgr||t.todo.for===me()||!t.todo.for);

    // Current shift reservations
    const allRes=(state.reservations||[]).filter(r=>r.date===state.date&&r.service===state.service);
    const activeRes=allRes.filter(r=>!['Cancelled','No-show'].includes(r.status));
    const totalCovers=activeRes.reduce((sum,r)=>sum+(r.guests||0),0);

    let html=`<div class="onboard-modal-shell">`;

    // 1. Hero banner with shift assignment & team
    html+=`<div class="onboard-hero-banner ${ackedByMe?'is-complete':'is-action-needed'}">
      <div class="onboard-hero-text">
        <div class="onboard-hero-badges">
          <span class="eyebrow">${ackedByMe?'✓ SHIFT ONBOARDED':'⚠️ ONBOARDING REQUIRED BEFORE SERVICE'}</span>
          <span class="badge tone-${appTone}">${appBadge}</span>
        </div>
        <h3>${dateLabel(state.date,{weekday:'long',month:'short',day:'numeric'})} · ${e(state.service)}</h3>
        <p>${shift?`You are assigned to <strong>${e(shift.area)}</strong> (${e(shift.start)}–${e(shift.end)})`:`Manager overview · ${team.length} scheduled on shift`}</p>
        <div class="onboard-team-strip">
          <small>Team on shift (${team.length}):</small>
          ${team.map(m=>`<span class="onboard-team-pill" title="${e(B.person(m.person)?.name||'Teammate')} · ${e(m.area)}">${e(B.person(m.person)?.initials||'TM')} <small>${e(m.area)}</small></span>`).join('')}
        </div>
      </div>
      <span class="badge ${ackedByMe?'tone-sage':'orange'}">${ackedByMe?'Ready for Service':'Needs Acknowledgment'}</span>
    </div>`;

    // 2. Manager Pre-Approval Shortcuts & Controls (Manager view) OR Approval Callout (Crew view)
    if(isMgr){
      html+=`<section class="onboard-section onboard-mgr-box">
        <div class="onboard-sec-head">
          <div class="onboard-sec-split">
            <div>
              <span class="eyebrow">MANAGER PRE-APPROVAL SHORTCUTS &amp; STATUS</span>
              <h4>Service Sign-Off &amp; Quick Adjustments</h4>
            </div>
            <span class="badge tone-${appTone}">${appBadge}</span>
          </div>
        </div>
        <div class="onboard-mgr-content">
          <p class="onboard-mgr-desc">Quickly adjust any part of tonight’s service plan before giving official approval to the crew:</p>
          <div class="onboard-mgr-shortcuts">
            <span class="onboard-sub-title">⚡ Quick Edit Shortcuts:</span>
            <div class="onboard-mgr-btns">
              <button type="button" class="button secondary small" data-action="edit" data-collection="briefings" data-id="${e(b?.id)}">✏️ Edit Briefing</button>
              <button type="button" class="button secondary small" data-action="ops-note" data-date="${state.date}" data-service="${state.service}">📌 Add Priority Note</button>
              <button type="button" class="button secondary small" data-action="edit" data-collection="specials">🌟 Add Happening</button>
              <button type="button" class="button secondary small" data-action="ops-alert">🛑 Report 86</button>
              <button type="button" class="button secondary small" data-action="chat-new">📋 Assign To-Do</button>
              <button type="button" class="button secondary small" data-action="manage-rollovers">🔄 Define Rollover Tasks</button>
            </div>
          </div>
          <div class="onboard-approval-actions-bar">
            <div class="onboard-approval-current">
              <small>Manager Approval Status:</small>
              <strong>${appStatus==='Approved'?`✓ Approved on-time by ${approverName} (${appTime})`:appStatus==='Late approved'?`⚠️ Late approved by ${approverName} (${appTime} · after service start)`:'⏳ Pending review · Crew has not received official manager sign-off'}</strong>
            </div>
            <div class="onboard-approval-ctas">
              ${appStatus !== 'Approved' ? `<button type="button" class="button small onboarding-approve-btn" data-action="ops-approve-briefing" data-id="${e(b?.id)}" data-status="Approved">✓ Approve Onboarding (On-Time)</button>` : ''}
              ${appStatus !== 'Late approved' ? `<button type="button" class="button secondary small onboarding-late-btn" data-action="ops-approve-briefing" data-id="${e(b?.id)}" data-status="Late approved">Mark Late Approved</button>` : ''}
              ${appStatus !== 'Pending' ? `<button type="button" class="button quiet small" data-action="ops-approve-briefing" data-id="${e(b?.id)}" data-status="Pending">Hold / Set Pending</button>` : ''}
            </div>
          </div>
        </div>
      </section>`;
    }else{
      html+=`<div class="onboard-crew-approval-callout ${appStatus==='Approved'?'is-approved':appStatus==='Late approved'?'is-late':'is-pending'}">
        <div class="onboard-callout-icon">${appStatus==='Approved'?'✓':appStatus==='Late approved'?'⚠️':'⏳'}</div>
        <div class="onboard-callout-text">
          <strong>${appStatus==='Approved'?'Manager Approved Service Plan':appStatus==='Late approved'?'Late Approved Service Plan':'Awaiting Manager Approval'}</strong>
          <p>${appStatus==='Approved'?`Officially approved by ${approverName} (${appTime}) · Service ready`:appStatus==='Late approved'?`Approved after service start by ${approverName} (${appTime})`:'This onboarding is in draft / pending review and has not yet received manager sign-off.'}</p>
        </div>
        <span class="badge tone-${appTone}">${appBadge}</span>
      </div>`;
    }

    // 3. Handover from Last Shift
    html+=`<section class="onboard-section">
      <div class="onboard-sec-head">
        <span class="eyebrow">SHIFT HANDOVER</span>
        <h4>Handover from ${e(prevService)} (${dateLabel(prevDate,{weekday:'short',month:'short',day:'numeric'})})</h4>
      </div>`;

    if(uncompletedRolloverTasks.length){
      html+=`<div class="onboard-handover-alert warn">
        <div class="onboard-alert-head">
          <span class="badge danger">⚠️ Rollover Tasks</span>
          <strong>${uncompletedRolloverTasks.length} manager-designated rollover ${uncompletedRolloverTasks.length===1?'task requires':'tasks require'} completion:</strong>
        </div>
        <p class="onboard-rollover-desc">These critical duties were designated by management to roll over if incomplete from ${e(prevService)}:</p>
        <ul class="onboard-rollover-list">
          ${uncompletedRolloverTasks.slice(0,6).map(t=>`<li><span class="td-tag" data-tone="${t.area==='Bar'?'orange':t.area==='Kitchen'?'slate':'sage'}">${e(t.area)}</span> <strong>${e(t.title)}</strong> <span class="badge tone-amber">Rollover Duty</span> <small>(${e(t.list)})</small></li>`).join('')}
        </ul>
        ${uncompletedNonRolloverTasks.length?`<p class="onboard-non-rollover-note"><small>ℹ️ ${uncompletedNonRolloverTasks.length} standard shift-specific ${uncompletedNonRolloverTasks.length===1?'duty was':'duties were'} not completed but not designated for handover rollover.</small></p>`:''}
      </div>`;
    }else if(prevTasks.length){
      html+=`<div class="onboard-handover-alert ok">
        <span class="badge tone-sage">✓ Rollover Tasks Clear</span>
        <span>All manager-designated rollover tasks from ${e(prevService)} were completed before handover.${uncompletedNonRolloverTasks.length?' ('+uncompletedNonRolloverTasks.length+' non-rollover duties expired)':''}</span>
      </div>`;
    }

    if(prevNotes.length){
      html+=`<div class="onboard-notes-sub">
        <span class="onboard-sub-title">📝 Handover Notes from ${e(prevService)}:</span>
        <div class="onboard-notes-list">
          ${prevNotes.map(n=>`<div class="onboard-note-bubble ${n.priority==='manager'?'is-mgr':'is-crew'}">
            <div class="onboard-note-meta">
              <strong>${e(B.person(n.author)?.name||'Team member')}</strong>
              <span class="td-tag" data-tone="${n.priority==='manager'?'orange':'slate'}">${n.priority==='manager'?'Manager Directives':'Crew Handover'}</span>
            </div>
            <p>${e(n.body)}</p>
          </div>`).join('')}
        </div>
      </div>`;
    }else{
      html+=`<p class="onboard-empty-sub">No handover notes left from ${e(prevService)}.</p>`;
    }

    if(prevAlerts.length){
      html+=`<div class="onboard-prev-86">
        <span class="badge orange">Rollover 86</span>
        <span>Items marked 86 during ${e(prevService)}: <b>${prevAlerts.map(a=>e(a.name)).join(', ')}</b></span>
      </div>`;
    }
    html+=`</section>`;

    // 4. Manager Pre-Shift Briefing & Current Shift Notes
    if(b||curNotes.length){
      html+=`<section class="onboard-section">
        <div class="onboard-sec-head">
          <span class="eyebrow">THIS SHIFT’S DIRECTIVES</span>
          <h4>Briefing &amp; Manager Notes for ${e(state.service)}</h4>
        </div>`;
      if(b){
        html+=`<div class="onboard-briefing-card">
          <div class="onboard-briefing-head">
            <strong>📢 ${e(b.title)}</strong>
            <small>Posted by ${e(B.person(b.author)?.name||'Manager')} · Rev ${b.revision}</small>
          </div>
          <div class="onboard-briefing-text">${e(b.body)}</div>
        </div>`;
      }
      if(curNotes.length){
        html+=`<div class="onboard-notes-sub">
          <span class="onboard-sub-title">📌 Shift Priority Notes:</span>
          <div class="onboard-notes-list">
            ${curNotes.map(n=>`<div class="onboard-note-bubble ${n.priority==='manager'?'is-mgr':'is-crew'}">
              <div class="onboard-note-meta">
                <strong>${e(B.person(n.author)?.name||'Team member')}</strong>
                <span class="td-tag" data-tone="${n.priority==='manager'?'orange':'slate'}">${n.priority==='manager'?'Manager Note':'Crew Note'}</span>
              </div>
              <p>${e(n.body)}</p>
            </div>`).join('')}
          </div>
        </div>`;
      }
      html+=`</section>`;
    }

    // 5. Manager To-Dos
    if(myTodos.length){
      html+=`<section class="onboard-section">
        <div class="onboard-sec-head">
          <span class="eyebrow">ACTION TO-DOS</span>
          <h4>${isMgr?'Open Manager To-Dos':'Your To-Dos from Manager'} (${myTodos.length})</h4>
        </div>
        <div class="onboard-todos-list">
          ${myTodos.map(t=>`<div class="onboard-todo-card">
            <div class="onboard-todo-left">
              <span class="todo-check-icon">☐</span>
              <div class="onboard-todo-main">
                <strong>${e(t.body)}</strong>
                <div class="onboard-todo-meta">
                  <span>From <b>${e(B.person(t.author)?.name||'Manager')}</b></span>
                  ${t.todo.for?`<span>For <b>${e(B.person(t.todo.for)?.name||'You')}</b></span>`:''}
                  ${t.todo.due?`<span class="arrival-pill">Due ${dateLabel(t.todo.due,{month:'short',day:'numeric'})}</span>`:''}
                </div>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </section>`;
    }

    // 6. Reservations & Key Guest Alerts for Tonight
    html+=`<section class="onboard-section">
      <div class="onboard-sec-head">
        <div class="onboard-sec-split">
          <div>
            <span class="eyebrow">RESERVATIONS &amp; GUEST FLOW</span>
            <h4>Tonight’s Bookings &amp; VIP Notes</h4>
          </div>
          <span class="badge tone-sage">${totalCovers} guests · ${activeRes.length} tables</span>
        </div>
      </div>`;

    if(activeRes.length){
      html+=`<div class="onboard-res-list">
        ${activeRes.map(r=>{
          const hasNote=r.note&&r.note.trim();
          const isLarge=r.guests>=4;
          return `<div class="onboard-res-card ${hasNote||isLarge?'is-highlight':''}">
            <div class="onboard-res-main">
              <div class="onboard-res-time-col">
                <strong>${e(r.time)}</strong>
                <span class="arrival-pill table-pill">${e(r.table?'Table '+r.table:'Unassigned')}</span>
              </div>
              <div class="onboard-res-party-col">
                <div class="onboard-res-name-row">
                  <strong>${e(r.name)}</strong>
                  <span class="arrival-pill">${r.guests} ${r.guests===1?'guest':'guests'}</span>
                  ${isLarge?'<span class="td-tag" data-tone="orange">Large Party</span>':''}
                </div>
                ${hasNote?`<div class="onboard-res-guest-note">⭐ <b>Guest Note:</b> ${e(r.note)}</div>`:'<small class="onboard-res-standard">Standard reservation · no special requests</small>'}
              </div>
            </div>
            <span class="badge ${r.status==='Seated'?'tone-sage':r.status==='Confirmed'?'tone-amber':'tone-slate'}">${e(r.status)}</span>
          </div>`;
        }).join('')}
      </div>`;
    }else{
      html+=`<p class="td-empty">No reservations booked for ${e(state.service)} yet.</p>`;
    }
    html+=`</section>`;

    // 7. Happenings (Specials, Happy Hours & Events)
    html+=`<section class="onboard-section">
      <div class="onboard-sec-head">
        <span class="eyebrow">TODAY’S HAPPENINGS</span>
        <h4>Specials, Happy Hours &amp; Events (${happenings.length})</h4>
      </div>
      ${happenings.length?`<div class="onboard-happenings-list">${happenings.map(h=>{
        const kTag=h.kind==='happy_hour'?'Happy Hour':h.kind==='event'?'Event':'Special';
        const kTone=h.kind==='happy_hour'?'orange':h.kind==='event'?'sage':'amber';
        const priceStr=h.price>0?'$'+Number(h.price).toFixed(2):(h.kind==='event'?'Free entry':'');
        return `<div class="onboard-happening-item">
          <div class="onboard-h-top">
            <span class="td-tag" data-tone="${kTone}">${kTag}</span>
            <strong>${e(h.name)}</strong>
            ${priceStr?`<span class="special-price-tag">${priceStr}</span>`:''}
            ${h.time?`<span class="arrival-pill">⏰ ${e(h.time)}</span>`:''}
          </div>
          ${h.description?`<p>${e(h.description)}</p>`:''}
          <small class="onboard-h-guidance"><b>${h.kind==='happy_hour'?'Rules:':h.kind==='event'?'Staging:':'Allergens:'}</b> ${e(h.allergens||'Verify with kitchen/bar')}</small>
        </div>`;
      }).join('')}</div>`:'<p class="td-empty">No happenings posted for tonight yet.</p>'}
    </section>`;

    // 8. Confirmed 86 Board
    html+=`<section class="onboard-section">
      <div class="onboard-sec-head">
        <span class="eyebrow">CONFIRMED 86 LIST</span>
        <h4>Sold-Out Items (${alerts.length})</h4>
      </div>
      ${alerts.length?`<div class="onboard-alerts-list">${alerts.map(a=>`<div class="onboard-alert-chip">
        <span class="badge danger">86’d</span>
        <strong>${e(a.name)}</strong>
        <span class="td-tag" data-tone="${a.area==='Bar'?'orange':a.area==='Kitchen'?'slate':'sage'}">${e(a.area)}</span>
        <small>${e(a.reason)}</small>
      </div>`).join('')}</div>`:'<p class="td-empty">Full regular menu available. Nothing is 86’d.</p>'}
    </section>`;

    // 9. Footer CTA
    html+=`<div class="onboard-modal-footer">`;
    if(!ackedByMe&&b&&(shift||!isMgr)){
      html+=`<button type="button" class="button large td-onboard-sheet-ack" data-action="ack" data-id="${e(b.id)}">✓ I’ve read it · Confirm Shift Onboarding</button>`;
    }else if(ackedByMe){
      html+=`<div class="onboard-ack-badge">✓ Acknowledged for this shift</div><button type="button" class="button secondary" data-action="onboarding-close">Close</button>`;
    }else{
      html+=`<button type="button" class="button secondary" data-action="onboarding-close">Close</button>`;
    }
    html+=`</div></div>`;

    const body=$('onboarding-dialog-body');
    if(body)body.innerHTML=html;
    $('onboarding-dialog')?.showModal();
  }
  function closeOverlays(){for(const id of ['notif-dialog','app-menu','ctx-dialog','quick-dialog','onboarding-dialog'])$(id)?.open&&$(id).close();}
  function render(){
    // The shift briefing lives on Today; old links, hashes and saved views land on its card there.
    if(state.view==='onboarding'){state.view='schedules';scheduleUI.show('home');focusBriefing=true;persist();}
    // Private notes became direct messages in team chat; old links open the messenger over Today.
    if(state.view==='private'){state.view='schedules';scheduleUI.show('home');persist();queueMicrotask(()=>chatUI.open());}
    // The 86 board and station supplies became sections of Stock; old links, hashes and notifications land there.
    if(['eighty-six','orders','inventory'].includes(state.view)){stockUI.show(state.view==='eighty-six'?'86':state.view);state.view='stock';persist();}
    const expanded=[...$('view').querySelectorAll('details[open][data-key]')].map(x=>x.dataset.key);
    B.configure(state);
    let viewer=state.team.find(p=>p.id===me());
    if(!viewer?.active)viewer=state.team.find(p=>p.active&&p.access==='crew')||state.team.find(p=>p.active);
    state.role=viewer.access;if(viewer.access==='manager')state.managerId=viewer.id;else state.crewId=viewer.id;
    $('role').innerHTML=state.team.filter(p=>p.active).map(p=>`<option value="${e(p.id)}">${e(p.name)} · ${e(p.role||(p.access==='manager'?'Manager':'Crew'))}${p.access==='manager'&&p.role!=='Manager'?' (manager)':''}</option>`).join('');
    $('role').value=me();$('service-date').value=state.date;
    $('user-avatar').textContent=B.person(me()).initials;
    renderNotifications();
    summary();$('view').innerHTML=renderers[state.view]();
    const screen=state.view==='schedules'?scheduleUI.screen():state.view;
    paintContext(screen);if($('ctx-dialog').open)paintShiftPicker();
    const N=BriglyNavigation,groups=N.groups(manager()),serviceMode=N.service(screen),navBadges=N.badges?N.badges(state):{};
    const renderPill=id=>{const b=navBadges[id];return b?`<em class="nav-pill" data-tone="${e(b.tone)}">${e(b.text)}</em>`:'';};
    const navButton=([action,id,label,glyph,tone='slate'],kind='')=>`<button class="${kind} ${N.active(screen,id)?'active':''}" data-tone="${e(tone)}" data-action="${action}" data-id="${id}" ${N.active(screen,id)?'aria-current="page"':''}><span class="nav-icon">${icon(glyph)}</span><span class="nav-label">${e(label)}</span>${renderPill(id)}</button>`;
    $('app-nav').innerHTML=groups.map(group=>'<div class="nav-group"><p>'+group.label+'</p>'+group.items.map(item=>navButton(item)).join('')+'</div>').join('');
    $('bottom-nav').innerHTML=N.primary(manager()).map(([action,id,label,glyph,tone='slate'])=>'<button data-tone="'+e(tone)+'" data-action="'+action+'" data-id="'+id+'" '+(N.active(screen,id)?'aria-current="page"':'')+'>'+icon(glyph)+'<span>'+label+'</span>'+renderPill(id)+'</button>').join('')+'<button data-tone="slate" data-action="app-menu" '+((manager()?['earnings','manage','reports','requests','myfile','specials','reservations','training','menu','pos']:['specials','reservations','training','menu','pos']).includes(screen)?'aria-current="page"':'')+'><span class="more-icon" aria-hidden="true">•••</span><span>More</span></button>';
    $('more-links').innerHTML=groups.map(group=>'<section class="explore-group"><h3>'+group.label+'</h3><div>'+group.items.map(item=>navButton(item,'menu-link')).join('')+'</div></section>').join('');
    $('sidebar-person').textContent=viewer.name;$('sidebar-access').textContent=(viewer.role||'Team member')+' · '+viewer.area+(manager()&&viewer.role!=='Manager'?' · manager access':'');$('sidebar-avatar').textContent=viewer.initials;
    $('app-menu-title').textContent=matchMedia('(max-width:760px)').matches?'Explore Brigly':'Profile & preferences';
    for(const table of $('view').querySelectorAll('table:not(.schedule-table)')){table.classList.add('responsive-table');const labels=[...table.querySelectorAll('thead th')].map(x=>x.textContent);for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>cell.dataset.label=labels[i]||'');}
    document.body.dataset.role=state.role;document.body.dataset.section=screen;document.body.dataset.view=state.view;
    // Dock screens are one tap away on phones; everything else gets a way back to Today.
    document.body.dataset.dock=['home','lists','stock',manager()?'shifts':'me'].includes(screen)||(!manager()&&N.hub.includes(screen))?'true':'false';
    $('breadcrumb').textContent=screen==='home'?'Today':!manager()&&N.hub.includes(screen)?'My space':screen==='shifts'?'Roster':screen==='earnings'?'Earnings':screen==='requests'?'Requests':screen==='manage'?'Manage':screen==='reports'?'Reports':screen==='myfile'?'My file':screen==='briefing'?'Shift briefing':screen==='training'?'Training':titles[state.view];
    document.title=$('breadcrumb').textContent+' · Brigly';
    if(serviceMode)document.body.dataset.service='true';else delete document.body.dataset.service;
    updateThemeLabels();
    for(const detail of $('view').querySelectorAll('details[data-key]'))if(expanded.includes(detail.dataset.key))detail.open=true;
    chatUI.paint();
    if(focusBriefing){focusBriefing=false;requestAnimationFrame(()=>$('view').querySelector('.td-brief, .td-notes')?.scrollIntoView({behavior:'smooth',block:'start'}));}
    if($('onboarding-dialog')?.open){
      const curB=state.briefings.find(x=>x.date===state.date&&x.service===state.service);
      if(curB)openOnboardingModal(curB.id);
    }
  }
  const input=(name,label,value='',type='text',attrs='')=>`<label>${label}<input name="${name}" type="${type}" value="${e(value)}" ${attrs}></label>`;
  const textarea=(name,label,value='',attrs='')=>`<label>${label}<textarea name="${name}" ${attrs.includes('maxlength=')?'':'maxlength="2000"'} ${attrs}>${e(value)}</textarea></label>`;
  const select=(name,label,values,value)=>`<label>${label}<select name="${name}">${values.map(v=>{const [key,title]=Array.isArray(v)?v:[v,v];return `<option value="${e(key)}" ${key===value?'selected':''}>${e(title)}</option>`;}).join('')}</select></label>`;
  const area=value=>select('area','Station',state.setup.areas,value||state.setup.areas[0]);
  const serviceFields=item=>input('date','Date',item.date||state.date,'date','required')+select('service','Service',state.setup.services.filter(x=>x.active||x.name===item.service).map(x=>x.name),item.service||state.service);
  function showDialog(title,fields){externalDirty=false;$('editor').classList.remove('is-wide');$('editor-title').textContent=title;$('editor-fields').innerHTML=fields;for(const table of $('editor-fields').querySelectorAll('table')){table.classList.add('responsive-table');const headers=[...table.querySelectorAll('th')].map(x=>x.textContent);for(const row of table.querySelectorAll('tbody tr'))[...row.cells].forEach((cell,i)=>cell.dataset.label=headers[i]||'');}$('form-error').textContent='';const submit=$('editor-form').querySelector('[type=submit]');submit.hidden=false;submit.textContent='Save changes';$('editor-form').querySelector('.dialog-actions [data-action=close]').textContent='Cancel';$('editor').showModal();}
  // Forms from Manage, Finance and Write-ups share the wide dialog; each keeps its own submit label.
  const formDialog=type=>(title,fields,label='Save changes')=>{editing={type};showDialog(title,fields);$('editor').classList.add('is-wide');$('editor-form').querySelector('[type=submit]').textContent=label;};
  function infoDialog(title,html){editing={type:'manage'};showDialog(title,html);const f=$('editor-form');f.querySelector('[type=submit]').hidden=true;f.querySelector('.dialog-actions [data-action=close]').textContent='Close';$('editor').classList.add('is-wide');}
  function openRolloverManager(){
    editing=null;
    const c=dutiesUI.listContext();
    const allTasks=B.work.tasks?B.work.tasks(state,state.date,state.service):state.tasks;
    const matched=allTasks.filter(t=>(!c.area||t.area===c.area)&&(!c.list||t.list===c.list));
    const tasksToShow=matched.length?matched:(B.work.defaultTasks?B.work.defaultTasks(state,state.service):state.tasks.filter(t=>!t.date&&(!t.service||t.service===state.service)));
    const content=`<div class="rollover-manager-box">
      <div class="rollover-manager-banner">
        <span class="badge tone-amber">⟲ Shift Handover Rollover Duties</span>
        <p>Designate which duties automatically roll over into the next shift’s onboarding briefing if incomplete. Tap any item to toggle:</p>
      </div>
      <div class="rollover-manager-list">
        ${tasksToShow.map(t=>`
          <div class="rollover-task-card ${t.rollover?'is-rollover':''}">
            <div class="rollover-task-info">
              <div class="rollover-task-badges">
                <span class="td-tag" data-tone="${t.area==='Bar'?'orange':t.area==='Kitchen'?'slate':'sage'}">${e(t.area)}</span>
                <span class="td-tag" data-tone="slate">${e(t.list)}</span>
                ${t.rollover?'<span class="cl-tag" data-tone="amber">Rollover</span>':''}
              </div>
              <strong>${e(t.title)}</strong>
            </div>
            <button type="button" class="button small ${t.rollover?'tone-amber':'secondary'}" data-action="task-toggle-rollover" data-id="${e(t.id)}" data-default="${Boolean(!t.date)}">
              ${t.rollover?'✓ Rollover Duty':'Shift-only'}
            </button>
          </div>
        `).join('')}
      </div>
    </div>`;
    showDialog('Manage Handover Rollover Duties ('+e(c.area||state.service)+' · '+e(c.list||'Checklists')+')', content);
    $('editor-form').querySelector('[type=submit]').hidden=true;
    $('editor-form').querySelector('.dialog-actions [data-action=close]').textContent='Done';
  }
  function edit(collection,id,list,station,isDefAttr){
    const old=state[collection]?.find(x=>x.id===id),item=old||(collection==='tasks'?{list:list||dutiesUI.listContext().list,area:station||dutiesUI.listContext().area}:{});
    const defaultPerson=state.team.find(p=>p.active&&p.access==='crew')?.id||me();
    const template=state.setup.services.find(x=>x.name===(item.service||state.service)&&(old||x.active))||state.setup.services.find(x=>x.active);
    const isDefTask=Boolean(isDefAttr||(old&&!old.date)||(collection==='tasks'&&!old&&dutiesUI.listContext().defaultsMode));
    editing={collection,id:id||crypto.randomUUID(),isDefault:isDefTask,target:isDefTask?'default':undefined};
    if(collection==='shifts'&&!manager()){
      showDialog('Shift details',`<p><strong>${e(B.person(item.person).name)}</strong><br>${dateLabel(item.date,{month:'long',day:'numeric',year:'numeric'})} · ${e(item.service)}<br>${e(item.start)} – ${e(item.end)} · ${e(item.area)}<br>Ask your manager to change this shift.</p>`);$('editor-form').querySelector('[type=submit]').hidden=true;return;
    }
    const forms={
      shifts:()=>select('person','Team member',B.crew.filter(p=>p.active||p.id===item.person).map(p=>[p.id,p.name]),item.person||defaultPerson)+serviceFields(item)+input('start','Start time',item.start||template.start,'time','required')+input('end','End time',item.end||template.end,'time','required')+area(item.area)+input('payRate','Hourly rate for this shift ($)',item.payRate??state.scheduling.defaults[item.person||defaultPerson].rate,'number','required min="0" max="100000" step="0.01"')+input('breakMinutes','Unpaid break (minutes)',item.breakMinutes??template.breakMinutes,'number','required min="0" max="1439" step="1"')+'<p>An end time earlier than the start finishes the next day. Overlapping assignments are blocked.</p>',
      tasks:()=>{
        const c=dutiesUI.listContext();
        const currentLists=B.work.lists?B.work.lists(state,item.date||state.date,item.service||state.service):['Opening','Closing'];
        const listOpts=[...new Set(['Opening','Closing',...currentLists,item.list].filter(Boolean))];
        const activeSvc=c.activeSvc||state.service;
        return input('title','Task',item.title,'text','required maxlength="200"')
          +select('list','Checklist',listOpts,item.list||c.list||'Opening')
          +input('customList','Or new checklist name (optional)','','text','maxlength="80" placeholder="e.g. Event Setup, Mid-shift, Deep Clean"')
          +area(item.area||c.area)
          +`<div class="setting-toggle-card">
              <label class="setting-toggle-label">
                <input type="checkbox" name="rollover" value="true" ${item.rollover ? 'checked' : ''}>
                <span class="setting-toggle-switch" aria-hidden="true"></span>
                <span class="setting-toggle-text">
                  <strong>Handover Rollover Duty</strong>
                  <small>If uncompleted, automatically roll over into the next shift’s onboarding briefing.</small>
                </span>
              </label>
            </div>`
          +(manager()&&!old?select('targetScope','Checklist scope',[
              ['shift','Shift-specific (only for '+state.date+' · '+state.service+')'],
              ['default','Default checklist for '+activeSvc+' (repeats every day)']
            ],isDefTask?'default':'shift'):'')
          +'<p>'+(isDefTask?'Default checklist task for '+e(old?.service||activeSvc)+'. This task repeats on every shift.':'This task is specific to '+e(state.date)+' · '+e(state.service)+'.')+'</p>';
      },
      specials:()=>{const kindOpts=[['special','Special (Food & Drink Feature)'],['happy_hour','Happy Hour Promotion'],['event','Event / Live Experience']];return select('kind','Happening type',kindOpts,item.kind||'special')+serviceFields(item)+input('name','Name / Title',item.name||'','text','required maxlength="100" placeholder="e.g. Pan-seared Halibut, Twilight Spritz Hour, Live Courtyard Jazz"')+input('time','Hours or Event Time (optional)',item.time||'','text','maxlength="50" placeholder="e.g. 16:00 – 18:00 or 19:30"')+input('price','Price ($)',item.price??'0','number','required min="0" max="10000" step="0.01"')+textarea('description','Description & details',item.description||'','placeholder="Details, tasting notes, promotions or entertainment"')+textarea('allergens','Allergy, terms & service guidance',item.allergens||'','placeholder="Allergen guidance for kitchen/floor, seating rules, or staging notes"')+select('active','Status',[['true','On the menu'],['false','Paused']],String(item.active??true));},
      unavailable:()=>input('name','Unavailable item',item.name,'text','required maxlength="100"')+area(item.area)+textarea('reason','Reason, alternatives or expected return',item.reason,'required')+select('active','Availability',[['true','Unavailable'],['false','Available again']],String(item.active??true)),
      briefings:()=>serviceFields(item)+input('title','Briefing title',item.title,'text','required maxlength="150"')+textarea('body','What does the crew need to know?',item.body,'required')+(old?'<p>Saving a revision will ask everyone to acknowledge this briefing again.</p>':''),
      orders:()=>input('name','Supply item',item.name,'text','required maxlength="100"')+input('quantity','Quantity',item.quantity??1,'number','required min="1" max="10000" step="1"')+input('unit','Unit (boxes, packs, bottles…)',item.unit,'text','required maxlength="40"')+area(item.area)+textarea('note','Why is it needed?',item.note),
      reservations:()=>floorUI?floorUI.form(item,old):serviceFields(item)+input('name','Guest name',item.name,'text','required maxlength="100"')+input('guests','Party size',item.guests??2,'number','required min="1" max="20" step="1"')+input('time','Arrival time',item.time||'18:30','time','required')+input('table','Table (optional)',item.table,'text','maxlength="20"')+input('contact','Contact (optional)',item.contact,'text','maxlength="100"')+textarea('note','Guest notes',item.note)
    };
    if(!forms[collection])return;
    const names={shifts:'shift',tasks:isDefTask?'default task':'task',specials:'happening',unavailable:'86 item',briefings:'briefing',orders:'supply request',reservations:'reservation'};
    showDialog(`${old?'Edit':'Add'} ${names[collection]}`,(old&&collection==='shifts'?'<details class="assignment-settings"><summary>Assignment · '+e(item.start)+'–'+e(item.end)+' · edit times & pay</summary><div>'+forms[collection]()+'</div></details>'+operationsUI.hub(item.date,item.service,true):forms[collection]())+((old&&manager()&&['shifts','tasks'].includes(collection))?button('Remove '+names[collection],'remove',id,`data-collection="${collection}"`+(isDefTask?' data-default="true"':''),'danger'):''));
  }
  document.addEventListener('click',ev=>{
    const target=ev.target.closest('[data-action]');if(!target)return;
    const {action,id,collection,status}=target.dataset;
    if(target.dataset.notifId){readNotifs.add(target.dataset.notifId);saveReadNotifs();}
    // Anything picked from the quick palette or shift picker runs with the overlay out of the way.
    if(target.closest('#quick-dialog')&&!action.startsWith('quick-'))$('quick-dialog').close();
    if(action==='quick-open'){$('app-menu').close();$('notif-dialog')?.close();quickUI.open(id);return;}
    if(action==='quick-close'){quickUI.close();return;}
    if(action==='ctx-open'){openShiftPicker();return;}
    if(action==='ctx-close'){$('ctx-dialog').close();return;}
    if(action==='ctx-step'){state.date=B.addDays(state.date,Number(target.dataset.step||0)*(document.body.dataset.section==='shifts'?7:1));week=B.monday(state.date);persist();render();return;}
    if(action==='ctx-today'){state.date=B.dateString(new Date());week=B.monday(state.date);persist();render();return;}
    if(action==='ctx-service'){state.service=id;persist();$('ctx-dialog').close();render();return;}
    if(action==='ctx-pick'){state.date=target.dataset.date;state.service=target.dataset.service;week=B.monday(state.date);persist();$('ctx-dialog').close();render();return;}
    if(target.closest('#ctx-dialog'))$('ctx-dialog').close();
    if(action==='notif-open'){$('app-menu')?.close();renderNotifications();$('notif-dialog')?.showModal();return;}
    if(action==='notif-close'){$('notif-dialog')?.close();return;}
    if(action==='notif-filter'){notifFilter=id||'all';renderNotifications();return;}
    if(action==='res-filter'){resFilter=id||'all';render();return;}
    if(action==='special-filter'){specialFilter=id||'all';render();return;}
    if(action==='notif-read'){if(id)readNotifs.add(id);saveReadNotifs();renderNotifications();render();return;}
    if(action==='notif-read-all'){for(const n of (globalThis.BriglyNotifications?.build(state,readNotifs)||[]))readNotifs.add(n.id);saveReadNotifs();renderNotifications();render();notify('All notifications marked as read.');return;}
    if(action==='notif-go'){
      $('notif-dialog')?.close();$('app-menu')?.close();
      if(target.dataset.screen==='home')state.view='onboarding';
      else if(target.dataset.screen){state.view='schedules';scheduleUI.show(target.dataset.screen);}
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
    if(action==='checklist-report-open'||action==='checklist-day-report'){
      $('notif-dialog')?.close();$('app-menu')?.close();
      reportsUI.show('operations');openReports();return;
    }
    if(action==='checklist-jump'){
      const [d,svc]=String(id).split('|');
      if(B.isDate(d)&&svc){
        state.date=d;state.service=svc;week=B.monday(d);state.view='lists';
        dutiesUI.listHandle('jump',id,target.dataset);
        persist();render();window.scrollTo({top:0,behavior:'instant'});return;
      }
    }
    if(action.startsWith('checklist-')){
      const jump=['checklist-open','checklist-go','checklist-task'].includes(action);
      if(jump){closeOverlays();state.view='lists';persist();}
      try{dutiesUI.listHandle(action.slice(10),id,target.dataset);}catch(err){notify(err.message);}
      if(jump&&action!=='checklist-task')window.scrollTo({top:0,behavior:'instant'});return;
    }
    if(action.startsWith('chat-')){chatUI.handle(action.slice(5),id,target);return;}
    if(action.startsWith('home-')){homeUI.handle(action.slice(5),id);return;}
    if(action==='onboarding-open'){openOnboardingModal(id);return;}
    if(action==='onboarding-close'){$('onboarding-dialog')?.close();return;}
    if(action==='swap-select-person'){
      const person=target.dataset.person;
      const container=target.closest('#editor-fields')||document;
      container.querySelectorAll('.swap-teammate-btn').forEach(b=>{
        const isCur=b.dataset.person===person;
        b.classList.toggle('selected',isCur);
        b.setAttribute('aria-pressed',isCur);
      });
      container.querySelectorAll('[data-swap-person-shifts]').forEach(group=>{
        const isCur=group.dataset.swapPersonShifts===person;
        group.classList.toggle('is-hidden',!isCur);
        if(isCur){
          const firstRadio=group.querySelector('input[type="radio"]');
          if(firstRadio){
            firstRadio.checked=true;
            group.querySelectorAll('.swap-shift-option').forEach(opt=>{
              opt.classList.toggle('is-checked',opt.contains(firstRadio));
            });
          }
        }
      });
      return;
    }
    if(action==='qa-toggle-ask'){
      const form=$('qa-form-'+id);
      if(form){form.classList.toggle('is-hidden');if(!form.classList.contains('is-hidden'))form.querySelector('input')?.focus();}
      return;
    }
    if(action==='qa-toggle-reply'){
      const form=$('qa-reply-'+target.dataset.specialId+'-'+id);
      if(form){form.classList.toggle('is-hidden');if(!form.classList.contains('is-hidden'))form.querySelector('input')?.focus();}
      return;
    }
    if(action==='app-screen'){state.view='schedules';scheduleUI.show(id);if(id==='home')homeUI.entry();if(id==='training')trainingUI.show();$('app-menu').close();$('notif-dialog')?.close();$('editor').close();persist();render();window.scrollTo({top:0,behavior:'instant'});return;}
    if(action.startsWith('stock-')){try{stockUI.handle(action.slice(6),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('mn-')){try{menuUI.handle(action.slice(3),id,target.dataset,target);}catch(err){notify(err.message);}return;}
    if(action.startsWith('ps-')){$('notif-dialog')?.close();try{posUI.handle(action.slice(3),id,target.dataset,target);}catch(err){notify(err.message);}return;}
    if(action.startsWith('plan-')){try{plannerUI.handle(action.slice(5),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action==='ops-report-tab'){$('notif-dialog')?.close();reportsUI.show(id);openReports();return;}
    if(action.startsWith('fl-')){try{floorUI.handle(action.slice(3),id,target.dataset,target);}catch(err){notify(err.message);}return;}
    if(action.startsWith('ops-')){try{operationsUI.handle(action.slice(4),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('rp-')){reportsUI.handle(action.slice(3),id,target.dataset);return;}
    if(/^(fin|tc|wu|hr)-/.test(action)){$('notif-dialog')?.close();try{(action.startsWith('wu-')?writeupsUI:action.startsWith('hr-')?hrUI:financeUI).handle(action.replace(/^(fin|tc|wu|hr)-/,''),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('mg-')){try{manageUI.handle(action.slice(3),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('tr-')){$('notif-dialog')?.close();try{trainingUI.handle(action.slice(3),id,target.dataset);}catch(err){notify(err.message);}return;}
    if(action.startsWith('schedule-')){scheduleUI.handle(action.slice(9),id);return;}
    if(action==='navigate'){state.view=id;$('notif-dialog')?.close();persist();render();}
    else if(action==='week-prev'||action==='week-next'){const offset=action==='week-prev'?-7:7;week=B.addDays(week,offset);state.date=B.addDays(state.date,offset);persist();render();}
    else if(action==='edit')edit(collection,id,target.dataset.list,target.dataset.station,target.dataset.default==='true');
    else if(action==='manage-rollovers'){openRolloverManager();return;}
    else if(action==='task-toggle-rollover'){
      const task=state.tasks.find(t=>t.id===id);
      if(!task)return;
      const isDef=Boolean(target.dataset.default==='true'||!task.date);
      commit({type:'put',collection:'tasks',item:{...task,rollover:!task.rollover},target:isDef?'default':undefined,isDefault:isDef},task.rollover?'Duty set to shift-only (no rollover).':'Duty marked as handover rollover task.');
      if($('editor')?.open&&$('editor-title')?.textContent?.includes('Configure Handover'))openRolloverManager();
      return;
    }
    else if(action==='work-create')commit({type:'checklist:create'},'Lists created for this shift.');
    else if(action==='work-empty'){
      const c=dutiesUI.listContext();
      const isDef=Boolean(target.dataset.default==='true'||c.defaultsMode);
      editing={type:isDef?'checklist:empty-default':'checklist:empty',target:isDef?'default':undefined,isDefault:isDef,area:c.area,list:c.list,service:c.activeSvc||state.service};
      showDialog('Clear '+e(c.area)+' '+c.list.toLowerCase()+' list?',isDef?'<p>This clears the default '+e(c.list.toLowerCase())+' template for '+e(c.area)+' on '+e(c.activeSvc||state.service)+'. Existing materialized shifts keep their current tasks.</p>':'<p>This clears this station’s '+e(c.list.toLowerCase())+' tasks and completion records for '+e(state.service)+' on '+e(state.date)+'. Other teams and shifts keep their lists.</p>');
    }
    else if(action==='close')$('editor').close();
    else if(action==='remove'&&collection==='shifts'){plannerUI.handle('remove',id,{});}
    else if(action==='remove'){
      const oldTask=collection==='tasks'?state.tasks.find(x=>x.id===id):null;
      const isDefTask=Boolean(target.dataset.default==='true'||(oldTask&&!oldTask.date));
      editing={type:'remove',collection,id,isDefault:isDefTask,target:isDefTask?'default':undefined};
      showDialog('Remove this '+(collection==='tasks'?(isDefTask?'default task':'task'):'shift')+'?',`<p>${collection==='tasks'?(isDefTask?'This removes the task from the service default template.':'This removes the task from this shift only. Other shifts keep their lists.'):'This removes the assignment from the team schedule.'}</p>`);
    }
    else if(action==='toggle')commit({type:'toggle',collection,id},'Availability updated.');
    else if(action==='ack'){commit({type:'ack',id},'Briefing acknowledged. You’re ready for service.');$('onboarding-dialog')?.close();}
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
    scheduleUI.onChange(t);operationsUI.onChange(t);dutiesUI.onChange(t);stockUI.onChange(t);manageUI.onChange(t);writeupsUI.onChange(t);trainingUI.onChange(t);menuUI.onChange(t);posUI.onChange(t);try{floorUI.onChange(t);}catch(err){notify(err.message);}
    if(t.id==='role'){scheduleUI.show('home');const p=state.team.find(x=>x.id===t.value);state.role=p.access;if(p.access==='manager')state.managerId=p.id;else state.crewId=p.id;state.view='schedules';homeUI.entry();persist();render();}
    if(t.name==='service'&&editing?.collection==='shifts'){const template=state.setup.services.find(x=>x.name===t.value);for(const key of ['start','end','breakMinutes'])$('editor-form').elements.namedItem(key).value=template[key];}
    if(t.name==='person'&&editing?.collection==='shifts'){const rate=$('editor-form').elements.namedItem('payRate');if(rate)rate.value=state.scheduling.defaults[t.value].rate;}
    if(t.id==='service-date'){if(!B.isDate(t.value)){t.value=state.date;return;}state.date=t.value;week=B.monday(state.date);persist();render();}
    if(t.dataset.task){
      const id=t.dataset.task,done=t.checked,title=B.work.tasks(state).find(x=>x.id===id)?.title||'Task';
      if(commit({type:'check',id,done,at:new Date().toISOString()},null))notify((done?'Done: ':'Reopened: ')+title,()=>commit({type:'check',id,done:!done,at:new Date().toISOString()},done?'Task reopened.':'Task marked done again.'));
      else render();
    }
    if(t.name==='targetId'){
      t.closest('.swap-shifts-container')?.querySelectorAll('.swap-shift-option').forEach(opt=>{
        opt.classList.toggle('is-checked',opt.querySelector('input')===t);
      });
    }
  });
  document.addEventListener('submit',ev=>{
    const form=ev.target;
    if(form.dataset.action==='qa-submit-question'){
      ev.preventDefault();
      commit({type:'ops:special-question',id:form.dataset.id,text:form.qaText.value},'Question posted.');
      return;
    }
    if(form.dataset.action==='qa-submit-reply'){
      ev.preventDefault();
      commit({type:'ops:special-answer',id:form.dataset.specialId,questionId:form.dataset.id,text:form.replyText.value},'Answer posted.');
      return;
    }
  });
  $('editor-form').addEventListener('submit',ev=>{
    ev.preventDefault();if(!editing||['home','manage'].includes(editing.type))return;
    if(externalDirty){$('form-error').textContent='The workspace changed in another tab. Close this dialog and reopen it to review the latest details.';return;}
    const values=Object.fromEntries(new FormData(ev.target));for(const key of Object.keys(values))values[key]=values[key].trim();
    let action;
    if(editing.type==='planner')action=plannerUI.submit(values);
    else if(editing.type==='operations')action=operationsUI.submit(values);
    else if(editing.type==='stock'){try{action=stockUI.submit(values,new FormData(ev.target));}catch(err){$('form-error').textContent=err.message;return;}}
    else if(editing.type==='schedule')action=scheduleUI.submit(values);
    else if(editing.type==='manage-form')action=manageUI.submit(values);
    else if(editing.type==='finance')action=financeUI.submit(values);
    else if(editing.type==='writeups')action=writeupsUI.submit(values);
    else if(editing.type==='hr')action=hrUI.submit(values);
    else if(editing.type==='training'){try{action=trainingUI.submit(values,new FormData(ev.target));}catch(err){$('form-error').textContent=err.message;return;}}
    else if(editing.type==='floor'){try{action=floorUI.submit(values,new FormData(ev.target));}catch(err){$('form-error').textContent=err.message;return;}}
    else if(editing.type==='menu'){try{action=menuUI.submit(values,new FormData(ev.target));}catch(err){$('form-error').textContent=err.message;return;}}
    else if(editing.type==='pos'){try{action=posUI.submit(values,new FormData(ev.target));}catch(err){$('form-error').textContent=err.message;return;}}
    else if(editing.type==='checklist:note')action={type:'checklist:note',task:editing.task,date:editing.date,service:editing.service,id:crypto.randomUUID(),body:values.body,important:values.important==='true',stockItem:values.stockItem||extract86(values.body)};
    else if(editing.type==='checklist:new-list'){
      const isDef=values.targetScope==='default'||editing.isDefault;
      action={type:isDef?'checklist:add-default':'checklist:add',area:editing.area,list:values.listName,titles:values.titles,target:isDef?'default':'shift',service:editing.service||state.service,specific:!isDef};
      if(values.listName)dutiesUI.listHandle('phase',values.listName,{});
    }
    else if(editing.type==='checklist:add'){
      const isDef=values.targetScope==='default'||editing.target==='default'||editing.isDefault;
      action={...editing,type:isDef?'checklist:add-default':'checklist:add',titles:values.titles,target:isDef?'default':'shift',service:editing.service||state.service,specific:!isDef};
    }
    else if(editing.type==='checklist:empty'||editing.type==='checklist:empty-default')action={...editing};
    else if(editing.type==='remove')action={...editing};
    else if(editing.type==='reservation-status')action={...editing};
    else if(editing.type==='decline')action={type:'order-status',id:editing.id,status:'Declined',feedback:values.feedback};
    else {
      const {collection,id}=editing,old=state[collection].find(x=>x.id===id);
      for(const key of ['price','quantity','guests','payRate','breakMinutes'])if(key in values)values[key]=Number(values[key]);
      if('active' in values)values.active=values.active==='true';
      if(collection==='reservations'){
        // Tables and tags are checkbox groups; the floor plan derives the legacy table text from the tables list.
        const fd=new FormData(ev.target);values.tables=fd.getAll('tables').map(x=>x.trim()).filter(Boolean);values.tags=fd.getAll('tags');
        if('duration' in values)values.duration=Number(values.duration);delete values.table;
      }
      if(collection==='tasks'){
        if(values.customList){values.list=values.customList;delete values.customList;}
        values.rollover=Boolean(values.rollover==='true'||values.rollover==='on'||values.rollover===true);
        const isDef=Boolean(values.targetScope==='default'||editing.isDefault||(old&&!old.date));
        delete values.targetScope;
        if(isDef){
          values.service=editing.service||old?.service||dutiesUI.listContext().activeSvc||state.service;
          delete values.date;
          values.specific=false;
          values.isDefault=true;
          action={type:'put',collection,item:{...old,...values,id},target:'default',isDefault:true};
        }else{
          values.date=state.date;
          values.service=state.service;
          values.specific=values.specific!==undefined?values.specific:(old?.specific!==undefined?old.specific:true);
          action={type:'put',collection,item:{...old,...values,id},specific:values.specific};
        }
      }else{
        action={type:'put',collection,item:{...old,...values,id}};
      }
    }
    try{state=B.change(state,action);const message=editing.type==='stock'?stockUI.saved():editing.type==='writeups'?writeupsUI.saved():editing.type==='finance'?financeUI.saved():editing.type==='hr'?hrUI.saved():editing.type==='training'?trainingUI.saved():editing.type==='floor'?floorUI.saved():editing.type==='menu'?menuUI.saved():editing.type==='pos'?posUI.saved():'';const saved=persist();$('editor').close();render();notify(saved?message||'Changes saved.':'Updated in memory. Browser storage is unavailable.');}catch(err){$('form-error').textContent=err.message;}
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
  $('editor')?.addEventListener('click',ev=>{if(ev.target===$('editor'))$('editor').close();});
  $('onboarding-dialog')?.addEventListener('click',ev=>{if(ev.target===$('onboarding-dialog'))$('onboarding-dialog').close();});
  matchMedia('(max-width:760px)').addEventListener('change',()=>{$('app-menu-title').textContent=matchMedia('(max-width:760px)').matches?'Explore Brigly':'Profile & preferences';});
  const operationsUI=createShiftOperationsUI({view:infoDialog,createInContext:(collection,date,service)=>{state.date=date;state.service=service;week=B.monday(date);persist();render();edit(collection);},reportScreen:()=>{if($('editor').open)$('editor').close();reportsUI.show('executive');state.view='schedules';scheduleUI.show('reports');persist();render();window.scrollTo({top:0,behavior:'instant'});},state:()=>state,e,button,badge,input,textarea,select,dateLabel,render,commit,stockAlert:(date,service,id)=>stockUI.alert(date,service,'',id||''),open:(title,fields)=>{editing={type:'operations'};showDialog(title,fields);},navigate:(view,date,service)=>{scheduleUI.show('briefing');state.view=view;state.date=date;state.service=service;week=B.monday(date);persist();render();}});
  const plannerUI=createPlannerUI({close:()=>$('editor').close(),state:()=>state,week:()=>week,e,button,input,select,dateLabel,render,commit,notify,context:()=>'<div class="home-service-links"><button data-action="navigate" data-id="onboarding"><strong>Service details</strong><span>Briefing and notes on Today</span><b>›</b></button></div>',serviceForm:()=>operationsUI.handle('service','',{}),open:(title,fields,save=true)=>{editing={type:'planner'};showDialog(title,fields);$('editor-form').querySelector('[type=submit]').hidden=!save;}});
  const dutiesUI=createDutiesUI({focusShift:(date,service)=>{state.date=date;state.service=service;week=B.monday(date);persist();},openTasks:(title,fields,c)=>{editing={type:c.type||'checklist:add',area:c.area,list:c.list,task:c.task,date:c.date,service:c.service,target:c.target,isDefault:c.isDefault};showDialog(title,fields);if(c.readOnly)$('editor-form').querySelector('[type=submit]').hidden=true;},state:()=>state,e,button,input,textarea,select,render,commit});
  const stockUI=createStockUI({state:()=>state,e,input,textarea,select,dateLabel,commit,notify,render,go:()=>{state.view='stock';$('notif-dialog')?.close();persist();},close:()=>{if($('editor').open)$('editor').close();},report:tab=>manager()?(reportsUI.show(tab),openReports()):notify('Reports need manager access.'),open:(title,fields,save=true,label='')=>{editing={type:'stock'};showDialog(title,fields);const submit=$('editor-form').querySelector('[type=submit]');submit.hidden=!save;if(label)submit.textContent=label;$('editor-form').querySelector('.dialog-actions [data-action=close]').textContent=save?'Cancel':'Close';}});
  const chatUI=createTeamChatUI({state:()=>state,e,dateLabel,commit,notify,render});
  const homeUI=createShiftHome({pos:()=>posUI.todayCard(),clock:()=>financeUI.clockState(),payroll:()=>manager()?[...financeUI.attention(),...hrUI.attention()]:[],openContext:openShiftPicker,notify,commit,showHome:()=>{state.view='schedules';scheduleUI.show('home');},state:()=>state,e,dateLabel,render,focus:(date,service)=>{state.date=date;state.service=service;week=B.monday(date);},close:()=>$('editor').close(),open:(title,fields)=>{editing={type:'home'};showDialog(title,fields);$('editor-form').querySelector('[type=submit]').hidden=true;}});
  const meUI=createMeUI({state:()=>state,week:()=>week,e,button,badge,dateLabel,schedule:()=>scheduleUI,training:()=>trainingUI,hr:()=>hrUI,finance:()=>financeUI});
  const scheduleUI=createScheduleUI({state:()=>state,week:()=>week,home:()=>homeUI.render(),training:()=>trainingUI.render(),me:screen=>meUI.render(screen),e,button,badge,input,textarea,select,dateLabel,roster:()=>manager()?plannerUI.render():roster(),render,commit,extras:()=>operationsUI.extras(),section:key=>operationsUI.section(key),manage:()=>manageUI.render(),reportsPage:()=>reportsUI.render(),reportBoard:b=>reportsUI.show(b),pay:()=>financeUI.myPay(),manageTab:tab=>manageUI.show(tab),myfile:()=>hrUI.myFile(),context:(date,service)=>operationsUI.hub(date,service,true),open:(title,fields)=>{editing={type:'schedule'};showDialog(title,fields);}});
  window.addEventListener('storage',event=>{if(event.key===B.KEY){const context={role:state.role,crewId:state.crewId,managerId:state.managerId,date:state.date,service:state.service,view:state.view};state={...B.load(storage),...context};if($('editor').open)externalDirty=true;render();notify('Workspace updated from another tab.');}});
  const goManage=section=>{if($('editor').open)$('editor').close();state.view='schedules';scheduleUI.show('manage');manageUI.show(section);persist();render();window.scrollTo({top:0,behavior:'instant'});};
  const financeUI=createFinanceUI({state:()=>state,e,button,badge,dateLabel,commit,render,notify,open:infoDialog,form:formDialog('finance'),go:goManage});
  const writeupsUI=createWriteupsUI({state:()=>state,e,button,badge,dateLabel,commit,render,notify,open:infoDialog,form:formDialog('writeups'),close:()=>{if($('editor').open)$('editor').close();}});
  const openReports=()=>{if($('editor').open)$('editor').close();state.view='schedules';scheduleUI.show('reports');persist();render();window.scrollTo({top:0,behavior:'instant'});};
  const reportsUI=createReportsUI({finance:financeUI,training:()=>trainingUI,floor:()=>floorUI,pos:()=>posUI,go:openReports,state:()=>state,e,button,badge,dateLabel,render,person:(id,from,to)=>operationsUI.member(id,from,to)});
  const hrUI=createHRUI({writeups:writeupsUI,training:()=>trainingUI,state:()=>state,e,button,badge,dateLabel,commit,render,notify,open:infoDialog,form:formDialog('hr'),close:()=>{if($('editor').open)$('editor').close();}});
  const trainingUI=createTrainingUI({state:()=>state,e,button,badge,dateLabel,commit,render,notify,open:infoDialog,form:formDialog('training'),close:()=>{if($('editor').open)$('editor').close();},go:()=>{closeOverlays();if($('editor').open)$('editor').close();state.view='schedules';scheduleUI.show('training');persist();}});
  const manageUI=createManageUI({openReport:board=>{reportsUI.show(board);openReports();},finance:financeUI,writeups:writeupsUI,hr:hrUI,training:trainingUI,state:()=>state,e,button,badge,dateLabel,commit,render,reports:()=>reportsUI.render(),setup:()=>operationsUI.section('setup'),close:()=>{if($('editor').open)$('editor').close();},open:infoDialog,form:(title,fields)=>formDialog('manage-form')(title,fields,'Save HR file')});
  const quickUI=createQuickUI({state:()=>state,e,dateLabel});
  const floorUI=createFloorUI({state:()=>state,e,button,badge,input,textarea,select,dateLabel,render,commit,notify,serviceFields,open:infoDialog,form:formDialog('floor'),close:()=>{if($('editor').open)$('editor').close();},edit:id=>edit('reservations',id),go:()=>{closeOverlays();state.view='reservations';persist();render();window.scrollTo({top:0,behavior:'instant'});}});
  // Menu and POS share one dialog opener: a save button when the form saves, a wide dialog for the long forms.
  const uiOpen=type=>(title,fields,save=true,label='',wide=false)=>{editing={type};showDialog(title,fields);const submit=$('editor-form').querySelector('[type=submit]');submit.hidden=!save;if(label)submit.textContent=label;$('editor-form').querySelector('.dialog-actions [data-action=close]').textContent=save?'Cancel':'Close';if(wide)$('editor').classList.add('is-wide');};
  const goView=view=>()=>{closeOverlays();if($('editor').open)$('editor').close();state.view=view;persist();render();window.scrollTo({top:0,behavior:'instant'});};
  const menuUI=createMenuUI({state:()=>state,e,input,textarea,select,dateLabel,commit,notify,render,go:goView('menu'),close:()=>{if($('editor').open)$('editor').close();},open:uiOpen('menu')});
  // The POS can hand the till to another team member by PIN; that is the same switch as the "Preview as" control, staying on the POS.
  const posUI=createPosUI({state:()=>state,e,input,textarea,select,dateLabel,commit,notify,render,go:goView('pos'),close:()=>{if($('editor').open)$('editor').close();},open:uiOpen('pos'),switchUser:id=>{const p=state.team.find(x=>x.id===id&&x.active);if(!p)return;state.role=p.access;if(p.access==='manager')state.managerId=p.id;else state.crewId=p.id;state.view='pos';persist();render();}});
  // The layout editor drags tables with pointer events and nudges them with arrow keys; the guest search filters as you type.
  document.addEventListener('pointerdown',ev=>{if(state.view==='reservations')floorUI.pointer(ev);});
  document.addEventListener('input',ev=>{if(ev.target?.dataset){floorUI.onInput(ev.target);menuUI.onInput(ev.target);posUI.onInput(ev.target);}});
  document.addEventListener('keydown',ev=>{if(state.view==='reservations'&&floorUI.key(ev))ev.stopImmediatePropagation();},true);
  // Seated-for and running-late timings move with the clock while the floor is open.
  setInterval(()=>{if(((state.view==='reservations'&&floorUI.tab()==='floor')||state.view==='pos')&&!document.querySelector('dialog[open]')&&document.visibilityState==='visible')render();},60000);
  // The command bar lifts off the page once content scrolls under it.
  const lift=()=>document.body.classList.toggle('is-scrolled',scrollY>4);addEventListener('scroll',lift,{passive:true});lift();
  // Ctrl/Cmd+K or / opens search anywhere; on Stock, / jumps to the stock search instead.
  document.addEventListener('keydown',ev=>{
    if((ev.ctrlKey||ev.metaKey)&&!ev.altKey&&ev.key.toLowerCase()==='k'){ev.preventDefault();if($('quick-dialog').open)quickUI.close();else quickUI.open('search');return;}
    if(ev.key!=='/'||ev.ctrlKey||ev.metaKey||ev.altKey||ev.target.closest?.('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]'))return;
    ev.preventDefault();const search=(state.view==='stock'&&document.querySelector('[data-stock-search]'))||(state.view==='menu'&&document.querySelector('[data-mn-search]'))||(state.view==='pos'&&document.querySelector('[data-ps-search]'));if(search)search.focus();else quickUI.open('search');
  });
  const aliases={shifts:'schedules',checklists:'lists',briefings:'onboarding',supply:'orders',supplies:'orders','86':'eighty-six',count:'inventory',dashboard:'schedules',till:'pos',checks:'pos',dishes:'menu',recipes:'menu'};
  const requested=location.hash.slice(1);if(B.views.includes(requested))state.view=requested;else if(aliases[requested])state.view=aliases[requested];
  if(!requested){state.view='schedules';scheduleUI.show('home');homeUI.entry();}
  persist();render();if(!storage)$('save-status').textContent='Storage unavailable. Changes last only while this page is open.';
})();
