/* Schedule UI, kept separate from the other six workspace sections. */
globalThis.createScheduleUI=function(api){
  'use strict';
  const B=globalThis.Brigly,S=B.schedule,{e,button,badge,input,textarea,select,dateLabel}=api;
  const s=()=>api.state(),me=()=>B.actor(s().role,s().crewId,s().managerId),manager=()=>s().role==='manager';
  const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
  const hours=n=>(n/60).toLocaleString('en-US',{maximumFractionDigits:2});
  const name=id=>B.person(id)?.name||'Unknown';
  let period='week',selectedPerson='',form=null,showWeek=false;
  const scopePerson=()=>manager()?selectedPerson:me();
  const ownShifts=()=>s().shifts.filter(x=>x.person===me());
  const shiftLabel=x=>`${dateLabel(x.date)} · ${x.start}–${x.end} · ${e(x.area)} · ${name(x.person)}`;
  const title={timeoff:'Time off',sick:'Sickness',late:'Running late',swap:'Shift swap'};
  const needsReview=r=>['Reported','Pending'].includes(r.status);
  const active=r=>S.active(r);
  const may=key=>!B.permissions||B.permissions.can(s(),key);
  const actionButton=(label,action,id='',style='secondary',extra='')=>button(label,'schedule-'+action,id,extra,style);
  function open(title,fields,context){form=context;api.open(title,fields);}
  function totals(){return S.totals(s(),scopePerson(),s().date,period);}
  function summary(){
    const t=totals();
    return [['Expected working hours',hours(t.workMinutes),`${{day:'Day',week:'Week',month:'Month',all:'All dates'}[period]} · ${hours(t.scheduledMinutes)} roster hours before adjustments`],[manager()?'Estimated labor cost':'Expected gross pay',money(manager()?t.wages:t.total),manager()?((selectedPerson?name(selectedPerson)+' · ':'')+'Gross wage expense · crew tips excluded'):`${money(t.wages)} wages + ${money(t.tips)} tips`],['Paid absence hours',hours(t.paidAbsenceMinutes),'Included in gross wages'],[manager()?'Needs attention':'My reported tips',manager()?s().scheduling.requests.filter(needsReview).length+s().unavailable.filter(x=>x.status==='Reported').length:money(t.tips),manager()?'Requests, attendance & 86 reports · all dates':'Personal tips for this period']].map(([label,value,note])=>`<div class="stat"><p>${label}</p><strong>${value}</strong><small>${note}</small></div>`).join('');
  }
  function periodControls(){
    return `<div class="schedule-controls"><div><p class="eyebrow">${manager()?'TEAM PLANNING & LABOR COST':'MY SCHEDULE & EARNINGS'}</p><h2>${manager()?(selectedPerson?e(name(selectedPerson)):'Your team, in sync'):e(name(me()).split(' ')[0])+', here’s your shift picture.'}</h2></div><div class="toolbar">${manager()?`<label class="compact-label">Labor cost for<select id="schedule-person"><option value="">Whole team</option>${B.crew.map(p=>`<option value="${e(p.id)}" ${selectedPerson===p.id?'selected':''}>${e(p.name)}</option>`).join('')}</select></label>`:''}<div class="segmented" aria-label="Summary period">${[['day','Daily'],['week','Weekly'],['month','Monthly'],['all','Overall']].map(([key,label])=>`<button type="button" data-action="schedule-period" data-id="${key}" aria-pressed="${period===key}" class="${period===key?'selected':''}">${label}</button>`).join('')}</div></div></div>`;
  }
  function earnings(){
    const person=scopePerson(),dates=[...new Set([...s().shifts.filter(x=>(!person||x.person===person)&&S.inPeriod(x.date,s().date,period)).map(x=>x.date),...s().scheduling.tips.filter(x=>(!person||x.person===person)&&S.inPeriod(x.date,s().date,period)).map(x=>x.date)])].sort();
    const total=totals();
    const rows=dates.map(date=>{const row={date,...S.totals(s(),person,date,'day')};row.displayTotal=manager()?row.wages:row.total;return row;});
    const chartRows=period==='all'?Object.values(rows.reduce((out,r)=>{const key=r.date.slice(0,7);out[key]||={date:key+'-01',displayTotal:0};out[key].displayTotal+=r.displayTotal;return out;},{})):rows.slice(-14);
    const max=Math.max(1,...chartRows.map(x=>x.displayTotal));
    return `<section class="panel earnings-panel"><div class="panel-head"><div><h2>${manager()?'Labor cost overview':'Your earnings overview'}</h2><p>${period==='all'?'All recorded dates':period==='month'?dateLabel(s().date,{month:'long',year:'numeric'}):period==='day'?dateLabel(s().date):dateLabel(B.monday(s().date))+' – '+dateLabel(B.addDays(B.monday(s().date),6))} · all services</p></div>${actionButton(manager()?'Record tips':'Add / edit my tips','tips','','')}</div><div class="earnings-total"><div><small>${manager()?'ESTIMATED WAGE EXPENSE':'EXPECTED GROSS TOTAL'}</small><strong>${money(manager()?total.wages:total.total)}</strong><span>${manager()?'Employer gross wages. '+money(total.tips)+' crew tips shown separately.':money(total.wages)+' wages + '+money(total.tips)+' reported tips'}</span></div><div class="earnings-bars">${chartRows.map(r=>`<div class="earnings-day" title="${e(dateLabel(r.date)+': '+money(r.displayTotal))}"><span>${money(r.displayTotal)}</span><div class="bar-track"><i style="height:${Math.max(2,r.displayTotal/max*100)}%"></i></div><small>${dateLabel(r.date,period==='all'?{month:'short'}:{month:'numeric',day:'numeric'})}</small></div>`).join('')||'<p>No shifts or tips in this period.</p>'}</div></div><details class="earnings-details"><summary>Daily breakdown · ${rows.length} dates${period==='all'?' (chart grouped by month)':rows.length>14?' (chart shows last 14)':''}</summary><div class="table-scroll"><table><thead><tr><th>DATE</th><th>ROSTER HOURS</th><th>EXPECTED WORK</th><th>PAID ABSENCE</th><th>WAGES</th><th>${manager()?'CREW TIPS · SEPARATE':'TIPS'}</th><th>${manager()?'WAGE EXPENSE':'GROSS TOTAL'}</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dateLabel(r.date)}</td><td>${hours(r.scheduledMinutes)}</td><td>${hours(r.workMinutes)}</td><td>${hours(r.paidAbsenceMinutes)}</td><td>${money(r.wages)}</td><td>${money(r.tips)}</td><td><strong>${money(r.displayTotal)}</strong></td></tr>`).join('')}</tbody></table></div></details><div class="estimate-note">${manager()?'Estimated employer gross wage expense; crew tips are excluded. Employer taxes and benefit costs are not configured.':'Schedule-based estimates, including past dates—not confirmed earnings or payroll.'} Gross wages use each shift’s rate, unpaid breaks and attendance adjustments. No tax, overtime or deductions calculated. Future tips are not assumed.</div></section>`;
  }
  function personal(){
    const days=Array.from({length:7},(_,i)=>B.addDays(api.week(),i));
    const shifts=ownShifts().filter(x=>showWeek?days.includes(x.date):x.date===s().date).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    return `<section class="panel"><div class="panel-head crew-head"><div class="toolbar">${button('‹','week-prev','','aria-label="Previous week"')}<span class="week-label">${dateLabel(days[0])} – ${dateLabel(days[6])}</span>${button('›','week-next','','aria-label="Next week"')}</div></div><div class="day-strip crew-days">${days.map(d=>'<button data-action="pick-day" data-id="'+d+'" aria-pressed="'+(!showWeek&&d===s().date)+'" class="'+(!showWeek&&d===s().date?'selected':'')+'"><small>'+dateLabel(d,{weekday:'short'})+'</small><strong>'+dateLabel(d,{day:'numeric'})+'</strong></button>').join('')}</div><div class="my-shifts">${shifts.map(x=>{
      const m=S.metrics(s(),x),coworkers=s().shifts.filter(y=>y.id!==x.id&&y.person!==x.person&&B.overlaps(y,x)&&!S.absence(s(),y));
      const attendance=m.absence?title[m.absence.kind]+(m.absence.paid?' · Paid':' · Unpaid'):m.late?`${m.late.minutes} min late`:'Scheduled';
      return `<article class="agenda-shift"><div class="agenda-date"><strong>${dateLabel(x.date,{day:'numeric'})}</strong><small>${dateLabel(x.date,{weekday:'short'})}</small></div><div><h3>${x.start}–${x.end}${x.end<x.start?' +1 day':''}</h3><p>${e(x.service)} · ${e(x.area)}</p><small>${hours(m.workMinutes)} expected hours · ${money(m.wages)} est.</small>${badge(attendance,m.absence?'red':m.late?'orange':'gray')}</div><button class="agenda-open" data-action="home-choose" data-id="${e(x.id)}" aria-label="Open ${e(x.service)} shift on ${x.date}">›</button></article>`;

    }).join('')||'<div class="empty"><strong>No shifts in this view</strong>Choose a day or see all shifts this week.</div>'}</div><div class="crew-range">${!shifts.length&&may('timeoff')?actionButton('Request time off','timeoff','',''):''}${actionButton(showWeek?'Show selected day':'See all shifts this week','range','','quiet')}</div></section>`;
  }
  function requestCard(r){
    const shift=s().shifts.find(x=>x.id===r.shiftId),target=s().shifts.find(x=>x.id===r.targetId);
    const urgent=r.status==='Reported';
    let detail=r.kind==='timeoff'?`${dateLabel(r.from)} – ${dateLabel(r.to)}`:shift?shiftLabel(shift):dateLabel(r.date);
    if(r.kind==='swap')detail+=' ⇄ '+(target?shiftLabel(target):'Shift removed');
    if(r.kind==='late')detail+=` · ${r.minutes} minutes late${shift&&S.absence(s(),shift)?' (absence overrides this estimate)':''}`;
    if(['sick','timeoff'].includes(r.kind))detail+=` · ${r.paid?'Paid':'Unpaid'}${['Reported','Pending'].includes(r.status)?' default (pending review)':''}`;
    let actions='';
    if(manager()&&(needsReview(r)||(['sick','late'].includes(r.kind)&&r.status==='Reviewed')||(r.kind==='timeoff'&&r.status==='Approved')))actions+=actionButton(r.kind==='late'?'Confirm / correct arrival':r.kind==='sick'||r.status==='Approved'?'Review absence pay':'Review request','review',r.id,urgent?'':'secondary');
    if(r.kind==='swap'&&r.targetPerson===me()&&r.status==='Awaiting teammate')actions+=actionButton('Accept swap','accept',r.id,'quiet')+actionButton('Decline swap','reject',r.id,'danger');
    if(r.person===me()&&['Pending','Awaiting teammate','Reported'].includes(r.status))actions+=actionButton('Withdraw','withdraw',r.id);
    else if(manager()&&['Approved','Reviewed','Reported','Pending'].includes(r.status)&&r.kind!=='swap')actions+=actionButton('Withdraw / correct','withdraw',r.id);
    return `<article class="request-card ${urgent?'urgent':''}"><div class="request-heading"><strong>${e(title[r.kind])} <span>· ${e(name(r.person))}</span></strong>${badge(r.status,urgent?'red':r.status==='Pending'?'orange':'gray')}</div><p>${e(detail)}</p>${r.note?`<p class="request-note">${e(r.note)}</p>`:''}${r.feedback?`<p class="request-feedback">${e(r.feedback)}</p>`:''}${r.kind==='swap'&&r.status==='Awaiting teammate'?`<small>Waiting for ${e(name(r.targetPerson))} before manager review.</small>`:''}<div class="card-actions">${actions}</div></article>`;
  }
  function requests(){
    const relevant=s().scheduling.requests.filter(r=>manager()||r.person===me()||r.targetPerson===me());
    const pending=relevant.filter(r=>['Reported','Pending','Awaiting teammate'].includes(r.status));
    const history=relevant.filter(r=>!pending.includes(r)).slice().reverse();
    return `<section class="panel requests-panel"><div class="panel-head"><div><h2>${manager()?'Requests & attendance':'My requests & swap invitations'}</h2><p>All dates · ${pending.length} open${manager()?' · sickness and lateness highlighted first':''}</p></div>${!manager()&&may('timeoff')?actionButton('Request time off','timeoff','',''):''}${badge(pending.filter(r=>r.status==='Reported').length+' attendance alerts',pending.some(r=>r.status==='Reported')?'red':'gray')}</div>${pending.sort((a,b)=>(a.status==='Reported'?-1:1)-(b.status==='Reported'?-1:1)).map(requestCard).join('')||'<div class="empty"><strong>All caught up</strong>No open requests or attendance reports.</div>'}<details class="request-history"><summary>Request history · ${history.length}</summary>${history.map(requestCard).join('')||'<p class="estimate-note">Reviewed requests will appear here.</p>'}</details></section>`;
  }
  let screen='shifts';
  // Inbox moved to the Roster, Labor & pay to Reports and Team & setup to Manage.
  function route(key){
    if(!manager()||!['requests','earnings','setup'].includes(key))return key;
    if(key==='requests')return 'shifts';
    if(key==='earnings'){api.reportBoard('labor');return 'reports';}
    api.manageTab('setup','');return 'manage';
  }
  // Schedule requests are reviewed beside the roster: open ones first, otherwise the history sits underneath.
  function managerRoster(){
    const open=s().scheduling.requests.some(r=>['Reported','Pending','Awaiting teammate'].includes(r.status));
    return open?requests()+api.roster():api.roster()+requests();
  }
  function render(){
    if(screen==='home')return api.home();
    if(screen==='training'&&manager()&&api.training)return api.training();
    if(screen==='briefing'&&!manager())return api.context(s().date,s().service);
    // Crew: My space is one hub for the schedule, requests, earnings, training and their file.
    if(!manager()&&api.me&&['me','shifts','earnings','requests','myfile'].includes(screen))return api.me(screen);
    if(screen==='training'&&api.training)return api.training();
    const tabs=manager()?[['shifts','Roster'],['manage','Manage'],['reports','Reports'],['briefing','Briefing']]:[['shifts','My shifts'],['earnings','Earnings'],['requests','Requests'],['myfile','My file']];
    screen=route(screen);if(!tabs.some(x=>x[0]===screen))screen='shifts';
    const nav='<div class="schedule-tabs" aria-label="Schedule sections">'+tabs.map(([id,label])=>actionButton(label,'screen',id,screen===id?'selected':'secondary', 'aria-pressed="'+(screen===id)+'"')).join('')+'</div>';
    const content=screen==='shifts'?(manager()?managerRoster():personal()):screen==='earnings'?earnings():screen==='requests'?requests():screen==='manage'?api.manage():screen==='reports'?api.reportsPage():screen==='myfile'?api.myfile():(api.section?api.section(screen):api.extras());
    // The crew's real pay comes first; the period controls below only shape the estimates.
    return nav+(screen==='earnings'&&!manager()&&api.pay?api.pay():'')+(screen==='earnings'?periodControls():'')+content;
  }
  function handle(action,id){
    if(action==='shift-tips'){const shift=s().shifts.find(x=>x.id===id);open('Add tips',input('date','Date',shift.date,'date','required')+input('amount','Tips ($)',s().scheduling.tips.find(t=>t.person===me()&&t.date===shift.date)?.amount||0,'number','required min="0" step="0.01"'),{kind:'tips'});return;}
    if(action==='range'){showWeek=!showWeek;api.render();return;}
    if(action==='screen'){screen=route(id);if(id==='shifts'){period='week';selectedPerson='';}api.render();return;}
    if(action==='period'){period=id;api.render();return;}
    if(action==='accept'||action==='reject'){api.commit({type:'schedule:respond',id,decision:action==='accept'?'accept':'decline'},'Swap response saved.');return;}
    const bal=pid=>{if(!B.biz)return '';const k=B.biz.balance(s(),pid,'sick'),p=B.biz.balance(s(),pid,'pto');return `<p class="fin-note">Balances: ${k.eligible?k.balance+' h sick leave':''}${p.eligible?' · '+p.balance+' h paid time off':' · no paid time off on this contract'}</p>`;};
    if(action==='timeoff')open('Request time off',bal(me())+input('from','First day',s().shifts.find(x=>x.id===id)?.date||s().date,'date','required')+input('to','Last day',s().shifts.find(x=>x.id===id)?.date||s().date,'date','required')+textarea('note','Note to your manager (optional)','','maxlength="500"')+'<p>Your hours and pay stay unchanged until your manager approves. Your manager chooses paid or unpaid.</p>',{kind:'timeoff'});
    if(action==='report-sick'||action==='report-late'){
      const x=s().shifts.find(x=>x.id===id),kind=action==='report-sick'?'sick':'late';
      open(kind==='sick'?'Report sickness':'Let your manager know you’re running late',`<p><strong>${e(shiftLabel(x))}</strong></p>`+(kind==='late'?input('minutes','Expected minutes late',15,'number',`required min="1" max="${B.duration(x)}" step="1"`):`<p>Your shift will be flagged for coverage immediately. Your current absence default is <strong>${s().scheduling.defaults[me()].sickPaid?'paid':'unpaid'}</strong>; your manager can override this. No medical details are needed.</p>`)+textarea('note','Handover note (optional)','','maxlength="500"')+(kind==='late'?'<p>This updates your expected hours now. Your manager can confirm or correct the minutes once you arrive.</p>':''),{kind:'report',shiftId:id,reportKind:kind});
    }
    if(action==='swap'){
      const source=s().shifts.find(x=>x.id===id),choices=s().shifts.filter(x=>x.person!==me()&&x.area===source.area&&!S.absence(s(),x));
      let html=`<div class="swap-dialog-shell"><div class="swap-offered-card"><span class="swap-label-eyebrow">YOUR SHIFT TO TRADE</span><div class="swap-offered-main"><strong>${dateLabel(source.date,{weekday:'short',month:'short',day:'numeric'})} · ${source.start}–${source.end}</strong><span>${e(source.service)} · Station: <b>${e(source.area)}</b></span></div></div>`;
      if(!choices.length){
        html+=`<div class="empty"><strong>No shifts to swap</strong><p>No other teammates currently have scheduled shifts on ${e(source.area)} to swap with.</p></div>`;
      }else{
        const byPerson=new Map();
        for(const c of choices){if(!byPerson.has(c.person))byPerson.set(c.person,[]);byPerson.get(c.person).push(c);}
        const persons=[...byPerson.keys()];
        html+=`<div class="swap-step-block"><label class="swap-step-title">1. Select teammate to switch with</label><div class="swap-teammate-row" role="radiogroup" aria-label="Teammate">${persons.map((pid,idx)=>{const p=B.person(pid),cnt=byPerson.get(pid).length,sel=idx===0;return `<button type="button" class="swap-teammate-btn ${sel?'selected':''}" data-action="swap-select-person" data-person="${e(pid)}" aria-pressed="${sel}"><span class="avatar">${e(p?.initials||'TM')}</span><span class="swap-tm-info"><strong>${e(p?.name||'Teammate')}</strong><small>${cnt} ${cnt===1?'shift':'shifts'}</small></span></button>`;}).join('')}</div></div>`;
        html+=`<div class="swap-step-block"><label class="swap-step-title">2. Select the shift you want</label><div class="swap-shifts-container">${persons.map((pid,idx)=>{const pShifts=byPerson.get(pid);return `<div class="swap-person-group ${idx===0?'':'is-hidden'}" data-swap-person-shifts="${e(pid)}">${pShifts.map((sh,sIdx)=>{const chk=idx===0&&sIdx===0;return `<label class="swap-shift-option ${chk?'is-checked':''}"><input type="radio" name="targetId" value="${e(sh.id)}" ${chk?'checked':''}><div class="swap-shift-details"><div class="swap-shift-head"><strong>${dateLabel(sh.date,{weekday:'short',month:'short',day:'numeric'})}</strong><span class="swap-time-pill">${sh.start}–${sh.end}</span></div><div class="swap-shift-foot"><span class="arrival-pill">${e(sh.service)}</span><span class="td-tag" data-tone="${sh.area==='Bar'?'orange':sh.area==='Kitchen'?'slate':'sage'}">${e(sh.area)}</span></div></div></label>`;}).join('')}</div>`;}).join('')}</div></div>`;
        html+=textarea('note','3. Message to teammate & manager (optional)','','maxlength="500" placeholder="e.g. Can you cover my Friday? I can take your Wednesday!"')+'<p class="swap-note-terms">Your teammate must accept first, then your manager approves. Shift rates stay as scheduled.</p>';
      }
      html+=`</div>`;
      open('Request a shift swap',html,{kind:'swap',shiftId:id});
    }
    if(action==='review'){
      const r=s().scheduling.requests.find(r=>r.id===id);
      open('Review '+title[r.kind].toLowerCase(),`<p><strong>${e(name(r.person))}</strong> · ${e(S.requestSummary(r))}</p>`+(['sick','timeoff'].includes(r.kind)?bal(r.person):'')+(['timeoff','swap'].includes(r.kind)?select('decision','Decision',[['approve','Approve'],['decline','Decline']],'approve'):'')+(['sick','timeoff'].includes(r.kind)?select('paid','Pay for this absence',[['true','Paid'],['false','Unpaid']],String(r.paid)):'')+(r.kind==='late'?input('minutes','Confirmed minutes late',r.minutes,'number','required min="0" max="1440" step="1"'):'')+textarea('feedback','Response to crew (required when declining)',r.feedback,'maxlength="500"')+'<p>Saving updates the schedule, expected hours and gross earnings immediately.</p>',{kind:'review',id});
    }
    if(action==='withdraw')open('Withdraw this request or report?','<p>This restores the affected schedule and estimate. The request stays in history.</p>',{kind:'withdraw',id});
    if(action==='tips'){
      const person=scopePerson()||me(),existing=s().scheduling.tips.find(t=>t.person===person&&t.date===s().date);
      open('Record daily tips',(manager()?select('person','Team member',B.crew.map(p=>[p.id,p.name]),person):'')+input('date','Tip date',s().date,'date','required')+input('amount','Total tips for this day ($)',existing?.amount??0,'number','required min="0" max="100000" step="0.01"')+'<p>Enter the full daily total. Saving replaces any earlier entry for that person and date, so tips are never counted twice.</p>',{kind:'tips'});
    }
    if(action==='defaults'){
      const d=s().scheduling.defaults[id];
      open('Defaults · '+name(id),input('rate','Default hourly rate for new shifts ($)',d.rate,'number','required min="0" max="100000" step="0.01"')+select('sickPaid','Sickness default',[['false','Unpaid'],['true','Paid']],String(d.sickPaid))+select('timeoffPaid','Time-off default',[['false','Unpaid'],['true','Paid']],String(d.timeoffPaid))+'<p>Changes apply to new shifts and new absence requests. Existing shifts keep their saved rate; edit a shift to adjust it. Every absence can be overridden individually.</p>',{kind:'defaults',person:id});
    }
  }
  function submit(v){
    if(!form)throw Error('Reopen the scheduling form.');
    const action={type:'schedule:'+form.kind,id:form.id||crypto.randomUUID()};
    if(form.kind==='timeoff')Object.assign(action,{from:v.from,to:v.to,note:v.note});
    if(form.kind==='report')Object.assign(action,{shiftId:form.shiftId,kind:form.reportKind,minutes:Number(v.minutes),note:v.note});
    if(form.kind==='swap')Object.assign(action,{shiftId:form.shiftId,targetId:v.targetId,note:v.note});
    if(form.kind==='review')Object.assign(action,{decision:v.decision||'approve',paid:v.paid==='true',minutes:Number(v.minutes),feedback:v.feedback});
    if(form.kind==='tips')Object.assign(action,{person:v.person||me(),date:v.date,amount:Number(v.amount)});
    if(form.kind==='defaults')Object.assign(action,{person:form.person,rate:Number(v.rate),sickPaid:v.sickPaid==='true',timeoffPaid:v.timeoffPaid==='true'});
    return action;
  }
  function onChange(t){
    if(t.id==='schedule-person'){selectedPerson=t.value;api.render();}
    if(form?.kind==='tips'&&t.closest('#editor-form')?.elements.namedItem('amount')&&['person','date'].includes(t.name)){
      const f=t.closest('form'),person=f.elements.namedItem('person')?.value||me(),date=f.elements.namedItem('date').value;
      f.elements.namedItem('amount').value=s().scheduling.tips.find(x=>x.person===person&&x.date===date)?.amount??0;
    }
  }
  return {render,summary,handle,submit,onChange,personal,requests,earnings,periodControls,screen:()=>screen,show:key=>{screen=route(key);if(screen==='shifts'){period='week';selectedPerson='';}}};
};
