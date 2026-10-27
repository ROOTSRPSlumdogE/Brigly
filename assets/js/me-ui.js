/* My space: the crew's own page. Today covers the shift they are on; this covers the person: the week ahead, requests,
   balances and pay, what needs them, recognition. Three views: Overview, Earnings and My file. */
globalThis.createMeUI=function(api){
 'use strict';
 const B=Brigly,S=B.schedule,Z=B.biz,T=B.training,{e,button,badge,dateLabel}=api;
 const s=()=>api.state(),me=()=>B.actor(s().role,s().crewId,s().managerId);
 const name=id=>B.person(id)?.name||'Team member',first=id=>name(id).split(' ')[0];
 const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0);
 const hours=n=>(Math.round(n/6)/10).toLocaleString('en-US');
 const plural=(n,word,many=word+'s')=>n+' '+(n===1?word:many);
 const today=()=>B.dateString(new Date());
 const tone=area=>area==='Bar'?'orange':area==='Kitchen'?'slate':'sage';
 const greeting=()=>{const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening';};
 const sections=[['me','Overview'],['earnings','Earnings'],['myfile','My file']];
 const svg=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
 const glyph={chev:'M9 6l6 6-6 6',left:'M15 5l-7 7 7 7',right:'M9 5l7 7-7 7',off:'M12 3v2 M12 19v2 M3 12h2 M19 12h2 M5.6 5.6l1.4 1.4 M17 17l1.4 1.4 M5.6 18.4 7 17 M17 7l1.4-1.4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',swap:'M4 7h15l-4-4 M20 17H5l4 4'};
 const kinds={timeoff:'Time off',sick:'Sickness',late:'Running late',swap:'Shift swap'};
 const open=r=>['Pending','Reported','Awaiting teammate'].includes(r.status);

 // Counts for the switch.
 function counts(){
  const st=s(),pid=me();
  const file=(st.writeups||[]).filter(w=>w.person===pid&&w.status==='Issued').length+(st.business?.reviews||[]).filter(r=>r.person===pid&&r.status==='Shared').length;
  return {myfile:file?['New','orange']:null};
 }
 // The week: seven days, the shifts on each, and the totals.
 function week(st,pid){
  const monday=api.week?api.week():B.monday(st.date),days=Array.from({length:7},(_,i)=>B.addDays(monday,i)),t=today();
  const mine=st.shifts.filter(x=>x.person===pid&&days.includes(x.date)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
  const tot=mine.reduce((o,x)=>{const m=S.metrics(st,x);o.min+=m.workMinutes;o.pay+=m.wages;return o;},{min:0,pay:0});
  const tips=st.scheduling.tips.filter(x=>x.person===pid&&days.includes(x.date)).reduce((n,x)=>n+x.amount,0);
  const strip=days.map(d=>{const on=mine.filter(x=>x.date===d),x=on[0];return `<button type="button" class="mx-day ${x?'is-on':''} ${d===t?'is-today':''}" ${x?`data-action="home-choose" data-id="${e(x.id)}"`:'disabled'} aria-label="${e(dateLabel(d,{weekday:'long',month:'short',day:'numeric'}))}${x?' · '+e(x.start+'–'+x.end):' · off'}"><small>${e(dateLabel(d,{weekday:'narrow'}))}</small><strong>${e(dateLabel(d,{day:'numeric'}))}</strong><span>${x?e(x.start):'·'}</span></button>`;}).join('');
  const rows=mine.map(x=>{const m=S.metrics(st,x),mates=[...new Set(st.shifts.filter(y=>y.date===x.date&&y.service===x.service&&y.person!==pid).map(y=>y.person))];
   return `<button type="button" class="mx-shift ${x.date===t?'is-today':''}" data-action="home-choose" data-id="${e(x.id)}"><span class="mx-shift-day"><small>${dateLabel(x.date,{weekday:'short'})}</small><strong>${dateLabel(x.date,{day:'numeric'})}</strong></span><span class="mx-shift-text"><strong>${e(x.start)}–${e(x.end)} <em>${e(x.service)}</em></strong><small><span class="td-tag" data-tone="${tone(x.area)}">${e(x.area)}</span>${hours(m.workMinutes)} h · ${money(m.wages)}${m.absence?' · '+(m.absence.kind==='sick'?'sick':'time off'):m.late?' · late':''}</small></span>${mates.length?`<span class="tr-stack">${mates.slice(0,3).map(id=>`<span class="avatar is-small" data-tone="${tone(B.person(id)?.area)}">${e(B.person(id)?.initials||'')}</span>`).join('')}${mates.length>3?`<span class="avatar is-small is-more">+${mates.length-3}</span>`:''}</span>`:''}${svg(glyph.chev)}</button>`;}).join('');
  return `<section class="mx-week"><div class="mx-week-head"><div><span class="mx-eyebrow">Week of ${e(dateLabel(monday,{month:'short',day:'numeric'}))}</span><h3>${mine.length?`${plural(mine.length,'shift')} · ${hours(tot.min)} h`:'No shifts this week'}</h3><p>${money(tot.pay+tips)} expected${tips?' · '+money(tips)+' tips':''}</p></div><div class="mx-week-nav"><button type="button" class="button quiet" data-action="week-prev" data-id="" aria-label="Previous week">${svg(glyph.left)}</button><button type="button" class="button quiet" data-action="week-next" data-id="" aria-label="Next week">${svg(glyph.right)}</button></div></div><div class="mx-strip">${strip}</div>${rows?`<div class="mx-rows">${rows}</div>`:'<div class="mx-empty"><strong>Nothing scheduled</strong><small>Off all week. Enjoy it, or ask your manager for shifts.</small></div>'}</section>`;
 }
 function overview(){
  const st=s(),pid=me(),t=today();
  const sick=Z?Z.balance(st,pid,'sick'):{eligible:false},pto=Z?Z.balance(st,pid,'pto'):{eligible:false},month=S.totals(st,pid,t,'month');
  const tr=T&&st.training?{xp:T.xp(st,pid),lv:T.level(T.xp(st,pid)),sk:T.streak(st,pid),rows:T.pathFor(st,pid).map(c=>[c,T.progress(st,pid,c.id)]),pend:T.pending(st,pid).length}:null;
  // For you to do: things only this person can clear.
  const items=[];const push=(tn,title,sub,action,id='')=>items.push({tn,title,sub,action,id});
  for(const w of (st.writeups||[]).filter(w=>w.person===pid&&w.status==='Issued'))push('orange','Read and sign: '+w.title,'From your manager','wu-view',w.id);
  for(const r of (st.business?.reviews||[]).filter(r=>r.person===pid&&r.status==='Shared'))push('sage','Your '+r.kind.toLowerCase()+' is ready','Read it and add your thoughts','hr-review-view',r.id);
  if(tr){for(const [c,x] of tr.rows.filter(([,x])=>x.overdue||x.status==='Returned'))push(x.overdue?'danger':'amber',(x.overdue?'Overdue: ':'Try again: ')+c.title,x.overdue?'Was due '+dateLabel(x.due):'Your practical was returned with feedback','tr-go',c.id);
   if(tr.pend)push('orange',plural(tr.pend,'sign-off')+' waiting for you','Check a teammate’s practical on shift','tr-go-tab','signoffs');
   for(const d of st.training.duels.filter(d=>d.status==='Open'&&(d.from===pid||d.to===pid)&&!d.scores[pid]))push('amber',first(d.from===pid?d.to:d.from)+' challenged you to a duel','Five questions · +'+T.XP.duelWin+' XP for the win','tr-go-tab','arena');}
  const todo=items.length?`<section class="mx-block"><div class="mx-h"><h3>For you</h3><span class="mx-count">${items.length}</span></div><div class="mx-rows">${items.map(x=>`<button type="button" class="mx-row" data-tone="${x.tn}" data-action="${e(x.action)}" data-id="${e(x.id)}"><i class="mx-dot"></i><span class="mx-row-text"><strong>${e(x.title)}</strong><small>${e(x.sub)}</small></span>${svg(glyph.chev)}</button>`).join('')}</div></section>`:'';
  // Requests: invitations first, then what is open, then the last few decided ones.
  const may=key=>!B.permissions||B.permissions.can(st,key);
  const all=st.scheduling.requests.filter(r=>r.person===pid||r.targetPerson===pid).slice().reverse(),invites=all.filter(r=>r.targetPerson===pid&&r.status==='Awaiting teammate'),mineOpen=all.filter(r=>r.person===pid&&open(r)),history=all.filter(r=>!open(r)).slice(0,4);
  const detail=r=>{const shift=st.shifts.find(x=>x.id===r.shiftId),target=st.shifts.find(x=>x.id===r.targetId);return r.kind==='swap'&&shift?`${dateLabel(shift.date)} ${shift.start}–${shift.end}${target?' ⇄ '+dateLabel(target.date)+' '+target.start+'–'+target.end:''}`:S.requestSummary(r);};
  const row=(r,acts='')=>`<div class="mx-row is-static" data-tone="${open(r)?'orange':''}"><span class="mx-row-text"><strong>${e(kinds[r.kind]||r.kind)}${r.targetPerson===pid?' <em>from '+e(first(r.person))+'</em>':''}</strong><small>${e(detail(r))}${r.feedback?' · “'+e(r.feedback)+'”':''}</small></span>${acts||badge(r.status,open(r)?'tone-orange':['Approved','Reviewed','Accepted'].includes(r.status)?'tone-sage':'')}</div>`;
  const requests=`<section class="mx-block"><div class="mx-h"><h3>Requests</h3>${may('timeoff')?`<button type="button" class="mx-link" data-action="schedule-timeoff" data-id="">${svg(glyph.off)}Time off</button>`:''}</div>${invites.length||mineOpen.length||history.length?`<div class="mx-rows">${invites.map(r=>row(r,`<span class="mx-acts">${button('Accept','schedule-accept',r.id,'','small')}${button('Decline','schedule-reject',r.id,'','quiet small')}</span>`)).join('')}${mineOpen.map(r=>row(r,`<span class="mx-acts">${badge(r.status,'tone-orange')}${button('Withdraw','schedule-withdraw',r.id,'','quiet small')}</span>`)).join('')}${history.map(r=>row(r)).join('')}</div>`:'<div class="mx-empty"><strong>No requests yet</strong><small>Time off and swaps you ask for show up here. Swap a shift from the shift itself on Today.</small></div>'}</section>`;
  const stats=`<div class="mx-stats"><button type="button" class="is-link" data-action="app-screen" data-id="earnings"><small>${e(dateLabel(t,{month:'long'}))} so far</small><strong>${money(month.total)}</strong><span>${hours(month.workMinutes)} h · ${money(month.tips)} tips</span></button><div><small>Sick leave</small><strong>${sick.eligible?hours(sick.balance*60)+' <em>h</em>':'—'}</strong><span>${sick.eligible?hours(sick.accrued*60)+' h earned this year':'Not eligible'}</span></div><div><small>Paid time off</small><strong>${pto.eligible?hours(pto.balance*60)+' <em>h</em>':'—'}</strong><span>${pto.eligible?hours(pto.used*60)+' h used':'Not on your contract'}</span></div>${tr?`<button type="button" class="is-link" data-action="app-screen" data-id="training"><small>Training</small><strong>${e(tr.lv.icon)} ${e(tr.lv.title)}</strong><span>${tr.xp.toLocaleString('en-US')} XP${tr.sk.count?' · 🔥 '+tr.sk.count:''} · ${tr.rows.filter(([,x])=>x.status==='Completed').length}/${tr.rows.length} courses</span></button>`:''}</div>`;
  const kudos=(st.business?.kudos||[]).filter(k=>k.person===pid).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,2);
  const recognition=kudos.length?`<section class="mx-block"><div class="mx-h"><h3>Recognition</h3><button type="button" class="mx-link" data-action="app-screen" data-id="myfile">My file ${svg(glyph.chev)}</button></div><div class="mx-kudos">${kudos.map(k=>`<blockquote><p>${e(k.text)}</p><footer>${k.value?`<span class="td-tag" data-tone="sage">${e(k.value)}</span>`:''}<span>${e(first(k.by))} · ${dateLabel(k.at.slice(0,10))}</span></footer></blockquote>`).join('')}</div></section>`:'';
  return `<div class="mx-grid"><div class="mx-col">${week(st,pid)}${todo}</div><div class="mx-col">${stats}${requests}${recognition}</div></div>`;
 }
 function render(screen){
  const st=s(),section=['earnings','myfile'].includes(screen)?screen:'me',c=counts(),sch=api.schedule();
  const nav=`<div class="segmented mx-switch" role="tablist" aria-label="My space">${sections.map(([id,label])=>`<button type="button" data-action="app-screen" data-id="${id}" aria-pressed="${section===id}" class="${section===id?'selected':''}">${label}${c[id]?`<em data-tone="${c[id][1]}">${e(String(c[id][0]))}</em>`:''}</button>`).join('')}</div>`;
  const head=section==='me'?`<div class="mx-head"><div><p class="mx-date">${e(dateLabel(today(),{weekday:'long',month:'long',day:'numeric'}))}</p><h2>${e(greeting())}, ${e(first(me()))}</h2></div>${nav}</div>`:`<div class="mx-head"><div><p class="mx-date">${section==='earnings'?'Real pay from the time clock, then estimates for any period.':'What is on record about you.'}</p><h2>${section==='earnings'?'My earnings':'My file'}</h2></div>${nav}</div>`;
  const body=section==='me'?overview():section==='earnings'?`<div class="mx-earn">${(api.finance().myPay?.()||'')}<div class="mx-earn-tools">${button('Add / edit my tips','schedule-tips','','','secondary')}</div>${sch.periodControls()}${sch.earnings()}</div>`:api.hr().myFile();
  return `<div class="mx-view" data-tab="${section}">${head}${body}</div>`;
 }
 return {render,sections:()=>sections.map(x=>x[0]),counts};
};
