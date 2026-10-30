/* POS screen: one quiet header (tabs, who is on the till, New check); the floor map with a rail of open checks, tabs and pickups; and the order screen built around the table: the check on the left where tapping items selects them and a bar offers everything you can do with them (move, share the cost, seat, discount, comp, void, remove, edit), the menu in the middle, a rail of check-level actions on the right, and a table sheet with the party, its timeline, payments and every table action. Kitchen, cash, close-out, sections, settings and reports live in pos-views.js. Phone first, with the Stock layout. */
globalThis.createPosUI=function(api){
 'use strict';
 const B=Brigly,P=()=>B.pos,F=()=>B.floor,M=()=>B.menu,{e,input,textarea,select,dateLabel}=api,s=()=>api.state();
 const manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId),can=k=>manager()||!!B.permissions?.can(s(),k),use=()=>can('pos'),lead=()=>can('posLead');
 const paths={tables:'M3 10h18 M5 10v10 M19 10v10 M8 6h8 M12 6v4',checks:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',tickets:'M4 4h16v16H4z M8 9h8 M8 13h5',cash:'M3 7h18v10H3z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M6 12h.01 M18 12h.01',close:'M12 2v20 M18 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H5',sections:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4',add:'M12 5v14 M5 12h14',minus:'M5 12h14',check:'M5 12l5 5 9-10',x:'M6 6l12 12 M18 6L6 18',back:'M15 5l-7 7 7 7',send:'M4 12l16-8-6 16-2-6z',fire:'M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1-5 1 1 2 2 3 2-1-2-1-4 0-5z',pay:'M3 7h18v10H3z M3 11h18 M7 15h3',copy:'M9 9h11v11H9z M5 15V4h11',edit:'M4 20h4L19 9l-4-4L4 16z M13 7l4 4',clock:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',walk:'M13 4a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M9 21l2-7-2-2 M15 21l-2-6-2-2 M9 10l1.5-3 3 1 3 3 M7 13l2-3',gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 12h2 M18 12h2 M12 4v2 M12 18v2 M6.3 6.3l1.4 1.4 M16.3 16.3l1.4 1.4 M6.3 17.7l1.4-1.4 M16.3 7.7l1.4-1.4',chev:'M9 6l6 6-6 6',down:'M6 9l6 6 6-6',split:'M12 3v18 M5 8l7-5 7 5 M5 16l7 5 7-5',merge:'M4 6h6l4 6-4 6H4 M14 12h6 M17 9l3 3-3 3',user:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2',bag:'M6 7h12l1 14H5z M9 7a3 3 0 0 1 6 0',bike:'M5 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M19 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6 M5 14l3-7h4l3 7 M12 7h3l4 7',more:'M4 12h2.5 M10.75 12h2.5 M17.5 12h2.5',receipt:'M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6 M9 16h4',lock:'M6 11h12v10H6z M9 11V7a3 3 0 0 1 6 0v4',warn:'M12 3 2 20h20z M12 9v5 M12 17h.01',star:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',repeat:'M4 12a8 8 0 0 1 14-5l2 2 M20 4v5h-5 M20 12a8 8 0 0 1-14 5l-2-2 M4 20v-5h5',percent:'M19 5 5 19 M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3 M16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3',move:'M5 9l-3 3 3 3 M19 9l3 3-3 3 M2 12h20',trash:'M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6 M14 11v6',info:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v5 M12 8h.01',seat:'M6 11V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5 M4 11h16v4H4z M6 15v4 M18 15v4',share:'M12 3v10 M8 7l4-4 4 4 M4 13v6h16v-6',gift:'M4 10h16v10H4z M2 7h20v3H2z M12 7v13 M12 7c-2 0-5-1-5-3s3-2 5 3 M12 7c2 0 5-1 5-3s-3-2-5 3',undo:'M9 14 4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',note:'M5 4h14v16H5z M9 9h6 M9 13h6 M9 17h3'};
 const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[k]||paths.add}"/></svg>`;
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n||0);
 const whole=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
 const num=n=>Math.round(n||0).toLocaleString('en-US');
 const pct=n=>(Math.round((n||0)*10)/10)+'%';
 const plural=(n,w)=>n+' '+w+(n===1?'':'s');
 const today=()=>B.dateString(new Date());
 const name=id=>B.person(id)?.name||'Team member',first=id=>name(id).split(' ')[0],initials=id=>B.person(id)?.initials||'·';
 const hue=id=>{const ids=s().team.filter(p=>p.active).map(p=>p.id).sort();const i=ids.indexOf(id);return i<0?0:i%8;};
 const clock=iso=>iso?new Date(iso).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}):'';
 const mins=n=>n<60?n+' min':Math.floor(n/60)+' h '+(n%60?n%60+' min':'');
 const btn=(label,action,id='',style='secondary',attrs='')=>`<button type="button" class="button ${style}" data-action="ps-${action}" data-id="${e(id)}" ${attrs}>${label}</button>`;
 const tag=(label,tone='slate')=>`<span class="sk-tag" data-tone="${tone}">${e(label)}</span>`;
 const dot=tone=>`<i class="ps-dot" data-tone="${tone}"></i>`;
 const stageTone=st=>({new:'slate',ordering:'slate',sent:'amber',ready:'orange',served:'sage',presented:'mint',paying:'mint'})[st]||'slate';
 const stageWord=st=>({new:'New',ordering:'Ordering',sent:'In the kitchen',ready:'Ready',served:'Served',presented:'Check dropped',paying:'Paying'})[st]||'';
 const typeIcon=t=>({dine:'tables',tab:'walk',takeout:'bag',delivery:'bike'})[t]||'tables';
 const srv=id=>id?`<i class="ps-srv" data-hue="${hue(id)}" title="${e(name(id))}">${e(initials(id))}</i>`:'';
 const where=c=>c.tables.length?'Table '+c.tables.join('+'):P().typeLabel(c.type);
 const shortWhere=c=>c.tables.length?c.tables.join('+'):P().typeLabel(c.type);
 const title=c=>`${e(where(c))}${c.name?' · '+e(c.name):''}`;
 const ui={tab:'tables',checkId:'',cat:'',query:'',room:'',pane:'menu',seat:0,scope:'',filter:'open',typeFilter:'',osearch:'',station:'',kdsMode:'tickets',secPerson:'',viewer:'',scopeKey:'',form:null,closeAll:false,selecting:false,selected:new Set(),journalKind:'',cashPane:'drawer',menu:''};
 const clearSel=()=>{ui.selected.clear();ui.selecting=false;};
 const ensure=()=>{const st=s(),k=st.date+'|'+st.service;if(ui.viewer!==me()){ui.viewer=me();ui.checkId='';ui.scope=manager()?'all':'mine';ui.secPerson='';}if(k!==ui.scopeKey){ui.scopeKey=k;ui.checkId='';ui.secPerson='';clearSel();}if(ui.tab==='sections'&&!lead())ui.tab='tables';if(ui.checkId&&!P().check(st,ui.checkId)){ui.checkId='';clearSel();}};
 const cur=()=>P().checks(s(),s().date,s().service),openNow=()=>cur().filter(c=>c.status==='open');
 const S=()=>P().sales(s(),{from:s().date,to:s().date,service:s().service});
 const liveNow=()=>{const st=s(),{start,end}=F().serviceWindow(st,st.service),n=F().nowMinutes();return st.date===today()&&n>=start&&n<end;};
 const pickupMinutes=c=>{if(!c.pickupAt)return null;return F().mins(c.pickupAt)-F().nowMinutes();};
 const clockOpen=()=>s().timeclock?.entries?.find(x=>x.person===me()&&!x.out)||null;
 const catHue=id=>M().hue(s(),id);
 const ctx={api,ui,s,P,F,M,e,input,textarea,select,dateLabel,money,whole,num,pct,plural,today,name,first,initials,hue,clock,mins,btn,tag,dot,icon,srv,stageTone,stageWord,typeIcon,where,shortWhere,title,manager,me,can,use,lead,cur,openNow,S,liveNow,open:dialog,reasonChips:null,checkRow:null,pickupMinutes,clockOpen};
 const views=globalThis.BriglyPosViews?globalThis.BriglyPosViews(ctx):null;
 const menuBox=(key,items)=>`${ui.menu===key?'<button type="button" class="ps-backdrop" data-action="ps-menu" data-id="" aria-label="Close menu"></button>':''}<div class="ps-dd" role="menu" ${ui.menu===key?'':'hidden'}>${items.filter(Boolean).map(([label,action,id,extra='',danger=false])=>`<button type="button" role="menuitem" class="${danger?'is-danger':''}" data-action="ps-${action}" data-id="${e(id)}" ${extra}>${label}</button>`).join('')}</div>`;

 // ---------- Header: tabs, who is on the till, New check ----------
 function header(){
  const st=s(),o=openNow(),my=o.filter(c=>c.server===me()).length,tk=P().tickets(st,st.date,st.service),late=tk.filter(t=>t.late).length,d=P().drawer(st,st.date,st.service),on=clockOpen();
  const list=[['tables','Floor','tables',o.length?[manager()?o.length:my||o.length,'muted',plural(o.length,'open check')]:null],['checks','Orders','checks',null],['tickets','Tickets','tickets',tk.length?[tk.length,late?'danger':'amber',plural(tk.length,'ticket')+(late?', '+late+' late':'')]:null],['cash','Cash','cash',!d&&liveNow()?['!','amber','drawer not open']:null],['close','Close-out','close',null]];
  if(lead())list.push(['sections','Sections','sections',null]);
  const tabs=`<nav class="sk-tabs ps-tabs" aria-label="POS sections">${list.map(([id,label,key,n])=>`<button type="button" data-action="ps-tab" data-id="${id}" ${ui.tab===id?'aria-current="page"':''} aria-label="${label}${n?', '+e(n[2]):''}"><span class="sk-tab-icon">${icon(key)}${n?`<em data-tone="${n[1]}">${n[0]}</em>`:''}</span><span class="sk-tab-label">${label}</span></button>`).join('')}</nav>`;
  const whoMenu=menuBox('who',[[icon('lock')+'<span>Switch user · PIN</span>','switch',''],st.timeclock?[icon('clock')+`<span>${on?'Clock out':'Clock in'}</span>`,on?'clock-out':'clock-in','']:null,!d&&use()&&(liveNow()||st.date===today())?[icon('cash')+'<span>Open the drawer</span>','drawer-open','']:null,[icon('user')+'<span>Change my PIN</span>','pin','']]);
  const who=`<div class="ps-who-wrap"><button type="button" class="ps-who" data-action="ps-menu" data-id="who" aria-haspopup="menu" aria-expanded="${ui.menu==='who'}">${srv(me())}<span><strong>${e(first(me()))}</strong><small>${liveNow()?`<i class="ps-live-dot"></i>${e(st.service)} live`:e(st.service)}${d?' · drawer open':liveNow()?' · <b>no drawer</b>':''}${on?' · on the clock':''}</small></span>${icon('down')}</button>${whoMenu}</div>`;
  const types=Object.entries(P().TYPE_LABEL).filter(([k])=>st.pos.settings.orderTypes[k]);
  const newMenu=menuBox('new',[...types.map(([k,l])=>[icon(typeIcon(k))+`<span>${l}</span>`,'new',k]),lead()?[icon('star')+'<span>Training check</span>','new','training']:null]);
  const newBtn=use()?`<div class="ps-new"><button type="button" class="button fl-icon-btn" aria-label="New check" data-action="ps-new" data-id="dine">${icon('add')}<span>New check</span></button><button type="button" class="button fl-icon-only ps-new-more" data-action="ps-menu" data-id="new" aria-haspopup="menu" aria-expanded="${ui.menu==='new'}" aria-label="Other order types">${icon('down')}</button>${newMenu}</div>`:'';
  return `<div class="ps-bar">${tabs}<div class="ps-bar-acts">${who}${newBtn}</div></div>`;
 }
 // ---------- Floor ----------
 const activeRoom=()=>{const list=F().plan(s()).rooms;if(!list.some(r=>r.id===ui.room))ui.room=list[0]?.id||'';return list.find(r=>r.id===ui.room);};
 function tableEl(t){
  const st=s(),T=P().tableState(st,st.date,st.service,t.label),c=T.check;
  const occ=!c&&F().occupancy(st,st.date,st.service,P().at(st,st.date,st.service)).find(o=>o.table.id===t.id);
  const tone=c?stageTone(T.stage):occ&&occ.status==='seated'?'seated':occ&&['late','reserved'].includes(occ.status)?'amber':'slate';
  const detail=c?`<span class="fl-party">${money(T.checks.reduce((n,x)=>n+P().totals(st,x).total,0))}</span><span class="fl-when">${mins(T.minutes)}${T.checks.length>1?' · '+T.checks.length+' checks':''}</span>`:occ&&occ.booking?`<span class="fl-party">${e(occ.booking.name.split(' ')[0])}</span><span class="fl-when">${occ.status==='seated'?'no check':e(occ.booking.time)}</span>`:`<small class="fl-seats">${t.seats}</small>`;
  return `<button type="button" class="fl-table ps-table ${c?'has-check':''}" data-action="ps-table" data-id="${e(t.label)}" data-shape="${e(t.shape)}" data-tone="${tone}" style="--x:${t.x};--y:${t.y};--w:${t.w};--h:${t.h};" aria-label="Table ${e(t.label)}${T.server?', '+e(name(T.server)):''}${c?', check '+c.number+', '+money(T.totals.total)+', '+stageWord(T.stage):''}"><b class="fl-label">${e(t.label)}</b>${srv(T.server)}${c?.allergy?`<i class="ps-allergy-dot" title="${e(c.allergy)}">!</i>`:''}${detail}</button>`;
 }
 const canvas=r=>`<div class="fl-canvas-wrap"><div class="fl-canvas ps-canvas" style="--cols:${r.cols};--rows:${r.rows}" role="group" aria-label="${e(r.name)} tables">${F().plan(s()).tables.filter(t=>t.room===r.id).map(tableEl).join('')||'<p class="fl-empty-room">No tables in this room.</p>'}</div></div>`;
 const roomChips=()=>`<div class="fl-rooms" role="tablist" aria-label="Rooms">${F().plan(s()).rooms.map(r=>{const tables=F().plan(s()).tables.filter(t=>t.room===r.id),busy=tables.filter(t=>P().forTable(s(),s().date,s().service,t.label)).length;return `<button type="button" role="tab" class="fl-room-chip" data-action="ps-room" data-id="${e(r.id)}" aria-selected="${ui.room===r.id}">${e(r.name)}<em>${busy}/${tables.length}</em></button>`;}).join('')}</div>`;
 const checkRow=c=>{const st=s(),t=P().totals(st,c),stage=P().stageOf(st,c),pm=c.status==='open'?pickupMinutes(c):null,late=pm!==null&&pm<0;
  const meta=['#'+c.number,first(c.server),c.type==='dine'||c.type==='tab'?plural(c.guests,'guest'):c.pickupAt?(late?'due '+Math.abs(pm)+' min ago':'pickup '+e(c.pickupAt)):'',c.status==='open'?mins(P().minutesSince(c.openedAt)):c.status==='paid'?'paid '+clock(c.closedAt):'void'].filter(Boolean).join(' · ');
  return `<button type="button" class="ps-row" data-action="ps-open" data-id="${e(c.id)}" data-status="${e(c.status)}" data-type="${e(c.type)}"><span class="ps-row-ico">${icon(typeIcon(c.type))}</span><span class="ps-row-text"><strong>${e(shortWhere(c))}${c.name?' · '+e(c.name):''}${c.training?' '+tag('Training','amber'):''}${c.allergy?' <i class="ps-allergy-dot" title="'+e(c.allergy)+'">!</i>':''}</strong><small>${meta}${c.source==='online'?' · online':''}</small></span><span class="ps-row-end"><b>${money(t.total)}</b><small>${c.status==='open'?dot(late?'danger':stageTone(stage))+e(late?'Overdue':stageWord(stage)):c.status==='void'?dot('danger')+'Void':dot('sage')+'Paid'}</small></span></button>`;};
 ctx.checkRow=checkRow;
 function tablesView(){
  const st=s(),r=activeRoom(),o=openNow().filter(c=>!c.training||c.server===me()||lead()),myO=o.filter(c=>c.server===me()),sales=S(),tk=P().tickets(st,st.date,st.service),late=tk.filter(t=>t.late).length;
  const pickups=o.filter(c=>c.type==='takeout'||c.type==='delivery').sort((a,b)=>(a.pickupAt||'').localeCompare(b.pickupAt||'')),tabs_=o.filter(c=>c.type==='tab'&&!c.tables.length),tables_=o.filter(c=>c.tables.length);
  const due=pickups.filter(c=>{const m=pickupMinutes(c);return m!==null&&m<=5;}).length;
  const stat=(v,label,tone='')=>`<span class="ps-stat" ${tone?`data-tone="${tone}"`:''}><b>${v}</b><small>${label}</small></span>`;
  const strip=`<div class="ps-strip" aria-label="Service at a glance">${stat(o.length,'open')}${stat(money(o.reduce((n,c)=>n+P().totals(st,c).total,0)),'on the floor')}${stat(whole(sales.net),'net today')}${stat(sales.covers,'covers')}${pickups.length?stat(pickups.length,'pickups',due?'amber':''):''}${late?stat(late,'late tickets','danger'):''}</div>`;
  const legend=`<div class="fl-legend ps-legend"><span data-tone="slate">Ordering</span><span data-tone="amber">Kitchen</span><span data-tone="orange">Ready</span><span data-tone="sage">Served</span><span data-tone="mint">Check dropped</span><span data-tone="seated">Seated, no check</span></div>`;
  const map=`<section class="panel fl-map ps-map">${roomChips()}${r?canvas(r):'<div class="empty"><strong>No rooms yet</strong>Draw the floor plan in Reservations first.</div>'}${legend}</section>`;
  const pick=list=>ui.scope==='mine'?list.filter(c=>c.server===me()):manager()?list:[...list.filter(c=>c.server===me()),...list.filter(c=>c.server!==me())];
  const lane=(label,list,empty)=>`<div class="ps-lane"><h3>${label}<em>${list.length}</em></h3>${list.map(checkRow).join('')||`<p class="ps-lane-empty">${empty}</p>`}</div>`;
  const scopeSeg=!manager()&&myO.length!==o.length?`<div class="segmented fl-seg ps-scope" role="tablist"><button type="button" role="tab" class="${ui.scope==='mine'?'selected':''}" data-action="ps-scope" data-id="mine" aria-selected="${ui.scope==='mine'}">Mine</button><button type="button" role="tab" class="${ui.scope==='all'?'selected':''}" data-action="ps-scope" data-id="all" aria-selected="${ui.scope==='all'}">All</button></div>`:'';
  const side=`<aside class="panel ps-side"><div class="ps-side-head"><h2>Open checks <em>${o.length}</em></h2>${scopeSeg}</div>${lane('Tables',pick(tables_),'Tap a table to start a check.')}${st.pos.settings.orderTypes.tab?lane('Bar tabs',pick(tabs_),'No tabs open.'):''}${st.pos.settings.orderTypes.takeout||st.pos.settings.orderTypes.delivery?lane('Takeout &amp; delivery',pickups,'Nothing in the queue.'):''}</aside>`;
  return strip+`<div class="ps-layout"><div class="ps-map-col">${map}</div>${side}</div>`;
 }
 function checksView(){
  const st=s(),q=ui.osearch.trim().toLowerCase();
  let all=cur().filter(c=>!c.training||lead()||c.server===me());if(ui.scope==='mine')all=all.filter(c=>c.server===me());
  all=all.slice().sort((a,b)=>b.number-a.number);
  const byType=ui.typeFilter?all.filter(c=>c.type===ui.typeFilter):all;
  const f=(ui.filter==='all'?byType:byType.filter(c=>c.status===ui.filter)).filter(c=>!q||('#'+c.number).includes(q)||(c.name||'').toLowerCase().includes(q)||c.tables.some(l=>('table '+l).includes(q)||l.toLowerCase()===q)||name(c.server).toLowerCase().includes(q)||(c.phone||'').includes(q));
  const counts={open:byType.filter(c=>c.status==='open').length,paid:byType.filter(c=>c.status==='paid').length,void:byType.filter(c=>c.status==='void').length,all:byType.length};
  const types=Object.entries(P().TYPE_LABEL).filter(([k])=>st.pos.settings.orderTypes[k]||all.some(c=>c.type===k));
  const seg=`<div class="segmented fl-seg" role="tablist">${[['open','Open'],['paid','Paid'],['void','Void'],['all','All']].map(([k,l])=>`<button type="button" role="tab" class="${ui.filter===k?'selected':''}" data-action="ps-filter" data-id="${k}" aria-selected="${ui.filter===k}">${l}<em>${counts[k]}</em></button>`).join('')}</div>`;
  const typeChips=`<div class="fl-filters ps-types" role="tablist"><button type="button" class="fl-room-chip" data-action="ps-type-filter" data-id="" aria-selected="${!ui.typeFilter}">Every type</button>${types.map(([k,l])=>`<button type="button" class="fl-room-chip" data-action="ps-type-filter" data-id="${k}" aria-selected="${ui.typeFilter===k}">${icon(typeIcon(k))}${l}</button>`).join('')}${!manager()?`<button type="button" class="fl-room-chip" data-action="ps-scope" data-id="${ui.scope==='mine'?'all':'mine'}" aria-pressed="${ui.scope==='mine'}">${ui.scope==='mine'?'Only mine':'Everyone’s'}</button>`:''}</div>`;
  const total=f.filter(c=>c.status==='paid').reduce((n,c)=>n+P().totals(st,c).net,0);
  return `<div class="ps-toolbar"><label class="sk-search ps-search"><span class="sr-only">Find a check</span>${icon('search')}<input type="search" data-ps-osearch value="${e(ui.osearch)}" placeholder="Check number, table, name or phone" autocomplete="off"></label>${seg}</div>${typeChips}<section class="panel ps-list" data-ps-orders><div class="ps-list-head"><span>${plural(f.length,'check')}${ui.filter!=='open'?' · '+money(total)+' net':''}</span><span>${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))} · ${e(st.service)}</span></div>${f.map(checkRow).join('')||'<p class="ps-lane-empty">Nothing here. Switch the filter above.</p>'}</section>`;
 }
 // ---------- Order screen ----------
 const groupLines=lines=>{const m=new Map();for(const l of lines){m.set(l.course,[...(m.get(l.course)||[]),l]);}return [...m].sort((a,b)=>a[0]-b[0]);};
 const courseName=i=>M().COURSES[i]||'Course '+(i+1);
 const selLines=c=>c.lines.filter(l=>ui.selected.has(l.id)&&l.status!=='void');
 function lineEl(c,l,mine){
  const held=l.status==='held',tot=P().lineGross(l),disc=P().lineDisc(l),sel=ui.selected.has(l.id),canPick=mine&&l.status!=='void';
  const pick=canPick?`<span class="ps-pick ${sel?'is-on':''}" aria-hidden="true">${icon('check')}</span>`:'<span class="ps-pick is-blank" aria-hidden="true"></span>';
  const qty=held&&mine?`<span class="sk-stepper ps-stepper"><button type="button" data-action="ps-qty" data-id="${e(c.id)}" data-line="${e(l.id)}" data-step="-1" aria-label="One less">${icon('minus')}</button><span>${l.qty}</span><button type="button" data-action="ps-qty" data-id="${e(c.id)}" data-line="${e(l.id)}" data-step="1" aria-label="One more">${icon('add')}</button></span>`:`<b class="ps-qty">${l.splitOf?`<small>1/${l.splitOf}</small>`:''}${l.qty}</b>`;
  const meta=[l.mods.map(m=>m.name+(m.price?' +'+money(m.price):'')).join(', '),l.note?'“'+l.note+'”':'',l.seat?'Seat '+l.seat:'',l.promo?l.promo:'',l.discount?(l.discount.kind==='pct'?l.discount.value+'% off':money(l.discount.value)+' off'):''].filter(Boolean).map(e).join(' · ');
  const price=l.comp?`<s>${money(tot)}</s><em>Comp</em>`:l.status==='void'?`<s>${money(tot)}</s><em>Void</em>`:disc?`<s>${money(tot)}</s><b>${money(tot-disc)}</b>`:`<b>${money(tot)}</b>`;
  const state=l.status==='staged'?dot('slate'):l.status==='sent'?dot('amber'):l.status==='ready'?dot('orange'):l.status==='served'?dot('sage'):'';
  return `<div class="ps-line ${sel?'is-selected':''}" data-status="${l.status}" ${l.comp?'data-comp="true"':''}><div class="ps-line-main"><span class="ps-line-qty">${qty}</span><button type="button" class="ps-line-text" data-action="ps-line-sel" data-id="${e(c.id)}" data-line="${e(l.id)}" aria-pressed="${sel}" ${canPick?'':'disabled'}>${pick}<span><strong>${e(l.name)}</strong>${meta?`<small>${meta}</small>`:''}</span></button><span class="ps-line-side">${state}${price}</span></div></div>`;
 }
 function courseBlock(c,course,ls,openC,mine){
  const staged=ls.filter(l=>l.status==='staged');
  return `<div class="ps-course-head"><span>${e(courseName(course))}${staged.length?' · holding':''}</span>${openC&&staged.length&&use()?btn(icon('fire')+'<span>Fire</span>','fire',c.id,'small fl-icon-btn ps-fire',`data-course="${course}"`):''}</div>${ls.map(l=>lineEl(c,l,mine)).join('')}`;
 }
 // What you can do with the items you tapped.
 function selBar(c){
  const sel=selLines(c),n=sel.length;
  if(!n&&!ui.selecting)return '';
  if(!n)return `<div class="ps-selbar is-hint"><span>Tap items to select them</span>${btn(icon('x'),'sel-clear',c.id,'quiet small fl-icon-only','aria-label="Done"')}</div>`;
  const held=sel.every(l=>l.status==='held'),sent=sel.every(l=>l.status!=='held'),one=n===1;
  const a=(label,action,k,extra='')=>`<button type="button" class="ps-sel-act" data-action="ps-${action}" data-id="${e(c.id)}" ${extra}>${icon(k)}<span>${label}</span></button>`;
  return `<div class="ps-selbar"><div class="ps-selbar-head"><strong>${plural(n,'item')}</strong><span>${money(sel.reduce((t,l)=>t+P().lineGross(l)-P().lineDisc(l),0))}</span>${btn(icon('x'),'sel-clear',c.id,'quiet small fl-icon-only','aria-label="Clear selection"')}</div><div class="ps-sel-acts">${a('Move','sel-move','move')}${a('Share cost','sel-split','share')}${a('Seat','sel-seat','seat')}${one&&held?a('Edit','sel-edit','note'):''}${lead()?a('Discount','sel-discount','percent'):''}${lead()&&sent?a('Comp','sel-comp','gift'):''}${held?a('Remove','sel-remove','trash'):lead()?a('Void','sel-void','trash'):''}</div></div>`;
 }
 // Check-level actions, always visible beside the order.
 function rail(c,mine,openC){
  const live=c.lines.filter(l=>l.status!=='void');
  const b=(label,action,k,extra='',cls='')=>`<button type="button" class="ps-rail-btn ${cls}" data-action="ps-${action}" data-id="${e(c.id)}" ${extra}>${icon(k)}<span>${label}</span></button>`;
  const items=[b('Table','table-sheet','info'),mine?b('Split','split','split'):'',mine?b('Merge','merge','merge'):'',mine?b('Move table','transfer','tables'):'',mine?b('Details','guests','edit'):'',mine&&live.some(l=>l.station==='Bar'&&l.status!=='held')?b('Round','repeat','repeat'):'',openC&&lead()?b('Discount','discount','percent'):'',openC&&mine&&live.length&&!c.presentedAt?b('Drop check','present','receipt'):'',b('Receipt','receipt','copy'),!openC&&lead()?b('Reopen','reopen','undo'):'',!openC&&c.status==='paid'&&lead()?b('Refund','refund','pay'):'',openC&&lead()?b('Void','void','x','','is-danger'):''];
  return `<aside class="ps-rail" aria-label="Check actions">${items.join('')}</aside>`;
 }
 function orderView(c){
  const st=s(),t=P().totals(st,c),stage=P().stageOf(st,c),openC=c.status==='open',mine=openC&&use()&&(c.server===me()||lead()),live=c.lines.filter(l=>l.status!=='void'),held=live.filter(l=>l.status==='held'),sent=live.filter(l=>l.status!=='held'),voided=c.lines.filter(l=>l.status==='void'),next=P().nextCourse(c),pm=pickupMinutes(c);
  const sub=[srv(c.server)+' '+e(first(c.server)),c.type==='dine'||c.type==='tab'?plural(c.guests,'guest'):'',c.pickupAt?(c.type==='delivery'?'out by ':'pickup ')+e(c.pickupAt)+(openC&&pm!==null&&pm<0?' · <b class="fl-danger-text">late</b>':''):'',mins(P().minutesSince(c.openedAt)),c.tab?.card?'card ·'+e(c.tab.card):'',c.source==='online'?'online':''].filter(Boolean).join(' · ');
  const head=`<header class="ps-order-head"><button type="button" class="ps-back" data-action="ps-back" aria-label="Back to the floor">${icon('back')}</button><button type="button" class="ps-order-title" data-action="ps-table-sheet" data-id="${e(c.id)}" aria-label="Open the table sheet"><h2>${icon(typeIcon(c.type))} ${title(c)}<small>#${c.number}</small>${icon('chev')}</h2><p>${sub}</p></button><span class="ps-stage">${dot(openC?stageTone(stage):c.status==='paid'?'sage':'danger')}${openC?stageWord(stage):c.status==='paid'?'Paid':'Void'}${c.training?' · training':''}</span></header>`;
  const allergy=c.allergy?`<div class="ps-allergy">${icon('warn')}<span>${e(c.allergy)}</span></div>`:'';
  const lines=`${held.length?`<div class="ps-group"><h4>To send <em>${held.length}</em></h4>${groupLines(held).map(([k,ls])=>courseBlock(c,k,ls,openC,mine)).join('')}</div>`:''}${sent.length?`<div class="ps-group"><h4>Sent <em>${sent.length}</em></h4>${groupLines(sent).map(([k,ls])=>courseBlock(c,k,ls,openC,mine)).join('')}</div>`:''}${voided.length?`<details class="ps-void-fold"><summary>${plural(voided.length,'voided line')}</summary>${voided.map(l=>lineEl(c,l,false)).join('')}</details>`:''}${!live.length&&!voided.length?`<div class="ps-empty">${icon('checks')}<strong>Nothing on the check yet</strong>${openC?'<span>Tap items on the menu to add them.</span>':''}</div>`:''}`;
  const discLine=d=>`<div><dt>${e(d.kind==='pct'?d.value+'% off':'Discount')} · ${e(d.reason)}${openC&&lead()?` ${btn('×','remove-discount',c.id,'quiet small ps-x',`data-discount="${e(d.id)}" aria-label="Remove discount"`)}`:''}</dt><dd>−${money(d.kind==='pct'?Math.round((t.gross-t.comps-t.itemDisc)*d.value)/100:Math.min(d.value,t.gross-t.comps-t.itemDisc))}</dd></div>`;
  const payLine=x=>`<div class="is-paid"><dt>${e(x.method)}${x.ref&&x.method!=='Card'?' · '+e(x.method==='House account'?P().account(st,x.ref)?.name||x.ref:x.ref):''}${x.tip?' · tip '+money(x.tip):''}${x.tendered?' · change '+money(x.tendered-x.amount):''}${openC&&lead()?` ${btn('×','remove-payment',c.id,'quiet small ps-x',`data-payment="${e(x.id)}" aria-label="Remove payment"`)}`:''}${!openC&&x.method!=='Cash'&&(c.server===me()||lead())&&c.date===today()?` ${btn('Adjust tip','tip',c.id,'quiet small ps-x',`data-payment="${e(x.id)}"`)}`:''}</dt><dd>−${money(x.amount)}</dd></div>`;
  const totals=`<dl class="ps-totals"><div><dt>Items${t.promos?' · happy hour −'+money(t.promos):''}</dt><dd>${money(t.gross)}</dd></div>${t.comps?`<div><dt>Comps</dt><dd>−${money(t.comps)}</dd></div>`:''}${t.itemDisc?`<div><dt>Item discounts</dt><dd>−${money(t.itemDisc)}</dd></div>`:''}${c.discounts.map(discLine).join('')}${t.sc?`<div><dt>Service charge ${st.pos.settings.serviceCharge}%</dt><dd>${money(t.sc)}</dd></div>`:''}<div><dt>${t.taxIncluded?'Includes tax':'Tax'}</dt><dd>${money(t.tax)}</dd></div><div class="is-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>${c.payments.length?c.payments.map(payLine).join('')+`<div class="is-total is-due"><dt>${openC?'Due':'Tips'}</dt><dd>${money(openC?t.due:t.tips)}</dd></div>`:''}${(c.refunds||[]).map(r=>`<div class="is-refund"><dt>Refund · ${e(r.method)}</dt><dd>−${money(r.amount)}</dd></div>`).join('')}</dl>`;
  const foot=mine?`<div class="ps-order-foot">${held.length?btn(icon('send')+`<span>Send ${held.length}</span>`,'send',c.id,'secondary fl-icon-btn'):next!==null?btn(icon('fire')+`<span>Fire ${e(courseName(next).toLowerCase())}</span>`,'fire',c.id,'secondary fl-icon-btn'):''}${t.due>0?btn(icon('pay')+`<span>Pay ${money(t.due)}</span>`,'pay',c.id,'fl-icon-btn'):btn(icon('check')+`<span>${c.type==='takeout'||c.type==='delivery'?'Picked up':'Close check'}</span>`,'close-check',c.id,'fl-icon-btn')}</div>`:'';
  const seats=mine?`<div class="ps-seats" role="group" aria-label="Seat for new items"><span>Seat</span>${[['0','Shared'],...Array.from({length:Math.max(c.guests,ui.seat)},(_,i)=>[String(i+1),String(i+1)])].map(([v,l])=>`<button type="button" class="ps-seat ${String(ui.seat)===v?'selected':''}" data-action="ps-seat" data-id="${v}" aria-pressed="${String(ui.seat)===v}">${l}</button>`).join('')}<button type="button" class="ps-seat" data-action="ps-seat-add" data-id="${e(c.id)}" aria-label="Add a seat">${icon('add')}</button></div>`:'';
  const checkPane=`<section class="ps-check panel">${allergy}${seats}<div class="ps-check-body">${lines}</div>${mine?selBar(c):''}${totals}${foot}</section>`;
  const toggle=mine?`<div class="ps-pane-toggle" role="tablist"><button type="button" role="tab" class="${ui.pane==='menu'?'selected':''}" data-action="ps-pane" data-id="menu" aria-selected="${ui.pane==='menu'}">Menu</button><button type="button" role="tab" class="${ui.pane==='check'?'selected':''}" data-action="ps-pane" data-id="check" aria-selected="${ui.pane==='check'}">Check · ${money(t.total)}${held.length?' · '+held.length+' to send':''}</button><button type="button" role="tab" class="${ui.pane==='actions'?'selected':''}" data-action="ps-pane" data-id="actions" aria-selected="${ui.pane==='actions'}">Actions</button></div>`:'';
  return `<div class="ps-order" data-pane="${mine?ui.pane:'check'}">${head}${toggle}<div class="ps-order-body ${mine?'':'is-readonly'}">${checkPane}${mine?menuPane_(c):''}${rail(c,mine,openC)}</div></div>`;
 }
 function menuPane_(c){
  const st=s(),groups=M().byCategory(st,{query:ui.query,date:c.date,service:c.service,inService:true}),cats=st.menu.categories.filter(x=>x.active&&M().servedAt(x,c.service)).sort((a,b)=>a.order-b.order),now=c.date===today()?F().nowMinutes():undefined,hh=P().happyHour(st,c.date,c.service,now),favs=P().sales(st,{from:B.addDays(c.date,-28),to:c.date,service:c.service}).items.slice(0,8).map(x=>x.id);
  const tabs=`<div class="ps-cats" role="tablist"><button type="button" role="tab" data-action="ps-cat" data-id="" aria-selected="${!ui.cat}">All</button><button type="button" role="tab" data-action="ps-cat" data-id="favs" aria-selected="${ui.cat==='favs'}">${icon('star')}Top sellers</button>${cats.map(x=>`<button type="button" role="tab" data-action="ps-cat" data-id="${e(x.id)}" aria-selected="${ui.cat===x.id}" style="--ct:var(--cat-${catHue(x.id)})">${e(x.name)}</button>`).join('')}<button type="button" role="tab" data-action="ps-cat" data-id="other" aria-selected="${ui.cat==='other'}">${lead()?'Open item &amp; gift cards':'Gift cards'}</button></div>`;
  // An 86’d tile with a sellable substitute stays tappable: it rings in the substitute instead.
  const tile=i=>{const av=i.availability,off=M().OFF.includes(av.status),pr=P().priceFor(st,i,c.date,c.service,now),all=i.allergenList||[],sb=off?av.sub:null,viaSub=!!(sb&&sb.dish&&sb.available);
   const flag=off?`<em class="ps-item-flag" data-tone="danger">${av.status==='86'?'86’d':av.status==='soldout'?'Sold out':'Out'}</em>${sb?`<em class="ps-item-sub">→ ${e(sb.name)}</em>`:''}`:av.status==='limited'?`<em class="ps-item-flag" data-tone="${av.remaining<=3?'danger':'amber'}">${av.remaining} left</em>`:av.status==='low'?`<em class="ps-item-flag" data-tone="amber">Low</em>`:pr.promo?`<em class="ps-item-flag" data-tone="orange">Happy hour</em>`:'';
   return `<button type="button" class="ps-item ${off?'is-off':''} ${viaSub?'has-sub':''} ${pr.promo?'is-promo':''}" style="--ct:var(--cat-${catHue(i.category)})" data-action="${viaSub?'ps-sub':'ps-add'}" data-id="${e(i.id)}" ${off&&!viaSub?'disabled':''} title="${e(i.name)}${sb?' · 86’d, offer '+e(sb.name)+' instead':''}${all.length?' · allergens: '+e(all.join(', ')):''}" aria-label="${e(i.name)} ${money(pr.price)}${off?', '+e(av.label)+(sb?', offer '+e(sb.name)+' instead':''):av.status==='limited'?', '+av.remaining+' left':''}"><strong>${e(i.name)}</strong><span>${flag}<b>${pr.promo?`<s>${money(pr.base)}</s>`:''}${money(pr.price)}</b></span></button>`;};
  let body;
  if(ui.cat==='other')body=`<div class="ps-menu-group"><h4>Gift cards</h4><div class="ps-items">${[25,50,100].map(a=>`<button type="button" class="ps-item" data-action="ps-gift" data-id="${a}" style="--ct:var(--mint)"><strong>Gift card</strong><span><b>${money(a)}</b></span></button>`).join('')}<button type="button" class="ps-item" data-action="ps-gift" data-id="" style="--ct:var(--mint)"><strong>Gift card</strong><span><b>Any amount</b></span></button></div></div>${lead()?`<div class="ps-menu-group"><h4>Open item</h4><div class="ps-items"><button type="button" class="ps-item" data-action="ps-open-item" data-id="${e(c.id)}" style="--ct:var(--slate)"><strong>Open item</strong><span><b>Name it, price it</b></span></button></div></div>`:''}`;
  else if(ui.cat==='favs'){const list=groups.flatMap(g=>g.items).filter(i=>favs.includes(i.id)).sort((a,b)=>favs.indexOf(a.id)-favs.indexOf(b.id));body=`<div class="ps-menu-group"><h4>Top sellers · last four weeks</h4><div class="ps-items">${list.map(tile).join('')||'<p class="ps-lane-empty">No sales yet.</p>'}</div></div>`;}
  else{const shown=ui.cat?groups.filter(g=>g.category.id===ui.cat):groups;body=shown.map(g=>`<div class="ps-menu-group"><h4>${e(g.category.name)}${hh&&st.pos.settings.happyHour.categories.includes(g.category.id)?`<em>Happy hour · ${st.pos.settings.happyHour.pct}% off</em>`:''}</h4><div class="ps-items">${g.items.map(tile).join('')}</div></div>`).join('')||'<p class="ps-lane-empty">Nothing matches.</p>';}
  return `<section class="ps-menu panel"><div class="ps-menu-top"><label class="sk-search ps-search"><span class="sr-only">Search the menu</span>${icon('search')}<input type="search" data-ps-search value="${e(ui.query)}" placeholder="Search the menu" autocomplete="off"></label>${tabs}</div><div class="ps-menu-body">${body}</div></section>`;
 }
 function render(){
  ensure();
  const c=ui.checkId?P().check(s(),ui.checkId):null;
  if(c)return `<div class="sk ps" data-tab="order">${orderView(c)}</div>`;
  const main=ui.tab==='checks'?checksView():ui.tab==='tickets'?views.kds():ui.tab==='cash'?views.cash():ui.tab==='close'?views.close():ui.tab==='sections'?views.sections():tablesView();
  return `<div class="sk ps" data-tab="${ui.tab}">${header()}<div class="ps-main">${main}</div></div>`;
 }

 // ---------- Dialogs ----------
 function dialog(title,fields,details,save=true,label='',wide=false){ui.form=details;ui.menu='';api.close?.();api.open(title,fields,save,label,wide);syncWhen();}
 function syncWhen(){const f=document.getElementById?.('editor-form');if(!f)return;for(const el of f.querySelectorAll('[data-ps-when]')){const [k,vals]=el.dataset.psWhen.split(':'),field=f.elements.namedItem(k);const v=field?.value??'';el.hidden=!vals.split(',').includes(v);}}
 const reasonChips=list=>`<div class="sk-reasons" aria-label="Quick reasons">${list.map(r=>`<button type="button" class="sk-chip" data-action="ps-reason" data-text="${e(r)}">${e(r)}</button>`).join('')}</div>`;
 ctx.reasonChips=reasonChips;
 const pad=(target,opts={})=>`<div class="ps-pad" role="group" aria-label="Number pad">${['7','8','9','4','5','6','1','2','3',opts.pin?'':'.','0','⌫'].map(k=>k===''?'<span></span>':`<button type="button" data-action="ps-pad" data-id="${e(k)}" data-target="${e(target)}" ${opts.pin?'data-pin="true"':''} aria-label="${k==='⌫'?'Delete':k}">${k}</button>`).join('')}</div>`;
 const radios=(nm,list,value)=>`<div class="sk-checks">${list.map(([v,l])=>`<label><input type="radio" name="${nm}" value="${e(v)}" ${v===value?'checked':''}><span>${l}</span></label>`).join('')}</div>`;
 const seatOpts=(c,cur_)=>select('seat','Seat',[['0','Shared'],...Array.from({length:Math.max(c.guests,ui.seat,cur_||0)},(_,i)=>[String(i+1),'Seat '+(i+1)])],String(cur_??ui.seat));
 // The table sheet: the party, where the order stands, money, and every table-level action in one place.
 function tableSheet(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const t=P().totals(st,c),openC=c.status==='open',mine=openC&&use()&&(c.server===me()||lead()),r=c.res?st.reservations.find(x=>x.id===c.res):null,others=c.tables.length?P().checksFor(st,st.date,st.service,c.tables[0]).filter(x=>x.id!==c.id):[];
  const live=c.lines.filter(l=>l.status!=='void'),sentAt=live.map(l=>l.sentAt).filter(Boolean).sort()[0],readyAll=live.length&&live.every(l=>['ready','served'].includes(l.status)),servedAll=live.length&&live.every(l=>l.status==='served'),lastServed=live.map(l=>l.servedAt).filter(Boolean).sort().at(-1);
  const step=(done,label,when,extra='')=>`<li class="${done?'is-done':''}"><i></i><span><strong>${label}</strong>${when?`<small>${when}</small>`:''}${extra}</span></li>`;
  const timeline=`<ol class="ps-timeline">${step(true,'Opened',clock(c.openedAt)+' · '+e(first(c.by||c.server)))}${step(!!sentAt,'First order sent',sentAt?clock(sentAt):'')}${step(readyAll,'Everything on the pass',readyAll?'':live.filter(l=>l.status==='sent').length+' cooking · '+live.filter(l=>l.status==='staged').length+' holding')}${step(servedAll,'All served',servedAll&&lastServed?clock(lastServed):'')}${step(!!c.presentedAt,'Check dropped',clock(c.presentedAt))}${step(!openC,c.status==='void'?'Voided':'Paid',clock(c.closedAt),c.payments.length?`<small>${e(c.payments.map(x=>x.method+' '+money(x.amount)).join(' · '))}</small>`:'')}</ol>`;
  const sec=c.tables.length?P().serverOf(st,st.date,st.service,c.tables[0]):'';
  const facts=`<dl class="sk-facts ps-facts"><div><dt>Party</dt><dd>${c.type==='dine'||c.type==='tab'?plural(c.guests,'guest'):e(P().typeLabel(c.type))}</dd><small>${c.name?e(c.name)+' · ':''}${r?e(r.source||'booking')+(r.time?' · '+e(r.time):''):'walk-in'}${c.phone?' · '+e(c.phone):''}</small></div><div><dt>Server</dt><dd>${e(name(c.server))}</dd><small>${e(where(c))}${sec&&sec!==c.server?' · section of '+e(first(sec)):''}</small></div><div><dt>Seated for</dt><dd>${mins(P().minutesSince(c.openedAt))}</dd><small>${c.pickupAt?(c.type==='delivery'?'out by ':'pickup ')+e(c.pickupAt):'opened '+clock(c.openedAt)}</small></div><div><dt>Total</dt><dd>${money(t.total)}</dd><small>${plural(t.items,'item')} · ${openC?money(t.due)+' due':'paid'}${c.tab?.preauth?' · pre-auth '+money(c.tab.preauth):''}</small></div></dl>`;
  const allergy=c.allergy?`<div class="ps-allergy">${icon('warn')}<span>${e(c.allergy)}</span></div>`:'';
  const tiles=[mine?['Details','guests','edit']:null,mine?['Split check','split','split']:null,mine?['Merge','merge','merge']:null,mine?['Move table','transfer','tables']:null,mine?['Change server','transfer','user']:null,openC&&lead()?['Discount','discount','percent']:null,openC&&mine&&live.length&&!c.presentedAt?['Drop check','present','receipt']:null,['Receipt','receipt','copy'],!openC&&lead()?['Reopen','reopen','undo']:null,!openC&&c.status==='paid'&&lead()?['Refund','refund','pay']:null,openC&&lead()?['Void check','void','x']:null].filter(Boolean);
  const actions=`<div class="ps-tiles">${tiles.map(([l,a,k])=>`<button type="button" class="ps-tile ${a==='void'?'is-danger':''}" data-action="ps-${a}" data-id="${e(c.id)}">${icon(k)}<span>${l}</span></button>`).join('')}</div>`;
  const more=others.length?`<h4 class="fl-sub">Also on this table</h4><div class="ps-list">${others.map(checkRow).join('')}</div>`:'';
  dialog(where(c)+(c.name?' · '+c.name:''),`<p class="sk-dialog-meta">#${c.number} · ${e(st.service)} · ${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))}</p>${allergy}${facts}<div class="ps-sheet-grid"><div><h4 class="fl-sub">Timeline</h4>${timeline}</div><div><h4 class="fl-sub">Actions</h4>${actions}</div></div>${more}${ui.checkId!==c.id?`<div class="toolbar">${btn(icon('checks')+'<span>Open the order</span>','open',c.id,'fl-icon-btn')}</div>`:''}`,{type:'none'},false,'',true);
 }
 function newDialog(type='dine',label=''){
  const st=s(),set=st.pos.settings,training=type==='training';if(training)type='dine';
  if(!set.orderTypes[type])type=Object.keys(set.orderTypes).find(k=>set.orderTypes[k])||'dine';
  const A=P().at(st,st.date,st.service),occs=F().occupancy(st,st.date,st.service,A),free=occs.filter(o=>!P().forTable(st,st.date,st.service,o.table.label));
  const opts=[['','No table'],...free.sort((a,b)=>(a.status==='open'?0:1)-(b.status==='open'?0:1)||a.table.label.localeCompare(b.table.label,undefined,{numeric:true})).map(o=>[o.table.label,'Table '+o.table.label+' · '+o.table.seats+' seats'+(o.booking?' · '+(o.status==='seated'?'seated: ':'booked: ')+o.booking.name:o.status==='soon'&&o.next?' · '+o.next.name+' at '+o.next.time:'')])];
  const t=label?F().byLabel(st,label):null,occ=t?occs.find(o=>o.table.id===t.id):null,guests=occ?.booking?.guests||t?.seats||2;
  const staff=P().staff(st,st.date,st.service),people=[...new Set([me(),...staff.servers,...staff.bar,...staff.managers])].filter(id=>st.team.find(p=>p.id===id)?.active);
  const types=Object.entries(P().TYPE_LABEL).filter(([k])=>set.orderTypes[k]).map(([k,l])=>[k,icon(typeIcon(k))+' '+l]);
  dialog(training?'Training check':'New check',`<p class="sk-dialog-meta">${e(st.service)} · ${e(dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}))}${occ?.booking?' · '+e(occ.booking.name)+', '+plural(occ.booking.guests,'guest')+(occ.status==='seated'?', seated':', booked '+e(occ.booking.time)):''}</p>${training?'<p class="sk-banner" data-tone="amber">Training checks ring and print like real ones but never count in sales, tips, stock or the drawer.</p>':''}<fieldset class="mg-form-section"><legend>Order type</legend>${radios('type_',types,t?'dine':type)}</fieldset><div data-ps-when="type_:dine,tab">${select('table','Table',opts,t?.label||'')}</div><div class="mg-form-grid"><div data-ps-when="type_:dine,tab">${input('guests','Guests',guests,'number','required min="0" max="60" step="1" inputmode="numeric"')}</div>${input('name','Name',occ?.booking&&occ.booking.source!=='Walk-in'?occ.booking.name:'','text','maxlength="100" placeholder="Optional for tables"')}<div data-ps-when="type_:takeout,delivery">${input('phone','Phone','','tel','maxlength="40"')}</div><div data-ps-when="type_:takeout,delivery">${input('pickupAt',type==='delivery'?'Out the door by':'Ready at',F().clock(F().nowMinutes()+set.prepMinutes+(type==='delivery'?15:0)),'time','')}</div><div data-ps-when="type_:tab">${input('card','Card on file · last 4','','text','maxlength="4" inputmode="numeric" placeholder="Optional"')}</div><div data-ps-when="type_:tab">${input('preauth','Pre-authorise',75,'number','min="0" step="5" inputmode="decimal"')}</div></div>${input('allergy','Allergy or dietary note','','text','maxlength="120" placeholder="Shows on every ticket for this check"')}${lead()?select('server','Server',people.map(id=>[id,name(id)]),t?P().serverOf(st,st.date,st.service,t.label)||me():me()):''}`,{type:'open',id:'c-'+crypto.randomUUID().replace(/-/g,'').slice(0,16),training},true,'Open check');
 }
 function addDialog(cid,itemId){
  const st=s(),c=P().check(st,cid),it=M().item(st,itemId);if(!c||!it)return;
  const groups=M().modifierGroups(st,it),pr=P().priceFor(st,it,c.date,c.service,c.date===today()?F().nowMinutes():undefined),all=M().allergens(st,it);
  const fields=groups.map(g=>`<fieldset class="mg-form-section"><legend>${e(g.name)}${g.required?' · required':''}</legend><div class="sk-checks">${g.options.map(o=>`<label><input type="${g.multi?'checkbox':'radio'}" name="mod_${e(g.id)}" value="${e(o.name)}" ${g.required&&!g.multi&&o===g.options[0]?'checked':''}><span>${e(o.name)}${o.price?' '+(o.price>0?'+':'')+money(o.price):''}</span></label>`).join('')}</div></fieldset>`).join('');
  dialog(it.name,`<p class="sk-dialog-meta">${money(pr.price)}${pr.promo?' · '+e(pr.promo)+' (was '+money(pr.base)+')':''}${all.length?' · Allergens: '+e(all.join(', ')):''}</p>${c.allergy?`<p class="sk-banner" data-tone="danger">Allergy on this check: ${e(c.allergy)}</p>`:''}${fields}<div class="mg-form-grid">${input('qty','Quantity',1,'number','required min="1" max="99" step="1" inputmode="numeric"')}${seatOpts(c)}${select('course','Course',M().COURSES.map((x,i)=>[String(i),x]),String(Math.max(0,M().COURSES.indexOf(M().courseOf(st,it)))))}</div>${reasonChips(['No onions','Sauce on the side','Extra crispy','Allergy: nuts','Allergy: gluten','Birthday candle'])}${textarea('note','Note for the kitchen or bar','','maxlength="200" rows="2"')}`,{type:'add',id:cid,item:itemId,groups:groups.map(g=>g.id)},true,'Add to check');
 }
 function lineDialog(cid,lineId){
  const st=s(),c=P().check(st,cid),l=c?.lines.find(x=>x.id===lineId);if(!c||!l)return;
  const held=l.status==='held'&&c.status==='open'&&use(),staged=l.status==='staged'&&c.status==='open'&&use();
  dialog(l.name,`<p class="sk-dialog-meta">${l.qty}× · ${money(P().lineGross(l))}${l.mods.length?' · '+e(l.mods.map(m=>m.name).join(', ')):''} · ${e(l.status==='staged'?'holding':l.status)}${l.sentAt?' '+clock(l.sentAt):''}</p>`+(held?`<div class="mg-form-grid">${input('qty','Quantity',l.qty,'number','required min="0" max="99" step="1" inputmode="numeric"')}${seatOpts(c,l.seat)}${select('course','Course',M().COURSES.map((x,i)=>[String(i),x]),String(l.course))}</div>${textarea('note','Note for the kitchen or bar',l.note||'','maxlength="200" rows="2"')}<p class="sk-hint">Quantity 0 removes the line.</p>`:staged?`<div class="mg-form-grid">${seatOpts(c,l.seat)}${select('course','Course',M().COURSES.map((x,i)=>[String(i),x]),String(l.course))}</div>`:`<p>${l.note?'“'+e(l.note)+'”':'No note.'} Sent items can’t be edited; a lead can void, comp or discount them.</p>`),{type:'line',id:cid,line:lineId,held,staged},held||staged,'Save');
 }
 // Selection dialogs: seat, share the cost, move.
 function seatDialog(cid){const st=s(),c=P().check(st,cid),sel=selLines(c);if(!sel.length)return;const canCourse=sel.every(l=>['held','staged'].includes(l.status));
  dialog('Seat '+plural(sel.length,'item'),`<p class="sk-dialog-meta">${e(sel.map(l=>l.name).join(', '))}</p><div class="mg-form-grid">${seatOpts(c,sel[0].seat)}${canCourse?select('course','Course',[['','Keep'],...M().COURSES.map((x,i)=>[String(i),x])],''):''}</div>`,{type:'seat',id:cid,lines:sel.map(l=>l.id)},true,'Save');}
 function splitLineDialog(cid){const st=s(),c=P().check(st,cid),sel=selLines(c);if(!sel.length)return;
  dialog('Share the cost',`<p class="sk-dialog-meta">${e(sel.map(l=>l.name).join(', '))} · ${money(sel.reduce((n,l)=>n+P().lineGross(l),0))}</p>${select('n','Between',[2,3,4,5,6,8,10].map(n=>[String(n),n+' guests']),'2')}${select('seats','Seats',[['same','Keep on the same seat'],['next','Seats 1, 2, 3… in order']],'next')}<p class="sk-hint">Each guest gets an equal share of the item on their own line, so a split by seat or a separate check carries it.</p>`,{type:'split-line',id:cid,lines:sel.map(l=>l.id)},true,'Share');}
 function moveDialog(cid,mode){
  const st=s(),c=P().check(st,cid),sel=selLines(c);if(!c||!sel.length)return;const others=openNow().filter(x=>x.id!==cid&&(x.server===me()||lead()));
  const opts=[['new','A new check on this table'],...(others.length?[['other','Another open check']]:[])];
  dialog('Move '+plural(sel.length,'item'),`<p class="sk-dialog-meta">${e(sel.map(l=>l.name).join(', '))}</p>${radios('mode',opts,mode==='to'&&others.length?'other':'new')}<div data-ps-when="mode:new">${input('name','Name on the new check','','text','maxlength="100" placeholder="Optional"')}</div><div data-ps-when="mode:other">${select('to','Check',others.map(x=>[x.id,where(x)+(x.name?' · '+x.name:'')+' · '+money(P().totals(st,x).total)]),others[0]?.id||'')}</div>`,{type:'move',id:cid,lines:sel.map(l=>l.id)},true,'Move');
 }
 function payDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const t=P().totals(st,c),set=st.pos.settings;
  const tenders=radios('method',set.tenders.map(m=>[m,m]),set.tenders[0]);
  const splits=`<div class="sk-reasons" aria-label="Split evenly">${[1,2,3,4].map(n=>`<button type="button" class="sk-chip" data-action="ps-split-amt" data-id="${n}" data-due="${t.due}">${n===1?'Pay it all':'Split by '+n}</button>`).join('')}</div>`;
  const quick=`<div class="sk-reasons" data-ps-when="method:Cash" aria-label="Cash tendered">${[['exact','Exact'],['20','$20'],['50','$50'],['100','$100']].map(([v,l])=>`<button type="button" class="sk-chip" data-action="ps-tendered" data-id="${v}">${l}</button>`).join('')}</div>`;
  const tips=`<div class="sk-reasons" aria-label="Tip suggestions">${set.tipSuggestions.map(p=>`<button type="button" class="sk-chip" data-action="ps-tip-pct" data-id="${p}" data-net="${t.net}">${p}% · ${money(t.net*p/100)}</button>`).join('')}<button type="button" class="sk-chip" data-action="ps-tip-pct" data-id="0">No tip</button></div>`;
  const gift=`<div data-ps-when="method:Gift card">${input('ref_gift','Gift card code','','text','maxlength="12" placeholder="GC-XXXX" autocomplete="off"')}<p class="sk-hint" id="ps-gift-note">Balance shows once a code is entered.</p></div>`;
  const acc=`<div data-ps-when="method:House account">${select('ref_acc','House account',st.pos.accounts.filter(a=>a.active).map(a=>[a.id,a.name+' · '+money(a.balance)+(a.limit?' of '+money(a.limit):'')]),'')}</div>`;
  dialog('Pay · '+where(c),`<dl class="sk-facts ps-pay-facts"><div><dt>Due</dt><dd id="ps-due">${money(t.due)}</dd></div><div><dt>Total</dt><dd>${money(t.total)}</dd><small>${money(t.net)} net · ${money(t.tax)} tax${t.sc?' · '+money(t.sc)+' service charge':''}</small></div></dl>${c.tab?.preauth?`<p class="sk-hint">Card ending ${e(c.tab.card)} pre-authorised for ${money(c.tab.preauth)}${t.due>c.tab.preauth?' · <b>the check is over the pre-auth</b>':''}.</p>`:''}${tenders}${gift}${acc}${splits}<div class="ps-pay-grid"><div>${input('amount','Amount',t.due.toFixed(2),'number','required min="0" step="0.01" inputmode="decimal"')}${tips}<div class="mg-form-grid">${input('tip','Tip',c.serviceCharge||c.type==='takeout'?'0.00':(t.net*set.tipSuggestions[0]/100).toFixed(2),'number','min="0" step="0.01" inputmode="decimal"')}<div data-ps-when="method:Cash">${input('tendered','Cash tendered','','number','min="0" step="0.01" inputmode="decimal" placeholder="For change"')}</div></div>${quick}<p id="ps-change" class="sk-hint">${c.serviceCharge?'A service charge is already on this check.':''}</p></div>${pad('amount')}</div>`,{type:'pay',id:cid},true,'Take payment');
 }
 function reasonDialog(kind,cid,lineIds,undo){
  const st=s(),c=P().check(st,cid);if(!c)return;const set=st.pos.settings,ids=[].concat(lineIds||[]).filter(Boolean),ls=ids.map(id=>c.lines.find(x=>x.id===id)).filter(Boolean),l=ls[0];
  if(kind==='comp'&&undo){api.commit({type:'pos:comp',id:cid,line:ids[0],undo:true},'Comp removed.');return;}
  if(kind==='line-discount'&&undo){api.commit({type:'pos:remove-discount',id:cid,line:ids[0]},'Discount removed.');return;}
  const what=ls.length>1?plural(ls.length,'item'):(l?.name||'item');
  const titles={'void-line':'Void '+what,comp:'Comp '+what,void:'Void the check',discount:'Discount the check','line-discount':'Discount '+what};
  const isDisc=kind==='discount'||kind==='line-discount';
  const presets=isDisc?`<div class="sk-reasons" aria-label="Presets">${set.discountPresets.map(d=>`<button type="button" class="sk-chip" data-action="ps-preset" data-id="${e(d.id)}" data-kind="${d.kind}" data-value="${d.value}" data-text="${e(d.name)}">${e(d.name)} · ${d.kind==='pct'?d.value+'%':money(d.value)}</button>`).join('')}</div>`:'';
  const extra=isDisc?`<div class="mg-form-grid">${select('kind','Type',[['pct','Percent off'],['amt','Amount off']],'pct')}${input('value','Value',10,'number','required min="0.01" step="0.01" inputmode="decimal"')}</div>`:'';
  dialog(titles[kind],`<p class="sk-dialog-meta">${ls.length>1?e(ls.map(x=>x.name).join(', '))+'. ':''}${kind==='void'?'Every item goes to void and the check closes. Payments must come off first.':kind==='void-line'?'Already sent; the void is reported with your name.':kind==='comp'?'The guest is not charged; the cost still shows in reports.':kind==='line-discount'?'These items only.':'The whole check, after comps and item discounts.'}</p>${presets}${extra}${reasonChips(kind==='comp'?set.compReasons:isDisc?set.compReasons:set.voidReasons)}${textarea('reason','Reason','','required maxlength="200" rows="2"')}`,{type:kind,id:cid,line:ids[0]||'',lines:ids},true,isDisc?'Apply':kind==='comp'?'Comp it':'Void');
 }
 function detailsDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const set=st.pos.settings;
  const types=Object.entries(P().TYPE_LABEL).filter(([k])=>set.orderTypes[k]||k===c.type).map(([k,l])=>[k,icon(typeIcon(k))+' '+l]);
  dialog('Check details',`<fieldset class="mg-form-section"><legend>Order type</legend>${radios('type_',types,c.type)}</fieldset><div class="mg-form-grid">${input('guests','Guests',c.guests,'number','required min="0" max="60" step="1" inputmode="numeric"')}${input('name','Name',c.name||'','text','maxlength="100"')}${input('phone','Phone',c.phone||'','tel','maxlength="40"')}<div data-ps-when="type_:takeout,delivery">${input('pickupAt','Pickup time',c.pickupAt||'','time','')}</div><div data-ps-when="type_:tab">${input('card','Card on file · last 4',c.tab?.card||'','text','maxlength="4" inputmode="numeric"')}</div><div data-ps-when="type_:tab">${input('preauth','Pre-authorised',c.tab?.preauth||0,'number','min="0" step="5" inputmode="decimal"')}</div></div>${input('allergy','Allergy or dietary note',c.allergy||'','text','maxlength="120"')}${textarea('note','Note',c.note||'','maxlength="500" rows="2"')}${lead()?select('serviceCharge','Service charge',[['true','On ('+set.serviceCharge+'%)'],['false','Off']],String(c.serviceCharge)):''}`,{type:'update',id:cid},true,'Save');
 }
 function transferDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const staff=P().staff(st,st.date,st.service),people=[...new Set([c.server,me(),...staff.servers,...staff.bar,...staff.managers])].filter(id=>st.team.find(p=>p.id===id)?.active);
  const tables=F().plan(st).tables.sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true})).map(t=>{const busy=P().forTable(st,st.date,st.service,t.label);return [t.label,'Table '+t.label+' · '+t.seats+' seats'+(busy&&busy.id!==c.id?' · has a check (join)':'')];});
  dialog('Move table or server',(c.server===me()||lead()?select('server','Server',people.map(id=>[id,name(id)]),c.server):'')+select('table','Table',[['','No table'],...tables],c.tables[0]||'')+'<p class="sk-hint">Moving the table also moves the linked booking. A table that already has a check takes both.</p>',{type:'transfer',id:cid},true,'Save');
 }
 function splitDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const live=c.lines.filter(l=>l.status!=='void'),seats=[...new Set(live.map(l=>l.seat).filter(n=>n>0))];
  dialog('Split the check',`<p class="sk-dialog-meta">${plural(live.length,'item')} · ${money(P().totals(st,c).total)}</p><fieldset class="mg-form-section"><legend>How</legend>${radios('mode',[['seats','By seat · '+plural(seats.length,'seat')+(seats.length<2?' (needs 2+)':'')],['even','Evenly'],['items','By item']],seats.length>=2?'seats':'even')}</fieldset><div data-ps-when="mode:even">${select('n','Ways',[2,3,4,5,6,8,10].map(n=>[String(n),n+' checks']),'2')}</div><p class="sk-hint">By seat makes one check per seat and spreads shared items. Evenly gives each check a 1/n share of every item. By item lets you tap items on the check and move them.</p>`,{type:'split',id:cid},true,'Split');
 }
 function mergeDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const others=openNow().filter(x=>x.id!==cid&&(x.server===me()||lead()));
  if(!others.length){api.notify('No other open check to merge.');return;}
  dialog('Merge into this check',select('from','Check to merge',others.map(x=>[x.id,where(x)+(x.name?' · '+x.name:'')+' · '+money(P().totals(st,x).total)]),others[0].id)+'<p class="sk-hint">Its items, payments and tables join this check; the other check closes.</p>',{type:'merge',id:cid},true,'Merge');
 }
 function refundDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const t=P().totals(st,c),room=Math.max(0,t.paid-t.refunded),set=st.pos.settings;
  dialog('Refund',`<dl class="sk-facts ps-pay-facts"><div><dt>Paid</dt><dd>${money(t.paid)}</dd><small>${c.payments.map(x=>x.method+' '+money(x.amount)).join(' · ')}</small></div><div><dt>Can refund</dt><dd>${money(room)}</dd>${t.refunded?`<small>${money(t.refunded)} already refunded</small>`:''}</dl>${radios('method',set.tenders.map(m=>[m,m]),c.payments[0]?.method||set.tenders[0])}<div data-ps-when="method:Gift card">${input('ref_gift','Gift card code',c.payments.find(x=>x.method==='Gift card')?.ref||'','text','maxlength="12"')}</div><div data-ps-when="method:House account">${select('ref_acc','House account',st.pos.accounts.map(a=>[a.id,a.name]),c.payments.find(x=>x.method==='House account')?.ref||'')}</div>${input('amount','Amount',room.toFixed(2),'number',`required min="0.01" max="${room}" step="0.01" inputmode="decimal"`)}${reasonChips(['Wrong order','Quality issue','Overcharged','Guest complaint','Duplicate payment'])}${textarea('reason','Reason','','required maxlength="200" rows="2"')}`,{type:'refund',id:cid},true,'Refund');
 }
 function tipDialog(cid,paymentId){
  const st=s(),c=P().check(st,cid),x=c?.payments.find(y=>y.id===paymentId);if(!x)return;const t=P().totals(st,c);
  dialog('Adjust tip',`<p class="sk-dialog-meta">${e(x.method)} ${money(x.amount)} · tip now ${money(x.tip)}</p><div class="sk-reasons">${st.pos.settings.tipSuggestions.map(p=>`<button type="button" class="sk-chip" data-action="ps-tip-pct" data-id="${p}" data-net="${t.net}">${p}% · ${money(t.net*p/100)}</button>`).join('')}</div>${input('tip','Tip from the signed slip',x.tip.toFixed(2),'number','required min="0" step="0.01" inputmode="decimal"')}`,{type:'tip',id:cid,payment:paymentId},true,'Save tip');
 }
 function receiptDialog(cid){
  const st=s(),c=P().check(st,cid);if(!c)return;const t=P().totals(st,c),w=40,pad_=(a,b)=>a.slice(0,w-b.length-1).padEnd(w-b.length)+b,set=st.pos.settings;
  const bySeat=new Map();for(const l of c.lines.filter(x=>x.status!=='void'))bySeat.set(l.seat,[...(bySeat.get(l.seat)||[]),l]);
  const lines=[set.receipt.header,`Check #${c.number} · ${where(c)}${c.name?' · '+c.name:''}`,`${dateLabel(c.date,{month:'short',day:'numeric',year:'numeric'})} · ${c.service} · ${name(c.server)}`,c.type==='dine'||c.type==='tab'?plural(c.guests,'guest'):P().typeLabel(c.type)+(c.pickupAt?' · '+c.pickupAt:''),...(c.training?['*** TRAINING · NOT A SALE ***']:[]),'-'.repeat(w),...[...bySeat].sort((a,b)=>a[0]-b[0]).flatMap(([seat,ls])=>[...(bySeat.size>1?[seat?'Seat '+seat:'Shared']:[]),...ls.map(l=>pad_(`${l.splitOf?'1/'+l.splitOf+' ':''}${l.qty}x ${l.name}${l.mods.length?' ('+l.mods.map(m=>m.name).join(', ')+')':''}${l.comp?' COMP':''}${l.promo?' *':''}`,money(l.comp?0:P().lineGross(l)-P().lineDisc(l))))]),'-'.repeat(w),pad_('Items',money(t.gross)),...(t.comps?[pad_('Comps',`-${money(t.comps)}`)]:[]),...(t.discounts?[pad_('Discounts',`-${money(t.discounts)}`)]:[]),pad_('Net',money(t.net)),...(t.sc?[pad_(`Service charge ${set.serviceCharge}%`,money(t.sc))]:[]),pad_(t.taxIncluded?'Tax included':'Tax',money(t.tax)),pad_('TOTAL',money(t.total)),...c.payments.map(x=>pad_(`${x.method}${x.tip?' (tip '+money(x.tip)+')':''}`,money(x.amount))),...(c.payments.some(x=>x.tendered)?c.payments.filter(x=>x.tendered).map(x=>pad_('Change',money(x.tendered-x.amount))):[]),...(c.status==='open'?[pad_('Due',money(t.due))]:[]),...(c.refunds||[]).map(r=>pad_('Refund · '+r.method,`-${money(r.amount)}`)),...(c.status==='open'&&t.due>0?['',...set.tipSuggestions.map(p=>pad_(`Tip ${p}%`,money(t.net*p/100)))]:[]),...(t.promos?['','* happy hour price']:[]),'',c.status==='paid'?set.receipt.footer:c.status==='void'?'VOID':'',''].filter(x=>x!==undefined);
  dialog('Receipt',`<pre class="ps-receipt" id="ps-receipt">${e(lines.join('\n'))}</pre><div class="ps-receipt-send">${input('email','Email the receipt','','email','placeholder="guest@example.com"')}${btn('Send','email-receipt',cid,'secondary small')}</div><div class="toolbar">${btn(icon('copy')+'<span>Copy</span>','copy','','secondary small fl-icon-btn')}${btn('Print','print','','secondary small')}</div>`,{type:'none'},false);
 }
 function pinDialog(){
  const st=s(),people=st.team.filter(p=>p.active).sort((a,b)=>(a.id===me()?-1:b.id===me()?1:0)||a.name.localeCompare(b.name));
  dialog('Switch user',`<div class="sk-chips mn-chips ps-people" role="radiogroup">${people.map(p=>`<label class="sk-chip ps-person"><input type="radio" name="person" value="${e(p.id)}" ${p.id===me()?'checked':''}><span class="ps-srv" data-hue="${hue(p.id)}">${e(p.initials)}</span>${e(p.name.split(' ')[0])}</label>`).join('')}</div><input type="hidden" name="pin" value=""><div class="ps-pin" id="ps-pin-dots" aria-live="polite"><i></i><i></i><i></i><i></i></div>${pad('pin',{pin:true})}<p class="sk-hint">Demo PINs: managers 0000, crew 1234.</p>`,{type:'pin'},false);
 }
 function openItemDialog(cid){
  const st=s();dialog('Open item',`<div class="mg-form-grid">${input('name','Name','','text','required maxlength="100" placeholder="e.g. Corkage"')}${input('price','Price','','number','required min="0.01" step="0.01" inputmode="decimal"')}${select('station','Station',[['','No ticket'],...st.setup.areas.map(a=>[a,a])],'Kitchen')}${select('course','Course',M().COURSES.map((x,i)=>[String(i),x]),'2')}</div>${pad('price')}`,{type:'open-item',id:cid},true,'Add');
 }
 function giftDialog(cid,amount){
  dialog('Sell a gift card',`<div class="sk-reasons">${[25,50,75,100,150,200].map(a=>`<button type="button" class="sk-chip" data-action="ps-set-field" data-id="price" data-value="${a}">${money(a)}</button>`).join('')}</div>${input('price','Amount',amount||'','number','required min="5" step="1" inputmode="decimal"')}${input('note','For (optional)','','text','maxlength="120"')}<p class="sk-hint">The code is generated now and activates when this check is paid.</p>`,{type:'gift',id:cid},true,'Add to check');
 }
 function tablePicker(label,list){
  dialog('Table '+label,`<div class="ps-list">${list.map(checkRow).join('')}</div><div class="toolbar">${use()?btn(icon('add')+'<span>Another check here</span>','new-here',label,'secondary small fl-icon-btn'):''}</div>`,{type:'none'},false);
 }
 function submit(values,fd){
  const f=ui.form||{},st=s();
  if(f.type==='open')return {type:'pos:open',id:f.id,type_:values.type_||'dine',tables:values.table&&['dine','tab'].includes(values.type_||'dine')?[values.table]:[],guests:['takeout','delivery'].includes(values.type_)?1:Number(values.guests),name:values.name,phone:values.phone,pickupAt:['takeout','delivery'].includes(values.type_)?values.pickupAt:'',allergy:values.allergy,server:values.server||'',card:values.type_==='tab'?values.card:'',preauth:values.type_==='tab'?Number(values.preauth||0):0,training:!!f.training,another:!!f.another,date:st.date,service:st.service};
  if(f.type==='add'){const mods=f.groups.flatMap(g=>fd.getAll('mod_'+g));return {type:'pos:add',id:f.id,item:f.item,qty:Number(values.qty),seat:Number(values.seat),course:Number(values.course),mods,note:values.note};}
  if(f.type==='open-item')return {type:'pos:add',id:f.id,item:'open-item',name:values.name,price:Number(values.price),station:values.station,course:Number(values.course),seat:ui.seat};
  if(f.type==='gift')return {type:'pos:add',id:f.id,item:'gift-card',price:Number(values.price),note:values.note,seat:ui.seat};
  if(f.type==='line')return f.held?{type:'pos:line',id:f.id,line:f.line,qty:Number(values.qty),seat:Number(values.seat),course:Number(values.course),note:values.note}:{type:'pos:line',id:f.id,line:f.line,seat:Number(values.seat),course:Number(values.course)};
  if(f.type==='seat'){const acts=f.lines.map(line=>({type:'pos:line',id:f.id,line,seat:Number(values.seat),...(values.course?{course:Number(values.course)}:{})}));f.rest=acts.slice(1);return acts[0];}
  if(f.type==='split-line'){const n=Number(values.n),acts=f.lines.map(line=>({type:'pos:split-line',id:f.id,line,n,seats:values.seats==='next'?Array.from({length:n},(_,i)=>i+1):[]}));f.rest=acts.slice(1);return acts[0];}
  if(f.type==='pay'){const m=values.method;return {type:'pos:pay',id:f.id,payment:{id:'pay-'+crypto.randomUUID().replace(/-/g,'').slice(0,12),method:m,amount:Number(values.amount),tip:Number(values.tip||0),ref:m==='Gift card'?String(values.ref_gift||'').toUpperCase().trim():m==='House account'?values.ref_acc||'':'',tendered:m==='Cash'?Number(values.tendered||0):0}};}
  if(f.type==='void-line'){const acts=(f.lines?.length?f.lines:[f.line]).map(line=>({type:'pos:void-line',id:f.id,line,reason:values.reason}));f.rest=acts.slice(1);return acts[0];}
  if(f.type==='comp'){const acts=(f.lines?.length?f.lines:[f.line]).map(line=>({type:'pos:comp',id:f.id,line,reason:values.reason}));f.rest=acts.slice(1);return acts[0];}
  if(f.type==='void')return {type:'pos:void',id:f.id,reason:values.reason};
  if(f.type==='discount')return {type:'pos:discount',id:f.id,kind:values.kind,value:Number(values.value),reason:values.reason};
  if(f.type==='line-discount'){const acts=(f.lines?.length?f.lines:[f.line]).map(line=>({type:'pos:discount',id:f.id,line,kind:values.kind,value:Number(values.value),reason:values.reason}));f.rest=acts.slice(1);return acts[0];}
  if(f.type==='update')return {type:'pos:update',id:f.id,type_:values.type_,guests:Number(values.guests),name:values.name,phone:values.phone,note:values.note,allergy:values.allergy,...(values.type_==='takeout'||values.type_==='delivery'?{pickupAt:values.pickupAt||''}:{}),...(values.type_==='tab'?{card:values.card||'',preauth:Number(values.preauth||0)}:{}),...(values.serviceCharge!==undefined?{serviceCharge:values.serviceCharge==='true'}:{})};
  if(f.type==='transfer'){const c=P().check(st,f.id),busy=values.table?P().forTable(st,st.date,st.service,values.table):null;return {type:'pos:transfer',id:f.id,...(values.server?{server:values.server}:{}),tables:values.table?[values.table]:[],join:!!(busy&&busy.id!==c?.id)};}
  if(f.type==='split'){if(values.mode==='items'){ui.selecting=true;ui.selected.clear();ui.pane='check';return null;}const ids=Array.from({length:10},()=>'c-'+crypto.randomUUID().replace(/-/g,'').slice(0,16));return {type:'pos:split',id:f.id,mode:values.mode,n:Number(values.n||2),ids};}
  if(f.type==='move')return {type:'pos:move-lines',id:f.id,lines:f.lines||[...ui.selected],to:values.mode==='other'?values.to:'',newId:'c-'+crypto.randomUUID().replace(/-/g,'').slice(0,16),name:values.name||''};
  if(f.type==='merge')return {type:'pos:merge',id:f.id,from:values.from};
  if(f.type==='refund')return {type:'pos:refund',id:f.id,amount:Number(values.amount),method:values.method,ref:values.method==='Gift card'?String(values.ref_gift||'').toUpperCase().trim():values.method==='House account'?values.ref_acc:'',reason:values.reason};
  if(f.type==='tip')return {type:'pos:tip',id:f.id,payment:f.payment,tip:Number(values.tip)};
  if(views){const act=views.submit(f,values,fd);if(act!==undefined)return act;}
  throw Error('Unknown POS form.');
 }
 function saved(){
  const f=ui.form||{},st=s();
  // Selections can carry several items: the first action went through the form, the rest follow here.
  if(f.rest?.length){const rest=f.rest;f.rest=[];for(const a of rest)api.commit(a,null);}
  if(['seat','split-line','void-line','comp','line-discount','move'].includes(f.type))clearSel();
  if(f.type==='open'){const c=P().check(st,f.id);if(c){ui.checkId=c.id;ui.pane='menu';ui.seat=0;ui.cat='';ui.query='';clearSel();}return f.training?'Training check opened. Nothing on it counts.':'Check opened.';}
  if(f.type==='pay'){const c=P().check(st,f.id);if(c&&c.status==='paid'){ui.checkId='';return 'Paid in full. Tips posted to earnings.';}return 'Payment recorded.';}
  if(f.type==='void'){ui.checkId='';return 'Check voided.';}
  if(f.type==='split'){ui.checkId='';ui.tab='checks';ui.filter='open';return 'Check split. The new checks are in Orders.';}
  if(f.type==='move'){if(!P().check(st,f.id))ui.checkId='';return 'Items moved.';}
  if(f.type==='merge')return 'Checks merged.';
  if(f.type==='refund')return 'Refund recorded in the journal.';
  if(f.type==='tip')return 'Tip adjusted. Earnings updated.';
  if(f.type==='gift')return 'Gift card added. It activates when the check is paid.';
  return views?.saved(f)||{add:'Added to the check.','open-item':'Open item added.',line:'Line updated.',seat:'Seats updated.','split-line':'Cost shared.','void-line':'Voided.',comp:'Comped.',discount:'Discount applied.','line-discount':'Items discounted.',update:'Check updated.',transfer:'Check moved.'}[f.type]||'Saved.';
 }
 // ---------- Actions ----------
 const formEl=()=>document.getElementById?.('editor-form')||null;
 const setField=(nm,v)=>{const f=formEl(),el=f?.elements.namedItem(nm);if(el){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}};
 function handle(action,id,ds={},target){
  const st=s();
  if(action==='menu'){ui.menu=ui.menu===id?'':id;api.render();return;}
  ui.menu='';
  if(action==='tab'){ui.tab=id;ui.checkId='';api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='go'){ui.checkId='';if(ds.tab)ui.tab=ds.tab;if(ds.station!==undefined)ui.station=ds.station;api.go();return;}
  if(action==='back'){ui.checkId='';clearSel();api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='room'){ui.room=id;api.render();return;}
  if(action==='scope'){ui.scope=id;api.render();return;}
  if(action==='filter'){ui.filter=id;api.render();return;}
  if(action==='type-filter'){ui.typeFilter=id;api.render();return;}
  if(action==='pane'){ui.pane=id;api.render();return;}
  if(action==='cat'){ui.cat=id||'';api.render();return;}
  if(action==='seat'){ui.seat=Number(id)||0;api.render();return;}
  if(action==='open'){ui.checkId=id;ui.pane='check';ui.seat=0;clearSel();api.close();api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='table'){
   const list=P().checksFor(st,st.date,st.service,id);
   if(list.length>1){api.close();api.go();tablePicker(id,list);return;}
   if(list.length){ui.checkId=list[0].id;ui.pane='menu';ui.seat=0;clearSel();api.close();api.go();return;}
   if(!use()){api.notify('The POS is turned off for your profile.');return;}
   api.close();api.go();newDialog('dine',id);return;
  }
  if(action==='table-sheet'){tableSheet(id||ui.checkId);return;}
  if(action==='new'){newDialog(id||'dine');return;}
  if(action==='new-here'){api.close();newDialog('dine',id);ui.form={...ui.form,another:true};return;}
  if(action==='add'){const it=M().item(st,id);if(!it||!ui.checkId)return;if(M().modifierGroups(st,it).length){addDialog(ui.checkId,id);return;}api.commit({type:'pos:add',id:ui.checkId,item:id,qty:1,seat:ui.seat},null);return;}
  if(action==='sub'){const it=M().item(st,id),c=ui.checkId?P().check(st,ui.checkId):null;if(!it||!c)return;const sb=M().availability(st,it,c.date,c.service).sub;if(!sb?.dish||!sb.available){api.notify(sb?`${it.name} is 86’d · offer ${sb.name} instead.`:`${it.name} is 86’d.`);return;}if(M().modifierGroups(st,sb.dish).length){api.notify(`${it.name} is 86’d · ringing in ${sb.name} instead.`);addDialog(ui.checkId,sb.item);return;}if(api.commit({type:'pos:add',id:ui.checkId,item:sb.item,qty:1,seat:ui.seat},null))api.notify(`${it.name} is 86’d · added ${sb.name} instead.`);return;}
  if(action==='gift'){if(!ui.checkId)return;giftDialog(ui.checkId,id);return;}
  if(action==='open-item'){openItemDialog(id||ui.checkId);return;}
  if(action==='qty'){const c=P().check(st,id),l=c?.lines.find(x=>x.id===ds.line);if(!l)return;api.commit({type:'pos:line',id,line:ds.line,qty:l.qty+Number(ds.step||0)},null);return;}
  if(action==='line-sel'||action==='pick-line'){const line=ds.line||id;if(action==='pick-line'&&target&&target.checked===false)ui.selected.delete(line);else if(ui.selected.has(line))ui.selected.delete(line);else ui.selected.add(line);api.render();return;}
  if(action==='sel-clear'){clearSel();api.render();return;}
  if(action==='select'){ui.selecting=!ui.selecting;ui.selected.clear();ui.pane='check';api.render();return;}
  if(action==='sel-edit'){const l=selLines(P().check(st,id))[0];if(l)lineDialog(id,l.id);return;}
  if(action==='sel-seat'){seatDialog(id);return;}
  if(action==='sel-split'){splitLineDialog(id);return;}
  if(action==='sel-move'){moveDialog(id,'new');return;}
  if(action==='move-new'){moveDialog(id,'new');return;}
  if(action==='move-to'){moveDialog(id,'to');return;}
  if(action==='sel-discount'){reasonDialog('line-discount',id,[...ui.selected]);return;}
  if(action==='sel-comp'){reasonDialog('comp',id,[...ui.selected]);return;}
  if(action==='sel-void'){reasonDialog('void-line',id,[...ui.selected]);return;}
  if(action==='sel-remove'){const c=P().check(st,id),ls=selLines(c);let ok=true;for(const l of ls)ok=api.commit({type:'pos:remove-line',id,line:l.id},null)&&ok;clearSel();api.render();api.notify(ok?plural(ls.length,'item')+' removed.':'Some items could not be removed.');return;}
  if(action==='line-edit'){lineDialog(id,ds.line);return;}
  if(action==='remove-line'){api.commit({type:'pos:remove-line',id,line:ds.line},'Removed.');return;}
  if(action==='send'){const c=P().check(st,id),n=c?c.lines.filter(l=>l.status==='held').length:0;if(api.commit({type:'pos:send',id},null)){const after=P().check(s(),id),staged=after?after.lines.filter(l=>l.status==='staged').length:0;api.notify(plural(n,'item')+' sent'+(staged?' · '+staged+' holding for the next course':'')+'.');ui.pane='check';}return;}
  if(action==='fire'){api.commit({type:'pos:fire',id,...(ds.course!==undefined?{course:Number(ds.course)}:{})},'Course fired.');return;}
  if(action==='bump'){api.commit({type:'pos:bump',id,...(ds.lines?{lines:ds.lines.split(',')}:{line:ds.line}),status:ds.status},ds.status==='ready'?'On the pass.':ds.status==='served'?'Served.':'Recalled.');return;}
  if(action==='bump-next'){const c=P().check(st,id),l=c?.lines.find(x=>x.id===ds.line);if(!l)return;const next=l.status==='sent'?'ready':l.status==='ready'?'served':'ready';api.commit({type:'pos:bump',id,line:ds.line,status:next},null);return;}
  if(action==='seat-add'){const c=P().check(st,id);if(!c)return;if(api.commit({type:'pos:update',id,guests:c.guests+1},null))ui.seat=c.guests+1;return;}
  if(action==='pay'){payDialog(id);return;}
  if(action==='present'){api.commit({type:'pos:present',id},'Check dropped at the table.');return;}
  if(action==='close-check'){if(api.commit({type:'pos:close',id},'Check closed.'))ui.checkId='';return;}
  if(action==='void-line'){reasonDialog('void-line',id,[ds.line]);return;}
  if(action==='comp'){reasonDialog('comp',id,[ds.line],ds.undo==='true');return;}
  if(action==='line-discount'){reasonDialog('line-discount',id,[ds.line],ds.undo==='true');return;}
  if(action==='discount'){reasonDialog('discount',id);return;}
  if(action==='remove-discount'){api.commit({type:'pos:remove-discount',id,discount:ds.discount},'Discount removed.');return;}
  if(action==='remove-payment'){api.commit({type:'pos:remove-payment',id,payment:ds.payment},'Payment removed.');return;}
  if(action==='void'){reasonDialog('void',id);return;}
  if(action==='reopen'){if(api.commit({type:'pos:reopen',id,unvoid:true},'Check reopened.'))ui.checkId=id;return;}
  if(action==='refund'){refundDialog(id);return;}
  if(action==='tip'){tipDialog(id,ds.payment);return;}
  if(action==='guests'){detailsDialog(id);return;}
  if(action==='transfer'){transferDialog(id);return;}
  if(action==='split'){splitDialog(id);return;}
  if(action==='merge'){mergeDialog(id);return;}
  if(action==='repeat'){api.commit({type:'pos:repeat',id},'Last round added. Send when ready.');return;}
  if(action==='receipt'){receiptDialog(id);return;}
  if(action==='copy'){const t=document.getElementById('ps-receipt')?.textContent||document.getElementById('ps-z')?.textContent||'';navigator.clipboard?.writeText(t).then(()=>api.notify('Copied.'),()=>api.notify('Copy is not available here.'));return;}
  if(action==='print'){api.notify('Sent to the printer (simulated in the demo).');return;}
  if(action==='email-receipt'){const f=formEl(),em=f?.elements.namedItem('email')?.value||'';if(!em||!em.includes('@')){api.notify('Enter the guest’s email first.');return;}api.notify('Receipt emailed to '+em+' (simulated).');return;}
  if(action==='switch'){pinDialog();return;}
  if(action==='clock-in'){api.commit({type:'clock:in',id:'clk-'+crypto.randomUUID().replace(/-/g,'').slice(0,12)},'Clocked in.');return;}
  if(action==='clock-out'){api.commit({type:'clock:out'},'Clocked out.');return;}
  if(action==='reason'){const box=formEl()?.querySelector('[name="reason"]');if(box){box.value=ds.text||'';box.focus();}return;}
  if(action==='preset'){setField('kind',ds.kind);setField('value',ds.value);const box=formEl()?.querySelector('[name="reason"]');if(box)box.value=ds.text||'';return;}
  if(action==='set-field'){setField(id,ds.value);return;}
  if(action==='split-amt'){const n=Number(id)||1,due=Number(ds.due)||0;setField('amount',(Math.ceil(due/n*100)/100).toFixed(2));return;}
  if(action==='tip-pct'){setField('tip',(Number(ds.net||0)*Number(id)/100).toFixed(2));return;}
  if(action==='tendered'){const f=formEl(),amt=Number(f?.elements.namedItem('amount')?.value||0);setField('tendered',id==='exact'?amt.toFixed(2):Math.max(Number(id),amt).toFixed(2));return;}
  if(action==='pad'){
   const f=formEl(),el=f?.elements.namedItem(ds.target);if(!el)return;
   let v=String(el.value||'');if(ds.pin==='true'&&ds.target==='pin'){if(id==='⌫')v=v.slice(0,-1);else if(v.length<4)v+=id;el.value=v;const dots=document.getElementById('ps-pin-dots');if(dots)[...dots.children].forEach((d,i)=>d.classList.toggle('on',i<v.length));if(v.length===4)verifyPin();return;}
   if(ds.target==='amount'&&!el.dataset.typed){v='';el.dataset.typed='1';}
   if(id==='⌫')v=v.slice(0,-1);else if(id==='.'){if(!v.includes('.'))v=(v||'0')+'.';}else if(!/\.\d{2}$/.test(v))v+=id;
   el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));return;
  }
  if(views&&views.handle(action,id,ds,target))return;
 }
 function verifyPin(){
  const f=formEl();if(!f)return;const who=f.elements.namedItem('person')?.value,pin=f.elements.namedItem('pin')?.value;
  if(!who)return;
  if(pin!==P().pinOf(s(),who)){api.notify('Wrong PIN.');f.elements.namedItem('pin').value='';const dots=document.getElementById('ps-pin-dots');if(dots)[...dots.children].forEach(d=>d.classList.remove('on'));return;}
  api.close();if(api.switchUser){api.switchUser(who);api.notify(name(who)+' is on the till.');}else api.notify('Switching users is not available here.');
 }
 function onChange(t){if(t.form?.id==='editor-form'&&t.name&&t.type==='radio')syncWhen();if(views)views.onChange?.(t);}
 function onInput(t){
  if(t.dataset?.psSearch!==undefined){ui.query=t.value;const pane_=document.querySelector('.ps-menu-body'),c=ui.checkId?P().check(s(),ui.checkId):null;if(pane_&&c){const tmp=document.createElement('div');tmp.innerHTML=menuPane_(c);pane_.innerHTML=tmp.querySelector('.ps-menu-body').innerHTML;}return;}
  if(t.dataset?.psOsearch!==undefined){ui.osearch=t.value;const box=document.querySelector('[data-ps-orders]');if(box){const tmp=document.createElement('div');tmp.innerHTML=checksView();box.innerHTML=tmp.querySelector('[data-ps-orders]').innerHTML;}return;}
  if(t.form?.id!=='editor-form')return;
  if(t.name==='type_'||t.name==='method'||t.name==='mode')syncWhen();
  const f=t.form,ft=ui.form?.type;
  if(ft==='pay'&&['tendered','amount','ref_gift','method'].includes(t.name)){const amt=Number(f.elements.namedItem('amount').value||0),ten=Number(f.elements.namedItem('tendered')?.value||0),box=document.getElementById('ps-change');if(box&&ten)box.textContent=ten>=amt?'Change due: '+money(ten-amt):'Short by '+money(amt-ten)+'.';
   const g=P().giftCard(s(),f.elements.namedItem('ref_gift')?.value||''),gn=document.getElementById('ps-gift-note');if(gn)gn.textContent=g?(g.status==='pending'?'This card activates once its own check is paid.':'Balance '+money(g.balance)+(g.note?' · '+g.note:'')):'Balance shows once a code is entered.';}
  if(views)views.onInput?.(t);
 }
 return {render,handle,submit,saved,onChange,onInput,show:t=>{ui.tab=t;ui.checkId='';},tab:()=>ui.tab,open:id=>{ui.checkId=id;},todayCard:()=>views.todayCard(),report:d=>views.report(d),csvRows:d=>views.csvRows(d)};
};
