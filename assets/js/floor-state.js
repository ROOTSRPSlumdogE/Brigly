/* Floor plan: rooms and tables drawn on a grid, live table status, combined tables, turn times, walk-ins and guest statistics. DOM-free. */
(function(){
 'use strict';
 const B=Brigly,prev={starter:B.starter,load:B.load,valid:B.validState,change:B.change};
 const copy=x=>JSON.parse(JSON.stringify(x));
 const SHAPES=['round','square','rect','booth','bar'];
 const SOURCES=['Phone','Online','Walk-in','Email','Event','Other'];
 const TAGS=['VIP','Regular','Birthday','Anniversary','Allergy','Window','Quiet','High chair','Wheelchair','Business','Large party'];
 const DURATIONS=[60,75,90,105,120,150,180,240];
 const CLOSED=['Cancelled','No-show'];
 const LIMITS={rooms:12,tables:300,cols:[8,48],rows:[6,36],seats:[1,40],max:[1,60],size:[1,10],label:4,tablesPer:4,duration:[30,360]};
 const txt=(x,max)=>typeof x==='string'&&x.length<=max;
 const identifier=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x);
 const int=(x,lo,hi)=>Number.isInteger(x)&&x>=lo&&x<=hi;
 const labelOk=x=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=LIMITS.label&&!/[+|,]/.test(x)&&x===x.trim();
 const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
 const clock=n=>`${String(Math.floor(((n%1440)+1440)%1440/60)).padStart(2,'0')}:${String(((n%1440)+1440)%1440%60).padStart(2,'0')}`;
 const hash=t=>{let n=2166136261;for(const c of String(t)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
 const today=()=>B.dateString(new Date());
 const nowMinutes=()=>{const d=new Date();return d.getHours()*60+d.getMinutes();};
 // Older bookings held free text ("Patio 3", "Window"); keep the number when there is one, otherwise the first characters.
 const shorten=l=>{let x=String(l).replace(/[+|,]/g,'').trim();if(x.length>LIMITS.label){const digits=x.match(/\d+/)?.[0];x=digits&&digits.length<=LIMITS.label?digits:x.slice(0,LIMITS.label).trim();}return x;};
 const parseTables=t=>{const out=[];for(const raw of String(t||'').split(/[+,]/)){const l=shorten(raw);if(l&&!out.some(x=>x.toLowerCase()===l.toLowerCase()))out.push(l);}return out.slice(0,LIMITS.tablesPer);};
 const joinTables=list=>list.join('+');
 const active=r=>!CLOSED.includes(r.status);

 // The starter plan for The Copper Room: four rooms, labels matching the sample bookings (tables 1–11, courtyard 12–16, bar high-tops, private room).
 function defaultPlan(){
  const T=(label,room,seats,max,shape,x,y,w,h)=>({id:'t-'+label.toLowerCase(),room,label,seats,max,shape,x,y,w,h});
  return {version:1,settings:{turnMinutes:120},
   rooms:[{id:'main',name:'Main dining',cols:20,rows:12},{id:'bar',name:'Bar & lounge',cols:14,rows:8},{id:'courtyard',name:'Courtyard',cols:16,rows:8},{id:'private',name:'Private room',cols:12,rows:8}],
   tables:[
    T('1','main',2,2,'round',1,1,2,2),T('2','main',2,3,'round',4,1,2,2),T('3','main',4,5,'square',7,1,2,2),T('4','main',4,6,'rect',10,1,3,2),T('5','main',4,6,'rect',14,1,3,2),
    T('6','main',6,8,'rect',1,5,4,2),T('7','main',2,2,'round',6,5,2,2),T('8','main',6,8,'rect',9,5,4,2),T('9','main',4,4,'square',14,5,2,2),
    T('10','main',8,10,'rect',1,9,5,2),T('11','main',4,4,'booth',8,9,3,2),T('17','main',4,4,'booth',13,9,3,2),
    T('B1','bar',2,2,'bar',1,1,2,2),T('B2','bar',2,2,'bar',4,1,2,2),T('B3','bar',2,2,'bar',7,1,2,2),T('B4','bar',2,2,'bar',10,1,2,2),T('B5','bar',4,4,'booth',1,5,3,2),T('B6','bar',4,4,'booth',6,5,3,2),
    T('12','courtyard',2,2,'round',1,1,2,2),T('13','courtyard',4,4,'square',4,1,2,2),T('14','courtyard',4,4,'square',7,1,2,2),T('15','courtyard',6,6,'rect',10,1,3,2),T('16','courtyard',4,4,'square',1,5,2,2),
    T('P1','private',12,16,'rect',1,1,8,2),T('P2','private',8,10,'rect',1,5,5,2)
   ]};
 }
 const bounds=t=>({x1:t.x,y1:t.y,x2:t.x+t.w,y2:t.y+t.h});
 const overlap=(a,b)=>a.room===b.room&&a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
 const adjacent=(a,b)=>a.room===b.room&&!overlap(a,b)&&a.x<=b.x+b.w+1&&b.x<=a.x+a.w+1&&a.y<=b.y+b.h+1&&b.y<=a.y+a.h+1;
 // First free spot for a w×h table in a room, scanning rows then columns; null when the room is full.
 function freeSpot(plan,room,w,h){
  const r=plan.rooms.find(x=>x.id===room);if(!r)return null;
  const others=plan.tables.filter(t=>t.room===room);
  for(let y=0;y+h<=r.rows;y++)for(let x=0;x+w<=r.cols;x++){const c={room,x,y,w,h};if(!others.some(o=>overlap(o,c)))return {x,y};}
  return null;
 }
 const demoPool=['Abernathy','Adeyemi','Alvarez','Anand','Baptiste','Barlow','Becker','Bianchi','Blackwood','Castillo','Chaudhry','Choi','Costa','Dalton','Delgado','Dubois','Eriksen','Farrow','Fischer','Fontaine','Gallagher','Haddad','Hargreaves','Hoffman','Ibarra','Iqbal','Jensen','Kaur','Keller','Kowalski','Lindqvist','Lopez','Lund','MacLeod','Mahoney','Marchetti','Mendes','Moreau','Nakamura','Novak','Okonkwo','Olsen','Osei','Petrov','Pham','Quinn','Ramos','Rasmussen','Rossi','Ruiz','Sato','Schneider','Silva','Singh','Sørensen','Tanaka','Torres','Vasquez','Vogel','Walsh','Weber','Whitaker','Yamamoto','Yilmaz','Zhang','Zimmerman','Ahmed','Byrne','Doyle','Ferreira','Hughes','Kennedy'];
 const regulars=[['Bennett','(555) 014-7781'],['Jordan',''],['Martinez','(555) 014-2290'],['Patel','(555) 014-6632'],['Wilson',''],['Taylor','(555) 014-1187'],['Reed',''],['Kim','(555) 014-9034'],['Thompson',''],['Garcia','(555) 014-3418'],['Parker',''],['Nguyen','(555) 014-5570'],['Clarke',''],['Morgan',''],['Brooks','(555) 014-8846'],['Chen','(555) 014-2063']];
 function inferTags(note){
  const n=String(note||'').toLowerCase(),out=[];
  if(/birthday/.test(n))out.push('Birthday');if(/anniversary/.test(n))out.push('Anniversary');if(/allerg|dietary/.test(n))out.push('Allergy');
  if(/window/.test(n))out.push('Window');if(/quiet/.test(n))out.push('Quiet');if(/high chair/.test(n))out.push('High chair');if(/wheelchair/.test(n))out.push('Wheelchair');
  return out;
 }
 const needsUpgrade=s=>!s.floor||s.floor.version!==1||!s.floor.guestsSeeded||s.reservations.some(r=>!Array.isArray(r.tables)||!Number.isInteger(r.duration)||!SOURCES.includes(r.source)||!Array.isArray(r.tags));
 function upgrade(state){
  if(!needsUpgrade(state))return state;
  const s=copy(state);B.configure(s);
  if(!s.floor||s.floor.version!==1)s.floor=defaultPlan();
  s.floor.settings||={turnMinutes:120};
  const plan=s.floor,turn=plan.settings.turnMinutes||120;
  // Any table label the bookings already use must exist on the plan, so nothing is lost.
  for(const r of s.reservations){
   if(!Array.isArray(r.tables))r.tables=parseTables(r.table);
   r.table=joinTables(r.tables);
   for(const label of r.tables)if(!plan.tables.some(t=>t.label.toLowerCase()===label.toLowerCase())&&labelOk(label)&&plan.tables.length<LIMITS.tables){
    const spot=freeSpot(plan,plan.rooms[0].id,2,2);if(spot)plan.tables.push({id:'t-'+label.toLowerCase().replace(/[^a-z0-9]/g,'')+'-'+(hash(label)%9973),room:plan.rooms[0].id,label,seats:4,max:4,shape:'square',...spot,w:2,h:2});
   }
  }
  const byLabel=l=>plan.tables.find(t=>t.label.toLowerCase()===String(l).toLowerCase());
  const byDate=new Map();for(const r of s.reservations){const list=byDate.get(r.date)||[];list.push(r);byDate.set(r.date,list);}
  for(const r of s.reservations){
   if(!Number.isInteger(r.duration))r.duration=turn;
   const h=hash(r.id);
   if(!SOURCES.includes(r.source))r.source=r.demo?(h%10<4?'Online':h%10<8?'Phone':h%10<9?'Walk-in':'Email'):'Phone';
   if(!Array.isArray(r.tags))r.tags=r.demo?inferTags(r.note):[];
   if(r.demo&&!plan.guestsSeeded){
    // Fictional history: most guests visit a few times, a handful are regulars with a contact on file.
    const bucket=h%100,initial=String.fromCharCode(65+(h>>>8)%26);
    if(bucket<18){const reg=regulars[h%regulars.length];r.name=reg[0];if(reg[1]&&!r.contact)r.contact=reg[1];if(h%3===0&&!r.tags.includes('Regular'))r.tags.push('Regular');}
    else if(bucket<45)r.name=(h%2?'J. ':'M. ')+demoPool[(h>>>4)%demoPool.length];
    else r.name=initial+'. '+demoPool[(h>>>4)%demoPool.length];
    if(r.guests>=7&&!r.tags.includes('Large party'))r.tags.push('Large party');
    // Some couples sit at the bar and some fours take the courtyard, so every room has a history.
    if(active(r)){
     const taken=t=>byDate.get(r.date).some(o=>o!==r&&active(o)&&o.tables.some(l=>l.toLowerCase()===t.label.toLowerCase())&&clash(o,r));
     const move=labels=>{const t=labels.map(l=>byLabel(l)).find(t=>t&&t.max>=r.guests&&!taken(t));if(t){r.tables=[t.label];r.table=t.label;}};
     if(h%7===0&&r.guests<=2)move(['B1','B2','B3','B4']);else if(h%9===0&&r.guests<=4&&r.service==='Dinner')move(['13','14','16','12']);else if(h%11===0&&r.guests>=5&&r.guests<=6)move(['15','B5','B6']);
    }
    if(r.status==='Completed'&&!r.seatedAt){const start=mins(r.time)+(h%4)*5,stay=70+(h>>>3)%80;r.seatedAt=r.date+'T'+clock(start)+':00';r.completedAt=(start+stay>=1440?B.addDays(r.date,1):r.date)+'T'+clock(start+stay)+':00';}
    // Parties bigger than their table move to one that fits, or to two tables side by side.
    const cap=r.tables.reduce((n,l)=>n+(byLabel(l)?.max||0),0);
    if(active(r)&&r.guests>cap){
     const taken=t=>byDate.get(r.date).some(o=>o!==r&&active(o)&&o.tables.some(l=>l.toLowerCase()===t.label.toLowerCase())&&clash(o,r));
     const single=plan.tables.filter(t=>t.max>=r.guests&&!taken(t)).sort((a,b)=>a.max-b.max)[0];
     if(single)r.tables=[single.label];
     else{const pair=combos(plan.tables.filter(t=>!taken(t)),r.guests)[0];if(pair)r.tables=pair.map(t=>t.label);}
     r.table=joinTables(r.tables);
    }
   }
  }
  plan.guestsSeeded=true;B.configure(s);return s;
 }
 // Two bookings clash when their turn windows overlap on the same date (any service).
 const span=r=>{const a=mins(r.time);return [a,a+(r.duration||120)];};
 const clash=(a,b)=>{const [as,ae]=span(a),[bs,be]=span(b);return as<be&&bs<ae;};
 function combos(tables,guests){
  const out=[];
  for(let i=0;i<tables.length;i++)for(let j=i+1;j<tables.length;j++){const a=tables[i],b=tables[j];if(adjacent(a,b)&&a.max+b.max>=guests)out.push([a,b]);}
  return out.sort((p,q)=>(p[0].max+p[1].max)-(q[0].max+q[1].max));
 }
 function validFloor(s){
  const f=s.floor;if(!f||f.version!==1||!Array.isArray(f.rooms)||!f.rooms.length||f.rooms.length>LIMITS.rooms||!Array.isArray(f.tables)||f.tables.length>LIMITS.tables)return false;
  if(!f.settings||!int(f.settings.turnMinutes,LIMITS.duration[0],LIMITS.duration[1]))return false;
  if(!f.rooms.every(r=>identifier(r.id)&&txt(r.name,40)&&r.name.trim()&&int(r.cols,LIMITS.cols[0],LIMITS.cols[1])&&int(r.rows,LIMITS.rows[0],LIMITS.rows[1])))return false;
  if(new Set(f.rooms.map(r=>r.id)).size!==f.rooms.length||new Set(f.rooms.map(r=>r.name.trim().toLowerCase())).size!==f.rooms.length)return false;
  for(const t of f.tables){
   const room=f.rooms.find(r=>r.id===t.room);
   if(!identifier(t.id)||!room||!labelOk(t.label)||!int(t.seats,LIMITS.seats[0],LIMITS.seats[1])||!int(t.max,t.seats,LIMITS.max[1])||!SHAPES.includes(t.shape))return false;
   if(!int(t.x,0,room.cols-1)||!int(t.y,0,room.rows-1)||!int(t.w,LIMITS.size[0],LIMITS.size[1])||!int(t.h,LIMITS.size[0],LIMITS.size[1])||t.x+t.w>room.cols||t.y+t.h>room.rows)return false;
  }
  if(new Set(f.tables.map(t=>t.id)).size!==f.tables.length||new Set(f.tables.map(t=>t.label.toLowerCase())).size!==f.tables.length)return false;
  for(let i=0;i<f.tables.length;i++)for(let j=i+1;j<f.tables.length;j++)if(overlap(f.tables[i],f.tables[j]))return false;
  return s.reservations.every(r=>Array.isArray(r.tables)&&r.tables.length<=LIMITS.tablesPer&&r.tables.every(l=>labelOk(l))&&new Set(r.tables.map(l=>l.toLowerCase())).size===r.tables.length&&r.table===joinTables(r.tables)
   &&int(r.duration,LIMITS.duration[0],LIMITS.duration[1])&&SOURCES.includes(r.source)&&Array.isArray(r.tags)&&r.tags.length<=TAGS.length&&r.tags.every(t=>TAGS.includes(t))&&new Set(r.tags).size===r.tags.length
   &&['seatedAt','completedAt','closedAt','createdAt'].every(k=>r[k]===undefined||txt(r[k],40)));
 }
 function valid(s){try{const u=upgrade(s);return prev.valid(u)&&validFloor(u);}catch{return false;}}

 // Everything the UI asks about tables and bookings.
 const plan=s=>s.floor;
 const byLabel=(s,label)=>plan(s).tables.find(t=>t.label.toLowerCase()===String(label||'').toLowerCase());
 const tableOf=(s,id)=>plan(s).tables.find(t=>t.id===id);
 const capacity=(s,labels)=>labels.reduce((n,l)=>{const t=byLabel(s,l);return n+(t?t.max:0);},0);
 const seatsOf=(s,labels)=>labels.reduce((n,l)=>{const t=byLabel(s,l);return n+(t?t.seats:0);},0);
 function serviceWindow(s,service){
  const v=s.setup.services.find(x=>x.name===service)||s.setup.services[0];
  const start=mins(v.start);let end=mins(v.end);if(end<=start)end+=1440;return {start,end,name:v.name};
 }
 const bookings=(s,date,service)=>s.reservations.filter(r=>r.date===date&&(!service||r.service===service));
 const uses=(r,label)=>r.tables.some(l=>l.toLowerCase()===String(label).toLowerCase());
 // Bookings that block the given tables around a time window on a date; the booking being edited is excluded.
 function conflicts(s,item){
  return s.reservations.filter(r=>r.id!==item.id&&r.date===item.date&&active(r)&&r.tables.some(l=>item.tables.some(m=>m.toLowerCase()===l.toLowerCase()))&&clash(r,item)).sort((a,b)=>a.time.localeCompare(b.time));
 }
 // Where every table stands at one moment of a service: seated, running late, reserved now, booked soon or open.
 function occupancy(s,date,service,at){
  const list=bookings(s,date,service).filter(active).sort((a,b)=>a.time.localeCompare(b.time));
  return plan(s).tables.map(t=>{
   const mine=list.filter(r=>uses(r,t.label));
   const seated=mine.find(r=>r.status==='Seated');
   const late=!seated&&mine.find(r=>r.status==='Confirmed'&&mins(r.time)+15<=at&&mins(r.time)+r.duration>at);
   const now=!seated&&!late&&mine.find(r=>r.status==='Confirmed'&&mins(r.time)<=at&&mins(r.time)+r.duration>at);
   const soon=!seated&&!late&&!now&&mine.find(r=>r.status==='Confirmed'&&mins(r.time)>at&&mins(r.time)<=at+30);
   const next=mine.find(r=>r.status==='Confirmed'&&mins(r.time)>at);
   const current=seated||late||now||soon||null;
   const status=seated?'seated':late?'late':now?'reserved':soon?'soon':'open';
   const freeAt=seated?(seated.seatedAt?Math.round((new Date(seated.seatedAt).getTime()-new Date(date+'T00:00:00').getTime())/60000):mins(seated.time))+seated.duration:now||late?mins((now||late).time)+(now||late).duration:null;
   return {table:t,status,booking:current,next,freeAt,bookings:mine,combined:current?current.tables.length>1:false};
  });
 }
 // Which tables suit a party at a time: single tables first (least wasted seats), then two neighbouring tables joined.
 function availability(s,{date,service,time,guests,duration,exclude=''}){
  const item={id:exclude,date,service,time,tables:[],duration:duration||plan(s).settings.turnMinutes};
  const rows=plan(s).tables.map(t=>{const c=conflicts(s,{...item,tables:[t.label]});return {table:t,conflict:c[0]||null,fit:t.max<guests?'small':t.seats>=guests?'ok':'squeeze',waste:t.seats-guests};});
  const free=rows.filter(r=>!r.conflict);
  const singles=free.filter(r=>r.fit!=='small').sort((a,b)=>(a.fit==='ok'?0:1)-(b.fit==='ok'?0:1)||Math.abs(a.waste)-Math.abs(b.waste)).map(r=>[r.table]);
  const pairs=combos(free.map(r=>r.table),guests).slice(0,4);
  return {rows,suggestions:[...singles.slice(0,4),...(singles.length<2?pairs:pairs.slice(0,2))]};
 }
 // Covers against seats in half-hour steps across the service, for pacing.
 function timeline(s,date,service){
  const {start,end}=serviceWindow(s,service),list=bookings(s,date,service).filter(active),seats=plan(s).tables.reduce((n,t)=>n+t.seats,0),out=[];
  for(let m=start;m<end;m+=30){const here=list.filter(r=>{const [a,b]=span(r);return a<m+30&&b>m;});out.push({time:clock(m),minutes:m,covers:here.reduce((n,r)=>n+r.guests,0),bookings:here.length,arrivals:list.filter(r=>mins(r.time)>=m&&mins(r.time)<m+30).reduce((n,r)=>n+r.guests,0),seats});}
  return out;
 }
 function stats(s,date,service,at){
  const list=bookings(s,date,service),open=list.filter(active),{start,end}=serviceWindow(s,service),tables=plan(s).tables,seats=tables.reduce((n,t)=>n+t.seats,0);
  const occ=occupancy(s,date,service,at);
  const seatMinutes=open.reduce((n,r)=>n+r.guests*Math.max(0,Math.min(span(r)[1],end)-Math.max(span(r)[0],start)),0),available=seats*(end-start);
  const peak=timeline(s,date,service).sort((a,b)=>b.covers-a.covers)[0];
  const perTable=new Map();for(const r of open)for(const l of r.tables)perTable.set(l.toLowerCase(),(perTable.get(l.toLowerCase())||0)+1);
  return {seats,tables:tables.length,rooms:plan(s).rooms.length,covers:open.reduce((n,r)=>n+r.guests,0),bookings:open.length,
   seatedNow:occ.filter(o=>o.status==='seated').length,seatedGuests:open.filter(r=>r.status==='Seated').reduce((n,r)=>n+r.guests,0),
   arrivingSoon:open.filter(r=>r.status==='Confirmed'&&mins(r.time)>at-15&&mins(r.time)<=at+30).length,late:occ.filter(o=>o.status==='late').length,
   openTables:occ.filter(o=>o.status==='open').length,unassigned:open.filter(r=>!r.tables.length&&r.status==='Confirmed').length,
   utilization:available?Math.round(seatMinutes/available*100):0,turns:tables.length?Math.round([...perTable.values()].reduce((n,v)=>n+v,0)/tables.length*10)/10:0,
   peak:peak&&peak.covers?peak:null,walkIns:open.filter(r=>r.source==='Walk-in').length,closed:list.filter(r=>CLOSED.includes(r.status)).length,
   avgParty:open.length?Math.round(open.reduce((n,r)=>n+r.guests,0)/open.length*10)/10:0};
 }
 // Seat use per room and table over a period.
 function utilization(s,from,to){
  const list=s.reservations.filter(r=>r.date>=from&&r.date<=to&&active(r)),days=new Set(list.map(r=>r.date+'|'+r.service));
  const minutesOf=new Map();for(const k of days){const {start,end}=serviceWindow(s,k.slice(11));minutesOf.set(k,end-start);}
  const totalMinutes=[...minutesOf.values()].reduce((n,v)=>n+v,0);
  const tables=plan(s).tables.map(t=>{const mine=list.filter(r=>uses(r,t.label));const used=mine.reduce((n,r)=>n+Math.min(r.guests,t.max)*r.duration/Math.max(1,r.tables.length),0);return {table:t,bookings:mine.length,covers:mine.reduce((n,r)=>n+Math.round(r.guests/Math.max(1,r.tables.length)),0),utilization:totalMinutes?Math.round(used/(t.seats*totalMinutes)*100):0};});
  const rooms=plan(s).rooms.map(r=>{const mine=tables.filter(t=>t.table.room===r.id),seats=mine.reduce((n,t)=>n+t.table.seats,0);return {room:r,seats,tables:mine.length,bookings:mine.reduce((n,t)=>n+t.bookings,0),covers:mine.reduce((n,t)=>n+t.covers,0),utilization:seats?Math.round(mine.reduce((n,t)=>n+t.utilization*t.table.seats,0)/seats):0};});
  const combined=list.filter(r=>r.tables.length>1).length,unassigned=list.filter(r=>!r.tables.length).length;
  return {tables:tables.sort((a,b)=>b.bookings-a.bookings),rooms,combined,unassigned,services:days.size};
 }
 // Who comes back: every guest the bookings know, with visits, no-shows, favourite room and what they usually ask for.
 const guestKey=r=>String(r.name||'').trim().toLowerCase().replace(/\s+/g,' ');
 function guests(s,from,to){
  const inRange=r=>r.date>=from&&r.date<=to,map=new Map();
  for(const r of s.reservations){
   const k=guestKey(r);if(!k)continue;
   const g=map.get(k)||{key:k,name:r.name.trim(),contact:'',visits:0,covers:0,noShows:0,cancels:0,upcoming:0,first:'',last:'',rooms:new Map(),tables:new Map(),times:[],tags:new Set(),notes:[],sources:new Map(),dine:[],partySum:0,inRange:0,coversInRange:0};
   if(r.contact&&!g.contact)g.contact=r.contact;
   for(const t of r.tags||[])g.tags.add(t);
   if(r.status==='Confirmed'&&r.date>=today()){g.upcoming++;}
   else if(r.status==='No-show')g.noShows++;
   else if(r.status==='Cancelled')g.cancels++;
   else{
    g.visits++;g.covers+=r.guests;g.partySum+=r.guests;g.times.push(mins(r.time));
    if(!g.first||r.date<g.first)g.first=r.date;if(!g.last||r.date>g.last)g.last=r.date;
    for(const l of r.tables){const t=byLabel(s,l);g.tables.set(l,(g.tables.get(l)||0)+1);if(t)g.rooms.set(t.room,(g.rooms.get(t.room)||0)+1);}
    g.sources.set(r.source,(g.sources.get(r.source)||0)+1);
    if(r.seatedAt&&r.completedAt){const d=(new Date(r.completedAt)-new Date(r.seatedAt))/60000;if(d>0&&d<600)g.dine.push(d);}
    if(inRange(r)){g.inRange++;g.coversInRange+=r.guests;}
   }
   if(r.note&&r.note.trim()&&!g.notes.some(n=>n.text===r.note))g.notes.push({date:r.date,text:r.note});
   map.set(k,g);
  }
  const top=m=>[...m].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  const roomName=id=>plan(s).rooms.find(r=>r.id===id)?.name||'';
  const directory=[...map.values()].map(g=>{
   const slots=g.times.reduce((m,v)=>m.set(Math.floor(v/30)*30,(m.get(Math.floor(v/30)*30)||0)+1),new Map()),avgTime=slots.size?clock(top(slots)):'';
   const tier=g.tags.has('VIP')?'VIP':g.visits>=4?'Regular':g.visits>=2?'Returning':g.visits===1?'New':'Prospect';
   return {key:g.key,name:g.name,contact:g.contact,visits:g.visits,covers:g.covers,noShows:g.noShows,cancels:g.cancels,upcoming:g.upcoming,first:g.first,last:g.last,
    avgParty:g.visits?Math.round(g.partySum/g.visits*10)/10:0,favouriteRoom:roomName(top(g.rooms)),favouriteTable:top(g.tables),usualTime:avgTime,tags:[...g.tags],source:top(g.sources),
    dineMinutes:g.dine.length?Math.round(g.dine.reduce((n,v)=>n+v,0)/g.dine.length):0,notes:g.notes.sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5),tier,inRange:g.inRange,coversInRange:g.coversInRange,
    reliability:g.visits+g.noShows+g.cancels?Math.round(g.visits/(g.visits+g.noShows+g.cancels)*100):100};
  });
  const period=s.reservations.filter(r=>inRange(r)),honoured=period.filter(r=>!CLOSED.includes(r.status)&&!(r.status==='Confirmed'&&r.date>=today()));
  const visitors=directory.filter(g=>g.inRange>0),newGuests=visitors.filter(g=>g.first>=from),returning=visitors.filter(g=>g.first<from);
  const dine=honoured.filter(r=>r.seatedAt&&r.completedAt).map(r=>(new Date(r.completedAt)-new Date(r.seatedAt))/60000).filter(d=>d>0&&d<600);
  const count=(list,f)=>list.reduce((m,r)=>m.set(f(r),(m.get(f(r))||0)+1),new Map());
  const sources=[...count(period,r=>r.source)].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value}));
  const tags=TAGS.map(t=>({label:t,value:period.filter(r=>r.tags.includes(t)).length})).filter(x=>x.value).sort((a,b)=>b.value-a.value);
  const cohorts=[['First visit',g=>g.visits===1],['2–3 visits',g=>g.visits>=2&&g.visits<=3],['4–7 visits',g=>g.visits>=4&&g.visits<=7],['8+ visits',g=>g.visits>=8]].map(([label,f])=>({label,value:visitors.filter(f).length}));
  const parties=[['1–2',1,2],['3–4',3,4],['5–6',5,6],['7+',7,99]].map(([label,a,b])=>({label:label+' guests',value:honoured.filter(r=>r.guests>=a&&r.guests<=b).length}));
  const noShowGuests=directory.filter(g=>g.noShows>=2).sort((a,b)=>b.noShows-a.noShows);
  const weekdays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label,i)=>({label,value:honoured.filter(r=>(new Date(r.date+'T12:00:00').getDay()+6)%7===i).reduce((n,r)=>n+r.guests,0)}));
  const slots=new Map();for(const r of honoured){const k=clock(Math.floor(mins(r.time)/30)*30);slots.set(k,(slots.get(k)||0)+r.guests);}
  return {from,to,directory:directory.sort((a,b)=>b.visits-a.visits||b.covers-a.covers||a.name.localeCompare(b.name)),
   summary:{bookings:period.length,honoured:honoured.length,covers:honoured.reduce((n,r)=>n+r.guests,0),uniqueGuests:visitors.length,newGuests:newGuests.length,returning:returning.length,
    returningShare:visitors.length?Math.round(returning.length/visitors.length*100):0,regulars:directory.filter(g=>g.visits>=4).length,vips:directory.filter(g=>g.tags.includes('VIP')).length,
    avgParty:honoured.length?Math.round(honoured.reduce((n,r)=>n+r.guests,0)/honoured.length*10)/10:0,avgDine:dine.length?Math.round(dine.reduce((n,v)=>n+v,0)/dine.length):0,dineSample:dine.length,
    noShows:period.filter(r=>r.status==='No-show').length,cancels:period.filter(r=>r.status==='Cancelled').length,noShowRate:period.length?Math.round(period.filter(r=>r.status==='No-show').length/period.length*1000)/10:0,
    walkIns:honoured.filter(r=>r.source==='Walk-in').length,walkInShare:honoured.length?Math.round(honoured.filter(r=>r.source==='Walk-in').length/honoured.length*100):0,
    combined:honoured.filter(r=>r.tables.length>1).length,visitsPerGuest:visitors.length?Math.round(visitors.reduce((n,g)=>n+g.inRange,0)/visitors.length*10)/10:0},
   sources,tags,cohorts,parties,weekdays,arrivals:[...slots].sort((a,b)=>a[0].localeCompare(b[0])).map(([label,value])=>({label,value})),noShowGuests:noShowGuests.slice(0,8)};
 }
 const history=(s,key)=>s.reservations.filter(r=>guestKey(r)===key).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));

 function change(state,action,role=state.role){
  let s=needsUpgrade(state)?upgrade(state):copy(state);B.configure(s);
  const me=B.actor(role,s.crewId,s.managerId),manager=role==='manager';
  const canEdit=manager||!!B.permissions?.can(s,'floor',me);
  const needEditor=()=>{if(!canEdit)throw Error('Only managers or a floor-plan lead can change the table map.');};
  const now=()=>new Date().toISOString();
  const f=plan(s);
  const normalize=(raw,old)=>{
   const item={...raw};
   item.tables=Array.isArray(raw.tables)?[...new Set(raw.tables.map(x=>String(x).trim()).filter(Boolean))]:parseTables(raw.table);
   if(item.tables.length>LIMITS.tablesPer)throw Error(`Join up to ${LIMITS.tablesPer} tables for one party.`);
   for(const l of item.tables)if(!byLabel(s,l))throw Error(`Table ${l} is not on the floor plan.`);
   item.tables=item.tables.map(l=>byLabel(s,l).label);item.table=joinTables(item.tables);
   item.duration=Number.isInteger(raw.duration)?raw.duration:Number.isInteger(old?.duration)?old.duration:f.settings.turnMinutes;
   if(!int(item.duration,LIMITS.duration[0],LIMITS.duration[1]))throw Error('Choose a turn time between 30 minutes and 6 hours.');
   item.source=SOURCES.includes(raw.source)?raw.source:old?.source||'Phone';
   item.tags=Array.isArray(raw.tags)?[...new Set(raw.tags.filter(t=>TAGS.includes(t)))]:old?.tags||[];
   for(const k of ['seatedAt','completedAt','closedAt','createdAt'])if(old?.[k]&&item[k]===undefined)item[k]=old[k];
   if(!old)item.createdAt=now();
   return item;
  };
  const checkTables=item=>{
   if(!item.tables.length)return;
   const c=conflicts(s,item);
   if(c.length)throw Error(`Table ${c[0].tables.find(l=>item.tables.some(m=>m.toLowerCase()===l.toLowerCase()))} is booked for ${c[0].name} at ${c[0].time} (${c[0].duration} min turn). Choose another table or time.`);
   const cap=capacity(s,item.tables);
   if(Number.isInteger(item.guests)&&item.guests>cap)throw Error(`${item.table.replace(/\+/g,' + ')} seats up to ${cap}. Join another table or pick a bigger one for ${item.guests} guests.`);
  };
  // Saves a booking through the shared model with the floor plan's own table, time and capacity rules.
  const putReservation=(raw,actor=role)=>{
   const old=s.reservations.find(r=>r.id===raw.id),item=normalize(raw,old);
   checkTables(item);
   s=prev.change(s,{type:'put',collection:'reservations',item:{...item,table:''}},actor);
   const saved=s.reservations.find(r=>r.id===item.id);
   Object.assign(saved,{tables:item.tables,table:item.table,duration:item.duration,source:item.source,tags:item.tags});
   for(const k of ['seatedAt','completedAt','closedAt','createdAt'])if(item[k])saved[k]=item[k];
   return saved;
  };
  const setStatus=(id,status,actor=role)=>{
   s=prev.change(s,{type:'reservation-status',id,status},actor);
   const r=s.reservations.find(x=>x.id===id);
   if(status==='Seated')r.seatedAt=now();else if(status==='Completed')r.completedAt=now();else if(CLOSED.includes(status))r.closedAt=now();
   return r;
  };
  const roomOf=id=>{const r=f.rooms.find(x=>x.id===id);if(!r)throw Error('That room no longer exists.');return r;};
  const placeTable=(item,old)=>{
   const room=roomOf(item.room);
   if(!labelOk(item.label))throw Error(`Give the table a short label of up to ${LIMITS.label} characters (no + , or |).`);
   if(f.tables.some(t=>t.id!==item.id&&t.label.toLowerCase()===item.label.toLowerCase()))throw Error(`Table ${item.label} already exists. Labels must be unique across all rooms.`);
   if(!int(item.seats,LIMITS.seats[0],LIMITS.seats[1]))throw Error('Seats must be between 1 and 40.');
   if(!int(item.max,item.seats,LIMITS.max[1]))throw Error('Maximum capacity must be at least the standard seats and no more than 60.');
   if(!SHAPES.includes(item.shape))throw Error('Choose a table shape.');
   if(!int(item.w,LIMITS.size[0],LIMITS.size[1])||!int(item.h,LIMITS.size[0],LIMITS.size[1]))throw Error('Table size must be between 1 and 10 cells.');
   if(!int(item.x,0,room.cols-item.w)||!int(item.y,0,room.rows-item.h))throw Error('Keep the table inside the room.');
   const hit=f.tables.find(t=>t.id!==item.id&&overlap(t,item));if(hit)throw Error(`That spot overlaps table ${hit.label}. Move it to a free space.`);
   if(old){
    if(old.label!==item.label)for(const r of s.reservations)if(uses(r,old.label)){r.tables=r.tables.map(l=>l.toLowerCase()===old.label.toLowerCase()?item.label:l);r.table=joinTables(r.tables);}
    Object.assign(old,item);
   }else{if(f.tables.length>=LIMITS.tables)throw Error('The floor plan is full.');f.tables.push(item);}
  };
  if(action.type==='put'&&action.collection==='reservations'){
   putReservation(action.item);
  }else if(action.type==='reservation-status'){
   setStatus(action.id,action.status);
  }else if(action.type==='floor:seat'){
   // Seat a booking, optionally at other tables than planned (the host moved them).
   const r=s.reservations.find(x=>x.id===action.id);if(!r)throw Error('This booking no longer exists.');
   if(r.status!=='Confirmed')throw Error('Only confirmed bookings can be seated.');
   if(Array.isArray(action.tables)&&joinTables(action.tables)!==r.table)putReservation({...r,tables:action.tables});
   setStatus(r.id,'Seated');
  }else if(action.type==='floor:assign'){
   const r=s.reservations.find(x=>x.id===action.id);if(!r)throw Error('This booking no longer exists.');
   if(!['Confirmed','Seated'].includes(r.status))throw Error('Only open bookings can move tables.');
   putReservation({...r,tables:action.tables||[]});
  }else if(action.type==='floor:walk-in'){
   const tables=Array.isArray(action.tables)?action.tables:[];
   const date=B.isDate(action.date)?action.date:s.date,service=action.service||s.service;
   if(!s.setup.services.some(v=>v.name===service))throw Error('Choose a valid service.');
   const {start,end}=serviceWindow(s,service),live=date===today()&&nowMinutes()>=start&&nowMinutes()<end;
   const time=action.time&&/^([01]\d|2[0-3]):[0-5]\d$/.test(action.time)?action.time:live?clock(nowMinutes()):clock(start);
   let duration=Number.isInteger(action.duration)?action.duration:f.settings.turnMinutes;
   const guests=Number(action.guests);
   if(!Number.isInteger(guests)||guests<1||guests>20)throw Error('Enter the party size (1–20).');
   if(!tables.length)throw Error('Pick a table to seat the walk-in at.');
   // A walk-in squeezes in ahead of the next booking when at least 45 minutes remain.
   const probe={id:action.id||'walk-in',date,service,time,tables:tables.map(l=>byLabel(s,l)?.label||l),duration,guests};
   const next=conflicts(s,probe).filter(r=>mins(r.time)>mins(time)).sort((a,b)=>a.time.localeCompare(b.time))[0];
   if(next){const gap=mins(next.time)-mins(time);if(gap<45)throw Error(`Table ${next.tables.find(l=>probe.tables.includes(l))} is booked for ${next.name} at ${next.time}. Choose another table.`);duration=Math.min(duration,gap);}
   const id=action.id||('walk-'+hash(now()+Math.random()).toString(36));
   putReservation({id,date,service,name:String(action.name||'').trim()||'Walk-in',guests,time,tables:probe.tables,note:String(action.note||'').trim(),contact:String(action.contact||'').trim(),duration,source:'Walk-in',tags:Array.isArray(action.tags)?action.tags:[]});
   setStatus(id,'Seated');
  }else if(action.type==='floor:settings'){
   needEditor();
   if(!int(action.turnMinutes,LIMITS.duration[0],LIMITS.duration[1]))throw Error('Choose a default turn time between 30 minutes and 6 hours.');
   f.settings.turnMinutes=action.turnMinutes;
  }else if(action.type==='floor:room'){
   needEditor();
   const name=String(action.name||'').trim(),cols=Number(action.cols),rows=Number(action.rows);
   if(!name||name.length>40)throw Error('Give the room a name of up to 40 characters.');
   if(f.rooms.some(r=>r.id!==action.id&&r.name.trim().toLowerCase()===name.toLowerCase()))throw Error('A room already has that name.');
   if(!int(cols,LIMITS.cols[0],LIMITS.cols[1])||!int(rows,LIMITS.rows[0],LIMITS.rows[1]))throw Error(`Rooms are ${LIMITS.cols[0]}–${LIMITS.cols[1]} cells wide and ${LIMITS.rows[0]}–${LIMITS.rows[1]} cells deep.`);
   const old=f.rooms.find(r=>r.id===action.id);
   if(old){const out=f.tables.find(t=>t.room===old.id&&(t.x+t.w>cols||t.y+t.h>rows));if(out)throw Error(`Table ${out.label} would fall outside the room. Move it first or keep the room larger.`);Object.assign(old,{name,cols,rows});}
   else{if(f.rooms.length>=LIMITS.rooms)throw Error(`Up to ${LIMITS.rooms} rooms are supported.`);if(!identifier(action.id))throw Error('Choose a valid room id.');f.rooms.push({id:action.id,name,cols,rows});}
  }else if(action.type==='floor:remove-room'){
   needEditor();const room=roomOf(action.id);
   if(f.rooms.length===1)throw Error('Keep at least one room.');
   if(f.tables.some(t=>t.room===room.id))throw Error('Move or remove the tables in this room first.');
   f.rooms=f.rooms.filter(r=>r.id!==room.id);
  }else if(action.type==='floor:room-order'){
   needEditor();const i=f.rooms.findIndex(r=>r.id===action.id),j=i+(action.direction<0?-1:1);
   if(i<0)throw Error('That room no longer exists.');if(j<0||j>=f.rooms.length)return s;
   [f.rooms[i],f.rooms[j]]=[f.rooms[j],f.rooms[i]];
  }else if(action.type==='floor:table'){
   needEditor();
   const old=f.tables.find(t=>t.id===action.id);
   if(!old&&!identifier(action.id))throw Error('Choose a valid table id.');
   const room=action.room||old?.room||f.rooms[0].id;
   const seats=action.seats??old?.seats??4;let max=action.max??old?.max??seats;if(action.max===undefined&&max<seats)max=seats;
   const item={id:action.id,room,label:String(action.label??old?.label??'').trim(),seats,max,shape:action.shape||old?.shape||'square',x:action.x??old?.x,y:action.y??old?.y,w:action.w??old?.w??2,h:action.h??old?.h??2};
   if(item.x===undefined||item.y===undefined){const spot=freeSpot(f,room,item.w,item.h);if(!spot)throw Error('No free space left in this room. Make the room bigger or remove a table.');Object.assign(item,spot);}
   if(!old&&!item.label){let n=1;while(f.tables.some(t=>t.label===String(n)))n++;item.label=String(n);}
   if(old&&old.room!==room&&action.x===undefined){const spot=freeSpot({...f,tables:f.tables.filter(t=>t.id!==old.id)},room,item.w,item.h);if(!spot)throw Error('No free space in that room.');Object.assign(item,spot);}
   placeTable(item,old);
  }else if(action.type==='floor:remove-table'){
   needEditor();const t=tableOf(s,action.id);if(!t)throw Error('That table no longer exists.');
   f.tables=f.tables.filter(x=>x.id!==t.id);
   for(const r of s.reservations)if(['Confirmed','Seated'].includes(r.status)&&r.date>=today()&&uses(r,t.label)){r.tables=r.tables.filter(l=>l.toLowerCase()!==t.label.toLowerCase());r.table=joinTables(r.tables);}
  }else s=prev.change(s,action,role);
  B.configure(s);if(!valid(s))throw Error('Check the table map details. The change could not be saved.');return s;
 }
 B.floor={SHAPES,SOURCES,TAGS,DURATIONS,LIMITS,CLOSED,plan,byLabel,tableOf,capacity,seatsOf,serviceWindow,conflicts,occupancy,availability,timeline,stats,utilization,guests,history,guestKey,freeSpot,adjacent,mins,clock,nowMinutes,upgrade,defaultPlan};
 B.starter=(...args)=>upgrade(prev.starter(...args));B.validState=valid;B.change=change;
 B.load=storage=>{try{const s=upgrade(prev.load(storage));if(valid(s))return s;
  // A plan that no longer fits (e.g. edited elsewhere) is rebuilt so the bookings themselves are never lost.
  delete s.floor;for(const r of s.reservations){delete r.tables;}const again=upgrade(s);if(valid(again))return again;}catch{}return B.starter();};
})();
