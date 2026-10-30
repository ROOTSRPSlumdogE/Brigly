/* One-page shift briefing: read the service plan, handover and guest notes together. */
globalThis.createOnboardingUI=function(api){
 'use strict';
 const B=Brigly,{e,dateLabel}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId);
 const $=id=>globalThis.document?.getElementById(id);
 const name=id=>B.person(id)?.name||'Team member';
 const plural=(n,w,ws=w+'s')=>n+' '+(n===1?w:ws);
 const money=n=>'$'+Number(n||0).toFixed(2);
 let briefId='';

 // The service before this one: the last service of the day before when this is the first one today.
 function previous(st){
  const active=st.setup.services.filter(x=>x.active),i=active.findIndex(x=>x.name===st.service);
  if(i>0)return {date:st.date,service:active[i-1].name};
  if(active.length)return {date:B.addDays(st.date,-1),service:active[active.length-1].name};
  return null;
 }
 function facts(){
  const st=s(),date=st.date,service=st.service,prev=previous(st);
  const brief=st.briefings.find(x=>x.id===briefId)||st.briefings.find(x=>x.date===date&&x.service===service)||null;
  const team=st.shifts.filter(x=>x.date===date&&x.service===service),shift=team.find(x=>x.person===me());
  const prevTasks=prev&&B.work?B.work.tasks(st,prev.date,prev.service):[],prevChecks=prev?st.checks[prev.date+'|'+prev.service]||{}:{};
  const carried=prevTasks.filter(t=>t.rollover&&!prevChecks[t.id]);
  const prevNotes=prev?(st.shiftNotes||[]).filter(n=>n.date===prev.date&&n.service===prev.service&&!n.archived):[];
  const prevOut=prev?st.unavailable.filter(a=>a.date===prev.date&&a.service===prev.service&&a.status==='Approved'):[];
  const notes=(st.shiftNotes||[]).filter(n=>n.date===date&&n.service===service&&!n.archived);
  const out=st.unavailable.filter(a=>a.date===date&&a.service===service&&a.status==='Approved');
  const specials=st.specials.filter(x=>x.date===date&&x.service===service&&x.active);
  const bookings=(st.reservations||[]).filter(r=>r.date===date&&r.service===service&&!['Cancelled','No-show'].includes(r.status)).sort((a,b)=>a.time.localeCompare(b.time));
  const todos=B.chat?B.chat.todos(st).filter(t=>manager()||t.todo.for===me()||!t.todo.for):[];
  const read=brief?brief.acks.includes(me())||brief.author===me():false;
  const affected=a=>a.item&&B.menu&&st.menu?B.menu.usedIn(st,a.item).map(i=>i.name).filter(n=>n.toLowerCase()!==a.name.toLowerCase()):[];
  return {st,date,service,prev,brief,team,shift,carried,prevNotes,prevOut,notes,out,specials,bookings,todos,read,affected};
 }

 const section=(title,body,kind='')=>`<section class="ob-section ${kind?'ob-'+kind:''}"><h3>${title}</h3>${body}</section>`;
 const empty=text=>`<p class="ob-empty">${text}</p>`;
 const noteRow=n=>`<div class="ob-note${n.priority==='manager'?' is-priority':''}"><small>${e(name(n.author))}${n.priority==='manager'?' · manager':''}</small><p>${e(n.body)}</p></div>`;

 function handover(f){
  if(!f.prev)return empty('No earlier service to hand over from.');
  const from=`${e(f.prev.service)}${f.prev.date!==f.date?' · '+e(dateLabel(f.prev.date,{weekday:'short',month:'short',day:'numeric'})):''}`;
  const tasks=f.carried.length?`<ul class="ob-list">${f.carried.map(t=>`<li><span>${e(t.title)}</span><small>${e(t.area)} · ${e(t.list)}</small></li>`).join('')}</ul>`:empty('Nothing was left open.');
  const notes=f.prevNotes.length?f.prevNotes.map(noteRow).join(''):empty('No notes were left.');
  const out=f.prevOut.length?`<ul class="ob-list">${f.prevOut.map(a=>`<li><span>${e(a.name)}</span><small>${e(a.reason)}${a.sub?' · offered '+e(a.sub.name):''}</small></li>`).join('')}</ul>`:'';
  return `<p class="ob-lead">From ${from}</p>`+section('Still open',tasks)+section('Notes',notes)+(out?section('Was 86’d',out):'');
 }
 function plan(f){
  const canEdit=f.brief&&(manager()||f.brief.author===me());
  const brief=f.brief?`<div class="ob-brief"><h4>${e(f.brief.title)}</h4><p>${e(f.brief.body)}</p><small>${e(name(f.brief.author))} · revision ${f.brief.revision}${canEdit?` · <button type="button" class="ob-link" data-action="edit" data-collection="briefings" data-id="${e(f.brief.id)}">Edit</button>`:''}</small></div>`
   :`<p class="ob-empty">No briefing posted for ${e(f.service)}.</p>${manager()?`<button type="button" class="button secondary" data-action="ops-context-create" data-id="briefings" data-date="${e(f.date)}" data-service="${e(f.service)}">Post briefing</button>`:''}`;
  const notes=f.notes.length?f.notes.map(noteRow).join(''):'';
  const out=f.out.length?`<ul class="ob-list">${f.out.map(a=>{const hit=f.affected(a);return `<li><span><b class="ob-status">86’d</b>${e(a.name)}</span><small>${e(a.reason)}${hit.length?' · affects '+e(hit.join(', ')):''}${a.sub?' · offer '+e(a.sub.name)+' instead':''}</small></li>`;}).join('')}</ul>`:empty('Full menu. Nothing is 86’d.');
  const specials=f.specials.length?`<ul class="ob-list">${f.specials.map(x=>`<li><span>${e(x.name)}<em>${x.price>0?money(x.price):''}</em></span><small>${e([x.time,x.description].filter(Boolean).join(' · '))}</small></li>`).join('')}</ul>`:empty('No specials or events.');
  const guests=f.bookings.reduce((n,r)=>n+(r.guests||0),0);
  const bookings=f.bookings.length?`<p class="ob-lead">${plural(f.bookings.length,'booking')} · ${plural(guests,'guest')}</p><ul class="ob-list">${f.bookings.map(r=>`<li><span><b class="ob-time">${e(r.time)}</b><span class="ob-guest"><strong>${e(r.name)}</strong><small>${plural(r.guests,'guest')}${r.table?' · Table '+e(r.table):''}</small></span></span>${r.note?`<small>${e(r.note)}</small>`:''}</li>`).join('')}</ul>`:empty('No bookings yet.');
  const todos=f.todos.length?section('To-dos',`<ul class="ob-list">${f.todos.map(t=>`<li><span>${e(t.body)}</span><small>From ${e(name(t.author))}${t.todo.due?' · due '+e(dateLabel(t.todo.due,{month:'short',day:'numeric'})):''}</small></li>`).join('')}</ul>`):'';
  return section('The service plan',brief+notes,'plan')+section('Unavailable today',out,'unavailable')+section('Specials & happenings',specials,'specials')+section('Expected guests',bookings,'bookings')+todos;
 }
 function footer(f){
  const b=f.brief;
  if(manager())return b&&!b.approved?`<button type="button" class="button" data-action="ops-approve-briefing" data-id="${e(b.id)}" data-approved="true">Approve briefing</button>`:`<button type="button" class="button" data-action="onboarding-close">Done</button>`;
  if(b&&f.shift&&!f.read)return `<button type="button" class="button" data-action="ack" data-id="${e(b.id)}">I’ve read the briefing</button>`;
  return `<button type="button" class="button" data-action="onboarding-close">Done</button>`;
 }
 function render(){
  const f=facts(),b=f.brief,guests=f.bookings.reduce((n,r)=>n+(r.guests||0),0);
  const status=b?(b.approved?'Approved briefing':'Awaiting approval'):'No briefing posted';
  const confirmation=manager()?(b?.approved?'Your team can read the approved briefing.':'Review the service plan before approving it.'):(f.read?'You’re up to date with this briefing.':b&&f.shift?'Confirm once you’ve read the service plan.':'Review the details for this service.');
  const carry=f.carried.length+f.prevNotes.length+f.prevOut.length;
  const handoff=`<details class="ob-handover" ${f.carried.length?'open':''}><summary><span>From the previous shift</span><small>${f.carried.length?plural(f.carried.length,'open task'):carry?'Notes & handover':'Nothing outstanding'}</small></summary><div class="ob-handover-content">${handover(f)}</div></details>`;
  return `<div class="ob-scroll"><header class="ob-page-intro"><div><p class="ob-eyebrow">Your shift, at a glance</p><h2>${e(f.service)} briefing</h2><p class="ob-sub">${e(dateLabel(f.date,{weekday:'long',month:'long',day:'numeric'}))}${f.shift?' · '+e(f.shift.area)+' · '+e(f.shift.start)+'–'+e(f.shift.end):''}</p></div><span class="ob-approval ${b?.approved?'is-approved':''}">${status}</span></header><div class="ob-overview"><div><strong>${f.team.length}</strong><span>on the team</span></div><div><strong>${guests}</strong><span>guests expected</span></div><div><strong>${f.bookings.length}</strong><span>bookings</span></div><div class="${f.out.length?'has-alert':''}"><strong>${f.out.length}</strong><span>items unavailable</span></div></div><div class="ob-page-grid">${plan(f)}</div>${handoff}</div><footer class="ob-foot"><div class="ob-confirm-copy"><strong>${f.read&&!manager()?'Briefing read':status}</strong><p>${confirmation}</p></div><div class="ob-confirm-actions">${manager()&&b?.approved?`<button type="button" class="button quiet" data-action="ops-approve-briefing" data-id="${e(b.id)}" data-approved="false">Withdraw approval</button>`:''}${footer(f)}</div></footer>`;
 }
 function paint(){const box=$('onboarding-dialog-body');if(box){const scroll=box.querySelector('.ob-scroll')?.scrollTop||0;const expanded=box.querySelector('.ob-handover')?.open;box.innerHTML=render();box.querySelector('.ob-scroll').scrollTop=scroll;if(expanded)box.querySelector('.ob-handover').open=true;}}
 function open(id){
  briefId=id||'';
  paint();$('onboarding-dialog-body')?.querySelector('.ob-scroll')?.scrollTo(0,0);const d=$('onboarding-dialog');if(d&&!d.open)d.showModal();
 }
 // Re-render in place while the dialog is open (after an ack, an approval or an edit).
 function refresh(){const d=$('onboarding-dialog');if(d?.open)paint();}
 function handle(){return false;}
 return {open,refresh,handle,render};
};
