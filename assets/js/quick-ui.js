/* Quick palette: one box that jumps to any screen, finds stock items, checklist tasks, people, reservations and vendors, and runs the everyday "create" actions. Rows are ordinary data-action buttons, so they reuse the app's own handlers. */
globalThis.createQuickUI=function(api){
 const B=Brigly,{e}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId),$=id=>document.getElementById(id);
 const paths={search:'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M20 20l-4-4','86':'M5 5l14 14 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',stock:'M21 8 12 3 3 8v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8',note:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',tips:'M12 3v18 M17 7c-1-3-10-3-10 1s10 3 10 7-9 4-10 1',late:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',sick:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',swap:'M4 7h15l-4-4 M20 17H5l4 4',off:'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',count:'M9 4h6v3H9z M6 6h12v15H6z M9 11h6 M9 15h4',chat:'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',brief:'M4 4h16v13H9l-5 4z M8 8h8 M8 12h5',cart:'M3 4h2l3 12h10l3-9H6 M9 20h.1 M18 20h.1',person:'M10 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M3 21v-1a7 7 0 0 1 14 0v1 M19 8v6 M16 11h6',task:'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',shift:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M12 13v5 M9.5 15.5h5',res:'M4 9h16v11H4z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8',special:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',vendor:'M2 7h12v10H2z M14 10h4l4 4v3h-8 M6 20a2 2 0 1 0 0-.1 M18 20a2 2 0 1 0 0-.1',item:'M4 7h16v13H4z M9 3h6v4H9z M9 12h6',go:'M5 12h14 M13 6l6 6-6 6',home:'m3 10 9-7 9 7 M5 9v12h14V9 M9 21v-8h6v8',lists:'M9 5h11 M9 12h11 M9 19h11 M3 5l1 1 2-3 M3 12l1 1 2-3 M3 19l1 1 2-3',schedules:'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16',reports:'M4 3v18h17 M8 16v-5 M13 16V6 M18 16v-8',team:'M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a7 7 0 0 1 14 0v3 M17 4a4 4 0 0 1 0 8 M19 15a6 6 0 0 1 3 6',earnings:'M12 2v20 M18 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H5',onboarding:'M4 5h16v14H4z M4 13h5l2 3h2l2-3h5',specials:'m12 3 2.7 5.6 6.3.9-4.5 4.4 1 6.1-5.5-2.9L6.5 20l1-6.1L3 9.5l6.3-.9z',reservations:'M4 9h16v11H4z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8',training:'M12 4 2 9l10 5 10-5-10-5z M6 11.5v4.5c0 1.5 3 3 6 3s6-1.5 6-3v-4.5 M22 9v6',me:'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2'};
 const icon=key=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.go}"/></svg>`;
 let mode='search',query='',active=0,rows=[];
 const attrs=o=>Object.entries(o).map(([k,v])=>k==='action'?`data-action="${e(v)}"`:`data-${k}="${e(v)}"`).join(' ');
 const ctx=()=>({date:s().date,service:s().service});
 const myShift=()=>{const st=s();return st.shifts.find(x=>x.person===me()&&x.date===st.date&&x.service===st.service);};

 // Everyday actions, role aware. Each one is an existing app action.
 function creates(){
  const st=s(),x=myShift(),m=x&&B.schedule?.metrics(st,x),list=[];
  const add=(label,sub,key,tone,a,keys='')=>list.push({label,sub,icon:key,tone,attrs:attrs(a),keys:(label+' '+sub+' '+keys).toLowerCase()});
  if(manager()){
   const brief=st.briefings.find(b=>b.date===st.date&&b.service===st.service);
   brief?add('Edit the shift briefing',st.service+' · asks everyone to confirm again','brief','amber',{action:'edit',collection:'briefings',id:brief.id},'post briefing onboarding')
    :add('Post the shift briefing','The team confirms they read it','brief','amber',{action:'ops-context-create',id:'briefings',...ctx()},'onboarding pre-shift');
   add('Add a priority note','Pinned on Today for '+st.service,'note','orange',{action:'ops-note',id:'',...ctx()},'shift note handover');
   add('86 an item','Live for the whole team right away','86','danger',{action:'stock-report-86',id:''},'eighty six sold out unavailable');
   add('Order stock','Order sheet, grouped by vendor','cart','amber',{action:'stock-go',id:'orders',stage:'order'},'purchase order supplies vendor');
   add('Assign a stock count','Shows on Today for whoever counts','count','sage',{action:'stock-assign',id:''},'inventory count');
   add('Add checklist tasks','To this shift or a service template','task','sage',{action:'checklist-add',id:''},'checklist task opening closing');
   add('Add a shift','Roster for '+st.date,'shift','slate',{action:'plan-add',id:''},'roster schedule');
   add('Add a reservation','Guest, party size and table','res','slate',{action:'edit',collection:'reservations',id:''},'booking guest table');
   add('Add a special','Dish or drink for '+st.service,'special','amber',{action:'edit',collection:'specials',id:''},'menu feature');
   add('Add a stock item','Teams, vendor, par and cost','item','slate',{action:'stock-item',id:''},'catalog product');
  }else{
   add('Report an 86','Something ran out or can’t be served','86','danger',{action:'stock-report-86',id:''},'eighty six sold out unavailable');
   add('Request stock','Ask your manager to order more','cart','amber',{action:'stock-go',id:'items'},'order supplies restock');
   add('Add a shift note','Visible to everyone on '+st.service,'note','sage',{action:'ops-note',id:'',...ctx()},'handover message');
   if(x){
    add('Add tips','Tonight’s tips for '+st.service,'tips','sage',{action:'schedule-shift-tips',id:x.id},'money earnings');
    if(!m?.absence&&!m?.late)add('I’m running late','Tell your manager how late','late','amber',{action:'schedule-report-late',id:x.id},'delay');
    if(!m?.absence)add('I’m sick','Report that you can’t make this shift','sick','danger',{action:'schedule-report-sick',id:x.id},'ill absence cover');
    if(!m?.absence&&!m?.late)add('Swap this shift','Ask a teammate to swap','swap','slate',{action:'schedule-swap',id:x.id},'exchange trade');
   }
   add('Request time off','Days you can’t work','off','slate',{action:'schedule-timeoff',id:x?.id||''},'vacation leave holiday');
   const team=B.stock?.teams(st,me())[0];if(team)add('Count stock · '+team,'Shelf-to-sheet inventory count','count','sage',{action:'stock-count-go',id:team},'inventory');
  }
  add('Message the team','Team chat','chat','orange',{action:'chat-open',id:''},'chat talk dm');
  return list;
 }
 // Every screen, plus the Stock sections people look for by name.
 function screens(){
  const N=globalThis.BriglyNavigation,list=[];if(!N)return list;
  for(const g of N.groups(manager()))for(const [action,id,label,glyph,tone] of g.items)list.push({label,sub:'Go to',icon:glyph,tone,attrs:attrs({action,id}),keys:(label+' '+id).toLowerCase()});
  const extra=[['Stock count','inventory','count','sage','inventory'],['86 board','eighty-six','86','danger','eighty six sold out'],[manager()?'Stock orders':'My stock requests','orders','cart','amber','purchase supplies']];
  for(const [label,id,key,tone,keys] of extra)list.push({label,sub:'Stock',icon:key,tone,attrs:attrs({action:'navigate',id}),keys:(label+' '+keys).toLowerCase()});
  if(manager())list.push({label:'Vendors',sub:'Stock',icon:'vendor',tone:'slate',attrs:attrs({action:'stock-go',id:'vendors'}),keys:'vendors suppliers'});
  return list;
 }
 const hit=(text,q)=>{const t=String(text||'').toLowerCase();if(!q)return 1;const i=t.indexOf(q);return i<0?0:i===0||/\s/.test(t[i-1])?3:1;};
 const top=(list,score,n)=>list.map(x=>[x,score(x)]).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,n).map(([x])=>x);
 function records(q){
  const st=s(),out=[];
  if(B.stock&&st.stock){
   const mine=B.stock.teams(st,me()),items=st.stock.items.filter(x=>x.active&&(manager()||x.teams.some(t=>mine.includes(t))));
   const vendor=id=>st.stock.vendors.find(v=>v.id===id)?.name||'Made in house';
   const alert=x=>st.unavailable.find(u=>u.item===x.id&&u.date===st.date&&u.service===st.service&&['Approved','Reported'].includes(u.status));
   const found=top(items,x=>Math.max(hit(x.name,q)*2,hit(x.category,q),hit(vendor(x.vendor),q),hit(x.sku,q)),6);
   if(found.length)out.push(['Stock items',found.map(x=>{const a=alert(x),low=x.onHand!==null&&x.onHand<x.par;return {label:x.name,sub:[x.category,x.teams.join(' · '),a?(a.status==='Approved'?'86’d now':'86 reported'):low?'Below par':''].filter(Boolean).join(' · '),icon:'item',tone:a?'danger':low?'amber':'slate',attrs:attrs({action:'stock-open',id:x.id}),hint:'Open'};})]);
   if(manager()){const v=top(st.stock.vendors.filter(v=>v.active),v=>hit(v.name,q)*2+hit(v.contact,q),3);if(v.length)out.push(['Vendors',v.map(v=>({label:v.name,sub:[v.contact,v.phone].filter(Boolean).join(' · '),icon:'vendor',tone:'slate',attrs:attrs({action:'stock-vendor',id:v.id}),hint:'Edit'}))]);}
  }
  if(B.work){
   const checks=st.checks[st.date+'|'+st.service]||{},tasks=top(B.work.tasks(st,st.date,st.service),t=>hit(t.title,q)*2+hit(t.area,q)+hit(t.list,q),6);
   if(tasks.length)out.push(['Checklist tasks · '+st.service,tasks.map(t=>({label:t.title,sub:t.area+' · '+t.list+(checks[t.id]?' · Done':''),icon:'task',tone:checks[t.id]?'sage':'slate',attrs:attrs({action:'checklist-task',id:t.id,area:t.area,list:t.list}),hint:checks[t.id]?'Done':'Open'}))]);
  }
  const people=top(st.team.filter(p=>p.active&&p.id!==me()),p=>hit(p.name,q)*2+hit(p.role,q)+hit(p.area,q),5);
  if(people.length)out.push(['People',people.map(p=>({label:p.name,sub:p.role+' · '+p.area,icon:'person',tone:'slate',attrs:attrs({action:'chat-dm',id:p.id}),hint:'Message'}))]);
  const res=top(st.reservations.filter(r=>r.date===st.date&&!['Cancelled','No-show'].includes(r.status)),r=>hit(r.name,q)*2+hit(r.note,q)+hit(r.table,q),4);
  if(res.length)out.push(['Reservations · '+(api.dateLabel?api.dateLabel(st.date,{weekday:'short',month:'short',day:'numeric'}):st.date),res.map(r=>({label:r.name+' · '+r.time,sub:r.guests+' guests'+(r.table?' · Table '+r.table:'')+' · '+r.service+(r.note?' · '+r.note:''),icon:'res',tone:'slate',attrs:attrs({action:'edit',collection:'reservations',id:r.id}),hint:r.status}))]);
  const specials=top(st.specials.filter(x=>x.date===st.date&&x.service===st.service),x=>hit(x.name,q)*2+hit(x.allergens,q),3);
  if(specials.length)out.push(['Specials',specials.map(x=>({label:x.name,sub:'$'+Number(x.price).toFixed(2)+' · '+(x.active?'On the menu':'Paused'),icon:'special',tone:'amber',attrs:manager()?attrs({action:'edit',collection:'specials',id:x.id}):attrs({action:'navigate',id:'specials'}),hint:manager()?'Edit':'View'}))]);
  return out;
 }
 function sections(){
  const q=query.trim().toLowerCase(),c=creates(),g=screens();
  if(!q)return mode==='create'?[['Create',c],['Go to',g]]:[['Go to',g],['Create',c]];
  const out=[];const ca=top(c,x=>hit(x.keys,q),5),ga=top(g,x=>hit(x.keys,q),4);
  if(ca.length)out.push(['Actions',ca]);out.push(...records(q));if(ga.length)out.push(['Go to',ga]);
  return out;
 }
 function paint(){
  const list=$('quick-list');if(!list)return;
  const secs=sections();rows=[];let i=0;
  list.innerHTML=secs.length?secs.map(([title,items])=>`<p class="qk-head">${e(title)}</p>`+items.map(x=>{const n=i++;rows.push(x);return `<button type="button" class="qk-row" role="option" id="qk-${n}" aria-selected="${n===active}" ${x.attrs}><span class="qk-icon" data-tone="${e(x.tone||'slate')}">${icon(x.icon)}</span><span class="qk-text"><strong>${e(x.label)}</strong>${x.sub?`<small>${e(x.sub)}</small>`:''}</span>${x.hint?`<em>${e(x.hint)}</em>`:''}</button>`;}).join('')).join(''):`<div class="qk-empty"><strong>Nothing matches “${e(query)}”</strong><p>Try an item, a task, a teammate or a guest name.</p></div>`;
  if(active>=rows.length)active=Math.max(0,rows.length-1);
  $('quick-input')?.setAttribute('aria-activedescendant',rows.length?'qk-'+active:'');
 }
 function move(step){
  if(!rows.length)return;active=(active+step+rows.length)%rows.length;
  for(const b of $('quick-list').querySelectorAll('.qk-row'))b.setAttribute('aria-selected',String(b.id==='qk-'+active));
  $('qk-'+active)?.scrollIntoView({block:'nearest'});$('quick-input').setAttribute('aria-activedescendant','qk-'+active);
 }
 function open(next='search'){
  mode=next==='create'?'create':'search';query='';active=0;
  const box=$('quick-input'),dialog=$('quick-dialog');if(!box||!dialog)return;
  box.value='';dialog.dataset.mode=mode;paint();if(!dialog.open)dialog.showModal();
  // Typing first on a keyboard; on phones the create list stays visible instead of the keyboard covering it.
  if(mode==='search'||globalThis.matchMedia?.('(hover:hover) and (pointer:fine)').matches)box.focus();else{box.blur();$('quick-list').scrollTop=0;}
 }
 const box=$('quick-input');
 box?.addEventListener('input',()=>{query=box.value;active=0;paint();$('quick-list').scrollTop=0;});
 box?.addEventListener('keydown',ev=>{
  if(ev.key==='ArrowDown'){ev.preventDefault();move(1);}
  else if(ev.key==='ArrowUp'){ev.preventDefault();move(-1);}
  else if(ev.key==='Enter'){ev.preventDefault();$('qk-'+active)?.click();}
 });
 $('quick-list')?.addEventListener('mousemove',ev=>{const b=ev.target.closest('.qk-row');if(!b)return;const n=Number(b.id.slice(3));if(n!==active){active=n;for(const r of $('quick-list').querySelectorAll('.qk-row'))r.setAttribute('aria-selected',String(r===b));}});
 $('quick-dialog')?.addEventListener('click',ev=>{if(ev.target===$('quick-dialog'))$('quick-dialog').close();});
 return {open,paint,close:()=>$('quick-dialog')?.close()};
};
