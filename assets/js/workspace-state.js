/* Shared, DOM-free model for the rebuilt workspace. */
(function (root) {
  'use strict';
  const KEY = 'brigly-workspace-v2';
  const seedCrew = [
    {id:'jamie',name:'Jamie Chen',role:'Manager',area:'Floor',initials:'JC'},
    {id:'alex',name:'Alex Morgan',role:'Server',area:'Floor',initials:'AM'},
    {id:'mia',name:'Mia Torres',role:'Host',area:'Floor',initials:'MT'},
    {id:'noah',name:'Noah Williams',role:'Bartender',area:'Bar',initials:'NW'},
    {id:'sam',name:'Sam Rivera',role:'Head chef',area:'Kitchen',initials:'SR'},
    {id:'leo',name:'Leo Park',role:'Line cook',area:'Kitchen',initials:'LP'}
  ];
  let crew=seedCrew,services=['Lunch','Dinner'],areas=['Floor','Bar','Kitchen'];
  function configure(state){
    crew=state?.team||seedCrew;
    services=state?.setup?.services?.map(x=>x.name)||['Lunch','Dinner'];
    areas=state?.setup?.areas||['Floor','Bar','Kitchen'];
    if(root.Brigly)root.Brigly.crew=crew;
  }
  const views=['schedules','lists','specials','eighty-six','onboarding','orders','reservations','private','stock','inventory','menu','pos'];
  const dateString=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const addDays=(date,n)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return dateString(d);};
  const monday=date=>{const day=new Date(date+'T12:00:00').getDay();return addDays(date,-((day+6)%7));};
  const isDate=x=>typeof x==='string' && /^\d{4}-\d{2}-\d{2}$/.test(x) && !isNaN(new Date(x+'T12:00:00')) && dateString(new Date(x+'T12:00:00'))===x;
  const isTime=x=>typeof x==='string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(x);
  const minutes=x=>Number(x.slice(0,2))*60+Number(x.slice(3));
  const duration=x=>(minutes(x.end)-minutes(x.start)+1440)%1440;
  const interval=x=>{const start=new Date(x.date+'T00:00:00Z').getTime()/60000+minutes(x.start);return [start,start+duration(x)];};
  const overlaps=(a,b)=>{const [as,ae]=interval(a),[bs,be]=interval(b);return as<be&&bs<ae;};
  const actor=(role,crewId='alex',managerId='jamie')=>role==='manager'?managerId:crewId;
  const person=id=>crew.find(p=>p.id===id);
  const scoped=(x,date,service)=>x.date===date && x.service===service;
  function starter(date=dateString(new Date())) {
    configure();
    let n=0;
    const shifts=[];
    for(let d=0;d<7;d++)for(let c=0;c<crew.length;c++){
      const day=addDays(monday(date),d);
      if(day!==date && (d+c)%6===0)continue;
      shifts.push({id:`seed-${++n}`,date:day,service:'Dinner',person:crew[c].id,start:c>3?'14:00':'16:00',end:'23:00',area:crew[c].area});
    }
    return {version:2,role:'manager',date,service:'Dinner',view:'schedules',shifts,
      tasks:[
        ['Opening','Polish glassware & set the floor','Floor'],
        ['Opening','Check reservations and table setup','Floor'],
        ['Opening','Restock the bar & prepare garnishes','Bar'],
        ['Opening','Confirm specials and unavailable items','Kitchen'],
        ['Closing','Clean and reset each station','Floor'],
        ['Closing','Label, date and store ingredients','Kitchen'],
        ['Closing','Count stock and request supplies','Bar'],
        ['Closing','Complete the final walkthrough','Floor'],
        ['Opening','Inspect guest restrooms & restock essentials','Floor'],
        ['Opening','Adjust dining room lighting & audio playlist','Floor'],
        ['Opening','Sanitize host stand & power on mobile POS terminals','Floor'],
        ['Opening','Cut fresh citrus & prepare cocktail garnishes','Bar'],
        ['Opening','Check draught beer line pressure & tap faucets','Bar'],
        ['Opening','Fill bar ice wells & calibrate espresso grinder','Bar'],
        ['Opening','Chill reserve white wine, prosecco & champagne stock','Bar'],
        ['Opening','Log walk-in cooler & reach-in refrigeration temps','Kitchen'],
        ['Opening','Set sanitizer buckets & test with 200 PPM strips','Kitchen'],
        ['Opening','Review prep sheet & pull proteins for first seating','Kitchen'],
        ['Opening','Turn on exhaust hoods & check gas pilot lights','Kitchen'],
        ['Closing','Wipe down & sanitize all dining tables & leather booths','Floor'],
        ['Closing','Sweep and mop main dining room & entryway floors','Floor'],
        ['Closing','Empty all bus station tubs & take trash to dumpster','Floor'],
        ['Closing','Lock patio gates, wine display & arm security alarm','Floor'],
        ['Closing','Cap beer faucets & soak nozzles in sanitizing solution','Bar'],
        ['Closing','Burn well ice with hot water & flush floor drains','Bar'],
        ['Closing','Wash, sanitize, polish & rack all bar glassware','Bar'],
        ['Closing','Count cash till drawer, print Z-report & drop into safe','Bar'],
        ['Closing','Brick, scrape & polish flat top griddle & grill','Kitchen'],
        ['Closing','Shut off cooking gas pilot valves & exhaust ventilation','Kitchen'],
        ['Closing','Empty fryer grease traps & filter cooking oil','Kitchen'],
        ['Closing','Deck-brush, squeegee & mop kitchen tile floor','Kitchen'],
        ['Event Setup','Arrange private banquet tables per seating chart','Floor'],
        ['Event Setup','Stage custom printed event menus & name place cards','Floor'],
        ['Event Setup','Set up satellite welcome cocktail bar & glassware','Bar'],
        ['Event Setup','Chill event prosecco & pre-batch signature cocktails','Bar'],
        ['Event Setup','Plate passed canapés & stage chafing dish warmers','Kitchen'],
        ['Event Setup','Verify VIP guest allergy matrix with head chef','Kitchen'],
        ['Mid-shift Prep','Reset tables and replenish server napkin rollups','Floor'],
        ['Mid-shift Prep','Replenish bar ice wells & empty dump sink strainer','Bar'],
        ['Mid-shift Prep','Restock line pans with fresh prep sauces & garnish','Kitchen']
      ].map(([list,title,area],i)=>({id:`task-${i}`,list,title,area,rollover:[2,4,8,10,12].includes(i)})),
      checks:{},
      specials:[{id:'special-1',date,service:'Dinner',kind:'special',name:'Roasted squash risotto',description:'Roasted delicata squash, brown butter and crispy sage. A little comfort for a cooler evening.',price:26,allergens:'Milk · confirm ingredients and cross-contact with the kitchen.',active:true,questions:[{id:'q-1',author:'alex',text:'Can guests request this dairy-free / vegan?',at:date+'T15:10:00.000Z',answer:{author:'jamie',text:'Yes, chef can substitute olive oil and vegetable stock. Note it on the ticket.',at:date+'T15:25:00.000Z'}}]},{id:'special-2',date,service:'Dinner',kind:'special',name:'Orchard old fashioned',description:'Bourbon, spiced apple and aromatic bitters. Finished with an orange twist.',price:15,allergens:'Confirm ingredients and garnishes with the bar.',active:true,questions:[]},{id:'special-hh-1',date,service:'Dinner',kind:'happy_hour',name:'Twilight Oyster & Spritz Hour',time:'16:00–18:00',description:'$2 local oysters on the half shell, $8 house spritzes and draught lagers.',price:8,allergens:'Shellfish, alcohol · Bar and high-top tables only.',active:true,questions:[{id:'q-hh-1',author:'alex',text:'Can patio tables order happy hour pricing too?',at:date+'T15:30:00.000Z',answer:{author:'jamie',text:'Yes, full patio and high-tops qualify until 18:00.',at:date+'T15:45:00.000Z'}}]},{id:'special-ev-1',date,service:'Dinner',kind:'event',name:'Live Courtyard Jazz: Marcus Trio',time:'19:30–22:00',description:'Live acoustic jazz in the heated courtyard during dinner service. No cover charge.',price:0,allergens:'Courtyard tables 12-16 have direct sound and sightline. Sound check at 18:30.',active:true,questions:[{id:'q-ev-1',author:'noah',text:'Do we need extra stemware staged for courtyard tables?',at:date+'T16:00:00.000Z',answer:{author:'jamie',text:'Yes, stage 2 extra trays of wine stems at the back station.',at:date+'T16:15:00.000Z'}}]}],
      unavailable:[{id:'86-1',name:'Burrata',reason:'Sold out. Offer the roasted beet salad.',area:'Kitchen',active:true,author:'sam'},{id:'86-2',name:'Draught pale ale',reason:'Keg delivery expected tomorrow. Bottled lager available.',area:'Bar',active:true,author:'noah'}],
      briefings:[{id:'brief-1',date,service:'Dinner',title:'A warm welcome, from the first table',body:'Mia is on the door, Alex has the main dining room and Noah is on the bar. Please check the specials and 86 list before service.\n\nThe Bennett party is celebrating an anniversary. Coordinate a warm welcome with the host. Ask the kitchen directly about every allergy request.',author:'jamie',revision:1,acks:[]}],
      orders:[{id:'order-1',name:'Cocktail napkins',quantity:4,unit:'packs',area:'Bar',note:'Running low for the weekend.',author:'noah',status:'Requested',feedback:''},{id:'order-2',name:'Nitrile gloves · medium',quantity:2,unit:'boxes',area:'Kitchen',note:'For prep stations.',author:'sam',status:'Approved',feedback:''}],
      reservations:[{id:'res-1',date,service:'Dinner',name:'Bennett',guests:4,time:'18:30',table:'4',note:'Anniversary. Quiet table requested.',contact:'',status:'Confirmed'},{id:'res-2',date,service:'Dinner',name:'Jordan',guests:2,time:'19:00',table:'2',note:'Window seat if available.',contact:'',status:'Confirmed'},{id:'res-3',date,service:'Dinner',name:'Martinez',guests:6,time:'19:30',table:'8',note:'Confirm dietary needs on arrival.',contact:'',status:'Confirmed'}]};
  }
  const text=(x,max=2000)=>typeof x==='string'&&x.length<=max;
  const nonempty=(x,max=2000)=>text(x,max)&&x.trim().length>0;
  const base=x=>x&&nonempty(x.id,100);
  const scope=x=>isDate(x.date)&&services.includes(x.service);
  const validators={
    shifts:x=>base(x)&&scope(x)&&person(x.person)&&isTime(x.start)&&isTime(x.end)&&x.start!==x.end&&areas.includes(x.area),
    tasks:x=>base(x)&&nonempty(x.list,80)&&nonempty(x.title,200)&&areas.includes(x.area)&&(x.rollover===undefined||typeof x.rollover==='boolean'),
    specials:x=>base(x)&&scope(x)&&nonempty(x.name,100)&&text(x.description)&&Number.isFinite(x.price)&&x.price>=0&&x.price<=10000&&text(x.allergens,500)&&typeof x.active==='boolean',
    unavailable:x=>base(x)&&nonempty(x.name,100)&&nonempty(x.reason,500)&&areas.includes(x.area)&&typeof x.active==='boolean'&&person(x.author),
    briefings:x=>base(x)&&scope(x)&&nonempty(x.title,150)&&nonempty(x.body)&&person(x.author)&&Number.isInteger(x.revision)&&x.revision>0&&Array.isArray(x.acks)&&x.acks.every(id=>person(id))&&new Set(x.acks).size===x.acks.length,
    orders:x=>base(x)&&nonempty(x.name,100)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=10000&&nonempty(x.unit,40)&&areas.includes(x.area)&&text(x.note)&&person(x.author)&&['Requested','Approved','Declined','Ordered','Received','Cancelled'].includes(x.status)&&text(x.feedback,500),
    reservations:x=>base(x)&&scope(x)&&nonempty(x.name,100)&&Number.isInteger(x.guests)&&x.guests>0&&x.guests<=20&&isTime(x.time)&&text(x.table,20)&&text(x.note)&&text(x.contact,100)&&['Confirmed','Seated','Completed','Cancelled','No-show'].includes(x.status)
  };
  function validState(s){
    configure(s);
    if(!s||s.version!==2||!['manager','crew'].includes(s.role)||!isDate(s.date)||!services.includes(s.service)||!views.includes(s.view))return false;
    for(const [name,validate] of Object.entries(validators))if(!Array.isArray(s[name])||s[name].length>10000||!s[name].every(validate)||new Set(s[name].map(x=>x.id)).size!==s[name].length)return false;
    if(!s.checks||typeof s.checks!=='object'||Array.isArray(s.checks))return false;
    return Object.entries(s.checks).every(([key,items])=>isDate(key.slice(0,10))&&key[10]==='|'&&services.includes(key.slice(11))&&items&&typeof items==='object'&&!Array.isArray(items)&&Object.entries(items).every(([id,c])=>s.tasks.some(t=>t.id===id)&&c&&person(c.by)&&text(c.at,100)));
  }
  function load(storage){try{const parsed=JSON.parse(storage.getItem(KEY));if(validState(parsed))return parsed;}catch{}return starter();}
  function save(storage,s){try{storage.setItem(KEY,JSON.stringify(s));return true;}catch{return false;}}
  function change(s,action,role=s.role){
    configure(s);
    if(!['manager','crew'].includes(role))throw Error('Choose a valid preview role.');
    const d=JSON.parse(JSON.stringify(s)), me=actor(role,s.crewId,s.managerId), manager=role==='manager';
    const needManager=()=>{if(!manager)throw Error('Only managers can make this change.');};
    const get=(collection,id)=>{const item=d[collection].find(x=>x.id===id);if(!item)throw Error('This record no longer exists.');return item;};
    if(action.type==='put'){
      const {collection}=action;if(!Object.hasOwn(validators,collection))throw Error('Unknown record type.');
      const item={...action.item},old=d[collection].find(x=>x.id===item.id);
      if(['shifts','tasks','specials'].includes(collection))needManager();
      if(collection==='unavailable')item.author=old?.author||me;
      if(collection==='orders'){
        if(old&&(old.status!=='Requested'||(!manager&&old.author!==me)))throw Error('Only pending requests can be edited by their requester or a manager.');
        item.author=old?.author||me;item.status=old?.status||'Requested';item.feedback=old?.feedback||'';
      }
      if(collection==='briefings'){
        if(old&&!manager&&old.author!==me)throw Error('Only the author or a manager can edit this briefing.');
        item.author=old?.author||me;item.revision=old?old.revision+1:1;item.acks=[];
      }
      if(collection==='reservations'){
        item.status=old?.status||'Confirmed';
        if(item.table&&d.reservations.some(r=>r.id!==item.id&&r.date===item.date&&r.table.toLowerCase()===item.table.toLowerCase()&&!['Cancelled','Completed','No-show'].includes(r.status)&&Math.abs(minutes(r.time)-minutes(item.time))<120))throw Error('That table already has a booking within two hours. Choose a different table or time.');
      }
      if(!validators[collection](item))throw Error('Please check all required fields and values.');
      if(collection==='shifts'&&d.shifts.some(r=>r.id!==item.id&&r.person===item.person&&overlaps(r,item)))throw Error('This teammate already has an overlapping shift.');
      if(old)d[collection][d[collection].indexOf(old)]=item;else d[collection].push(item);
    }else if(action.type==='remove'){
      needManager();if(!['shifts','tasks'].includes(action.collection))throw Error('This record cannot be removed.');
      get(action.collection,action.id);d[action.collection]=d[action.collection].filter(x=>x.id!==action.id);
      if(action.collection==='tasks')for(const checks of Object.values(d.checks))delete checks[action.id];
    }else if(action.type==='check'){
      get('tasks',action.id);const key=`${d.date}|${d.service}`;d.checks[key]||={};
      if(action.done)d.checks[key][action.id]={by:me,at:action.at};else delete d.checks[key][action.id];
    }else if(action.type==='ack'){
      const item=get('briefings',action.id);if(!item.acks.includes(me))item.acks.push(me);
    }else if(action.type==='toggle'){
      if(!['specials','unavailable'].includes(action.collection))throw Error('Unknown status.');
      if(action.collection==='specials')needManager();const item=get(action.collection,action.id);item.active=!item.active;
    }else if(action.type==='order-status'){
      needManager();const item=get('orders',action.id),allowed={Requested:['Approved','Declined'],Approved:['Ordered'],Ordered:['Received']};
      if(!allowed[item.status]?.includes(action.status))throw Error('This order status change is not available.');
      if(action.status==='Declined'&&!nonempty(action.feedback,500))throw Error('Add a reason so the crew knows why.');
      item.status=action.status;item.feedback=action.feedback||'';
    }else if(action.type==='reservation-status'){
      const item=get('reservations',action.id),allowed={Confirmed:['Seated','Cancelled','No-show'],Seated:['Completed']};
      if(!allowed[item.status]?.includes(action.status))throw Error('This reservation status change is not available.');item.status=action.status;
    }else throw Error('Unknown action.');
    if(!validState(d))throw Error('This change could not be saved. Check the entered values.');return d;
  }
  root.Brigly={configure,duration,overlaps,KEY,crew,views,starter,validState,load,save,change,dateString,addDays,monday,isDate,actor,person,scoped};
})(globalThis);
