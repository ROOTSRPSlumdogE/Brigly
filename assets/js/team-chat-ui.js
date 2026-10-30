/* Team chat UI: the messenger beside the alert bell, the Today card, and a composer for text, photos, voice notes and to-dos. */
globalThis.createTeamChatUI=function(api){
 const B=Brigly,{e}=api,s=()=>api.state(),manager=()=>s().role==='manager',me=()=>B.actor(s().role,s().crewId,s().managerId);
 const $=id=>document.getElementById(id),desktop=()=>matchMedia('(min-width:761px)').matches;
 const paths={team:'M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M2 21v-3a6 6 0 0 1 12 0v3 M17 4a4 4 0 0 1 0 8 M18 15a5 5 0 0 1 4 5',Floor:'M4 9h16 M6 9v11 M18 9v11 M8 5h8',Bar:'M5 4h14l-7 8z M12 12v8 M8 20h8',Kitchen:'M4 11h16v2a7 7 0 0 1-7 7h-2a7 7 0 0 1-7-7z M9 7c0-2 2-2 2-4 M14 7c0-2 2-2 2-4',chat:'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z',photo:'M4 8h3l2-3h6l2 3h3v11H4z M12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7',mic:'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3 M5 11a7 7 0 0 0 14 0 M12 18v3',send:'M4 12 20 4l-4 16-4-7z M12 13l8-9',todo:'M4 5h16v14H4z M8 12l3 3 5-6',play:'M8 5v14l11-7z',pause:'M7 5h3v14H7z M14 5h3v14h-3z'};
 const icon=(key,fill=false)=>`<svg viewBox="0 0 24 24" fill="${fill?'currentColor':'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[key]||paths.chat}"/></svg>`;
 const MAX_VOICE=180;
 let active='team',pane='list',picking=false,todoMode=false,pending=null,fileThread='',quick='',signature='',shown='',stick=true,busy=false,reading=false,playing=null,rec=null;
 const drafts={};

 // Photos and voice notes live in this browser's IndexedDB; messages only carry a reference to them.
 const media=(()=>{let db;const urls=new Map(),memory=new Map();
  const open=()=>db||(db=new Promise((ok,fail)=>{try{const r=indexedDB.open('brigly-chat-media',1);r.onupgradeneeded=()=>r.result.createObjectStore('media');r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);}catch(err){fail(err);}}));
  const run=async(mode,fn)=>{const d=await open();return new Promise((ok,fail)=>{const t=d.transaction('media',mode),req=fn(t.objectStore('media'));t.oncomplete=()=>ok(req.result);t.onerror=()=>fail(t.error);});};
  return {
   cached:id=>urls.get(id)||'',
   async put(id,blob){memory.set(id,blob);try{await run('readwrite',x=>x.put(blob,id));return true;}catch{return false;}},
   async url(m){if(m.media.src)return m.media.src;const id=m.media.id;if(urls.has(id))return urls.get(id);let blob=memory.get(id);if(!blob)try{blob=await run('readonly',x=>x.get(id));}catch{}if(!blob)return '';const u=URL.createObjectURL(blob);urls.set(id,u);return u;},
   async remove(id){memory.delete(id);if(urls.has(id))URL.revokeObjectURL(urls.get(id));urls.delete(id);try{await run('readwrite',x=>x.delete(id));}catch{}}
  };})();

 const pad=n=>String(n).padStart(2,'0');
 const clock=iso=>{const d=new Date(iso);return pad(d.getHours())+':'+pad(d.getMinutes());};
 const day=iso=>B.dateString(new Date(iso)),today=()=>B.dateString(new Date());
 const dayLabel=iso=>{const k=day(iso);return k===today()?'Today':k===B.addDays(today(),-1)?'Yesterday':api.dateLabel(k,{weekday:'long',month:'short',day:'numeric'});};
 const when=iso=>{if(!iso)return '';const k=day(iso);return k===today()?clock(iso):k===B.addDays(today(),-1)?'Yesterday':api.dateLabel(k);};
 const length=sec=>{sec=Math.round(sec||0);return Math.floor(sec/60)+':'+pad(sec%60);};
 const first=id=>(B.person(id)?.name||'Team member').split(' ')[0];
 const other=thread=>thread.slice(3).split(':').find(id=>id!==me());
 const stationTone=area=>area==='Bar'?'orange':area==='Kitchen'?'slate':'sage';
 function meta(thread){
  const n=B.chat.members(s(),thread).length;
  if(thread==='team')return {title:'Whole team',to:'the whole team',sub:n+' people · everyone on the team',avatar:icon('team'),tone:'orange'};
  if(thread.startsWith('station:')){const area=thread.slice(8);return {title:area+' crew',to:'the '+area.toLowerCase()+' crew',sub:n+' people · '+area+' station and managers',avatar:icon(area),tone:stationTone(area)};}
  if(thread.startsWith('role:')){const role=thread.slice(5);const tone=role==='Server'?'amber':role==='Bartender'?'orange':(role.toLowerCase().includes('chef')||role.toLowerCase().includes('cook'))?'slate':'purple';return {title:role+' Chat',to:role.toLowerCase()+'s only',sub:n+' '+(n===1?'person':'people')+' · strictly '+role+' role',avatar:icon('chat'),tone};}
  const p=B.person(other(thread));return {title:p?.name||'Team member',to:p?.name.split(' ')[0]||'them',sub:(p?.role||'Team member')+(p?.active===false?' · no longer on the team':''),avatar:e(p?.initials||'TM'),tone:'slate'};
 }
 function snippet(m,thread){
  if(!m)return 'No messages yet';if(m.deleted)return 'Message removed';
  const who=m.author===me()?'You: ':thread.startsWith('dm:')?'':first(m.author)+': ';
  return who+(m.kind==='image'?'Photo'+(m.body?' · '+m.body:''):m.kind==='voice'?'Voice note · '+length(m.media.duration):m.kind==='todo'?'To-do: '+m.body:m.body);
 }
 const avatar=(thread,cls='')=>{const x=meta(thread);return `<span class="chat-avatar ${cls}" data-tone="${x.tone}">${x.avatar}</span>`;};

 function threadList(){
  const st=s();
  if(picking){
   const people=st.team.filter(p=>p.active&&p.id!==me()).sort((a,b)=>a.name.localeCompare(b.name));
   return `<div class="chat-list-label"><button type="button" class="chat-list-back" data-action="chat-pick-cancel" aria-label="Back to conversations">‹</button><span>New message</span></div>`+people.map(p=>`<button type="button" class="chat-thread" data-action="chat-dm" data-id="${e(p.id)}"><span class="chat-avatar" data-tone="${stationTone(p.area)}">${e(p.initials)}</span><span class="chat-thread-text"><strong>${e(p.name)}</strong><small>${e(p.role||'')}${p.area?' · '+e(p.area):''}${p.access==='manager'?' · Manager':''}</small></span></button>`).join('');
  }
  const list=B.chat.threads(st,undefined,true);
  if(active.startsWith('dm:')&&!list.some(t=>t.id===active))list.push({id:active,channel:false,last:null,unread:0});
  const row=t=>{const x=meta(t.id);return `<button type="button" class="chat-thread ${t.id===active?'active':''} ${t.unread?'unread':''}" data-action="chat-thread" data-id="${e(t.id)}" ${t.id===active?'aria-current="true"':''}>${avatar(t.id)}<span class="chat-thread-text"><span class="chat-thread-top"><strong>${e(x.title)}</strong><small>${e(when(t.last?.at))}</small></span><span class="chat-thread-bottom"><small>${e(snippet(t.last,t.id))}</small>${t.unread?`<em aria-label="${t.unread} unread">${t.unread}</em>`:''}</span></span></button>`;};
  const teamChannels=list.filter(t=>t.id==='team'||t.id.startsWith('station:'));
  const roleChannels=list.filter(t=>t.id.startsWith('role:'));
  const dms=list.filter(t=>t.id.startsWith('dm:'));
  return `<p class="chat-list-label">Team &amp; station channels</p>${teamChannels.map(row).join('')}${roleChannels.length?`<p class="chat-list-label">Role channels</p>${roleChannels.map(row).join('')}`:''}<p class="chat-list-label">Direct messages</p>${dms.map(row).join('')||'<p class="chat-list-empty">Message anyone on the team privately.</p>'}<button type="button" class="chat-new-link" data-action="chat-new">+ New message</button>`;
 }
 function head(){
  const x=meta(active),people=B.chat.members(s(),active);
  return `<button type="button" class="chat-back" data-action="chat-back" aria-label="Back to conversations">‹</button>${avatar(active)}<div class="chat-conv-title"><strong>${e(x.title)}</strong><small>${e(x.sub)}</small></div>${active.startsWith('dm:')?'':`<span class="avatar-stack chat-members" aria-hidden="true">${people.slice(0,5).map(id=>`<span>${e(B.person(id)?.initials||'TM')}</span>`).join('')}</span>`}<button type="button" class="icon-button chat-close" data-action="chat-close" aria-label="Close team chat">×</button>`;
 }
 const wave=id=>{let h=7;for(const c of id)h=(h*31+c.charCodeAt(0))>>>0;return Array.from({length:30},()=>{h=(h*1103515245+12345)>>>0;return `<i style="height:${28+h%72}%"></i>`;}).join('');};
 function mediaImg(m,alt){const u=m.media.src||media.cached(m.media.id);return `<img ${u?`src="${e(u)}"`:''} data-media="${e(m.id)}" alt="${e(alt)}" ${m.media.width&&m.media.height?`style="aspect-ratio:${m.media.width}/${m.media.height}"`:''} loading="lazy">`;}
 function content(m){
  const p=B.person(m.author);
  if(m.deleted)return '<p class="chat-removed">Message removed</p>';
  if(m.kind==='image')return `<button type="button" class="chat-photo" data-action="chat-photo-view" data-id="${e(m.id)}" aria-label="Open photo from ${e(p?.name||'Team member')}">${mediaImg(m,'Photo from '+(p?.name||'Team member'))}</button>${m.body?`<p>${e(m.body)}</p>`:''}`;
  if(m.kind==='voice'){const on=playing?.id===m.id&&!playing.paused;return `<div class="chat-voice" data-voice="${e(m.id)}"><button type="button" class="chat-play" data-action="chat-play" data-id="${e(m.id)}" aria-label="${on?'Pause':'Play'} voice note">${icon(on?'pause':'play',true)}</button><span class="chat-wave" aria-hidden="true">${wave(m.id)}</span><small>${length(m.media.duration)}</small></div>`;}
  if(m.kind==='todo'){const t=m.todo,can=!t.for||t.for===me()||m.author===me()||manager(),late=!t.done&&t.due&&t.due<today();
   return `<div class="chat-todo ${t.done?'done':''} ${late?'late':''}"><span class="chat-todo-label">${icon('todo')}To-do${t.for?' for '+(t.for===me()?'you':e(first(t.for))):''}${t.due?' · '+(late?'overdue since ':'due ')+e(api.dateLabel(t.due,{weekday:'short',month:'short',day:'numeric'})):''}</span><p>${e(m.body)}</p><div class="chat-todo-foot">${can?`<button type="button" class="chat-todo-check" data-action="chat-todo" data-id="${e(m.id)}" aria-pressed="${t.done}">${t.done?'✓ Done':'Mark done'}</button>`:''}${t.done?`<small>${t.by===me()?'You':e(first(t.by))} checked this off · ${e(when(t.doneAt))}</small>`:''}</div></div>`;}
  return `<p>${e(m.body)}</p>`;
 }
 function messageList(){
  const st=s(),list=B.chat.messages(st,active),channel=!active.startsWith('dm:'),x=meta(active);
  const intro=`<div class="chat-intro">${avatar(active,'large')}<strong>${e(x.title)}</strong><p>${channel?(active.startsWith('role:')?'Role-specific peer channel: Only active teammates with the exact <strong>'+e(active.slice(5))+'</strong> role can see or send messages here.':'Everyone in this channel sees these messages. Share updates, photos and voice notes with '+e(x.to)+'.'):'Only you and '+e(x.to)+' can see this conversation.'}</p></div>`;
  const seenAt=channel?'':B.chat.seen(st,other(active),active),lastMine=[...list].reverse().find(m=>m.author===me()&&!m.deleted);
  let html=intro,prev=null;
  for(const m of list){
   if(!prev||day(prev.at)!==day(m.at))html+=`<div class="chat-day"><span>${e(dayLabel(m.at))}</span></div>`;
   const mine=m.author===me(),grouped=prev&&prev.author===m.author&&day(prev.at)===day(m.at)&&new Date(m.at)-new Date(prev.at)<5*60000,p=B.person(m.author);
   const receipt=m===lastMine&&!channel?(seenAt>=m.at?'Seen':'Sent'):'';
   html+=`<div class="chat-msg ${mine?'mine':'theirs'}${grouped?' grouped':''} kind-${m.kind}${m.deleted?' is-removed':''}" data-msg="${e(m.id)}">${!mine&&channel?`<span class="chat-avatar small" data-tone="${stationTone(p?.area)}" aria-hidden="true">${grouped?'':e(p?.initials||'TM')}</span>`:''}<div class="chat-bubble-wrap">${!mine&&channel&&!grouped?`<span class="chat-author">${e(p?.name||'Team member')}<small>${e(p?.role||'')}</small></span>`:''}<div class="chat-bubble">${content(m)}</div><span class="chat-meta"><time datetime="${e(m.at)}">${clock(m.at)}</time>${receipt?`<span>· ${receipt}</span>`:''}${!m.deleted&&(mine||manager())?`<button type="button" class="chat-remove" data-action="chat-delete" data-id="${e(m.id)}">Remove</button>`:''}</span></div></div>`;
   prev=m;
  }
  return html;
 }
 function hydrate(root){
  for(const img of root?.querySelectorAll('img[data-media]:not([src])')||[]){
   const m=s().chat.messages.find(x=>x.id===img.dataset.media);if(!m?.media)continue;
   media.url(m).then(u=>{if(u)img.src=u;else img.closest('.chat-photo,.home-chat-thumb')?.classList.add('missing');});
  }
 }
 function composer(){
  const form=$('chat-composer'),box=$('chat-input'),x=meta(active),dmThread=active.startsWith('dm:');
  box.placeholder=todoMode?'Describe the to-do…':pending?'Add a caption…':'Message '+x.to+'…';
  $('chat-todo-btn').hidden=!manager();if(!manager())todoMode=false;
  $('chat-todo-btn').setAttribute('aria-pressed',String(todoMode));
  $('chat-todo-options').hidden=!todoMode;
  const pick=$('chat-todo-for');pick.parentElement.hidden=dmThread;
  if(todoMode&&dmThread)$('chat-todo-who').textContent='To-do for '+x.to;
  else if(todoMode){const keep=pick.value;$('chat-todo-who').textContent='To-do';pick.innerHTML='<option value="">Anyone in '+e(x.title)+'</option>'+B.chat.members(s(),active).filter(id=>id!==me()).map(id=>`<option value="${e(id)}">${e(B.person(id)?.name||id)}</option>`).join('');pick.value=[...pick.options].some(o=>o.value===keep)?keep:'';}
  $('chat-attachment').hidden=!pending;if(pending)$('chat-attachment-img').src=pending.url;
  form.classList.toggle('has-content',Boolean(box.value.trim()||pending||todoMode));
  box.style.height='auto';const fit=box.scrollHeight+box.offsetHeight-box.clientHeight;box.style.height=Math.min(fit,140)+'px';box.style.overflowY=fit>140?'auto':'hidden';
 }
 function markRead(){
  const st=s();if(reading||!$('chat-dialog').open||(!desktop()&&pane!=='thread')||document.visibilityState==='hidden'||!B.chat.unread(st,me(),active))return;
  reading=true;setTimeout(()=>{reading=false;api.commit({type:'chat:read',thread:active},null);},0);
 }
 function paint(){
  const st=s(),total=B.chat.threads(st,undefined,true).reduce((n,t)=>n+t.unread,0),badge=$('chat-badge');
  badge.textContent=String(total);badge.hidden=!total;$('chat-btn').setAttribute('aria-label',total?`Open team chat, ${total} unread`:'Open team chat');
  hydrate($('view'));
  const dialog=$('chat-dialog');if(!dialog.open)return;
  if(!B.chat.members(st,active).includes(me())){active='team';pane=desktop()?'thread':'list';}
  $('chat-shell').dataset.pane=pane;
  $('chat-thread-list').innerHTML=threadList();
  $('chat-conv-head').innerHTML=head();
  const box=$('chat-messages'),sig=JSON.stringify([active,me(),B.chat.messages(st,active),active.startsWith('dm:')&&B.chat.seen(st,other(active),active),playing&&[playing.id,playing.paused]]);
  if(sig!==signature){const switched=shown!==active+'|'+me();box.innerHTML=messageList();hydrate(box);if(switched||stick)box.scrollTop=box.scrollHeight;signature=sig;shown=active+'|'+me();}
  composer();markRead();
 }
 function open(thread){
  $('notif-dialog')?.close();$('app-menu')?.close();
  if(thread&&B.chat.members(s(),thread).includes(me()))select(thread);else{picking=false;pane=desktop()?'thread':'list';}
  if(!$('chat-dialog').open)$('chat-dialog').showModal();
  stick=true;signature='';paint();
  if(desktop()||pane==='thread')$('chat-input').focus({preventScroll:true});
 }
 function select(thread){
  drafts[active]=$('chat-input').value;active=thread;pane='thread';picking=false;
  $('chat-input').value=drafts[thread]||'';if(todoMode&&!manager())todoMode=false;stick=true;
 }
 const uid=()=>crypto.randomUUID();
 function compress(file){return new Promise((ok,fail)=>{
  if(!file.type.startsWith('image/'))return fail(Error('Choose a photo to send.'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);URL.revokeObjectURL(url);c.toBlob(blob=>blob?ok({blob,width:w,height:h,url:URL.createObjectURL(blob)}):fail(Error('This photo could not be prepared.')),'image/jpeg',.82);};
  img.onerror=()=>{URL.revokeObjectURL(url);fail(Error('This photo format can’t be opened here. Try a JPEG or PNG.'));};img.src=url;
 });}
 function clearPending(){if(pending)URL.revokeObjectURL(pending.url);pending=null;$('chat-file').value='';}
 async function sendMedia(kind,thread,blob,extra,body=''){
  const id=uid(),stored=await media.put(id,blob);
  const ok=api.commit({type:'chat:send',id,thread,kind,body,media:{id,...extra}},stored?null:(kind==='image'?'Photo':'Voice note')+' sent. Browser storage is full, so it only plays in this tab.');
  if(!ok)media.remove(id);stick=true;return ok;
 }
 async function send(){
  if(busy)return;const box=$('chat-input'),body=box.value.trim(),thread=active;
  if(!pending&&!body)return;
  busy=true;let ok=false;
  try{
   if(pending){const p=pending;ok=await sendMedia('image',thread,p.blob,{width:p.width,height:p.height},body);if(ok)clearPending();}
   else if(todoMode){ok=api.commit({type:'chat:send',id:uid(),thread,kind:'todo',body,due:$('chat-todo-due').value,for:thread.startsWith('dm:')?'':$('chat-todo-for').value},'To-do sent.');if(ok){todoMode=false;$('chat-todo-due').value='';}}
   else ok=api.commit({type:'chat:send',id:uid(),thread,kind:'text',body},null);
  }finally{busy=false;}
  if(ok){box.value='';drafts[thread]='';stick=true;paint();}
 }

 // Voice notes: tap the mic to record, then send or cancel.
 async function record(){
  if(rec)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){api.notify('Voice notes need a browser with microphone support.');return;}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}catch{api.notify('Allow microphone access to record a voice note.');return;}
  const type=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(t=>MediaRecorder.isTypeSupported?.(t));
  let recorder;try{recorder=new MediaRecorder(stream,type?{mimeType:type,audioBitsPerSecond:32000}:{});}catch{recorder=new MediaRecorder(stream);}
  const chunks=[];recorder.ondataavailable=ev=>{if(ev.data.size)chunks.push(ev.data);};
  rec={recorder,stream,chunks,thread:active,started:Date.now(),timer:setInterval(tick,250)};
  recorder.start(250);$('chat-composer').classList.add('is-recording');tick();
 }
 function tick(){if(!rec)return;const sec=(Date.now()-rec.started)/1000;$('chat-rec-time').textContent=length(sec);if(sec>=MAX_VOICE)finish(true);}
 function finish(sendIt){
  if(!rec)return;const r=rec,sec=(Date.now()-r.started)/1000;rec=null;clearInterval(r.timer);$('chat-composer').classList.remove('is-recording');
  r.recorder.onstop=()=>{r.stream.getTracks().forEach(t=>t.stop());if(!sendIt)return;if(sec<1){api.notify('Hold on a little longer to record a voice note.');return;}sendMedia('voice',r.thread,new Blob(r.chunks,{type:r.recorder.mimeType||'audio/webm'}),{duration:sec}).then(()=>paint());};
  try{r.recorder.stop();}catch{r.stream.getTracks().forEach(t=>t.stop());}
 }
 const audio=new Audio();
 const progress=()=>{if(!playing)return;const m=s().chat.messages.find(x=>x.id===playing.id),total=m?.media?.duration||audio.duration||1,bars=document.querySelectorAll(`[data-voice="${CSS.escape(playing.id)}"] .chat-wave i`),n=Math.round(Math.min(1,audio.currentTime/total)*bars.length);bars.forEach((b,i)=>b.classList.toggle('played',i<n));};
 audio.addEventListener('timeupdate',progress);
 audio.addEventListener('play',()=>{if(playing){playing.paused=false;paint();}});
 audio.addEventListener('pause',()=>{if(playing&&!audio.ended){playing.paused=true;paint();progress();}});
 audio.addEventListener('ended',()=>{playing=null;paint();});
 async function play(id){
  if(playing?.id===id){audio.paused?audio.play():audio.pause();return;}
  const m=s().chat.messages.find(x=>x.id===id);if(!m?.media)return;
  const u=await media.url(m);if(!u){api.notify('This voice note is only available on the device that recorded it.');return;}
  audio.src=u;playing={id,paused:false};audio.play().catch(()=>{playing=null;paint();api.notify('This voice note could not be played.');});paint();
 }

 // Today: unread conversations, the latest team messages and a quick reply to everyone. To-dos for you sit in Today's "Up next" list.
 function card(){
  const st=s(),list=B.chat.threads(st),total=list.reduce((n,t)=>n+t.unread,0),open=B.chat.todos(st),waiting=open.filter(m=>m.author===me()&&m.todo.for!==me());
  const recent=B.chat.messages(st,'team').filter(m=>!m.deleted).slice(-3),others=list.filter(t=>t.id!=='team'&&t.unread);
  const row=m=>`<button type="button" class="home-chat-msg ${m.author!==me()&&m.at>B.chat.seen(st,me(),'team')?'unread':''}" data-action="chat-open" data-id="team"><span class="chat-avatar small" data-tone="${stationTone(B.person(m.author)?.area)}">${e(B.person(m.author)?.initials||'TM')}</span><span class="home-chat-text"><span><strong>${m.author===me()?'You':e(first(m.author))}</strong><small>${e(when(m.at))}</small></span><span>${e(m.deleted?'':m.kind==='image'?(m.body||'Shared a photo'):m.kind==='voice'?'Voice note · '+length(m.media.duration):m.kind==='todo'?'To-do: '+m.body:m.body)}</span></span>${m.kind==='image'?`<span class="home-chat-thumb">${mediaImg(m,'')}</span>`:''}</button>`;
  return `<section class="td-card td-chat home-chat"><header class="td-card-head"><h2>Team chat</h2><div class="td-card-meta">${total?`<span class="td-tag" data-tone="orange">${total} unread</span>`:'<span class="td-tag" data-tone="sage">All read</span>'}</div></header>`
   +(others.length?`<div class="home-chat-unread">${others.map(t=>`<button type="button" class="home-chat-chip" data-action="chat-open" data-id="${e(t.id)}">${avatar(t.id,'tiny')}<span>${e(meta(t.id).title)}</span><em>${t.unread}</em></button>`).join('')}</div>`:'')
   +`<div class="home-chat-feed">${recent.length?recent.map(row).join(''):'<p class="td-empty">No team messages yet. Say hello to everyone on shift.</p>'}</div>`
   +`<form class="home-chat-quick"><input name="message" maxlength="2000" placeholder="Message the whole team…" aria-label="Message the whole team" autocomplete="off" value="${e(quick)}"><button type="button" class="home-chat-tool" data-action="chat-quick-photo" aria-label="Send a photo to the whole team">${icon('photo')}</button><button type="submit" class="home-chat-send" aria-label="Send to the whole team">${icon('send')}</button></form>`
   +`<footer class="td-card-foot">${waiting.length?`<button type="button" class="td-link" data-action="chat-open" data-id="${e(waiting[0].thread)}">${waiting.length} to-do${waiting.length===1?'':'s'} waiting on the team<span aria-hidden="true">›</span></button>`:''}<button type="button" class="td-link" data-action="chat-open" data-id="">Open team chat<span aria-hidden="true">›</span></button></footer></section>`;
 }

 function handle(a,id,target){
  if(a==='open'){open(id);return;}
  if(a==='close'){$('chat-dialog').close();return;}
  if(a==='thread'){select(id);paint();if(desktop())$('chat-input').focus({preventScroll:true});return;}
  if(a==='dm'){if(id&&id!==me())open(B.chat.dm(me(),id));return;}
  if(a==='back'){drafts[active]=$('chat-input').value;pane='list';paint();return;}
  if(a==='new'){picking=true;pane='list';paint();return;}
  if(a==='pick-cancel'){picking=false;paint();return;}
  if(a==='photo'||a==='quick-photo'){fileThread=a==='photo'?active:'team';$('chat-file').click();return;}
  if(a==='todo-toggle'){todoMode=!todoMode;if(todoMode)clearPending();composer();$('chat-input').focus();return;}
  if(a==='attach-clear'){clearPending();composer();return;}
  if(a==='record'){record();return;}
  if(a==='rec-stop'){finish(true);return;}
  if(a==='rec-cancel'){finish(false);return;}
  if(a==='play'){play(id);return;}
  if(a==='todo'){const m=s().chat.messages.find(x=>x.id===id);api.commit({type:'chat:todo',id},m?.todo?.done?'To-do reopened.':'Nice work — to-do done.');return;}
  if(a==='delete'){
   if(target.dataset.confirm!=='true'){target.dataset.confirm='true';target.textContent='Tap again to remove';setTimeout(()=>{if(target.isConnected){target.dataset.confirm='';target.textContent='Remove';}},3000);return;}
   const m=s().chat.messages.find(x=>x.id===id);if(api.commit({type:'chat:delete',id},'Message removed.')&&m?.media?.id)media.remove(m.media.id);return;
  }
  if(a==='photo-view'){const img=target.querySelector('img');if(!img?.src)return;$('chat-lightbox-img').src=img.src;$('chat-lightbox-img').alt=img.alt;$('chat-lightbox').hidden=false;$('chat-lightbox').querySelector('button').focus();return;}
  if(a==='lightbox-close'){$('chat-lightbox').hidden=true;return;}
 }

 const box=$('chat-input'),list=$('chat-messages');
 box.addEventListener('input',()=>{drafts[active]=box.value;composer();});
 box.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey&&!ev.isComposing&&matchMedia('(hover:hover)').matches){ev.preventDefault();send();}});
 $('chat-composer').addEventListener('submit',ev=>{ev.preventDefault();send();});
 $('chat-file').addEventListener('change',async ev=>{
  const file=ev.target.files?.[0];if(!file)return;
  if(file.size>30*1024*1024){api.notify('That photo is too large. Choose one under 30 MB.');ev.target.value='';return;}
  try{const prepared=await compress(file);clearPending();pending=prepared;todoMode=false;open(fileThread||active);$('chat-input').focus();}catch(err){api.notify(err.message);ev.target.value='';}
 });
 list.addEventListener('scroll',()=>{stick=list.scrollHeight-list.scrollTop-list.clientHeight<80;},{passive:true});
 list.addEventListener('load',()=>{if(stick)list.scrollTop=list.scrollHeight;},true);
 // Tap a message to reveal its time and actions on touch screens.
 list.addEventListener('click',ev=>{if(ev.target.closest('button'))return;const msg=ev.target.closest('.chat-msg');if(!msg)return;for(const x of list.querySelectorAll('.chat-msg.is-selected'))if(x!==msg)x.classList.remove('is-selected');msg.classList.toggle('is-selected');});
 $('chat-dialog').addEventListener('cancel',ev=>{if(!$('chat-lightbox').hidden){ev.preventDefault();$('chat-lightbox').hidden=true;}});
 $('chat-dialog').addEventListener('close',()=>{finish(false);if(playing)audio.pause();$('chat-lightbox').hidden=true;drafts[active]=box.value;});
 $('chat-dialog').addEventListener('click',ev=>{if(ev.target===$('chat-dialog'))$('chat-dialog').close();});
 document.addEventListener('visibilitychange',markRead);
 document.addEventListener('input',ev=>{if(ev.target.closest('.home-chat-quick'))quick=ev.target.value;});
 document.addEventListener('submit',ev=>{
  if(!ev.target.matches('.home-chat-quick'))return;ev.preventDefault();
  const body=quick.trim();if(!body)return;quick='';
  if(api.commit({type:'chat:send',id:uid(),thread:'team',kind:'text',body},'Sent to the whole team.'))document.querySelector('.home-chat-quick input')?.focus({preventScroll:true});else quick=body;
 });
 return {paint,card,open,handle};
};
