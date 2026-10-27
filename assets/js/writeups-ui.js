/* Warnings and write-ups: written by the manager, reusable templates, issuing, acknowledgment and printing. */
globalThis.createWriteupsUI=function(api){
 'use strict';
 const B=Brigly,W=B.writeups,{e,button,badge,dateLabel}=api;
 const s=()=>api.state(),me=()=>B.actor(s().role,s().crewId,s().managerId),manager=()=>s().role==='manager';
 const name=id=>B.person(id)?.name||'Former team member';
 const long=d=>d?dateLabel(d,{month:'long',day:'numeric',year:'numeric'}):'';
 const plural=(n,word)=>n+' '+word+(n===1?'':'s');
 const act=(label,key,id='',style='secondary',extra='')=>button(label,'wu-'+key,id,extra,style);
 const kindTone=w=>w.kind==='warning'?'tone-amber':w.final?'tone-danger':'tone-orange';
 const statusTone=st=>st==='Acknowledged'?'tone-sage':st==='Issued'?'tone-orange':'';
 const statusLabel=st=>st==='Issued'?'Awaiting signature':st;
 const shiftText=x=>x?`${dateLabel(x.date,{weekday:'short',month:'short',day:'numeric'})} · ${x.service} ${x.start}–${x.end} · ${x.area}`:'';
 let filter='all',form=null;

 function section(){
  const st=s(),all=(st.writeups||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)),since=B.addDays(st.date,-90);
  const groups={all,warning:all.filter(w=>w.kind==='warning'),writeup:all.filter(w=>w.kind==='writeup'),Draft:all.filter(w=>w.status==='Draft'),Issued:all.filter(w=>w.status==='Issued')};
  const list=groups[filter]||all,on=all.filter(w=>w.status!=='Draft'&&w.date>=since);
  const tabs=`<div class="res-filter-bar" role="tablist" aria-label="Filter records">${[['all','All'],['warning','Warnings'],['writeup','Write-ups'],['Draft','Drafts'],['Issued','Awaiting signature']].map(([k,l])=>`<button type="button" class="notif-tab ${filter===k?'selected':''}" data-action="wu-filter" data-id="${k}" aria-pressed="${filter===k}"><span>${l}</span><em>${groups[k].length}</em></button>`).join('')}</div>`;
  const table=`<section class="panel mg-panel"><div class="panel-head"><div><h3>On file</h3><p>Drafts stay private. Issued records appear in the team member’s file for them to read and acknowledge.</p></div></div><div class="table-scroll"><table><thead><tr><th>TEAM MEMBER</th><th>RECORD</th><th>CATEGORY</th><th>DATE</th><th>STATUS</th><th></th></tr></thead><tbody>${list.map(w=>`<tr class="report-row-link" data-action="wu-view" data-id="${e(w.id)}"><td><strong>${e(name(w.person))}</strong><small class="table-detail">${e(B.person(w.person)?.role||'')}</small></td><td>${badge(W.label(w),kindTone(w))} <span class="wu-title">${e(w.title)}</span></td><td>${e(w.category)}</td><td>${dateLabel(w.date,{month:'short',day:'numeric',year:'numeric'})}</td><td>${badge(statusLabel(w.status),statusTone(w.status))}</td><td>${act(w.status==='Draft'?'Edit':'View',w.status==='Draft'?'edit':'view',w.id,'secondary small')}</td></tr>`).join('')||'<tr><td colspan="6">Nothing in this view.</td></tr>'}</tbody></table></div></section>`;
  const tpl=st.writeupMeta?.templates||[];
  const templates=`<section class="panel mg-panel"><div class="panel-head"><div><h3>Templates · ${tpl.length}</h3><p>Reusable wording for situations that come up often. {first}, {name} and {date} fill in when you use one; text in [brackets] has to be completed before issuing.</p></div>${act('+ New template','template-new','','small')}</div><div class="wu-templates">${tpl.map(t=>`<article><div><span class="badge ${t.kind==='warning'?'tone-amber':'tone-orange'}">${t.kind==='warning'?'Warning':'Write-up'}</span><small>${e(t.category)}</small></div><h4>${e(t.name)}</h4><p>${e(t.details.split('\n')[0])}</p><div class="card-actions">${act('Use','new','','secondary small',`data-template="${e(t.id)}"`)}${act('Edit','template-edit',t.id,'quiet small')}</div></article>`).join('')||'<div class="empty"><strong>No templates yet</strong>Save wording you use often.</div>'}</div></section>`;
  return tabs+table+templates;
 }
 // A person's records, for their HR file and their own file.
 function forPerson(pid,own=false){
  const list=(s().writeups||[]).filter(w=>w.person===pid&&(!own||w.status!=='Draft')).sort((a,b)=>b.date.localeCompare(a.date));
  return list.length?`<div class="mg-doc-list">${list.map(w=>`<div><span>${badge(W.label(w),kindTone(w))} ${e(w.title)} · ${dateLabel(w.date,{month:'short',day:'numeric',year:'numeric'})}</span>${act(own&&w.status==='Issued'?'Read & sign':statusLabel(w.status),'view',w.id,own&&w.status==='Issued'?'small':'quiet small')}</div>`).join('')}</div>`:`<p class="mg-perm-note">${own?'Nothing on file. Keep it up.':'No warnings or write-ups on file.'}</p>`;
 }
 const attention=()=>{const st=s(),waiting=(st.writeups||[]).filter(w=>w.status==='Issued'&&w.issuedAt<new Date(Date.now()-3*864e5).toISOString());
  return waiting.length?[{rank:3,tone:'slate',title:plural(waiting.length,'record')+' not acknowledged after 3 days',sub:waiting.map(w=>name(w.person)+' · '+W.label(w).toLowerCase()).join(', ')+' · follow up in person',acts:button('Open','mg-tab','writeups','','secondary small')}]:[];};

 function doc(w,print=false){
  const st=s(),p=st.team.find(x=>x.id===w.person),sh=st.shifts.find(x=>x.id===w.shiftId),field=(label,value)=>`<div><dt>${label}</dt><dd>${e(value||'—')}</dd></div>`;
  const prior=W.history(st,w.person,w.date).filter(x=>x.id!==w.id&&x.date<=w.date);
  return `<article class="wu-doc" data-kind="${w.kind}"><header class="wu-doc-head"><div><small>${e(W.restaurant)} · Employee record</small><h3>${e(W.label(w))}</h3><p>${e(w.title)} · ${e(w.category)}</p></div>${print?'':badge(statusLabel(w.status),statusTone(w.status))}</header><dl class="mg-facts wu-meta">${field('Team member',p?.name)}${field('Role · station',p?`${p.role} · ${p.area}`:'')}${field('Date of incident',long(w.date))}${field('Shift',shiftText(sh))}${w.witness?field('Witness',name(w.witness)):''}${field('Previous records · 12 months',prior.length?prior.map(x=>W.label(x)+' '+dateLabel(x.date)).join(', '):'None')}</dl><section><h4>What happened</h4><p class="text-block">${e(w.details)}</p></section>${w.expectations?`<section><h4>What we expect</h4><p class="text-block">${e(w.expectations)}</p></section>`:''}${w.nextStep?`<section><h4>If it happens again</h4><p class="text-block">${e(w.nextStep)}</p></section>`:''}<footer class="wu-sign"><div><span>Issued by</span><strong>${e(w.issuedBy?name(w.issuedBy):'Not issued yet')}</strong><small>${w.issuedAt?long(w.issuedAt.slice(0,10)):'Draft'}</small></div><div><span>Team member</span><strong>${w.ack?e(p?.name||''):'Awaiting acknowledgment'}</strong><small>${w.ack?'Acknowledged '+long(w.ack.at.slice(0,10)):''}</small>${w.ack?.comment?`<p class="wu-comment">“${e(w.ack.comment)}”</p>`:''}</div></footer><p class="wu-legal">Acknowledging confirms the team member received and read this record. It does not mean they agree with it.</p></article>`;
 }
 // The form: the manager writes it. Templates and dropdowns only save typing.
 function editor(w){
  const st=s(),people=st.team.filter(p=>p.active&&p.id!==me()).sort((a,b)=>a.name.localeCompare(b.name)),tpl=st.writeupMeta?.templates||[];
  const opt=(list,v)=>list.map(([k,l])=>`<option value="${e(k)}" ${k===v?'selected':''}>${e(l)}</option>`).join('');
  return `<div class="wu-kind" role="radiogroup" aria-label="Type of record">${W.kinds.map(([k,l])=>`<label class="${w.kind===k?'selected':''}"><input type="radio" name="kind" value="${k}" ${w.kind===k?'checked':''}><strong>${l}</strong><small>${k==='warning'?'A documented heads-up. Lighter, and often the first step.':'The formal record. Use it when a warning was not enough or the issue is serious.'}</small></label>`).join('')}</div>
  ${tpl.length?`<label>Start from a template<select name="template" data-wu-template><option value="">Blank</option>${tpl.map(t=>`<option value="${e(t.id)}" ${w.templateId===t.id?'selected':''}>${e(t.name)} · ${t.kind==='warning'?'Warning':'Write-up'}</option>`).join('')}</select></label>`:''}
  <div class="mg-form-grid"><label>Team member<select name="person" data-wu-refresh required>${opt(people.map(p=>[p.id,p.name+' · '+p.role]),w.person)}</select></label><label>Date of incident<input type="date" name="date" value="${e(w.date)}" data-wu-refresh required></label><label>Shift (optional)<select name="shiftId" data-wu-shifts>${shiftOptions(w.person,w.date,w.shiftId)}</select></label><label>Category<select name="category">${opt(W.categories.map(c=>[c,c]),w.category)}</select></label></div>
  <div class="wu-history" data-wu-history>${historyNote(w.person,w.id)}</div>
  <label>Title<input name="title" maxlength="120" required value="${e(w.title)}" placeholder="e.g. Late arrival"></label>
  <label>What happened<textarea name="details" rows="7" maxlength="5000" required placeholder="Dates, times and specific facts. What you saw or what was reported, and by whom.">${e(w.details)}</textarea></label>
  <label>What we expect<textarea name="expectations" rows="3" maxlength="2000" placeholder="What they need to do differently from now on">${e(w.expectations)}</textarea></label>
  <div class="mg-form-grid"><label>If it happens again<input name="nextStep" list="wu-next" maxlength="200" value="${e(w.nextStep)}" placeholder="Choose or type"><datalist id="wu-next">${W.nextSteps.map(x=>`<option value="${e(x)}">`).join('')}</datalist></label><label>Witness (optional)<select name="witness"><option value="">None</option>${opt(st.team.filter(p=>p.active).map(p=>[p.id,p.name]),w.witness)}</select></label></div>
  <label class="wu-final ${w.kind==='writeup'?'':'is-hidden'}"><input type="checkbox" name="final" value="yes" ${w.final?'checked':''}> This is a final write-up</label>
  <label>When you save<select name="issue"><option value="draft">Keep as a private draft</option><option value="issue">Issue it to the team member now</option></select></label>
  <p class="fin-note">Issued records can’t be edited and appear in the team member’s file. Talk it through in person when you issue it.</p>`;
 }
 function shiftOptions(pid,date,selected=''){
  const st=s(),list=st.shifts.filter(x=>x.person===pid&&x.date>=B.addDays(date||st.date,-3)&&x.date<=B.addDays(date||st.date,1)).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));
  return '<option value="">Not tied to a shift</option>'+list.map(x=>`<option value="${e(x.id)}" ${x.id===selected||(!selected&&x.date===date&&list.filter(y=>y.date===date).length===1)?'selected':''}>${e(shiftText(x))}</option>`).join('');
 }
 function historyNote(pid,except){
  const prior=W.history(s(),pid).filter(x=>x.id!==except);
  return prior.length?`<strong>On file for ${e(name(pid).split(' ')[0])} · last 12 months</strong><div class="mg-chips">${prior.map(x=>badge(`${W.label(x)} · ${x.category} · ${dateLabel(x.date)}`,kindTone(x))).join('')}</div>`:`<small class="table-detail">Nothing on file for ${e(name(pid).split(' ')[0])} in the last 12 months.</small>`;
 }
 function open(w,title){form={mode:'save',id:w.id};api.form(title,editor(w),'Save');}
 function blank(kind,person,template){
  const st=s(),pid=person||st.team.find(x=>x.active&&x.access==='crew')?.id,t=(st.writeupMeta?.templates||[]).find(x=>x.id===template),p=B.person(pid);
  return {id:crypto.randomUUID(),kind:t?.kind||kind||'warning',final:false,person:pid,category:t?.category||'Attendance',date:st.date,shiftId:'',title:t?.title||'',details:t?W.fill(t.details,p,st.date):'',expectations:t?W.fill(t.expectations,p,st.date):'',nextStep:t?.nextStep||'',witness:'',templateId:t?.id||''};
 }
 function templateForm(t){
  const opt=(list,v)=>list.map(([k,l])=>`<option value="${e(k)}" ${k===v?'selected':''}>${e(l)}</option>`).join('');
  return `<div class="mg-form-grid"><label>Template name<input name="name" maxlength="60" required value="${e(t.name)}"></label><label>Type<select name="kind">${opt(W.kinds,t.kind)}</select></label><label>Category<select name="category">${opt(W.categories.map(c=>[c,c]),t.category)}</select></label><label>Title<input name="title" maxlength="120" value="${e(t.title)}"></label></div><label>What happened<textarea name="details" rows="6" maxlength="5000">${e(t.details)}</textarea></label><label>What we expect<textarea name="expectations" rows="3" maxlength="2000">${e(t.expectations)}</textarea></label><label>If it happens again<input name="nextStep" list="wu-next-t" maxlength="200" value="${e(t.nextStep)}"><datalist id="wu-next-t">${W.nextSteps.map(x=>`<option value="${e(x)}">`).join('')}</datalist></label><p class="fin-note">Use {first}, {name} and {date} for details that change. Put anything the manager must fill in between [brackets].</p>`;
 }
 function handle(action,id,data={}){
  const st=s();
  if(action==='filter'){filter=id;api.render();return;}
  if(action==='new'){open(blank(data.kind,data.person,data.template),data.kind==='writeup'?'New write-up':'New record');return;}
  if(action==='edit'){const w=st.writeups.find(x=>x.id===id);open(w,'Edit · '+name(w.person));return;}
  if(action==='view'){
   const w=st.writeups.find(x=>x.id===id);if(!w)return;
   if(!manager()&&w.person===me()&&w.status==='Issued'){form={mode:'ack',id};api.form('Your '+W.label(w).toLowerCase(),doc(w)+`<label>Your comments (optional)<textarea name="comment" maxlength="1000" placeholder="Add your side or anything your manager should know"></textarea></label>`,'I’ve read this');return;}
   api.open(W.label(w),doc(w)+`<div class="card-actions">${manager()&&w.status==='Draft'?act('Edit','edit',w.id,'')+act('Issue now','issue',w.id,'secondary')+act('Delete draft','delete',w.id,'quiet'):''}${act('Print or save as PDF','print',w.id,'secondary')}</div>`);return;
  }
  if(action==='issue'){const w=st.writeups.find(x=>x.id===id);if(api.commit({...w,type:'writeup:save',issue:true},`${W.label(w)} issued to ${name(w.person)}.`))api.close();return;}
  if(action==='delete'){if(api.commit({type:'writeup:delete',id},'Draft deleted.'))api.close();return;}
  if(action==='template-new'){form={mode:'template',id:crypto.randomUUID()};api.form('New template',templateForm({name:'',kind:'warning',category:'Attendance',title:'',details:'',expectations:'',nextStep:''}),'Save template');return;}
  if(action==='template-edit'){const t=st.writeupMeta.templates.find(x=>x.id===id);form={mode:'template',id};api.form('Edit template',templateForm(t)+`<div class="card-actions">${act('Delete template','template-delete',id,'quiet')}</div>`,'Save template');return;}
  if(action==='template-delete'){if(api.commit({type:'writeup:template-delete',id},'Template deleted.'))api.close();return;}
  if(action==='print'){
   const w=st.writeups.find(x=>x.id===id),win=window.open('','_blank');if(!win){api.notify('Allow pop-ups to print this record.');return;}
   win.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(W.label(w))} · ${e(name(w.person))}</title><style>body{font:14px/1.6 system-ui,sans-serif;color:#111;max-width:720px;margin:40px auto;padding:0 24px}small{color:#555;text-transform:uppercase;letter-spacing:.08em;font-size:11px}h3{font-size:26px;margin:4px 0 0}h4{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin:28px 0 6px}dl{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin:24px 0;padding:16px 0;border-block:1px solid #ddd}dt{font-size:11px;color:#555;text-transform:uppercase}dd{margin:2px 0 0;font-weight:600}.text-block{white-space:pre-wrap}.wu-sign{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:48px}.wu-sign div{border-top:1px solid #111;padding-top:8px;display:grid}.wu-sign span{font-size:11px;color:#555;text-transform:uppercase}.wu-legal{font-size:12px;color:#555;margin-top:24px}</style></head><body>${doc(w,true)}</body></html>`);
   win.document.close();win.focus();win.print();
  }
 }
 // Changing the person or date refreshes their shifts and history; a template fills the wording.
 function onChange(t){
  const f=t.closest?.('#editor-form');if(!f||!form||form.mode!=='save')return;
  if(t.name==='kind')for(const l of f.querySelectorAll('.wu-kind label'))l.classList.toggle('selected',l.querySelector('input').checked),f.querySelector('.wu-final').classList.toggle('is-hidden',f.elements.kind.value!=='writeup');
  if(t.hasAttribute('data-wu-refresh')){f.querySelector('[data-wu-shifts]').innerHTML=shiftOptions(f.elements.person.value,f.elements.date.value);f.querySelector('[data-wu-history]').innerHTML=historyNote(f.elements.person.value,form.id);}
  if(t.hasAttribute('data-wu-template')&&t.value){
   const tpl=s().writeupMeta.templates.find(x=>x.id===t.value),p=B.person(f.elements.person.value);if(!tpl)return;
   if((f.elements.details.value.trim()||f.elements.expectations.value.trim())&&!confirm('Replace the current wording with this template?')){t.value='';return;}
   for(const r of f.elements.kind)r.checked=r.value===tpl.kind;onChange(f.elements.kind[0]);
   f.elements.category.value=tpl.category;f.elements.title.value=tpl.title;f.elements.details.value=W.fill(tpl.details,p,f.elements.date.value);f.elements.expectations.value=W.fill(tpl.expectations,p,f.elements.date.value);f.elements.nextStep.value=tpl.nextStep;
  }
 }
 function submit(v){
  if(!form)throw Error('Reopen the form.');
  if(form.mode==='ack'){form.saved='Thanks. Your manager can see you’ve read it.';return {type:'writeup:ack',id:form.id,comment:v.comment||''};}
  if(form.mode==='template'){form.saved='Template saved.';return {type:'writeup:template-save',id:form.id,name:v.name,kind:v.kind,category:v.category,title:v.title,details:v.details,expectations:v.expectations,nextStep:v.nextStep};}
  form.saved=v.issue==='issue'?'Issued. It’s in their file now.':'Draft saved. Only managers can see it.';
  return {type:'writeup:save',id:form.id,kind:v.kind,final:v.final==='yes',person:v.person,date:v.date,shiftId:v.shiftId||'',category:v.category,title:v.title,details:v.details,expectations:v.expectations,nextStep:v.nextStep,witness:v.witness||'',templateId:v.template||'',issue:v.issue==='issue'};
 }
 return {section,forPerson,attention,handle,submit,onChange,saved:()=>form?.saved||'',count:()=>(s().writeups||[]).filter(w=>w.status!=='Acknowledged').length};
};
