/* Warnings and write-ups: records a manager writes, issues and keeps on file, acknowledged by the team member. */
(function(){
 'use strict';
 const B=Brigly,prev={change:B.change,starter:B.starter,load:B.load};
 const copy=x=>globalThis.Brigly.clone(x);
 // A warning is a documented heads-up; a write-up is the formal record, and can be the final one.
 const kinds=[['warning','Warning'],['writeup','Write-up']];
 const categories=['Attendance','Punctuality','Conduct','Performance','Policy','Safety & hygiene','Cash handling','Guest complaint','Other'];
 const nextSteps=['Another warning','A write-up','A final write-up','Suspension','Termination of employment'];
 const restaurant='The Copper Room';
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const id=x=>typeof x==='string'&&/^[\w-]{1,80}$/.test(x);
 const label=w=>w.kind==='warning'?'Warning':w.final?'Final write-up':'Write-up';
 const fill=(text,p,date)=>String(text||'').replaceAll('{first}',p?.name.split(' ')[0]||'').replaceAll('{name}',p?.name||'').replaceAll('{date}',date?new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'');
 // Records on file in the last 12 months, newest first.
 const history=(s,person,before=s.date)=>(s.writeups||[]).filter(w=>w.person===person&&w.status!=='Draft'&&w.date>=B.addDays(before,-365)).sort((a,b)=>b.date.localeCompare(a.date));
 const starterTemplates=[
  {id:'tpl-late',name:'Late arrival',kind:'warning',category:'Punctuality',title:'Late arrival',details:'On {date}, {first} arrived late for their scheduled shift.\n\nOur attendance policy expects everyone to be clocked in and ready at the scheduled start time.',expectations:'Clock in at or before your scheduled start time. If something will make you late, message your manager before your shift starts.',nextStep:'A write-up'},
  {id:'tpl-noshow',name:'No-call no-show',kind:'writeup',category:'Attendance',title:'No-call no-show',details:'On {date}, {first} was scheduled to work and did not come in or let a manager know.',expectations:'If you cannot work a scheduled shift, tell your manager before it starts, every time, and request time off or a swap as early as you can.',nextStep:'A final write-up'},
  {id:'tpl-phone',name:'Phone on the floor',kind:'warning',category:'Policy',title:'Personal phone use during service',details:'On {date}, {first} was using their personal phone on the floor during service.',expectations:'Keep your phone in your locker or bag during service. Use it on breaks.',nextStep:'A write-up'},
  {id:'tpl-cash',name:'Cash drawer variance',kind:'writeup',category:'Cash handling',title:'Cash drawer short at close',details:'On {date}, {first}’s drawer was short at close. Amount: $[amount]. Counted by: [name].',expectations:'Count your drawer in and out with a manager and follow the cash handling procedure every shift.',nextStep:'A final write-up'},
  {id:'tpl-hygiene',name:'Food safety',kind:'writeup',category:'Safety & hygiene',title:'Food safety procedure not followed',details:'On {date}, {first} did not follow our food safety procedure: [what happened].',expectations:'Follow the food safety procedures you were trained on every time. Ask your manager if anything is unclear.',nextStep:'A final write-up'}
 ];

 // Records from before warnings and write-ups were split move across: lighter levels become warnings.
 function upgrade(state){
  const s=copy(state);s.writeups||=[];s.writeupMeta||={};s.writeupMeta.templates||=copy(starterTemplates);delete s.writeupMeta.dismissed;
  const cat={late:'Punctuality',noshow:'Attendance',clock:'Policy',performance:'Performance',conduct:'Conduct',policy:'Policy',other:'Other'};
  for(const w of s.writeups)if(w.level){
   Object.assign(w,{kind:['Coaching','Verbal warning'].includes(w.level)?'warning':'writeup',final:w.level==='Final warning',category:cat[w.type]||'Other',title:w.title||w.level,details:w.summary||'',nextStep:w.consequences||'',shiftId:''});
   for(const k of ['level','type','summary','consequences','incidents'])delete w[k];
  }
  return s;
 }
 function change(state,a,role=state.role){
  if(!a.type.startsWith('writeup:'))return prev.change(state,a,role);
  const s=upgrade(state),me=B.actor(role,s.crewId,s.managerId),manager=role==='manager',now=new Date().toISOString();
  const needManager=()=>{if(!manager)throw Error('Only managers can write up team members.');};
  const find=x=>{const w=s.writeups.find(y=>y.id===x);if(!w)throw Error('This record no longer exists.');return w;};
  if(a.type==='writeup:save'){
   needManager();
   if(!id(a.id))throw Error('This record could not be saved.');
   const p=s.team.find(x=>x.id===a.person);if(!p)throw Error('Choose a team member.');if(p.id===me)throw Error('Another manager must write you up.');
   if(!kinds.some(k=>k[0]===a.kind)||!categories.includes(a.category)||!B.isDate(a.date))throw Error('Choose the type, category and date.');
   if(!txt(a.title,120)||!a.title.trim())throw Error('Give it a short title.');
   if(!txt(a.details,5000)||!a.details.trim())throw Error('Describe what happened.');
   if(!txt(a.expectations||'',2000)||!txt(a.nextStep||'',200))throw Error('Keep the expectations and next step shorter.');
   if(a.shiftId&&!s.shifts.some(x=>x.id===a.shiftId&&x.person===p.id))throw Error('Choose one of their shifts.');
   if(a.witness&&(!s.team.some(x=>x.id===a.witness)||a.witness===p.id))throw Error('Choose a different witness.');
   if(a.issue&&/\[[^\]]+\]/.test(a.details+(a.expectations||'')))throw Error('Fill in the bracketed parts before issuing.');
   const old=s.writeups.find(x=>x.id===a.id);if(old&&old.status!=='Draft')throw Error('Issued records cannot be changed.');
   const item={id:a.id,kind:a.kind,final:a.kind==='writeup'&&!!a.final,person:p.id,category:a.category,date:a.date,shiftId:a.shiftId||'',title:a.title.trim(),details:a.details.trim(),expectations:(a.expectations||'').trim(),nextStep:(a.nextStep||'').trim(),witness:a.witness||'',templateId:a.templateId||'',status:a.issue?'Issued':'Draft',author:old?.author||me,createdAt:old?.createdAt||now,...(a.issue?{issuedAt:now,issuedBy:me}:{})};
   if(old)Object.assign(old,item);else s.writeups.push(item);
  }else if(a.type==='writeup:delete'){
   needManager();const w=find(a.id);if(w.status!=='Draft')throw Error('Issued records stay on file.');s.writeups=s.writeups.filter(x=>x!==w);
  }else if(a.type==='writeup:ack'){
   const w=find(a.id);if(w.person!==me)throw Error('Only the team member can acknowledge this.');
   if(w.status!=='Issued')throw Error('This was already acknowledged.');
   if(!txt(a.comment||'',1000))throw Error('Keep your comment under 1,000 characters.');
   w.status='Acknowledged';w.ack={at:now,comment:(a.comment||'').trim()};
  }else if(a.type==='writeup:template-save'){
   needManager();const list=s.writeupMeta.templates;
   if(!id(a.id)||!txt(a.name,60)||!a.name.trim())throw Error('Name the template.');
   if(!kinds.some(k=>k[0]===a.kind)||!categories.includes(a.category))throw Error('Choose the type and category.');
   if(!txt(a.title||'',120)||!txt(a.details||'',5000)||!txt(a.expectations||'',2000)||!txt(a.nextStep||'',200))throw Error('Keep the template shorter.');
   if(list.some(t=>t.id!==a.id&&t.name.toLowerCase()===a.name.trim().toLowerCase()))throw Error('A template already has that name.');
   const item={id:a.id,name:a.name.trim(),kind:a.kind,category:a.category,title:(a.title||'').trim(),details:(a.details||'').trim(),expectations:(a.expectations||'').trim(),nextStep:(a.nextStep||'').trim()};
   const old=list.find(t=>t.id===a.id);if(old)Object.assign(old,item);else if(list.length>=40)throw Error('Keep up to 40 templates.');else list.push(item);
  }else if(a.type==='writeup:template-delete'){
   needManager();s.writeupMeta.templates=s.writeupMeta.templates.filter(t=>t.id!==a.id);
  }else throw Error('Unknown change.');
  return s;
 }
 B.starter=(...args)=>upgrade(prev.starter(...args));
 B.load=storage=>upgrade(prev.load(storage));
 B.change=change;
 B.writeups={kinds,categories,nextSteps,label,fill,history,restaurant,starterTemplates};
})();
