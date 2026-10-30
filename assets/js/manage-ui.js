/* Manage: the manager's back office. HR overview, people and their HR files, permissions, reports and workspace setup in one place. */
globalThis.createManageUI=function(api){
 'use strict';
 const B=Brigly,S=B.schedule,P=B.permissions,H=B.hr,{e,button,badge,dateLabel}=api;
 const s=()=>api.state(),me=()=>B.actor(s().role,s().crewId,s().managerId);
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
 const cents=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
 const whole=money;
 const hours=n=>(n/60).toLocaleString('en-US',{maximumFractionDigits:1});
 const plural=(n,word)=>n+' '+(n===1?word:word==='person'?'people':word+'s');
 // Takes a team member or their id.
 const first=p=>{p=typeof p==='string'?B.person(p):p;return p?.hr?.preferredName||p?.name?.split(' ')[0]||'Team member';};
 const long=d=>d?dateLabel(d,{month:'short',day:'numeric',year:'numeric'}):'';
 const days=(from,to)=>Math.round((new Date(to+'T12:00:00')-new Date(from+'T12:00:00'))/864e5);
 const act=(label,key,id='',style='secondary',extra='')=>button(label,'mg-'+key,id,extra,style);
 const tone=area=>area==='Bar'?'orange':area==='Kitchen'?'slate':'sage';
 const avatar=p=>`<span class="avatar" data-tone="${tone(p.area)}">${e(p.initials)}</span>`;
 const tabs=[['todo','To do'],['daily','Daily close'],['timesheets','Timesheets'],['payruns','Pay runs'],['team','Team'],['compliance','Compliance'],['settings','Settings']];
 // Team and Settings each hold a few views behind a simple switch.
 const views={team:[['people','People'],['onboarding','Onboarding'],['timeoff','Time off'],['performance','Performance'],['training','Training']],settings:[['policies','Policies'],['permissions','Permissions']]};
 // Older section names, and where they live now.
 const moved={people:['team','people'],onboarding:['team','onboarding'],timeoff:['team','timeoff'],performance:['team','performance'],skills:['team','training'],writeups:['team','performance'],permissions:['settings','permissions'],setup:['settings','policies']};
 // Sections that moved to Reports, and which board they open.
 const toReport={overview:'executive',sales:'sales',labor:'labor',inventory:'inventory',reports:'executive'};
 // The report each section's numbers roll up into.
 const reportOf={daily:'sales',timesheets:'labor',payruns:'labor',team:'people',compliance:'people'};
 const heads={team:['Team','People, onboarding, time off, performance and training.'],settings:['Settings','Policies, permissions, services, roles and stations.'],todo:['To do','What needs you today, from every part of Brigly.'],daily:['Daily close','Add sales, specials sold, guests, comps and cash. Brigly fills in the rest of the day.'],overview:['Manager overview','Sales, labor, payroll, the team and compliance, and what needs you today.'],sales:['Sales & profit','Net sales against labor and purchases: labor %, prime cost and sales per labor hour, week by week.'],inventory:['Inventory & purchasing','What sits on the shelves, what was bought and used, what vendors owe you and what is already on order.'],onboarding:['Hiring & exits','New hires work through a checklist that ticks itself off from their HR file, the roster and their first shifts. Exits unassign shifts and remove access.'],timeoff:['Time off','Sick leave and paid time off earned from hours worked, used by approved absences, with upcoming requests.'],performance:['Reviews & kudos','Reviews that start from each person’s real record, and recognition from the team.'],skills:['Skills & training','Who is trained on what, and where the roster is missing a required skill.'],labor:['Labor & costs','What the team costs, where the money goes and where overtime is coming.'],timesheets:['Timesheets','Fix exceptions and approve hours before payroll.'],payruns:['Pay runs','Approve, export and pay each period.'],people:['People','HR files with contact, employment, pay and tax records for everyone who works here.'],compliance:['Compliance','Missing forms, renewals and labor rule issues to fix.'],writeups:['Warnings & write-ups','A warning is a documented heads-up; a write-up is the formal record. Both stay on file and appear in the team member’s own file to acknowledge.'],permissions:['Permissions','Every role gets a default set of permissions. Adjust anyone individually without changing their role.'],reports:['Reports','Dashboards for the owner, finance, operations and people, compared with the period before.'],setup:['Setup','Every policy and setting in one place: pay, time off, labor rules, skills, services, roles and stations.']};
 let tab='todo',view={team:'people',settings:'policies'},filter='active',permView='roles',hrFor=null;

 // Attendance and hours per person, from the roster and attendance records.
 function stats(st){
  const week=B.monday(st.date),from=B.addDays(st.date,-29),out=new Map(st.team.map(p=>[p.id,{week:0,weekMinutes:0,shifts:0,sick:0,late:0,lateMinutes:0}]));
  for(const x of st.shifts){
   const row=out.get(x.person);if(!row)continue;
   const inWeek=x.date>=week&&x.date<=B.addDays(week,6),recent=x.date>=from&&x.date<=st.date;if(!inWeek&&!recent)continue;
   const m=S.metrics(st,x);
   if(inWeek){row.week++;row.weekMinutes+=m.workMinutes;}
   if(recent){row.shifts++;if(m.absence?.kind==='sick')row.sick++;else if(m.late){row.late++;row.lateMinutes+=m.late.minutes;}}
  }
  return out;
 }

 // Compliance: which records each person needs and where each one stands.
 const docs=[['w4Date','W-4','file'],['i9Date','I-9','file'],['handbookDate','Handbook','file'],['foodHandlerExpires','Food handler','expiry'],['alcoholCertExpires','Alcohol server','expiry'],['servsafeExpires','ServSafe Manager','expiry']];
 const needsDoc=(p,key)=>key==='alcoholCertExpires'?p.area==='Bar'||/server|bartender/i.test(p.role):key==='servsafeExpires'?p.access==='manager'||/chef/i.test(p.role):true;
 function docStatus(p,[key,,kind]){
  if(!needsDoc(p,key))return {state:'na',label:'Not needed',tone:''};
  const v=p.hr?.[key],today=s().date;
  if(!v)return {state:'missing',label:'Missing',tone:kind==='file'&&key!=='handbookDate'?'tone-danger':'tone-amber'};
  if(kind==='file')return {state:'ok',label:'On file',tone:'tone-sage',date:v};
  const left=days(today,v);
  if(left<0)return {state:'expired',label:'Expired '+dateLabel(v),tone:'tone-danger',date:v};
  if(left<=30)return {state:'due',label:'Expires in '+plural(left,'day'),tone:'tone-amber',date:v};
  return {state:'ok',label:'Valid to '+dateLabel(v,{month:'short',year:'numeric'}),tone:'tone-sage',date:v};
 }
 const problems=p=>docs.map(d=>({doc:d,...docStatus(p,d)})).filter(x=>['missing','expired','due'].includes(x.state));
 // How complete the HR file is, from the records every employer keeps.
 const core=['phone','email','emergency','legalName','birthDate','address','employeeId','employmentType','payMethod','taxIdLast4','filingStatus','w4Date','i9Date','handbookDate'];
 const complete=p=>Math.round(core.filter(k=>p[k]||p.hr?.[k]).length/core.length*100);
 const limited=p=>p.access==='crew'&&P.custom(s(),p).length>0;

 function todo(){
  const st=s(),active=st.team.filter(p=>p.active),crew=active.filter(p=>p.access==='crew'),former=st.team.filter(p=>!p.active),by=stats(st),fin=api.finance,now=B.payroll.stamp(),t0=now.slice(0,10);
  const pending=st.scheduling.requests.filter(r=>['Reported','Pending'].includes(r.status));
  const off=st.scheduling.requests.filter(r=>r.kind==='timeoff'&&r.status==='Approved'&&r.to>=st.date&&r.from<=B.addDays(st.date,13)).sort((x,y)=>x.from.localeCompare(y.from));
  const issues=active.flatMap(p=>problems(p).map(x=>({p,...x}))),renewals=issues.filter(x=>x.doc[2]==='expiry'),forms=issues.filter(x=>['w4Date','i9Date'].includes(x.doc[0]));
  const items=[],push=(group,rank,toneKey,title,sub,acts)=>items.push({group,rank,tone:toneKey,title,sub,acts});
  for(const x of fin.attention())push(x.group||'payroll',x.rank,x.tone,x.title,x.sub,x.acts);
  for(const x of api.hr.attention())push(/paperwork|exit/i.test(x.title)?'team':/rule|trained/i.test(x.title)?'compliance':'team',x.rank,x.tone,x.title,x.sub,x.acts);
  for(const x of api.writeups.attention())push('team',x.rank,x.tone,x.title,x.sub,x.acts);
  for(const x of (api.training?.attention?.()||[]))push(x.group,x.rank,x.tone,x.title,x.sub,x.acts);
  if(pending.length)push('team',0,'orange',plural(pending.length,'schedule request')+' waiting',[...new Set(pending.map(r=>B.person(r.person)?.name||'Team member'))].slice(0,3).join(', ')+' · time off, swaps and attendance',button('Open Scheduling','app-screen','shifts','','small'));
  // Service: approvals waiting in Stock, and credits vendors owe.
  const reported=st.unavailable.filter(u=>u.status==='Reported'&&u.date>=B.addDays(t0,-1));
  if(reported.length)push('service',0,'danger',plural(reported.length,'86 report')+' to approve',reported.map(u=>u.name+' · '+u.area).join(' · '),button('86 board','navigate','eighty-six','','small'));
  const requested=st.orders.filter(o=>o.status==='Requested');
  if(requested.length)push('service',1,'amber',plural(requested.length,'stock request')+' from the crew',[...new Set(requested.map(o=>o.name))].slice(0,4).join(', '),button('Review','stock-go','orders','data-stage="review"','secondary small'));
  const claims=st.orders.filter(o=>o.status==='Received'&&(o.receivedAt||'').slice(0,10)>=B.addDays(t0,-30)&&(o.receivedQty??o.quantity)<o.quantity&&!st.business.credits?.[o.id]);
  if(claims.length)push('service',2,'amber',`${whole(claims.reduce((n,o)=>n+(o.quantity-(o.receivedQty??o.quantity))*(o.cost||0),0))} in credits to claim`,claims.slice(0,3).map(o=>o.name+' · '+(st.stock.vendors.find(v=>v.id===o.vendor)?.name||'vendor')).join(' · ')+' · short deliveries',button('See deliveries','mg-tab','inventory','','secondary small'));
  for(const x of renewals.filter(x=>x.state==='expired'))push('compliance',0,'danger',`${first(x.p)}’s ${x.doc[1].toLowerCase()} certification has expired`,`${x.p.role} · expired ${long(x.date)}. Renew before their next shift.`,act('HR file','profile',x.p.id,'secondary small'));
  const due=renewals.filter(x=>x.state==='due');
  if(due.length)push('compliance',1,'amber',plural(due.length,'certification')+' expire within 30 days',due.map(x=>`${first(x.p)} · ${x.doc[1]} ${dateLabel(x.date)}`).join(' · '),act('Compliance','tab','compliance','secondary small'));
  if(forms.length)push('compliance',1,'danger',plural(new Set(forms.map(x=>x.p.id)).size,'person')+' missing tax or work eligibility forms',[...new Set(forms.map(x=>first(x.p)+' · '+x.doc[1]))].join(' · '),act('Compliance','tab','compliance','secondary small'));
  const missingCert=renewals.filter(x=>x.state==='missing');
  if(missingCert.length)push('compliance',2,'amber',plural(missingCert.length,'required certification')+' not on file',missingCert.slice(0,4).map(x=>first(x.p)+' · '+x.doc[1]).join(' · ')+(missingCert.length>4?' and more':''),act('Compliance','tab','compliance','secondary small'));
  const gaps=active.filter(p=>!p.emergency);
  if(gaps.length)push('compliance',2,'amber',plural(gaps.length,'profile')+' without an emergency contact',gaps.slice(0,4).map(first).join(', ')+(gaps.length>4?' and more':''),act('People','tab','people','secondary small'));
  for(const p of active.concat(former).filter(p=>p.leftOn&&p.leftOn>=st.date))push('team',1,'amber',first(p)+'’s last day is '+dateLabel(p.leftOn,{weekday:'short',month:'short',day:'numeric'}),p.role+' · reassign later shifts and prepare the final paycheck',act('HR file','profile',p.id,'secondary small'));
  for(const p of active.filter(p=>p.hr?.probationEnds&&p.hr.probationEnds>=st.date&&days(st.date,p.hr.probationEnds)<=14))push('team',2,'slate',first(p)+'’s probation ends '+dateLabel(p.hr.probationEnds,{weekday:'short',month:'short',day:'numeric'}),'Schedule a check-in before then',act('HR file','profile',p.id,'secondary small'));
  const idle=crew.filter(p=>!by.get(p.id).week);
  if(idle.length)push('fyi',3,'slate',plural(idle.length,'crew member')+' not on this week’s roster',idle.slice(0,4).map(first).join(', ')+(idle.length>4?' and more':''),button('Open Scheduling','app-screen','shifts','','secondary small'));
  if(off.length)push('fyi',3,'slate','Time off coming up',off.slice(0,3).map(r=>first(B.person(r.person)||{name:'Team member'})+' '+dateLabel(r.from)+(r.to!==r.from?'–'+dateLabel(r.to):'')).join(' · '),'');
  const birthdays=active.filter(p=>{if(!p.hr?.birthDate)return false;const next=st.date.slice(0,4)+p.hr.birthDate.slice(4),d=days(st.date,next<st.date?B.addDays(next,365):next);return d>=0&&d<=7;});
  if(birthdays.length)push('fyi',3,'sage','Birthdays this week',birthdays.map(p=>first(p)+' · '+dateLabel(st.date.slice(0,4)+p.hr.birthDate.slice(4),{weekday:'short',month:'short',day:'numeric'})).join(' · '),'');
  const joined=active.filter(p=>p.joinedOn&&p.joinedOn>=B.addDays(st.date,-30)&&p.joinedOn<=st.date);
  if(joined.length)push('fyi',3,'sage','New on the team',joined.map(p=>first(p)+' joined '+dateLabel(p.joinedOn)).join(' · '),'');
  const groups=[['today','Today'],['payroll','Time & payroll'],['team','Team'],['compliance','Compliance'],['service','Stock & service'],['fyi','Good to know']];
  const real=items.filter(x=>x.group!=='fyi'),f=fin.focus(st),run=f.run,pay=run||B.payroll.calc(st,f.from,f.to),y=B.addDays(t0,-1),close=st.business.closes[y];
  const onClock=st.timeclock.entries.filter(x=>!x.out&&!B.payroll.flags(st,x,now).some(g=>g.kind==='noout'));
  const tiles=`<div class="mg-kpis"><div class="res-kpi"><small>TO DO</small><strong>${real.length}</strong><p>${real.filter(x=>x.rank===0).length} urgent</p></div><div class="res-kpi is-link" data-action="mg-tab" data-id="daily"><small>YESTERDAY</small><strong>${close?money(close.sales):'Open'}</strong><p>${close?close.guests+' guests · '+money(close.guests?close.sales/close.guests:0)+' average check':'Close out the day'}</p></div><div class="res-kpi is-link" data-action="mg-tab" data-id="payruns"><small>NEXT PAYROLL</small><strong>${money(pay.totals.gross)}</strong><p>${run?{Approved:'Ready to export',Exported:'Sent to payroll',Paid:'Paid'}[run.status]:f.ended?'Ready to run':'In progress'} · ${dateLabel(f.payDate,{month:'short',day:'numeric'})}</p></div><div class="res-kpi is-link" data-action="mg-tab" data-id="timesheets"><small>ON THE CLOCK</small><strong>${onClock.length}</strong><p>${onClock.slice(0,3).map(x=>first(x.person)).join(', ')||'Nobody right now'}</p></div></div>`;
  const list=groups.map(([g,label])=>{const mine=items.filter(x=>x.group===g).sort((x,y)=>x.rank-y.rank);return mine.length?`<section class="panel mg-panel mg-todo"><div class="panel-head"><div><h3>${label} <span class="mg-count">${mine.length}</span></h3></div></div><div class="mg-attn-list">${mine.map(x=>`<div class="mg-attn" data-tone="${x.tone}"><div><strong>${e(x.title)}</strong><small>${e(x.sub)}</small></div><div class="mg-attn-acts">${x.acts}</div></div>`).join('')}</div></section>`:'';}).join('');
  return tiles+(real.length?'':'<section class="panel mg-panel"><div class="empty"><strong>All caught up</strong>Nothing needs you right now.</div></section>')+list;
 }
 // Setup: every policy in one place.
 function setup(){
  const st=s(),c=B.payroll.settings(st),r=B.biz.rules(st),k=st.business.skills;
  const card=(title,lines,action,label)=>`<article class="mg-policy"><h4>${title}</h4><ul>${lines.map(x=>`<li>${e(x)}</li>`).join('')}</ul>${action}</article>`;
  return `<section class="mg-policies">${card('Pay & payroll',[(c.frequency==='weekly'?'Weekly':'Every two weeks')+', paid '+c.payDelay+' days after the period',`Overtime after ${c.weeklyOvertime} h a week${c.dailyOvertime?' or '+c.dailyOvertime+' h a day':''} at ${c.multiplier}×`,'Payroll provider: '+c.provider],button('Edit','fin-settings','','','secondary small'))}${card('Time off',[`Sick leave: ${r.sickHours} h per ${r.sickPer} h worked, up to ${r.sickCap} h`,`Paid time off: ${r.ptoHours} h per ${r.ptoPer} h, up to ${r.ptoCap} h`,'Paid time off for: '+(r.ptoTypes.join(', ')||'nobody')],button('Edit','hr-policy','','','secondary small'))}${card('Labor rules',[`Meal break of ${r.mealMinutes} min after ${r.mealAfter} h`,`At least ${r.restHours} h between shifts`,`Under 18: up to ${r.minorWeekly} h a week, done by ${r.minorLate}`,`Late after ${c.grace} minutes`],button('Edit','hr-policy','','','secondary small'))}${card('Skills & training',[plural(k.list.length,'skill')+' tracked','Required every service: '+(k.required.join(', ')||'none')],button('Edit','hr-skill-list','','','secondary small'))}${card('Warnings & write-ups',[plural(st.writeupMeta?.templates?.length||0,'template'),'Categories and next steps from the dropdowns'],button('Templates','mg-tab','writeups','','secondary small'))}${card('Access',['Manager access and role permissions','Lead permissions for stock, checklists and happenings'],button('Permissions','mg-tab','permissions','','secondary small'))}</section>`+api.setup();
 }
 const meter=pct=>`<div class="mg-meter" title="${pct}% of the HR file is filled in"><div><i style="width:${pct}%" data-tone="${pct>=90?'sage':pct>=60?'amber':'danger'}"></i></div><span>${pct}%</span></div>`;

 function people(){
  const st=s(),list=st.team.filter(p=>filter==='all'||(filter==='active'?p.active:!p.active)).sort((a,b)=>a.name.localeCompare(b.name));
  const cards=list.map(p=>{const d=st.scheduling.defaults[p.id],issue=problems(p);return `<article class="mg-person ${p.active?'':'is-former'}"><div class="mg-person-head">${avatar(p)}<div><h3>${e(p.name)}</h3><p>${e(p.role)} · ${e(p.area)}${d?' · $'+d.rate.toFixed(2)+'/hr':''}</p></div>${badge(p.access==='manager'?'Manager':'Crew',p.access==='manager'?'tone-sage':'')}</div><dl class="mg-facts"><div><dt>Employee ID</dt><dd>${e(p.hr?.employeeId||'—')}</dd></div><div><dt>Contract</dt><dd>${e(p.hr?.employmentType||'—')}</dd></div><div><dt>Phone</dt><dd>${e(p.phone||'—')}</dd></div><div><dt>${p.active?'Joined':'Left'}</dt><dd>${e(long(p.active?p.joinedOn:p.leftOn)||'Not recorded')}</dd></div><div class="wide"><dt>Email</dt><dd>${e(p.email||'—')}</dd></div></dl><div class="mg-person-file"><span>HR file</span>${meter(complete(p))}</div><div class="mg-chips">${p.active?(issue.length?issue.slice(0,3).map(x=>`<span class="badge ${x.tone}">${e(x.doc[1])} · ${e(x.label.toLowerCase())}</span>`).join('')+(issue.length>3?badge('+'+(issue.length-3)+' more'):''):badge('Documents in order','tone-sage')):''}</div><div class="card-actions">${act('Open HR file','profile',p.id,'secondary small')}${act('Edit file','hr-edit',p.id,'quiet small')}${button('Report','ops-member-report',p.id,'','quiet small')}</div></article>`;}).join('');
  const active=st.team.filter(p=>p.active).sort((a,b)=>a.name.localeCompare(b.name));
  const pay=active.filter(p=>st.scheduling.defaults[p.id]).map(p=>{const d=st.scheduling.defaults[p.id];return `<tr><td><strong>${e(p.name)}</strong><small class="table-detail">${e(p.role)} · ${e(p.hr?.overtime?.split(' ·')[0]||'Overtime status not set')}</small></td><td>$${d.rate.toFixed(2)}/hr</td><td>${e(p.hr?.payFrequency||'—')}</td><td>${e(p.hr?.payMethod||'—')}${p.hr?.accountLast4?`<small class="table-detail">${e(p.hr.bankName||'Account')} ••${e(p.hr.accountLast4)}</small>`:''}</td><td>${badge(d.sickPaid?'Paid':'Unpaid',d.sickPaid?'tone-sage':'')}</td><td>${badge(d.timeoffPaid?'Paid':'Unpaid',d.timeoffPaid?'tone-sage':'')}</td><td>${button('Edit pay','schedule-defaults',p.id)}</td></tr>`;}).join('');
  return `<div class="res-filter-bar" role="tablist" aria-label="Filter people">${[['active','Current team'],['former','Former team'],['all','Everyone']].map(([id,label])=>`<button type="button" class="notif-tab ${filter===id?'selected':''}" data-action="mg-filter" data-id="${id}" aria-pressed="${filter===id}"><span>${label}</span><em>${st.team.filter(p=>id==='all'||(id==='active'?p.active:!p.active)).length}</em></button>`).join('')}</div><div class="mg-people">${cards||'<div class="empty"><strong>Nobody here yet</strong>Add a teammate to get started.</div>'}</div><section class="panel mg-panel"><div class="panel-head"><div><h3>Pay & absence defaults</h3><p>New shifts use each person’s rate. Every absence can still be set to paid or unpaid when you review it.</p></div></div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>HOURLY RATE</th><th>PAY FREQUENCY</th><th>PAID BY</th><th>SICKNESS</th><th>TIME OFF</th><th></th></tr></thead><tbody>${pay}</tbody></table></div></section>`;
 }

 // Permissions: roles carry the defaults, people inherit them and can be adjusted one by one.
 function compliance(){
  const st=s(),active=st.team.filter(p=>p.active).sort((a,b)=>a.name.localeCompare(b.name)),all=active.flatMap(p=>problems(p).map(x=>({p,...x})));
  const issues=B.biz.laborIssues(st,B.addDays(B.payroll.stamp().slice(0,10),-14),B.payroll.stamp().slice(0,10)),kinds={meal:'Missed meal break',rest:'Short rest between shifts',minor:'Under-18 hours'};
  const laborPanel=`<section class="panel mg-panel"><div class="panel-head"><div><h3>Labor rules</h3><p>Meal breaks from the time clock over the last 14 days; rest between shifts and under-18 limits on the roster, including the next 14 days.</p></div>${button('Rules','hr-policy','','','secondary small')}</div>${issues.length?`<div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>RULE</th><th>DATE</th><th>DETAIL</th></tr></thead><tbody>${issues.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,40).map(x=>`<tr><td><strong>${e(B.person(x.person)?.name||'')}</strong></td><td>${badge(kinds[x.kind],x.upcoming?'tone-orange':'tone-amber')}${x.upcoming?' <small class="table-detail">Upcoming</small>':''}</td><td>${dateLabel(x.date,{weekday:'short',month:'short',day:'numeric'})}</td><td>${e(x.text)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><strong>No labor rule issues</strong>Breaks, rest and under-18 limits look right.</div>'}</section>`;
  return laborPanel+`<section class="panel mg-panel"><div class="panel-head"><div><h3>Compliance & certifications</h3><p>Tax and work eligibility forms, the handbook and the certifications each role needs. Expiry dates within 30 days are flagged.</p></div></div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th>${docs.map(d=>`<th>${e(d[1].toUpperCase())}</th>`).join('')}<th></th></tr></thead><tbody>${active.map(p=>`<tr><td><strong>${e(p.name)}</strong><small class="table-detail">${e(p.role)}</small></td>${docs.map(d=>{const x=docStatus(p,d);return `<td>${x.state==='na'?'<span class="table-detail">—</span>':badge(x.label,x.tone)}</td>`;}).join('')}<td>${act('Update','hr-edit',p.id,'secondary small','data-section="Documents"')}</td></tr>`).join('')}</tbody></table></div></section>`;
 }
 const toggle=(on,label,attrs)=>`<button type="button" class="mg-switch" role="switch" aria-checked="${on}" aria-label="${e(label)}" ${attrs}><span></span></button>`;
 const groups=[['everyday','Everyday','What they can do on shift'],['lead','Lead permissions','Hand part of the back office to this role']];
 // A role belongs to the station most of its people work at.
 function roleTeams(st){
  const out=new Map(st.setup.areas.map(a=>[a,[]]));out.set('No one yet',[]);
  for(const role of st.setup.roles){
   const people=st.team.filter(p=>p.active&&p.role===role),count=people.reduce((m,p)=>m.set(p.area,(m.get(p.area)||0)+1),new Map());
   const team=[...count].sort((a,b)=>b[1]-a[1])[0]?.[0]||'No one yet';(out.get(team)||out.set(team,[]).get(team)).push({role,people});
  }
  return [...out].filter(x=>x[1].length);
 }
 function permissions(){
  const st=s(),view=`<div class="res-filter-bar" role="tablist" aria-label="Permissions view">${[['roles','By role',st.setup.roles.length],['members','By member',st.team.filter(p=>p.active).length]].map(([id,label,n])=>`<button type="button" class="notif-tab ${permView===id?'selected':''}" data-action="mg-perm-view" data-id="${id}" aria-pressed="${permView===id}"><span>${label}</span><em>${n}</em></button>`).join('')}</div>`;
  const levels=`<div class="mg-levels"><article><h3>${badge('Manager access','tone-sage')}</h3><p>Everything, including the roster, pay, reports, HR files and these permissions. Give it to the people who run the restaurant.</p></article><article><h3>${badge('Role defaults')}</h3><p>Each role starts with its own set. Lead permissions let a role run part of the back office, like a head chef running stock.</p></article><article><h3>${badge('Personal adjustments','tone-amber')}</h3><p>Turn a permission on or off for one person. Everyone else in their role keeps the role default.</p></article></div>`;
  return view+levels+(permView==='roles'?rolesView(st):membersView(st));
 }
 function rolesView(st){
  return roleTeams(st).map(([team,roles])=>`<section class="mg-team"><h3 class="mg-team-head"><span class="badge tone-${team==='No one yet'?'slate':tone(team)}">${e(team)}</span>${plural(roles.length,'role')}</h3><div class="mg-roles">${roles.map(({role,people})=>{
   const crew=people.filter(p=>p.access==='crew'),mgr=people.length-crew.length,adjusted=crew.filter(p=>P.custom(st,p).length).length;
   return `<article class="mg-role"><div class="mg-role-head"><div><h4>${e(role)}</h4><p>${plural(people.length,'person')}${mgr?` · ${mgr} with manager access`:''}${adjusted?` · ${adjusted} adjusted`:''}</p></div><div class="mg-stack">${people.slice(0,4).map(avatar).join('')}</div></div>${people.length&&!crew.length?'<p class="mg-perm-note">Everyone in this role has manager access. These defaults apply to anyone added to the role without it.</p>':''}${groups.map(([g,label])=>`<div class="mg-perm-group"><h5>${label}</h5>${P.list.filter(x=>x[3]===g).map(([k,name,desc])=>`<div class="mg-perm-row"><div><strong>${e(name)}</strong>${g==='lead'?`<small>${e(desc)}</small>`:''}</div>${toggle(P.roleDefault(st,role,k),name+' for '+role,`data-action="mg-role-perm" data-id="${e(role)}" data-perm="${k}"`)}</div>`).join('')}</div>`).join('')}</article>`;}).join('')}</div></section>`).join('');
 }
 function membersView(st){
  const access=p=>`<select class="mg-access" data-manage-access="${e(p.id)}" aria-label="Access for ${e(p.name)}" ${p.id===me()?'disabled title="Another manager must change your access"':''}><option value="crew" ${p.access==='crew'?'selected':''}>Role permissions</option><option value="manager" ${p.access==='manager'?'selected':''}>Manager access</option></select>`;
  const rows=st.team.filter(p=>p.active).sort((a,b)=>a.role.localeCompare(b.role)||a.name.localeCompare(b.name)).map(p=>{
   const diff=p.access==='crew'?P.custom(st,p):[],leads=P.list.filter(x=>x[3]==='lead'&&P.can(st,x[0],p.id)).map(x=>x[1]);
   const summary=p.access==='manager'?badge('Full access','tone-sage'):diff.length?diff.map(k=>`<span class="badge ${P.can(st,k,p.id)?'tone-sage':'tone-danger'}">${P.can(st,k,p.id)?'+':'−'} ${e(P.title(k))}</span>`).join(' '):'<span class="table-detail">Same as '+e(p.role)+'</span>';
   return `<tr><td><div class="crew-name">${avatar(p)}<div>${e(p.name)}${p.id===me()?'<small>You</small>':`<small>${e(p.area)}</small>`}</div></div></td><td>${e(p.role)}</td><td>${access(p)}</td><td>${p.access==='manager'?'<span class="table-detail">Everything</span>':leads.length?leads.map(x=>badge(x,'tone-orange')).join(' '):'<span class="table-detail">None</span>'}</td><td><div class="mg-chips">${summary}</div></td><td>${p.access==='crew'?act('Adjust','member-perms',p.id):''}</td></tr>`;}).join('');
  return `<section class="panel mg-panel"><div class="panel-head"><div><h3>Everyone’s permissions</h3><p>People inherit their role’s defaults. Adjust shows exactly what differs for one person.</p></div></div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>ACCESS</th><th>LEADS</th><th>DIFFERENT FROM ROLE</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
 }
 function memberPerms(id){
  const st=s(),p=st.team.find(x=>x.id===id),diff=P.custom(st,p);
  const seg=(k,value,label,on)=>`<button type="button" class="mg-seg ${on?'selected':''}" data-action="mg-member-perm" data-id="${e(id)}" data-perm="${k}" data-value="${value}" aria-pressed="${on}">${label}</button>`;
  return `<div class="mg-profile"><div class="mg-person-head">${avatar(p)}<div><h3>${e(p.name)}</h3><p>${e(p.role)} · ${e(p.area)} · starts from the ${e(p.role)} defaults</p></div>${diff.length?badge(plural(diff.length,'adjustment'),'tone-amber'):badge('Role defaults')}</div>${groups.map(([g,label,sub])=>`<div class="mg-perm-group"><h5>${label}</h5>${P.list.filter(x=>x[3]===g).map(([k,name,desc])=>{const own=p.perms?.[k],role=P.roleDefault(st,p.role,k),inherit=typeof own!=='boolean'||own===role;return `<div class="mg-perm-row ${inherit?'':'is-custom'}"><div><strong>${e(name)}</strong><small>${e(desc)}</small></div><div class="mg-segs" role="group" aria-label="${e(name)}">${seg(k,'default','Role · '+(role?'on':'off'),inherit)}${seg(k,'on','On',!inherit&&own)}${seg(k,'off','Off',!inherit&&!own)}</div></div>`;}).join('')}</div>`).join('')}<div class="card-actions">${diff.length?act('Reset to '+p.role+' defaults','member-reset',id):''}${act('Edit '+p.role+' defaults','role-jump',p.role,'quiet')}</div></div>`;
 }

 // The HR file, read view.
 function profile(id){
  const st=s(),p=st.team.find(x=>x.id===id),d=st.scheduling.defaults[id],r=stats(st).get(id),h=p.hr||{},boss=st.team.find(x=>x.id===h.reportsTo);
  const fact=(label,value,wide)=>`<div${wide?' class="wide"':''}><dt>${label}</dt><dd>${e(value===undefined||value===''||value===null?'—':value)}</dd></div>`;
  const age=h.birthDate?Math.floor(days(h.birthDate,st.date)/365.25):null;
  const section=(title,body,key)=>`<section class="mg-file-section"><div class="mg-file-head"><h4>${title}</h4>${key?act('Edit','hr-edit',id,'quiet small',`data-section="${key}"`):''}</div><dl class="mg-facts">${body}</dl></section>`;
  const perms=p.access==='manager'?'<p class="mg-perm-note">Manager access · every permission.</p>':`<ul class="mg-perm-list">${P.list.map(([k,label])=>`<li data-on="${P.can(st,k,id)}">${P.can(st,k,id)?'✓':'✕'} ${e(label)}${P.custom(st,p).includes(k)?' <em>adjusted</em>':''}</li>`).join('')}</ul>`;
  return `<div class="mg-profile mg-file"><div class="mg-person-head">${avatar(p)}<div><h3>${e(p.name)}${h.preferredName&&h.preferredName!==p.name.split(' ')[0]?` <span class="mg-muted">“${e(h.preferredName)}”</span>`:''}${h.pronouns?` <span class="mg-muted">· ${e(h.pronouns)}</span>`:''}</h3><p>${e(p.role)} · ${e(p.area)}${h.employeeId?' · '+e(h.employeeId):''}</p></div><div class="mg-chips">${badge(p.active?'Active':'Former',p.active?'tone-sage':'')}${badge(p.access==='manager'?'Manager access':'Role permissions',p.access==='manager'?'tone-sage':'')}${h.employmentType?badge(h.employmentType):''}</div></div>
  <div class="mg-profile-stats"><div><strong>${r.week}</strong><small>shifts this week</small></div><div><strong>${hours(r.weekMinutes)}</strong><small>hours this week</small></div><div><strong>${r.sick}</strong><small>sick · 30 days</small></div><div><strong>${r.late}</strong><small>late · 30 days</small></div><div><strong>${complete(p)}%</strong><small>HR file complete</small></div></div>
  <div class="mg-file-grid">
  ${section('Contact',fact('Phone',p.phone)+fact('Email',p.email,true)+fact('Emergency contact',p.emergency,true)+fact('Home address',h.address,true),'Contact')}
  ${section('Personal',fact('Legal name',h.legalName)+fact('Preferred name',h.preferredName)+fact('Date of birth',h.birthDate?long(h.birthDate)+' · '+age:'')+fact('Pronouns',h.pronouns),'Personal')}
  ${section('Employment',fact('Employee ID',h.employeeId)+fact('Contract',h.employmentType)+fact('Overtime',h.overtime)+fact('Reports to',boss?.name)+fact('Joined',long(p.joinedOn))+fact(p.leftOn?'Last day':'Probation ends',long(p.leftOn||h.probationEnds)),'Employment')}
  ${section('Pay & banking',(d?fact('Hourly rate',cents(d.rate))+fact('Sickness · time off',(d.sickPaid?'Paid':'Unpaid')+' · '+(d.timeoffPaid?'Paid':'Unpaid')):'')+fact('Pay frequency',h.payFrequency)+fact('Paid by',h.payMethod)+fact('Bank',h.bankName?h.bankName+(h.accountType?' · '+h.accountType:''):'')+fact('Account',h.accountLast4?'•••• '+h.accountLast4:''),'Pay & banking')}
  ${section('Tax · W-4',fact('SSN / ITIN',h.taxIdLast4?'•••-••-'+h.taxIdLast4:'')+fact('Filing status',h.filingStatus,true)+fact('Multiple jobs',h.multipleJobs)+fact('Dependents',h.dependents!==undefined?cents(h.dependents):'')+fact('Other income',h.otherIncome!==undefined?cents(h.otherIncome):'')+fact('Deductions',h.deductions!==undefined?cents(h.deductions):'')+fact('Extra withholding',h.extraWithholding!==undefined?cents(h.extraWithholding)+' per pay':'')+fact('Exempt',h.taxExempt)+fact('State',h.workState?h.workState+(h.stateAllowances!==undefined?' · '+plural(h.stateAllowances,'allowance'):''):''),'Tax')}
  <section class="mg-file-section"><div class="mg-file-head"><h4>Documents & certifications</h4>${act('Edit','hr-edit',id,'quiet small','data-section="Documents"')}</div><div class="mg-doc-list">${docs.map(doc=>{const x=docStatus(p,doc);return `<div><span>${e(doc[1])}</span>${x.state==='na'?'<span class="table-detail">Not needed for this role</span>':badge(x.label+(x.date&&doc[2]==='file'?' · '+dateLabel(x.date,{month:'short',year:'numeric'}):''),x.tone)}</div>`;}).join('')}${h.workAuthExpires?`<div><span>Work authorization</span>${badge('Valid to '+long(h.workAuthExpires),days(st.date,h.workAuthExpires)<=30?'tone-amber':'tone-sage')}</div>`:''}</div></section>
  </div>
  ${p.notes?`<section class="mg-file-section"><h4>Manager notes</h4><p class="text-block">${e(p.notes)}</p></section>`:''}
  <section class="mg-file-section"><div class="mg-file-head"><h4>Warnings & write-ups</h4>${button('New record','wu-new','','data-person="'+e(id)+'"','quiet small')}</div>${api.writeups.forPerson(id)}</section>
  <section class="mg-file-section"><div class="mg-file-head"><h4>Permissions</h4>${p.access==='crew'?act('Adjust','member-perms',id,'quiet small'):''}</div>${perms}</section>
  ${api.hr.file(id)}
  <div class="card-actions">${act('Edit HR file','hr-edit',id,'')}${p.active&&p.id!==me()?button('Offboard','hr-offboard',id,'','quiet'):''}${button('Edit name, role & dates','ops-member',id)}${d?button('Edit pay','schedule-defaults',id):''}${button('Shift report','ops-member-report',id,'','quiet')}</div></div>`;
 }
 // The HR file, edit form. Sections can be opened on their own from the read view.
 function hrForm(id,only){
  const st=s(),p=st.team.find(x=>x.id===id),h=p.hr||{},sections=['Contact',...new Set(H.fields.map(f=>f[3]))].filter((x,i,a)=>a.indexOf(x)===i).filter(x=>!only||x===only||(only==='Documents'&&x==='Certifications'));
  const field=([key,label,type,,extra])=>{const v=h[key]??'';
   if(type==='select')return `<label>${label}<select name="${key}"><option value="">Not recorded</option>${extra.map(o=>`<option ${o===v?'selected':''}>${e(o)}</option>`).join('')}</select></label>`;
   if(type==='person')return `<label>${label}<select name="${key}"><option value="">No one</option>${st.team.filter(x=>x.active&&x.id!==id).map(x=>`<option value="${e(x.id)}" ${x.id===v?'selected':''}>${e(x.name)}</option>`).join('')}</select></label>`;
   if(type==='textarea')return `<label class="wide">${label}<textarea name="${key}" maxlength="${extra}">${e(v)}</textarea></label>`;
   const attrs=type==='date'?'type="date"':type==='last4'?'inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" placeholder="1234"':type==='state'?'maxlength="2" placeholder="IL"':type==='int'?'type="number" min="0" max="99" step="1"':type==='money'?'type="number" min="0" max="1000000" step="0.01"':`maxlength="${extra}"`;
   return `<label>${label}<input name="${key}" ${attrs} value="${e(v)}"></label>`;};
  return `<p class="mg-form-note">Only the last four digits of tax and bank numbers are stored. Keep full numbers in your payroll provider.</p>${sections.map(sec=>`<fieldset class="mg-form-section"><legend>${sec}</legend><div class="mg-form-grid">${sec==='Contact'?[['phone','Phone','tel',80],['email','Email','email',120],['emergency','Emergency contact (name, relationship, phone)','text',160]].map(([k,label,type,max])=>`<label>${label}<input name="${k}" type="${type}" maxlength="${max}" autocomplete="off" value="${e(p[k]||'')}"></label>`).join(''):''}${H.fields.filter(f=>f[3]===sec).map(field).join('')}</div></fieldset>`).join('')}`;
 }

 function render(){
  if(!tabs.some(x=>x[0]===tab))tab='todo';
  const st=s();
  const fin=api.finance,issues=st.team.filter(p=>p.active).reduce((n,p)=>n+problems(p).length,0);
  const hc=api.hr.counts();
  const counts={team:hc.onboarding+hc.performance+hc.skills+api.writeups.count(),todo:0,daily:B.biz.openDays(st,B.addDays(B.payroll.stamp().slice(0,10),-14),B.payroll.stamp().slice(0,10)).length,timesheets:fin.pendingCount(),payruns:fin.runDue()?'Due':0,compliance:issues,writeups:api.writeups.count(),onboarding:hc.onboarding,performance:hc.performance,skills:hc.skills};
  const items=tabs.map(([id,label])=>{const n=counts[id];return `<button type="button" class="mg-nav-item ${tab===id?'selected':''}" data-action="mg-tab" data-id="${id}" aria-current="${tab===id?'page':'false'}"><span>${e(label)}</span>${n?`<em data-tone="${({payruns:'orange',timesheets:'orange',daily:'orange',compliance:'amber',team:'amber'})[id]||'slate'}">${n}</em>`:''}</button>`;}).join('');
  const v=view[tab],tc={onboarding:hc.onboarding,performance:hc.performance+api.writeups.count(),training:hc.skills};
  const switcher=views[tab]?`<div class="res-filter-bar mg-views" role="tablist" aria-label="${heads[tab][0]} views">${views[tab].map(([id,label])=>`<button type="button" class="notif-tab ${v===id?'selected':''}" data-action="mg-view" data-id="${id}" aria-pressed="${v===id}"><span>${label}</span>${tab==='team'&&tc[id]?`<em>${tc[id]}</em>`:''}</button>`).join('')}</div>`:'';
  const body=tab==='todo'?todo():tab==='daily'?fin.daily():tab==='timesheets'?fin.timesheets():tab==='payruns'?fin.payruns():tab==='compliance'?compliance()
   :tab==='team'?(v==='onboarding'?api.hr.onboarding():v==='timeoff'?api.hr.timeoff():v==='performance'?api.hr.performance()+`<h3 class="mg-section-title">Warnings & write-ups</h3>`+api.writeups.section():v==='training'?(api.training?api.training.manageSummary():'')+api.hr.skills():people())
   :v==='permissions'?permissions():setup();
  const report=reportOf[tab]?button('Report ›','rp-open',reportOf[tab],'','quiet'):'';
  const actions={people:button('+ Add teammate','ops-member','','',''),onboarding:button('+ Hire someone','ops-member','','',''),timeoff:button('Adjust a balance','hr-adjust','','','secondary'),performance:button('Give kudos','hr-kudos','','','secondary')+' '+button('+ Review','hr-review-new','','','secondary')+' '+button('+ Warning or write-up','wu-new','','data-kind="warning"',''),training:button('Open Training ›','app-screen','training','','')+' '+button('Edit skills','hr-skill-list','','','secondary')};
  const extra=report+' '+(actions[v]||{daily:'',onboarding:button('+ Hire someone','ops-member','','',''),timeoff:button('Policy & rules','hr-policy','','','secondary'),performance:button('Give kudos','hr-kudos','','','secondary')+' '+button('+ Start review','hr-review-new','','',''),skills:button('Edit skills','hr-skill-list','','','secondary'),compliance:button('Labor rules','hr-policy','','','secondary'),todo:button('Open reports','rp-open','executive','','secondary'),people:button('+ Add teammate','ops-member','','',''),writeups:button('+ Warning','wu-new','','data-kind="warning"','secondary')+' '+button('+ Write-up','wu-new','','data-kind="writeup"',''),payruns:button('Pay settings','fin-settings','','','secondary'),labor:button('Full labor report ›','ops-report-tab','labor','','secondary'),timesheets:button('+ Add time','fin-add','','','secondary')}[tab]||'');
  const [title,sub]=heads[tab];
  return `<div class="manage-view" data-tab="${tab}"><nav class="mg-nav" aria-label="Manage sections">${items}</nav><div class="mg-main"><div class="section-bar mg-head"><h2>${title}</h2>${extra}</div>${switcher}<div class="mg-body">${body}</div></div></div>`;
 }
 const reopen=id=>api.open('Permissions · '+(B.person(id)?.name||''),memberPerms(id));
 function handle(action,id,data={}){
  if(action==='tab'&&toReport[id]){api.openReport(toReport[id]);return;}
  if(action==='tab'&&moved[id]){[tab,view[moved[id][0]]]=[moved[id][0],moved[id][1]];api.close();api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='view'){view[tab]=id;api.render();return;}
  if(action==='tab'){tab=id;api.close();api.render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(action==='filter'){filter=id;api.render();return;}
  if(action==='perm-view'){permView=id;api.render();return;}
  if(action==='profile'){api.open('HR file',profile(id));return;}
  if(action==='hr-edit'){hrFor=id;api.form(`${data.section?data.section==='Documents'?'Documents & certifications':data.section:'HR file'} · ${B.person(id)?.name||''}`,hrForm(id,data.section||''));return;}
  if(action==='member-perms'){reopen(id);return;}
  if(action==='role-jump'){tab='permissions';permView='roles';api.close();api.render();return;}
  if(action==='role-perm'){
   const on=P.roleDefault(s(),id,data.perm);
   api.commit({type:'manage:role-permissions',role:id,perms:{[data.perm]:!on}},`${P.title(data.perm)} ${on?'turned off':'turned on'} for every ${id}.`);return;
  }
  if(action==='member-perm'){
   const value=data.value==='default'?null:data.value==='on';
   if(api.commit({type:'manage:permissions',person:id,perms:{[data.perm]:value}},value===null?`${P.title(data.perm)} follows the role again.`:`${P.title(data.perm)} ${value?'on':'off'} for ${B.person(id)?.name}.`))reopen(id);return;
  }
  if(action==='member-reset'){if(api.commit({type:'manage:permissions',person:id,perms:Object.fromEntries(P.keys.map(k=>[k,null]))},'Back to role defaults.'))reopen(id);}
 }
 function submit(v){if(!hrFor)throw Error('Reopen the HR file.');return {type:'manage:hr',person:hrFor,hr:v};}
 function onChange(t){
  const id=t.dataset?.manageAccess;if(!id)return;
  const p=s().team.find(x=>x.id===id);
  if(!api.commit({type:'ops:member',id,name:p.name,role:p.role,area:p.area,access:t.value,active:p.active},t.value==='manager'?`${p.name} now has manager access.`:`${p.name} now follows the ${p.role} permissions.`))t.value=p.access;
 }
 return {render,handle,submit,onChange,tab:()=>tab,show:next=>{if(moved[next]){tab=moved[next][0];view[tab]=moved[next][1];}else tab=toReport[next]||!tabs.some(x=>x[0]===next)?'todo':next;}};
};
