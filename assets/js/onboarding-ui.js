/* Shift onboarding: three short steps before service. 1 Handover (what the last shift left open), 2 Tonight (briefing, 86s,
   specials, bookings, to-dos), 3 Confirm (crew confirm they read it; managers approve). Rendered into #onboarding-dialog. */
globalThis.createOnboardingUI=function(api){
 'use strict';
 const B=Brigly,{e,dateLabel}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId);
 const $=id=>globalThis.document?.getElementById(id);
 const name=id=>B.person(id)?.name||'Team member';
 const plural=(n,w,ws=w+'s')=>n+' '+(n===1?w:ws);
 const money=n=>'$'+Number(n||0).toFixed(2);
 const clock=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});};
 const STEPS=[['handover','Handover'],['plan','Tonight'],['confirm','Confirm']];
 let step='handover',briefId='';

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

 const section=(title,body)=>`<section class="ob-section"><h3>${title}</h3>${body}</section>`;
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
  const bookings=f.bookings.length?`<p class="ob-lead">${plural(f.bookings.length,'booking')} · ${plural(guests,'guest')}</p><ul class="ob-list">${f.bookings.map(r=>`<li><span><b class="ob-time">${e(r.time)}</b>${e(r.name)} · ${plural(r.guests,'guest')}${r.table?' · table '+e(r.table):''}</span>${r.note?`<small>${e(r.note)}</small>`:''}</li>`).join('')}</ul>`:empty('No bookings yet.');
  const todos=f.todos.length?section('To-dos',`<ul class="ob-list">${f.todos.map(t=>`<li><span>${e(t.body)}</span><small>From ${e(name(t.author))}${t.todo.due?' · due '+e(dateLabel(t.todo.due,{month:'short',day:'numeric'})):''}</small></li>`).join('')}</ul>`):'';
  return section('Briefing',brief+notes)+section('86 list',out)+section('Specials',specials)+section('Bookings',bookings)+todos;
 }
 function confirm(f){
  const b=f.brief,status=b?.approved?`Approved by ${e(name(b.approvedBy||b.author))}${b.approvedAt?' at '+e(clock(b.approvedAt)):''}`:'Not approved';
  const summary=`<ul class="ob-list ob-summary"><li><span>${plural(f.carried.length,'task')} carried over</span></li><li><span>${f.out.length?plural(f.out.length,'item')+' 86’d':'Full menu'}</span></li><li><span>${plural(f.specials.length,'special')}</span></li><li><span>${plural(f.bookings.length,'booking')}</span></li></ul>`;
  const reads=b?`<p class="ob-lead">${b.acks.length?plural(b.acks.length,'person','people')+' confirmed reading the briefing':'Nobody has confirmed the briefing yet'} · <span class="${b.approved?'ob-status is-ok':'ob-muted'}">${status}</span></p>`:'';
  return section('Tonight at a glance',summary)+reads;
 }
 function footer(f){
  const b=f.brief,i=STEPS.findIndex(x=>x[0]===step),back=i>0?`<button type="button" class="button secondary" data-action="ob-step" data-id="${STEPS[i-1][0]}">Back</button>`:'';
  if(step!=='confirm')return back+`<button type="button" class="button" data-action="ob-step" data-id="${STEPS[i+1][0]}">Next</button>`;
  if(manager())return back+(b?(b.approved?`<button type="button" class="button quiet" data-action="ops-approve-briefing" data-id="${e(b.id)}" data-approved="false">Withdraw approval</button><button type="button" class="button" data-action="onboarding-close">Done</button>`:`<button type="button" class="button" data-action="ops-approve-briefing" data-id="${e(b.id)}" data-approved="true">Approve</button>`):`<button type="button" class="button" data-action="onboarding-close">Done</button>`);
  if(b&&f.shift&&!f.read)return back+`<button type="button" class="button" data-action="ack" data-id="${e(b.id)}">I’ve read it</button>`;
  return back+`<button type="button" class="button" data-action="onboarding-close">Done</button>`;
 }
 function render(){
  const f=facts();
  const tabs=`<div class="ob-steps" role="group" aria-label="Steps">${STEPS.map(([k,l],i)=>`<button type="button" data-action="ob-step" data-id="${k}" aria-current="${step===k?'step':'false'}"><i>${i+1}</i>${l}</button>`).join('')}</div>`;
  const body=step==='handover'?handover(f):step==='plan'?plan(f):confirm(f);
  const sub=`${e(f.service)} · ${e(dateLabel(f.date,{weekday:'long',month:'short',day:'numeric'}))}${f.shift?' · '+e(f.shift.area)+' '+e(f.shift.start)+'–'+e(f.shift.end):''}`;
  return `<p class="ob-sub">${sub}</p>${tabs}<div class="ob-body">${body}</div><div class="ob-foot">${footer(f)}</div>`;
 }
 function paint(){const box=$('onboarding-dialog-body');if(box){box.innerHTML=render();box.scrollTop=0;}}
 function open(id){
  briefId=id||'';const f=facts();
  step=f.read||manager()?'plan':'handover';
  paint();const d=$('onboarding-dialog');if(d&&!d.open)d.showModal();
 }
 // Re-render in place while the dialog is open (after an ack, an approval or an edit).
 function refresh(){const d=$('onboarding-dialog');if(d?.open)paint();}
 function handle(action,id){
  if(action==='step'){if(STEPS.some(x=>x[0]===id))step=id;paint();return true;}
  return false;
 }
 return {open,refresh,handle,render,step:()=>step};
};
