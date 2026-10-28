/* Reservations screen: a live table map beside tonight's bookings, tap-to-assign on the map, a layout editor mode, the booking form with a table picker, and the guest directory used by Reports. */
globalThis.createFloorUI=function(api){
 'use strict';
 const B=Brigly,F=()=>B.floor,{e,button,badge,input,textarea,select,dateLabel}=api,s=()=>api.state();
 const manager=()=>s().role==='manager',canEdit=()=>manager()||!!B.permissions?.can(s(),'floor'),canBook=()=>manager()||!!B.permissions?.can(s(),'reservations');
 const plural=(n,w)=>n+' '+w+(n===1?'':'s');
 const num=n=>Math.round(n||0).toLocaleString('en-US');
 const today=()=>B.dateString(new Date());
 const rooms=()=>F().plan(s()).rooms,tables=()=>F().plan(s()).tables;
 const roomName=id=>rooms().find(r=>r.id===id)?.name||'Room';
 const tableWord=labels=>!labels||!labels.length?'No table':(labels.length>1?'Tables ':'Table ')+labels.join(' + ');
 const clock=F().clock,mins=F().mins;
 const btn=(label,action,id='',style='secondary',attrs='')=>`<button type="button" class="button ${style}" data-action="fl-${action}" data-id="${e(id)}" ${attrs}>${label}</button>`;
 const paths={plus:'M12 5v14 M5 12h14',walk:'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M9 21l2-7-2-2 M15 21l-2-6-2-2 M9 10l1.5-3 3 1 3 3 M7 13l2-3',edit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',back:'M15 5l-7 7 7 7',chart:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',x:'M6 6l12 12 M18 6L6 18',check:'M5 12l5 5 9-10',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]}"/></svg>`;
 const tone=st=>({seated:'sage',late:'danger',reserved:'amber',soon:'amber',open:'slate'})[st]||'slate';
 const statusWord=st=>({seated:'Seated',late:'Running late',reserved:'Reserved now',soon:'Arriving soon',open:'Open'})[st]||'Open';
 const statusTone=st=>st==='Seated'?'tone-sage':st==='Confirmed'?'tone-amber':st==='Completed'?'tone-slate':'tone-danger';
 const chipTone=label=>label==='VIP'?'orange':label==='Allergy'?'danger':label==='Regular'?'sage':'slate';
 const slug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'room';
 const rid=()=>Math.random().toString(36).slice(2,8);
 const hhmm=t=>new Date('2000-01-01T'+t+':00').toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}).replace(':00','');
 const minutesSince=iso=>Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));
 // The POS colours each server; the same hue follows them here on the live map.
 const hueOf=id=>{const ids=s().team.filter(p=>p.active).map(p=>p.id).sort();const i=ids.indexOf(id);return i<0?0:i%8;};
 const posState=label=>B.pos&&s().pos?B.pos.tableState(s(),s().date,s().service,label):null;
 let view='floor',room='',viewTime=null,scopeKey='',filter='all',bookingQuery='',selected=null,editRoom=null,drag=null,lastDrag=0,floorForm='',prefill=null,picking=null,reportRange=null,guestQuery='';

 const scoped=()=>{const st=s(),k=st.date+'|'+st.service;if(k!==scopeKey){scopeKey=k;viewTime=null;picking=null;}return st;};
 const window_=()=>F().serviceWindow(s(),s().service);
 const liveNow=()=>{const st=s(),{start,end}=window_(),n=F().nowMinutes();return st.date===today()&&n>=start&&n<end;};
 const at=()=>{const {start,end}=window_();if(viewTime!=null)return Math.min(Math.max(viewTime,start),end-1);return liveNow()?F().nowMinutes():start;};
 const current=()=>s().reservations.filter(r=>r.date===s().date&&r.service===s().service).sort((a,b)=>a.time.localeCompare(b.time));
 const booking=id=>s().reservations.find(r=>r.id===id);
 const activeRoom=()=>{const list=rooms();if(!list.some(r=>r.id===room))room=list[0]?.id||'';return list.find(r=>r.id===room);};

 // ---------- Map ----------
 function tableEl(t,occ,edit){
  const b=occ?.booking,status=occ?.status||'open',late=status==='late'&&b?at()-mins(b.time):0;
  const seatedFor=b?.status==='Seated'&&b.seatedAt&&s().date===today()?minutesSince(b.seatedAt):0;
  const pick=picking&&!edit?(picking.tables.some(l=>l.toLowerCase()===t.label.toLowerCase())?'on':occ&&occ.status!=='open'&&!(b&&b.id===picking.id)?'busy':t.max<picking.guests?'small':'ok'):'';
  const detail=b?`<span class="fl-party">${e(b.name)}</span><span class="fl-when">${b.guests} · ${status==='seated'?(seatedFor?seatedFor+' min':'seated'):status==='late'?late+' min late':e(b.time)}</span>`:occ?.next?`<span class="fl-when">${e(occ.next.time)} ${e(occ.next.name)}</span>`:'';
  const pos=edit?null:posState(t.label),posSrv=pos?.server?`<i class="ps-srv" data-hue="${hueOf(pos.server)}" title="${e(B.person(pos.server)?.name||'')}">${e(B.person(pos.server)?.initials||'')}</i>`:'',posCheck=pos?.check?`<span class="fl-check">$${Math.round(pos.totals.total)} · ${e(pos.stage==='sent'?'in kitchen':pos.stage)}</span>`:'';
  return `<button type="button" class="fl-table ${edit?'is-edit':''} ${selected===t.id&&edit?'is-selected':''}" data-action="fl-${edit?'select':picking?'pick-table':'table'}" data-id="${e(t.id)}" data-shape="${e(t.shape)}" data-tone="${edit?'edit':tone(status)}" ${pick?`data-pick="${pick}"`:''} ${b&&b.tables.length>1?`data-group="${e(b.id)}"`:''} style="--x:${t.x};--y:${t.y};--w:${t.w};--h:${t.h};" aria-label="Table ${e(t.label)}, ${t.seats} seats, ${edit?roomName(t.room):statusWord(status)}${b?', '+e(b.name):''}${pos?.server?', server '+e(B.person(pos.server)?.name||''):''}" ${edit?`aria-pressed="${selected===t.id}"`:picking?`aria-pressed="${pick==='on'}"`:''}><b class="fl-label">${e(t.label)}</b>${posSrv}<small class="fl-seats">${t.seats}${t.max>t.seats?'–'+t.max:''}</small>${b&&b.tables.length>1?'<i class="fl-link" aria-hidden="true">⛓</i>':''}${edit?`<i class="fl-resize" aria-hidden="true"></i>`:detail+posCheck}</button>`;
 }
 function canvas(r,occs,edit){
  const list=tables().filter(t=>t.room===r.id).map(t=>tableEl(t,occs?.find(o=>o.table.id===t.id),edit)).join('');
  return `<div class="fl-canvas-wrap"><div class="fl-canvas" data-room="${e(r.id)}" data-cols="${r.cols}" data-rows="${r.rows}" ${edit?'data-edit="true"':''} style="--cols:${r.cols};--rows:${r.rows}" role="group" aria-label="${e(r.name)} table map">${list||(edit?'<p class="fl-empty-room">No tables yet. Add one above, then drag it into place.</p>':'<p class="fl-empty-room">No tables in this room.</p>')}</div></div>`;
 }
 const roomChips=(occs,edit)=>`<div class="fl-rooms" role="tablist" aria-label="Rooms">${rooms().map(r=>{const mine=occs?occs.filter(o=>o.table.room===r.id):tables().filter(t=>t.room===r.id),busy=occs?mine.filter(o=>o.status!=='open').length:0,cur=(edit?editRoom:room)===r.id;return `<button type="button" role="tab" class="fl-room-chip" data-action="fl-${edit?'edit-room':'room'}" data-id="${e(r.id)}" aria-selected="${cur}">${e(r.name)}<em>${occs?busy+'/'+mine.length:mine.length}</em></button>`;}).join('')}${edit?btn(icon('plus')+'<span>Room</span>','add-room','','quiet small fl-icon-btn','aria-label="Add a room"'):''}</div>`;
 function timeBar(){
  const st=s(),A=at(),{start,end}=window_(),live=liveNow(),pace=F().timeline(st,st.date,st.service),max=Math.max(1,...pace.map(p=>p.covers));
  return `<div class="fl-time"><button type="button" class="fl-now ${live&&viewTime==null?'is-live':''}" data-action="fl-now" aria-pressed="${live&&viewTime==null}" ${live?'':'disabled'}>${live?'<span class="live-dot"></span>Live':st.date<today()?'Replay':'Preview'}</button><strong id="fl-time-label">${clock(A)}</strong><div class="fl-time-track"><div class="fl-pace-mini" aria-hidden="true">${pace.map(p=>`<i style="height:${Math.max(8,p.covers/max*100)}%" class="${p.minutes<=A&&A<p.minutes+30?'is-now':''}" title="${e(p.time)} · ${p.covers} covers"></i>`).join('')}</div><input type="range" data-fl-time min="${start}" max="${end-15}" step="15" value="${A}" aria-label="Moment of the service to view"></div></div>`;
 }
 const legend=()=>`<div class="fl-legend"><span data-tone="sage">Seated</span><span data-tone="amber">Reserved</span><span data-tone="danger">Late</span><span data-tone="slate">Open</span>${B.pos&&s().pos?'<span class="fl-legend-note">Initials show each table’s server</span>':''}</div>`;
 function pickBanner(){
  if(!picking)return '';
  const b=booking(picking.id);if(!b){picking=null;return '';}
  const st=s(),seats=F().seatsOf(st,picking.tables),cap=F().capacity(st,picking.tables),ok=picking.tables.length&&cap>=b.guests;
  return `<div class="fl-pickbar" role="status"><div><strong>${b.status==='Seated'?'Move':'Table for'} ${e(b.name)} · ${plural(b.guests,'guest')}</strong><small>${picking.tables.length?`${e(tableWord(picking.tables))} · ${seats} seats${cap>seats?' (up to '+cap+')':''}${ok?'':' · <span class="fl-warn">too small, tap another to join</span>'}`:'Tap a table on the map. Tap a second one to join tables.'}</small></div><div class="toolbar">${b.status==='Confirmed'?btn('Seat here','pick-confirm',b.id,'',(ok?'':'disabled ')+'data-seat="true"')+btn('Assign only','pick-confirm',b.id,'secondary',ok?'':'disabled'):btn('Move here','pick-confirm',b.id,'',ok?'':'disabled')}${btn('Cancel','pick-cancel','','quiet')}</div></div>`;
 }
 const rowAction=(r,occStatus)=>{
  if(r.status==='Confirmed'&&!r.tables.length)return btn('Pick table','pick-start',r.id,'small','data-mode="assign"');
  if(r.status==='Confirmed')return btn('Seat','seat',r.id,'small');
  if(r.status==='Seated')return btn('Done','complete',r.id,'quiet small');
  return '';
 };
 const bookingRow=r=>{const late=r.status==='Confirmed'&&mins(r.time)+15<=at()&&r.date<=today();return `<div class="fl-row" data-status="${e(r.status)}" ${late?'data-late="true"':''}><button type="button" class="fl-row-open" data-action="fl-booking" data-id="${e(r.id)}" aria-label="Open booking for ${e(r.name)}"><strong class="fl-row-time">${e(r.time)}</strong><span class="fl-row-main"><b>${e(r.name)}${r.tags.includes('VIP')?' <i class="fl-tag" data-tone="orange">VIP</i>':''}</b><small>${r.guests} · ${e(tableWord(r.tables))}${late?' · <span class="fl-warn">'+(at()-mins(r.time))+' min late</span>':r.status==='Seated'&&r.seatedAt&&r.date===today()?' · '+minutesSince(r.seatedAt)+' min in':''}${r.note?' · '+e(r.note):''}</small></span></button><div class="fl-row-actions">${rowAction(r)}</div></div>`;};
 function arrivalsBody(){
  const list=current(),A=at(),open=list.filter(r=>!F().CLOSED.includes(r.status));
  const attention=open.filter(r=>r.status==='Confirmed'&&(!r.tables.length||(mins(r.time)+15<=A&&s().date<=today())));
  const upcoming=open.filter(r=>r.status==='Confirmed'&&!attention.includes(r));
  const seated=open.filter(r=>r.status==='Seated'),done=list.filter(r=>r.status==='Completed'),closed=list.filter(r=>F().CLOSED.includes(r.status));
  const group=(title,rows,extra='')=>rows.length?`<div class="fl-group"><h4 class="fl-sub">${title} <em>${rows.length}</em>${extra}</h4>${rows.map(bookingRow).join('')}</div>`:'';
  const q=bookingQuery.trim().toLowerCase(),match=r=>!q||r.name.toLowerCase().includes(q)||r.tables.some(l=>l.toLowerCase().includes(q))||(r.note||'').toLowerCase().includes(q);
  const body=q?`<div class="fl-group">${open.concat(done,closed).filter(match).map(bookingRow).join('')||'<p class="context-empty">No booking matches.</p>'}</div>`:(group('Needs attention',attention)+group('Arriving',upcoming)+group('Seated',seated)+(done.length||closed.length?`<p class="fl-finished">${done.length?plural(done.length,'completed visit'):''}${done.length&&closed.length?' · ':''}${closed.length?closed.length+' cancelled / no-show':''} · ${btn('All bookings','view','bookings','link')}</p>`:''));
  return open.length||done.length||closed.length?body:`<div class="empty"><strong>No bookings yet</strong>Add a booking or seat a walk-in from the map.</div>`;
 }
 const arrivals=()=>`<section class="panel fl-arrivals"><div class="fl-arrivals-head"><h3>${e(s().service)} bookings <em>${current().filter(r=>!F().CLOSED.includes(r.status)).length}</em></h3><label class="fl-search"><span class="sr-only">Search bookings</span>${icon('search')}<input type="search" data-fl-booking-search value="${e(bookingQuery)}" placeholder="Find a guest or table" autocomplete="off"></label></div><div id="fl-arrivals-body">${arrivalsBody()}</div></section>`;
 function floorView(){
  const st=scoped(),A=at(),occs=F().occupancy(st,st.date,st.service,A),S=F().stats(st,st.date,st.service,A),r=activeRoom();
  const chip=(v,label,toneName='')=>`<span class="fl-stat" ${toneName?`data-tone="${toneName}"`:''}><b>${v}</b>${label}</span>`;
  const posOpen=B.pos&&st.pos?B.pos.openChecks(st,st.date,st.service):[];
  const strip=`<div class="fl-strip" aria-label="Service at a glance">${chip(S.openTables,'open tables')}${chip(S.covers,'covers booked')}${chip(S.seatedNow,'seated')}${chip(S.arrivingSoon,'arriving soon')}${S.late?chip(S.late,'running late','danger'):''}${S.unassigned?chip(S.unassigned,'need a table','amber'):''}${B.pos&&st.pos?chip(posOpen.length,'open checks'):''}</div>`;
  const map=`<section class="panel fl-map">${roomChips(occs,false)}${pickBanner()}${r?canvas(r,occs.filter(o=>o.table.room===r.id),false):'<div class="empty"><strong>No rooms yet</strong>Open the layout editor to draw the restaurant.</div>'}<div class="fl-map-foot">${legend()}${canEdit()?btn(icon('edit')+'<span>Edit layout</span>','view','editor','quiet small fl-icon-btn'):''}</div></section>`;
  return strip+`<div class="fl-layout"><div class="fl-map-col">${timeBar()}${map}</div>${arrivals()}</div>`;
 }

 // ---------- Bookings list ----------
 function bookingsView(){
  const all=current(),counts={all:all.length,Confirmed:all.filter(r=>r.status==='Confirmed').length,Seated:all.filter(r=>r.status==='Seated').length,Completed:all.filter(r=>r.status==='Completed').length,closed:all.filter(r=>F().CLOSED.includes(r.status)).length};
  const filtered=filter==='all'?all:filter==='closed'?all.filter(r=>F().CLOSED.includes(r.status)):all.filter(r=>r.status===filter);
  const tabs=[['all','All',counts.all],['Confirmed','Upcoming',counts.Confirmed],['Seated','Seated',counts.Seated],['Completed','Done',counts.Completed],['closed','Cancelled',counts.closed]];
  const card=r=>{const seatedFor=r.status==='Seated'&&r.seatedAt&&r.date===today()?minutesSince(r.seatedAt):0;return `<article class="res-card fl-card ${F().CLOSED.includes(r.status)?'is-closed':''}" data-status="${e(r.status)}"><div class="res-time-col"><strong class="res-time">${e(r.time)}</strong><span class="badge ${statusTone(r.status)}">${e(r.status)}</span><small class="fl-until">until ${clock(mins(r.time)+r.duration)}${seatedFor?' · '+seatedFor+' min in':''}</small></div><div class="res-main-col"><div class="res-guest-line"><h3><button type="button" class="fl-name" data-action="fl-guest" data-id="${e(F().guestKey(r))}">${e(r.name)}</button></h3><span class="arrival-pill">${plural(r.guests,'guest')}</span><span class="arrival-pill table-pill ${r.tables.length?'':'unassigned'}">${e(tableWord(r.tables))}</span>${r.tags.map(t=>`<span class="fl-tag" data-tone="${chipTone(t)}">${e(t)}</span>`).join('')}</div>${r.note?`<div class="res-note-callout"><strong>Note</strong><span>${e(r.note)}</span></div>`:''}<small class="fl-card-meta">${e(r.source)}${r.contact?' · '+e(r.contact):''}</small></div><div class="res-actions-col">${r.status==='Confirmed'?(r.tables.length?btn('Seat','seat',r.id,''):btn('Pick table','pick-start',r.id,'','data-mode="assign"'))+btn('Details','booking',r.id,'secondary'):''}${r.status==='Seated'?btn('Complete','complete',r.id,'')+btn('Details','booking',r.id,'secondary'):''}${!['Confirmed','Seated'].includes(r.status)?btn('Details','booking',r.id,'quiet'):''}</div></article>`;};
  return `<div class="fl-filters" role="tablist" aria-label="Filter bookings">${tabs.map(([key,label,cnt])=>`<button type="button" role="tab" class="fl-room-chip" data-action="fl-filter" data-id="${key}" aria-selected="${filter===key}">${label}<em>${cnt}</em></button>`).join('')}${manager()?button('Guest statistics ›','ops-report-tab','guests','','link'):''}</div><div class="res-card-list">${filtered.length?filtered.map(card).join(''):`<div class="panel"><div class="empty"><strong>Nothing here</strong>Switch the filter above or add a booking for this service.</div></div>`}</div>`;
 }

 // ---------- Layout editor ----------
 function editorView(){
  const st=s(),plan=F().plan(st);
  if(!editRoom||!plan.rooms.some(r=>r.id===editRoom))editRoom=room||plan.rooms[0]?.id;
  const r=plan.rooms.find(x=>x.id===editRoom);if(!r)return '<div class="empty"><strong>No rooms yet</strong></div>';
  const idx=plan.rooms.indexOf(r);let t=selected?F().tableOf(st,selected):null;if(t&&t.room!==editRoom){selected=null;t=null;}
  const presets=[['round',2,2,2,2,'Round · 2'],['square',4,4,2,2,'Square · 4'],['rect',6,8,3,2,'Rect · 6'],['booth',4,4,3,2,'Booth · 4'],['bar',2,2,2,2,'High-top · 2']];
  const toolbar=`<div class="fl-edit-tools"><div class="fl-edit-room"><strong>${e(r.name)}</strong><small>${r.cols} × ${r.rows} cells · ${plural(plan.tables.filter(x=>x.room===r.id).length,'table')} · ${num(plan.tables.filter(x=>x.room===r.id).reduce((n,x)=>n+x.seats,0))} seats</small></div><div class="toolbar">${btn('Room settings','room-edit',r.id,'secondary small')}${idx>0?btn('←','room-order',r.id,'quiet small','data-direction="-1" aria-label="Move room earlier"'):''}${idx<plan.rooms.length-1?btn('→','room-order',r.id,'quiet small','data-direction="1" aria-label="Move room later"'):''}</div></div><div class="fl-presets"><span>Add</span>${presets.map(([shape,seats,max,w,h,label])=>`<button type="button" class="fl-preset" data-action="fl-add-table" data-id="${shape}" data-seats="${seats}" data-max="${max}" data-w="${w}" data-h="${h}"><i class="fl-table-mini" data-shape="${shape}"></i>${label}</button>`).join('')}<label class="fl-turn"><span>Default turn</span><select data-fl-turn aria-label="Default turn time">${F().DURATIONS.map(d=>`<option value="${d}" ${d===plan.settings.turnMinutes?'selected':''}>${d} min</option>`).join('')}</select></label></div>`;
  const props=t?`<aside class="fl-props panel" aria-label="Table settings"><div class="fl-props-head"><div><h3>Table ${e(t.label)}</h3><p>${e(roomName(t.room))} · ${t.seats} seats${t.max>t.seats?' · up to '+t.max:''}</p></div>${btn(icon('x'),'select','','quiet small fl-icon-only','aria-label="Close table settings"')}</div><div class="fl-props-grid"><label>Label<input data-fl-prop="label" data-id="${e(t.id)}" value="${e(t.label)}" maxlength="${F().LIMITS.label}" required></label><label>Shape<select data-fl-prop="shape" data-id="${e(t.id)}">${F().SHAPES.map(x=>`<option value="${x}" ${x===t.shape?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label><label>Seats<input type="number" inputmode="numeric" data-fl-prop="seats" data-id="${e(t.id)}" value="${t.seats}" min="1" max="40" step="1"></label><label>Max guests<input type="number" inputmode="numeric" data-fl-prop="max" data-id="${e(t.id)}" value="${t.max}" min="${t.seats}" max="60" step="1"></label><label>Width<input type="number" inputmode="numeric" data-fl-prop="w" data-id="${e(t.id)}" value="${t.w}" min="1" max="10" step="1"></label><label>Depth<input type="number" inputmode="numeric" data-fl-prop="h" data-id="${e(t.id)}" value="${t.h}" min="1" max="10" step="1"></label><label class="fl-span">Room<select data-fl-prop="room" data-id="${e(t.id)}">${plan.rooms.map(x=>`<option value="${e(x.id)}" ${x.id===t.room?'selected':''}>${e(x.name)}</option>`).join('')}</select></label></div><div class="toolbar">${btn('Duplicate','duplicate',t.id,'secondary small')}${btn('Remove','remove-table',t.id,'danger small')}</div></aside>`:'';
  return `<div class="fl-edit-head"><p class="fl-hint">Drag tables to move them, drag the corner to resize. Tap a table for its label, seats and capacity. Arrow keys nudge, Shift + arrows resize.</p></div>${roomChips(null,true)}<div class="fl-editor ${t?'has-props':''}"><section class="panel fl-map is-edit">${toolbar}${canvas(r,null,true)}<div class="fl-map-foot"><small class="fl-hint">${plan.rooms.length>1&&!plan.tables.some(x=>x.room===r.id)?btn('Remove this room','remove-room',r.id,'danger small'):'Labels are what bookings use. Keep them short and unique across rooms.'}</small></div></section>${props}</div>`;
 }

 function render(){
  const st=scoped(),list=current().filter(r=>!F().CLOSED.includes(r.status));
  if(view==='editor'&&!canEdit())view='floor';
  const bar=view==='editor'?`<div class="fl-bar"><div class="fl-bar-title">${btn(icon('back')+'<span>Done</span>','view','floor','secondary small fl-icon-btn')}<h2>Edit layout</h2></div></div>`
   :`<div class="fl-bar"><div class="segmented fl-seg" role="tablist" aria-label="Reservation views"><button type="button" role="tab" class="${view==='floor'?'selected':''}" data-action="fl-view" data-id="floor" aria-selected="${view==='floor'}">Floor plan</button><button type="button" role="tab" class="${view==='bookings'?'selected':''}" data-action="fl-view" data-id="bookings" aria-selected="${view==='bookings'}">Bookings <em>${list.length}</em></button></div>${canBook()?`<div class="fl-bar-actions">${btn(icon('walk')+'<span>Walk-in</span>','walkin','','secondary fl-icon-btn')}<button type="button" class="button fl-icon-btn" data-action="edit" data-collection="reservations" data-id="">${icon('plus')}<span>Booking</span></button></div>`:''}</div>`;
  return `<div class="reservations-view fl-page" data-view="${view}">${bar}${view==='bookings'?bookingsView():view==='editor'?editorView():floorView()}</div>`;
 }

 // ---------- Sheets ----------
 const sheetRow=(r,extra='')=>`<div class="fl-row" data-status="${e(r.status)}"><button type="button" class="fl-row-open" data-action="fl-booking" data-id="${e(r.id)}"><strong class="fl-row-time">${e(r.time)}<small>–${clock(mins(r.time)+r.duration)}</small></strong><span class="fl-row-main"><b>${e(r.name)}</b><small>${r.guests} · ${e(tableWord(r.tables))}${r.note?' · '+e(r.note):''}</small></span></button><div class="fl-row-actions">${badge(r.status,statusTone(r.status))}${extra}</div></div>`;
 function tableSheet(id){
  const st=s(),t=F().tableOf(st,id);if(!t)return;
  const A=at(),occ=F().occupancy(st,st.date,st.service,A).find(o=>o.table.id===id),b=occ.booking;
  const waiting=current().filter(r=>r.status==='Confirmed'&&!r.tables.includes(t.label)&&Math.abs(mins(r.time)-A)<=90&&r.guests<=t.max).filter(r=>!F().conflicts(st,{id:r.id,date:r.date,time:r.time,duration:r.duration,tables:[t.label]}).length).sort((a,b)=>Math.abs(mins(a.time)-A)-Math.abs(mins(b.time)-A)).slice(0,4);
  const html=`<div class="fl-sheet"><div class="fl-sheet-top"><span class="badge tone-${tone(occ.status)}">${statusWord(occ.status)}</span><span class="badge">${t.seats} seats${t.max>t.seats?' · up to '+t.max:''}</span>${occ.freeAt&&occ.status!=='open'?`<span class="badge">Free ~${clock(occ.freeAt)}</span>`:''}</div>
  ${b?`<div class="fl-current" data-tone="${tone(occ.status)}"><div><strong>${e(b.name)}</strong><small>${plural(b.guests,'guest')} · ${e(b.time)} · ${e(tableWord(b.tables))}${b.status==='Seated'&&b.seatedAt&&st.date===today()?' · '+minutesSince(b.seatedAt)+' min in':''}</small>${b.tags.length?`<div class="fl-chips">${b.tags.map(x=>`<span class="fl-tag" data-tone="${chipTone(x)}">${e(x)}</span>`).join('')}</div>`:''}${b.note?`<p>${e(b.note)}</p>`:''}</div><div class="toolbar fl-primary-row">${b.status==='Confirmed'?btn('Seat now','seat',b.id,''):''}${b.status==='Seated'?btn('Complete visit','complete',b.id,''):''}${btn('Details','booking',b.id,'secondary')}</div></div>`:`<p class="fl-open-note">Free at ${clock(A)}.${occ.next?' Next: '+e(occ.next.name)+' at '+e(occ.next.time)+'.':''}</p>`}
  ${(()=>{const pos=posState(t.label);if(!pos)return '';const may=manager()||!!B.permissions?.can(st,'pos');return `<div class="fl-pos-row"><span>${pos.server?'Server <strong>'+e(B.person(pos.server)?.name||'')+'</strong>':'No server assigned'}${pos.check?' · check #'+pos.check.number+' · $'+pos.totals.total.toFixed(2)+' · '+e(pos.stage):''}</span>${may?`<button type="button" class="button small ${pos.check?'':'secondary'}" data-action="ps-table" data-id="${e(t.label)}">${pos.check?'Open check':'New check'}</button>`:''}</div>`;})()}
  ${canBook()?`<div class="toolbar fl-primary-row">${occ.status==='open'||occ.status==='soon'?btn(icon('walk')+'<span>Seat a walk-in</span>','walkin','',(b?'secondary':'')+' fl-icon-btn',`data-table="${e(t.label)}"`):''}${btn(icon('plus')+'<span>Book this table</span>','book','','secondary fl-icon-btn',`data-table="${e(t.label)}"`)}</div>`:''}
  ${waiting.length?`<h4 class="fl-sub">Seat a waiting party here</h4>${waiting.map(r=>sheetRow(r,btn('Seat here','seat',r.id,'small',`data-tables="${e(t.label)}"`))).join('')}`:''}
  ${occ.bookings.length>(b?1:0)?`<h4 class="fl-sub">Later on this table</h4>${occ.bookings.filter(r=>r!==b).map(r=>sheetRow(r)).join('')}`:''}</div>`;
  api.open(`Table ${t.label} · ${roomName(t.room)}`,html);
 }
 function bookingSheet(id){
  const r=booking(id);if(!r)return;
  const st=s(),occ=r.tables.length?F().occupancy(st,r.date,r.service,at()).find(o=>o.table.label===r.tables[0]):null;
  const late=r.status==='Confirmed'&&r.date<=today()&&mins(r.time)+15<=at();
  const html=`<div class="fl-sheet"><div class="fl-sheet-top">${badge(late?'Running late':r.status,late?'tone-danger':statusTone(r.status))}<span class="badge">${plural(r.guests,'guest')}</span><span class="badge">${e(r.time)}–${clock(mins(r.time)+r.duration)}</span><span class="badge ${r.tables.length?'':'tone-amber'}">${e(tableWord(r.tables))}</span>${r.tags.map(x=>`<span class="fl-tag" data-tone="${chipTone(x)}">${e(x)}</span>`).join('')}</div>
  <p class="fl-sheet-meta">${e(r.source)}${r.contact?' · '+e(r.contact):''} · ${e(dateLabel(r.date,{weekday:'short',month:'short',day:'numeric'}))} ${e(r.service)}${r.seatedAt&&r.status==='Seated'&&r.date===today()?' · seated '+minutesSince(r.seatedAt)+' min ago':''}</p>
  ${r.note?`<div class="res-note-callout"><strong>Note</strong><span>${e(r.note)}</span></div>`:''}
  ${canBook()?`<div class="toolbar fl-primary-row">${r.status==='Confirmed'?(r.tables.length?btn('Seat now','seat',r.id,''):'')+btn(r.tables.length?'Move table':'Pick a table','pick-start',r.id,r.tables.length?'secondary':'','data-mode="assign"'):''}${r.status==='Seated'?btn('Complete visit','complete',r.id,'')+btn('Move table','pick-start',r.id,'secondary','data-mode="assign"'):''}${['Confirmed','Seated'].includes(r.status)?button('Edit','edit',r.id,'data-collection="reservations"','secondary'):''}</div><div class="toolbar fl-secondary-row">${btn('Guest profile','guest',F().guestKey(r),'quiet small')}${r.status==='Confirmed'?btn('No-show','noshow',r.id,'quiet small')+btn('Cancel booking','cancel',r.id,'quiet small fl-danger-text'):''}</div>`:''}</div>`;
  api.open(r.name,html);
 }
 function guestSheet(key){
  const st=s(),G=F().guests(st,'2000-01-01','2999-12-31'),g=G.directory.find(x=>x.key===key);if(!g)return;
  const hist=F().history(st,key).slice(0,12);
  const stat=(l,v)=>`<div><strong>${v}</strong><small>${l}</small></div>`;
  const html=`<div class="fl-sheet"><div class="fl-sheet-top">${badge(g.tier,g.tier==='VIP'?'tone-orange':g.tier==='Regular'?'tone-sage':'tone-slate')}${g.contact?`<span class="badge">${e(g.contact)}</span>`:''}${g.tags.map(x=>`<span class="fl-tag" data-tone="${chipTone(x)}">${e(x)}</span>`).join('')}</div>
  <div class="fl-stat-grid">${stat('Visits',g.visits)}${stat('Covers',g.covers)}${stat('Avg party',g.avgParty||'—')}${stat('No-shows',g.noShows)}${stat('Reliability',g.reliability+'%')}${stat('Usual time',g.usualTime||'—')}${stat('Favourite',g.favouriteTable?'Table '+e(g.favouriteTable):'—')}${stat('At the table',g.dineMinutes?g.dineMinutes+' min':'—')}</div>
  ${canBook()?`<div class="toolbar fl-primary-row">${btn(icon('plus')+'<span>Book again</span>','rebook',g.key,'fl-icon-btn')}</div>`:''}
  ${g.notes.length?`<h4 class="fl-sub">Notes from past bookings</h4><ul class="fl-notes">${g.notes.map(n=>`<li><small>${e(dateLabel(n.date))}</small>${e(n.text)}</li>`).join('')}</ul>`:''}
  <h4 class="fl-sub">History</h4>${hist.map(r=>`<div class="fl-row" data-status="${e(r.status)}"><button type="button" class="fl-row-open" data-action="fl-booking" data-id="${e(r.id)}"><strong class="fl-row-time">${e(dateLabel(r.date,{month:'short',day:'numeric'}))}<small>${e(r.time)}</small></strong><span class="fl-row-main"><b>${e(r.service)} · ${plural(r.guests,'guest')}</b><small>${e(tableWord(r.tables))} · ${e(r.source)}</small></span></button><div class="fl-row-actions">${badge(r.status,statusTone(r.status))}</div></div>`).join('')||'<p class="context-empty">No visits yet.</p>'}</div>`;
  api.open(g.name,html);
 }
 const confirmSheet=(title,text,label,action,id)=>api.open(title,`<div class="fl-sheet"><p>${text}</p><div class="toolbar fl-primary-row">${btn(label,action,id,'danger')}</div></div>`);

 // ---------- Guest statistics for the Reports board ----------
 const hbars=(rows,format=num)=>{const max=Math.max(1,...rows.map(r=>r.value));return rows.length?rows.map(r=>`<div class="fl-hbar" title="${e(r.label)} · ${format(r.value)}"><span>${e(r.label)}</span><div><i style="width:${Math.max(1,r.value/max*100)}%"></i></div><strong>${format(r.value)}</strong></div>`).join(''):'<p class="context-empty">Nothing recorded in this period.</p>';};
 const panel=(title,sub,body,acts='')=>`<section class="panel fl-panel"><div class="panel-head"><div><h3>${title}</h3><p>${sub}</p></div>${acts}</div><div class="fl-panel-body">${body}</div></section>`;
 function guestRows(G){
  const q=guestQuery.trim().toLowerCase(),list=G.directory.filter(g=>g.visits||g.upcoming||g.noShows||g.cancels).filter(g=>!q||g.name.toLowerCase().includes(q)||g.contact.toLowerCase().includes(q)||g.tags.some(t=>t.toLowerCase().includes(q))||g.notes.some(n=>n.text.toLowerCase().includes(q))).sort((a,b)=>b.inRange-a.inRange||b.visits-a.visits);
  const shown=list.slice(0,40);
  return (shown.map(g=>`<tr class="report-row-link" data-action="fl-guest" data-id="${e(g.key)}" tabindex="0"><td><div class="crew-name"><span class="avatar">${e(g.name.replace(/^[A-Z]\. /,'').slice(0,2).toUpperCase())}</span><div>${e(g.name)}<small>${e(g.contact||g.source||'')}${g.tags.length?' · '+g.tags.slice(0,3).map(e).join(', '):''}</small></div></div></td><td>${badge(g.tier,g.tier==='VIP'?'tone-orange':g.tier==='Regular'?'tone-sage':g.tier==='Returning'?'tone-slate':'')}</td><td><strong>${g.inRange}</strong><small class="table-detail">${g.visits} all time${g.upcoming?' · '+g.upcoming+' upcoming':''}</small></td><td>${g.coversInRange}</td><td>${g.avgParty||'—'}</td><td>${g.last?e(dateLabel(g.last)):'—'}</td><td>${e(g.usualTime||'—')}${g.favouriteTable?`<small class="table-detail">Table ${e(g.favouriteTable)}${g.favouriteRoom?' · '+e(g.favouriteRoom):''}</small>`:''}</td><td>${badge(g.reliability+'%',g.reliability>=90?'tone-sage':g.reliability>=75?'tone-amber':'tone-danger')}</td></tr>`).join('')||'<tr><td colspan="8">No guests match this search.</td></tr>')+(list.length>40?`<tr><td colspan="8"><small>Showing 40 of ${list.length} guests. Search to find someone.</small></td></tr>`:'');
 }
 function guestReport(from,to){
  const st=s();reportRange={from,to};const G=F().guests(st,from,to),M=G.summary,U=F().utilization(st,from,to);
  const stat=(l,v)=>`<div><strong>${v}</strong><small>${l}</small></div>`;
  const loyalty=panel('Returning guests',`${num(M.uniqueGuests)} guests in the period · ${M.returningShare}% had been before`,`<div class="fl-stat-grid is-report">${stat('New guests',num(M.newGuests))}${stat('Returning',num(M.returning))}${stat('Regulars · 4+ visits',num(M.regulars))}${stat('Visits per guest',M.visitsPerGuest)}${stat('Minutes at the table',M.avgDine||'—')}${stat('Joined tables',num(M.combined))}</div><h4 class="fl-sub">Visit frequency</h4>${hbars(G.cohorts)}`);
  const sources=panel('How guests book','Booking source, and what guests ask for',hbars(G.sources)+(G.tags.length?`<h4 class="fl-sub">Tags on bookings</h4>${hbars(G.tags.slice(0,6))}`:''));
  const seat=panel('Where guests sit',`Seat time used per room · ${plural(U.services,'service')}`,hbars(U.rooms.map(r=>({label:r.room.name,value:r.utilization})),v=>v+'%')+`<h4 class="fl-sub">Most booked tables</h4>`+hbars(U.tables.slice(0,6).map(t=>({label:'Table '+t.table.label+' · '+roomName(t.table.room),value:t.bookings}))),btn('Floor plan ›','open','floor','secondary small'));
  const watch=panel('Guests to watch',G.noShowGuests.length?'Two or more no-shows on record. Confirm these bookings the day before.':'No repeat no-shows on record.',G.noShowGuests.length?G.noShowGuests.map(g=>`<div class="fl-row"><button type="button" class="fl-row-open" data-action="fl-guest" data-id="${e(g.key)}"><span class="fl-row-main"><b>${e(g.name)}</b><small>${plural(g.noShows,'no-show')} · ${plural(g.visits,'visit')} · ${g.reliability}% reliable</small></span></button></div>`).join(''):'<p class="context-empty">Every guest with a booking has shown up or cancelled in time.</p>');
  const directory=`<section class="panel fl-panel fl-directory"><div class="panel-head"><div><h3>Guest directory</h3><p>Everyone who has booked, ranked by visits in the period. Select a guest for their history.</p></div><label class="fl-search"><span class="sr-only">Search guests</span>${icon('search')}<input type="search" data-fl-guest-search value="${e(guestQuery)}" placeholder="Name, contact, tag or note" autocomplete="off"></label></div><div class="table-scroll"><table><thead><tr><th>GUEST</th><th>TIER</th><th>VISITS</th><th>COVERS</th><th>AVG PARTY</th><th>LAST VISIT</th><th>USUAL</th><th>RELIABLE</th></tr></thead><tbody id="fl-guest-rows">${guestRows(G)}</tbody></table></div></section>`;
  return `<div class="fl-grid">${loyalty}${sources}</div><div class="fl-grid">${seat}${watch}</div>${directory}`;
 }

 // ---------- Forms ----------
 function picker(ctx){
  const st=s(),plan=F().plan(st),av=F().availability(st,ctx),sel=new Set((ctx.selected||[]).map(x=>x.toLowerCase()));
  const chip=r=>{const t=r.table,on=sel.has(t.label.toLowerCase()),blocked=!!r.conflict&&!on;return `<label class="fl-pick ${on?'is-on':''} ${blocked?'is-blocked':''}" data-fit="${r.fit}"><input type="checkbox" name="tables" value="${e(t.label)}" ${on?'checked':''} ${blocked?'disabled':''}><b>${e(t.label)}</b><small>${t.seats}${t.max>t.seats?'–'+t.max:''} seats</small><em>${r.conflict?'Booked '+e(r.conflict.time):r.fit==='small'?'Too small':r.fit==='squeeze'?'Squeeze':'Free'}</em></label>`;};
  const groups=plan.rooms.map(r=>{const mine=av.rows.filter(x=>x.table.room===r.id);return mine.length?`<div class="fl-pick-group"><p>${e(r.name)}</p><div class="fl-pick-grid">${mine.map(chip).join('')}</div></div>`:'';}).join('');
  const seats=F().seatsOf(st,ctx.selected||[]),cap=F().capacity(st,ctx.selected||[]);
  const summary=`<p class="fl-pick-summary" id="fl-pick-summary">${ctx.selected?.length?`${e(tableWord(ctx.selected))} · ${seats} seats${cap>seats?' (up to '+cap+')':''} for ${plural(ctx.guests,'guest')}${ctx.guests>cap?' · <span class="fl-warn">not enough seats, add another table</span>':''}`:'No table yet. Pick one below, or leave it for the host.'}</p>`;
  const suggest=av.suggestions.length?`<div class="fl-suggest"><span>Suggested</span>${av.suggestions.map(sg=>`<button type="button" class="fl-suggest-btn" data-action="fl-pick" data-tables="${e(sg.map(t=>t.label).join('+'))}">${e(sg.map(t=>t.label).join(' + '))}<small>${sg.reduce((n,t)=>n+t.seats,0)} seats</small></button>`).join('')}</div>`:'<p class="fl-pick-summary fl-warn">No free table fits this party at this time. Change the time or pick tables anyway.</p>';
  return `<div class="fl-picker" data-fl-picker data-exclude="${e(ctx.exclude||'')}"><div class="fl-picker-head"><strong>Table</strong><small>Free for ${hhmm(ctx.time)} · ${ctx.duration} min turn</small></div>${summary}${suggest}<details class="fl-pick-all" ${ctx.selected?.length||!av.suggestions.length?'open':''}><summary>All tables</summary>${groups}</details></div>`;
 }
 function pickerContext(form){
  const v=k=>form.elements.namedItem(k)?.value;
  const selected=[...form.querySelectorAll('input[name="tables"]:checked')].map(x=>x.value);
  return {date:B.isDate(v('date'))?v('date'):s().date,service:v('service')||s().service,time:/^\d\d:\d\d$/.test(v('time')||'')?v('time'):clock(at()),guests:Math.max(1,Number(v('guests'))||1),duration:Number(v('duration'))||F().plan(s()).settings.turnMinutes,exclude:form.querySelector('[data-fl-picker]')?.dataset.exclude||'',selected};
 }
 const refreshPicker=form=>{const box=form.querySelector('[data-fl-picker]');if(!box)return;box.outerHTML=picker(pickerContext(form));};
 const durationSelect=value=>select('duration','Turn time',F().DURATIONS.map(d=>[String(d),d+' minutes']),String(value));
 const tagChips=selected=>`<fieldset class="fl-tags"><legend>Tags</legend><div class="fl-tags-row">${F().TAGS.map(t=>`<label class="fl-tag-pick"><input type="checkbox" name="tags" value="${e(t)}" ${selected.includes(t)?'checked':''}><span>${e(t)}</span></label>`).join('')}</div></fieldset>`;
 function form(item,old){
  const st=s(),base=old?item:{...(prefill||{}),...item};prefill=null;
  const time=base.time||(liveNow()?clock(Math.ceil(F().nowMinutes()/15)*15):clock(window_().start+120)),duration=base.duration||F().plan(st).settings.turnMinutes;
  return `<div class="fl-form-row">${input('name','Guest name',base.name||'','text','required maxlength="100" autocomplete="off"')}${input('guests','Guests',base.guests??2,'number','required min="1" max="20" step="1" inputmode="numeric"')}</div>${api.serviceFields(base)}<div class="fl-form-row">${input('time','Arrival',time,'time','required')}${durationSelect(duration)}</div>${picker({date:base.date||st.date,service:base.service||st.service,time,guests:Number(base.guests)||2,duration,exclude:base.id||'',selected:Array.isArray(base.tables)?base.tables:[]})}<details class="fl-more" ${base.contact||base.note||(base.tags||[]).length||(base.source&&base.source!=='Phone')?'open':''}><summary>Contact, tags and notes</summary><div class="fl-form-row">${select('source','Booked by',F().SOURCES.map(x=>[x,x]),base.source||'Phone')}${input('contact','Phone or email',base.contact||'','text','maxlength="100" autocomplete="off"')}</div>${tagChips(base.tags||[])}${textarea('note','Notes',base.note||'','placeholder="Allergies, occasions, seating wishes…"')}</details>`;
 }
 function walkInForm(label){
  const st=s(),time=liveNow()?clock(F().nowMinutes()):clock(at()),duration=F().plan(st).settings.turnMinutes;
  floorForm='walkin';
  api.form('Seat a walk-in',`<div class="fl-form-row">${input('guests','Guests',2,'number','required min="1" max="20" step="1" inputmode="numeric" autofocus')}${input('name','Name (optional)','','text','maxlength="100" placeholder="Walk-in" autocomplete="off"')}</div><div class="fl-form-row">${input('time','Seated at',time,'time','required')}${durationSelect(duration)}</div>${picker({date:st.date,service:st.service,time,guests:2,duration,exclude:'',selected:label?[label]:[]})}<p class="fl-hint">The turn is shortened automatically when the table is booked later.</p>${textarea('note','Notes (optional)','','maxlength="500"')}`,'Seat now');
 }
 function roomForm(id){
  const r=rooms().find(x=>x.id===id);floorForm='room';
  api.form(r?'Room settings':'Add a room',`${input('roomId','',r?.id||'','hidden')}${input('name','Room name',r?.name||'','text','required maxlength="40" placeholder="e.g. Terrace, Mezzanine"')}<div class="fl-form-row">${input('cols','Width (cells)',r?.cols||16,'number',`required min="${F().LIMITS.cols[0]}" max="${F().LIMITS.cols[1]}" step="1" inputmode="numeric"`)}${input('rows','Depth (cells)',r?.rows||10,'number',`required min="${F().LIMITS.rows[0]}" max="${F().LIMITS.rows[1]}" step="1" inputmode="numeric"`)}</div><p class="fl-hint">One cell is about one chair. A two-seat table is 2 × 2 cells.</p>${r&&!tables().some(t=>t.room===r.id)&&rooms().length>1?btn('Remove this room','remove-room',r.id,'danger small'):''}`,r?'Save room':'Add room');
 }
 function submit(values,fd){
  const st=s();
  if(floorForm==='walkin')return {type:'floor:walk-in',name:values.name,guests:Number(values.guests),tables:fd.getAll('tables'),time:values.time,duration:Number(values.duration),note:values.note,date:st.date,service:st.service};
  if(floorForm==='room')return {type:'floor:room',id:values.roomId||slug(values.name)+'-'+rid(),name:values.name,cols:Number(values.cols),rows:Number(values.rows)};
  throw Error('Unknown floor form.');
 }
 const saved=()=>floorForm==='walkin'?'Walk-in seated.':floorForm==='room'?'Room saved.':'Saved.';

 // ---------- Actions ----------
 function handle(action,id,ds={},target){
  const st=s();
  if(action==='view'){if(id==='editor'&&!canEdit()){api.notify('Layout editing needs manager access.');return;}view=id;picking=null;if(id!=='editor')selected=null;else editRoom=room||editRoom;api.close();api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='open'){view=id==='editor'&&!canEdit()?'floor':id||'floor';api.close();api.go();return;}
  if(action==='room'){room=id;api.render();return;}
  if(action==='now'){viewTime=null;api.render();return;}
  if(action==='filter'){filter=id||'all';api.render();return;}
  if(action==='table'){tableSheet(id);return;}
  if(action==='booking'){bookingSheet(id);return;}
  if(action==='guest'){guestSheet(id);return;}
  if(action==='seat'){if(api.commit({type:'floor:seat',id,tables:ds.tables?ds.tables.split('+'):undefined},'Guests seated.'))api.close();return;}
  if(action==='complete'){if(api.commit({type:'reservation-status',id,status:'Completed'},'Visit completed. Table is free.'))api.close();return;}
  if(action==='assign'){if(api.commit({type:'floor:assign',id,tables:(ds.tables||'').split('+').filter(Boolean)},'Table assigned.'))api.close();return;}
  if(action==='noshow'){const r=booking(id);if(!r)return;confirmSheet('Mark as a no-show?',`<strong>${e(r.name)}</strong> (${plural(r.guests,'guest')} at ${e(r.time)}) will be marked a no-show and ${e(tableWord(r.tables).toLowerCase())} becomes free. No-shows count against the guest’s reliability.`,'Mark no-show','noshow-confirm',id);return;}
  if(action==='cancel'){const r=booking(id);if(!r)return;confirmSheet('Cancel this booking?',`<strong>${e(r.name)}</strong> at ${e(r.time)} will be cancelled and the table released.`,'Cancel booking','cancel-confirm',id);return;}
  if(action==='noshow-confirm'){if(api.commit({type:'reservation-status',id,status:'No-show'},'Marked as a no-show.'))api.close();return;}
  if(action==='cancel-confirm'){if(api.commit({type:'reservation-status',id,status:'Cancelled'},'Booking cancelled.'))api.close();return;}
  if(action==='walkin'){api.close();walkInForm(ds.table||'');return;}
  if(action==='book'){api.close();const t=F().byLabel(st,ds.table||'');prefill={tables:t?[t.label]:[],time:clock(Math.ceil(at()/15)*15),guests:t?Math.min(t.seats,20):2};api.edit('');return;}
  if(action==='rebook'){api.close();const g=F().guests(st,'2000-01-01','2999-12-31').directory.find(x=>x.key===id);if(!g)return;prefill={name:g.name,contact:g.contact,guests:g.avgParty?Math.max(1,Math.round(g.avgParty)):2,tags:g.tags.filter(x=>['VIP','Regular','Allergy','Wheelchair','High chair','Window','Quiet'].includes(x)),time:g.usualTime||undefined,tables:g.favouriteTable&&F().byLabel(st,g.favouriteTable)?[g.favouriteTable]:[]};api.edit('');return;}
  if(action==='pick'){const form=target?.closest('form');if(!form)return;const want=new Set((ds.tables||'').split('+').map(x=>x.toLowerCase()));for(const box of form.querySelectorAll('input[name="tables"]')){box.checked=want.has(box.value.toLowerCase());if(box.checked)box.disabled=false;}refreshPicker(form);return;}
  // Tap-to-assign on the map
  if(action==='pick-start'){const r=booking(id);if(!r)return;api.close();view='floor';picking={id:r.id,guests:r.guests,tables:[]};if(r.tables.length){const t=F().byLabel(st,r.tables[0]);if(t)room=t.room;}api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='pick-table'){if(!picking)return;const t=F().tableOf(st,id);if(!t)return;const i=picking.tables.findIndex(l=>l.toLowerCase()===t.label.toLowerCase());if(i>=0)picking.tables.splice(i,1);else{if(picking.tables.length>=F().LIMITS.tablesPer){api.notify('Up to four tables can be joined.');return;}picking.tables.push(t.label);}api.render();return;}
  if(action==='pick-confirm'){if(!picking)return;const r=booking(picking.id),tablesSel=[...picking.tables];if(!r)return;const seatNow=r.status==='Confirmed'&&ds.seat==='true';const ok=api.commit(seatNow?{type:'floor:seat',id:r.id,tables:tablesSel}:{type:'floor:assign',id:r.id,tables:tablesSel},seatNow?'Guests seated.':'Table assigned.');if(ok)picking=null;return;}
  if(action==='pick-cancel'){picking=null;api.render();return;}
  // Layout editor
  if(action==='edit-room'){editRoom=id;selected=null;api.render();return;}
  if(action==='select'){if(Date.now()-lastDrag<350)return;selected=id||null;api.render();if(selected)requestAnimationFrame(()=>document.querySelector(`.fl-table[data-id="${selected}"]`)?.focus({preventScroll:true}));return;}
  if(action==='add-table'){const nid='t-'+rid();if(api.commit({type:'floor:table',id:nid,room:editRoom,shape:id||'square',seats:Number(ds.seats)||4,max:Number(ds.max)||Number(ds.seats)||4,w:Number(ds.w)||2,h:Number(ds.h)||2},'Table added. Drag it into place.'))selected=nid,api.render();return;}
  if(action==='duplicate'){const t=F().tableOf(st,id);if(!t)return;let n=1;while(tables().some(x=>x.label.toLowerCase()===(t.label+n).toLowerCase()||x.label===String(n)))n++;const label=/^\d+$/.test(t.label)?String(n):(t.label+n).slice(0,F().LIMITS.label);const nid='t-'+rid();if(api.commit({type:'floor:table',id:nid,room:t.room,label,seats:t.seats,max:t.max,shape:t.shape,w:t.w,h:t.h},'Table duplicated.'))selected=nid,api.render();return;}
  if(action==='remove-table'){const t=F().tableOf(st,id);if(!t)return;const open=st.reservations.filter(r=>r.date>=today()&&['Confirmed','Seated'].includes(r.status)&&r.tables.includes(t.label)).length;confirmSheet(`Remove table ${e(t.label)}?`,open?`${plural(open,'upcoming booking')} use this table and will need a new one.`:'No upcoming bookings use this table.','Remove table','remove-table-confirm',id);return;}
  if(action==='remove-table-confirm'){if(api.commit({type:'floor:remove-table',id},'Table removed.')){selected=null;api.close();}return;}
  if(action==='add-room'){roomForm('');return;}
  if(action==='room-edit'){roomForm(id);return;}
  if(action==='room-order'){api.commit({type:'floor:room-order',id,direction:Number(ds.direction)||1},'Room order updated.');return;}
  if(action==='remove-room'){const r=rooms().find(x=>x.id===id);if(!r)return;if(tables().some(t=>t.room===id)){api.notify('Move or remove the tables in this room first.');return;}api.close();confirmSheet(`Remove ${e(r.name)}?`,'The room is empty and will be removed from the floor plan.','Remove room','remove-room-confirm',id);return;}
  if(action==='remove-room-confirm'){if(api.commit({type:'floor:remove-room',id},'Room removed.')){editRoom=null;api.close();}return;}
 }
 function onChange(t){
  if(t.dataset?.flTime!==undefined){viewTime=Number(t.value);api.render();return;}
  if(t.dataset?.flTurn!==undefined){api.commit({type:'floor:settings',turnMinutes:Number(t.value)},'Default turn time saved.');return;}
  if(t.dataset?.flProp){const prop=t.dataset.flProp,raw=t.value,value=['seats','max','w','h','x','y'].includes(prop)?Number(raw):raw;if(api.commit({type:'floor:table',id:t.dataset.id,[prop]:value},'Table updated.'))selected=t.dataset.id;else api.render();return;}
  const form=t.form;if(!form||form.id!=='editor-form'||!form.querySelector('[data-fl-picker]'))return;
  if(['date','service','time','guests','duration'].includes(t.name))refreshPicker(form);
  else if(t.name==='tables'){const ctx=pickerContext(form),box=form.querySelector('#fl-pick-summary');if(box){const seats=F().seatsOf(s(),ctx.selected),cap=F().capacity(s(),ctx.selected);box.innerHTML=ctx.selected.length?`${e(tableWord(ctx.selected))} · ${seats} seats${cap>seats?' (up to '+cap+')':''} for ${plural(ctx.guests,'guest')}${ctx.guests>cap?' · <span class="fl-warn">not enough seats, add another table</span>':''}`:'No table yet. Pick one below, or leave it for the host.';}for(const l of form.querySelectorAll('.fl-pick'))l.classList.toggle('is-on',l.querySelector('input').checked);}
 }
 function onInput(t){
  if(t.dataset?.flTime!==undefined){const l=document.getElementById('fl-time-label');if(l)l.textContent=clock(Number(t.value));return;}
  if(t.dataset?.flGuestSearch!==undefined){guestQuery=t.value;const body=document.getElementById('fl-guest-rows');if(body&&reportRange)body.innerHTML=guestRows(F().guests(s(),reportRange.from,reportRange.to));return;}
  if(t.dataset?.flBookingSearch!==undefined){bookingQuery=t.value;const body=document.getElementById('fl-arrivals-body');if(body)body.innerHTML=arrivalsBody();}
 }
 // Dragging in the editor: pointer events move or resize a table live and save on release.
 function pointer(ev){
  if(ev.button!==0&&ev.pointerType==='mouse')return;
  const el=ev.target.closest?.('.fl-canvas[data-edit] .fl-table');if(!el)return;
  const canvasEl=el.closest('.fl-canvas'),t=F().tableOf(s(),el.dataset.id),cols=Number(canvasEl.dataset.cols),rows=Number(canvasEl.dataset.rows);if(!t)return;
  const cell=canvasEl.getBoundingClientRect().width/cols,resize=!!ev.target.closest('.fl-resize');
  drag={id:t.id,x0:ev.clientX,y0:ev.clientY,start:{x:t.x,y:t.y,w:t.w,h:t.h},cur:{x:t.x,y:t.y,w:t.w,h:t.h},resize,cell,moved:false,el,cols,rows};
  try{el.setPointerCapture(ev.pointerId);}catch{}
  el.classList.add('is-dragging');ev.preventDefault();
  const move=m=>{if(!drag)return;const dx=Math.round((m.clientX-drag.x0)/drag.cell),dy=Math.round((m.clientY-drag.y0)/drag.cell),S=drag.start,c=drag.cur;
   if(drag.resize){c.w=Math.min(Math.max(1,S.w+dx),Math.min(10,drag.cols-S.x));c.h=Math.min(Math.max(1,S.h+dy),Math.min(10,drag.rows-S.y));}
   else{c.x=Math.min(Math.max(0,S.x+dx),drag.cols-S.w);c.y=Math.min(Math.max(0,S.y+dy),drag.rows-S.h);}
   if(c.x!==S.x||c.y!==S.y||c.w!==S.w||c.h!==S.h)drag.moved=true;
   drag.el.style.setProperty('--x',c.x);drag.el.style.setProperty('--y',c.y);drag.el.style.setProperty('--w',c.w);drag.el.style.setProperty('--h',c.h);};
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);if(!drag)return;const d=drag;drag=null;d.el.classList.remove('is-dragging');
   if(d.moved){lastDrag=Date.now();selected=d.id;if(!api.commit({type:'floor:table',id:d.id,x:d.cur.x,y:d.cur.y,w:d.cur.w,h:d.cur.h},d.resize?'Table resized.':'Table moved.'))api.render();}};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
 }
 function key(ev){
  if(ev.key==='Escape'&&picking&&!document.querySelector('dialog[open]')){picking=null;api.render();return true;}
  if(view!=='editor'||!selected||ev.altKey||ev.ctrlKey||ev.metaKey)return false;
  if(ev.target.closest?.('input,select,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return false;
  const t=F().tableOf(s(),selected);if(!t)return false;
  const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[ev.key];if(!d)return false;
  ev.preventDefault();
  const patch=ev.shiftKey?{w:Math.max(1,t.w+d[0]),h:Math.max(1,t.h+d[1])}:{x:Math.max(0,t.x+d[0]),y:Math.max(0,t.y+d[1])};
  lastDrag=Date.now();api.commit({type:'floor:table',id:t.id,...patch},null);
  requestAnimationFrame(()=>document.querySelector(`.fl-table[data-id="${selected}"]`)?.focus({preventScroll:true}));return true;
 }
 return {render,handle,onChange,onInput,pointer,key,form,submit,saved,guestReport,show:v=>{view=v;},tab:()=>view,view:()=>view,tableSheet,bookingSheet,guestSheet};
};
