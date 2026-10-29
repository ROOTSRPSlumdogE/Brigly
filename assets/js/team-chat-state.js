/* Team chat: one channel for everyone, one per station and direct messages — text, photos, voice notes and to-dos. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const clone=x=>globalThis.Brigly.clone(x);
 const kinds=['text','image','voice','todo'];
 const dm=(a,b)=>'dm:'+[a,b].sort().join(':');
 const threadShape=t=>typeof t==='string'&&(t==='team'||/^station:.{1,80}$/.test(t)||/^role:.{1,80}$/.test(t)||/^dm:[^:]{1,100}:[^:]{1,100}$/.test(t));
 function upgrade(s){
  s=clone(s);s.chat??={};s.chat.messages??=[];s.chat.reads??={};
  // Private notes and to-dos from earlier versions become direct messages between sender and recipient.
  if(Array.isArray(s.privateItems)){
   for(const x of s.privateItems){
    const id='private-'+x.id;if(s.chat.messages.some(m=>m.id===id)||x.author===x.recipient||!s.team.some(p=>p.id===x.author)||!s.team.some(p=>p.id===x.recipient))continue;
    const thread=dm(x.author,x.recipient);
    s.chat.messages.push({id,thread,author:x.author,at:x.created,kind:x.kind==='todo'?'todo':'text',body:x.body,...(x.kind==='todo'?{todo:{for:x.recipient,due:x.due||'',done:x.done,...(x.done?{by:x.recipient,doneAt:x.created}:{})}}:{})});
    if(x.read){const r=s.chat.reads[x.recipient]??={};if(!r[thread]||r[thread]<x.created)r[thread]=x.created;}
   }
   delete s.privateItems;
  }
  return s;
 }
 function members(s,thread){
  const active=s.team.filter(p=>p.active);
  if(thread==='team')return active.map(p=>p.id);
  if(thread.startsWith('station:')){const area=thread.slice(8);return s.setup.areas.includes(area)?active.filter(p=>p.access==='manager'||p.area===area).map(p=>p.id):[];}
  if(thread.startsWith('role:')){const role=thread.slice(5);return active.filter(p=>p.role===role).map(p=>p.id);}
  if(thread.startsWith('dm:')){const ids=thread.slice(3).split(':');return ids.length===2&&ids[0]!==ids[1]&&ids.every(id=>s.team.some(p=>p.id===id))?ids:[];}
  return [];
 }
 const messages=(s,thread)=>(s.chat?.messages||[]).filter(m=>m.thread===thread).sort((a,b)=>a.at.localeCompare(b.at));
 const seen=(s,person,thread)=>s.chat?.reads?.[person]?.[thread]||'';
 const unread=(s,person,thread)=>messages(s,thread).filter(m=>m.author!==person&&!m.deleted&&m.at>seen(s,person,thread)).length;
 // Channels first (team, then stations), then direct conversations by most recent message.
 function threads(s,role=s.role,includeRoles=false){
  const me=B.actor(role,s.crewId,s.managerId),ids=['team',...s.setup.areas.map(a=>'station:'+a)].filter(t=>members(s,t).includes(me));
  if(includeRoles){
   const roles=[...new Set(s.team.map(p=>p.role))];
   for(const r of roles){const t='role:'+r;if(members(s,t).includes(me)&&!ids.includes(t))ids.push(t);}
  }
  for(const m of s.chat?.messages||[]){
   if(m.thread.startsWith('dm:')&&!ids.includes(m.thread)&&m.thread.slice(3).split(':').includes(me)&&members(s,m.thread).length)ids.push(m.thread);
   if(includeRoles&&m.thread.startsWith('role:')&&!ids.includes(m.thread)&&members(s,m.thread).includes(me))ids.push(m.thread);
  }
  return ids.map(id=>{const list=messages(s,id);return {id,channel:!id.startsWith('dm:'),last:list.at(-1)||null,unread:unread(s,me,id)};})
   .sort((a,b)=>Number(b.channel)-Number(a.channel)||(a.channel?0:(b.last?.at||'').localeCompare(a.last?.at||'')));
 }
 // To-dos still open for this person, or the ones a manager sent and is waiting on.
 function todos(s,role=s.role){
  const me=B.actor(role,s.crewId,s.managerId);
  return (s.chat?.messages||[]).filter(m=>m.kind==='todo'&&!m.deleted&&!m.todo.done&&(m.todo.for===me||(role==='manager'&&m.author===me))).sort((a,b)=>(a.todo.due||'9999').localeCompare(b.todo.due||'9999')||a.at.localeCompare(b.at));
 }
 function validMessage(s,m){
  const person=id=>s.team.some(p=>p.id===id);
  if(!m||typeof m.id!=='string'||!m.id||m.id.length>100||!threadShape(m.thread)||!person(m.author)||typeof m.at!=='string'||m.at.length>40||!kinds.includes(m.kind)||typeof m.body!=='string'||m.body.length>2000)return false;
  if(m.deleted!==undefined&&m.deleted!==true)return false;
  if(m.deleted)return true;
  if(['text','todo'].includes(m.kind)&&!m.body.trim())return false;
  if(['image','voice'].includes(m.kind)){const x=m.media;if(!x||typeof x!=='object'||!((typeof x.id==='string'&&x.id.length<=100&&x.id)||(typeof x.src==='string'&&/^assets\/[\w\/.-]+$/.test(x.src))))return false;if(x.duration!==undefined&&!(typeof x.duration==='number'&&x.duration>=0&&x.duration<=600))return false;}
  if(m.kind==='todo'){const t=m.todo;if(!t||typeof t.done!=='boolean'||(t.due&&!B.isDate(t.due))||(t.for&&!person(t.for))||(t.by&&!person(t.by)))return false;}
  return true;
 }
 function valid(s){try{s=upgrade(s);if(!prev.valid(s))return false;const c=s.chat;
  return Array.isArray(c.messages)&&c.messages.length<=20000&&new Set(c.messages.map(m=>m.id)).size===c.messages.length&&c.messages.every(m=>validMessage(s,m))
   &&c.reads&&typeof c.reads==='object'&&!Array.isArray(c.reads)&&Object.entries(c.reads).every(([id,r])=>s.team.some(p=>p.id===id)&&r&&typeof r==='object'&&!Array.isArray(r)&&Object.entries(r).every(([t,at])=>threadShape(t)&&typeof at==='string'&&at.length<=40));
 }catch{return false;}}
 function change(state,action,role=state.role){
  let s=upgrade(state);const a=clone(action),me=B.actor(role,s.crewId,s.managerId),manager=role==='manager';
  if(!a?.type?.startsWith('chat:')){s=prev.change(s,a,role);if(!valid(s))throw Error('Check the team chat details.');return upgrade(s);}
  if(!s.team.some(p=>p.id===me&&p.active&&p.access===role))throw Error('Choose an active team member.');
  const now=new Date().toISOString();
  if(a.type==='chat:send'){
   const people=threadShape(a.thread)?members(s,a.thread):[];
   if(!people.includes(me))throw Error('You are not part of this conversation.');
   if(!people.every(id=>s.team.find(p=>p.id===id)?.active))throw Error('This team member is no longer active.');
   if(typeof a.id!=='string'||!a.id||a.id.length>100||s.chat.messages.some(m=>m.id===a.id))throw Error('This message already exists.');
   if(!kinds.includes(a.kind))throw Error('Choose a message type.');
   const body=typeof a.body==='string'?a.body.trim():'';if(body.length>2000)throw Error('Keep messages under 2,000 characters.');
   if(['text','todo'].includes(a.kind)&&!body)throw Error('Write a message first.');
   const m={id:a.id,thread:a.thread,author:me,at:now,kind:a.kind,body};
   if(['image','voice'].includes(a.kind)){if(typeof a.media?.id!=='string'||!a.media.id)throw Error('Attach a photo or voice note.');m.media={id:a.media.id};for(const k of ['duration','width','height'])if(typeof a.media[k]==='number'&&isFinite(a.media[k]))m.media[k]=Math.max(0,Math.round(a.media[k]*10)/10);if(m.media.duration>600)throw Error('Voice notes can be up to 10 minutes.');}
   if(a.kind==='todo'){
    if(!manager)throw Error('Only managers can send to-dos.');
    const other=a.thread.startsWith('dm:')?people.find(id=>id!==me):'',assignee=other||a.for||'';
    if(assignee&&!people.includes(assignee))throw Error('Choose someone in this conversation.');
    if(a.due&&!B.isDate(a.due))throw Error('Choose a valid due date.');
    m.todo={for:assignee,due:a.due||'',done:false};
   }
   s.chat.messages.push(m);(s.chat.reads[me]??={})[a.thread]=now;
  }else if(a.type==='chat:read'){
   if(!threadShape(a.thread)||!members(s,a.thread).includes(me))throw Error('You are not part of this conversation.');
   const last=messages(s,a.thread).at(-1)?.at||'',mark=last>now?last:now;(s.chat.reads[me]??={})[a.thread]=mark;
  }else{
   const m=s.chat.messages.find(x=>x.id===a.id);if(!m||m.deleted)throw Error('Message not found.');
   if(!members(s,m.thread).includes(me))throw Error('You are not part of this conversation.');
   if(a.type==='chat:todo'){
    if(m.kind!=='todo')throw Error('Only to-dos can be checked off.');
    if(m.todo.for&&m.todo.for!==me&&m.author!==me&&!manager)throw Error('Only '+(B.person(m.todo.for)?.name||'the assignee')+' or a manager can check this off.');
    m.todo.done=!m.todo.done;if(m.todo.done){m.todo.by=me;m.todo.doneAt=now;}else{delete m.todo.by;delete m.todo.doneAt;}
   }else if(a.type==='chat:delete'){
    if(m.author!==me&&!manager)throw Error('You can only remove your own messages.');
    m.deleted=true;m.body='';delete m.media;delete m.todo;
   }else throw Error('Unknown chat action.');
  }
  if(!valid(s))throw Error('Check the team chat details.');return s;
 }
 B.chat={dm,members,messages,threads,unread,todos,seen};
 B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{const s=upgrade(prev.load(storage));if(valid(s))return s;}catch{}return B.starter();};
})();
