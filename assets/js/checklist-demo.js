/* Demo-only checklist content: per-service templates, completion history, today's live progress, notes and staffing. Runs once per fictional workspace. */
(function(){
 const B=Brigly,prev={starter:B.starter,load:B.load};
 const copy=x=>JSON.parse(JSON.stringify(x)),pad=n=>String(n).padStart(2,'0');
 const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const slug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
 // Local wall-clock time on a service date; minutes may run past midnight.
 const at=(date,m)=>{const d=new Date(date+'T00:00:00');d.setMinutes(Math.round(m));return d;};
 const templates={
  Dinner:{
   Floor:{Opening:['Polish glassware & set the floor','Check reservations and table setup','Set 64 covers with dinner silverware & folded napkins','Light candles & switch dining room to evening lighting','Restock host stand: menus, wine lists, pens & crayons','Walk restrooms: soap, towels, fresh flowers','Line-up: specials, 86 list & allergy notes'],
    'Mid-shift':['Reset tables after the first seating','Restock server station: roll-ups, carafes, check presenters'],
    Closing:['Wipe & sanitize tables, booths and high chairs','Sweep & mop dining room and entryway','Clean and reset each station','Roll silverware for tomorrow’s lunch','Complete the final walkthrough & arm the alarm']},
   Bar:{Opening:['Restock the bar & prepare garnishes','Cut citrus, mint & apple garnishes','Fill ice wells & check the ice machine','Check draught lines & tap pressure','Batch Orchard old fashioned base (2 L)','Chill white, rosé & sparkling by-the-glass'],
    'Mid-shift':['Empty dump sink strainer & refresh ice','Restock glass racks from dish'],
    Closing:['Cap taps & soak nozzles','Burn ice wells & flush floor drains','Wash, polish & rack all glassware','Count stock and request supplies','Count till, print Z-report & drop in safe']},
   Kitchen:{Opening:['Log walk-in & reach-in temperatures','Set sanitizer buckets & test at 200 ppm','Confirm specials and unavailable items','Review prep list & pull proteins for first seating','Check fryer oil & turn on hoods','Taste & season sauces with the chef'],
    'Mid-shift':['Restock line pans & rotate garnish','Log hot-hold temperatures at 19:00'],
    Closing:['Label, date and store ingredients','Scrape & season flat-top and grill','Filter fryer oil & clean traps','Shut off gas & exhaust hoods','Deck-brush & squeegee kitchen floor','Write tomorrow’s prep list']}
  },
  Lunch:{
   Floor:{Opening:['Unlock doors, set host stand & lunch menus','Set 40 lunch covers','Polish water glasses & fill carafes','Walk restrooms: soap, towels, bins','Line-up: lunch specials & 86 list'],
    'Mid-shift':['Reset tables for the second turn'],
    Closing:['Wipe & sanitize tables and chairs','Hand over sections & seating notes to dinner','Restock server station for dinner']},
   Bar:{Opening:['Brew iced tea & cold brew','Cut lemons & limes','Fill ice wells','Calibrate espresso grinder & pull a test shot'],
    Closing:['Backflush espresso machine','Restock juices & mixers for dinner','Count stock and request supplies']},
   Kitchen:{Opening:['Log walk-in & reach-in temperatures','Set sanitizer buckets & test at 200 ppm','Bake sourdough & portion butter','Set lunch line: salads, soup & sandwiches','Confirm specials and unavailable items'],
    'Mid-shift':['Check soup hot-hold is 63 °C or above'],
    Closing:['Label, date and store ingredients','Wipe down line & swap boards for dinner','Hand the prep list to the dinner chef']}
  },
  'Weekend brunch':{
   Floor:{Opening:['Set brunch tables & kids’ menus','Stage coffee cups, cream & sugar','Walk restrooms: soap, towels, changing table','Line-up: brunch specials & 86 list'],
    Closing:['Reset the dining room for dinner','Sweep & spot-mop the floor']},
   Bar:{Opening:['Juice oranges for 4 L of fresh OJ','Batch mimosa & Bloody Mary mix','Calibrate espresso grinder & pull a test shot'],
    Closing:['Clean the juicer & backflush espresso','Count stock and request supplies']},
   Kitchen:{Opening:['Log walk-in & reach-in temperatures','Make hollandaise & hold at 60 °C','Bake pastries & proof brioche','Portion bacon & house sausages'],
    'Mid-shift':['Remake hollandaise (2-hour rule)'],
    Closing:['Label, date and store ingredients','Clean griddle & waffle irons']}
  },
  'Private events':{
   Floor:{'Event Setup':['Arrange banquet tables per the seating chart','Stage printed menus & place cards','Test microphone, speaker & playlist','Confirm final headcount with the host'],
    Closing:['Strike the room & stack chairs','Return linens & sweep the event room']},
   Bar:{'Event Setup':['Set up the welcome cocktail station','Chill prosecco & pre-batch signature cocktails','Polish champagne flutes for the toast'],
    Closing:['Count open bottles against the event tab','Wash & rack event glassware']},
   Kitchen:{'Event Setup':['Verify the guest allergy matrix with the head chef','Plate canapés & stage chafing dishes','Log temperatures for all hot-hold items'],
    Closing:['Label, date and store ingredients','Break down the plating line']}
  },
  'Late service':{
   Floor:{Opening:['Dim lights & swap to the late-night menu','Set bar-side high tops'],Closing:['Lock doors & complete the final walkthrough','Stack chairs & mop the entrance']},
   Bar:{Opening:['Fresh ice & late-night garnishes','Restock spirits from the back bar'],Closing:['Count till, print Z-report & drop in safe','Burn ice wells & cap taps']},
   Kitchen:{Opening:['Set the late menu line: fries, sliders, flatbreads'],Closing:['Shut off gas & exhaust hoods','Label, date and store ingredients']}
  }
 };
 // Tonight-only additions layered on top of the default lists for today's services.
 const todayExtras={
  Dinner:[['Opening','Floor','Bennett anniversary: candles, card & rose petals on table 4'],['Opening','Bar','Chill a bottle of Taittinger for the Bennett table'],['Opening','Kitchen','Martinez party (6): separate nut-free mise en place'],['Mid-shift','Kitchen','Pipe “Happy Anniversary” on the Bennett dessert plate']],
  Lunch:[['Opening','Kitchen','Harper & Co. catering: pack 12 boxed lunches for 12:30'],['Opening','Floor','Label the Harper & Co. order & stage it at the host stand']]
 };
 const todayNotes={
  Dinner:[
   ['Floor','Check reservations and table setup','manager',true,'Bennett party (table 4) is celebrating their 10th anniversary — quiet corner, candles lit before 18:15 please.',-210],
   ['Bar','Restock the bar & prepare garnishes','manager',true,'Martinez table (6) booked the wine pairing at 19:30. Chill four extra bottles of the Grüner before service.',-200],
   ['Kitchen','Confirm specials and unavailable items','manager',true,'Walk every server through the squash risotto (dairy) and the burrata 86 at line-up. No exceptions.',-195],
   ['Bar','Check draught lines & tap pressure','crew',false,'Pale ale keg is kicked — we’re 86 Draught pale ale until tomorrow’s delivery. Pushing bottled lager instead.',-30,'Draught pale ale'],
   ['Kitchen','Review prep list & pull proteins for first seating','crew',false,'Only 8 rib-eyes left after lunch. I’ll call it at 18:00 and 86 it if we run out.',-25],
   ['Floor','Polish glassware & set the floor','crew',false,'All stemware polished. Pulled two chipped coupes and binned them.',-15]
  ],
  Lunch:[
   ['Kitchen','Harper & Co. catering: pack 12 boxed lunches for 12:30','manager',true,'Harper & Co. pick-up is 12:30 sharp — the invoice is in the blue folder at the host stand.',-150],
   ['Kitchen','Bake sourdough & portion butter','crew',false,'Second bake comes out at 11:40, so the lunch rush is covered.',20],
   ['Bar','Calibrate espresso grinder & pull a test shot','crew',false,'Grinder dialled in at 18 g / 28 s. Decaf beans are low — added to the supply list.',15],
   ['Floor','Walk restrooms: soap, towels, bins','crew',false,'Hand dryer in the women’s restroom is out. Paper towels stocked and a maintenance ticket sent.',10]
  ]
 };
 const pastCrewNotes=[
  ['Bar','Out of Fever-Tree tonic — switched to house tonic, 86 for the rest of the night.','Fever-Tree tonic'],
  ['Kitchen','Walk-in read 6 °C at open; back to 3 °C after resetting the door seal. Logged.',''],
  ['Floor','High chair strap is broken — took it out of service and left a note for the manager.',''],
  ['Bar','Ice machine was slow again; filled the wells from the backup bin.',''],
  ['Kitchen','Fryer oil changed. Old oil is in the recycling drum by the back door.',''],
  ['Floor','Two booths need re-upholstering, the tape is holding for now.',''],
  ['Bar','Till over by $4.50, noted on the Z-report.',''],
  ['Kitchen','Out of day-dot labels — used masking tape and marker for tonight.',''],
  ['Floor','Seating chart updated with the two large bookings; high chairs staged by station 2.',''],
  ['Kitchen','Ran out of the fish special at 20:40 — 86 for the late tables.','Fish special']
 ];
 const pastManagerNotes=['Health inspector may visit this week — every temperature log must be complete.','Large party at 19:00. Pre-set table 12 before opening.','New hire shadowing tonight; walk them through this list step by step.','Patio opens if it stays dry. Check the heaters before guests arrive.','Owner is in tonight. Extra attention on the details, please.'];


 // Tasks in a list are worked top to bottom: a few minutes apart, with a little day-to-day drift.
 const timing=(v,t,i,k)=>{const start=mins(v.start),end=mins(v.end)+(mins(v.end)<=start?1440:0),dur=end-start,step=i*(5+hash(k+t.area)%4)+hash(k+t.id)%3,drift=hash(k)%12;
  if(t.list==='Opening')return (t.area==='Kitchen'?start-80:start-45)+drift+step;
  if(t.list==='Event Setup')return start-120+drift+step*2;
  if(t.list==='Closing')return end-20+drift+step;
  return start+dur*.4+drift+step*12;};
 const context=s=>{const manager=s.team.find(p=>p.active&&p.access==='manager')?.id||'jamie';return {manager,services:s.setup.services.filter(v=>templates[v.name]),
  owner:(date,svc,t)=>{const shifts=s.shifts.filter(x=>x.date===date&&x.service===svc),pool=shifts.filter(x=>x.area===t.area);const list=pool.length?pool:shifts;return list.length?list[hash(date+t.id)%list.length].person:manager;},
  crewOn:(date,svc,area)=>s.shifts.find(x=>x.date===date&&x.service===svc&&x.area===area&&x.person!==manager)?.person};};
 const addNote=(s,now,id,date,svc,t,by,important,body,when,stockItem='')=>{if(!t||!by||s.taskNotes.some(n=>n.id===id))return;s.taskNotes.push({id,date,service:svc,task:t.id,body,by,important,at:new Date(Math.min(when.getTime(),now-120000)).toISOString(),stockItem});};
 // Completion for one service: the whole list for past days, everything due so far for today.
 function fill(s,c,k,today,now){
  const date=k.slice(0,10),svc=k.slice(11),v=c.services.find(x=>x.name===svc),past=date<today;if(!v)return;
  const tasks=B.work.tasks(s,date,svc),checks=s.checks[k]||{},sloppy=hash(k)%11===0?14:4;
  const touched=new Set(s.taskEvents.filter(x=>x.date===date&&x.service===svc&&!x.legacy).map(x=>x.task));
  for(const t of tasks){if(checks[t.id]||touched.has(t.id))continue;
   const i=tasks.filter(x=>x.area===t.area&&x.list===t.list).indexOf(t),when=at(date,timing(v,t,i,k)),h=hash(k+t.id)%100;
   if(past?h>=(t.list==='Closing'?sloppy+2:sloppy):when.getTime()<now-60000&&h>=9)checks[t.id]={by:c.owner(date,svc,t),at:when.toISOString()};}
  if(Object.keys(checks).length)s.checks[k]=checks;
 }
 // Runs on every load: the crew keeps working through today's lists, leaving alone anything a person has changed.
 function tick(s,today,now){
  const c=context(s);
  for(const v of c.services){const k=today+'|'+v.name;if(!s.shifts.some(x=>x.date===today&&x.service===v.name))continue;fill(s,c,k,today,now);
   for(const [i,[area,title,who,important,body,offset,stock]] of (todayNotes[v.name]||[]).entries()){
    const t=B.work.tasks(s,today,v.name).find(x=>x.area===area&&x.title===title),check=s.checks[k]?.[t?.id];
    if(who==='crew'&&!check)continue;
    addNote(s,now,`cdemo-note-${today}-${slug(v.name)}-${i}`,today,v.name,t,who==='manager'?c.manager:c.crewOn(today,v.name,area),important,body,who==='manager'?at(today,mins(v.start)+offset):new Date(check.at),stock||'');
   }
  }
 }

 function enrich(input){
  if(!input?.restaurantHistory?.fictional)return input;
  const today=B.dateString(new Date()),now=Date.now(),meta=input.checklistDemo||{};
  if(meta.version===2&&meta.liveDay===today){B.configure(input);tick(input,today,now);return input;}
  const s=copy(input);s.tasks??=[];s.checks??={};s.checklistScopes??=[];s.taskNotes??=[];s.taskEvents??=[];s.chat??={};s.chat.messages??=[];s.chat.reads??={};B.configure(s);
  const c=context(s),{manager,services}=c,first=!meta.version;
  const known=new Set(s.tasks.map(t=>t.id));const uid=base=>{let id=base,n=1;while(known.has(id))id=base+'-'+(++n);known.add(id);return id;};

  // 1. Service-specific default templates (only where a manager has not already set one up).
  for(const v of services){
   if(s.tasks.some(t=>!t.date&&t.service===v.name))continue;
   for(const [area,lists] of Object.entries(templates[v.name])){if(!s.setup.areas.includes(area))continue;
    for(const [list,titles] of Object.entries(lists))titles.forEach((title,i)=>s.tasks.push({id:uid(`tpl-${slug(v.name)}-${slug(area)}-${slug(list)}-${i}`),title,area,list,service:v.name,specific:false,isDefault:true}));}
  }
  // Repair from the first release: a demo shift whose own list ended up completely empty goes back to its defaults.
  if(meta.version===1)s.checklistScopes=s.checklistScopes.filter(k=>{const keep=!services.some(v=>v.name===k.slice(11))||s.tasks.some(t=>t.date===k.slice(0,10)&&t.service===k.slice(11));if(!keep)delete s.checks[k];return keep;});

  // 2. Fuller crews for today and tomorrow so every station has an owner.
  const needs={Lunch:{Floor:2,Bar:1,Kitchen:2},Dinner:{Floor:3,Bar:2,Kitchen:2}};
  for(const date of [today,B.addDays(today,1)])for(const [svc,stations] of Object.entries(needs)){
   const v=s.setup.services.find(x=>x.name===svc&&x.active!==false);if(!v)continue;
   for(const [area,count] of Object.entries(stations)){
    const have=()=>s.shifts.filter(x=>x.date===date&&x.service===svc&&x.area===area).length;
    for(const p of s.team.filter(p=>p.active&&p.access==='crew'&&p.area===area)){
     if(have()>=count)break;if(s.shifts.some(x=>x.person===p.id&&x.date===date))continue;
     const x={id:`cdemo-${date}-${p.id}`,date,service:svc,person:p.id,start:v.start,end:v.end,area,payRate:s.scheduling?.defaults?.[p.id]?.rate??18,breakMinutes:30,demo:true};
     if(!s.shifts.some(y=>y.person===x.person&&B.overlaps(x,y)))s.shifts.push(x);
    }
   }
  }

  // 3. Tonight-only tasks: give today's services their own list copy plus the extras.
  for(const v of services){const extras=todayExtras[v.name],k=today+'|'+v.name;if(!extras||s.checklistScopes.includes(k))continue;
   for(const t of B.work.defaultTasks(s,v.name))s.tasks.push({...t,id:uid(`shift-${today}-${slug(v.name)}-${slug(t.id)}`),sourceTask:t.id,date:today,service:v.name,specific:false,isDefault:true});
   extras.forEach(([list,area,title],i)=>{if(s.setup.areas.includes(area))s.tasks.push({id:uid(`shift-${today}-${slug(v.name)}-extra-${i}`),title,area,list,date:today,service:v.name,specific:true});});
   delete s.checks[k];s.checklistScopes.push(k);
  }

  // 4. Completion history. The first run replaces the generic sample ticks; later days only fill services nobody recorded.
  s.taskNotes=s.taskNotes.filter(n=>!/^seed-(note|hist)-/.test(n.id));
  const keys=[...new Set(s.shifts.filter(x=>x.date<today&&services.some(v=>v.name===x.service)).map(x=>x.date+'|'+x.service))];
  const filled=keys.filter(k=>first?!s.checklistScopes.includes(k):!s.checks[k]||!Object.keys(s.checks[k]).length);
  for(const k of filled){if(first)delete s.checks[k];fill(s,c,k,today,now);}
  if(first)for(const k of Object.keys(s.checks)){if(services.some(v=>v.name===k.slice(11))&&k.slice(0,10)<today&&!keys.includes(k)&&!s.checklistScopes.includes(k))delete s.checks[k];}
  tick(s,today,now);

  // 5. A scattering of real-sounding notes on the services filled above.
  for(const k of filled){
   const date=k.slice(0,10),svc=k.slice(11),n=hash('note'+k),tasks=B.work.tasks(s,date,svc),v=services.find(x=>x.name===svc);if(!tasks.length)continue;
   if(n%10<3){const [area,body,stock]=pastCrewNotes[n%pastCrewNotes.length],t=tasks.find(x=>x.area===area&&s.checks[k]?.[x.id])||tasks.find(x=>x.area===area);const by=c.crewOn(date,svc,area);if(t&&by)addNote(s,now,`cdemo-hist-crew-${k}`,date,svc,t,by,false,body,new Date(s.checks[k]?.[t.id]?.at||at(date,mins(v.start))),stock);}
   if(n%100<12)addNote(s,now,`cdemo-hist-mgr-${k}`,date,svc,tasks[(n>>>4)%tasks.length],manager,true,pastManagerNotes[(n>>>8)%pastManagerNotes.length],at(date,mins(v.start)-180));
  }

  // 6. Briefing reads for people already on shift, team chat and supply requests.
  for(const b of s.briefings.filter(x=>x.date===today)){const v=services.find(x=>x.name===b.service);if(!v)continue;
   const people=[...new Set(s.shifts.filter(x=>x.date===today&&x.service===b.service).map(x=>x.person))].filter(id=>id!==manager);
   const started=at(today,mins(v.start)).getTime()<now;for(const [i,id] of people.entries())if((started?i%4!==3:i%3===0)&&!b.acks.includes(id))b.acks.push(id);}
  const crew=id=>s.team.some(p=>p.id===id&&p.active&&p.access==='crew');
  const created=offset=>new Date(now-offset*3600000).toISOString();
  // Team chat: a day of channel conversation with photos, plus the direct follow-ups that used to be private notes.
  const onTeam=id=>s.team.some(p=>p.id===id&&p.active),sent=new Set(s.chat.messages.map(m=>m.id));
  const say=(id,thread,author,hours,body,extra={})=>{if(sent.has(id)||!onTeam(author)||(thread.startsWith('dm:')&&!thread.slice(3).split(':').every(onTeam)))return;sent.add(id);s.chat.messages.push({id,thread,author,at:created(hours),kind:'text',body,...extra});};
  const photo=(src,width,height)=>({kind:'image',media:{src,width,height}}),todo=(to,due,done=false)=>({kind:'todo',todo:{for:to,due,done,...(done?{by:to,doneAt:created(1)}:{})}});
  say('cdemo-chat-1','team',manager,27,'Thank you all for Saturday — 182 covers, no comps and the Bennett anniversary went perfectly.');
  say('cdemo-chat-2','team','sam',26.5,'New autumn menu is printed. Tasting at 15:30 for anyone on dinner — come hungry.',photo('assets/images/brigly-seasonal-menu.webp',4,3));
  say('cdemo-chat-3','team','mia',5,'Bennett party moved to 19:30, still 8 guests. Booking is updated.');
  say('cdemo-chat-4','team',manager,4.6,'Brief the new server on table 12’s nut allergy before line-up, please.',todo('alex',today));
  say('cdemo-chat-5','team','noah',3.1,'Garnish station is set for tonight. Low on limes — I added them to supplies.',photo('assets/images/brigly-bar-preparation.webp',4,3));
  say('cdemo-chat-6','team','leo',1.4,'Burrata is 86 tonight, roasted beet salad is the swap. It’s on the board.');
  say('cdemo-chat-7','team',manager,.5,'Line-up at 16:45 by the pass. Five minutes, I promise.');
  say('cdemo-chat-8','station:Bar','demo-owen',6,'Can someone cover the bar back from 21:00 to 21:30? I need to pick up my sister.');
  say('cdemo-chat-9','station:Bar','noah',5.8,'I’ve got you. Leave the closing float in the safe.');
  say('cdemo-chat-10','station:Kitchen','sam',7,'Prep list for Friday is on the pass. Isla, take the sauces; Leo, proteins.');
  say('cdemo-chat-11','station:Kitchen','demo-isla',6.5,'On it, chef.');
  say('cdemo-chat-12','station:Floor','alex',2.2,'Section 3 is short two high chairs. Is the spare in storage?');
  say('private-cdemo-private-1',B.chat.dm(manager,'noah'),manager,20,'Place the Fever-Tree and bitters order before Thursday’s delivery cut-off.',todo('noah',B.addDays(today,2)));
  say('private-cdemo-private-2',B.chat.dm(manager,'alex'),manager,3,'Great job with the Bennett table last month — they asked for you by name tonight.');
  say('private-cdemo-private-3',B.chat.dm(manager,'demo-isla'),manager,26,'Finish the allergen refresher in Academy before Friday’s service.',todo('demo-isla',B.addDays(today,4)));
  say('private-cdemo-private-4',B.chat.dm(manager,'mia'),manager,50,'Could you train Eli on the host-stand opening list this Saturday?');
  say('cdemo-chat-13',B.chat.dm(manager,'mia'),'mia',49,'Happy to. I’ll pair with him from 15:00.');
  say('private-cdemo-private-5',B.chat.dm(manager,'leo'),manager,70,'Deep clean the combi oven and log it on the kitchen board.',todo('leo',B.addDays(today,-1),true));
  say('cdemo-chat-14',B.chat.dm(manager,'sam'),'sam',2,'Fish delivery came in short — 4 portions of halibut instead of 10. Want me to 86 it at 8?');
  // Everyone has caught up on the conversation except the last few hours.
  for(const p of s.team.filter(x=>x.active))for(const thread of ['team',...s.setup.areas.map(a=>'station:'+a)])if(B.chat.members(s,thread).includes(p.id)){const r=s.chat.reads[p.id]??={};r[thread]??=created(p.id===manager?3:4.8);}
  for(const [id,who] of [['private-cdemo-private-4','mia'],['private-cdemo-private-5','leo'],['private-cdemo-private-1','noah']]){const m=s.chat.messages.find(x=>x.id===id);if(m&&onTeam(who)){const r=s.chat.reads[who]??={};r[m.thread]??=created(0);}}
  for(const [id,name,quantity,unit,area,note,author,status] of [
   ['cdemo-order-1','Fever-Tree tonic',6,'cases','Bar','Weekend cocktail list goes through it fast.','noah','Requested'],
   ['cdemo-order-2','Decaf espresso beans',2,'bags','Bar','Down to the last half bag.','demo-owen','Requested'],
   ['cdemo-order-3','Day-dot labels',3,'rolls','Kitchen','Needed for every shift’s closing list.','leo','Ordered'],
   ['cdemo-order-4','Dinner candles',2,'boxes','Floor','For the evening lighting reset.','alex','Approved']
  ])if(s.team.some(p=>p.id===author)&&!s.orders.some(x=>x.id===id))s.orders.push({id,name,quantity,unit,area,note,author,status,feedback:''});

  s.checklistDemo={version:2,anchor:meta.anchor||today,liveDay:today};
  B.configure(s);
  if(!B.validState(s)){console.warn('Checklist demo content could not be applied.');B.configure(input);return {...input,checklistDemo:{...s.checklistDemo,skipped:true}};}
  return s;
 }
 B.starter=(...args)=>enrich(prev.starter(...args));B.load=storage=>enrich(prev.load(storage));
})();
